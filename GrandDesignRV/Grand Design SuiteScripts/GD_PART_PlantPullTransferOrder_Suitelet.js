/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       05 Dec 2016     brians
 *
 */

var DEFAULT_SOURCE_LOCATION = '41';
var DEFAULT_DESTINATION_LOCATION = '41';
var ITEM_TYPE_PLANTPULL = '1';
var ITEM_TYPE_STOCK = '2';
var ITEM_TYPE_PO = '3';

var SUBLIST_TAB_ITEMS = 'custpage_itemsneeded';
var SUBLIST_ITEMS = 'custpage_itemsublist';
var SUBLIST_FIELD_ITEM = 'custpage_item';
var SUBLIST_FIELD_ITEMID = 'custpage_itemid';
var SUBLIST_FIELD_ITEM_NUMBER = 'custpage_itemnum';
var SUBLIST_FIELD_ITEM_ISSELECTED = 'custpage_item_isselected';
var SUBLIST_FIELD_ITEM_ORDERHISTORY = 'custpage_item_orderhistory';
var SUBLIST_FIELD_ITEM_QTYBACKORDERED = 'custpage_item_qtybackordered';
var SUBLIST_FIELD_ITEM_QTYONORDER = 'custpage_item_qtyonorder';
var SUBLIST_FIELD_ITEM_QTYONPENDINGORDER = 'custpage_item_qtyonpendingorder';
var SUBLIST_FIELD_ITEM_QTYTOORDER = 'custpage_item_qtytoorder';
var SUBLIST_FIELD_ITEM_SOURCELOCATION = 'custpage_item_sourcelocation';
var SUBLIST_FIELD_ITEM_QTYONHAND = 'custpage_item_qtyonhand';
var SUBLIST_FIELD_ITEM_STOCKLEVEL = 'custpage_item_stocklevel';
var SUBLIST_FIELD_ITEM_REORDERPOINT = 'custpage_item_reorderpoint';

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function PlantPullTransferOrderSuitelet(request, response){

	if(request.getMethod() == 'GET')
	{
		var itemId = '';

		var form = nlapiCreateForm('Plant Pull Transfer Order', false);

		form.addTab(SUBLIST_TAB_ITEMS, 'Items Needed');
		var sublist = form.addSubList(SUBLIST_ITEMS, 'list', 'Items to Transfer', SUBLIST_TAB_ITEMS);
		sublist.addMarkAllButtons();

		var descriptionField = form.addField('custpage_pagedescription', 'inlinehtml', ' ', null, null);
		var description = '<style>p.plant-pull {font-size: 11pt;} ul.plant-pull li {font-size: 10pt; line-height: 150%;}</style>' +
							'<p class="plant-pull" style="padding-bottom: 5px;"><br/>This page lists all inventory items that meet the following criteria:<ul class="plant-pull">' +
								"<li>The item does not have a Parts Bin</li>" +
								"<li>The item needs to be ordered, based on Plant 17's current quantity on hand, its quantity back ordered, quantity on order, and quantity committed. <br>In order to appear in the list, the item's (Qty on Order + Qty on Hand - Qty Committed) must be less than its Qty Back Ordered.</li>" +
								"<li>The item's Preferred Stock Level and Reorder Point for Plant 17 must both be set to zero (or blank).</li>" +
							'</ul></p></br></br>' +
							'<p style="line-height: 150%; font-size: 10pt;">Clicking the <i>Create Transfer Orders</i> button will add each selected item in the list below to a Transfer Order with the selected source location.<br/>' +
							'The source location on each line defaults to whichever plant (besides Plant 17 Parts & Service) ordered that item most recently.  At most, only one transfer order will be created per location.<br/>' +
							'For instance, if a location is selected as the source for multiple items, each of those items will be added to a single Transfer Order for that location.<br/>' +
							'Any transfer orders created will be marked as "Pending Approval", and they will have a destination location of "Plt 17 - PS".</p><br/>' +
							'<p style="font-size: 10pt;">A <span style="color: #cc0000;">red Item #</span> indicates that the item has been denied on a  Transfer Order within the last 7 days.</p><br/>' +
							'<p style="font-size: 10pt;"><b><a target="_blank" href="/app/common/search/searchresults.nl?searchid=customsearchgd_part_plantpulltransord">Click here</a> to view a list of existing Transfer Orders.</b></p>';
		descriptionField.setDefaultValue(description);

		//Set the client-side script that will run when the user clicks the "Get Order History" link on any given item line.
		var script = '<script>' +
				'function NavigateToItemOrderHistory(itemId)' +
				'{' +
					GetItemOrderHistoryClient(itemId) +
				'}'+
			'</script>';

		var scriptField = form.addField('custpage_getitemhistory', 'inlinehtml', 'History Field', null, SUBLIST_TAB_ITEMS);
		scriptField.setDefaultValue(script);

		//We want to highlight the item in red if either the whole TO the item belongs to was rejected, or if the individual TO line was marked 'Closed'.
		var f =
			[['lastmodifieddate', 'within', 'previousOneWeek'], 'and',
			 [['closed', 'is', 'T'], 'or', ['status', 'anyof', ['TrnfrOrd:C']]]
			 ];

		var c = [];
		c.push(new nlobjSearchColumn('item', null, null));

		var deniedItems = {};
		var deniedResults = nlapiSearchRecord('transferorder', null, f, c);
		if(deniedResults != null && deniedResults != '')
		{
			for(var d = 0; d < deniedResults.length; d++){
				deniedItems[deniedResults[d].getValue('item')] = 'T';
			}
		}

		var dictionaryField = form.addField('custpage_itemdict', 'longtext', 'Dictionary', null, null);
		var itemDict = {};
		var itemObj = '';
		var itemsArray = [];

		var field = sublist.addField(SUBLIST_FIELD_ITEMID, 'text', 'Item Id');
		field.setDisplayType('hidden');
		field = sublist.addField(SUBLIST_FIELD_ITEM_ISSELECTED, 'checkbox', 'Select');
		field.setDisplayType('normal');
		field = sublist.addField(SUBLIST_FIELD_ITEM_NUMBER, 'text', 'Item #');
		field.setDisplayType('inline');
		field = sublist.addField(SUBLIST_FIELD_ITEM, 'text', 'Description');
		field.setDisplayType('inline');
		field = sublist.addField(SUBLIST_FIELD_ITEM_QTYBACKORDERED, 'float', 'Qty Back Ordered');
		field.setDisplayType('inline');
		field = sublist.addField(SUBLIST_FIELD_ITEM_QTYONHAND, 'float', 'Qty on Hand');
		field.setDisplayType('inline');
		//field = sublist.addField(SUBLIST_FIELD_ITEM_STOCKLEVEL, 'float', 'Preferred Stock Level');	//Hide this for extra screen real estate
		//field.setDisplayType('inline');
		//field = sublist.addField(SUBLIST_FIELD_ITEM_QTYONORDER, 'float', 'Qty on Order');				//Hide this for extra screen real estate
		//field.setDisplayType('inline');
		field = sublist.addField(SUBLIST_FIELD_ITEM_QTYONPENDINGORDER, 'float', 'Qty Pend Appr');
		field.setDisplayType('inline');
		field = sublist.addField(SUBLIST_FIELD_ITEM_QTYTOORDER, 'float', 'Qty to Order');
		field.setDisplayType('inline');
		field = sublist.addField(SUBLIST_FIELD_ITEM_SOURCELOCATION, 'select', 'Source Location', 'location');
		field.setDisplayType('normal');
		field = sublist.addField(SUBLIST_FIELD_ITEM_ORDERHISTORY, 'text', 'PO History');
		field.setDisplayType('inline');

		var filterExp =
			[['inventorylocation', 'is', DEFAULT_DESTINATION_LOCATION], 'and',
			['custitemgd_pspreferredbin', 'anyof', ['@NONE@']]
			 ];

		var cols = new Array();
		cols.push(new nlobjSearchColumn('itemid'));
		cols.push(new nlobjSearchColumn('displayname'));
		cols.push(new nlobjSearchColumn('inventorylocation'));
		cols.push(new nlobjSearchColumn('locationquantityavailable'));
		cols.push(new nlobjSearchColumn('locationquantitybackordered'));
		cols.push(new nlobjSearchColumn('locationquantitycommitted'));
		cols.push(new nlobjSearchColumn('locationquantityonhand'));
		cols.push(new nlobjSearchColumn('locationpreferredstocklevel'));
		cols.push(new nlobjSearchColumn('locationreorderpoint'));
		cols.push(new nlobjSearchColumn('locationquantityonorder'));
		cols.push(new nlobjSearchColumn('purchaseunit'));
		cols.push(new nlobjSearchColumn('stockunit'));
		cols.push(new nlobjSearchColumn('unitstype'));

		var results = GetSteppedSearchResults('inventoryitem', filterExp, cols);

		// stores the UOM data so that we can easily convert quantities and costs
		var unitsTypeArray = new Array();

		if(results != null && results.length > 0)
		{
			var lineIndex = 1;
			for(var i = 0; i < results.length; i++)
			{
				var purchaseUnitId = results[i].getValue('purchaseunit');
				var stockUnitId = results[i].getValue('stockunit');
				var unitsTypeId = results[i].getValue('unitstype');

				var onHandQty = Transfer_ConvertQtyUOM(unitsTypeArray, unitsTypeId, stockUnitId, purchaseUnitId, ConvertNSFieldToFloat(results[i].getValue('locationquantityonhand')));
				var onOrderQty = Transfer_ConvertQtyUOM(unitsTypeArray, unitsTypeId, stockUnitId, purchaseUnitId, ConvertNSFieldToFloat(results[i].getValue('locationquantityonorder')));
				var backOrderQty = Transfer_ConvertQtyUOM(unitsTypeArray, unitsTypeId, stockUnitId, purchaseUnitId, ConvertNSFieldToFloat(results[i].getValue('locationquantitybackordered')));
				var reorderPoint = Transfer_ConvertQtyUOM(unitsTypeArray, unitsTypeId, stockUnitId, purchaseUnitId, ConvertNSFieldToFloat(results[i].getValue('locationreorderpoint')));
				var preferredStockLevel = Transfer_ConvertQtyUOM(unitsTypeArray, unitsTypeId, stockUnitId, purchaseUnitId, ConvertNSFieldToFloat(results[i].getValue('locationpreferredstocklevel')));
				var committedQty = Transfer_ConvertQtyUOM(unitsTypeArray, unitsTypeId, stockUnitId, purchaseUnitId, ConvertNSFieldToFloat(results[i].getValue('locationquantitycommitted')));

				var quantityToOrder = 0;
				if(backOrderQty > 0)
				{
					if (reorderPoint != 0)
					{
						// qty to order = back order - on order + preferred stock level - available
						// if there is no preferred stock level, then use the reorder point
						if (preferredStockLevel == 0)
						{
							quantityToOrder = backOrderQty - onOrderQty + reorderPoint + committedQty - onHandQty;
						}
						else
						{
							quantityToOrder = backOrderQty - onOrderQty + preferredStockLevel + committedQty - onHandQty;
						}
					}
					else
					{
						quantityToOrder = backOrderQty - onOrderQty + committedQty - onHandQty;
					}
				}

				//Only add this item to our list if the quantityToOrder is greater than zero
				//GD only wants items to show up if the preferred stock level & reorder poitns are zero - Case #8881 - 10/31/17 BrianS
				if(quantityToOrder > 0 && preferredStockLevel == 0 && reorderPoint == 0)
				{
					//Add this item to our dictionary
					itemObj = {};
					itemObj.id = results[i].getId();
					itemObj.quantity = quantityToOrder;
					itemObj.line = lineIndex;
					itemObj.pendingQty = '';
					itemObj.location = '';	//This property will be set on 'POST'
					itemObj.isSelected = 'F';
					itemDict[itemObj.id] = itemObj;

					sublist.setLineItemValue(SUBLIST_FIELD_ITEMID, lineIndex, itemObj.id);
					//Color the item link red if it has been denied within the last 7 days.
					if(deniedItems[itemObj.id] != null)
						sublist.setLineItemValue(SUBLIST_FIELD_ITEM_NUMBER, lineIndex, '<a href="' + nlapiResolveURL('RECORD', 'inventoryitem', itemObj.id) + '" target="_blank" style="color: #cc0000;">' + results[i].getValue('itemid') + '</a>');
					else
						sublist.setLineItemValue(SUBLIST_FIELD_ITEM_NUMBER, lineIndex, '<a href="' + nlapiResolveURL('RECORD', 'inventoryitem', itemObj.id) + '" target="_blank" style="color: #000000;">' + results[i].getValue('itemid') + '</a>');

					sublist.setLineItemValue(SUBLIST_FIELD_ITEM, lineIndex, results[i].getValue('displayname'));
					sublist.setLineItemValue(SUBLIST_FIELD_ITEM_QTYBACKORDERED, lineIndex, backOrderQty.toFixed(2));
					//sublist.setLineItemValue(SUBLIST_FIELD_ITEM_STOCKLEVEL, lineIndex, preferredStockLevel.toFixed(2));	//Hide this for extra screen real estate
					//sublist.setLineItemValue(SUBLIST_FIELD_ITEM_QTYONORDER, lineIndex, onOrderQty.toFixed(2)); 			//Hide this for extra screen real estate
					sublist.setLineItemValue(SUBLIST_FIELD_ITEM_QTYONHAND, lineIndex, onHandQty.toFixed(2));
					sublist.setLineItemValue(SUBLIST_FIELD_ITEM_SOURCELOCATION, lineIndex, '');
					sublist.setLineItemValue(SUBLIST_FIELD_ITEM_QTYTOORDER, lineIndex, quantityToOrder.toFixed(2));
					sublist.setLineItemValue(SUBLIST_FIELD_ITEM_ORDERHISTORY, lineIndex, '<a href="javascript:{}" onclick="NavigateToItemOrderHistory('+ itemObj.id + ');"><b>View POs</b></a>');

					itemsArray.push(itemObj.id);
					lineIndex++;
				}

			}

			//Now that we have all the items, create a dictionary {itemId : locationId} with the most recent order location for each item
			var itemLocationsDictionary = GetMostRecentOrderLocationForItems(itemsArray);
			//Find the quantities of items that are on pending transfer orders, and add that info to our item Dictionary
			GetTransferOrdersPendingApproval(itemsArray, itemDict);

			//Loop over the items in our dictionary and set the default source location
			for(key in itemDict)
			{
				var item = '';
				var defaultItemLoc = '';
				var pendingApprovalQty = '';
				var newOrderQty = '';
				if(itemDict.hasOwnProperty(key))
				{
					item = itemDict[key];
					pendingApprovalQty = item.pendingQty;
					defaultItemLoc = itemLocationsDictionary[item.id];

					if(pendingApprovalQty != '')
					{
						//Set the pending approval quantity
						sublist.setLineItemValue(SUBLIST_FIELD_ITEM_QTYONPENDINGORDER, item.line, pendingApprovalQty);
						//Adjust our order qty to reflect what's pending approval.  The qty to order will not be set below zero.
						newOrderQty = item.quantity - pendingApprovalQty;
						if(newOrderQty <= 0)
						{
							item.quantity = 0;
							sublist.setLineItemValue(SUBLIST_FIELD_ITEM_QTYTOORDER, item.line, '0.00');
						}
						else
						{
							item.quantity = newOrderQty;
							sublist.setLineItemValue(SUBLIST_FIELD_ITEM_QTYTOORDER, item.line, newOrderQty);
						}

					}

					//If we found a default location for this item, then set it
					if(defaultItemLoc != null){
						//Check to make sure the last order location is not the same as the destination location
						if(defaultItemLoc != DEFAULT_DESTINATION_LOCATION)
							sublist.setLineItemValue(SUBLIST_FIELD_ITEM_SOURCELOCATION, item.line, defaultItemLoc);
						else
							sublist.setLineItemValue(SUBLIST_FIELD_ITEM_SOURCELOCATION, item.line, '');
					}
					//If not, set it to the default source location
					else
						sublist.setLineItemValue(SUBLIST_FIELD_ITEM_SOURCELOCATION, item.line, '');
				}
			}
		}



//		dictionaryField.setDefaultValue(JSON.stringify(itemDict));
		dictionaryField.setDisplayType('hidden');

		form.addSubmitButton('Create Transfer Orders');

		response.writePage(form);
	}
	else //POST
	{
		if(request != null)
		{
			var itemDict = {};//JSON.parse(request.getParameter('custpage_itemdict'));

			var itemId = '';
			var lineIndex = 0;
			//Get the location values on each line, and add that info to the location property of our item dictionary
			for(var i = 0; i < request.getLineItemCount(SUBLIST_ITEMS); i++)
			{
				lineIndex = i + 1;
				itemId = request.getLineItemValue(SUBLIST_ITEMS, SUBLIST_FIELD_ITEMID, lineIndex);
				if(request.getLineItemValue(SUBLIST_ITEMS, SUBLIST_FIELD_ITEM_ISSELECTED, lineIndex) == 'T')
				{
					if(ConvertNSFieldToString(request.getLineItemValue(SUBLIST_ITEMS, SUBLIST_FIELD_ITEM_SOURCELOCATION, lineIndex)) == '')
						throw "SOURCE LOCATION NOT SET - You must select a source location for each item you have selected to transfer.";

					itemDict[itemId] = {
						isSelected: request.getLineItemValue(SUBLIST_ITEMS, SUBLIST_FIELD_ITEM_ISSELECTED, lineIndex),
						location: request.getLineItemValue(SUBLIST_ITEMS, SUBLIST_FIELD_ITEM_SOURCELOCATION, lineIndex),
						id: itemId,
						quantity: request.getLineItemValue(SUBLIST_ITEMS, SUBLIST_FIELD_ITEM_QTYTOORDER, lineIndex)
					};
				}
			}

			//Start the scheduled script.
			var parameters = [];
			parameters['custscriptgd_createto_itemdict'] = JSON.stringify(itemDict);
			parameters['custscriptgd_createto_itemdictlength'] = lineIndex;
			ScheduleScript('customscriptgd_createtransferorder_sch', null, parameters);

			var form = nlapiCreateForm('Processing Transfer Orders', false);

			var field = form.addField('custpage_details', 'inlinehtml', ' ', null, null);

			var url = nlapiResolveURL('SUITELET', 'customscriptgd_planttransfer_suitelet', 'customdeploygd_planttransfer_suitelet', null);

			var text = '<html><body>' +
						'<style>.details p {font-size: 11pt; line-height: 150%;}</style>' +
						'<div class="details">' +
						'<p>Your transfer order request is being processed.</p><br/>' +
						'<p style="max-width: 600px;"><a target="_blank" href="/app/common/search/searchresults.nl?searchid=customsearchgd_part_plantpulltransord">Click here</a> to view the list of Transfer Orders.  You may need to refresh the page, as it may take up to a minute for all of your newly-created Transfer Orders to appear.</p><br/>' +
						'<p><a href="'+ url + '">Click here</a> to go back to the Plant Pull Transfer Order page.</p><br/>' +
						'</div>' +
						'</body></html>';

			field.setDefaultValue(text);
			response.writePage(form);
		}
	}
}

