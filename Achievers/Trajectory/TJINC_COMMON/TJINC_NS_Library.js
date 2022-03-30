/**
* Copyright (c) 2015 Trajectory Inc. 
* 2 Berkeley Street, Unit 205, Toronto, ON, Canada, M5A 4J5 
* www.trajectoryinc.com 
* All Rights Reserved. 
*/

/** 
* @System: General NetSuite Library
* @Version: 1.0.22
* @Company: Trajectory Inc. / Kuspide Canada Inc. 
* @CreationDate: 20150101
* @RequirementsUrl: [Url of the document that has the requirement of the functionality]
* @DocumentationUrl: [Url of the document that has the general description of the functionality]
* @FileName: TJINC_NS_Library
* @NamingStandard: TJINC_NSJ-1-3-4
*/

/* global navigator  */

var tj = new tj_library();
var tj_log_unloaded = true;


function tj_library () {
    if (typeof nlapiGetContext !== 'undefined') {
        this.context = nlapiGetContext();
    } else {
        this.context = {
            getExecutionContext : function () {
                return 'userinterface';
            }
        };
    }
    this.regExpAgentFireMac = /Mozilla\/5.0 \(Macintosh; Intel Mac OS X\b.*?\bGecko\/20100101 Firefox\/40/m;
    this.userAgentFireWin = 'Mozilla/5.0 (Windows NT 6.3; WOW64; rv:39.0) Gecko/20100101 Firefox/39.0';
    this.userAgentChroMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.118 Safari/537.36';
    this.userAgentChroWin = 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.89 Safari/537.36';
    this.regExpSpace = new RegExp('/^\s+|\s+$/g');
    this.logActive = false;
    this.logdActive = false;
    this.dateMap = {};
    this.itemType = {
            'Assembly': 'assemblyitem',
            'Descriptio​n': 'descriptionitem',
            'Discount': 'discountitem',
            'DwnLdItem': 'downloaditem',
            'GiftCert': 'giftcertificateitem',
            'Group': 'itemgroup',
            'InvtPart': 'inventoryitem',
            'Kit': 'kititem',
            'Markup': 'markupitem',
            'NonInvtPart': 'noninventoryitem',
            'OthCharge': 'otherchargeitem',
            'Payment': 'paymentitem',
            'Service': 'serviceitem',
            'ShipItem': 'shipitem',
            'Subtotal': 'subtotalitem'
    };
    // Incomple information this.itemType
    /*

    this.itemType = {
            'EndGroup': 'xx',
            'TaxGroup​n': 'xx',
            'TaxItem': 'xx',
            'xx': 'serializedassemblyitem',
            'xx': 'serializedinventoryitem',
    };

    */


    this.trim = function (stringToTrim) {
        if (stringToTrim === null) {
            return stringToTrim;
        }
        return stringToTrim.toString().replace(this.regExpSpace, '');
    };

    this.getErrorMesg = function (errorObj) {
        if (errorObj == '[object nlobjError]') {
            return this.trim (errorObj.getDetails() + errorObj.getStackTrace());
        } else if (errorObj == '[object Object]') {
            return this.trim (errorObj.message);
        } else {
            return errorObj;
        }
    };

    this.log = function (s_text, s_text2, s_level) {
        tj_log (this.logActive, s_text, s_text2, s_level);
    };

    this.logd = function (s_text, s_text2, s_level) {
        tj_log (this.logdActive, s_text, s_text2, s_level);
    };

    this.logError = function (s_text, e) {
        if (e != null) {
            e = this.getErrorMesg(e);
        }
        tj_log (true, s_text, e, 'ERROR');
    };

    this.chrono = function (s_key, b_reset) {
        if (b_reset != undefined && b_reset) {
            this.dateMap[s_key] = new Date().getTime();
            return 0;
        } else {
            if (this.dateMap.hasOwnProperty(s_key)) {
                var i_now = new Date().getTime();
                return i_now - this.dateMap[s_key];
            } else {
                this.dateMap[s_key] = new Date().getTime();
                return 0;
            }
        }
    };

    this.isNumber = function (n) {
        return ((n !== null) && (n !== '') && (!isNaN(parseInt(n, 10))) && isFinite(n));
    };

    this.date = {
        convert: function(d) {
            return (d.constructor === Date ? d : d.constructor === Array ? new Date(d[0], d[1], d[2]) : d.constructor === Number ? new Date(d)
                    : d.constructor === String ? new Date(d) : typeof d === 'object' ? new Date(d.year, d.month, d.date) : NaN);
        },
        compare: function(a, b) {
            return (isFinite(a = this.convert(a).valueOf()) && isFinite(b = this.convert(b).valueOf()) ? (a > b) - (a < b) : NaN);
        },
        inRange: function(d, start, end) {
            return (isFinite(d = this.convert(d).valueOf()) && isFinite(start = this.convert(start).valueOf())
                    && isFinite(end = this.convert(end).valueOf()) ? start <= d && d <= end : NaN);
        },
        HMtoH: function(s_time) {
            var a_time = s_time.split(':'), i_time = parseFloat(a_time[0]) + (parseFloat(a_time[1]) / 60);
            return ((s_time !== null && s_time !== '') && (a_time.length > 1) ? i_time : NaN);
        }
    };

 // Date Related variables
    var MONTH_NAMES = new Array('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec');
    var DAY_NAMES = new Array('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri',
            'Sat');

    this.formatDate = function (date, format) {
     // ------------------------------------------------------------------
     // formatDate (date_object, format)
     // Returns a date in the output format specified.
     // The format string can be of the following:
     // ------------------------------------------------------------------
     // These functions use the same 'format' strings as the
     // java.text.SimpleDateFormat class, with minor exceptions.
     // The format string consists of the following abbreviations:

     // Field | Full Form | Short Form
     // -------------+--------------------+-----------------------
     // Year | yyyy (4 digits) | yy (2 digits), y (2 or 4 digits)
     // Month | MMM (name or abbr.)| MM (2 digits), M (1 or 2 digits)
     // | NNN (abbr.) |
     // Day of Month | dd (2 digits) | d (1 or 2 digits)
     // Day of Week | EE (name) | E (abbr)
     // Hour (1-12) | hh (2 digits) | h (1 or 2 digits)
     // Hour (0-23) | HH (2 digits) | H (1 or 2 digits)
     // Hour (0-11) | KK (2 digits) | K (1 or 2 digits)
     // Hour (1-24) | kk (2 digits) | k (1 or 2 digits)
     // Minute | mm (2 digits) | m (1 or 2 digits)
     // Second | ss (2 digits) | s (1 or 2 digits)
     // AM/PM | a |

     // NOTE THE DIFFERENCE BETWEEN MM and mm! Month=MM, not mm!
     // Examples:
     // "MMM d, y" matches: January 01, 2000
     // Dec 1, 1900
     // Nov 20, 00
     // "M/d/yy" matches: 01/20/00
     // 9/2/00
     // "MMM dd, yyyy hh:mm:ssa" matches: "January 01, 2000 12:30:45AM"
     // ------------------------------------------------------------------

         format = format + '';
         var result = '';
         var i_format = 0;
         var c = '';
         var token = '';
         var y = date.getYear() + '';
         var M = date.getMonth() + 1;
         var d = date.getDate();
         var E = date.getDay();
         var H = date.getHours();
         var m = date.getMinutes();
         var s = date.getSeconds();
         // var yyyy,yy,MMM,MM,dd,hh,h,mm,ss,ampm,HH,KK,K,kk,k;
         // Convert real date parts into formatted versions
         var value = {};
         if (y.length < 4) {
             y = '' + (y - 0 + 1900);
         }
         value.y = '' + y;
         value.yyyy = y;
         value.yy = y.substring(2, 4);
         value.M = M;
         value.MM = LZ(M);
         value.MMM = MONTH_NAMES [M - 1];
         value.NNN = MONTH_NAMES [M + 11];
         value.d = d;
         value.dd = LZ(d);
         value.E = DAY_NAMES [E + 7];
         value.EE = DAY_NAMES [E];
         value.H = H;
         value.HH = LZ(H);
         if (H == 0) {
             value.h = 12;
         } else if (H > 12) {
             value.h = H - 12;
         } else {
             value.h = H;
         }
         value.hh = LZ(value.h);
         if (H > 11) {
             value.K = H - 12;
         } else {
             value.K = H;
         }
         value.k = H + 1;
         value.KK = LZ(value.K);
         value.kk = LZ(value.k);
         if (H > 11) {
             value.a = 'PM';
         } else {
             value.a = 'AM';
         }
         value.m = m;
         value.mm = LZ(m);
         value.s = s;
         value.ss = LZ(s);
         while (i_format < format.length) {
             c = format.charAt(i_format);
             token = '';
             while ((format.charAt(i_format) == c) && (i_format < format.length)) {
                 token += format.charAt(i_format++);
             }
             if (value[token] != null) {
                 result = result + value [token];
             } else {
                 result = result + token;
             }
         }
         return result;
     };
}

function LZ(x) {
    return (x < 0 || x > 9 ? '' : '0') + x;
}


function tj_log (b_print, s_text, s_text2, s_level) {
    if (b_print) {
        if (tj_log_unloaded) {
            tj_log_message();
            tj_log_unloaded = false;
        }
        tj.message(s_text, s_text2, s_level);
    }
}


function tj_log_message () {
    if (tj.context.getExecutionContext() === 'userinterface') {
        if (typeof navigator != 'undefined') {
            var b_valid = false;

            b_valid = tj.regExpAgentFireMac.test(navigator.userAgent);

            if (!b_valid) {
                switch (navigator.userAgent) {
                    case tj.userAgentFireWin :
                    case tj.userAgentChroMac :
                    case tj.userAgentChroWin :
                        b_valid = true;
                }
            }

            if (b_valid) {
                tj.message = function (s_text, s_text2, s_level) {
                    if (s_text === null) {
                        s_text = '';
                    } 
                    if (s_text2 === null) {
                        s_text2 = '';
                    }
                    if (s_level === null) {
                        s_level = 'DEBUG';
                    } else if (s_level !== 'DEBUG' && s_level !== 'ERROR' && s_level !== 'AUDIT' &&  s_level !== 'EMERGENCY'){
                        s_level = 'DEBUG';
                    }
                    console.log(s_level + ' - ' + s_text + ' ' + s_text2);
                };
            } else {
                tj.message = function (s_text, s_text2, s_level) {
                    
                };
            }
        } else {
            tj.message = function (s_text, s_text2, s_level) {
                if (s_text === null) {
                    s_text = '';
                } 
                if (s_text2 === null) {
                    s_text2 = '';
                }
                if (s_level === null) {
                    s_level = 'DEBUG';
                } else if (s_level !== 'DEBUG' && s_level !== 'ERROR' && s_level !== 'AUDIT' &&  s_level !== 'EMERGENCY'){
                    s_level = 'DEBUG';
                }
                nlapiLogExecution(s_level,s_text,s_text2);
            };
        }
    } else {
        switch (tj.context.getExecutionContext()) {
            case 'userevent':
            case 'portlet':
            case 'suitelet':
            case 'scheduled':
            case 'debugger':
                tj.message = function (s_text, s_text2, s_level) {
                    if (s_text == null) {
                        s_text = '';
                    } 
                    if (s_text2 == null) {
                        s_text2 = '';
                    }
                    if (s_level == null) {
                        s_level = 'DEBUG';
                    } else if (s_level != 'DEBUG' && s_level != 'ERROR' && s_level != 'AUDIT' &&  s_level != 'EMERGENCY'){
                        s_level = 'DEBUG';
                    }
                    nlapiLogExecution(s_level,s_text,s_text2);
                };
                break;
            default:
                tj.message = function (s_text, s_text2, s_level) {};
        } 
    }
}
