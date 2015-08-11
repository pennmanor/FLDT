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

var fs = require("fs"),
    hostDB = new Array(),
    redis = require("redis").createClient();

function loadCSV(path)
{
        fs.readFile(path, function(err, data)
                        {
                                if ( !err )
                                {
                                        lines = data.toString().split("\n");
                                        for ( var i = 0; i < lines.length; i++ )
                                        {
                                                d = lines[i].toString().split(",");
                                                addHost(d[0], d[3]);
                                        }
                                }
                        });
}


function addHost(hostname, mac)
{
        if ( hostname == undefined || mac == undefined )
                return false;
        redis.set("host"+hostname, mac);
        redis.set("mac"+mac, hostname);
}

function resetHosts()
{
        redis.flushdb();
}

function getNumHosts(callback)
{
        redis.keys("host*", function(err, res) {
                callback(res.length);
        })
}

function getHosts(callback)
{
        redis.keys("host*", function(err, res) {
                callback(res);
        })
}

function getHostnameByMAC(mac, callback)
{
        redis.get("mac"+mac, function(err, data)
                        {
                                callback(data);
                        });
}

exports.loadCSV = loadCSV;
exports.hosts = hostDB;
exports.addHost = addHost;
exports.resetHosts = resetHosts;
exports.getNumHosts = getNumHosts;
exports.getHosts = getHosts;
exports.getHostnameByMAC = getHostnameByMAC;
