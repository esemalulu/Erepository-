/**
* Custom forms
*/
//var CUSTOMFORM_JOB_TRAINING_COURSE = '18';

/**
* Job statuses
*/

/*
var JOB_STATUS_PENDING_ZONE = '43';
var JOB_STATUS_PENDING_COURSE = '44';
var JOB_STATUS_PENDING_LOCATION = '45';
var JOB_STATUS_PENDING_COACH = '28';
var JOB_STATUS_PENDING_PREPACK = '33';
var JOB_STATUS_PENDING_PACK = '34';
var JOB_STATUS_PENDING_INVITES = '49';
var JOB_STATUS_PENDING_BRIEF = '46';
var JOB_STATUS_PENDING_DELIVERY = '35';
var JOB_STATUS_PENDING_ONLINE_REGISTRATIONS = '50'; // Pending Eprompts
var JOB_STATUS_PENDING_IMMEDIATE_FEEDBACK = '40';
var JOB_STATUS_PENDING_ELAPSED_FEEDBACK = '41';
var JOB_STATUS_COMPLETED = '42';
var JOB_STATUS_CANCELLED = '37';
var JOB_STATUS_PROVISIONAL = '66';
*/

/**
* Email Message statuses
*/
/*
var EMAILMESSAGE_STATUS_NOTSENT = '1';
var EMAILMESSAGE_STATUS_SENT = '2';
*/

/*Addresses used to send alert when the booking date is change when it is cirrently in the past*/
/*
var EMAILTO = 53620; // Rich Hodgson
var EMAILFROM = -5; // netsuite@themindgym.com
*/

/**
* User roles
*/
/*
var SWEET_ROLE_ADMINISTRATOR = '3';
var SANDBOX = nlapiGetRole() == SWEET_ROLE_ADMINISTRATOR;
*/

// -----------------------------------------------------------------------------------------------------------------------------------------------------SECTION 1


/*
* Feedback status
*/
var FEEDBACK_STATUS_COMPLETED = '4';

/**
* Globals
*/
var recordFields = new Array();
var revRecOldDate;
var revRecNewDate;

var revRecEmails = nlapiGetContext().getSetting('SCRIPT','custscript_rev_rec_emails');

/**
* Before Load
*
* @param {String} type
* @param {Object} form
* @return {Void}
*/
function userevent_beforeLoad(type, form) {


    type = type.toLowerCase();

	//Booking Builder Related 
	if (type == 'create' && nlapiGetContext().getExecutionContext()=='userinterface') {		
		form.addButton(
			'custpage_oppconfigbtn',
			'Booking Builder', 
			'openBookingBuild()'
		);   
	}




    var currentContext = nlapiGetContext();
    if (currentContext.getExecutionContext() != 'userinterface') {
        return;
    }

    var coachAddress = nlapiGetFieldValue('custentity_bo_coachaddr');
    if(coachAddress && coachAddress.length > 0)
    {
        coachAddress = coachAddress.replace(/, ,/g,',');
        if(type == 'view')
            var addr = coachAddress.replace(/,/g,'<br>');
        else
            var addr = coachAddress.replace(/,/g,'\n');

        nlapiSetFieldValue('custentity_bo_coachaddr', addr);
    }

        
    switch (type) {
        case 'view':
            //form_addMainButtons(form);
        	//Ticket 2387 
        	//3/21/2015
            //In VIEW Mode, check to amke sure job type is face to face, license, virtual
        	if (nlapiGetFieldValue('jobtype')=='11' || nlapiGetFieldValue('jobtype')=='12' || nlapiGetFieldValue('jobtype')=='13') {
        		form_addJobAttachmentsButton(form);
        	}            
            //form_addParticipantsList(form);
            //form_addTransactionsList(form);
            //form_initLocationFields(form);
            //form_initSiteContactFields(form);
            break;
        case 'edit':
        	//Ticket 2387 
        	//3/21/2015
            //In EDIT Mode check to make sure FORM being used is New Booking
        	//TODO: MUST Change after new FORM is added
        	
            var newBookingFormId = '124'; //New Booking 84
        	if (nlapiGetFieldValue('customform') == newBookingFormId) {
        		form_addJobAttachmentsButton(form);
        	}
            //form_addParticipantsList(form);
            //form_addTransactionsList(form);
            form_addTimeZonesField(form);
            //form_initLocationFields(form);
            //form_initSiteContactFields(form);
            break;
        case 'create':
            form_addTimeZonesField(form);
            //form_initLocationFields(form);
            //form_initSiteContactFields(form);
            break
    }
}

/**
* Before Submit
*
* @todo REFACTOR
* @return {Void}
*/
function userevent_beforeSubmit(type) {

// Added this to fix the 'Pending Brief' status issue with workflows.
 var coachBriefFld;
  if(type != 'xedit')
    coachBriefFld = nlapiGetFieldValue('custentity_bo_coachbrief');
  else
    coachBriefFld = nlapiLookupField(nlapiGetRecordType(),nlapiGetNewRecord().getId(),'custentity_bo_coachbrief');
  var isBriefEntered = sweet_job_lib_isSet(coachBriefFld);
  if(isBriefEntered){
    nlapiSetFieldValue('custentity_coach_brief_isempty', 'T');
  } else {
    nlapiSetFieldValue('custentity_coach_brief_isempty', 'F');
  }


    // Set time zone
    var customTimeZoneId = nlapiGetFieldValue('custpage_timezone');
    if (customTimeZoneId) {
        var timeZoneId = nlapiGetFieldValue('custentity_bo_eventtimezone');

        if (customTimeZoneId != timeZoneId) {
            nlapiSetFieldValue('custentity_bo_eventtimezone', customTimeZoneId);
        }
    }

    sweet_job_lib_updateAddressFields();
}

