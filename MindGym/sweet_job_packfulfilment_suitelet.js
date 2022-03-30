/**
 * Pack fulfilment
 *
 * @param {Object} request
 * @param {Object} response
 */

var trainingProg = '';
var fromDate = null, 
    toDate=null,
    subsidiary='',
    bookingStatusVal = '',
    courseStatus = '',
    PROVISIONAL_STATUS_ID = '66'; //66

//custscript_sct76_alphaprintlocation
var paramAlphaPrintLocId = '';
var paramNewPerspectiveLocId = '';

function packFulfilmentReport(request, response)
{
	paramAlphaPrintLocId = nlapiGetContext().getSetting('SCRIPT', 'custscript_sct76_alphaprintlocation');
	paramNewPerspectiveLocId = nlapiGetContext().getSetting('SCRIPT','custscript_sct76_newperspectivelocation');
	
  nlapiLogExecution('DEBUG', 'Function', 'Start::packFulfilmentReport // Alpha Print '+paramAlphaPrintLocId);
  
  request = request; // Make the request object global
  SCRIPT_MODE = nlapiGetContext().getSetting('SCRIPT', 'custscript_mode');
  nlapiLogExecution('DEBUG', 'Var', 'SCRIPT_MODE=' + SCRIPT_MODE);
  if (SCRIPT_MODE != 'pack' && SCRIPT_MODE != 'prepack') {
    SCRIPT_MODE = 'pack'; // default to pack mode
  }
  
  var productCoordinator = null;
  
  
  // Validate from date
  fromDate = request.getParameter('custpage_from_date');
  nlapiLogExecution('DEBUG', 'Var', 'fromDate=' + fromDate);
  if ((fromDate != null) && (fromDate.length > 0)) {
    fromDate = nlapiStringToDate(fromDate);
  }
  
  // Validate to date
  toDate = request.getParameter('custpage_to_date');
  nlapiLogExecution('DEBUG', 'Var', 'toDate=' + toDate);
  if ((toDate != null) && (toDate.length > 0)) {
    toDate = nlapiStringToDate(toDate);
  }
  
  /**
   * 4/24/2014 NOTE
   * When From is provided, it searches for onorafter
   * When To is provided, it searches for onorbefore
   */
  if (!request.getParameter('custpage_from_date') && !request.getParameter('custpage_to_date')) {
	  fromDate = new Date();    
	  nlapiLogExecution('DEBUG', 'Var', 'fromDate=' + fromDate);
	  
	  //toDate = nlapiAddDays(new Date(), 7);
	  toDate = nlapiAddMonths(new Date(), 1);
  }
  
  
  // Validate subsidiary
  subsidiary = request.getParameter('custpage_subsidiary');
  nlapiLogExecution('DEBUG', 'Var', 'subsidiary=' + subsidiary);
  if ((subsidiary == null) || (subsidiary.length < 1)) {
    subsidiary = null;
  }
  
  //3/21/2016 - Added booking status filter
  bookingStatusVal = request.getParameter('custpage_bookstatus');
  
  
// Validate country
  country = request.getParameter('custpage_country');
  nlapiLogExecution('DEBUG', 'Var', 'country=' + country );
  if ((country == null) || (country .length < 1)) {
    country = null;
  }

  /**
   * 4/24/2014 - Mod. Add training filter
   */
  if (request.getParameter('custpage_trainprog')) {
	  trainingProg = request.getParameter('custpage_trainprog');
  }
  
  // If form has been submitted
  if (request.getMethod() == 'POST') {
  
    // Check if a coordinator has been chosen
    /*
    if (request.getParameter('product_coordinator') != null) {
      productCoordinator = request.getParameter('product_coordinator');
    }
    */
    
    if ((request.getParameter('jobsfields') != null) &&
      (request.getParameter('jobsdata') != null) &&
      (request.getParameter('custpage_refresh_flag') != 'T')) {
      
      // Get the job fields
      var postedJobFields = request.getParameter('jobsfields').split("\x01");
      var postedJobData = request.getParameter('jobsdata');
      
      var jobData = processPostedListData(postedJobFields, postedJobData);
      updateJobs(jobData);
    }
  }
  
  // Get a list of jobs awaiting packs
  var jobs = getJobs(productCoordinator, fromDate, toDate, subsidiary, country);
  
  // Create the form
  var form = createForm(jobs);
  
  nlapiLogExecution('DEBUG', 'Function', 'End::packFulfilmentReport');
  response.writePage(form);
}

