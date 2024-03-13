
function run_admin_license_suitelet(request, response) {

    if (request.getMethod() == 'GET') {

        //init form
        var form = nlapiCreateForm('Admin License Suitelet', false);
        form.setScript('customscript_adminlicensesuiteletcs');

        //init operation selection
        var operationGroup = form.addFieldGroup('operationGroup', 'Select Operation To Perform');
        var operationSelection = form.addField('custpage_operation', 'select', 'Operation', null, 'operationGroup');
        operationSelection.addSelectOption('', '');
        operationSelection.addSelectOption('1', 'Extend License With Current Features');
        operationSelection.addSelectOption('2', 'Extend License With Asset Count');
        operationSelection.addSelectOption('3', 'Add Assets');
        operationSelection.addSelectOption('4', 'Move Assets From One License To Another');
        operationSelection.addSelectOption('5', 'Suspend License');
        operationSelection.addSelectOption('6', 'Suspend All Active Graced Features');
        operationSelection.addSelectOption('7', 'Put All Active LFMs In Queue');

        //init license selection
        var licenseGroup = form.addFieldGroup('licenseGroup', 'Select License');
        form.addField('custpage_nexposelicense', 'select', 'Nexpose License', 'customrecordr7nexposelicensing', 'licenseGroup');
        form.addField('custpage_nexposelicense2', 'select', 'Nexpose License 2', 'customrecordr7nexposelicensing', 'licenseGroup');

        //init override values
        var valuesGroup = form.addFieldGroup('valuesGroup', 'Set Values');
        form.addField('custpage_startdate', 'date', 'Start Date', null, 'valuesGroup');
        form.addField('custpage_enddate', 'date', 'End Date', null, 'valuesGroup');
        //form.addField('custpage_salesorder', 'select', 'Sales Order', 'salesorder', 'valuesGroup');
        form.addField('custpage_assetcount', 'integer', 'Asset Count', null, 'valuesGroup');

        //write form
        form.addSubmitButton('Submit');
        response.writePage(form);
    }

    if (request.getMethod() == 'POST') {

        var selectedLicense = request.getParameter('custpage_nexposelicense');
        var selectedLicense2 = request.getParameter('custpage_nexposelicense2');
        var selectedOperation = request.getParameter('custpage_operation');
        var selectedStartDate = request.getParameter('custpage_startdate');
        var selectedEndDate = request.getParameter('custpage_enddate');
        //var selectedSalesOrder = request.getParameter('custpage_salesorder');
        var selectedAssetCount = request.getParameter('custpage_assetcount');

        nlapiLogExecution('DEBUG', 'POST vars', JSON.stringify({
            selectedLicense: selectedLicense,
            selectedLicense2: selectedLicense2,
            selectedOperation: selectedOperation,
            selectedStartDate: selectedStartDate,
            selectedEndDate: selectedEndDate,
            //selectedSalesOrder: selectedSalesOrder,
            selectedAssetCount: selectedAssetCount
        }));

        //Extend License With Current Features
        if (selectedOperation == 1) {
            force_extension_w_asset_count(selectedLicense, selectedStartDate, selectedEndDate);
        }

        //Extend License With Asset Count
        if (selectedOperation == 2) {
            force_extension_w_asset_count(selectedLicense, selectedStartDate, selectedEndDate, selectedAssetCount);
        }

        //Add Assets
        if (selectedOperation == 3) {
            add_assets(selectedLicense, selectedStartDate, selectedEndDate, selectedAssetCount);
        }

        //Move Assets From One License To Another
        if (selectedOperation == 4) {
            move_assets(selectedLicense, selectedLicense2, selectedStartDate, selectedEndDate, selectedAssetCount);
        }

        //Move Assets From One License To Another
        if (selectedOperation == 5) {
            suspend_license(selectedLicense);
        }

        //Suspend All Active Graced Features
        if (selectedOperation == 6) {
            suspend_graced_features(selectedLicense);
        }

        //Put All Active LFMs In Queue
        if (selectedOperation == 7) {
            requeue_active_lfms(selectedLicense);
        }

        nlapiSetRedirectURL('RECORD', 'customrecordr7nexposelicensing', selectedLicense, 'view');
        return;
    }
}

