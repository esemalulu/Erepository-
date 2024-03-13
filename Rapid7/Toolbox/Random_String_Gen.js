/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       22 Dec 2012     mburstein
 *
 */

/*
 * @param{string_length} Length of string to generate
 * @returns {String} Output random string with {string_length} characters
 */


/**
* This is the description for my class.
*
* @class FuckYou
* @constructor
*/

/**
* My method description.  Like other pieces of your comment blocks, 
* this can span multiple lines.
*
* @method suckIt
* @param {String} foo Argument 1
* @param {Object} config A config object
* @param {String} config.name The name on the config object
* @param {Function} config.callback A callback function on the config object
* @param {Boolean} [extra=false] Do extra, optional work
* @return {Boolean} Returns true on success
*/

/**
* My property description.  Like other pieces of your comment blocks, 
* this can span multiple lines.
* 
* @property propertyName
* @type {Object}
* @default "iWin"
*/

function getRandomString(string_length){
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}