/**
* After Submit
*
* @return {Void}
*/
function userevent_afterSubmit(type) {

/**
* Script parameter on the Job Server script that allows the entry of all the users that
* should be notified of any changes made to the Booking Date and is associated Sales Order
*/

	if(nlapiGetFieldValue('custentity_bo_coachfeecurrency')){
		
		//Eli - Sept 23 2016 - Ticket 12756 - Source the Amount(custrecord_coachfee_amount) from the "COACH FEE" Custom record to the Bookings "COACH FEE SOURCED" field
		var feeFilters = [new nlobjSearchFilter('custrecord_coachfee_item', null, 'anyof', nlapiGetFieldValue('custentity_bo_item')),
						  new nlobjSearchFilter('custrecord_coachfee_issubsequent',null, 'is', nlapiGetFieldValue('custentity_bo_issubsequent')),
						  new nlobjSearchFilter('custrecord_coachfee_currency', null, 'anyof', nlapiGetFieldValue('custentity_bo_coachfeecurrency'))];
									
		var feeColumns = [new nlobjSearchColumn('id'),
						  new nlobjSearchColumn('custrecord_coachfee_amount')];

		var lscr = nlapiSearchRecord ('customrecord_coachfee', null, feeFilters, feeColumns);	

		if(lscr){				
			var amt = lscr[0].getValue(feeColumns[1]);
			nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId() , 'custentity_bo_coachfeesourced', amt ); 		
		}
		else{
			nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId() , 'custentity_bo_coachfeesourced', 0.00 ); 			
		}	
	}

	//Eli - Mar 06 2016 - Set the COACH FEE FX field based on if the Booking "Is Provisional" or not using either the Transactions or Customers Currency 	
	//if(rec.getFieldValue('entitystatus') != '37') // Does not equal "Cancelled (37)"
			
		if( nlapiGetFieldValue('custentity_bo_coachfee2') && nlapiGetFieldValue('custentity_bo_coachfeecurrency') && nlapiGetFieldValue('custentity_bo_coachinvoicecurrency')){
			
			var coachFee = nlapiGetFieldValue('custentity_bo_coachfee2'),
			coachFeeCurrency = nlapiGetFieldValue('custentity_bo_coachfeecurrency'),
			coachInvCurr = nlapiGetFieldValue('custentity_bo_coachinvoicecurrency'),								
			entityDate = nlapiGetFieldValue('enddate'),			
			fxRate = nlapiExchangeRate(coachFeeCurrency, coachInvCurr, entityDate);
														
			nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId() , 'custentity_bo_coachfeefx', (coachFee*fxRate).toFixed(2));		
		}		
	
//----------------------------------------------
    type = type.toLowerCase();

    switch (type) {
        case 'create':
        	//6/29/2014 
            //Mod:CodeBox JSON
            //Only queue up schedule IF Course and Coach is entered
        	nlapiLogExecution('debug','Booking Create Trigger','Coach: '+nlapiGetFieldValue('custentity_bo_coach')+' // Course: '+nlapiGetFieldValue('custentity_bo_course'));
        	if (nlapiGetFieldValue('custentity_bo_coach') || nlapiGetFieldValue('custentity_bo_course')) {
        		afterSubmit_scheduleCalendarEventScript(type);
        	}
            
            break;
        case 'edit':
	
        	//nlapiLogExecution('debug','About to fire booking for edit',nlapiGetRecordId());
            afterSubmit_scheduleCalendarEventScript(type);
			
            //TODO: We need to STOP using this process: June 19th 2015 Notification sent

				nlapiLogExecution('DEBUG', 'Date', revRecEmails);	

				//afterSubmit_updateTransactions();				
				var fields = getChangedSyncFields();
				
				if (fields) {
					updateTransactionLineItems(fields);
				}				
			
            break;
        case 'delete':
            afterSubmit_scheduleCalendarEventScript(type);
            break;
        case 'xedit':
        	
        	//6/29/2014 
            //Mod:CodeBox JSON
            //Only queue up schedule IF XEDIT (inline edit) field contains following:
            
        	var calendarTriggerFields = ['enddate', // Date
        	                             'custentity_bo_course', // Course
        	                             'custentity_bo_eventtime', // Exact Time
        	                             'custentity_bo_eventtimezone', // Event Time Zone (Hidden on the form)
        	                             'entityid' // Booking No. 
        	                             ];
        	//for inline edit, grab the fields that was edited. usually one or two
        	var editedFields = nlapiGetNewRecord().getAllFields();
            //loop through each editedFields and see if it needs to trigger schedule
        	for (var e=0; editedFields && e < editedFields.length; e++) {
        		if (calendarTriggerFields.indexOf(editedFields[e]) > -1) {
        			afterSubmit_scheduleCalendarEventScript(type);
        			break;
        		}
        	}
        	
        	nlapiLogExecution('debug','out of schedule check','updateInlineEditTrx about to fire');
        	
        	//TODO: We need to STOP using this process: June 19th 2015 Notification sent
        	afterSubmit_updateInlineEditTransactions();
            break;
    }
	
		
	
}


// -----------------------------------------------------------------------------------------------------------------------------------------------------SECTION 2 


/**
* Return record field value
*
* This function will ALWAYS return ALL values regardless of the execution
* enviroment.
*
* @param {String} name
* @return {Mixed}
*/
function sweet_getFieldValue(name) {
    return recordFields[name];
}


/**
* String helper function
*
* @param {String}
* @return {String}
*/
function nullToString(field) {
    return field == null ? '' : field;
}

