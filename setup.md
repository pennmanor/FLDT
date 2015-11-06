# Setup Process

Setup process has been tested for ArchLinux, but should be similar for Ubuntu or other.

ArchLinux was chosen because of the completeness of their documentation with regard to the individual software parts.


## Prerequisites

Please assure you have enough disk space to maintain this project.
The root filesystem will need about 30G of free space (after OS install)

*If a base OS install has not already been completed, please follow instructions* [here](https://wiki.archlinux.org/index.php/Beginners_Guide).

Install the required software as follows:

```bash
# FLDT required
pacman -S redis cpio git udpcast partclone

# PXE required
pacman -S dnsmasq darkhttpd nfs-utils
```

## Required Files

### Files for FLDT
Make a folder to store the deployable images. This shared folder will be configured in the NFS exports section.
```bash
mkdir -p /images/ # Root folder for all images
mkdir -p /images/DeployableImage # Folder containing all files needed for DeployableImage's image
```
For this setup, a Jenkins/Hudson instance creates a new image daily, which is copied to a server.
The image is created using [Packer](http://packer.io) to automate all steps of the process.
At the conclusion of the Packer build, Jenkins runs partclone to generate a `build.img`.
The `build.img` file is then rsync'ed to a server as sda1

The default imaging scripts expect these items to deploy an image:

* A folder in /image with the folder's name
* Each partimage image for each partition named with the drive name (i.e. The file named sda1 will be restored to /dev/sda1)
* A sfdisk generated partitiontable.txt


### Files for Support Services
A tarball of the files needed for bootstrapping PXE are included in `pxeboot.tar.gz`

The tarball includes a very small (17kB) PXE kernel, a vesa bootmenu, and bootable x64/386 linux kernels provided by [Popcorn Linux](http://www.popcornlinux.org/).

These files will be supplemented via the FLDT-generated deployment images.
```bash
mkdir /pxeboot
cp /path/to/pxeboot.tar.gz /pxeboot
tar xzvf /pxeboot/pxeboot.tar.gz /pxeboot
```
The `makeimage.sh` script will automatically build in any extra scripts to the PXE image.
If you have extra scripts to add (there are a few included here) run `makeimage.sh` at this time.

## Services

Several services must be configured before FLDT may run.

### dnsmasq
DNSMasq provides basic DHCP and PXE configuration. This allows the devices you wish to set up to be network-booted.

Edit the file `/etc/dnsmasq.conf` to add the following:
```bash
# Disables DNS function, only enabling DHCP and TFTP
port=0

# Replace with Ethernet interface used (eth0, enp2s0, etc)
interface=«ETH INTERFACE»

# Bind the network interface to the service
bind-interfaces

# Enable DHCP service, expiry of 45 minutes
dhcp-range=10.0.0.50,10.0.0.150,45m

# PXE file
dhcp-boot=pxelinux.0

# Define boot menu options
dhcp-option-force=209,pxelinux.cfg/default

# Enable TFTP and define path to all PXE files
enable-tftp
tftp-root=/pxeboot
```
Finally (re)start the dnsmasq service, and optionally watch the output as devices connect
```bash
ip addr add 10.0.0.1/24 dev «DEVICE NAME» # Start eth device with address for PXE booting
systemctl restart dnsmasq.service
journalctl -u dnsmasq.service -f # Optional; watch DHCP connection info
```

### NFS
Configure the NFS shares on the system. These file shares allow the client computers to access the image files.

You might need to set up ID mapping for a domain. This is optional.
First, set up the ID mapping, and set the Domain: `/etc/imapd.conf`
```bash
[General]

Verbosity = 1
Pipefs-Directory = /var/lib/nfs/rpc_pipefs
Domain = FLDT

[Mapping]

Nobody-User = nobody
Nobody-Group = nobody
```

Next, configure the NFS root export.
For security reasons, it is recommended to use an NFS export root which will keep users limited to that mount point only.
Define shares in `/etc/exports` which are relative to the NFS root.

```bash
mkdir -p /srv/nfs4/images
chmod 0774 /srv/nfs4/images
# Now mount the actual target share `/images` to the NFS share
mount --bind /images /srv/nfs4/images
```

To assure that the NFS share 'sticks' across reboots, add the following line to `/etc/fstab`
```bash
/images /srv/nfs4/images none bind 0 0
```

Next, add directories to be shared (and IP addresses of who will access them) to `/etc/exports`.

```bash
/srv/nfs4/ *(rw,fsid=root,no_subtree_check)
/srv/nfs4/images *(rw,no_subtree_check,nohide)
# Note the nohide option which is applied to mounted directories on the file system.
```
If the imaging server will be exclusively offline (i.e. not on the local network), then 'global' permission may be set up as noted above. **Use this option with extreme caution.**

After modifying `/etc/exports`, it is necessary to refresh the service via the command: `exportfs -rav`

Finally, (re)start the NFS server via the command: `systemctl start nfs-server.service`

These NFS shares will be from where the images themselves are served to the clients.
Each folder within the `/images` directory should contain the files needed for imaging.

There are three files that are needed for imaging a device:

1. `sda1` : a file named after each drive and partition
2. `partitiontable.txt` : a text file with partitions used for setting drive partition size
3. `postimage.sh` : a script that contains actions to perform following the image install

The `partitiontable.txt` file will be generated once FLDT is up and running, but prior to imaging.

### FLDT
Next, set up the FLDT services.
```bash
cd ~/ # We're storing FLDT files in home folder, for ease of location
git clone http://github.com/tomswartz07/FLDT
cd FLDT/bootimage
./makeimage.sh # Run the script to create bootable images
cp -r images/* /pxeboot # Move generated images to PXE folder for use
cd ../server
npm install # Install FLDT service and dependencies
redis-server & # Start Redis server,  '&' will fork it to background
node server.js
```

## Imaging
At this point, most of the heavy work is now complete.

Navigate to http://localhost:8080 to access the FLDT interface

Select the image on the Images page, load the hosts .csv as directed on the Hosts page, and finally enter the number of hosts and begin multicasting on the Multicasting page.

As the targeted devices netboot, they should be picked up by the PXE service.

If you do not have a `partitiontable.txt` file already, select 'Boot to Shell' and [set up your disks with fdisk/sfdisk](https://wiki.archlinux.org/index.php/Partitioning#Fdisk_usage_summary).
You can then capture the data via the command: `sfdisk -d /dev/sda > partitiontable.txt`
Copy this file to your `/images/<IMAGENAME>/` folder and you'll be all set for imaging.

If FLDT has been previously set up, the following steps are only needed to begin the service after a fresh reboot:
```bash
# Navigate to FLDT directory
cd /path/to/FLDT

# Enable Network Devices
ip addr add 10.0.0.1/24 dev «DEVICE»
ip link set «DEVICE» up

# Start/restart support services
systemctl restart dnsmasq
redis-server &

# Start FLDT
python server.py
# FLDT can now be accessed via web browser: http://localhost:8080
```
Alternately, a simple setup script has been provided in the root of the FLDT folder.
To use, simply run `./startup.sh -p /full/FLDT/path -i networkInterfaceName`
