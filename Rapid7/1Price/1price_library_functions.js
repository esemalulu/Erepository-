
//process1PriceSalesOrder - main function for processing 1price lines on sales order
function process1PriceSalesOrder(recOrder) {
    nlapiLogExecution('AUDIT', 'Processing 1Price Sales Order');
    process1PriceRenewChildConsoles(recOrder);
    nlapiLogExecution('AUDIT', 'Processed 1Price Renew Child Consoles');
    updatePackageLicenses(recOrder);
    nlapiLogExecution('AUDIT', 'Processed 1Price Upgrade Package Licenses');
    //Send 1Price Renewal Notifications if required
    // var sendRenewalNotification = recOrder.getFieldValue('custbody_renewal_notification_req');
    // nlapiLogExecution('AUDIT', '1Price Renewal Notification Required?', sendRenewalNotification);
    // if(sendRenewalNotification == 'T') {
    //     nlapiLogExecution('AUDIT', 'Processing 1Price Renewal Notification');
    //     process1PriceRenewalNotification(recOrder);
    // }
    nlapiLogExecution('DEBUG', 'process1PriceSalesOrder complete');
}

function updatePackageLicenses(recOrder) {
    nlapiLogExecution('AUDIT', 'updatePackageLicenses started');
    for (var x = 1; x <= recOrder.getLineItemCount('item'); x++) {
        var packageLicenseId = recOrder.getLineItemValue('item', 'custcol_r7_pck_package_license', x);

        if(packageLicenseId) {
            var packageItem = recOrder.getLineItemValue('item', 'custcol_r7_pck_package_item', x);
            var orderPackageLevel = recOrder.getLineItemValue('item', 'custcol_r7_pck_package_level', x);
            var packageItemTemplate = nlapiLookupField('item', packageItem, ['custitem_r7_pck_package_template']);
            var packageLicense = nlapiLoadRecord('customrecord_r7_pck_license', packageLicenseId);
            var currentPackageLevel = packageLicense.getFieldValue('custrecord_r7_pl_current_level');

            packageLicense.setFieldValue('custrecord_r7_pl_package_template', packageItemTemplate['custitem_r7_pck_package_template']);
            packageLicense.setFieldValue('custrecord_r7_pl_item', packageItem);
            packageLicense.setFieldValue('custrecord_r7_pl_current_level', orderPackageLevel);

            //if 1Price renewal notification required, & package level has changed, set flag on package license
            var sendRenewalNotification = recOrder.getFieldValue('custbody_renewal_notification_req');
            if(sendRenewalNotification == 'T' && currentPackageLevel != orderPackageLevel) {
                packageLicense.setFieldValue('custrecord_r7_pl_level_update', 'T');
            }

            nlapiSubmitRecord(packageLicense);
            nlapiLogExecution('AUDIT', 'Updated Package License: ' + packageLicenseId);
        }
    }
}

