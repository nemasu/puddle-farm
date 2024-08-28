use log::{info, error};
use std::time::Duration;
use diesel::prelude::*;
use diesel_async::{RunQueryDsl, AsyncConnection, AsyncPgConnection};
use tokio::time;
use lazy_static::lazy_static;
use crate::ggst_api;

use crate::schema::games::dsl::*;
use crate::schema::{player_ratings, players, player_names};
use diesel::dsl::*;
use chrono::NaiveDateTime;

use crate::models::*;

use rstat::univariate;
use rstat::Distribution;

lazy_static! {
    pub static ref DB_NAME: String = dotenv::var("DATABASE_PATH").expect("DATABASE_PATH must be set.");
}

pub async fn establish_connection() -> AsyncPgConnection {
    AsyncPgConnection::establish(&DB_NAME).await.unwrap()
}

pub async fn pull_and_update_continuous() {

    let mut connection = establish_connection().await;
    let mut interval = time::interval(Duration::from_secs(60));

    loop {
        interval.tick().await;

        let game_count_results = games
            .select(count(id_a))
            .load::<i64>(&mut connection)
            .await.unwrap();
        let game_count_before = game_count_results[0];

        let new_games = match grab_games(&mut connection).await {
            Ok(g) => g,
            Err(e) => {
                error!("grab_games failed: {e}");
                continue;
            }
        };

        let game_count_results = games
            .select(count(id_a))
            .load::<i64>(&mut connection)
            .await.unwrap();
        info!("New games: {:?}", game_count_results[0] - game_count_before);

        if let Err(e) = update_ratings(&mut connection, &new_games).await {
            error!("update_ratings failed: {e}");
        }

        if let Err(e) = update_player_info(&mut connection, &new_games).await {
            error!("update_ratings failed: {e}");
        }

    }
}

async fn update_player_info(connection: &mut AsyncPgConnection, new_games: &Vec<Game>) -> Result<(), String> {
    for g in new_games {
        //Update player name in the player table
        insert_into(players::table)
            .values(&Player {
                id: g.id_a,
                name: g.name_a.clone(),
                platform: g.platform_a,
            })
            .on_conflict(players::id)
            .do_update()
            .set((players::name.eq(g.name_a.clone()), players::platform.eq(g.platform_a)))
            .execute(connection)
            .await
            .unwrap();

        insert_into(players::table)
            .values(&Player {
                id: g.id_b,
                name: g.name_b.clone(),
                platform: g.platform_b,
            })
            .on_conflict(players::id)
            .do_update()
            .set((players::name.eq(g.name_b.clone()), players::platform.eq(g.platform_b)))
            .execute(connection)
            .await
            .unwrap();

        //Update player names in the player_names table
        insert_into(player_names::table)
            .values(&PlayerName {
                id: g.id_a,
                name: g.name_a.clone(),
            })
            .on_conflict_do_nothing()
            .execute(connection)
            .await
            .unwrap();

        insert_into(player_names::table)
            .values(&PlayerName {
                id: g.id_b,
                name: g.name_b.clone(),
            })
            .on_conflict_do_nothing()
            .execute(connection)
            .await
            .unwrap();
    }

    Ok(())
}

async fn grab_games(connection: &mut AsyncPgConnection) -> Result<Vec<Game>, String> {
    info!("Grabbing replays");
    
    let replays = ggst_api::get_replays().await;

    let replays = match replays {
        Ok(replays) => replays,
        Err(e) => {
            return Err(e);
        }
    };

    let num_replays = replays.len();
    info!("Got {num_replays} replays.");

    let mut new_games = Vec::new();
    for r in replays {
        let game_timestamp = NaiveDateTime::parse_from_str(&r.timestamp, "%Y-%m-%d %H:%M:%S").unwrap();

        let new_game = Game {
            timestamp: game_timestamp,
            id_a: r.player1.id.parse::<i64>().unwrap(),
            name_a: r.player1.name,
            char_a: i16::try_from(r.player1_character).ok().unwrap(),
            platform_a: i16::try_from(r.player1.platform).ok().unwrap(),
            id_b: r.player2.id.parse::<i64>().unwrap(),
            name_b: r.player2.name,
            char_b: i16::try_from(r.player2_character).ok().unwrap(),
            platform_b: i16::try_from(r.player2.platform).ok().unwrap(),
            winner: i16::try_from(r.winner).ok().unwrap(),
            game_floor: i16::try_from(r.floor).ok().unwrap(),
        };

        let count = insert_into(games)
            .values(&new_game)
            .on_conflict_do_nothing()
            .execute(connection)
            .await
            .unwrap();

        if count > 0 {
            new_games.push(new_game);
        }
    }

    Ok(new_games)
}

