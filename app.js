var fs = require('fs')
,   express = require('express')
,   hogan = require('hogan')
,   hoganadapter = require('./hogan-adapter');

var app = module.exports = express.createServer(express.logger());

var conditions = JSON.parse(fs.readFileSync('./data/conditions.json'));

// Configuration

app.configure(function(){
    app.set('view engine', 'hogan.js');
    app.set('view options', {layout:false});
    app.set('views', __dirname + '/views');
    app.register('hogan.js', hoganadapter.init(hogan));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express['static'](__dirname + '/public'));
    app.enable('jsonp callback');
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// HTML Routes
app.get('/', function(req, res) {
    fs.readFile('./public/index.html', 'utf-8', function(err, data) {
        if (err) { res.send(404); }
        res.send(data);
    });
});

// API Routes
app.get('/api/1/conditions/:key?', function(req, res) {
    var data = {}, status = 200;
    if (!req.param('key')) { 
        data = conditions;
    } else {
        var key = req.param('key');
        if (conditions.hasOwnProperty(key)) {
            data[key] = conditions[key];
            data['lastupdated'] = conditions.lastupdated;
        } else {
            status = 404;
            data = {error: 'not found', key: key};
        }
    }
    res.json(data, status);
});

// OH NO YOU DIDNT
app.del('*', function(req, res) { res.send(405); });
app.put('*', function(req, res) { res.send(405); });

app.listen(3001);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
