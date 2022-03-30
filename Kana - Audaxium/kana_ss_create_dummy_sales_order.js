/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Script			:kana_ss_create_dummy_sales_order.js
Programmer		:Sagar Shah
Description		: Create dummy Sales Order for all SF closed won (historic - closed 2012 and prior) opportunities 
					and set the Sales Order date to the actual close date (coming from SalesForce.com).
					This is a workaround to change actual close date of imported Opportunities 
Date			: 06/04/2013
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function create_dummy_salesorders()
{
		var sNetsuiteEmailId = 16921;//AppScript Notification  
		var adminEmail = 'kana-app-notification@kana.com';

		
		//Search Name: SF Closed Historic Opportunities
		var searchresults = nlapiSearchRecord('opportunity', 'customsearch_sf_closed_historic_oppty');
	
		//do not forget to create a dummy sales order check box for reporting purpose
		//field name : custbody_sf_dummy_sales_order
		
		for (var i = 0; searchresults != null && i < searchresults.length; i++ )
		{
			var oppInternalID = searchresults[i].getId();
			var opptyRecord = nlapiLoadRecord('opportunity', oppInternalID);
			var opptyNumber = opptyRecord.getFieldValue('tranid');
			var expectCloseDate = opptyRecord.getFieldValue('expectedclosedate');
			var soRecord = null;

			var isDummySO = opptyRecord.getFieldValue('custbody_sf_dummy_salesorder_created');
			if(isDummySO=='T')
				continue;
			
			try
			{
					soRecord = nlapiTransformRecord('opportunity', oppInternalID, 'salesorder');

					
					//Use the custom form 'KANA Sales Order (A/R)' since it is the most lenient form 
					var customForm='KANA Sales Order (A/R)';					
					var itemCount = opptyRecord.getLineItemCount('item');

					for ( var j = 1; j <= itemCount; j++) {					
						//we assume there is only one line item
						
						//set line item unit price same as line item amount or oppty amount
						var amount = soRecord.getLineItemValue('item', 'amount', j);
						soRecord.setLineItemValue('item', 'rate', j,amount);
												
						//set the line item (hence, sales order) as closed
						soRecord.setLineItemValue('item', 'isclosed', j,'T');
						
						//set term to no
						soRecord.setLineItemValue('item', 'custcol_term_item', j,'2');
						
						//set class to '500 Trinicom' : internal value
						soRecord.setLineItemValue('item', 'class', j,'18');

						//tax code for few Opportunities in KANA Benelux BV Sub or KANA Belgie
						//UNDEF_BE - 778 (for sub KANA Belgie)
						//UNDEF_NL - 733 (for sub KANA Benelux BV) 
						//UNDEF-GB - 768 (for sub KSIL - UK)
						//UNDEF_IE - 752 (for sub KSIL - IE)
						soRecord.setLineItemValue('item', 'taxcode', j,'733');
						break;

					}//for loop

					soRecord.setFieldValue('trandate', expectCloseDate );

					soRecord.setFieldValue('memo', 'Dummy Order created from Oppty imported from SalesForce.com');

					soRecord.setFieldText('customform', customForm );
					
					soRecord.setFieldValue('custbody_sf_dummy_sales_order', 'T' );

					//populate mandatory fields		
					//set 'with questions: contact fields'
					var salesRep = opptyRecord.getFieldValue('salesrep');
					soRecord.setFieldValue('custbody_kana_contact_name', salesRep );
					
					var soInternalID =  nlapiSubmitRecord(soRecord,true,true);					

					//update opportunity with the new sales order created for reference and search filtering
					opptyRecord = nlapiLoadRecord('opportunity', oppInternalID);//reload the record since it got updated with quote creation (example oppty status)
					opptyRecord.setFieldValue('custbody_sf_dummy_salesorder_created','T');
					
					//change the status back to closed lost
					opptyRecord.setFieldValue('entitystatus','17');
					nlapiSubmitRecord(opptyRecord,false,true);		
			}
			catch (e)
			{

				nlapiLogExecution('DEBUG', 'Error creating dummy sales order for Oppty : ' + opptyNumber,e.toString());
				/*var errorText = 'UNEXPECTED ERROR: ATTEMPTING TO CREATE Dummy SO for Opportunity ' + '\n\n' +
							'Script Name : kana_ss_create_dummy_sales_order.js' + '\n' +
							'Opportunity ID : ' + opptyNumber + '\n' +
							'Error Details: ' + e.toString();
							*/
				//nlapiSendEmail(sNetsuiteEmailId, adminEmail, 'Error Message', errorText, null, null);
					
			}
	}//outer for loop
}