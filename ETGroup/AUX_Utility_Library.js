/**
 * This is library of helpful javascript functions 
 */

var ctx = nlapiGetContext();

var slaTimerErrorEmailGroup = 'etgroup@audaxium.com,jleclair@etgroup.ca';
//var slaTimerErrorEmailGroup = 'etgroup@audaxium.com';
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

var trxTypeValue = {
	'salesorder':'Sales Order',
	'invoice':'Invoice',
	'estimate':'Quote'
};

var MonthAbbr= {
		"Jan":"1",
		"Feb":"2",
		"Mar":"3",
		"Apr":"4",
		"May":"5",
		"Jun":"6",
		"Jul":"7",
		"Aug":"8",
		"Sep":"9",
		"Oct":"10",
		"Nov":"11",
		"Dec":"12"
	};

/**
 * This function converts passed in Date or Date/Time string to Date Object based on Company Preference of Date format
 * Issue with NetSuite is that it only supports certain types of formatting. 
 * This function returns date object based on current date format and time format:
 *    Current Company Setting: (DD-Mon-YYYY) (hh:mm AM/PM)
 * @param _dateString
 */
function getDateObjBasedOnCurrentCompanyPref(_dateTimeString) {
	//Current Company Pref Setting on Date format:
	//DD-Mon-YYYY hh:mm AM/PM
	//break down the date 
	if (!_dateTimeString) {
		return null;
	}

	//Current date and time format, we can split the string using empty space. 
	// Since current time format IS convertable in JavaScirpt, we'll convert date only and rebuild date string to cast to Date object.
	var dateArray = _dateTimeString.split(' ');
	//0=Date element
	//1=hh:mm
	//2=am/pm
	var netSuiteFormattedDateString = '';
	if (dateArray && dateArray.length > 0) {
		
		var dateElements = dateArray[0].split('-');
		//0=DD
		//1=Mon
		//2=YYYY
		
		if (dateArray.length ==1) {
			//only date is passed in
			//rearraigne the date string to match mm/dd/yyyy format
			netSuiteFormattedDateString = MonthAbbr[dateElements[1]]+'/'+dateElements[0]+'/'+dateElements[2];
		} else {
			//assume this is date time format
			netSuiteFormattedDateString = MonthAbbr[dateElements[1]]+'/'+dateElements[0]+'/'+dateElements[2]+' '+dateArray[1]+' '+dateArray[2];
		}
		
	} else {
		return null;
	}
	
	return new Date(netSuiteFormattedDateString); 
	
}

/**
 * Reformats the date to DD/MMM/YYYY HH:MM 24 hour base
 * @param _nsDateString
 * @returns
 */
function reformatDate(_dateTimeString) {
	
	//Current Company Pref Setting on Date format:
	//DD-Mon-YYYY hh:mm AM/PM
	//break down the date 
	if (!_dateTimeString) {
		return null;
	}

	dateObjectVersion = getDateObjBasedOnCurrentCompanyPref(_dateTimeString);
	
	//Current date and time format, we can split the string using empty space. 
	// Since current time format IS convertable in JavaScirpt, we'll convert date only and rebuild date string to cast to Date object.
	var dateArray = _dateTimeString.split(' ');
	//0=Date element
	//1=hh:mm
	//2=am/pm
	
	log('debug','util dateArray',dateArray.toString());
	
	var reformattedDateString = '';
	if (dateArray && dateArray.length > 0) {
		
		var dateElements = dateArray[0].split('-');
		//0=DD
		//1=Mon
		//2=YYYY
		
		if (dateArray.length ==1) {
			//only date is passed in
			reformattedDateString = dateElements[0]+'/'+dateElements[1]+'/'+dateElements[2];
		} else {
			//assume this is date time format
			reformattedDateString = dateElements[0]+'/'+dateElements[1]+'/'+dateElements[2]+' '+dateObjectVersion.getHours()+':'+dateObjectVersion.getMinutes();
		}
		
	} else {
		return null;
	}
	
	return reformattedDateString;
}

/**
 * checks for empty string or null value of passed in parameter.
 * if null, returns empty string. If not null and has value, return the value passed in
 * @param val
 * @returns
 */
function chkNvl(val) {
	if (!val) {
		return '';
	}
	return val;
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