//create1PriceFulfillments - creates "One Price Fulfillment" records and assigns on sales order lines
function create1PriceFulfillments(recOrder, orderUpdates) {
    nlapiLogExecution('DEBUG', 'create1PriceFulfillments started');
    //check if OldPrice Fulfilment at Scale is enabled
    var oldPriceFaSEnabled = nlapiGetContext().getSetting('SCRIPT', 'custscript_enable_oldp_fulfil_at_scale');
    var oldPriceFaSPackages = nlapiGetContext().getSetting('SCRIPT', 'custscript_oldp_fulfil_at_scale_packages').split(",");
    //holds licenses we've made fulfillment records for.
    var licensesWithFulfillment = [];
    //var recOrder = nlapiLoadRecord('salesorder', orderId);
    for (var x = 1; x <= recOrder.getLineItemCount('item'); x++) {
        var oneItemFlow = recOrder.getLineItemValue('item', 'custcolr7_one_item_flow', x);
        var licenseIdText = recOrder.getLineItemValue('item', 'custcolr7translicenseid', x);
        var thisLinePackage = recOrder.getLineItemValue('item', 'custcol_r7_pck_package_level', x);
        var thisLineFulfilAtScale = recOrder.getLineItemValue('item', 'custcol_requires_fulfil_at_scale', x) == 'T' ? true : false;

        //APPS-23871 we need to make OnePrice Fulfillment records not only for items with ACL = T
        //If is OnePrice, line item has a licence, and this license doesn't already have a fulfillment record.
        if((oneItemFlow && licenseIdText && licensesWithFulfillment.indexOf(licenseIdText) == -1) ||
            (licenseIdText && oldPriceFaSEnabled && thisLineFulfilAtScale && licensesWithFulfillment.indexOf(licenseIdText) == -1)){
            var isNexpose = licenseIdText.indexOf('NXL') != -1;
            var isInsight = licenseIdText.indexOf('INP') != -1;
            var isMetasploit = licenseIdText.indexOf('MSL') != -1;
            //should be one of these, else doesn't need a OnePrice Fulfillment record.
            if(isNexpose || isInsight || isMetasploit){
                var lineHash = recOrder.getLineItemValue('item', 'custcolr7_linehash', x);
                var soIntId = recOrder.getId();
                nlapiLogExecution('DEBUG', 'create1PriceFulfillments debug obj 2', JSON.stringify({
                    oneItemFlow: oneItemFlow,
                    licenseIdText: licenseIdText,
                    lineHash: lineHash,
                    soIntId: soIntId,
                    isNexpose: isNexpose,
                    isInsight: isInsight,
                    isMetasploit: isMetasploit
                }));

                var newFulfillmentRec = nlapiCreateRecord('customrecord_onepricefulfillment');
                newFulfillmentRec.setFieldValue('custrecordopffulfillmentstatus', 1); //pending fulfillment
                newFulfillmentRec.setFieldValue('custrecordopfsalesorder', soIntId);
                newFulfillmentRec.setFieldValue('custrecordopflinehash', lineHash);

                if (isNexpose) {
                    newFulfillmentRec.setFieldValue('custrecordopfnexposelicrec', licenseIdText.split('NXL')[1]);
                }
                if (isInsight) {
                    newFulfillmentRec.setFieldValue('custrecordopfinplicrec', licenseIdText.split('INP')[1]);
                }
                if (isMetasploit) {
                    newFulfillmentRec.setFieldValue('custrecordopfmetasploitlicrec', licenseIdText.split('MSL')[1]);
                }

                var newFulfillmentId = nlapiSubmitRecord(newFulfillmentRec);
                licensesWithFulfillment.push(licenseIdText);

                recOrder.setLineItemValue('item', 'custcolr7onepricefulfillment', x, newFulfillmentId);
                orderUpdates.lines[x]['custcolr7onepricefulfillment'] = newFulfillmentId;
            }
        }
    }
    nlapiLogExecution('DEBUG', 'create1PriceFulfillments complete');

}

//process1PriceConsoleRenewal - processes renewal of paid consoles on sales order
function process1PriceRenewChildConsoles(recOrder) {
    var newRecOrder = nlapiLoadRecord('salesorder', recOrder.getId());
    var lineCount = newRecOrder.getLineItemCount('item');
    for (var i = 1; i <= lineCount; i++) {
        var itemId = newRecOrder.getLineItemValue('item', 'item', i);
        var oneItemFlow = newRecOrder.getLineItemValue('item', 'custcolr7_one_item_flow', i);
        var onePriceSellingMotion = newRecOrder.getLineItemValue('item', 'custcolr7_oneprice_selling_motion', i);
        var licStartDate = newRecOrder.getLineItemValue('item', 'custcolr7startdate', i);
        var licEndDate = newRecOrder.getLineItemValue('item', 'custcolr7enddate', i);
        var licenseLink = newRecOrder.getLineItemValue('item', 'custcolr7translicenselink', i);

        if(licenseLink) {
            var licId = licenseLink.split('id=')[1];
        } else if(newRecOrder.getLineItemValue('item', 'custcolr7translicenseid', i)) {
            var licId = Number(newRecOrder.getLineItemValue('item', 'custcolr7translicenseid', i).replace(/NXL|INP|MSL/g, ''));
        } else {
            continue;
        }

        if ((itemId == '7416' || itemId == '7555') && oneItemFlow == '3') {
            //process child consoles that renew with parent = T
            processChildConsolesRenewWithParent(licId, licEndDate, licStartDate, newRecOrder);
        } else if (itemId == '7555' && oneItemFlow == '2' && onePriceSellingMotion == '1') {
            var licFields = nlapiLookupField('customrecordr7nexposelicensing', licId, ['custrecordr7nxproductkey']);
            processNexposeMigratedLFMs(licEndDate, licId, licFields['custrecordr7nxproductkey']);
        }
    }
}

