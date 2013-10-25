var fs = require('fs')
,   os = require('os')
,   express = require('express')
,   cabinet = require('cabinet')
,   moment = require('moment')
,   schema = require('schema')('conditions')
,   cas = require('cas-sfu')
,   RedisStore = require('connect-redis')(express)
,   redis = require('redis')
,   redispw = process.env.REDISPW
,   winston = require('winston')
,   usegraphite = (process.env.USEGRAPHITE) || true
,   graphitehost = process.env.GRAPHITEHOST || 'stats'
,   graphiteport = process.env.GRAPHITEPORT || 2003
,   redisport = process.env.REDISPORT || 6379
,   redishost = process.env.REDISHOST || 'redis1'
,   app = module.exports = express.createServer()
,   defaultConditionsPath = __dirname + '/data/conditions_default.json'
,   schemaPath = __dirname + '/data/conditions_schema.json'
,   conditionsSchema = schema.Schema.create(JSON.parse(fs.readFileSync(schemaPath)))
,   port = process.env.PORT || 3000
,   serverid = os.hostname() + ':' + port
,   pkg = JSON.parse(fs.readFileSync(__dirname + '/package.json'))
,   cas, conditions, writeConditions, logger, winstonStream, dataclient, subclient, pubclient, graphite, config;

process.title = 'roadconditions';


// set up logging
if (typeof usegraphite === 'string') {
    if (usegraphite === 'false') {
        usegraphite = false;
    } else {
        usegraphite = true;
    }
}

// alter moment's nextDay', 'nextWeek', 'lastDay', 'lastWeek', 'sameElse' to be the same full-date string
(function(moment) {
    var langStrings = {
        calendar: {
            sameDay: '[today at] h:mm a'
        }
    };

    ['nextDay', 'nextWeek', 'lastDay', 'lastWeek', 'sameElse'].forEach(function(key) {
        langStrings.calendar[key] = 'h:mm a [on] dddd, MMMM DD, YYYY';
    });
    moment.lang('en', langStrings);
})(moment);


if (usegraphite) {
    graphite = require('graphite').createClient('plaintext://' + graphitehost + ':' + graphiteport);
}
require('winston-syslog').Syslog;
require('winston-mail').Mail;
logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: function() { return new Date().toString(); },
            handleExceptions: true
        }),
        new (winston.transports.Syslog)({
            host: process.env.DEVNULL || 'devnull.tier2.sfu.ca',
            facility: 'user',
            localhost: serverid,
            type: 'RFC5424',
            handleExceptions: true
        }),
        new (winston.transports.Mail)({
            to: 'nodejsapps-logger@sfu.ca',
            host: 'mailgate.sfu.ca',
            from: process.title + '@' + os.hostname(),
            subject: new Date().toString() + ' ' + process.title + ': {{level}} {{msg}}',
            tls: true,
            level: 'error',
            timestamp: function() { return new Date().toString(); },
            handleExceptions: true
        })
    ]
});
winstonStream = {
    write: function(str) {
        str = str.replace(/(\n|\r)+$/, '');
        logger.info(str);
    }
};

writeConditions = function(data) {
    dataclient.set('roadconditions:data', JSON.stringify(data), function(err, reply) {
        if (err) {
            logger.error('REDIS ERROR WRITING CONDITIONS: ' + err);
        } else {
            if (usegraphite) {
                graphite.write({'stats.nodeapps.roadconditions.updates': 1}, function(err) {
                    if (err) {
                        logger.error('Error writing to graphite (stats.nodeapps.roadconditions.updates ' + err.toString());
                    }
                });
            }
            pubclient.publish('roadconditions:update', JSON.stringify({message: 'conditionsupdated', server: serverid }));
        }
    });
};
// Set up redis clients
dataclient = redis.createClient(redisport, redishost);
subclient = redis.createClient(redisport, redishost);
pubclient = redis.createClient(redisport, redishost);

if (redispw) {
    dataclient.auth(redispw);
    subclient.auth(redispw);
    pubclient.auth(redispw);
}


// Error/exit handlers

dataclient.on('error', function(err) {
    logger.error('REDIS DATA CLIENT ERROR: ' + err);
});

subclient.on('error', function(err) {
    logger.error('REDIS SUBSCRIBER CLIENT ERROR: ' + err);
});

pubclient.on('error', function(err) {
    logger.error('REDIS PUBLISH CLIENT ERROR: ' + err);
});

app.on('error', function(err) {
    logger.error('EXPRESS ERROR: ' + err);
});

process.on('SIGTERM', function() {
    logger.warn('received SIGTERM request, stopping roadconditions server PID: ' + process.pid);
    process.exit(0);
});