/*
function form_addMainButtons(form) {

    var status = nlapiGetFieldValue('entitystatus');
    var jobId = nlapiGetRecordId();

    // Defaults
    var packBtn = false;
    var prePackBtn = false;
    var deliverBtn = false;
    var participantsBtn = false;
    var onlineBtn = false;
    var immediateFeedbackBtn = false;
    var elapsedFeedbackBtn = false;
    var isDelivered = (nlapiGetFieldValue('custentity_bo_isdelivered') == 'T');
    var cancelBtn = !isDelivered; // Can't cancel if service has been delivered

    switch (status) {
        case JOB_STATUS_PENDING_COACH:
            break;
        case JOB_STATUS_PENDING_PREPACK:
            prePackBtn = true;
            break;
        case JOB_STATUS_PENDING_PACK:
            packBtn = true;
            break;
        case JOB_STATUS_PENDING_DELIVERY:
            deliverBtn = true;
            break;
        case JOB_STATUS_CANCELLED:
            cancelBtn = false;
            break;
        case JOB_STATUS_PENDING_IMMEDIATE_FEEDBACK:
            immediateFeedbackBtn = true;
            break;
        case JOB_STATUS_PENDING_ELAPSED_FEEDBACK:
            elapsedFeedbackBtn = true;
            break;
        case JOB_STATUS_PENDING_ONLINE_REGISTRATIONS:
            onlineBtn = true;
            break;
    }

    // Pre-pack button
    if (prePackBtn) {
        var url = nlapiResolveURL('SUITELET', 'customscript_job_booking_helper', 'customdeploy_job_booking_helper', false);
        url += '&action=prepack&jobid=' + jobId;
        var onClick = "window.location.href='" + url + "'";
        form.addButton('custpage_job_prepackbtn', 'Pre-pack', onClick);
    }

    // Pack button
    if (packBtn) {
        var url = nlapiResolveURL('SUITELET', 'customscript_job_booking_helper', 'customdeploy_job_booking_helper', false);
        url += '&action=pack&jobid=' + jobId;
        var onClick = "window.location.href='" + url + "'";
        form.addButton('custpage_job_packbtn', 'Pack', onClick);
    }

    // Deliver button
    if (deliverBtn) {
        var url = nlapiResolveURL('SUITELET', 'customscript_job_booking_helper', 'customdeploy_job_booking_helper', false);
        url += '&action=deliver&jobid=' + jobId;
        var onClick = "window.location.href='" + url + "'";
        form.addButton('custpage_job_deliverbtn', 'Deliver', onClick);
    }

    // Register Participants button
    if (onlineBtn) {
        var url = nlapiResolveURL('SUITELET', 'customscript_pa_bulkentry_form', 'customdeploy_pa_bulkentry_form', false);
        url += '&jobid=' + jobId;
        var onClick = "window.location.href='" + url + "'";
        form.addButton('custpage_job_onlinebtn', 'Register Participants', onClick);
    }

    // Immediate Feedback button
    if (immediateFeedbackBtn) {
        var url = "https://admin.themindgym.com/surveys/110691333/collectors/new?booking_netsuite_id=" + jobId;
        var onClick = "window.location.href='" + url + "'";
        form.addButton('custpage_job_imfeedbackbtn', 'Enter Feedback', onClick);
    }

    // Elapsed Feedback button
    if (elapsedFeedbackBtn) {
        var url = nlapiResolveURL('SUITELET', 'customscript_job_booking_helper', 'customdeploy_job_booking_helper', false);
        url += '&action=elfeedback&jobid=' + jobId;
        var onClick = "window.location.href='" + url + "'";
        form.addButton('custpage_job_elfeedbackbtn', 'Elapsed Feedback', onClick);
    }

    // Cancel button
    if (cancelBtn) {
        var url = nlapiResolveURL('SUITELET', 'customscript_job_cancellation_form', 'customdeploy_job_cancellation_form', false);
        url += '&job=' + jobId;
        var onClick = "window.location.href='" + url + "'";
        form.addButton('custpage_job_cancelbtn', 'Cancel', onClick);
    }
}
*/
function form_addJobAttachmentsButton(form) {

    var jobId = nlapiGetRecordId();
    var field = form.addField('custpage_job_attachmentslink', 'inlinehtml', 'null', null, 'custom86');
    var url = nlapiResolveURL('SUITELET', 'customscript_job_attachment_suitelet', 1, null) + '&job_id=' + jobId;
    var onClick = "nlOpenWindow('" + url + "', 'custom_EDIT_popup', 'width=500,height=300,resizable=yes,scrollbars=yes')";

    // Get list of attachment associated with this job
    var filters = new Array();
    filters.push(new nlobjSearchFilter('custrecord_jat_job', null, 'is', jobId));

    var columns = new Array();
    columns.push(new nlobjSearchColumn('custrecord_jat_name'));
    columns.push(new nlobjSearchColumn('custrecord_jat_url'));

    var attachments = nlapiSearchRecord('customrecord_jobattachment', null, filters, columns);
    var html = new Array();

    if (attachments) {
       // var i = 0, n = attachments.length;
        for (var i = 0; i < attachments.length; i++) 
		{			
            var fileName = attachments[i].getValue('custrecord_jat_name');
            var fileUrl = attachments[i].getValue('custrecord_jat_url');
            html.push('<a href="' + fileUrl + '" target="_blank">' + fileName + '</a>');
        }
    }

    field.setDefaultValue('<div style="border-radius:3px; width: 160px; height: 16px; margin-bottom: 30px; "><input  style=" border-radius: 3px; border: solid #000000 1px;  background: #e6e9eb; font-size: 12px;" class="nlinlineeditbutton" type="button" onclick="' + onClick + '" value="Click to Add/Remove Attachment Files:" />&nbsp;<span id="sweet-attachments">' + html.join(', ') + '</span></div>');
    field.setLayoutType('normal', 'startcol');
    form.insertField(field, 'custentity_bo_coachbrief');
}
/*
function form_addParticipantsList(form) {

    // Create URL to entry form
    var attendanceLink = form.addField('custpage_paat_link', 'inlinehtml', null, null, 'custom71');
    var linkURL = nlapiResolveURL('SUITELET', 'customscript_pa_bulkentry_form', 'customdeploy_pa_bulkentry_form', null) + '&jobid=' + nlapiGetRecordId();
    attendanceLink.setDefaultValue('&raquo; <a href="' + linkURL + '">Add or Remove participants</a>');

    // Add a list to the Participants tabs
    var attendanceList = form.addSubList('custpage_pasublist', 'list', 'Attendance', 'custom71');

    // Create list header fields
    attendanceList.addField('custrecord_paat_firstname', 'text', 'First name');
    attendanceList.addField('custrecord_paat_lastname', 'text', 'Last name');
    attendanceList.addField('custrecord_paat_email', 'email', 'Email');

    // Populate the list with data
    var filters = new Array();
    filters.push(new nlobjSearchFilter('custrecord_paat_job', null, 'is', nlapiGetRecordId()));

    var columns = new Array();
    columns.push(new nlobjSearchColumn('custrecord_paat_firstname'));
    columns.push(new nlobjSearchColumn('custrecord_paat_lastname'));
    columns.push(new nlobjSearchColumn('custrecord_paat_email'));

    var searchResults = nlapiSearchRecord('customrecord_participantattendance', null, filters, columns);
    attendanceList.setLineItemValues(searchResults);
}
*/

function form_addTransactionsList(form) {

    var transactionList = form.addSubList('custpage_transsublist', 'list', 'Transactions', 'general');

    // Create list header fields
    var tranUrlField = transactionList.addField('custrecord_tranurl', 'text', 'View');
    transactionList.addField('trandate', 'text', 'Date');
    transactionList.addField('type_display', 'text', 'Type');
    transactionList.addField('tranid', 'text', 'Number');

    // Populate the list with data
    var filters = new Array();
	

	
    filters.push(new nlobjSearchFilter('internalid', 'job', 'is', nlapiGetRecordId()));	
    //filters.push(new nlobjSearchFilter('id', 'job', 'any', nlapiGetRecordId()));
	
    var columns = new Array();
    columns.push(new nlobjSearchColumn('trandate'));
    columns.push(new nlobjSearchColumn('tranid'));
    columns.push(new nlobjSearchColumn('type'));
    columns.push(new nlobjSearchColumn('internalid'));

    var searchResults = nlapiSearchRecord('transaction', null, filters, columns);
	
    if (searchResults) {
        transactionList.setLineItemValues(searchResults);
        //var i = 0; n = searchResults.length;
        for (var i = 0; i < searchResults.length; i++) {
            var tranUrl = nlapiResolveURL('RECORD', searchResults[i].getRecordType(), searchResults[i].getId());
            transactionList.setLineItemValue('custrecord_tranurl', (i + 1), "<a target='_blank' href='" + tranUrl + "'>View</a>");
        }
    }
}

