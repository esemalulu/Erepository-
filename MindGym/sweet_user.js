/**
 * Get NetSuite user date format
 *
 * @return {String} or null if date format is unknown
 */
function user_dateformat() {
  var d = new Date();
  d.setYear(1979);
  d.setMonth(12 - 1);
  d.setDate(20);
  d.setHours(1);
  d.setMinutes(23);
  d.setSeconds(45);
  
  switch (nlapiDateToString(d)) {
    case '20/12/1979':
      return 'DD/MM/YYYY';
      break;
    case '20-Dec-1979':
      return 'DD-Mon-YYYY';
      break;
    case '20.12.1979':
      return 'DD.MM.YYYY';
      break;
    case '20-December-1979':
      return 'DD-Mon-YYYY';
      break;
    case '12/20/1979':
      return 'MM/DD/YYYY';
      break;
    case '20 December, 1979':
      return 'DD MONTH, YYYY';
      break;
    case '1979/12/20':
      return 'YYYY/MM/DD';
      break;
    case '1979-12-20':
      return 'YYYY-MM-DD';
      break;
  }
  
  return null; // Unknown
}

/**
 * Get NetSuite user time format
 *
 * @param {String} str Sample datetime string
 * @return {String}
 */
function user_timeformat(str) {

  var hour24 = true;
  var time_length = 4;
  var meridiem = str.substr(str.length - 2)
  
  switch (meridiem.toLowerCase()) {
    case 'am':
    case 'pm':
      hour24 = false;
      time_length = 7;
      break;
  }
  
  var sep = str.charAt(str.length - time_length + 1)
  
  if (hour24) {
    return sep == ':' ? 'H:MM' : 'H-MM';
  }
  return sep == ':' ? 'H:MM AM/PM' : 'H-MM AM/PM';
}
