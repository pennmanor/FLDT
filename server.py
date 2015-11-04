#!/usr/bin/python
# -*- coding: utf-8 -*-
import os
import csv
import configparser
from flask import Flask, render_template, redirect, request
from redis import Redis
from werkzeug import secure_filename

app = Flask(__name__)
config = configparser.RawConfigParser()
configFilePath = 'settings.cfg'
config.read(configFilePath)
redishost = config['db']['host']
redisport = config['db']['port']
redisdb = config['db']['db']
redis = Redis(host=redishost, port=redisport, db=redisdb)
global osDir
osDir = config['setup']['imagepath']


@app.route("/")
def index():
    "Root webpage path, contains a useful `Getting Started` guide"
    return render_template('/index.html')


@app.route("/api/currentImage", methods=['GET', 'POST'])
def currentimage():
    "API to return currently selected image, used by clients during PXE install"
    global selectedImage
    if request.method == 'POST':
        current = request.args.get('set', '')
        redis.set('selectedImage', current)
        selectedImage = redis.get('selectedImage').decode('UTF-8')
        return selectedImage
    elif request.method == 'GET':
        selectedImage = redis.get('selectedImage').decode('UTF-8')
        return selectedImage
    else:
        error = 'Image Selection Error'
        return error


@app.route("/api/postImageAction", methods=['GET', 'POST'])
def imageaction():
    "API to return currently selected post-image action, used by clients during PXE install"
    global postImageAction
    if request.method == 'POST':
        current = request.args.get('set', '')
        redis.set('postImageAction', current)
        postImageAction = redis.get('postImageAction').decode('UTF-8')
        return postImageAction
    elif request.method == 'GET':
        postImageAction = redis.get('postImageAction').decode('UTF-8')
        return postImageAction
    else:
        error = 'PostImage Selection Error'
        return error


@app.route("/api/resethosts", methods=['GET', 'POST'])
def resethosts():
    "API to reset/clear the hosts database"
    if request.method == 'POST':
        verify = request.args.get('reset', '')
        if verify:
            hosts = redis.keys('host*')
            for host in hosts:
                mac = redis.get(host)
                redis.delete(host)
                redis.delete(mac)
            return redirect('/hosts')
    elif request.method == 'GET':
        return redirect('/hosts')
    else:
        error = 'Hostname Deletion Error'
        return error


@app.route("/api/hostname", methods=['GET', 'POST'])
def hostnamequery():
    "API to return hostname based upon MAC address, used by clients during PXE install"
    if request.method == 'POST':
        # Do some magic to set hostname, maybe?
        # Could allow for offline enrolment, similar to FOG
        return 'yes'
    elif request.method == 'GET':
        try:
            current = request.args.get('mac', '')
            hostname = redis.get('mac'+current).decode('UTF-8')[4:]
            return hostname
        except Exception:
            # The host is unknown, so set hostname as such
            error = 'unknown'
            return error
    else:
        error = 'Hostname Error'
        return error


@app.route("/images/")
def images(images=['']):
    images = os.listdir(osDir)
    return render_template('images.html', images=images, osDir=osDir)


@app.route("/hosts", methods=['GET', 'POST'])
def hosts():
    "Defines the Host page functions"
    clients = []
    hosts = redis.keys('host*')
    for host in hosts:
        mac = redis.get(host)
        clients.append((host, mac))
    nHosts = len(hosts)
    if request.method == 'POST':
        rawfile = secure_filename(request.files['file'].filename)
        if rawfile and allowed_file(request.files['file'].filename):
            with open(rawfile, 'r') as hostcsvfile:
                reader = csv.reader(hostcsvfile)
                try:
                    for row in reader:
                        redis.set("mac"+row[1], "host"+row[0])
                        redis.set("host"+row[0], "mac"+row[1])
                    return redirect('/hosts')
                except:
                    print('CSV Parse Fail!')
    return render_template('hosts.html', nHosts=nHosts, clients=clients)


def allowed_file(filename):
    "Method for checking filetypes for /hosts"
    ALLOWED_EXTENSIONS = set(['txt', 'csv'])
    return '.' in filename and filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS


@app.route("/multicast", methods=['GET', 'POST'])
def multicast(inProgress=False, minClients='47'):
    "Configures the MulticastManager Processes"
    import subprocess
    global cmd
    global pid
    try:
        pid
    except NameError:
        pid = None
    try:
        cmd
    except NameError:
        cmd = None
    try:
        inProgress = redis.get('inProgress').decode('UTF-8')
    except AttributeError:
        redis.set('inProgress', False)
        inProgress = redis.get('inProgress').decode('UTF-8')
    try:
        selectedImage = redis.get('selectedImage').decode('UTF-8')
    except BaseException:
        redis.set('selectedImage', 'Not Selected')
        inProgress = redis.get('selectedImage').decode('UTF-8')
    try:
        postImageAction = redis.get('postImageAction').decode('UTF-8')
    except BaseException:
        redis.set('postImageAction', 'shell')
        postImageAction = redis.get('postImageAction').decode('UTF-8')
    if request.method == 'POST':
        currentStatus = request.form.get('inProgress', '')
        minClients = request.form.get('minClients', '')
        redis.set('inProgress', currentStatus)
        if currentStatus == 'True':
            print("Starting process")
            udpCommand = ["oldserverfiles/sendMulticastImage.sh", osDir, selectedImage, minClients]
            cmd = subprocess.Popen(udpCommand, stdout=subprocess.PIPE, stdin=subprocess.PIPE)
            pid = cmd.pid
            return redirect('/multicast')
        elif currentStatus == 'False':
            subprocess.Popen(["pkill", "udp-sender"])
            return redirect('/multicast')
    if cmd != None:
        if cmd.poll() != 0:
            status = cmd.poll()
            print("Status:", status)
            redis.set('inProgress', False)
    return render_template('multicast.html', minClients=minClients,
                           pid=pid, selectedImage=selectedImage,
                           inProgress=inProgress, postImageAction=postImageAction)


if __name__ == "__main__":
    serverport = int(config['setup']['http_port'])
    app.run(host='0.0.0.0',port=serverport)
