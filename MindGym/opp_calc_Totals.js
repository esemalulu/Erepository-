/**
* Calculate totals and reset timing and duration
*
* @param {String} opportunityId
* @return {Void}
*/
function sweet_opp_calc_Totals() {

    var context = nlapiGetContext();
    var opportunityId = context.getSetting('SCRIPT', 'custscript_opportunity');
    
    if (opportunityId) {
        nlapiLogExecution('DEBUG', 'Start', 'script starts');
        // Create the filter
        var filters = new Array();
        filters.push(new nlobjSearchFilter('opportunity', null, 'is', opportunityId));
        filters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));

        // Run the search query for sales orders
        var results = nlapiSearchRecord('salesorder', null, filters);

        // Run the search query for quotes
        filters.push(new nlobjSearchFilter('custbody_sales_order_count', null, 'equalto', 0));
        var qresults = nlapiSearchRecord('estimate', null, filters);

        // Calculate Booked total
        var bookedTotal = 0;

        for (var i = 0; results != null && i < results.length; i++) {
            var record = nlapiLoadRecord('salesorder', results[i].getId());
            bookedTotal = bookedTotal + parseFloat(record.getFieldValue('total'));
        }

        // Calculate Quoted total
        var quotedtotal = 0;

        for (var i = 0; qresults != null && i < qresults.length; i++) {
            var qrecord = nlapiLoadRecord('estimate', qresults[i].getId());
            quotedtotal = quotedtotal + parseFloat(qrecord.getFieldValue('total'));
        }

        // Retrieve opportunity record
        var opportunity = nlapiLoadRecord('opportunity', opportunityId);

        // Calculate Remaining amount
        var remainingAmount = parseFloat(opportunity.getFieldValue('projectedtotal')) - bookedTotal - quotedtotal;
        if (remainingAmount < 0) {
            remainingAmount = 0;
        }
        var weightedTotal = parseFloat(opportunity.getFieldValue('probability')) / 100 * remainingAmount;

        // Set field values in opportunity record
        opportunity.setFieldValue('custbody_op_bookedtotal', bookedTotal);
        opportunity.setFieldValue('custbody_op_quotedtotal', quotedtotal);
        opportunity.setFieldValue('custbody_op_remainingamount', remainingAmount);
        opportunity.setFieldValue('custbody_op_weightedtotal', weightedTotal);

        // Submit opportunity record with the changes
        nlapiSubmitRecord(opportunity);

        // initiate workflow
        SWEET.Opportunity.createMonthlyForecast(opportunityId);
    }
    nlapiLogExecution('DEBUG', 'End', 'script ends');
}