function processChildConsolesRenewWithParent(licId, licEndDate, licStartDate, recOrder){
    var childAssetTotal = 0;
    var filters = [];
    filters[0] = new nlobjSearchFilter('custrecordr7nxlicense_parentlicense', null, 'is', licId);
    filters[1] = new nlobjSearchFilter('custrecordr7nxrenewwithparent', null, 'is', 'T');
    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid');
    var results = nlapiSearchRecord('customrecordr7nexposelicensing', null, filters, columns);

    for (var j = 0; results != null && j < results.length; j++) {
        var childLicIntId = results[j].getValue(columns[0]);
        //var childLicRec = nlapiLoadRecord('customrecordr7nexposelicensing', childLicIntId);
        var masterLicFields = nlapiLookupField('customrecordr7nexposelicensing', licId, ['custrecordr7nxproductkey']);
        var childLicFields = nlapiLookupField('customrecordr7nexposelicensing', childLicIntId, ['name', 'custrecordr7nxproductkey', 'custrecordr7nxlicenseexpirationdate']);

        var objChildLicRec = {
            id: childLicIntId,
            productkey: childLicFields['custrecordr7nxproductkey'],
            expirationDate: childLicFields['custrecordr7nxlicenseexpirationdate'],
            parentId: licId,
            parentProductKey: masterLicFields['custrecordr7nxproductkey']
        };

        copyCurrentAndFutureFMRs(objChildLicRec, licStartDate, licEndDate, recOrder.getId());
        //childLicRec.setFieldValue('custrecordr7nxlicenseexpirationdate', licEndDate);
        //nlapiSubmitRecord(childLicRec);
        nlapiSubmitField('customrecordr7nexposelicensing', childLicIntId, 'custrecordr7nxlicenseexpirationdate', licEndDate);
        //keep running total of assets allocated to renewing child consoles
        var thisConsoleAssets = nlapiLookupField('customrecordr7nexposelicensing', childLicIntId, ['custrecordr7nxlicensenumberips']);
        createRenewedChildAssetLFM(objChildLicRec, licStartDate, licEndDate, recOrder.getId(), thisConsoleAssets['custrecordr7nxlicensenumberips']);
        childAssetTotal += parseInt(thisConsoleAssets['custrecordr7nxlicensenumberips']);
    }

    //create LFM against Parent Console for assets allocated to children
    createRenewalAdjustmentLFM(childAssetTotal, licEndDate, licStartDate, recOrder, licId, masterLicFields);

    //re-trigger upgrade/AmendExtend logic after child console processing.
    process1PriceUpgrades(recOrder)
}

//create new adjustment LFM for parent console to track renewed child assets
function createRenewalAdjustmentLFM(childAssetTotal, licEndDate, licStartDate, recOrder, licId, masterLicFields) {
    var NUMBER_OF_IPS_FEATURE = 4;
    var SCHEDULED_STATUS = 1;

    var childAssetAdjustment = childAssetTotal * -1;
    nlapiLogExecution("AUDIT", "Creating Child Console Renewal Adjustment LFM. Asset Count:", childAssetAdjustment);
    var adjustmentLFM = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
    adjustmentLFM.setFieldValue('custrecordr7licfmfeature', NUMBER_OF_IPS_FEATURE);
    adjustmentLFM.setFieldValue('custrecordr7licfmvalue', childAssetAdjustment);
    adjustmentLFM.setFieldValue('custrecordr7licfmsalesorder', recOrder.getId());
    adjustmentLFM.setFieldValue('custrecordr7licfmstartdate', licStartDate);
    adjustmentLFM.setFieldValue('custrecordr7licfmenddate', licEndDate);
    adjustmentLFM.setFieldValue('custrecordr7licfeature_adjustment', 'T');
    adjustmentLFM.setFieldValue('custrecordr7licfmstatus', SCHEDULED_STATUS);
    adjustmentLFM.setFieldValue('custrecordr7licfmproductkey', masterLicFields['custrecordr7nxproductkey']);
    adjustmentLFM.setFieldValue('custrecordr7licfmnexposelicense', licId);

    nlapiSubmitRecord(adjustmentLFM);
}