/*
 * A search that finds the location that ordered an item most recently, for an array of items.
 */
function GetMostRecentOrderLocationForItems (itemsArray) {

	if(itemsArray != null && itemsArray.length > 0)
	{
		//For some reason, our purchase order search summary column can only return the Location text, not the location id,
		//So we need to build a dictionary of the location names & ids
		var systemLocations = {};
		systemLocationsResults = nlapiSearchRecord('location', null, new nlobjSearchFilter('isinactive', null, 'is', 'F'), new nlobjSearchColumn('name'));
		if(systemLocationsResults != null && systemLocationsResults.length > 0) {
			for(var i = 0; i < systemLocationsResults.length; i++) {
				systemLocations[systemLocationsResults[i].getValue('name')] = systemLocationsResults[i].getId();
			}
		}

		var itemLocations = {};

		var filters = new Array();
		filters.push(new nlobjSearchFilter('item', null, 'anyof', itemsArray));
		filters.push(new nlobjSearchFilter('isinactive', 'location', 'is', 'F'));
		filters.push(new nlobjSearchFilter('location', null, 'noneof', [DEFAULT_DESTINATION_LOCATION]));

		var cols = new Array();
		cols.push(new nlobjSearchColumn('item', null, 'group'));
		cols[0].setSort(false); //Sort first by item
		cols.push(new nlobjSearchColumn('location', null, 'max'));
		cols[1].setWhenOrderedBy('trandate', null); //Get the location of the most recent PO date

		var results = nlapiSearchRecord('purchaseorder', null, filters, cols);
		if(results != null && results.length > 0)
		{
			var itemId = '';
			var locationName = '';
			for(var i = 0; i < results.length; i++)
			{
				itemId = results[i].getValue(cols[0]);
				locationName = results[i].getValue(cols[1]);

				//Replace the location text with the location id we found earlier
				if(systemLocations.hasOwnProperty(locationName))
				{
					itemLocations[itemId] = systemLocations[locationName];
				}
			}
		}
		return itemLocations;
	}
}

