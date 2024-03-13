/**
 * Module Description
 /*
 * Function Checks Customers/Prospects/Leads for Watchdog Result before License Issuing.
 * customerId - id of current customer
 * customerType - current customer record type
 * @returns {undefined}
 */
function checkWatchdogResult(customerId, customerType) {
    var rpsFields = getRPSFields(customerId, customerType);
    /*
    * 1 - No Match
    * 2 - Potential Match
    * 3 - True Match
    */
    if (rpsFields.status == 2 || rpsFields.status == 3 || rpsFields.status == null) {
        alert('According to our Global Trade Management system, this record requires further legal review prior to issuing any software licenses.\n\
        	You must contact Legal at export@rapid7.com in order to proceed with this request.');
        return;
    }
    if (rpsFields.status == 1) {
        var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7createlicensefromtemplate', 'customdeployr7createlicensefromtemplate', false);
        var url = suiteletURL + '&custparam_customer=' + nlapiGetRecordId();
        window.open(url, "", "width=500,height=500");
    }
}

/*
 * Function returns array of Restricted Party Status fields values
 */
function getRPSFields(customerId, customerType){
    var rpsFields = {status: null, lastCheck: null};
    try{
        var select = nlapiLookupField(customerType, customerId, ['custentity_r7_watchdogresult']);
        rpsFields = {
            status: select.custentity_r7_watchdogresult==''?null:select.custentity_r7_watchdogresult
        };
    }
    catch (e){
        nlapiLogExecution('ERROR', 'Error getting RPS fields', e);
    }
    return rpsFields;
}
