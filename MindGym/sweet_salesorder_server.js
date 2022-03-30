/**
 * Sales Order User Event Script
 *
 * @file sweet_salesorder_server.js
 * @require  sweet_opportunity_lib.js
 */

/**
 * Dec. 11 2015 By @Audaxium
 * As part of Sales Order review, below actions are taken.
 * - sweet_transaction_userevent.js library file is removed from reference
 * - Before Submit delete block is recoded for efficiency. THIS NEEDS TO BE DONE!!!
 */

/**
 * Constants
 *
 */
var SWEET_JOB_SCHEDULED_THRESHOLD = 10;
var SWEET_CANCELLATION_FEE_ITEM = '1507';
var DEFFERRED_REVENUE = '413';
var SALES_MISCELLANEOUS = '132';

/**
 * Before Load
 *
 * @function userevent_beforeLoad
 * @param {String} type
 * @param {String} form
 */
function userevent_beforeLoad(type, form) {

	//ONLY do this for User Interface
	if (nlapiGetContext().getExecutionContext() != 'userinterface') {
		return;
	}
	
	nlapiLogExecution('DEBUG', 'Before Load : Order No. & Rev Rec on Rev Commit', 'Order # =  '+nlapiGetFieldValue('tranid')+ '  &  Rev Rec on Rev Commit = '+nlapiGetFieldValue('revreconrevcommitment'));

	if (nlapiGetFieldValue('custbody_so_approvalinprogress') == 'T' &&
		nlapiGetFieldValue('custbody_show_message') == 'T') {
		var params = new Array();
		params['custparamsalesorder'] = nlapiGetRecordId();
		nlapiSetRedirectURL('SUITELET', 'customscript_so_approve_form', 'customdeploy_so_approve_form', null, params);
		return;
	}

	//uncomment below code to reset 'Opportunity' field value
	//    var fld = form.getField('opportunity');
	//    fld.setDisplayType('normal');
	
	//uncomment below code to reset 'Created From' field value
	//    var fld = form.getField('createdfrom');
	//    fld.setDisplayType('normal');
	  
	  switch (type.toLowerCase()) {
	    case 'copy':
	      initCopyOfSalesOrder();
	      break;
	    case 'create': // New or Transform from quote
	      initNewSalesOrder();
	      break;
	  }
}

/**
 * Before Submit
 *
 * @function userevent_beforeSubmit
 * @param {String} type
 */
