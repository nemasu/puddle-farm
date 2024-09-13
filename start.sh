#!/usr/bin/env bash

source .env

STEAM_API_LIB=`find target/release/build/ -name libsteam_api.so`
LD_PRELOAD="$STEAM_API_LIB" target/release/puddle-farm $@
