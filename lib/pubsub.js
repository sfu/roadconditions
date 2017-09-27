var redis = require('redis'),
  EventEmitter = require('events').EventEmitter

exports.init = function(config) {
  var pubsub = new EventEmitter(),
    pub,
    sub

  config = config || {}
  if (!config.host) {
    throw new Error('Redis Pub/Sub requires a hostname; none passed in options')
  }

  pub = redis.createClient(config.port || 6379, config.host, config.clientOpts)
  sub = redis.createClient(config.port || 6379, config.host, config.clientOpts)

  if (config.password) {
    pub.auth(config.password)
    sub.auth(config.password)
  }

  pub.on('connect', function() {
    pubsub.emit('connect', 'publisher')
  })
  pub.on('error', function(err) {
    pubsub.emit('error', 'publisher', err)
  })
  sub.on('connect', function() {
    pubsub.emit('connect', 'subscriber')
    sub.subscribe(config.channel)
  })
  sub.on('error', function(err) {
    pubsub.emit('error', 'publisher', err)
  })

  pubsub.pub = pub
  pubsub.sub = sub
  return pubsub
}