function GetTransferOrdersPendingApproval(itemsArray, theItemDict)
{
	if(itemsArray != null && itemsArray.length > 0)
	{
		var filterExp = [['item', 'anyof', itemsArray], 'AND',
		                 ['status', 'anyof', 'TrnfrOrd:A'], 'AND',
		                 ['location', 'anyof', DEFAULT_DESTINATION_LOCATION]
		                 ];

		var columns = [];
		columns.push(new nlobjSearchColumn('custcolgd_part_requestedqty', null, 'sum'));
		columns.push(new nlobjSearchColumn('item', null, 'group'));

		var pendingApprovalResults = nlapiSearchRecord('transferorder', null, filterExp, columns);
		if(pendingApprovalResults != null && pendingApprovalResults.length > 0)
		{
			var totalPendingApprovalQty = '';
			for(var i = 0; i < pendingApprovalResults.length; i++)
			{
				//Get the total requested qty for this item
				totalPendingApprovalQty = parseFloat(pendingApprovalResults[i].getValue('custcolgd_part_requestedqty', null, 'sum'));

				//Update the pending qty attribute at the the appropriate index in the dictionary
				if(!isNaN(totalPendingApprovalQty))
					theItemDict[pendingApprovalResults[i].getValue('item', null, 'group')].pendingQty = totalPendingApprovalQty.toFixed(2);
			}
		}
	}
}

