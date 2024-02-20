/**
 * Common scripts for GD's Put Away Worksheet functionality.
 * This is used on the Item Receipt and in a suitelet.
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Dec 2016     Jacob Shetler
 *
 */

/**
 * Generates the HTML for a put-away worksheet based on the array of Item Receipt IDs passed in.
 * 
 * @param {Array} itemReceipts An array of internal IDs of the item receipts to include in the HTML
 * @returns {String} HTML to print for the Put-Away Worksheet.
 */
function GD_GeneratePutAwayWorksheet(itemReceipts)
{
	//Get all of the items for the receipts. The quantities are all in the base.
	var partsServiceLoc = nlapiGetContext().getSetting('SCRIPT', 'custscriptpartsandwarrantylocation');
	var receiptFilters = [new nlobjSearchFilter('mainline', null, 'is', 'F'), 
	                      new nlobjSearchFilter('internalid', null, 'anyof', itemReceipts), 
	                      new nlobjSearchFilter('inventorylocation', 'item', 'is', partsServiceLoc), //Make sure we limit inventory values to only the parts/service location
	                      new nlobjSearchFilter('location', null, 'is', partsServiceLoc)]; //We only want item receipt lines that are for the parts/service location
	var receiptCols = [new nlobjSearchColumn('item'),
	                   new nlobjSearchColumn('itemid', 'item'),
	                   new nlobjSearchColumn('tranid'),
	                   new nlobjSearchColumn('quantity'),
	                   new nlobjSearchColumn('locationquantityavailable' , 'item'), 
	                   new nlobjSearchColumn('displayname', 'item'), 
	                   new nlobjSearchColumn('stockunit', 'item'),
	                   new nlobjSearchColumn('unitstype', 'item')];
	var itemResults = GetSteppedSearchResults('itemreceipt', receiptFilters, receiptCols);
	
	//Combine the items' quantities
	var itemHash = {};
	var allReceiptNames = [];
	if (itemResults != null) 
	{
		for (var i = 0; i < itemResults.length; i++)
		{
			//Add the qtys together for all items.
			var curItem = itemResults[i].getValue('item');
			if (itemHash[curItem] == null) {
				itemHash[curItem] = {
						internalId: curItem,
						itemName: ConvertNSFieldToString(itemResults[i].getValue('itemid', 'item')) + ' ' + ConvertNSFieldToString(itemResults[i].getValue('displayname', 'item')),
						receiptQty: 0,
						availQty: ConvertNSFieldToFloat(itemResults[i].getValue('locationquantityavailable', 'item')),
						stockUOM: itemResults[i].getValue('stockunit', 'item'),
						unitsType: itemResults[i].getValue('unitstype', 'item')
				};
			}
			itemHash[curItem].receiptQty += ConvertNSFieldToFloat(itemResults[i].getValue('quantity'));
			
			//Add the name of this receipt to the array if it doesn't already exist.
			if (allReceiptNames.indexOf(itemResults[i].getValue('tranid')) < 0) {
				allReceiptNames.push(itemResults[i].getValue('tranid'));
			}
		}
	}
	
	//Generate the header HTML for each item.
	var fullHTML = '<head>' +
						'<style>' +
							'.tophead {font-weight:bold; width:1%; white-space:nowrap;} ' +
							'.tablehead {font-weight:bold; background-color:#EBEBEB; white-space:nowrap;} ' +
							'.tableheadright {font-weight:bold; background-color:#EBEBEB; width:15%; white-space:nowrap; align:right;} ' +
						'</style>' +
					'</head>' +
					'<body style="font-family:Verdana, Arial, Sans-serif;font-size:12px;margin-left:.1cm;margin-right:.1cm;">';
	fullHTML += GD_PutAway_GetHeader(allReceiptNames);
	
	//Generate the HTML for each item.
	var unitsHash = {};
	fullHTML += '<table width="100%">' +
					'<tr>' +
						'<td class="tablehead" width="45%">Item</td>' +
						'<td class="tableheadright">Received Qty</td>' +
						'<td class="tableheadright">Cross Dock Qty</td>' +
						'<td class="tableheadright">Put Away Qty</td>' +
						'<td class="tablehead" width="10%">Sales Orders</td>' +
					'</tr>';
	for (var itemId in itemHash) {
		fullHTML += GD_PutAway_GetItemInfo(itemHash[itemId], unitsHash);
	}
	
	fullHTML += '</table></body>';
	
	//Return the HTML
	return fullHTML;
}

/**
 * Generates the header information for the Put Away Worksheet.
 * @returns {String}
 */
