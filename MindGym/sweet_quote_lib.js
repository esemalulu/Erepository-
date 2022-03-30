var LINE_INCREMENT = 1; // Default
var JOB_STATUS_CANCELLED = '37';
var SWEET_COUNTRY_UNITED_STATES = '229';
var SWEET_SUBSIDIARY_THEMINDGYM_UK = '2';
var SWEET_CUSTOMFORM_JOB_TRAINING_COURSE = '18';
var SWEET_JOB_STATUS_PROVISIONAL = '66';
var SWEET_JOB_SCHEDULED_THRESHOLD = 20;

/**
 * Create jobs from items
 *
 * @function sweet_quote_lib_createJobs
 * @param {nlobjRecord} quote
 * @return {Boolean}
 */
function sweet_quote_lib_createJobs(quote) {
  
  nlapiLogExecution('DEBUG', 'Function', 'Start::sweet_quote_lib_createJobs');
  var submitRecord = false;
  
  var i = 1, n = quote.getLineItemCount('item') + 1;
  nlapiLogExecution('DEBUG', 'Var', 'Number of items=' + (n - 1));
  
  for (; i < n; i++) {
    var isJob = (quote.getLineItemValue('item', 'custcol_job_isjob', i) == 'T');
    nlapiLogExecution('DEBUG', 'Var', 'isJob=' + isJob);
    
    var hasJob = (quote.getLineItemValue('item', 'job', i) != null);
    nlapiLogExecution('DEBUG', 'Var', 'hasJob=' + isJob);
    
    // Is this item a job?
    if (isJob) {
    
      // Has a job already been assigned to it?
      if (hasJob) {
        continue; // Skip
      }
      
      jobId = sweet_quote_lib_createJobFromItem(quote, i);
      if (jobId) {
        quote.setLineItemValue('item', 'job', i, jobId);
        submitRecord = true;
      } else {
        throw nlapiCreateError(
          'SWEET_FAILED_TO_CREATED_JOB',
          'Failed to create job on line item ' + i + '. Reason unknown. ' +
          'The system administrator has been notified to assist you.');
      }
    }
  }
  
  nlapiLogExecution('DEBUG', 'Function', 'End::sweet_quote_lib_createJobs');
  return submitRecord;
}

/**
 * Create job from item
 *
 * @function sweet_quote_lib_createJobFromItem
 * @param {Integer} i Line item number
 * @return jobId
 */
