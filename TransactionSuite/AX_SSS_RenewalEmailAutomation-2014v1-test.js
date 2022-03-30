/*
 ***********************************************************************
 *
 * The following javascript code is created by IT-Ration Consulting Inc.,
 * a NetSuite Partner. It is a SuiteFlex component containing custom code
 * intented for NetSuite (www.netsuite.com) and use the SuiteScript API.
 * The code is provided "as is": IT-Ration Consulting shall not be liable
 * for any damages arising out the intended use or if the code is modified
 * after delivery.
 *
 * Mod. Company: Audaxium
 * Mod. Author: joe@audaxium.com
 * File: AX_SSS_RenewalEmailAutomation.js
 * Mod. Date: March 3rd, 2014
 *
 * Reviewed by:
 * Review Date:
 *
 * 1/13/2014 - Enhancement by Joe.Son@Audaxium.com
 * - Make process look up Cash Sales Records
 * - Additional Document To send
 * 		ONLY when email automation rule has file set on the field
 * - Send Statement
 * 		ONLY when email automation rule has this field checked
 *
 ***********************************************************************/

var EMAIL_CC = null;
var EMAIL_BCC = null;

var FIELD_STATUS_VALUE_SCHEDULED = 'SCHEDULED';

//MOD. 3/3/2014 - JSON Array to keep track of transaction information.
/**
 * trxJson[transaction Number] = {
				"id":tranId,
				"type":record type,
				"company":linked company name,
				"companyid":linked company ID
			};
 */
var trxJson = {};

/**
 * This function finds all the email automation records
 * @return null
 **/
function findEmailAutomationRecords(){

    try {
		var columns = new Array();
		var filters = new Array();
	    
		//TESTING NOTE:
		//When testing in production, search for inactive and ID of 6
		filters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'T');
		filters[1] = new nlobjSearchFilter('internalid', null, 'anyof','6');
		
	    columns[0] = new nlobjSearchColumn('custrecord_saved_search');
	    columns[1] = new nlobjSearchColumn('custrecord_days_before_end');
	    columns[2] = new nlobjSearchColumn('custrecord_email_template');
	    columns[3] = new nlobjSearchColumn('custrecord_reply_email_address');
	    columns[4] = new nlobjSearchColumn('custrecord_include_transaction');
	    columns[5] = new nlobjSearchColumn('custrecord_follow_up_call');
	    columns[6] = new nlobjSearchColumn('custrecord_call_date');
	    columns[7] = new nlobjSearchColumn('custrecord_contact_roles');
	    columns[8] = new nlobjSearchColumn('isinactive');
		columns[9] = new nlobjSearchColumn('custrecord_alternateroles');
		columns[10] = new nlobjSearchColumn('name');
	    //1/13/2014 enhancement
		columns[11] = new nlobjSearchColumn('custrecord_aux_add_doc_to_send');
		columns[12] = new nlobjSearchColumn('custrecord_aux_send_statement');
		
	    var results = nlapiSearchRecord('customrecord_email_automation', null, filters, columns);
	    if (results != null && results != '' && results.length > 0) {
	        for (var i = 0; i < results.length; i++) {
                //TESTING, assume true
	        	//if (isValidDay(results[i].getValue('custrecord_days_before_end'))) {
	        	if (true) {
                	//1/13/2014 - Enhancement
                    findSavedSearchRecords(results[i].getValue('custrecord_saved_search'), 
						results[i].getValue('custrecord_email_template'), 
						results[i].getValue('custrecord_reply_email_address'), 
						results[i].getValue('custrecord_include_transaction'), 
						results[i].getValue('custrecord_follow_up_call'), 
						results[i].getValue('custrecord_call_date'), 
						results[i].getText('custrecord_contact_roles'), 
						results[i].getText('custrecord_alternateroles'), 
						results[i].getValue('name'),
						results[i].getValue('custrecord_aux_add_doc_to_send'),
						results[i].getValue('custrecord_aux_send_statement')
                    	);
                }
	        }
	    }		
	} catch (e) {
		logError('Finding Automation records', e);
	}
}

/**
 * This function creates a Phone Call event
 * @return null
 **/
