// EC_SharedLibrary_Common_AlliantGroup.js

//nlapiLogExecution('DEBUG', '#', '1');

function rowData() {

    this.id = null;
    this.expenseLine = null;
    this.date = null;
    this.projectName = null;
    this.projectId = null;
    this.employeeName = null;
    this.employeeId = null;
    this.rate = null;
    this.duration = null;
    this.type = null;
    this.billingTitleId = null;
    this.actionType = '';
    this.actionItem = '';
}

var actionItemResults = null;
var actionTypesResults = null;
//var expenseCategories = null;
var employees = null;

var moreRowsCount = 0;

function getLists() {

    var columns, filters;
    columns = filters = null;

    // get employees List
    columns = new Array();
    columns.push(new nlobjSearchColumn('entityid'));
    filters = new Array();
    filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
    employees = nlapiSearchRecord('employee', null, filters, columns);

    // get Action Items List
    columns = new Array();
    columns.push(new nlobjSearchColumn('name'));
    actionItemResults = nlapiSearchRecord('customrecord_action_item', null, null, columns);

    // get Action Types List
    actionTypesResults = new Array();
    var search = nlapiLoadSearch('customrecord_action_type', 'customsearch_getactiontypes');  // TODO This calls a saved search
    var resultSet = search.runSearch();
    var start = 0;
    var end = 999;

    do
    {
        var results = resultSet.getResults(start, end);
        start = end + 1;
        end = start + 999;
        //nlapiLogExecution('DEBUG', 'getRowData() - Getting ALL Action Types:- start, end, results count', start + ',' + end + ',' + results.length);
        if (results && results.length > 0) {
            for (var i = 0; i < results.length; i++) {
                var at = new actionType();
                at.id = results[i].getId();
                at.name = results[i].getValue('name');
                actionTypesResults.push(at);
            }
        }
        else
            break;
    }
    while (results);

    /*
     // get expense categories List
     columns = new Array();
     columns.push(new nlobjSearchColumn('name'));
     expenseCategories = nlapiSearchRecord('expensecategory', null, null, columns);
     */
}

function transform(row, type) {

    if (employees && employees.length > 0) {
        for (var i = 0; i < employees.length; i++) {
            if (row.employeeId == employees[i].getId()) {
                row.employeeName = employees[i].getValue('entityid');
                break;
            }
        }
    }

    //row.projectName = getProject(row.projectId);

    if (row.employeeName && type == "timebill") {

        for (var i = 0; i < actionItemResults.length; i++) {
            if (actionItemResults[i].getId() == row.actionItem) {
                row.actionItem = actionItemResults[i].getValue('name');
                break;
            }
        }

        for (var i = 0; i < actionTypesResults.length; i++) {
            if (actionTypesResults[i].id == row.actionType) {
                row.actionType = actionTypesResults[i].name;
                break;
            }
        }
    }

    /*
     if (row.employeeName && type == "expensereport") {

     for (var i = 0; i < expenseCategories.length; i++) {
     if (expenseCategories[i].id == row.actionType) {
     row.actionType = expenseCategories[i].name;
     break;
     }
     }
     }
     */
}

function getHeaderData(input) {

    var fields = nlapiLookupField('job', input.projectId, ['custentity58', 'custentity_expense_billing_notes', 'custentity_blendedratedesc', 'custentity_invoiced_time', 'custentity_remaining_wip']);
    var o = new Object();
    o.RemainingWIP = fields['custentity_remaining_wip'];
    o.AdjustedWIP = fields['custentity58'];
    o.InvoicedTime = fields['custentity_invoiced_time'];
    o.ExpsBillingNotes = fields['custentity_expense_billing_notes'];
    o.BlendedRateDesc = fields['custentity_blendedratedesc'];
    return o;
}

