exports.renderHeadTags = function(all) {
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
};

exports.addBodyScriptTags = function(all) {
    var buf = [], filename;
    for (var i = 0; i < all.length; i++) {
        filename = all[i] + '.js';
        buf.push('<script src="js/' + filename + '"></script>');
    }
    return buf.join('\n');
};

exports.dateFormat = function(moment) {
    return function(date, relative) {
        if (moment) {
            if (!relative) {
                return moment(new Date(date)).format('[at] h:mm a [on] dddd, MMMM DD, YYYY');
            }
            return moment(new Date(date)).calendar();
        } else {
            return date;
        }
    }
};

exports.headResources = {
    js: [],
    css: ['base']
};

exports.bodyScripts = ['menus'];