function setupFollowUpCall(company, salesRep, daysAfter, tranID){
	
	try {
	    var callDay = new Date();
		
		// validates if a correct number to avoid Nan/nNan/Nan dates
		if ( daysAfter != null && daysAfter != '' && daysAfter > 0 ) {
			var callDay = nlapiAddDays(callDay, daysAfter);
			if (callDay.getDay() == 0) {
				callDay = nlapiAddDays(callDay, 1);
			} else if (callDay.getDay() == 6) {
				callDay = nlapiAddDays(callDay, 2);
			}
		}
		callDay = nlapiDateToString(callDay);
	    
	    var phone = nlapiLookupField('customer', company, 'phone');
	    
	    var phoneRecord = nlapiCreateRecord('phonecall');
	    phoneRecord.setFieldValue('title', 'Email Automation Follow up call');
	    phoneRecord.setFieldValue('startdate', callDay);
	    phoneRecord.setFieldValue('status', FIELD_STATUS_VALUE_SCHEDULED);
	    phoneRecord.setFieldValue('phone', phone);
	    
	    phoneRecord.setFieldValue('company', company);
	    phoneRecord.setFieldValue('transaction', tranID);
    
        nlapiSubmitRecord(phoneRecord, true, true);
    } catch (e) {
        logError('Create followup call failed for company ' + company, e);
    }
}

/**
 * This function sends an email
 * @return
 *1/13/2014 enhancement
 *	- addFile: ID of file to send
 *	- sendStatement (T or F) to send statement
 **/
function sendEmail(address, contactID, emailTemplate, returnAddress, addTransaction, tranID, addFile, sendStatement,searchType){

	var attachement = new Array();
	var records = [];
	//1/13/2014 - FIX
    //Needs to be transaction NOT estimate to be attached to transaction record.
    records['transaction'] = tranID;
    
	try {
	    
	    //1/13/2014 - Enhancement. Modify this to an Array
	    if (addTransaction == 'T') {
	    	attachement.push(nlapiPrintRecord('TRANSACTION', tranID, 'PDF'));
	    }

	    //1/13/2014 - Enhancement addFile
	    if (addFile) {
	    	try {
	    		attachement.push(nlapiLoadFile(addFile));
	    	} catch (fileloaderr) {
	    		var esbj = 'Failed to Load File ID '+addFile+' For Transaction '+searchType+': Internal ID: '+tranID;
	    		var emsg = 'Unable to send File ID: '+addFile+' because following error occured:<br/><br/>'+
	    				   getErrText(fileloaderr);
	    		
	    		log('error','Error loading file to send',getErrText(fileloaderr));
	    		nlapiSendEmail(-5, -5, esbj, emsg, null,null,records,attachment);
	    	}
	    }
	    
	    if (sendStatement=='T') {
	    	try {
	    		//entity
		    	var customerEntity = nlapiLookupField(searchType, tranID, 'entity', false);
		    	log('debug','entity id',customerEntity);
		    	attachement.push(nlapiPrintRecord('STATEMENT',customerEntity,'PDF'));
		    	
	    	} catch (statementerr) {
	    		var sesbj = 'Failed to generate Statement For Customer on Transaction '+searchType+': '+tranID;
	    		var semsg = 'Unable to generate Statement For Customer on Transaction '+searchType+': '+tranID+' because following error occured:<br/><br/>'+
	    				   getErrText(statementerr);
	    		
	    		log('error','Error generator statement',getErrText(statementerr));
	    		nlapiSendEmail(-5, -5, sesbj, semsg, null,null,records,attachement);
	    	}
	    }
	    
	    //Mod 3/4/2014 - Change this to do mail merge with Transaction record.
	    //var mailInfo = nlapiMergeRecord(emailTemplate, 'contact', contactID);
	    
	    //Mail Merge will be done using Transaction Record AND Contact Record.
	    //Fields from both Transaction AND Contact records can be added
	    
	    var mailInfo = nlapiMergeRecord(emailTemplate, searchType, tranID, 'contact', contactID);
	    //var mailInfo = nlapiMergeRecord(emailTemplate, searchType, tranID);
	    
	    //address
        nlapiSendEmail(returnAddress, address, mailInfo.getName(), mailInfo.getValue(), EMAIL_CC, EMAIL_BCC, records, attachement);
        nlapiLogExecution('audit', 'Email sent to ' + address + mailInfo.getName() + mailInfo.getValue());
    } catch (e) {
        logError('Email to ' + address + ' failed', e);
    }
}

