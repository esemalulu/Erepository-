// noinspection JSCheckFunctionSignatures,DuplicatedCode

/**
 * r7.transaction.library.functions.js
 * @NApiVersion 2.1
 */
define(['N/error', 'N/log', 'N/record', 'N/runtime', 'N/search', 'N/format'],
    (error, log, record, runtime, search, format) => {
            let objItemDetailMap = null;
            let objCategoryPurchasedDetailMap = null;

            const setTotalDiscount = (newRecord) => {
                    let recordId = newRecord.id;
                    let dateCreated = new Date();
                    let formatteddateCreated = dateCreated;
                    if (recordId !== '' && recordId != null) {
                            let fieldLookUp = search.lookupFields({
                                    type: search.Type.TRANSACTION,
                                    id: recordId,
                                    columns: ['datecreated']
                            });
                            dateCreated = fieldLookUp['datecreated'];
                            // noinspection JSCheckFunctionSignatures
                            formatteddateCreated = format.parse({
                                    value: dateCreated,
                                    type: format.Type.DATE
                            });
                    }
                    let dateLegacy = '7/1/2011'; //was told to not find total discount for anything before this date
                    // noinspection JSCheckFunctionSignatures
                    let formatteddateLegacy = format.parse({
                            value: dateLegacy,
                            type: format.Type.DATE
                    });

                    if (formatteddateCreated > formatteddateLegacy) {
                            let lineDiscountTotal = 0;
                            let transactionTotal = 0;
                            let numberOfItems = newRecord.getLineCount({sublistId: 'item'});

                            if (numberOfItems != null) {
                                    for (let i = 0; i < numberOfItems; i++) {

                                            let itemType = newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});
                                            let createdFromRA = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra', line: i});
                                            let lineAmount = formatNumber(newRecord.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i}));
                                            log.debug(itemType + ': lineAmount', i + ': ' + lineAmount);
                                            if (lineAmount != null && !isNaN(lineAmount) && itemType !== 'Subtotal' && itemType !== 'group' && itemType !== 'Group' && itemType !== 'EndGroup') {

                                                    if (lineAmount < 0 && (createdFromRA == null || createdFromRA === '')) {
                                                            lineDiscountTotal = lineDiscountTotal + lineAmount;
                                                    }
                                                    else {
                                                            transactionTotal = transactionTotal + lineAmount;
                                                    }
                                            }
                                    }
                            }

                            let headerDiscount = formatNumber(newRecord.getValue({fieldId: 'discounttotal'}));
                            log.debug('headerDiscount', headerDiscount);
                            let discountTotal = lineDiscountTotal + headerDiscount;
                            log.debug('discountTotal', discountTotal);
                            let discountRate = (discountTotal / transactionTotal) * -100;
                            if (transactionTotal === 0) {
                                    if (discountTotal > 0) {
                                            discountRate = 100;
                                    }
                                    else {
                                            discountRate = 0;
                                    }
                            }

                            discountRate = Math.round(discountRate * 10) / 10;

                            log.debug('discount rate', discountRate);

                            newRecord.setValue({fieldId: 'custbodyr7transactiondiscounttotal', value: discountRate});
                    }
                    else {
                            newRecord.setValue({fieldId: 'custbodyr7transactiondiscounttotal', value: 0});
                    }
            }

            const zc_stampCategoryPurchased = (oldRecord, newRecord) => {
                    try {
                            let UPDATE_DATES_ALWAYS = true; //TODO uncheck this
                            let processbeginTime = new Date();
                            let objItemDetails = grabItemDetailMap(newRecord);
                            let objCategoryPurchasedMap = grabCategoryPurchasedDetailMap();

                            //FIRST SET ANY CATEGORIES THAT NEED TO BE SET
                            let lineCount = newRecord.getLineCount({sublistId: 'item'});
                            for (let i = 0; i < lineCount; i++) {

                                    let itemId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
                                    let itemType = newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});

                                    if (!isBlank(itemId) && !isBlank(itemType)) {

                                            if (['Subtotal', 'Discount', 'Description', 'EndGroup'].indexOf(itemType) === -1) {

                                                    let categoryPurchased = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased', line: i});
                                                    let categoryExpiration = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased_expire', line: i});
                                                    let categoryLock = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased_lock', line: i});

                                                    let lockUpdated =  oldRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased_lock', line: i}) !== newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased_lock', line: i});
                                                    let categoryUpdated = oldRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased', line: i}) !== newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased', line: i});

                                                    if (!categoryPurchased && categoryLock === true) {
                                                            //cannot lock if no category
                                                            //newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased_lock', line: i, value: false});
                                                            //categoryLock = false;
                                                            //lockUpdated = true;
                                                    }

                                                    if (!categoryPurchased && objItemDetails.hasOwnProperty(itemId) && objItemDetails[itemId].custitemr7categorypurchaseditem) {
                                                            //set category if null
                                                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased', line: i, value: objItemDetails[itemId].custitemr7categorypurchaseditem});
                                                            categoryPurchased = objItemDetails[itemId].custitemr7categorypurchaseditem;
                                                            categoryUpdated = true;
                                                    }

                                                    if (categoryLock === true) {
                                                            //leave it alone
                                                            continue;
                                                    }

                                                    if (categoryPurchased && objCategoryPurchasedMap.hasOwnProperty(categoryPurchased)) {

                                                            let daysTillExpire = parseInt(objCategoryPurchasedMap[categoryPurchased].custrecordr7catpurch_daystillexpire || 0);

                                                            switch (objCategoryPurchasedMap[categoryPurchased].custrecordr7catpurch_expirationfield) {
                                                                    case '1':
                                                                            //Date Internal Reporting
                                                                            let oldDateInternalReporting = oldRecord.getValue({fieldId: 'custbodyr7dateinternalreporting'}) || oldRecord.getValue({fieldId: 'trandate'});
                                                                            let dateInternalReporting = newRecord.getValue({fieldId: 'custbodyr7dateinternalreporting'}) || newRecord.getValue({fieldId: 'trandate'});
                                                                            if (dateInternalReporting && (!categoryExpiration || categoryUpdated || lockUpdated || UPDATE_DATES_ALWAYS || oldDateInternalReporting !== dateInternalReporting)) {

                                                                                    // noinspection JSCheckFunctionSignatures
                                                                                    let formattedInternalReporting = format.parse({
                                                                                            value: dateInternalReporting,
                                                                                            type: format.Type.DATE
                                                                                    });
                                                                                    let purchaseExpireDate = formattedInternalReporting.setDate(formattedInternalReporting.getDate() + daysTillExpire);
                                                                                    newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased_expire', line: i, value: new Date(purchaseExpireDate)});
                                                                            }
                                                                            break;
                                                                    case '2':
                                                                            //License End Date
                                                                            let oldLicenseEndDate = oldRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7enddate', line: i}) || oldRecord.getSublistValue({sublistId: 'item', fieldId: 'revrecenddate', line: i}) || oldRecord.getValue({fieldId: 'trandate'});
                                                                            let licenseEndDate = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7enddate', line: i}) || newRecord.getSublistValue({sublistId: 'item', fieldId: 'revrecenddate', line: i}) || newRecord.getValue({fieldId: 'trandate'});
                                                                            if (licenseEndDate && (!categoryExpiration || categoryUpdated || lockUpdated || UPDATE_DATES_ALWAYS || oldLicenseEndDate !== licenseEndDate)) {
                                                                                    // noinspection JSCheckFunctionSignatures
                                                                                    let formattedlicenseEndDate = format.parse({
                                                                                            value: licenseEndDate,
                                                                                            type: format.Type.DATE
                                                                                    });
                                                                                    let purchaseExpireDate = formattedlicenseEndDate.setDate(formattedlicenseEndDate.getDate() + daysTillExpire);
                                                                                    newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased_expire', line: i, value: new Date(purchaseExpireDate)});
                                                                            }
                                                                            break;
                                                            }

                                                    }
                                            }
                                    }

                            }

                            //NOW GRAB CATEGORY PURCHASED ROLLUP
                            let arrCategoryPurchased = [];

                            let lineCountNew = newRecord.getLineCount({sublistId: 'item'});
                            for (let i = 0; i < lineCountNew; i++) {
                                    let categoryPurchased = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased', line: i});
                                    if (categoryPurchased) {
                                            arrCategoryPurchased.push(categoryPurchased);
                                    }
                            }

                            arrCategoryPurchased = unique(arrCategoryPurchased);

                            newRecord.setValue({fieldId: 'custbodyr7categorypurchased', value: arrCategoryPurchased});
                            newRecord.setValue({fieldId: 'custbodyr7tempcatpurchv2procflag', value: true}); //TODO  - REMOVE THIS!
                            newRecord.setValue({fieldId: 'custbodyr7categorypurch_lastchecked', value: getPSTDate()});
                            log.audit('Time (in seconds) to process zc_stampCategoryPurchased', (new Date().getTime() - processbeginTime.getTime())/1000);
                    }
                    catch (err) {
                            log.error('Problem zc_stampCategoryPurchased', err);
                    }

                    return newRecord;
            }

            const zc_runCategoryPurchasedCopyRoutine  = (context) => {
                    try {
                            const {UserEventType, type, newRecord} = context;
                            const {COPY} = UserEventType;
                            if (type === COPY) {
                                    let lineCount = newRecord.getLineCount({sublistId: 'item'});
                                    for (let i = 0; i < lineCount; i++) {
                                            let itemId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
                                            let itemType = newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});

                                            if (!isBlank(itemId) && !isBlank(itemType)) {

                                                    if (['Subtotal', 'Discount', 'Description', 'EndGroup'].indexOf(itemType) === -1) {
                                                            //unlock and null
                                                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased_expire', line: i, value: ''});
                                                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased_lock', line: i, value: false});
                                                    }
                                            }
                                    }
                            }
                    }
                    catch (e) {
                            log.error('Error on zc_runCategoryPurchasedCopyRoutine', e);
                    }
            }

            const checkApplianceYears = (tranRec) => {
                    /*
                    R7-1000CP
                    R7-1000CP4H
                    R7-3000CP
                    R7-3000CP4H
                    R7-5000CP
                    R7-5000CP4H
                    R7-5000X-4H
                    R7-5000X-CP
                    */
                    let listOfApplianceItems = [5989, 5990, 5993, 5994, 5997, 5998, 6000, 6002];
                    let ignoreValidation = tranRec.getValue({fieldId: 'custbodyr7_ignore_quantity_valid'});
                    log.debug('ignoreValidation',ignoreValidation);
                    if(ignoreValidation !== true){
                            let lineItemCount = tranRec.getLineCount({sublistId: 'item'});
                            for (let i = 0; i < lineItemCount; i++) {
                                    let lineItem = Number(tranRec.getSublistValue({sublistId: 'item', fieldId: 'item', line: i}));
                                    log.debug('listOfApplianceItems.indexOf(lineItem)',listOfApplianceItems.indexOf(lineItem));
                                    if(listOfApplianceItems.indexOf(lineItem) !== -1){
                                            let lineQuantity = Number(tranRec.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: i}));
                                            log.debug('[1,4].indexOf(lineQuantity)',[3,5].indexOf(lineQuantity));
                                            if([3,5].indexOf(lineQuantity) === -1){
                                                    throw error.create({
                                                            name: 'APPLIANCE_PRODUCTS_INCORRECT_YEARS',
                                                            message: 'Warranty products for R7 appliances will only be available for 3 or 5 years.'
                                                    });
                                            }
                                    }
                            }
                    }
            }

            const zc_categorypurchased_credits = (creditRefundTranId) => {
                    try{
                            let processbeginTime = new Date();
                            let arrResults = search.create({
                                    type: "transaction",
                                    filters:
                                        [
                                                ["type", "anyof", ["CustCred", "CashRfnd"]],
                                                "AND",
                                                ["internalid", "anyof", [creditRefundTranId]],
                                                "AND",
                                                ["mainline", "is", "F"],
                                                "AND",
                                                ["appliedtolinktype", "anyof", ["SaleRet"]],
                                                "AND",
                                                ["item.type", "noneof", ["@NONE@", "Description", "Discount", "Subtotal"]],
                                                "AND",
                                                ["item.internalid","noneof","0"]
                                        ],
                                    columns:
                                        [
                                                search.createColumn({name: "internalid"}),
                                                search.createColumn({name: "trandate"}),
                                                search.createColumn({name: "type"}),
                                                search.createColumn({name: "item"}),
                                                search.createColumn({name: "line"}),
                                                search.createColumn({name: "custcolr7_category_purchased"}),
                                                search.createColumn({name: "appliedtolinktype"}),
                                                search.createColumn({name: "appliedtotransaction"}),
                                                search.createColumn({name: "line", join: "appliedtotransaction"}),
                                                search.createColumn({name: "type", join: "appliedtotransaction"}),
                                                search.createColumn({name: "custcolr7_category_purchased", join: "appliedtotransaction"}),
                                                search.createColumn({name: "custcolr7_category_purchased_expire", join: "appliedtotransaction"}),
                                                search.createColumn({name: "custcolr7_category_purchased_lock", join: "appliedtotransaction"})
                                        ]
                            });
                            //let searchResultCount = arrResults.runPaged().count;
                            //log.debug("arrResults result count",searchResultCount);
                            let objTransactionLinkMap = {};
                            arrResults.run().each(function(result){
                                    // .run().each has a limit of 4,000 results
                                    let objTransaction = {
                                            internalid: result.getValue({name: 'internalid'}),
                                            trandate: result.getValue({name: "trandate"}),
                                            type: getRecTypeId(result.getValue({name: "type"})),
                                            appliedtolinktype: result.getValue({name: "appliedtolinktype"}),
                                            appliedtotransaction: result.getValue({name: "appliedtotransaction"}),
                                            appliedtotransaction_type: getRecTypeId(result.getValue({name: "type", join: "appliedtotransaction"})),
                                            lines: {}
                                    };

                                    if (objTransactionLinkMap.hasOwnProperty(objTransaction.internalid)) {
                                            objTransaction = objTransactionLinkMap[objTransaction.internalid];
                                    }

                                    objTransaction.lines[result.getValue({name: "line"})] = {
                                            line: result.getValue({name: "line"}),
                                            custcolr7_category_purchased: result.getValue({name: "custcolr7_category_purchased"}),
                                            appliedtotransaction_line: result.getValue({name: "line", join: "appliedtotransaction"}),
                                            appliedtotransaction_custcolr7_category_purchased: result.getValue({name: "custcolr7_category_purchased", join: "appliedtotransaction"}),
                                            appliedtotransaction_custcolr7_category_purchased_expire: result.getValue({name: "custcolr7_category_purchased_expire", join: "appliedtotransaction"}),
                                            appliedtotransaction_custcolr7_category_purchased_lock: result.getValue({name: "custcolr7_category_purchased_lock", join: "appliedtotransaction"})
                                    };

                                    objTransactionLinkMap[objTransaction.internalid] = objTransaction;

                                    return true;
                            });

                            if (!objTransactionLinkMap.hasOwnProperty(creditRefundTranId)) {
                                    //no results
                                    return;
                            }

                            let objTranCredit = objTransactionLinkMap[creditRefundTranId];

                            if (objTranCredit.appliedtotransaction) {

                                    let recAppliedTo = null;
                                    let somethingUpdated = false;
                                    for (let id in objTranCredit.lines) {

                                            let objLine = objTranCredit.lines[id];
                                            if (objLine.appliedtotransaction_custcolr7_category_purchased_lock === true && objLine.appliedtotransaction_custcolr7_category_purchased_expire === objTranCredit.trandate) {
                                                    //nothing needed to do... already correct
                                                    continue;
                                            }

                                            if (!recAppliedTo) {
                                                    //only want to load this if i need to
                                                    recAppliedTo = record.load({type: objTranCredit.appliedtotransaction_type, id: objTranCredit.appliedtotransaction});
                                            }

                                            let lineCount = recAppliedTo.getLineCount({sublistId: 'item'});
                                            for (let i = 0; i < lineCount; i++) {

                                                    let lineId = recAppliedTo.getSublistValue({sublistId: 'item', fieldId: 'line', line: i});
                                                    let currentCategoryPurchased = recAppliedTo.getSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased', line: i});
                                                    //let currentCategoryExpiration = recAppliedTo.getSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased_expire', line: i});
                                                    if (lineId === objLine.appliedtotransaction_line) {
                                                            //make note that i need to submit record
                                                            somethingUpdated = true;
                                                            if (!currentCategoryPurchased){
                                                                    //just in case category purchased isnt already set
                                                                    recAppliedTo.setSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased', line: i, value: objLine.custcolr7_category_purchased});
                                                            }
                                                            let formattedtrandate = format.parse({
                                                                    value: objTranCredit.trandate,
                                                                    type: format.Type.DATE
                                                            });
                                                            recAppliedTo.setSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased_expire', line: i, value: formattedtrandate});
                                                            recAppliedTo.setSublistValue({sublistId: 'item', fieldId: 'custcolr7_category_purchased_lock', line: i, value: true});

                                                            break;
                                                    }
                                            }
                                    }

                                    if (somethingUpdated) {
                                            //something was updated... submit
                                            recAppliedTo.save();
                                    }
                            }

                            log.audit('Time (in seconds) To Process zc_categorypurchased_credits', (new Date().getTime() - processbeginTime.getTime()) / 1000);

                    }catch(err) {
                            log.error('Problem zc_categorypurchased_credits', err);
                    }
            }

            const stampACV = (newRecord) => {
                    try {
                            let calculateACV = newRecord.getValue({fieldId: 'custbodyr7_calculate_acv'});
                            log.debug('stampACV', calculateACV);
                            if (calculateACV !== true){
                                    return;
                            }

                            let processbeginTime = new Date();
                            let objItemDetails = grabItemDetailMap(newRecord);

                            log.debug('running acv', 'starting process');
                            //now go through and process
                            let objACVGroups = {};
                            // noinspection JSAnnotator
                            let lineCount = newRecord.getLineCount({sublistId: 'item'});
                            for (let i = 0; i < lineCount; i++) {

                                    let itemId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
                                    let itemType = newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});

                                    if (itemId != null && itemId !== '') {
                                            if (itemType !== 'Subtotal' && itemType !== 'Discount' && itemType !== 'Description' && itemType !== 'group' && itemType !== 'Group' && itemType !== 'EndGroup') {

                                                    if (objItemDetails[itemId].allocate_acv !== true) {
                                                            //item shouldnt have acv
                                                            continue;
                                                    }

                                                    let createdFromRA = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra', line: i});
                                                    let productKey = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7itemmsproductkey', line: i});
                                                    let managedServiceId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7managedserviceid', line: i});
                                                    let registrationId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7registrationid', line: i});
                                                    let bookingCategory = objItemDetails[itemId].bookingcategory;

                                                    let groupText = productKey || managedServiceId || registrationId || bookingCategory;
                                                    groupText += ':' + createdFromRA;

                                                    let objGroup = new ACVGroup();
                                                    if (objACVGroups.hasOwnProperty(groupText)) {
                                                            objGroup = objACVGroups[groupText];
                                                    }

                                                    let startDate = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7startdate', line: i}) || newRecord.getSublistValue({sublistId: 'item', fieldId: 'revrecstartdate', line: i});
                                                    let endDate = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7enddate', line: i}) || newRecord.getSublistValue({sublistId: 'item', fieldId: 'revrecenddate', line: i});
                                                    let vsoeAllocation = newRecord.getSublistValue({sublistId: 'item', fieldId: 'vsoeallocation', line: i});
                                                    //Get new 605 value and use it if it has a value other than 0
                                                    let rev605Allocation = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_r7_605_rev_amount', line: i});

                                                    // noinspection JSCheckFunctionSignatures
                                                    let formattedStartDate;
                                                    if(startDate){
                                                            formattedStartDate = format.parse({
                                                                    value: startDate,
                                                                    type: format.Type.DATE
                                                            });
                                                    }
                                                    // noinspection JSCheckFunctionSignatures
                                                    let formattedEndDate;
                                                    if(endDate){
                                                            formattedEndDate = format.parse({
                                                                    value: endDate,
                                                                    type: format.Type.DATE
                                                            });
                                                    }
                                                    // noinspection JSCheckFunctionSignatures
                                                    let formattedMinStartDate;
                                                    if(objGroup.minstart){
                                                            formattedMinStartDate = format.parse({
                                                                    value: objGroup.minstart,
                                                                    type: format.Type.DATE
                                                            });
                                                    }
                                                    // noinspection JSCheckFunctionSignatures
                                                    let formattedMaxEndDate;
                                                    if(objGroup.maxend){
                                                            formattedMaxEndDate = format.parse({
                                                                    value: objGroup.maxend,
                                                                    type: format.Type.DATE
                                                            });
                                                    }

                                                    if (objGroup.minstart == null || (startDate != null && startDate !== '' && formattedStartDate < formattedMinStartDate)) {
                                                            objGroup.minstart = startDate;
                                                    }
                                                    if (objGroup.maxend == null || (endDate != null && endDate !== '' && formattedEndDate > formattedMaxEndDate)) {
                                                            objGroup.maxend = endDate;
                                                    }

                                                    //Use 605 Amount if it is not 0
                                                    if (rev605Allocation != null && rev605Allocation !== '' && rev605Allocation !== 0) {
                                                            objGroup.totalvsoe += parseFloat(rev605Allocation);
                                                    }
                                                    else if (vsoeAllocation != null && vsoeAllocation !== '') {
                                                            objGroup.totalvsoe += parseFloat(vsoeAllocation);
                                                    }
                                                    log.debug('objGroup.maxend', objGroup.maxend);
                                                    objACVGroups[groupText] = objGroup;
                                            }
                                    }
                            }

                            let exchangeRate = parseFloat(newRecord.getValue({fieldId: 'exchangerate'}) || 1);
                            const tranType = newRecord.type;
                            const {CASH_REFUND, CREDIT_MEMO} = record.Type;
                            let multiplier = (tranType === CASH_REFUND || tranType === CREDIT_MEMO) ? -1 : 1;

                            //now actually run calculations
                            // noinspection JSAnnotator
                            let lineCountNew = newRecord.getLineCount({sublistId: 'item'});
                            for (let i = 0; i < lineCountNew; i++) {

                                    let itemId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
                                    let itemType = newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});

                                    if (itemId != null && itemId !== '') {
                                            if (itemType !== 'Subtotal' && itemType !== 'Discount' && itemType !== 'Description' && itemType !== 'group' && itemType !== 'Group' && itemType !== 'EndGroup') {

                                                    if (objItemDetails[itemId].allocate_acv !== true) {
                                                            //item shouldnt have acv
                                                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7acvstartdate', line: i, value: ''});
                                                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7acvenddate', line: i, value: ''});
                                                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7acvamount', line: i, value: ''});
                                                            continue;
                                                    }

                                                    let createdFromRA = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra', line: i});
                                                    let productKey = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7itemmsproductkey', line: i});
                                                    let managedServiceId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7managedserviceid', line: i});
                                                    let registrationId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcolr7registrationid', line: i});
                                                    let bookingCategory = objItemDetails[itemId].bookingcategory;

                                                    let groupText = productKey || managedServiceId || registrationId || bookingCategory;
                                                    groupText += ':' + createdFromRA;

                                                    let objGroup = new ACVGroup();
                                                    if (objACVGroups.hasOwnProperty(groupText)) {
                                                            objGroup = objACVGroups[groupText];
                                                    }
                                                    log.debug('objGroup.minstart', objGroup.minstart);
                                                    if (objGroup.minstart == null || objGroup.minstart === '' || objGroup.maxend == null || objGroup.maxend === '') {
                                                            continue;
                                                    }

                                                    let vsoeAllocation = newRecord.getSublistValue({sublistId: 'item', fieldId: 'vsoeallocation', line: i}) || 0;
                                                    if (vsoeAllocation === 0)
                                                            vsoeAllocation = newRecord.getSublistValue({sublistId: 'item', fieldId: 'custcol_r7_605_rev_amount', line: i}) || 0;

                                                    let percentOfTotal = (parseFloat(vsoeAllocation) / objGroup.totalvsoe) || 0;
                                                    // noinspection JSCheckFunctionSignatures
                                                    let formattedMinStartDate = format.parse({
                                                            value: objGroup.minstart,
                                                            type: format.Type.DATE
                                                    });
                                                    // noinspection JSCheckFunctionSignatures
                                                    let formattedMaxEndDate = format.parse({
                                                            value: objGroup.maxend,
                                                            type: format.Type.DATE
                                                    });
                                                    let acvDays = days_between(formattedMinStartDate, formattedMaxEndDate) + 1;

                                                    let groupACV = (Math.round(((objGroup.totalvsoe / acvDays) * 365) * 100) / 100) || 0;
                                                    let acvAmount = (Math.round((multiplier * groupACV * percentOfTotal * exchangeRate) * 100) / 100) || 0;

                                                    log.debug('groupACV', groupACV);
                                                    log.debug('stamping', objGroup.minstart);

                                                    newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7acvstartdate', line: i, value: objGroup.minstart});
                                                    newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7acvenddate', line: i, value: objGroup.maxend});
                                                    newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcolr7acvamount', line: i, value: acvAmount});
                                            }
                                    }
                            }

                            log.audit('Time (in seconds) To Process ACV Lines', (new Date().getTime() - processbeginTime.getTime())/1000);
                    }
                    catch (err) {
                            log.error('Error calculating ACV Lines', err);
                    }
            }

            function ACVGroup()  {
                    this.minstart = null;
                    this.maxend = null;
                    this.totalvsoe = 0;
                    this.acv = 0;
            }

            const grabItemDetailMap = (newRecord) => {
                    if (objItemDetailMap) {
                            return objItemDetailMap;
                    }

                    //first just get list of all items so i can search their details
                    let arrItemIds = [];
                    let lineCount = newRecord.getLineCount({sublistId: 'item'});
                    for (let i = 0; i < lineCount; i++) {

                            let itemId = newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
                            let itemType = newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});

                            if (itemId != null && itemId !== '') {
                                    if (['Subtotal', 'Discount', 'Description', 'EndGroup'].indexOf(itemType) === -1) {
                                            arrItemIds[arrItemIds.length] = itemId;
                                    }
                            }
                    }
                    arrItemIds = unique(arrItemIds);
                    objItemDetailMap = {};
                    if (arrItemIds && arrItemIds.length > 0) {
                            let arrResults = search.create({
                                    type: "item",
                                    filters:
                                        [
                                                ["internalid","anyof",arrItemIds],
                                        ],
                                    columns:
                                        [
                                                search.createColumn({name: "internalid"}),
                                                search.createColumn({name: "custitemr7acvallocation"}),
                                                search.createColumn({name: "custitemr7categorybookingssalesdept"}),
                                                search.createColumn({name: "custitemr7categorypurchaseditem"})
                                        ]
                            });
                            // noinspection JSCheckFunctionSignatures
                            //let searchResultCount = arrResults.runPaged().count;
                            //log.debug("arrResults count- grabItemDetailMap",searchResultCount);
                            arrResults.run().each(function(result){
                                    // .run().each has a limit of 4,000 results
                                    let objItem = {};
                                    objItem.id = result.getValue({name: "internalid"});
                                    objItem.allocate_acv = result.getValue({name: "custitemr7acvallocation"});
                                    objItem.bookingcategory = result.getText({name: "custitemr7categorybookingssalesdept"});
                                    objItem.custitemr7categorypurchaseditem = result.getValue({name: "custitemr7categorypurchaseditem"});

                                    objItemDetailMap[objItem.id] = objItem;
                                    return true;
                            });
                    }

                    return objItemDetailMap;
            }

            const grabCategoryPurchasedDetailMap = () => {
                    if (objCategoryPurchasedDetailMap) {
                            return objCategoryPurchasedDetailMap;
                    }

                    let arrResults = search.create({
                            type: "customrecordr7categorypurchased",
                            filters: [],
                            columns:
                                [
                                        search.createColumn({name: "internalid"}),
                                        search.createColumn({name: "custrecordr7catpurch_custstatusmap"}),
                                        search.createColumn({name: "custrecordr7catpurch_expirationfield"}),
                                        search.createColumn({name: "custrecordr7catpurch_daystillexpire"}),
                                        search.createColumn({name: "custrecordr7catpurch_daystoremaininactiv"})
                                ]
                    });
                    // noinspection JSCheckFunctionSignatures
                    //let searchResultCount = arrResults.runPaged().count;
                    //log.debug("arrResults count - grabCategoryPurchasedDetailMap",searchResultCount);

                    objCategoryPurchasedDetailMap = {};

                    arrResults.run().each(function(result){
                            // .run().each has a limit of 4,000 results
                            let objCategory = {};
                            objCategory.internalid = result.getValue({name: "internalid"});
                            objCategory.custrecordr7catpurch_custstatusmap = result.getValue({name: "custrecordr7catpurch_custstatusmap"});
                            objCategory.custrecordr7catpurch_expirationfield = result.getValue({name: "custrecordr7catpurch_expirationfield"});
                            objCategory.custrecordr7catpurch_daystillexpire = parseInt(result.getValue({name: "custrecordr7catpurch_daystillexpire"}) || 0);
                            objCategory.custrecordr7catpurch_daystoremaininactiv = parseInt(result.getValue({name: "custrecordr7catpurch_daystoremaininactiv"}) || 0);

                            objCategoryPurchasedDetailMap[objCategory.internalid] = objCategory;
                            return true;
                    });

                    return objCategoryPurchasedDetailMap;
            }

            /*const stampClass = (newRecord) => {
                    try {
                            let salesTerritoryId = newRecord.getValue({fieldId: 'custbodyr7salesterritoryhistoricalcust'});
                            if (salesTerritoryId != null && salesTerritoryId !== '') {
                                    let fieldLookUp = search.lookupFields({
                                            type : 'customrecordr7salesterritorygroups',
                                            id : salesTerritoryId,
                                            columns : ['custrecordr7territorygroupclass']
                                    });
                                    let newClass = Array.isArray(fieldLookUp['custrecordr7territorygroupclass'])? fieldLookUp['custrecordr7territorygroupclass'][0]['value'] : fieldLookUp['custrecordr7territorygroupclass'];
                                    newRecord.setValue({fieldId: 'class', value: newClass});
                            }
                    }
                    catch (e) {
                            log.debug('Could not stamp class', 'ID: ' + newRecord.id + '\n\nError: ' + e);
                            email.send({
                                    author: 55011,
                                    recipient : 55011,
                                    subject : 'Could not stamp class',
                                    body: 'ID: ' + newRecord.id + '\n\nError: ' + e
                            })
                    }
            }*/

            const setLocations = (newRecord) => {

                    let curSubsidiary = parseInt(newRecord.getValue({fieldId: 'subsidiary'}));
                    let headerLocation = newRecord.getValue({fieldId: 'location'});
                    if(!headerLocation){
                            switch (curSubsidiary) {
                                    case 10://Rapid7 International
                                            newRecord.setValue({fieldId: 'location', value: 29}); //UKS London
                                            break;
                                    case 13://Rapid7 Ireland Limited
                                            newRecord.setValue({fieldId: 'location', value: 66}); //GLS - Galway IRE
                                            break;
                                    case 22: //Rapid7 DivvyCloud
                                            newRecord.setValue({fieldId: 'location', value: 73}); //VA - Arlington (Divvy)
                                            break;
                                    case 24: //IntSights Cyber Intelligence Ltd (Israel)
                                            newRecord.setValue({fieldId: 'location', value: 81}); //IL-Tel Aviv (IntSights)
                                            break;
                                    default:
                                            newRecord.setValue({fieldId: 'location', value: 1}); //MA Boston
                            }
                    }

                    headerLocation = newRecord.getValue({fieldId: 'location'});
                    for (let i = 0; i < newRecord.getLineCount({sublistId: 'item'}); i++) {

                            let itemType = newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});

                            if (itemType === 'Group' || itemType === 'group' || itemType === 'EndGroup'){
                                    continue;
                            }
                            newRecord.setSublistValue({sublistId: 'item', fieldId: 'location', line: i, value: headerLocation});
                    }
            }

            const getRecTypeId = (recType) => {
                    switch (recType) {
                            case 'Opprtnty':
                                    recType = 'opportunity';
                                    break;
                            case 'Opportunity':
                                    recType = 'opportunity';
                                    break;
                            case 'CustInvc':
                                    recType = 'invoice';
                                    break;
                            case 'Invoice':
                                    recType = 'invoice';
                                    break;
                            case 'CashSale':
                                    recType = 'cashsale';
                                    break;
                            case 'Cash Sale':
                                    recType = 'cashsale';
                                    break;
                            case 'SalesOrd':
                                    recType = 'salesorder';
                                    break;
                            case 'Sales Order':
                                    recType = 'salesorder';
                                    break;
                            case 'CustCred':
                                    recType = 'creditmemo';
                                    break;
                            case 'Credit Memo':
                                    recType = 'creditmemo';
                                    break;
                            case 'CashRfnd':
                                    recType = 'cashrefund';
                                    break;
                            case 'Cash Refund':
                                    recType = 'cashrefund';
                                    break;
                    }

                    return recType;
            }

            const getRandomString = (string_length) => {
                    let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
                    let randomstring = '';
                    for (let i = 0; i < string_length; i++) {
                            let rnum = Math.floor(Math.random() * chars.length);
                            randomstring += chars.substring(rnum, rnum + 1);
                    }
                    return randomstring;
            }

            const formatNumber = (field) => {

                    if (field === '' || field == null) {
                            field = 0;
                    }
                    else {
                            field = parseFloat(field);
                    }

                    if (isNaN(field)) {
                            field = 0;
                    }

                    return field;
            }

            const days_between = (date1, date2) => {

                    if (date1 == null || date1 === '' || date2 == null || date2 === ''){
                            return '';
                    }
                    // The number of milliseconds in one day
                    let ONE_DAY = 1000 * 60 * 60 * 24;

                    // Convert both dates to milliseconds
                    let date1_ms = date1.getTime();
                    let date2_ms = date2.getTime();

                    // Calculate the difference in milliseconds
                    let difference_ms = (date1_ms - date2_ms) * -1;

                    // Convert back to days and return
                    return Math.round(difference_ms / ONE_DAY);

            }

            const getPSTDate = () => {
                    let now = new Date();
                    now.setHours(now.getHours() + 3);
                    return now;
            }

            const unique = (a) => {
                    a.sort();
                    for (let i = 1; i < a.length;) {
                            if (a[i - 1] === a[i]) {
                                    a.splice(i, 1);
                            }
                            else {
                                    i++;
                            }
                    }
                    return a;
            }

            const isBlank = (val) => {
                    return (val == null || val === '');
            }

            const assignCSM = (context) => {
                    let CSMstatus = '';
                    let defaultCSM = runtime.getCurrentScript().getParameter({name: 'custscript_r7_smb_csm'});
                    const {newRecord} = context
                    let total = newRecord.getValue({fieldId: 'total'});
                    log.debug('total', total);
                    let customer = newRecord.getValue({fieldId: 'entity'});
                    log.debug('customer', customer);
                    let fieldLookUpCustomer = search.lookupFields({
                            type: search.Type.CUSTOMER,
                            id: customer,
                            columns: ['entitystatus', 'custentityr7accountmanager', 'custentityr7directorlevelteam','custentityr7companydesignation','billstate','billcountry','custentityr7region']
                    });
                    let status = Array.isArray(fieldLookUpCustomer['entitystatus'])? fieldLookUpCustomer['entitystatus'][0]['value'] : fieldLookUpCustomer['entitystatus'];
                    log.debug('status', status);
                    let currentCSM = Array.isArray(fieldLookUpCustomer['custentityr7accountmanager'])? fieldLookUpCustomer['custentityr7accountmanager'][0]['value'] : fieldLookUpCustomer['custentityr7accountmanager'];
                    log.debug('currentCSM', currentCSM);
                    if(currentCSM){
                            let fieldLookUpEmp = search.lookupFields({
                                    type: search.Type.EMPLOYEE,
                                    id: currentCSM,
                                    columns: ['isinactive']
                            });
                            CSMstatus = fieldLookUpEmp['isinactive'];
                            log.debug('CSM and Status', currentCSM + '/' + CSMstatus);
                    }

                    if((status === 13 || status === 15 || status === 95 || status === 97) && CSMstatus !== false){     //100% Won or 100% Won-Renewal
                            let directLevelTerm = Array.isArray(fieldLookUpCustomer['custentityr7directorlevelteam'])? fieldLookUpCustomer['custentityr7directorlevelteam'][0]['value'] : fieldLookUpCustomer['custentityr7directorlevelteam'];
                            log.debug('assignTeamTerritory', directLevelTerm);

                            if(total <= 20000.00 && (directLevelTerm === '2' || directLevelTerm === '3')){        //Mid-Market West or Mid-Market East
                                    log.debug('SMB', 'Searching for SMB');
                                    let smbSearch = search.create({
                                            type: "customrecord_r7_csm_assignment_rules",
                                            filters:
                                                [
                                                        ["custrecord_r7_smb_csm","is","T"],
                                                ],
                                            columns:
                                                [
                                                        search.createColumn({name: "internalid"})
                                                ]
                                    });
                                    let searchResultCount = smbSearch.runPaged().count;
                                    log.debug("smbSearch result count",searchResultCount);
                                    if(searchResultCount === 0){
                                            record.submitFields({
                                                    type: record.Type.CUSTOMER,
                                                    id : customer,
                                                    values: {
                                                            'custentityr7accountmanager': defaultCSM
                                                    }
                                            });
                                            // noinspection UnnecessaryReturnStatementJS
                                            return;
                                    }
                                    else{
                                            smbSearch.run().each(function(result){
                                                    // .run().each has a limit of 4,000 results
                                                    let ruleId = result.getValue({name: "internalid"});
                                                    log.debug('Rule', ruleId);
                                                    let fieldLookUpRule = search.lookupFields({
                                                            type: 'customrecord_r7_csm_assignment_rules',
                                                            id: ruleId,
                                                            columns: ['custrecord_r7_csm']
                                                    });
                                                    let csm = fieldLookUpRule['custrecord_r7_csm'];
                                                    log.debug('CSM', csm);
                                                    record.submitFields({
                                                            type: record.Type.CUSTOMER,
                                                            id : customer,
                                                            values: {
                                                                    'custentityr7accountmanager': csm
                                                            }
                                                    });
                                                    return true;
                                            });
                                            // noinspection UnnecessaryReturnStatementJS
                                            return;
                                    }
                            }//end of SMB Search

                            if(directLevelTerm === '12'){        //SLED
                                    let companyDesig = Array.isArray(fieldLookUpCustomer['custentityr7companydesignation'])? fieldLookUpCustomer['custentityr7companydesignation'][0]['value'] : fieldLookUpCustomer['custentityr7companydesignation'];
                                    log.debug('Company Designation', companyDesig);
                                    if(companyDesig === '3'){    //Named
                                            let sledNamedSearch = search.create({
                                                    type: "customrecord_r7_csm_assignment_rules",
                                                    filters:
                                                        [
                                                                ["custrecord_r7_sled_named","is","T"],
                                                        ],
                                                    columns:
                                                        [
                                                                search.createColumn({name: "internalid"})
                                                        ]
                                            });
                                            let searchResultCount = sledNamedSearch.runPaged().count;
                                            log.debug("sledNamedSearch result count",searchResultCount);
                                            if(searchResultCount === 0){
                                                    record.submitFields({
                                                            type: record.Type.CUSTOMER,
                                                            id : customer,
                                                            values: {
                                                                    'custentityr7accountmanager': defaultCSM
                                                            }
                                                    });
                                                    // noinspection UnnecessaryReturnStatementJS
                                                    return;
                                            }
                                            else{
                                                    sledNamedSearch.run().each(function(result){
                                                            // .run().each has a limit of 4,000 results
                                                            let ruleId = result.getValue({name: "internalid"});
                                                            log.debug('Rule', ruleId);
                                                            let fieldLookUpRule = search.lookupFields({
                                                                    type: 'customrecord_r7_csm_assignment_rules',
                                                                    id: ruleId,
                                                                    columns: ['custrecord_r7_csm']
                                                            });
                                                            let csm = fieldLookUpRule['custrecord_r7_csm'];
                                                            log.debug('CSM', csm);
                                                            record.submitFields({
                                                                    type: record.Type.CUSTOMER,
                                                                    id : customer,
                                                                    values: {
                                                                            'custentityr7accountmanager': csm
                                                                    }
                                                            });
                                                            return true;
                                                    });
                                                    // noinspection UnnecessaryReturnStatementJS
                                                    return;
                                            }
                                    }// end of Sled Named
                                    if(companyDesig === '4'){    //Mid-Market
                                            let sledMMSearch = search.create({
                                                    type: "customrecord_r7_csm_assignment_rules",
                                                    filters:
                                                        [
                                                                ["custrecord_r7_sled_midmarket","is","T"],
                                                        ],
                                                    columns:
                                                        [
                                                                search.createColumn({name: "internalid"})
                                                        ]
                                            });
                                            let searchResultCount = sledMMSearch.runPaged().count;
                                            log.debug("sledMMSearch result count",searchResultCount);
                                            if(searchResultCount === 0){
                                                    record.submitFields({
                                                            type: record.Type.CUSTOMER,
                                                            id : customer,
                                                            values: {
                                                                    'custentityr7accountmanager': defaultCSM
                                                            }
                                                    });
                                                    // noinspection UnnecessaryReturnStatementJS
                                                    return;
                                            }
                                            else{
                                                    sledMMSearch.run().each(function(result){
                                                            // .run().each has a limit of 4,000 results
                                                            let ruleId = result.getValue({name: "internalid"});
                                                            log.debug('Rule', ruleId);
                                                            let fieldLookUpRule = search.lookupFields({
                                                                    type: 'customrecord_r7_csm_assignment_rules',
                                                                    id: ruleId,
                                                                    columns: ['custrecord_r7_csm']
                                                            });
                                                            let csm = fieldLookUpRule['custrecord_r7_csm'];
                                                            log.debug('CSM', csm);
                                                            record.submitFields({
                                                                    type: record.Type.CUSTOMER,
                                                                    id : customer,
                                                                    values: {
                                                                            'custentityr7accountmanager': csm
                                                                    }
                                                            });
                                                            return true;
                                                    });
                                                    // noinspection UnnecessaryReturnStatementJS
                                                    return;
                                            }
                                    }// end of Sled MM
                            }// end of SLED

                            let state = Array.isArray(fieldLookUpCustomer['billstate'])? fieldLookUpCustomer['billstate'][0]['value'] : fieldLookUpCustomer['billstate'];
                            log.debug('state', state);
                            let newState = search.create({
                                    type: "customrecordr7statecountrycus",
                                    filters:
                                        [
                                                ["name","contains",state],
                                        ],
                                    columns:
                                        [
                                                search.createColumn({name: "internalid"})
                                        ]
                            });
                            //let searchResultCount = newState.runPaged().count;
                            //log.debug("newState result count",searchResultCount);
                            newState.run().each(function(result){
                                    // .run().each has a limit of 4,000 results
                                    state = result.getValue({name: "internalid"});
                                    return true;
                            });
                            let country = Array.isArray(fieldLookUpCustomer['billcountry'])? fieldLookUpCustomer['billcountry'][0]['value'] : fieldLookUpCustomer['billcountry'];
                            log.debug('country', country);
                            if(country === 'US' || country === 'CA'){
                                    let searchResults = search.create({
                                            type: "customrecord_r7_csm_assignment_rules",
                                            filters:
                                                [
                                                        ["custrecord_r7_director_level_term","anyof",directLevelTerm],
                                                        "AND",
                                                        ["custrecord_r7_state","anyof",state]
                                                ],
                                            columns:
                                                [
                                                        search.createColumn({name: "internalid"})
                                                ]
                                    });
                                    let searchResultCount = searchResults.runPaged().count;
                                    log.debug("searchResults result count",searchResultCount);
                                    if(searchResultCount === 0){
                                            record.submitFields({
                                                    type: record.Type.CUSTOMER,
                                                    id : customer,
                                                    values: {
                                                            'custentityr7accountmanager': defaultCSM
                                                    }
                                            });
                                            // noinspection UnnecessaryReturnStatementJS
                                            return;
                                    }
                                    else{
                                            searchResults.run().each(function(result){
                                                    // .run().each has a limit of 4,000 results
                                                    let ruleId = result.getValue({name: "internalid"});
                                                    log.debug('Rule', ruleId);
                                                    let fieldLookUpRule = search.lookupFields({
                                                            type: 'customrecord_r7_csm_assignment_rules',
                                                            id: ruleId,
                                                            columns: ['custrecord_r7_csm']
                                                    });
                                                    let csm = fieldLookUpRule['custrecord_r7_csm'];
                                                    log.debug('CSM', csm);
                                                    record.submitFields({
                                                            type: record.Type.CUSTOMER,
                                                            id : customer,
                                                            values: {
                                                                    'custentityr7accountmanager': csm
                                                            }
                                                    });
                                                    return true;
                                            });
                                    }
                            }//End of US or CA assignment

                            if(country !== 'US' && country !== 'CA'){
                                    log.debug('Country Not US or CA', 'True');
                                    let searchCountry = search.create({
                                            type: "customrecordr7countries",
                                            filters:
                                                [
                                                        ["custrecordr7countriescountryid","is",country]
                                                ],
                                            columns:
                                                [
                                                        search.createColumn({name: "internalid"})
                                                ]
                                    });
                                    //let searchResultCount = searchCountry.runPaged().count;
                                    //log.debug("searchCountry result count",searchResultCount);
                                    searchCountry.run().each(function(resultCountry){
                                            // .run().each has a limit of 4,000 results
                                            let countryId = resultCountry.getValue({name: "internalid"});
                                            log.debug('countryId', countryId);
                                            let region = Array.isArray(fieldLookUpCustomer['custentityr7region'])? fieldLookUpCustomer['custentityr7region'][0]['value'] : fieldLookUpCustomer['custentityr7region'];
                                            log.debug('region', region);
                                            let arrRegion = ['6', '7', '8', '9', '10', '14']//ANZ, S. Asia, Middle East, Latin America, Africa, N. Asia
                                            let filter_arr;
                                            if(arrRegion.indexOf(region) === -1){
                                                    filter_arr = ["custrecord_r7_country","anyof",countryId];
                                            }else{
                                                    filter_arr = ["custrecord_r7_region","anyof",region];
                                            }
                                            let searchResults = search.create({
                                                    type: "customrecord_r7_csm_assignment_rules",
                                                    filters: [filter_arr],
                                                    columns:
                                                        [
                                                                search.createColumn({name: "internalid"})
                                                        ]
                                            });
                                            let searchResultCount = searchResults.runPaged().count;
                                            log.debug("searchResults result count",searchResultCount);
                                            if(searchResultCount === 0){
                                                    record.submitFields({
                                                            type: record.Type.CUSTOMER,
                                                            id : customer,
                                                            values: {
                                                                    'custentityr7accountmanager': defaultCSM
                                                            }
                                                    });
                                                    // noinspection UnnecessaryReturnStatementJS
                                                    return;
                                            }
                                            else{
                                                    searchResults.run().each(function(result){
                                                            // .run().each has a limit of 4,000 results
                                                            let ruleId = result.getValue({name: "internalid"});
                                                            log.debug('Rule', ruleId);
                                                            let fieldLookUpRule = search.lookupFields({
                                                                    type: 'customrecord_r7_csm_assignment_rules',
                                                                    id: ruleId,
                                                                    columns: ['custrecord_r7_csm']
                                                            });
                                                            let csm = fieldLookUpRule['custrecord_r7_csm'];
                                                            log.debug('CSM', csm);
                                                            record.submitFields({
                                                                    type: record.Type.CUSTOMER,
                                                                    id : customer,
                                                                    values: {
                                                                            'custentityr7accountmanager': csm
                                                                    }
                                                            });
                                                            return true;
                                                    });
                                            }

                                            return true;
                                    });

                            }// end of if country is not US or CA

                    }//end of status == 13 or 15

            }//end function assignCSM()

            const checkAndSetBESPFields = (newRecord, context) => {
                    let shipping_country = null;
                    let besp_category = null;
                    let useShippingCountry = true;
                    let usePartner = true;

                    // Check if we need to execute BL in 'xedit' mode
                    const {type, UserEventType} = context;
                    const {XEDIT} = UserEventType;
                    if(type === XEDIT){
                            useShippingCountry = false;
                            usePartner = false;
                            let fields = newRecord.getFields();
                            for(let i = 0; i<fields.length; i++){
                                    if(fields[i]==='partner'){
                                            usePartner = true;
                                    }
                                    if(fields[i]==='shipcountry'){
                                            useShippingCountry = true;
                                    }
                            }
                            log.audit('BESP Logic from XEDIT','useShippingCountry = '+ useShippingCountry+ ' ; usePartner = '+ usePartner);
                            // When no related to BL fields are changed in 'xedit' mode - exit
                            if(!useShippingCountry && !usePartner){
                                    return;
                            }
                    }

                    if(useShippingCountry){
                            let country = newRecord.getValue({fieldId: 'shipcountry'});
                            shipping_country = (country === 'US' || country === 'CA') ? 1 : 2
                            log.audit('BESP Shipping Country','Country = '+ country+ ' ; shipping_country = '+ shipping_country);
                    }

                    if(usePartner){
                            let partner = newRecord.getValue({fieldId: 'partner'});
                            besp_category = isBlank(partner) ? 1 : 2;
                    }

                    for (let i = 0; i < newRecord.getLineCount({sublistId: 'item'}); i++) {
                            let itemType = newRecord.getSublistValue({sublistId: 'item', fieldId: 'itemtype', line: i});
                            if (itemType === 'Subtotal' || itemType === 'Discount' || itemType === 'Description' || itemType === 'group'
                                || itemType === 'Group' || itemType === 'EndGroup') {
                                    continue;
                            }
                            if (useShippingCountry) {
                                    newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_r7_shipping_country', line: i, value: shipping_country});
                            }
                            if (usePartner) {
                                    newRecord.setSublistValue({sublistId: 'item', fieldId: 'custcol_r7_besp_category', line: i, value: besp_category});
                            }
                    }
            }

            return {
                    setTotalDiscount,
                    zc_stampCategoryPurchased,
                    zc_runCategoryPurchasedCopyRoutine,
                    checkApplianceYears,
                    zc_categorypurchased_credits,
                    stampACV,
                    ACVGroup,
                    grabItemDetailMap,
                    grabCategoryPurchasedDetailMap,
                    //stampClass,
                    setLocations,
                    getRecTypeId,
                    getRandomString,
                    formatNumber,
                    days_between,
                    getPSTDate,
                    unique,
                    isBlank,
                    assignCSM,
                    checkAndSetBESPFields
            }
    });