function getRowData(pageResults) {

    //nlapiLogExecution('DEBUG', 'getRowData()', 'START');

    var rows = new Array();

    //var timebillColumns = ['datecreated', 'customer', 'employee', 'custcol_time_entry_billing_rate', 'hours'];

    for (var j = 0; j < pageResults.length; j++) {

        var recordType = pageResults[j].getRecordType();
        var recordId = pageResults[j].getId();
        //var attachedSO = pageResults[j].getValue('custcol_added_to_sales_order');
        //if (!attachedSO) {

        //nlapiLogExecution('DEBUG', 'getRowData() - current recordType:recordId', recordType + ':' + recordId);

        if (recordType == 'timebill') {
            var row = new rowData();
            row.expenseLine = 0;
            row.id = pageResults[j].getId() + '.' + row.expenseLine;
            row.date = pageResults[j].getValue('date');
            //row.projectId = pageResults[j].getValue('customer');
            row.employeeId = pageResults[j].getValue('employee');
            row.rate = parseFloat(pageResults[j].getValue('custcol_time_entry_billing_rate'));
            if (!isNaN(row.rate))
                row.rate = row.rate.toFixed(2);
            else
                row.rate = parseFloat(0).toFixed(2);
            row.duration = parseFloat(pageResults[j].getValue('durationdecimal'));
            if (!isNaN(row.duration))
                row.duration = row.duration.toFixed(2);
            else
                row.duration = parseFloat(0).toFixed(2);
            row.type = 'Time';
            row.billingTitleId = pageResults[j].getValue('custcol_time_entry_billing_title');
            row.actionType = pageResults[j].getValue('custcol_actiontype');
            row.actionItem = pageResults[j].getValue('custcol_actionitem');
            transform(row, "timebill");
            rows.push(row);
        }

        if (recordType == 'vendorbill') { // recordType == 'expensereport' ||
            var row = new rowData();
            row.expenseLine = pageResults[j].getValue('line');
            row.id = pageResults[j].getId() + '.' + row.expenseLine;
            row.date = pageResults[j].getValue('expensedate');
            //row.projectId = _project;
            row.employeeId = pageResults[j].getValue('salesrep');
            row.rate = parseFloat(pageResults[j].getValue('amount'));
            if (row.rate && !isNaN(row.rate)) {
                row.rate = parseFloat(row.rate) * parseFloat(-1);
                row.rate = row.rate.toFixed(2);
            }
            else
                row.rate = parseFloat(0).toFixed(2);
            row.duration = parseFloat(1);
            row.type = 'Expense';
            row.billingTitleId = -1; // -1 hard coded value representing 'expense'
            //row.actionType =
            row.actionItem = pageResults[j].getValue('memo');
            transform(row, recordType);
            rows.push(row);
        }
        //}
    }

    //nlapiLogExecution('DEBUG', 'getRowData()', 'STOP');

    return rows;
}

