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
 * Module Description: Rejection Reason
 *
 * Version    Date            Author           Remarks
 * 1.00       01 June 2016     mjpascual	   initial
 */

/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/redirect', 'N/error'], function(record, redirect, error){

	function workflowAction_rejection(context)
	{
		var stLogTitle = 'workflowAction_rejection';
		log.debug(stLogTitle, '>> Entry Log <<');
		
		try
		{
			//Getters
			var recVendor = context.newRecord;
			
			var objParam = {};
			objParam['custpage_tranid'] = recVendor.id;
			objParam['custpage_trantype'] = recVendor.type;
			
			log.debug(stLogTitle, 'objParam = '+ JSON.stringify(objParam));
			
			//Redirect to suitelet
			redirect.toSuitelet({
				scriptId: 'customscript_ns_sl_reject_approval' ,
				deploymentId: 'customdeploy_ns_sl_reject_approval',
				parameters: objParam
			});
			
			log.debug(stLogTitle, 'Redirected to suitelet...');
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
		onAction : workflowAction_rejection
	};
});
