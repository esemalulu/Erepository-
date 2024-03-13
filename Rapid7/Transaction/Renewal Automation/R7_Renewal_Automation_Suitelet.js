/*
 * @author efagone
 */

var arrProductTypes = grabAllProductTypes();

function getAdditionInfo(request, response) {
    nlapiLogExecution('AUDIT', 'enter', 'enter');
    if (request.getMethod() == 'GET') {

        //grab all parameters supplied
        var salesOrderId = request.getParameter('custparam_salesorder');
        var opportunityId = request.getParameter('custparam_opportunity');
        var redirectTo = request.getParameter('custparam_redirectto');

        nlapiLogExecution('AUDIT', 'custparam_salesorder', salesOrderId);
        nlapiLogExecution('AUDIT', 'custparam_opportunity', opportunityId);

        if (redirectTo != null && redirectTo != '') {
            var arrIds = redirectTo.split(',');
            var oppSearch = nlapiLoadSearch(null, 10264);
            oppSearch.addFilter(new nlobjSearchFilter('internalid', null, 'anyof', arrIds));
            oppSearch.setRedirectURLToSearchResults();
            return;
        }

        if ((salesOrderId == '' || salesOrderId == null) && (opportunityId == null || opportunityId == '')) {
            throw nlapiCreateError('INVALID PARAM', 'This suitelet requires a valid parameter', true);
        }

        //build form
        var form = nlapiCreateForm('Renewal Automation', false);
        form.setScript('customscriptr7renewalautosuitelet_cs');

        var primaryGroup = form.addFieldGroup('primarygroup', 'Primary Information').setSingleColumn(true);
        var transactionDetailsGroup = form.addFieldGroup('transactiondetailsgroup', 'Transaction Details').setSingleColumn(true);
        var renewalInformationGroup = form.addFieldGroup('renewalinformationgroup', 'Renewal Information');

        //hidden fields
        var fldCreateAlert = form.addField('custpage_createalert', 'checkbox').setDisplayType('hidden');
        var fldReason = form.addField('custpage_reason', 'text').setDisplayType('hidden');
        var fldCustomerId = form.addField('custpage_customerid', 'text').setDisplayType('hidden');
        var fldSalesOrderId = form.addField('custpage_salesorder', 'text').setDisplayType('hidden');
        var fldOpportunityId = form.addField('custpage_opportunity', 'text').setDisplayType('hidden');

        //main fields
        var fldCustomer = form.addField('custpage_customer', 'text', 'Customer', null, 'primarygroup').setDisplayType('inline');
        var fldOrderLink = form.addField('custpage_orderlink', 'text', 'Order #', null, 'primarygroup').setDisplayType('inline');
        var fldOpportunityLink = form.addField('custpage_opportunitylink', 'text', 'Order #', null, 'primarygroup').setDisplayType('hidden');
        var fldSalesRep = form.addField('custpage_salesrep', 'text', 'Sales Rep', null, 'primarygroup').setDisplayType('inline');
        var fldStartDate = form.addField('custpage_startdate', 'date', 'Start Date', null, 'primarygroup');
        fldStartDate.setDisplayType('inline');
        var fldEndDate = form.addField('custpage_enddate', 'date', 'End Date', null, 'primarygroup');
        fldEndDate.setDisplayType('inline');
        var fldExpectedClose = form.addField('custpage_expectedclose', 'date', 'Expected Close', null, 'primarygroup');
        fldExpectedClose.setDisplayType('inline');
        var fldAmount = form.addField('custpage_amount', 'currency', 'Total Amount', null, 'transactiondetailsgroup').setDisplayType('inline');
        fldStartDate.setLayoutType('normal', 'startcol');
        var fldTotalDiscount = form.addField('custpage_totaldiscount', 'percent', 'Total Discount', null, 'transactiondetailsgroup').setDisplayType('inline');
        var fldCategoriesPurchased = form.addField('custpage_categoriespurchased', 'multiselect', 'Categories Purchased', 'customrecord302', 'transactiondetailsgroup').setDisplayType('inline');

        var fldRenewalUplift = form.addField('custpage_upliftpercent', 'percent', 'Renewal Uplift', null, 'renewalinformationgroup');
        fldRenewalUplift.setLayoutType('startrow', 'startcol');
        var fldAMWorkflow = form.addField('custpage_workflow', 'select', 'Account Management Workflow', null, 'renewalinformationgroup');
        var fldCoTermWith = form.addField('custpage_cotermwithopp', 'select', 'Co-Term Into Opportunity', null, 'renewalinformationgroup');
        //fldCoTermWith.setDisplayType('inline');
        fldCoTermWith.setLayoutType('normal', 'startcol');
        var fldCoTermDate = form.addField('custpage_cotermwdate', 'date', 'Target Expiration', null, 'renewalinformationgroup');
        fldCoTermDate.setDisplayType('hidden');

        var itemList = form.addSubList('custpage_item_items', 'list', 'Items');
        itemList.setDisplayType('hidden');
        //itemList.addButton('custpage_btn_markall', 'Mark All', 'markAllSplit()');
        itemList.addButton('custpage_btn_unmarkall', 'Unmark All', 'unMarkAllSplit()');
        itemList.addField('custpage_item_memberids', 'textarea').setDisplayType('hidden');
        itemList.addField('custpage_item_split', 'checkbox', 'Move to separate Opp?');
        itemList.addField('custpage_item_itemfamily', 'text', 'Item').setDisplayType('inline');
        itemList.addField('custpage_item_key', 'text', 'Product Key');
        itemList.addField('custpage_item_minstart', 'date', 'Start Date');
        itemList.addField('custpage_item_maxend', 'date', 'End Date');
        itemList.addField('custpage_item_totalamount', 'currency', 'Total');

        //now populate the fields

        var recTransaction = null;
        var recLineItemCount = null;

        if (salesOrderId != null && salesOrderId != '') {
            recTransaction = nlapiLoadRecord('salesorder', salesOrderId);

            fldExpectedClose.setDisplayType('hidden');

            fldOrderLink.setDefaultValue('<a href="' + '/app/accounting/transactions/salesord.nl?id=' + salesOrderId + '" target="_blank">' + recTransaction.getFieldValue('tranid') + '</a>');
            fldAmount.setDefaultValue(recTransaction.getFieldValue('total'));

            var renewalUpliftCap = checkForUpliftCap(recTransaction);

            if (renewalUpliftCap != null && renewalUpliftCap != '') {
                fldRenewalUplift.setDefaultValue(renewalUpliftCap);
                fldRenewalUplift.setDisplayType('inline');
            }
            else {
                fldRenewalUplift.setDefaultValue(5);
            }

            fldRenewalUplift.setDefaultValue(0);

        }
        else
        if (opportunityId != null && opportunityId != '') {
            recTransaction = nlapiLoadRecord('opportunity', opportunityId);
            recLineItemCount = recTransaction.getLineItemCount('item');

            fldStartDate.setDisplayType('hidden');
            fldEndDate.setDisplayType('hidden');
            fldRenewalUplift.setDisplayType('hidden');
            fldAMWorkflow.setDisplayType('hidden');

            fldOrderLink.setDefaultValue('<a href="' + '/app/accounting/transactions/opprtnty.nl?id=' + opportunityId + '" target="_blank">' + recTransaction.getFieldValue('tranid') + '</a>');
            fldAmount.setDefaultValue(recTransaction.getFieldValue('projectedtotal'));

            fldRenewalUplift.setDefaultValue(0);

            fldCoTermDate.setDisplayType('normal');
            itemList.setDisplayType('normal');
        }

        fldSalesOrderId.setDefaultValue(salesOrderId);
        fldOpportunityId.setDefaultValue(opportunityId);
        fldCustomer.setDefaultValue(recTransaction.getFieldText('entity'));
        fldCustomerId.setDefaultValue(recTransaction.getFieldValue('entity'));
        fldSalesRep.setDefaultValue(recTransaction.getFieldText('salesrep'));
        fldStartDate.setDefaultValue(recTransaction.getFieldValue('startdate'));
        fldEndDate.setDefaultValue(recTransaction.getFieldValue('enddate'));
        fldExpectedClose.setDefaultValue(recTransaction.getFieldValue('expectedclosedate'));
        fldTotalDiscount.setDefaultValue(recTransaction.getFieldValue('custbodyr7transactiondiscounttotal'));
        fldCategoriesPurchased.setDefaultValue(recTransaction.getFieldValue('custbodyr7categorypurchased'));
        fldAMWorkflow.setDefaultValue(recTransaction.getFieldValue('custbodyr7accountmanagementworkflow'));

        fldSalesOrderId.setMandatory(true);
        fldCustomer.setMandatory(true);
        fldRenewalUplift.setMandatory(true);
        fldAMWorkflow.setMandatory(true);

        fldCustomer.setDisplaySize(250);
        fldAMWorkflow.setDisplaySize(200);
        fldRenewalUplift.setDisplaySize(10);

        sourceWorkflows(fldAMWorkflow);
        sourceOpportunities(fldCoTermWith, recTransaction);

        fldCustomer.setLayoutType('normal', 'startcol');

        var addAssociationButton = false;

        var arrDetails = getItemsFromOrder(recTransaction);
        nlapiLogExecution('debug', 'arrDetails', JSON.stringify(arrDetails));
        var arrItems = arrDetails[0];
        var arrACLItems = getACLItems(arrItems);
        var arrAddOnItems = getAddOnItems(arrItems);

        for (var i = 0; arrACLItems != null && i < arrACLItems.length; i++) {
            var listItem = arrACLItems[i];
            var itemProperties = listItem['itemProperties'];
            var isInactive = itemProperties['isinactive'];
            var productKey = listItem['activationKey'];

            if (salesOrderId != '' && salesOrderId != null && (productKey == '' || productKey == null)) {
                fldCreateAlert.setDefaultValue('T');
                fldReason.setDefaultValue('There are still unprocessed (or unassociated) items on this order.');
                addAssociationButton = true;
            }

            if (isInactive == 'T') {
                fldCreateAlert.setDefaultValue('T');
                fldReason.setDefaultValue('There is an inactive item on the order you are processing.');
            }
        }

        for (var i = 0; arrAddOnItems != null && i < arrAddOnItems.length; i++) {
            var listItem = arrAddOnItems[i];
            var itemProperties = listItem['itemProperties'];
            var isInactive = itemProperties['isinactive'];
            var productKey = listItem['activationKey'];

            if (salesOrderId != '' && salesOrderId != null && (productKey == '' || productKey == null)) {
                fldCreateAlert.setDefaultValue('T');
                fldReason.setDefaultValue('There are still unprocessed (or unassociated) items on this order.');
                addAssociationButton = true;
            }

            if (isInactive == 'T') {
                fldCreateAlert.setDefaultValue('T');
                fldReason.setDefaultValue('There is an inactive item on the order you are processing.');
            }
        }

        if (opportunityId != null && opportunityId != '') {
            var objGroups = arrDetails[1];
            objGroups = addTotalsToGroup(objGroups, opportunityId);
            var lineNum = 1;
            for (var key in objGroups) {

                var group = objGroups[key];
                var licenseInfo = findLicenseFamily(group.key, group.acrId);

                nlapiLogExecution('AUDIT', ' group.members.join()', group.members.join());
                itemList.setLineItemValue('custpage_item_memberids', lineNum, group.members.join());
                if (licenseInfo != null && licenseInfo != '') {
                    if (licenseInfo[3] != null && licenseInfo[3] != '') {
                        itemList.setLineItemValue('custpage_item_itemfamily', lineNum, licenseInfo[3]);
                    }
                }else{
                    itemList.setLineItemValue('custpage_item_itemfamily', lineNum, group.itemText);
                }
                itemList.setLineItemValue('custpage_item_key', lineNum, group.key);
                itemList.setLineItemValue('custpage_item_minstart', lineNum, group.start);
                itemList.setLineItemValue('custpage_item_maxend', lineNum, group.end);
                itemList.setLineItemValue('custpage_item_totalamount', lineNum, group.total);

                lineNum++;
            }
        }

        if (addAssociationButton) {
            form.addButton('custpage_associateitems', 'Associate Items', 'associateItems');
        }
        else {
            var theButton = form.addButton('custpage_renew', 'Create Renewal', 'createOpportunitiesFromSuitelet');

            if (opportunityId != null && opportunityId != '') {
                theButton.setLabel('Process');
            }
        }

        response.writePage(form);


    }

}

