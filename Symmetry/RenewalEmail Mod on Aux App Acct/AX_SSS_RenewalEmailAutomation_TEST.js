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
 * Company: IT-Ration Consulting inc., www.it-ration.com
 * Author: olivier.ahad@it-ration.com
 * File: AX_SSS_RenewalEmailAutomation.js
 * Date: April 6th, 2010
 *
 * Reviewed by:
 * Review Date:
 *
 ***********************************************************************/
var EMAIL_CC = null;
var EMAIL_BCC = null;

var FIELD_STATUS_VALUE_SCHEDULED = 'SCHEDULED';
var MAIN_ADDRESS_ROLE = 'SpecialUseCompanyInfo';

/**
 * This function finds all the email automation records
 * @author olivier.ahad@it-ration.com
 * @return null
 **/
function findEmailAutomationRecords(){

    // Goes through the list of all the custom record rules to process them
    try {
        var columns = [];
        var filters = [];
        
        // only consider active record rules
        filters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
        filters[1] = new nlobjSearchFilter('internalid', null, 'anyof', '5');
        
        columns[0] = new nlobjSearchColumn('custrecord_saved_search');
        columns[1] = new nlobjSearchColumn('custrecord_days_before_end');
        columns[2] = new nlobjSearchColumn('custrecord_email_template');
        columns[3] = new nlobjSearchColumn('custrecord_reply_email_address');
        columns[4] = new nlobjSearchColumn('custrecord_include_transaction');
        columns[5] = new nlobjSearchColumn('custrecord_follow_up_call');
        columns[6] = new nlobjSearchColumn('custrecord_call_date');
        columns[7] = new nlobjSearchColumn('isinactive');
        columns[8] = new nlobjSearchColumn('name');
        columns[9] = new nlobjSearchColumn('custrecord_default_transaction_author');
        
        var results = nlapiSearchRecord('customrecord_email_automation', null, filters, columns);
        if (results != null && results != '' && results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                // validates if the process date is within the desired period before the end of the month
                if (isValidDay(results[i].getValue('custrecord_days_before_end'))) {
                    findSavedSearchRecords(results[i].getValue('custrecord_saved_search'), results[i].getValue('custrecord_email_template'), results[i].getValue('custrecord_reply_email_address'), results[i].getValue('custrecord_include_transaction'), results[i].getValue('custrecord_follow_up_call'), results[i].getValue('custrecord_call_date'), results[i].getValue('name'), results[i].getValue('custrecord_default_transaction_author'));
                }
            }
        }
    } 
    catch (e) {
        logError('Finding Automation records', e);
    }
}


/**
 * This function creates a Phone Call event
 * @author olivier.ahad@it-ration.com
 * @param {int} company : company id
 * @param {int} daysAfter : call delay
 * param {int} tranID : transaction id
 * @return nothing
 **/
function setupFollowUpCall(company, daysAfter, tranID){

    try {
        var callDay = new Date();
        
        // validates if a correct number to avoid Nan/Nan/Nan dates
        if (daysAfter != null && daysAfter != '' && daysAfter > 0) {
            callDay = nlapiAddDays(callDay, daysAfter);
            if (callDay.getDay() == 0) {
                callDay = nlapiAddDays(callDay, 1);
            }
            else 
                if (callDay.getDay() == 6) {
                    callDay = nlapiAddDays(callDay, 2);
                }
        }
        callDay = nlapiDateToString(callDay);
        
        // gets company phone number to set for follow-up call
        var phone = nlapiLookupField('customer', company, 'phone'); // 5 Units
        // creates follow-up call record
        var phoneRecord = nlapiCreateRecord('phonecall'); // 5 Units
        phoneRecord.setFieldValue('title', 'Email Automation Follow up call');
        phoneRecord.setFieldValue('startdate', callDay);
        phoneRecord.setFieldValue('status', FIELD_STATUS_VALUE_SCHEDULED);
        phoneRecord.setFieldValue('phone', phone);
        
        phoneRecord.setFieldValue('company', company);
        phoneRecord.setFieldValue('transaction', tranID);
        
        nlapiSubmitRecord(phoneRecord); // 10 Units
    } 
    catch (e) {
        logError('Create followup call failed for company ' + company, e);
    }
}

