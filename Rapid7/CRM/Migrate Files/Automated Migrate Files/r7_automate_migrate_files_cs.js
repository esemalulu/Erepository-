/**
 * Module Description
 * 
 * Version    Date            Author           
 *  1.0     10.05.2016       BostonSD
 *                          Karmanov Egor
 *                          
 * Client script needs for call the suitelet for automatically migrate messages
 * and files from one customer to another
 *
 * 
 * @requires 
 * SuiteLets:
 * customscript_r7automigratefilesuitelet - R7 Auto migrate customer files suitelet
 * customscript_r7automigratemesagessuite - R7 Auto migrate messages Suitelet
 *    
 */
/*
 * This function calls R7 Auto migrate customer files suitelet and shows
 * the migration process results to user
 */
function r7_migrate_files() {
    document.getElementById('custpage_automatemigratefiles').value = 'Migrating...';
    if (!confirm('Are you sure you want to migrate all files?')) {
        document.getElementById('custpage_automatemigratefiles').value = 'Migrate all files';
        return;
    }

    var customerId = nlapiGetRecordId();
    var customerToId = nlapiLookupField(nlapiGetRecordType(), customerId, 'custentityr7linkedcustomer');

    if (!customerToId)
    {
        document.getElementById('custpage_automatemigratefiles').value = 'Migrate all files';
        alert('There is no customer in "Linked customer" field! Please select a customer to attach the files to.');
        return;
    }

    var suiteletURL = nlapiResolveURL('SUITELET', 'customscript_r7automigratefilesuitelet', 'customdeploy_r7automigratefilesuitelet', false);
    var url = suiteletURL + '&custparam_customerid=' + customerId + '&custparam_customertoid=' + customerToId;

    var response = nlapiRequestURL(url);
    var responseBody = response.getBody();

    if (responseBody == null || responseBody == '') {
        document.getElementById('custpage_automatemigratefiles').value = 'Migrate all files';
        alert('Something went wrong. Please contact the Administrator.');
    }

    var objResponse = JSON.parse(responseBody);
    if (objResponse.success) {
        alert(objResponse.message);
        location.reload();
    }
    else {
        alert(objResponse.error);
        document.getElementById('custpage_automatemigratefiles').value = 'Migrate all files';
    }
}
/*
 * This function calls R7 Auto migrate messages Suitelet and shows
 * the migration process results to user
 */
function r7_migrate_all_messages()
{
    document.getElementById('custpage_automatemigratemessages').value = 'Migrating...';
    var customerId = nlapiGetRecordId();
    var customerToId = nlapiLookupField(nlapiGetRecordType(), customerId, 'custentityr7linkedcustomer');
    if (!customerToId)
    {
        document.getElementById('custpage_automatemigratemessages').value = 'Migrate all messages';
        alert('There is no customer in "Linked customer" field! Please select a customer to migrate the messages to.');
        return;
    }
    var suiteletURL = nlapiResolveURL('SUITELET', 'customscript_r7automigratemesagessuite', 'customdeploy_r7automigmessages', false);
    suiteletURL += '&custparam_customerid=' + customerId + '&custparam_customertoid=' + customerToId + '&custparam_userid=' + nlapiGetUser();
    
    var response = nlapiRequestURL(suiteletURL);
    var responseBody = response.getBody();

    if (responseBody == null || responseBody == '') {
        document.getElementById('custpage_automatemigratemessages').value = 'Migrate all messages';
        alert('Something went wrong. Please contact the Administrator.');
    }

    var objResponse = JSON.parse(responseBody);
    if (objResponse.success) {
        alert(objResponse.message);
        location.reload();
    }
    else {
        alert(objResponse.error);
        document.getElementById('custpage_automatemigratemessages').value = 'Migrate all messages';
    }
}