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
 * Module Description: Set native item based from custom item
 *
 * Version    Date            Author           Remarks
 * 1.00       28 May 2016     mjpascual	   	   initial
 */

/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/record', './NSUtil', 'N/error'], function(record, NSUtil, error)
{
	
	/**
	 * Field Changed
	 * @param context
	 * @returns {Boolean}
	 */
	function fieldChanged_SetItem(context)
	{

		try
		{
			var rec = context.currentRecord;
			var stSublistName = context.sublistId;
			var stSublistFieldName = context.fieldId;
			
			if(stSublistName == 'item' && stSublistFieldName == 'custcol_customitem')
			{
				
				var stItem = rec.getCurrentSublistValue({
					sublistId: stSublistName,
					fieldId: stSublistFieldName
				});
				
				rec.setCurrentSublistValue({
					sublistId : stSublistName,
					fieldId: 'item',
					value: stItem
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

	}
	
	/**
	 * Validate Field
	 * @param context
	 * @returns {Boolean}
	 */
	function validateField_SetVendor(context)
	{

		try
		{
			var rec = context.currentRecord;
			var stFieldName = context.fieldId;
			
			//If vendor is changed
			if(stFieldName == 'entity')
			{
				//Check if item line is empty. Else, show an error.
				var intLineLen =  rec.getLineCount('item');
				
				if(intLineLen > 0)
				{
					alert('USER_ERROR: Item related to the vendor already has been selected. You cannot change the vendor.')
					return false;
				}
			}
			
			return true;
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

	}	
	
	return{
		fieldChanged: fieldChanged_SetItem,
		validateField : validateField_SetVendor
	};
});