/**
 * This function sends an email if at least 1 transaction failed
 * @return
 **/
function sendEmailWithFailedTransaction(returnAddress, ruleName, listOfFailedTransaction){

    var subject = 'Failed Results for the ' + ruleName + ' Email Automation Rule';
    var body = 'While performing the ' + ruleName + ' Email Automation Rule, no emails or follow up calls were performed for the following list of transactions:<br/><br/>';
    
	try {
		
		//trxJson
		//3/4/2014 - Send Hyperlinked Transaction Number with Company Name
	    for (var i = 0; i < listOfFailedTransaction.length; i++) {
	    	
	    	var trxNum = listOfFailedTransaction[i];
	    	var detailLine = trxNum;
	    	//when trx details are available
	    	if (trxJson[trxNum]) {
	    		detailLine = '<a href="https://system.netsuite.com'+nlapiResolveURL('RECORD', trxJson[trxNum].type, trxJson[trxNum].id, 'VIEW')+'">'+
	    					 trxNum+'</a>'+
	    					 ' - '+
	    					 trxJson[trxNum].company + ' (Internal ID: '+trxJson[trxNum].companyid+')';
	    	}
	    
	    	
			body += detailLine+'<br/>';
	    }
	    //returnAddress
        nlapiSendEmail(returnAddress, returnAddress, subject, body, EMAIL_CC, EMAIL_BCC);
        nlapiLogExecution('audit', 'Email info'	,'Email sent to : ' + returnAddress + 
									'\nSubject : ' + subject + 
									'\nBody : ' + body);
    } catch (e) {
        logError('Email to ' + returnAddress + ' failed', e);
    }
}

/**
 * This function saves the search performed on the specified transaction
 * @return null
 **/
function saveProcess(searchType, tranId, searchID){
    try {
		var tranRec = nlapiLoadRecord(searchType, tranId);
		
		//Mod 3/4/2014 - track all transaction being loaded
		if (!trxJson[tranRec.getFieldValue('tranid')]) {
			trxJson[tranRec.getFieldValue('tranid')] = {
				"id":tranId,
				"type":searchType,
				"company":tranRec.getFieldText('entity'),
				"companyid":tranRec.getFieldValue('entity')
			};
		}
		
	    var searches = tranRec.getFieldValues('custbody_saved_search_processed_flag');
	    
	    var savedSearches = new Array();
	    var index = 0;
	    if (searches != null) {
	        for (; index < searches.length; index++) {
	            savedSearches[index] = searches[index];
	        }
	    }
	    savedSearches[index] = searchID;
	    tranRec.setFieldValues('custbody_saved_search_processed_flag', savedSearches);
	    nlapiSubmitRecord(tranRec, true, true);
	} catch (e) {
		logError('Save Process', e);
	}
}

/**
 * This function takes a transaction found by the saved search and performs the emailing necessary
 * @return list of failed transactions
 **/
function processRecord(searchType, tranId, salesRep, savedSearch, companyID, template, returnAddress, addTransaction, followup, callDelay, contactRoles, alternateRoles, ruleName, listOfFailedTransaction, addFile, sendStatement){

	log('debug','search type',searchType);
	
    // 20 schedulescript, 30 phonecall(create+submit), 10 search, 10 sendemail, 30 save process
	verifyMetering(140, null);
	
    try {
		saveProcess(searchType, tranId, savedSearch);
		log('debug','saved',searchType+' // '+tranId+' Saved');
	    var results = executeSearch(contactRoles, companyID);
	    
	    if (results != null && results != '' && results.length > 0) {//send to everyone if no role, send to primary role
	        validateAndMail(results, returnAddress, template, returnAddress, addTransaction, tranId, addFile, sendStatement,searchType);
	        // create only 1 follow up call for the first one found
	        if (followup == 'T') {
	            setupFollowUpCall(companyID, returnAddress, callDelay, tranId);
	        }
	    } else {
	    	
	        var results = executeSearch(alternateRoles, companyID);
	        
	        if (results != null && results != '' && results.length > 0) {//all customer
	            validateAndMail(results, salesRep, template, returnAddress, addTransaction, tranId, addFile, sendStatement,searchType);
	            // create only 1 follow up call for the first one found
	            if (followup == 'T') {
	                setupFollowUpCall(companyID, salesRep, callDelay, tranId);
	            }
	        } else {// No customer, this may happen quite often, not to be alarmed
				var tranName = nlapiLookupField(searchType, tranId, 'tranid');
	            listOfFailedTransaction.push(tranName);	        }
	    }
	} catch (e) {
		logError('Process records', e);
	}
   
	return listOfFailedTransaction;
}

