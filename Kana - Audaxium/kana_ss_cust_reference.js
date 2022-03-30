/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change ID		:CH#CUST_REFERENCE
Programmer		:Sagar Shah
Description		: Populate the 'Last Referenceable' based on the flag 'Is Referenceable'.
Date			: 05/05/2010
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function afterSubmit(type)
{

	try
	{
	   	if ( type == 'create' || type == 'edit'|| type == 'xedit')
   		{
			var newCustRecord = nlapiGetNewRecord();
			var	oldCustRecord = nlapiGetOldRecord();

			var custID = newCustRecord.getId();
		
			var oldIsReferenceable = oldCustRecord.getFieldValue('custentity_cust_is_referenceable');

			var isReferenceable = newCustRecord.getFieldValue('custentity_cust_is_referenceable');
			var lastReferenceable = newCustRecord.getFieldValue('custentity_cust_last_referenceable');
			var today = getDate();
			
			if(isReferenceable == 'T') 
			{
				if(oldIsReferenceable == 'F') {
					var customer = nlapiLoadRecord('customer', custID);
					customer.setFieldValue('custentity_cust_last_referenceable',today);
					nlapiSubmitRecord(customer,false,true);

				}
			} 
			else 
			{
				if(oldIsReferenceable == 'T') {
					var customer = nlapiLoadRecord('customer', custID);
					customer.setFieldValue('custentity_cust_last_referenceable',today);
					nlapiSubmitRecord(customer,false,true);
				}

			}
	
		}// if type
	} // try
	catch(e)
	{
            if ( e instanceof nlobjError )
                nlapiLogExecution( 'ERROR', ' system error', e.getCode() + '\n' + e.getDetails() )
            else
                nlapiLogExecution( 'ERROR', ' unexpected error', e.toString() )

	} //catch
} //end
function getDate()
{
	var d = new Date();
	var curr_date = d.getDate();
	var curr_month = d.getMonth()+1;
	var curr_year = d.getFullYear();
	var formattedDate = curr_month + "/" +curr_date + "/" + curr_year;
	return formattedDate;
}

