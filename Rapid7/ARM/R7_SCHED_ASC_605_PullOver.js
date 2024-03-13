/*
 *Author: Chris Bleile (RSM US), Tyler Foss (RSM US)
 *Date: 06/26/2017, 1/15/2018
 *Description:
 * Copies down the Revenue and the link to the source transaction
 * Update: Includes logic to now handle Revenue Arrangements with Primary Accounting Books, uses 606 values from the line level 
 */

var ScriptBase;

var Transaction = function () {
    this.ID = null;
    this.Lines = [];
    this.Is606 = false;
    this.Is605 = false;
}

var TransactionLine = function () {
    this.UniqueID = null;
    this.Amount = null;
    this.ElementID = null;
    this.Is606 = false;
    this.Is605 = false;
}

var RevenueElement = function () {
    this.ElementID = null;
    this.SourceID = null;
    this.Amount = null;
    //add new field for 606 value sourced from Primary Book?
}

var Events = {

    /*
     * Main entry point
     */
    Main: function () {
        ScriptBase = new McGladrey.Script.Scheduled();

        try {

            var startBench = ScriptBase.Log.StartBenchmark(ScriptBase.EventName);

            process();

            ScriptBase.Log.EndBenchmark(ScriptBase.EventName, startBench);
        }
        catch (err) {
            if (err instanceof nlobjError) {
                ScriptBase.Log.ErrorObject('Unknown nlobjError', err);
            }
            else {
                ScriptBase.Log.Error('Unknown Error', err.message);
            }

            throw err;
        }
    }
};

/*
 * Main controller for the process
 */
function process() {
    try {
        getParameters();

        //Rev Arr Id set as a parameter for testing purposes
        var arrangementID = ScriptBase.Parameters.custscript_asc_pullover_arr_id;
        if (!ScriptBase.CU.IsNullOrEmpty(arrangementID))
            processSingleArrangement(arrangementID);
        else
            processMultipuleArrangements();

    } catch (err) {
        logError(err, 'process');
    }
};

function processSingleArrangement(arrangementID) {
    var startProcessBench = ScriptBase.Log.StartBenchmark('processSingleArrangement');
    try {
        ScriptBase.RevArrangement = nlapiLoadRecord('revenuearrangement', arrangementID);
        var ignoreValidation = ScriptBase.Parameters.custscript_asc_pullover_ignore_val;
        ScriptBase.Log.Debug('Ignore Validation', ignoreValidation);

        if (ScriptBase.CU.IsNullOrEmpty(ignoreValidation) || ignoreValidation == 'F') {
            var continueToProcess = isArrangementValid();
            ScriptBase.Log.Debug('Continue To Process', continueToProcess);
            if (continueToProcess == false)
                return;
        }

        ScriptBase.Transactions = [];
        ScriptBase.RevenueElements = [];
        var sourceIDs = getSourceIDS();
        getTransactionIDs(sourceIDs);
        mergeIntoTransactions(sourceIDs);
        processTransactions();
        updateRevenueArrangement();
        updateOpportunities();
    }
    catch (err) {
        logError(err, 'processSingleArrangement');
    }
    ScriptBase.Log.EndBenchmark('processSingleArrangement', startProcessBench);
};

function processMultipuleArrangements() {
    var startProcessBench = ScriptBase.Log.StartBenchmark('processMultipuleArrangements');
    try {
        ScriptBase.RevArrangements = [];
        var ignoreValidation = ScriptBase.Parameters.custscript_asc_pullover_ignore_val;
        ScriptBase.Log.Debug('Ignore Validation', ignoreValidation);

        getArrangements(null);

        for (var i = 0; i < ScriptBase.RevArrangements.length; i++) {
            var arrangementID = ScriptBase.RevArrangements[i];
            ScriptBase.RevArrangement = nlapiLoadRecord('revenuearrangement', arrangementID);


            if (ScriptBase.CU.IsNullOrEmpty(ignoreValidation) || ignoreValidation == 'F') {
                var continueToProcess = isArrangementValid();
                ScriptBase.Log.Debug('Continue To Process', continueToProcess);
                if (continueToProcess == false)
                    return;
            }

            ScriptBase.Transactions = [];
            ScriptBase.RevenueElements = [];
            var sourceIDs = getSourceIDS();
            getTransactionIDs(sourceIDs);
            mergeIntoTransactions(sourceIDs);
            processTransactions();
            updateRevenueArrangement();
            updateOpportunities();
        }
    }
    catch (err) {
        logError(err, 'processMultipuleArrangements');
    }
    ScriptBase.Log.EndBenchmark('processMultipuleArrangements', startProcessBench);
};


