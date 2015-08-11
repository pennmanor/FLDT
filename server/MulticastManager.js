/*
   Copyright 2013 Andrew Lobos and Penn Manor School District

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
   */

var child_process = require("child_process"),
    process = undefined;

function getStatus()
{
        return process != undefined;
}

function start(image, minClients)
{
        if ( image == "" || process != undefined )
                return false;
        if ( minClients == undefined )
                minClients = "";
        process = child_process.exec("/bin/sh sendMulticastImage.sh "+image+" "+minClients);
        process.on("exit", function()
                        {
                                process = undefined;
                        });
        return true;
}

function stop()
{
        if ( process == undefined )
                return false;
        process.kill();
        child_process.exec("killall udp-sender");
        return true;
}

function getPID()
{
        if ( process == undefined)
                return 0;
        return process.pid;
}

exports.start = start;
exports.stop = stop;
exports.getPID = getPID;
exports.getStatus = getStatus;
