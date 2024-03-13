/*
 * @author efagone
 */

/*
 * DEPLOYMENT
 * 
 * - skulock new category fields on tran columns
 * - update incorrect cat purchased lines due to maintenance express/perpetual (https://663271-sb1.app.netsuite.com/app/common/search/searchresults.nl?searchid=18975)
 * 
 * 
 */

var STEP_NO_STEP = 0;
var STEP_UPDATE_CUSTOMER_CATEGORY_PURCHASED_NO_TRANSACTIONS = 1;
var STEP_UPDATE_CUSTOMER_CATEGORY_PURCHASED_LIFETIME_ACTIVE = 2;
var STEP_UPDATE_CUSTOMER_CATEGORY_PURCHASED_INACTIVE = 3;
var STEP_UPDATE_CUSTOMER_STATUS = 4;
var currentExecutionLogicStep = null;
var context = nlapiGetContext();
var rescheduleScript = false;

/**
 * Main script's function
 */
function run_category_purchased_logic_sched() {
    rescheduleScript = false;
    currentExecutionLogicStep = null;
    try {
        currentExecutionLogicStep = parseInt(context.getSetting('SCRIPT', 'custscript_r7_cat_purch_step'));
    }
    catch (ex) {
    }
    if (isNullOrEmpty(currentExecutionLogicStep)) {
        currentExecutionLogicStep = STEP_NO_STEP;
    }
    var nextExecutionStep = null;
    try {
        // ***********Lifetime and Active need to run BEFORE
        // Inactive************
        switch (currentExecutionLogicStep) {
            case STEP_UPDATE_CUSTOMER_CATEGORY_PURCHASED_NO_TRANSACTIONS: {
                updateCustomerCategoryPurchased_NoTransactions();
                nextExecutionStep = STEP_UPDATE_CUSTOMER_CATEGORY_PURCHASED_LIFETIME_ACTIVE;
                break;
            }
            case STEP_UPDATE_CUSTOMER_CATEGORY_PURCHASED_LIFETIME_ACTIVE: {
                updateCustomerCategoryPurchased_Lifetime_Active();
                nextExecutionStep = STEP_UPDATE_CUSTOMER_CATEGORY_PURCHASED_INACTIVE;
                break;
            }
            case STEP_UPDATE_CUSTOMER_CATEGORY_PURCHASED_INACTIVE: {
                updateCustomerCategoryPurchased_Inactive();
                nextExecutionStep = STEP_UPDATE_CUSTOMER_STATUS;
                break;
            }
            case STEP_UPDATE_CUSTOMER_STATUS: {
                updateCustomerStatus();
                nextExecutionStep = STEP_NO_STEP;
                break;
            }
            default: {
                nlapiLogExecution('AUDIT', 'Main', 'Execution step is not provided. Exiting.');
                nextExecutionStep = STEP_NO_STEP;
                break;
            }
        }
    }
    catch (e) {
        nlapiLogExecution('ERROR', 'SCRIPT FAILED', e);
        rescheduleScript = true;
    }
    if(rescheduleScript){
        nextExecutionStep = currentExecutionLogicStep;
        nlapiLogExecution('AUDIT', 'rescheduleScript', 'nextExecutionStep: ' + nextExecutionStep);
    }
    scheduleNextExecutionLogicStep(nextExecutionStep);
}

/**
 * SChedules new execution of script according to execution logic
 * @param executionLogicStep
 */
function scheduleNextExecutionLogicStep(executionLogicStep) {
    if (executionLogicStep == STEP_NO_STEP) {
        nlapiLogExecution('AUDIT', 'Finished Script', 'Thank you and have a good day.');
        return;
    }
    var parameters = {
        custscript_r7_cat_purch_step : executionLogicStep
    }
    var scriptId = 'customscriptr7categorypurchased_sch_adv';
    var deployId = 'customdeployr7categorypurchased_sch_advu';
    var status = nlapiScheduleScript(scriptId, deployId, parameters);
    nlapiLogExecution('DEBUG', 'Schedule Status', status);
}

/**
 * updates categories on customers without transactions
 */
