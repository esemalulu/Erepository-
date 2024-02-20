/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Apr 2016     jeffrb
 *
 */

// GLOBAL VARIABLES
var decorIndex = '';
var modelIndex = '';

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_OptionsReSortMassUpdate(type, id)
{
	var salesOrder = nlapiLoadRecord(type, id);
	
	var lineCount = salesOrder.getLineItemCount('item');
	var itemArray = new Array();
	var lineObject = '';
	var lineItemId = '';
	var itemCategory, itemId, quantity, description, priceLevel, rate, amount, commit, commitmentConfirmed, orderPriority, tax, closed, advertisingFee, geFinancingFee, itemName, msrpAmount, bin, gst, pst, hst, displayDiscountLineItem;
	for (var i = lineCount; i >= 1; i--)
	{
		salesOrder.selectLineItem('item', i);
		lineItemId = salesOrder.getCurrentLineItemValue('item', 'item');
		decorIndex = (decorIndex != '' ? decorIndex : (lineItemId == salesOrder.getFieldValue('custbodyrvsdecor') ? i : ''));  //if decor is on the line set the index
		modelIndex = (modelIndex != '' ? modelIndex : (lineItemId == salesOrder.getFieldValue('custbodyrvsmodel') ? i : ''));  //if model is on the line set the index
		
		//check item if it is an option
		//if it is an option we get the values except for the sort order which we get from the item record.
		//we then delete the item after getting the line values.
		itemCategory = salesOrder.getCurrentLineItemValue('item', 'custcolrvsitemcategory');
		if (itemCategory == ITEM_CATEGORY_OPTIONS)
		{
			itemId = salesOrder.getCurrentLineItemValue('item', 'item');
			quantity = salesOrder.getCurrentLineItemValue('item', 'quantity');
			description = salesOrder.getCurrentLineItemValue('item', 'description');
			priceLevel = salesOrder.getCurrentLineItemValue('item', 'price');
			rate = salesOrder.getCurrentLineItemValue('item', 'rate');
			amount = salesOrder.getCurrentLineItemValue('item', 'amount');
			commit = salesOrder.getCurrentLineItemValue('item', 'commitinventory');
			commitmentConfirmed = salesOrder.getCurrentLineItemValue('item', 'commitmentfirm');
			orderPriority = salesOrder.getCurrentLineItemValue('item', 'orderpriority');
			tax = salesOrder.getCurrentLineItemValue('item', 'istaxable');
			closed = salesOrder.getCurrentLineItemValue('item', 'isclosed');
			advertisingFee = salesOrder.getCurrentLineItemValue('item', 'custcolrvsadvertisingfee');
			geFinancingFee = salesOrder.getCurrentLineItemValue('item', 'custcolrvsgefinancingfee');
			itemName = salesOrder.getCurrentLineItemValue('item', 'custcolrvsitemname');
			msrpAmount = salesOrder.getCurrentLineItemValue('item', 'custcolrvsmsrpamount');
			bin = salesOrder.getCurrentLineItemValue('item', 'custcolgd_partsbin');
			gst = salesOrder.getCurrentLineItemValue('item', 'custcolrvs_canadianorder_gstlinetotal');
			pst = salesOrder.getCurrentLineItemValue('item', 'custcolrvs_canadianorder_pstlinetotal');
			hst = salesOrder.getCurrentLineItemValue('item', 'custcolrvs_canadianorder_hstlinetotal');
			displayDiscountLineItem = salesOrder.getCurrentLineItemValue('item', 'custcolgd_displaydiscountaslineitem');
			
			lineObject = new Object();
			lineObject.itemId = itemId;
			lineObject.quantity = quantity;
			lineObject.description = description;
			lineObject.priceLevel = priceLevel;
			lineObject.rate = rate;
			lineObject.amount = amount;
			lineObject.commit = commit;
			lineObject.commitmentConfirmed = commitmentConfirmed;
			lineObject.orderPriority = orderPriority;
			lineObject.tax = tax;
			lineObject.closed = closed;
			lineObject.advertisingFee = advertisingFee;
			lineObject.geFinancingFee = geFinancingFee;
			lineObject.itemName = itemName;
			lineObject.msrpAmount = msrpAmount;
			lineObject.bin = bin;
			lineObject.gst = gst;
			lineObject.pst = pst;
			lineObject.hst = hst;
			lineObject.displayDiscountLineItem = displayDiscountLineItem;
			lineObject.itemCategory = itemCategory;
			
			itemArray[itemArray.length] = lineObject;
			
			salesOrder.removeLineItem('item', i, false);
		}
	}
	
	var options = GetOptionsByModel(salesOrder.getFieldValue('custbodyrvsmodel'));
	
	var optionResult = '';
	for (var i = 0; i < itemArray.length; i++)
	{
		//for each item in the array, we add the item in the correct sort order.
		optionResult = GetElementByFormulaNumeric(itemArray[i].itemId, options, null) || '';
		if (optionResult != '' && itemArray[i].itemId != '')
			AddOptionToOrderLineItem(itemArray[i], salesOrder, itemArray[i].itemId, itemArray[i].quantity, parseInt(optionResult[0].getValue('custrecordmodeloption_sortorder')), optionResult[0].getValue('custrecordmodeloption_mandatory'));
	}
	
	nlapiSubmitRecord(salesOrder);
}

