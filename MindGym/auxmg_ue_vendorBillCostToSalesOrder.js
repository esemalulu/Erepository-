
function vendorBillCostToSoBeforeLoad(type, form, request) {
	//16/2/2015 - Add in Hidden Field to capture original line to isbillable values
	var origbillfld = form.addField('custpage_origbilljson','textarea', '');
	origbillfld.setDisplayType('hidden');
	
}

/**
 * User event triggered on After Submit for vendor bill to sync cost data to matching Booking > Sales Order.
 * Modification:
 * 12/1/2015 Modification to allow SO Value Sync for both Vendor Bill AND Expense Report.
 *   Queue it up to be processed in AX:VB/ER Cost Sync to SO Queue (customrecord_ax_vber_costsync_so) custom record
 * @param type
 */
function vendorBillCostToSoAfterSubmit(type) {
	
	log('debug','Execution context', nlapiGetContext().getExecutionContext());
	
	if (nlapiGetContext().getExecutionContext() == 'scheduled') {
		log('debug','Update triggered by Scheduled Script',type+' trigered by scheduled script. Exit out');
		return;
	}
	//Return out if it's DELETE
	if (type=='delete') {
		return;
	}
	
	try {

		//12/1/2015 Modification to allow SO Value Sync for both Vendor Bill AND Expense Report.
		//Queue it up to be processed in AX:VB/ER Cost Sync to SO Queue (customrecord_ax_vber_costsync_so) custom record
		var qvberrec = nlapiCreateRecord('customrecord_ax_vber_costsync_so', null);
		qvberrec.setFieldValue('custrecord_vberq_trx', nlapiGetRecordId());
		qvberrec.setFieldValue('custrecord_vberq_trxtype', nlapiGetRecordType());
		nlapiSubmitRecord(qvberrec, true, true);
		
	} catch (synccosterr) {
		log('error','Error Queuing Up for Sync with SO', nlapiGetRecordType()+' ID: '+nlapiGetRecordId()+' // '+getErrText(synccosterr));
		errmsg += '<b>Error Details:</b><br/>'+getErrText(synccosterr);
		
		//GENERate Email to user
		var sbj = 'Error Queuing Up for Cost Estimate for '+nlapiGetRecordType();
		nlapiSendEmail(-5, nlapiGetContext().getUser(), sbj, errmsg, ['mindgym@audaxium.com']);
		
	}
	
	var isBillJson = {};
	if (nlapiGetFieldValue('custpage_origbilljson')) {
		
		isBillJson = JSON.parse(nlapiGetFieldValue('custpage_origbilljson'));
		
		//Load THIS record to update the isBillable Values back to it's original state.
		
		var thisVbRec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		var updateVbRec = false;
		for (var oj in isBillJson) {
			log('debug','After Submit Is Billable Reset', oj+' // '+isBillJson[oj]+' // Line Value: '+nlapiGetLineItemValue('expense','isbillable', oj));
			
			if (nlapiGetLineItemValue('expense','isbillable', oj) != isBillJson[oj]) {
				updateVbRec = true;
				thisVbRec.setLineItemValue('expense', 'isbillable', oj, isBillJson[oj]);
			}
		}
		
		if (updateVbRec) {
			log('debug','Updating VB to sync isBillable original value','update vb');
			nlapiSubmitRecord(thisVbRec, false, true);
		}		
	}	
}

//11/2/2015 - add in before submit for 
function vendorBillSyncColsBeforeSubmit(type) {
	if (type != 'delete' && type !='xedit' && nlapiGetRecordType() == 'vendorbill') {
		//Loop through the record and sync up value of job by # to Job column ONLY if Job is empty and the other is not
		
		var isBillJson = {};
		for (var i=1; i <= nlapiGetLineItemCount('expense'); i++) {
			var lineBookingId = nlapiGetLineItemValue('expense','customer',i);
			var lineBookingIdByCoach = nlapiGetLineItemValue('expense','custcol_column_jobbysupplier',i);
			
			var isBillableChecked = nlapiGetLineItemValue('expense','isbillable',i);
			isBillJson[i] = isBillableChecked;
			
			
			log('debug','Original Is Billable', isBillableChecked);
			
			//ONLY Process syncing of the Job # and Job # By Supplier if line Booking ID is missing
			if ( !lineBookingId && lineBookingIdByCoach) {
				nlapiSetLineItemValue('expense', 'customer', i, lineBookingIdByCoach);
			}
		}
		//set the Original Billable field values
		nlapiSetFieldValue('custpage_origbilljson', JSON.stringify(isBillJson));
	}
}