function sourceWorkflows(fld) {
    fld.addSelectOption('', '');
    var arrSearchFilters = new Array();
    arrSearchFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');

    var arrSearchColumns = new Array();
    arrSearchColumns[0] = new nlobjSearchColumn('name');

    var arrSearchResults = nlapiSearchRecord('customrecordr7acctmanageworkflow', null, arrSearchFilters, arrSearchColumns);

    for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

        var searchResult = arrSearchResults[i];
        var workflowId = searchResult.getId();
        var workflowName = searchResult.getValue(arrSearchColumns[0]);

        fld.addSelectOption(workflowId, workflowName);
    }

}

function grabMinStartDateForLineItems(recOrder) {

    var oppLineItemCount = recOrder.getLineItemCount('item');

    var minDate = '';

    for (var i = 1; i <= oppLineItemCount; i++) {
        var lineDate = recOrder.getLineItemValue('item', 'custcolr7startdate', i);

        if (lineDate != null && lineDate != '') {

            var dtLineDate = nlapiStringToDate(lineDate);

            if (minDate == null || minDate == '' || dtLineDate > minDate) {
                minDate = dtLineDate;
            }

        }
    }

    if (minDate == '' || minDate == null) {
        throw nlapiCreateError('INVALID DATE', 'Could not determine end date of opportunity.');
    }
    return minDate;
}