async fn update_ratings(connection: &mut AsyncPgConnection, new_games: &Vec<Game>) -> Result<(), String> {
    info!("Updating ratings");
    for g in new_games {
        //Get the player_rating a
        let player_rating_a = match player_ratings::table
            .filter(player_ratings::id.eq(g.id_a))
            .filter(player_ratings::char_id.eq(g.char_a))
            .get_result::<PlayerRating>(connection)
            .await
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
                    deviation: 750.0,
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

                diesel::insert_into(player_ratings::table)
                    .values(&new_player_rating)
                    .execute(connection)
                    .await
                    .unwrap();

                new_player_rating
            }
        };
        //Get the player_rating b
        let player_rating_b = match player_ratings::table
            .filter(player_ratings::id.eq(g.id_b))
            .filter(player_ratings::char_id.eq(g.char_b))
            .get_result::<PlayerRating>(connection)
            .await
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
                    deviation: 750.0,
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

                diesel::insert_into(player_ratings::table)
                    .values(&new_player_rating)
                    .execute(connection)
                    .await
                    .unwrap();

                new_player_rating
            }
        };

        //Calculate value and deviation
        let (value_a, value_b, deviation_a, deviation_b) = update_mean_and_variance(
            player_rating_a.value as f64,
            player_rating_a.deviation as f64,
            player_rating_b.value as f64,
            player_rating_b.deviation as f64,
            g.winner == 1,
        );

        //Update player_rating a
        diesel::update(player_ratings::table)
            .filter(player_ratings::id.eq(g.id_a))
            .filter(player_ratings::char_id.eq(g.char_a))
            .set((
                player_ratings::value.eq(value_a as f32),
                player_ratings::deviation.eq(deviation_a as f32),
            ))
            .execute(connection)
            .await
            .unwrap();

        //Update player_rating b
        diesel::update(player_ratings::table)
            .filter(player_ratings::id.eq(g.id_b))
            .filter(player_ratings::char_id.eq(g.char_b))
            .set((
                player_ratings::value.eq(value_b as f32),
                player_ratings::deviation.eq(deviation_b as f32),
            ))
            .execute(connection)
            .await
            .unwrap();
            
    }
    info!("Updating ratings - done.");
    Ok(())
}

