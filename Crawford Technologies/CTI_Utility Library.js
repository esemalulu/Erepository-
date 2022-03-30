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
 * 
 * @param _val = decimal value to convert
 * @param _addDollarSign = apply $ in front of formatted number or not
 * @returns
 */
function formatCurrency(_val,_addDollarSign){
	var n = _val;
	var c = 2;
	var d = '.';
	var t = ',';
	c = isNaN(c = Math.abs(c)) ? 2 : c;
	d = d == undefined ? "." : d;
	t = t == undefined ? "," : t;
	s = n < 0 ? "-" : "";
	i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "";
	j = (j = i.length) > 3 ? j % 3 : 0;
	if (_addDollarSign) {
		return ''+ s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
	}
	
	return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};

/**
 * Remove empty spaces before and after a string.
 * NS may return char type behavior when returning text back.
 * ie) When char field is set to 30 and actual string is 20, value returned may still be 30
 * @param {Object} stringToTrim
 */
function getCount(result) {

    count = 0;
	for (var cnt=0; result && cnt < result.length; cnt++)
	{
	   count +=1;
	};
  
  return count;
}











/**
 * Takes JavaScript date object and returns formatted version of date object.
 * Format: YYYY-MM-DD HH:MM:SS am/pm
 * @param dtobj
 * @returns {String}
 */
function getStandardizedDateString(dtobj) {
	//log('debug','get Standardized Date String: ', dtobj);
	var dtampm = 'am';
	var dthour = dtobj.getHours();
	
	//log('debug','dthour', dthour);
	
	if (parseInt(dthour) >= 12) {
		if (parseInt(dthour) > 12) {
			dthour = parseInt(dthour)-12;
		}
		dtampm = 'pm';
	} 
	if (parseInt(dthour)==0 || parseInt(dthour) < 10) {
		
		dthour = '0'+dthour;
	}
	
	var dtmin = dtobj.getMinutes();
	if (parseInt(dtmin)==0 || parseInt(dtmin) < 10) {
		dtmin = '0'+dtmin;
	}
	
	var dtsec = dtobj.getSeconds();
	if (parseInt(dtsec)==0 || parseInt(dtsec) < 10) {
		dtsec = '0'+dtsec;
	}
	
	var dtmonth = dtobj.getMonth()+1;
	if (parseInt(dtmonth)==0 || parseInt(dtmonth) < 10) {
		dtmonth = '0'+dtmonth;
	}
	
	var dtdate = dtobj.getDate();
	if (parseInt(dtdate)==0 || parseInt(dtdate) < 10) {
		dtdate = '0'+dtdate;
	}
	
	var dtstr = dtobj.getFullYear()+'-'+dtmonth+'-'+dtdate+' '+dthour+':'+dtmin+':'+dtsec+' '+dtampm;
	//log('debug','formatted', dtstr);
	
	return dtstr;
	
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
 * @param _arSkipDates ARRAY
 * 			arSkipDates are array of dates that should get treated as weekend.
 * 			These dates are passed in WITHOUT a Year. So MM/DD
 * @Return String Version of Business Date
 */
function getBusinessDate(_startFromDate, _bizDays, _goBackInTime, _arSkipDates)
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
		
		//If arSkipDates is passed in, loop through and make sure the bizDate is NOT one of them
		var isSkipDate = false;
		if (_arSkipDates && _arSkipDates.length > 0)
		{
			//values in the array are in MM/DD format with no year. go through and match against each
			var bizDateYear = bizDate.getFullYear();
			for (var sk=0; sk < _arSkipDates.length; sk+=1)
			{
				//Build the date by attaching YEAR to it
				var skipDate = nlapiDateToString(new Date(_arSkipDates[sk]+'/'+bizDateYear));
				//log('debug','skipDate // bizDate',skipDate+' // '+nlapiDateToString(bizDate));
				if (nlapiDateToString(bizDate) == skipDate)
				{
					isSkipDate = true;
					//log('debug','skip this date',nlapiDateToString(bizDate));
					break;
				}
			}
		}
		
		//Increment ONLY if it's NOT on weekend OR isSkipDate is False
		if (bizDate.getDay() != 0 && bizDate.getDay()!=6 && !isSkipDate) 
		{
			  numDays++;
		}
	}
	
	return nlapiDateToString(bizDate);	
}

/**
 * Array comparison.
 * @param x
 * @param y
 * @returns {Boolean}
 */
function compareArray(x, y) 
{
   var objectsAreSame = true;
	   
   if (x.length != y.length) 
   {
	   log('debug','array no match',x.length +' is not same as '+y.length);
	   return false;
   }
	   
   for(var i=0; i < x.length; i++) 
   {
      if(!y.contains(x[i])) 
      {
    	  log('debug','value does NOT exists in Y',x[i]+' does NOT exists in y array: '+y);
    	 //if at any point in the loop, y does NOT have what x has, it's not equal
         objectsAreSame = false;
         break;
      }
   }
   return objectsAreSame;
}


function formatFloat(_val, c, d, t){
	var n = _val;
	c = isNaN(c = Math.abs(c)) ? 2 : c;
	d = d == undefined ? "," : d;
	t = t == undefined ? "." : t;
	s = n < 0 ? "-" : "";
	i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "";
	j = (j = i.length) > 3 ? j % 3 : 0;
	return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};