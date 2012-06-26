var spawn = require('child_process').spawn;


desc('Install modules from npm');
task('install-npm-deps', [], function() {
    console.log('\n > Attempting to install dependencies via npm\n'.blue);

    console.log('    Executing command:\n    $ npm install\n'.grey);

    npm = spawn('npm', ['install']);

    npm.stdout.on('data', function (data) {
        process.stdout.write(('    ' + data).grey);
    });

    npm.stderr.on('data', function (data) {
        process.stdout.write(('    ' + data).grey);
    });

    npm.on('exit', function (code) {
        if (code === 0) {
            console.log('\n + npm installed dependencies successfully'.green);
            complete();
        } else {
            throw new Error('npm exited with error code ' + code);
        }
    });

}, true);

desc('jshint node files');
task('jshint-node', [], function() {

    console.log('\n > Attempting to run jshint on server files'.blue);

    jshint = spawn('jshint', ['--config', '.jshintrc-server', 'server.js']);

    jshint.stdout.on('data', function (data) {
        process.stdout.write(('    ' + data).grey);
    });

    jshint.stderr.on('data', function (data) {
        process.stdout.write(('    ' + data).grey);
    });

    jshint.on('exit', function(code) {
        if (code === 0) {
            console.log(' + jshinted node files successfully'.green);
            complete();
        } else {
            throw new Error('jshint exited with error code ' + code);
        }
    });

});

desc('jsint client-side js files');
task('jshint-client', [], function() {
    console.log('\n > Attempting to run jshint on server files'.blue);

    jshint = spawn('jshint', ['--config', '.jshintrc-cliet', 'public/js/*.js']);

    jshint.stdout.on('data', function (data) {
        process.stdout.write(('    ' + data).grey);
    });

    jshint.stderr.on('data', function (data) {
        process.stdout.write(('    ' + data).grey);
    });

    jshint.on('exit', function(code) {
        if (code === 0) {
            console.log(' + jshinted node files successfully'.green);
            complete();
        } else {
            throw new Error('jshint exited with error code ' + code);
        }
    });

});


desc('default task');
task('default', ['install-npm-deps'], function() {
    console.log('\n\n > Attempting to put the site live\n'.blue);
});



function stylize(str, style) {
  var styles = {
  //styles
  'bold'      : [1,  22], 'italic'    : [3,  23],
  'underline' : [4,  24], 'inverse'   : [7,  27],
  //grayscale
  'white'     : [37, 39], 'grey'      : [90, 39],
    'black'     : [90, 39],
  //colors
  'blue'      : [34, 39], 'cyan'      : [36, 39],
    'green'     : [32, 39], 'magenta'   : [35, 39],
  'red'       : [31, 39],'yellow'    : [33, 39]
  };
  return '\033[' + styles[style][0] + 'm' + str + '\033[' + styles[style][1] + 'm';
}

['bold', 'underline', 'italic',
    'inverse', 'grey', 'yellow',
    'red', 'green', 'blue',
    'white', 'cyan', 'magenta'].forEach(function (style) {

  String.prototype.__defineGetter__(style, function () {
    return stylize(this, style);
  });

});
