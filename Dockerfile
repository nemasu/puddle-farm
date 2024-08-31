FROM docker.io/rustlang/rust:nightly AS rust-builder

WORKDIR /rating-update
COPY . .
RUN cargo build --release

FROM node:18-alpine AS react-builder

WORKDIR /rating-update
COPY . .
WORKDIR /rating-update/frontend
RUN npm install


FROM ubuntu:latest

RUN mkdir /app
COPY docker_scripts/startx.sh /app
COPY --from=rust-builder /rating-update /rating-update
COPY --from=react-builder /rating-update/frontend/build /frontend

# ENV TZ=Etc/UTC
# RUN DEBIAN_FRONTEND=noninteractive \
#   && ln -fs /usr/share/zoneinfo/Etc/UTC /etc/localtime \
#   && dpkg --add-architecture i386 \
#   && apt-get update \
#   && apt-get install -y steam xvfb x11vnc dbus-x11

#VNC
#EXPOSE 5900/tcp

#app
EXPOSE 8001/tcp

CMD ["bash", "/app/startx.sh"]
