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
 * JSON object that allows generation of Date Filter drop down on Saved Search dynamic filter.
 */
var nsDateRange = {
		'five days ago': {'nsvar':'DAGO5','desc':'Five days ago from now or from source date','type':'single'},
		'five days from now': {'nsvar':'DFN5','desc':'Five days from now or from source date','type':'single'},
		'four days ago':{'nsvar':'DAGO4','desc':'Four days ago from now or from source date','type':'single'},
		'four days from now':{'nsvar':'DFN4','desc':'Four days from now or from source date','type':'single'}, 
		'last business week':{'nsvar':'LBW','desc':'FROM Monday of the next week to Sunday of the following week','type':'range'},
		'last fiscal half':{'nsvar':'LFH','desc':'FROM first day of the previous fiscal half year TO the last day of that same half year','type':'range'},
		'last fiscal half one year ago':{'nsvar':'LFHLFY','desc':'FROM the first day of the previous fiscal half TO the last day of that same half, one year ago','type':'range'},
		'last fiscal half to date':{'nsvar':'LFHTD','desc':'FROM the first day of the last fiscal half TO today\'s point (day) of that half','type':'range'},
		'last fiscal quarter':{'nsvar':'LFQ','desc':'FROM first day of quarter TO last day of quarter','type':'range'},
		'last fiscal quarter one year ago':{'nsvar':'LFQLFY','desc':'FROM the first day of the previous fiscal quarter TO the last day of that same quarter, one year ago','type':'range'},
		'last fiscal quarter to date':{'nsvar':'LFQTD','desc':'FROM first day of last fiscal quarter TO today\'s point (day) of that quarter','type':'range'},
		'last fiscal year':{'nsvar':'LFY','desc':'FROM first day of last fiscal year TO last day of last fiscal year','type':'range'},
		'last fiscal year to date':{'nsvar':'LFYTD','desc':'FROM first day of last fiscal year TO today\'s date of that year','type':'range'},
		'last month':{'nsvar':'LM','desc':'FROM first day of previous month TO last day of previous month','type':'range'},
		'last month one quarter ago':{'nsvar':'LMLFQ','desc':'FROM the first day of the month TO the last day of the month for the month that corresponds to last month, one quarter ago','type':'range'},
		'last month one year ago':{'nsvar':'LMLFY','desc':'FROM the first day of last month TO the last day of last month, one year ago','type':'range'},
		'last month to date':{'nsvar':'LMTD','desc':'FROM first day of last month TO today\'s point (day) of that month','type':'range'},
		'last month two quarters ago':{'nsvar':'LMFQBL','desc':'FROM the first day of the month TO the last day of the month for the month that corresponds to last month, two quarters ago','type':'range'},
		'last month two years ago':{'nsvar':'LMFYBL','desc':'FROM the first day of last month TO the last day of last month, two years ago','type':'range'},
		'last quarter two years ago':{'nsvar':'LFQFYBL','desc':'FROM the first day of last quarter TO the last day of last quarter, two years ago','type':'range'},
		'last rolling half':{'nsvar':'LRH','desc':'FROM six full months prior to last month TO the end of last month','type':'range'},
		'last rolling quarter':{'nsvar':'LRQ','desc':'FROM three full months prior to last month TO to the end of last month','type':'range'},
		'last rolling year':{'nsvar':'LRY','desc':'FROM twelve full months prior to last month TO the end of last month','type':'range'},
		'last week':{'nsvar':'LW','desc':'FROM the Sunday of the previous week TO the Saturday of the previous week','type':'range'},
		'last week to date':{'nsvar':'LWTD','desc':'FROM the Sunday of the previous week TO today\'s point (day) of that week','type':'range'},
		'next business week':{'nsvar':'NBW','desc':'FROM the Monday of the next business week TO seven days from that day (Sunday)','type':'range'},
		'next fiscal half':{'nsvar':'NFH','desc':'FROM the first day of the next fiscal half TO the last day of the next fiscal half','type':'range'},
		'next fiscal quarter':{'nsvar':'NFQ','desc':'FROM first day next fiscal quarter TO last day of next fiscal quarter','type':'range'},
		'next fiscal year':{'nsvar':'NFY','desc':'FROM first day of next fiscal year TO last day of next fiscal year','type':'range'},
		'next four weeks':{'nsvar':'N4W','desc':'FROM first Sunday after today\'s date TO the fourth Saturday following that Sunday (28 days)','type':'range'},
		'next month':{'nsvar':'NM','desc':'FROM first day of next month TO last day of next month','type':'range'},
		'next one half':{'nsvar':'NOH','desc':'FROM tomorrow TO six months from today','type':'range'},
		'next one month':{'nsvar':'NOM','desc':'FROM tomorrow TO 1 month from today','type':'range'},
		'next one quarter':{'nsvar':'NOQ','desc':'FROM tomorrow TO 3 months from today','type':'range'},
		'next one week':{'nsvar':'NOW','desc':'FROM tomorrow TO 7 days from today','type':'range'},
		'next one year':{'nsvar':'NOY','desc':'FROM tomorrow TO 365 days from today','type':'range'},
		'next week':{'nsvar':'NW','desc':'FROM first Sunday after today\'s date TO the first Saturday after that Sunday (7 days)','type':'range'},
		'ninety days ago':{'nsvar':'DAGO90','desc':'90 days ago from now or from source date','type':'single'},
		'ninety days from now':{'nsvar':'DFN90','desc':'90 days from now or from source date','type':'single'},
		'one year before last':{'nsvar':'OYBL','desc':'FROM 2 years before tomorrow\'s date to 1 year before today\'s date','type':'range'},
		'previous months last fiscal half':{'nsvar':'PMLFH','desc':'FROM the beginning of the first month of the last fiscal half TO the end of that month','type':'range'},
		'previous months last fiscal quarter':{'nsvar':'PMLFQ','desc':'','type':'range'},
		'previous months last fiscal year':{'nsvar':'PMLFY','desc':'FROM the beginning of the first month of the last fiscal year TO the end of that month','type':'range'},
		'previous months same fiscal half last fiscal year':{'nsvar':'PMSFHLFY','desc':'FROM the beginning of the first month of the same fiscal half of the previous year TO the end of that month','type':'range'},
		'previous months same fiscal quarter last fiscal year':{'nsvar':'PMSFQLFY','desc':'FROM the beginning of the first month of the same fiscal quarter of the previous year TO the end of that month','type':'range'},
		'previous months this fiscal half':{'nsvar':'PMTFH','desc':'FROM the beginning of the first month of the current fiscal half TO the end of that month','type':'range'},
		'previous months this fiscal quarter':{'nsvar':'PMTFQ','desc':'FROM the beginning of the first month of the current fiscal quarter TO the end of that month','type':'range'},
		'previous months this fiscal year':{'nsvar':'PMTFY','desc':'FROM the beginning of the first month of the current fiscal year TO the end of that month','type':'range'},
		'previous one day':{'nsvar':'OD','desc':'FROM the beginning of the day yesterday To the beginning of the day today','type':'range'},
		'previous one half':{'nsvar':'OH','desc':'FROM the first day after six months prior to today TO today','type':'range'},
		'previous one month':{'nsvar':'OM','desc':'FROM the first day after one month prior to today TO today','type':'range'},
		'previous one quarter':{'nsvar':'OQ','desc':'FROM the first day after three months prior to today TO today','type':'range'},
		'previous one week':{'nsvar':'OW','desc':'FROM the first day after one week prior to today TO today','type':'range'},
		'previous one year':{'nsvar':'OY','desc':'FROM 1 year before tomorrow\'s date TO today','type':'range'},
		'previous quarters last fiscal year':{'nsvar':'PQLFY','desc':'FROM the beginning of the first quarter of the last fiscal year TO the end of that quarter','type':'range'},
		'previous quarters this fiscal year':{'nsvar':'PQTFY','desc':'FROM the beginning of the quarter of the current fiscal year TO the end of that quarter','type':'range'},
		'previous rolling half':{'nsvar':'PRH','desc':'FROM the first day of the month after six months prior to this month TO the end of this month','type':'range'},
		'previous rolling quarter':{'nsvar':'PRQ','desc':'FROM the first day of the month three prior to this month TO the end of this month','type':'range'},
		'previous rolling year':{'nsvar':'PRY','desc':'FROM the first day of the month twelve months prior to this month TO the end of this month','type':'range'},
		'same day last fiscal year':{'nsvar':'SDLFY','desc':'FROM the beginning of the day one year ago TO the end of that day','type':'single'},
		'same day last month':{'nsvar':'SDLM','desc':'FROM the beginning of the day one month ago TO the end of that day','type':'single'},
		'same day last quarter':{'nsvar':'SDLFQ','desc':'FROM the beginning of the day one quarter ago TO the end of that day','type':'single'},
		'same day last week':{'nsvar':'SDLW','desc':'FROM the beginning of the day one week ago TO the end of that day','type':'single'},
		'same day month before last':{'nsvar':'SDMBL','desc':'FROM the beginning of the day two months ago TO the end of that day','type':'single'},
		'same day quarter before last':{'nsvar':'SDFQBL','desc':'FROM the beginning of the day two quarters ago TO the end of that day','type':'single'},
		'same day week before last':{'nsvar':'SDWBL','desc':'FROM the beginning of the day two weeks ago TO the end of that day','type':'single'},
		'same day year before last':{'nsvar':'SDFYBL','desc':'FROM the beginning of the day two years ago TO the end of that day','type':'single'},
		'same half last fiscal year':{'nsvar':'SFHLFY','desc':'FROM the first day of the same fiscal half last fiscal year TO the last day of the same fiscal half last fiscal year','type':'range'},
		'same half last fiscal year to date':{'nsvar':'SFHLFYTD','desc':'FROM the first day of the same fiscal half last fiscal year TO today\'s point in the same fiscal half last fiscal year','type':'range'},
		'same month last fiscal quarter':{'nsvar':'SMLFQ','desc':'FROM first day of same month last fiscal quarter TO last day of same month last fiscal quarter','type':'range'},
		'same month last fiscal quarter to date':{'nsvar':'SMLFQTD','desc':'FROM first day of same month last fiscal quarter TO today\'s point (day) in same month last fiscal quarter','type':'range'},
		'same month last fiscal year':{'nsvar':'SMLFY','desc':'FROM first day of same month last fiscal year TO last day of same month last fiscal year','type':'range'},
		'same month last fiscal year to date':{'nsvar':'SMLFYTD','desc':'FROM first day of same month last fiscal year TO today\'s point (day) in same month last fiscal year','type':'range'},
		'same month quarter before last':{'nsvar':'SMFQBL','desc':'FROM first day of same month two fiscal quarters ago TO last day of same month that fiscal quarter','type':'range'},
		'same month year before last':{'nsvar':'SMFYBL','desc':'FROM first day of same month two fiscal years ago TO last day of same month that fiscal year','type':'range'},
		'same quarter last fiscal year':{'nsvar':'SFQLFY','desc':'FROM the first day of the same quarter last fiscal year TO last day of same quarter last fiscal year','type':'range'},
		'same quarter last fiscal year to date':{'nsvar':'SFQLFYTD','desc':'FROM the first day of the same quarter last fiscal year TO today\'s point (day) in the same quarter last fiscal year','type':'range'},
		'same quarter year before last':{'nsvar':'SFQFYBL','desc':'FROM the first day of the same quarter two fiscal years ago TO last day of same quarter that fiscal year','type':'range'},
		'same week last fiscal year':{'nsvar':'SWLFY','desc':'FROM first day (Sunday) of same week last fiscal year TO last day (Saturday) of same week last fiscal year','type':'range'},
		'same week year before last':{'nsvar':'SWFYBL','desc':'FROM first day of same week (Sunday) two fiscal years ago TO last day (Saturday) of same week that fiscal year','type':'range'},
		'sixty days ago':{'nsvar':'DAGO60','desc':'60 days ago from now or from source date','type':'single'},
		'sixty days from now':{'nsvar':'DFN60','desc':'60 days from now or from source date','type':'single'},
		'ten days ago':{'nsvar':'DAGO10','desc':'10 days ago from now or from source date','type':'single'},
		'ten days from now':{'nsvar':'DFN10','desc':'10 days from now or from source date','type':'single'},
		'the fiscal half before last':{'nsvar':'FHBL','desc':'FROM the first day of the fiscal half before last TO the last day of the fiscal half before last','type':'range'},
		'the fiscal half before last to date':{'nsvar':'FHBLTD','desc':'FROM the first day of the fiscal half before last TO today\'s point of the fiscal half before last','type':'range'},
		'the fiscal quarter before last':{'nsvar':'FQBL','desc':'FROM the first day of the fiscal quarter before last TO the last day of the fiscal quarter before last','type':'range'},
		'the fiscal quarter before last to date':{'nsvar':'FQBLTD','desc':'FROM the first day of the fiscal quarter before last TO today\'s point of the fiscal quarter before last','type':'range'},
		'the fiscal year before last':{'nsvar':'FYBL','desc':'FROM the first day of the fiscal year before last TO the last day of the fiscal year before last','type':'range'},
		'the fiscal year before last to date':{'nsvar':'FYBLTD','desc':'FROM the first day of the fiscal year before last TO today\'s point of the fiscal year before last','type':'range'},
		'the month after next':{'nsvar':'MAN','desc':'','type':'range'},
		'the month after next to date':{'nsvar':'MANTD','desc':'','type':'range'},
		'the month before last':{'nsvar':'MBL','desc':'FROM the first day of the month before last TO the last day of the month before last','type':'range'},
		'the month before last to date':{'nsvar':'MBLTD','desc':'FROM the first day of the month before last TO today\'s point of the month before last','type':'range'},
		'the week after next':{'nsvar':'WAN','desc':'','type':'range'},
		'the week after next to date':{'nsvar':'WANTD','desc':'','type':'range'},
		'the week before last':{'nsvar':'WBL','desc':'FROM the first day of the week before last TO the last day of the week before last','type':'range'},
		'the week before last to date':{'nsvar':'WBLTD','desc':'FROM the first day of the week before last TO today\'s point of the week before last','type':'range'},
		'thirty days ago':{'nsvar':'DAGO30','desc':'30 days ago from source date','type':'single','type':'range'},
		'thirty days from now':{'nsvar':'DFN30','desc':'30 days from source date','type':'single','type':'range'},
		'this business week':{'nsvar':'TBW','desc':'FROM the first day of this business week (Monday) TO last day of this business week (Sunday)','type':'range'},
		'this fiscal half':{'nsvar':'TFH','desc':'FROM the first day of this fiscal half TO the last day of this fiscal half','type':'range'},
		'this fiscal half to date':{'nsvar':'TFHTD','desc':'FROM the first day of this fiscal half TO today\'s date','type':'range'},
		'this fiscal quarter':{'nsvar':'TFQ','desc':'FROM first day of this fiscal quarter TO last day of this fiscal quarter','type':'range'},
		'this fiscal quarter to date':{'nsvar':'TFQTD','desc':'FROM first day of current fiscal quarter TO today\'s date','type':'range'},
		'this fiscal year':{'nsvar':'TFY','desc':'FROM first day of this fiscal year TO last day of this fiscal year','type':'range'},
		'this fiscal year to date':{'nsvar':'TFYTD','desc':'FROM first day of current year TO today\'s date','type':'range'},
		'this month':{'nsvar':'TM','desc':'','type':'range'},
		'this month to date':{'nsvar':'TMTD','desc':'FROM first day of current month TO today\'s date','type':'range'},
		'this rolling half':{'nsvar':'TRH','desc':'FROM the beginning this month TO the end of the month six months from now','type':'range'},
		'this rolling quarter':{'nsvar':'TRQ','desc':'FROM the beginning of this month TO the end of the month three months from now','type':'range'},
		'this rolling year':{'nsvar':'TRY','desc':'FROM the beginning of this month TO the end of the month twelve months from now','type':'range'},
		'this week':{'nsvar':'TW','desc':'FROM the first day of the current week (first Sunday before today\'s date) TO last day of current week (following Saturday).','type':'range'},
		'this week to date':{'nsvar':'TWTD','desc':'FROM the first day of the current week (first Sunday before today\'s date) TO today','type':'range'},
		'this year':{'nsvar':'TY','desc':'FROM the first day of the current year TO the last day of the current year','type':'range'},
		'three days ago':{'nsvar':'DAGO3','desc':'3 days ago from source date','type':'single'},
		'three days from now':{'nsvar':'DFN3','desc':'3 days from source date','type':'single'},
		'three fiscal quarters ago':{'nsvar':'FQB','desc':'','type':'range'},
		'three fiscal quarters ago to date':{'nsvar':'FQBTD','desc':'','type':'range'},
		'three fiscal years ago':{'nsvar':'FYB','desc':'','type':'range'},
		'three fiscal years ago to date':{'nsvar':'FYBTD','desc':'','type':'range'},
		'three months ago':{'nsvar':'MB','desc':'FROM the beginning of the business day three months prior to today TO the end of that day','type':'range'},
		'three months ago to date':{'nsvar':'MBTD','desc':'','type':'range'},
		'today':{'nsvar':'TODAY','desc':'','type':'single'},
		'tomorrow':{'nsvar':'TOMORROW','desc':'','type':'single'},
		'two days ago':{'nsvar':'DAGO2','desc':'','type':'single'},
		'two days from now':{'nsvar':'DFN2','desc':'','type':'single'},
		'yesterday':{'nsvar':'YESTERDAY','desc':'','type':'single'}

};
