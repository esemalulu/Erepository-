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
 * Module Description: Hide Item Column
 *
 * Version    Date            Author           Remarks
 * 1.00       27 May 2016     mjpascual	   	   initial
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * 
 */
define(['N/record', 'N/search', './NSUtil', 'N/error', 'N/runtime'], function(record, search, NSUtil, error, runtime)
{
	
	function beforeSubmit_checkItems(context)
	{
		var stLogTitle = 'beforeSubmit_checkItems';
		
		try
		{
			if (context.type == context.UserEventType.DELETE)
			{
				return;
			}
			var stRestrictedRole = runtime.getCurrentScript().getParameter('custscript_sears_rl_integration_role_2');
			var objUser = runtime.getCurrentUser();
			
			if(objUser.role == stRestrictedRole)
			{
				return;
			}
			log.debug(stLogTitle, '>> Entry Log <<');
			log.debug(stLogTitle, 'context.type = ' + context.type);
			log.debug(stLogTitle, 'runtime.executionContext = ' + runtime.executionContext);
			
			
			//Role checking
			log.debug(stLogTitle, 'stRestrictedRole = ' + stRestrictedRole + '| objUser.role = ' + objUser.role);

			var recCurrent = context.newRecord;
			
			var stVendorId = recCurrent.getValue('entity');
			var intLineCount = recCurrent.getLineCount('item');
			
			log.debug(stLogTitle, 'stVendorId = '+ stVendorId + ' | intLineCount = ' + intLineCount);
			
			var arrItemInit = [];
			//Loop Item Line
			for(var intCtr = 0; intCtr < intLineCount;  intCtr++)
			{
				var stItemId =  recCurrent.getSublistValue({
					sublistId : 'item',
					fieldId : 'item',
					line : intCtr
				});

				//If item is not in the array, then the record should not be saved.
				if(!NSUtil.inArray(stItemId, arrItemInit))
				{
					arrItemInit.push(stItemId);
				}
			}
			
			log.debug(stLogTitle, 'arrItemInit = '+ arrItemInit);
			
			var arrItemSearchResult = NSUtil.searchAll(
			{
				recordType : 'item',
				columns : ['internalid'],
				filterExpression:
				[
			        ['internalid', search.Operator.ANYOF, arrItemInit],
			        'AND',
			        ['othervendor', search.Operator.ANYOF, stVendorId]
				]
			});
			
			var arrItems = [];
			var arrErrorItems = [];
			
			//Store item result in an array
			for (var intCtr = 0; intCtr < arrItemSearchResult.length; intCtr++)
			{
				var objResult = arrItemSearchResult[intCtr];
				var stItemId = objResult.getValue('internalid');
				arrItems.push(stItemId);
			}
		
			log.debug(stLogTitle, 'arrItems = '+arrItems);
			
			//Loop Item Line
			for(var intCtr = 0; intCtr < intLineCount;  intCtr++)
			{
			
				var stItemId =  recCurrent.getSublistValue({
					sublistId : 'item',
					fieldId : 'item',
					line : intCtr
				});

				log.debug(stLogTitle, 'intCtr = '+intCtr + ' | stItemId = ' + stItemId);
				
				//If item is not in the array, then the record should not be saved.
				if(!NSUtil.inArray(stItemId, arrItems))
				{
					arrErrorItems.push(stItemId);
				}
			}
			
			log.debug(stLogTitle, 'arrErrorItems = '+arrErrorItems);
			
			if(!NSUtil.isEmpty(arrErrorItems))
			{
				throw error.create({
					name: 'INVALID_ITEMS',
					message: ': Item/s Id #'+arrErrorItems + ' are invalid for vendor #'+stVendorId
				});
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
			log.debug(stLogTitle, '>> Exit Log <<');
		}

	}
	
	
	function afterSubmit_setItems(context)
	{
		var stLogTitle = 'afterSubmit_setItems';
		
		try
		{
			log.debug(stLogTitle, '>> Entry Log <<');
			log.debug(stLogTitle, 'context.type = ' + context.type);
			log.debug(stLogTitle, 'runtime.executionContext = ' + runtime.executionContext);

			if (context.type == context.UserEventType.DELETE)
			{
				return;
			}
			
			//Role checking
			var stRestrictedRole = runtime.getCurrentScript().getParameter('custscript_sears_rl_integration_role_2');
			var objUser = runtime.getCurrentUser();
			
			log.debug(stLogTitle, 'stRestrictedRole = ' + stRestrictedRole + '| objUser.role = ' + objUser.role);
			if(objUser.role == stRestrictedRole)
			{
				log.debug(stLogTitle, 'exiting...');
				return;
			}
			
			var recCurrent = context.newRecord;
			var stRecId = recCurrent.id;
			var stRecType = recCurrent.type;
			
			var recObj = record.load({
				type: stRecType,
				id: stRecId,
				isDynamic: false
			});
			
			var intLineCount = recObj.getLineCount('item');
			log.debug(stLogTitle, 'intLineCount = ' + intLineCount);

			//Loop items
			for(var intCtr = 0; intCtr < intLineCount;  intCtr++)
			{
			
				//Getters
				var stItemId =  recObj.getSublistValue({
					sublistId : 'item',
					fieldId : 'item',
					line : intCtr
				});
				
				var stCustItemId =  recObj.getSublistValue({
					sublistId : 'item',
					fieldId : 'custcol_customitem',
					line : intCtr
				});
				
				log.debug(stLogTitle, 'stItemId = '+stItemId + ' | stCustItemId = '+stCustItemId);
				
				//If native item is not equal to the custom item
				if(!NSUtil.isEmpty(stItemId) && stCustItemId != stItemId)
				{
					//Setter
					recObj.setSublistValue({
						sublistId : 'item',
						fieldId : 'custcol_customitem',
						value : stItemId,
						line : intCtr
					});
				} 

			}
			
			var stId = recObj.save({
				enableSourcing: false,
				ignoreMandatoryFields: true
			});
			
			log.audit(stLogTitle, 'Updated stId = ' + stId);

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

	}

	return {
		beforeSubmit: beforeSubmit_checkItems,
		afterSubmit: afterSubmit_setItems
	};
	
});
