![Build Status](https://github.com/nemasu/puddle-farm/actions/workflows/rust.yml/badge.svg)

# Puddle Farm
### About
This project is aimed to become a replacement for [Rating Update](https://github.com/nemasu/rating-update).

It is currently being hosted at [Puddle.farm](https://puddle.farm)

### Requirements
- Rust (cargo)
- Postgres
- Redis
- Node.js
- Steam

### Major Changes from Rating Update
- Rocket 0.5 => Axum
- Sqlite3 => Postgres with Diesel ORM
- Handlebars (the templated frontend) => React
- Tracks official rating.
- Redis for temporary data.


## Getting Started

### Steam
A Steam account that owns GGST needs to be authenticated and the client running.

If you're not using a GUI, use `scripts/startx.sh` to start an Xvfb/x11vnc session and VNC into localhost:0 to log in.

To be able to start on boot, you will need to check "Remember me".

### Backend
#### Postgres
A postgresql server needs to be available, set the DATABASE_URL in your .env file accordingly.

eg. `DATABASE_URL="postgresql://user:password@localhost/puddle_farm"`

#### Redis
A Redis server also needs to be running. Set REDIS_URL:

eg. `REDIS_URL="tcp://localhost:11211"`

#### Diesel
Install diesel_cli, and create the database:
```
cargo install diesel_cli
source .env
diesel --database-url "${DATABASE_URL}" migration run
```

`cargo run` to start the server.

`cargo run pull` will run the timed jobs continuously: grab replay, update ratings, update ranking, update redis, etc.

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

#### Backend:
```
cargo build --release
```

#### Frontend:
```
cd frontend
npm install
npm run build
```

Then copy `frontend/dist/*` to your web server's root.

There is an nginx configuration example available: `nginx.conf.example`.

### Start on boot
Once it's configured and can run, it is possible to have it start on boot.

Edit the user and paths in the service files, and then copy them:

```
sudo cp systemd/* /etc/systemd/system/
sudo systemctl enable pf-x.service
sudo systemctl enable pf-web.service
sudo systemctl enable pf-pull.service

sudo systemctl enable nginx.service
```

Steam needs to automatically log into a user when it starts for this to work.