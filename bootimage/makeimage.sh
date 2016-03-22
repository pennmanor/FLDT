#!/bin/sh
#  Copyright 2013 Andrew Lobos and Penn Manor School District
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.
  

server=$(awk -F "=" '/nfsserver/ { print $2 }' ../settings.cfg | tr -d ' ') 

cd image
chmod 777 init
rm ../images/*
rm -r support
cp -R ../support .

for FILE in `find ../scripts -type f`
do
	BASEFILE=`basename $FILE`
	echo "Building $BASEFILE.img"
	cp $FILE image.sh
	chmod 777 image.sh
	sed -i "s/nfsserver/$server/g" image.sh
	find . | cpio -o -H newc | gzip -fc > ../images/$BASEFILE.img
	echo "Done"
done

echo "All images created"
