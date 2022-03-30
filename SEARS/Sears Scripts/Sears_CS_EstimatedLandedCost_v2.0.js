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
 * Module Description: Calculate Estimated Landed Cost
 *
 * Version    Date            Author           Remarks
 * 1.00       31 May 2016     mjpascual	   	   initial
 */

/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/record', './NSUtil', 'N/error'], function(record, NSUtil, error)
{
	/**
	 * Validate Line
	 * @param context
	 * @returns {Boolean}
	 */
	function validateLine_calculateELC(context)
	{
		try
		{	
			var recCurrent = context.currentRecord;
			var stSublistName = context.sublistId;

			if (stSublistName === 'item')
			{
				var flItemELC = NSUtil.forceFloat(recCurrent.getCurrentSublistValue({
					sublistId : stSublistName,
					fieldId : 'custcol_estimated_landed_cost'
				}));
				var flQty = NSUtil.forceFloat(recCurrent.getCurrentSublistValue({
					sublistId : stSublistName,
					fieldId : 'quantity'
				}));

				//Compute ELC = ELC(Item) * Qty
				var flELC = flItemELC * flQty;
				
				//Setters
				recCurrent.setCurrentSublistValue({
					sublistId : stSublistName,
					fieldId : 'custcol_estimated_landed_cost_amt',
					value : flELC
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
		return true;
	}
	
	/**
	 * sublistChanged
	 * @param context
	 */
	function sublistChanged_calculateELC(context)
	{
		try
		{
			var recCurrent = context.currentRecord;
			var stSublistName = context.sublistId;

			if (stSublistName === 'item')
			{
				//Initialize
				var flTotalELC = 0;
				var intLineCount = recCurrent.getLineCount(stSublistName);

				//Loop all the lines to get the total
				for ( var intCtr = 0; intCtr < intLineCount; intCtr++)
				{
					var flLineAmt = NSUtil.forceFloat(recCurrent.getSublistValue({
						sublistId : stSublistName,
						fieldId : 'custcol_estimated_landed_cost_amt',
						line : intCtr
					}));

					flTotalELC += flLineAmt;
				}

				//Setter
				recCurrent.setValue({
					fieldId : 'custbody_total_estimated_landed_cost',
					value : flTotalELC
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

	return{
		sublistChanged : sublistChanged_calculateELC,
		validateLine : validateLine_calculateELC
	};
});
