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
define(['N/record', './NSUtil', 'N/error', 'N/runtime'], function(record, NSUtil, error, runtime)
{
	function beforeSubmit_calculateELC(context)
	{
		var stLogTitle = 'beforeSubmit_calculateELC';
		
		try
		{
			if (context.type == context.UserEventType.DELETE)
			{
				return;
			}
			//Role checking
			var stRestrictedRole = runtime.getCurrentScript().getParameter('custscript_sears_rl_integration_role_2');
			var objUser = runtime.getCurrentUser();
			if(objUser.role == stRestrictedRole)
			{
				return;
			}
			log.debug(stLogTitle, '>> Entry Log <<');
			log.debug(stLogTitle, 'context.type = ' + context.type);
			log.debug(stLogTitle, 'stRestrictedRole = ' + stRestrictedRole + '| objUser.role = ' + objUser.role);
			
			//Initialize
			var flTotalELC = 0;
			var stSublistName = 'item';
			var recCurrent = context.newRecord;
			var intLineCount = recCurrent.getLineCount(stSublistName);

			//Loop all the lines to get the ELC and the total ELC
			for ( var intCtr = 0; intCtr < intLineCount; intCtr++)
			{
				//Getters
				var flItemELC = NSUtil.forceFloat(recCurrent.getSublistValue({
					sublistId : stSublistName,
					fieldId : 'custcol_estimated_landed_cost',
					line : intCtr
				}));
				var flQty = NSUtil.forceFloat(recCurrent.getSublistValue({
					sublistId : stSublistName,
					fieldId : 'quantity',
					line : intCtr
				}));

				//Compute ELC = ELC(Item) * Qty
				var flELC = flItemELC * flQty;
				
				//Setter
				recCurrent.setSublistValue({
					sublistId : stSublistName,
					fieldId : 'custcol_estimated_landed_cost_amt',
					value : flELC,
					line : intCtr
				});
				
				log.debug(stLogTitle, 'intCtr = ' + intCtr + ' | flELC = ' + flELC);
				
				flTotalELC += flELC;
			}

			//Setter
			recCurrent.setValue({
				fieldId : 'custbody_total_estimated_landed_cost',
				value : flTotalELC
			});
			
			log.debug(stLogTitle, 'flTotalELC = ' + flTotalELC);
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
		beforeSubmit : beforeSubmit_calculateELC
	};
});
