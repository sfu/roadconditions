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
service roadconditions stop
jake symlink
jake install
jake gitsha
jake start
cd ~
rm -rf $TMPDIR