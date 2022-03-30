/**
 * Javascript prototype extension to simulate List.contains method
 * @param {Object} arg
 * Usage:
 * arrayObject.contains(value to search in arrayObject)
 */
Array.prototype.contains = function(arg) {
	for (i in this) {
		if (this[i]==arg) return true;
	}
	return false;
};

/**
 * null value check function. If value is null, return an empty string.
 * if value is NOT null, returns trimmed (strTrim function) version of value
 * @param value
 * @returns
 */
function nvlval(value) {
	if (value) {
		return strTrim(value);
	}
	
	return '';
}

/**
 * Remove empty spaces before and after a string.
 * NS may return char type behavior when returning text back.
 * ie) When char field is set to 30 and actual string is 20, value returned may still be 30
 * @param {Object} stringToTrim
 */
function strTrim(stringToTrim) {
	if (!stringToTrim) {
		return '';
	}
	return stringToTrim.replace(/^\s+|\s+$/g,"");	
}

function getCurrentUser() {
	return nlapiGetContext().getUser();
}

/**
 * Helper function to write custom debug/error message.
 * This function is to shortten the amount of code you have to write.
 * @param {Object} _type
 * @param {Object} _title
 * @param {Object} _msg
 */
function log(_type, _title, _msg) {
	nlapiLogExecution(_type, _title, _msg);
}

/**
 * validates email address format
 * @param email
 * @returns
 */
function validateEmail(email) { 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

/**
 * Translates Error into standarized text.
 * @param {Object} _e
 */
function getErrText(_e) {
	var txt='';
	if (_e instanceof nlobjError) {
		//this is netsuite specific error
		txt = 'NLAPI Error: '+_e.getCode()+' :: '+_e.getDetails();
	} else {
		//this is generic javascript error
		txt = 'JavaScript/Other Error: '+_e.toString();
	}
	
	txt = strGlobalReplace(txt, "\r", " || ");
	txt = strGlobalReplace(txt,"\n", " || ");
	
	return txt;
}

/**
 * Helper function to GLOBALLY search and replace char or word with provided char or word
 * @param _fullString - Original String Value
 * @param _searchChar - Char or Word to search for
 * @param _replaceChar - Char or Word to replace with.
 * @returns
 */
function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
	var jsrs = new RegExp(_searchChar, "g");
	
	return _fullString.replace(jsrs,_replaceChar);
}