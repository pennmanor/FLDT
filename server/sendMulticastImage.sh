#!/bin/sh

IMAGE_NAME="$1"

if [ "$1" = "" ]; then
        echo "Usage: sendMulticastImage.sh IMAGE_NAME [MIN_CLIENTS]"
        exit
fi

for f in `find /images/$IMAGE_NAME/sd* -type f | sort -nr`
do
        echo "Starting multicast for $f"
        if [ $2 = "" ]; then
                udp-sender < $f
        else
                udp-sender --min-receivers $2 < $f
        fi
done
