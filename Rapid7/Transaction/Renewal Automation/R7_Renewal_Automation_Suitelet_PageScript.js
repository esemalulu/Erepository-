/*
 * @author efagone
 */

function pageInit() {
    window.onbeforeunload = function () { };
    var createAlert = nlapiGetFieldValue('custpage_createalert');

    if (createAlert == 'T') {
        var reason = nlapiGetFieldValue('custpage_reason');
        alert(reason);
    }

    if (nlapiGetLineItemCount('custpage_item_items') < 2) {
        disableSplits();
    }
}

function validateField(type, name, linenum) {

    return true;
}

function fieldChanged(type, name, linenum) {

    if (type == 'custpage_item_items' && name == 'custpage_item_split') {
        if (nlapiGetLineItemValue('custpage_item_items', 'custpage_item_split', linenum) == 'T') {
            var lineCount = nlapiGetLineItemCount('custpage_item_items');
            var checkCount = 0;
            for (var i = 1; lineCount > 0 && i <= lineCount; i++) {
                if (nlapiGetLineItemValue('custpage_item_items', 'custpage_item_split', i) == 'T') {
                    checkCount++;
                }
            }
            if (lineCount == checkCount) {
                alert('You cannot split every line.');
                nlapiSetLineItemValue('custpage_item_items', 'custpage_item_split', linenum, '', false);
            }
        }

        var isSplit = false;
        var lineCount = nlapiGetLineItemCount('custpage_item_items');
        for (var i = 1; lineCount > 0 && i <= lineCount; i++) {

            var fieldValue = nlapiGetLineItemValue('custpage_item_items', 'custpage_item_split', i);

            if (fieldValue == 'T') {
                isSplit = true;
            }
        }
        if (isSplit) {
            nlapiSetFieldValue('custpage_cotermwithopp', '', false);
            nlapiSetFieldValue('custpage_cotermwdate', '', false);
            nlapiDisableField('custpage_cotermwithopp', true);
            nlapiDisableField('custpage_cotermwdate', true);
        }
        else {
            nlapiDisableField('custpage_cotermwithopp', false);
            nlapiDisableField('custpage_cotermwdate', false);
        }
    }
    if (name == 'custpage_cotermwithopp') {
        var value = nlapiGetFieldValue(name);
        if (value != null && value != '') {
            nlapiSetFieldValue('custpage_cotermwdate', '', false);
            nlapiDisableField('custpage_cotermwdate', true);
            nlapiDisableLineItemField('custpage_item_items', 'custpage_item_split', true);
            disableSplits();
        }
        else {
            nlapiDisableField('custpage_cotermwdate', false);
            enableSplits();
        }
    }

    if (name == 'custpage_cotermwdate') {
        var value = nlapiGetFieldValue(name);
        if (value != null && value != '') {
            nlapiSetFieldValue('custpage_cotermwithopp', '', false);
            nlapiDisableField('custpage_cotermwithopp', true);
            nlapiDisableLineItemField('custpage_item_items', 'custpage_item_split', true);
            disableSplits();
        }
        else {
            nlapiDisableField('custpage_cotermwithopp', false);
            enableSplits();
        }
    }

}

function disableSplits() {
    var lineCount = nlapiGetLineItemCount('custpage_item_items');
    for (var i = 1; lineCount > 0 && i <= lineCount; i++) {

        nlapiSetLineItemValue('custpage_item_items', 'custpage_item_split', i, '', false);
        nlapiSetLineItemDisabled('custpage_item_items', 'custpage_item_split', true, i);
    }
}

function enableSplits() {
    var lineCount = nlapiGetLineItemCount('custpage_item_items');
    for (var i = 1; lineCount > 0 && i <= lineCount; i++) {
        nlapiSetLineItemDisabled('custpage_item_items', 'custpage_item_split', false, i);
    }
}

function grabSplitLines() {

    var arrAllSplits = new Array();
    var lineCount = nlapiGetLineItemCount('custpage_item_items');
    for (var i = 1; lineCount > 0 && i <= lineCount; i++) {

        var split = nlapiGetLineItemValue('custpage_item_items', 'custpage_item_split', i);
        if (split == 'T') {

            var strMemberIds = nlapiGetLineItemValue('custpage_item_items', 'custpage_item_memberids', i);
            if (strMemberIds != null && strMemberIds != '') {
                arrAllSplits = arrAllSplits.concat(strMemberIds.split(','));
            }
        }
    }
    return arrAllSplits.join();
}