function form_addTimeZonesField(form) {

    // Add custom time zone field
    var field = form.addField('custpage_timezone', 'select', 'Time Zone');
    field = form.insertField(field, 'custentity_bo_eventtimezone');

    // Hide standard time zone field
    form.getField('custentity_bo_eventtimezone').setDisplayType('hidden');

    var optVirtualEvent = (nlapiGetFieldValue('custentity_bo_virtualevent') == 'T'); // Virtual event
    var countryId = nlapiGetFieldValue('custentity_bo_eventcountry');

    if (!countryId && !optVirtualEvent) {
        field.addSelectOption('', ' - Select country first - ', true);
        return;
    }

    var timeZoneId = nlapiGetFieldValue('custentity_bo_eventtimezone');
    timeZoneId = timeZoneId || null;

    if (optVirtualEvent) {
        // Show all time zones
        var timeZones = getAllTimeZones(timeZoneId);
    } else {
        // Populate field with time zones based on country
        var timeZones = getTimeZonesByCountryId(countryId, timeZoneId, true);
        if (!timeZones) {
            timeZones = getAllTimeZones(timeZoneId); // ...show all entries
        }
    }

    var selected = timeZones.length == 1; // If single choice, select this by default

    if (!selected) {
        field.addSelectOption('', ' - Select time zone - ', true);
    }
    //var i = 0, n = timeZones.length;
    for (var i = 0; i < timeZones.length; i++) {
        field.addSelectOption(timeZones[i].id, timeZones[i].name, timeZones[i].selected || selected);
    }
}

/*
function form_initLocationFields(form) {

    // Hide address details if this is a virtual event
    var optVirtualEvent = (nlapiGetFieldValue('custentity_bo_virtualevent') == 'T');
    if (optVirtualEvent) {
        form.getField('custentity_bo_eventaddress1').setDisplayType('hidden');
        form.getField('custentity_bo_eventaddress2').setDisplayType('hidden');
        form.getField('custentity_bo_eventcity').setDisplayType('hidden');
        form.getField('custentity_bo_eventpostcode').setDisplayType('hidden');
        form.getField('custentity_bo_eventadoverride').setDisplayType('hidden');
        form.getField('custentity_bo_eventaddress').setDisplayType('hidden');
    }

    // Only display free-text address field for legacy purposes
    form.getField('custentity_bo_eventadoverride').setDisplayType('hidden');
    form.getField('custentity_bo_eventaddress').setDisplayType('hidden');
    if (nlapiGetFieldValue('custentity_bo_eventadoverride') == 'T' ||
      nlapiGetFieldValue('custentity_bo_eventaddress')) {
        form.getField('custentity_bo_eventadoverride').setDisplayType('normal');
        form.getField('custentity_bo_eventaddress').setDisplayType('normal');
    }
}

function form_initSiteContactFields(form) {

    // Hide primary/secondary (legacy) site contact fields by default
    form.getField('custentity_bo_primarysitecontact').setDisplayType('hidden');
    form.getField('custentity_bo_secondarysitecontact').setDisplayType('hidden');

    var primary = nlapiGetFieldValue('custentity_bo_primarysitecontact');
    var secondary = nlapiGetFieldValue('custentity_bo_secondarysitecontact');

    if (primary || secondary) {
        form.getField('custentity_bo_primarysitecontact').setDisplayType('normal');
        form.getField('custentity_bo_secondarysitecontact').setDisplayType('normal');
    }
}
*/

/**
 Update transactions associated with this job record

 @todo This code should be moved into a scheduled script
 @return {Void}

function afterSubmit_updateTransactions() {
    var fields = getChangedSyncFields();
	
    if (fields) {
        updateTransactionLineItems(fields);
    }
}
*/

/**
* Schedule script which will update calendar events associated with this job
*
* @param {String} type  User event type
* @return {Void}
*/
function afterSubmit_scheduleCalendarEventScript(type) {

	//3/21/2015 -
    //Cause of schedule script failure was discovered
    //There are 21 unscheduled script deployments that can be used. This means upt 21 scheduled scripts can be queued up simultaneously. 
    //However, There are other scheduled script that runs to take action against BOOKING record.
    //	When Scheduled script triggers this user event and more than 21 booking records are touched, remaining booking records touched by 
    //	this Same process will Failed to get queued up. This is because MindGym does NOT have SuiteCloud licence. 
    //	Work round in this case is ONLY trigger the job when:
    //		1. User Interface ONLY
    //		OR
    //		2. Scheduled script with CREATE action ONLY.
    //			Booking record can be created but automated process.
    if (nlapiGetContext().getExecutionContext()=='userinterface' || (type == 'create' && nlapiGetContext().getExecutionContext()=='scheduled')) {
    	
	    var params = {};
	    params['custscript_type'] = type;
	    params['custscript_job'] = nlapiGetRecordId();		
nlapiLogExecution('DEBUG', 'Parameters ', params );	    
		
		
	    var status = nlapiScheduleScript('customscript_job_calendarevent_scheduled', null, params);
nlapiLogExecution('DEBUG', 'Parameters ', status );
	
	    // Dump vars for debugging
	    var dump = '(';
	    dump += 'status: ' + status + ', ';
	    dump += 'custscript_type: ' + params['custscript_type'] + ', ';
	    dump += 'custscript_job: ' + params['custscript_job'];
	    dump += ')';
	
	    if (status != 'QUEUED') {
	        nlapiLogExecution('DEBUG', 'Info', 'Failed to schedule calendar event script. ' + dump);
	        nlapiCreateError('SWEET_SCHEDULESCRIPT_FAILED', 'Failed to schedule calendar event script. ' + dump);
	        
	        //Only when it's UI or Scheduled Script send notificatio of filure.
	        //Or send to Jon Dray.
	        //3/20/2015 - Add in email notification to user that it failed and instruction to re-save
	        //Modifying it to ONLY generate for Create failure
	        
	        var emailSendTo = nlapiGetContext().getUser();			
			
	        var ccEmail = ['joe.son@audaxium.com','jon.dray@themindgym.com'];
	        var ssSbj = 'Failed to Trigger Creation of Calendar Event Script - '+nlapiGetContext().getExecutionContext();
	        var ssMsg = 'Booking Record Internal ID: '+nlapiGetRecordId()+' Failed to trigger script to create calendar.  Please EDIT booking record and Save again<br/><br/>'+dump;
	        var entityRecs = new Object();
	        entityRecs['entity'] = nlapiGetRecordId();
			
			if(emailSendTo)
			{
				nlapiSendEmail(-5, emailSendTo, ssSbj, ssMsg, ccEmail, null, entityRecs, null);				
			}	
			else
			{
				nlapiLogExecution('DEBUG', 'The user'+nlapiGetUser()+'does not have an email');	
			}
				
	        
	    } 
		else 
		{
	        nlapiLogExecution('DEBUG', 'Info', 'Successfully scheduled calendar event script. ' + dump);
	    }
    }
}

/**
* Update transactions associated with this job record through inline editing
*
*/

function afterSubmit_updateInlineEditTransactions() {
    var fields = getChangedInlineEditSyncFields();
    if (fields) {
        updateTransactionLineItems(fields);
    }
}


