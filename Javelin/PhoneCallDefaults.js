
/*  
Call Types:
Outbound Cold	1	 
Outbound Nurture/Forecast/Warm	2	 
Event	3	 
Customer	4	 
Inbound	5	 
qualify & advance	6	 
Tuesday Blitz Day	7	 
Lead	8	 
Tradeshow	10

Call Outcomes:
Connect New Opportunity	1	 
Connect Next Step	2	 
Connect No Next Step	3	 
Connect No Fit	4	 
No Connect Left Message	5	 
No Connect No Message	6	 
No Connect Dead Number	7	 
Scheduled call	8	 
Customer Care	9	 
Registered for Event	10	 
Accounting	11	 
Subscription	12

UserID's:
Dan Young = 1020645
Robert Gama = 105
Mike Vinson = 34
*/

function pageInit(type) {
	
	if (type == 'create') {
		var currentForm = nlapiGetFieldValue('customform');
		if (currentForm != null && currentForm == 47 ) {  // 47 = Blitz calling form
			setCallDefaults();
		}
		else if (currentForm != null && currentForm == 46) {
			setCallDefaultsCallStarForm();
		}
	}
	else if (type == 'edit') {
		//alert('Edit');
		var currentForm = nlapiGetFieldValue('customform');
		if (currentForm != null && currentForm == 47 ) {  // 47 = Blitz calling form
			var oldStatus = nlapiGetFieldValue('status');
			//alert('Status = ' + oldStatus);
			if (oldStatus = 'SCHEDULED') {
				//alert('Status = ' + oldStatus);
				CALL_TITLE = 'Tuesday Blitz Call';
				nlapiSetFieldValue('title', 'Tuesday Blitz Call');
				nlapiSetFieldValue('custeventcalltype', 7);
				nlapiSetFieldValue('custeventcalloutcome', 6);
				nlapiSetFieldValue('status', 'COMPLETE');
			}
		}
	}
}

 
function setCallDefaults(){
	var BLITZ_CALL = 7;
	var QUALIFY_CALL = 6;
	var NO_CONNECT_NO_MESSAGE = 6;
	var CALL_COMPLETED = 'COMPLETE';
	var CALL_TITLE;
	var userID = nlapiGetUser();
	
	if (userID != null && userID == 1020645) {   //  Dan Young 
		CALL_TITLE = 'Business Development Call';
		nlapiSetFieldValue('title', CALL_TITLE);
		nlapiSetFieldValue('custeventcalltype', QUALIFY_CALL);	
	}
	else {
		//CALL_TITLE = nlapiGetContext().getSetting('SCRIPT', 'custscript_blitzcallsubject');  // when using a script parameter to set defaults
		//if (CALL_TITLE != null && CALL_TITLE !='') {
		CALL_TITLE = 'Tuesday Blitz Call';
			nlapiSetFieldValue('title', CALL_TITLE);
		//}
		nlapiSetFieldValue('custeventcalltype', BLITZ_CALL);
	}
	nlapiSetFieldValue('custeventcalloutcome', NO_CONNECT_NO_MESSAGE);
	nlapiSetFieldValue('status', CALL_COMPLETED);
}

function setCallDefaultsCallStarForm(){

	var userID = nlapiGetUser();
	
	if (userID != null && userID == 34) {  // Mike Vinson's defaults
		nlapiSetFieldValue('title', 'Business Development Call');
		nlapiSetFieldValue('custeventcalltype', 2);	// Nurture call
		nlapiSetFieldValue('custeventcalloutcome', 5); // No Connect Left Message
	}
	else {
		nlapiSetFieldValue('title', 'Calling to look for new opportunities');
		nlapiSetFieldValue('custeventcalltype', 6);
		nlapiSetFieldValue('custeventcalloutcome', 6);
	}
	
	nlapiSetFieldValue('status', 'COMPLETE');
	/* nlapiSetFieldValue('message','Does the company do design? Y/N \nWhat design software do they currently use?'); */
}