function updateCustomerCategoryPurchased_NoTransactions() {
    nlapiLogExecution('AUDIT', 'updateCustomerCategoryPurchased_NoTransactions', 'Started');
    var processbeginTime = new Date();
    var arrResults = [];
    var columns = null;
    var search = nlapiLoadSearch('customer', 'customsearchr7_scriptcatpurch_custwotran');
    var searchResults = search.runSearch();
    searchResults.forEachResult(function(record) {
        if (columns == null) {
            columns = record.getAllColumns();
        }
        var currentStatusId = record.getValue(columns[6]);
        var newStatusId = record.getValue(columns[7]);
        if (currentStatusId != newStatusId) {
            arrResults.push({
                customerId : record.getValue(columns[0]),
                copiedFromLLC : record.getValue(columns[2]),
                linkedCustomerId : record.getValue(columns[3])
            });
        }
        return true;
    });
    nlapiLogExecution('AUDIT', 'Time (in seconds) to process customsearchr7_scriptcatpurch_custwotran', (new Date()
            .getTime() - processbeginTime.getTime()) / 1000);
    if (arrResults.length == 0) {
        nlapiLogExecution('AUDIT', 'No results found (customsearchr7_scriptcatpurch_custwotran)', 'moving on');
        return;
    }
    nlapiLogExecution('AUDIT', 'Number of customer results (customsearchr7_scriptcatpurch_custwotran)',
            arrResults.length);

    for (var i = 0; i < arrResults.length; i++) {
        if(!unitsLeft()){
            break;
        }
        var record = arrResults[i];
        var arrNewCatLifetime = '';
        var arrNewCatActive = '';
        var status;
        // Check,if current customer was copied from R7 LLC and linked
        // customer(old customer) has any cash sales or invoices
        if (record.copiedFromLLC === 'T' && !isNullOrEmpty(record.linkedCustomerId)
                && !getSearchResults(record.linkedCustomerId)) {
            // Linked customer has cashsales or invoice, then lets check if we
            // need to recalculate category-active and category-lifetime.
            // If getCategoryActiveArray() function will return some values,
            // then use them, if will not, then copy values from linked customer
            // It means that linked customer has actual values in those fields
            // and there is no need to recalculate them
            var arrCatLifeTime = getCategoryActiveArray(record.linkedCustomerId);
            if (arrCatLifeTime) {
                arrNewCatLifetime = (arrCatLifeTime.strNewCatLifetime) ? arrCatLifeTime.strNewCatLifetime.split(',')
                        : [];
                arrNewCatActive = (arrCatLifeTime.strNewCatActive) ? arrCatLifeTime.strNewCatActive.split(',') : [];
                status = nlapiLookupField('customer', record.linkedCustomerId, 'entitystatus');
            } else {
                var arrValues = nlapiLookupField('customer', record.linkedCustomerId, [ 'custentityr7categorylifetime',
                        'custentityr7categoryactive', 'entitystatus' ]);
                arrNewCatLifetime = (arrValues.custentityr7categorylifetime) ? arrValues.custentityr7categorylifetime
                        .split(',') : [];
                arrNewCatActive = (arrValues.custentityr7categoryactive) ? arrValues.custentityr7categoryactive
                        .split(',') : [];
                status = arrValues.entitystatus;
            }
        }
        var fields = [];
        fields[0] = 'custentityr7categoryinactive';
        fields[1] = 'custentityr7categorylifetime';
        fields[2] = 'custentityr7categoryactive';
        fields[3] = 'custentityr7categoryactivelastchecked';
        var values = [];
        values[0] = '';
        values[1] = arrNewCatLifetime;
        values[2] = arrNewCatActive;
        values[3] = nlapiDateToString(getPSTDate(), 'datetimetz');
        // Set status to customers
        if (status) {
            fields[4] = 'entitystatus';
            values[4] = status;
        }
        // Update values in fields for both customers(linked and main)
        try {
            nlapiSubmitField('customer', record.customerId, fields, values);
        }
        catch (e) {
            nlapiLogExecution('ERROR', 'Could not submit Categories Purchased for Customer ' + record.customerId, e);
        }
        if (!isNullOrEmpty(record.linkedCustomerId)) {
            try {
                nlapiSubmitField('customer', record.linkedCustomerId, fields, values);
            }
            catch (e) {
                nlapiLogExecution('ERROR', 'Could not submit Categories Purchased for Customer '
                        + record.linkedCustomerId, e);
            }

        }
    }
    nlapiLogExecution('AUDIT', 'Time (in seconds) to process merged records', (new Date().getTime() - processbeginTime
            .getTime()) / 1000);
    nlapiLogExecution('AUDIT', 'updateCustomerCategoryPurchased_NoTransactions', 'Finished');
}
/*
 * Params: linkedCustomerId - id of customer from linked field Description: This
 * function calls saved search SCRIPT - Category Purchased: Customers w/o
 * Transactions for linked customer. If serach returns any results, it means
 * that linked customre hasn't any cashsales or invoices
 */
