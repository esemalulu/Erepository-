/**
 * @author connorsh
 */
/**
 * This file contains server side logic for Invoices.
 * Acct: TSTDRV887020
 */

/**
 * Perform before submit logic for invoices.
 * @param {Object} type
 */
function Invoice_BeforeSubmit(type)
{
	if(type != 'delete')
	{
		var noShippingCharge = trim(nlapiGetFieldValue('custbodyrvsnoshippingcharge'));
		var currentShippingCost = parseFloat(nlapiGetFieldValue('shippingcost'));
		//If invoice has No shipping charge checked and current shipping cost is greater than zero
		//we need to set its shipping cost to zero and set sales order associated with the invoice
		//to have zero shipping cost as well.
		if(noShippingCharge == 'T' && !isNaN(currentShippingCost) && currentShippingCost > 0)
		{
			nlapiSetFieldValue('shippingcost', '0');	
				
			var salesOrderId = trim(nlapiGetFieldValue('createdfrom'));
			if(salesOrderId != '')
			{		
				var orderRecord = nlapiLoadRecord('salesorder', salesOrderId);
				orderRecord.setFieldValue('custbodyrvsnoshippingcharge', 'T');
				orderRecord.setFieldValue('shippingcost', '0');
				nlapiSubmitRecord(orderRecord, true, true);
			}
		}
	}
}