/**
 *  modified 10.02.2019 due to APPS-3665 ticket (https://issues.corp.rapid7.com/browse/APPS-3665)
 *  logic to exclude opps with contract automation records removed in this function.
 */
function sourceOpportunities(fld, recTransaction) {

    fld.addSelectOption('', '');

    var customerId = recTransaction.getFieldValue('entity');

    var arrSearchFilters = new Array();
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('entity', null, 'is', customerId);
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('entitystatus', null, 'anyof', [85, 78, 37, 105, 38, 41, 39, 36, 35]);
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('probability', null, 'greaterthan', 0);
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('probability', null, 'lessthan', 100);
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('currency', null, 'is', recTransaction.getFieldValue('currency'));
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', null, 'noneof', recTransaction.getId());
    // APPS-3665 include subsidiary comparsion to avoid conflicts
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('subsidiary', null, 'is', recTransaction.getFieldValue('subsidiary'));

    if (recTransaction.getRecordType().toLowerCase() == 'opportunity') {
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custcolr7enddate', null, 'onorafter', grabMinStartDateForLineItems(recTransaction));
        arrSearchFilters[arrSearchFilters.length - 1].setSummaryType('max');
    }

    var arrSearchColumns = new Array();
    arrSearchColumns[0] = new nlobjSearchColumn('tranid', null, 'max').setSort(true);
    arrSearchColumns[1] = new nlobjSearchColumn('title', null, 'max');
    arrSearchColumns[2] = new nlobjSearchColumn('entitystatus', null, 'max');
    arrSearchColumns[3] = new nlobjSearchColumn('expectedclosedate', null, 'max');
    arrSearchColumns[4] = new nlobjSearchColumn('projectedtotal', null, 'max');
    arrSearchColumns[5] = new nlobjSearchColumn('custcolr7enddate', null, 'min');
    arrSearchColumns[6] = new nlobjSearchColumn('internalid', null, 'group');

    var arrSearchResults = nlapiSearchRecord('opportunity', null, arrSearchFilters, arrSearchColumns);

    for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

        var searchResult = arrSearchResults[i];
        var oppId = searchResult.getValue(arrSearchColumns[6]);
        var tranId = searchResult.getValue(arrSearchColumns[0]);
        var title = searchResult.getValue(arrSearchColumns[1]);
        var expClose = searchResult.getValue(arrSearchColumns[3]);
        var amount = searchResult.getValue(arrSearchColumns[4]);
        amount = addCommas(amount);

        var optionText = tranId + ': ' + title + ' (' + expClose + ') -  $' + amount;

        fld.addSelectOption(oppId, optionText);
    }
}

