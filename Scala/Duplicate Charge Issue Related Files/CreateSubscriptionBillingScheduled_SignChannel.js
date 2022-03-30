/**
 * @author MBennett
 */
function createSubscriptionBilling()
{
	var vInputCtr = 0;
	var vOutputCtr = 0;
	var i;
	var j;
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
	
	var vCurrentDate = new Date();
	var vDay = String(vCurrentDate.getDate());
	var vDayFormatted = '';
	var vMonth = String(vCurrentDate.getMonth() + 1);
	var vMonthFormatted = '';
	var vYear = String(vCurrentDate.getFullYear());
		
	if (vMonth.length == 1)
	{
		vMonthFormatted = '0' + vMonth;
	} 
	else
	{
		vMonthFormatted = vMonth;
	} 
		
	if (vDay.length == 1) 
		vDay = '0' + vDay;
		
	var vFormattedCurrentDate = vMonthFormatted + '/' + vDay + '/' + vYear;
		
	// format for next month
	vMonth = parseFloat(vMonth) + 1;
	
	if (vMonth > 12)
	{ 
   		vMonth = 1;
   		vYear = parseFloat(vYear) + 1;
	}

	if (vMonth.length == 1)
	{
		vMonthFormatted = '0' + vMonth;
	} 
	else
	{
		vMonthFormatted = vMonth;
	} 

	var vFormattedNextMonthDate = vMonthFormatted + '/' + vDay + '/' + vYear;


	// Define search filters
	var filters = new Array();
	filters[0] = new nlobjSearchFilter( 'custrecord_cc_next_date', null, 'notafter', vFormattedCurrentDate);
	filters[1] = new nlobjSearchFilter( 'custrecord_cc_canceled_date', null, 'notbefore', vFormattedCurrentDate);

	// Define search columns
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');

	var searchresults = nlapiSearchRecord( 'customrecord_subscription_billing', null, filters, columns);

	if (searchresults != null)
		nlapiLogExecution('DEBUG', 'Script Start', 'Number of records returned = ' + searchresults.length); 

	// Loop through all search results. When the results are returned, use methods
	for ( var i = 0; searchresults != null && i < searchresults.length; i++ )
	{
		var remainingUsagePoints = nlapiGetContext().getRemainingUsage();
		
        if (remainingUsagePoints > usageThreshold) 
		{
			vInputCtr = vInputCtr + 1;
			
			var searchresult = searchresults[i];
			vCustRecordID = searchresult.getValue('internalid');

			var CustomRecord = nlapiLoadRecord('customrecord_subscription_billing', vCustRecordID)
			
			vCustomerID = CustomRecord.getFieldValue('custrecord_cc_customer');
			vPrice = CustomRecord.getFieldValue('custrecord_cc_price');
			vCancelledDate = CustomRecord.getFieldValue('custrecord_cc_cancelled_date');
			vBillingDay = CustomRecord.getFieldValue('custrecord_cc_billing_cycle_day');
			vItemID = CustomRecord.getFieldValue('custrecord_cc_item');
	
			nlapiLogExecution('DEBUG', 'Field Values', 'vCustomerID = ' + vCustomerID + ', vPrice = ' + vPrice + ', vCancelledDate = ' + vCancelledDate + ', vBillingDay = ' + vBillingDay + ', vItemID = ' + vItemID + ', vCustRecordID = ' + vCustRecordID); 

			// first we get the customer record so we can get it's cc info
            try 
            {
				var Customer = nlapiLoadRecord('customer', vCustomerID)
				vCCLines = Customer.getLineItemCount('creditcards');
				
				nlapiLogExecution('DEBUG', 'vCCLines', 'vCCLines = ' + vCCLines); 
			
			
				// First let's spin through the lines and see how many are ready to ship
				for (j = 1; j <= vCCLines; j++) {
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
            	if (e.getDetails != undefined)
                {
           			nlapiLogExecution('DEBUG', 'Error', 'Error getting customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID + '. Error Code = ' + e.getCode()+ '. Error Message = ' + e.getDetails()); 
            		CustomRecord.setFieldValue('custrecord_cc_billing_failed_date',vFormattedCurrentDate);
            		CustomRecord.setFieldValue('custrecord_cc_comments','Error getting customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID + '. Error Code = ' + e.getCode()+ '. Error Message = ' + e.getDetails());
					var SubmitCustomRecordId = nlapiSubmitRecord(CustomRecord , true);
				}
                else 
                {
           			nlapiLogExecution('DEBUG', 'Error', 'Error getting customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID); 
             		CustomRecord.setFieldValue('custrecord_cc_billing_failed_date',vFormattedCurrentDate);
           			CustomRecord.setFieldValue('custrecord_cc_comments','Error Creating Cash Sale');
					var SubmitCustomRecordId = nlapiSubmitRecord(CustomRecord , true);
                }
				continue;
			}
	
	
			// now create the cash sale
            try 
            {
		    	var CashSale = nlapiCreateRecord('cashsale');
            	CashSale.setFieldValue('entity', vCustomerID);
            	CashSale.setFieldValue('location', '13');   // Need to determine production value
            	CashSale.setFieldValue('department', '28');   // Need to determine production value
            	CashSale.setFieldValue('ccexpiredate', vCCExpDate);    
            	CashSale.setFieldValue('ccname', vCCName);    
            	CashSale.setFieldValue('ccnumber', vCCNumber);    
            	CashSale.setFieldValue('paymentmethod', vCCPaymentMethod);   
				CashSale.setLineItemValue('item','item',1,vItemID);
                CashSale.setLineItemValue('item','quantity',1,1);
                CashSale.setLineItemValue('item','rate',1,vPrice);
                CashSale.setLineItemValue('item','amount',1,vPrice);
				var SubmitCashSaleRecordId = nlapiSubmitRecord(CashSale , true);
				nlapiLogExecution('DEBUG', 'Cash Sales Created', 'Cash Sale Created. ID = ' + SubmitCashSaleRecordId); 
			}
            catch (e) 
            {
            	if (e.getDetails != undefined)
                {
           			nlapiLogExecution('DEBUG', 'Error', 'Error creating cash sale for customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID + '. Error Code = ' + e.getCode()+ '. Error Message = ' + e.getDetails()); 
            		CustomRecord.setFieldValue('custrecord_cc_billing_failed_date',vFormattedCurrentDate);
					CustomRecord.setFieldValue('custrecord_cc_comments','Error Creating Cash Sale');
					var SubmitCustomRecordId = nlapiSubmitRecord(CustomRecord , true);
				}
                else 
                {
           			nlapiLogExecution('DEBUG', 'Error', 'Error creating cash sale for customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID); 
           			CustomRecord.setFieldValue('custrecord_cc_billing_failed_date',vFormattedCurrentDate);
					CustomRecord.setFieldValue('custrecord_cc_comments','Error Creating Cash Sale');
					var SubmitCustomRecordId = nlapiSubmitRecord(CustomRecord , true);
                }
				continue;
			}

			// last we update the dates on the custom record
           try 
            {
				if (vBillingDay.length == 1) 
					vBillingDay = '0' + vBillingDay;
				
				var vFormattedNextMonthDate = vMonthFormatted + '/' + vBillingDay + '/' + vYear;
				
	           	CustomRecord.setFieldValue('custrecord_cc_last_billed', vFormattedCurrentDate);
	           	CustomRecord.setFieldValue('custrecord_cc_next_date', vFormattedNextMonthDate);
			
				var SubmitCustomRecordId = nlapiSubmitRecord(CustomRecord , true);
 				
				nlapiLogExecution('DEBUG', 'Custom Record Updated', 'Custom Record Updated. ID = ' + SubmitCustomRecordId); 
				
				vOutputCtr = vOutputCtr + 1;
			}
            catch (e) 
            {
            	if (e.getDetails != undefined)
                {
           			nlapiLogExecution('DEBUG', 'Error', 'Error creating cash sale for customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID + '. Error Code = ' + e.getCode()+ '. Error Message = ' + e.getDetails()); 
             		CustomRecord.setFieldValue('custrecord_cc_billing_failed_date',vFormattedCurrentDate);
           			CustomRecord.setFieldValue('custrecord_cc_comments','Error Creating Cash Sale');
					var SubmitCustomRecordId = nlapiSubmitRecord(CustomRecord , true);
				}
                else 
                {
           			nlapiLogExecution('DEBUG', 'Error', 'Error creating cash sale for customer ID = ' + vCustomerID + ', for billing record ID = ' + vCustRecordID); 
             		CustomRecord.setFieldValue('custrecord_cc_billing_failed_date',vFormattedCurrentDate);
           			CustomRecord.setFieldValue('custrecord_cc_comments','Error Creating Cash Sale');
					var SubmitCustomRecordId = nlapiSubmitRecord(CustomRecord , true);
                }
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