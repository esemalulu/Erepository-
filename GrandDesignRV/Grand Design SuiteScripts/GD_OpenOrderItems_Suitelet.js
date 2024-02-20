/**
 * Suitelet to display when an item on a sales order might be received.
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Dec 2016     Jacob Shetler
 *
 */

/**
 * Generates a list of sales orders/purchase orders that determine when the item selected will be received.
 * 
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_OpenOrder_Suitelet(request, response)
{
	//Get the item and sales order from the params
	var itemId = ConvertNSFieldToString(request.getParameter('itemid'));
	var dictKey = '_' + itemId;
	var soRec = nlapiLoadRecord('salesorder', request.getParameter('soid'));
	
	//Create the form
	var ooForm = nlapiCreateForm('Open Order Detail - ' + nlapiLookupField('item', itemId, 'itemid') , true);
	
	//Get the Sales Order and Purchase Order detail for the Order.
	var detailObj = GD_OpenOrder_GetSOPODetail(soRec);
	if(detailObj != null && detailObj[dictKey] != null)
	{
		var curDetailObj = detailObj[dictKey];
		
		//Figure out the date of the last Purchase Order that will be used to fulfill this Order. If none, display "Not Enough POs"
		var poDateText = 'Not Enough POs';
		for(var i = curDetailObj.purchaseOrders.length - 1; i > -1; i--)
		{
			if(curDetailObj.purchaseOrders[i].used)
			{
				poDateText = curDetailObj.purchaseOrders[i].dueDate;
				break;
			}
		}
		ooForm.addField('custpage_finaldate', 'text', 'Expected Received Date').setDisplayType('inline').setDefaultValue(poDateText);
		
		//Add the Sales Orders and Purchase Orders into a sublist.
	    var ooList = ooForm.addSubList('custpage_oolist', 'staticlist', 'Sales Orders and Purchase Orders');
	    ooList.addField('custpage_ooso', 'text', 'Sales Order').setDisplayType('inline');
	    ooList.addField('custpage_oosoqty', 'float', 'BO Qty').setDisplayType('inline');
	    ooList.addField('custpage_oosouom', 'text', 'UOM').setDisplayType('inline');
	    ooList.addField('custpage_ooblank', 'text', ''); //Add some padding
	    ooList.addField('custpage_ooblank1', 'text', ''); //...
	    ooList.addField('custpage_ooblank2', 'text', ''); //...
	    ooList.addField('custpage_oopo', 'text', 'Purchase Order').setDisplayType('inline');
	    ooList.addField('custpage_oopoqty', 'float', 'BO Qty').setDisplayType('inline');
	    ooList.addField('custpage_oopouom', 'text', 'UOM').setDisplayType('inline');
	    //Sales Orders
	    for (var i = 0; i < curDetailObj.salesOrders.length; i++)
	    {
	    	var curSO = curDetailObj.salesOrders[i];
			var colorHTML = curSO.used ? 'style="background-color:gold"' : '';
	        ooList.setLineItemValue('custpage_ooso', i+1, '<a ' + colorHTML + ' href="' + nlapiResolveURL('record', 'salesorder', curSO.id, 'view') + '">Sales Order #' + curSO.tranId + '</a>');
	        ooList.setLineItemValue('custpage_oosoqty', i+1, curSO.qtyBO);
	        ooList.setLineItemValue('custpage_oosouom', i+1, curSO.unitsText);
	    }
	    //Purchase Orders
		for (var i = 0; i < curDetailObj.purchaseOrders.length; i++)
		{
			var curPO = curDetailObj.purchaseOrders[i];
			var colorHTML = curPO.used ? 'style="background-color:gold"' : '';
	        ooList.setLineItemValue('custpage_oopo', i+1, '<a ' + colorHTML + ' href="' + nlapiResolveURL('record', 'purchaseorder', curPO.id, 'view') + '">Purchase Order #' + curPO.tranId + '</a>');
	        ooList.setLineItemValue('custpage_oopoqty', i+1, curPO.qtyBO);
	        ooList.setLineItemValue('custpage_oopouom', i+1, curPO.unitsText);
		}
	}
	else
	{
		ooForm.addField('custpage_nodata', 'label', 'No Data');
	}
	response.writePage(ooForm);
}
