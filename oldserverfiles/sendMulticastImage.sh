#!/bin/sh

IMAGE_PATH="$1"
IMAGE_NAME="$2"

if [ "$1" = "" ]; then
        echo "Usage: sendMulticastImage.sh IMAGE_PATH IMAGE_NAME [MIN_CLIENTS]"
        exit
fi

for f in `find $IMAGE_PATH/$IMAGE_NAME/sd* -type f | sort -nr`
do
        echo "Starting multicast for $f"
        if [ $3 = "" ]; then
                udp-sender < $f
        else
                udp-sender --full-duplex --min-receivers $3 < $f
        fi
done
