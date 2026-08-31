FROM rust:slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*

RUN cargo install diesel_cli --no-default-features --features postgres

ENTRYPOINT ["diesel"]