/**
* Get the synchronized fields when edit jod through inline editing
*
*/
function getChangedInlineEditSyncFields() {
	var fields = new Array();
	var values = new Array();
	var field = nlapiGetNewRecord().getAllFields();
	
	for(var i=0; i<field.length;i++){
		switch (field[i]) {
			case 'custentity_bo_eventaddress1':
				fields.push('custcol_bo_address1');
				values.push(nullToString(nlapiGetFieldValue('custentity_bo_eventaddress1')));
				break;

			case 'custentity_bo_eventaddress2':
				fields.push('custcol_bo_address2');
				values.push(nullToString(nlapiGetFieldValue('custentity_bo_eventaddress2')));
				break;

			case 'custentity_bo_eventpostcode':
				fields.push('custcol_bo_postcode');
				values.push(nullToString(nlapiGetFieldValue('custentity_bo_eventpostcode')));
				break;

			case 'custentity_bo_eventstate':
				fields.push('custcol_bo_state');
				values.push(nullToString(nlapiGetFieldValue('custentity_bo_eventstate')));
				break;

			case 'custentity_bo_eventcountry':
				fields.push('custcol_bo_country');
				values.push(nullToString(nlapiGetFieldValue('custentity_bo_eventcountry')));
				break;

			case 'custentity_bo_eventtime':
				fields.push('custcol_bo_time');
				values.push(nullToString(nlapiGetFieldValue('custentity_bo_eventtime')));
			        break;

			case 'custentity_bo_approxtime':
				fields.push('custcol_bo_approxtime');
				values.push(nullToString(nlapiGetFieldValue('custentity_bo_approxtime')));
			        break;

			case 'custentity_bo_course':
				fields.push('custcol_bo_course');
				values.push(nullToString(nlapiGetFieldValue('custentity_bo_course')));
				break;

			case 'enddate':
				fields.push('custcol_bo_date');
				values.push(nullToString(nlapiGetFieldValue('enddate')));
				break;

			case 'custentity_bo_eventstate':
				fields.push('custcol_bo_state');
				values.push(nullToString(nlapiGetFieldValue('custentity_bo_eventstate')));
				break;

		}
	}
    return fields ? new Array(fields, values) : null;
}


/**
*
* @todo Is there no easier way of doing this? What about just using nlapiGetOldRecord?
* @return {Void}
*/
function getChangedSyncFields() {

    var fields = new Array();
    var values = new Array();

    // New record
    var newRecord = nlapiGetNewRecord();

    // Old record
    var oldRecord = nlapiGetOldRecord();

    // address1
    var newAddress1 = nullToString(newRecord.getFieldValue('custentity_bo_eventaddress1'));
    var oldAddress1 = nullToString(oldRecord.getFieldValue('custentity_bo_eventaddress1'));
    if (newAddress1 != undefined && newAddress1 != oldAddress1) {
        fields.push('custcol_bo_address1');
        values.push(newAddress1);
    }

    // address2
    var newAddress2 = nullToString(newRecord.getFieldValue('custentity_bo_eventaddress2'));
    var oldAddress2 = nullToString(oldRecord.getFieldValue('custentity_bo_eventaddress2'));
    if (newAddress2 != undefined && newAddress2 != oldAddress2) {
        fields.push('custcol_bo_address2');
        values.push(newAddress2);
    }

    // city
    var newCity = nullToString(newRecord.getFieldValue('custentity_bo_eventcity'));
    var oldCity = nullToString(oldRecord.getFieldValue('custentity_bo_eventcity'));
    if (newCity != undefined && newCity != oldCity) {
        fields.push('custcol_bo_city');
        values.push(newCity);
    }

    // postcode
    var newPostcode = nullToString(newRecord.getFieldValue('custentity_bo_eventpostcode'));
    var oldPostcode = nullToString(oldRecord.getFieldValue('custentity_bo_eventpostcode'));
    if (newPostcode != undefined && newPostcode != oldPostcode) {
        fields.push('custcol_bo_postcode');
        values.push(newPostcode);
    }

    // state
    var newState = nullToString(newRecord.getFieldValue('custentity_bo_eventstate'));
    var oldState = nullToString(oldRecord.getFieldValue('custentity_bo_eventstate'));
    if (newState != undefined && newState != oldState) {
        fields.push('custcol_bo_state');
        values.push(newState);
    }

    // country
    var newCountry = nullToString(newRecord.getFieldValue('custentity_bo_eventcountry'));
    var oldCountry = nullToString(oldRecord.getFieldValue('custentity_bo_eventcountry'));
    if (newCountry != undefined && newCountry != oldCountry) {
        fields.push('custcol_bo_country');
        values.push(newCountry);
    }

    // date
    var newDate = nullToString(newRecord.getFieldValue('enddate'));
    var oldDate = nullToString(oldRecord.getFieldValue('enddate'));
    if (newDate != undefined && newDate != oldDate) {
        fields.push('custcol_bo_date');
        values.push(newDate);
        revRecOldDate = oldDate;
        revRecNewDate = newDate;
    }

    // time
    var newTime = nullToString(newRecord.getFieldValue('custentity_bo_eventtime'));
    var oldTime = nullToString(oldRecord.getFieldValue('custentity_bo_eventtime'));
    if (newTime != undefined && newTime != oldTime) {
        fields.push('custcol_bo_time');
        values.push(newTime);
    }

    // approxtime
    var newApproxTime = nullToString(newRecord.getFieldValue('custentity_bo_approxtime'));
    var oldApproxTime = nullToString(oldRecord.getFieldValue('custentity_bo_approxtime'));
    if (newApproxTime != undefined && newApproxTime != oldApproxTime) {
        fields.push('custcol_bo_approxtime');
        values.push(newApproxTime);
    }

    // course
    var newCourse = nullToString(newRecord.getFieldValue('custentity_bo_course'));
    var oldCourse = nullToString(oldRecord.getFieldValue('custentity_bo_course'));
    if (newCourse != undefined && newCourse != oldCourse) {
        fields.push('custcol_bo_course');
        values.push(newCourse);
    }

    //item
    var newItem = nullToString(newRecord.getFieldValue('custentity_bo_item'));
    var oldItem = nullToString(oldRecord.getFieldValue('custentity_bo_item'));
    if (newItem != undefined && newItem != oldItem) {
        fields.push('item');
        values.push(newItem);

        if(oldAddress1 != ''){
            fields.push('custcol_bo_address1');
            values.push(oldAddress1);
        }

        if(oldAddress2 != ''){
            fields.push('custcol_bo_address2');
            values.push(oldAddress2);
        }       

        if(oldCity != ''){
            fields.push('custcol_bo_city');
            values.push(oldCity);
        }

        if(oldPostcode != ''){
            fields.push('custcol_bo_postcode');
            values.push(oldPostcode);
        }

        if(oldState != ''){
            fields.push('custcol_bo_state');
            values.push(oldState);
        }

        if(oldCountry != ''){
            fields.push('custcol_bo_country');
            values.push(oldCountry);
        }

        if(oldDate != ''){
            fields.push('custcol_bo_date');
            values.push(oldDate);
        }

        if(oldTime != ''){
            fields.push('custcol_bo_time');
            values.push(oldTime);
        }

        if(oldApproxTime != ''){
            fields.push('custcol_bo_approxtime');
            values.push(oldApproxTime);
        }

        if(oldCourse != ''){
            fields.push('custcol_bo_course');
            values.push(oldCourse);
        }

    }
    return fields ? new Array(fields, values) : null;
}

