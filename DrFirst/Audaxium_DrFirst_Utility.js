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
 * Function that formats the passed in date into UTC format compatible with Rcopia API
 * 
 * @param _date
 */
function lmsUtcFormatDate(_date)
{
	var formattedDate = '';
	if (_date)
	{
		formattedDate = _date.toISOString();
		formattedDate = formattedDate.replace('Z','+0000');
	}
	return formattedDate;
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

/**
 * current version (as of 2015v1) does NOT expose State/province drop down list.
 * This JSON object is to avoid creating custom list or record to gain access to the list
 */
var usStateList = {
	"Alabama":"AL",
	"Alaska":"AK",
	"Arizona":"AZ",
	"Arkansas":"AR",
	"Armed Forces Americas":"AA",
	"Armed Forces Europe":"AE",
	"Armed Forces Pacific":"AP",
	"American Samoa":"AS",
	"Federated States of Micronesia":"FM",
	"Guam":"GU",
	"Northern Mariana Islands":"MP",
	"Palau":"PW",
	"Virgin Islands":"VI",
	"California":"CA",
	"Colorado":"CO",
	"Connecticut":"CT",
	"Delaware":"DE",
	"District of Columbia":"DC",
	"Florida":"FL",
	"Georgia":"GA",
	"Hawaii":"HI",
	"Idaho":"ID",
	"Illinois":"IL",
	"Indiana":"IN",
	"Iowa":"IA",
	"Kansas":"KS",
	"Kentucky":"KY",
	"Louisiana":"LA",
	"Maine":"ME",
	"Maryland":"MD",
	"Massachusetts":"MA",
	"Michigan":"MI",
	"Minnesota":"MN",
	"Mississippi":"MS",
	"Missouri":"MO",
	"Montana":"MT",
	"Nebraska":"NE",
	"Nevada":"NV",
	"New Hampshire":"NH",
	"New Jersey":"NJ",
	"New Mexico":"NM",
	"New York":"NY",
	"North Carolina":"NC",
	"North Dakota":"ND",
	"Ohio":"OH",
	"Oklahoma":"OK",
	"Oregon":"OR",
	"Pennsylvania":"PA",
	"Puerto Rico":"PR",
	"Rhode Island":"RI",
	"South Carolina":"SC",
	"South Dakota":"SD",
	"Tennessee":"TN",
	"Texas":"TX",
	"Utah":"UT",
	"Vermont":"VT",
	"Virginia":"VA",
	"Washington":"WA",
	"West Virginia":"WV",
	"Wisconsin":"WI",
	"Wyoming":"WY"
};
