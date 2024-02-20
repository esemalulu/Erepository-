/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Nov 2014     jeffrb
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
 function GD_InvNonInvAsmblyKitItems_BeforeLoad(type, form, request){
	if (nlapiGetRecordType() == 'assemblyitem'){
		if (type == 'edit' || type == 'view' || type == 'create' || type == 'copy') {
			var itemMemberSublist = form.getSubList('member') || null;
			var objectResult = new Array();
			if (itemMemberSublist != null) {
				// now add sort order, purchase Price, and inactive fields.
				var sortOrderField = itemMemberSublist.addField('custpage_sortorder', 'integer', 'Sort Order', null);
				sortOrderField.setDisabled(true);

				var purchasePriceField = itemMemberSublist.addField('custpage_purchaseprice', 'currency', 'Purchase Price', null);
				purchasePriceField.setDisabled(true);
				var isInactiveField = itemMemberSublist.addField('custpage_isinactive', 'text', 'Is Inactive', null);
				isInactiveField.setDisabled(true);
				
				var itemQuantityHiddenField = itemMemberSublist.addField('custpage_itemquantity', 'text', 'Item Quantity Stored Value', null);
				itemQuantityHiddenField.setDisabled(true);
				itemQuantityHiddenField.setDisplayType('hidden');
				
				// add a hidden field that holds the components extra columns data
				var itemExtraColumnsDataField = form.addField('custpage_extracolumnsdata', 'longtext', 'Extra Columns Data');
				itemExtraColumnsDataField.setDisplayType('hidden');
				
				var lineCount = itemMemberSublist.getLineItemCount() || 0;
				
				if (lineCount > 0) {
					// There are components lines, get the item ids into an array to use in a search that gets the data we need.
					var itemExtraColumnDataObject = new Object();
					var itemDataArray = new Array();
					var itemIdArray = new Array();
					for (var i = 1; i <= lineCount; i++) {
						itemIdArray.push(nlapiGetLineItemValue('member', 'item', i));
					}
					
					var itemCols = new Array();
					itemCols[itemCols.length] = new nlobjSearchColumn('isinactive', null, null);
					itemCols[itemCols.length] = new nlobjSearchColumn('cost', null, null);
					
					var itemFilters = new Array();
					itemFilters[itemFilters.length] = new nlobjSearchFilter('internalid', null, 'anyof', itemIdArray);
					
					var itemResults = nlapiSearchRecord('item', null, itemFilters, itemCols) || [];
					// create a JSON array and make it into a string to set on our hidden extra column field.
					for (var i = 0; i < itemResults.length; i++) {
						itemExtraColumnDataObject.internalid = itemResults[i].getId();
						itemExtraColumnDataObject.cost = itemResults[i].getValue('cost') || 0;
						itemExtraColumnDataObject.isinactive = itemResults[i].getValue('isinactive');
						itemDataArray.push(itemExtraColumnDataObject);
						itemExtraColumnDataObject = new Object();
					}
					nlapiSetFieldValue('custpage_extracolumnsdata', JSON.stringify(itemDataArray));
					
					// now we set the data on the components line.
					var isInactiveValue = 'F';
					if (itemDataArray.length > 0) {
						for (var i = 1; i <= lineCount; i++) {
							itemMemberSublist.setLineItemValue('custpage_sortorder', i, i.toString());
							objectResult = itemDataArray.filter(function(result){return result.internalid == itemMemberSublist.getLineItemValue('item', i)}) || [];
							itemMemberSublist.setLineItemValue('custpage_purchaseprice', i, objectResult[0].cost);
							isInactiveValue = objectResult[0].isinactive || 'F';
							itemMemberSublist.setLineItemValue('custpage_isinactive', i, isInactiveValue == 'T' ? 'Yes' : 'No');
							
							itemMemberSublist.setLineItemValue('custpage_itemquantity', i, itemMemberSublist.getLineItemValue('quantity', i));
						}
					}
				}
			}
		}		
	}
}