function getResults(input) {

    var searchResults = new Object();
    searchResults.totalTimeBillRows = parseInt(0);
    searchResults.totalExpRptRows = parseInt(0);
    searchResults.pageResults = null;

    var filters = null;
    var columns = null;
    var results = null;

    function intializeSearch(recordType, type) {

        filters = new Array();
        columns = new Array();

        //filters.push(new nlobjSearchFilter('internalid', 'customer', 'is', input.clientId));
        filters.push(new nlobjSearchFilter('internalid', 'job', 'is', input.projectId));
        filters.push(new nlobjSearchFilter('custcol_added_to_sales_order', null, 'is', '@NONE@'));

        var dateField = null;
        if (recordType == 'timebill')
            dateField = 'date';

        if (recordType == 'vendorbill') // recordType == 'expensereport'
            dateField = 'trandate';

        var x = null;

        if (input.startdate) {
            x = new Date(input.startdate);
            if (x.valid()) {
                var startDate = nlapiDateToString(x);
                nlapiLogExecution('DEBUG', 'getResults() - startDate filter', startDate);
                filters.push(new nlobjSearchFilter(dateField, null, 'onorafter', startDate));
            }
        }

        if (input.enddate) {
            x = new Date(input.enddate);
            if (x.valid()) {
                var endDate = nlapiDateToString(x);
                nlapiLogExecution('DEBUG', 'getResults() - endDate filter', endDate);
                filters.push(new nlobjSearchFilter(dateField, null, 'onorbefore', endDate));
            }
        }

        //filters.push(new nlobjSearchFilter('employee', null, 'is', input.employeeId));
        //filters.push(new nlobjSearchFilter('custentity_primary_project_manager', 'job', 'is', input.projectManagerId));

        //columns.push(new nlobjSearchColumn('customer'));
        if (type && type == 'DO_COUNT_ONLY') {
            if (recordType == 'timebill')
                columns.push(new nlobjSearchColumn('internalid', null, 'count'));
            if (recordType == 'vendorbill') { // recordType == 'expensereport' ||
            columns.push(new nlobjSearchColumn('internalid', null, 'group'));
                columns.push(new nlobjSearchColumn('line', null, 'count'));
            }
        }
        else {

            if (recordType == 'timebill')
                columns.push(new nlobjSearchColumn('internalid'));
            if (recordType == 'vendorbill') // recordType == 'expensereport'
                columns.push(new nlobjSearchColumn('line').setSort());

            //columns.push(new nlobjSearchColumn('custcol_added_to_sales_order'));

            if (recordType == "timebill") {
                columns.push(new nlobjSearchColumn('date').setSort());
                columns.push(new nlobjSearchColumn('employee'));
                columns.push(new nlobjSearchColumn('custcol_time_entry_billing_rate'));
                columns.push(new nlobjSearchColumn('custcol_time_entry_billing_title'));
                columns.push(new nlobjSearchColumn('durationdecimal'));
                columns.push(new nlobjSearchColumn('custcol_actionitem'));
                columns.push(new nlobjSearchColumn('custcol_actiontype'));
            }

            if (recordType == 'vendorbill') { // recordType == 'expensereport'
                columns.push(new nlobjSearchColumn('expensedate'));
                columns.push(new nlobjSearchColumn('salesrep'));
                columns.push(new nlobjSearchColumn('amount'));
                columns.push(new nlobjSearchColumn('memo'));
            }
        }
    }

    nlapiLogExecution('DEBUG', 'getResults() - input', JSON.stringify(input));

    var billingTypesList = new Array();
    if (input.recordTypes == "both") {    // this order is required
        billingTypesList.push('timebill');
        //billingTypesList.push('expensereport');
        billingTypesList.push('vendorbill');
    }
    if (input.recordTypes == "timebill")
        billingTypesList.push('timebill');
    if (input.recordTypes == "vendorbill") { // input.recordTypes == "expensereport"
        //billingTypesList.push('expensereport');
        billingTypesList.push('vendorbill');
    }

    var z = null;
    var rowCount = 0;
    for (z = 0; z < billingTypesList.length; z++) {

        nlapiLogExecution('DEBUG', 'DO_COUNT_ONLY :recordType', billingTypesList[z]);
        intializeSearch(billingTypesList[z], 'DO_COUNT_ONLY');
        results = nlapiSearchRecord(billingTypesList[z], null, filters, columns);
        if (results && results.length > 0) {
            if (billingTypesList[z] == 'timebill') {
                rowCount = parseInt(results[0].getValue('internalid', null, 'count'));
                nlapiLogExecution('DEBUG', billingTypesList[z] + ' rowCount', rowCount);
                searchResults.totalTimeBillRows = rowCount;
            }
            if (billingTypesList[z] == 'vendorbill') { // billingTypesList[z] == 'expensereport'
                rowCount = 0;
                for (var y = 0; y < results.length; y++)
                    rowCount = rowCount + parseInt(results[y].getValue('line', null, 'count'));

                nlapiLogExecution('DEBUG', billingTypesList[z] + ' rowCount', rowCount);
                searchResults.totalExpRptRows = rowCount;
            }
        }
    }

    searchResults.pageResults = null;

    if (searchResults.totalTimeBillRows == 0 && searchResults.totalExpRptRows == 0)
        return searchResults;

    if (searchResults.totalTimeBillRows > 0 && searchResults.totalExpRptRows == 0) {
        billingTypesList = new Array();
        billingTypesList.push('timebill');
    }
    if (searchResults.totalTimeBillRows == 0 && searchResults.totalExpRptRows > 0) {
        billingTypesList = new Array();
        //billingTypesList.push('expensereport');
        billingTypesList.push('vendorbill');
    }

    z = 0;

    var startRow = input.startRow;
    var endRow = input.endRow;

    nlapiLogExecution('DEBUG', 'billingTypesList', JSON.stringify(billingTypesList));

    // TODO IMPORTANT - the do loop below will not aggregate results if the cummulative total of time and expense entries is <= 10. User will have to get time and expense entries separately in such a case.

    do
    {
        nlapiLogExecution('DEBUG', 'startRow', startRow);
        nlapiLogExecution('DEBUG', 'endRow', endRow);

        intializeSearch(billingTypesList[z]);
        var search = nlapiCreateSearch(billingTypesList[z], filters, columns);
        results = search.runSearch();
        if (results) {
            var resultSet = results.getResults(startRow, endRow);
            if (resultSet && resultSet.length > 0) {
                nlapiLogExecution('DEBUG', 'resultSet.length', resultSet.length);
                searchResults.pageResults = resultSet;
                break;
            }
            else if (billingTypesList.length == 2) {
                z = 1;
                var x1 = parseInt(((searchResults.totalTimeBillRows - endRow) / 10) * -1);
                nlapiLogExecution('DEBUG', 'x1', x1);
                var x2 = ((x1 - 1) * 10);
                if (x2 <= 0) x2 = 0;
                nlapiLogExecution('DEBUG', 'x2', x2);
                startRow = x2;
                endRow = x2 + 10;
            }
            else
                break;
        }
    }
    while (true);

    return searchResults;
}