/**
 * Function to execute a search on contact, filter if there is role
 * @param {Object} searchColumns
 * @param {Object} searchFilters
 * @return results
 */
function executeSearch(listRoles, companyID){
	var searchFilters = new Array();
	var searchColumns = new Array();

	var found = [];
	
	try {
		var rolesArray = listRoles.split(",");
		
		if ( rolesArray.length > 0 && rolesArray[0] != '' ) {
			searchFilters[0] = new nlobjSearchFilter('internalid', null, 'is', companyID, null);

			searchColumns[0] = new nlobjSearchColumn('internalid', 'contact');
			searchColumns[1] = new nlobjSearchColumn('phone', 'contact');
			searchColumns[2] = new nlobjSearchColumn('email', 'contact');
			searchColumns[3] = new nlobjSearchColumn('contactrole', 'contact');

			var results = nlapiSearchRecord('customer', null, searchFilters, searchColumns);
			for (var i = 0; results != null && i < results.length; i++) {
				for (var j = 0; j < rolesArray.length; j++) {
					if ( results[i].getText('contactrole', 'contact') == rolesArray[j]) {
						found.push(results[i]);
					}
				}
			}
		}
    } catch (err) {
        logError('Could not find contact', err);
    }
    
    return found;
}

/**
 * Function that validate emails to send and it sends the email.
 * @param {Object} results
 * @param {Object} salesRep
 * @param {Object} template
 * @param {Object} returnAddress
 * @param {Object} addTransaction
 * @param {Object} tranId
 * 1/13/2014 enhancement
 * @param {Object} addFile 
 * 			User selected File ID on the Email Automation Record to send.
 * @param {Object} sendStatement
 * 			User provided value of T or F on the Email Automation Record to attach Statement with the email.
 * 
 */
function validateAndMail(results, salesRep, template, returnAddress, addTransaction, tranId, addFile, sendStatement,searchType){
    try {
		for (var i = 0; i < results.length; i++) {
	        var contactID = results[i].getValue('internalid', 'contact');
	        var address = results[i].getValue('email', 'contact');
	        var phone = results[i].getValue('phone', 'contact');
	        
	        if (contactID == null || contactID == '') {
	            nlapiLogExecution('error', 'Contact information not found');
	            continue;
	        }
	        
	        if (address == null || address == '') {
	            nlapiLogExecution('error', 'Contact address not found');
	            continue;
	        }
	        
	        sendEmail(address, contactID, template, returnAddress, addTransaction, tranId, addFile, sendStatement, searchType);
	    }
	} catch (e) {
		logError('Mail and validation', e);
	}
}

/**
 * This function finds all the email automation records
 * @return null
 *
 * 1/13/2014 - Enhancement to send additional files and/or send statement based on email automation rule
 **/
