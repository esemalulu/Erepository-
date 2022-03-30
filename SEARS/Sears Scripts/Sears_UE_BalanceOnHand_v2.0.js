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
 * Module Description: Server side script will be triggered upon integration and CSV imports to Calculate for Estimated Landed Cost
 *
 * Version    Date            Author           Remarks
 * 1.00       31 May 2016     mjpascual	   	   initial
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * 
 */
define(['N/record', './NSUtil', 'N/error', 'N/search', 'N/runtime'], function(record, NSUtil, error, search, runtime)
{
	function beforeSubmit_computeBalance(context)
	{
		var stLogTitle = 'beforeSubmit_computeBalance';
		
		try
		{
			log.debug(stLogTitle, '>> Entry Log <<');
			log.debug(stLogTitle, 'context.type = ' + context.type);
			
			//Role checking
			var stRestrictedRole = runtime.getCurrentScript().getParameter('custscript_sears_rl_integration_role_2');
			var objUser = runtime.getCurrentUser();			
			if(objUser.role == stRestrictedRole)
			{				
				return;
			}
			log.debug(stLogTitle, 'stRestrictedRole = ' + stRestrictedRole + '| objUser.role = ' + objUser.role);

			//Triggers script upon creation
			if (context.type != context.UserEventType.CREATE)
			{
				return;
			}

			
			var recCurrent = context.newRecord;
			
			var stItem = recCurrent.getValue('custrecord_sears_item');
			var stWMSLoc = recCurrent.getValue('custrecord_sears_wms_location');
			var stNSLoc = recCurrent.getValue('custrecord_sears_ns_location');
			
			log.debug(stLogTitle, 'stItem = ' + stItem + ' | stWMSLoc = '+stWMSLoc + ' | stNSLoc = '+stNSLoc );
			
			//Validate fields
			if(!NSUtil.isEmpty(stNSLoc))
			{
				log.debug(stLogTitle, 'Exiting..');
				return;
			}
			
			if(NSUtil.isEmpty(stItem) || NSUtil.isEmpty(stWMSLoc))
			{
				recCurrent.setValue('custrecord_sears_error_msg', 'Item and WMS/NS Location is required.');
				return;
			}
			

			//Search for item
			var arrSearchFilters = [];
			
			arrSearchFilters.push( search.createFilter({
					name : 'internalid',
					operator : search.Operator.ANYOF,
					values : [ stItem ] 
				})
			);
			
			arrSearchFilters.push( search.createFilter({
					name : 'inventorylocation',
					operator : search.Operator.ANYOF,
					values : [ stWMSLoc ] 
				})
			);
			
			arrSearchFilters.push( search.createFilter({
				name : 'isinactive',
				operator : search.Operator.IS,
				values : [ 'F' ] 
				})
			);
			
			var arrSearchColumns = ['locationquantityonhand'];
			
			var arrItemSearchResult = NSUtil.searchList(null, 'ITEM', arrSearchFilters, arrSearchColumns);

			//If no result found..
			if(NSUtil.isEmpty(arrItemSearchResult))
			{
				recCurrent.setValue('custrecord_sears_error_msg', 'Item / Location not found.');
				return;
			}
			
			//Getters
			var flNSQty = NSUtil.forceFloat(arrItemSearchResult[0].getValue('locationquantityonhand'));
			var flWMSQty = NSUtil.forceFloat(recCurrent.getValue('custrecord_sears_wms_qty'));
			var flQtyDiff = flNSQty - flWMSQty;
			
			log.debug(stLogTitle, 'flNSQty = ' + flNSQty + '| flNSQty = ' + flNSQty + '| flQtyDiff = ' + flQtyDiff);
			
			if(flQtyDiff !=  0)
			{
				recCurrent.setValue('custrecord_sears_error_msg', 'NetSuite Quantity does not match with WMS Quantity.');
			}
			
			//Setters
			recCurrent.setValue('custrecord_sears_ns_qty', flNSQty);
			recCurrent.setValue('custrecord_sears_qty_diff', flQtyDiff);
			
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
			log.debug(stLogTitle, '>> Exit Log <<');
		}
		
		return true;
	}

	return {
		beforeSubmit : beforeSubmit_computeBalance
	};
});
