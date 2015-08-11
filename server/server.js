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

process.chdir(__dirname);

var fs = require("fs"),
    express = require("express"),
    app = express(),
    hostDB = require("./Host.js"),
    multicastManager = require("./MulticastManager.js"),
    redis = require("redis").createClient();

var hosts = new Array();

app.use(express.bodyParser({uploadDir:"/tmp"}));
app.engine('jshtml', require('jshtml-express'));
app.set('view engine', 'jshtml');

images = fs.readdirSync("/images");

selectedImage = 0;
redis.get("selectedImage", function(err, res)
                {
                        if ( res )
                                selectedImage = parseInt(res);
                })

app.get("/api/currentImage", function(req,res)
                {
                        newParam = req.param("set");
                        console.log(newParam);
                        if ( newParam != undefined && newParam > 0 && newParam < images.length )
                        {
                                selectedImage = newParam;
                                redis.set("selectedImage", newParam);
                        }
                        res.send(images[selectedImage]);
                });

app.get("/api/postImageAction", function(req,res)
                {
                        if ( req.param("set") != undefined  )
                        {
                                redis.set("postImageAction", req.param("set"));
                        }
                        else
                        {
                                redis.get("postImageAction", function(err,redisres)
                                                {
                                                        if ( redisres == undefined )
                                                                res.send("reboot");
                                                        else
                                                                res.send(redisres);
                                                });
                        }
                });

app.get("/api/images", function(req,res)
                {
                        res.json(images);
                });

app.get("/api/hostname", function (req,res)
                {
                        mac = req.param("mac")
                                hostDB.getHostnameByMAC(mac, function(host)
                                                {
                                                        if ( host )
                                                                res.send(host);
                                                        else
                                                                res.send("unknown");
                                                });
                });

app.get("/api/multicastStatus", function(req,res)
                {
                        if ( multicastManager.getStatus() )
                                res.send("running");
                        else
                                res.send("stopped");
                });

app.get("/", function (req,res)
                {
                        res.redirect("/images");
                })

app.get("/images", function(req,res) {
        redis.get("postImageAction", function(err, action)
                        {
                                res.locals({
                                        "images": images,
                                        "selectedImage": selectedImage,
                                        "action": action
                                });

                                res.render("images");
                        });
});


app.post("/hosts", function(req,res) {
        hostDB.loadCSV(req.files.file.path);
        res.redirect("/hosts");
});

app.get("/hosts", function(req,res) {
        if ( req.param("reset") )
        {
                hostDB.resetHosts();
                res.redirect("/hosts");
        }
        else
        {
                hostDB.getHosts(function(hosts)
                                {
                                        redis.mget(hosts, function(err, macAddrs)
                                                        {
                                                                for ( var i = 0; i < hosts.length; i++)
                                                                {
                                                                        hosts[i] = hosts[i].substring(4);
                                                                }
                                                                res.locals({
                                                                        hosts: hosts,
                                                                        macAddrs: macAddrs,
                                                                        "nHosts": hosts.length
                                                                });
                                                                res.render("hosts");
                                                        });
                                });
        }
});


app.get("/multicast", function(req,res) {
        res.locals({
                inProgress: multicastManager.getStatus(),
                pid: multicastManager.getPID(),
                currentImage: images[selectedImage]
        });

        if ( req.param("start") )
        {
                multicastManager.start(images[selectedImage], req.param("autostart"));
                res.redirect("/multicast");
        }
        else if ( req.param("stop") )
        {
                multicastManager.stop();
                res.redirect("/multicast");
        }
        else
                res.render("multicast");
});


app.use("/static", express.static("static"));
app.listen(8080);