function getSearchResults(linkedCustomerId) {
    if (!linkedCustomerId) {
        return false;
    }
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('internalid', null, 'is', linkedCustomerId));
    var results = nlapiSearchRecord('customer', 'customsearchzc_scriptcatpurch_custwotran', arrFilters);
    if (results && results.length > 0) {
        return true;
    }
    return false;
}

/**
 * Updates Lifetime/Active categories on customers
 */
function updateCustomerCategoryPurchased_Lifetime_Active() {
    nlapiLogExecution('AUDIT', 'updateCustomerCategoryPurchased_Lifetime_Active', 'Started');
    var processbeginTime = new Date();
    var arrResults = getActiveInactiveSearchResults('customsearchr7_catpurch_cust_life_acti_5');
    var arrResults2 = getActiveInactiveSearchResults('customsearchr7_catpurch_cust_life_acti_6');
    nlapiLogExecution('AUDIT', 'Time (in seconds) to process customsearchr7_catpurch_cust_life_acti searches', (new Date().getTime() - processbeginTime.getTime()) / 1000);

    if (!arrResults && !arrResults2) {
        nlapiLogExecution('AUDIT', 'No results found (customsearchr7_catpurch_cust_life_acti searches', 'moving on');
        return;
    }
    var arrRecords = buildCategoryLifetimeActiveResults(arrResults, arrResults2);
    arrResults = null;
    arrResults2 = null;
    nlapiLogExecution('AUDIT', 'Number of transactions results (customsearchr7_catpurch_cust_life_acti searches)', arrRecords.length);
    var recordsToProcess = checkAndMergeCategoryLifetimeActiveRecords(arrRecords);
    arrRecords = null;
    nlapiLogExecution('AUDIT', 'Number of records to process after merge', recordsToProcess.length);
    for (var i = 0; i < recordsToProcess.length; i++) {
        if(!unitsLeft()){
            break;
        }
        if (((new Date().getTime() - processbeginTime.getTime()) / 1000) > 3000) {
            rescheduleScript = true;
            break;
        }
        var record = recordsToProcess[i];
        var fields = [];
        fields[0] = 'custentityr7categorylifetime';
        fields[1] = 'custentityr7categoryactive';
        fields[2] = 'custentityr7categoryactivelastchecked';

        var values = [];
        values[0] = isNullOrEmpty(record.categoryLifetimeShouldBeIDs) ? [] : record.categoryLifetimeShouldBeIDs
                .split(',');
        values[1] = isNullOrEmpty(record.categoryActiveShouldBeIDs) ? [] : record.categoryActiveShouldBeIDs.split(',');
        values[2] = nlapiDateToString(getPSTDate(), 'datetimetz');
        // Update category-active and category-lifetime for both
        // customers(linked and main)
        try {
            nlapiSubmitField('customer', record.id, fields, values);
        }
        catch (e) {
            nlapiLogExecution('ERROR', 'Could not submit Categories Purchased for Customer ' + record.id, e);
        }
        if (!isNullOrEmpty(record.linkedId)) {
            try {
                nlapiSubmitField('customer', record.linkedId, fields, values);
            }
            catch (e) {
                nlapiLogExecution('ERROR', 'Could not submit Categories Purchased for Customer ' + record.linkedId, e);
            }
        }
    }
    nlapiLogExecution('AUDIT', 'Time (in seconds) to process merged records', (new Date().getTime() - processbeginTime
            .getTime()) / 1000);
    nlapiLogExecution('AUDIT', 'updateCustomerCategoryPurchased_Lifetime_Active', 'Finished');
}

/**
 * Builds internal array of records for following processing from saved search result
 * @param arrResults
 * @returns {Array}
 */