function checkForUpliftCap(salesOrder) {

    var arrSearchFilters = new Array();
    var arrSearchColumns = new Array();
    var arrSearchResults;

    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', null, 'is', salesOrder.getId());
    arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7carcreatedfromtemplate', 'custbodyr7contractautomationrecs', 'anyof', 6); //order
    arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7carpercent', 'custbodyr7contractautomationrecs', 'MIN').setSort(true);

    arrSearchResults = nlapiSearchRecord('transaction', null, arrSearchFilters, arrSearchColumns);

    var upliftCap;

    if (arrSearchResults != null) {
        upliftCap = arrSearchResults[0].getValue(arrSearchColumns[0]);
    }

    return upliftCap;
}

function addTotalsToGroup(objGroups, opportunityId) {

    if (opportunityId != null && opportunityId != '') {
        var arrFilters = new Array();
        arrFilters[arrFilters.length] = new nlobjSearchFilter('internalid', null, 'is', opportunityId);

        var arrSearchResults = nlapiSearchRecord('transaction', 14966, arrFilters);

        for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
            var columns = arrSearchResults[i].getAllColumns();
            var currentKey = arrSearchResults[i].getValue(columns[1]);
            if (currentKey != null && currentKey != '') {
                if (objGroups.hasOwnProperty(currentKey)) {
                    objGroups[currentKey]['total'] = arrSearchResults[i].getValue(columns[2]);
                }
            }
        }
    }
    return objGroups;
}

