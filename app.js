var fs = require('fs')
,   express = require('express')
,   hbs = require('hbs')
,   moment = require('moment');

hbs.handlebars.registerHelper('dateFormat', function(context, block) {
  if (moment) {
    var f = block.hash.format || "MMM Mo, YYYY";
    return moment(new Date(context)).format(f);
  } else {
    return context;
  };
});


var app = module.exports = express.createServer(express.logger());

var conditionsJSON = __dirname + '/data/conditions.json';
var conditions = JSON.parse(fs.readFileSync(conditionsJSON));
fs.watch(conditionsJSON, function(event, filename) {
    if (event === 'change') {
        var conditions = JSON.parse(fs.readFileSync(conditionsJSON));
        console.log('reloaded conditions', conditions);
    }
});
// Configuration

app.configure(function(){
    app.set('view engine', 'hbs');
    app.set('views', __dirname + '/views');
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
    res.render('index', conditions);
});

app.get('/admin', function(req, res) {
    res.render('admin', conditions);
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