function buildCategoryLifetimeActiveResults(arrResults, arrResults2) {
    nlapiLogExecution('AUDIT', 'buildCategoryLifetimeActiveResults', 'Started');
    var arrRecords = [];
    var columns = null;
    arrResults.forEachResult(function(record) {
        if (columns == null) {
            columns = record.getAllColumns();
        }
        arrRecords.push({
            id : record.getValue(columns[0]),
            linkedId : record.getValue(columns[1]),
            currentCategoryLifetime : record.getValue(columns[2]),
            categoryLifetimeShouldBeNames : record.getValue(columns[3]),
            categoryLifetimeShouldBeIDs : record.getValue(columns[4]),
            currentCategoryActive : record.getValue(columns[6]),
            categoryActiveShouldBeNames : record.getValue(columns[7]),
            categoryActiveShouldBeIDs : record.getValue(columns[8])
        });
        return true;
    });
    arrResults2.forEachResult(function (record) {
        if (columns == null) {
            columns = record.getAllColumns();
        }
        arrRecords.push({
            id: record.getValue(columns[0]),
            linkedId: record.getValue(columns[1]),
            currentCategoryLifetime: record.getValue(columns[2]),
            categoryLifetimeShouldBeNames: record.getValue(columns[3]),
            categoryLifetimeShouldBeIDs: record.getValue(columns[4]),
            currentCategoryActive: record.getValue(columns[6]),
            categoryActiveShouldBeNames: record.getValue(columns[7]),
            categoryActiveShouldBeIDs: record.getValue(columns[8])
        });
        return true;
    });
    arrRecords.sort(compareObjById);
    nlapiLogExecution('AUDIT', 'buildCategoryLifetimeActiveResults', 'Finished');
    return arrRecords;
}

/**
 * Checks if record needs to be updated and merged 
 * @param arrRecords
 * @returns {Array} - array with unique records for following processing
 */
function checkAndMergeCategoryLifetimeActiveRecords(arrRecords) {
    var results = [];
    while (arrRecords.length > 0) {
        var rec = arrRecords[0];
        if (!isNullOrEmpty(rec.linkedId)) {
            var linkedRecordIdx = getObjectsIndex(rec.linkedId, arrRecords, compareObjectsByIdValue);
            if (linkedRecordIdx > 0) {
                var linkedRecord = arrRecords[linkedRecordIdx];
                var mergedRecord = mergeCategoryLifetimeActiveRecords(rec, linkedRecord);
                if (!isNullOrEmpty(mergedRecord)) {
                    results.push(mergedRecord);
                }
                arrRecords.splice(linkedRecordIdx, 1);
                arrRecords.splice(0, 1);
            } else {
                results.push(rec);
                arrRecords.splice(0, 1);
            }
        } else {
            results.push(rec);
            arrRecords.splice(0, 1);
        }
    }
    return results;
}

/**
 * Merges two records into one
 * @param rec1
 * @param rec2
 * @returns {Object} - merged record
 */
function mergeCategoryLifetimeActiveRecords(rec1, rec2) {
    var mergedRecord = null;
    var currentCategoryLifetime_arr1 = rec1.currentCategoryLifetime.toUpperCase().split(',');
    var currentCategoryLifetime_arr2 = rec2.currentCategoryLifetime.toUpperCase().split(',');
    var currentCategoryActive_arr1 = rec1.currentCategoryActive.toUpperCase().split(',');
    var currentCategoryActive_arr2 = rec2.currentCategoryActive.toUpperCase().split(',');
    var categoryLifetimeShouldBeIDs = unique(rec1.categoryLifetimeShouldBeIDs.split(',').concat(
            rec2.categoryLifetimeShouldBeIDs.split(',')));
    var categoryActiveShouldBeIDs = unique(rec1.categoryActiveShouldBeIDs.split(',').concat(
            rec2.categoryActiveShouldBeIDs.split(',')));
    currentCategoryLifetime_arr1.sort();
    currentCategoryLifetime_arr2.sort();
    currentCategoryActive_arr1.sort();
    currentCategoryActive_arr2.sort();
    categoryLifetimeShouldBeIDs.sort();
    categoryActiveShouldBeIDs.sort();
    if (compareArrays(currentCategoryLifetime_arr1, currentCategoryLifetime_arr2, simpleStringCompare) != 0
            || compareArrays(currentCategoryActive_arr1, currentCategoryActive_arr2, simpleStringCompare) != 0
            || compareArrays(currentCategoryLifetime_arr1, categoryLifetimeShouldBeIDs, simpleStringCompare) != 0
            || compareArrays(currentCategoryActive_arr1, categoryActiveShouldBeIDs, simpleStringCompare) != 0
            ) {
        mergedRecord = {
            id : rec1.id,
            linkedId : rec1.linkedId,
            currentCategoryLifetime : '',
            categoryLifetimeShouldBeNames : '',
            categoryLifetimeShouldBeIDs : '',
            currentCategoryActive : '',
            categoryActiveShouldBeNames : '',
            categoryActiveShouldBeIDs : ''
        };
        mergedRecord.categoryLifetimeShouldBeIDs = categoryLifetimeShouldBeIDs.join(',');
        mergedRecord.categoryActiveShouldBeIDs = categoryActiveShouldBeIDs.join(',');
    }
    return mergedRecord;
}