function getArrangements(startID) {
    var processCount = 0;
    var lastId = null;
    try {
        ScriptBase.CheckUsage(5);
        var search = nlapiLoadSearch(null, 'customsearch_r7_606_605_pullover_revrec');

        if (!ScriptBase.CU.IsNullOrEmpty(startID))
            search.addFilter(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', startID));

        var resultSet = search.runSearch();
        resultSet.forEachResult(function (searchResult) {

            ScriptBase.RevArrangements.push(searchResult.getId());
            lastId = searchResult.getId();
            processCount++;

            if (processCount === 4000)
                return false;
            else
                return true;
        });

        if (processCount == 4000)
            getArrangements(lastId);
    }
    catch (err) {
        logError(err, 'getArrangements');
    }
}
/*
 * Retrieve and validate parameters of the script.
 */
function getParameters() {
    ScriptBase.GetParameters([
        'custscript_asc_pullover_arr_id',
        'custscript_asc_pullover_606_book',
        'custscript_asc_pullover_605_book',
        'custscript_asc_pullover_ignore_val',
        'custscript_asc_pullover_error_email',
        'custscript_asc_pullover_primary_book'
    ]);

    var errCode = 'BAD_PARAMETERS';
    if (ScriptBase.CU.IsNullOrEmpty(ScriptBase.Parameters))
        throw nlapiCreateError(errCode, 'Error retrieving script parameters.');

};

/*
 * Validates if the Revenue Arrangement should be processed but this script
 */
function isArrangementValid() {

    var pullOverDate = ScriptBase.RevArrangement.getFieldValue('custbody_r7_revenue_pull_date');
    var isCompliant = ScriptBase.RevArrangement.getFieldValue('compliant');
    var isMergedArrangement = ScriptBase.RevArrangement.getFieldValue('createdfrommergedarrangements');
    //Continue with the process if the Arrangement is marked compliant (compliant) and the Revenue Pull Date (custbody_r7_revenue_pull_date) is empty
    if (isCompliant == 'F' || !ScriptBase.CU.IsNullOrEmpty(pullOverDate) || isMergedArrangement == 'T')
        return false;

    var revenueBook = ScriptBase.RevArrangement.getFieldValue('accountingbook');
    if (revenueBook != ScriptBase.Parameters.custscript_asc_pullover_606_book &&
        revenueBook != ScriptBase.Parameters.custscript_asc_pullover_605_book &&
        revenueBook != ScriptBase.Parameters.custscript_asc_pullover_primary_book)
        return false;

    return true;
}

/*
 * Loops through all of the Revenue Elements and gets all of the unique source ids
 */
function getSourceIDS() {
    var sourceIDs = [];
    try {
        var sublist = 'revenueelement';
        var lineCount = ScriptBase.RevArrangement.getLineItemCount(sublist);
        //Start at 1 as NetSuite as the lines starting at 1 if you start at 0 it will fail
        for (var i = 1; i <= lineCount; i++) {
            ScriptBase.RevArrangement.selectLineItem(sublist, i);
            var sourceID = ScriptBase.RevArrangement.getCurrentLineItemValue(sublist, 'sourceid');
            var allocationAmount = ScriptBase.RevArrangement.getCurrentLineItemValue(sublist, 'allocationamount');
            var id = ScriptBase.RevArrangement.getCurrentLineItemValue(sublist, 'revenueelement');

            var revenueElement = new RevenueElement();
            revenueElement.Amount = allocationAmount;
            //add rev element field here for primary book overwrite of 606
            revenueElement.SourceID = sourceID;
            revenueElement.ElementID = id;
            ScriptBase.RevenueElements.push(revenueElement);
            sourceIDs.push(sourceID);
        }
    }
    catch (err) {
        logError(err, 'getSourceIDS');
    }
    return sourceIDs;
};

/*
 * Gets all of the Transaction IDs based off of the Source IDS
 */
function getTransactionIDs(sourceIDs) {
    try {
        var lastId = null;
        var processCount = 0;

        for (var i = 0; i < sourceIDs.length; i++) {
            var sourceid = sourceIDs[i];
            var filters = [];
            var columns = [];

            filters.push(new nlobjSearchFilter('lineuniquekey', null, 'equalto', sourceid));
            filters.push(new nlobjSearchFilter('mainline', null, 'is', 'F'));

            columns.push(new nlobjSearchColumn('internalid').setSort());
            columns.push(new nlobjSearchColumn('lineuniquekey'));

            var search = nlapiCreateSearch('transaction', filters, columns);
            var resultSet = search.runSearch();

            ScriptBase.CheckUsage(10);
            resultSet.forEachResult(function (searchResult) {
                var trandID = searchResult.getId();

                for (var x = 0; x < ScriptBase.Transactions.length; x++) {
                    var transaction = ScriptBase.Transactions[x];
                    if (trandID == transaction.ID) {
                        var transactionLine = new TransactionLine();
                        transactionLine.UniqueID = searchResult.getValue('lineuniquekey');
                        transaction.Lines.push(transactionLine);
                        trandID = null;
                        break;
                    }
                }

                if (!ScriptBase.CU.IsNullOrEmpty(trandID)) {
                    var transaction = new Transaction();
                    transaction.ID = trandID;

                    var transactionLine = new TransactionLine();
                    transactionLine.UniqueID = searchResult.getValue('lineuniquekey');
                    transaction.Lines.push(transactionLine);

                    ScriptBase.Transactions.push(transaction);
                }
                processCount++;

                if (processCount === 4000)
                    return false;
                else
                    return true;
            });
        }
    }
    catch (err) {
        logError(err, 'getTransactionIDs');
    }
}

/* 
 * Merges the sourceIDs into the Transaction list and updates the lines with the amount and Element info
 */
function mergeIntoTransactions(sourceIDs) {
    try {
        var is606 = false;
        var revenueBook = ScriptBase.RevArrangement.getFieldValue('accountingbook');
        if (revenueBook == ScriptBase.Parameters.custscript_asc_pullover_606_book || revenueBook == ScriptBase.Parameters.custscript_asc_pullover_primary_book)
            is606 = true;

        for (var i = 0; i < ScriptBase.Transactions.length; i++) {
            var transaction = ScriptBase.Transactions[i];

            for (var y = 0; y < transaction.Lines.length; y++) {
                var transactionLine = transaction.Lines[y];

                //Tripe loop to ensure we get the correct line as the line has the uniqueID that is the same as the sourceID on the element 
                for (var x = 0; x < ScriptBase.RevenueElements.length; x++) {
                    var source = ScriptBase.RevenueElements[x];
                    if (source.SourceID == transactionLine.UniqueID) {
                        transactionLine.Amount = source.Amount;
                        transactionLine.ElementID = source.ElementID;

                        if (revenueBook == ScriptBase.Parameters.custscript_asc_pullover_606_book || revenueBook == ScriptBase.Parameters.custscript_asc_pullover_primary_book) {
                            transactionLine.Is606 = true;
                            transaction.Is606 = true;
                        }
                        else {
                            transactionLine.Is605 = true;
                            transaction.Is605 = true;
                        }
                        break;
                    }
                }
            }
        }
    }
    catch (err) {
        logError(err, 'mergeIntoTransactions');
    }
}

/*
 * Loops through each Transaction loads it and updates the line to point to the element and update the correct amount custom field
 */
function processTransactions() {
    try {
        var sublist = 'item';
        //TODO: Remove once figured out
        var arr = ScriptBase.RevArrangement;

        for (var i = 0; i < ScriptBase.Transactions.length; i++) {
            var transaction = ScriptBase.Transactions[i];

            //Checks to see if we have enough governance left to preform a query(10), load(10) and save(20) if not we will yield to prevent any errors
            ScriptBase.CheckUsage(50);
            var recordType = getRecordType(transaction.ID);

            if (transaction.Is606)
                nlapiSubmitField(recordType, transaction.ID, 'custbody_r7_606_allocation_assigned', 'F');
            else
                nlapiSubmitField(recordType, transaction.ID, 'custbody_r7_605_allocation_assigned', 'F');

            //gets the record type as it may not always be an order
            var record = nlapiLoadRecord(recordType, transaction.ID);

            var lineCount = record.getLineItemCount(sublist);
            //Start at 1 as NetSuite as the lines starting at 1 if you start at 0 it will fail
            for (var x = 1; x <= lineCount; x++) {
                record.selectLineItem(sublist, x);
                var lineuniquekey = record.getCurrentLineItemValue(sublist, 'lineuniquekey');

                for (var z = 0; z < transaction.Lines.length; z++) {
                    var transactionLine = transaction.Lines[z];

                    if (transactionLine.UniqueID == lineuniquekey) {
                        if (transactionLine.Is606 == true) {
                            record.setCurrentLineItemValue(sublist, 'custcol_r7_606_rev_amount', transactionLine.Amount);
                            record.setCurrentLineItemValue(sublist, 'custcol_r7_606_rev_element', transactionLine.ElementID);
                            record.setFieldValue('custbody_r7_606_allocation_assigned', 'T');
                        }
                        else {
                            record.setCurrentLineItemValue(sublist, 'custcol_r7_605_rev_amount', transactionLine.Amount);
                            record.setCurrentLineItemValue(sublist, 'custcol_r7_605_rev_element', transactionLine.ElementID);
                            record.setFieldValue('custbody_r7_605_allocation_assigned', 'T');
                        }

                        record.commitLineItem(sublist);
                    }
                }
            }

            nlapiSubmitRecord(record);
        }
    }
    catch (err) {
        logError(err, 'processTransactions');
    }
}

/*
 * Find the record type of the given id
 */
function getRecordType(recordId) {

    var stColumnFilters = [];
    stColumnFilters.push(new nlobjSearchFilter('internalid', null, 'anyof', recordId));
    stColumnFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));

    var stColumnColumns = [];
    stColumnColumns.push(new nlobjSearchColumn('recordType'));

    var stResults = nlapiSearchRecord('transaction', null, stColumnFilters, stColumnColumns);

    if (stResults) {
        for (var x = 0; x < stResults.length; x++) {
            var restulrt = stResults[x];

            return restulrt.getValue('recordType');
        }
    }
}

