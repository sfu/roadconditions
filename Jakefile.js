/*global desc, task, complete*/

var spawn = require('child_process').spawn
,   fs = require('fs')
,   fileEnc = 'utf-8';

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



var clientJsFiles = [
    __dirname + '/public/js/admin.js',
    __dirname + '/public/js/menus.js',
    __dirname + '/public/js/refreshcameras.js'
];

var serverJsFiles = [ __dirname + '/server.js' ];

var cssFiles = [
    __dirname + '/public/css/admin-dispatcher.css',
    __dirname + '/public/css/base.css',
    __dirname + '/public/css/conditions.css'
];

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

desc('jsint files');
task('jshint', [], function(type) {
    console.log('\n > Attempting to jshint files'.blue);
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


desc('minify client-side js files');
task('minify-client-js', ['jshint-client'], function() {
    console.log('\n > Attempting to minify client js files'.blue);
    var distDir = 'public/js';

    clientJsFiles.forEach(function(file) {
        uglify(file, distDir);
    });
    complete();
});

desc('minify css files');
task('minify-css', [], function() {
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