//Force License Extension w/ Asset Count
function force_extension_w_asset_count(plicenseInternalId, pstartDate, pendDate, passetCount) {

    //setup
    var licenseRec = nlapiLoadRecord('customrecordr7nexposelicensing', plicenseInternalId);
    var productKey = licenseRec.getFieldValue('custrecordr7nxproductkey');

    //search
    var arrSearchFilters = new Array();
    arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7acladdon_fieldid', null, 'isnot', 'id');
    arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7acladdon_value', null, 'noneof', new Array(7, 8));
    var arrSearchColumns = new Array();
    arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7acladdon_fieldid');
    arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7acladdon_fieldtype');
    arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7acladdon_value');
    arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7acladdon_specificvalue');
    var arrSearchResults = nlapiSearchRecord('customrecordr7acladdoncomponents', null, arrSearchFilters, arrSearchColumns);

    //add LFMs
    var allFields = licenseRec.getAllFields();
    //nlapiLogExecution('DEBUG', 'allFields', JSON.stringify(allFields));
    for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
        var createAddOn = false;
        var searchResult = arrSearchResults[i];
        var addOnId = searchResult.getId();
        var fieldId = searchResult.getValue(arrSearchColumns[0]);
        var fieldType = searchResult.getValue(arrSearchColumns[1]);
        var valueId = searchResult.getValue(arrSearchColumns[2]);
        var specificValue = searchResult.getValue(arrSearchColumns[3]);

        //nlapiLogExecution('DEBUG', 'arrSearchResults ' + i, JSON.stringify({
        //    addOnId: addOnId,
        //    fieldId: fieldId,
        //    fieldType: fieldType,
        //    valueId: valueId,
        //    specificValue: specificValue
        //}));

        if (allFields.indexOf(fieldId) != -1) {
            var fieldValue = licenseRec.getFieldValue(fieldId);

            //conditionally override
            //NX: Number of IPs
            if (addOnId == 4) {
                if (passetCount) {
                    fieldValue = passetCount;
                }
            }

            if (fieldType == 'date' || fieldType == 'integer') {
                if ((specificValue == '' || specificValue == null) && (fieldValue != null && fieldValue != '')) {
                    createAddOn = true;
                    if (['custrecordr7inplicenselicensedassets', 'custrecordr7nxlicensenumberips', 'custrecordr7managedservicesips'].indexOf(fieldId) != -1 && (fieldValue == '1' || fieldValue == '0')) {
                        createAddOn = true;
                    }
                }
            }
            else {
                if ((specificValue != '' || specificValue != null) && fieldValue == specificValue && fieldValue != 'F') {
                    createAddOn = true;
                }
                else {
                    if ((specificValue == '' || specificValue == null) && fieldType == 'select') {
                        createAddOn = true;
                    }
                }
            }  
        }

        if (createAddOn) {
            allFields[allFields.indexOf(fieldId)] = '';

            var fmrStart = pstartDate;
            var fmrEnd = pendDate;
            var status = 2; //in queue

            var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
            newFMRRecord.setFieldValue('custrecordr7licfmfeature', addOnId);
            newFMRRecord.setFieldValue('custrecordr7licfmvalue', fieldValue);
            //newFMRRecord.setFieldValue('custrecordr7licfmsalesorder', psalesOrder);
            newFMRRecord.setFieldValue('custrecordr7licfmstartdate', fmrStart);
            newFMRRecord.setFieldValue('custrecordr7licfmenddate', fmrEnd);
            newFMRRecord.setFieldValue('custrecordr7licfmproductkey', productKey);
            newFMRRecord.setFieldValue('custrecordr7licfmstatus', status);
            newFMRRecord.setFieldValue('custrecordr7licfmaclcreated', 'T');

            try {
                var id = nlapiSubmitRecord(newFMRRecord);
            }
            catch (e) {
                nlapiLogExecution('DEBUG', 'force_extension_w_asset_count error', JSON.stringify(e));
            }
        }
    }
}

//Move Assets From One License To Another
function move_assets(plicenseInternalId, plicenseInternalId2, pstartDate, pendDate, passetCount) {
    //setup
    var licenseRec1 = nlapiLoadRecord('customrecordr7nexposelicensing', plicenseInternalId);
    var productKey1 = licenseRec1.getFieldValue('custrecordr7nxproductkey');

    var licenseRec2 = nlapiLoadRecord('customrecordr7nexposelicensing', plicenseInternalId2);
    var productKey2 = licenseRec2.getFieldValue('custrecordr7nxproductkey');

    //execute
    var fmrStart = pstartDate;
    var fmrEnd = pendDate;
    var status = 2; //in queue
    var addOnId = 4; //NX: Number of IPs
    var fieldValue = passetCount;

    //subtract from license 1
    var newFMRRecord1 = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
    newFMRRecord1.setFieldValue('custrecordr7licfmfeature', addOnId);
    newFMRRecord1.setFieldValue('custrecordr7licfmvalue', -fieldValue);
    //newFMRRecord1.setFieldValue('custrecordr7licfmsalesorder', psalesOrder);
    newFMRRecord1.setFieldValue('custrecordr7licfmstartdate', fmrStart);
    newFMRRecord1.setFieldValue('custrecordr7licfmenddate', fmrEnd);
    newFMRRecord1.setFieldValue('custrecordr7licfmproductkey', productKey1);
    newFMRRecord1.setFieldValue('custrecordr7licfmstatus', status);
    newFMRRecord1.setFieldValue('custrecordr7licfmaclcreated', 'T');
    nlapiLogExecution('DEBUG', 'newFMRRecord1', JSON.stringify(newFMRRecord1));

    //add to license 2
    var newFMRRecord2 = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
    newFMRRecord2.setFieldValue('custrecordr7licfmfeature', addOnId);
    newFMRRecord2.setFieldValue('custrecordr7licfmvalue', fieldValue);
    //newFMRRecord2.setFieldValue('custrecordr7licfmsalesorder', psalesOrder);
    newFMRRecord2.setFieldValue('custrecordr7licfmstartdate', fmrStart);
    newFMRRecord2.setFieldValue('custrecordr7licfmenddate', fmrEnd);
    newFMRRecord2.setFieldValue('custrecordr7licfmproductkey', productKey2);
    newFMRRecord2.setFieldValue('custrecordr7licfmstatus', status);
    newFMRRecord2.setFieldValue('custrecordr7licfmaclcreated', 'T');
    nlapiLogExecution('DEBUG', 'newFMRRecord2', JSON.stringify(newFMRRecord2));

    //submit
    try {
        var id1 = nlapiSubmitRecord(newFMRRecord1);
        nlapiLogExecution('DEBUG', 'id1', JSON.stringify(id1));
        var id2 = nlapiSubmitRecord(newFMRRecord2);
        nlapiLogExecution('DEBUG', 'id2', JSON.stringify(id2));
    }
    catch (e) {
        nlapiLogExecution('DEBUG', 'move_assets error', JSON.stringify(e));
    }

}