/**
* Update transaction line items
*
* @todo REFACTOR
* @param {Array} fields
*/
function updateTransactionLineItems(fields) {

    if (!fields) {
        return;
    }

    var values = fields[1];
    fields = fields[0];

    if (fields.length != values.length) {
        return;
    }

    if (fields.length < 1) {
        return;
    }

    var jobId = nlapiGetRecordId();

    // Find all transactions that are using this job
    var filters = new Array();
			
    filters.push(new nlobjSearchFilter('internalid', 'job', 'is', jobId));	
    //filters.push(new nlobjSearchFilter('id', 'job', 'any', jobId));
	
    var columns = new Array();
    columns.push(new nlobjSearchColumn('tranid'));
    columns.push(new nlobjSearchColumn('type'));
    columns.push(new nlobjSearchColumn('internalid'));

    var searchResults = nlapiSearchRecord('transaction', null, filters, columns);

    // Validate transactions
    var salesOrders = new Array();
    var quotes = new Array();
    var processedTransactions = new Array();
	
    if (searchResults) {
			
        for (var i = 0; i < searchResults.length; i++) 
		{
            var recordId = searchResults[i].getId();
            var recordType = searchResults[i].getRecordType();

            // Check if transaction has already been processed
            if (sweet_job_lib_inArray(recordId, processedTransactions)) {
                continue; // Skip
            }
            processedTransactions.push(recordId);

            if (recordType == 'salesorder') {
            	var salesOrder = nlapiLoadRecord('salesorder', recordId);
            	// Add valid sales order to array
            	salesOrders.push(salesOrder);
            }
            
            if(recordType == 'estimate' && nlapiGetFieldValue('entitystatus') == '66'){
            	var quote = nlapiLoadRecord('estimate', recordId);
            	// Add valid quote to array
            	quotes.push(quote);
            }
        }
    }

    // Update sales orders  
    if (salesOrders) {
        for (var i = 0; i < salesOrders.length; i++) {

            // Find items linked to job			
            for (var j = 1; j < salesOrders[i].getLineItemCount('item') + 1; j++) 
			{
                if (salesOrders[i].getLineItemValue('item', 'job', j) == jobId) {

                    // Update fields
                    for (var k=0; k < fields.length; k++) {
                        salesOrders[i].setLineItemValue('item', fields[k], j, values[k]);
                    }
                }
            }

            // Save transaction
            nlapiSubmitRecord(salesOrders[i]);

            // Trigger rev rec script
            if (revRecOldDate != revRecNewDate) {
                sweet_so_revrec_checkNewDate(salesOrders[i].getId(), jobId, revRecOldDate, revRecNewDate);
            }
            sweet_so_revrec_fillSchedule(salesOrders[i].getId());
        }
    }

   // Update Quotes  
    if (quotes) {

        for (var i = 0; i < quotes.length; i++) 
		{
            // Find items linked to job
            for (var j = 1; j < quotes[i].getLineItemCount('item') + 1; j++) {
                if (quotes[i].getLineItemValue('item', 'job', j) == jobId) {

                    // Update fields
                    for (var k = 0; k < fields.length; k++) {
                        quotes[i].setLineItemValue('item', fields[k], j, values[k]);
                    }
                }
            }
           // Save transaction
           nlapiSubmitRecord(quotes[i]);
        }
    }   
}



// -----------------------------------------------------------------------------------------------------------------------------------------------------SECTION 3 
// ----------------------------------------------------------MOVED FROM sweet_so_revrec.js--------------------------------------------------------------

/**
 * Checks if new date is in different accounting period and sends warning if it is
 *
 * @function sweet_so_revrec_checkNewDate
 * @param {String} salesOrderId
 * @param {String} jobId
 * @param {String} revRecOldDate
 * @param {String} revRecNewDate
 */
function sweet_so_revrec_checkNewDate(salesOrderId, jobId, revRecOldDate, revRecNewDate, revRecEmails)
{
  // Find sales order item linked to job
  var salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
  
  for (var j = 1; j < salesOrder.getLineItemCount('item') + 1; j++) {  
    if (salesOrder.getLineItemValue('item', 'job', j) == jobId) {
      if ((salesOrder.getLineItemValue('item','revrecschedule', j) == null) || (salesOrder.getFieldValue('custbody_so_linkedinvoice') != null)) {
        return;
      }
    }
  }
  
  // Retrieve accounting periods for dates
  var revRecOldPeriod = get_open_period_of_day(revRecOldDate);
  var revRecNewPeriod = get_open_period_of_day(revRecNewDate);
  
  // If accounting periods are not matching send email
  if (revRecOldPeriod != revRecNewPeriod) {
    var subject = 'Rev. rec. to do: date change in sales order ' + salesOrder.getFieldValue('tranid');
    var jobRecord = nlapiLoadRecord('job', jobId);
    var message = subject + ', in job#: ' + jobRecord.getFieldValue('entityid');
		
    //sendEmail(subject, message); 
      nlapiSendEmail(-5, 'tess.harvey@themindgym.com', subject, message, null, 'elijah@audaxium.com', null, null, null, true, null, null);	  
	 //nlapiSendEmail(author, recipient, subject, body, cc, bcc, records, attachments, notifySenderOnBounce, internalOnly, replyTo)  
  }  
}


/**
 * Fill RevRec Schedule for contract type advanced billing
 *
 * @function sweet_so_revrec_fillSchedule
 * @param String salesOrderID
 */