function userevent_beforeSubmit(type) {

	nlapiLogExecution('DEBUG', 'Before Submit : Order No. & Rev Rec on Rev Commit', 'Order # =  '+nlapiGetFieldValue('tranid')+ '  &  Rev Rec on Rev Commit = '+nlapiGetFieldValue('revreconrevcommitment'));
	type = type.toLowerCase();
	switch (type) {
    case 'create':
    	generateLineIds();
      
    	// Automatically set field values for DRRA & FCAR
    	// Set default field value for ''Deferred Revenue Reclassification   Account''
    	nlapiSetFieldValue('draccount', DEFFERRED_REVENUE);
    	// Set default field value for ''Foreign Currency Adjustment Revenue Account''
    	nlapiSetFieldValue('fxaccount', SALES_MISCELLANEOUS);
            
      break;
    
    case 'edit':   
    	generateLineIds();  
    	//ONLY throw error if user interface
    	if (isLocked() && nlapiGetContext().getExecutionContext() == 'userinterface') {
    		
    		//Checks for check custbody_locked field
    		throw nlapiCreateError('SWEET_SALESORDER_LOCKED_EDIT', 'You can\'t edit this sales order because it\'s locked.', true);
    	}
      
    	// Automatically set field values for DRRA & FCAR
    	// Set default field value for ''Deferred Revenue Reclassification   Account''
    	nlapiSetFieldValue('draccount', DEFFERRED_REVENUE);
    	// Set default field value for ''Foreign Currency Adjustment Revenue Account''
    	nlapiSetFieldValue('fxaccount', SALES_MISCELLANEOUS);
      
    	// Validate sales order items
    	//TODO: Ask to Disable the Status to avoid any ISSUES.
    	if (nlapiGetFieldValue('status') != 'Pending Approval') {
	        // For each line item
	        var i = 1, n = nlapiGetLineItemCount('item') + 1;  
	        for (; i < n; i++) {
	        	// Skip validation if the item type is 'Description'
	        	var itemType = nlapiGetLineItemValue('item', 'itemtype', i);
	        	if (itemType == 'Description') {
	        		continue; // Skip
	        	}
	          
	        	var date = nlapiGetLineItemValue('item', 'custcol_bo_date', i);
	        	var country = nlapiGetLineItemValue('item', 'custcol_bo_country', i);
	        	var state = nlapiGetLineItemValue('item', 'custcol_bo_state', i);
	        	sweet_so_lib_validateLineItemCheck(date, country, state, i);
	        }
    	}

    	break;
    case 'delete':
    	
    	if (isLocked()) {
    		//Checks for check custbody_locked field
    		throw nlapiCreateError('SWEET_SALESORDER_LOCKED_DELETE', 'You can\'t delete this sales order because it\'s locked.', true);
    	}
      
    	//Load owner record
    	//var salesOrder = nlapiLoadRecord('salesorder', nlapiGetRecordId());
    	var primaryRecId = nlapiGetFieldValue('custbody_owner');
    	if(!primaryRecId) {
    		//2/2/2015 - JS Mod. Removing REDeclaration of ownerEmail field
    		//Dec 22 2015 - Change it so that if the owner is empty, default to -5 user
    		primaryRecId = '-5';
    	}

    	// Load employee record
    	//Dec 22 2015 - Sales Order Review Changes
    	//var employeeId = nlapiGetUser();
    	//var employee = nlapiLoadRecord('employee', employeeId);
    	// Send email notification
    	var salesOrderNum = nlapiGetFieldValue('tranid');
    	var subject = 'Sales Order #' + salesOrderNum + ' is deleted';
    	var body = nlapiGetContext().getName() + ' deleted the Sales Order ' + salesOrderNum + '.\n\n';

    	//Dec 22 2015-Change this to be CC
    	var recipients = ['david.atkinson@themindgym.com','rich.hodgson@themindgym.com'];
    	
    	//Dec 22 2015 - Part of Sales Order Review
    	nlapiSendEmail(nlapiGetUser(), primaryRecId, subject, body, recipients);

      	break;
    
    case 'approve':
    	
    	//2/2/2015 - Aux:JS Changes
    	//			 Purpose of this rewrite is to make sure Sales Order approval is processed correctly and efficiently.
    	//			 Previous codebase LOADED the Sales Order and Submitted on Before Submit Trigger setting same fields that could have been saved. 
    	//			 We are also removing the logic to have User Event create booking per line.  
    	//			 Previously, if number of line item to create booking was less than 10, User Event handled it. We are changing it to have it be handled by Scheduled script instead.
    	//			 Even 10 is too much to be handled by User Event.
    	
    	//1. Make sure buyer ('custbody_buyer') field is filled in.
    	if (!nlapiGetFieldValue('custbody_buyer')) {
    		throw nlapiCreateError('SWEET_BUYER_REQD', 'Buyer field is required. Please go back and update the field.', true);
    	}
    	
    	//2. Make sure owner ('custbody_owner') field is filled in.
    	if (!nlapiGetFieldValue('custbody_owner')) {
    		throw nlapiCreateError('SWEET_OWNER_REQD', 'Owner field is required. Please go back and update the field.', true);
    	}
    	
    	//3. Loop through and validate Date/Country/US State is set correctly. Make sure to skip Description item line
    	for (var j=1; j <= nlapiGetLineItemCount('item'); j++) {
    		
    		nlapiLogExecution('debug','Checking Item // job_isjob', j+' // '+nlapiGetLineItemValue('item','item',j)+' // '+nlapiGetLineItemValue('item','custcol_job_isjob',j));
    		
    		//3a. Skip Description
    		if (nlapiGetLineItemValue('item', 'itemtype',j)=='Description') {
    			nlapiLogExecution('debug','Skipping Item line '+j, 'Item Type: '+nlapiGetLineItemValue('item', 'itemtype',j));
    			continue;
    		}
    		
    		//Check to make sure Date 'custcol_bo_date' field is set
    		if (!nlapiGetLineItemValue('item','custcol_bo_date',j)) {
    			throw nlapiCreateError('SWEET_BO_DATE_REQD', 'Date field is required. Please go back and update the field on line item ' + j + '.', true);
    		}
    		
    		//Check to make sure Country 'custcol_bo_country' field is set
    		if (!nlapiGetLineItemValue('item','custcol_bo_country',j)) {
    			throw nlapiCreateError('SWEET_BO_COUNTRY_REQD', 'Country field is required. Please go back and update the field on line item ' + j + '.', true);
    		}
    		
    		// State (US specific) - custcol_bo_state value MUST be set if country is U.S.
    		if (nlapiGetLineItemValue('item','custcol_bo_country',j) == SWEET_COUNTRY_UNITED_STATES) {
    			if (!nlapiGetLineItemValue('item','custcol_bo_state', j)) {
    				throw nlapiCreateError('SWEET_STATE_REQD', 'State is required because USA is selected as country. Please go back and select state on line item ' + j + '.', true);
    			}
    		}    		
    	} // END Per line Processing
    	
    	//4. All Validation is done. Notify User of Queued up approval processinng and Go through and set fields.
    	// Send email notification
		var subject = 'Sales Order #' + nlapiGetFieldValue('tranid') + ' Approval In Progress';
		var body = nlapiGetContext().getName() + ', \n\n';
		body += 'Sales order (' + nlapiGetFieldValue('tranid') + ') is queued up for approval processing. You will be notified by another email when the process is completed.\n\n';
		
		//attach this email to THIS Sales Order
		var records = new Object();
		records['transaction'] = nlapiGetRecordId();
		nlapiSendEmail(-5, nlapiGetUser(), subject, body, null, null, records, null);
    
		// Set approved by, locked, approval in progress and show message fields
    	nlapiSetFieldValue('custbody_so_approvedby', nlapiGetUser());
		// Flag sales order as 'approval in progress'
		nlapiSetFieldValue('custbody_locked', 'T');
		nlapiSetFieldValue('custbody_so_approvalinprogress', 'T');
		nlapiSetFieldValue('custbody_show_message', 'T');

		//5. Queue it up for processing.
		// Schedule script to create jobs
		var params = new Array();
		params['custscript_salesorder'] = nlapiGetRecordId();
		var status = nlapiScheduleScript('customscript_so_approve_scheduled',null, params);
		
		nlapiLogExecution('DEBUG', 'Schedule Status', 'Schedule Status for ' +nlapiGetFieldValue('tranid') + ' = '+ status);

		if(!status || status.length == 0 || status == 'INQUEUE') {
			// Send email notification
			subject = 'System cannot process the approval request for ' +  'Sales Order #' + nlapiGetFieldValue('tranid') + ' now';
			body = nlapiGetContext().getName() + ' submitted an approval request for the Sales Order ' + nlapiGetFieldValue('tranid') + '.\n\n';
			body += 'Unfortunately the number of concurrent approval requests the system is processing has exceeded its threshold! This means more than 20 sales orders have been submitted at the same time!\n\n';
			body += "Don’t worry, the IT helpdesk has also received this email and will resolve this for you. Once they have done this they will ask you to confirm if your sales order has been approved correctly.\n\n";
			body += "If you don’t hear from the IT helpdesk within 2 days please contact the helpdesk. Apologies for any inconvenience this may cause.\n";
			nlapiSendEmail(-5,nlapiGetUser(),subject,body,['helpdesk@themindgym.com'],null,records,null);
		}
    	
    	break;
	}
}

