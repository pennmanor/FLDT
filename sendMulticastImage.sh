#!/bin/sh

IMAGE_PATH="$1"
IMAGE_NAME="$2"
INTERFACE="$3"

if [ "$1" = "" ]; then
        echo "Usage: sendMulticastImage.sh IMAGE_PATH IMAGE_NAME INTERFACE [MIN_CLIENTS]"
        exit
fi

for f in `find $IMAGE_PATH/$IMAGE_NAME/sd* -type f | sort -nr`
do
        echo "Starting multicast for $f"
        if [ $4 = "" ]; then
                udp-sender--interface $3 < $f
        else
                udp-sender --full-duplex --interface $3 --min-receivers $4 < $f
        fi
done
