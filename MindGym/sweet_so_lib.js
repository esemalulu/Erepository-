var LINE_INCREMENT = 1; // Default
var JOB_STATUS_CANCELLED = '37';
var SWEET_COUNTRY_UNITED_STATES = '229';
var SWEET_SUBSIDIARY_THEMINDGYM_UK = '2';
var SWEET_CUSTOMFORM_JOB_TRAINING_COURSE = '124'; //84
var SWEET_JOB_STATUS_PENDING_ZONE = '43';
var SWEET_JOB_SCHEDULED_THRESHOLD = 20;

/**
 * Create jobs from items
 *
 * @function sweet_so_lib_createJobs
 * @param {nlobjRecord} salesOrder
 * @return {Boolean}
 */
function sweet_so_lib_createJobs(salesOrder) {
  
	nlapiLogExecution('DEBUG', 'Function', 'Start::sweet_so_lib_createJobs');
	var submitRecord = false;
  
	var i = 1, n = salesOrder.getLineItemCount('item') + 1;
	nlapiLogExecution('DEBUG', 'Var', 'Number of items=' + (n - 1));
  
	for (; i < n; i++) {
		var isJob = (salesOrder.getLineItemValue('item', 'custcol_job_isjob', i) == 'T');
		nlapiLogExecution('DEBUG', 'Var', 'Line '+i+' isJob=' + isJob);
    
		var hasJob = (salesOrder.getLineItemValue('item', 'job', i))?true:false;
		nlapiLogExecution('DEBUG', 'Var', 'Line '+i+' hasJob=' + hasJob);
    
		nlapiLogExecution('debug','has Job is true: Line '+i,'Job ID: '+salesOrder.getLineItemValue('item', 'job', i));
		
		// Is this item a job?
		if (isJob) {
    
			// Has a job already been assigned to it?
			if (hasJob) {
				nlapiLogExecution('debug','has Job is true: Line '+i,'Job ID: '+salesOrder.getLineItemValue('item', 'job', i));
				// Is it provisional?
				var jobId = salesOrder.getLineItemValue('item', 'job', i);
				var isProvisional = nlapiLookupField('job', jobId, 'custentity_bo_isprovisional');
				nlapiLogExecution('DEBUG', 'isProvisional  ', isProvisional );
				if (isProvisional == 'T') {
					nlapiSubmitField('job', jobId, ['custentity_bo_isprovisional', 'entitystatus'], ['F', SWEET_JOB_STATUS_PENDING_ZONE]);
				}
				nlapiLogExecution('debug','skipping','line '+i);
				continue; // Skip
			}
      
			var jobId = sweet_so_lib_createJobFromItem(salesOrder, i);
			if (jobId) {
				salesOrder.setLineItemValue('item', 'job', i, jobId);
				submitRecord = true;
			} else {
				throw nlapiCreateError(
						'SWEET_FAILED_TO_CREATED_JOB',
						'Failed to create job on line item ' + i + '. Reason unknown. ' +
						'The system administrator has been notified to assist you.');
			}
		}
	}
  
	nlapiLogExecution('DEBUG', 'Function', 'End::sweet_so_lib_createJobs');
	nlapiLogExecution('DEBUG', 'Value of submitRecord ', submitRecord);	
	return submitRecord;
}

/**
 * Create job from item
 *
 * @function sweet_so_lib_createJobFromItem
 * @param {Integer} i Line item number
 * @return jobId
 */