/**
 * Do a Netsuite search to get all job records awaiting packs
 *
 * @param {String} coordinator
 * @param {String} fromDate
 * @param {String} toDate
 * @param {String} subsidiary
 * @return {Array}
 */
function getJobs(coordinator, fromDate, toDate, subsidiary, country) {
  
  var jobs = new Array();
  var filters = new Array();
  
  // Product coordinator
  /*
  if (coordinator != null && coordinator.length > 0) {
    nlapiLogExecution('DEBUG', 'Var', 'coordinator=' + coordinator);
    filters.push(new nlobjSearchFilter('custentity_product_coordinator', 'custentity_bo_coach', 'is', coordinator));
  }
  */
  nlapiLogExecution('debug','getJob',fromDate+' // '+toDate);
  // From date
  if (fromDate && fromDate != null) {
    filters.push(new nlobjSearchFilter('enddate', null, 'onorafter', nlapiDateToString(fromDate)));
  }
  
  // To date
  if (toDate && toDate != null) {
    filters.push(new nlobjSearchFilter('enddate', null, 'onorbefore', nlapiDateToString(toDate)));
  }
  
  if (subsidiary != null) {
    filters.push(new nlobjSearchFilter('subsidiary', null, 'is', subsidiary));
  }
  
  if(courseStatus)
  {
	filters.push(new nlobjSearchFilter('custentity_bo_courstatus', null, 'anyof', courseStatus));  
  }
  
  //3/21/2016 - Add in Filter value for Booking Status
  if (bookingStatusVal)
  {
	  filters.push(new nlobjSearchFilter('status', null, 'anyof', bookingStatusVal));
  }
  
 if (SCRIPT_MODE == 'pack') {
   if (country != null) {
     filters.push(new nlobjSearchFilter('custentity_bo_eventcountry', null, 'is', country));
    }
   
   /**
    * 4/24/2014 Mod add training program filter
    */
   if (trainingProg) {
	   filters.push(new nlobjSearchFilter('custentity_bo_trainingprogramme', null, 'anyof', trainingProg));
   }
   
 }

 /**
  * 4/24/2014 - Fulfillment Changes
  * Modify Saved Search: SCRIPT_Bookings Pending Pack
  * to Include New Custom Fields: Ship To, Shipping Address, Comments
  * Booking/Shipping Address
  * Booking/Pack Ship To
  * Comments
  */
 
 //3/20/2016 - Modified to grab the search from deployment parameter instead of trying to build 
 var scriptSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_sct76_modesavedsearch');
  jobs = nlapiSearchRecord('job', scriptSearchId, filters ? filters : null);
  return jobs;
}

/**
 * Update job records with the posted data
 *
 * @param {Array} data
 * @return {Boolean}
 */
