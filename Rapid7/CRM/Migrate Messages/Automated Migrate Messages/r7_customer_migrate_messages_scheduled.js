/**
 * Module Description
 * 
 * Version    Date            Author           
 *  1.0     10.05.2016       BostonSD
 *                          Karmanov Egor
 * Schedule Script                          
 * The script migrates all messages from one customer to another.
 * There are 2 modes for the script:
 *  1. Migrate on demand. User clicks the button on a customer record and the schedule
 *     script migrates all messages
 *  2. Automated migration. The script runs on a schedule, selects all customers
 *     from the saved search and migrates messages for all of the selected customers
 *    
 */
var context;
var timeLimitInMinutes;
var timeLimitInMilliseconds;
var startingTime;
var rescheduleScript;
function r7_sch_migrateMessages()
{
    context = nlapiGetContext();
    timeLimitInMinutes = 40;
    timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
    startingTime = new Date().getTime();
    rescheduleScript = false;
    var search;
    //On demand mode
    if (context.getDeploymentId() === 'customdeploy_r7automigratemessages')
    {
        search = context.getSetting('SCRIPT', 'custscript_r7seondemand');
    }
    else {
        search = context.getSetting('SCRIPT', 'custscript_r7semuautomigrate');
    }
    migrateMessagesOnDemand(search);
    // Reschedule current script if need
    reScheduled();
}
/*
 * getArrayOfMessagesIds
 * The function selects all messages from a customer and returns an array of the messages' ids
 *  
 * @param
 *  customerId - The internal id of customer
 *
 * 
 * @returns
 * Array - array of messages ids
 */
function getArrayOfMessagesIds(customerId)
{
    var aMessagesIds = [];
    var seCustomerMessages = context.getSetting('SCRIPT', 'custscript_r7secustomermessages');
    if (!seCustomerMessages) {
        return aMessagesIds;
    }
    var arrSearchFilters = new Array();
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalId', 'customer', 'is', customerId);
    var results = nlapiSearchRecord('message', seCustomerMessages, arrSearchFilters);
    for (var i = 0; results !== null && i < results.length; i++) {
        var columns = results[i].getAllColumns();
        aMessagesIds.push(parseInt(results[i].getValue(columns[0])));
    }
    return aMessagesIds;
}
/**
 * getArrayOfSuccessMessages
 * The function selects all successfully migrated messages from customer and returns array of the messages' ids
 *  
 * @param
 *  customerId - The internal id of customer
 *
 * 
 * @returns
 * Array - array of successfully migrated messages ids
 */
function getArrayOfSuccessMessages(customerId)
{
    var aSuccessMessagesIds = [];
    var seCustomerSuccessMessages = context.getSetting('SCRIPT', 'custscript_r7sesuccessfullymigrated');
    if (!seCustomerSuccessMessages) {
        return aSuccessMessagesIds;
    }
    var arrSearchFilters = new Array();
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecord_r7customerid', null, 'is', customerId);
    var results = nlapiSearchRecord('customrecord_r7migratedmessages', seCustomerSuccessMessages, arrSearchFilters);

    for (var i = 0; results !== null && i < results.length; i++) {
        var columns = results[i].getAllColumns();
        aSuccessMessagesIds.push(parseInt(results[i].getValue(columns[3])));
    }
    return aSuccessMessagesIds;
}
/**
 * migrateMessagesOnDemand
 * The function selects all messages to the linked customer and sends an email
 * to the user after the process have been completed.
 *  
 * @param
 *  searchOnDemand - The internalid of saved search.
 *
 * 
 * @returns
 *  void
 */

