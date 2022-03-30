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
		return '$'+ s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
	}
	
	return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};

function getDateDefaults() {
	
	var curDate = new Date();
	//Finding Week Range--------
	var curWeekDay = curDate.getDay();
	//Week Start
	var curWeekStartDate = curDate;
	if (curWeekDay > 0) {
		//subtrack day from curDate
		curWeekStartDate = nlapiAddDays(curDate, (-1 * parseInt(curWeekDay)));
	}
	//Week End
	var curWeekEndDate = curDate;
	if (curWeekDay < 6) {
		//subtract 6 - curWeekDay and ADD that value to curDate
		curWeekEndDate = nlapiAddDays(curDate, (6 - parseInt(curWeekDay)));
	}
	
	//Finding Month Range---------
	var curMonthStartDate = new Date((curDate.getMonth()+1)+'/1/'+curDate.getFullYear());
	//Month End date = Plus One Month and Subtract one day
	var curMonthEndDate = nlapiAddDays(nlapiAddMonths(curMonthStartDate, 1), -1);
	
	//Finding Quarter Range-------------
	//Assumption: Q1=Jan Feb Mar // Q2=Apr May Jun // Q3=Jul Aug Sep // Q4=Oct Nov Dec
	var quarterDateJson = {
		"q1":{
			"start":"1/1/"+curDate.getFullYear(),
			"end":"3/31/"+curDate.getFullYear()
		},
		"q2":{
			"start":"4/1/"+curDate.getFullYear(),
			"end":"6/30/"+curDate.getFullYear()
		},
		"q3":{
			"start":"7/1/"+curDate.getFullYear(),
			"end":"9/30/"+curDate.getFullYear()
		},
		"q4":{
			"start":"10/1/"+curDate.getFullYear(),
			"end":"12/31/"+curDate.getFullYear()
		}
	};
	
	//decide on current Quarter
	var curMonth = curDate.getMonth()+1;
	//quarter is decided by month/3 since there are 3 months in the quarter.
	var quarterVal = 'q'+(Math.ceil(curMonth/3));
	
	var ojson = {
			"Day":{
				"start":nlapiDateToString(curDate),
				"end":nlapiDateToString(curDate)
			},
			"Week":{
				"start":nlapiDateToString(curWeekStartDate),
				"end":nlapiDateToString(curWeekEndDate)
			},
			"Month":{
				"start":nlapiDateToString(curMonthStartDate),
				"end":nlapiDateToString(curMonthEndDate)
			},
			"Quarter":{
				"start":quarterDateJson[quarterVal].start,
				"end":quarterDateJson[quarterVal].end
			},
			"Year":{
				"start":"1/1/"+curDate.getFullYear(),
				"end":"12/31/"+curDate.getFullYear()
			}
	};
	
	return ojson;
	 
}
