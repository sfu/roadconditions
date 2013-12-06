var Store = require('../Store'),
    fs = require('fs');

function readFile(filename, cb) {
    fs.readFile(filename, function(err, data) {
        if (err) throw err;
        try {
            data = JSON.parse(data);
        } catch (jsonError) {
            throw jsonError;
        }
        cb(data);
    });
};

function FileStore(options) {
    var self = this;
    this.options = options || {};
    // check for filename passed in options
    if (!this.options.filename) {
        throw new Error('FileStore requires a filename; none passed in options');
    }

    // try to read file, parse and store in cache
    readFile(this.options.filename, function(data) {
        self._init(data);
    });
};

FileStore.prototype = new Store();

FileStore.prototype.set = function(data){
    var self = this;
    fs.writeFile(this.options.filename, JSON.stringify(data), function(err) {
        if (err) {
            self.emit('error', err);
            return false;
        }
        self._set(data);
    });
};

FileStore.prototype.forceRefresh = function() {
    var self = this;
    readFile(this.options.filename, function(data) {
        self._set(data, false);
    });
};

module.exports = FileStore;