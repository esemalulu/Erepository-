
function rawurlencode( str ) {
    // URL-encodes string  
    // 
    // version: 905.1001
    // discuss at: http://phpjs.org/functions/rawurlencode
    // +   original by: Brett Zamir (http://brettz9.blogspot.com)
    // +      input by: travc
    // +      input by: Brett Zamir (http://brettz9.blogspot.com)
    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: Michael Grier
    // +   bugfixed by: Brett Zamir (http://brettz9.blogspot.com)
    // *     example 1: rawurlencode('Kevin van Zonneveld!');
    // *     returns 1: 'Kevin%20van%20Zonneveld%21'
    // *     example 2: rawurlencode('http://kevin.vanzonneveld.net/');
    // *     returns 2: 'http%3A%2F%2Fkevin.vanzonneveld.net%2F'
    // *     example 3: rawurlencode('http://www.google.nl/search?q=php.js&ie=utf-8&oe=utf-8&aq=t&rls=com.ubuntu:en-US:unofficial&client=firefox-a');
    // *     returns 3: 'http%3A%2F%2Fwww.google.nl%2Fsearch%3Fq%3Dphp.js%26ie%3Dutf-8%26oe%3Dutf-8%26aq%3Dt%26rls%3Dcom.ubuntu%3Aen-US%3Aunofficial%26client%3Dfirefox-a'
 
    var histogram = {}, unicodeStr='', hexEscStr='';
    var ret = str.toString();

    var replacer = function(search, replace, str) {
        var tmp_arr = [];
        tmp_arr = str.split(search);
        return tmp_arr.join(replace);
    };

    // The histogram is identical to the one in urldecode.
    histogram["'"]   = '%27';
    histogram['(']   = '%28';
    histogram[')']   = '%29';
    histogram['*']   = '%2A'; 
    histogram['~']   = '%7E';
    histogram['!']   = '%21';
    histogram['\u20AC'] = '%80';
    histogram['\u0081'] = '%81';
    histogram['\u201A'] = '%82';
    histogram['\u0192'] = '%83';
    histogram['\u201E'] = '%84';
    histogram['\u2026'] = '%85';
    histogram['\u2020'] = '%86';
    histogram['\u2021'] = '%87';
    histogram['\u02C6'] = '%88';
    histogram['\u2030'] = '%89';
    histogram['\u0160'] = '%8A';
    histogram['\u2039'] = '%8B';
    histogram['\u0152'] = '%8C';
    histogram['\u008D'] = '%8D';
    histogram['\u017D'] = '%8E';
    histogram['\u008F'] = '%8F';
    histogram['\u0090'] = '%90';
    histogram['\u2018'] = '%91';
    histogram['\u2019'] = '%92';
    histogram['\u201C'] = '%93';
    histogram['\u201D'] = '%94';
    histogram['\u2022'] = '%95';
    histogram['\u2013'] = '%96';
    histogram['\u2014'] = '%97';
    histogram['\u02DC'] = '%98';
    histogram['\u2122'] = '%99';
    histogram['\u0161'] = '%9A';
    histogram['\u203A'] = '%9B';
    histogram['\u0153'] = '%9C';
    histogram['\u009D'] = '%9D';
    histogram['\u017E'] = '%9E';
    histogram['\u0178'] = '%9F';


    // Begin with encodeURIComponent, which most resembles PHP's encoding functions
    ret = encodeURIComponent(ret);

    for (unicodeStr in histogram) {
        hexEscStr = histogram[unicodeStr];
        ret = replacer(unicodeStr, hexEscStr, ret); // Custom replace. No regexing
    }

    // Uppercase for full PHP compatibility
    return ret.replace(/(\%([a-z0-9]{2}))/g, function(full, m1, m2) {
        return "%"+m2.toUpperCase();
    });
}


function strcmp ( str1, str2 ) {
    // Binary safe string comparison  
    // 
    // version: 812.316
    // discuss at: http://phpjs.org/functions/strcmp
    // +   original by: Waldo Malqui Silva
    // +      input by: Steve Hilder
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +    revised by: gorthaur
    // *     example 1: strcmp( 'waldo', 'owald' );
    // *     returns 1: 1
    // *     example 2: strcmp( 'owald', 'waldo' );
    // *     returns 2: -1
    return ( ( str1 == str2 ) ? 0 : ( ( str1 > str2 ) ? 1 : -1 ) );
}


