 /** 
Change ID		:CH#UPGRADE_ERROR
Programmer		:Sagar Shah
Description		: Changes to fix the upgrade (2010.2) error
Date			: 10/11/2010	
**/
function pageinit()
{
	var poId;
	poId = nlapiGetLineItemValue('item','orderdoc',1);
	
	if(poId != null && poId !=''){

		//CH#UPGRADE_ERROR - start
		/*
		//load the purchase order
		var record = nlapiLoadRecord('purchaseorder', poId);

		//check the values for approvals
		var paapproval = record.getFieldValue('custbody_purchasing_approval');
		var budapproval = record.getFieldValue('custbody_budget_approval');
		*/
		//CH#UPGRADE_ERROR - start
		var paapproval = nlapiLookupField('purchaseorder',poId,'custbody_purchasing_approval');
		//var budapproval = nlapiLookupField('purchaseorder',poId,'custbody_budget_approval');
		
		//if((paapproval != 'T') && (budapproval != 'T'))
		//if((paapproval == 'F') || (budapproval == 'F'))
		if(paapproval == 'F')
		{
			alert('Purchase request not yet approved!!!!!. Cannot create a bill against this purchase request');
		}
	}
	return true;
}

function saveRecord()
{
	var poId;
	poId = nlapiGetLineItemValue('item','orderdoc',1);

	if(poId != null){
		//CH#UPGRADE_ERROR - start
		/*
		//load the purchase order
		var record = nlapiLoadRecord('purchaseorder', poId);

		//check the values for approvals
		var paapproval = record.getFieldValue('custbody_purchasing_approval');
		var budapproval = record.getFieldValue('custbody_budget_approval');
		*/
		var paapproval = nlapiLookupField('purchaseorder',poId,'custbody_purchasing_approval');
		//var budapproval = nlapiLookupField('purchaseorder',poId,'custbody_budget_approval');
		
		//CH#UPGRADE_ERROR - end
		//if((paapproval != 'T') && (budapproval != 'T'))
		//if((paapproval == 'F') || (budapproval == 'F'))
		if(paapproval == 'F')
		{
			alert('Purchase request not yet approved!!!!!. Cannot create a bill against this purchase request');
			return false;
		}
	}
	return true;

}