/**
 * We update the price if there are any changes.  We check in this order: Preferred Vendor, 
 * Purchase Price and Last Purchase Price. 
 * @appliedtorecord inventoryitem, assemblyitem, kititem, noninventoryitem
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function GD_InvNonInvAsmblyKitItems_BeforeSubmit(type)
{
	
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function GD_InvNonInvAsmblyKitItems_AfterSubmit(type) {
	if (type == 'edit' || type == 'create') {
		if (nlapiGetFieldValue('custitemrvsitemtype') == ITEM_CATEGORY_INVENTORY_ITEMS) {
			GDInv_TryUpdatePrice(type);
		}
		
		if (nlapiGetFieldValue('baserecordtype') == 'inventoryitem' || nlapiGetFieldValue('baserecordtype') == 'noninventoryitem') {
			// On save of inventory items need to reset search-able vendor codes on the header on a hidden textArea field.
			var searchVendorCodeResults = nlapiSearchRecord(nlapiGetFieldValue('baserecordtype'), null, ['internalid', 'is', nlapiGetRecordId()], new nlobjSearchColumn('vendorcode')) || [];
			
			if (searchVendorCodeResults.length > 0) {
				// create the text with space and semicolon between vendor codes.
				var resultStringFormatted = '';
				for (var i = 0; i < searchVendorCodeResults.length; i++) {
					resultStringFormatted +=  ' ' + searchVendorCodeResults[i].getValue('vendorcode') + ';'
				}
				
				// Try a few times in case of collision or record has been changed errors.
				var maxTryCount = 5;
				var curTryCount = 0;
				while(curTryCount < maxTryCount) {
			    	try {
			    		// Set text on the vendor part code searchAble field.
			    		nlapiSubmitField(nlapiGetFieldValue('baserecordtype'), nlapiGetRecordId(), 'custitemgd_vendorpartcodessearchable', resultStringFormatted);
			    		
			    		curTryCount = maxTryCount;
			    		
			    		break;
			    	} catch(err) {
			    		nlapiLogExecution('AUDIT', 'err message', JSON.stringify(err));
			    		if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
			    			curTryCount++;
			    			continue;
			    		}
			    		
			    		throw err;
			    	}
				}
			}
		}
	}
}
/****************************** BEGIN CLIENT SCRIPTS ***************************************************/
/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord item
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function GD_Item_FieldChanged(type, name, linenum) {
	if (nlapiGetRecordType() == 'assemblyitem'){
		if(type == 'member'){
			if (name == 'item'){
				var quantity = nlapiGetCurrentLineItemValue(type, 'quantity');
				var hiddenQuantityStored = nlapiGetCurrentLineItemValue(type, 'custpage_itemquantity') || 0;
				// compare the line quantity and the on the fly quantity column we added and if there is a value on the hidden quantity field, it should be set, otherwise, set the quantity to empty.
				if (hiddenQuantityStored != 0) {
					nlapiSetCurrentLineItemValue(type, 'quantity', hiddenQuantityStored, false, false);
				} else {
					nlapiSetCurrentLineItemValue(type, 'quantity', '', false, false);
				} 
			}
		}

		// If any fields in the Unit Appliance Template on the Model were changed, mark checkbox true. This will trigger Unit Appliance Update MapRed.
		if (name == 'custrecordunitappliancetemplate_brand' || name == 'custrecordunitappliancetemplate_desc' || name == 'custrecordunitappliancetemplate_modelnum' ||
			name == 'custrecordunitappliancetemplate_serial' || name == 'custrecordunitappliancetemplate_type' || name == 'custrecordunitappliancetemplate_vendor' ||
			name == 'custrecordgd_unitappliancetemplate_categ') {
				nlapiSetFieldValue('custitemgd_unitappliancesupdated', 'T');
		}
	}
}