dataclient.on('connect', function(e) {
    subclient.subscribe('roadconditions:update');
    subclient.on('message', function(channel, message) {
        if (channel === 'roadconditions:update') {
            message = JSON.parse(message);
            if (message.server !== serverid || process.env.NODE_ENV !== 'production') {
                dataclient.get('roadconditions:data', function(err, data) {
                    logger.info('RECEIVED UPDATED DATA FROM ' + message.server);
                    conditions = JSON.parse(data);
                });
            }
        }
    });
    dataclient.get('roadconditions:data', function(err, data) {
        if (err) { throw err; }
        if (!data) {
            logger.warn('no data in redis; using defaults');
            conditions = JSON.parse(fs.readFileSync(defaultConditionsPath, 'UTF-8'));
            conditions.lastupdated = Date.now();
            dataclient.set('roadconditions:data', JSON.stringify(conditions));
        } else {
            conditions = JSON.parse(data);
            // for some reason, in dev, the above JSON.parse isn't actually doing anything. it's fine in production and I can't be arsed to figure out why, so this is here:
            if (typeof conditions === 'string') { logger.warn('conditions is still a string; re-parsing'); conditions = JSON.parse(conditions); }
        }
        app.listen(port);
        logger.info('starting roadconditions server version ' + pkg.version + ' on port ' + port + ' in ' + app.settings.env + ' mode, PID: ' + process.pid);
    });
});

app.configure(function(){
    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');
    app.use(express.favicon('public/favicon.ico'));
    express.logger.token('remote-ip', function(req, res) {
        return req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] : (req.socket && (req.socket.remoteAddress || (req.socket.socket && req.socket.socket.remoteAddress)));

    });
    express.logger.token('user', function(req, res) { var user = '-'; if (req.session && req.session.auth) { user = req.session.auth.user; } return user; });
    express.logger.token('localtime', function(req, res) {
        return new Date().toString();
    });
    app.use(express.logger({
        stream: winstonStream,
        format: 'express :remote-ip - :user [:localtime] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time'
    }));
    app.set('basepath', process.env.BASEPATH);
    app.set('basehost', process.env.BASEHOST);
    app.use(express.cookieParser());
    app.use(express.session({
        store: new RedisStore({
            host: redishost,
            prefix: 'roadconditions:sess:',
            pass: redispw
        }),
        secret: 'YJrJ2wfqWRfVsaBVVFDYDKtmjAjKAXZ7AZKDtoGzaTrZPDDp',
        cookie: {
            expires: false,
            domain: '.sfu.ca'
        }
    }));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.enable('jsonp callback');
    app.helpers({
        dateFormat: function(date, relative) {
            if (moment) {
                if (!relative) {
                    return moment(new Date(date)).format('[at] h:mm a [on] dddd, MMMM DD, YYYY');
                }
                return moment(new Date(date)).calendar();
            } else {
                return date;
            }
        },
        renderHeadTags: function(all) {
            var templates = {
                js: '<script src="js/FILENAME"></script>',
                css: '<link rel="stylesheet" href="css/FILENAME">'
            }
            ,   buf = '';
            var rendertags = function(type, tmpl, arr) {
                var buf = [], filename;
                for (var i = 0; i < arr.length; i++) {
                    filename = arr[i];
                    if (type === 'css') {
                        filename += '.css';
                    }
                    buf.push(tmpl.replace('FILENAME', filename));
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
            var buf = [], filename;
            for (var i = 0; i < all.length; i++) {
                filename = all[i] + '.js';
                buf.push('<script src="js/' + filename + '"></script>');
            }
            return buf.join('\n');
        }
    });
    app.dynamicHelpers({
        headResources: function(req, res) {
            return {
                js: [],
                css:['base']
            };
        },
        bodyScripts: function(req, res) {
            return ['menus'];
        }
    });
});

app.configure('development', function() {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.use(cabinet(__dirname + '/public'));
});

app.configure('production', function() {
    app.use(express.errorHandler());
    app.use(cabinet(__dirname + '/public', {
        gzip: true,
        minjs: true,
        mincss: true,
        cache: {
            maxSize: 16384,
            maxObjects: 256
        }
    }));
});

// Authentication middleware
var casauth = cas.getMiddleware({
    service: process.env.CAS_SERVICE || 'http://' + serverid + '/login',
    allow: '!roadconditions-admins,!roadconditions-supervisors,!roadconditions-dispatchers',
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
    var tmplData = {auth: req.session.auth, current: conditions};
    if (process.env.NODE_ENV === 'development') {
        tmplData.devInfo = {
            node: process.version,
            version: pkg.version,
            server: serverid,
            redishost: redishost + ':' + redisport,
            cwd: __dirname
        };
    }
    res.render('admin', tmplData);
});

// Authentication Routes
app.get('/login', casauth, function(req, res) {
    res.redirect(req.session.referer || '/admin');
});

app.get('/logout', function(req, res) {
    if (req.session) {
        req.session.destroy();
    }
    res.redirect(cas.options.casBase + cas.options.logoutPath + "?url=" + encodeURIComponent(cas.options.service) + "&urltext=Click+here+to+return+to+the+Road+Conditions+application.");
});

// Server info routes
app.get('/admin/info', loggedin, function(req, res) {
    if (req.session.auth.maillist !=='roadconditions-admins') {
        res.send(403);
    } else {
        var data = {
            env: process.env.NODE_ENV,
            process: {
                pid: process.pid,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            },
            node: process.version,
            headers:req.headers,
            version: pkg.version,
            server: serverid,
            redishost: redishost + ':' + redisport,
            process_env: process.env,
            cwd: __dirname
        };
        res.send(data);
    }
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
