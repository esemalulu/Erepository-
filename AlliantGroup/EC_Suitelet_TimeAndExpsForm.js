// underscore-min.js
// EC_SharedLibrary_Common_AlliantGroup.js

function onStart(request, response) {
    try {

        nlapiLogExecution('DEBUG', 'HTTP Method', request.getMethod());

        if (request.getMethod() == "GET")
            doGET(request, response);

        if (request.getMethod() == "POST")
            doPOST(request, response);

    }

    catch (e) {

        throw e;

        //var msg = Logger.FormatException(e);
        //Logger.Write(Logger.LogType.Error, "onStart()", msg);
        //catchErrors(e, "onStart()", "Suitelet_nondiscriminationTest_renewal.js");
    }
}

function doGET(request, response) {

    // load saved search and get ALL active customers.
    var search = nlapiLoadSearch('customer', 'customsearch_getclients');  // TODO This calls a saved search
    var resultSet = search.runSearch();
    var start = 0;
    var end = 999;
    do
    {
        var results = resultSet.getResults(start, end);
        start = end + 1;
        end = start + 999;
        //nlapiLogExecution('DEBUG', 'Getting ALL clients:- start, end, results count', start + ',' + end + ',' + results.length);
        if (results && results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                var c = new client();
                c.id = results[i].getId();
                c.name = results[i].getValue('altname');
                clients.push(c);
            }
        }
        else
            break;
    }
    while (results);

    var clientDropDownOptionsHTML = '<option value="clients">Select Client</option>';
    for (var i = 0; i < clients.length; i++)
        clientDropDownOptionsHTML = clientDropDownOptionsHTML + '<option value="' + clients[i].id + '">' + clients[i].name + '</option>';

    var htmlFile = nlapiLoadFile(HTMLtemplateFileId);
    var html = htmlFile.getValue();

    html = html.replace('[CLIENTS]', clientDropDownOptionsHTML);

    response.write(html);
}

function getItems(request) {

    var itemsData = JSON.parse(request.getParameter('itemsdata'));
    itemsCollection = new Array();

    var billingtype = request.getParameter('billingtype');
    var billingTypesList = new Array();
    if (billingtype == "both") {
        billingTypesList.push('timebill');
        //billingTypesList.push('expensereport');
        billingTypesList.push('vendorbill');
    }
    if (billingtype == "timebill")
        billingTypesList.push('timebill');
    if (billingtype == "vendorbill") { // billingtype == "expensereport"
        //billingTypesList.push('expensereport');
        billingTypesList.push('vendorbill');
    }

    for (var z = 0; z < billingTypesList.length; z++) {

        nlapiLogExecution('DEBUG', 'Getting ALL rows for billingTypesList, #' + z, billingTypesList[z]);

        var totalRows = parseInt(0);
        var iDisplayStart = parseInt(0);

        do {

            var url = getTimeExpensesSuiteletURL
                + '&clientid=' + request.getParameter('clients')
                + '&projectid=' + request.getParameter('projects')
                + '&startdate=' + request.getParameter('startdatepicker')
                + '&enddate=' + request.getParameter('enddatepicker')
                + '&rectypes=' + billingTypesList[z]
                + '&iDisplayStart=' + iDisplayStart + '&iDisplayLength=' + 999 + '&sEcho=1';

            nlapiLogExecution('DEBUG', 'Suitelet_GetTimeAndExps url', url);

            var JSONRespStr = nlapiRequestURL(url);

            var JSONRespObj = JSON.parse(JSONRespStr.getBody());

            totalRows = totalRows + parseInt(JSONRespObj.aaData.length);

            nlapiLogExecution('DEBUG', 'totalRows', totalRows);

            iDisplayStart = iDisplayStart + 1000;

            populateItemsCollection(JSONRespObj, itemsData);
        }
        while (totalRows < JSONRespObj.iTotalDisplayRecords);
    }

    return itemsCollection;
}