//process1PriceConsoleRenewal - called by process1PriceRenewChildConsoles
function copyCurrentAndFutureFMRs(objNewLic, startDate, endDate, newSOId) {

    //copy LFMs from parent, but exclude Number of IPs & adjustment LFMs
    var arrFilters = [];
    arrFilters[0] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', 'customrecordr7nexposelicensing');
    arrFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', objNewLic.parentProductKey);
    arrFilters[2] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', 'today');
    arrFilters[3] = new nlobjSearchFilter('custrecordr7licfeature_adjustment', null, 'is', 'F');
    arrFilters[4] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'anyof', ['1','3']);
    arrFilters[5] = new nlobjSearchFilter('custrecordr7licfmfeature', null, 'noneof', '4');
    arrFilters[6] = new nlobjSearchFilter('custrecordr7licfmsalesorder', null, 'is', newSOId);

    var arrResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrFilters);

    for (var i = 0; arrResults != null && i < arrResults.length; i++) {
        try {

            var newRecord = nlapiCopyRecord('customrecordr7licensefeaturemanagement', arrResults[i].getId());
            newRecord.setFieldValue('custrecordr7licfmproductkey', objNewLic.productkey);
            newRecord.setFieldValue('custrecordr7licfmlicense', objNewLic.id);
            newRecord.setFieldValue('custrecordr7licfmnexposelicense', objNewLic.id);
            newRecord.setFieldValue('custrecordr7licfmstartdate', startDate);//start date
            newRecord.setFieldValue('custrecordr7licfmenddate', endDate);//end date
            newRecord.setFieldValue('custrecordr7licfmsalesorder', newSOId);//so

            var id = nlapiSubmitRecord(newRecord);

            nlapiLogExecution('DEBUG', 'Copying FMR', 'New FMR ID: ' + id);
        }
        catch (e) {
            logError('Error copyCurrentAndFutureFMRs - license: ' + objNewLic.parentId, e);
        }
    }
}

function createRenewedChildAssetLFM(objNewLic, startDate, endDate, newSOId, childConsoleAssets){
    var lfmRec = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
    lfmRec.setFieldValue('custrecordr7licfmfeature', '4');//featue = NX: Number of IPs
    lfmRec.setFieldValue('custrecordr7licfmvalue', childConsoleAssets);
    lfmRec.setFieldValue('custrecordr7licfmsalesorder', newSOId);
    lfmRec.setFieldValue('custrecordr7licfmstartdate', startDate);//start date
    lfmRec.setFieldValue('custrecordr7licfmenddate', endDate);//end date
    lfmRec.setFieldValue('custrecordr7licfmaclcreated', 'T');
    lfmRec.setFieldValue('custrecordr7licfmstatus', '1');//scheduled
    lfmRec.setFieldValue('custrecordr7licfmproductkey', objNewLic.productkey);
    lfmRec.setFieldValue('custrecordr7licfmnexposelicense', objNewLic.id)
    var id = nlapiSubmitRecord(lfmRec);
    nlapiLogExecution('DEBUG', 'Create Child Console Assets FMR', 'New FMR ID: ' + id);
}

//process1PriceUpgrades - called within processACLSalesOrder used to update licenses during mid-contract upgrades
//                      - also used to handle LFM updates for Early Renewal orders
function process1PriceUpgrades(recOrder) {
    nlapiLogExecution("DEBUG", "process1PriceUpgrades started");
    var isMidContractUpgrade = false;
    var isEarlyRenewal = false;
    var recLineCount = recOrder.getLineItemCount("item");

    //check for incumbent product lines.
    var incumbentLineNum = recOrder.findLineItemValue("item", "custcolr7_incumbent_purchase_type", "Upgrade");
    if(incumbentLineNum !== -1){
        nlapiLogExecution("DEBUG", "Found Incumbent Line");
        //check this line amount
        var incumbentAmt = recOrder.getLineItemValue("item", "amount", incumbentLineNum);
        nlapiLogExecution("DEBUG", "Incumbent Line Amount", incumbentAmt);
        if(incumbentAmt < 0){
            isMidContractUpgrade = true;
        }
    }
    nlapiLogExecution("DEBUG", "Is Mid-Contract Upgrade", isMidContractUpgrade);

    var earlyRenewalLineNum = recOrder.findLineItemValue("item", "custcol_r7_early_renewal", "T");
    if(earlyRenewalLineNum !== -1){
        isEarlyRenewal = true;
    }
    nlapiLogExecution("DEBUG", "Is Early Renewal", isEarlyRenewal);
    //if it is a mid-contract upgrade,
    if(isMidContractUpgrade || isEarlyRenewal){
        //find lines that have selling motion = upgrade
        for (var i = 1; i <= recLineCount; i++) {
            var lineSellingMotion = recOrder.getLineItemValue("item", "custcolr7_oneprice_selling_motion", i);
            var lineEarlyRenewal = recOrder.getLineItemValue("item", "custcol_r7_early_renewal", i);
                    
            var upgrade = "1";
            if(lineSellingMotion == upgrade){
                processMidContractUpgrade(recOrder, i);
            }
            else if(lineEarlyRenewal == "T"){
                processEarlyRenewal(recOrder, i);
            }
        }
    }
}

