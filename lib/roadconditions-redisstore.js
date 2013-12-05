var Store = require('./roadconditions-store'),
    redis = require('redis');

function RedisStore(options) {
    var self = this;
    this.options = options || {};

    if (!options.host) {
        throw new Error('RedisStore requires a host; none passed in options');
    }

    this.client = redis.createClient((options.port || 6379), options.host, this.options.clientOpts || null);
    if (options.password) {
        this.client.auth(options.password);
    }

    this.client.on('connect', function(err) {
        if (err) throw err;
        self.client.get('roadconditions:data', function(err, data) {
            if (err) throw err;
            self._init(JSON.parse(data));
        });
    });

    this.client.on('error', function(err) {
        self.emit('error', err);
    });
};

RedisStore.prototype = new Store();

RedisStore.prototype.set = function(data) {
    debugger;
    var self = this;
    this.client.set('roadconditions:data', JSON.stringify(data), function(err, reply) {
        if (err) {
            self.emit('error', err);
            return false;
        }
        self._set(data);
    });
};

RedisStore.prototype.forceRefresh = function() {
    var self = this;
    self.client.get('roadconditions:data', function(err, data) {
        if (err) {
            self.emit('error', err);
            return false;
        }
        self._set(JSON.parse(data), false);
    });
};

module.exports = RedisStore;