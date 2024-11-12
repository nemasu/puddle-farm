#!/usr/bin/env bash

if [ ! -f .env ]; then
        echo "Run this from the root of the project"
        exit 1
fi

source .env

STEAM_API_LIB=`find ./target/release/build/ -name libsteam_api.so`

while true; do
        LD_PRELOAD="$STEAM_API_LIB" target/release/puddle-farm $@
        if [ -z "$1" ]; then
                sleep 5 #Web server should be restarted immediately
        else
                sleep 90 #Pull can wait a bit
        fi
done;
