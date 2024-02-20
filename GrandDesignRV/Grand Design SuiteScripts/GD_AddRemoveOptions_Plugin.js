/**
 * Grand Design's plug-in implementation to Add and Remove Options on Change Orders.
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Mar 2016	  Jacob Shetler
 *
 */

var DPU_SHIP_METHOD = 6;

function AddOrRemoveOptions(type)
{
	// Code added here should likely be duplicated in a Unit Order script.
	// Any code that should fire after an option is added or removed should be
	// both here and in a Unit Order script.
	if (type != 'delete' && type != 'create')
	{	

		var oldRecord = nlapiGetOldRecord();
		var oldStatusId = oldRecord.getFieldValue('custrecordchangeorder_status');
		
		var currentRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		var currentStatusId = currentRecord.getFieldValue('custrecordchangeorder_status');
		
		// if the old status wasn't approved and the new one is approved (it just changed to approve), 
		// then add or remove the options
		if (oldStatusId != CHANGEORDERSTATUS_APPROVEDNOTCOMPLETED && currentStatusId == CHANGEORDERSTATUS_APPROVEDNOTCOMPLETED)
		{			
			var changeOrderOptionsCount = currentRecord.getLineItemCount('recmachcustrecordchangeorderoptions_changeorder');
			var salesOrderId = currentRecord.getFieldValue('custrecordchangeorder_order');
			
			
			// Try a few times if the record has collision or record has been changed error before throwing the error.  This helps prevent devBox errors.
			var soMaxTryCount = 5;
			var soTryCount = 1;
			while(soTryCount < soMaxTryCount) {
				try {
					var salesOrder = nlapiLoadRecord('salesorder', salesOrderId);			
					
					// check and see if there is a new dealer
					var newDealerId = nlapiGetFieldValue('custrecordchangeorder_newdealer');
					var newShippingMethod = nlapiGetFieldValue('custrecordchangeorder_newshippingmethod');
					var newShippingMethodText = nlapiGetFieldText('custrecordchangeorder_newshippingmethod');
					var newFloorplanType = nlapiGetFieldValue('custrecordchangeorder_newfloorplantype');
					var oldDealerId = nlapiGetFieldValue('custrecordchangeorder_olddealer');
					var changeOrderDate = nlapiGetFieldValue('custrecordchangeorder_date');
					var newDecor = nlapiGetFieldValue('custrecordchangeorder_newdecor');
					var oldDecor = nlapiGetFieldValue('custrecordchangeorder_olddecor');
					
					var unitId = salesOrder.getFieldValue('custbodyrvsunit');
					var priceLevel = salesOrder.getFieldValue('custbodyrvsmsrppricelevel');
					
					var removeFreightCharges = false;
					//Track whether or not dealer is the only change that was made on the change order.
					//If dealer is the only change, we do not want to update unit status. Case #3725
					var isDealerTheOnlyChange = true; //We begin by assuming that dealer is the only change, if anything else is changed set this to false
					
					if (newDealerId != null && newDealerId != '')
					{
						salesOrder.setFieldValue('entity', newDealerId);
						// if the use haul and tow checkbox is checked, we uncheck it since the dealer changed.
						salesOrder.getFieldValue('custbodygd_usehaulandtowfreight') == 'T' ? salesOrder.setFieldValue('custbodygd_usehaulandtowfreight', 'F') : '';
						UpdateSalesOrderMSOAddress(salesOrder, newDealerId);
						
						// get the new sales rep for the dealer
						// also look up the ship method for the dealer
						var dealerLookupFields = ['salesrep', 'shippingitem', 'billcountry', 'billstate', 'custentityrvs_dealer_unitshippingmethod'];
						var dealerLookupResultsText = nlapiLookupField('customer', newDealerId, ['custentityrvs_dealer_unitshippingmethod', 'shippingitem'], true);
						var dealerLookupResults = nlapiLookupField('customer', newDealerId, dealerLookupFields);
						var newSalesRepId = dealerLookupResults.salesrep; //nlapiLookupField('customer', newDealerId, 'salesrep');
						
						var series = salesOrder.getFieldValue('custbodyrvsseries');
						var preferredSalesRep = SalesRepBySeries(newDealerId, series);
						//if there is a prefered sales rep for the series, use that as the sales rep
						if(preferredSalesRep != '' && preferredSalesRep != null)
						{
							newSalesRepId = preferredSalesRep;
							salesOrder.setFieldValue('salesrep', newSalesRepId);
						}
						
						var dealerShippingMethod = dealerLookupResults.shippingitem;
						var dealerShippingText = dealerLookupResultsText.shippingitem;
						//Case #6687 - If the RVS Unit Shipping Method is set on the dealer, then we need to use that instead of the shipping method.
						if (ConvertNSFieldToString(dealerLookupResults.custentityrvs_dealer_unitshippingmethod).length > 0)
						{
							dealerShippingMethod = dealerLookupResults.custentityrvs_dealer_unitshippingmethod;
							dealerShippingText = dealerLookupResultsText.custentityrvs_dealer_unitshippingmethod;
						}
						
						// set the driver sheet notes on the order if the shipping method is going to be different
						// only do this if they haven't selected a different shipping method on the change order already
						// A condition was removed here because even if the value is the same, it should still be set since there is now a new unit shipping method field from the 
						// dealer that could be set on the shipping method.
						if ((newShippingMethod == null || newShippingMethod == '')) {
							// since the shipping method will change, just set the "new shipping method" variable and it will be taken care of in code later
							newShippingMethod = dealerShippingMethod;
							newShippingMethodText = dealerShippingText;
						}
						else if(newShippingMethod != null && newShippingMethod != '') //We have new shipping method from change order
						{
							isDealerTheOnlyChange = false;
						}
						
						// if the old dealer is the "Open Dealer Inventory" dealer, 
						// then set the "Dealer Order Date" to be the date of the change order.
						if (oldDealerId == OPEN_DEALER_INVENTORY_ID)
						{
							salesOrder.setFieldValue('custbodyrvsdealerorderdate', changeOrderDate);
						}
						
						// Try a few times if the record has collision or record has been changed error before throwing the error.  This helps prevent devBox errors.
						var maxTryCount = 5;
						var tryCount = 1;
						while(tryCount < maxTryCount) {
							try {
								// we have to update the unit, backlog, and production run backlog to have the new dealer.				
								var unit = nlapiLoadRecord('customrecordrvsunit', unitId, {recordmode: 'dynamic'});
								unit.setFieldValue('custrecordunit_salesrep', newSalesRepId);
								unit.setFieldValue('custrecordunit_dealer', newDealerId);
								nlapiSubmitRecord(unit, true, true);
								
								break;
							}
							catch(err) {
								nlapiLogExecution('audit', 'err message', JSON.stringify(err));
					    		if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
					    			tryCount++;
					    			continue;
					    		}

					    		throw err;
							}
						}
						
						var productionRunBacklogId = unit.getFieldValue('custrecordunit_productionrunbacklog');
						if (productionRunBacklogId != null && productionRunBacklogId != '')
						{
							// Try a few times if the record has collision or record has been changed error before throwing the error.  This helps prevent devBox errors.
							var maxTryCount = 5;
							var tryCount = 1;
							while(tryCount < maxTryCount) {
								try {
									var productionRunBacklog = nlapiLoadRecord('customrecordrvsproductionrunworkorder', productionRunBacklogId, {recordmode: 'dynamic'});
									productionRunBacklog.setFieldValue('custrecordproductionrunwo_dealer', newDealerId);
									nlapiSubmitRecord(productionRunBacklog, true, true);
									
									break;
								}
								catch(err) {
									nlapiLogExecution('audit', 'err message', JSON.stringify(err));
						    		if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
						    			tryCount++;
						    			continue;
						    		}

						    		throw err;
								}
							}
						}
						
						// since the dealer changed, we need to wipe out the flooring data for the dealer
						// some fields should source from the dealer but others need to be blanked out
						salesOrder.setFieldValue('custbodyrvsflooringapprovalnumber', '');
						salesOrder.setFieldValue('custbodyrvsdateposubmitted', '');
						salesOrder.setFieldValue('custbodyrvsdatesubmittedtoflooringco', '');
						salesOrder.setFieldValue('custbodyrvsdatefloorplanapproved', '');
						salesOrder.setFieldValue('custbodyrvspacketcomplete', 'F');
						
						// new dealer so remove the freight charges
						removeFreightCharges = true;
					}
					else
					{
						isDealerTheOnlyChange = false;				
					}
					
					if (newShippingMethod != null && newShippingMethod != '')
					{
						salesOrder.setFieldValue('shipmethod', newShippingMethod);
						
						//case 9362 reset the haul and tow check box to 'F' if shipping changes to DPU otherwise leave it alone.
						// also set use lowboy field to 'F'
						if (newShippingMethod == DPU_SHIP_METHOD){
							salesOrder.setFieldValue('custbodygd_usehaulandtowfreight', 'F');
							salesOrder.setFieldValue('custbodygd_uselowboyfreight', 'F');
						}
						
						// also reset the driver sheet notes (case 1899)
						salesOrder.setFieldValue('custbodyrvsdriversheetnotes', 'Shipping Method: ' + newShippingMethodText);
						
						// new shipping method so remove the freight charges
						removeFreightCharges = true;				
					}
					
					if (newFloorplanType != null && newFloorplanType != '')
					{
						salesOrder.setFieldValue('custbodyrvsflooringtype', newFloorplanType);
						
						// new floor plan type so clear out all the floor plan statuses
						salesOrder.setFieldValue('custbodyrvsflooringapprovalnumber', '');
						salesOrder.setFieldValue('custbodyrvsdateposubmitted', '');
						salesOrder.setFieldValue('custbodyrvsdatesubmittedtoflooringco', '');
						salesOrder.setFieldValue('custbodyrvsdatefloorplanapproved', '');
						salesOrder.setFieldValue('custbodyrvspacketcomplete', 'F');
						isDealerTheOnlyChange = false;
						
					}
					
					if(newDecor != null && newDecor != '')
					{
						salesOrder.setFieldValue('custbodyrvsdecor', newDecor);
						isDealerTheOnlyChange = false;
						
						// Try a few times if the record has collision or record has been changed error before throwing the error.  This helps prevent devBox errors.
						var maxTryCount = 5;
						var tryCount = 1;
						while(tryCount < maxTryCount) {
							try {
								//Load the record again to get a fresh version of the record.
								var unitRec = nlapiLoadRecord('customrecordrvsunit', unitId);
								unitRec.setFieldValue('custrecordunit_decor', newDecor);
								nlapiSubmitRecord(unitRec, false, true);
								
								break;
							}
							catch(err) {
								nlapiLogExecution('audit', 'err message', JSON.stringify(err));
					    		if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
					    			tryCount++;
					    			continue;
					    		}

					    		throw err;
							}
						}
					}
					
					for (var i=1; i<=changeOrderOptionsCount; i++)
					{
						var orderLineCount = salesOrder.getLineItemCount('item');
						
						var optionId = currentRecord.getLineItemValue('recmachcustrecordchangeorderoptions_changeorder', 'custrecordchangeorderoptions_option', i);
						var addOption = currentRecord.getLineItemValue('recmachcustrecordchangeorderoptions_changeorder', 'custrecordchangeorderoptions_addoption', i);
						var removeOption = currentRecord.getLineItemValue('recmachcustrecordchangeorderoptions_changeorder', 'custrecordchangeorderoptions_removeopt', i);
						var optionGroupId = ConvertNSFieldToString(currentRecord.getLineItemValue('recmachcustrecordchangeorderoptions_changeorder', 'custrecordchangeorderoptions_itemgroup', i));
						
						if (addOption == 'T')
						{
							// check that the option has a base price
							// if not, then we need to manually set the amount and rate to 0
							// because without a base price, the amount will be blank and order will throw an error when saved
							
							var itemsWithBasePriceResults = nlapiSearchRecord('item', 'customsearchitemswithbaseprice', new nlobjSearchFilter('internalid', null, 'is', optionId));
							var setAmountOnLine = true;
							if (itemsWithBasePriceResults != null && itemsWithBasePriceResults.length > 0)
							{
								var basePrice = itemsWithBasePriceResults[0].getValue('baseprice');
								if (basePrice != null && basePrice != '')
									setAmountOnLine = false;
							}
							var modelId = salesOrder.getFieldValue('custbodyrvsmodel');
							var modelOptionOrder = null;
		                    var temp = SearchModelOptionSortOrder(modelId, optionGroupId == '' ? optionId : optionGroupId);
							if(temp != '' && temp != null)
							{
								modelOptionOrder = parseInt(temp);
							}
							
							var setOptionSortOrder = false;
							
							if(modelOptionOrder != '' && modelOptionOrder != null)
							{
								for(var j=1; j<= salesOrder.getLineItemCount('item'); j++)
								{
									//parseInt of null is 0, so add them after the items without a sort order
									var currentItem = 0;
									if(salesOrder.getLineItemValue('item', 'custcolrvs_modeloptionsortorder', j) != '' && salesOrder.getLineItemValue('item', 'custcolrvs_modeloptionsortorder', j) != null)
									{
										currentItem = parseInt(salesOrder.getLineItemValue('item', 'custcolrvs_modeloptionsortorder', j));
									}
									
									var nextItem = 0;
									if(salesOrder.getLineItemValue('item', 'custcolrvs_modeloptionsortorder', j + 1) != '' && salesOrder.getLineItemValue('item', 'custcolrvs_modeloptionsortorder', j + 1) != null)
									{
										nextItem = parseInt(salesOrder.getLineItemValue('item', 'custcolrvs_modeloptionsortorder', j + 1));
									}							
									
									//scenario where new option's sort order is less than the first in the list
									if(j == 1 && currentItem > modelOptionOrder)
									{
										salesOrder.insertLineItem('item', j);//insert after the current 'i'
										
										salesOrder.setLineItemValue('item', 'item', j, optionId);
										salesOrder.setLineItemValue('item', 'quantity', j, 1);
										salesOrder.setLineItemValue('item', 'quantity', j, 1);
										salesOrder.setLineItemValue('item', 'custcolrvs_modeloptionsortorder', j, modelOptionOrder);
										salesOrder.setLineItemValue('item', 'custcolrvs_modeloptionitemgroup', j, optionGroupId);
															
										if (setAmountOnLine)
										{
											salesOrder.setLineItemValue('item', 'rate', j, 0);
											salesOrder.setLineItemValue('item', 'amount', j, 0);
										}
										
										// set the MSRP amount
										salesOrder.setLineItemValue('item', 'custcolrvsmsrpamount', j, GetItemAmountForPriceLevel(optionId, priceLevel));
										break;
									}
									//check that option sort order is greater than currents but less than or equal to next sort order.
									//also if current sort order is greater than the next sort order (because its not set)
									else if((currentItem < modelOptionOrder && modelOptionOrder <= nextItem) || (currentItem < modelOptionOrder && currentItem > nextItem))
									{
										salesOrder.insertLineItem('item', j+1);//insert after the current 'i'
										
										salesOrder.setLineItemValue('item', 'item', j + 1, optionId);
										salesOrder.setLineItemValue('item', 'quantity', j + 1, 1);
										salesOrder.setLineItemValue('item', 'quantity', j + 1, 1);
										salesOrder.setLineItemValue('item', 'custcolrvs_modeloptionsortorder', j + 1, modelOptionOrder);
										salesOrder.setLineItemValue('item', 'custcolrvs_modeloptionitemgroup', j + 1, optionGroupId);
															
										if (setAmountOnLine)
										{
											salesOrder.setLineItemValue('item', 'rate', j + 1, 0);
											salesOrder.setLineItemValue('item', 'amount', j + 1, 0);
										}
										
										// set the MSRP amount
										salesOrder.setLineItemValue('item', 'custcolrvsmsrpamount', j + 1, GetItemAmountForPriceLevel(optionId, priceLevel));
										break;
									}
									//add to the end (a new line)
									else if(j == salesOrder.getLineItemCount('item'))
									{
										salesOrder.selectNewLineItem('item');
										
										salesOrder.setCurrentLineItemValue('item', 'item', optionId);
										salesOrder.setCurrentLineItemValue('item', 'quantity', 1);
										salesOrder.setCurrentLineItemValue('item', 'quantity', 1);
										salesOrder.setCurrentLineItemValue('item', 'custcolrvs_modeloptionsortorder', modelOptionOrder);
										salesOrder.setCurrentLineItemValue('item', 'custcolrvs_modeloptionitemgroup', optionGroupId);
															
										if (setAmountOnLine)
										{
											salesOrder.setCurrentLineItemValue('item', 'rate', 0);
											salesOrder.setCurrentLineItemValue('item', 'amount', 0);
										}
										
										// set the MSRP amount
										salesOrder.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', GetItemAmountForPriceLevel(optionId, priceLevel));					
										salesOrder.commitLineItem('item');
										break;
									}
								}
							}
							else
							{
								//select a new line item (can use 'current line item')
								salesOrder.selectNewLineItem('item');
								
								salesOrder.setCurrentLineItemValue('item', 'item', optionId);
								salesOrder.setCurrentLineItemValue('item', 'quantity', 1);
								salesOrder.setCurrentLineItemValue('item', 'quantity', 1);
								
								if(setOptionSortOrder)
								{
									salesOrder.setCurrentLineItemValue('item', 'custcolrvs_modeloptionsortorder', modelOptionOrder);
								}
													
								if (setAmountOnLine)
								{
									salesOrder.setCurrentLineItemValue('item', 'rate', 0);
									salesOrder.setCurrentLineItemValue('item', 'amount', 0);
								}
								
								// set the MSRP amount
								salesOrder.setCurrentLineItemValue('item', 'custcolrvs_modeloptionitemgroup', optionGroupId);
								salesOrder.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', GetItemAmountForPriceLevel(optionId, priceLevel));					
								salesOrder.commitLineItem('item');
							}
							
							isDealerTheOnlyChange = false;
						}
						else if (removeOption == 'T')
						{
							for (var j=orderLineCount; j>0; j--)
							{
								var lineOptionId = salesOrder.getLineItemValue('item', 'item', j);
								var lineOptionGroupId = ConvertNSFieldToString(salesOrder.getLineItemValue('item', 'custcolrvs_modeloptionitemgroup', j));
								if (lineOptionId == optionId && lineOptionGroupId == optionGroupId)
								{
									salesOrder.removeLineItem('item', j);
								}
							}
							isDealerTheOnlyChange = false;
						}			
					}
					
					// if we have set the flag to remove the freight, then do so
					if (removeFreightCharges)
					{
						var orderLineCount = salesOrder.getLineItemCount('item');
						
						// need to go in reverse order because we are deleting line items
						for (var i=orderLineCount; i>0; i--)
						{
							var lineOptionId = salesOrder.getLineItemValue('item', 'item', i);
							
							if (lineOptionId == FREIGHT_CHARGE_ITEM_ID ||
								lineOptionId == FREIGHT_DISCOUNT_ITEM_ID ||
								lineOptionId == FUEL_SURCHARGE_ITEM_ID)
							{
								salesOrder.removeLineItem('item', i);
							}
						}
					}
					
					// we have to recalculate the ge/ad fees for the order
					// get whether or not we are supposed to use the ad or ge fee on the order
					// these are sourced from dealer and flooring company on the sales order
					// so that this code works on the dealer portal
					var useGEFinancingFee = salesOrder.getFieldValue('custbodyrvsusegefinancingfee');
					var useAdvertisingFee = salesOrder.getFieldValue('custbodyrvsuseadvertisingfee');
							
					var totalGEFee = 0;
					var totalAdFee = 0;
					
					// if either of these is selected, then continue
					if (useGEFinancingFee == 'T' || useAdvertisingFee == 'T')
					{
						var lineCount = salesOrder.getLineItemCount('item');
						for (var i=1; i<=lineCount; i++)
						{
							var amount = parseFloat(salesOrder.getLineItemValue('item', 'amount', i));
							var geFee = salesOrder.getLineItemValue('item', 'custcolrvsgefinancingfee', i);
							var adFee = salesOrder.getLineItemValue('item', 'custcolrvsadvertisingfee', i);
							
							// total the amounts if the line item is supposed to use the ge or ad fee and we are supposed to use them on the order
							if (geFee == 'T' && useGEFinancingFee == 'T')
							{
								totalGEFee += amount;
							}
							
							if (adFee == 'T' && useAdvertisingFee == 'T')
							{
								totalAdFee += amount;
							}
						}
						
						// discount amount is included in the fee calculations
						var discountAmt = salesOrder.getFieldValue('discountrate');
						if (discountAmt != null && discountAmt != '')
						{
							discountAmt = parseFloat(discountAmt);
							
							if (useAdvertisingFee == 'T')
							{
								totalAdFee += discountAmt;
							}
							
							if (useGEFinancingFee == 'T')
							{
								totalGEFee += discountAmt;
							}
						}
						
						// these the calculations given to use by Karl
						// we are rounding up for both
						totalGEFee = Math.ceil(totalGEFee * GetGEFeeAmount());
						totalAdFee = Math.ceil(totalAdFee * GetAdFeeAmount());
						
						// set these header fields here and then when the order is saved, these will be added as line items on the order
						salesOrder.setFieldValue('custbodyrvsgefinancingfee', totalGEFee);
						salesOrder.setFieldValue('custbodyrvsadvertisingfee', totalAdFee);
					}
					
					if (useAdvertisingFee == 'F')
					{
						totalAdFee = 0;
						salesOrder.setFieldValue('custbodyrvsadvertisingfee', totalAdFee);
					}
					
					if (useGEFinancingFee == 'F')
					{
						totalGEFee = 0;
						salesOrder.setFieldValue('custbodyrvsgefinancingfee', totalGEFee);
					}
					
					// now that we've calculated the fees, add/update/remove the line items from the order	
					var geFinancingItemFound = false;
					var advertisingItemFound = false;
					
					// if the fee is 0, then remove the line 
					// if it is not, then add/update the line
					
					var lineCount = salesOrder.getLineItemCount('item');
					for (var i=lineCount; i>0; i--)
					{
						var itemId = salesOrder.getLineItemValue('item', 'item', i);
						if (itemId == GEFINANCINGFEE_ITEMID)
						{
							geFinancingItemFound = true;
							
							if (totalGEFee == 0)
							{
								salesOrder.removeLineItem('item', i);
							}
							else
							{
								salesOrder.setLineItemValue('item', 'rate', i, totalGEFee);
								salesOrder.setLineItemValue('item', 'quantity', i, 1);
								salesOrder.setLineItemValue('item', 'amount', i, totalGEFee);
							}
						}
						else if (itemId == ADVERTISINGFEE_ITEMID)
						{
							advertisingItemFound = true;
							
							if (totalAdFee == 0)
							{
								salesOrder.removeLineItem('item', i);
							}
							else
							{
								salesOrder.setLineItemValue('item', 'rate', i, totalAdFee);
								salesOrder.setLineItemValue('item', 'quantity', i, 1);
								salesOrder.setLineItemValue('item', 'amount', i, totalAdFee);
							}
						}
						else if(oldDecor != null && oldDecor != '' && oldDecor != newDecor &&  itemId == oldDecor && newDecor != null && newDecor != '') //decor was changed, swap old decor item with the new one.
						{
							salesOrder.setLineItemValue('item', 'item', i, newDecor);
						}
					}
					
					// if the fees aren't 0 and they weren't found on the order, then we need to add them
					if (totalGEFee != 0 && !geFinancingItemFound)
					{
						salesOrder.selectNewLineItem('item');
						salesOrder.setCurrentLineItemValue('item', 'item', GEFINANCINGFEE_ITEMID);
						salesOrder.setCurrentLineItemValue('item', 'rate', totalGEFee);
						salesOrder.setCurrentLineItemValue('item', 'quantity', 1);
						salesOrder.setCurrentLineItemValue('item', 'amount', totalGEFee);
						salesOrder.commitLineItem('item');
					}
					
					// if the fees aren't 0 and they weren't found on the order, then we need to add them
					if (totalAdFee != 0 && !advertisingItemFound)
					{
						salesOrder.selectNewLineItem('item');
						salesOrder.setCurrentLineItemValue('item', 'item', ADVERTISINGFEE_ITEMID);
						salesOrder.setCurrentLineItemValue('item', 'rate', totalAdFee);
						salesOrder.setCurrentLineItemValue('item', 'quantity', 1);
						salesOrder.setCurrentLineItemValue('item', 'amount', totalAdFee);
						salesOrder.commitLineItem('item');
					}
					
					// calculate the special viewing for production notes
					var fields = ['custitemrvsoption_isspecial', 'custitemrvsspecialviewingforproduction', 'salesdescription'];
					
					var currentSpecialViewNotes = '';
					var hasSpecialOption = false;
					
					for (var i = 1; i <= salesOrder.getLineItemCount('item'); i++) 
					{
						var itemId = salesOrder.getLineItemValue('item', 'item', i);
						var itemType = salesOrder.getLineItemValue('item', 'itemtype', i);
						
						// do the lookup if the item is not a subtotal item
						if (itemType != TRANSACTIONLINEITEMTYPE_SUBTOTAL)
						{
							var lookupFields = nlapiLookupField('item', itemId, fields);
							
							if (lookupFields != null)
							{
								if (lookupFields.custitemisspecialviewingforproduction == 'T')
								{	
									if(trim(currentSpecialViewNotes) == '')				
										currentSpecialViewNotes += lookupFields.salesdescription;
									else
										currentSpecialViewNotes += '; ' + lookupFields.salesdescription;
								}
								
								if (lookupFields.custitemoption_isspecial == 'T')
									hasSpecialOption = true;
							}
						}
					}
					
					if (hasSpecialOption)
					{
						salesOrder.setFieldValue('custbodyrvssalesorder_isspecial', 'T');
					}
					else
					{
						salesOrder.setFieldValue('custbodyrvssalesorder_isspecial', 'F');
					}
					
					salesOrder.setFieldValue('custbodyrvsspecialviewingforproduction', currentSpecialViewNotes);
					
					//Add the freight charge if we need to
					checkSalesOrderFreightChargeAndDPUFee(salesOrder);
					
					//Add or remove CDL fee option on the order accordingly.
					addOrRemoveCDLFeeOption(salesOrder);
					
					//We have to submit the record and reload it in order for the Canadian Sales Tax to work correctly. - JLS
					nlapiSubmitRecord(salesOrder, true, true);
					
					break;
				}
				catch(err) {
					nlapiLogExecution('audit', 'err message', JSON.stringify(err));
		    		if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
		    			soTryCount++;
		    			continue;
		    		}

		    		throw err;
				}
			}
			
			// Try a few times if the record has collision or record has been changed error before throwing the error.  This helps prevent devBox errors.
			soMaxTryCount = 5;
			soTryCount = 1;
			while(soTryCount < soMaxTryCount) {
				try {
					salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
					
					//Add or remove Front Protective Wrap Option, on any change order that gets submitted we get the most current information about Front Protect Wrap and update accordingly.
					var modelId = salesOrder.getFieldValue('custbodyrvsmodel') || '';
					var modelFPWoptionId = modelId != '' ? nlapiLookupField('assemblyitem', modelId, 'custitemgd_frontprotectivewrap') : '';
					salesOrder.setFieldValue('custbodygd_modelfrontprotectwrapoptn', modelFPWoptionId);
					var dealerId = salesOrder.getFieldValue('entity') || '';
					var dealerFPWPreference = dealerId != '' ? nlapiLookupField('customer', dealerId, 'custentitygd_fronprotectivewrap') : 'F';
					salesOrder.setFieldValue('custbodygd_dealerfrontprotectwrapoptn', dealerFPWPreference);
					GD_checkFrontProtectiveWrapOption(salesOrder);
					nlapiSubmitRecord(salesOrder, true, true);
					
					break;
				}
				catch(err) {
					nlapiLogExecution('audit', 'err message', JSON.stringify(err));
		    		if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
		    			soTryCount++;
		    			continue;
		    		}

		    		throw err;
				}
			}
			
			if (RunCanadianSalesTaxByOrderType(salesOrder.getFieldValue('custbodyrvsordertype')))
			{
				// Try a few times if the record has collision or record has been changed error before throwing the error.  This helps prevent devBox errors.
				var maxTryCount = 5;
				var tryCount = 1;
				while(tryCount < maxTryCount) {
					try {
						salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
						
						//Get the Canadian changes in dealer. 1 = do nothing. 2 = add/change CA tax 3 = remove CA tax
						var canadianDealerChangeEnum = GetCanadianDealerChangeEnum(oldDealerId, newDealerId);
						if(canadianDealerChangeEnum == 2 && (salesOrder.getFieldValue('orderstatus') == SALESORDER_PENDINGAPPROVAL || salesOrder.getFieldValue('orderstatus') == SALESORDER_PENDINGFULFILLMENT))
						{
							//override the tax table with the new dealer if it is set, otherwise we just use the one from the province on the sales order.
							var taxTable = null;
							if (newDealerId != null && newDealerId.length > 0)
							{
								taxTable = SearchCanadianTaxTable(nlapiLookupField('entity', newDealerId, 'shipstate'));
							}
							
							//Do basically the same thing as in the AfterSubmit of the Sales Order itself.
							RVS_CanadianTax_RecalcTotals(salesOrder, taxTable);
							RVS_CanadianTax_AddRemoveBrokerageFee(salesOrder, true);
						}
						else if (canadianDealerChangeEnum == 3) 
						{
							//Then remove the tax items and the brokerage fee b/c the new dealer is not canadian.
							RVS_CanadianTax_RemoveTotals(salesOrder);
							RVS_CanadianTax_AddRemoveBrokerageFee(salesOrder, false);
						}
						
						nlapiSubmitRecord(salesOrder, true, true);
						
						break;
					}
					catch(err) {
						nlapiLogExecution('audit', 'err message', JSON.stringify(err));
			    		if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
			    			tryCount++;
			    			continue;
			    		}

			    		throw err;
					}
				}
			}
			
			
			// From Case 6285 - add this here because on sales order after submit the unit floor plan status needs to be updated as well.
			var unitSalesOrder = nlapiLoadRecord('salesorder', salesOrderId) || '';
			if (unitSalesOrder != '')
			{
				// Try a few times if the record has collision or record has been changed error before throwing the error.  This helps prevent devBox errors.
				var maxTryCount = 5;
				var tryCount = 1;
				while(tryCount < maxTryCount) {
					try {
						unit = nlapiLoadRecord('customrecordrvsunit', unitId, {recordmode: 'dynamic'}) || ''; 
						if(unit != '')
						{
							// Set the floor plan status
							unit.setFieldValue('custrecordunit_flooringstatus', GetFloorPlanStatusFromOrder(salesOrderId, unitSalesOrder));

							// If there's a unit with a paint option, update the unit to check "Has Special Paint"
							var paintResults = nlapiSearchRecord('salesorder', null,
								[
									["internalid", "is", salesOrderId],
									"AND",
									["item.custitemgd_ispaintoption", "is", "T"]
							]);
							var hasPaintOption = paintResults != null ? 'T' : 'F';
							unit.setFieldValue('custrecordgd_hasspecialpaint' , hasPaintOption);

							// Update the Unit's specification fields if an Option with
							// Update Unit Fields is selected
							var optionOverridingUnitFields = unitSalesOrder.getFieldValue('custbodygd_optionoverridingunitfields');
							var optionOverridingUnitFieldsExists = optionOverridingUnitFields && unitSalesOrder.findLineItemValue('item', 'item', optionOverridingUnitFields) != -1;
							// Only bother updating Unit fields if the option has been removed or
							// if no option has updated Unit fields yet
							if (!optionOverridingUnitFieldsExists || !optionOverridingUnitFields)
							{
								// Unset the optionOverridingUnitFields field. We'll set it if
								// we find an option that will update Unit Fields
								unitSalesOrder.setFieldValue('custbodygd_optionoverridingunitfields', '');
								var overrideUnitFieldsSearch = nlapiSearchRecord("salesorder",null,
									[
										["type","anyof","SalesOrd"],
										"AND",
										["mainline","is","F"],
										"AND",
										["item.custitemgd_updateunitfields","is","T"],
										"AND",
										["internalidnumber","equalto",salesOrderId]
									],
									[
										new nlobjSearchColumn("item",null,null),
										new nlobjSearchColumn("custitemgd_overridetiresize","item",null),
										new nlobjSearchColumn("custitemgd_overridetirepsi","item",null),
										new nlobjSearchColumn("custitemgd_overridetirerimsize","item",null),
										new nlobjSearchColumn("custitemgd_overridegvwr","item",null),
										new nlobjSearchColumn("custitemgd_overridegawr","item",null),
										new nlobjSearchColumn("custitemgd_overridegawrsa","item",null),
									]
								);
								
								// Update Unit Fields from Sales Order
	                            if (overrideUnitFieldsSearch)
	                            {
	                                SetUnitSpecsFromModel(unitId, false);
	                                unit = nlapiLoadRecord('customrecordrvsunit', unitId); // We have to load the unit again because the 'SetUnitSpecsFromModel' method loads and saves the unit.  This prevents record has been changed error.
	                                unitSalesOrder.setFieldValue('custbodygd_optionoverridingunitfields', overrideUnitFieldsSearch[0].getValue('item'));
	                                unit.setFieldValue('custrecordunit_tire', overrideUnitFieldsSearch[0].getValue('custitemgd_overridetiresize', 'item'));
	                                unit.setFieldValue('custrecordunit_psi', overrideUnitFieldsSearch[0].getValue('custitemgd_overridetirepsi', 'item'));
	                                unit.setFieldValue('custrecordunit_rim', overrideUnitFieldsSearch[0].getValue('custitemgd_overridetirerimsize', 'item'));
	                                unit.setFieldValue('custrecordunit_gvwrlbs', overrideUnitFieldsSearch[0].getValue('custitemgd_overridegvwr', 'item'));
	                                unit.setFieldValue('custrecordunit_gawrallaxles', overrideUnitFieldsSearch[0].getValue('custitemgd_overridegawr', 'item'));
	                                unit.setFieldValue('custrecordunit_gawrsingleaxle',overrideUnitFieldsSearch[0].getValue('custitemgd_overridegawrsa', 'item'));
	                            }
	                            else
	                            {
	                                var modelId = unit.getFieldValue('custrecordunit_model');
	                                var model = nlapiLoadRecord('assemblyitem', modelId);
	                                
	                                //Reset everything.
                                    unit.setFieldValue('custrecordunit_gvwrlbs', model.getFieldValue('custitemrvsmodelgvwrlbs'));
                                    unit.setFieldValue('custrecordunit_gawrallaxles', model.getFieldValue('custitemrvsmodelgawrallaxles'));
                                    unit.setFieldValue('custrecordunit_gawrsingleaxle', model.getFieldValue('custitemrvsmodelgawrsingleaxle'));
                                    
                                    // The following code was taken from the RVS Common.js function SetUnitSpecsFromModel.  If anything changes with this piece of code
                                    // from the original file, it should also be changed here.
                                    
                                    /************START CODE FROM RVS file*********************/
                                    // if the order contains any line items that are associated with the "Tires" item group (id 17)
                                    // then use the option tire info from the model
                                    // otherwise, use the standard info
                                    var containsTireOptions = false;
                                    if (unitSalesOrder != null)
                                    {
                                        var lineItemCount = unitSalesOrder.getLineItemCount('item');
                                        for (var i=1; i<=lineItemCount; i++)
                                        {
                                            var custcolitemgroup = unitSalesOrder.getLineItemValue('item', 'custcolrvsitemgroup', i);
                                            if (custcolitemgroup == 17)
                                            {
                                                containsTireOptions = true;
                                                break;
                                            }
                                        }
                                    }
                                    
                                    if (containsTireOptions)
                                    {
                                        unit.setFieldValue('custrecordunit_rim', model.getFieldValue('custitemrvsrimsizeoptional'));
                                        unit.setFieldValue('custrecordunit_tire', model.getFieldValue('custitemrvstiresoptional'));
                                        unit.setFieldValue('custrecordunit_psi', model.getFieldValue('custitemrvstirepsioptional'));
                                    }
                                    else
                                    {
                                        unit.setFieldValue('custrecordunit_rim', model.getFieldValue('custitemrvstirerimstd'));
                                        unit.setFieldValue('custrecordunit_tire', model.getFieldValue('custitemrvstiresstd'));
                                        unit.setFieldValue('custrecordunit_psi', model.getFieldValue('custitemrvstirepsistd'));
                                    }
                                    
                                    /************END CODE FROM RVS file*********************/
	                            }
							}

							nlapiSubmitRecord(unit, true, true);
							// Save the Sales Order second, so that if the Unit
							// fails to save then we'll retry properly.
							nlapiSubmitRecord(unitSalesOrder, true, true);
						}
						
						break;
					}
					catch(err) {
						nlapiLogExecution('audit', 'err message', JSON.stringify(err));
			    		if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
			    			tryCount++;
			    			continue;
			    		}

			    		throw err;
					}
				}
			}
			
			// now go out and mark the unit's production status to "Offline-Rework" if the status is
			// either Complete, Offline-PDI, or Offline-QC Production Complete and dealer is not the 
			//only change made from the change order. 
			//Note: Only if dealer is not the only change do we want to update unit status. Case #3725
			var unitStatusId = nlapiLookupField('customrecordrvsunit', unitId, 'custrecordunit_status');
			if ((unitStatusId == PRODUCTION_STATUS_COMPLETE ||
				unitStatusId == PRODUCTION_STATUS_OFFLINEPDIQCCOMPLETE ||
				unitStatusId == PRODUCTION_STATUS_OFFLINEQCPRODUCTIONCOMPLETE) && !isDealerTheOnlyChange)
			{
				// Try a few times if the record has collision or record has been changed error before throwing the error.  This helps prevent devBox errors.
				var maxTryCount = 5;
				var tryCount = 1;
				while(tryCount < maxTryCount) {
					try {
						nlapiSubmitField('customrecordrvsunit', unitId, 'custrecordunit_status', PRODUCTION_STATUS_OFFLINEREWORK);
						
						break;
					}
					catch(err) {
						nlapiLogExecution('audit', 'err message', JSON.stringify(err));
			    		if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
			    			tryCount++;
			    			continue;
			    		}

			    		throw err;
					}
				}
			}
			
			// send out an email that the change order has been approved
			// email group id is 168... email to everyone in this list
			// also send this to the sales rep on the order
			// and the purchasing agents for this location
			var plugin = new ChangeOrderEmailSatus();
			plugin.EmailChangeOrderSatus('approved');
			
			//If BOM Config bundle is installed in the account, then we also want to re-process backlog.
			if(IsBOMConfigBundleInstalled())
			{
				var params = new Array();
				params['custscriptbom_processchgorder_chgorder'] = nlapiGetRecordId();
				
				ScheduleScript('customscriptbom_processchgord_sch', null, params);		
			}

		}
	}
}