function addCommas(nStr) {
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
}

function r7_group() {

    this.start = '';
    this.end = '';
    this.total = 0;
    this.key = '';
    this.acrId = '';
    this.members = new Array();
}


function findLicenseFamily(activationKey, acrId) {

    if (acrId == null || acrId == '') {
        return null;
    }
    var acrProductTypeFields = arrProductTypes[acrId];

    if (acrProductTypeFields != null && acrProductTypeFields != '' && acrProductTypeFields != 'undefined') {
        var activationKeyField = acrProductTypeFields['activationid'];
        var recordId = acrProductTypeFields['recordid'];
        var expirationField = acrProductTypeFields['expiration'];
        var licenseIdField = acrProductTypeFields['licenseid'];
        var familyField = acrProductTypeFields['itemfamily'];

        var arrSearchFilters = new Array();
        //arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter(activationKeyField, null, 'is', activationKey);
        arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('name', null, 'haskeywords', activationKey);

        var arrSearchColumns = new Array();
        arrSearchColumns[0] = new nlobjSearchColumn(expirationField);
        arrSearchColumns[1] = new nlobjSearchColumn('internalid');
        arrSearchColumns[2] = new nlobjSearchColumn(licenseIdField);
        arrSearchColumns[3] = new nlobjSearchColumn(familyField);

        var arrSearchResults = nlapiSearchRecord(recordId, null, arrSearchFilters, arrSearchColumns);

        if (arrSearchResults != null && arrSearchResults.length >= 1) {
            var expDate = arrSearchResults[0].getValue(arrSearchColumns[0]);
            var licenseId = arrSearchResults[0].getValue(arrSearchColumns[1]);
            var name = arrSearchResults[0].getValue(arrSearchColumns[2]);
            var family = arrSearchResults[0].getText(arrSearchColumns[3]);
            return new Array(expDate, licenseId, name, family);
        }

        if(!arrSearchResults && acrId !== 10) {
            return findLicenseFamily(activationKey, 10);
        }
    }
    return null;
}

