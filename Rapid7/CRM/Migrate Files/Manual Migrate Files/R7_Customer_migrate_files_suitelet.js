/*
 * startMigrate - main function. If method is get, this function prepeares web form.
 * If method is post, function starts to attach selected files to another customer.
 */
function startMigrate(request, response) {
    var method = request.getMethod();
    if (method == 'GET') {
        // Main checks section
        var customerId = request.getParameter('custparam_customer');
        var customerToId = request.getParameter('custparam_customertoid');
        if (customerId == null || customerId == '') {
            throw nlapiCreateError('MISSING_PARAM', 'Request is missing a required parameter', true);
        }
        var migrateFileSavedSearch = nlapiGetContext().getSetting('SCRIPT', 'custscript_r7savedsearchparam');
        if (migrateFileSavedSearch == null || migrateFileSavedSearch == '')
        {
            throw nlapiCreateError('NO_SEARCH', 'A Saved Search associated with the script is not found. Please, contact your administrator!', true);
        }
        var listResults = grabCustomerFiles(customerId, migrateFileSavedSearch);
        if (listResults == null || listResults == '') {
            throw nlapiCreateError('NO_FILES', 'The action can no be performed. There are no files attached to the customer!', true);
        }
        var subsidiaryId = request.getParameter('custparam_subsidiary');
        
        // Form creation section
        var form = nlapiCreateForm('Migrate files', true);
        //Set r7_customer_migrate_files_cs client script.
        form.setScript('customscript_r7migratecustomerfilescs');
        form.addFieldGroup('custpage_curcustgroup', ' ').setSingleColumn(true);
        form.addFieldGroup('custpage_selcustgroup', ' ').setSingleColumn(true);
        var filesList = form.addSubList('custpage_files', 'list', 'Files to migrate');

        var fldCustomerId = form.addField('custpage_customerid', 'select', 'from Customer', 'customer', 'custpage_curcustgroup').setDisplayType('inline');
        var fldCustomerToId = form.addField('custpage_customertoid', 'select', 'to Customer', 'customer', 'custpage_selcustgroup');
        fldCustomerId.setDefaultValue(customerId);

        var fldCurSubsidiaryId = form.addField('custpage_customersubsidiary', 'select', 'Subsidiary', 'subsidiary', 'custpage_curcustgroup').setDisplayType('inline');
        fldCurSubsidiaryId.setDefaultValue(subsidiaryId);
        var fldCusToSubsidiaryId = form.addField('custpage_customertosubsidiary', 'select', 'Subsidiary of to customer', 'subsidiary', 'custpage_selcustgroup').setDisplayType('inline');
        if (customerToId) {
            fldCustomerToId.setDefaultValue(customerToId);
            fldCusToSubsidiaryId.setDefaultValue(request.getParameter('custparam_customertosubsidiary'));
        }
        //Fields of list 
        var listCheckBox = filesList.addField('custpage_checkbox', 'checkbox', 'Migrate file?');
        var linkToFile = filesList.addField('custpage_linktofile', 'text', 'Attached file', 'file');
        var fileFolder = filesList.addField('custpage_filefolder', 'text', 'Folder');
        var fileSize = filesList.addField('custpage_filesize', 'text', 'Size(KB)');
        var lastModified = filesList.addField('custpage_lastmodified', 'text', 'Last modified');
        var documentType = filesList.addField('custpage_documenttype', 'text', 'Document type');
        var fileId = filesList.addField('custpage_fileid', 'text', 'Document type');
        fileId.setDisplayType('hidden');
        filesList.addMarkAllButtons();
        // Fills files list with data
        if (listResults) {
            for (var i = 0; i < listResults.length; i++) {
                var columns = listResults[i].getAllColumns();
                filesList.setLineItemValue('custpage_fileid', i + 1, listResults[i].getValue(columns[0]));
                filesList.setLineItemValue('custpage_linktofile', i + 1, '<a href=# onClick="popUpWindow(\'' + listResults[i].getValue(columns[6]) + '\', \'800\',\'800\');">' + listResults[i].getValue(columns[1]) + '</a>');
                filesList.setLineItemValue('custpage_filefolder', i + 1, listResults[i].getValue(columns[2]));
                filesList.setLineItemValue('custpage_lastmodified', i + 1, listResults[i].getValue(columns[3]));
                filesList.setLineItemValue('custpage_documenttype', i + 1, listResults[i].getValue(columns[4]));
                filesList.setLineItemValue('custpage_filesize', i + 1, listResults[i].getValue(columns[5]));
            }
        }
        //Add button, which calls startAttach() function in r7_customer_migrate_files_cs.js
        form.addButton('custpage_submit', 'Submit', 'startAttach();');
        form.addButton('custpage_cancel', 'Cancel', 'closeWindow();');
        response.writePage(form);
    }
    if (method == 'POST') {
        var filesIds = request.getParameter('custparam_filesids');
        var customerToId = request.getParameter('custparam_customertoid');
        if (!filesIds) {
            throw nlapiCreateError('MISSING_PARAM', 'There are no files to migrate', true);
        }
        var responceText = attach(customerToId, filesIds);
        response.addHeader('Custom-Header-ANSWER', responceText);
    }
}
// This function calls saved search and create new filter. Function returns array of customer files.
function grabCustomerFiles(customerId, migrateFileSavedSearch) {
    var arrSearchFilters = new Array();
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalId', null, 'is', customerId);
    var arrSearchResults = nlapiSearchRecord('customer', migrateFileSavedSearch, arrSearchFilters);
    return arrSearchResults;
}
// This function is attached files (filesIds) to customer (customerToId).
function attach(customerToId, filesIds) {
    var responceText = '';
    var fieldArray = filesIds.split(',');
    for (var i = 0; i < fieldArray.length; i++) {
        try {
            nlapiAttachRecord('file', fieldArray[i], 'customer', customerToId);
        }
        catch (e) {
            nlapiLogExecution('ERROR', 'ERROR during attach process', e);
            responceText = responceText + e;
        }
    }
    responceText = responceText + "All files were migrate successfully";
    return responceText;
}
