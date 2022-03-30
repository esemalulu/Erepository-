/**
 * Immediate Feedback Summary Report
 *
 * @param {Object} request
 * @param {Object} response
 */
function immediateFeedbackSummaryReport(request, response)
{
  nlapiLogExecution('DEBUG', 'Function', 'Start::immediateFeedbackSummaryReport');
  
  // globals
  request = request; // Make the request object global
  fromDate = null;
  toDate = null;
  client = null;
  buyer = null;
  
  // Validate from date
  if ((request.getParameter('custpage_from_date') != null) && (request.getParameter('custpage_from_date').length > 0)) {
    fromDate = nlapiStringToDate(request.getParameter('custpage_from_date'));
  } else {
    fromDate = new Date();
  }
  
  // Validate to date
  if ((request.getParameter('custpage_to_date') != null) && (request.getParameter('custpage_to_date').length > 0)) {
    toDate = nlapiStringToDate(request.getParameter('custpage_to_date'));
  } else {
    toDate = nlapiAddMonths(new Date(), 2);
  }
  
  // If form has been submitted
  if (request.getMethod() == 'POST') {
  
    // Get client
    if (request.getParameter('client') != null) {
      client = request.getParameter('client');
    }
    
    // Get buyer
    if (request.getParameter('buyer') != null) {
      buyer = request.getParameter('buyer');
    }
    
    if ((request.getParameter('jobsfields') != null) &&
      (request.getParameter('jobsdata') != null) &&
      (request.getParameter('custpage_refresh_flag') != 'T')) {
      
      // Get the job fields
      var postedJobFields = request.getParameter('jobsfields').split("\x01");
      var postedJobData = request.getParameter('jobsdata');
      
      var jobData = processPostedListData(postedJobFields, postedJobData);
      //updateJobs(jobData);
    }
  }
  
  // Get a list of jobs awaiting packs
  var jobs = getJobs(client, buyer, fromDate, toDate);

  // Create the form
  var form = createForm(jobs);
  
  nlapiLogExecution('DEBUG', 'Function', 'End::immediateFeedbackSummaryReport');
  response.writePage(form);
}

/**
 * Get list of all jobs with immediate feedback
 *
 * @param {String} client
 * @param {String} buyer
 * @param {String} fromDate
 * @param {String} toDate
 * @return {Array}
 */
function getJobs(client, buyer, fromDate, toDate)
{
  var jobs = new Array();
  var filters = new Array();
  
  // Client
  if (!client) {
    return jobs;
  }
  nlapiLogExecution('DEBUG', 'Var', 'client=' + client);
  filters.push(new nlobjSearchFilter('parent', null, 'is', client));
  
  // Buyer
  if (buyer) {
    nlapiLogExecution('DEBUG', 'Var', 'buyer=' + buyer);
    filters.push(new nlobjSearchFilter('custentity_bo_buyer', null, 'is', buyer));
  }
  
  // From date
  if (fromDate != null) {
    filters.push(new nlobjSearchFilter('enddate', null, 'onorafter', fromDate.format('d/m/yyyy')));
  }
  
  // To date
  if (toDate != null) {
    filters.push(new nlobjSearchFilter('enddate', null, 'onorbefore', toDate.format('d/m/yyyy')));
  }
  
  jobs = nlapiSearchRecord('job', 'customsearch_script_job_imfeedback_collected');
  return jobs;
}

/**
 * Update job records with the posted data
 *
 * @param {Array} data
 * @return {Boolean}
 */
 /*
function updateJobs(data)
{
  nlapiLogExecution('DEBUG', 'Function', 'Start::updateJobs');
  
  if (data == null) {
    return false;
  }
  
  var today = new Date();
  var submit = false;
  
  for (var i = 0; i < data.length; i++) {
    if (data[i].id == undefined) {
      throw nlapiCreateError('SWEET_JOB_ID_REQD', 'Job ID is required.', true)
    }
    nlapiLogExecution('DEBUG', 'Var', 'id=' + data[i].id);
    var job = nlapiLoadRecord('job', data[i].id);
    
    if (SCRIPT_MODE == 'pack') {
      // Pack
      if (data[i].custentity_bo_ispackshipped == 'T') {
        //fields.push('custentity_bo_ispackshipped');
        //fields.push('custentity_bo_packshippingdate');
        //values.push(job.custentity_bo_ispackshipped);
        //values.push(nlapiDateToString(today));
        job.setFieldValue('custentity_bo_ispackshipped', 'T');
        job.setFieldValue('custentity_bo_packshippingdate', nlapiDateToString(today));
        submit = true;
      }
    } else {
      // Pre-pack
      if (data[i].custentity_bo_isprepackshipped == 'T') {
        //fields.push('custentity_bo_isprepackshipped');
        //fields.push('custentity_bo_prepackshippingdate');
        //values.push(job.custentity_bo_isprepackshipped);
        //values.push(nlapiDateToString(today));
        job.setFieldValue('custentity_bo_isprepackshipped', 'T');
        job.setFieldValue('custentity_bo_prepackshippingdate', nlapiDateToString(today));
        submit = true;
      }
    }
    
    // Update record
    if (submit) {
      nlapiSubmitRecord(job);
      //nlapiSubmitField('job', job.id, fields, values);
    }
  }
  
  nlapiLogExecution('DEBUG', 'Function', 'End::updateJobs');
  return true;
}
*/