function sweet_quote_lib_createJobFromItem(quote, i) {
  
  nlapiLogExecution('DEBUG', 'Function', 'Start::sweet_quote_lib_createJobFromItem');
  nlapiLogExecution('DEBUG', 'Var', 'quoteId=' + quote.getId());
  nlapiLogExecution('DEBUG', 'Var', 'lineNumber=' + i);
  
  var itemId = quote.getLineItemValue('item', 'item', i);
  nlapiLogExecution('DEBUG', 'Var', 'itemId=' + itemId);
  
  //var lineId = quote.getLineItemValue('item', 'custcol_lineid', i);
  //nlapiLogExecution('DEBUG', 'Var', 'itemLineId=', lineId);

  // Create new job
  var job = nlapiCreateRecord('job');
  nlapiLogExecution('DEBUG', 'Info', 'Create new job');
  
  job.setFieldValue('customform', SWEET_CUSTOMFORM_JOB_TRAINING_COURSE);
  job.setFieldValue('entitystatus', SWEET_JOB_STATUS_PROVISIONAL);
  job.setFieldValue('custentity_bo_isprovisional', 'T');
  nlapiLogExecution('DEBUG', 'Info', 'Set entitystatus');
  
  // Set fields
  job.setFieldValue('parent', quote.getFieldValue('entity')); // Client
  job.setFieldValue('custentity_bo_item', itemId); // Item
  job.setFieldValue('companyname', ' '); // BUGFIX: Avoid To Be Generated
  job.setFieldValue('custentity_bo_buyer', quote.getFieldValue('custbody_buyer')); // Buyer
  job.setFieldValue('custentity_bo_course', quote.getLineItemValue('item', 'custcol_bo_course', i)); // Course
  job.setFieldValue('enddate', quote.getLineItemValue('item', 'custcol_bo_date', i)); // Date
  nlapiLogExecution('DEBUG', 'Info', 'Set enddate');
  
  job.setFieldValue('custentity_bo_eventaddress1', quote.getLineItemValue('item', 'custcol_bo_address1', i)); // Address 1
  job.setFieldValue('custentity_bo_eventaddress2', quote.getLineItemValue('item', 'custcol_bo_address2', i)); // Address 2
  job.setFieldValue('custentity_bo_eventpostcode', quote.getLineItemValue('item', 'custcol_bo_postcode', i)); // Postcode
  job.setFieldValue('custentity_bo_eventcity', quote.getLineItemValue('item', 'custcol_bo_city', i)); // City
  job.setFieldValue('custentity_bo_approxtime', quote.getLineItemValue('item', 'custcol_bo_approxtime', i)); // Approx. Time
  job.setFieldValue('custentity_bo_owner', quote.getFieldValue('custbody_owner')); // Owner
  job.setFieldValue('custentity_bo_licensecontract', quote.getFieldValue('custbody_so_licensingcontract')); // License contract
  job.setFieldValue('custentity_bo_trainingprogramme', quote.getFieldValue('custbody_so_trainingprogramme')); // Training programme
  nlapiLogExecution('DEBUG', 'Info', 'Set custentity_bo_trainingprogramme');
  
  // Country
  var country = quote.getLineItemValue('item', 'custcol_bo_country', i);
  var countryCode = nlapiLookupField('customrecord_country', country, 'custrecord_country_code');
  job.setFieldValue('custentity_bo_eventcountry', country);
  job.setFieldValue('billcountry', countryCode);
  job.setFieldValue('shipcountry', countryCode);
  job.setFieldValue('shipping_country', countryCode);
  nlapiLogExecution('DEBUG', 'Info', 'Set country');
  
  // State (US specific)
  if (country == SWEET_COUNTRY_UNITED_STATES) {
    var state = quote.getLineItemValue('item', 'custcol_bo_state', i);
    var stateCode = nlapiLookupField('customrecord_state', state, 'custrecord_state_code');
    job.setFieldValue('custentity_bo_eventstate', state);
    job.setFieldValue('billstate', stateCode);
    job.setFieldValue('shipstate', stateCode);
  }
  nlapiLogExecution('DEBUG', 'Info', 'Set state');
  
  // Time
  var time = quote.getLineItemValue('item', 'custcol_bo_time', i);
  if (time) {
    job.setFieldValue('custentity_bo_eventtime', time);
  }
  nlapiLogExecution('DEBUG', 'Info', 'Set time');
  
  // Time Zone
  if (country) {
    var timeZones = getTimeZonesByCountryId(country);
    // If single choice, select this by default
    if (timeZones.length == 1) {
      job.setFieldValue('custentity_bo_eventtimezone', timeZones[0].id);
    }
  }
  nlapiLogExecution('DEBUG', 'Info', 'Set timezone');
  
  // Subsidiary
  var subsidiary = nlapiLookupField('customer', quote.getFieldValue('entity'), 'subsidiary');
  subsidiary = sweet_quote_lib_validate_isEmpty(subsidiary) ? SWEET_SUBSIDIARY_THEMINDGYM_UK : subsidiary;
  job.setFieldValue('subsidiary', subsidiary);
  nlapiLogExecution('DEBUG', 'Info', 'Set subsidiary');
  
  // Save record
  var jobId = nlapiSubmitRecord(job);
  nlapiInitiateWorkflow('job', jobId , 'customworkflow_facetoface_booking');
  nlapiLogExecution('DEBUG', 'Function', 'End::sweet_quote_lib_createJobFromItem');
  return jobId;
}

/**
 * Validate quote record
 *
 * @function sweet_quote_lib_validateRecord
 * @param nlapiRecord
 * @throws nlapiError
 */
function sweet_quote_lib_validateRecord(quote) {
  
  nlapiLogExecution('DEBUG', 'Function', 'Start::sweet_quote_lib_validateRecord');
  
  // Buyer
  var buyer = quote.getFieldValue('custbody_buyer');
  if (sweet_quote_lib_validate_isEmpty(buyer)) {
    throw nlapiCreateError('SWEET_BUYER_REQD', 'Buyer field is required. Please go back and update the field.', true);
  }
  
  // Owner
  var owner = quote.getFieldValue('custbody_owner');
  if (sweet_quote_lib_validate_isEmpty(owner)) {
    throw nlapiCreateError('SWEET_OWNER_REQD', 'Owner field is required. Please go back and update the field.', true);
  }
  
  // For each line item
  var i = 1, n = quote.getLineItemCount('item') + 1;
  nlapiLogExecution('DEBUG', 'Var', 'itemCount=' + n);
  for (; i < n; i++) {
    nlapiLogExecution('DEBUG', 'Var', 'lineItem=' + i);
    sweet_quote_lib_validateLineItem(quote, i);
  }
  
  nlapiLogExecution('DEBUG', 'Function', 'End::sweet_quote_lib_validateRecord');
}

/**
 * Validate quote line item trigger
 *
 * @function sweet_quote_lib_validateLineItem
 * @param nlapiRecord
 * @param item line row
 * @throws nlapiError
 */
