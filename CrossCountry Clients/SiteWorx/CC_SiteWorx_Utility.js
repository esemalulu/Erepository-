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

function getNetSuiteDomain()
{
	if (nlapiGetContext().getEnvironment()=='SANDBOX')
	{
		return 'https://system.sandbox.netsuite.com';
	}
	else if (nlapiGetContext().getEnvironment()=='BETA')
	{
		return 'https://system.beta.na1.netsuite.com';
	}
	else if (nlapiGetContext().getEnvironment()=='PRODUCTION')
	{
		return 'https://system.netsuite.com';
	}
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
 * Function that takes in a Date Object value, a POSITIVE integer value
 * that represents number of business days to add from starting date.
 * Boolean value is also passed in to indicate go future or go back in time
 * Business Days are defined as Monday through Friday
 *  
 * @param _startFromDate DATE
 * @param _bizDays INTEGER
 * @param _goBackInTime BOOLEAN
 * @Return String Version of Business Date
 */
function getBusinessDate(_startFromDate, _bizDays, _goBackInTime)
{
	if (!_startFromDate)
	{
		//Throw Error
		throw nlapiCreateError(
			'GET_BIZ_DATE_UTIL_ERR', 
			'Date Object representation of starting Date is missing', 
			true
		);
	}
	
	if (!_bizDays)
	{
		//Throw Error
		throw nlapiCreateError(
			'GET_BIZ_DATE_UTIL_ERR', 
			'Positive Integer value representing number of business days to increment/decrement is missing', 
			true
		);
	}
	
	if (_goBackInTime==null)
	{
		//default to false
		_goBackInTime = false;
	}
	
	//business days means Monday through Friday
	var bizDate = null;
	var numDays = 0;
	
	//Grab Business Date in the Future
	//loop until you get to parseInt(paramDaysToPayment) days BEFORE entitlement date
	while (numDays < _bizDays) 
	{
		if (!bizDate) 
		{
			bizDate = _startFromDate;
		}
		
		var incrementValue = 1;
		if (_goBackInTime)
		{
			incrementValue = -1;
		}
		
		//add one day
		bizDate = nlapiAddDays(bizDate, incrementValue);
		//0 = Sunday
		//6 = Sat
		if (bizDate.getDay() != 0 && bizDate.getDay()!=6) 
		{
			  numDays++;
		}
	}
	
	return nlapiDateToString(bizDate);	
}