/**
 * Converted data posted from a Netsuite sublist into an array of arrays.
 * Netsuite uses 2 seperators to break up the post data
 *
 * @param {String} incomingData
 * @return {Array}
 */
function convertPostData(incomingData)
{
  if (incomingData == null) {
    return false;
  }
  var dataArray = new Array();
  var dataBlocks = incomingData.split("\x02");
  for (var i = 0; i < dataBlocks.length; i++) {
    dataArray[i] = dataBlocks[i].split("\x01");
  }
  return dataArray;
}

/**
 * Process data received from a posted Netsuite sublist form
 * Converts data string into array, then into objects
 *
 * @param {Array} fields
 * @param {String} data
 * @return {Array}
 */
function processPostedListData(fields, data)
{
  // Parse the data from a string into array
  data = convertPostData(data);
  
  // Create a new object for each posted sublist row
  var dataArray = new Array();
  for (var i = 0; i < data.length; i++) {  
    var dataObject = new Object();
    for (var j = 0; j < fields.length; j++) {
      var fieldName = fields[j];
      var fieldValue = data[i][j];
      dataObject[fieldName] = fieldValue;
    }
    dataArray[i] = dataObject;
  }
  return dataArray;
}

/**
 * Create form
 * 
 * @param {Array} jobs
 */
function createForm(jobs)
{
  // Create a new form
  var title = 'Feedback Summary Report';
  var form = nlapiCreateForm(title);
  form.setTitle(title);
  
  // Product coordinator
  //addProductCoordinatorSelectBox(form);
  
  // From date
  var fromDateField = form.addField('custpage_from_date', 'date', 'From');
  fromDateField.setLayoutType('startrow');
  fromDateField.setDefaultValue(fromDate.format('d/m/yyyy'));
  
  // To date
  var toDateField = form.addField('custpage_to_date', 'date','To');
  toDateField.setLayoutType('midrow');
  toDateField.setDefaultValue(toDate.format('d/m/yyyy'));
  
  // Save button
  form.addSubmitButton('Save');
  
  // Refresh button
  var refreshFlagField = form.addField('custpage_refresh_flag', 'checkbox');
  refreshFlagField.setDisplayType('hidden');
  refreshFlagField.setDefaultValue('F');
  var onClick = 'document.main_form.custpage_refresh_flag.value = \'T\';';
  onClick += 'window.ischanged = false;'; // Suppress warning message
  onClick += 'document.main_form.submit();';
  form.addButton('custpage_refresh_button', 'Refresh', onClick);

  // Job list
  var subList = form.addSubList('jobs', 'list', 'Jobs pending packs');
  subList.addField('custentity_include', 'checkbox', 'Include');
  
  subList.addMarkAllButtons();
  var jobIdField = subList.addField('id', 'text', 'ID');
  jobIdField.setDisplayType('hidden'); 
  subList.addField('job_url', 'text', 'Job #');
  subList.addField('enddate', 'date', 'Date');
  subList.addField('customer_display', 'text', 'Client');
  subList.addField('custentity_bo_buyer_display', 'text', 'Buyer');
  subList.addField('custentity_bo_course_display', 'text', 'Product');
  subList.setLineItemValues(jobs);
  
  return form;
}

/**
 * Add product coordinator select field to form
 *
 * @param {Object} form
 */
function addProductCoordinatorSelectBox(form)
{
  /*
  // Create select field
  var field = form.addField('product_coordinator', 'select', 'Coordinator');
  
  // Get list of product coordinators
  coordinators = nlapiSearchRecord('vendor', 'customsearch_script_product_coordinators');
  
  // Add options
  field.addSelectOption('', 'Any');
  if (coordinators) {
    var i = 0, n = coordinators.length;
    for (; i < n; i++) {
      var value = coordinators[i].getValue('custentity_product_coordinator_group');
      var text = coordinators[i].getValue('custentity_product_coordinator_group_display');
      field.addSelectOption(value, text);
    }
  }
  
  // Set default value
  if (request.getParameter('product_coordinator') != null) {
    var selected = request.getParameter('product_coordinator');
    field.setDefaultValue(selected);
  }
  */
}