function getLfmSearchColumns(){
    var searchColumns = new Array();
    searchColumns.push(new nlobjSearchColumn("id"));
    searchColumns.push(new nlobjSearchColumn("scriptid"));
    searchColumns.push(new nlobjSearchColumn("custrecordr7licfmstartdate"));
    searchColumns.push(new nlobjSearchColumn("custrecordr7licfmenddate"));
    searchColumns.push(new nlobjSearchColumn("custrecordr7licfmfeature"));
    searchColumns.push(new nlobjSearchColumn("custrecordr7licfmvalue"));
    searchColumns.push(new nlobjSearchColumn("custrecordr7licfmsalesorder"));
    searchColumns.push(new nlobjSearchColumn("custrecordr7licfmgrace"));
    searchColumns.push(new nlobjSearchColumn("custrecordr7licfmstatus"));
    searchColumns.push(new nlobjSearchColumn("custrecordr7licfmproductkey"));
    searchColumns.push(new nlobjSearchColumn("custrecordr7licfmlicenselink"));

    return searchColumns;
}

function processMidContractUpgrade(recOrder, i) {
    //Manually expire LFMs from incumbent subscription
    //get license info
    var licenseIdText = recOrder.getLineItemValue("item", "custcolr7translicenseid", i);
    var licenseType = licenseIdText.substring(0, 3);
    var licenseIntId = licenseIdText.substring(3);
    nlapiLogExecution("DEBUG", "Upgrade in progress. Updating License", "License Type " + licenseType + ", License IntID " + licenseIntId);

    //build search to find LFMs created by this SO on each license.
    var searchFilters = new Array();
    searchFilters.push(new nlobjSearchFilter("custrecordr7licfmsalesorder", null, "anyof", recOrder.getId()));
    switch (licenseType) {
        case "NXL":
            searchFilters.push(new nlobjSearchFilter("custrecordr7licfmnexposelicense", null, "anyof", licenseIntId));
            break;
        case "INP":
            searchFilters.push(new nlobjSearchFilter("custrecordr7licfmuserinsightplatlicrec", null, "anyof", licenseIntId));
            break;
        case "MSL":
            searchFilters.push(new nlobjSearchFilter("custrecordr7licfmmetasploitlicenserec", null, "anyof", licenseIntId));
            break;
    }
    var searchColumns = getLfmSearchColumns();

    var thisSoLFMSearchResults = nlapiSearchRecord("customrecordr7licensefeaturemanagement", null, searchFilters, searchColumns);

    var lfmObj = new Object();
    lfmObj.features = new Array();
    for (var j = 0; thisSoLFMSearchResults !== null && j < thisSoLFMSearchResults.length; j++) {
        var thisResult = thisSoLFMSearchResults[j];
        if (!lfmObj.productKey) {
            lfmObj.productKey = thisResult.getValue("custrecordr7licfmproductkey");
        }
        lfmObj.features.push(thisResult.getValue("custrecordr7licfmfeature"));
    }
    nlapiLogExecution("DEBUG", "Features Created from SO " + recOrder.getId(), JSON.stringify(lfmObj));

    /**
     * Now find LFMs with Same feature from previous subscription.
     * Criteria : PK = lfmObj.productKey
     *            Feature anyof lfmObj.features 
     *            LFM SO != this SO
     *            Status = Active
     */
    if (lfmObj.productKey && lfmObj.features.length > 0) {
        var incumbentSearchFilters = new Array();
        incumbentSearchFilters.push(new nlobjSearchFilter("custrecordr7licfmproductkey", null, "is", lfmObj.productKey));
        incumbentSearchFilters.push(new nlobjSearchFilter("custrecordr7licfmfeature", null, "anyof", lfmObj.features));
        incumbentSearchFilters.push(new nlobjSearchFilter("custrecordr7licfmsalesorder", null, "noneof", recOrder.getId()));
        incumbentSearchFilters.push(new nlobjSearchFilter("custrecordr7licfmstatus", null, "anyof", "3"));
        var incumbentSearchColumns = getLfmSearchColumns();

        var incumbentSearchResults = nlapiSearchRecord("customrecordr7licensefeaturemanagement", null, incumbentSearchFilters, incumbentSearchColumns);

        //get upgrade start date from current line being processed in main forloop.
        var upgradeStartDate = recOrder.getLineItemValue("item", "custcolr7startdate", i);
        var newEndDate = nlapiDateToString(nlapiAddDays(nlapiStringToDate(upgradeStartDate), -1)); //nlapiDateToString(new Date());
        nlapiLogExecution("DEBUG", "New End Date for incumbent LFMs", newEndDate);
        //Set end date of incumbent LFMs to be upgrade start date -1 day.
        for (var k = 0; incumbentSearchResults !== null && k < incumbentSearchResults.length; k++) {
            var thisResult = incumbentSearchResults[k];
            var incumbentLFMRec = nlapiLoadRecord("customrecordr7licensefeaturemanagement", thisResult.getId());
            incumbentLFMRec.setFieldValue("custrecordr7licfmenddate", newEndDate);
            nlapiSubmitRecord(incumbentLFMRec);
        }
    }
}