function getItemsFromOrder(recOrder) {

    var objGroups = new Object();
    var prevLine = null;
    var lineItems = new Array();
    var recType = recOrder.getRecordType();

    lineItemCount = recOrder.getLineItemCount('item');

    for (var i = 1; i <= lineItemCount; i++) {

        var lineItem = new Array();
        var itemId = recOrder.getLineItemValue('item', 'item', i);
        var itemText = recOrder.getLineItemText('item', 'item', i);
        var productKey = '';
        var activationKey = recOrder.getLineItemValue('item', 'custcolr7translicenseid', i);
        var itemType = recOrder.getLineItemValue('item', 'itemtype', i);
        var amount = formatAmount(recOrder.getLineItemValue('item', 'amount', i));

        var itemProperties = getItemProperties(itemId);
        var itemOptionId = '';
        var prodItemFamily = '';
        var acrId = '';
        if (itemProperties != null) {
            acrId = itemProperties['custitemr7itemacrproducttype'];

            if (acrId != null && acrId != '') {
                itemOptionId = arrProductTypes[acrId]['optionid'];
                prodItemFamily = arrProductTypes[acrId]['itemfamily'];
                productKey = recOrder.getLineItemValue('item', itemOptionId, i);
                activationKey = recOrder.getLineItemValue('item', 'custcolr7translicenseid', i);

                if ((prodItemFamily == null || prodItemFamily == '') && itemType == 'Group') {
                    nextItemId = recOrder.getLineItemValue('item', 'item', (i + 1));
                    prodItemFamily = nlapiLookupField('item', nextItemId, 'custitemr7itemfamily');
                }
            }

            var itemFamilies = itemProperties['custitemr7itemfamily'];
            if (itemFamilies != '') {
                itemFamilies = itemFamilies.split(",");
            }
        }

        lineItem['acrId'] = acrId;
        lineItem['itemType'] = itemType;
        lineItem['inGroup'] = recOrder.getLineItemValue('item', 'ingroup', i); //Added by Sa Ho (RSM) 8/17/2017
        lineItem['itemProperties'] = itemProperties;
        lineItem['itemfamily'] = prodItemFamily;
        lineItem['productKey'] = productKey;
        lineItem['activationKey'] = activationKey;
        lineItem['itemId'] = itemId;
        lineItem['itemText'] = itemText;
        lineItem['lineId'] = recOrder.getLineItemValue('item', 'id', i);
        lineItem['lineNumber'] = recOrder.getLineItemValue('item', 'line', i); //Added by Sa Ho (RSM) 8/17/2017
        lineItem['quantity'] = recOrder.getLineItemValue('item', 'quantity', i);
        lineItem['amount'] = amount;
        lineItem['rate'] = recOrder.getLineItemValue('item', 'rate', i) || formatAmount((amount / parseFloat(lineItem['quantity'])));
        lineItem['startdate'] = recOrder.getLineItemValue('item', 'custcolr7startdate', i);
        lineItem['enddate'] = recOrder.getLineItemValue('item', 'custcolr7enddate', i);
        lineItems[lineItems.length] = lineItem;

        if ((itemType == 'Subtotal' || itemType == 'Description' || itemType == 'Discount') && prevLine != null) {
            continue;
        }
        else if ((activationKey != null && activationKey != '') || (itemType == 'EndGroup')) {
            if (itemType == 'EndGroup') {
                activationKey = prevLine['activationKey'];
            }
            nlapiLogExecution('DEBUG', 'info', 'itemType: ' + itemType + ', activationKey: ' + activationKey + ', productKey: ' + productKey + ', lineItem[lineId] ' + lineItem['lineId']);
            objGroups = addToGroup(objGroups, activationKey, lineItem);
        }
        else if ((activationKey == null || activationKey == '') && (productKey != null && productKey != '') && recType == 'opportunity') {
            nlapiLogExecution('AUDIT', 'Activation Key/License ID Text Missing', 'Using product key to find License ID Text');
            var thisID = sourceActivationKeyFromProductKey(productKey, acrId);
            if(thisID) {
                recOrder.setLineItemValue('item', 'custcolr7translicenseid', i, thisID);
                nlapiLogExecution('DEBUG', 'info', 'itemType: ' + itemType + ', activationKey: ' + thisID + ', productKey: ' + productKey + ', lineItem[lineId] ' + lineItem['lineId']);
                objGroups = addToGroup(objGroups, thisID, lineItem);
            }
        }
        else if ((activationKey == null || activationKey == '') && (productKey == null || productKey == '') && recType == 'opportunity') {
            nlapiLogExecution("AUDIT", "activationKey & productKey missing for line:"+i, "activationKey:"+activationKey+", productKey:"+productKey);
            //License ID Test & Product Option (pk/MServ/MSoft ID) both missing
            var thisOppCatPurchased = recOrder.getLineItemValue('item', 'custcolr7_category_purchased', i);
            var thisOppAmount = recOrder.getLineItemValue('item', 'amount', i)
            var thisOppOrigSO = recOrder.getLineItemValue('item', 'custcolr7createdfromra', i);
            try{
                var soRec = nlapiLoadRecord('salesorder', thisOppOrigSO);
                var line = soRec.findLineItemValue('item', 'custcolr7_category_purchased', thisOppCatPurchased);
                var soAmount = soRec.getLineItemValue('item', 'amount', line);
    
                var soPK = soRec.getLineItemValue('item', 'custcolr7itemmsproductkey', line);
                var soMSoft = soRec.getLineItemValue('item', 'custcolr7managedsoftwareid', line);
                var soMServ = soRec.getLineItemValue('item', 'custcolr7managedserviceid', line);
                var licIdTxt = soRec.getLineItemValue('item', 'custcolr7translicenseid', line);
    
                recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', i, soPK);
                recOrder.setLineItemValue('item', 'custcolr7managedsoftwareid', i, soMSoft);
                recOrder.setLineItemValue('item', 'custcolr7managedserviceid', i, soMServ);
                recOrder.setLineItemValue('item', 'custcolr7translicenseid', i, licIdTxt);
                objGroups = addToGroup(objGroups, licIdTxt, lineItem);
            } catch(e){
                nlapiLogExecution("ERROR", e.name, e.message);
            }
        }

        prevLine = lineItem;
    }
    nlapiSubmitRecord(recOrder, false, true);
    return new Array(lineItems, objGroups);
}

