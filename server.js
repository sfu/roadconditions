var fs = require('fs'),
    os = require('os'),
    path = require('path'),
    express = require('express'),
    moment = require('./lib/moment'),
    schema = require('schema')('conditions'),
    cas = require('cas-sfu'),
    RedisStore = require('connect-redis')(express),
    ConditionsStore = require('./lib/roadconditions-store'),
    redis = require('redis'),
    viewEngine = require('ejs-locals'),
    winston = require('./lib/logger'),
    helpers = require('./lib/helpers'),
    RedirectResolver = require('./lib/redirectResolver'),
    configFile = process.env.CONFIGFILE || __dirname + '/config/config.json',
    schemaPath = __dirname + '/data/conditions_schema.json',
    conditionsSchema = schema.Schema.create(JSON.parse(fs.readFileSync(schemaPath))),
    pkg = JSON.parse(fs.readFileSync(__dirname + '/package.json')),
    serverid, app, cas, subclient, pubclient, graphite, config, redirectResolver, storageEngine, store;

process.title = 'roadconditions';

try {
    config = require(path.resolve(configFile));
} catch (e) {
    throw new Error(e);
}

serverid = config.serverid = os.hostname() + ':' + config.port;
redirectResolver = new RedirectResolver(config);
app = module.exports = express();

storageEngine = config.storage.engine;
store = new ConditionsStore[storageEngine](config.storage[storageEngine]);
store.on('ready', function() {
    app.listen(config.port, function() {
        logger.info(storageEngine + ' ready');
        logger.info('starting roadconditions server version ' + pkg.version + ' on port ' + config.port + ' in ' + app.settings.env + ' mode, PID: ' + process.pid);
    });
});
store.on('error', function(err) {
    logger.error('conditions store error:', err);
});

if (config.graphite && config.graphite.enabled) {
    graphite = require('graphite').createClient('plaintext://' + config.graphite.host + ':' + config.graphite.port || 2003);
}

logger = winston.createLogger(config);

// Set up redis clients
var redisOptions = {
    retry_max_delay: 2000,
};
subclient = redis.createClient(config.redis.port, config.redis.host, redisOptions);
pubclient = redis.createClient(config.redis.port, config.redis.host, redisOptions);

if (config.redis.password) {
    subclient.auth(config.redis.password);
    pubclient.auth(config.redis.password);
}


// Error/exit handlers

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

subclient.on('connect', function() {
    logger.info('REDIS SUBSCRIBER CLIENT CONNECTED');
});

pubclient.on('connect', function() {
    logger.info('REDIS PUBLISH CLIENT CONNECTED');
});

app.configure(function() {
    app.engine('ejs', viewEngine);
    app.use(express.compress());
    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');
    app.use(express.favicon('public/favicon.ico'));
    express.logger.token('remote-ip', function(req, res) {
        return req.ip;

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
            pass: config.redis.password,
            retry_max_delay: 2000
        }),
        secret: config.session_secret,
        cookie: {
            expires: false,
            domain: '.sfu.ca'
        }
    }));
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.methodOverride());
    app.enable('jsonp callback');
    app.enable('trust proxy');
    app.locals({
        dateFormat: helpers.dateFormat(moment),
    });
});

app.configure('development', function() {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.use(require('less-middleware')({
        dest: '/css',
        src: '/less',
        root: __dirname + '/public',
        compress: false,
        sourceMap: true,
        force: true,
        debug: true
    }));
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('production', function() {
    app.use(express.errorHandler());
    app.use(require('less-middleware')({
        dest: '/css',
        src: '/less',
        root: __dirname + '/public',
        compress: true,
        sourceMap: true,
    }));
    app.use(express.static(path.join(__dirname, 'public')));
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
    res.render('index', store.get());
});

app.get('/isup', function(req, res) {
    res.send('ok', { 'Content-Type': 'text/plain' }, 200);
});

app.get('/admin', loggedin, function(req, res) {
    var tmplData = {auth: req.session.auth, current: store.get()};
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
            cwd: __dirname,
            conditions: store.get()
        };
        res.send(data);
    }
});

// API Routes
app.get('/api/1/current/:key?', function(req, res) {
    var data = store.get(),
        status = 200
        ret = {}
        key = req.param('key');

     // maintain back-compat and only show burnaby
    data.conditions = data.conditions.burnaby;

    if (!key) {
        res.json(data);
    } else {
        if (data.hasOwnProperty(key)) {
            ret[key] = data[key];
            ret['lastupdated'] = data.lastupdated;
        } else {
            status = 404;
            ret = {error: 'not found', key: key};
        }
        res.json(ret, status);
    }
});

app.get('/api/2/current/:key?', function(req, res) {
    var data = store.get(),
        ret = {},
        status = 200,
        key = req.param('key');

    if (!key) {
        res.json(data);
    } else {
        if (data.hasOwnProperty(key)) {
            ret[key] = data[key];
            ret.lastupdated = data.lastupdated;
        } else {
            status = 404;
            data = {error: 'not found', key: key};
        }
        res.json(ret, status);
    }
});

app.post('/api/1/current', loggedin, function(req, res) {
    var data = req.body;
    var validate = conditionsSchema.validate(data);
    if (validate.isError()) {
        res.set('Content-Type', 'application/json');
        res.send(400, validate.getError());
    } else {
        data.lastupdated = new Date().getTime();
        store.set(data);
        res.send(data);
    }
});

// OH NO YOU DIDNT
app.del('*', function(req, res) { res.send(405); });
app.put('*', function(req, res) { res.send(405); });