function processEarlyRenewal(recOrder, i) {
    var newRecOrder = nlapiLoadRecord('salesorder', recOrder.getId());
    var prodKeyArr = [];
    //Early Renewals expire all LFMs from previous subscription.
    var thisLineProdKey = newRecOrder.getLineItemValue("item", "custcolr7itemmsproductkey", i);
    prodKeyArr.push(thisLineProdKey);
    var thisLineItem = newRecOrder.getLineItemValue("item", "item", i);
   
    if(thisLineItem == '7416' || thisLineItem == '7555') { //if item is NXP or IVM-SUB check for child consoles
        var licenseLink = newRecOrder.getLineItemValue('item', 'custcolr7translicenselink', i);

        if(licenseLink) {
            var licId = licenseLink.split('id=')[1];
            findChildConsoles(licId, prodKeyArr);
        }
    }
    nlapiLogExecution("AUDIT", "After Find Child Console A/E", prodKeyArr);
    //Only run this logic if there is a productKey (e.g. prorates have no product key)
    if(!thisLineProdKey) return; 
    
    var featuresToRetain = ["112"]; //112-NX: InsightVM License
    /**
     * Find LFMs from previous subscription.
     * Criteria : PK = this line PK
     *            Feature noneOf retainedFeatures
     *            LFM SO != this SO
     *            Status = Active
     */
    //get early renewal start date from current line being processed in main forloop.
    var earlyRenewalStartDate = newRecOrder.getLineItemValue("item", "custcolr7startdate", i);
    var newEndDate = nlapiDateToString(nlapiAddDays(nlapiStringToDate(earlyRenewalStartDate), -1)); //nlapiDateToString(new Date());
    for(var i=0; prodKeyArr != null && i < prodKeyArr.length; i++){
        processEarlyRenewalLFMs(prodKeyArr[i], featuresToRetain, recOrder, newEndDate);
    }
}

function findChildConsoles(licenseId, prodKeyArr){
    nlapiLogExecution("AUDIT", "Finding Child Consoles for", licenseId);
    var filters = [];
    filters[0] = new nlobjSearchFilter('custrecordr7nxlicense_parentlicense', null, 'is', licenseId);
    filters[1] = new nlobjSearchFilter('custrecordr7nxrenewwithparent', null, 'is', 'T');
    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid');
    columns[1] = new nlobjSearchColumn('custrecordr7nxproductkey');
    var results = nlapiSearchRecord('customrecordr7nexposelicensing', null, filters, columns);

    for (var i = 0; results != null && i < results.length; i++) {
        nlapiLogExecution("AUDIT", "Found Child Consoles", results[i].getValue(columns[1]));
        prodKeyArr.push(results[i].getValue(columns[1]));
    }
    nlapiLogExecution("AUDIT", "End of find child consoles", prodKeyArr);
}