function sweet_so_revrec_fillSchedule(salesOrderID)
{
  try {
  nlapiLogExecution('DEBUG', 'Function', 'Start:sweet_so_revrec_fillSchedule');
  var newrevrecsched = new Array();
  
  // Get sales order
  var salesOrder = nlapiLoadRecord('salesorder', salesOrderID);

  // exit if there's no linked invoice
  if(salesOrder.getFieldValue('custbody_so_linkedinvoice') == null) {
    nlapiLogExecution('DEBUG', 'Exit', 'There is no linked invoice');
    return
  }
  // Get linked invoice
  var linkedInvoice = nlapiLoadRecord('invoice', salesOrder.getFieldValue('custbody_so_linkedinvoice'));  
  var linkedInvoiceId = linkedInvoice.getId();
  
  // Get subsidiary of the invoice
  var invsubsidiaryid = linkedInvoice.getFieldValue('subsidiary');
  
  // Get rev rec schedule
  var filter = new nlobjSearchFilter('internalid', null, 'anyof', linkedInvoiceId);
  var searchrevrecs = nlapiSearchRecord('invoice', 'customsearch_inv_revrecschedule', filter);

  if ((searchrevrecs == null) || (searchrevrecs.length != 1)) {
    throw nlapiCreateError('SWEET_REVREC_NOT_UNIQUE_REVRECSCHED', 'There should be one and only one revenue recognition schedule per invoice! Please check the linked invoice ' +
      'is correct and has only one line with revenue recognition schedule.', true);
  }
  
  var revrecid = searchrevrecs[0].getValue('internalid', 'revRecSchedule', 'group');
  var revRecSched = nlapiLoadRecord('revrecschedule',revrecid);

  // Sales orders have multiple items with multiple dates and income accounts
  // Retrieve rev rec amounts for specific period and account
  var filter = new nlobjSearchFilter('custbody_so_linkedinvoice', null, 'anyof', linkedInvoice.getId());
  var searchresults = nlapiSearchRecord('salesorder', 'customsearch_so_by_linked_invoice', filter);
  var soparameters = new Array();
  var sototalrevrecamount = 0;

  for (var i = 0; searchresults != null && i < searchresults.length; i++) {
    var searchresult = searchresults[i];
    var parameters = new Array();

    //get accounting period id
    var period = searchresult.getValue('custcol_bo_date', null, 'group');

    if (period != "") {
      var accperiod = get_accounting_period(period);
      parameters['period'] = accperiod['id']; 
      parameters['closed'] = accperiod['closed'];
    } else {
      throw nlapiCreateError('SWEET_REVREC_NO_DATE_SO_ITEM', 'A sales order item without a date is linked to the invoice. Please correct.', true);
    }

    //get income account id
    var incomeaccount = searchresult.getValue('incomeaccount', 'item', 'group');
    if (incomeaccount != "") {
      parameters['incomeaccount'] = get_income_account_id(incomeaccount); 
    } else {
      throw nlapiCreateError('SWEET_REVREC_NO_INCOME_ACCOUNT_SO_ITEM', 'A sales order item without an income account is linked to the invoice. Please correct.', true);
    }
 
    //get rev rec amount
    var sosubsidiaryid = searchresult.getValue('subsidiary', null, 'group');
    if (invsubsidiaryid == sosubsidiaryid) {
    parameters['revrecamount'] = searchresult.getValue('formulanumeric', null, 'sum');
    } else {      
      var socurrency = searchresult.getValue('currency', 'subsidiary', 'group');  // get currency of sales order subsidiary
      var invsubsidiary = nlapiLoadRecord('subsidiary', invsubsidiaryid); // get currency of invoice subsidiary
      var invcurrencyname = invsubsidiary.getFieldValue('currency');
      var filter = new nlobjSearchFilter('name', null, 'is', invcurrencyname);
      var currsearch = nlapiSearchRecord('currency', null, filter);
      var invcurrency = currsearch[0].getId();
      var convdate = nlapiDateToString(get_period_end_date(period), 'd/m/yyyy');
      nlapiLogExecution('DEBUG', 'convdate', convdate);
      var exchrate = nlapiExchangeRate(socurrency, invcurrency, convdate);
      parameters['revrecamount'] = Math.round((searchresult.getValue('formulanumeric', null, 'sum') * exchrate)*100)/100;
      
      nlapiLogExecution('DEBUG', 'socurrency', socurrency);
      nlapiLogExecution('DEBUG', 'invsubsidiary', invsubsidiary);
      nlapiLogExecution('DEBUG', 'invcurrencyname', invcurrencyname);      
      nlapiLogExecution('DEBUG', 'invcurrency', invcurrency);      
    }

    soparameters.push(parameters);
    sototalrevrecamount = sototalrevrecamount + parseFloat(parameters['revrecamount']);
  }

  // Give error message with outstanding amount if rev rec amount on sales orders is higher than total of rev rec schedule
  // User needs to modify the sales order to invoice outstanding amount
  
  nlapiLogExecution('DEBUG', 'sototalrevrecamount', sototalrevrecamount);
  
  var revrecschedtotal = revRecSched.getFieldValue('totalamount');
  nlapiLogExecution('DEBUG', 'revrecschedtotal', revrecschedtotal);
  var outstandingamount = sototalrevrecamount - revrecschedtotal;
  nlapiLogExecution('DEBUG', 'outstandingamount', outstandingamount);
  if (outstandingamount > 0) {
    throw nlapiCreateError('SWEET_REVREC_OUTSTANDING_AMOUNT', 'The total amount on sales orders is higher than the invoiced amount by ' + outstandingamount +
      '. Please modify sales order to include this amount to be invoiced.', true);
  }
  
  // Iterate through lines of rev rec schedule. Clean up not recognized lines.
  // Add up recognized amounts by income account. 
  var today = new Date();
  var revrecenddate = revRecSched.getFieldValue('enddate');
  if (today > nlapiStringToDate(revrecenddate)) {
    revrecenddate = nlapiAddMonths(today, 6);
  }
  nlapiLogExecution('DEBUG', 'revrecenddate', revrecenddate);
  var lastperiod = get_open_period_of_day(revrecenddate);
  nlapiLogExecution('DEBUG', 'lastperiod', lastperiod);
  if (lastperiod == 1) {
    throw nlapiCreateError('SWEET_REVREC_OPEN_PERIOD', 'You are trying to post a revenue recognition item to a closed or non existent accounting period.', true);
  }
  var recognizedamount = new Array();
  var i = 1, n = revRecSched.getLineItemCount('recurrence') + 1;
  nlapiLogExecution('DEBUG', 'rev rec', 'recognized already');
  
  for (; i < n; i++) {
    revRecSched.selectLineItem('recurrence', i);
    var notbooked = (revRecSched.getCurrentLineItemValue('recurrence','journal') == '- None -');

    if (notbooked) {
      revRecSched.setCurrentLineItemValue('recurrence', 'postingperiod', lastperiod);
      revRecSched.setCurrentLineItemValue('recurrence','recamount', 0);
      revRecSched.commitLineItem('recurrence');
    } else {
      var rrincomeaccount = revRecSched.getCurrentLineItemValue('recurrence','incomeaccount');
      if (typeof recognizedamount[rrincomeaccount] == "undefined") {
        recognizedamount[rrincomeaccount] = new Array();
        recognizedamount[rrincomeaccount]['revrec'] = parseFloat(revRecSched.getCurrentLineItemValue('recurrence','recamount'));
      } else if (recognizedamount[rrincomeaccount]['revrec'] == null) {
        recognizedamount[rrincomeaccount]['revrec'] = parseFloat(revRecSched.getCurrentLineItemValue('recurrence','recamount'));
      } else {
        recognizedamount[rrincomeaccount]['revrec'] = parseFloat(recognizedamount[rrincomeaccount]['revrec']) + parseFloat(revRecSched.getCurrentLineItemValue('recurrence','recamount'));
      }
    nlapiLogExecution('DEBUG', 'rev rec income account', rrincomeaccount);
    nlapiLogExecution('DEBUG', 'rev rec amount', recognizedamount[rrincomeaccount]['revrec']);  
    }
  }      
  
  // Iterate through lines of sales orders. Add up amounts by income account for closed periods.
  // Add open period amounts to the result array
  nlapiLogExecution('DEBUG', 'sales order', 'all items');
  for (var s = 0; s < soparameters.length; s++) {
    nlapiLogExecution('DEBUG', 'line', s);
    nlapiLogExecution('DEBUG', 'incomeaccount', soparameters[s]['incomeaccount']);
    nlapiLogExecution('DEBUG', 'postingperiod', soparameters[s]['period']);
    nlapiLogExecution('DEBUG', 'period closed', soparameters[s]['closed']);
    nlapiLogExecution('DEBUG', 'recamount', soparameters[s]['revrecamount']);
    if (soparameters[s]['closed'] == 'T') {
      var soincomeaccount = soparameters[s]['incomeaccount'];
      if (typeof recognizedamount[soincomeaccount] == "undefined") {
        recognizedamount[soincomeaccount] = new Array();
        recognizedamount[soincomeaccount]['so'] = parseFloat(soparameters[s]['revrecamount']);
        nlapiLogExecution('DEBUG', 'typeof', 'undefined');
      } else if (recognizedamount[soincomeaccount]['so'] == null) {
        recognizedamount[soincomeaccount]['so'] = parseFloat(soparameters[s]['revrecamount']);        
      } else {
        recognizedamount[soincomeaccount]['so'] = parseFloat(recognizedamount[soincomeaccount]['so']) + parseFloat(soparameters[s]['revrecamount']);
      } 
    nlapiLogExecution('DEBUG', 'sum recamount', recognizedamount[soincomeaccount]['so']);
    } else {
      var rrparameters = new Array();
      rrparameters['period'] = soparameters[s]['period'];
      rrparameters['incomeaccount'] = soparameters[s]['incomeaccount'];
      rrparameters['revrecamount'] = soparameters[s]['revrecamount'];
      newrevrecsched.push(rrparameters);   
    }
  }
  
  //find next open period (it is the accounting period today)
  var onemonthago = nlapiAddMonths(today, -1);
  var previousperiod = get_open_period_of_day(onemonthago);
  if (previousperiod != 1) {
    var nowperiod = previousperiod;
  } else {
    var nowperiod = get_open_period_of_day(today);
  }
  nlapiLogExecution('DEBUG', 'rec differences', 'starting');
        
  // Calculate differences between recognized amounts and amounts in sales orders in closed periods.
  for (var rr in recognizedamount) {
    if (recognizedamount[rr]['so'] == null) {
      var rrdifference = - recognizedamount[rr]['revrec'];
    } else if (recognizedamount[rr]['revrec'] == null) {
      var rrdifference = recognizedamount[rr]['so'];
    } else {
      var rrdifference = recognizedamount[rr]['so'] - recognizedamount[rr]['revrec'];
    }
    nlapiLogExecution('DEBUG', 'rr', rr);
    if (rrdifference != 0) {
      var rrparameters = new Array();
      rrparameters['period'] = nowperiod;
      rrparameters['incomeaccount'] = rr;
      rrparameters['revrecamount'] = rrdifference;
      newrevrecsched.push(rrparameters);
      nlapiLogExecution('DEBUG', 'income account', rr);
      nlapiLogExecution('DEBUG', 'difference', rrdifference);
    }
  }
  
  // Set remaining amount and add to the rev rec schedule
  var remainingamount = revrecschedtotal - sototalrevrecamount;
  nlapiLogExecution('DEBUG', 'remainingamount', remainingamount);
  if (remainingamount > 0) {
    var rrparameters = new Array();
    rrparameters['period'] = lastperiod;
    rrparameters['incomeaccount'] = '228';
    rrparameters['revrecamount'] = remainingamount;
    newrevrecsched.push(rrparameters);
  }
  
  // Sort results array
  newrevrecsched.sort(sortRevRecSchedByPeriod);
  
  // Iterate through results array
  var i = 1, n = revRecSched.getLineItemCount('recurrence') + 1;
  for (var s = 0; s < newrevrecsched.length; s++) {
    nlapiLogExecution('DEBUG', 'line', s);
    nlapiLogExecution('DEBUG', 'incomeaccount', newrevrecsched[s]['incomeaccount']);
    nlapiLogExecution('DEBUG', 'postingperiod', newrevrecsched[s]['period']);
    nlapiLogExecution('DEBUG', 'recamount', newrevrecsched[s]['revrecamount']);
    
    // Find next empty line in rev rec schedule    
    while ((revRecSched.getLineItemValue('recurrence', 'recamount', i) != 0) && (i < n))  {
      i++;
    }

    //If found empty line
    if (i < n) {
      nlapiLogExecution('DEBUG', 'To do', 'Updating line items');
      revRecSched.selectLineItem('recurrence', i);
      revRecSched.setCurrentLineItemValue('recurrence', 'incomeaccount', newrevrecsched[s]['incomeaccount']);
      revRecSched.setCurrentLineItemValue('recurrence', 'postingperiod', newrevrecsched[s]['period']);
      revRecSched.setCurrentLineItemValue('recurrence','recamount', newrevrecsched[s]['revrecamount']);
      revRecSched.commitLineItem('recurrence');
    } else {
    //Raise error message to add more empty lines to the rev rec schedule
      throw nlapiCreateError('SWEET_REVREC_EMPTY_LINE', 'Please add empty lines to the revenue recognition schedule.', true);
    } 
  }

  nlapiSubmitRecord(revRecSched,true); 

  } 
  catch (e) 
  {
    var message = 'Rev. rec. ERROR in sales order ' + salesOrder.getFieldValue('tranid') + ': ';
    var subject = message;
    
    if (e instanceof nlobjError) {
      message += '(' + e.getCode() + ') ' + e.getDetails();
    } else {
      message += e.toString();
    }    
    // Send email
    //sendEmail(subject, message); 
      nlapiSendEmail(-5, 'tess.harvey@themindgym.com', subject, message, null, 'elijah@audaxium.com', null, null, null, true, null, null);	  
	 //nlapiSendEmail(author, recipient, subject, body, cc, bcc, records, attachments, notifySenderOnBounce, internalOnly, replyTo)  
	
    // Throw exception
    throw e;
  }
}