/**
 * This function sends an email
 * @author olivier.ahad@it-ration.com
 * @param {String} recordType : record type
 * @param {int} customerId : customer id
 * @param {Object} address : destination address
 * @param {int} emailTemplate : email template
 * @param {Object} returnAddress : author address
 * @param {boolean} addTransaction : should we attach a transcation?
 * @param {int} tranID : transaction id to attach
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
        var mailInfo = nlapiMergeRecord(emailTemplate, recordType, tranID); // where search type is the record type of the current search, 10 Units
        /**
         * TODO : Remove comment for nlapiSendEmail()
         */
        //nlapiSendEmail(returnAddress, address, mailInfo.getName(), mailInfo.getValue(), EMAIL_CC, EMAIL_BCC, records, attachement); // 10 Units
        
        // logs to whom the messages are sent to
        nlapiLogExecution('audit', 'Email info', 'Email sent to ' + address + mailInfo.getName() + ' from ' + returnAddress + '\n' + mailInfo.getValue());
    } 
    catch (e) {
        logError('Email to ' + address + ' failed', e);
    }
}

/**
 * This function sends an email if at least 1 transaction failed
 * @author olivier.simard@erpguru.com
 * @param {Object} returnAddress : author address
 * @param {String} ruleName : Email Automation Rule name
 * @param {Object} listOfFailedTransaction : array with failed transactions id
 * @return nothing
 **/
function sendEmailWithFailedTransaction(returnAddress, ruleName, listOfFailedTransaction){
    var subject = 'Results for the ' + ruleName + ' Email Automation Rule';
    var body = 'While performing the ' + ruleName + ' Email Automation Rule, no emails or follow up calls were performed for the following list of transactions: ';
    
    try {
        // Sends the email of all transactions that could not be sent automatically
        for (var i = 0; i < listOfFailedTransaction.length; i++) {
            body += '\n' + listOfFailedTransaction[i];
        }
        /**
         * TODO : Remove comment for nlapiSendEmail()
         */
        //nlapiSendEmail(returnAddress, returnAddress, subject, body, EMAIL_CC, EMAIL_BCC); // 10 Units
        nlapiLogExecution('audit', 'Email info failed transactions', 'Email sent to : ' + returnAddress + ' from ' + returnAddress +
        '\nSubject : ' +
        subject +
        '\nBody : ' +
        body);
    } 
    catch (e) {
        logError('Email to ' + returnAddress + ' failed', e);
    }
}

/**
 * This function saves the search performed on the specified transaction
 * @author olivier.ahad@it-ration.com
 * @param {String} recordType : record type
 * @param {int} tranId : transaction id
 * @param {int} searchID : search  id
 * @return nothing
 **/
function saveProcess(recordType, tranId, searchID){
    try {
        // acquires list of current saved searches for which the emails have been sent
        var tranRec = nlapiLoadRecord(recordType, tranId); // 10 Units
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
        nlapiSubmitRecord(tranRec); // 20 Units
    } 
    catch (e) {
        logError('Save Process', e);
    }
}

/**
 * This function takes a transaction found by the saved search and performs the emailing necessary
 * @author olivier.ahad@it-ration.com
 * @param {String} recordType : record type
 * @param {int} tranId : transaction id
 * @param {Object} salesRepEmail : transaction sales rep email
 * @param {int} savedSearch : saved search id
 * @param {int} companyID : company/customer id
 * @param {int} customerEmail : customer email
 * @param {int} template : email template
 * @param {Object} returnAddress : author email
 * @param {boolean} addTransaction : should include transaction
 * @param {boolean} followup : should create follow up call
 * @param {int} callDelay : call delay for follow up
 * @param {Object} contactEmail : contact email in transaction (custom field)
 * @param {String} ruleName : Email Automation Rule name
 * @param {Object} listOfFailedTransaction : array with failed transactions id
 * @param {int} customerSalesrep : customer's sales rep id 
 * @param {Object} defaultEmailAuthor : default email found in custom record
 * @return {Object} list of failed transactions
 * @modified by olivier.simard@erpguru.com
 **/
function processRecord(recordType, tranId, salesRepEmail, savedSearch, companyID, customerEmail, template, returnAddress, addTransaction, followup, callDelay, contactEmail, ruleName, listOfFailedTransaction, customerSalesrep, defaultEmailAuthor){
    // 75 Units + 10 for the failed transasctions email
    verifyMetering(80, null); // 20 Units
    try {
        /**
         * TODO : Remove comment for saveProcess()
         */
        // save the saved search as processed
        //saveProcess(recordType, tranId, savedSearch); // 30 Units
        
        if (contactEmail != null && contactEmail != '') {
            try {
                if (salesRepEmail == null || salesRepEmail == '') {
                    if (customerSalesrep != null && customerSalesrep != '') {
                        // send email from customer's sales rep, if no sales rep in transaction
                        salesRepEmail = customerSalesrep;						
                    }
                    if (salesRepEmail == null || salesRepEmail == '') {
                        // send email from "Default Transaction Email " field in custom record, if no customer's sales rep
                        salesRepEmail = defaultEmailAuthor;
                    }
                }
                // sends the email
                sendEmail(recordType, companyID, contactEmail, template, salesRepEmail, addTransaction, tranId); // 20 Units
            } 
            catch (e) {
                logError('Mail and validation', e);
            }
            // create follow up call if needed
            if (followup == 'T') {
                setupFollowUpCall(companyID, callDelay, tranId); // 20 Units
            }
        }
        else {
            // No contact email, add to failed list
            var tranName = nlapiLookupField('transaction', tranId, 'tranid'); // 10 Units
            nlapiLogExecution('error', 'Contact email not found for ' + recordType + ' : ' + tranName);
            listOfFailedTransaction.push(tranName);
        }
    } 
    catch (e) {
        logError('Process records', e);
    }
    
    return listOfFailedTransaction;
}

