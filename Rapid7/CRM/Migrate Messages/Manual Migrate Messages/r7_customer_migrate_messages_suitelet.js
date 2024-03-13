/**
 * Module Description
 * 
 * Version    Date            Author           
 * 1.00       15 SEP 2016     BostonSD, Karmanov Egor
 * This suitelet creates an on demand action to move/copy messages from Old
 * Customer to New Customer
 * 
 * @requires:
 * savedsearch - SCRIPT - Customer migrate message (customscript_r7customermigratemessages)
 *               as script parameter
 * ClientScript - R7 Customer migrate messages CS (customscript_r7customermigratemessagescs)
 */
/*
 * startMigrate - main function. If method is get, this function prepeares web form.
 * If method is post, function starts to attach selected masseges to another customer.
 */
function startMigrate(request, response) {
    var method = request.getMethod();
    this.request = request;
    if (method == 'GET') {
        response.writePage(getForm());
    }
    if (method == 'POST') {
        var responceText = '';
        var successCount = 0;
        var failCount = 0;
        var arrMessagesErrorId = [];
        var customerTo = request.getParameterValues('custpage_customertoid');
        for (var i = 1; i <= request.getLineItemCount('custpage_messages'); i++) {
            var selected = request.getLineItemValue('custpage_messages', 'custpage_checkbox', i);
            if (selected === 'T') {
                var massegeId = request.getLineItemValue('custpage_messages', 'custpage_messageid', i);
                var subject = request.getLineItemValue('custpage_messages', 'custpage_subject', i);
                var recipient = request.getLineItemValue('custpage_messages', 'custpage_recipient', i);
                var author = request.getLineItemValue('custpage_messages', 'custpage_author', i);
                try {
                    var record = nlapiCopyRecord('message', massegeId);
                    record.setFieldValue('entity', customerTo);
                    nlapiSubmitRecord(record);
                    successCount++;
                }
                catch (e) {
                    nlapiLogExecution('ERROR', 'ERROR during migrate process', e);
                    arrMessagesErrorId.push(massegeId);
                    responceText += '\nThere was an error with message. Subject= '+ subject+'. Error =' + e;
                    failCount++;
                }
            }
        }
        responceText += '\nSuccessfully processed messages = ' +successCount;
        responceText += '\nUnsuccessfully processed messages = ' +failCount;
        var params = new Array();
            params['custparam_messageids'] = (arrMessagesErrorId.length > 0) ? arrMessagesErrorId.join(',') : arrMessagesErrorId;
            params['custparam_customertoid'] = customerTo;
            params['custparam_responceText'] = responceText;
            params['custparam_customer'] = request.getParameterValues('custpage_customerid');
            params['custparam_subsidiary'] = request.getParameterValues('custpage_customersubsidiary');
            params['custparam_customertosubsidiary'] = request.getParameterValues('custpage_customertosubsidiary');
        nlapiSetRedirectURL('SUITELET', 'customscript_r7customermigratemessages', 'customdeploy_r7deploymigratemessages', null, params);
    }
}
// This function calls saved search and create new filter. Function returns array of customer messages.
function grabCustomerMessages(customerId, savedSearchName) {
    var arrSearchFilters = new Array();
    if (request.getParameter('custparam_messageids'))
    {
        var messageArray = request.getParameter('custparam_messageids');
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalId', null, 'anyof', messageArray.split(','));
    }
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalId', 'customer', 'is', customerId);
    return nlapiSearchRecord('message', savedSearchName, arrSearchFilters);
}
/*
 * Function prepare web form and returns it to client side
 * @returns {nlobjForm}
 */