function grabKeepLines() {

    var arrAllKeeps = new Array();
    var lineCount = nlapiGetLineItemCount('custpage_item_items');
    for (var i = 1; lineCount > 0 && i <= lineCount; i++) {

        var split = nlapiGetLineItemValue('custpage_item_items', 'custpage_item_split', i);
        if (split != 'T') {

            var strMemberIds = nlapiGetLineItemValue('custpage_item_items', 'custpage_item_memberids', i);
            if (strMemberIds != null && strMemberIds != '') {
                arrAllKeeps = arrAllKeeps.concat(strMemberIds.split(','));
            }
        }
    }
    return arrAllKeeps.join();
}

function associateItems() {
    var salesOrderId = nlapiGetFieldValue('custpage_salesorder');
    var associationSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7itemassociation_acr', 'customdeployr7itemassociation_acr', false);
    var associationURL = associationSuiteletURL + '&custparam_ordertype=salesorder&custparam_orderid=' + salesOrderId;
    window.location = associationURL;
}


function raComplete() {
    document.getElementById('custpage_racomplete').value = 'Completing it!';
    nlapiSubmitField('salesorder', nlapiGetRecordId(), 'custbodyr7renewaloppcreated', 'T');
    document.getElementById('tbl_custpage_renew').style.display = 'none';
    document.getElementById('tbl_custpage_racomplete').style.display = 'none';

}

function redirectToRenewalSuitelet(tranType) {
    if (tranType == 'opp') {
        document.getElementById('custpage_cotermthisopp').value = 'Validating...';
        document.getElementById('custpage_cotermthisopp').style.cursor = 'wait';
        document.body.style.cursor = 'wait';
        
        window.location = nlapiResolveURL('SUITELET', 'customscriptr7renewalautomation_suitlet', 'customdeployr7renewalautomation_suitlet') + '&custparam_opportunity=' + nlapiGetRecordId();
    }
    else {
        document.getElementById('custpage_renew').value = 'Validating...';
        document.getElementById('custpage_renew').style.cursor = 'wait';
        document.body.style.cursor = 'wait';

        window.location = nlapiResolveURL('SUITELET', 'customscriptr7renewalautomation_suitlet', 'customdeployr7renewalautomation_suitlet') + '&custparam_salesorder=' + nlapiGetRecordId();
    }
}

function createOpportunitiesFromSuitelet() {

    if (validateRequiredFields()) {
        document.getElementById('custpage_renew').value = 'Processing renewals. Please wait...';
        document.getElementById('custpage_renew').style.cursor = 'wait';
        document.body.style.cursor = 'wait';

        var oppId = nlapiGetFieldValue('custpage_opportunity');
        var coTermOppId = nlapiGetFieldValue('custpage_cotermwithopp');

        /*
		 if (oppId != null && oppId != '' && coTermOppId != null && coTermOppId != ''){
		 var expClose1 = nlapiLookupField('opportunity', oppId, 'expectedclosedate');
		 var expClose2 = nlapiLookupField('opportunity', coTermOppId, 'expectedclosedate');
		 
		 if (expClose1 != null && expClose1 != '' && expClose2 != null && expClose2 != ''){
		 var dtExpClose1 = nlapiStringToDate(expClose1);
		 var dtExpClose2 = nlapiStringToDate(expClose2);
		 
		 if (dtExpClose1 < dtExpClose2){
		 var tempId = oppId;
		 oppId = coTermOppId;
		 coTermOppId = tempId;
		 }
		 }
		 }
		 */
        var formParams = new Array();
        formParams['custpage_salesorder'] = nlapiGetFieldValue('custpage_salesorder');
        formParams['custpage_opportunity'] = oppId;
        formParams['custpage_totaldiscount'] = nlapiGetFieldValue('custpage_totaldiscount');
        formParams['custpage_workflow'] = nlapiGetFieldValue('custpage_workflow');
        formParams['custpage_upliftpercent'] = nlapiGetFieldValue('custpage_upliftpercent');
        formParams['custpage_cotermwithopp'] = coTermOppId;
        formParams['custpage_cotermwdate'] = nlapiGetFieldValue('custpage_cotermwdate');
        formParams['custpage_splitlines'] = grabSplitLines();
        formParams['custpage_keeplines'] = grabKeepLines();

        var url = nlapiResolveURL('SUITELET', 'customscriptr7createrenewalsuitelet', 'customdeployr7createrenewalsuitelet', false);
        if (nlapiGetUser() == 148470019) {
            url = nlapiResolveURL('SUITELET', 'customscriptr7createrenewalsuitelet', 'customdeploy2', false);
        }
        var response = nlapiRequestURL(url, formParams);
        var body = response.getBody();

        if (body != null) {
            //body = body.replace(/[^a-zA-Z0-9]/g, '');
        }
        if (body != null && body != '') {

            if (body.substr(0, 6) == 'ERROR:') {
                alert(body.substr(6));
                document.location.reload(true);
                return;
            }
            
            window.location = nlapiResolveURL('SUITELET', 'customscriptr7renewalautomation_suitlet', 'customdeployr7renewalautomation_suitlet') + '&custparam_opportunity=' + oppId + '&custparam_redirectto=' + body;
            return;

        }
        else
            if (body == '') {
                alert('No opportunities needed to be created.');
                document.location.reload(true);
                return;
            }
            else {
                alert('Something went wrong. Please contact your Administrator.');
                document.location.reload(true);
                return;
            }
    }

}

