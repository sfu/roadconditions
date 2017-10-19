const format = require('date-fns/format')
const isToday = require('date-fns/is_today')

exports.dateFormat = function() {
  return function(date, relative) {
    if (!relative) {
      return format(date, '[at] h:mm a [on] dddd, MMMM DD, YYYY')
    } else {
      const fmt = isToday(date)
        ? '[today at] h:mm a'
        : '[at] h:mm a [on] dddd, MMMM DD, YYYY'
      return format(date, fmt)
    }
  }
}
