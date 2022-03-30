/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */

/**
 * Module Description: Populate the total discount
 *
 * Version    Date            Author           Remarks
 * 1.00       12 Aug 2016    cmargallo	   	   initial
 */

/**
* @NApiVersion 2.0
* @NScriptType UserEventScript
*/
define(['N/record', 'N/search', './NSUtil', 'N/format', 'N/runtime'], function (record, search, NSUtil, format, runtime)
{
	
	/**
	 * This function populate the total discount
	 */
	function afterSubmit_populateTotalDiscount(context) 
	{
		var stLogTitle = 'afterSubmit_populateTotalDiscount';
		try
		{
			//Role checking
			var stRestrictedId = runtime.getCurrentScript().getParameter('custscript_sears_rl_integration_role_2');
			var objUser = runtime.getCurrentUser();
			if(objUser.id == stRestrictedId)
			{
				return;
			}
			log.debug(stLogTitle, 'stRestrictedId = ' + stRestrictedId + '| objUser.id = ' + objUser.id);
			
			log.debug(stLogTitle, '- Entry -');
			// Hold the total discount
			var flTotalDiscount = 0.00;
			// Load the sales order record
			var recSalesOrder = record.load({type: record.Type.SALES_ORDER,
				id: context.newRecord.id,
				isDynamic: true});
			// Hold the item id
			var stItemID = null;
			// Hold the discount amount
			var flDiscountAmount = 0.00;
			// Hold the item type
			var stItemType = null;
			// Get the line count
			var intLineCount = recSalesOrder.getLineCount({sublistId : 'item'});
			// Get the item excluded discount item list
			var arrExcludedItemList = getExcludeDiscountItemList();
			// Iterate the line item
			for (var intLinenum = 0; intLinenum < intLineCount; intLinenum++) {
				// Get the item type
				stItemType = recSalesOrder.getSublistValue({
					sublistId : 'item',
					fieldId : 'itemtype',
					line : intLinenum
				}); 
				// Check if discount item type
				if (stItemType == 'Discount') {
					// Get discount item
					stItemID = recSalesOrder.getSublistValue({
						sublistId : 'item',
						fieldId : 'item',
						line : intLinenum
					});
					// Check if the item id is not in excluded discount item
					if (!NSUtil.inArray(stItemID, arrExcludedItemList)) {
						// Get the discount amount
						flDiscountAmount = recSalesOrder.getSublistValue({
							sublistId : 'item',
							fieldId : 'amount',
							line : intLinenum
						});
						flTotalDiscount += Math.abs(flDiscountAmount);
					}
				}
			}
			log.debug(stLogTitle, 'Total Discount : ' + flTotalDiscount);
			// Set the total discount
			recSalesOrder.setValue({
				fieldId : 'custbodytotal_value_saved',
				value : flTotalDiscount
			});
			// Update the record
			var stSalesRecordID = recSalesOrder.save();
			log.audit(stLogTitle, 'Updated Sales Order : ' + stSalesRecordID);
		}
		catch (e)
		{
			if (e.message != undefined)
			{
				log.error('ERROR' , e.name + ' ' + e.message);
				throw e.name + ' ' + e.message;
			}
			else
			{
				log.error('ERROR', 'Unexpected Error' , e.toString()); 
				throw error.create({
					name: '99999',
					message: e.toString()
				});
			}
		}
		finally
		{
			log.debug(stLogTitle, '- Exit -');
		}
	}
	
	/**
	 * This function get the list that is not included on the discount item
	 */
	function getExcludeDiscountItemList() {
		var stLogTitle = 'getExcludeDiscountItemList';
		log.debug(stLogTitle, '- Entry -');
		// Hold the excluded discount item
		var arrExcludedDiscountItem = [];
		var excludedItemSearch = search.create({
			type: 'customrecord_promo_discount_item_exclude',
			columns: ['custrecord_discount_item_exclude']
		});
		excludedItemSearch.run().each(function(result) {
			arrExcludedDiscountItem.push(result.getValue('custrecord_discount_item_exclude'));
			return true;
		});
		
		log.debug(stLogTitle, 'Return : ' + JSON.stringify(arrExcludedDiscountItem));
		log.debug(stLogTitle, '- Exit -');
		return arrExcludedDiscountItem;
	}
	
	return {
		afterSubmit: afterSubmit_populateTotalDiscount
	};
});
		