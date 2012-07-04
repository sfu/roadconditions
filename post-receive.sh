#!/bin/bash
source ~/.bash_profile
source ~/.bashrc
TMPDIR=/tmp/roadconditions

if [ -d "$TMPDIR" ]; then
        rm -rf $TMPDIR
fi

mkdir $TMPDIR
echo "checking out files to $TMPDIR"
git --work-tree=$TMPDIR checkout -f master
cd $TMPDIR
jake install-npm-deps
jake prepfiles
jake createdir
jake symlink
jake install
jake start
cd ~
rm -rf $TMPDIR