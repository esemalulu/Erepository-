/**
 * Cusotm process that allows users to log No Answer calls and automagically create next call in 24 hours time
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 Aug 2014     AnJoe
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function phoneCallNoAnsBeforeLoad(type, form, request){

	//Only allow this feature on User Interface
	if (nlapiGetContext().getExecutionContext() != 'userinterface') {
		return;
	}
	
	//Only Execute for Create or Edit
	if (type == 'create' || type == 'edit') {
		
		//Add hidden field that gets checked when user successfully finalize No Answer answer.
		//	- Used by After Submit of User Event function.
		var hidExecNoAnswerFld = form.addField('custpage_execnoans', 'checkbox', 'Execute No Answer', null, null);
		hidExecNoAnswerFld.setDisplayType('hidden');
		
		//Add a button to execute client side data setting and save.
		//	- Client Side function is added on the Client Script deployed against Phone Call Record.
		//NetSuite native behavior workaround.
		//When Phone Call is loaded from list view, it opens up in popup with paramter of xnew=T.
		//	This seems to prevent Client Script from loading and even firing.
		//	User Event script does fire for popup window.  
		//	Since Applying popup window form level script isn't something we want to do, add the function INSIDE the custom button
		form.addButton('custpage_noansbtn', 'No Answer', 
						'if (!nlapiGetFieldValue(\'contact\')) {'+
						'	alert(\'Please make sure Contact is provided for this phone call\');'+
						'	return false;'+
						'}'+
						'if (!confirm(\'This will Complete this Phone call and create cloned phone call scheduled for next day. Do you wish to Continue?\')) {'+
						'	return false;'+
						'}'+
						'nlapiSetFieldText(\'status\',\'Completed\');'+
						'nlapiSetFieldValue(\'custevent_phone_pickup\', \'F\');'+
						'nlapiSetFieldValue(\'message\',\'Contact did not answer, will try again tomorrow\');'+
						'nlapiSetFieldValue(\'completeddate\', nlapiDateToString(new Date()));'+
						'nlapiSetFieldValue(\'title\',\'Phone-call, No Answer\');'+
						'nlapiSetFieldValue(\'custpage_execnoans\',\'T\');'+
						'getNLMultiButtonByName(\'multibutton_submitter\').onMainButtonClick(this);'+
						'return false;'
					   );	
	}	
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function phoneCallNoAnsAfterSubmit(type){
	log('debug','submitted',nlapiGetFieldValue('custpage_execnoans'));
	
	if (nlapiGetFieldValue('custpage_execnoans')=='T') {
		var followUpCall = nlapiCopyRecord(nlapiGetRecordType(), nlapiGetRecordId());
		followUpCall.setFieldValue('title','Follow-up call');
		followUpCall.setFieldText('status','Scheduled');
		followUpCall.setFieldValue('custevent_phone_pickup','F');
		followUpCall.setFieldValue('startdate',nlapiDateToString(nlapiAddDays(new Date(), 1)));
		var followupCallId = nlapiSubmitRecord(followUpCall, true, true);
		log('debug','Followup created',followupCallId);
	}
	
}