function sweet_so_lib_createJobFromItem(salesOrder, i) {
  
	nlapiLogExecution('DEBUG', 'Function', 'Start::sweet_so_lib_createJobFromItem');
	nlapiLogExecution('DEBUG', 'Var', 'salesOrderId=' + salesOrder.getId());
	nlapiLogExecution('DEBUG', 'Var', 'lineNumber=' + i);
  
	var itemId = salesOrder.getLineItemValue('item', 'item', i);
	nlapiLogExecution('DEBUG', 'Var', 'itemId=' + itemId);
  
	var lineId = salesOrder.getLineItemValue('item', 'custcol_lineid', i);
	nlapiLogExecution('DEBUG', 'Var', 'itemLineId=', lineId);

	// Create new job
	var job = nlapiCreateRecord('job');
	job.setFieldValue('customform', SWEET_CUSTOMFORM_JOB_TRAINING_COURSE);
	job.setFieldValue('entitystatus', SWEET_JOB_STATUS_PENDING_ZONE);
  
	// Set fields
	job.setFieldValue('parent', salesOrder.getFieldValue('entity')); // Client
	job.setFieldValue('custentity_bo_item', itemId); // Item
	job.setFieldValue('companyname', ' '); // BUGFIX: Avoid To Be Generated
	job.setFieldValue('custentity_bo_buyer', salesOrder.getFieldValue('custbody_buyer')); // Buyer
	job.setFieldValue('custentity_bo_course', salesOrder.getLineItemValue('item', 'custcol_bo_course', i)); // Course
	job.setFieldValue('enddate', salesOrder.getLineItemValue('item', 'custcol_bo_date', i)); // Date
	job.setFieldValue('custentity_bo_eventaddress1', salesOrder.getLineItemValue('item', 'custcol_bo_address1', i)); // Address 1
	job.setFieldValue('custentity_bo_eventaddress2', salesOrder.getLineItemValue('item', 'custcol_bo_address2', i)); // Address 2
	job.setFieldValue('custentity_bo_eventpostcode', salesOrder.getLineItemValue('item', 'custcol_bo_postcode', i)); // Postcode
	job.setFieldValue('custentity_bo_eventcity', salesOrder.getLineItemValue('item', 'custcol_bo_city', i)); // City
	job.setFieldValue('custentity_bo_approxtime', salesOrder.getLineItemValue('item', 'custcol_bo_approxtime', i)); // Approx. Time
	job.setFieldValue('custentity_bo_owner', salesOrder.getFieldValue('custbody_owner')); // Owner
	job.setFieldValue('custentity_bo_licensecontract', salesOrder.getFieldValue('custbody_so_licensingcontract')); // License contract
	job.setFieldValue('custentity_bo_trainingprogramme', salesOrder.getFieldValue('custbody_so_trainingprogramme')); // Training programme
  
	// Country
	var country = salesOrder.getLineItemValue('item', 'custcol_bo_country', i);
	var countryCode = nlapiLookupField('customrecord_country', country, 'custrecord_country_code');
	job.setFieldValue('custentity_bo_eventcountry', country);
	job.setFieldValue('billcountry', countryCode);
	job.setFieldValue('shipcountry', countryCode);
	job.setFieldValue('shipping_country', countryCode);
  
	// State (US specific)
	if (country == SWEET_COUNTRY_UNITED_STATES) {
		var state = salesOrder.getLineItemValue('item', 'custcol_bo_state', i);
		var stateCode = nlapiLookupField('customrecord_state', state, 'custrecord_state_code');
		job.setFieldValue('custentity_bo_eventstate', state);
		job.setFieldValue('billstate', stateCode);
		job.setFieldValue('shipstate', stateCode);
	}
  
	// Time
	var time = salesOrder.getLineItemValue('item', 'custcol_bo_time', i);
	if (time) {
		job.setFieldValue('custentity_bo_eventtime', time);
	}
  
	// Time Zone
	if (country) {
		var timeZones = getTimeZonesByCountryId(country);
		// If single choice, select this by default
		if (timeZones.length == 1) {
			job.setFieldValue('custentity_bo_eventtimezone', timeZones[0].id);
		}
	}
  
	// Subsidiary
	var subsidiary = nlapiLookupField('customer', salesOrder.getFieldValue('entity'), 'subsidiary');
	subsidiary = sweet_so_lib_validate_isEmpty(subsidiary) ? SWEET_SUBSIDIARY_THEMINDGYM_UK : subsidiary;
	job.setFieldValue('subsidiary', subsidiary);
  
	//9/10/2014 - Prior to Saving the record, FIRE to set the ID correctly
	var bookingIdToUse = '';
	try {
		var clientAccountEntityId = nlapiLookupField('customer', salesOrder.getFieldValue('entity'), 'entityid', false)+'-J';
		nlapiLogExecution('debug','SO Lib clientAccountEntityId', clientAccountEntityId+' // Current Booking Endity ID: '+job.getFieldValue('entityid'));
		
		var bkflt = [new nlobjSearchFilter('customer', null, 'anyof', salesOrder.getFieldValue('entity')),
			         //Assume client entity ID value is set ONLY return those booking with ID that contains [Client Entity ID]-J
			         new nlobjSearchFilter('entityid', null, 'startswith', clientAccountEntityId)];
			
		//Try grabbing Max Number
		var formulaCol = new nlobjSearchColumn('formulanumeric', null, 'max');
		formulaCol.setFormula("TO_NUMBER(REPLACE(REPLACE({entityid}, '"+clientAccountEntityId+"'),''''))");
			
		var bkcol = [formulaCol];
			
		//Saved search will grab any booking record that starts with (instead of contains) with format.
		//	- Replace the first string value as well as single quote and convert the value to Number
		//	- Search will then grab maximum amount.
		var bkrs = nlapiSearchRecord('job', null, bkflt, bkcol);
			
		//Build new Booking Entity ID. Booking ID should be generated based on following Format: [Client Entity ID]-J[NUMBER].
		//New booking id should be [NUMBER] + 1.  IF THere are NOT booking matching above format, new booking ID is [Client Entity ID]-J1
		var latestValue = bkrs[0].getValue(formulaCol);
			
		if (!latestValue) {
			bookingIdToUse = clientAccountEntityId+'1';
		} else {
			//TEST for Number
			if (!isNaN(latestValue)) {
				//Increment the number by 1 and create new bookingId
				bookingIdToUse = clientAccountEntityId+(parseInt(latestValue)+1);
			}
		}
				
	} catch (generr) {
		
		nlapiLogExecution('error','Gen Booking ID Generation', getErrText(generr));
		
	}
  
	nlapiLogExecution('debug','SO LIB Booking ID To Use', bookingIdToUse);
	// Save record
	var jobId = nlapiSubmitRecord(job,true,true);
  
	nlapiLogExecution('debug','jobId',jobId);
	//See if we can update after submit. Before Submit on this code doesn't seem to work
	if (bookingIdToUse) {
		try {
			nlapiSubmitField('job', jobId, 'entityid', bookingIdToUse, true);
			nlapiLogExecution('debug','Update Entity ID to '+bookingIdToUse,'Update Entity for Booking Internal ID '+jobId);
		} catch (entupderr) {
			nlapiLogExecution('error','Error updating Entity ID for Booking '+jobId, getErrText(entupderr));
		}
	}
  
	//THIS initializes the Face To Face Booking Workflow
	nlapiInitiateWorkflow('job', jobId , 'customworkflow_facetoface_booking');
	nlapiLogExecution('DEBUG', 'Function', 'End::sweet_so_lib_createJobFromItem');
	return jobId;
}

