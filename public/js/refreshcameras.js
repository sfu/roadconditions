/*jshint laxcomma:true*/
(function(w) {
    var refreshWebcams = function() {
        var imgs = document.getElementsByClassName('webcamimg')
        ,   ts = new Date().getTime();
        for (var i=0; i < imgs.length; i++) {
            var el = imgs[i]
            ,   src = el.src
            ,   newsrc = src.indexOf('?') > 0 ? src.substr(0, src.indexOf('?')) + '?' + ts : src + '?' + ts;
            el.src = newsrc;
        }
        window.setTimeout(refreshWebcams, 30000);
    };
    window.setTimeout(refreshWebcams, 30000);
})(window);