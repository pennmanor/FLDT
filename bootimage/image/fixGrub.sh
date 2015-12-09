#!/bin/bash
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

mount -t devtmpfs none /mnt/dev
mount -t proc proc /mnt/proc
mount -t sysfs sys /mnt/sys

chroot /mnt /bin/bash -c "grub-mkdevicemap"
chroot /mnt /bin/bash -c "grub-install /dev/sda --force"
chroot /mnt /bin/bash -c "update-grub"

umount /mnt/dev
umount /mnt/sys
umount /mnt/proc
