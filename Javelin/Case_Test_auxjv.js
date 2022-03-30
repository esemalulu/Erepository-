var STATUS_ID = 'status';
var STATUS_SET_DATE_ID = 'custevent_status_set_date';
var initSetDate='';

/**
 * Fires when page completes loading or form is Reset
 * type: create, copy, edit
 */
function pageInit(type) {
	setInitialWaitReplySetDate();	
}


/**
 * Fires whenever a field is changed by the user or system similar to onchange event in JavaScript
 * type: the sublist internal ID
 * name: Fields' internal ID
 * linenum: line number if chaning field is in sublist 
 */
function fieldChanged(type, name, linenum) {
	
	setStatusSetDate(name);
	
}

//Private
function setInitialWaitReplySetDate() {
	//Initial Set Date is kept when the Case is first loaded
	//This could be used later if they wish to revert original date
	initSetDate = nlapiGetFieldValue(STATUS_SET_DATE_ID);
}

//Private
function setStatusSetDate(_name) {
	//set WAIT_SET_DATE field to current date if it's set to Customer to reply
	
	if (_name == STATUS_ID) {
		nlapiSetFieldValue(STATUS_SET_DATE_ID,getTodayString());
	}
}

//Private
/**
 * Returns todays date formatted in MM/DD/YYYY in String
 */
function getTodayString() {
	var strMon, strDate, strYear;
	var today = new Date();
	strMon = today.getMonth() + 1;
	strDate = today.getDate();
	strYear = today.getFullYear();
	return strMon+'/'+strDate+'/'+strYear;
}