//Add Assets
function add_assets(plicenseInternalId, pstartDate, pendDate, passetCount) {
    //setup
    var licenseRec1 = nlapiLoadRecord('customrecordr7nexposelicensing', plicenseInternalId);
    var productKey1 = licenseRec1.getFieldValue('custrecordr7nxproductkey');

    //execute
    var fmrStart = pstartDate;
    var fmrEnd = pendDate;
    var status = 2; //in queue
    var addOnId = 4; //NX: Number of IPs
    var fieldValue = passetCount;

    //add LFM
    var newFMRRecord1 = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
    newFMRRecord1.setFieldValue('custrecordr7licfmfeature', addOnId);
    newFMRRecord1.setFieldValue('custrecordr7licfmvalue', fieldValue);
    //newFMRRecord1.setFieldValue('custrecordr7licfmsalesorder', psalesOrder);
    newFMRRecord1.setFieldValue('custrecordr7licfmstartdate', fmrStart);
    newFMRRecord1.setFieldValue('custrecordr7licfmenddate', fmrEnd);
    newFMRRecord1.setFieldValue('custrecordr7licfmproductkey', productKey1);
    newFMRRecord1.setFieldValue('custrecordr7licfmstatus', status);
    newFMRRecord1.setFieldValue('custrecordr7licfmaclcreated', 'T');
    nlapiLogExecution('DEBUG', 'newFMRRecord1', JSON.stringify(newFMRRecord1));

    //submit
    try {
        var id1 = nlapiSubmitRecord(newFMRRecord1);
        nlapiLogExecution('DEBUG', 'id1', JSON.stringify(id1));
    }
    catch (e) {
        nlapiLogExecution('DEBUG', 'add_assets error', JSON.stringify(e));
    }
}

//Suspend License
function suspend_license(plicenseInternalId) {
    //setup
    var licenseRec1 = nlapiLoadRecord('customrecordr7nexposelicensing', plicenseInternalId);
    var productKey1 = licenseRec1.getFieldValue('custrecordr7nxproductkey');
    var expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - 1);

    //search
    var filters = [];
    filters[0] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey1);
    filters[1] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'is', 3); //active
    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid');
    var results = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, filters, columns);

    //suspend LFMs
    for (var j = 0; j < results.length; j++) {
        var lfmIntId = results[j].getValue(columns[0]);
        nlapiSubmitField('customrecordr7licensefeaturemanagement', lfmIntId, 'custrecordr7licfmenddate', nlapiDateToString(expirationDate));
    }

}

//Suspend All Active Graced Features
function suspend_graced_features(plicenseInternalId) {
    //setup
    var licenseRec1 = nlapiLoadRecord('customrecordr7nexposelicensing', plicenseInternalId);
    var productKey1 = licenseRec1.getFieldValue('custrecordr7nxproductkey');
    var expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - 1);

    //search
    var filters = [];
    filters[0] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey1);
    filters[1] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'is', 3); //active
    filters[2] = new nlobjSearchFilter('custrecordr7licfmgrace', null, 'is', 'T'); //graced
    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid');
    var results = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, filters, columns);

    //suspend LFMs
    for (var j = 0; j < results.length; j++) {
        var lfmIntId = results[j].getValue(columns[0]);
        nlapiSubmitField('customrecordr7licensefeaturemanagement', lfmIntId, 'custrecordr7licfmenddate', nlapiDateToString(expirationDate));
    }
}

//Put All Active LFMs In Queue
function requeue_active_lfms(plicenseInternalId) {
    //setup
    var licenseRec1 = nlapiLoadRecord('customrecordr7nexposelicensing', plicenseInternalId);
    var productKey1 = licenseRec1.getFieldValue('custrecordr7nxproductkey');
    var expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - 1);

    //search
    var filters = [];
    filters[0] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', productKey1);
    filters[1] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'is', 3); //active
    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid');
    var results = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, filters, columns);

    //suspend LFMs
    for (var j = 0; j < results.length; j++) {
        var lfmIntId = results[j].getValue(columns[0]);
        nlapiSubmitField('customrecordr7licensefeaturemanagement', lfmIntId, 'custrecordr7licfmstatus', 2); //in queue
    }
}