/**
* Calculate totals and reset timing and duration
*
* @param {String} opportunityId
* @return {Void}
*/
function adHobTriggerOppTotalCalc() {

    var oppssid = nlapiGetContext().getSetting('SCRIPT', 'custscript_sct324_oppssid');
    var lastProcOppId = nlapiGetContext().getSetting('SCRIPT','custscript_sct324_lastid');
    
    //Assume this Saved Search will main line only saved search
    var oppflt = null;
    //var oppcol = [new nlobjSearchColumn('internalid').setSort(true)];    
    if (lastProcOppId) {
    	oppflt = [new nlobjSearchFilter('internalidnumber', null, 'lessthan',lastProcOppId)];
    }
    
    var opprs = nlapiSearchRecord(null, oppssid, oppflt, null);
    
    //go through each opp and execute same logic as sweet_opp_calc_Totals.js file
    for (var t=0; opprs && t < opprs.length; t++) {
    	nlapiLogExecution('debug','oppid',t+' :: '+opprs[t].getId());
    	var opportunityId = opprs[t].getId();
    	
    	if (opportunityId) {
    		
    		var toOppCurrRate = nlapiExchangeRate('GBP', opprs.getValue('currency'), opprs.getValue('trandate'));
    		
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
            		nlapiLogExecutioni('debug','multi count // total', multiCurrSoCount+' // '+totalGbtSoAmount);
            		
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
            		nlapiLogExecutioni('debug','multi count // total', multiCurrQtCount+' // '+totalGbtQtAmount);
            		
            		//Set it to propepr variable
            		openQtCount = multiCurrQtCount;
            		openQtAmount = parseFloat(totalGbtQtAmount) * parseFloat(toOppCurrRate);
            	}
            }
            
            nlapiLogExecution('debug','New Quote Count', openQtCount);
            nlapiLogExecution('debug','New Quote Amount', openQtAmount);
            
            //************ Update Opportunity ***
            
            var oppIsTrx = 'F';
            if (openQtCount > 0 || soCount > 0) {
            	oppIsTrx = 'T';
            }
            
            // Calculate Remaining amount
            //Loading the Opp rec since lookup is returning different value
            var opprec = nlapiLoadRecord('opportunity', opportunityId);
            
            var remainingAmount = parseFloat(opprec.getFieldValue('projectedtotal')) - openQtAmount - soAmount;
            nlapiLogExecution('debug','Projected Total // Remaining', opprec.getFieldValue('projectedtotal')+' // '+remainingAmount);
            
            try {
            	opprec.setFieldValue('custbody_op_istransaction', oppIsTrx);
                opprec.setFieldValue('custbody_op_quotecount', openQtCount);
                opprec.setFieldValue('custbody_op_quoteamount', openQtAmount);
                opprec.setFieldValue('custbody_op_socount', soCount);
                opprec.setFieldValue('custbody_op_soamount', soAmount);
                //opprec.setFieldValue('custbody_op_remainingamount', remainingAmount);
                
                nlapiSubmitRecord(opprec, false, true);
            } catch (updateerr) {
            	nlapiLogExecution('error','Error Updating Opp ID: '+opportunityId, getErrText(updateerr));
    		}
    	}
	  	//Set % completed of script processing
		var pctCompleted = Math.round(((t+1) / opprs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
	
		//reschedule logic
		if ((t+1)==1000 || ((t+1) < opprs.length && nlapiGetContext().getRemainingUsage() < 300)) {
			//reschedule
			nlapiLogExecution('debug','Getting Rescheduled at', opprs[t].getId());
			var rparam = new Object();
			rparam['custscript_sct324_lastid'] = opprs[t].getId();
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			break;
		}
    }
}
