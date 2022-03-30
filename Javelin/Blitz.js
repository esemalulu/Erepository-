/*
 ***********************************************************************
 * 
 * Test Function for autopopulating call form fields
 *
 ***********************************************************************/
var BLITZ_CALL = 7;
var NO_CONNECT_NO_MESSAGE = 6;
var CALL_TITLE = 'Blitz Calling 2011';
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
	if(type=='create'){
		nlapiSetFieldValue('custeventcalltype',BLITZ_CALL);
		nlapiSetFieldValue('custeventcalloutcome',NO_CONNECT_NO_MESSAGE);
		nlapiSetFieldValue('title',CALL_TITLE);
		nlapiSetFieldValue('status',CALL_COMPLETED);
		/* nlapiSetFieldValue('message','Does the company do design? Y/N \nWhat design software do they currently use?'); */
	}
}