function getForm()
{
    var customerId = request.getParameter('custparam_customer');
    var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
    var customerToId = request.getParameter('custparam_customertoid');
    if (customerId == null || customerId == '') {
        throw nlapiCreateError('MISSING_PARAM', 'Request is missing a required parameter', true);
    }
    var migrateMesagesSavedSearch = nlapiGetContext().getSetting('SCRIPT', 'custscript_r7messagessavedsearchparam');
    if (migrateMesagesSavedSearch == null || migrateMesagesSavedSearch == '')
    {
        throw nlapiCreateError('NO_SEARCH', 'A Saved Search associated with the script is not found. Please, contact your administrator!', true);
    }
    var listResults = grabCustomerMessages(customerId, migrateMesagesSavedSearch);
    if (listResults == null || listResults == '') {
        throw nlapiCreateError('NO_MESSAGES', 'The action can no be performed. There are no messages attached to the customer!', true);
    }
    var subsidiaryId = request.getParameter('custparam_subsidiary');
    var form = nlapiCreateForm('Migrate messages', true);
    //Set R7 Customer migrate messages CS  client script.
    form.setScript('customscript_r7customermigratemessagescs');
    form.addFieldGroup('custpage_curcustgroup', ' ').setSingleColumn(true);
    form.addFieldGroup('custpage_selcustgroup', ' ').setSingleColumn(true);
    var filesList = form.addSubList('custpage_messages', 'list', 'Messages to migrate');
    var fieldResult = form.addField('custpage_result', 'richtext','Results').setDisplayType('hidden');;
    fieldResult.setDefaultValue(request.getParameter('custparam_responceText'));
    var fldCustomerId = form.addField('custpage_customerid', 'select', 'from Customer', 'customer', 'custpage_curcustgroup').setDisplayType('inline');
    var fldCustomerToId = form.addField('custpage_customertoid', 'select', 'to Customer', 'customer', 'custpage_selcustgroup');
    if(request.getParameter('custparam_messageids'))
    {
        fldCustomerToId.setDisplayType('inline');
        filesList.setLabel('Unprocessed messages');
    }
    fldCustomerId.setDefaultValue(customerId);
    var fldCurSubsidiaryId = form.addField('custpage_customersubsidiary', 'select', 'Subsidiary', 'subsidiary', 'custpage_curcustgroup').setDisplayType('inline');
    fldCurSubsidiaryId.setDefaultValue(subsidiaryId);
    var fldCusToSubsidiaryId = form.addField('custpage_customertosubsidiary', 'select', 'Subsidiary', 'subsidiary', 'custpage_selcustgroup').setDisplayType('inline');
    if (customerToId) {
        fldCustomerToId.setDefaultValue(customerToId);
        fldCusToSubsidiaryId.setDefaultValue(request.getParameter('custparam_customertosubsidiary'));
    }
    //Fields of list    
    var listCheckBox = filesList.addField('custpage_checkbox', 'checkbox', 'Migrate message?');
    var messageDate = filesList.addField('custpage_messagedate', 'text', 'Date');
    var author = filesList.addField('custpage_author', 'text', 'Author');
    var recipient = filesList.addField('custpage_recipient', 'text', 'Recipient');
    var subject = filesList.addField('custpage_subject', 'text', 'Subject');
    subject.setDisplayType('hidden');
    var subjectWithLink = filesList.addField('custpage_subjectwithlink', 'text', 'Subject');
    var messageType = filesList.addField('custpage_messagetype', 'text', 'Message type');
    var messageId = filesList.addField('custpage_messageid', 'text', 'Document type');
    
    messageId.setDisplayType('hidden');
    filesList.addMarkAllButtons();
    // Fills masseges list with data
    if (listResults) {
        for (var i = 0; i < listResults.length; i++) {
            var columns = listResults[i].getAllColumns();
            var link = toURL+'/app/crm/common/crmmessage.nl?id=' + listResults[i].getValue(columns[0]) + '&l=T';
            filesList.setLineItemValue('custpage_messageid', i + 1, listResults[i].getValue(columns[0]));
            filesList.setLineItemValue('custpage_messagedate', i + 1, listResults[i].getValue(columns[1]));
            filesList.setLineItemValue('custpage_subjectwithlink', i + 1, '<a href=# onClick="popUpWindow(\'' + link + '\', \'800\',\'800\');">' + listResults[i].getValue(columns[2]) + '</a>');
            filesList.setLineItemValue('custpage_subject', i + 1, listResults[i].getValue(columns[2]));
            filesList.setLineItemValue('custpage_recipient', i + 1, listResults[i].getText(columns[4]));
            filesList.setLineItemValue('custpage_messagetype', i + 1, listResults[i].getValue(columns[5]));
            filesList.setLineItemValue('custpage_author', i + 1, listResults[i].getText(columns[6]));
        }
    }
    //Add button, which calls startAttach() function in r7_customer_migrate_messages_cs.js
    form.addButton('custpage_cancel', 'Cancel', 'closeWindow();');
    form.addSubmitButton('Submit');
    return form;
}