/*
 * A search that gets the order history for a given item.  This is the search used for the 'View' Order History popup
 */
function GetItemOrderHistoryResults(itemId) {
	//Find the most recent order of this item from an active non-production location
	var filters = new Array();
	filters.push(new nlobjSearchFilter('item', null, 'is', itemId));
	filters.push(new nlobjSearchFilter('isinactive', 'location', 'is', 'F'));

	var cols = new Array();
	cols.push(new nlobjSearchColumn('tranid'));
	cols.push(new nlobjSearchColumn('location'));
	cols.push(new nlobjSearchColumn('trandate'));
	cols[cols.length-1].setSort(true);
	cols.push(new nlobjSearchColumn('quantity'));

	var results = nlapiSearchRecord('purchaseorder', null, filters, cols);
	return results;
}

/*
 * Small client-side function that calls a Suitelet to get the item order history for a given item
 */
function GetItemOrderHistoryClient(itemId) {
	return "" +
	"if(itemId != null && itemId != '')" +
	"{" +
		"var pUrl = nlapiResolveURL('SUITELET', 'customscriptgd_itemorderhistory_suitelet', 'customdeploygd_itemorderhistory_suitelet', null) + '&custparam_itemid=' + itemId;" +
		"var width = parseInt(window.innerWidth * .5);" +
    	"var height = parseInt(window.innerHeight * .6);" +
    	"window.open(pUrl, 'Order History', 'location=no,status=no,menubar=no,resizable=no,toolbar=no,scrollbars=yes,titlebar=no,top=10,width=' + width + ',height=' + height);" +
	"}";
}


