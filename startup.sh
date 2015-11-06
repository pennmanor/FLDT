#!/bin/bash
#
# Script to simplify the setup process of FLDT
#
# Script will ensure all services are running and configure any necessary utilities.

#while getopts u:d:p:f: option
#do
#        case "${option}"
#        in
#                u) USER=${OPTARG};;
#                d) DATE=${OPTARG};;
#                p) PRODUCT=${OPTARG};;
#                f) FORMAT=$OPTARG;;
#        esac
#done

while getopts i:p: option
do
	case "${option}"
	in
		i) INTERFACE=${OPTARG};;
		p) FLDTPATH=${OPTARG};;
	esac
done
echo "Setting up networking"
ip addr add 10.0.0.1/24 dev $INTERFACE
ip link set $INTERFACE up
echo "Restarting DHCP/PXE service"
systemctl restart dnsmasq.service
echo "Starting Redis"
redis-server &
echo "Starting FLDT service"
python $FLDTPATH/server.py
echo "Done. FLDT is now ready to use"
xdg-open http://localhost:8080
