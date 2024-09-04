use crate::pull::DB_NAME;
use crate::schema;
use crate::models::{Game, PlayerRating, Player, PlayerName};
use crate::pull::update_mean_and_variance;

use diesel::dsl::count;
use diesel::insert_into;

use diesel::QueryDsl;

use rusqlite;
use chrono::DateTime;

use diesel::pg::PgConnection;
use diesel::Connection;

use diesel::prelude::*;

pub fn establish_connection_nosync() -> PgConnection {
    PgConnection::establish(&DB_NAME).unwrap()
}

//These method below are to migrate the old sqlite3 database into the new postgres one. They can be removed later
pub fn migrate(sqlite_db: &str, transaction_amount: i64) {
    let mut connection = establish_connection_nosync();
    let sqlite_connection = rusqlite::Connection::open(sqlite_db.to_owned()).unwrap();

    let game_count:i64 = sqlite_connection.query_row(
            "SELECT COUNT(*) FROM games",
            [],
            |r| r.get(0),
        )
        .unwrap();

    println!("game_count: {}", game_count);

    let mut offset = schema::games::table
        .select(count(schema::games::id_a))
        .load::<i64>(&mut connection)
        .unwrap()[0] - transaction_amount;
    
    //If offset is less than 0, make it 0
    if offset < 0 {
        offset = 0;
    }

    while offset < game_count {

        let game_count_results = schema::games::table
            .select(count(schema::games::id_a))
            .load::<i64>(&mut connection)
            .unwrap();
        let date = chrono::Local::now();
        println!("{}: Psql games total: {:?}", date.format("%H:%M:%S"), game_count_results[0]);

        connection.transaction::<_, diesel::result::Error, _>(|conn| {
            
            let mut new_games = Vec::new();

            let mut stmt = sqlite_connection.prepare("SELECT timestamp, id_a, name_a, char_a, platform_a, id_b, name_b, char_b, platform_b, winner, game_floor FROM games ORDER BY timestamp ASC LIMIT ? OFFSET ? ").unwrap();
            let mut rows = stmt.query([transaction_amount, offset]).unwrap();
            while let Some(row) = rows.next().unwrap() {
                
                let unix_timestamp = row.get(0).unwrap();
                
                let new_game = Game {
                    timestamp: DateTime::from_timestamp(unix_timestamp, 0).unwrap().naive_utc(),
                    id_a: row.get(1).unwrap(),
                    name_a: row.get(2).unwrap(),
                    char_a: row.get(3).unwrap(),
                    platform_a: row.get(4).unwrap(),
                    id_b: row.get(5).unwrap(),
                    name_b: row.get(6).unwrap(),
                    char_b: row.get(7).unwrap(),
                    platform_b: row.get(8).unwrap(),
                    winner: row.get(9).unwrap(),
                    game_floor: row.get(10).unwrap(),
                    value_a: None,
                    deviation_a: None,
                    value_b: None,
                    deviation_b: None};
            
                if let Err(e) = migrate_update_player_info(conn, &new_game) {
                    error!("update_ratings failed: {e}");
                }

                let count = insert_into(schema::games::table)
                    .values(&new_game)
                    .on_conflict_do_nothing()
                    .execute(conn)
                    .unwrap();
        
                if count > 0 {
                    new_games.push(new_game);
                }
            }
            
            //Sort new_games by timestamp in ascending order
            //This is so that we process older games first
            //new_games.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));

            if let Err(e) = migrate_update_ratings(conn, &new_games) {
                error!("update_ratings failed: {e}");
            }
  
            offset += transaction_amount;
            
            Ok(())
        }).unwrap();
    }
}

fn migrate_update_player_info(connection: &mut PgConnection, new_game: &Game) -> Result<(), String> {
    //Update player name in the player table
    insert_into(schema::players::table)
        .values(&Player {
            id: new_game.id_a,
            name: new_game.name_a.clone(),
            platform: new_game.platform_a,
        })
        .on_conflict(schema::players::id)
        .do_update()
        .set((schema::players::name.eq(new_game.name_a.clone()), schema::players::platform.eq(new_game.platform_a)))
        .execute(connection)
        .unwrap();

    insert_into(schema::players::table)
        .values(&Player {
            id: new_game.id_b,
            name: new_game.name_b.clone(),
            platform: new_game.platform_b,
        })
        .on_conflict(schema::players::id)
        .do_update()
        .set((schema::players::name.eq(new_game.name_b.clone()), schema::players::platform.eq(new_game.platform_b)))
        .execute(connection)
        .unwrap();

    //Update player names in the player_names table
    insert_into(schema::player_names::table)
        .values(&PlayerName {
            id: new_game.id_a,
            name: new_game.name_a.clone(),
        })
        .on_conflict_do_nothing()
        .execute(connection)
        .unwrap();

    insert_into(schema::player_names::table)
        .values(&PlayerName {
            id: new_game.id_b,
            name: new_game.name_b.clone(),
        })
        .on_conflict_do_nothing()
        .execute(connection)
        .unwrap();

    Ok(())
}

