var clone = require('clone')
var Store = function(options) {
  this.options = options || {}
  var _cache

  this.cache = function(data) {
    // getter
    if (!data) {
      return clone(_cache)
    } else {
      _cache = data
    }
  }
}

Store.prototype.__proto__ = require('events').EventEmitter.prototype

// Individual stores should define their own #set method and possibly #get
Store.prototype.set = function() {}
Store.prototype.get = function() {
  return this.cache()
}

// Implementations should call #init in their constructor to handle firing storeReady
Store.prototype._init = function(data) {
  this._set(data, false)
  this.emit('ready')
}

// Individual stores' #set methods should call #_set to handle firing storeUpdated
Store.prototype._set = function(data, emit) {
  emit = arguments.length === 1 ? true : emit
  this.cache(data)
  if (emit) this.emit('updated', data)
}

module.exports = Store
