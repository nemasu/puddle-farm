extern crate simplelog;

use simplelog::*;

use std::fs::File;

#[macro_use] extern crate rocket;

use std::ops::Deref;

use rocket_db_pools::{Database, Connection};
use rocket_db_pools::diesel::{QueryResult, PgPool, prelude::*};

mod schema;
mod pull;
mod ggst_api;
mod requests;
mod responses;
mod models;

#[derive(Database)]
#[database("ratings")]
struct Db(PgPool);

use dotenv::dotenv;

#[get("/")]
async fn list(mut db: Connection<Db>) -> QueryResult<String> {
    let post_ids: Vec<i64> = schema::players::table
        .select(schema::players::id)
        .load(&mut db)
        .await?;

    Ok(format!("{post_ids:?}"))
}

pub async fn run() {
    let _ = rocket::build()
        .attach(Db::init())
        .mount(
            "/",
            routes![
                list,
            ],
        )
        //.register("/", catchers![catch_404, catch_500, catch_503])
        .ignite()
        .await
        .unwrap()
        .launch()
        .await
        .unwrap();
}

#[rocket::main]
async fn main() {
    dotenv().expect("dotenv failed");
    
    CombinedLogger::init(
        vec![
            TermLogger::new(LevelFilter::Info, Config::default(), TerminalMode::Mixed, ColorChoice::Auto),
            WriteLogger::new(LevelFilter::Info, Config::default(), File::create("output.log").unwrap()),
        ]
    ).unwrap();

    let args = std::env::args().skip(1).collect::<Vec<_>>();
    match args.get(0).map(|r| r.deref()) {
        Some("pull") => {
            pull::pull_and_update_continuous().await;
        }
        _ => {
            run().await;
        }
    }
}
