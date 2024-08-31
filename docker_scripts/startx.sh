#!/usr/bin/env bash
#export DISPLAY=:1
#export DBUS_SESSION_BUS_ADDRESS=`dbus-daemon --fork --config-file=/usr/share/dbus-1/session.conf --print-address`
#Xvfb $DISPLAY -screen 0 1920x1080x16 &
#sleep 1
#x11vnc -nodpms -forever -nopw &
#sleep 1
#/usr/games/steam &
cp -rv /rating-update/frontend/build /frontend #put the frontend files in the binded directory
tail -f /dev/null #just prevent docker from exiting