function sourceActivationKeyFromProductKey(productKey, acrId) {
    var licenseType = '';
    var arrSearchFilters = new Array();
    arrSearchFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');


    var arrSearchColumns = new Array();
    arrSearchColumns[0] = new nlobjSearchColumn('name');
    var findPk = true;

    switch (acrId) {
        case '1':
            licenseType = 'customrecordr7nexposelicensing';
            arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7nxproductkey', null, 'is', productKey);
            break;
        case '2':
            licenseType = 'customrecordr7metasploitlicensing';
            arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7msproductkey', null, 'is', productKey);
            break;
        case '3':
            licenseType = 'customrecordr7managedservices';
            arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7managedserviceid', null, 'is', productKey);
            break;
        case '6':
            licenseType = 'customrecordr7mobilisafelicense';
            arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7mblicenseproductkey', null, 'is', productKey);
            break;
        case '7':
            licenseType = 'customrecordr7userinsightlicense';
            arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7uilicenseproductkey', null, 'is', productKey);
            break;
        case '8':
            licenseType = 'customrecordr7appspiderlicensing';
            arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7asplicenseproductkey', null, 'is', productKey);
            break;
        case '9':
            licenseType = 'customrecordr7insightplatform';
            arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7inplicenseprodcutkey', null, 'is', productKey);
            break;
        case '10':
            licenseType = 'customrecordr7managedsoftware';
            arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7managedsoftwareid', null, 'is', productKey);
            break;
        default:
            findPk = false;
    }
    if(findPk){
        var arrSearchResults = nlapiSearchRecord(licenseType, null, arrSearchFilters, arrSearchColumns);
        if(arrSearchResults){
            nlapiLogExecution('DEBUG', 'Finding PK. Search Results Count', arrSearchResults.length);
            return arrSearchResults[0].getValue(arrSearchColumns[0]);
        }
    }
    return null;
}

