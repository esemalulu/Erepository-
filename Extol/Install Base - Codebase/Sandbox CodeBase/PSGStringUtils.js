/**
* @projectDescription 	PSG Devt Utilities JavaScript library.
*
* @author	Noah Tumlos ntumlos@netsuite.com
* @author	Tony Faelga afaelga@netsuite.com
* @author	Carlo Ibarra cibarra@netsuite.com
* @author	Ems Ligon eligon@netsuite.com
* @author	Rozal Reese rreese@netsuite.com
* 
* @since	2009
* @version	2009.0 initial code
*/

var PSG;
if (!PSG) PSG = {};
if (!PSG.Library) PSG.Library = {};
if (!PSG.Library.StringUtils) PSG.Library.StringUtils = {};

/**
 * trim, ltrim and rtrim are javascript function that trims white spaces from
 * a both ends of a string (trim), beginning/left of the string (ltrim) 
 * or end/right of the string (rtrim)
 * 
 * @param {string} stringToTrim
 * @return {string}
 * 
 * @version	2009.0
 */
PSG.Library.StringUtils.trim = function (stringToTrim)  { return stringToTrim.replace(/^\s+|\s+$/g,""); }

/**
 * 
 * @param {string} stringToTrim
 * @return {string}
 * 
 * @version	2009.0
 */
PSG.Library.StringUtils.ltrim = function (stringToTrim) { return stringToTrim.replace(/^\s+/,""); }

/**
 * 
 * @param {string} stringToTrim
 * @return {string}
 * 
 * @version	2009.0
 */
PSG.Library.StringUtils.rtrim = function (stringToTrim) { return stringToTrim.replace(/\s+$/,""); }

/**
 * Removes all leading and trailing spaces on the string object.
 *
 * @return the trimmed String object
 * @type String
 */
String.prototype.trim = function() {
    return this ? this.replace(/^\s*/, '').replace(/\s+$/, '') : null;
}

/**
 * Removes all leading spaces on the string object.
 *
 * @return the trimmed String object
 * @type String
 */
String.prototype.ltrim = function() {
    return this ? this.replace(/^\s*/, '') : null;
}

/**
 * Removes all leading and trailing spaces on the string object.
 *
 * @return the trimmed String object
 * @type String
 */
String.prototype.rtrim = function() {
    return this ? this.replace(/\s+$/, '') : null;
}

/**
 * 
 * @param {Object} stringToTrim
 * @param {Object} delimiter
 */
PSG.Library.StringUtils.padleft = function (stringToTrim, delimiter) 
{ 
    var paddedstr = stringToTrim+'';
    if ( paddedstr.length < 2){ paddedstr = delimiter + paddedstr.replace(/^\s+/,"");}
    return paddedstr
}

PSG.Library.StringUtils.prettifyMessage = function (/* ... */ ) {
    // Loop through all the arguments,
    var alertMessage;
    var nameListArray = arguments[0].split(',');
    for(var i = 1; i < arguments.length; i++) {
        if (alertMessage) {
            alertMessage = alertMessage + "\n";
            alertMessage = alertMessage + "[" + nameListArray[i - 1].trim() + ":" + arguments[i] + "]";
        } else {
            alertMessage = "\n[" + nameListArray[i - 1] + ":" + arguments[i] + "]";
        }   
    }
    return alertMessage;
}

PSG.Library.StringUtils.prettifyMessageWeb = function (/* ... */ ) {
    // Loop through all the arguments,
    var alertMessage;
    var nameListArray = arguments[0].split(',');
    for(var i = 1; i < arguments.length; i++) {
        if (alertMessage) {
            alertMessage = alertMessage + "<br>";
            alertMessage = alertMessage + "[" + nameListArray[i - 1].trim() + ":" + arguments[i] + "]";
        } else {
            alertMessage = "<br>[" + nameListArray[i - 1].trim() + ":" + arguments[i] + "]";
        }   
    }
    return alertMessage;
}

PSG.Library.StringUtils.myDateToString = function (inputDate) {
   var dateStr;
   dateStr = "" + inputDate.getFullYear() + '.';
   if (inputDate.getMonth() < 9) dateStr += "0";
   dateStr +=  (inputDate.getMonth() + 1) + '.';
   if (inputDate.getDate() < 10) dateStr += "0";
   dateStr += inputDate.getDate();
   return dateStr;
}



