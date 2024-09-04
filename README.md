# Rating Update

This project is a replacement for [Rating Update](https://github.com/nemasu/rating-update), it is still being developed.


## Getting Started

### Backend

A postgresql server needs to be available, set the DATABASE_PATH in your .env file accordingly.
eg. `DATABASE_PATH="postgresql://user:password@localhost/rating_update?user=ru_user&password=ru_password"`

Install diesel_cli, and create the database.
```
cargo install diesel_cli
source .env
diesel --database-url "${DATABASE_PATH}" migration run
```

`cargo run` to start the server.

`cargo run migrate <path>` can be used to import an old sqlite3 database.

`cargo run pull` will run the timed jobs continuously: grab replay, update ratings, update ranking, etc.

`cargo run hourly` runs the hourly jobs once, then exists.

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