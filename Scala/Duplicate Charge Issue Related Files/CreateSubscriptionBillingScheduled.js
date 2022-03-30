/**
 * @author MBennett
 */
function createSubscriptionBilling()
{
	var vInputCtr = 0;
	var vOutputCtr = 0;
 	var usageThreshold = 100;
	var vCustRecordID;
	var vCustomerID;
	var vPrice = 0;
	var vItemID = '';
	var vCancelledDate;
	var vBillingDay = 0;
	var vCCDefault;
	var vCCExpDate;
	var vCCName;
	var vCCNumber;
	var vCCPaymentMethod;
	var vCCLines = 0;
	
	/**
	 * Mod: 7/16/2013 - json@audaxium
	 * Removed unnecessary coding to format dates.
	 * Used NetSuite provided Date API.
	 */
	var vCurrentDate = new Date();
	
	var vFormattedCurrentDate = nlapiDateToString(vCurrentDate);
	var vNextMonthDateObj = nlapiAddMonths(vCurrentDate, 1);
	
	// Define search filters
	/**
	 * Mod: 7/16/2013 - json@audaxium
	 * Based on clients request, ONLY execute records where Next Billing Date is Current Date (Today) and Canceled date is EMPTY
	 */
	
	
	
	var filters = [new nlobjSearchFilter('custrecord_cc_next_date', null, 'on', vFormattedCurrentDate),
	               new nlobjSearchFilter('custrecord_cc_canceled_date', null, 'isempty','')];

	// Define search columns
	var columns = [new nlobjSearchColumn('custrecord_cc_customer'), //linked customer
	               new nlobjSearchColumn('custrecord_cc_price'), //price (Currency)
	               new nlobjSearchColumn('custrecord_cc_canceled_date'), //Canceled Date
	               new nlobjSearchColumn('custrecord_cc_billing_cycle_day'), //Billing Cycle days (Integer)
	               new nlobjSearchColumn('custrecord_cc_item')];
	
	var searchresults = nlapiSearchRecord( 'customrecord_subscription_billing', null, filters, columns);

	if (searchresults != null)
		nlapiLogExecution('DEBUG', 'Script Start', 'Number of records returned = ' + searchresults.length); 

	// Loop through all search results. When the results are returned, use methods
	var updFlds = ['custrecord_cc_billing_failed_date','custrecord_cc_comments'];
	var updVals = new Array();
	
	for ( var i = 0; searchresults != null && i < searchresults.length; i++ )
	{
		var remainingUsagePoints = nlapiGetContext().getRemainingUsage();
		
        if (remainingUsagePoints > usageThreshold) 
		{
			vInputCtr = vInputCtr + 1;
			
			var searchresult = searchresults[i];
			vCustRecordID = searchresult.getId();
			vCustomerID = searchresult.getValue('custrecord_cc_customer');
			vPrice = searchresult.getValue('custrecord_cc_price');
			vCancelledDate = searchresult.getValue('custrecord_cc_canceled_date');
			vBillingDay = searchresult.getValue('custrecord_cc_billing_cycle_day');
			vItemID = searchresult.getValue('custrecord_cc_item');
	
			nlapiLogExecution('DEBUG', 'Field Values', 'vCustomerID = ' + vCustomerID + ', vPrice = ' + vPrice + ', vCancelledDate = ' + vCancelledDate + ', vBillingDay = ' + vBillingDay + ', vItemID = ' + vItemID + ', vCustRecordID = ' + vCustRecordID); 

			// first we get the customer record so we can get it's cc info
            try 
            {
				var Customer = nlapiLoadRecord('customer', vCustomerID)
			
				var vSub = Customer.getFieldValue('subsidiary');
				vCCLines = Customer.getLineItemCount('creditcards');
				
				nlapiLogExecution('DEBUG', 'vCCLines', 'vCCLines = ' + vCCLines); 
			
			
				// First let's spin through the lines and see how many are ready to ship
				for (var j = 1; j <= vCCLines; j++) {
					vCCDefault = Customer.getLineItemValue('creditcards', 'ccdefault', j);
					vCCExpDate = Customer.getLineItemValue('creditcards', 'ccexpiredate', j);
					vCCName = Customer.getLineItemValue('creditcards', 'ccname', j);
					vCCNumber = Customer.getLineItemValue('creditcards', 'ccnumber', j);
					vCCPaymentMethod = Customer.getLineItemValue('creditcards', 'paymentmethod', j);
					
					nlapiLogExecution('DEBUG', 'CC Field Values', 'j = ' + j + ', vCCDefault = ' + vCCDefault + ', vCCExpDate = ' + vCCExpDate + ', vCCName = ' + vCCName + ', vCCNumber = ' + vCCNumber + ', vCCPaymentMethod = ' + vCCPaymentMethod);
				} 
			}
            catch (e) 
            {
            	updVals = new Array();
            	updVals.push(vFormattedCurrentDate);
            	if (e.getDetails != undefined) {
            		updVals.push('Error getting customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID + '. Error Code = ' + e.getCode()+ '. Error Message = ' + e.getDetails());
           			nlapiLogExecution('DEBUG', 'Error', 'Error getting customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID + '. Error Code = ' + e.getCode()+ '. Error Message = ' + e.getDetails()); 
				} else {
					updVals.push('Error Creating Cash Sale');
           			nlapiLogExecution('DEBUG', 'Error', 'Error getting customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID); 
                }
            	
            	nlapiSubmitField('customrecord_subscription_billing', vCustRecordID, updFlds, updVals, true);
            	
				continue;
			}

	
			// now create the cash sale
            try 
            {
		    	var CashSale = nlapiCreateRecord('cashsale');
            	CashSale.setFieldValue('entity', vCustomerID);
            	if (vSub == 1)
				{
					CashSale.setFieldValue('location', '1');   // Need to determine production value
				}
				else
				{
					CashSale.setFieldValue('location', '13');   // Need to determine production value
				}
			   	CashSale.setFieldValue('department', '28');   // Need to determine production value
            	CashSale.setFieldValue('ccexpiredate', vCCExpDate);
            	CashSale.setFieldValue('ccname', vCCName);
            	CashSale.setFieldValue('ccnumber', vCCNumber);
            	CashSale.setFieldValue('paymentmethod', vCCPaymentMethod);
				CashSale.setLineItemValue('item','item',1,vItemID);
                CashSale.setLineItemValue('item','quantity',1,1);
                CashSale.setLineItemValue('item','rate',1,vPrice);
                CashSale.setLineItemValue('item','amount',1,vPrice);
               //CashSale.setLineItemValue('item','istaxable','T'); //Bill G - added to troubleshoot settable error for non - US customers
				var SubmitCashSaleRecordId = nlapiSubmitRecord(CashSale , true, true);
				nlapiLogExecution('DEBUG', 'Cash Sales Created', 'Cash Sale Created. ID = ' + SubmitCashSaleRecordId); 
			}
            catch (e)
            {
            	updVals = new Array();
            	updVals.push(vFormattedCurrentDate);
            	if (e.getDetails != undefined) {
            		updVals.push('Error Creating Cash Sale for customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID + '. Error Code = ' + e.getCode()+ '. Error Message = ' + e.getDetails());
           			nlapiLogExecution('DEBUG', 'Error', 'Error Creating Cash Sale for customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID + '. Error Code = ' + e.getCode()+ '. Error Message = ' + e.getDetails()); 
				} else {
					updVals.push('Error Creating Cash Sale for customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID);
           			nlapiLogExecution('DEBUG', 'Error', 'Error Creating Cash Sale for customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID); 
                }
            	
            	nlapiSubmitField('customrecord_subscription_billing', vCustRecordID, updFlds, updVals, true);

				continue;
			}

			// last we update the dates on the custom record
           try 
            {
				var vFormattedNextMonthDate = (vNextMonthDateObj.getMonth()+1) + '/' + vBillingDay + '/' + vNextMonthDateObj.getFullYear();
			
				var sucUpdFlds = ['custrecord_cc_last_billed','custrecord_cc_next_date'];
				var sucUpdVals = [vFormattedCurrentDate,vFormattedNextMonthDate];
				
				nlapiSubmitField('customrecord_subscription_billing', vCustRecordID, sucUpdFlds, sucUpdVals, true);
				
				nlapiLogExecution('DEBUG', 'Custom Record Updated', 'Custom Record Updated. ID = ' + vCustRecordID); 
				
				vOutputCtr = vOutputCtr + 1;
			}
            catch (e) 
            {
            	
            	updVals = new Array();
            	updVals.push(vFormattedCurrentDate);
            	if (e.getDetails != undefined) {
            		updVals.push('Error Updating Billing Dates for customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID + '. Error Code = ' + e.getCode()+ '. Error Message = ' + e.getDetails());
           			nlapiLogExecution('DEBUG', 'Error', 'Error Updating Billing Dates for customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID + '. Error Code = ' + e.getCode()+ '. Error Message = ' + e.getDetails()); 
				} else {
					updVals.push('Error Updating Billing Dates for customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID);
           			nlapiLogExecution('DEBUG', 'Error', 'Error Updating Billing Dates for customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID); 
                }
            	
            	nlapiSubmitField('customrecord_subscription_billing', vCustRecordID, updFlds, updVals, true);
            	
            	continue;
			}

		}
		else 
        {
			var stShedScriptStatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
            nlapiLogExecution('DEBUG', 'stShedScriptStatus: ', 'stShedScriptStatus = ' + stShedScriptStatus);                            
            if (stShedScriptStatus == 'QUEUED') 
            {
            	break;
            }
         }
	}
	
	nlapiLogExecution('DEBUG', 'End of Processing New', 'Input Ctr = ' + vInputCtr + ' Output Ctr = ' + vOutputCtr); 

}