function doPOST(request, response) {

    var i;

    function getbillingTitle(id) {

        if (id == -1) // -1 hard coded value representing 'expense'
            return 'Expense';

        if (billingTitles && billingTitles.length > 0)
            for (var i = 0; i < billingTitles.length; i++) {
                if (id == billingTitles[i].getId())
                    return billingTitles[i].getValue('custrecord_billing_title_desc');
            }

        return 'Unknown'; // i.e. blended rate
    }

    function getbillingTitleRank(id) {

        if (billingTitles && billingTitles.length > 0)
            for (var i = 0; i < billingTitles.length; i++) {
                if (id == billingTitles[i].getId())
                    return billingTitles[i].getValue('custrecord_billing_title_rank');
            }

        return 0;
    }

    function orderLineItem() {
        this.item = null;
        this.qty = null;
        this.description = null;
        this.billingTitleId = null;
        this.rate = null;
        this.isBlendedRateLine = false;
        this.lineRank = 0;
    }

    function getServiceItemByProjectClass(projectClass) {

        for (i = 0; i < projectClassToSrvItemMap.length; i++) {
            if (projectClassToSrvItemMap[i].getValue('custrecord_projectclass') == projectClass) {
                return projectClassToSrvItemMap[i].getValue('custrecord_itemtouse');
            }
        }
        return null;
    }

    var params = request.getAllParameters();
    for (param in params)
        nlapiLogExecution('DEBUG', 'parameter:value', param + ':' + params[param]);

    // get billing titles list
    var columns = new Array();
    columns.push(new nlobjSearchColumn('custrecord_billing_title_desc'));
    columns.push(new nlobjSearchColumn('custrecord_billing_title_rank'));
    var billingTitles = nlapiSearchRecord('customrecord_billing_title', null, null, columns);

    var orderLineItems = new Array();

    var itemsData = getItems(request);

    nlapiLogExecution('DEBUG', 'itemsData.length, # of items that will be billed', itemsData.length);

    var projectId = request.getParameter('projects');
    var projectData = nlapiLookupField('job', projectId, ['companyname', 'custentity_project_class', 'custentity_department', 'custentity_location', 'custentity_billinginprogress']);

    if (projectData.custentity_billinginprogress == 'T')
        throw "Unable to generate sales order. Billing for this project is currently in progress. Please try again later";

    // load project class to item mappings table
    columns = new Array();
    columns.push(new nlobjSearchColumn('custrecord_projectclass'));
    columns.push(new nlobjSearchColumn('custrecord_itemtouse'));
    var projectClassToSrvItemMap = nlapiSearchRecord('customrecord_projectservitem_mappings', null, null, columns); // TODO copy customrecord_projectservitem_mappings w/ data to PROD

    var clientId = request.getParameter('clients');
    var clientName = clientId + ' ' + request.getParameter('selectedclient');

    for (i = 0; i < itemsData.length; i++)
        itemsData[i].billingTitleTextAndRate = getbillingTitle(itemsData[i].billingTitleId) + '$' + itemsData[i].billingRate;

    var groupeditemsData = _.groupBy(itemsData, 'billingTitleTextAndRate');

    nlapiLogExecution('DEBUG', 'groupeditemsData', JSON.stringify(groupeditemsData));

    var totalExpenses = parseFloat(0);
    var totalNoChargeHrs = parseFloat(0);
    var _orderLineItem = null;
    var curr_billingItem = null;

    // define order line items
    for (var billingItem in groupeditemsData) {

        nlapiLogExecution('DEBUG', 'Aggregating Billing Item, length', billingItem + ', ' + groupeditemsData[billingItem].length);

        var billingTitle = billingItem.split('$');

        if (billingTitle[0] != 'Expense') {

            var totalhrs = parseFloat(0);
            for (i = 0; i < groupeditemsData[billingItem].length; i++) {
                curr_billingItem = groupeditemsData[billingItem][i];
                if (!curr_billingItem.isNoCharge && !curr_billingItem.isNoShow) {
                    totalhrs = parseFloat(totalhrs) + parseFloat(curr_billingItem.hours);
                }
            }

            if (totalhrs > 0) {
                _orderLineItem = new orderLineItem();
                _orderLineItem.item = getServiceItemByProjectClass(projectData['custentity_project_class']);
                _orderLineItem.qty = totalhrs;
                _orderLineItem.billingTitleId = curr_billingItem.billingTitleId;

                _orderLineItem.rate = parseFloat(billingTitle[1]);

                if (billingTitle[0] == 'Unknown') { // belended rate
                    _orderLineItem.isBlendedRateLine = true;
                    _orderLineItem.description = request.getParameter('blendedratedesc'); //+ ', ' + totalhrs + ' hrs @' + billingTitle[1];
                    _orderLineItem.lineRank = 997;
                }
                else {
                    _orderLineItem.description = billingTitle[0]; // + ', ' + totalhrs + ' hrs @' + billingTitle[1];
                    _orderLineItem.lineRank = getbillingTitleRank(curr_billingItem.billingTitleId);
                }

                orderLineItems.push(_orderLineItem);
            }
        }

        if (billingTitle[0] == 'Expense') {
            curr_billingItem = groupeditemsData[billingItem][0];
            if (!curr_billingItem.isNoCharge && !curr_billingItem.isNoShow) {
                totalExpenses = parseFloat(totalExpenses) + parseFloat(billingTitle[1]);
            }
        }

        for (i = 0; i < groupeditemsData[billingItem].length; i++) {
            curr_billingItem = groupeditemsData[billingItem][i];
            if (curr_billingItem.isNoCharge) {
                totalNoChargeHrs = parseFloat(totalNoChargeHrs) + parseFloat(curr_billingItem.hours);
            }
        }
    }

    nlapiLogExecution('DEBUG', 'totalNoChargeHrs', totalNoChargeHrs);

    if (totalExpenses && !isNaN(parseFloat(totalExpenses)) && totalExpenses > 0) {
        _orderLineItem = new orderLineItem();
        _orderLineItem.item = expenseItem;
        _orderLineItem.qty = 1;
        _orderLineItem.description = 'Out of Pocket Expenses';
        _orderLineItem.rate = totalExpenses;
        _orderLineItem.lineRank = 998;
        orderLineItems.push(_orderLineItem);
    }

    if (totalNoChargeHrs > 0) {
        _orderLineItem = new orderLineItem();
        _orderLineItem.item = getServiceItemByProjectClass(projectData['custentity_project_class']);
        _orderLineItem.qty = totalNoChargeHrs;
        _orderLineItem.description = 'No Charge Hours';
        _orderLineItem.rate = 0; //totalNoChargeHrsAmt;
        _orderLineItem.lineRank = 999;
        orderLineItems.push(_orderLineItem);
    }

    nlapiLogExecution('DEBUG', 'creating order....orderLineItems', JSON.stringify(orderLineItems));

    // create order
    var order = nlapiCreateRecord('salesorder');

    order.setFieldValue('customform', customSalesOrderFormId);
    order.setFieldValue('entity', clientId);
    order.setFieldValue('job', projectId);
    order.setFieldValue('class', projectData['custentity_project_class']);
    order.setFieldValue('department', projectData['custentity_department']);
    order.setFieldValue('location', projectData['custentity_location']);

    // sort orderLineItems
    var sorted_orderLineItems = orderLineItems.objSort("lineRank");

    for (var i = 0; i < sorted_orderLineItems.length; i++) {

        order.selectNewLineItem('item');
        order.setCurrentLineItemValue('item', 'item', sorted_orderLineItems[i].item);
        order.setCurrentLineItemValue('item', 'quantity', sorted_orderLineItems[i].qty);
        if (!orderLineItems[i].isBlendedRateLine)
            order.setCurrentLineItemValue('item', 'custcol_bill_title', sorted_orderLineItems[i].billingTitleId);

        order.setCurrentLineItemValue('item', 'custcol_billing_desc', sorted_orderLineItems[i].description);
        order.setCurrentLineItemValue('item', 'price', -1); // custom price level
        order.setCurrentLineItemValue('item', 'rate', sorted_orderLineItems[i].rate);
        order.commitLineItem('item');
    }

    var orderId = nlapiSubmitRecord(order, true, true);

    nlapiLogExecution('DEBUG', 'order created', orderId);

    var exceededCapAmt = request.getParameter('exceededcaphrs');
    if (exceededCapAmt && !isNaN(parseFloat(exceededCapAmt))) {
        nlapiLogExecution('DEBUG', 'updating exceeded cap field on project');
        nlapiSubmitField('job', projectId, 'custentity_exceededcap', exceededCapAmt);
    }

    nlapiLogExecution('DEBUG', 'Creating time & expense entries update Q record');

    var updtQRec = nlapiCreateRecord('customrecord_timeexpenserecstoupdt');
    updtQRec.setFieldValue('custrecord_items', JSON.stringify(itemsData));
    updtQRec.setFieldValue('custrecord_project', projectId);
    updtQRec.setFieldValue('custrecord_tranid', orderId);
    updtQRec.setFieldValue('custrecord_processed', 'F');
    updtQRec.setFieldValue('custrecord_updatetype', 2); // SALES ORDER UPDATE

    nlapiSubmitRecord(updtQRec);

    nlapiLogExecution('DEBUG', 'Record Saved');

    nlapiSubmitField('job', projectId, ['custentity_billinginprogress', 'custentity_blendedratedesc', 'custentity_expense_billing_notes'], ['T', request.getParameter('blendedratedesc'), request.getParameter('billingnotes')]);

    //response.write('Order created, order internal id: ' + orderId);

    var htmlFile = nlapiLoadFile(HTMLtemplateFileId1);

    var html = htmlFile.getValue();

    var orderData = nlapiLookupField('salesorder', orderId, ['tranid', 'total']);

    html = html.replace('[CLIENT]', clientName);
    html = html.replace('[ORDERNUMBER]', orderData['tranid']);
    html = html.replace('[TOTALAMT]', orderData['total']);

    response.write(html);
}