function processEarlyRenewalLFMs(thisLineProdKey, featuresToRetain, recOrder, newEndDate){
    var incumbentSearchFilters = new Array();
    incumbentSearchFilters.push(new nlobjSearchFilter("custrecordr7licfmproductkey", null, "is", thisLineProdKey));
    incumbentSearchFilters.push(new nlobjSearchFilter("custrecordr7licfmfeature", null, "noneof", featuresToRetain));
    incumbentSearchFilters.push(new nlobjSearchFilter("custrecordr7licfmsalesorder", null, "noneof", recOrder.getId()));
    incumbentSearchFilters.push(new nlobjSearchFilter("custrecordr7licfmstatus", null, "anyof", "3"));
    var incumbentSearchColumns = getLfmSearchColumns();

    var incumbentSearchResults = nlapiSearchRecord("customrecordr7licensefeaturemanagement", null, incumbentSearchFilters, incumbentSearchColumns);

    
    nlapiLogExecution("DEBUG", "New End Date for incumbent LFMs", newEndDate);
    //Set end date of incumbent LFMs to be upgrade start date -1 day.
    for (var k = 0; incumbentSearchResults !== null && k < incumbentSearchResults.length; k++) {
        var thisResult = incumbentSearchResults[k];
        var incumbentLFMRec = nlapiLoadRecord("customrecordr7licensefeaturemanagement", thisResult.getId());
        incumbentLFMRec.setFieldValue("custrecordr7licfmenddate", newEndDate);
        nlapiSubmitRecord(incumbentLFMRec);
    }
}

function processNexposeMigratedLFMs(nxpEndDate, licenseId, licenseProductKey) {
    //update all LFMS that have a date greater or on  today to expire on new date
    var arrFilters = [];
    arrFilters[0] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', 'customrecordr7nexposelicensing');
    arrFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', licenseProductKey);
    arrFilters[2] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', 'today');
    arrFilters[3] = new nlobjSearchFilter('custrecordr7licfeature_adjustment', null, 'is', 'F');

    var arrResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrFilters);

    for (var i = 0; arrResults != null && i < arrResults.length; i++) {
        try {
            var id = nlapiSubmitField('customrecordr7licensefeaturemanagement',  arrResults[i].getId(), 'custrecordr7licfmenddate', nxpEndDate);
            nlapiLogExecution('DEBUG', 'Updated end date on FMR', 'New FMR ID: ' + id);
        }
        catch (e) {
            logError('Error updating Nexpose LFMs - license: ' + licenseId, e);
        }
    }
}

function updateLicenseEndDate(licenseProductKey, endDate) {

    nlapiLogExecution('DEBUG', 'licenseProductKey: ', licenseProductKey);
    nlapiLogExecution('DEBUG', 'endDate: ', endDate);
    var searchFilter = new Array(new nlobjSearchFilter('custrecordr7nxproductkey', null, 'is', licenseProductKey));
    var results = nlapiSearchRecord('customrecordr7nexposelicensing', null, searchFilter);
    if (results && results.length > 0) {
        var licenseId = results[0].getId();
        if(licenseId) {
            var id = nlapiSubmitField('customrecordr7nexposelicensing',  licenseId, 'custrecordr7nxlicenseexpirationdate', endDate);
            nlapiLogExecution('DEBUG', 'Updated end date on NXP lICENSE', 'NXP ID: ' + id);
            processNexposeMigratedLFMs(endDate, licenseId, licenseProductKey);
        }
    }
}

function process1PriceRenewalNotification(recOrder) {
    //get order,
    //get lines with renewal notification = true
    //run lines that have renewal notification = true && ACL = true through license searches
    //build payload as per current structure
    //create licensing event
    //set licensing event in renewal event field.

    //schedule Map/Reduce to generate early renewal notification
    try{
        nlapiLogExecution('AUDIT', 'Scheduling Renewal Notification Script');
        var restletResponse = callInternalRestlet({
            restletFunction: 'scheduleMapReduce',
            method: 'POST',
            fields: {
                scriptId: 'customscript_r7_mr_renewal_notification',
                deployId: 'customdeploy_r7_mr_renewal_notification',
                params: {
                    custscript_order_to_process: recOrder.getId()
                }
            }
        });
        nlapiLogExecution('AUDIT', 'callInternalRestlet response', JSON.stringify(restletResponse));
    } catch(e){
        nlapiLogExecution('ERROR', e.name, e);
    }
}

function logError(name, error) {
    nlapiLogExecution('ERROR', name, error);
    nlapiSendEmail(55011, 55011, name, 'Error: ' + error);
}