/**
 * Perorms an update of Category Inactive on customers
 */
function updateCustomerCategoryPurchased_Inactive() {
    nlapiLogExecution('AUDIT', 'updateCustomerCategoryPurchased_Inactive', 'Started');
    var processbeginTime = new Date();

    nlapiLogExecution('AUDIT', 'customsearchr7_catpurch_cust_inactive_2', 'Started');
    var search = nlapiLoadSearch('transaction', 'customsearchr7_catpurch_cust_inactive_2');//group1
    var arrResults = search.runSearch();
    nlapiLogExecution('AUDIT', 'customsearchr7_catpurch_cust_inactive__3', 'Started');
    var search2 = nlapiLoadSearch('transaction', 'customsearchr7_catpurch_cust_inactive__3');//group2
    var arrResults2 = search2.runSearch();

    //var arrResults = getActiveInactiveSearchResults('customsearchr7_catpurch_cust_inactive_2'); //group1
    //var arrResults2 = getActiveInactiveSearchResults('customsearchr7_catpurch_cust_inactive__3'); //group2
    if (!arrResults && !arrResults2) {
        nlapiLogExecution('AUDIT', 'No results found (customsearchr7_catpurch_cust_inactive searches)', 'moving on');
        return;
    }
    var arrRecords = buildCategoryInactiveResults(arrResults, arrResults2);
    nlapiLogExecution('AUDIT', 'Time (in seconds) to process customsearchr7_catpurch_cust_inactive searches', (new Date().getTime() - processbeginTime.getTime()) / 1000);
    arrResults = null;
    arrResults2 = null;
    nlapiLogExecution('AUDIT', 'Number of transactions results (customsearchr7_catpurch_cust_inactive searches)', arrRecords.length);
    var recordsToProcess = checkAndMergeCategoryInactiveRecords(arrRecords);
    arrRecords = null;
    nlapiLogExecution('AUDIT', 'Number of records to process after merge', recordsToProcess.length);
    for (var i = 0; i < recordsToProcess.length; i++) {
        if(!unitsLeft()){
            break;
        }
        if (((new Date().getTime() - processbeginTime.getTime()) / 1000) > 3000) {
            rescheduleScript = true;
            break;
        }
        var record = recordsToProcess[i];
        var fields = [];
        fields[0] = 'custentityr7categoryinactive';
        fields[1] = 'custentityr7categoryactivelastchecked';

        var values = [];
        values[0] = isNullOrEmpty(record.categoryInactiveShouldBeIDs) ? [] : record.categoryInactiveShouldBeIDs.split(',');
        values[1] = nlapiDateToString(getPSTDate(), 'datetimetz');
        // Update category-inactive for both customers(linked and main)
        try {
            nlapiSubmitField('customer', record.id, fields, values);
        }
        catch (e) {
            nlapiLogExecution('ERROR', 'Could not submit Categories Inactive for Customer ' + record.id, e);
        }
        if (!isNullOrEmpty(record.linkedId)) {
            try {
                nlapiSubmitField('customer', record.linkedId, fields, values);
            }
            catch (e) {
                nlapiLogExecution('ERROR', 'Could not submit Categories Inactive for Customer ' + record.linkedId, e);
            }
        }
    }
    nlapiLogExecution('AUDIT', 'Time (in seconds) to process merged records', (new Date().getTime() - processbeginTime.getTime()) / 1000);
    nlapiLogExecution('AUDIT', 'updateCustomerCategoryPurchased_Inactive', 'Finished');
}