/**
 * Post Sourcing
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function GD_Item_PostSourcing(type, name, linenum) {
	if (nlapiGetRecordType() == 'assemblyitem'){
		if(type == 'member'){
			if (name == 'item'){
				if (nlapiGetCurrentLineItemValue(type, 'item') || '' != '') {
					var quantity = nlapiGetCurrentLineItemValue(type, 'quantity');
					var hiddenQuantityStored = nlapiGetCurrentLineItemValue(type, 'custpage_itemquantity') || 0;
					// compare the line quantity and the on the fly quantity column we added and if there is a value on the hidden quantity field, it should be set, otherwise, set the quantity to empty.
					if (hiddenQuantityStored != 0) {
						nlapiSetCurrentLineItemValue(type, 'quantity', hiddenQuantityStored, false, false);
					} else {
						nlapiSetCurrentLineItemValue(type, 'quantity', '', false, false);
					}
					
					// check if the item is already part of hidden data array field
					var itemDataArray = JSON.parse(nlapiGetFieldValue('custpage_extracolumnsdata'));
					var isInactiveValue = 'F';
					var itemFound = false;
					if (itemDataArray.length > 0) {
						// set the sort order column since it is always the line number.
						nlapiSetCurrentLineItemValue(type, 'custpage_sortorder', nlapiGetCurrentLineItemIndex(type), false, false);
						// Check first if this item is already in our data array.
						var objectResult = itemDataArray.filter(function(result){return result.internalid == nlapiGetCurrentLineItemValue(type, 'item')}) || [];

						if (objectResult.length > 0) {
							itemFound = true;
						} else {
							// if it does not exist yet, do a lookup using our client-side script friendly lookup suitlet.  This is used so that even if users do not have access to items it will work for them.
							objectResult = [LookupSuitelet_LookupField('item', nlapiGetCurrentLineItemValue(type, name), ['internalid', 'cost', 'isinactive'])] || [];
							if (objectResult.length > 0) {
								// Data is found so we add it to our data array and update our extra column data field.  This helps reduce issues or slowness on the page in case the sort compoents
								// is run and all lines need to be removed and readded, most of the data will be on the page already and may only need to do the lookup once, depending on how many new lines were added by
								// the user.
								itemDataArray.push(objectResult[0]);
								nlapiSetFieldValue('custpage_extracolumnsdata', JSON.stringify(itemDataArray));
								itemFound = true;
							}
						}
						if (itemFound) {
							// we can safely set the values on the components line.
							nlapiSetCurrentLineItemValue(type, 'custpage_purchaseprice', objectResult[0].cost, false, false);
							isInactiveValue = objectResult[0].isinactive || 'F';
							nlapiSetCurrentLineItemValue(type, 'custpage_isinactive', isInactiveValue == 'T' ? 'Yes' : 'No', false, false);
							nlapiSetCurrentLineItemValue(type, 'custpage_itemquantity', nlapiGetCurrentLineItemValue(type, 'quantity'));
						}
					}
				}
			}
		}
	}
}

/**
 * Post Sourcing
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function GD_Item_ValidateLine(type) {
	if (nlapiGetRecordType() == 'assemblyitem'){
		if(type == 'member'){
			//set the quantity to the custom on the fly column field in case the quantity was set to a new value.
			var quantity = nlapiGetCurrentLineItemValue(type, 'quantity') || 0;
			nlapiSetCurrentLineItemValue(type, 'custpage_itemquantity', quantity, false, false);
		}
	}
	return true;
}

/****************************** BEGIN HELPER FUNCTIONS ***************************************************/
/**
 * Tries to update the price on the item record if anything changed.
 * @param {String} type Operation types: create, edit, delete, xedit
 */
