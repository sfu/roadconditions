#!/bin/bash
source ~/.bash_profile
source ~/.bashrc
TMPDIR=/tmp/roadconditions
SHA=`git rev-parse --verify HEAD`
if [ -d "$TMPDIR" ]; then
        rm -rf $TMPDIR
fi

mkdir $TMPDIR
if ! [ -t 0 ]; then
  read -a ref
fi

IFS='/' read -ra REF <<< "${ref[2]}"

BRANCH="${REF[2]}"

echo "checking out branch $BRANCH to $TMPDIR"
git --work-tree=$TMPDIR checkout -f $BRANCH
cd $TMPDIR
/sbin/service roadconditions stop
jake install-npm-deps
jake prepfiles
jake createdir
jake symlink
printf $SHA > $TMPDIR/gitsha
jake install
jake start
cd ~
rm -rf $TMPDIR