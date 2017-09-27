exports.dateFormat = function(moment) {
  return function(date, relative) {
    if (moment) {
      if (!relative) {
        return moment(new Date(date)).format(
          '[at] h:mm a [on] dddd, MMMM DD, YYYY'
        )
      }
      return moment(new Date(date)).calendar()
    } else {
      return date
    }
  }
}