/**
 * builds internal array of records for following processing from saved search result
 * @param arrResults
 * @returns {Array}
 */
function buildCategoryInactiveResults(arrResults, arrResults2) {
    try {
        nlapiLogExecution('AUDIT', 'buildCategoryInactiveResults', 'Started');
        var arrRecords = [];
        var columns = null;
        arrResults.forEachResult(function (record) {
            if (columns == null) {
                columns = record.getAllColumns();
            }
            arrRecords.push({
                id: record.getValue(columns[0]),
                linkedId: record.getValue(columns[1]),
                currentCategoryInactive: record.getValue(columns[2]),
                categoryInactiveShouldBeNames: record.getValue(columns[3]),
                categoryInactiveShouldBeIDs: record.getValue(columns[4]),
            });
            return true;
        });
        arrResults2.forEachResult(function (record) {
            if (columns == null) {
                columns = record.getAllColumns();
            }
            arrRecords.push({
                id: record.getValue(columns[0]),
                linkedId: record.getValue(columns[1]),
                currentCategoryInactive: record.getValue(columns[2]),
                categoryInactiveShouldBeNames: record.getValue(columns[3]),
                categoryInactiveShouldBeIDs: record.getValue(columns[4]),
            });
            return true;
        });
        arrRecords.sort(compareObjById);
        nlapiLogExecution('AUDIT', 'buildCategoryInactiveResults', 'Finished');
        return arrRecords;
    }
    catch (e) {
        nlapiLogExecution('AUDIT', 'buildCategoryInactiveResults error', e);
        rescheduleScript = true;
    }
    
}

/**
 * Checks if record needs to be updated and merged 
 * @param arrRecords
 * @returns {Array} - array with unique records for following processing
 */
function checkAndMergeCategoryInactiveRecords(arrRecords) {
    var results = [];
    while (arrRecords.length > 0) {
        var rec = arrRecords[0];
        if (!isNullOrEmpty(rec.linkedId)) {
            var linkedRecordIdx = getObjectsIndex(rec.linkedId, arrRecords, compareObjectsByIdValue);
            if (linkedRecordIdx > 0) {
                var linkedRecord = arrRecords[linkedRecordIdx];
                var mergedRecord = mergeCategoryInactiveRecords(rec, linkedRecord);
                if (!isNullOrEmpty(mergedRecord)) {
                    results.push(mergedRecord);
                }
                arrRecords.splice(linkedRecordIdx, 1);
                arrRecords.splice(0, 1);
            } else {
                results.push(rec);
                arrRecords.splice(0, 1);
            }
        } else {
            results.push(rec);
            arrRecords.splice(0, 1);
        }
    }
    return results;
}

/**
 * Merges two records into one
 * @param rec1
 * @param rec2
 * @returns {Object} - merged record
 */
function mergeCategoryInactiveRecords(rec1, rec2) {
    var mergedRecord = null;
    var currentCategoryInactive_arr1 = rec1.currentCategoryInactive.toUpperCase().split(',');
    var currentCategoryInactive_arr2 = rec2.currentCategoryInactive.toUpperCase().split(',');
    var categoryInactiveShouldBeIDs = unique(rec1.categoryInactiveShouldBeIDs.split(',').concat(
            rec2.categoryInactiveShouldBeIDs.split(',')));
    currentCategoryInactive_arr1.sort();
    currentCategoryInactive_arr2.sort();
    categoryInactiveShouldBeIDs.sort();
    if (compareArrays(currentCategoryInactive_arr1, currentCategoryInactive_arr2, simpleStringCompare) != 0
            ||
            compareArrays(currentCategoryInactive_arr1, categoryInactiveShouldBeIDs, simpleStringCompare) != 0 ) {
        mergedRecord = {
            id : rec1.id,
            linkedId : rec1.linkedId,
            currentCategoryInactive : '',
            categoryInactiveShouldBeNames : '',
            categoryInactiveShouldBeIDs : ''
        };
        mergedRecord.categoryInactiveShouldBeIDs = categoryInactiveShouldBeIDs.join(',');
    }
    return mergedRecord;
}

/**
 * Updates Customers status field
 */