/*
 * Updates the Arrangement with date and time of now to signify when the last sync was made
 */
function updateRevenueArrangement() {
    try {
        var dateTime = new Date();
        ScriptBase.RevArrangement.setFieldValue('custbody_r7_revenue_pull_date', dateTime);
        nlapiSubmitRecord(ScriptBase.RevArrangement);
    }
    catch (err) {
        logError(err, 'processTransactions');
    }
}

/*
 *Triggers a save on all opportunities linked to the Sales Order to recompute the ACV value
 */
function updateOpportunities() {
    try {
        for (var i = 0; i < ScriptBase.Transactions.length; i++) {
            var transaction = ScriptBase.Transactions[i];
            var transactionIDs = [];
            transactionIDs.push(transaction.ID);

            var opportunities = getOpportunitiesFromID(transactionIDs);

            for (var x = 0; x < opportunities.length; x++) {
                //Checks to see if we have enough governance left to preform a nlapiLookupField(10) if not we will yield to prevent any errors
                ScriptBase.CheckUsage(10);
                var opportunity = opportunities[x];
                ScriptBase.Log.Error('update opportunity', opportunity);
                var updateOpp = nlapiLookupField('opportunity', opportunity, 'custbodyr7_calculate_acv');

                if (updateOpp == 'T') {
                    //Checks to see if we have enough governance left to preform a nlapiLoadRecord(10) and nlapiSubmitRecord(20) if not we will yield to prevent any errors
                    ScriptBase.CheckUsage(30);
                    var OppRecord = nlapiLoadRecord('opportunity', opportunity);
                    nlapiSubmitRecord(OppRecord);
                }
            }
        }
    }
    catch (err) {
        logError(err, 'updateOpportunities');
    }
}

