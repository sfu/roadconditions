var fs = require('fs')
,   express = require('express')
,   moment = require('moment')
,   schema = require('schema')('conditions')
,   cas = require('cas-sfu')
,   app = module.exports = express.createServer()
,   conditionsPath = __dirname + '/data/conditions.json'
,   conditions = JSON.parse(fs.readFileSync(conditionsPath))
,   schemaPath = __dirname + '/data/conditions_schema.json'
,   conditionsSchema = schema.Schema.create(JSON.parse(fs.readFileSync(schemaPath)))
,   cas, casService;

fs.watch(conditionsPath, function(event, filename) {
    if (event === 'change') {
        var conditions = JSON.parse(fs.readFileSync(conditionsPath));
        console.log('reloaded conditions', conditions);
    }
});
// Configuration

app.listen(3001);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);


app.configure(function(){
    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');
    app.use(express.favicon('public/favicon.ico'));
    express.logger.token('user', function(req, res) { var user = '-'; if (req.session && req.session.auth) { user = req.session.auth.user; } return user; });
    app.use(express.logger({format: ':remote-addr - :user [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'}));
    app.use(express.cookieParser());
    app.use(express.session({secret: 'YJrJ2wfqWRfVsaBVVFDYDKtmjAjKAXZ7AZKDtoGzaTrZPDDp'}));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express['static'](__dirname + '/public'));
    app.enable('jsonp callback');
    app.helpers({
        dateFormat: function(date, format) {
            if (moment) {
                return moment(new Date(date)).format(format);
            } else {
                return date;
            }
        }
    });
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    casService = 'http://icat-eryn.its.sfu.ca:' + app.address().port + '/login';
});

app.configure('production', function(){
    app.use(express.errorHandler());
    casService = 'http://www.sfu.ca/security/sfuroadconditions/login';
});

// Authentication middleware
var casauth = cas.getMiddleware({
    service: casService,
    allow: 'sfu',        // TODO enter correct maillists in order (supervisor, dispatcher)
    userObject: 'auth'
});

var loggedin = function(req, res, next) {
    if (req.session && req.session.auth) {
        next();
        return;
    }
    req.session.referer = req.url;
    res.redirect('/login');
};


// HTML Routes
app.get('/', function(req, res) {
    res.render('index', conditions);
});

app.get('/admin', loggedin, function(req, res) {
    res.render('admin', conditions);
});

// Authentication Routes
app.get('/login', casauth, function(req, res) {
    res.redirect(req.session.referer || '/admin');
});

app.get('/logout', function(req, res) {
    if (req.session) {
        req.session.destroy();
    }
    res.redirect(cas.options.casBase + cas.options.logoutPath + "?url=" + encodeURIComponent(casService) + "&urltext=Click+here+to+return+to+the+Road+Conditions+application.");
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
            data.lastupdated = conditions.lastupdated;
        } else {
            status = 404;
            data = {error: 'not found', key: key};
        }
    }
    res.json(data, status);
});

app.post('/api/1/conditions', function(req, res) {
    var data = req.body;
    var validate = conditionsSchema.validate(data);
    if (validate.isError()) {
        res.send(validate.getError());
    } else {
        res.send(data);
    }
});

// OH NO YOU DIDNT
app.del('*', function(req, res) { res.send(405); });
app.put('*', function(req, res) { res.send(405); });

