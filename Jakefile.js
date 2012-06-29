/*global jake, desc, task, complete*/

var spawn = require('child_process').spawn
,   fs = require('fs')
,   fileEnc = 'utf-8'
,   devserverLabel = 'ca.sfu.roadconditions'
,   devserverPlist = __dirname + '/' + devserverLabel + '.plist'
,   pkg = require('./package.json')
,   deployBasepath = '/var/nodeapps/roadconditions'
,   deployDir = deployBasepath + '@' + pkg.version;

var uglify = function(file) {
    var uglyfyJS = require('uglify-js')
    ,   path = require('path')
    ,   jsp = uglyfyJS.parser
    ,   pro = uglyfyJS.uglify
    ,   ast = jsp.parse(fs.readFileSync(file, fileEnc))
    ,   dirname = path.dirname(file)
    ,   filename = path.basename(file, '.js')
    ,   distFile = path.join(dirname, filename + '-min.js');

    ast = pro.ast_mangle(ast);
    ast = pro.ast_squeeze(ast);

    fs.writeFileSync(distFile, pro.gen_code(ast), fileEnc);
    var msg = ' + minified ' + file + ' to ' + distFile;
    console.log(msg.green);
};

var jslintFile = function(file) {
    var jshint = require('jshint')
    ,   buf = fs.readFileSync(file, fileEnc);

    buf = buf.replace(/^\uFEFF/, '');
    jshint.JSHINT(buf);

    return jshint.JSHINT.errors.lengh ? [1, jshint.JSHINT.errors] : [0, null];
};

var pathExists = function(path) {
    var ret;
    try {
        ret = fs.lstatSync(path);
    } catch(e) {}

    return ret ? true : false;
};

var clientJsFiles = [
    __dirname + '/public/js/admin.js',
    __dirname + '/public/js/menus.js',
    __dirname + '/public/js/refreshcameras.js'
];

var serverJsFiles = [ __dirname + '/server.js' ];

var cssFiles = [
    __dirname + '/public/css/admin.css',
    __dirname + '/public/css/admin-dispatcher.css',
    __dirname + '/public/css/base.css',
    __dirname + '/public/css/conditions.css'
];

////////////// NPM