function strnatcmp ( f_string1, f_string2, f_version ) {
    // Returns the result of string comparison using 'natural' algorithm  
    // 
    // version: 905.1002
    // discuss at: http://phpjs.org/functions/strnatcmp
    // +   original by: Martijn Wieringa
    // + namespaced by: Michael White (http://getsprink.com)
    // +    tweaked by: Jack
    // +   bugfixed by: Onno Marsman
    // -    depends on: strcmp
    // %          note: Added f_version argument against code guidelines, because it's so neat
    // *     example 1: strnatcmp('Price 12.9', 'Price 12.15');
    // *     returns 1: 1
    // *     example 2: strnatcmp('Price 12.09', 'Price 12.15');
    // *     returns 2: -1
    // *     example 3: strnatcmp('Price 12.90', 'Price 12.15');
    // *     returns 3: 1
    // *     example 4: strnatcmp('Version 12.9', 'Version 12.15', true);
    // *     returns 4: -6
    // *     example 5: strnatcmp('Version 12.15', 'Version 12.9', true);
    // *     returns 5: 6
    if (f_version == undefined) {
        f_version = false;
    }

    var __strnatcmp_split = function( f_string ) {
        var result = [];
        var buffer = '';
        var chr = '';
        var i = 0, f_stringl = 0;

        var text = true;

        f_stringl = f_string.length;
        for (i = 0; i < f_stringl; i++) {
            chr = f_string.substring(i, i + 1);
            if (chr.match(/[0-9]/)) {
                if (text) {
                    if(buffer.length > 0){
                        result[result.length] = buffer;
                        buffer = '';
                    }

                    text = false;
                }
                buffer += chr;
            } else if ((text == false) && (chr == '.') && (i < (f_string.length - 1)) && (f_string.substring(i + 1, i + 2).match(/[0-9]/))) {
                result[result.length] = buffer;
                buffer = '';
            } else {
                if (text == false) {
                    if (buffer.length > 0) {
                        result[result.length] = parseInt(buffer);
                        buffer = '';
                    }
                    text = true;
                }
                buffer += chr;
            }
        }

        if (buffer.length > 0) {
            if (text) {
                result[result.length] = buffer;
            } else {
                result[result.length] = parseInt(buffer);
            }
        }

        return result;
    };

    var array1 = __strnatcmp_split(f_string1+'');
    var array2 = __strnatcmp_split(f_string2+'');

    var len = array1.length;
    var text = true;

    var result = -1;
    var r = 0;

    if (len > array2.length) {
        len = array2.length;
        result = 1;
    }

    for (i = 0; i < len; i++) {
        if (isNaN(array1[i])) {
            if (isNaN(array2[i])) {
                text = true;

                if ((r = this.strcmp(array1[i], array2[i])) != 0) {
                    return r;
                }
            } else if (text){
                return 1;
            } else {
                return -1;
            }
        } else if (isNaN(array2[i])) {
            if(text) {
                return -1;
            } else{
                return 1;
            }
        } else {
            if(text || f_version){
                if ((r = (array1[i] - array2[i])) != 0) {
                    return r;
                }
            } else {
                if ((r = this.strcmp(array1[i].toString(), array2[i].toString())) != 0) {
                    return r;
                }
            }

            text = false;
        }
    }

    return result;
}




function sort (inputArr, sort_flags) {
    // Sort an array  
    // 
    // version: 905.1001
    // discuss at: http://phpjs.org/functions/sort
    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +    revised by: Brett Zamir (http://brettz9.blogspot.com)
    // +   improved by: Brett Zamir (http://brettz9.blogspot.com)
    // %        note 1: SORT_STRING (as well as natsort and natcasesort) might also be
    // %        note 1: integrated into all of these functions by adapting the code at
    // %        note 1: http://sourcefrog.net/projects/natsort/natcompare.js
    // *     example 1: sort(['Kevin', 'van', 'Zonneveld']);
    // *     returns 1: true
    // *     example 2: fruits = {d: 'lemon', a: 'orange', b: 'banana', c: 'apple'};
    // *     example 2: sort(fruits);
    // *     returns 2: true
    // *     results 2: fruits == {0: 'apple', 1: 'banana', 2: 'lemon', 3: 'orange'}
    var valArr = [], keyArr=[];
    var k = '', i = 0, sorter = false, that = this;
    
    for (k in inputArr) { // Get key and value arrays
        valArr.push(inputArr[k]);
        delete inputArr[k];
    }

    switch (sort_flags) {
        case 'SORT_STRING': // compare items as strings
            sorter = function (a, b) {
                return that.strnatcmp(a, b);
            };
            break;
        case 'SORT_LOCALE_STRING': // compare items as strings, based on the current locale (set with  i18n_loc_set_default() as of PHP6)
            sorter = function (a, b) {
                return(a.localeCompare(b));
            };
            break;
        case 'SORT_NUMERIC': // compare items numerically
            sorter = function (a, b) {
                return(a - b);
            };
            break;
        case 'SORT_REGULAR': // compare items normally (don't change types)
        default:
            sorter = function (a, b) {
                if (a > b) {
                    return 1;
                }
                if (a < b) {
                    return -1;
                }
                return 0;
            };
            break;
    }
    valArr.sort(sorter);

    for (i = 0; i < valArr.length; i++) { // Repopulate the old array
        inputArr[i] = valArr[i];
    }
    return true;
}

/**
 * Helper function to add leading zero
 *
 * @param {String} n
 * @return {String}
 */
Date.prototype._addZero = function(n) {
  return (n < 0 || n > 9 ? '' : '0') + n;
}

Date.prototype.toISOString = function() {
  var d = this;
  return (d.getFullYear() + '-' + d._addZero(d.getMonth() + 1) + '-'
  + d._addZero(d.getDate()) + 'T' + d._addZero(d.getHours()) + ':'
  + d._addZero(d.getMinutes()) + ':' + d._addZero(d.getSeconds()) + '.000Z');
}

Date.prototype.toCustomTimestampString = function() {
  var d = this;
  return (d.getFullYear() + d._addZero(d.getMonth() + 1) 
  + d._addZero(d.getDate()) + d._addZero(d.getHours())
  + d._addZero(d.getMinutes()) + d._addZero(d.getSeconds()));
}

function iso_timestamp() {
  var now = new Date();
  var gmt = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  return gmt.toISOString() ;
}

function custom_timestamp() {
  var now = new Date();
  var gmt = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  return gmt.toCustomTimestampString() ;
}

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
