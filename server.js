var fs = require('fs')
,   os = require('os')
,   gzippo = require('gzippo')
,   express = require('express')
,   moment = require('moment')
,   schema = require('schema')('conditions')
,   cas = require('cas-sfu')
,   RedisStore = require('connect-redis')(express)
,   redis = require('redis')
,   redisport = 6379
,   redishost = 'redis1.its.sfu.ca'
,   dataclient = redis.createClient(redisport, redishost)
,   subclient = redis.createClient(redisport, redishost)
,   pubclient = redis.createClient(redisport, redishost)
,   app = module.exports = express.createServer()
,   defaultConditionsPath = __dirname + '/data/conditions_default.json'
,   schemaPath = __dirname + '/data/conditions_schema.json'
,   conditionsSchema = schema.Schema.create(JSON.parse(fs.readFileSync(schemaPath)))
,   port = process.env.PORT || 3001
,   serverid = os.hostname() + ':' + port
,   cas, casService, conditions, writeConditions;

writeConditions = function(data) {
    dataclient.set('roadconditions:data', JSON.stringify(data), function(err, reply) {
        if (err) {
            console.log('REDIS ERROR WRITING CONDITIONS: %s', err);
        } else {
            pubclient.publish('roadconditions:update', JSON.stringify({message: 'conditionsupdated', server: serverid }));
        }
    });
};


dataclient.on('error', function(err) {
    console.log('REDIS ERROR: %s', err);
});

dataclient.on('connect', function(e) {
    subclient.subscribe('roadconditions:update');
    subclient.on('message', function(channel, message) {
        if (channel === 'roadconditions:update') {
            message = JSON.parse(message);
            if (message.server !== serverid) {
                dataclient.get('roadconditions:data', function(err, data) {
                    console.log('RECEIVED UPDATED DATA FROM %s', message.server);
                    conditions = JSON.parse(data);
                });
            }
        }
    });
    dataclient.get('roadconditions:data', function(err, data) {
        if (err) { throw err; }
        if (!data) {
            console.log('no data in redis; using defaults');
            conditions = JSON.parse(fs.readFileSync(defaultConditionsPath, 'UTF-8'));
            conditions.lastupdated = Date.now();
            dataclient.set('roadconditions:data', JSON.stringify(conditions));
        } else {
            conditions = JSON.parse(data);
        }

        app.listen(port);
        console.log("Express server listening on port %d in %s mode", port, app.settings.env);
    });
});

app.configure(function(){
    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');
    app.use(express.favicon('public/favicon.ico'));
    express.logger.token('user', function(req, res) { var user = '-'; if (req.session && req.session.auth) { user = req.session.auth.user; } return user; });
    app.use(express.logger({format: ':remote-addr - :user [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'}));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(gzippo.staticGzip(__dirname + '/public'));
    app.enable('jsonp callback');
    app.helpers({
        dateFormat: function(date, format) {
            if (moment) {
                return moment(new Date(date)).format(format);
            } else {
                return date;
            }
        },
        renderHeadTags: function(all) {
            var templates = {
                scripts: '<script src="js/FILENAME"></script>',
                css: '<link rel="stylesheet" href="css/FILENAME">'
            }
            ,   buf = '';
            var rendertags = function(type, tmpl, arr) {
                var buf = [];
                for (var i = 0; i < arr.length; i++) {
                    buf.push(tmpl.replace('FILENAME', arr[i]));
                }
                return buf.join('\n');
            };
            if (all) {
                for (var type in all) {
                    buf += rendertags(type, templates[type], all[type]);
                }
            }
            return buf;
        },
        addBodyScriptTags: function(all) {
            var buf = [];
            for (var i = 0; i < all.length; i++) {
                buf.push('<script src="js/' + all[i] + '"></script>');
            }
            return buf.join('\n');
        }
    });
    app.dynamicHelpers({
        headResources: function(req, res) {
            return {
                scripts: [],
                css:['base-min.css']
            };
        },
        bodyScripts: function(req, res) {
            return ['menus-min.js'];
        }
    });
});

app.configure('development', function(){
    app.use(express.cookieParser());
    app.use(express.session({secret: 'YJrJ2wfqWRfVsaBVVFDYDKtmjAjKAXZ7AZKDtoGzaTrZPDDp', expires: false}));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.set('basepath', '/security/new-sfuroadconditions');
    app.set('basehost', 'www.sfu.ca');
    app.use(express.cookieParser());
    app.use(express.session({
        store: new RedisStore({
            host: redishost,
            prefix: 'roadconditions:sess:'
        }),
        secret: 'YJrJ2wfqWRfVsaBVVFDYDKtmjAjKAXZ7AZKDtoGzaTrZPDDp',
        expires: false
    }));
    app.use(express.errorHandler());
});

// Authentication middleware
var casauth = cas.getMiddleware({
    service: process.env.CAS_SERVICE || 'http://' + serverid + '/login',
    allow: '!roadconditions-supervisors,!roadconditions-dispatchers',
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

app.get('/isup', function(req, res) {
    res.send('ok', { 'Content-Type': 'text/plain' }, 200);
});

app.get('/admin', loggedin, function(req, res) {
    res.render('admin', {auth: req.session.auth, current: conditions});
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
app.get('/api/1/current/:key?', function(req, res) {
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

app.post('/api/1/current', loggedin, function(req, res) {
    var data = req.body;
    var validate = conditionsSchema.validate(data);
    if (validate.isError()) {
        res.send(validate.getError(), { 'Content-Type': 'application/json'}, 400);
    } else {
        data.lastupdated = new Date().getTime();
        conditions = data;
        writeConditions(data);
        res.send(data);
    }
});

// OH NO YOU DIDNT
app.del('*', function(req, res) { res.send(405); });
app.put('*', function(req, res) { res.send(405); });