desc('Install modules from npm');
task('install-npm-deps', [], function() {
    console.log('\n > Attempting to install dependencies via npm\n'.blue);

    console.log('    Executing command:\n    $ npm install\n'.grey);

    var npm = spawn('npm', ['install']);

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

////////////// MANAGE JS AND CSS FILES

desc('jsint files');
task('jshint', [], function(type) {
    var msg = '\n > Attempting to jshint ' + type + ' files';
    console.log(msg.blue);
    var count = 0
    ,   fileList
    ,   options;

    switch(type) {
        case 'server':
            fileList = serverJsFiles;
            options = JSON.parse(fs.readFileSync(__dirname + '/.jshintrc-server', fileEnc));
            break;
        case 'client':
            fileList = clientJsFiles;
            options = JSON.parse(fs.readFileSync(__dirname + '/.jshintrc-client', fileEnc));
            break;
    }

    fileList.forEach(function(file) {
        var result = jslintFile(file, options)
        ,   msg;
        if (result[0] === 0) {
            msg = ' +  ' + file + ' is ok';
            console.log(msg.green);
            if (++count === fileList.length) {
                complete();
            }
        } else {
            msg = ' x jshint found problems with ' + file;
            console.log(msg.red);
            console.log(result[1]);
            process.exit(1);
        }
    });
});

desc('jshint server files');
task('jshint-server', [], function() {
    var hint = jake.Task.jshint;
    hint.invoke.apply(hint, ['server']);
    hint.reenable(true);
});

desc('minify client-side js files');
task('minify-client-js', function() {

    var hint = jake.Task.jshint;
    hint.invoke.apply(hint, ['client']);

    console.log('\n > Attempting to minify client js files'.blue);
    var distDir = 'public/js';

    clientJsFiles.forEach(function(file) {
        uglify(file, distDir);
    });
    complete();
});

desc('minify css files');
task('minify-css', [], function() {
    console.log('\n > Attempting to minify css files'.blue);
    var less = require('less')
    ,   parser = new less.Parser()
    ,   path = require('path')
    ,   count = 0;

    cssFiles.forEach(function(file) {
        var css = fs.readFileSync(file, fileEnc)
        ,   dirname = path.dirname(file)
        ,   filename = path.basename(file, '.css')
        ,   distFile = path.join(dirname, filename + '-min.css');

        parser.parse(css, function(e, tree) {
            if (e) {
                return [1, e];
            } else {
                fs.writeFileSync(distFile, tree.toCSS({compress: true}), fileEnc);
                var msg = ' + minified ' + file + ' to ' + distFile;
                console.log(msg.green);
                if (++count === cssFiles.length) {
                    complete();
                }
            }
        });
    });
});

desc('prep all files');
task('prepfiles', [], function() {
    jake.Task['minify-css'].invoke();
    jake.Task['jshint-server'].invoke();
    var clienthint = jake.Task.jshint;
    clienthint.invoke.apply(clienthint, ['client']);
});

////////////// DEVELOPMENT SERVER

desc('loads the ca.sfu.roadconditions.plist file -- don\'t run directly');
task('loaddev', [], function() {
    console.log('\n > Loading plist file into launchd'.blue);

    try {
        fs.lstatSync(devserverPlist);
    } catch (e) {
        throw new Error(e);
    }

    var load = spawn('launchctl', ['load', devserverPlist]);
    load.stdout.on('data', function (data) {
        process.stdout.write(('    ' + data).grey);
    });

    load.stderr.on('data', function (data) {
        throw new Error(data);
    });
});

desc('startdev the development server on os x');
task('startdev', [], function() {
    jake.Task.prepfiles.invoke();
    jake.Task.loaddev.invoke();
    console.log('\n > Starting development server on localhost:3000'.blue);
    var rundev = spawn('launchctl', ['start', devserverLabel]);
    setTimeout(function() {
        spawn('open', ['http://localhost:3000']);
    },1000);
});

desc('stops the development server');
task('stopdev', [], function() {
    console.log('\n > Stopping development server'.blue);
    try {
        fs.lstatSync(devserverPlist);
    } catch (e) {
        throw new Error(e);
    }

    var load = spawn('launchctl', ['unload', devserverPlist]);
    load.stdout.on('data', function (data) {
        process.stdout.write(('    ' + data).grey);
    });

    load.stderr.on('data', function (data) {
        throw new Error(data);
    });
});

desc('create versioned directory');
task('createdir', [], function() {
    console.log('\n > Creating versioned directory'.blue);
    var msg;

    // does the directory already exist?
    if (pathExists(deployDir)) {
        msg = deployDir + ' already exists. You should bump the version number and try again.';
        throw new Error(msg.red);
    }

    var ret = fs.mkdirSync(deployDir);
    if (ret) {
        throw new Error(ret);
    } else {
        msg = ' + created versioned directory at ' + deployDir;
        console.log(msg.green);
    }
});

desc('symlink versioned directory');
task('symlink', [], function() {
    console.log('\n > Attempting to symlink versioned directory'.blue);
    var msg;

    // remove the old symlink
    try {
        fs.unlinkSync(deployBasepath);
    } catch(e) {}

    // make new link
    var ret = fs.symlinkSync(deployDir, deployBasepath);
    if (ret) {
        throw new Error(ret);
    } else {
        msg = ' + created symlink';
        console.log(msg.green);
    }
});

desc('default task');
task('default', [], function() {
    console.log('\n\n > Nothing to do here. How about running an actual task?\n'.blue);
});

var stylize = function (str, style) {
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
};

['bold', 'underline', 'italic',
    'inverse', 'grey', 'yellow',
    'red', 'green', 'blue',
    'white', 'cyan', 'magenta'].forEach(function (style) {

  String.prototype.__defineGetter__(style, function () {
    return stylize(this, style);
  });

});

