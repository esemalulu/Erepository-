/*
 * @author efagone
 */

function zc_ra_createRenewalScheduled() {

    var timeLimitInMinutes = 10;
    this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
    this.startingTime = new Date().getTime();
    this.context = nlapiGetContext();
    this.rescheduleScript = false;

    nlapiLogExecution('AUDIT', 'User', nlapiGetUser());
    nlapiLogExecution('AUDIT', 'Role', nlapiGetRole());

    var searchId = context.getSetting('SCRIPT', 'custscriptr7_autocreaterenewal_searchid');

    if (searchId == null || searchId == '') {
        nlapiLogExecution('AUDIT', 'Nothing to renew', 'No search specified');
        return;
    }

    autoRenewOrders(searchId);
    //autoRenewOrders(17968);

    if (rescheduleScript) {
        nlapiLogExecution('DEBUG', 'Rescheduling script', context.getScriptId());
        nlapiScheduleScript(context.getScriptId());
    }

}

function autoRenewOrders(searchId) {
    var RECORD_HAS_BEEN_CHANGED = 'Record has been changed';
    //var objRADetails = new raDetailsObject();
    //objRADetails.salesorder = 3387208;

    //var objResponse = run_renewal_automation(objRADetails);
    var arrFilters = [];
    arrFilters[arrFilters.length] = new nlobjSearchFilter('type', null, 'anyof', 'SalesOrd');
    arrFilters[arrFilters.length] = new nlobjSearchFilter('custbodyr7renewaloppcreated', null, 'is', 'F');
    //arrFilters[arrFilters.length] = new nlobjSearchFilter('custbodyr7_renewalautomation_error', null, 'isempty');

    var objSearch = nlapiLoadSearch(null, searchId);
    objSearch.addFilters(arrFilters);
    var resultSet = objSearch.runSearch();

    var rowNum = 0;
    do {
        var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
        for (var i = 0; resultSlice != null && i < resultSlice.length && timeLeft() && unitsLeft() ; i++) {

            var columns = resultSlice[i].getAllColumns();
            var resultId = resultSlice[i].getValue(columns[0]);
            var firstColumn = columns[0].getName();

            if (firstColumn != 'internalid') {
                arrErrorLog.push('Invalid search results for Automatic Renewal Creation Search. Please update search in Renewal Automation Settings to have internal id of Sales Order to be renewed as first column.');
                break;
            }

            nlapiLogExecution('DEBUG', 'Renewing', resultId);

            try {
                var objRADetails = new raDetailsObject();
                objRADetails.salesorder = resultId;
                objRADetails.defaultCSM = context.getSetting('SCRIPT', 'custscriptr7_default_csm');
                var objResponse = run_renewal_automation(objRADetails);
                if (!objResponse.success) {
                    try {
                        // only submit error if it is not 'Record has been changed', otherwise let it be processed on the next run
                        if (objResponse.error && objResponse.error.indexOf(RECORD_HAS_BEEN_CHANGED) === -1) {
                            nlapiSubmitField('salesorder', resultId, 'custbodyr7_renewalautomation_error', objResponse.error);
                        } else {
                            // else just log the error
                            nlapiLogExecution('DEBUG', 'ignore error:', 'RECORD_HAS_BEEN_CHANGED error occured, but was ignored. Transaction will be processed on the next run');
                        }
                    }
                    catch (e2) {

                    }
                    nlapiLogExecution('ERROR', 'Could not auto renew Sales Order' + resultId, objResponse.error);
                }
            }
            catch (e) {
                try {
                    if (e.indexOf(RECORD_HAS_BEEN_CHANGED) === -1) {
                        nlapiSubmitField('salesorder', resultId, 'custbodyr7_renewalautomation_error', e);
                    }
                }
                catch (e2) {

                }
                if (e.indexOf(RECORD_HAS_BEEN_CHANGED) === -1) {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR ' + resultId, e);
                }
            }
            rowNum++;
        }
    }
    while (resultSlice.length >= 1000 && !rescheduleScript);
}

function timeLeft() {
    var presentTime = new Date().getTime();
    if (presentTime - startingTime > timeLimitInMilliseconds) {
        nlapiLogExecution('DEBUG', 'Ran out of time', 'yup');
        rescheduleScript = true;
        return false;
    }
    return true;
}

function unitsLeft() {
    var unitsLeft = context.getRemainingUsage();
    if (unitsLeft <= 100) {
        nlapiLogExecution('DEBUG', 'Ran out of units', 'yup');
        rescheduleScript = true;
        return false;
    }
    return true;
}
