/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change ID		:CH#AUTO_MR_QUOTE
Programmer		:Sagar Shah
Description		: 90 days prior to maintenance service expiration, Netsuite will generate a new quote from the existing renewal opportunity.
Date					: 05/21/2012
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function create_auto_quote()
{
		var fromEmail = 16921; //autorenewals@kana.com  
		var adminEmail = nlapiGetContext().getSetting('SCRIPT', 'custscript_admin_email3');

		var column = new nlobjSearchColumn('internalid',null,'group');
		//Search Name: Open Opportunity for MR Auto Quote
		var searchresults = nlapiSearchRecord('transaction', 'customsearch_mr_oppty_4_auto_quote_ver2', null, column);
	
		for (var i = 0; searchresults != null && i < searchresults.length; i++ )
		{
			var oppInternalID = searchresults[i].getValue(column);
			var opptyRecord = nlapiLoadRecord('opportunity', oppInternalID);
			var opptyNumber = opptyRecord.getFieldValue('tranid');
			var customerInternalID = opptyRecord.getFieldValue('entity');
			var quoteRecord = null;

			try
			{
					quoteRecord = nlapiTransformRecord('opportunity', oppInternalID, 'estimate');

					//determine maintenance type and end customer.
					//Based on these two values select the custom form 
					var endCustomer = opptyRecord.getFieldValue('custbody_end_customer');
					var customForm=null;
					var currMaintEndDate=null;
					var itemCount = opptyRecord.getLineItemCount('item');

					for ( var j = 1; j <= itemCount; j++) {					
						var itemCategory = opptyRecord.getLineItemValue('item', 'custcol_item_type_4_scripting', j);
						if(itemCategory != 'Maintenance')
										continue;

						//Current Maintenance Date would be one day before the new term start date
						currMaintEndDate = opptyRecord.getLineItemValue('item', 'custcol_renewal_st_date', j);
						var tempDate =nlapiStringToDate(currMaintEndDate);
						tempDate = nlapiAddDays(tempDate, -1);
						currMaintEndDate = nlapiDateToString(tempDate);

						var genMaintType = opptyRecord.getLineItemText('item', 'custcol_gen_maint_type', j);//new generic maintenance type field
						if(genMaintType=='Gold') {
							if(kana_IsNull(endCustomer))
								customForm = 'KANA Quote (Renewal) - Gold';
							else
								customForm = 'KANA Quote (Renewal) - Reseller Gold';

							break;
						}//end if loop
						else if(genMaintType=='Silver') {
							if(kana_IsNull(endCustomer))
								customForm = 'KANA Quote (Renewal) - Silver';
							else
								customForm = 'KANA Quote (Renewal) - Reseller Silver';

							break;
						}//end else if
					}//for loop

					if(customForm!=null)
						quoteRecord.setFieldText('customform', customForm );
					else 
						quoteRecord.setFieldText('customform', 'KANA Quote' );//Default Form

					//How would i determine cust contact for maintenance renewal?

					//populate mandatory fields		
					//set 'with questions: contact fields'
					var salesRep = opptyRecord.getFieldValue('salesrep');
					quoteRecord.setFieldValue('custbody_kana_contact_name', salesRep );
							
					//if current maintenance end date didn't come from oppty recalculate.
					if( kana_IsNull(quoteRecord.getFieldValue('custbody_online_cur_maint_end_dt') ) )
						quoteRecord.setFieldValue('custbody_online_cur_maint_end_dt', currMaintEndDate );

					//if the delivery email id didn't come from oppty get it from the Sales Order.
					var deliveryEmail = quoteRecord.getFieldValue('custbody_delivery_email');
					if( kana_IsNull(deliveryEmail ) ) {
						try {
							var salesOrderInternalIDs = opptyRecord.getFieldValues('custbody_prior_sales_orders');
							var soDeliveryEmail = nlapiLookupField('salesorder', salesOrderInternalIDs[salesOrderInternalIDs.length-1], 'custbody_delivery_email');
							quoteRecord.setFieldValue('custbody_delivery_email', soDeliveryEmail );		
							deliveryEmail = soDeliveryEmail;
						}
						catch (e)
						{
							nlapiLogExecution('ERROR', 'Error setting delivery email in auto-quote for Oppty : ' + opptyNumber,e.toString());
						}
					}//end if

					//set the field 'Cust. Contact for Maint.Renewal' based on the delivery email id
					if( !kana_IsNull(deliveryEmail) ) {
						try {
							var contactInternalID = getContactID(deliveryEmail,customerInternalID);
							if(contactInternalID!=-1)
								quoteRecord.setFieldValue('custbody_contact_for_mr', contactInternalID );		
						}
						catch (e)
						{
							nlapiLogExecution('ERROR', 'Error setting Cust. Contact in auto-quote for Oppty : ' + opptyNumber,e.toString());
						}
					}//end if

					//think over the possiblility of creating big number of quotes in one go. May need to run the script more than once in a day - done
					//we can use the Auto quote already created field in the search.
					var quoteInternalID =  nlapiSubmitRecord(quoteRecord,true,true);					

					//update opportunity with the new quote created for reference
					opptyRecord = nlapiLoadRecord('opportunity', oppInternalID);//reload the record since it got updated with quote creation (example oppty status)
					opptyRecord.setFieldValue('custbody_auto_quote_created',quoteInternalID);
					nlapiSubmitRecord(opptyRecord,false,true);		

			}
			catch (e)
			{
					//if there is a tax error make the quote non-taxable and try again
					var exceptionStr = e.toString();
					if(exceptionStr.search("Please specify a tax code and tax rate for this customer")!=-1)
					{
						try {
							quoteRecord.setFieldValue('istaxable', 'F' );
							var quoteInternalID =  nlapiSubmitRecord(quoteRecord,true,true);					
			
							//update opportunity with the new quote created for reference
							opptyRecord = nlapiLoadRecord('opportunity', oppInternalID);//reload the record since it got updated with quote creation (example oppty status)
							opptyRecord.setFieldValue('custbody_auto_quote_created',quoteInternalID);
							nlapiSubmitRecord(opptyRecord,false,true);		
						}
						catch (exception)
						{
							nlapiLogExecution('ERROR', 'Error creating auto-quote for Oppty : ' + opptyNumber,exception.toString());
							var errorText = 'UNEXPECTED ERROR: ATTEMPTING TO CREATE Quote for Opportunity ' + '\n\n' +
										'Script Name : kana_ss_create_mr_quote_from_opp.js' + '\n' +
										'Opportunity ID : ' + opptyNumber + '\n' +
										'Error Details: ' + exception.toString();
							nlapiSendEmail(fromEmail, adminEmail, 'Error Message', errorText, null, null);
		
						}
					} else {
						nlapiLogExecution('ERROR', 'Error creating auto-quote for Oppty : ' + opptyNumber,e.toString());
						var errorText = 'UNEXPECTED ERROR: ATTEMPTING TO CREATE Quote for Opportunity ' + '\n\n' +
									'Script Name : kana_ss_create_mr_quote_from_opp.js' + '\n' +
									'Opportunity ID : ' + opptyNumber + '\n' +
									'Error Details: ' + e.toString();
						nlapiSendEmail(fromEmail, adminEmail, 'Error Message', errorText, null, null);
					}
			}
	}//outer for loop
}


function getContactID(deliveryEmail,customerInternalID) {
		var columns = new Array();
		columns[0] =	new nlobjSearchColumn('internalid');
		columns[1] =	new nlobjSearchColumn('email');		
		
		var filters = new Array();
		filters[0] = new nlobjSearchFilter('email', null, 'is',deliveryEmail);
		filters[1] = new nlobjSearchFilter('company', null, 'is',customerInternalID );
		filters[2] = new nlobjSearchFilter('isinactive', null, 'is','F' );
		var searchresults = nlapiSearchRecord('contact', null, filters, columns);
	
		for (var i = 0; searchresults != null && i < searchresults.length; i++ )
		{
			return searchresults[i].getValue('internalid');
		}	
		return -1;
}
