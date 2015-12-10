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
pacman -S python-pip redis cpio git partclone

# PXE required
pacman -S dnsmasq darkhttpd nfs-utils

#udpcast from AUR
yaourt -S udpcast
```

## Required Files

### Files for FLDT
For this documentation, we're storing FLDT files in the home folder and the image we want to deploy is titled 'DeployableImage'. Clone FLDT and change into it's directory.
```bash
cd ~
git clone http://github.com/tomswartz07/FLDT
cd FLDT
```

Make a folder to store the deployable images. This shared folder will be configured in the NFS exports section.
```bash
mkdir -p /images # Root folder for all images
mkdir -p /images/DeployableImage # Contains files needed for DeployableImage's image
```

### Files for Support Services
A tarball of the files needed for bootstrapping PXE are included in `pxeboot.tar.gz`

The tarball includes a very small (23MB) PXE kernel, a VESA bootmenu, and bootable x86_32/x86_64 Linux kernels provided by [FLDT-Buildroot](https://github.com/pennmanor/FLDT-Buildroot).

These files will be supplemented via the FLDT-generated deployment images.
```bash
mkdir /pxeboot
cp pxeboot.tar.gz /pxeboot
cd /pxeboot
tar xzvf pxeboot.tar.gz
```

## Services

Several services must be configured before FLDT may run.

### DNSmasq
DNSMasq provides basic DHCP and PXE configuration. This allows the devices you wish to set up to be network-booted.

Edit the file `/etc/dnsmasq.conf` to add the following:
```conf
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
Finally (re)start the dnsmasq service. For future reference, you can watch the DHCP service log for troubleshooting.
```bash
# Bring up network interface with specified address
ip addr add 10.0.0.1/24 dev «DEVICE NAME»
# (Re)start the dnsmasq service
systemctl restart dnsmasq.service
# Optional; watch DHCP server log
journalctl -u dnsmasq.service -f
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

### FLDT
Next, set up the FLDT services. The `makeimage.sh` script will build the necessary scripts into files that are appended to the PXE bootimage.

If you have additional scripts to add, they should be copied to `~/FLDT/bootimage/scripts` now.
Each one of the script files will create a new file that you may add to `/pxelinux/pxelinux.cfg/default` to perform different actions.

```bash
cd ~/FLDT/bootimage
mkdir images # Create the folder where the built images will output
./makeimage.sh # Run the script to create bootable images
cp -r images/* /pxeboot/. # Copy generated images to PXE folder for use
```

## Creating a deployment image
For our setup, a [Jenkins](https://jenkins-ci.org/)/[Hudson](https://hudson-ci.org/) instance creates a new image daily, which is copied to a server.
The image is created using [Packer](http://packer.io) to automate all steps of the process.
At the conclusion of the Packer build, we obtain a single file that is able to be used by FLDT.
The `build.img` file is then saved to our FLDT server as `sda1` into it's respective folder in ``/images``

As an example, a basic Packer file has been provided.
To create a basic deployable image, perform the following:

1. Install [Packer](http://packer.io) using their [setup guide](https://packer.io/intro/getting-started/setup.html).
2. Begin the image build process:

```bash
# Basic build
packer build packer-example.json

# If you prefer to customize the build, change values wrapped in <brackets>:
packer build -var "version=<$BUILD_ID>" -var "partclone_image=<$IMAGE_NAME>.img"\
 -var "sharedfolder_path=<$PATH/TO/SHARE>" -var "hostname=<$HOSTNAME>"\
 -var "viewmode=false" packer-example.json
```

Packer will automatically set up an installable image, with zero input necessary.
If you set the `-var` viewmode to 'false', the entire process will occur in a viewable window.

Next, create a file that FLDT will use to create partitions.
Essentially, this file tells FLDT how to divide up the client computer's drive.

To easily create this file, continue through the rest of this document without the `partitons.txt` file, and when you PXE boot a device, select 'Boot to Shell'.
When the device boots, [set up the disk with GNU Parted](https://wiki.archlinux.org/index.php/GNU_Parted) and copy each command into a new line of the `partitons.txt` file.
Copy this file to your `/images/<IMAGENAME>/` folder and you'll be all set for imaging.

A very basic example of a `partitons.txt` file is as follows:
```
mkpart primary ext4 1MiB 20GiB
set 1 boot on
mkpart primary ext4 20GiB 100%
```
The above will create a simple 20 GiB root partition and a `/home` partiton that uses the remaining space of the drive.

The default imaging scripts expect these items to deploy an image, (for example, titled DeployableImage1):

* A folder in `/images` with the image's name
* Each partimage image for each partition named with the device name (i.e. The file named `sda1` will be restored to /dev/sda1, which resides in `/images/DeployableImage`)
* A sfdisk generated `partitiontable.txt` (should also be in `/images/DeployableImage`)
* A simple bash script with actions to perform after the image has been applied. This can be anything from resetting the default password to simply rebooting the device.

An example folder layout for the /images folder, as expected by FLDT:
```
/images
├─> DeployableImage1
│ ├─> sda1
│ ├─> sda2
│ ├─> partitontable.txt
│ └─> postimageaction.sh
└─> DeployableImage2
  ├─> sda1
  ├─> partitontable.txt
  └─> postimageaction.sh
```

## Imaging
At this point, most of the heavy work is now complete. Congrats!

The only remaining task is to start the FLDT service and begin the imaging process.

The following steps will start the process.
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
If FLDT has been previously set up, the above steps are only needed to begin the service after a fresh reboot.

Alternately, a simple setup script has been provided in the root of the FLDT folder.
To use, simply run `./startup.sh -p /full/FLDT/path -i networkInterfaceName`

Navigate to http://localhost:8080 to access the FLDT interface

Select the image on the Images page, load the hosts .csv as directed on the Hosts page, and finally enter the number of hosts and begin multicasting on the Multicasting page.

As the targeted devices netboot, they should be picked up by the PXE service and begin to image with the file you have created.
