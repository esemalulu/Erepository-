/*
 ***********************************************************************
 *
 *
 ***********************************************************************/
var EMAIL_CC = null;
var EMAIL_BCC = null;

var FIELD_STATUS_VALUE_SCHEDULED = 'SCHEDULED';
var MAIN_ADDRESS_ROLE = 'Main_Company_Email';

/**
 * This function finds all the email automation records
 * @author support@audaxium.com
 * @return null
 **/
function findEmailAutomationRecords(){

    // Goes through the list of all the custom record rules to process them
    try {
        var columns = [];
        var filters = [];
        
        // only consider active record rules
        filters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
        
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
        
        var results = nlapiSearchRecord('customrecord_email_automation', null, filters, columns);
        if (results != null && results != '' && results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                // validates if the process date is within the desired period before the end of the month
                if (isValidDay(results[i].getValue('custrecord_days_before_end'))) {
                    findSavedSearchRecords(results[i].getValue('custrecord_saved_search'), results[i].getValue('custrecord_email_template'), results[i].getValue('custrecord_reply_email_address'), results[i].getValue('custrecord_include_transaction'), results[i].getValue('custrecord_follow_up_call'), results[i].getValue('custrecord_call_date'), results[i].getText('custrecord_contact_roles'), results[i].getText('custrecord_alternateroles'), results[i].getValue('name'));
                }
            }
        }
    } catch (e) {
        logError('Finding Automation records', e);
    }
}

/**
 * This function creates a Phone Call event
 * @author support@audaxium.com
 * @return null
 **/
function setupFollowUpCall(company, salesRep, daysAfter, tranID){

    try {
        var callDay = new Date();
        
        // validates if a correct number to avoid Nan/Nan/Nan dates
        if (daysAfter != null && daysAfter != '' && daysAfter > 0) {
            callDay = nlapiAddDays(callDay, daysAfter);
            if (callDay.getDay() == 0) {
                callDay = nlapiAddDays(callDay, 1);
            } else if (callDay.getDay() == 6) {
                callDay = nlapiAddDays(callDay, 2);
            }
        }
        callDay = nlapiDateToString(callDay);
        
        // gets company phone number to set for follow-up call
        var phone = nlapiLookupField('customer', company, 'phone');
        
        // creates follow-up call record
        var phoneRecord = nlapiCreateRecord('phonecall');
        phoneRecord.setFieldValue('title', 'Email Automation Follow up call');
        phoneRecord.setFieldValue('startdate', callDay);
        phoneRecord.setFieldValue('status', FIELD_STATUS_VALUE_SCHEDULED);
        phoneRecord.setFieldValue('phone', phone);
        
        phoneRecord.setFieldValue('company', company);
        phoneRecord.setFieldValue('transaction', tranID);
        
        nlapiSubmitRecord(phoneRecord);
    } catch (e) {
        logError('Create followup call failed for company ' + company, e);
    }
}

/**
 * This function sends an email
 * @author support@audaxium.com
 **/
function sendEmail(recordType, customerId, address, emailTemplate, returnAddress, addTransaction, tranID){
    try {
        // attach to both customer and transaction
        var records = [];
        records.entity = customerId;
        
        // handle attachment if required
        var attachement = null;
        if (addTransaction == 'T') {
            attachement = nlapiPrintRecord('TRANSACTION', tranID, 'PDF');
        }
        
        // Send the email
        var mailInfo = nlapiMergeRecord(emailTemplate, recordType, tranID); // where search type is the record type of the current search
        nlapiSendEmail(returnAddress, address, mailInfo.getName(), mailInfo.getValue(), EMAIL_CC, EMAIL_BCC, records, attachement);
        
        // logs to whom the messages are sent to
        nlapiLogExecution('audit', 'Email sent to ' + address + mailInfo.getName() + mailInfo.getValue());
    } catch (e) {
        logError('Email to ' + address + ' failed', e);
        var ErrMsg = 'Sending Email to '+address+' failed for below Record:<br/>'+
        			 'Customer Internal ID: '+customerId+'<br/>'+
        			 'Transaction ('+recordType+') Internal ID: '+tranID+'<br/><br/>Error Message:<br/>'+e;
        
        nlapiSendEmail('-5','support@audaxium.com','RenewalEmailAutomation-SendEmail Failed',ErrMsg);
    }
}

