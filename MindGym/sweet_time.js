/**
 * Time library
 *
 */

var SWEET = SWEET || {};
SWEET.Time = SWEET.Time || {};

SWEET.Time.USER_TIME_FORMAT = {
  'H:MM'       : /([1|2]?[0-9]):([0-5][0-9])$/,
  'H-MM'       : /([1|2]?[0-9])-([0-5][0-9])$/,
  'h:MM tt'    : /((0?[1-9])|(1[0-2])):([0-5][0-9]) [a|p]m$/i,
  'h-MM tt'    : /((0?[1-9])|(1[0-2]))-([0-5][0-9]) [a|p]m$/i
};

/**
 * Convert date object to netsuite time of day string
 *
 * @param {Object} d  Date object
 * @param {String} sample  Can be time or datetime string
 * @return {String}
 */
SWEET.Time.convertDateToTimeString = function(d, sample) {

  var H = d.getHours(); // 24-hour clock
  var h = H % 12 || 12; // 12-hour clock
  var MM = d.getMinutes() + '';
  MM = MM.length > 1 ? MM : '0' + MM;
  var tt = H < 12 ? 'am' : 'pm';
  
  switch (SWEET.Time.getUserTimeFormat(sample)) {
    case 'H:MM':    return H + ':' + MM;
    case 'H-MM':    return H + '-' + MM;
    case 'h:MM tt': return h + ':' + MM + ' ' + tt;
    case 'h-MM tt': return h + '-' + MM + ' ' + tt;
  }
};

/**
 * Identify user time format based on sample
 *
 * @param {String} sample  Can be time or datetime string
 * @return {String}
 */
SWEET.Time.getUserTimeFormat = function(sample) {

  if (SWEET.Time.USER_TIME_FORMAT['H:MM'].test(sample)) return 'H:MM';
  if (SWEET.Time.USER_TIME_FORMAT['H-MM'].test(sample)) return 'H-MM';
  if (SWEET.Time.USER_TIME_FORMAT['h:MM tt'].test(sample)) return 'h:MM tt';
  if (SWEET.Time.USER_TIME_FORMAT['h-MM tt'].test(sample)) return 'h-MM tt';
  
  // Send notification if new time format is introduced.
  throw nlapiCreateError('SWEET_UNKNOWN_USER_TIME_FORMAT', 'Unknown user time format: "' + sample + '"', false);
};
