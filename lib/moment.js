// shim to load moment.js and modify some of its strings
var moment = require('moment');
// alter moment's nextDay', 'nextWeek', 'lastDay', 'lastWeek', 'sameElse' to be the same full-date string
(function(moment) {
    var langStrings = {
        calendar: {
            sameDay: '[today at] h:mm a'
        }
    };

    ['nextDay', 'nextWeek', 'lastDay', 'lastWeek', 'sameElse'].forEach(function(key) {
        langStrings.calendar[key] = 'h:mm a [on] dddd, MMMM DD, YYYY';
    });
    moment.lang('en', langStrings);
})(moment);

module.exports = moment;