/**
 * Validate sales order record
 *
 * @function sweet_so_lib_validateRecord
 * @param nlapiRecord
 * @throws nlapiError
 */
function sweet_so_lib_validateRecord(salesOrder) {
  
	nlapiLogExecution('DEBUG', 'Function', 'Start::sweet_so_lib_validateRecord');
  
	// Buyer
	var buyer = salesOrder.getFieldValue('custbody_buyer');
	if (sweet_so_lib_validate_isEmpty(buyer)) {
		throw nlapiCreateError('SWEET_BUYER_REQD', 'Buyer field is required. Please go back and update the field.', true);
	}
  
	// Owner
	var owner = salesOrder.getFieldValue('custbody_owner');
	if (sweet_so_lib_validate_isEmpty(owner)) {
		throw nlapiCreateError('SWEET_OWNER_REQD', 'Owner field is required. Please go back and update the field.', true);
	}
  
	// For each line item
	var i = 1, n = salesOrder.getLineItemCount('item') + 1;
	nlapiLogExecution('DEBUG', 'Var', 'itemCount=' + n);
	for (; i < n; i++) {
		nlapiLogExecution('DEBUG', 'Var', 'lineItem=' + i);
		sweet_so_lib_validateLineItem(salesOrder, i);
	}
  
	nlapiLogExecution('DEBUG', 'Function', 'End::sweet_so_lib_validateRecord');
}

/**
 * Validate sales order line item trigger
 *
 * @function sweet_so_lib_validateLineItem
 * @param nlapiRecord
 * @param item line row
 * @throws nlapiError
 */
function sweet_so_lib_validateLineItem(salesOrder, i) {
  
	nlapiLogExecution('DEBUG', 'Function', 'Start::sweet_so_lib_validateLineItem');
  
	// Item type
	var itemType = salesOrder.getLineItemValue('item', 'itemtype', i);
  
	// Skip validation if the item type is 'Description'
	if (itemType == 'Description') {
		return; // Skip
	}
  
	// Date
	var date = salesOrder.getLineItemValue('item', 'custcol_bo_date', i);
  
	// Country
	var country = salesOrder.getLineItemValue('item', 'custcol_bo_country', i);
  
	// State (US specific)
	var state = salesOrder.getLineItemValue('item', 'custcol_bo_state', i);

	sweet_so_lib_validateLineItemCheck(date, country, state, i);
  
	nlapiLogExecution('DEBUG', 'Function', 'End::sweet_so_lib_validateLineItem');
}

/**
 * Validate sales order line item
 *
 * @function sweet_so_lib_validateLineItem
 * @param nlapiRecord
 * @param item line row
 * @throws nlapiError
 */
function sweet_so_lib_validateLineItemCheck(date, country, state, i) {
	nlapiLogExecution('DEBUG', 'Function', 'Start::sweet_so_lib_validateLineItem');
	nlapiLogExecution('DEBUG', 'Date', date);
  
	// Date
	if (sweet_so_lib_validate_isEmpty(date)) {
		throw nlapiCreateError('SWEET_BO_DATE_REQD', 'Date field is required. Please go back and update the field on line item ' + i + '.', true);
	}
	nlapiLogExecution('DEBUG', 'Country', String(country));
  
	// Country
	if (sweet_so_lib_validate_isEmpty(country)) {
		throw nlapiCreateError('SWEET_BO_COUNTRY_REQD', 'Country field is required. Please go back and update the field on line item ' + i + '.', true);
	}
	nlapiLogExecution('DEBUG', 'State', String(state));
  
	// State (US specific)
	if (country == SWEET_COUNTRY_UNITED_STATES) {
		if (sweet_so_lib_validate_isEmpty(state)) {
			throw nlapiCreateError('SWEET_STATE_REQD', 'State is required because USA is selected as country. Please go back and select state on line item ' + i + '.', true);
		}
	}
  
	nlapiLogExecution('DEBUG', 'Function', 'End::sweet_so_lib_validateLineItem');
}
 
/**
 * Helper function: Check if variable is empty
 *
 * @param {Mixed}
 * @return Boolean
 */
function sweet_so_lib_validate_isEmpty(variable) {
  return (variable == null || variable == undefined || String(variable).length < 1 || variable == '');
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

