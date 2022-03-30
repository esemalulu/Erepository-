/**
 * Cloned version of Pack fulfilment to handle Process Feedback
 *
 *Sandbox // Production Field mapping
 *
 *Booking/Immediate Feedback Option (custentity_bo_optimfeedback) // Booking/Is Feedback Required (custentity_bo_optimfeedback)
 *
 * Booking/Immediate Feedback Date (custentity_imcollectdate)	//	Booking/Immediate Feedback Date (custentity_imcollectdate)
 *
 *	Booking/Is Provisional (custentity_bo_isprovisional)	// Booking/Is Provisional (custentity_bo_isprovisional)
 *
 *Booking/Item (custentity_bo_item)	// Booking/Item (custentity_bo_item)
 *
 *Item Type 2 (custitem_item_type2)	//	Item Platform (custitem_item_type2)
 *		List/Item Type 2 (customlist_item_type2) // List/Item Delivery (customlist_item_type2)
 *
 *CBL: Feedback Fulfilled by (Location) (Custom): New field in Sandbox
 * (custentity_cbl_feedbackffloc)
 *
 */

var fromDate = null, toDate=null;

var paramFeedbackSavedSearchId = '';
var paramClearDataF2fId = '';
var paramClearDataVirId = '';
var paramDefaultFeedbackStatus = '';
var parmProcMsg = '';

function packFulfilmentReport(req, res)
{

	//28/1/2015 -
	//grab and set fromDate and toDate. If Empty, default it to current month
	fromDate = req.getParameter('custpage_fromdate');
	toDate = req.getParameter('custpage_todate');
	
	//IF BOTH are null or empty, set it to default.
	if (!fromDate && !toDate) {
		
		var firstDateOfCurrDate = new Date();
		firstDateOfCurrDate.setDate(1);
		
		//set fromDate to be -1 month from firstDateofCurrDate
		fromDate = nlapiDateToString(firstDateOfCurrDate);
		
		//set toDate to be last date of THIS month
		toDate = nlapiDateToString(nlapiAddDays(nlapiAddMonths(firstDateOfCurrDate, 1), -1));
	}
	
	
	paramFeedbackSavedSearchId = nlapiGetContext().getSetting('SCRIPT','custscript_sctsb272_fbssid');
	paramClearDataF2fId = nlapiGetContext().getSetting('SCRIPT','custscript_sctsb272_cleardf2f');
	paramClearDataVirId = nlapiGetContext().getSetting('SCRIPT','custscript_sctsb272_cleardvir');
	paramDefaultFeedbackStatus = nlapiGetContext().getSetting('SCRIPT','custscript_sctsb272_fbstatus');
	
	
	// If form has been submitted and it's NOT refresh
	if (req.getMethod() == 'POST' && req.getParameter('custpage_refresh_flag') != 'T') {
	    
		//loop through and grab list of all job ID, location to process
		var fbcount = req.getLineItemCount('jobs');
		for (var i=1; i <= fbcount; i++) {
			if (req.getLineItemValue('jobs', 'jobs_procfeedback', i) == 'T') {
				
				var dateTimeVal = nlapiDateToString(new Date(), 'datetimetz');
				//TODO: Need to convert to Users' timezone value
				
				var updLocationId = req.getLineItemValue('jobs','jobs_fblocation',i);
				
				var updflds = ['custentity_bo_feedbackprocessingdate','custentity_bo_feedbackstatus','custentity_cbl_feedbackffloc'];
				var updvals = [dateTimeVal, paramDefaultFeedbackStatus, updLocationId];
				log('debug','location id',updLocationId);
				try {
					nlapiSubmitField('job', req.getLineItemValue('jobs','jobs_internalid', i), updflds, updvals, true);
					parmProcMsg += 'Successfully Updated Job #'+req.getLineItemValue('jobs','job_number',i)+'with Location ID of '+updLocationId+'<br/>';
				} catch (upderr) {
					parmProcMsg += 'Failed to Update Job #'+req.getLineItemValue('jobs','job_number',i)+'::'+getErrText(upderr)+'<br/>';
				}
				
			}
		}
	}
  
  // Get a list of jobs awaiting packs
  //var jobs = nlapiSearchRecord(null,paramFeedbackSavedSearchId,null,null);
  
  // Create the form
  var form = createForm();
  
  response.writePage(form);
}


/**
 * Create form
 * 
 * @param {Array} jobs
 */
