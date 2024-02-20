/**
 * User Event scripts for the Sales Order that creates a new tab and sublist to view open order item status.
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Dec 2016     Jacob Shetler
 * 2.00		  03 Nov 2017	  Jeffrey Bajit		Per Case 8813, this script was improved so that the usage limit is not reached, It now only use 30 usage points to process the order items.
 *
 */

/**
 * Creates a sublist on the Sales Order to display back ordered items.
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function GD_OpenOrder_BeforeLoad(type, form, request)
{
	if (type == 'view')
	{
		form.addTab('custpage_ootab', 'Open Order Items');
		var ooSublist = form.addSubList('custpage_oolist', 'staticlist', 'Open Order Items', 'custpage_ootab');
		ooSublist.addField('custpage_ooitem', 'select', 'Item', 'item').setDisplayType('inline');
		ooSublist.addField('custpage_boqty', 'float', 'B.O. Qty');
		ooSublist.addField('custpage_uom', 'text', 'UOM');
		ooSublist.addField('custpage_date', 'text', 'Expected Date');
		ooSublist.addField('custpage_podetail', 'textarea', 'PO Detail');
		
		//Only show anything if we're in parts and service
		if(nlapiGetFieldValue('location') == nlapiGetContext().getSetting('SCRIPT', 'custscriptpartsandwarrantylocation'))
		{
			//Get the PO and SO detail data
			var detailObj = GD_OpenOrder_GetSOPODetail(nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId()));
			if(detailObj != null)
			{
				//Loop over the back ordered items for this order and add their information to the list.
				var suiteletBaseURL = nlapiResolveURL('suitelet', 'customscriptgd_openorderitems_suite', 'customdeploygd_openorderitems_suite');
				var lineIdx = 1;
				for (var key in detailObj)
				{
					var itemId = key.substring(1);
					var curDetailObj = detailObj[key];
					
					//Figure out the back ordered quantity and the uomText.
					//This just comes from the Sales Order that we're on, but we can get it from the detail object.
					var qtyBackOrdered = 0;
					var uomText = '';
					for(var i = 0; i < curDetailObj.salesOrders.length; i++)
					{
						if(curDetailObj.salesOrders[i].used)
						{
							qtyBackOrdered = curDetailObj.salesOrders[i].qtyBO;
							uomText = curDetailObj.salesOrders[i].unitsText;
							break;
						}
					}
					
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
		            ooSublist.setLineItemValue('custpage_ooitem', lineIdx, itemId);
		            ooSublist.setLineItemValue('custpage_boqty', lineIdx, qtyBackOrdered);
		            ooSublist.setLineItemValue('custpage_uom', lineIdx, uomText);
		            ooSublist.setLineItemValue('custpage_date', lineIdx, poDateText);
		            ooSublist.setLineItemValue('custpage_podetail', lineIdx, '<a onclick="window.open(\''+suiteletBaseURL + '&itemid=' + itemId + '&soid=' + nlapiGetRecordId()+'\', \'Open Order Detail\', \'location=no,status=no,menubar=no,resizable=no,toolbar=no,scrollbars=yes,titlebar=no,top=10,width=900,height=600\');event.preventDefault();" href="#">PO Detail</a>');
					lineIdx++;
				}
			}
		}
	}
}
