function r7_migrateFiles_suitelet(request, response)
{
    var customerId = request.getParameter('custparam_customerid');
    var customerToId = request.getParameter('custparam_customertoid');
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
    
    var migrateFileSavedSearch = nlapiGetContext().getSetting('SCRIPT', 'custscript_r7autosavedsearchparam');
    if (migrateFileSavedSearch == null || migrateFileSavedSearch == '')
    {
        return response.writeLine(JSON.stringify({
            success: false,
            error: 'Code: NO_SEARCH' + '\nDetails: A Saved Search associated with the script is not found. Please, contact your administrator!'
        }));
    }

    var listResults = grabCustomerFiles(customerId, migrateFileSavedSearch);
    if (listResults == null || listResults == '') {
        return response.writeLine(JSON.stringify({
            success: false,
            error: 'Code: NO_FILES' + '\nDetails: The action can no be performed. There are no files attached to the customer!'
        }));
    }

    var responseText = migrateAllFiles(customerToId, listResults);
    return response.writeLine(JSON.stringify({
        success: true,
        message: responseText
    }));
}

function migrateAllFiles(customerToId, savedSearchResults)
{
    var responceText = '';
    var successCount = 0;
    var unsuccessCount = 0;
    for (var i = 0; i < savedSearchResults.length; i++)
    {
        var columns = savedSearchResults[i].getAllColumns();
        try {
            nlapiAttachRecord('file', savedSearchResults[i].getValue(columns[0]), 'customer', customerToId);
            successCount++;
        }
        catch (e) {
            nlapiLogExecution('ERROR', 'ERROR during attach process', e);
            unsuccessCount++;
            responceText = responceText + e;
        }
    }
    responceText += '\nMigration proccess completed.';
    responceText += '\nNumber of files= ' + savedSearchResults.length;
    responceText += '\nSuccessfully processed files= ' + successCount;
    responceText += '\nUnsuccessfully processed files= ' + unsuccessCount;
    return responceText;
}

function grabCustomerFiles(customerId, migrateFileSavedSearch) {
    var arrSearchFilters = new Array();
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalId', null, 'is', customerId);
    return nlapiSearchRecord('customer', migrateFileSavedSearch, arrSearchFilters);
}