function createDataTableResp(output, input) {

    var dataTableResp = new Object();

    dataTableResp.sEcho = parseInt(output.sEcho);
    dataTableResp.iTotalRecords = parseInt(output.totalRowsIndb);

    dataTableResp.iTotalDisplayRecords = dataTableResp.iTotalRecords;
    dataTableResp.aaData = new Array();
    dataTableResp.customData = output.header;

    var aaDataEle = null;
    for (var i = 0; i < output.rowData.length; i++) {

        aaDataEle = new Array();
        aaDataEle.push('Mark'); // Mark Checkbox placeholder
        aaDataEle.push('No Charge'); // No Charge Checkbox placeholder
        aaDataEle.push('No Show'); // No Show Checkbox placeholder
        aaDataEle.push(output.rowData[i].id);
        aaDataEle.push(output.rowData[i].date);
        aaDataEle.push(output.rowData[i].employeeName);
        aaDataEle.push(output.rowData[i].rate);
        aaDataEle.push(output.rowData[i].duration);
        aaDataEle.push(output.rowData[i].actionType);
        aaDataEle.push(output.rowData[i].actionItem);
        aaDataEle.push(0); // Total Checkbox placeholder
        aaDataEle.push(output.rowData[i].type);
        aaDataEle.push(output.rowData[i].billingTitleId);
        aaDataEle.push(output.rowData[i].expenseLine);

        dataTableResp.aaData.push(aaDataEle);
    }

    // hack for cases where pagination controls disappear when page results count == 1
    if (dataTableResp.aaData.length == 1) {
        aaDataEle = new Array();
        aaDataEle.push(''); // Mark Checkbox placeholder
        aaDataEle.push(''); // No Charge Checkbox placeholder
        aaDataEle.push(''); // No Show Checkbox placeholder
        aaDataEle.push('0');
        aaDataEle.push('');
        aaDataEle.push('');
        aaDataEle.push('0');
        aaDataEle.push('0');
        aaDataEle.push('');
        aaDataEle.push('');
        aaDataEle.push(''); // Total Checkbox placeholder
        aaDataEle.push('');
        aaDataEle.push('');
        aaDataEle.push('');

        dataTableResp.aaData.push(aaDataEle);
    }

    return dataTableResp;
}

function onStart(request, response) {

    try {

        nlapiLogExecution('DEBUG', 'HTTP Method', request.getMethod());

        if (request.getMethod() == "GET") {

            var params = request.getAllParameters();
            for (param in params)
                nlapiLogExecution('AUDIT', 'parameter:value', param + ':' + params[param]);

            var input = new Object();
            input.recordTypes = request.getParameter('rectypes');
            input.projectId = request.getParameter('projectid');
            input.clientId = request.getParameter('clientid');
            input.startdate = request.getParameter('startdate');
            input.enddate = request.getParameter('enddate');
            input.sEcho = request.getParameter('sEcho');
            input.startRow = parseInt(request.getParameter('iDisplayStart'));
            input.iDisplayLength = parseInt(request.getParameter('iDisplayLength'));
            input.endRow = input.startRow + input.iDisplayLength;

            //input.employeeId = request.getParameter('employeeid');
            //input.projectManagerId = request.getParameter('projectMgrid');

            //if (!input.recordTypes || !input.projectId || !input.clientId || !input.startRow || !input.endRow)
            //throw 'ERROR - Missing URL Parameters';

            getLists();

            var searchResults = getResults(input); // input.recordTypes

            nlapiLogExecution('DEBUG', 'searchResults', JSON.stringify(searchResults));

            var output = new Object();
            output.sEcho = input.sEcho;
            output.header = getHeaderData(input);
            nlapiLogExecution('DEBUG', 'output.header', JSON.stringify(output.header));
            output.rowData = [];
            output.totalRowsIndb = parseInt(0);
            if (searchResults.pageResults) {
                var offset = 10;
                if ((input.recordTypes != 'both')
                    || (searchResults.totalTimeBillRows == 0)
                    || (searchResults.totalExpRptRows == 0)) {
                    offset = 0;
                }
                output.totalRowsIndb = searchResults.totalExpRptRows + searchResults.totalTimeBillRows + offset;  // offset addition is a hack to allow return of both time and exps.
                output.rowData = getRowData(searchResults.pageResults);
            }

            var dataTableJSONResp = JSON.stringify(createDataTableResp(output, input));

            nlapiLogExecution('DEBUG', 'dataTableJSONResp', dataTableJSONResp);

            response.write(dataTableJSONResp);
        }
    }
    catch (e) {

        throw e;

        //var msg = Logger.FormatException(e);
        //Logger.Write(Logger.LogType.Error, "onStart()", msg);
        //catchErrors(e, "onStart()", "Suitelet_nondiscriminationTest_renewal.js");
    }
}