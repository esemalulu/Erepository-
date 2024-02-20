
/**
 * Updates the new Web Portal Ship Via field from the Netsuite Ship Method
 * 
 * @param recType
 * @param recId
 */
function GD_ShippingMethod_MassUpdate(recType, recId)
{
	nlapiLogExecution('debug', 'GD_ShippingMethod_MassUpdate', 'recType: ' + recType + ', recId' + recId);
	if(recId != null && recId != '')
	{
		var webOrder = nlapiLoadRecord(recType, recId);
		nlapiLogExecution('debug', 'GD_ShippingMethod_MassUpdate', 'shipmethod: ' + webOrder.getFieldValue('shipmethod'));
		if(webOrder.getFieldValue('shipmethod') != '' && webOrder.getFieldValue('shipmethod') != null)
		{
			//write search to find the corresponding ship method
			var filters = new Array();
			filters[filters.length] = new nlobjSearchFilter('custrecordgd_webportalshiptype_shipitem', null, 'is', webOrder.getFieldValue('shipmethod'));
			filters[filters.length] = new nlobjSearchFilter('custrecordgd_webportalshiptype_showinweb', null, 'is', 'T');
			
			var columns = new Array();
			columns[columns.length] = new nlobjSearchColumn('internalid');
			
			var results = nlapiSearchRecord('customrecordgd_webportalshiptype', null, filters, columns);
			if(results != null)
			{
				nlapiLogExecution('debug', 'GD_ShippingMethod_MassUpdate', 'shipmethod: ' + webOrder.getFieldValue('shipmethod'));
				webOrder.setFieldValue('custbodygd_webpartsorder_shipvia', results[0].getValue('internalid'));
				nlapiSubmitRecord(webOrder, false, true);
			}
			else
			{
				//do not change web portal shipping type if it is not supported in the web portal (Show in Web Portal is 'F')
			}
		}
	}
}