function updateCustomerStatus() {
    nlapiLogExecution('AUDIT', 'updateCustomerStatus', 'Started');
    var arrResults = [];
    var columns = null;
    var processbeginTime = new Date();
    var search = nlapiLoadSearch('customer', 'customsearchr7_customerstatusautomation');
    var searchResults = search.runSearch();
    searchResults.forEachResult(function(record) {
        if (columns == null) {
            columns = record.getAllColumns();
        }
        var currentStatusId = record.getValue(columns[6]);
        var newStatusId = record.getValue(columns[7]);
        if (currentStatusId != newStatusId) {
            arrResults.push({
                customerId : record.getValue(columns[0]),
                currentStatusId : currentStatusId,
                newStatusId : newStatusId
            });
        }
        return true;
    });
    nlapiLogExecution('AUDIT', 'Time (in seconds) to process customsearchr7_customerstatusautomation', (new Date()
            .getTime() - processbeginTime.getTime()) / 1000);
    if (arrResults.length == 0) {
        nlapiLogExecution('AUDIT', 'No results found (customsearchr7_customerstatusautomation)', 'moving on');
        return;
    }
    nlapiLogExecution('AUDIT', 'Number of customer results (customsearchr7_customerstatusautomation)',
            arrResults.length);
    for (var i = 0; i < arrResults.length ; i++) {
        if(!unitsLeft()){
            break;
        }
        var record = arrResults[i];
        var fields = [];
        fields[0] = 'entitystatus';
        fields[1] = 'custentityr7lastcustomerstatus';
        fields[2] = 'custentityr7customerstatuslastmodified';
        var values = [];
        values[0] = record.newStatusId;
        values[1] = record.currentStatusId;
        values[2] = nlapiDateToString(getPSTDate(), 'datetimetz');
        try {
            nlapiSubmitField('customer', record.customerId, fields, values);
        }
        catch (e) {
            nlapiLogExecution('ERROR', 'Could not submit Customer status for customer ' + record.customerId, e);
        }
    }
    nlapiLogExecution('AUDIT', 'Time (in seconds) to process records', (new Date().getTime() - processbeginTime
            .getTime()) / 1000);
    nlapiLogExecution('AUDIT', 'updateCustomerStatus', 'Finished');
}

/**
 * Loads and runs saved search for Lifetime/Active or Inactive categories 
 * @param searchName
 * @returns
 */
function getActiveInactiveSearchResults(searchName) {
    var search = nlapiLoadSearch('transaction', searchName);
    return search.runSearch();
}

/**
 * Runs customsearchr7_catpurch_cust_life_active saved search for one customer and returns results
 * @param linkedCustomerId
 * @param searchName
 * @returns
 */
function getActiveInactiveSearchResults_old(linkedCustomerId, searchName) {
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('internalid', 'customermain', 'is', linkedCustomerId));
    return nlapiSearchRecord('transaction', 'customsearchr7_catpurch_cust_life_active', arrFilters);
}

/**
 * Get results from saved search and returns array with category-active's and category-lifetime's ids
 */
function getCategoryActiveArray(linkedCustomerId) {
    var resultes = getActiveInactiveSearchResults_old(linkedCustomerId);
    if (resultes && resultes.length === 1) {
        var columns = resultes[0].getAllColumns();
        return {
            strNewCatLifetime : resultes[0].getValue(columns[3]),
            strNewCatActive : resultes[0].getValue(columns[7])
        };
    }
    return null;
}


/**
 * Returns current date in PST timezone
 * @returns {Date}
 */
function getPSTDate() {
    var now = new Date();
    now.setHours(now.getHours() + 3);
    return now;
}

/**
 * Checks remaining Governance units and if there are less than 100 units, sets rescheduleScript variable to true  
 * @returns {Boolean}
 */
function unitsLeft() {
    var unitsLeft = context.getRemainingUsage();
    if (rescheduleScript || unitsLeft <= 100) {
        nlapiLogExecution('AUDIT', 'Ran out of units', 'yup');
        rescheduleScript = true;
        return false;
    }
    return true;
}

/**
 * This function returns array with unique values
 * 
 * @param: a - array of some values
 * @return: {Array} with unique values
 */
