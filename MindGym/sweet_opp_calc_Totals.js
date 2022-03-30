/**
* Calculate totals and reset timing and duration
*
* @param {String} opportunityId
* @return {Void}
*/
function sweet_opportunity_calc_Totals() {

    var context = nlapiGetContext();
    var opportunityId = context.getSetting('SCRIPT', 'custscript_opportunity');
    
    if (opportunityId) {
    	
    	// Calculate Remaining amount
        //Loading the Opp rec since lookup is returning different value
        var opprec = nlapiLoadRecord('opportunity', opportunityId);
        
        var toOppCurrRate = nlapiExchangeRate('GBP', opprec.getFieldValue('currency'), opprec.getFieldValue('trandate'));
    	
        nlapiLogExecution('DEBUG', 'Start', 'script start using Deployment ID: '+nlapiGetContext().getDeploymentId());
        nlapiLogExecution('DEBUG', 'Opportunity Id', opportunityId);

        // Create Sales Order filter
        var soflts = [
                       new nlobjSearchFilter('opportunity', null, 'anyof', opportunityId),
                       new nlobjSearchFilter('mainline', null, 'is', 'T')
        			  ];

        //Define columns for Sales order
        //Due to potentially new changes in NS, root currency value is being returned. use faxmount
        var socols = [
                      new nlobjSearchColumn('internalid', null, 'count'),
                      new nlobjSearchColumn('total', null, 'sum'),
                      //Below added 5/29/2015 due to root currency issue
                      new nlobjSearchColumn('fxamount', null, 'sum'),
                      new nlobjSearchColumn('currency', null, 'group')];
        
        var sors = nlapiSearchRecord('salesorder', null, soflts, socols);
        
        //---- Grab Sales Order Counts
        var soCount = 0;
        var soAmount = 0.0;
        
      //6/1/2015
        //- Due to root currency being display, we are using fxamount instead.
        //  However, if multiple currency is found, below steps will be taken
        //		1. Add up "total" amount. = This will be GBT total amount
        //		2. Convert to Opportunity Currency using Opportunity TRX Date
        if (sors && sors.length > 0)
        {
        	if (sors.length == 1) 
        	{
        		soCount = parseInt(sors[0].getValue('internalid', null, 'count'));
        		soAmount = (sors[0].getValue('fxamount', null, 'sum')?parseFloat(sors[0].getValue('fxamount', null, 'sum')):0.0);
        	}
        	else
        	{
        		var multiCurrSoCount = 0, totalGbtSoAmount = 0.0;
        		for (var mc=0; mc < sors.length; mc+=1)
        		{
        			multiCurrSoCount += parseInt(sors[mc].getValue('internalid', null, 'count'));
        			totalGbtSoAmount += parseFloat(sors[mc].getValue('total', null, 'sum'));
        		}
        		nlapiLogExecution('debug','multi count // total', multiCurrSoCount+' // '+totalGbtSoAmount);
        		
        		//Set it to propepr variable
        		soCount = multiCurrSoCount;
        		soAmount = parseFloat(totalGbtSoAmount) * parseFloat(toOppCurrRate);
        	}
        }
       
        nlapiLogExecution('debug','New So Count', soCount);
        nlapiLogExecution('debug','New So Amount', soAmount);
        
        //Legacy Version
        // Run the search query for sales orders
        //var results = nlapiSearchRecord('salesorder', null, filters);

        //----------- Query Quotes ---
        
        //Look for OPEN Quotes ONLY
        var qtflts = [new nlobjSearchFilter('opportunity', null, 'anyof', opportunityId),
                      new nlobjSearchFilter('mainline', null, 'is', 'T'),
                      new nlobjSearchFilter('status', null, 'anyof',['Estimate:A'])];
        
        //Define columns for quote
        var qtcols = [new nlobjSearchColumn('internalid',null,'count'),
                      new nlobjSearchColumn('amount', null, 'sum'),
                      //Below added 5/29/2015 due to root currency issue
                      new nlobjSearchColumn('fxamount', null, 'sum'),
                      new nlobjSearchColumn('currency', null, 'group')];
        
        var qtrs = nlapiSearchRecord('estimate', null, qtflts, qtcols);
        
        var openQtCount = 0;
        var openQtAmount = 0.0;
      //6/1/2015
        //- Due to root currency being display, we are using fxamount instead.
        //  However, if multiple currency is found, below steps will be taken
        //		1. Add up "total" amount. = This will be GBT total amount
        //		2. Convert to Opportunity Currency using Opportunity TRX Date
        if (qtrs && qtrs.length > 0) 
        {
        	if (qtrs.length == 1) 
        	{
        		openQtCount = parseInt(qtrs[0].getValue('internalid', null, 'count'));
        		openQtAmount = (qtrs[0].getValue('fxamount', null, 'sum')?parseFloat(qtrs[0].getValue('fxamount', null, 'sum')):0.0);
        	}
        	else
        	{
        		var multiCurrQtCount = 0, totalGbtQtAmount = 0.0;
        		for (var mc=0; mc < qtrs.length; mc+=1)
        		{
        			multiCurrQtCount += parseInt(qtrs[mc].getValue('internalid', null, 'count'));
        			totalGbtQtAmount += parseFloat(qtrs[mc].getValue('amount', null, 'sum'));
        		}
        		nlapiLogExecution('debug','multi count // total', multiCurrQtCount+' // '+totalGbtQtAmount);
        		
        		//Set it to propepr variable
        		openQtCount = multiCurrQtCount;
        		openQtAmount = parseFloat(totalGbtQtAmount) * parseFloat(toOppCurrRate);
        	}
        }        
        
        nlapiLogExecution('debug','New Quote Count', openQtCount);
        nlapiLogExecution('debug','New Quote Amount', openQtAmount);
        
        //************ Update Opportunity ****/
        var oppIsTrx = 'F';
        if (openQtCount > 0 || soCount > 0) {
        	oppIsTrx = 'T';
        }
        
        var remainingAmount = parseFloat(opprec.getFieldValue('projectedtotal')) - openQtAmount - soAmount;
        nlapiLogExecution('debug','Projected Total // Remaining', opprec.getFieldValue('projectedtotal')+' // '+remainingAmount);
        
        opprec.setFieldValue('custbody_op_istransaction', oppIsTrx);
        opprec.setFieldValue('custbody_op_quotecount', openQtCount);
        opprec.setFieldValue('custbody_op_quoteamount', openQtAmount);
        opprec.setFieldValue('custbody_op_socount', soCount);
        opprec.setFieldValue('custbody_op_soamount', soAmount);
        opprec.setFieldValue('custbody_op_remainingamount', remainingAmount);

        try {
        	nlapiSubmitRecord(opprec, false, true);
        } catch (upderr) {
        	//RCRD_HAS_BEEN_CHANGED
        	if (getErrText(upderr).indexOf('RCRD_HAS_BEEN_CHANGED') > -1) {
        		nlapiLogExecution('audit','Trying again due to Rec. Changed Error','Trying again');
        		//reload and try again
        		var retopp = nlapiLoadRecord('opportunity', opportunityId);
        		retopp.setFieldValue('custbody_op_istransaction', oppIsTrx);
        		retopp.setFieldValue('custbody_op_quotecount', openQtCount);
        		retopp.setFieldValue('custbody_op_quoteamount', openQtAmount);
        		retopp.setFieldValue('custbody_op_socount', soCount);
        		retopp.setFieldValue('custbody_op_soamount', soAmount);
        		retopp.setFieldValue('custbody_op_remainingamount', remainingAmount);
        		
        		try 
        		{
        			nlapiSubmitRecord(retopp, false, true);
        		}
        		catch(retryerr)
        		{
        			//check for UNEXPECTED_ERROR and if so try once more
        			if (getErrText(retryerr).indexOf('UNEXPECTED_ERROR') > -1)
        			{
        				nlapiLogExecution('audit','Trying again after Retry fail due to unexpected error','Trying again for 2nd time');
        				nlapiSubmitRecord(retopp, false, true);
        			}
        		}
        	}
        }
        
        
        //Legacy Version
        // Run the search query for quotes
        //filters.push(new nlobjSearchFilter('custbody_sales_order_count', null, 'equalto', 0));
        //var qresults = nlapiSearchRecord('estimate', null, filters);
        // Calculate Booked total
        /**
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
		
        // Calculate Remaining amount
        var remainingAmount = parseFloat(opportunity.getFieldValue('projectedtotal')) - bookedTotal - quotedtotal;
        if (remainingAmount < 0) {
            remainingAmount = 0;
        }
        var weightedTotal = parseFloat(opportunity.getFieldValue('probability')) / 100 * remainingAmount;
        nlapiLogExecution('DEBUG', 'booked total', bookedTotal);
        nlapiLogExecution('DEBUG', 'quoted total', quotedtotal);
        // Set field values in opportunity record
        opportunity.setFieldValue('custbody_op_bookedtotal', bookedTotal);
        opportunity.setFieldValue('custbody_op_quotedtotal', quotedtotal);
        opportunity.setFieldValue('custbody_op_remainingamount', remainingAmount);
        opportunity.setFieldValue('custbody_op_weightedtotal', weightedTotal);

        // Submit opportunity record with the changes
        nlapiSubmitRecord(opportunity);
        */
        
    }
    nlapiLogExecution('DEBUG', 'End', 'script ends');
}
