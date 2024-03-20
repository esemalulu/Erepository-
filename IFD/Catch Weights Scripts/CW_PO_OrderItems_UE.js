nlapiLogExecution("audit","FLOStart",new Date().getTime());
/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 */

/**
 * Module Description:
 * 
 * 
 * Version    Date				Author				Remarks
 * 1.00       30 Sep 2015     jerfernandez			Demo version
 * 1.10       08 Jun 2016     memeremilla			Initial version (working copy)
 *
 */

//'use strict';

/**
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @return {void}
 */

function orderItemsAfterSubmit(type)
{
	try
	{
		var stLoggerTitle = 'orderItemsAfterSubmit'
		nlapiLogExecution('DEBUG', stLoggerTitle, '**** START: Script entry point function.****' + ' | Operation Type: ' + type);

		if (!(type == 'orderitems'))
		{
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Unsupported operation type. | **** END: Script entry point function.****');
			return;
		}
		var stRecordId = nlapiGetRecordId();
		var stRecordType = nlapiGetRecordType();
		var recPO = nlapiLoadRecord(stRecordType, stRecordId,
			{
				recordmode : 'dynamic'
			});
		var intLines = recPO.getLineItemCount('item');

		for (var intCtr = 1; intCtr <= intLines; intCtr++)
		{
			var stItemId = nlapiGetLineItemValue('item', 'item', intCtr);
			var objItemFldValue = nlapiLookupField('item', stItemId,
				[
				        'weight', 'unitstype'
				]);
			var objItemFldTxtValue = nlapiLookupField('item', stItemId,
				[
					'purchaseunit'
				], true);

			var flWeight = NSUtil.forceFloat(objItemFldValue['weight']);
			var stIdPhysicalUnitsType = objItemFldValue['unitstype'];

			var stUnitName = objItemFldTxtValue['purchaseunit'];
			var flConversionRate = NSUtil.forceFloat(getUOMConversionRate(stUnitName, stIdPhysicalUnitsType));

			var flAvgWeight = NSUtil.forceFloat(flWeight * flConversionRate);
			var flPriceUM = NSUtil.forceFloat(getVendorPurchasePrice(stItemId));
			var flQty = NSUtil.forceFloat(recPO.getLineItemValue('item', 'quantity', intCtr))
			var flAmount = NSUtil.forceFloat(flPriceUM * flAvgWeight * flQty);

			nlapiLogExecution('DEBUG', stLoggerTitle, 'Setting values at the line. | ' + 'flAvgWeight : ' + flAvgWeight + ' | ' + 'flPriceUM : ' + flPriceUM + ' | ' + 'flAmount : ' + flAmount);

			recPO.setLineItemValue('item', COL_AVG_WGHT, intCtr, flAvgWeight);
			recPO.setLineItemValue('item', COL_PRICE_UM, intCtr, flPriceUM);
			recPO.setLineItemValue('item', 'amount', intCtr, flAmount);
		}

		stRecordId = nlapiSubmitRecord(recPO, false, true);
		nlapiLogExecution('AUDIT', stLoggerTitle, 'Record has been updated. | ' + 'stRecordType : ' + stRecordType + ' | stRecordId : ' + stRecordId);

		nlapiLogExecution('DEBUG', stLoggerTitle, '**** END: Script entry point function.****');
	}
	catch (error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
}

//Library//

var NSUtil =
	{
	    /**
	     * Evaluate if the given string or object value is empty, null or undefined.
	     * @param {String} stValue - string or object to evaluate
	     * @returns {Boolean} - true if empty/null/undefined, false if not
	     * @author mmeremilla
	     */
	    isEmpty : function(stValue)
	    {
		    if ((stValue === '') //Strict checking for this part to properly evaluate integer value.
		            || (stValue == null) || (stValue == undefined))
		    {
			    return true;
		    }
		    else
		    {
			    if (stValue.constructor === Array)//Strict checking for this part to properly evaluate constructor type.
			    {
				    if (stValue.length == 0)
				    {
					    return true;
				    }
			    }
			    else if (stValue.constructor === Object)//Strict checking for this part to properly evaluate constructor type.
			    {
				    for ( var stKey in stValue)
				    {
					    return false;
				    }
				    return true;
			    }

			    return false;
		    }
	    },
	    /**
	     * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
	     * @param {String} stValue - any string
	     * @returns {Number} - a floating point number
	     * @author jsalcedo
	     */
	    forceFloat : function(stValue)
	    {
		    var flValue = parseFloat(stValue);

		    if (isNaN(flValue) || (stValue == Infinity))
		    {
			    return 0.00;
		    }

		    return flValue;
	    }
	};