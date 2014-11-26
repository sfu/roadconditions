#!/bin/sh

DATA=`/usr/bin/curl -s http://www.sfu.ca/security/sfuroadconditions/api/2/current`
REDISPW='Lg9DJ}yVxVLeTFQr|u[6UDdBWA3pTq'
REDISCLI=/usr/local/bin/redis-cli
if [ "$1" = '' ] ; then
    REDISHOST=redis-stage.its.sfu.ca
else
    REDISHOST=$1
fi
GETCMD='GET roadconditions:data'
PUBCMD=''
echo "\nUpdating redis server on ${REDISHOST} with data from production app...\n"

$REDISCLI -h $REDISHOST -a $REDISPW set roadconditions:data "$DATA" > /dev/null
$REDISCLI -h $REDISHOST -a $REDISPW $GETCMD
$REDISCLI -h $REDISHOST -a $REDISPW publish roadconditions:update "{\"message\": \"conditionsupdated\", \"server\": \"$HOSTNAME\" }" > /dev/null
echo