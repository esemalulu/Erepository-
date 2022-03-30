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
 * 
 */
define(['N/record', 'N/ui/serverWidget', 'N/error'], function(record, serverWidget, error)
{
	function beforeLoad_hideItemColumn(context)
	{
		var stLogTitle = 'beforeLoad_hideItemColumn';
		try
		{
			log.debug(stLogTitle, '>> Entry Log <<');
			log.debug(stLogTitle, 'context.type = ' + context.type);

			if (context.type == context.UserEventType.DELETE)
			{
				return;
			}
			
			var objForm = context.form;
			log.debug(stLogTitle, 'sublist');
			
			var objItemSublist = objForm.getSubList({
				id : 'item'
			});
			
			log.debug(stLogTitle, 'sublist');
			
			var objItemField = objForm.getField({
				id : 'item'
			});
			
			log.debug(stLogTitle, 'field item');
			
			objItemField.updateDisplayType({
			    displayType : serverWidget.FieldDisplayType.DISABLED
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

	return {
		beforeLoad : beforeLoad_hideItemColumn
	};
});