function GD_PutAway_GetHeader(allReceiptNames)
{
	//Generate the date
	var rn = new Date();
	rn.setHours(rn.getHours() + 3); //The server is on PST, GD is on EST.
	var dateStr = (rn.getMonth() + 1) + '/' + rn.getDate() + '/' + rn.getFullYear() + ' ' + addZero(rn.getHours()) + ':' + addZero(rn.getMinutes());
				
	//Generate rows for the item receipt names.
	var recNames = '<tr>';
	for (var i = 0; i < allReceiptNames.length; i++) {
		recNames += '<td>#' + allReceiptNames[i] + '</td>';
		if (i % 10 == 9) recNames += '</tr><tr>';
	}
	recNames += '</tr>';
	
	return '<table width="100%">' +
	'<tr><td colspan="10" align="center" border="1px solid black" style="font-size:20px">PUT-AWAY WORKSHEET - ' + ConvertNSFieldToString(dateStr) + '</td></tr>' +
	'<tr>' + 
		'<td colspan="10" class="tophead">Item Receipts:</td>' +
	'</tr>' +
	recNames +
	'</table><br />';
}

/**
 * Returns inventory and sales order information for the item object.
 * 
 * @param {Object} itemObj Cumulative item information for all receipts.
 * @returns {String} HTML to add to the printout
 */
function GD_PutAway_GetItemInfo(itemObj, unitsHash)
{
	//Cross-dock quantity is the quantity received minus the available quantity.
	// You cannot cross-dock a negative number, so use 0 if it is negative.
	var crossDockQty = itemObj.receiptQty - itemObj.availQty;
	if (crossDockQty < 0) crossDockQty = 0;
	
	//Put Away quantity is the quantity received minus the cross-docked quantity.
	// This can never be less than 0.
	var putAwayQty = itemObj.receiptQty - crossDockQty;
	
	//Do a search for all open sales orders that have committed quantity of this item.
	var soFilters = [new nlobjSearchFilter('item', null, 'is', itemObj.internalId),
	                 new nlobjSearchFilter('quantitycommitted', null, 'greaterthan', 0)];
	var soColumns = [new nlobjSearchColumn('tranid'),
	                 new nlobjSearchColumn('quantitycommitted'),
	                 new nlobjSearchColumn('shipcomplete')];
	var soResults = GetSteppedSearchResults('salesorder', soFilters, soColumns);
	
	//Create rows for the sales orders. These go in the final <td>
	var soRows = '<table width="100%">';
	if (soResults != null) {
		for (var i = 0; i < soResults.length; i++) {
			soRows += '<tr><td align="center">#' + soResults[i].getValue('tranid') + (soResults[i].getValue('shipcomplete') == 'T' ? '**' : '') + '</td></tr>';
		}
	}
	soRows += '</table>';
	
	//Return the HTML
	return '<tr style="border-top: 1px solid black;">' +
				'<td>' + itemObj.itemName + '</td>' +
				'<td align="right">' + ConvertNSFieldToString(GD_PutAway_ConvertQtyToStock(itemObj.receiptQty, itemObj.unitsType, itemObj.stockUOM, unitsHash)) + '</td>' +
				'<td align="right">' + ConvertNSFieldToString(GD_PutAway_ConvertQtyToStock(crossDockQty, itemObj.unitsType, itemObj.stockUOM, unitsHash)) + '</td>' +
				'<td align="right">' + ConvertNSFieldToString(GD_PutAway_ConvertQtyToStock(putAwayQty, itemObj.unitsType, itemObj.stockUOM, unitsHash)) + '</td>' +
				'<td>' + soRows + '</td>' +
			'</tr>';
}

/**
 * Converts some item in the base quantity to the stock UOM.
 */
function GD_PutAway_ConvertQtyToStock(baseQty, unitsType, stockUOM, unitsHash)
{
	var unitRec = null;	
	if (unitsHash[unitsType] == null)
	{		
		unitsHash[unitsType] = nlapiLoadRecord('unitstype', unitsType, null);
	}
	unitRec = unitsHash[unitsType];
	
	for (var i=1; i<=unitRec.getLineItemCount('uom'); i++)
	{
		if (unitRec.getLineItemValue('uom', 'internalid', i) == stockUOM)
			return baseQty / ConvertNSFieldToFloat(unitRec.getLineItemValue('uom', 'conversionrate', i));
	}
	
	return baseQty;
}

/**
 * Formats a number to have a zero at the front if it doesn't exist.
 */
function addZero(i)
{
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}