function createForm() {
  
	// Create a new form
	var form = nlapiCreateForm('Process Feedback', false);  
    // Save button
	form.addSubmitButton('Save');
  
	form.setScript('customscript_ax_cs_procbookingfeedbhelp');
	
	//Add process value
	var procmsgfld = form.addField('custpage_procmsg', 'textarea','');
	procmsgfld.setLayoutType('outsideabove', null);
	procmsgfld.setDefaultValue(parmProcMsg);
	procmsgfld.setDisplayType('inline');
	
	// Refresh button
	var refreshFlagField = form.addField('custpage_refresh_flag', 'checkbox');
	refreshFlagField.setDisplayType('hidden');
	refreshFlagField.setDefaultValue('F');
	
	form.addButton('custpage_refresh_button', 'Refresh/Apply Filter', 'refreshSl');
	
	//add button
	form.addButton('custpage_cleardataf2fbtn','Cleardata F2F','autoSetClearData(\''+paramClearDataF2fId+'\')');
	
	form.addButton('custpage_cleardatavirtualbtn','Cleardata - Virtual','autoSetClearData(\''+paramClearDataVirId+'\')');
			  
	//28/1/2015
	//Add Date filters
	form.addFieldGroup('custpage_grpa', 'Filter By Delivery Date', null);
	var fromDateFld = form.addField('custpage_fromdate', 'date', 'From Date:', null, 'custpage_grpa');
	fromDateFld.setMandatory(true);
	fromDateFld.setDefaultValue(fromDate);
	fromDateFld.setBreakType('startcol');
	
	var toDateFld = form.addField('custpage_todate', 'date', 'From Date:', null, 'custpage_grpa');
	toDateFld.setMandatory(true);
	toDateFld.setDefaultValue(toDate);
	toDateFld.setBreakType('startcol');
	
	// Job list
	var subList = form.addSubList('jobs', 'list', 'Process Booking Feedback');
	subList.addField('jobs_procfeedback', 'checkbox', 'Process');
  
	var jobIdField = subList.addField('jobs_internalid', 'text', 'ID');
	jobIdField.setDisplayType('hidden'); 
  
	subList.addField('jobs_fblocation', 'select', 'Location', 'location');
  
	subList.addField('job_number', 'text', 'Job #');
	
	subList.addField('job_status', 'text', 'Status');
	
	subList.addField('job_eventtime', 'text', 'Event Time');
	
	subList.addField('job_deliverydate', 'date', 'Delivery Date');
	
	subList.addField('job_client', 'text', 'Client');
	subList.addField('job_clientid', 'text', 'Client ID').setDisplayType('hidden');
	
	subList.addField('job_coach', 'text', 'Coach');
	subList.addField('job_coachid', 'text', 'Coach ID').setDisplayType('hidden');
	
	subList.addField('job_item', 'text', 'Item');
	subList.addField('job_itemid', 'text', 'Item ID').setDisplayType('hidden');
	
	//Booking Type: jobtype
	subList.addField('job_jobtype', 'text', 'Type');
	
	subList.addField('job_course', 'text', 'Course');
	subList.addField('job_courseid', 'text', 'Course ID').setDisplayType('hidden');
	
	//subList.addField('job_itemreqfeedback', 'text', 'Item Requires Feedback?');
	
	//subList.addField('job_delreqfeedback', 'text', 'Delivery Requires Feedback?');
	
	subList.addField('job_owner', 'text', 'Co-ordinator');
	subList.addField('job_ownerid', 'text', 'Co-ordinator ID').setDisplayType('hidden');
	
	subList.addField('job_city', 'text', 'City');
	
	subList.addField('job_country', 'text', 'Country');
	
	subList.addField('job_subsidiary', 'text', 'Subsidiary');
	subList.addField('job_subsidiaryid', 'text', 'Subsidiary ID').setDisplayType('hidden');
	
	subList.addField('job_ispublished', 'text', 'Is Published');
	
	//Execute the search and populate the value
	//28/1/2015 - Add in Date Filter to the search criteria
	var dlflt = [new nlobjSearchFilter('enddate', null, 'within', fromDate, toDate)];
	var frs = nlapiSearchRecord(null,paramFeedbackSavedSearchId, dlflt, null);
	var line = 1;
	for (var i=0; frs && i < frs.length; i++) {
		subList.setLineItemValue('jobs_internalid', line, frs[i].getId());
		subList.setLineItemValue('job_number', line, frs[i].getValue('entityid'));
		subList.setLineItemValue('job_status', line, frs[i].getText('entitystatus'));
		subList.setLineItemValue('job_deliverydate', line, frs[i].getValue('enddate'));
		subList.setLineItemValue('job_coach', line, frs[i].getText('custentity_bo_coach'));
		subList.setLineItemValue('job_coachid', line, frs[i].getValue('custentity_bo_coach'));
		subList.setLineItemValue('job_client', line, frs[i].getText('customer'));
		subList.setLineItemValue('job_clientid', line, frs[i].getValue('customer'));
		subList.setLineItemValue('job_item', line, frs[i].getText('custentity_bo_item'));
		subList.setLineItemValue('job_itemid', line, frs[i].getValue('custentity_bo_item'));
		subList.setLineItemValue('job_course', line, frs[i].getText('custentity_bo_course'));
		subList.setLineItemValue('job_courseid', line, frs[i].getValue('custentity_bo_course'));
		subList.setLineItemValue('job_jobtype', line, frs[i].getText('jobtype'));
		
		//subList.setLineItemValue('job_itemreqfeedback', line, frs[i].getValue('custitem_job_optimfeedback','CUSTENTITY_BO_ITEM'));
		
		//subList.setLineItemValue('job_delreqfeedback', line, frs[i].getValue('custentity_bo_optimfeedback'));
		
		subList.setLineItemValue('job_owner', line, frs[i].getText('custentity_bo_owner'));
		subList.setLineItemValue('job_ownerid', line, frs[i].getValue('custentity_bo_owner'));
		
		subList.setLineItemValue('job_city', line, frs[i].getValue('custentity_bo_eventcity'));
		
		subList.setLineItemValue('job_country', line, frs[i].getText('custentity_bo_eventcountry'));
		
		subList.setLineItemValue('job_subsidiary', line, frs[i].getText('subsidiarynohierarchy'));
		subList.setLineItemValue('job_subsidiaryid', line, frs[i].getValue('subsidiarynohierarchy'));
		
		subList.setLineItemValue('job_eventtime', line, frs[i].getValue('custentity_bo_eventtime'));
		
		subList.setLineItemValue('job_ispublished', line, frs[i].getValue('custrecord_course_ispublished','CUSTENTITY_BO_COURSE'));
		
		
		line++;
	}
	
	return form;
}

