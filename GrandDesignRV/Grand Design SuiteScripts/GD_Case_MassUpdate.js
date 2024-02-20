/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Sep 2016     brians
 *
 */

// Mass Update Scripts for The Claim Record

function SetRetailCustomerOnCase(rec_type, rec_id)
{
	var caseRecord = nlapiLoadRecord(rec_type, rec_id);
	var vin = caseRecord.getFieldValue('custeventgd_vinnumber');
	if(vin != null & vin != '')
	{
		//Source Retail Customer if it has not been set.
		var unitRetailCustomer = caseRecord.getFieldValue('custeventgd_caseretailcustname');
		if(unitRetailCustomer == '' || unitRetailCustomer == null)
		{
			var filters = new Array();
			filters[filters.length] = new nlobjSearchFilter('custrecordunitretailcustomer_unit', null, 'anyof', vin, null);
			
			var cols = new Array();
			cols.push(new nlobjSearchColumn('internalid'));
			cols.push(new nlobjSearchColumn('name'));
			cols.push(new nlobjSearchColumn('custrecordunitretailcustomer_currentcust'));
			cols[0].setSort(true); //sort by most recent retail customer records
			
			var unitRetailCusResults = nlapiSearchRecord('customrecordrvsunitretailcustomer', null, filters, cols);
			var hasCurrentCustomer = false; //stores whether or not the unit has current customer.
			
			if (unitRetailCusResults != null && unitRetailCusResults.length > 0)
			{
				for(var i = 0; i < unitRetailCusResults.length; i++) //loop through and find the retail customer marked as "Current Customer"
				{
					if(unitRetailCusResults[i].getValue('custrecordunitretailcustomer_currentcust') == 'T')
					{
						caseRecord.setFieldValue('custeventgd_caseretailcustname', unitRetailCusResults[i].getValue('name'));
						nlapiLogExecution('debug','Case id: ' + rec_id + ' - Customer set (is Current)', unitRetailCusResults[i].getValue('name') + ' for vin id: ' + vin);

						hasCurrentCustomer = true;
						break;
					}
				}
				
				//there is no retail customer marked as "Current", so set it to be the most recent retail customer for this unit.
				if(!hasCurrentCustomer)
				{
					caseRecord.setFieldValue('custeventgd_caseretailcustname', unitRetailCusResults[0].getValue('name'));
					nlapiLogExecution('debug','Case id: ' + rec_id + ' - Customer set (not Current)', unitRetailCusResults[0].getValue('name') + ' for vin id: ' + vin);
				}
			}
			else
			{
				nlapiLogExecution('debug','Case id: ' + rec_id + ' - no customer found', 'No customer found for vin id: ' + vin);
			}
		}
		
	}
	
	nlapiSubmitRecord(caseRecord, true, true);
}
