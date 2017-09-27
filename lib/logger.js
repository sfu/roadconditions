var winston = require('winston')
var os = require('os')

exports.createLogger = function(config) {
  var winstonTransports = []
  if (
    config.logging &&
    config.logging.console &&
    config.logging.console.enabled
  ) {
    winstonTransports.push(
      new winston.transports.Console({
        timestamp: function() {
          return new Date().toString()
        },
        handleExceptions: true
      })
    )
  }

  if (config.logging && config.logging.mail && config.logging.mail.enabled) {
    require('winston-mail').Mail
    winstonTransports.push(
      new winston.transports.Mail({
        to: 'nodejsapps-logger@sfu.ca',
        host: 'mailgate.sfu.ca',
        from: process.title + '@' + os.hostname(),
        subject:
          new Date().toString() + ' ' + process.title + ': {{level}} {{msg}}',
        tls: true,
        level: 'error',
        timestamp: function() {
          return new Date().toString()
        },
        handleExceptions: true
      })
    )
  }

  if (
    config.logging &&
    config.logging.syslog &&
    config.logging.syslog.enabled
  ) {
    require('winston-syslog').Syslog
    winstonTransports.push(
      new winston.transports.Syslog({
        host: config.logging.syslog.host,
        facility: 'user',
        localhost: config.serverid,
        type: 'RFC5424',
        handleExceptions: true
      })
    )
  }
  return new winston.Logger({ transports: winstonTransports })
}

exports.winstonStream = function(logger) {
  return {
    write: function(str) {
      str = str.replace(/(\n|\r)+$/, '')
      logger.info(str)
    }
  }
}
