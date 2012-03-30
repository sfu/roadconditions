
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
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