function migrateMessagesOnDemand(searchOnDemand)
{
    if (!searchOnDemand) {
        return;
    }
    var arrResults = nlapiSearchRecord('customrecord_r7migratedmessages', searchOnDemand);
    for (var i = 0; arrResults !== null && i < arrResults.length && isTimeLeft() && isUnitsLeft(); i++) {
        var columns = arrResults[i].getAllColumns();
        var rowId = arrResults[i].getValue(columns[0]);
        var customerId = arrResults[i].getValue(columns[1]);
        var customerName = arrResults[i].getText(columns[1]);
        var customerToId = arrResults[i].getValue(columns[2]);
        var userId = arrResults[i].getValue(columns[3]);
        var userEmail = arrResults[i].getValue(columns[4]);
        //array of all messages from current customer
        var messagesIds = getArrayOfMessagesIds(customerId);
        //array of successfully migrated messages
        var successMessagesIds = getArrayOfSuccessMessages(customerId);
        //array of messages are to be migrated
        var needMigrateId = getUnprocessedIds(successMessagesIds, messagesIds);
        //results of migration
        var emailBody = migrateMessagesFormOneCustomer(needMigrateId, customerToId, customerId);
        emailBody += '\nAmount of all messages = ' + messagesIds.length;
        emailBody += '\nAlready Successfully migrated messages = ' + successMessagesIds.length;
        nlapiLogExecution('DEBUG', 'Current Customer Id = ' + customerId + 'Linked Customer Id = ' + customerToId, emailBody);
        if (isTimeLeft() && isUnitsLeft())
        {
            if (userEmail) {
                try {
                    //send an email and delete record
                    nlapiSendEmail(106223954, userEmail, 'Messages migration process for customer ' + customerName + ' has been completed', emailBody);
                }
                catch (e)
                {
                    nlapiLogExecution('ERROR', 'Error during email sending', e);
                }
            }
            nlapiDeleteRecord('customrecord_r7migratedmessages', rowId);
        }
    }
}
/**
 * migrateMessagesFormOneCustomer
 * The function creates a copy of message, change the customer in this new message to linkend customer,
 * creates record in Messages Migrated record type
 * and returns responce text with results.
 *  
 * @param
 *  messagesId - array of messages are to be migrated.
 *  customerToId - internal id of linked customer
 *  customerId - internal id of customer
 *
 * 
 * @returns
 *  responce text
 */
function migrateMessagesFormOneCustomer(messagesId, customerToId, customerId)
{
    var successCount = 0;
    var failedCount = 0;
    var responceText = '';
    for (var key = 0; key < messagesId.length && isTimeLeft() && isUnitsLeft(); key++) {

        var recordId;
        var record = nlapiCopyRecord('message', messagesId[key]);

        record.setFieldValue('entity', customerToId);
        var authorEmail = record.getFieldValue('authoremail');
        if (authorEmail == '' || authorEmail == null) {

            var authorEmail = 'netsuite_admin@rapid7.com';
            record.setFieldValue('authoremail', authorEmail);
        }

        try {
            recordId = nlapiSubmitRecord(record, false, true);
            successCount++;
        }
        catch (e) {
            nlapiLogExecution('ERROR', 'ERROR during migrate process:' + e);
            try {
                nlapiSendEmail(106223954, '93548925', 'There is and error during Messages migration process for customerid ' + customerId, 'Messages id is ' + messagesId[key]);
            }
            catch (e)
            {
                nlapiLogExecution('ERROR', 'Error during email sending', e);
            }
            responceText += '\nError during migrateprocess' + e;
            failedCount++;
        }
        if (recordId)
        {
            var successRecord = nlapiCreateRecord('customrecord_r7migratedmessages');
            successRecord.setFieldValue('custrecord_r7customerid', customerId);
            successRecord.setFieldValue('custrecord_r7messagesid', messagesId[key]);
            successRecord.setFieldValue('custrecord_r7createdmessageid', recordId);
            nlapiSubmitRecord(successRecord);
        }
        recordId = null;
    }
    responceText += '\nAmount of messages are to be migrated = ' + messagesId.length;
    responceText += '\nSuccessfully processed messages = ' + successCount;
    responceText += '\nUnsuccessfully processed messages = ' + failedCount;
    return responceText;
}

function getUnprocessedIds(successArray, allMessages)
{
    var unprocessedIdsArray = [];
    if (successArray.length < 1) {
        return allMessages;
    }
    for (var key = 0; key < allMessages.length; key++) {
        var isInArray = false;
        for (var secondKey = 0; secondKey < successArray.length; secondKey++) {
            if (successArray[secondKey] == allMessages[key]) {
                isInArray = true;
            }
        }
        if (!isInArray)
        {
            unprocessedIdsArray.push(allMessages[key]);
        }
    }
    return unprocessedIdsArray;
}

function isTimeLeft() {
    var presentTime = new Date().getTime();
    if (rescheduleScript || presentTime - startingTime > timeLimitInMilliseconds) {
        rescheduleScript = true;
        return false;
    }
    return true;
}

function isUnitsLeft() {
    var unitsLeft = context.getRemainingUsage();
    if (rescheduleScript || unitsLeft <= 200) {
        rescheduleScript = true;
        return false;
    }
    return true;
}

function reScheduled()
{
    if (rescheduleScript) {
        var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
    }
}