/**
 * This function finds all the transaction records that have not been processed by the saved search
 * @author olivier.ahad@it-ration.com
 * @param {int} savedSearch : saved search id
 * @param {int} template : email template
 * @param {Object} address : author email
 * @param {boolean} addTransaction : should include transaction
 * @param {boolean} followup : should create follow up call
 * @param {int} callDelay : call delay for follow up
 * @param {String} ruleName : Email Automation Rule name
 * @param {Object} defaultEmailAuthor : default email found in custom record
 * @return nothing
 **/
function findSavedSearchRecords(savedSearch, template, address, addTransaction, followup, callDelay, ruleName, defaultEmailAuthor){
    // Verify that we have enough metering to process at least 1 transaction before we execute the search
    // 10 Units Search, 75 Units ProcessRecord, 10 Units Failed Transactions Email
    verifyMetering(95, null);
    
    try {
        var searchFilters = [];
        var searchColumns = [];
        
        // find transactions which have not been processed as defined by the multi-select saved search flag
        searchFilters[0] = new nlobjSearchFilter('custbody_saved_search_processed_flag', null, 'noneof', savedSearch, null);
        searchFilters[1] = new nlobjSearchFilter('mainline', null, 'is', 'T', null);
        searchColumns[0] = new nlobjSearchColumn('internalid');
        searchColumns[1] = new nlobjSearchColumn('internalid', 'customer');
        searchColumns[2] = new nlobjSearchColumn('email', 'customer');
        searchColumns[3] = new nlobjSearchColumn('custbody_contact_email');
        searchColumns[4] = new nlobjSearchColumn('email', 'salesrep');
        searchColumns[5] = new nlobjSearchColumn('salesrep', 'customer');
        
        // find the transaction records related to the saved search
        var results = nlapiSearchRecord('transaction', savedSearch, searchFilters, searchColumns); // 10 Units
        // go through each transaction returned
        if (results != null && results != '' && results.length > 0) {
        
            var listOfFailedTransaction = [];
            
            //Loop through transaction search results
            for (var i = 0; i < results.length; i++) {
                var customerEmail = results[i].getValue('email', 'customer');
                var customer = results[i].getValue('internalid', 'customer');
                var tranId = results[i].getValue('internalid');
                var contactEmail = results[i].getValue('custbody_contact_email');
                var salesrepEmail = results[i].getValue('email', 'salesrep');
                var customerSalesrep = results[i].getValue('salesrep', 'customer');
                
                var recordType = results[i].getRecordType();
                
                if (customer != null && customer != '') {
                    // Process the transaction
                    listOfFailedTransaction = processRecord(recordType, tranId, salesrepEmail, savedSearch, customer, customerEmail, template, address, addTransaction, followup, callDelay, contactEmail, ruleName, listOfFailedTransaction, customerSalesrep, defaultEmailAuthor); // 75 Units
                }
            }
            
            // inform about the transactions which did not have any emails sent
            if (listOfFailedTransaction != null && listOfFailedTransaction != '') {
                nlapiLogExecution("DEBUG", "listOfFailedTransaction", listOfFailedTransaction);
                sendEmailWithFailedTransaction(address, ruleName, listOfFailedTransaction); // 10 Units
            }
        }
    } 
    catch (err) {
        logError('Saved search failed or not estimate nor invoice', err);
    }
}

/**
 * This function determines if the day is valid and not during a weekend
 * @author olivier.ahad@it-ration.com
 * @param {int} daysAhead : days before end of month
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
    } 
    catch (e) {
        logError('Check valid day', e);
    }
    /**
     * TODO : set to false
     */
    return true;
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
            }
            else {
                msg.push('**stacktrace length < 20**');
                for (var i = 0; stacktrace != null && i < stacktrace.length; i++) {
                    msg.push(stacktrace[i]);
                }
            }
        }
    }
    else {
        msg.push('[javascript exception]');
        msg.push('User: {0}' + nlapiGetUser());
        msg.push(err.toString());
    }
    
    nlapiLogExecution('error', title, msg);
}