/**
 * Return 1 if neither dealer is canadian.
 * Return 2 if the new dealer is set and is Canadian, or the old dealer is Canadian and the new dealer is not set.
 * Return 3 if the new dealer is set and is not Canadian.
 * 
 * @param oldDealerId
 * @param newDealerId
 */
function GetCanadianDealerChangeEnum(oldDealerId, newDealerId)
{
	if (newDealerId != null && newDealerId.length > 0) 
	{
		//Return 2 if the new dealer is set and is Canadian.
		if(nlapiLookupField('entity', newDealerId, 'shipcountry') == 'CA')
		{
			return 2;
		}
		else
		{
			//If the old is Canadian and the new one is isn't, return 3 (signifies that we need to remove the tax items)
			if (oldDealerId != null && oldDealerId.length > 0) 
			{
				if(nlapiLookupField('entity', oldDealerId, 'shipcountry') == 'CA') return 3;
			}
		}
	}
	else
	{
		if (oldDealerId != null && oldDealerId.length > 0) 
		{
			if(nlapiLookupField('entity', oldDealerId, 'shipcountry') == 'CA') return 2;
		}
	}
	
	return 1;
}

/**
 * Adds the correct CDL/non-CDL freight charge to the order based on the dealer and model.
 * Adds or removes the DPU Storage Fee based on the dealer and the shipping method.
 * Assumes that the dealer and model are set on the order object.
 * 
 * @param {nlobjRecord} salesOrder
 */