/**
 * This function sends an email if at least 1 transaction failed
 * @author support@audaxium.com
 * @return
 **/
function sendEmailWithFailedTransaction(returnAddress, ruleName, listOfFailedTransaction){

    var subject = 'Results for the ' + ruleName + ' Email Automation Rule';
    var body = 'While performing the ' + ruleName + ' Email Automation Rule, no emails or follow up calls were performed for the following list of transactions: ';
    
    try {
        // Sends the email of all transactions that could not be sent automatically
        for (var i = 0; i < listOfFailedTransaction.length; i++) {
            body += '\n' + listOfFailedTransaction[i];
        }
        nlapiSendEmail(returnAddress, returnAddress, subject, body, EMAIL_CC, EMAIL_BCC);
        nlapiLogExecution('audit', 'Email info', 'Email sent to : ' + returnAddress +
        '\nSubject : ' +
        subject +
        '\nBody : ' +
        body);
    } catch (e) {
        logError('Email to ' + returnAddress + ' failed', e);
    }
}

/**
 * This function saves the search performed on the specified transaction
 * @author support@audaxium.com
 * @return null
 **/

function saveProcess(recordType, tranId, searchID){
    try {
        // acquires list of current saved searches for which the emails have been sent
        var tranRec = nlapiLoadRecord(recordType, tranId);

        var searches = tranRec.getFieldValues('custbody_saved_search_processed_flag');
        var savedSearches = [];
        var index = 0;
        if (searches != null) {
            for (; index < searches.length; index++) {
                savedSearches[index] = searches[index];
            }
        }
        
        // adds the current saved search to the list and saves it
        savedSearches[index] = searchID;
        tranRec.setFieldValues('custbody_saved_search_processed_flag', savedSearches);
        nlapiSubmitRecord(tranRec);
    } catch (e) {
        logError('Save Process', e);
    }
}

/**
 * This function takes a transaction found by the saved search and performs the emailing necessary
 * @author support@audaxium.com
 * @return list of failed transactions
 * @modified by support@audaxium.com
 **/

function processRecord(recordType, tranId, salesRep, savedSearch, companyID, customerEmail, template, returnAddress, addTransaction, followup, callDelay, contactRoles, alternateRoles, ruleName, listOfFailedTransaction){
    // 20 schedulescript, 30 phonecall(create+submit), 10 search, 10 sendemail, 30 save process
	//MOD: 1/27/2013 Json - Increasing governance exit from 100 to 200
    verifyMetering(200, null);
    
    try {
    	// save the saved search as processed
        saveProcess(recordType, tranId, savedSearch);
    	
    	var results = executeSearch(contactRoles, companyID, customerEmail);
        if (results != null && results != '' && results.length > 0) {
            validateAndMail(recordType, companyID, results, returnAddress, template, returnAddress, addTransaction, tranId);
            // create follow up call if needed
            if (followup == 'T') {
                setupFollowUpCall(companyID, returnAddress, callDelay, tranId);
            }
        } else {
        
            results = executeSearch(alternateRoles, companyID, customerEmail);
            
            if (results != null && results != '' && results.length > 0) {//all customer
                validateAndMail(recordType, companyID, results, salesRep, template, returnAddress, addTransaction, tranId);
                // create follow up call if needed
                if (followup == 'T') {
                    setupFollowUpCall(companyID, salesRep, callDelay, tranId);
                }
            } else {
                // No customer, add to failed list
                var tranName = nlapiLookupField('transaction', tranId, 'tranid');
                listOfFailedTransaction.push(tranName);
            }
        }
    } catch (e) {
        logError('Process records', e);
    }
    
    return listOfFailedTransaction;
}

/**
 * Function to execute a search on contact, filter if there is role
 * @author support@audaxium.com
 * @param {Object} searchColumns
 * @param {Object} searchFilters
 * @return results
 */