/**
 * Returns the index of the match found 
 * @param formulanumeric		Column in the search we filter by
 * @param data					Search result we pass in
 * @param summary				If grouped by count, sum, group, etc.
 * @returns
 */
function GetElementByFormulaNumeric(itemId, data, summary) 
{
	return data.filter(function(data){return data.getValue('custrecordmodeloption_option', null, summary) == itemId;});
}


/**
 * Name: AddOptionToOrderLineItem
 * Description:  Adds line item on the order for the specified option item
 * @param itemId
 * @param quantity
 * @param isMandatory
 */
function AddOptionToOrderLineItem(itemObject, salesOrder, itemId, quantity, optionSortOrder, isMandatory)
{
	if(trim(itemId) != '')
	{
		salesOrder.selectNewLineItem('item');
		salesOrder.setCurrentLineItemValue('item', 'quantity', quantity);
		
		var lineItemId = '';
		var lineCount = salesOrder.getLineItemCount('item');
//		var decorIndex = '';
//		var modelIndex = '';
		var nextOptionSortOrderNum = ''; 
		var insertIndexFound= '';
		var isItemOption = false;
		for(var i = 1; i <= lineCount; i++)
		{
			lineItemId = salesOrder.getLineItemValue('item', 'item', i);
			isItemOption = (!isItemOption && salesOrder.getLineItemValue('item', 'custcolrvsitemcategory', i) == ITEM_CATEGORY_OPTIONS ? true : isItemOption);	// find option item;
//			decorIndex = (decorIndex != '' ? decorIndex : (lineItemId == salesOrder.getFieldValue('custbodyrvsdecor') ? i : ''));  //if decor is on the line set the index
//			modelIndex = (modelIndex != '' ? modelIndex : (lineItemId == salesOrder.getFieldValue('custbodyrvsmodel') ? i : ''));  //if model is on the line set the index
			var lineSortOrderNum = salesOrder.getLineItemValue('item', 'custcolrvs_modeloptionsortorder', i) || ''; //if column is not null and not undefined else '';
			if (lineSortOrderNum != '' && i != lineCount)	//compare optionsortorder and linesortordernum (if exist) to find out if it goes before or after the current line
			{
				nextOptionSortOrderNum = salesOrder.getLineItemValue('item', 'custcolrvs_modeloptionsortorder', i + 1) || '';	// Check if the next line has sort order or not.
				if (lineSortOrderNum <= optionSortOrder && (nextOptionSortOrderNum == '' || nextOptionSortOrderNum > optionSortOrder))
					insertIndexFound = i + 1;	// The sort order of the option is greater than current line and the next line is either greater or empty.
				else if (lineSortOrderNum > optionSortOrder)	// The current line has a sort order that is greater than the option sort order so 
					insertIndexFound = i;						// we set our option above this current line.
			}
			else if (lineSortOrderNum != '')	// We are on the last line item and we need to check if it is greater than or less than the sort order or our option
			{
				if (lineSortOrderNum <= optionSortOrder)	// our option we are adding is greater than the last item on the list that happens to be an option also.
				{
					salesOrder.selectNewLineItem('item');
					if (IsDealerLoggedIn())
						salesOrder.setCurrentLineItemValue('item', 'custcolrvsunititemsdealerportal', itemId);
					else
						salesOrder.setCurrentLineItemValue('item', 'item', itemId);
					salesOrder.setCurrentLineItemValue('item', 'custcolrvs_modeloptionsortorder', parseInt(optionSortOrder));
					break;
				}
				else	//The option sort order Num is less than the line item (also an option) we are currently on which also happens to be the last item of the sublist.
					insertIndexFound = i;
			}
			
			if (insertIndexFound != '')  //if there is an insertindex that was found we use that value to insert our option on.
			{
				salesOrder.cancelLineItem('item');
				salesOrder.selectLineItem('item', insertIndexFound);
				salesOrder.insertLineItem('item', insertIndexFound);
				if (IsDealerLoggedIn())
					salesOrder.setCurrentLineItemValue('item', 'custcolrvsunititemsdealerportal', itemId);
				else
					salesOrder.setCurrentLineItemValue('item', 'item', itemId);
				salesOrder.setCurrentLineItemValue('item', 'custcolrvs_modeloptionsortorder', parseInt(optionSortOrder));
				break;	// We should break once we find where the option should be inserted.
			}
				
			
			// If we could not find a line with a sort order and we are at the end of the line items, it means that there are no existing options, therefore
			// we need to add the option right after the decor if it exist, else we add it under the model. also if moedel does not exist we add it to the top of the line.
			if (i == lineCount)
			{
				if (isItemOption)	// If option item was found on the line but there are no sort orders add option at the end of the list.
				{
					salesOrder.selectNewLineItem('item');
					if (IsDealerLoggedIn())
						salesOrder.setCurrentLineItemValue('item', 'custcolrvsunititemsdealerportal', itemId);
					else
						salesOrder.setCurrentLineItemValue('item', 'item', itemId);
					salesOrder.setCurrentLineItemValue('item', 'custcolrvs_modeloptionsortorder', parseInt(optionSortOrder));
					break;
				}
				else	// There is/are items with sort order # and we need to check where to set our option before or after the current line.
				{
					
					var lineNum = '';
					lineNum = (decorIndex != '' ? decorIndex : (modelIndex != '' ? modelIndex : '')); // if decor exist use the line index else use model line index.
					if (lineNum != '')
					{
						if (lineNum == lineCount)
							salesOrder.selectNewLineItem('item');
						else
						{
							salesOrder.cancelLineItem('item');
							salesOrder.selectLineItem('item', lineNum + 1);
							salesOrder.insertLineItem('item', lineNum + 1);
						}
						if (IsDealerLoggedIn())
							salesOrder.setCurrentLineItemValue('item', 'custcolrvsunititemsdealerportal', itemId);
						else
							salesOrder.setCurrentLineItemValue('item', 'item', itemId);
						salesOrder.setCurrentLineItemValue('item', 'custcolrvs_modeloptionsortorder', parseInt(optionSortOrder));
					}
					else	// Both decor and model do not exist which means something is wrong with the setup of the sales order.
					{
						salesOrder.cancelLineItem('item');	// Set the option at the beginning of the line.
						salesOrder.selectLineItem('item', 1);
						salesOrder.insertLineItem('item', 1);
						if (IsDealerLoggedIn())
							salesOrder.setCurrentLineItemValue('item', 'custcolrvsunititemsdealerportal', itemId);
						else
							salesOrder.setCurrentLineItemValue('item', 'item', itemId);
						salesOrder.setCurrentLineItemValue('item', 'custcolrvs_modeloptionsortorder', parseInt(optionSortOrder));
						break;	// We should break once we find where the option should be inserted.
					}
				}
			}
		}	// The line should never be empty and skip the for loop, if it does, something is wrong with the creation of the sales order.
		salesOrder.setCurrentLineItemValue('item', 'custcolrvsismandatoryoption', isMandatory);
		
		salesOrder.setCurrentLineItemValue('item', 'quantity', itemObject.quantity);
		salesOrder.setCurrentLineItemValue('item', 'description', itemObject.description);
		salesOrder.setCurrentLineItemValue('item', 'price', itemObject.priceLevel);
		salesOrder.setCurrentLineItemValue('item', 'rate', itemObject.rate);
		salesOrder.setCurrentLineItemValue('item', 'amount', itemObject.amount);
		salesOrder.setCurrentLineItemValue('item', 'commitinventory', itemObject.commit);
		salesOrder.setCurrentLineItemValue('item', 'commitmentfirm', itemObject.commitmentConfirmed);
		salesOrder.setCurrentLineItemValue('item', 'orderpriority', itemObject.orderPriority);
		salesOrder.setCurrentLineItemValue('item', 'istaxable', itemObject.tax);
		salesOrder.setCurrentLineItemValue('item', 'isclosed', itemObject.closed);
		salesOrder.setCurrentLineItemValue('item', 'custcolrvsadvertisingfee', itemObject.advertisingFee);
		salesOrder.setCurrentLineItemValue('item', 'custcolrvsgefinancingfee', itemObject.geFinancingFee);
		salesOrder.setCurrentLineItemValue('item', 'custcolrvsitemname', itemObject.itemName);
		salesOrder.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', itemObject.msrpAmount);
		salesOrder.setCurrentLineItemValue('item', 'custcolgd_partsbin', itemObject.bin);
		salesOrder.setCurrentLineItemValue('item', 'custcolrvs_canadianorder_gstlinetotal', itemObject.gst);
		salesOrder.setCurrentLineItemValue('item', 'custcolrvs_canadianorder_pstlinetotal', itemObject.pst);
		salesOrder.setCurrentLineItemValue('item', 'custcolrvs_canadianorder_hstlinetotal', itemObject.hst);
		salesOrder.setCurrentLineItemValue('item', 'custcolgd_displaydiscountaslineitem', itemObject.displayDiscountLineItem);
		salesOrder.setCurrentLineItemValue('item', 'custcolrvsitemcategory', itemObject.itemCategory);
		
		salesOrder.commitLineItem('item');
	}	
}

/**
 * Name: GetOptionsByModel
 * Description: Returns search results with options for a particular model.
 * @appliedtorecord salesorder
 * 
 * @returns {Array} nlobjSearchResult
 */
function GetOptionsByModel(modelId)
{	
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('custrecordmodeloption_model', null, 'is', modelId);
	
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('custrecordmodeloption_sortorder');
	cols[cols.length] = new nlobjSearchColumn('custrecordmodeloption_option');
	cols[cols.length] = new nlobjSearchColumn('custrecordmodeloption_mandatory');
	
	//If dealer is logged in, return only options that are available to display in dealer portal
	if(IsDealerLoggedIn())
		return nlapiSearchRecord('customrecordrvsmodeloption', 'customsearchdealermodeloptions', filters, cols);
	else
		return nlapiSearchRecord('customrecordrvsmodeloption', 'customsearchmodeloptionorder', filters, cols);
}