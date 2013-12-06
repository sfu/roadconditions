var redis = require('redis'),
    EventEmitter = require('events').EventEmitter;

exports.init = function(config, logger) {
    var emitter = new EventEmitter(),
        pub, sub, clients = [];

    config = config || {};
    if (!config.host) {
        throw new Error('Redis Pub/Sub requires a hostname; none passed in options');
    }

    pub = redis.createClient((config.port || 6379), config.host, config.clientOpts);
    sub = redis.createClient((config.port || 6379), config.host, config.clientOpts);

    if (config.password) {
        pub.auth(config.password);
        sub.auth(config.password);
    }

    sub.subscribe('roadconditions:update');

    pub.on('connect', function() { emitter.emit('connect', 'publisher')});
    pub.on('error', function(err) { emitter.emit('error', 'publisher', err) });
    pub.on('connect', function() { emitter.emit('connect', 'subscriber')});
    pub.on('error', function(err) { emitter.emit('error', 'publisher', err) });

};