function addToGroup(objGroups, activationKey, lineItem, memberAmount) {

    //if (activationKey != null && activationKey != '' && activationKey != 'null') {
        var group = new r7_group();

        var startDate = lineItem['startdate'];
        var endDate = lineItem['enddate'];
        var amount = lineItem['amount'];
        var rate = lineItem['rate'];
        var lineId = lineItem['lineId'];
        var acrId = lineItem['acrId'];
        var memberId = lineId;
        var itemText = lineItem['itemText'];

        if (objGroups.hasOwnProperty(activationKey)) {
            group = objGroups[activationKey];
        }

        if ((startDate != null && startDate != '') && (group.start == '' || nlapiStringToDate(startDate) < nlapiStringToDate(group.start))) {
            group.start = startDate;
        }
        if ((endDate != null && endDate != '') && (group.end == '' || nlapiStringToDate(endDate) > nlapiStringToDate(group.end))) {
            group.end = endDate;
        }
        /* CHANGED BY BSD 03/28/2016
		if (lineItem['itemType'] == 'Discount' && lineItem['rate'].indexOf('%') != -1) {//percent discount
		*/
        if ((lineItem['rate'] != null) && lineItem['itemType'] == 'Discount' && ((" " + lineItem['rate']).indexOf('%') != -1)) {//percent discount
            /* END OF BSD CHANGES */
            amount = group.total * (parseFloat(lineItem['rate']) / 100);
        }

        if (memberAmount != null && memberAmount != '') {
            memberId += ':' + memberAmount;
            amount = memberAmount;
        }

        if (amount != null && amount != '') {
            group.total += amount;
        }

        if (group.acrId == null || group.acrId == '') {
            group.acrId = acrId;
        }
        group.key = activationKey;
        group.members[group.members.length] = memberId;
        if(activationKey){
            objGroups[activationKey] = group;
        }else{
            group.itemText = itemText;
            objGroups[lineId] = group;
        }
    //}

    return objGroups;
}

function formatAmount(amount) {

    if (amount != null && amount != '' && amount != 'undefined' && !isNaN(parseFloat(amount))) {
        return Math.round(parseFloat(amount) * 100) / 100;
    }

    return 0;
}

function getACLItems(arrItems) {

    var arrACLItems = new Array();
    if (arrItems != null) {
        for (var i = 0; i < arrItems.length; i++) {
            if (arrItems[i]['itemProperties'] == null) {
                continue;
            }
            if (arrItems[i]['itemProperties']['custitemr7itemautocreatelicense'] == 'T') {
                arrACLItems[arrACLItems.length] = arrItems[i];
            }
        }
    }
    return arrACLItems;
}

function getAddOnItems(arrItems) {

    var arrAddOnItems = new Array();

    for (var i = 0; arrItems != null && i < arrItems.length; i++) {
        if (arrItems[i]['itemProperties'] == null) {
            continue;
        }

        var strItemAddOns = arrItems[i]['itemProperties']['custitemr7acladdons'];
        if (strItemAddOns != null && strItemAddOns != '') {
            arrItems[i]['addOns'] = strItemAddOns;
            arrAddOnItems[arrAddOnItems.length] = arrItems[i];
        }
    }
    return arrAddOnItems;
}

function getItemProperties(itemId) {

    var properties = new Array();
    properties[properties.length] = 'custitemr7itemautocreatelicense';
    properties[properties.length] = 'custitemr7itemdedicatedhosted';
    properties[properties.length] = 'custitemr7acladdons';
    properties[properties.length] = 'isinactive';
    properties[properties.length] = 'displayname';
    properties[properties.length] = 'custitemr7itemmslicensetype1';
    properties[properties.length] = 'custitemr7itemnxlicensetype';
    properties[properties.length] = 'issueproduct';
    properties[properties.length] = 'custitemr7itemactivationemailtemplate';
    properties[properties.length] = 'custitemr7itemfamily';
    properties[properties.length] = 'custitemr7itemdefaultterm';
    properties[properties.length] = 'custitemr7itemrequireeventregistration';
    properties[properties.length] = 'custitemr7itemcategory';
    properties[properties.length] = 'custitemr7itemdefaulteventmaster';
    properties[properties.length] = 'custitemr7itemacrproducttype';

    return nlapiLookupField('item', itemId, properties);

}