function executeSearch(listRoles, companyID, customerEmail){
    var searchFilters = [];
    var searchColumns = [];
    
    var found = [];
    
    try {
        var rolesArray = listRoles.split(",");
        
        if (rolesArray.length > 0 && rolesArray[0] != '') {
            // get the list of contacts associated with the company if roles are set
            searchFilters[0] = new nlobjSearchFilter('internalid', null, 'is', companyID, null);
            
            searchColumns[0] = new nlobjSearchColumn('email', 'contact');
            searchColumns[1] = new nlobjSearchColumn('contactrole', 'contact');
             
			var results = nlapiSearchRecord('customer', null, searchFilters, searchColumns);
			for (var j = 0; j < rolesArray.length; j++) {
			
				// check to see if this role is the main address
				if ( rolesArray[j] == MAIN_ADDRESS_ROLE ) {
					found.push(customerEmail);
					continue;
				}
				
				// regardless of the number of results, go through list of roles in case we need to use the main address
				if (results == null) {
					continue;
				}
				
				for (var i = 0; i < results.length; i++) {
					if (results[i].getText('contactrole', 'contact') == rolesArray[j]) {
						found.push(results[i].getValue('email', 'contact'));
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
 * @author support@audaxium.com
 * @param {Object} results
 * @param {Object} salesRep
 * @param {Object} template
 * @param {Object} returnAddress
 * @param {Object} addTransaction
 * @param {Object} tranId
 */
function validateAndMail(recordType, companyId, results, salesRep, template, returnAddress, addTransaction, tranId){
    try {
        for (var i = 0; i < results.length; i++) {
            var address = results[i];
            
            if (address == null || address == '') {
                nlapiLogExecution('error', 'Contact address not found');
                continue;
            }
            
            // sends the email
            sendEmail(recordType, companyId, address, template, returnAddress, addTransaction, tranId);
        }
    } catch (e) {
        logError('Mail and validation', e);
    }
}

/**
 * This function finds all the email automation records
 * @author support@audaxium.com
 * @return null
 **/
function findSavedSearchRecords(savedSearch, template, address, addTransaction, followup, callDelay, contactRoles, alternateRoles, ruleName){

    try {
        var searchFilters = [];
        var searchColumns = [];
        
        // find transactions which have not been processed as defined by the multi-select saved search flag
        searchFilters[0] = new nlobjSearchFilter('custbody_saved_search_processed_flag', null, 'noneof', savedSearch, null);
        searchFilters[1] = new nlobjSearchFilter('mainline', null, 'is', 'T', null);
        searchColumns[0] = new nlobjSearchColumn('internalid');
        searchColumns[1] = new nlobjSearchColumn('internalid', 'customer');
		searchColumns[2] = new nlobjSearchColumn('email', 'customer');
        
        // find the transaction records related to the saved search
        var results = nlapiSearchRecord('transaction', savedSearch, searchFilters, searchColumns);

        // go through each transaction returned
        if (results != null && results != '' && results.length > 0) {
        
            var listOfFailedTransaction = [];
            
            //Loop through transaction search results
            for (var i = 0; i < results.length; i++) {
                var customerEmail = results[i].getValue('email', 'customer');
				var customer = results[i].getValue('internalid', 'customer');
                var tranId = results[i].getValue('internalid');
                
                var recordType = results[i].getRecordType();
                
                if (customer != null && customer != '') {
                    // Process the transaction
                    listOfFailedTransaction = processRecord(recordType, tranId, address, savedSearch, customer, customerEmail, template, address, addTransaction, followup, callDelay, contactRoles, alternateRoles, ruleName, listOfFailedTransaction);
                }
            }
            
            // inform about the transactions which did not have any emails sent
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
 * @author support@audaxium.com
 * @return internalID of SO or null if not found
 **/
// Based on day of the month the email should be sent
// number of days before the end of the month
function isValidDay(daysAhead){

    try {
        var today = new Date();
        
        // get the last day of the month
        var lastDayOfMonth = new Date();
        lastDayOfMonth.setDate(1);
        lastDayOfMonth.setMonth(lastDayOfMonth.getMonth() + 1);
        lastDayOfMonth = nlapiAddDays(lastDayOfMonth, -1);
        
        // verify if the rule date is within the correct time frame
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
        maxUnits = 50;
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
