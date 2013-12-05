var fs = require('fs'),
    storeDir = __dirname + '/lib/engines/';

fs.readdirSync(storeDir).forEach(function(store) {
    var name = store.split('.js')[0];
    module.exports[name] = require(storeDir + name);
});