/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GetItemOrderHistorySuitelet(request, response)
{
	if(request.getMethod() == 'GET')
	{
		var itemId = request.getParameter('custparam_itemid');

		if(itemId != null && itemId != '')
		{
			var itemName = nlapiLookupField('inventoryitem', itemId, 'displayname');

			var BODY_FIELD_ITEM = 'custpage_itemorder_item';
			var SUBLIST_FIELD_LOCATION = 'custpage_itemorder_location';
			var SUBLIST_FIELD_ORDERNUMBER = 'custpage_itemorder_order';
			var SUBLIST_FIELD_ORDERDATE = 'custpage_itemorder_date';
			var SUBLIST_FIELD_ORDERQTY = 'custpage_itemorder_qty';

			var form = nlapiCreateForm('Purchase Order History', true);

			var field = form.addField(BODY_FIELD_ITEM, 'text', 'Item', null, null);
			field.setDisplayType('inline');
			field.setDefaultValue(itemName);

			var historySublist = form.addSubList('custpage_sublistorderhistory', 'list', 'Most Recent Purchase Orders by Plant', null);

			field = historySublist.addField(SUBLIST_FIELD_LOCATION, 'text', 'Location');
			field.setDisplayType('inline');
			field = historySublist.addField(SUBLIST_FIELD_ORDERNUMBER, 'text', 'Order #');
			field.setDisplayType('inline');
			field = historySublist.addField(SUBLIST_FIELD_ORDERDATE, 'date', 'Date');
			field.setDisplayType('inline');
			field = historySublist.addField(SUBLIST_FIELD_ORDERQTY, 'float', 'Qty');
			field.setDisplayType('inline');

			var results = GetItemOrderHistoryResults(itemId);

			if(results != null && results.length > 0)
			{
				var locs = {};
				var locId = '';
				var locName = '';
				var lineIndex = 0;
				for(var i = 0; i < results.length; i++)
				{
					locId = results[i].getValue('location');
					//If we haven't found an order from this location yet, add it to our list
					if(locs[locId] == null)
					{
						locName = results[i].getText('location');
						locs[locId] = locName;
						lineIndex++;

						var url = nlapiResolveURL('RECORD', 'purchaseorder', results[i].getId());
						historySublist.setLineItemValue(SUBLIST_FIELD_LOCATION, lineIndex, locName);
						historySublist.setLineItemValue(SUBLIST_FIELD_ORDERNUMBER, lineIndex, '<a href="' + url + '" target="_blank">' + results[i].getValue('tranid') + '</a>');
						historySublist.setLineItemValue(SUBLIST_FIELD_ORDERDATE, lineIndex, results[i].getValue('trandate'));
						historySublist.setLineItemValue(SUBLIST_FIELD_ORDERQTY, lineIndex, results[i].getValue('quantity'));
					}
				}
			}

			form.addButton('custpage_closebutton', 'Close', 'window.close()');

			response.writePage(form);
		}
		else
		{
			throw "No item found. You must navigate to this Suitelet via a link from the Plant Pull Transfer Order page.";
		}
	}
}