/*************************** Client Side Scripts *****************************************/

//Check first 30 lines
function feedbackSlPageInit(type) {
	
	for (var j=1; j <= nlapiGetLineItemCount('jobs'); j++) {
		if (j <= 30) {
			nlapiSetLineItemValue('jobs','jobs_procfeedback',j,'T');
		} else {
			break;
		}
	}
	
}

/**
 * Validation to make sure all selection has required location value
 * and also to limit selection up to 30
 * 
 */
function feedbackSlOnSave() {
	//loop through each line and run validation check
	//Break out if ONE line doesn't meet the requirement
	
	var totalSelected = 0;
	for (var j=0; j <= nlapiGetLineItemCount('jobs'); j++) {
		if (nlapiGetLineItemValue('jobs','jobs_procfeedback',j)=='T') {
			totalSelected++;
		}
	}
	
	if (totalSelected > 30) {
		alert('You have selected more than 30 Jobs to process (Total Selected: '+totalSelected+'). You can ONLY process 30 records at a time');
		return false;
	}
	
	//12/20/2014 - When nothing is selected Return ERROR
	if (totalSelected == 0) {
		alert('You must select atleast one Job to process. You can process up to 30 jobs at once');
		return false;
	}
	
	for (var j=0; j <= nlapiGetLineItemCount('jobs'); j++) {
		if (nlapiGetLineItemValue('jobs','jobs_procfeedback',j)=='T') {
			var JobNumber = nlapiGetLineItemValue('jobs','job_number', j);
			
			//if location isn't set, return out Error
			if (!nlapiGetLineItemValue('jobs','jobs_fblocation',j)) {
				alert('Selected Job #'+JobNumber+' on line '+j+' is missing Location.');
				return false;
			}
		}
	}
	
	return true;
}

function refreshSl() {
	document.main_form.custpage_refresh_flag.value = 'T';
	window.ischanged = false;
	document.main_form.submit();
}

function autoSetClearData(locId) {
	var packLineCount = nlapiGetLineItemCount('jobs');
	for (var i=1; i <= packLineCount; i++) {
		//see if line is checked
		if (nlapiGetLineItemValue('jobs','jobs_procfeedback', i) == 'T') {
			nlapiSetLineItemValue('jobs', 'jobs_fblocation', i, locId);
		}
	}
}
