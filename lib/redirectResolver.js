function RedirectResolver(config) {
    config = config || {};
    this.basepath = config.basepath || '';
};

RedirectResolver.prototype.resolve = function(path) {
    if (!path) { return null; }
    path = path.indexOf('/') === 0 ? path : '/' + path;
    return this.basepath + path;
};

module.exports = RedirectResolver;