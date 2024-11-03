# Puddle Farm

This project is aimed to become a replacement for [Rating Update](https://github.com/nemasu/rating-update).

It is currently being hosted at [Puddle.farm](https://puddle.farm)

### Major Changes
- Rocket 0.5 => Rocket (git) for now, considering Axum.
- Sqlite3 => Postgres with Diesel ORM
- Handlebars (templated frontend) => React
- Rating algorithm

## Getting Started

### Backend

A postgresql server needs to be available, set the DATABASE_PATH in your .env file accordingly.
eg. `DATABASE_PATH="postgresql://user:password@localhost/puddle_farm"`

Install diesel_cli, and create the database:
```
cargo install diesel_cli
source .env
diesel --database-url "${DATABASE_PATH}" migration run
```

`cargo run` to start the server.

`cargo run migrate <path>` can be used to import an old sqlite3 database.

`cargo run pull` will run the timed jobs continuously: grab replay, update ratings, update ranking, etc.

`cargo run hourly` runs the hourly jobs once, then exits.

To generate a new model.rs:

`diesel_ext -d "Selectable, Insertable, Queryable" > src\models.rs`

Some imports will need to be added to this file again.


### Frontend
To start the front end web server:

```
cd frontend
npm install
npm start
```
---
### Production
Release versions can be built with:

Backend:
```
cargo build --release
```

Frontend:
```
cd frontend
npm install
npm run build
```

And then copy `frontend/build/*` to your web server's root.