function updateJobs(data)
{
  nlapiLogExecution('DEBUG', 'Function', 'Start::updateJobs');
  
  if (data == null) {
    return false;
  }
  
  var today = new Date();
  
  for (var i = 0; i < data.length; i++) {
    
    var submit = false;
    var job = null;
    
    if (data[i].id == undefined) {
      throw nlapiCreateError('SWEET_JOB_ID_REQD', 'Job ID is required.', true)
    }
    
    nlapiLogExecution('DEBUG', 'Var', 'id=' + data[i].id);
    
    nlapiLogExecution('debug','Update Var JSON', JSON.stringify(data[i]));
    
    if (SCRIPT_MODE == 'pack') {
      // Pack
      //Fulfillment Phase 2 - column ID is now custentity_bo_isinproduction 
      if (data[i].custentity_bo_isinproduction == 'T') {
    	  job = nlapiLoadRecord('job', data[i].id);
        
    	  //Fulfillment Phase 2 - Set In Production AND Production Date
    	  job.setFieldValue('custentity_bo_isinproduction', 'T');
    	  nlapiLogExecution('debug','today',new Date());
    	  //7/31/2014 - Quick Fix MODE: Field has been changed to date/time.
    	  //			Since Server always returns date/time in PST, and It MUST be in GMT.
    	  //			Quick fix to add +8 Hours.
    	  //			** WARNING:
    	  //			If someone were to open this up in different timezone, Time value may change.
    	  var fixCurDate = new Date();
    	  fixCurDate.setHours(fixCurDate.getHours()+8);
    	  
    	  job.setFieldValue('custentity_bo_packproductiondate', nlapiDateToString(fixCurDate, 'datetimetz'));
    	  //set location value
    	  job.setFieldValue('custentity_cbl_packffloc', data[i].custentity_cbl_packffloc);
    	  
    	  //job.setFieldValue('custentity_bo_ispackshipped', 'T');
    	  //job.setFieldValue('custentity_bo_packshippingdate', nlapiDateToString(today));
    	  submit = true;
      }
    } else {
      // Pre-pack
      if (data[i].custentity_bo_isprepackshipped == 'T') {
        job = nlapiLoadRecord('job', data[i].id);
        job.setFieldValue('custentity_bo_isprepackshipped', 'T');
        job.setFieldValue('custentity_bo_prepackshippingdate', nlapiDateToString(today));
        submit = true;
      }
    }
    
    // Update record
    if (submit) {
      nlapiLogExecution('DEBUG', 'Msg', 'Update job record: ' + job.getId());
      nlapiSubmitRecord(job);
    }
  }
  
  nlapiLogExecution('DEBUG', 'Function', 'End::updateJobs');
  return true;
}

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
  nlapiLogExecution('DEBUG', 'Function', 'Start::createForm');
  nlapiLogExecution('DEBUG', 'SCRIPT MODE', SCRIPT_MODE);
  
  
  // Create a new form
  //var title = SCRIPT_MODE == 'pack' ? 'Produce Packs' : 'Fulfill Pre-packs';
  //3/20/2016 - Title will now comoe from Source
  var title = nlapiGetContext().getSetting('SCRIPT','custscript_sct76_slname');
  var form = nlapiCreateForm(title);
  form.setTitle(title);
  
  if (SCRIPT_MODE == 'pack') {
	  //set script
	  form.setScript('customscript_cbl_cs_packfulfillslcshelp');
  }
  
  // Product coordinator
  //addProductCoordinatorSelectBox(form);
  
  /**
   * 4/24/2014 - Mod
   */
  
  form.addFieldGroup('custpage_grpa', 'Filter Options', null);
  
  // From date
  var fromDateField = form.addField('custpage_from_date', 'date', 'From',null,'custpage_grpa');
  if (fromDate && fromDate!=null) {
	  fromDateField.setDefaultValue(nlapiDateToString(fromDate));
  }
  
  fromDateField.setBreakType('startcol');
  
  var datenote = form.addField('custpage_rangenote','inlinehtml','',null,'custpage_grpa');
  datenote.setDefaultValue('From date ONLY will search for Booking Date On or After the Date<br/>To date ONLY will search for Booking Date On or Before the Date');
  
  // To date
  var toDateField = form.addField('custpage_to_date', 'date', 'To',null,'custpage_grpa');
  toDateField.setBreakType('startcol');
  if (toDate && toDate!=null) {
	  toDateField.setDefaultValue(nlapiDateToString(toDate));
  }
  
  
  // Subsidiary field
  var subsidiaryField = form.addField('custpage_subsidiary', 'select', 'Subsidiary', 'subsidiary','custpage_grpa');
  subsidiaryField.setBreakType('startcol');
  subsidiaryField.setDefaultValue(subsidiary);

  //3/21/2016 - Request to add Booking Status as drop down filter
  var bookingStatusFld = form.addField('custpage_bookstatus','select','Booking Status','customerstatus','custpage_grpa');
  bookingStatusFld.setDefaultValue(bookingStatusVal);
  
 // Country field
 if (SCRIPT_MODE == 'pack') {
    var countryField = form.addField('custpage_country', 'select', 'Country','customrecord_country','custpage_grpa');
    countryField.setBreakType('startcol');
    countryField.setDefaultValue(country);
    
    /**
     * 4/24/2014 Mod - Add Training Programme Filter only for pack
     */
    
    var trainProgField = form.addField('custpage_trainprog','select','Training Programme','customrecord_trainingprogramme','custpage_grpa');
    trainProgField.setDefaultValue(trainingProg);
    
 }
 
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

