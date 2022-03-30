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
 * Module Description: Set Vendor Record List in a multi-select field
 *
 * Version    Date            Author           Remarks
 * 1.00       27 May 2016     mjpascual	   	   initial
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', './NSUtil', 'N/runtime','N/error'], function(record, NSUtil, runtime, error)
{
	function afterSubmit_SetVendorList(context)
	{
		var stLogTitle = 'afterSubmit_SetVendorList';
		
		try
		{
			log.debug(stLogTitle, '>> Entry Log <<');

			if (context.type == context.UserEventType.DELETE)
			{
				return true;
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
			
			//Init
			var arrVendorList = [];

			//Get Record
			var rec = context.newRecord;

            var stType = context.newRecord.type;
            var stId = context.newRecord.id;
	
            log.debug(stLogTitle, 'stType ='+stType);
            log.debug(stLogTitle, 'stId ='+stId );

			//Get Vendors
			var intLineCount = rec.getLineCount('itemvendor');
			log.debug(stLogTitle, 'intLineCount = '+intLineCount);
			
			for (var intCtr = 0; intCtr < intLineCount; intCtr++)
			{
				
				var stVendorID = rec.getSublistValue({
					sublistId: 'itemvendor',
					fieldId: 'vendor',
					line: intCtr
				})
				
				log.debug(stLogTitle, 'stVendorID = '+stVendorID);
				
				if(!NSUtil.inArray(stVendorID, arrVendorList))
				{
					arrVendorList.push(stVendorID);
				}
			}
			
			log.debug(stLogTitle, 'arrVendorList = '+arrVendorList);
		
            record.submitFields({
				type : stType,
				id : stId,
				values :
				{
					 'custitem_sears_multi_vendor_list' : arrVendorList
				}
            });

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

	return{
		afterSubmit: afterSubmit_SetVendorList
	};
});
