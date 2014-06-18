FLDT
====

##### The Fast Linux Deployment Toolkit

FLDT (Fast Linux Deployment Toolkit) uses a variety of open source tools to
quickly image and configure Linux hardware, and is versatile enough to handle
either single machines or large batches of systems.

FLDT was developed by Penn Manor High School student Andrew Lobos in conjunction
with the Penn Manor IT Team for use in the 2014 Penn Manor High School 1:1
Student Laptop Program.

Imaging is accomplished by using partclone to copy and restore only the used
blocks from the file system. Images are transferred to clients via NFS or
multicasted via udpcast. FLDT also provides methods for running post-image
scripts, such as machine-specific configurations like automatically setting
hostnames and forcing password change on next boot. Additionally, the host
database and imaging can be managed via a custom Node.js powered web panel.

Information about the Penn Manor 1:1 student laptop
program, which heavily used this software, can be found
[here](http://www.pennmanor.net/techblog/?page_id=1561).

##### External References:

- [Partclone](http://partclone.org/)
- [Udpcast](http://www.udpcast.linux.lu)

## Install
#### Prerequisites
* Node.js
* Redis
* CPIO
* A NFS export of image files located at `/images`
* A DHCP server configured for PXE booting, along with TFTPd
* A compiled Linux kernel with support for your hardware, devtmpfs, and NFS filesystems.

The information listed below will provide generic instructions on the setup process.

#### Installation
Basic installation is as follows:
```bash
# Clone the project and project files
git clone http://github.com/tomswartz07/FLDT

# Install Node.js dependencies
cd FLDT/server
npm install

# Build bootimages
cd ../bootimage
./makeimage
cp -r images/* /var/lib/tftpboot
```

Next, set up a PXE infrastructure to boot the generated images.
For further information on this process, refer to the [PXELINUX project](http://www.syslinux.org/wiki/index.php/PXELINUX).

A detailed guide for setting up the PXE boot environment is found on the [ArchWiki](https://wiki.archlinux.org/index.php/PXE#Server_setup).

#### Creating an Image
The default imaging scripts expect these items in an image:
* A folder in /image with the folder's name
* A sfdisk generated partitiontable.txt
* Each partimage image for each partition named with the drive name (i.e. The file named sda1 will be restored to /dev/sda1)

#### Customizing Image Process
FLDT is not as turn-key as other imaging solutions, such as [FOG](http://www.fogproject.org/) - but it makes up for this in the ease by which it may be configured.

Each "action" that FLDT performs is a separate script, which is put into the bootable image.
If you need FLDT to do something different, simply edit the scripts in ``bootimage/scripts`` and run ``makeimage.sh`` to regenerate the boot images.