if (SCRIPT_MODE == 'pack')
{
	//Search filter
	var linkFilter = '';
	if(country && country.length > 0)
	{
	    linkFilter +='&country=' + country;
	}
	if(subsidiary && subsidiary.length > 0)
	{
	    linkFilter+= '&subsidiary=' + subsidiary;
	}
	
	/**
	 * 4/24/2014 - Mod Add Training programme 
	 */
	
	if(trainingProg && trainingProg.length > 0)
	{
	    linkFilter+= '&trainingprogramme=' + trainingProg;
	}
	
	
	var sDate='';
	var eDate='';
	if(fromDate && fromDate!=null)
	{
		nlapiLogExecution('debug','fromDate',fromDate);
	    sDate = nlapiDateToString(fromDate);
	    
	}
	
	if (toDate && toDate !=null) {
		nlapiLogExecution('debug','toDate',toDate);
		eDate = nlapiDateToString(toDate);
	}
	
	  // Export PDF button
	  var linkURL = nlapiResolveURL('SUITELET', 'customscript_export_jobs_suitelet', 'customdeploy_export_jobs', null) + '&type=PDF'+'&from_date=' + sDate+'&to_date='+eDate+ linkFilter;
	    var onClick = "window.location.href='" + linkURL + "';";
	  form.addButton('custpage_export_PDF_button', 'Export to PDF', onClick);
	
	
	  // Export CSV button
	  var linkURL = nlapiResolveURL('SUITELET', 'customscript_export_jobs_suitelet', 'customdeploy_export_jobs', null) + '&type=CSV'+'&from_date=' + sDate+'&to_date='+eDate+ linkFilter;
	    var onClick = "window.location.href='" + linkURL + "';";
	  form.addButton('custpage_export_button', 'Export to CSV', onClick);
	  
	  //TESTING ONLY - Show to Admins ONly
	  //if (nlapiGetContext().getRole() == '3') {

		  if (SCRIPT_MODE == 'pack') {
			  
			  /* Commented out: This inline javascript does not work as it is rendered AFTER the buttons in html
			  var alphPrintScript = "function autoSetPackAndAlpahLocation() {"+
											"var paramAlphaPrintLocId = '"+paramAlphaPrintLocId+"';"+
											"var packLineCount = nlapiGetLineItemCount('jobs');"+
											"for (var i=1; i <= packLineCount; i++) {"+
											"if (nlapiGetLineItemValue('jobs','entitystatusid',i) == '"+PROVISIONAL_STATUS_ID+"' || !nlapiGetLineItemValue('jobs','custentity_bo_coach_display',i) || !nlapiGetLineItemValue('jobs','custentity_bo_otheraddress',i)) {"+
											"continue;"+
											"}"+
											"var isLithoChecked = nlapiGetLineItemValue('jobs', 'custrecord_course_islitho',i);"+
											"if (isLithoChecked == 'Yes') {"+
											"nlapiSetLineItemValue('jobs', 'custentity_bo_isinproduction', i, 'T');"+
											"nlapiSetLineItemValue('jobs', 'custentity_cbl_packffloc', i, paramAlphaPrintLocId);"+
											"}"+
											"}"+
											"}"+
											"function autoSetPackAndNewPerspectiveLocation() {"+
											"var paramNewPerspectiveLocId = '"+paramNewPerspectiveLocId+"';"+
											"var packLineCount = nlapiGetLineItemCount('jobs');"+
											"for (var i=1; i <= packLineCount; i++) {"+
											"if (nlapiGetLineItemValue('jobs','entitystatusid',i) == '"+PROVISIONAL_STATUS_ID+"' || !nlapiGetLineItemValue('jobs','custentity_bo_coach_display',i) || !nlapiGetLineItemValue('jobs','custentity_bo_otheraddress',i)) {"+
											"continue;"+
											"}"+
											"var isLithoChecked = nlapiGetLineItemValue('jobs', 'custrecord_course_islitho',i);"+
											"if (isLithoChecked == 'No') {"+
											"nlapiSetLineItemValue('jobs', 'custentity_bo_isinproduction', i, 'T');"+
											"nlapiSetLineItemValue('jobs', 'custentity_cbl_packffloc', i, paramNewPerspectiveLocId);"+
											"}"+
											"}"+
											"}"+
											"function autoSetFulfillLocation()"+ 
											"{"+
											"	var packLineCount = nlapiGetLineItemCount('jobs');"+
											"	for (var i=1; i <= packLineCount; i++) {"+
											"		if (nlapiGetLineItemValue('jobs','entitystatusid',i) == '"+PROVISIONAL_STATUS_ID+"' || !nlapiGetLineItemValue('jobs','custrecord_course_packffloc',i))"+ 
											"		{"+
											"			continue;"+
											"		}"+
											"		if (!nlapiGetLineItemValue('jobs','custentity_bo_coach_display',i) || !nlapiGetLineItemValue('jobs','custentity_bo_otheraddress',i)) {"+
											"			continue;"+
											"		}"+
											"		nlapiSetLineItemValue('jobs', 'custentity_bo_isinproduction', i, 'T');"+
											"		nlapiSetLineItemValue('jobs', 'custentity_cbl_packffloc', i, nlapiGetLineItemValue('jobs', 'custrecord_course_packffloc',i));"+
											"	}"+
											"}";
			  
			  
			  
			  //paramNewPerspectiveLocId
			  
			  //Add hidden inline HTML field to set the function.
			  var sctInlineHtmlFld = form.addField('custpage_inlinehtmlsct', 'inlinehtml','',null,null);
			  sctInlineHtmlFld.setDefaultValue("<script language='javascript'>"+alphPrintScript+"</script>");
			  */
			  
			  //add button
			  //OnClick function are in customscript_cbl_cs_packfulfillslcshelp
			  form.addButton('custpage_alphaprintbtn1','Alpha Print', 'autoSetPackAndAlpahLocation(' + paramAlphaPrintLocId + ',' + PROVISIONAL_STATUS_ID + ')');
			  
			  form.addButton('custpage_alphaprintbtn2','New Perspective', 'autoSetPackAndNewPerspectiveLocation(' + paramNewPerspectiveLocId + ',' + PROVISIONAL_STATUS_ID + ')');
			  
			  form.addButton('custpage_alphaprintbtn3','Auto Set to Course Fulfillment','autoSetFulfillLocation(' + PROVISIONAL_STATUS_ID + ')');
		  }
	  //}
	  
}

  // Job list
  var subList = form.addSubList('jobs', 'list', 'Jobs Pending Production');
  if (SCRIPT_MODE == 'pack') {
	//Fulfillment Phase 2 - Use custentity_bo_isinproduction instead of custentity_bo_ispackshipped
	//	since it will check and set In Production related fields
    subList.addField('custentity_bo_isinproduction', 'checkbox', 'Pack');
  } else {
    subList.addField('custentity_bo_isprepackshipped', 'checkbox', 'Pre-pack');
  }
  
  //Fulfillment Phase 2 - Mark all removed
  //subList.addMarkAllButtons();
  
  var jobIdField = subList.addField('id', 'text', 'ID');
  jobIdField.setDisplayType('hidden'); 
  
  //Fulfillment Phase 2
  if (SCRIPT_MODE == 'pack') {
		subList.addField('custentity_cbl_packffloc', 'select', 'Fulfill Location', 'location');
  }
  
  subList.addField('job_url', 'text', 'Job #');
  subList.addField('jobtext', 'text', 'Job text').setDisplayType('hidden');
  subList.addField('entitystatus','text','Booking Status');
  subList.addField('entitystatusid','text','Booking Status ID').setDisplayType('hidden');
  subList.addField('coursestatus', 'text', 'Course Status')
  subList.addField('enddate', 'date', 'Date');
  subList.addField('custentity_bo_eventtime', 'timeofday','Time');
  subList.addField('days_remaining', 'integer', 'In Days');
  
  //8/24/2014 - Request to add Two additional columns from saved search:
  //Course Records' Is Published custrecord_course_ispublished (CUSTENTITY_BO_COURSE)
  subList.addField('custrecord_course_ispublished','text','Is Published');
  //Course Records' Is Litho custrecord_course_islitho (CUSTENTITY_BO_COURSE)
  subList.addField('custrecord_course_islitho', 'text', 'Is Litho');
  
  subList.addField('custentity_bo_coach_display', 'text', 'Coach');
  subList.addField('customer_display', 'text', 'Client');
  
  //3/21/2016 - Request to add item column
  subList.addField('custentity_bo_item','select','Booking/Item','item').setDisplayType('inline');
  
  subList.addField('custentity_bo_course_display', 'text', 'Course');
  
  if (SCRIPT_MODE == 'pack') {
	//11/16/2015 - Add FF Location next to Coach Column
	subList.addField('custrecord_course_packffloc', 'select', 'Course Fulfillment','location').setDisplayType('inline');
	subList.addField('custentity_bo_numberparticipants','text','# of Participants');
	subList.addField('custentity_bo_pack_shipto', 'text', 'Ship To');
    subList.addField('custentity_bo_otheraddress', 'textarea', 'Shipping Address');
    subList.addField('custentity_bo_coursevenue', 'text', 'Course Venue');
  }

  subList.addField('custentity_bo_owner_display', 'text', 'Owner');
  subList.addField('formulatext', 'text', 'Comments');
  subList.setLineItemValues(jobs);
  
  if (jobs) {
    setCustomLineItemValues(subList, jobs);
  }
  
  nlapiLogExecution('DEBUG', 'Function', 'End::createForm');
  return form;
}

