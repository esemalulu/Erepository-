/*
   	Script Name: UES_Print_the_custom_fields.js
	Author: Ganesh Sapkale
	Company: ACME Paper Co.
	Date: 18-05-2020
    Description: 
	Script Type: User Event

	Script Modification Log:

	-- Date --			-- Modified By --			--Requested By--				-- Description --
	
 *
 */
 
function beforeLoad()
{
	try
	{
		if(type == 'print')
		{
			var o_recObj = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
			var subsidiaryId = o_recObj.getFieldValue('subsidiary');
			
			if(subsidiaryId)
			{
				
				var s_address1 = ''; 	
				var s_address2 = '';	
				var s_city 	= '';	
				var s_country = '';	
				var s_zip = '';		
				
				var subsidiarySearch = nlapiSearchRecord("subsidiary",null,
				[
				   ["internalid","anyof",subsidiaryId]
				], 
				[
				   new nlobjSearchColumn("name").setSort(false), 
				   new nlobjSearchColumn("city"), 
				   new nlobjSearchColumn("state"), 
				   new nlobjSearchColumn("country"), 
				   new nlobjSearchColumn("currency"), 
				   new nlobjSearchColumn("address1"), 
				   new nlobjSearchColumn("address2"), 
				   new nlobjSearchColumn("zip"), 
				   new nlobjSearchColumn("address1","address",null), 
				   new nlobjSearchColumn("address2","address",null), 
				   new nlobjSearchColumn("city","address",null), 
				   new nlobjSearchColumn("state","address",null), 
				   new nlobjSearchColumn("zip","address",null), 
				   new nlobjSearchColumn("country","address",null)
				]
				);
				
				if(subsidiarySearch)
				{
					s_address1 	= subsidiarySearch[0].getValue("address1","address");
					s_address2 	= subsidiarySearch[0].getValue("address2","address");
					s_city 		= subsidiarySearch[0].getValue("city","address");
					s_country 	= subsidiarySearch[0].getValue("country","address");
					s_zip 		= subsidiarySearch[0].getValue("zip","address");
				}
				
			}
			var s_lastline = s_city+", "+s_country+" "+s_zip;
			var f_address1 = form.addField('custpage_custrecord_address1', 'text', '', null, null).setDisplayType('disabled');
			var f_address2 = form.addField('custpage_custrecord_address2', 'text', '', null, null).setDisplayType('disabled');
			var f_lastline = form.addField('custpage_lastline', 'text', '', null, null).setDisplayType('disabled');
			f_address1.setDefaultValue(s_address1);
			f_address2.setDefaultValue(s_address2);
		}
	
	}
	catch(e)
	{
		nlapiLogExecution('error',"beforeLoad | error",e)
	}

}