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

/************* Pardot Functions ***********************/

function getPardotApiKey(ajson) {
	var pardotLoginUrl = 'https://pi.pardot.com/api/index?email='+ajson.pardot.user+'&password='+encodeURIComponent(ajson.pardot.pass)+'&user_key='+ajson.pardot.userkey;
	var pardotApiKey = '';
	try {
		var response = nlapiRequestURL(pardotLoginUrl, null, null );
		var responseXML = nlapiStringToXML( response.getBody() );
		pardotApiKey = nlapiSelectValue( responseXML, '//api_key' );
		
		if (!pardotApiKey) {
			log('error','Pardot login failed', 'Unable to aquire API Key');
			return false;
		}
		
	} catch (ploginerr) {
		log('error','Pardot login failed',getErrText(ploginerr));
		return false;
	}
	
	ajson.pardot.apikey = pardotApiKey;
	return true;
}

/**
 * Updates Pardots' Prospect Email address with new using Prospect ID
 * @param ajson
 * @param newEmail
 */
function pardotUpdateEmailWithId(ajson, newEmail) {
	var dobj = new Object();
	dobj.err = false;
	dobj.msg = '';
	
	if (!strTrim(newEmail)) {
		dobj.msg = 'New Email Address is Empty or Null';
		dobj.err = true;
		return dobj;
	}
	
	if (!strTrim(ajson.pardotid)) {
		dobj.msg = 'Pardot Prospect ID is missing';
		dobj.err = true;
		return dobj;
	}
	
	if (!ajson.pardot.apikey) {
		if (!getPardotApiKey(ajson)) {
			dobj.msg = 'Unable to login to Pardot';
			dobj.err = true;
			return dobj;
		}
	}
	
	//try to update email address
	var pardotUpdateUrl = 'https://pi.pardot.com/api/prospect?version=3&do=update&id='+ajson.pardotid+'&user_key='+ajson.pardot.userkey+'&api_key='+ajson.pardot.apikey+'&email='+newEmail;
	var eures = null;
	var euxml = null;
	
	try {
		eures = nlapiRequestURL(pardotUpdateUrl, null, null);
		euxml = nlapiStringToXML(eures.getBody());

		if (nlapiSelectValue(euxml, '//@stat') == 'ok') {
			dobj.err = false;
			dobj.msg = 'Successfully updated Email of Prospect in Pardot';
		} else {
			dobj.err = true;
			dobj.msg = 'Email ('+newEmail+') Update on Pardot Prospect ID ('+ajson.pardotid+') Error: '+ nlapiSelectValue(euxml, '//@code');
		}
		
	} catch (eupderr) {
		dobj.err = true;
		dobj.msg = 'Email ('+newEmail+') Update on Pardot Prospect ID ('+ajson.pardotid+') Error: '+getErrText(eupderr);
	}
	
	return dobj;
}

/**
 * Checks to see if new email address already exists in pardot
 * returns object:
 * dobj.err = false;
 * dobj.msg = '';
 * dobj.hasdup = false;	
 */
function pardotDuplicateEmail(ajson, newEmail) {
	var dobj = new Object();
	dobj.err = false;
	dobj.msg = '';
	dobj.hasdup = false;
	
	if (!strTrim(newEmail)) {
		dobj.msg = 'New Email Address is Empty or Null';
		dobj.err = true;
		return dobj;
	}
	
	if (!ajson.pardot.apikey) {
		if (!getPardotApiKey(ajson)) {
			dobj.msg = 'Unable to login to Pardot';
			dobj.err = true;
			return dobj;
		}
	}
	//lookup new email address
	try {
		var pardotReadEmailUrl = 'https://pi.pardot.com/api/prospect?version=3&do=read&user_key='+ajson.pardot.userkey+'&api_key='+ajson.pardot.apikey+'&email='+strTrim(newEmail);		
		//Find out if this email exists in Pardot
		var plookupRes = nlapiRequestURL(pardotReadEmailUrl, null, null );
		var plookupXML = nlapiStringToXML(plookupRes.getBody());
		//check to see if lookup error is due to invalid api key
		var canProc = false;
		//error code 4 is invalid prospect email meaning it doesn't exists.
		if (nlapiSelectValue(plookupXML, '//@stat') == 'ok' || nlapiSelectValue(plookupXML, '//@code') == '4') {
			canProc = true;
		} else {
			canProc = false;
			//check to see if error was due to invalid api key. in which case, try again.
			if (nlapiSelectValue(plookupXML, '//@code') == '1') {
				if (!getPardotApiKey(ajson)) {
					dobj.msg = 'Unable to login to Pardot to reset API Key';
					dobj.err = true;
					canProc = false;
					return dobj;
				} else {
					plookupRes = nlapiRequestURL(pardotReadEmailUrl, null, null );
					plookupXML = nlapiStringToXML(plookupRes.getBody());
					
					if (nlapiSelectValue(plookupXML, '//@stat') == 'ok' || nlapiSelectValue(plookupXML, '//@code') == '4') {
						canProc = true;
					} else {
						dobj.msg = 'Unable to login to lookup Email in Pardot';
						dobj.err = true;
						canProc = false;
						return dobj;
					}
				}
			} else {
				dobj.msg = 'Email ('+newEmail+') Lookup Error: '+ nlapiSelectValue(plookupXML, '//@code');
				dobj.err = true;
				return dobj;
			}
		}

		if (canProc) {
		
			if (nlapiSelectValue( plookupXML, '//id' )) {
				//alert out details
				var dupMsg = newEmail+' already exists in Pardot: '+
						     'Pardot Prospect ID: '+nlapiSelectValue( plookupXML, '//id' )+' // '+
						     'Full Name: '+nlapiSelectValue( plookupXML, '//first_name' )+' '+nlapiSelectValue( plookupXML, '//last_name' )+' // '+
						     'Company: '+nlapiSelectValue( plookupXML, '//company' );
				
				dobj.msg = dupMsg;
				dobj.err = false;
				dobj.hasdup = true;
				return dobj;
				
			} else {
				dobj.msg = 'No Records Exists in Pardot with Email: '+newEmail;
				dobj.err = false;
				dobj.hasdup = false;
				return dobj;
			}			
		} else {
			return dobj;
		}
	} catch (plookuperr) {
		dobj.msg = 'Error Checking for Duplicate Email in pardot: '+getErrText(plookuperr);
		dobj.err = true;
		return dobj;
	}
}