function GDInv_TryUpdatePrice(type)
{
	var oldRecord = nlapiGetOldRecord();
	var newRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
	
	//If either the purchase units or the sales units changed, then we do the update even if the costs match later on.
	var overrideUpdate = false;
	if (oldRecord != null)
	{
		var basePrice = ConvertNSFieldToString(newRecord.getLineItemMatrixValue('price', 'price', 1, 1));
		overrideUpdate = (oldRecord.getFieldValue('purchaseunit') != newRecord.getFieldValue('purchaseunit')) || 
						 (oldRecord.getFieldValue('saleunit') != newRecord.getFieldValue('saleunit')) ||
						 (basePrice.length == 0);
	}
	
	//First try get the cost from the vendor sublist.
	//If the cost hasn't changed, then don't do any change.
	var oldVendorCost = null;
	if(oldRecord != null)
	{
		for (var i = 1; i <= oldRecord.getLineItemCount('itemvendor'); i++)
		{
			if (oldRecord.getLineItemValue('itemvendor', 'preferredvendor', i) == 'T')
			{
				oldVendorCost = oldRecord.getLineItemValue('itemvendor', 'purchaseprice', i);
				break;
			}
		}
	}
	for (var i = 1; i <= newRecord.getLineItemCount('itemvendor'); i++)
	{
		if (newRecord.getLineItemValue('itemvendor', 'preferredvendor', i) == 'T')
		{
			//We found the new preferred vendor cost. If it is different from the old vendor cost then update the field. We can't use 0 though
			var cost = ConvertNSFieldToFloat(newRecord.getLineItemValue('itemvendor', 'purchaseprice', i));
			if (cost != 0 && (overrideUpdate || cost != oldVendorCost))
			{
				GDInv_UpdatePrice(cost, newRecord);
			}
			//Regardless of whether or not it matched, we're done at this point. We can't check anything else.
			return;
		}
	}
	
	//If we got this far, then there is no preferred vendor price set.
	//So use the purchase price if it is set and different from the last price.
	var oldPurchPrice = 0;
	if (oldRecord != null)
		ConvertNSFieldToString(oldRecord.getFieldValue('cost'));
	var newPurchPrice = ConvertNSFieldToString(newRecord.getFieldValue('cost'));
	if (newPurchPrice != 0 && (overrideUpdate || (newPurchPrice.length > 0 && newPurchPrice != oldPurchPrice)))
	{
		GDInv_UpdatePrice(newPurchPrice, newRecord);
		return;
	}
	
	//If we're this far then nothing worked. We need to use the last purchase price as the option.
	//Assuming that it's different from the old last purchase price.
	var oldLastPurchPrice = 0;
	if (oldRecord != null)
		ConvertNSFieldToString(oldRecord.getFieldValue('lastpurchaseprice'));
	var newLastPurchPrice = ConvertNSFieldToString(newRecord.getFieldValue('lastpurchaseprice'));
	if (newLastPurchPrice != 0 && (overrideUpdate || (newLastPurchPrice.length > 0 && newLastPurchPrice != oldLastPurchPrice)))
	{
		GDInv_UpdatePrice(newLastPurchPrice, newRecord);
	}
	
	//It could be that we get to this point and still haven't updated anything. That's okay.
}

/**
 * Updates the inventory item with the specified cost
 * 
 * @param {String | Number} newCost
 * @param {nlobjRecord} itemRecord
 */