/* 
* Looks up all opportunities for the transactions ID
*/
function getOpportunitiesFromID(transactionIDs) {
    var ids = [];
    try {
        var lastId = null;
        var processCount = 0;
        var filters = [];
        var columns = [];

        filters.push(new nlobjSearchFilter('custcolr7createdfromra', null, 'anyof', transactionIDs));

        columns.push(new nlobjSearchColumn('internalid').setSort());

        var search = nlapiCreateSearch('opportunity', filters, columns);
        var resultSet = search.runSearch();

        ScriptBase.CheckUsage(10);
        resultSet.forEachResult(function (searchResult) {
            var id = searchResult.getId();

            if (ids.indexOf(id) == -1)
                ids.push(id);
            processCount++;

            if (processCount === 4000)
                return false;
            else
                return true;
        });
    }
    catch (err) {
        logError(err, 'getOpportunitiesFromID');
    }
    return ids;
}
/*
 * Logs the error and sends an error email
 */
function logError(err, func) {
    var msg = '';
    if (err instanceof nlobjError) {
        ScriptBase.Log.ErrorObject('Unknown nlobjError during module: ' + func, err);
        msg += 'Code: ' + err.getCode() + '\n';
        msg += 'Details: ' + err.getDetails() + '\n\n';
        sendEmail('Unknown nlobjError during module: ' + func, msg);
    }
    else {
        ScriptBase.Log.Error('Unknown Error Occurred during module: ' + func, err.message);
        msg += 'Details: ' + err.message + '\n\n';
        sendEmail('Unknown Error Occurred during module: ' + func, msg);
    }
}

/*
 * Sends email with the error to alert everyone about the issue
 */
function sendEmail(subject, body) {
    try {
        var recipients = ScriptBase.Parameters.custscript_asc_pullover_error_email;

        if (ScriptBase.CU.IsNullOrEmpty(recipients))
            return;

        ScriptBase.CheckUsage(10);
        nlapiSendEmail(-5, recipients, subject, body);
    }
    catch (err) {
        if (err instanceof nlobjError) {
            ScriptBase.Log.ErrorObject('Error Sending Email', err);
        }
        else {
            ScriptBase.Log.Error('Error Sending Email', err.message);
        }
        throw err;
    }
}