/**
 * AfterSubmit hook
 *
 * @param {String} type
 * @return {Void}
 */
function userevent_afterSubmit(type) {

nlapiLogExecution('DEBUG', 'After Submit : Order No. & Rev Rec on Rev Commit', 'Order # =  '+nlapiGetFieldValue('tranid')+ '  &  Rev Rec on Rev Commit = '+nlapiGetFieldValue('revreconrevcommitment'));

  type = type.toLowerCase(); 
  
  // New record
  var newRecord = nlapiGetNewRecord(); 
  
  // Old record
  var oldRecord = nlapiGetOldRecord();
  
  recordId = nlapiGetRecordId();
  //June 18th 2015
  //Aux Mod: Removed reference to trigger sales funnel data on linked Quote. This is now handled by auxmg_ss_SoAndInvCountByQuote.js as scheduled event running daily every 1 hour
  //_updateSalesFunnelData(recordId);
  
  /**
   * 3/6/2015 JS@Aux
   * Removed Reference NO Longer Necessary.
   * 
   */
  //SWEET.Opportunity.updateStatus(nlapiGetFieldValue('opportunity'));

   // Schedule script to calculate opportunity totals
   var params = new Array();
   params['custscript_opportunity'] = nlapiGetFieldValue('opportunity');
   nlapiScheduleScript('customscript_opportunity_calc_Totals', null, params);

  //SWEET.Opportunity.setDates(nlapiGetFieldValue('opportunity'));
  nlapiLogExecution('DEBUG', 'Sales order', nlapiGetRecordId());
  
  //June 18th 2015 Aux
  //Need to make sure to ONLY call sweet_so_revrec_setDates function if it's NOT delete.
  //that function attempts to LOAD the record
  if (type != 'delete')
  {
	  //Dec 22 2015 - Part of SalesOrder Review
	  //sweet_so_revrec_setDates(nlapiGetRecordId());
  }
  
  nlapiLogExecution('DEBUG', 'Type', type);
  switch (type) {
    case 'edit':
      nlapiLogExecution('DEBUG', 'Status', nlapiGetFieldValue('status'));
      if (nlapiGetFieldValue('status') != 'Pending Approval') {
    	//Dec 22 2015-Part of Sales Order Review
        //sweet_so_revrec_fillSchedule(nlapiGetRecordId());
        
        //Check if date has changed for sessions without a job
        for (var j = 1; j < newRecord.getLineItemCount('item') + 1; j++) {
          if ((newRecord.getLineItemValue('item', 'job', j) == null) && 
            (newRecord.getLineItemValue('item','revrecschedule', j) != null) && 
            (newRecord.getLineItemValue('item','linked', j) == 'T') &&
            (newRecord.getFieldValue('custbody_so_linkedinvoice') == '')) {              // find item without job number, with rev rec schedule, when there is no linked invoice

            for (var i = 1; i < oldRecord.getLineItemCount('item') + 1; i++) {
              if (newRecord.getLineItemValue('item', 'custcol_lineid', j) == oldRecord.getLineItemValue('item', 'custcol_lineid', i)) { // find same line item in old sales order
                var newDate = newRecord.getLineItemValue('item', 'custcol_bo_date', j);
                var oldDate = oldRecord.getLineItemValue('item', 'custcol_bo_date', i);
                nlapiLogExecution('DEBUG', 'Old date', oldDate);
                nlapiLogExecution('DEBUG', 'New date', newDate);
                if (oldDate != newDate) {
                  sweet_so_revrec_checkNewDate(newRecord.getId(), 'no job', oldDate, newDate);
                }
              }             
            }
          } 
        }  
      }
    }
  }

