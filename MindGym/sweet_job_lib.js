var SWEET_COUNTRY_UNITED_STATES = '229';

/**
 * Update hidden address fields based on the custom
 * address record selected in the location field.
 */
function sweet_job_lib_updateAddressFields()
{
  var addressId = nlapiGetFieldValue('custentity_bo_eventlocation');
  if (addressId) {
    var addressObj = nlapiLoadRecord('customrecord_address', addressId);
    var address1 = addressObj.getFieldValue('custrecord_ad_address1');
    var address2 = addressObj.getFieldValue('custrecord_ad_address2');
    var city = addressObj.getFieldValue('custrecord_ad_city');
    var postcode = addressObj.getFieldValue('custrecord_ad_postcode');
    var state = addressObj.getFieldValue('custrecord_ad_state');
    var country = addressObj.getFieldValue('custrecord_ad_country');
    var countryCode = nlapiLookupField('customrecord_country', country, 'custrecord_country_code');

    // Event address
    nlapiSetFieldValue('custentity_bo_eventaddress1', address1);
    nlapiSetFieldValue('custentity_bo_eventaddress2', address2);
    nlapiSetFieldValue('custentity_bo_eventcity', city);
    nlapiSetFieldValue('custentity_bo_eventpostcode', postcode);
    nlapiSetFieldValue('custentity_bo_eventcountry', country);

    // Billing address
    nlapiSetFieldValue('billaddr1', address1);
    nlapiSetFieldValue('billaddr2', address2);
    nlapiSetFieldValue('billcity', city);
    nlapiSetFieldValue('billzip', postcode);
    nlapiSetFieldValue('billcountry', countryCode);
    
    // Shipping address
    nlapiSetFieldValue('shipaddr1', address1);
    nlapiSetFieldValue('shipaddr2', address2);
    nlapiSetFieldValue('shipcity', city);
    nlapiSetFieldValue('shipzip', postcode);
    nlapiSetFieldValue('shipcountry', countryCode);
    
    // Shipping country
    nlapiSetFieldValue('shipping_country', countryCode);
    
    // State (US specific)
    if (country == SWEET_COUNTRY_UNITED_STATES) {
      var stateCode = nlapiLookupField('customrecord_state', state, 'custrecord_state_code');
      nlapiSetFieldValue('custentity_bo_eventstate', stateCode);
      nlapiSetFieldValue('billstate', stateCode);
      nlapiSetFieldValue('shipstate', stateCode);
    }
  }
}

/**
 * Date functions
 */

/*
  Date Format 1.1
  (c) 2007 Steven Levithan <stevenlevithan.com>
  MIT license
  With code by Scott Trenda (Z and o flags, and enhanced brevity)
*/

/*** dateFormat
  Accepts a date, a mask, or a date and a mask.
  Returns a formatted version of the given date.
  The date defaults to the current date/time.
  The mask defaults ``"ddd mmm d yyyy HH:MM:ss"``.
*/
var sweet_dateFormat = function () {
  var token        = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloZ]|"[^"]*"|'[^']*'/g,
    timezone     = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
    timezoneClip = /[^-+\dA-Z]/g,
    pad = function (value, length) {
      value = String(value);
      length = parseInt(length) || 2;
      while (value.length < length)
        value = "0" + value;
      return value;
    };

  // Regexes and supporting functions are cached through closure
  return function (date, mask) {
    // Treat the first argument as a mask if it doesn't contain any numbers
    if (
      arguments.length == 1 &&
      (typeof date == "string" || date instanceof String) &&
      !/\d/.test(date)
    ) {
      mask = date;
      date = undefined;
    }

    date = date ? new Date(date) : new Date();
    if (isNaN(date))
      throw "invalid date";

    var dF = sweet_dateFormat;
    mask   = String(dF.masks[mask] || mask || dF.masks["default"]);

    var  d = date.getDate(),
      D = date.getDay(),
      m = date.getMonth(),
      y = date.getFullYear(),
      H = date.getHours(),
      M = date.getMinutes(),
      s = date.getSeconds(),
      L = date.getMilliseconds(),
      o = date.getTimezoneOffset(),
      flags = {
        d:    d,
        dd:   pad(d),
        ddd:  dF.i18n.dayNames[D],
        dddd: dF.i18n.dayNames[D + 7],
        m:    m + 1,
        mm:   pad(m + 1),
        mmm:  dF.i18n.monthNames[m],
        mmmm: dF.i18n.monthNames[m + 12],
        yy:   String(y).slice(2),
        yyyy: y,
        h:    H % 12 || 12,
        hh:   pad(H % 12 || 12),
        H:    H,
        HH:   pad(H),
        M:    M,
        MM:   pad(M),
        s:    s,
        ss:   pad(s),
        l:    pad(L, 3),
        L:    pad(L > 99 ? Math.round(L / 10) : L),
        t:    H < 12 ? "a"  : "p",
        tt:   H < 12 ? "am" : "pm",
        T:    H < 12 ? "A"  : "P",
        TT:   H < 12 ? "AM" : "PM",
        Z:    (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
        o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4)
      };

    return mask.replace(token, function ($0) {
      return ($0 in flags) ? flags[$0] : $0.slice(1, $0.length - 1);
    });
  };
}();

// Some common format strings
sweet_dateFormat.masks = {
  "default":       "ddd mmm d yyyy HH:MM:ss",
  shortDate:       "m/d/yy",
  mediumDate:      "mmm d, yyyy",
  longDate:        "mmmm d, yyyy",
  fullDate:        "dddd, mmmm d, yyyy",
  shortTime:       "h:MM TT",
  mediumTime:      "h:MM:ss TT",
  longTime:        "h:MM:ss TT Z",
  isoDate:         "yyyy-mm-dd",
  isoTime:         "HH:MM:ss",
  isoDateTime:     "yyyy-mm-dd'T'HH:MM:ss",
  isoFullDateTime: "yyyy-mm-dd'T'HH:MM:ss.lo"
};

// Internationalization strings
sweet_dateFormat.i18n = {
  dayNames: [
    "Sun", "Mon", "Tue", "Wed", "Thr", "Fri", "Sat",
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ],
  monthNames: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
  ]
};

/**
 * Test if field is empty (null or zero length string)
 *
 * @param {Mixed} field
 * @return {Boolean}
 */
function sweet_job_lib_isEmpty(field)
{
  return !sweet_job_lib_isSet(field);
}

/**
 * Test if field is set (not null or string length greater than zero)
 *
 * @param {Mixed} field
 * @return {Boolean}
 */
function sweet_job_lib_isSet(field)
{
  return (field == null ? false : String(field).length > 0);
}

/**
 * Test if field is set (not null or string length greater than zero)
 *
 * @param {Mixed} value
 * @param {Array} arr
 * @return {Boolean}
 */
function sweet_job_lib_inArray(value, arr)
{
  var key;
  for (key in arr) {
    if (arr[key] == value) {
      return true;
    }
  }
  return false;
}