function unique(a) {
    a.sort();
    for (var i = 0; i < a.length;) {
        if (a[i - 1] == a[i] || !a[i]) {
            a.splice(i, 1);
        } else {
            i++;
        }
    }
    return a;
}

/**
 * Checks if value is undefined null or empty string
 * @param val - any value
 * @returns {Boolean} - true is value is undefined, null or empty string
 */
function isNullOrEmpty(val) {
    return val == undefined || val == null || val == '';
}

/**
 * Quick Search in sorted Array. "Bisection method" used.
 * 
 * @param {any}
 *                value
 * @param {Array}
 *                arr - an Array to search through. Important prerequisite!
 *                Array MUST BE SORTED.
 * @param {Function}
 *                compareFunc
 * @returns {Object} found object in array or null if nothing was found
 */
function quickSearch(value, arr, compareFunc) {
    if (isNullOrEmpty(value) || isNullOrEmpty(arr) || isNullOrEmpty(compareFunc)) {
        return null;
    }
    var l = arr.length - 1;
    var i = 0;
    var idx = 0;
    var cres = 0;
    while (i <= l) {
        // Compute position
        idx = (l + i) >> 1;

        // Call comparison function
        cres = compareFunc(value, arr[idx]);

        // Check the comparison results
        if (cres > 0) {
            i = idx + 1;
        } else if (cres < 0) {
            l = idx - 1;
        } else {
            return arr[idx];
        }
    }
    return null;
}

/**
 * Returns object's index from array. "Bisection method" used.
 * 
 * @param {any}
 *                obj - object/value
 * @param {Array}
 *                arr - an Array to search through. Important prerequisite!
 *                Array MUST BE SORTED.
 * @param {Function}
 *                compareFunc
 * @returns {Integer} found object's index in array or -1 if nothing was found
 */
function getObjectsIndex(value, arr, compareFunc) {
    if (isNullOrEmpty(value) || isNullOrEmpty(arr) || isNullOrEmpty(compareFunc)) {
        return -1;
    }
    var l = arr.length - 1;
    var i = 0;
    var idx = 0;
    var cres = 0;
    while (i <= l) {
        // Compute position
        idx = (l + i) >> 1;

        // Call comparison function
        cres = compareFunc(value, arr[idx]);

        // Check comparison result
        if (cres > 0) {
            i = idx + 1;
        } else if (cres < 0) {
            l = idx - 1;
        } else {
            return idx;
        }
    }
    return -1;
}

/**
 * Compare two objects by their internal IDs
 * 
 * @param {type}
 *                obj1
 * @param {type}
 *                obj2
 * @returns {Number}
 */
var compareObjById = function(obj1, obj2) {
    if (isNullOrEmpty(obj1) || isNullOrEmpty(obj1.id)) {
        return -1;
    }
    if (isNullOrEmpty(obj2) || isNullOrEmpty(obj2.id)) {
        return 1;
    }
    return obj1.id.toString().localeCompare(obj2.id.toString());
};

/**
 * Compare value with object's internal ID
 * 
 * @param {type}
 *                obj1
 * @param {type}
 *                obj2
 * @returns {Number}
 */
var compareObjectsByIdValue = function(value, obj) {
    if (isNullOrEmpty(value)) {
        return -1;
    }
    if (isNullOrEmpty(obj) || isNullOrEmpty(obj.id)) {
        return 1;
    }
    return value.toString().localeCompare(obj.id.toString());
};

/**
 * simple string comparison function
 * @param str1
 * @param str2
 * @returns
 */
function simpleStringCompare(str1, str2) {
    return str1.localeCompare(str2);
}

/**
 * Compares two arrays by comparing each elements.
 * Arrays MUST be sorted
 * 
 * @param arr1
 * @param arr2
 * @param compareFunc
 * @returns
 */
function compareArrays(arr1, arr2, compareFunc) {
    if (isNullOrEmpty(arr1) || isNullOrEmpty(arr2) || isNullOrEmpty(compareFunc)) {
        return -1;
    }
    if (arr1.length < arr2.length) {
        return -1;
    } else if (arr1.length > arr2.length) {
        return 1;
    } else {
        var l = arr1.length;
        for (var i = 0; i < l; i++) {
            var cmp = compareFunc(arr1[i], arr2[i]);
            if (cmp != 0) {
                return cmp;
            }
        }
    }
    return 0;
}