/**
 * Generate a unique Id for each line item
 *
 * @function generateLineIds
 */
function generateLineIds() {
  lineInc = nlapiGetFieldValue('custbody_lineincrement');
  if (lineInc == null) {
    lineInc = LINE_INCREMENT;
  }
  
  var i = 1, n = nlapiGetLineItemCount('item') + 1;
  for (;i < n; i++) {
    lineId = nlapiGetLineItemValue('item', 'custcol_lineid', i);
    if (lineId == null) {
      nlapiSetLineItemValue('item', 'custcol_lineid', i, lineInc);
      lineInc++;
    }
  }
  
  nlapiSetFieldValue('custbody_lineincrement', lineInc);
}

/**
 * Initialise copy of a sales order
 * 
 * @function initCopyOfSalesOrder
 * @return {void}
 */
function initCopyOfSalesOrder() {
  // Reset line increment field.
  // THE LINE BELOW IS NOT WORKING. WHY NOT!?
  // NetSuite Support Case: #741306
  nlapiSetFieldValue('custbody_lineincrement', LINE_INCREMENT);
  
  // For each item
  var i = 1, n = nlapiGetLineItemCount('item') + 1;
  for (;i < n; i++) {
    
    // Reset job
    nlapiSetLineItemValue('item', 'job', i, null);
    
    // Reset line Id
    nlapiSetLineItemValue('item', 'custcol_lineid', i, null);
  }
}

/**
 * Initialise new sales order
 *
 * @function initNewSalesOrder
 * @return {void}
 */
function initNewSalesOrder() {
  
  // For each item...
  var i = 1, n = nlapiGetLineItemCount('item') + 1;
  for (;i < n; i++) {
    
    // Is this a booking?
    var booking = nlapiGetLineItemValue('item', 'job', i);
    if (booking) {
      
      // Yes - If quantity is zero then remove the item
      var quantity = nlapiGetLineItemValue('item', 'quantity', i);
      if (quantity < 1) {
        nlapiRemoveLineItem('item', i);
        i--;
        n--;
        continue;
      }
    }
    
    // Is this a cancellation fee?
    var item = nlapiGetLineItemValue('item', 'item', i);
    if (item == SWEET_CANCELLATION_FEE_ITEM) {

      // Yes - If amount is zero then remove the item      
      var amount = nlapiGetLineItemValue('item', 'amount', i);
      if (amount <= 0) {
        nlapiRemoveLineItem('item', i);
        i--;
        n--;
        continue;
      }
    }
  }
}

/**
 * Cancel jobs related to Sales Order
 *
 * @function cancelJobs
 */
function cancelJobs() {
  var salesOrder = nlapiLoadRecord('salesorder', nlapiGetRecordId());
  var i = 1, n = salesOrder.getLineItemCount('item') + 1;
  for (;i < n; i++) {   
    var jobId = salesOrder.getLineItemValue('item', 'job', i);
    if (jobId != null) {
      cancelJob(jobId);
    }
  }
}

/**
 * Cancel job
 *
 * @function cancelJob
 * @param {String} jobId
 */
function cancelJob(jobId) {
  var job = nlapiLoadRecord('job', jobId);
  job.setFieldValue('entitystatus', JOB_STATUS_CANCELLED);
  nlapiSubmitRecord(job);
}

/**
 * Check if sales order is locked
 * @return {Boolean}
 */
function isLocked() {
	
	return (nlapiGetFieldValue('custbody_locked') == 'T');
}