function findSavedSearchRecords(savedSearch, template, address, addTransaction, followup, callDelay, contactRoles, alternateRoles, ruleName, addFile, sendStatement){

    try {
		var searchFilters = new Array();
	    var searchColumns = new Array();
	    
	    searchFilters[0] = new nlobjSearchFilter('custbody_saved_search_processed_flag', null, 'noneof', savedSearch, null);
	    searchFilters[1] = new nlobjSearchFilter('mainline', null, 'is', 'T', null);
	    searchColumns[0] = new nlobjSearchColumn('internalid', 'customer');
	    searchColumns[1] = new nlobjSearchColumn('internalid');
	    
	    var searchType = 'estimate';
	    
	    var results = null;
	    
	    results = nlapiSearchRecord(searchType, savedSearch, searchFilters, searchColumns);
	    
	    //No Result for estimate, exeucte against invoice
	    if (results == null || results == '') {
	    	searchType = 'invoice';
	        results = nlapiSearchRecord(searchType, savedSearch, searchFilters, searchColumns);
	    }
	        
	    //1/13/2014 Enhancement
	    //No Result for invoice, exeucte against cash sales
	    if (results == null || results == '') {
	    	searchType = 'cashsale';
	        results = nlapiSearchRecord(searchType, savedSearch, searchFilters, searchColumns);
	    }
	    
	    if (results != null && results != '' && results.length > 0) {
	        
			var listOfFailedTransaction = new Array();
			
			for (var i = 0; i < results.length; i++) {
	            var customer = results[i].getValue('internalid', 'customer');
	            var tranId = results[i].getValue('internalid');
	            if (customer != null && customer != '') {
	            	
	                listOfFailedTransaction = processRecord(searchType, 
	                										tranId, 
	                										address, 
	                										savedSearch, 
	                										customer, 
	                										template, 
	                										address, 
	                										addTransaction, 
	                										followup, 
	                										callDelay, 
	                										contactRoles, 
	                										alternateRoles, 
	                										ruleName, 
	                										listOfFailedTransaction,
	                										addFile, 
	                										sendStatement);
	            }
	        }
			if (listOfFailedTransaction != null && listOfFailedTransaction != '') {
                nlapiLogExecution("DEBUG", "listOfFailedTransaction", listOfFailedTransaction);
                sendEmailWithFailedTransaction(address, ruleName, listOfFailedTransaction);
            }
	    }
	} catch (err) {
        logError('Saved search failed or not estimate nor invoice', err);
    }
}

/**
 * This function determines if the day is valid and not during a weekend
 * @return internalID of SO or null if not found
 **/
// Based on day of the month the email should be sent
// number of days before the end of the month
function isValidDay(daysAhead){

    try {
		var today = new Date();
	    var lastDayOfMonth = new Date();
	    lastDayOfMonth.setDate(1);
	    lastDayOfMonth.setMonth(lastDayOfMonth.getMonth() + 1);
	    lastDayOfMonth = nlapiAddDays(lastDayOfMonth, -1);
	    
	    var dayLookedFor = nlapiAddDays(lastDayOfMonth, -(daysAhead - 1));
	    if (today.getMonth() > dayLookedFor.getMonth() || today.getDate() >= dayLookedFor.getDate()) {
	        return true;
	    }
	} catch (e) {
		logError('Check valid day', e);
	}
    return false;
}

/**
 * This function verifies if usage metering is getting dangerously low
 * If so, it schedules another execution of the script, then throws an error to kill the current execution
 */
function verifyMetering(maxUnits, params){
    if (isNaN(parseInt(maxUnits, 10))) {
        maxUnits = 1000;
    }
    if (nlapiGetContext().getExecutionContext() == 'scheduled' && nlapiGetContext().getRemainingUsage() <= maxUnits) {
        nlapiLogExecution('audit', 'verifyMetering()', 'Metering low, scheduling anohter execution');
        nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), params);
        throw nlapiCreateError('METERING_LOW_ERR_CODE', 'Usage metering low, another execution has been scheduled', true);
    }
}

/**
 * Processes errors
 * @param {Object} title:		 additional information
 * @param {Object} err:			 error description
 */
function logError(title, err){
    var msg = [];
    
    if (err.getCode != null) {
        msg.push('[SuiteScript exception]');
        msg.push('Error Code: {0}' + err.getCode());
        msg.push('Error Data: {0}' + err.getDetails());
        msg.push('Error Ticket: {0}' + err.getId());
        if (err.getInternalId) {
            msg.push('Record ID: {0}' + err.getInternalId());
        }
        if (err.getUserEvent) {
            msg.push('Script: {0}' + err.getUserEvent());
        }
        msg.push('User: {0}' + nlapiGetUser());
        msg.push('Role: {0}\n' + nlapiGetRole());
        
        var stacktrace = err.getStackTrace();
        if (stacktrace) {
            msg.push('Stack Trace');
            msg.push('\n---------------------------------------------');
            
            if (stacktrace.length > 20) {
                msg.push('**stacktrace length > 20**');
                msg.push(stacktrace);
            } else {
                msg.push('**stacktrace length < 20**');
                for (var i = 0; stacktrace != null && i < stacktrace.length; i++) {
					msg.push(stacktrace[i]);
                }
            }
        }
    } else {
        msg.push('[javascript exception]');
        msg.push('User: {0}' + nlapiGetUser());
        msg.push(err.toString());
    }
    
    nlapiLogExecution('error', title, msg);
}