/**
 * Converts a quantity from one UOM to another.
 * @param unitsTypeArray
 * @param unitsTypeId
 * @param fromUOM
 * @param toUOM
 * @param quantity
 */
function Transfer_ConvertQtyUOM(unitsTypeArray, unitsTypeId, fromUOMId, toUOMId, quantity)
{
	if (fromUOMId != toUOMId && quantity != 0)
	{
		var unitsType = null;
		if (unitsTypeArray[unitsTypeId] == null)
		{
			unitsTypeArray[unitsTypeId] = nlapiLoadRecord('unitstype', unitsTypeId, null);
		}

		unitsType = unitsTypeArray[unitsTypeId];

		// find the from conversion rate
		// and the to conversion rate
		var fromRate = 0;
		var toRate = 0;

		var count = unitsType.getLineItemCount('uom');

		for (var i=1; i<=count; i++)
		{
			var uomInternalId = unitsType.getLineItemValue('uom', 'internalid', i);

			if (uomInternalId == fromUOMId)
				fromRate = unitsType.getLineItemValue('uom', 'conversionrate', i);

			if (uomInternalId == toUOMId)
				toRate = unitsType.getLineItemValue('uom', 'conversionrate', i);
		}

		var baseQty = quantity * fromRate;
		var toQty = baseQty / toRate;
		return toQty;
	}

	return quantity;
}
