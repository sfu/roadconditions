var fs = require('fs'),
    os = require('os'),
    path = require('path'),
    express = require('express'),
    cabinet = require('cabinet'),
    moment = require('./lib/moment'),
    schema = require('schema')('conditions'),
    cas = require('cas-sfu'),
    RedisStore = require('connect-redis')(express),
    redis = require('redis'),
    engine = require('ejs-locals'),
    winston = require('./lib/logger'),
    helpers = require('./lib/helpers'),
    RedirectResolver = require('./lib/redirectResolver'),

    configFile = process.env.CONFIGFILE || __dirname + '/config/config.json',
    defaultConditionsPath = __dirname + '/data/conditions_default.json',
    schemaPath = __dirname + '/data/conditions_schema.json',
    conditionsSchema = schema.Schema.create(JSON.parse(fs.readFileSync(schemaPath))),
    pkg = JSON.parse(fs.readFileSync(__dirname + '/package.json')),
    serverid, app, cas, conditions, writeConditions, dataclient, subclient, pubclient, graphite, config, redirectResolver;

process.title = 'roadconditions';

try {
    config = require(path.resolve(configFile));
} catch (e) {
    throw new Error(e);
}

serverid = config.serverid = os.hostname() + ':' + config.port;
redirectResolver = new RedirectResolver(config);
app = module.exports = express();

if (config.graphite && config.graphite.enabled) {
    graphite = require('graphite').createClient('plaintext://' + config.graphite.host + ':' + config.graphite.port || 2003);
}

logger = winston.createLogger(config);

writeConditions = function(data) {
    dataclient.set('roadconditions:data', JSON.stringify(data), function(err, reply) {
        if (err) {
            logger.error('REDIS ERROR WRITING CONDITIONS: ' + err);
        } else {
            if (config.graphite && config.graphite.enabled) {
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
dataclient = redis.createClient(config.redis.port, config.redis.host);
subclient = redis.createClient(config.redis.port, config.redis.host);
pubclient = redis.createClient(config.redis.port, config.redis.host);

if (config.redis.password) {
    dataclient.auth(config.redis.password);
    subclient.auth(config.redis.password);
    pubclient.auth(config.redis.password);
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
        app.listen(config.port);
        logger.info('starting roadconditions server version ' + pkg.version + ' on port ' + config.port + ' in ' + app.settings.env + ' mode, PID: ' + process.pid);
    });
});

app.configure(function(){
    app.engine('ejs', engine);
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
        stream: winston.winstonStream,
        format: 'express :remote-ip - :user [:localtime] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time'
    }));
    app.use(express.cookieParser());
    app.use(express.session({
        store: new RedisStore({
            host: config.redis.host,
            prefix: 'roadconditions:sess:',
            pass: config.redis.password
        }),
        secret: 'YJrJ2wfqWRfVsaBVVFDYDKtmjAjKAXZ7AZKDtoGzaTrZPDDp',
        cookie: {
            expires: false,
            domain: '.sfu.ca'
        }
    }));
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.methodOverride());
    app.enable('jsonp callback');
    app.use(function(req, res, next) {
        res.locals.headResources = helpers.headResources;
        res.locals.bodyScripts = helpers.bodyScripts;
        next();
    });
    app.locals({
        dateFormat: helpers.dateFormat(moment),
        renderHeadTags: helpers.renderHeadTags,
        addBodyScriptTags: helpers.addBodyScriptTags
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
    service: config.cas_service || 'http://' + serverid + '/login',
    allow: '!roadconditions-admins,!roadconditions-supervisors,!roadconditions-dispatchers',
    userObject: 'auth'
});

var loggedin = function(req, res, next) {
    if (req.session && req.session.auth) {
        next();
        return;
    }
    req.session.referer = req.url;
    res.redirect(redirectResolver.resolve('/login'));
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
            redishost: config.redis.host + ':' + config.redis.port,
            cwd: __dirname
        };
    }
    res.render('admin', tmplData);
});

// Authentication Routes
app.get('/login', casauth, function(req, res) {
    res.redirect(redirectResolver.resolve(req.session.referer) || redirectResolver.resolve('/admin'));
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
            config: config,
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