function sweet_quote_lib_validateLineItem(quote, i) {
  
  nlapiLogExecution('DEBUG', 'Function', 'Start::sweet_quote_lib_validateLineItem');
  
  // Item type
  var itemType = quote.getLineItemValue('item', 'itemtype', i);
  
  // Skip validation if the item type is 'Description'
  if (itemType == 'Description') {
    return; // Skip
  }
  
  // Date
  var date = quote.getLineItemValue('item', 'custcol_bo_date', i);
  
  // Country
  var country = quote.getLineItemValue('item', 'custcol_bo_country', i);
  
  // State (US specific)
  var state = quote.getLineItemValue('item', 'custcol_bo_state', i);

  sweet_quote_lib_validateLineItemCheck(date, country, state, i);
  
  nlapiLogExecution('DEBUG', 'Function', 'End::sweet_quote_lib_validateLineItem');
}

/**
 * Validate quote line item
 *
 * @function sweet_quote_lib_validateLineItemCheck
 * @param nlapiRecord
 * @param item line row
 * @throws nlapiError
 */
function sweet_quote_lib_validateLineItemCheck(date, country, state, i) {
  
  nlapiLogExecution('DEBUG', 'Function', 'Start::sweet_quote_lib_validateLineItemCheck');
  nlapiLogExecution('DEBUG', 'Date', date);
  
  // Date
  if (sweet_quote_lib_validate_isEmpty(date)) {
    throw nlapiCreateError('SWEET_BO_DATE_REQD', 'Date field is required. Please go back and update the field on line item ' + i + '.', true);
  }
  nlapiLogExecution('DEBUG', 'Country', String(country));
  
  // Country
  if (sweet_quote_lib_validate_isEmpty(country)) {
    throw nlapiCreateError('SWEET_BO_COUNTRY_REQD', 'Country field is required. Please go back and update the field on line item ' + i + '.', true);
  }
  nlapiLogExecution('DEBUG', 'State', String(state));
  
  // State (US specific)
  if (country == SWEET_COUNTRY_UNITED_STATES) {
    if (sweet_quote_lib_validate_isEmpty(state)) {
      throw nlapiCreateError('SWEET_STATE_REQD', 'State is required because USA is selected as country. Please go back and select state on line item ' + i + '.', true);
    }
  }
  
  nlapiLogExecution('DEBUG', 'Function', 'End::sweet_quote_lib_validateLineItemCheck');
}
 
/**
 * Helper function: Check if variable is empty
 *
 * @param {Mixed}
 * @return Boolean
 */
function sweet_quote_lib_validate_isEmpty(variable) {
  return (variable == null || variable == undefined || String(variable).length < 1 || variable == '');
}

/*************************************************************
 *
 * From sweet_timezone.js
 *
 */

/**
 * Get time zones by country
 *
 * @param {Mixed} countryId (String or Array)
 * @param {String} selectedId (optional)
 * @param {Boolean} alwaysIncludeSelected even if it doesn't match country
 * @param {Array}
 */
function getTimeZonesByCountryId(countryId, selectedId, alwaysIncludeSelected) {

  if (typeof(countryId) == 'string') {
    var operator = 'is';
  } else {
    var operator = 'anyof'; // Assume it's an array
  }
  
  var filters = new Array();
  filters.push(new nlobjSearchFilter('custrecord_tz_country', null, operator, countryId));
  
  var columns = new Array();
  columns.push(new nlobjSearchColumn('name'));
  
  return _getTimeZones(filters, columns, selectedId, alwaysIncludeSelected);
}

/**
 * Get all time zones
 *
 * @param {String} selectedId (optional)
 * @param {Array}
 */
function getAllTimeZones(selectedId) {

  var columns = new Array();
  columns.push(new nlobjSearchColumn('name'));
  
  return _getTimeZones(null, columns, selectedId);
}

/**
 * Time zone helper function
 *
 * @param {Array} filters (optional)
 * @param {Array} columns (optional)
 * @param {String} selectedId (optional)
 * @param {Boolean} alwaysIncludeSelected even if it doesn't match country
 * @return {Void}
 */
function _getTimeZones(filters, columns, selectedId, alwaysIncludeSelected) {

  var timeZones = new Array();
  
  selectedId = selectedId || null; // Default none
  alwaysIncludeSelected = alwaysIncludeSelected || false;
  
  searchResults = nlapiSearchRecord('customrecord_timezone', null, filters, columns);
  
  var foundSelected = selectedId ? false : true;
  if (searchResults) {
    var i = 0, n = searchResults.length;
    for (; i < n; i++) {
      var timeZone = new Object();
      timeZone.id = searchResults[i].getId();
      timeZone.name = searchResults[i].getValue('name');
      timeZone.selected = timeZone.id == selectedId;
      timeZones.push(timeZone);
      foundSelected = timeZone.selected && selectedId ? true : false;
    }
  }
  
  // Does the list include the selected item?
  if (alwaysIncludeSelected && !foundSelected && selectedId) {
  
    // Nope, let's add it.
    var record = nlapiLoadRecord('customrecord_timezone', selectedId);
    var timeZone = new Object();
    timeZone.id = record.getId();
    timeZone.name = record.getFieldValue('name');
    timeZone.selected = true;
    timeZones.push(timeZone);
  }
  
  return timeZones;
}