function GDInv_UpdatePrice(newCost, itemRecord)
{
	newCost = ConvertNSFieldToFloat(newCost);
	
	//Get the conversion from the purchase UOM to the sales UOM
	var uomRecord = nlapiLoadRecord('unitstype', itemRecord.getFieldValue('unitstype'));
	var purchUOM = itemRecord.getFieldValue('purchaseunit');
	var salesUOM = itemRecord.getFieldValue('saleunit');
	var purchConv = 1;
	var salesConv = 1;
	for (var i = 1; i <= uomRecord.getLineItemCount('uom'); i++)
	{
		if (uomRecord.getLineItemValue('uom', 'internalid', i) == purchUOM)
			purchConv = uomRecord.getLineItemValue('uom', 'conversionrate', i);
		
		if (uomRecord.getLineItemValue('uom', 'internalid', i) == salesUOM)
			salesConv = uomRecord.getLineItemValue('uom', 'conversionrate', i);
	}
	
	nlapiLogExecution('debug', 'info', JSON.stringify({
		cost: newCost,
		salesConv: salesConv,
		purchConv: purchConv,
		total: (salesConv / purchConv) * newCost * (1 + parseFloat(GetPricingMarkupPreference())/100)
	}));
	
	//The new cost is the sales/purch conv * the new cost * the markup %
	itemRecord.selectLineItem('price', '1');
	itemRecord.setCurrentLineItemMatrixValue('price', 'price', 1, (salesConv / purchConv) * newCost * (1 + parseFloat(GetPricingMarkupPreference())/100));
	itemRecord.commitLineItem('price');
	nlapiSubmitRecord(itemRecord);
}

/********************************* END HELPER FUNCTIONS ***********************************************/

/********************************* BEGIN SCHEDULED SCRIPT *********************************************/

/**
 * Nightly scheduled script that sets item's price that has no preferred vendor, no vendor price or purchase price or that they are both zero.
 * This script will set the base price as last purchase price if it has a value, otherwise base price is zero.
 * @appliedtorecord inventoryitem, assemblyitem, kititem, noninventoryitem, item
 */
function GD_ItemPricingUpdateNightlyScheduled()
{
	var ctx = nlapiGetContext();
	ctx.setPercentComplete(0.0);
	// Need a search that gets items that has no preferredvendor, no price or purchase price or they are both zero.
	var filters = [new nlobjSearchFilter('vendorcost', null, 'is', 0),
	               new nlobjSearchFilter('cost', null, 'is', 0),
	               new nlobjSearchFilter('custitemrvsitemtype', null, 'is', ITEM_CATEGORY_INVENTORY_ITEMS),
	               new nlobjSearchFilter('isinactive', null, 'is', 'F')];
	var itemVendorPurchasePricesFormulaFilter = new nlobjSearchFilter('formulanumeric', null, 'equalTo', 1, null);
	itemVendorPurchasePricesFormulaFilter.setFormula("CASE WHEN ({vendor} IS NULL OR {vendor} = '') AND ({cost} = 0 OR {cost} IS NULL OR {cost} = '')THEN 1ELSE CASE WHEN {vendor} IS NOT NULL AND {vendor} <> '' AND ({vendorcostentered} = 0 OR {vendorcostentered} = '' OR  {vendorcostentered} = NULL) AND ({cost} = 0 OR {cost} IS NULL OR {cost} = '') THEN 1 ELSE 0 END END");
	filters.push(itemVendorPurchasePricesFormulaFilter);
	var results = nlapiSearchRecord('item', null, filters);

	// if current base price is the same as the base price we are setting then don't submit.
	if (results != null)
	{
		for (var i = 0; i < results.length; i++)
		{
			var itemRecord = nlapiLoadRecord(results[i].getRecordType(), results[i].getId());
			var newCost = ConvertNSFieldToFloat(itemRecord.getFieldValue('lastpurchaseprice'));
			GDInv_UpdatePrice(newCost, itemRecord);
			
			//Set percent complete, yield if necessary
			ctx.setPercentComplete(Math.round(((100* i)/ results.length) * 100)/100);
			if (ctx.getRemainingUsage() < 100 && i+1 < results.length)
			{
				nlapiYieldScript();
			}
		}
	}
}

/********************************* END SCHEDULED SCRIPT *********************************************/

/********************************* BEGIN MASS UPDATE SCRIPT *********************************************/

/**
 * We update all items price using vendor price if set, then purchase price then last purchase price, otherwise we set to zero.
 * @param rec_type
 * @param rec_id
 */
function GD_ItemPriceMassUpdate(rec_type, rec_id)
{
	nlapiSubmitRecord(nlapiLoadRecord(rec_type, rec_id));
}
