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
 * Module Description: Remove the service/order assistance fee
 *
 * Version    Date            Author           Remarks
 * 1.00       14 July 2016    cmargallo	   	   initial
 */

/**
*@NApiVersion 2.0
*@NScriptType UserEventScript
*/
define(['N/runtime', './NSUtil', 'N/search', 'N/error'],function(runtime, NSUtil, search, error) {

	/**
	 * 
	 */
	function beforeLoad_removeServiceOrderAssistanceFee(context) {
		var stLogTitle = 'beforeLoad_removeServiceOrderAssistanceFee';
		try
		{
			log.debug(stLogTitle, '- Entry -');
			log.debug(stLogTitle, 'Record ID : ' + context.newRecord.id);
			var stEventType = context.type;
			log.debug(stLogTitle, 'User Event Type : ' + stEventType);
			if (stEventType !== context.UserEventType.CREATE) {
				return;
			}
			// Hold the returnable value of item
			var objReturnableItemList = null;
			// Hold the flag
			var blnReturnable = false;
			// Hold the item
			var stLineItem = null;
			// Hold the item type
			var stItemType = null;
			// Get the record
			var recRA = context.newRecord;
			// Get the service item
			var stServiceItem = runtime.getCurrentScript().getParameter({name: 'custscript_service_item'});
			// Get the standard item
			var stStandardItem = runtime.getCurrentScript().getParameter({name: 'custscript_standard_item'});
			//  Get the line count of the item sublist
			var intLinecount = recRA.getLineCount({
			    sublistId: 'item'
			});
			
			var arrClearFields = ['custcol_sent_to_apigee','custcol_wms_sending_seconds','custcol_wms_error_sending_chk','custcol_sent_to_wms_timestamp']
			
			
			// Get the returnable flag of the item in sublist
			objReturnableItemList = getItemReturnableFlag(recRA);
			// Iterate the list
			for (var intLinenum = 0; intLinenum < intLinecount; intLinenum++) {
				
				arrClearFields.forEach(function(fldCol){
					if(fldCol) {
						recRA.setSublistValue({
						    sublistId: 'item',
						    fieldId: fldCol,
						    vales: null,
						    line: intLinenum
						});
					}
					return true;
				});
				
				// Get the line item
				stLineItem = recRA.getSublistValue({
				    sublistId: 'item',
				    fieldId: 'item',
				    line: intLinenum
				});
				log.debug(stLogTitle, 'Item : ' + stLineItem);
				if (!NSUtil.isEmpty(stLineItem)) {
					// Compare the item
					if (stServiceItem == stLineItem && intLinenum == 0) {
						// Remove the line item
						recRA.removeLine({
							sublistId: 'item',
							line: intLinenum
						});
						// Get the next item
						stLineItem = recRA.getSublistValue({
						    sublistId: 'item',
						    fieldId: 'item',
						    line: intLinenum
						});
						// Compare
						if (stStandardItem == stLineItem) {
							// Remove the line item
							recRA.removeLine({
								sublistId: 'item',
								line: intLinenum
							});
						}
						intLinenum--;
					} else {
						blnReturnable = objReturnableItemList[stLineItem];
						log.debug(stLogTitle, 'Non-Returnable : ' + blnReturnable);
						if (blnReturnable) {
							// Remove the line item
							recRA.removeLine({
								sublistId: 'item',
								line: intLinenum
							});
							// Get the item type of the next item
							stItemType = recRA.getSublistValue({
							    sublistId: 'item',
							    fieldId: 'itemtype',
							    line: intLinenum-1
							});
							log.debug(stLogTitle, 'Next Item Type : ' + stItemType);
							// Check if discount
							if (stItemType == 'Discount') {
								// Remove the line item
								recRA.removeLine({
									sublistId: 'item',
									line: intLinenum
								});
							}
							blnReturnable = false;
							intLinenum--;
						}
					}
				} else {
					break;
				}
			}
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
	 * This function get the returnable flag of the item 
	 */
	function getItemReturnableFlag(recRA) {
		var stLogTitle = 'getItemReturnableFlag';
		log.debug(stLogTitle, '- Entry -');
		// Hold the returnable item flag list
		var objReturnableItemList = new Object;
		// Hold item list
		var arrItemList = [];
		// Hold the item
		var stLineItem = null;
		// Hold the flag if returnable
		var blnReturnable = false;
		//  Get the line count of the item sublist
		var intLinecount = recRA.getLineCount({
		    sublistId: 'item'
		});
		// Iterate the list
		for (var intLinenum = 0; intLinenum < intLinecount; intLinenum++) {
			// Get the line item
			stLineItem = recRA.getSublistValue({
			    sublistId: 'item',
			    fieldId: 'item',
			    line: intLinenum
			});
			if (!NSUtil.isEmpty(stLineItem)) {
				// Check if the item not yet exist
				if (arrItemList.indexOf(stLineItem) == -1 && stLineItem > 0) {
					// Store the item
					arrItemList.push(stLineItem);
				}
			}
		}
		log.debug(stLogTitle, 'Item : ' + JSON.stringify(arrItemList));
		if (!NSUtil.isEmpty(arrItemList) && arrItemList.length > 0) {
			// Create filter
			var mySearchFilter = search.createFilter({
				name: 'internalid',
				operator: 'anyof',
				values: arrItemList
			});
			var objItemSearch = search.create({
				type: 'item',
				filters: mySearchFilter,
				columns: ['custitem_non_return_item', 'internalid']
			});
			// Run the search
			objItemSearch.run().each(function(result) {
				stLineItem = result.getValue({
					name: 'internalid'
				});
				blnReturnable = result.getValue({
					name: 'custitem_non_return_item'
				});
				objReturnableItemList[stLineItem] = blnReturnable;
				return true;
			});
		}
		log.debug(stLogTitle, 'Return : ' + JSON.stringify(objReturnableItemList));
		log.debug(stLogTitle, '- Exit -');
		return objReturnableItemList;
	}
	
	return {
		beforeLoad: beforeLoad_removeServiceOrderAssistanceFee,
	};
});