function validateRequiredFields() {

    if (nlapiGetFieldValue('custpage_opportunity') != null && nlapiGetFieldValue('custpage_opportunity') != '') {
        var hasValue = false;

        var requiredFields = new Array(); //need at least 1
        requiredFields[0] = 'custpage_cotermwithopp';
        requiredFields[1] = 'custpage_cotermwdate';

        for (var i = 0; requiredFields != null && i < requiredFields.length; i++) {

            var fieldValue = nlapiGetFieldValue(requiredFields[i]);
            if (fieldValue != null && fieldValue != '') {
                hasValue = true;
            }
        }
        if (!hasValue) {
            var splitLines = grabSplitLines();
            if (splitLines == null || splitLines == '') {
                alert('Missing required value. Please select either Opp to co-term with, new date, or items to split.');
                return false;
            }
        }
    }
    else {
        var requiredFields = new Array();
        requiredFields[0] = 'custpage_workflow';
        requiredFields[1] = 'custpage_upliftpercent';

        for (var i = 0; requiredFields != null && i < requiredFields.length; i++) {

            var fieldValue = nlapiGetFieldValue(requiredFields[i]);

            if (fieldValue == null || fieldValue == '') {
                var fieldObj = nlapiGetField(requiredFields[i]);
                alert('Please provide a value for ' + fieldObj.getLabel());
                return false;
            }

        }
    }

    var salesOrderId = nlapiGetFieldValue('custpage_salesorder');
    if (salesOrderId != null && salesOrderId != '') {

        var productKeyCheck=checkForPendingProductKey(salesOrderId);
        if(productKeyCheck){
            alert("Sales Order has Pending Product Key on some Lines. Renewal Opportunity can be created only after Product Key's are updated on each required line.");
            return false;
        }

    }
    return true;
}

function checkForPendingProductKey(salesOrderId){

    var arrSearchFilters = new Array();
    arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'anyof', salesOrderId);
    arrSearchFilters[1] = new nlobjSearchFilter('custcolr7itemmsproductkey', null, 'contains', 'PEND');
        
    var arrSearchResults = nlapiSearchRecord('salesorder', null, arrSearchFilters);

    if (arrSearchResults != null && arrSearchResults.length > 0) {

        nlapiLogExecution('debug', 'Sales order has some lines with Pendign Product key');
        return true;
    }

    return false;
}

function markAllSplit() {

    var lineCount = nlapiGetLineItemCount('custpage_item_items');
    for (var i = 1; lineCount > 0 && i <= lineCount; i++) {
        nlapiSetLineItemValue('custpage_item_items', 'custpage_item_split', i, 'T');
    }
    nlapiDisableField('custpage_cotermwithopp', true);
    nlapiDisableField('custpage_cotermwdate', true);
}

function unMarkAllSplit() {

    var lineCount = nlapiGetLineItemCount('custpage_item_items');
    for (var i = 1; lineCount > 0 && i <= lineCount; i++) {
        nlapiSetLineItemValue('custpage_item_items', 'custpage_item_split', i, 'F');
    }
    nlapiDisableField('custpage_cotermwithopp', false);
    nlapiDisableField('custpage_cotermwdate', false);
}