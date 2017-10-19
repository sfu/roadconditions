var fs = require('fs')
var os = require('os')
var path = require('path')
var express = require('express')
var schema = require('schema')('conditions')
var cas = require('cas-sfu')
var lessMiddleware = require('less-middleware')
var RedisStore = require('connect-redis')(express.session)
var ConditionsStore = require('./lib/roadconditions-store')
var viewEngine = require('ejs-locals')
var methodOverride = require('method-override')
var winston = require('./lib/logger')
var helpers = require('./lib/helpers')
var RedirectResolver = require('./lib/redirectResolver')
var configFile = process.env.CONFIGFILE || __dirname + '/config/config.json'
var schemaPath = __dirname + '/data/conditions_schema.json'
var conditionsSchema = schema.Schema.create(
  JSON.parse(fs.readFileSync(schemaPath))
)
var pkg = JSON.parse(fs.readFileSync(__dirname + '/package.json'))
var listening = false
var serverid
var app
var pubsub
var config
var redirectResolver
var storageEngine
var store

process.title = 'roadconditions'

try {
  config = require(path.resolve(configFile))
  config.port = config.port.toString()
} catch (e) {
  throw new Error(e)
}

var logger = winston.createLogger(config)

serverid = config.serverid = os.hostname() + ':' + config.port
redirectResolver = new RedirectResolver(config)
app = module.exports = express()

storageEngine = config.storage.engine
store = new ConditionsStore[storageEngine](config.storage[storageEngine])

store.on('ready', function() {
  if (!listening) {
    app.listen(config.port, function() {
      listening = true
      logger.info(storageEngine + ' ready')
      logger.info(
        'starting roadconditions server version ' +
          pkg.version +
          ' on port ' +
          config.port +
          ' in ' +
          app.settings.env +
          ' mode, PID: ' +
          process.pid
      )
    })
  }
})

store.on('updated', function() {
  if (config.redisPubSub && config.redisPubSub.enabled) {
    pubsub.pub.publish(
      config.redisPubSub.channel,
      JSON.stringify({ message: 'conditionsupdated', server: serverid })
    )
  }
})

store.on('error', function(err) {
  logger.error('conditions store error:', err)
})

// Redis PubSub
if (config.redisPubSub && config.redisPubSub.enabled) {
  pubsub = require('./lib/pubsub').init(config.redisPubSub)
  pubsub.on('connect', function(client) {
    logger.info('Redis pubsub ' + client + ' ready')
  })
  pubsub.on('error', function(client, err) {
    logger.error('Redis pubsub ' + client + ' error:', err)
  })
  pubsub.sub.on('message', function(channel, message) {
    if (channel === config.redisPubSub.channel) {
      message = JSON.parse(message)
      if (
        message.server !== serverid ||
        process.env.NODE_ENV !== 'production'
      ) {
        logger.info(
          'Redis pubsub received message on ' +
            channel +
            ' from ' +
            message.server
        )
        store.forceRefresh()
      }
    }
  })
}

// Error/exit handlers
app.on('error', function(err) {
  logger.error('EXPRESS ERROR: ' + err)
})

process.on('SIGTERM', function() {
  logger.warn(
    'received SIGTERM request, stopping roadconditions server PID: ' +
      process.pid
  )
  process.exit(0)
})

app.engine('ejs', viewEngine)
app.use(express.compress())
app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')
app.use(express.favicon('public/favicon.ico'))
express.logger.token('remote-ip', function(req) {
  return req.ip
})
express.logger.token('user', function(req) {
  var user = '-'
  if (req.session && req.session.auth) {
    user = req.session.auth.user
  }
  return user
})
express.logger.token('localtime', function() {
  return new Date().toString()
})
app.use(
  express.logger({
    stream: winston.winstonStream(logger),
    format:
      'express :remote-ip - :user [:localtime] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time'
  })
)
app.use(express.cookieParser())
app.use(
  express.session({
    store: new RedisStore({
      host: config.redis.host,
      prefix: 'roadconditions:sess:',
      pass: config.redis.password
    }),
    secret: config.session_secret,
    cookie: {
      expires: false,
      domain: config.cookie_domain || '.sfu.ca'
    }
  })
)
app.use(express.json())
app.use(express.urlencoded())
app.use(methodOverride())
app.enable('jsonp callback')
app.enable('trust proxy')
app.locals({
  dateFormat: helpers.dateFormat()
})

if (app.get('env') === 'development') {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }))
  app.use(
    lessMiddleware('/less', {
      pathRoot: __dirname + '/public',
      dest: 'css',
      compress: false,
      sourceMap: true,
      force: true,
      debug: true,
      render: {
        compress: false
      }
    })
  )
  app.use(express.static(path.join(__dirname, 'public')))
}

