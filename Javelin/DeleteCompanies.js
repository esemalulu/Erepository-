function deleteCustomerRecords()
{
		var context = nlapiGetContext();
		var searchresults = nlapiSearchRecord('customer', 'customsearch_flagfordelete', null, null);		
		nlapiLogExecution('DEBUG', 'Number of customers to be deleted: ' + searchresults.length);
					
		for ( var i = 0; searchresults != null && i < searchresults.length; i++ ) {
			
			if (parseInt(context.getRemainingUsage()) < 100)
			{
				nlapiLogExecution('DEBUG', 'Usage Exceeded ' + parseInt(context.getRemainingUsage()));
				break;
			}
			var customerID = searchresults[i].getValue('internalid');
			var customerRec = nlapiLoadRecord('customer', customerID);

	
			
			// REMOVE ANY PHONE CALLS THAT EXIST FOR THE COMPANY
			
			// Define search filters
			var filtersPhone = new Array();
			filtersPhone[0] = new nlobjSearchFilter( 'company', null, 'anyof', customerID );
			
			// Define search columns
			var columnsPhone = new Array();
			columnsPhone[0] = new nlobjSearchColumn( 'internalid' );

			var phoneCallSearchResults = nlapiSearchRecord( 'phonecall', null, filtersPhone, columnsPhone );	

			for ( var k = 0; phoneCallSearchResults != null && k < phoneCallSearchResults.length; k++ ) {
				var phoneCall = phoneCallSearchResults[k];
				var phoneCallID = phoneCall.getValue( 'internalid' );
				nlapiLogExecution('DEBUG', 'Number of calls: ' +  phoneCallSearchResults.length + ', PhoneCallID = ' + phoneCallID );
				nlapiLogExecution('DEBUG', 'Attempting to delete phone call record: ' + phoneCallID);
				
				var phoneCallObject = nlapiLoadRecord('phonecall', phoneCallID);
				
				// Must take ownership of the phone call to delete it.
				var phoneCallOwner =  phoneCallObject.getFieldValue('owner' );
				var currentUserID =  nlapiGetUser();
				phoneCallObject.setFieldValue('owner', currentUserID);
				phoneCallID =  nlapiSubmitRecord(phoneCallObject,false);
				nlapiLogExecution('DEBUG', 'Current ownerID: ' + phoneCallOwner + ', Current UserID: ' + currentUserID);

				try
				{
					nlapiDeleteRecord('phonecall', phoneCallID);
					nlapiLogExecution('DEBUG', 'Deleted phone call with InternalID = ' + phoneCallID );
				}
				catch (err) 
				{
					nlapiLogExecution('DEBUG', 'Could not delete phone call with InternalID = ' + phoneCallID + '.  Probably Permission Error. ' + err.toString() );
					nlapiLogExecution('DEBUG', 'Could not delete, error: ' +  err.toString() );
				}
				
			}			
			

			
			// REMOVE ANY CONTACTS THAT EXIST FOR THE COMPANY
			var contactCount = customerRec.getLineItemCount('contactroles');
			nlapiLogExecution('DEBUG', 'CompanyID = ' + customerID + ', Number of contacts = ' + contactCount);
			for ( var j = 1; j <= contactCount; j++ ) 
			{
				var contactID = customerRec.getLineItemValue('contactroles','contact', j);
				try 
				{
					nlapiDeleteRecord('contact', contactID);
				}
				catch (err) 
				{	
					nlapiLogExecution('DEBUG', 'Could not delete contact with InternalID = ' + contactID + '. '  + err.toString() );
					nlapiLogExecution('DEBUG', 'Error = ' + err.toString() );
				}
			}
			
			
			// Define search filters
			var filtersTransaction = new Array();
			filtersTransaction[0] = new nlobjSearchFilter( 'entity', null, 'anyof', customerID );
			
			// Define search columns
			var columnsTransaction = new Array();
			columnsTransaction[0] = new nlobjSearchColumn( 'internalid' );

			var opportunitySearchResults = nlapiSearchRecord( 'opportunity', null, filtersTransaction, columnsTransaction );	

			if ( opportunitySearchResults == null ) {	
				
				try
				{
					// DELETE COMPANY RECORD
	
					nlapiLogExecution('DEBUG', 'Attempting to delete customer record: ' + customerID);
					nlapiDeleteRecord('customer', customerID);
	
				}
				catch (err)
				{
					nlapiLogExecution('DEBUG', 'Could not delete company with InternalID = ' + customerID);
					nlapiLogExecution('DEBUG', 'Could not delete, error: ' +  err.toString() );
				}
			}
		} //end for		
}