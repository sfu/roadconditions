#!/bin/sh

DATA=`/usr/bin/curl -s http://www.sfu.ca/security/sfuroadconditions/api/1/current`
REDISPW='Lg9DJ}yVxVLeTFQr|u[6UDdBWA3pTq'
REDISCLI=/usr/local/bin/redis-cli
REDISHOST=redis-stage.its.sfu.ca
GETCMD='GET roadconditions:data'
PUBCMD=''
$REDISCLI -h $REDISHOST -a $REDISPW set roadconditions:data "$DATA"
$REDISCLI -h $REDISHOST -a $REDISPW $GETCMD
$REDISCLI -h $REDISHOST -a $REDISPW publish roadconditions:update "{\"message\": \"conditionsupdated\", \"server\": \"$HOSTNAME\" }"