fn migrate_update_ratings(connection: &mut PgConnection, new_games: &Vec<Game>) -> Result<(), String> {
    info!("Updating ratings");
    for g in new_games {
        //Get the player_rating a
        let player_rating_a = match schema::player_ratings::table
            .filter(schema::player_ratings::id.eq(g.id_a))
            .filter(schema::player_ratings::char_id.eq(g.char_a))
            .get_result::<PlayerRating>(connection)
        {
            Ok(r) => r,
            Err(_) => {
                //Insert the player rating if it's not found
                let new_player_rating = PlayerRating {
                    id: g.id_a,
                    char_id: g.char_a,
                    wins: 0,
                    losses: 0,
                    value: 1500.0,
                    deviation: 250.0,
                    last_decay: g.timestamp,
                    top_rating_value: None,
                    top_rating_deviation: None,
                    top_rating_timestamp: None,
                    top_defeated_id: None,
                    top_defeated_char_id: None,
                    top_defeated_name: None,
                    top_defeated_value: None,
                    top_defeated_deviation: None,
                    top_defeated_timestamp: None,
                };

                diesel::insert_into(schema::player_ratings::table)
                    .values(&new_player_rating)
                    .execute(connection)
                    .unwrap();

                new_player_rating
            }
        };
        //Get the player_rating b
        let player_rating_b = match schema::player_ratings::table
            .filter(schema::player_ratings::id.eq(g.id_b))
            .filter(schema::player_ratings::char_id.eq(g.char_b))
            .get_result::<PlayerRating>(connection)
        {
            Ok(r) => r,
            Err(_) => {
                //Insert the player rating if it's not found
                let new_player_rating = PlayerRating {
                    id: g.id_b,
                    char_id: g.char_b,
                    wins: 0,
                    losses: 0,
                    value: 1500.0,
                    deviation: 250.0,
                    last_decay: g.timestamp,
                    top_rating_value: None,
                    top_rating_deviation: None,
                    top_rating_timestamp: None,
                    top_defeated_id: None,
                    top_defeated_char_id: None,
                    top_defeated_name: None,
                    top_defeated_value: None,
                    top_defeated_deviation: None,
                    top_defeated_timestamp: None,
                };

                diesel::insert_into(schema::player_ratings::table)
                    .values(&new_player_rating)
                    .execute(connection)
                    .unwrap();

                new_player_rating
            }
        };


        //Update game table with player ratings
        diesel::update(schema::games::table)
            .filter(schema::games::timestamp.eq(g.timestamp))
            .filter(schema::games::id_a.eq(g.id_a))
            .filter(schema::games::char_a.eq(g.char_a))
            .filter(schema::games::platform_a.eq(g.platform_a))
            .filter(schema::games::id_b.eq(g.id_b))
            .filter(schema::games::char_b.eq(g.char_b))
            .filter(schema::games::platform_b.eq(g.platform_b))
            .set((
                schema::games::value_a.eq(player_rating_a.value),
                schema::games::deviation_a.eq(player_rating_a.deviation),
                schema::games::value_b.eq(player_rating_b.value),
                schema::games::deviation_b.eq(player_rating_b.deviation),
            ))
            .execute(connection)
            .unwrap();

        //Calculate value and deviation
        let (value_a, value_b, deviation_a, deviation_b) = update_mean_and_variance(
            player_rating_a.value as f64,
            player_rating_a.deviation as f64,
            player_rating_b.value as f64,
            player_rating_b.deviation as f64,
            g.winner == 1,
        );

        //Update player_rating a
        diesel::update(schema::player_ratings::table)
            .filter(schema::player_ratings::id.eq(g.id_a))
            .filter(schema::player_ratings::char_id.eq(g.char_a))
            .set((
                schema::player_ratings::value.eq(value_a as f32),
                schema::player_ratings::deviation.eq(deviation_a as f32),
            ))
            .execute(connection)
            .unwrap();

        //Update player_rating b
        diesel::update(schema::player_ratings::table)
            .filter(schema::player_ratings::id.eq(g.id_b))
            .filter(schema::player_ratings::char_id.eq(g.char_b))
            .set((
                schema::player_ratings::value.eq(value_b as f32),
                schema::player_ratings::deviation.eq(deviation_b as f32),
            ))
            .execute(connection)
            .unwrap();
            
    }
    info!("Updating ratings - done.");
    Ok(())
}