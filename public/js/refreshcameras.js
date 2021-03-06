;(function() {
  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement, fromIndex) {
      var i
      var pivot = fromIndex ? fromIndex : 0
      var length

      if (!this) {
        throw new TypeError()
      }

      length = this.length

      if (length === 0 || pivot >= length) {
        return -1
      }

      if (pivot < 0) {
        pivot = length - Math.abs(pivot)
      }

      for (i = pivot; i < length; i++) {
        if (this[i] === searchElement) {
          return i
        }
      }
      return -1
    }
  }

  var refreshWebcams = function() {
    var imgs = document.querySelectorAll('.webcamimg')
    var ts = new Date().getTime()
    for (var i = 0; i < imgs.length; i++) {
      var el = imgs[i]
      var src = el.src
      var newsrc =
        src.indexOf('?') > 0
          ? src.substr(0, src.indexOf('?')) + '?' + ts
          : src + '?' + ts
      el.src = newsrc
    }
    window.setTimeout(refreshWebcams, 30000)
  }
  window.setTimeout(refreshWebcams, 30000)
})(window)