fn update_mean_and_variance(mean_a: f64, sigma_a: f64, mean_b: f64, sigma_b: f64, a_wins: bool) -> (f64, f64, f64, f64) {
    //### Calculate some helpful values. ###
    
    let rating_diff = mean_a - mean_b; //#This can be negative, that is intended.
    let match_variablity = sigma_a.powf(2.0) + sigma_b.powf(2.0); //#A simple method to combine the variablity of both players. 
    let sqrt_match_variablity = f64::sqrt(match_variablity); //#We end up computing this a lot
    
    //#How likely is a win for A? Bayesian methods let us create a normal distrubution by combining the two players ratings and variabiilies to estimate this. 
    let dist = univariate::normal::Normal::standard();
    let x = rating_diff / sqrt_match_variablity;
    let win_prob = dist.cdf(&x);
    
    
    //#How suprising was the result?
    //#Also, the direction is positive when A wins, and negative if B wins.
    let result_suprise: f64;
    let direction_of_update: f64;
    if a_wins {
        result_suprise = 1.0 - win_prob;
        direction_of_update = 1.0;
    }
    else {
        result_suprise = win_prob.into();
        direction_of_update = -1.0;
    }
    
    //### Update Means ###
    //# We scale the update by how suprising the result is. A win with a 99% chance of winning divides the total update by 100 (multiplying by (1.0 - 0.99) is the same as dividing by 100)
    //# But, since either player could have a contoller failure, computer issue, or any number of other external events. There is always some "suprise" to a win. Therefore, we add 0.001.
    //# This has the added bonus of some numerical stability as well, since result_suprise can be a very small number.
    //# Further, we scale by the variance of the player and divide by the overall variablity of the match.
    let mean_a_new = mean_a + direction_of_update * 10.0 * (result_suprise + 0.001) * sigma_a.powf(2.5) / match_variablity;
    let mean_b_new = mean_b - direction_of_update * 10.0 * (result_suprise + 0.001) * sigma_b.powf(2.5) / match_variablity;

    //# Going over each term:
    //# mean is the original rating of the player
    //# direction_of_update is who won, and that's either 1.0 or -1.0. The direction of the update.
    //# 10 is used to flatly increase the size of updates so they are more human interpretable.
    //# result_suprise is between 0.001 and 1.001, therefore it will (almost) always reduce the size of the update. It models the intuition that a "sure" win doesn't offer much information, whereas a massive upset calls into question our assumptions about how good the player really is.
    //# (sigma**2.5 / match_variablity) = (sigma**2.5 / sigma_A**2 + sigma_B**2). This term effectively reduces the size of the update depending on how uncertain we are about the opponents rating and increased it based on how uncertain we about the player's rating.


    //### Update Variance ###
    //# Before we start, it's important to understand this is *not* a statistical valid way of estiamting variance.
    //# We explicitly are using a simplified, biased, and suboptimal model.
    //# There are two mean reasons for this.
    //# First, the assumptions required to use an unbiased and optimal model are unlikely to be furfilled, causing it to become biased and suboptimal while also being highly complex
    //# Second, optimal and unbiased models tend to be brittle, when they start to break, they break hard. 
    
    //# Onto the biased and suboptimal but also resilent and simple method!
    //# First, we want a higher level scaling factor. This is a number which is pretty close to 1.0, and gently increases or decreases the overall variance.
    
    //# Second, we want to add or subtract from the variance.
    //# If the result is a suprise, we should add to it, otherwise, reduce.
    //# (result_suprise-0.5) moves result_suprise into the -0.5 to 0.5 range, straddling the 50% win chance.
    //# We multiply that by one hundred and then multiple it again by the result_suprise. Multiplying by result_suprise is a technique from importance sampling.
    //# Then, we want to create a mild reduction in variance if two players of equal skill continously go even.
    //# We multiply by (1-result_suprise) in this case because a 60% suprise should reduce variance less than a 40% suprise. 
    
    let variance_adjustment_factor = (8.0 + result_suprise.powf(2.0)) / 8.3;
    let mut variance_adjustment_constant = ((result_suprise-0.5) * 100.0) * result_suprise;
    variance_adjustment_constant -= (1.0 - (result_suprise-0.5).powf(2.0)) * 20.0 * (1.0-result_suprise);
    
    let mut sigma_a_new = (sigma_a + variance_adjustment_constant) * variance_adjustment_factor;
    let mut sigma_b_new = (sigma_b + variance_adjustment_constant) * variance_adjustment_factor;

    
    //#We don't actually want variance to reduce that much if the mean isn't changing.
    //#e.g. A player farming someone rated 500 points below them shouldn't see much change in their variance.
    
    let adjusted_mean_gap_a = (mean_a - mean_a_new).powf(2.0);
    let adjusted_mean_gap_b = (mean_b - mean_b_new).powf(2.0);

    if adjusted_mean_gap_a < 1.0 {
        sigma_a_new = sigma_a * (1.0-adjusted_mean_gap_a) + sigma_a_new * adjusted_mean_gap_a
    }
    if adjusted_mean_gap_b < 1.0 {
        sigma_b_new = sigma_b * (1.0-adjusted_mean_gap_b) + sigma_b_new * adjusted_mean_gap_b
    }
    
    //# Important to note that a suprising event applies to both players
    //# An upset increases variance for both players, and an expected result decreases it
    
    //# One last detail to help the stability of the overall model.
    //# Taking the max of the new variation and 3.0 ensures that we don't enter situations where 1.0 or less variance causes numerical problems.
    sigma_a_new = f64::max(3.0, sigma_a_new);
    sigma_b_new = f64::max(3.0, sigma_b_new);

    //#This should be complimented with real time variance increase. I'd suggest no change for the first 21 hours, and then a old_variance*1.05 + 1 increase every 21 hours after.
    //#There are advantages to not using 24 hours.

    (mean_a_new, mean_b_new, sigma_a_new, sigma_b_new)
}