/*
 ***********************************************************************
 * 
 * Test Function for autopopulating call form fields
 *
 ***********************************************************************/
var QUALIFY_ADVANCE = 6;
var NO_CONNECT_NO_MESSAGE = 6;
var CALL_TITLE = 'Calling to look for new opportunities';
var CALL_COMPLETED = 'COMPLETE';


/**** ENTRY POINT ****/

function pageInit(type) {
	setOriginPhoneOnCreation(type);
}


/**** CORE FUNCTIONS ****/

/**
 * 
 */
 
function setOriginPhoneOnCreation(type){
	if(type=='create') {
		alert('Attempting to set defaults');
		nlapiSetFieldValue('custeventcalltype',QUALIFY_ADVANCE);
		nlapiSetFieldValue('custeventcalloutcome',NO_CONNECT_NO_MESSAGE);
		nlapiSetFieldValue('title',CALL_TITLE);
		nlapiSetFieldValue('status',CALL_COMPLETED);
		/* nlapiSetFieldValue('message','Does the company do design? Y/N \nWhat design software do they currently use?'); */
	}
}
