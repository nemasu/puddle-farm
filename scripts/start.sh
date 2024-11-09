#!/usr/bin/env bash

if [ ! -f .env ]; then
	echo "Run this from the root of the project"
	exit 1
fi

source .env

mkdir -p logs

STEAM_API_LIB=`find ./target/release/build/ -name libsteam_api.so`

while true; do
	crash_count=`ls ./logs/crash-* | wc -l`
	if [ $crash_count -gt 5 ]; then
		sleep 60
	fi;

	if [ $crash_count -gt 20 ]; then
		sleep 240
	fi;

	if [ $crash_count -gt 32 ]; then
		exit 1
	fi;

	LD_PRELOAD="$STEAM_API_LIB" target/release/puddle-farm $@
	mv "${LOGFILE_PATH}" ./logs/crash-`date +%s`.log
	sleep 5
done;


