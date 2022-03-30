/**
 * Scheduled script to go through results from saved search and udpate stock level information on Course custom record
 * Ticket 2834	
 * 
 * IMPORTANT:
 * Course List Saved Search MUST be ordered by Course Record Internal ID in DESC
 * 
 */
function updateStockLevel() {
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_341_lastprocid');
	var paramCourseListSearch = nlapiGetContext().getSetting('SCRIPT', 'custscript_341_courselistss');
	var paramInvShippedSearch = nlapiGetContext().getSetting('SCRIPT', 'custscript_341_invshippedss');
	var paramInvBkordSearch = nlapiGetContext().getSetting('SCRIPT', 'custscript_341_bkordss');
	
	//Three Saved Search MUST be set
	if (!paramCourseListSearch || !paramInvShippedSearch || !paramInvBkordSearch) 
	{
		throw nlapiCreateError('INVUPD-ERR','Script requires Course List, Inv. Shipped and Inv. Backordered baseline Saved Searches',false);
	}
	
	var courseListFlt = null;
	if (paramLastProcId) {
		courseListFlt = [new nlobjSearchFilter('internalidnumber', null,'lessthan', paramLastProcId)];
	}
	
	var cirs = nlapiSearchRecord(null, paramCourseListSearch, courseListFlt, null);
	for (var i=0; cirs && i < cirs.length; i+=1)
	{
	
		//Grab Starting Inventory and Additional Inventory from Course Record
		var invInfoFlds = ['custrecord_inv_starting','custrecord_inv_additional'];
		var invInfoVals = nlapiLookupField(cirs[i].getRecordType(), cirs[i].getId(), invInfoFlds, false);
		
		var invStart = invInfoVals.custrecord_inv_starting;
		if (!invStart) {
			invStart = 0;
		}
		
		var invAddition = invInfoVals.custrecord_inv_additional;
		if (!invAddition) {
			invAddition = 0;
		}
		
		//Grab Booking Fulfilled and backordered for this course
		var invBookingFulfilled = 0;
		var bfflt = [new nlobjSearchFilter('custentity_bo_course', null, 'anyof', [cirs[i].getId()])];
		var bfrs = nlapiSearchRecord(null, paramInvShippedSearch, bfflt, null);
		if (bfrs && bfrs.length > 0) {
			invBookingFulfilled = bfrs[0].getValue(bfrs[0].getAllColumns()[0]);
		}
		
		var invBookingBackOrdered = 0;
		var bbflt = [new nlobjSearchFilter('custentity_bo_course', null, 'anyof', [cirs[i].getId()])];
		var bbrs = nlapiSearchRecord(null, paramInvBkordSearch, bbflt, null);
		if (bbrs && bbrs.length > 0) {
			invBookingBackOrdered = bbrs[0].getValue(bbrs[0].getAllColumns()[0]);
		}
		
		//Calculate Current Inv Value {custrecord_inv_starting} - {custrecord_inv_bookingsfulfilled} - {custrecord_inv_backordered}
		//Response from DA: Correction
		//{custrecord_inv_starting} + {custrecord_inv_additional} - {custrecord_inv_bookingsfulfilled}
		var invCurrent = (parseInt(invStart) + parseInt(invAddition)) - parseInt(invBookingFulfilled);
		
		//Forcast Calculation: {custrecord_inv_currentinventory} - {custrecord_inv_backordered}
		var forecastValue = invCurrent - parseInt(invBookingFulfilled);
		
		log('debug','course id // Inv Start // Inv Addition // BF // BB // current // forecast', 
					cirs[i].getId()+' // '+invStart+' // '+invAddition+' // '+invBookingFulfilled+' // '+invBookingBackOrdered+' // '+invCurrent+' // '+forecastValue);
		
		var courseUpdFld = ['custrecord_inv_backordered',
		                    'custrecord_inv_bookingsfulfilled',
		                    'custrecord_inv_currentinventory',
		                    'custrecord_invcalcdate',
		                    'custrecord_inv_forecast'];
		var courseUpdVal = [invBookingBackOrdered,
		                    invBookingFulfilled,
		                    invCurrent,
		                    nlapiDateToString(new Date()),
		                    forecastValue];
		try {
			nlapiSubmitField(cirs[i].getRecordType(), cirs[i].getId(), courseUpdFld, courseUpdVal, false);
		} catch (fldupderr) {
			log('error','Error Updating Course '+cirs[i].getId(), getErrText(fldupderr));
		}
		
		
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / cirs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		if ((i+1)==1000 || ((i+1) < cirs.length && nlapiGetContext().getRemainingUsage() < 500)) 
		{
			//reschedule
			nlapiLogExecution('debug','Getting Rescheduled at', cirs[i].getId());
			var rparam = new Object();
			rparam['custscript_341_lastprocid'] = cirs[i].getValue('internalid');
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			break;
		}
	}
	
	
		
	
}