function checkSalesOrderFreightChargeAndDPUFee(salesOrder)
{
	//Find the index of the freight item and remove it if it exists.
	//Do this even if we're going to add it back b/c the cost might be different depending on if the dealer changed.
	var freightItem = GetFreightItem();
	var freightIndex = salesOrder.findLineItemValue('item', 'item', freightItem);
	if (freightIndex > 0)
	{
		salesOrder.removeLineItem('item', freightIndex);
	}
	
	//Find the index of the dpu fee
	var dpuItem = ConvertNSFieldToString(nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_dpustoragefeeitem'));
	var dpuIndex = salesOrder.findLineItemValue('item', 'item', dpuItem);
	
	//Load the dealer record and get the shipping method.
	var dealerRecord = nlapiLoadRecord('customer', salesOrder.getFieldValue('entity'));
	var shipMethod = ConvertNSFieldToString(salesOrder.getFieldValue('shipmethod'));
	
	//If it is DPU and the fee doesn't already exist, then add the dpu 
	if (shipMethod == 6 && dealerRecord.getFieldValue('custentitygd_exemptfromdpufee') != 'T')
	{
		//Set the values
		if (dpuIndex < 1)
		{
			salesOrder.selectNewLineItem('item');
			salesOrder.setCurrentLineItemValue('item', 'item', dpuItem);
			salesOrder.setCurrentLineItemValue('item', 'quantity', '1');
			salesOrder.commitLineItem('item');
		}
	}
	else if (dpuIndex > 0)
	{
		//Otherwise remove the DPU fee if it exists
		salesOrder.removeLineItem('item', dpuIndex);
	}
	
	//Then check the Freight Charge item.
	if (shipMethod != 6)
	{
		//If the ship method is not DPU, then add the freight amount.
		//Get the correct charge based on whether or not the model is CDL
		var freightRate = null;
		if (nlapiLookupField('assemblyitem', salesOrder.getFieldValue('custbodyrvsmodel'), 'custitemrvs_usecdlfreight') == 'T')
		{
			freightRate = parseFloat(dealerRecord.getFieldValue('custentityrvs_cdlfreightcharge'));
		}			
		else
		{
			for (var i = 1; i <= dealerRecord.getLineItemCount('itempricing'); i++)
			{
				if(dealerRecord.getLineItemValue('itempricing', 'item', i) == freightItem)
				{
					freightRate = parseFloat(dealerRecord.getLineItemValue('itempricing', 'price', i));
					break;
				}
			}
		}
		//Add the freight rate
		if (freightRate != null)
		{
			salesOrder.selectNewLineItem('item');
			salesOrder.setCurrentLineItemValue('item', 'item', freightItem);
			salesOrder.setCurrentLineItemValue('item', 'quantity', '1');
			salesOrder.setCurrentLineItemValue('item', 'rate', freightRate);
			salesOrder.setCurrentLineItemValue('item', 'amount', freightRate);
			var msrpRate = parseFloat(salesOrder.getFieldValue('custbodyrvsmsrprate')) || 0;
			var msrpRatePlusOne = 1 + (msrpRate / 100);
			var msrpCalculatedAmount = parseFloat(salesOrder.getCurrentLineItemValue('item', 'amount')) * msrpRatePlusOne;
			salesOrder.setCurrentLineItemValue('item', 'custcolrvsmsrpamount', msrpCalculatedAmount);
			salesOrder.commitLineItem('item');
		}
	}
}

/**
 * Add or remove model CDL Fee option based on whether or not 
 * the sales order model uses CDL Freight and whether or not order shipping method is/is not DPU.
 * @param salesOrder
 */
function addOrRemoveCDLFeeOption(salesOrder)
{
	var shippingMethodId = salesOrder.getFieldValue('shipmethod');
	var modelId = salesOrder.getFieldValue('custbodyrvsmodel');
	
	//If model is not specified, return
	if(modelId == undefined || modelId == null || modelId == '')
	{ 
		return; 
	}
	
	//We need to find option that is flagged as "IS CDL FEE" on a given model if the model is marked as "USE CDL Freight"
	var filters = [
	               	new nlobjSearchFilter('internalid', 'custrecordmodeloption_model', 'anyof', modelId),
	               	new nlobjSearchFilter('custitemrvs_usecdlfreight', 'custrecordmodeloption_model', 'is', 'T'),
	                new nlobjSearchFilter('isinactive', 'custrecordmodeloption_option', 'is', 'F'), 
	                new nlobjSearchFilter('custitemgd_iscdlfeeoption', 'custrecordmodeloption_option', 'is', 'T')               	
	              ];
	var cols = [
	            new nlobjSearchColumn('internalid', 'custrecordmodeloption_option', null)
	           ];
	           
	var modelCDLOptionResults = nlapiSearchRecord('customrecordrvsmodeloption', null, filters, cols);
	if(modelCDLOptionResults != null && modelCDLOptionResults.length > 0)
	{
		var modelCDLOptionId = modelCDLOptionResults[0].getValue('internalid', 'custrecordmodeloption_option');
		var optionLineNum = salesOrder.findLineItemValue('item', 'item', modelCDLOptionId); //If option is not on the order, this will be -1
		
		//Option is on the order but order shipping method is DPU, remove CDL Fee option on the order.
		if(optionLineNum > 0 && shippingMethodId == DPU_SHIP_METHOD) 
		{
			salesOrder.selectLineItem('item', optionLineNum);
			salesOrder.removeLineItem('item', optionLineNum);	
		}
		else if(optionLineNum < 0 && shippingMethodId != DPU_SHIP_METHOD) //CDL option is not on the order and shipping method is not DPU, add it.
		{
			salesOrder.selectNewLineItem('item');		
			salesOrder.setCurrentLineItemValue('item', 'quantity', 1);
			salesOrder.setCurrentLineItemValue('item', 'item', modelCDLOptionId);
			salesOrder.commitLineItem('item');	
		}	
	}
}

/**
 * Check if the Front protect option needs to be added on the line.
 */
function GD_checkFrontProtectiveWrapOption(salesOrder) {
	if(ConvertNSFieldToString(salesOrder.getFieldValue('custbodyrvsordertype')) == ORDERTYPE_UNIT) {
		// Get the model front protect wrap item id set from the model and the checkbox set from the Dealer.
		var modelFrontProtectWrapItemId = ConvertNSFieldToString(salesOrder.getFieldValue('custbodygd_modelfrontprotectwrapoptn')) || '';
		var isDealerFrontProtectWrap = ConvertNSFieldToString(salesOrder.getFieldValue('custbodygd_dealerfrontprotectwrapoptn')) == 'T' ? true : false;
		var frontProtectiveWrapOptionLineIndex = salesOrder.findLineItemValue('item', 'item', modelFrontProtectWrapItemId) || -1;
		var lineIndex = -1;
		var previousModelFrontProtectWrapItemId = '';

		if(isDealerFrontProtectWrap && modelFrontProtectWrapItemId != '' && frontProtectiveWrapOptionLineIndex == -1) {
			previousModelFrontProtectWrapItemId = ConvertNSFieldToString(salesOrder.getFieldValue('custbodygd_prevfrontprotectwrapoption')) || '';

			//There might already be a Front Protect Wrap option set on the line, we need to find it and remove it if it is different from the current Front Protective Wrap option.
			if (previousModelFrontProtectWrapItemId != '') {
				if (previousModelFrontProtectWrapItemId != modelFrontProtectWrapItemId) {

					salesOrder.setFieldValue('custbodyrvsallowdeletelineitems', 'T'); //allow lines to be added without config popup
					//replace the old FPW item and add the new FPW item.
					var lineIndex = salesOrder.findLineItemValue('item', 'item', previousModelFrontProtectWrapItemId) || -1;
					if (lineIndex != -1) {
						salesOrder.selectLineItem('item', lineIndex);
						salesOrder.setCurrentLineItemValue('item', 'item', modelFrontProtectWrapItemId);
					} else {
						salesOrder.selectNewLineItem('item');
						salesOrder.setCurrentLineItemValue('item', 'item', modelFrontProtectWrapItemId);
					}
					salesOrder.commitLineItem('item');
					salesOrder.setFieldValue('custbodyrvsallowdeletelineitems', 'F'); //prevent lines to be added without config popup

				} else {
					var lineIndex = salesOrder.findLineItemValue('item', 'item', modelFrontProtectWrapItemId) || -1;

					if (lineIndex != -1) {
						salesOrder.setFieldValue('custbodyrvsallowdeletelineitems', 'T'); //allow lines to be added without config popup
						salesOrder.selectLineItem('item', lineIndex);
						salesOrder.setCurrentLineItemValue('item', 'item', modelFrontProtectWrapItemId);
						salesOrder.commitLineItem('item');
						salesOrder.setFieldValue('custbodyrvsallowdeletelineitems', 'F'); //prevent lines to be added without config popup
					} else {
						salesOrder.setFieldValue('custbodyrvsallowdeletelineitems', 'T'); //allow lines to be added without config popup
						salesOrder.selectNewLineItem('item');
						salesOrder.setCurrentLineItemValue('item', 'item', modelFrontProtectWrapItemId);
						salesOrder.commitLineItem('item');
						salesOrder.setFieldValue('custbodyrvsallowdeletelineitems', 'F'); //prevent lines to be added without config popup
					}
				}
			} else {  // There are no Front Protective Wrap items present on the line just add the Front Protective Wrap from the model.
				salesOrder.setFieldValue('custbodyrvsallowdeletelineitems', 'T'); //allow lines to be added without config popup
				salesOrder.selectNewLineItem('item');
				salesOrder.setCurrentLineItemValue('item', 'item', modelFrontProtectWrapItemId);
				salesOrder.commitLineItem('item');
				salesOrder.setFieldValue('custbodyrvsallowdeletelineitems', 'F'); //prevent lines to be added without config popup
			}
		} else if (!isDealerFrontProtectWrap) {
			previousModelFrontProtectWrapItemId = ConvertNSFieldToString(salesOrder.getFieldValue('custbodygd_prevfrontprotectwrapoption')) || '';
			if (previousModelFrontProtectWrapItemId != '') {
				lineIndex = salesOrder.findLineItemValue('item', 'item', previousModelFrontProtectWrapItemId) || -1;
				if (lineIndex != -1) {
					salesOrder.setFieldValue('custbodyrvsallowdeletelineitems', 'T'); //allow lines to be added without config popup
					salesOrder.removeLineItem('item', lineIndex);
					salesOrder.setFieldValue('custbodyrvsallowdeletelineitems', 'F'); //prevent lines to be added without config popup
				}
			} else if (modelFrontProtectWrapItemId != '') {
				lineIndex = salesOrder.findLineItemValue('item', 'item', modelFrontProtectWrapItemId) || -1;
				if (lineIndex != -1) {
					salesOrder.setFieldValue('custbodyrvsallowdeletelineitems', 'T'); //allow lines to be added without config popup
					salesOrder.removeLineItem('item', lineIndex);
					salesOrder.setFieldValue('custbodyrvsallowdeletelineitems', 'F'); //prevent lines to be added without config popup
				}
			}
		}
	}
}