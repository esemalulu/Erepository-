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
 * Module Description: Populate Receiving Location
 *
 * Version    Date            Author           Remarks
 * 1.00       25 June 2016    mjpascual	   	   initial
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * 
 */
define(['N/record', 'N/error', 'N/runtime', './NSUtil',  'N/search', './LibJsonRequest'], function(record, error, runtime, NSUtil, search, LibWebReq){
	
	function beforeLoad_populateRecLoc(context)
	{
		var stLogTitle = 'beforeLoad_populateRecLoc';
		try
		{
			log.debug(stLogTitle, '>> Entry Log <<');
			log.debug(stLogTitle, 'context.type = ' + context.type + ' | runtime.executionContext = '+runtime.executionContext);
			
			if(runtime.executionContext != runtime.ContextType.USER_INTERFACE)
			{
				return;
			}

			if (context.type == context.UserEventType.DELETE)
			{
				return;
			}
			
			//Role checking
			var stRestrictedRole = runtime.getCurrentScript().getParameter('custscript_sears_rl_integration_role');
			var objUser = runtime.getCurrentUser();
			
			log.debug(stLogTitle, 'stRestrictedRole = ' + stRestrictedRole + '| objUser.role = ' + objUser.role);
			if(objUser.role == stRestrictedRole)
			{
				log.debug(stLogTitle, 'exiting...');
				return;
			}
			
			
			var recRA = context.newRecord;
			var stRecAreaLocId = '';
			
			var intLineCount = recRA.getLineCount({
				sublistId : 'item'
			});

			for (var intCtr = 0; intCtr < intLineCount; intCtr++)
			{
				
				var stLoc = recRA.getSublistValue({
					sublistId : 'item',
					fieldId : 'location',
					line : intCtr
				});

				log.debug(stLogTitle, 'stLoc = ' + stLoc);
				
				if(NSUtil.isEmpty(stLoc))
				{
					continue;
				}
				
				if(NSUtil.isEmpty(stRecAreaLocId))
				{
					stRecAreaLocId = LibWebReq.populateReceivingLocation(stLoc);
				}
				
				log.debug(stLogTitle, 'stRecAreaLocId = ' + stRecAreaLocId);
				//Set the receiving location
				if(!NSUtil.isEmpty(stRecAreaLocId))
				{
					recRA.setSublistValue({
						sublistId : 'item',
						fieldId : 'location',
						line : intCtr,
						value : stRecAreaLocId
					});
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
			log.debug(stLogTitle, '>> Exit Log <<');
		}

	}

	return {
		beforeLoad : beforeLoad_populateRecLoc
	};
});