if (app.get('env') === 'production') {
  app.use(express.errorHandler())
  app.use(
    lessMiddleware('/less', {
      pathRoot: __dirname + '/public',
      dest: 'css',
      compress: true,
      sourceMap: true,
      once: true,
      render: {
        compress: true
      }
    })
  )
  app.use(express.static(path.join(__dirname, 'public')))
}

// Authentication middleware
var casauth = cas.getMiddleware({
  service: config.cas_service || 'http://' + serverid + '/login',
  allow:
    '!roadconditions-admins,!roadconditions-supervisors,!roadconditions-dispatchers',
  userObject: 'auth',
  casBasePath: '/cas',
  loginPath: '/login',
  logoutPath: '/logout',
  validatePath: '/serviceValidate',
  appLogoutPath: '/applogout'
})

var loggedin = function(req, res, next) {
  if (req.session && req.session.auth) {
    next()
    return
  }
  req.session.referer = req.url
  res.redirect(redirectResolver.resolve('/login'))
}

// HTML Routes
app.get('/', function(req, res) {
  res.render('index', store.get())
})

app.get('/isup', function(req, res) {
  res.send('ok', { 'Content-Type': 'text/plain' }, 200)
})

app.get('/admin', loggedin, function(req, res) {
  var tmplData = { auth: req.session.auth, current: store.get() }
  if (process.env.NODE_ENV === 'development') {
    tmplData.devInfo = {
      node: process.version,
      version: pkg.version,
      server: serverid,
      redishost: config.redis.host + ':' + config.redis.port,
      cwd: __dirname
    }
  }
  res.render('admin', tmplData)
})

// Authentication Routes
app.get('/login', casauth, function(req, res) {
  res.redirect(
    redirectResolver.resolve(req.session.referer) ||
      redirectResolver.resolve('/admin')
  )
})

app.get('/logout', function(req, res) {
  if (req.session) {
    req.session.destroy()
  }
  res.redirect(
    cas.options.casBase +
      cas.options.logoutPath +
      '?url=' +
      encodeURIComponent(cas.options.service) +
      '&urltext=Click+here+to+return+to+the+Road+Conditions+application.'
  )
})

// Server info routes
app.get('/admin/info', loggedin, function(req, res) {
  if (req.session.auth.maillist !== 'roadconditions-admins') {
    res.send(403)
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
      headers: req.headers,
      version: pkg.version,
      server: serverid,
      process_env: process.env,
      cwd: __dirname,
      conditions: store.get()
    }
    res.send(data)
  }
})

// API Routes
app.get('/api/1/current/:key?', function(req, res) {
  res.status(410).send({
    error:
      'The /api/1/current API is deprecated and has been removed. Please update to the new v3 API.'
  })
})

app.post('/api/1/current', loggedin, function(req, res) {
  res.status(410).send({
    error:
      'The /api/1/current API is deprecated and has been removed. Please update to the new v3 API.'
  })
})

app.get('/api/2/current', function(req, res) {
  const CAMPUS_INFO =
    'For campus and class status changes, visit http://www.sfu.ca and follow @SFU on Twitter (https://twitter.com/sfu).'
  const TRANSIT_INFO =
    'For the latest transit updates, visit https://translink.ca and follow @TransLink on Twitter (https://twitter.com/translink).'

  const v3Data = store.get()
  const v2Data = {
    message:
      'The v2 API has been deprecated. Please update to the v3 API (`/api/3/current`) as soon as possible.',
    conditions: {
      burnaby: {
        campus: {
          status: CAMPUS_INFO,
          severity: 'n/a'
        },
        roads: v3Data.campuses.burnaby.roads,
        adjacentroads: {
          status: 'not applicable',
          severity: 'n/a'
        },
        transit: {
          status: TRANSIT_INFO,
          severity: 'n/a'
        },
        classes_exams: {
          status: CAMPUS_INFO,
          severity: 'n/a'
        }
      },
      surrey: {
        campus: {
          status: CAMPUS_INFO,
          severity: 'n/a'
        },
        classes_exams: {
          status: CAMPUS_INFO,
          severity: 'n/a'
        }
      },
      vancouver: {
        campus: {
          status: CAMPUS_INFO,
          severity: 'n/a'
        },
        classes_exams: {
          status: CAMPUS_INFO,
          severity: 'n/a'
        }
      }
    },
    announcements: [v3Data.campuses.burnaby.announcements],
    sidebars: [],
    links: [],
    lastupdated: v3Data.lastUpdated
  }

  res.send(v2Data)
})

app.get('/api/3/current', (req, res) => {
  res.send(store.get())
})

app.post('/api/3/current', loggedin, (req, res) => {
  const data = req.body
  const validate = conditionsSchema.validate(data)
  if (validate.isError()) {
    res.set('Content-Type', 'application/json')
    res.send(400, validate.getError())
  } else {
    store.set(data)
    res.send(data)
  }
})

// OH NO YOU DIDNT
app.delete('*', function(req, res) {
  res.send(405)
})
app.put('*', function(req, res) {
  res.send(405)
})
