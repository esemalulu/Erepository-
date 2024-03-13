/**
 * Module Description
 * 
 * Version    Date            Author           
 *  1.0     10.05.2016       BostonSD
 *                          Karmanov Egor
 * Suitelet                          
 *  Suitelet performs some checks and then calls the scheduled 
 *   script for the automated migration of messages.
 *    
 */
/**
 * r7_migrate_all_messages function resives
 *  
 * @param
 * request - request from the user
 * response - responce to the user
 *
 * 
 * @returns
 * json responce
 */
function r7_migrate_all_messages(request, response)
{
    var customerId = request.getParameter('custparam_customerid');
    var customerToId = request.getParameter('custparam_customertoid');
    var userId = request.getParameter('custparam_userid');

    if (customerId == null || customerId == '') {
        return response.writeLine(JSON.stringify({
            success: false,
            error: 'Code: MISSING_PARAM' + '\nDetails: Request is missing a customer internalId'
        }));
    }

    if (customerToId == null || customerToId == '') {
        return response.writeLine(JSON.stringify({
            success: false,
            error: 'Code: MISSING_PARAM' + '\nDetails: Request is missing a customer to internalId'
        }));
    }

    if (!isCustomerHasAnyMessage(customerId, 'customsearch_r7customermigratemessages')) {
        return response.writeLine(JSON.stringify({
            success: false,
            error: 'Code: NO_Messages' + '\nDetails: The action can no be performed. There are no files attached to the customer!'
        }));
    }

    if (isRequestExists(customerId, customerToId, userId))
    {
        return response.writeLine(JSON.stringify({
            success: true,
            message: 'Your request has not been processed yet. You will receive an email with the process results as soon as the process will be completed.'
        }));
    }
    
    var recordId = addToRecordTypeForMigrate(customerId, customerToId, userId);
    if(!recordId){
        return response.writeLine(JSON.stringify({
            success: false,
            error: 'Something went wrong. Please contact the Administrator.'
        }));
    }
    var scheduleScriptId = nlapiGetContext().getSetting('SCRIPT', 'custscript_r7schscriptid');
    if(!scheduleScriptId)
    {
        return response.writeLine(JSON.stringify({
            success: false,
            error: 'A schedule script associated with the script is not found. Please, contact your administrator!'
        }));
    }
    // Call schedule script. This script will migrate all messages from current customer to linked customer
    var status = nlapiScheduleScript(scheduleScriptId, 'customdeploy_r7automigratemessages');
    nlapiLogExecution('AUDIT', 'status', status);
    
    return response.writeLine(JSON.stringify({
        success: true,
        message: 'Messages are migreting now. You will receive an email with the process results as soon as the process will be completed.'
    }));
}
/*
 * addToRecordTypeForMigrate
 *  The function Adds new record into Migrated Messages record type.
 *  This record is necessary for the schedule scripts.
 * @param
 *  customerId - internal id of customer
 *  customerToId - internal id of linked customer
 *  userId - internal id of user who clicked the button
 * @returns
 *  id - internal id of newly created record
 */
function addToRecordTypeForMigrate(customerId, customerToId, userId)
{
    var id;
    var record = nlapiCreateRecord('customrecord_r7migratedmessages');
        record.setFieldValue('custrecord_r7customerid', customerId);
        record.setFieldValue('custrecord_r7customertoid', customerToId);
        record.setFieldValue('custrecord_r7userid', userId);
    try {
        id = nlapiSubmitRecord(record);
    }
    catch (e) {
        nlapiLogExecution('ERROR', 'ERROR during record creation', e);
    }
    return id;
}
/*
 * checkRequest
 *  The function checks if the migration request from the user is already exists
 *  in Migrated Messages record type.
 *  
 * @param
 *  customerId - internal id of customer
 *  customerToId - internal id of linked customer
 *  userId - internal id of user who clicked the button
 * @returns
 *  boolean
 *      true - request is already exists
 *      false - there is no request
 */
function isRequestExists(customerId, customerToId, userId)
{
    var arrSearchFilters = new Array();
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecord_r7customerid', null, 'is', customerId);
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecord_r7customertoid', null, 'is', customerToId);
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecord_r7userid', null, 'is', userId);
    var arrSearchColumns = new Array();
        arrSearchColumns[arrSearchColumns.length] = new nlobjSearchColumn('internalid');
    var arrSearchResults = nlapiSearchRecord('customrecord_r7migratedmessages', null, arrSearchFilters, arrSearchColumns);
    if (arrSearchResults && arrSearchResults.length > 0)
    {
        return true;
    }
    return false;
}
/*
 * isCustomerHasAnyMessage
 *  Checks if the customer has any messages
 *  
 * @param
 *  customerId - internal id of customer
 *  searchName - name of the search, which selects messages of given cusstomer
 * @returns
 *  boolean
 *      true - there are messages
 *      false - there are not messages
 */
function isCustomerHasAnyMessage(customerId, searchName){
    var arrSearchFilters = new Array();
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalId', 'customer', 'is', customerId);
    var results = nlapiSearchRecord('message', searchName, arrSearchFilters);
    if(results && results.length > 0){
        return true;
    }
    return false;
}