/**
 * Add product coordinator select field to form
 *
 * @param {Object} form
 */
function addProductCoordinatorSelectBox(form)
{
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
}

/**
 * Update sublist with custom line item values
 *
 * @param {Object} sublist
 * @param {Object} jobs
 */
function setCustomLineItemValues(sublist, jobs)
{
  var i = 0, n = jobs.length;
  for (;i < n; i++) {
    
    // job url
    var jobUrl = nlapiResolveURL('RECORD', 'job', jobs[i].getId());
    sublist.setLineItemValue('job_url', (i + 1), "<a target='_blank' href='" + jobUrl + "'>" + jobs[i].getValue('entityid') + "</a>");
    sublist.setLineItemValue('jobtext', (i+1),jobs[i].getValue('entityid'));
    
    //Add in custom display
    
    //3/20/2016 - Set custom booking status field values
    var prjStatusValue = jobs[i].getText('entitystatus'),
    	prjStatusIdVal = jobs[i].getValue('entitystatus');
    
    var courseStatus   = jobs[i].getValue('custentity_bo_coursestatus'); 
    nlapiLogExecution('DEBUG', 'Course Status', courseStatus)
    
    //Provisional status ID is 66
    if (prjStatusIdVal == PROVISIONAL_STATUS_ID)
    {
    	prjStatusValue = '<span style="color: red; font-weight: bold">'+prjStatusValue+'</span>';
    }
    sublist.setLineItemValue('entitystatus', (i+1), prjStatusValue);
    sublist.setLineItemValue('coursestatus', (i+1), courseStatus);
    sublist.setLineItemValue('entitystatusid', (i+1), prjStatusIdVal);
    
    
    // days remaining
    var endDate = nlapiStringToDate(jobs[i].getValue('enddate'));
    var today = new Date();
    var oneDay = 1000 * 60 * 60 * 24;
    var daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / oneDay);
    daysRemaining = daysRemaining > 0 ? daysRemaining - 1 : 0;
    sublist.setLineItemValue('days_remaining', (i + 1), daysRemaining + '');

   if (SCRIPT_MODE == 'pack') {
	   
	   /**
	    * 4/24/2014 - Fulfillment Modification. Get Ship To Shipping Address from Booking Record
	    */
	   
	   var packShipToText = jobs[i].getText('custentity_bo_pack_shipto');
	   var packShipToId = jobs[i].getValue('custentity_bo_pack_shipto');
	   var packShipToAddress = jobs[i].getValue('custentity_bo_shippingaddress');
	   //if ship to is Other set address as comments
	   //8/24/2014 - Instead of using Comments, use Pack Comments (custentity_bo_packcomments)
	   //6/13/2015 - Since the change on the booking record where IF OTHER is selected, Shipping address is enahbled for user to add address.
	   //		DUE TO THIS CHANGE, we no longer need below logic to switch to show value from Pack Comments
	   sublist.setLineItemValue('custentity_bo_pack_shipto', (i + 1),packShipToText);
	   
	   sublist.setLineItemValue('custentity_bo_otheraddress', (i + 1),packShipToAddress);
	   
	   //11/16/2015
	   sublist.setLineItemValue('custrecord_course_packffloc', (i+1), jobs[i].getValue('custrecord_course_packffloc','custentity_bo_course'));
	   
	   //Course Venue
	   var courseVenue = '';
	   var eventCity = jobs[i].getValue('custentity_bo_eventcity');
	   if(eventCity || eventCity !=''){
		   courseVenue = courseVenue + eventCity+', ';
	   }
	   courseVenue = courseVenue +  jobs[i].getText('custentity_bo_eventcountry');
	   sublist.setLineItemValue('custentity_bo_coursevenue', (i + 1),courseVenue);
	   
	   //8/24/2014 - Request to add Two additional columns from saved search:
	   //Course Records' Is Published custrecord_course_ispublished (CUSTENTITY_BO_COURSE)
	   //subList.addField('custrecord_course_ispublished','text','Is Published');
	   var isPubVal ='No';
	   if (jobs[i].getValue('custrecord_course_ispublished','CUSTENTITY_BO_COURSE')=='T') {
		   isPubVal = 'Yes';
	   }
	   sublist.setLineItemValue('custrecord_course_ispublished', (i+1), isPubVal);
	   
	   //Course Records' Is Litho custrecord_course_islitho (CUSTENTITY_BO_COURSE)
	   //subList.addField('custrecord_course_islitho', 'text', 'Is Litho'); 
	   var isLithoVal ='No';
	   if (jobs[i].getValue('custrecord_course_islitho','CUSTENTITY_BO_COURSE')=='T') {
		   isLithoVal = 'Yes';
	   }
	   sublist.setLineItemValue('custrecord_course_islitho', (i+1), isLithoVal);
	   
	   /**** Old Method ****/
	   /**
	   // Ship To
	   var packShipTo = jobs[i].getText('custentity_bo_pack_shipto');
	   sublist.setLineItemValue('custentity_bo_pack_shipto', (i + 1),packShipTo);
	       
	   // Shipping Address
	    var shipAddress = '';
	    var recordId = '';
	    var recordType = '';
	    var isShipAddress = false;
	    switch(packShipTo){ 
	    case 'Coach address':
	       recordId= jobs[i].getValue('custentity_bo_coach');
	       recordType = 'vendor';
	       break;
	     case 'Client address':
	       recordId= jobs[i].getValue('custentity_bo_buyer');
	       recordType = 'contact';
	       break;
	     case 'Delivery address':
	        var eventAddress1 = jobs[i].getValue('custentity_bo_eventaddress1');
	        if(eventAddress1 && eventAddress1 !=''){
	            shipAddress = shipAddress +eventAddress1+', ';    
	        }
	        var eventAddress2 = jobs[i].getValue('custentity_bo_eventaddress2');
	        if(eventAddress2 && eventAddress2 !=''){
	            shipAddress = shipAddress +eventAddress2+', ';   
	        }
	       var eventCity = jobs[i].getValue('custentity_bo_eventcity');
	        if(eventCity && eventCity !=''){
	            shipAddress = shipAddress +eventCity+', ';  
	        }
	       var eventPostCode = jobs[i].getValue('custentity_bo_eventpostcode');
	        if(eventPostCode && eventPostCode !=''){
	            shipAddress = shipAddress +eventPostCode+', ';  
	        }
	       var eventState = jobs[i].getText('custentity_bo_eventstate');
	        if(eventState && eventState !=''){
	            shipAddress = shipAddress +eventState+', ';  
	        }
	       var eventCountry = jobs[i].getText('custentity_bo_eventcountry');
	        if(eventCountry && eventCountry !=''){
	            shipAddress = shipAddress +eventCountry;  
	        }
	       break;
	    }
	    if(recordId != '' && recordType != '' && shipAddress  ==''){
	        var record = nlapiLoadRecord(recordType,recordId);
	        var lineCount = record.getLineItemCount('addressbook');
	        for(var j=1;j<=lineCount;j++){
	          var defaultShipping = record.getLineItemValue('addressbook','defaultshipping',j);
	          if(defaultShipping == 'T'){
	          shipAddress  = record.getLineItemValue('addressbook','addrtext',j);
	          isShipAddress = true;
	          break;
	          }
	        }
	        if((!isShipAddress) && (lineCount)){
	          shipAddress  = record.getLineItemValue('addressbook','addrtext',1);
	        }
	        shipAddress  = shipAddress.replace(/\n/g,',');
	    }
	    sublist.setLineItemValue('custentity_bo_otheraddress', (i + 1),shipAddress);
	 	*/
	
	    
    }
  }
}