/*
 ***********************************************************************
 * 
 *
 * Script Modification: 11/13/2011 by Joe.Son @ Audaxium
 *  - Added Field Change function for setting/unsetting of 
 *    Waiting Reply Set Date field depending on value of 
 * 	  case status. 
 * 	  - Date will be set ONLY when the value of status is
 * 		Customer to reply 
 ***********************************************************************/
var ORIGIN_PHONE = 2;
var CUSTOM_FORM = 'customform';
//SCT-MOD by joe.son@audaxium.com
var STATUS_ID = 'status';
var STATUS_SET_DATE_ID = 'custevent_status_set_date';
var initSetDate='';



/**** ENTRY POINT ****/

function pageInit(type) {
	setOriginPhoneOnCreation(type);
	setInitialStatusSetDate();
}

/**
 * Added by joe.son@audaxium.com
 * Fires whenever a field is changed by the user or system similar to onchange event in JavaScript
 * type: the sublist internal ID
 * name: Fields' internal ID
 * linenum: line number if chaning field is in sublist 
 */
function fieldChanged(type, name, linenum) {
	setStatusSetDate(name);
}

var formId = nlapiGetFieldValue(CUSTOM_FORM);

/**** CORE FUNCTIONS ****/

/**
 * This function set the Origin field to be "Phone" upon manual creation of the Case. As this script is client-side,
 * this necessarely satisfies the "manual" part of the requirement. We then check type to make sure it is a creation.
 * @param {Object} type
 */
function setOriginPhoneOnCreation(type){
	if(type=='create'&& formId != '17'){
		nlapiSetFieldValue('origin',ORIGIN_PHONE);
	}
}

/**
 * This function set the initial wait reply set date incase it needs to be used later
 */
//Private
function setInitialStatusSetDate() {
	//Initial Set Date is kept when the Case is first loaded
	//This could be used later if they wish to revert original date
	initSetDate = nlapiGetFieldValue(STATUS_SET_DATE_ID);
}

//Private
function setStatusSetDate(_name) {
	//set STATUS_SET_DATE field to current date
	
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

