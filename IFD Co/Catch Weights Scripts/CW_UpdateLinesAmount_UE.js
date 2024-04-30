nlapiLogExecution("audit","FLOStart",new Date().getTime());
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
 *
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       27 Aug 2015     jerfernandez     Demo version
 * 2.00  	  6 Jun 2016	  cmartinez		   Applied code review points for optimization.
 * 3.00       20 Jul 2018     pries            Changed Catch Weights indicator from 'custcol1' to 'custcol_cw_indicator'
 * 4.00       1 Aug 2018      mgotsch		   Updating amount unfulfilled/fulfilled in beforeSubmit
 * 5.00		  16 Oct 2018     mgotsch		   Updating vendor returns process
 * 5.01		  25 Oct 2018      dweinstein	      Updating for Vendor Returns Process Amount calculation
 * 5.02		  7 Nov 2018	  mgotsch		   Updating the script to fix the amounts
 * 5.03		  5 Dec 2018	  mgotsch		   Commenting out unused fields
 * 5.04		  19 Mar 2019	  dweinstein	   Fixing Rounding issue where fractions of cents add up to a different total
 */

//--import cw_util.js

/**
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @return {void}
 */
function updateLinesAmountBeforeSubmit(type)
{
	try	{
		var stLoggerTitle = 'updateLinesAmountBeforeSubmit';
		nlapiLogExecution('debug', stLoggerTitle, '============================= Script Entry =============================');
      	
      	//5.02 - logging for execution context
      	var executionContext = nlapiGetContext().getExecutionContext();
      	nlapiLogExecution('DEBUG', stLoggerTitle+' executionContext', executionContext);

		//Script only executes on create and edit events
	    if (type != 'create' && type != 'edit' && type != 'xedit')
	    {
	    	return;
	    }

	    var stRecType = nlapiGetRecordType();
        var intLines = nlapiGetLineItemCount('item');
        nlapiLogExecution('debug', stLoggerTitle, 'Record Type = ' + stRecType);

        //Loop through line items to set catch weight amount as line amount
        for (var i = 1; i <= intLines; i++)
        {
            var stIdItem = nlapiGetLineItemValue('item', 'item', i);
            if(!Eval.isEmpty(stIdItem))
            {
	            var stBCatchWeightItem = nlapiGetLineItemValue('item', 'custcol_cw_indicator', i);  // v3.0 - updated

	            if(stBCatchWeightItem == 'T')
	            {
								//v5.01 - Updating scope of variables to work across all record types
								var flRate = Parse.forceFloat(nlapiGetLineItemValue('item', 'rate', i));
								var flQuantity = Parse.forceFloat(nlapiGetLineItemValue('item', 'quantity', i));
								var flAvgWeight = Parse.forceFloat(nlapiGetLineItemValue('item', 'custcol_jf_cw_avg_wght', i));
								var flActualWeight = Parse.forceFloat(nlapiGetLineItemValue('item', 'custcol_jf_cw_act_wght', i));

	            	if(stRecType == 'salesorder' )
	            	{
		            	var flAmountFulfilled = flRate*flQuantity*flAvgWeight;	//v5.02
                      	//var flAmountFulfilled = Parse.forceFloat(nlapiGetLineItemValue('item', 'custcol_ifd_cw_fulfilled_amount', i)); v5.02
		            	//var flAmountUnfulfilled = Parse.forceFloat(nlapiGetLineItemValue('item', 'custcol_ifd_cw_pendfulfillamt', i)); //v5.03

                      	//v4.00 START mgotsch 8/1/2018 - updating amount unfufillled/fulfilled
			            var flQuantityFulfilled = Parse.forceFloat(nlapiGetLineItemValue('item', 'quantityfulfilled', i));
			            nlapiLogExecution('debug', stLoggerTitle, 'flQuantity: '+flQuantity+' flAvgWeight: '+flAvgWeight+' flActualWeight: '+ flActualWeight+' flQuantityFulfilled: '+ flQuantityFulfilled + ' flRate: '+ flRate);

			            if(!Eval.isEmpty(flActualWeight) && flActualWeight != 0 && flQuantityFulfilled > 0){
			            	nlapiLogExecution('debug', stLoggerTitle, 'flActualWeight != 0 & flQuantityFulfilled > 0: setting fulfilled amount');
			            	var flAmountFulfilled = (flActualWeight/flQuantityFulfilled)*flQuantityFulfilled*flRate;
			            	//nlapiSetLineItemValue('item', 'custcol_ifd_cw_fulfilled_amount', i, flAmountFulfilled); //v5.03
			            } else {
			            	nlapiLogExecution('debug', stLoggerTitle, 'setting fulfilled amount = 0');
			            	nlapiSetLineItemValue('item', 'custcol_ifd_cw_fulfilled_amount', i, 0);
			            }

			            if(!Eval.isEmpty(flAvgWeight) && flAvgWeight != 0){
			            	nlapiLogExecution('debug', stLoggerTitle, 'flActualWeight != 0: setting unfulfilled amount');
			            	// var flAmountUnfulfilled = flAvgWeight*flRate*(flQuantity-flQuantityFulfilled); //v5.03
			             	//nlapiSetLineItemValue('item', 'custcol_ifd_cw_pendfulfillamt', i, flAmountUnfulfilled); //v5.03
			            } else {
			            	nlapiLogExecution('debug', stLoggerTitle, 'setting unfulfilled amount = 0');
			             	//nlapiSetLineItemValue('item', 'custcol_ifd_cw_pendfulfillamt', i, 0); //v5.03
			            }
			            //v4.00 mgotsch END

                        //cmartinez 2/8/2017 - set price UM as rate
                      	nlapiSetLineItemValue('item', 'custcol_jf_cw_price_um', i, flRate);
		            	nlapiSetLineItemValue('item', 'amount', i, nlapiFormatCurrency(flAmountFulfilled)); //v5.02 changing from (flAmountFulfilled + flAmountUnfulfilled) to flAmountFulfilled //5.04b using nlapiFormatCurrency


			            nlapiLogExecution('debug', stLoggerTitle, 'Line amount updated! Fulfilled Amount = ' + flAmountFulfilled); //v5.03 removed unused flAmountUnfulfilled from 
	            	}

	            	if(stRecType == 'purchaseorder' || stRecType == 'returnauthorization' || stRecType == 'vendorreturnauthorization') //updated to include VRMA
	            	{
		            	// var flAmountReceived = Parse.forceFloat(nlapiGetLineItemValue('item', 'custcol_ifd_cw_received_amount', i)); //v5.03
		            	// var flAmountUnReceived = Parse.forceFloat(nlapiGetLineItemValue('item', 'custcol_ifd_cw_pendreceiptamt', i)); //v5.03

			            //v5.00 START Updating the way RMAs and VRMAs set the amount field
			            if(stRecType == 'returnauthorization' || stRecType == 'vendorreturnauthorization') {
				            if(Eval.isEmpty(flActualWeight)) { // DLapp: 22 Oct 18: Changed from NSUtil to Eval
										//v5.01 removing duplicate variable creation for flActualWeight, flQuantity, flAvgWeight
		    	    			var flTotalAmount = (flRate*flAvgWeight*flQuantity);
		    	    		} else {
		    	    			var flTotalAmount = (flRate*flActualWeight);
		    	    			nlapiSetLineItemValue('item', 'custcol_jf_cw_price_um', i, flRate);

		    	    		}
							nlapiSetLineItemValue('item', 'amount', i, nlapiFormatCurrency(flTotalAmount));
							nlapiLogExecution('debug', stLoggerTitle, 'Line amount updated: ' +flTotalAmount); //5.03
			            }
			            //v5.00 END

						if(stRecType == 'purchaseorder') { //v5.00 filtered to just purchase orders so that the RMA and VRMA can update seperately
							var amount;
							if(!Eval.isEmpty(flActualWeight)) { //v5.03 changing from amountRecieved/amountUnrecieved to actual weight
								amount = Parse.forceFloat(flActualWeight*flRate); //v5.03
								nlapiSetLineItemValue('item', 'amount', i, nlapiFormatCurrency(amount)); //v5.03	//v5.04b adding nlapiFormatCurrency
								nlapiSetLineItemValue('item', 'custcol_jf_cw_price_um', i, flRate); //v5.03
							} else {
								var flRate = Parse.forceFloat(nlapiGetLineItemValue('item', 'rate', i));
								var flAvgWeight = nlapiGetLineItemValue('item', COL_AVG_WGHT, i);
								var qty = nlapiGetLineItemValue('item', 'quantity', i)
								nlapiSetLineItemValue('item', 'custcol_jf_cw_price_um', i, flRate);
								amount = Parse.forceFloat(flRate * flAvgWeight * qty);
								//amount = Math.round(amount*100)/100;	//5.04 Added Math.round(...,2)
								nlapiSetLineItemValue('item', 'amount', i, nlapiFormatCurrency(amount));	//5.04b Using nlapiFormatCurrency
							}
							nlapiLogExecution('debug', stLoggerTitle, 'Line amount updated: ' +amount);
			            }
	            	}
	            }
            }
        }


	    nlapiLogExecution('debug', stLoggerTitle, '============================= Script Exit ==============================');
	} catch(error) {
		handleError(error);
	}
}

/**
 * Log and throw error
 *
 * @param error
 */
function handleError(error)
{
	if (error.getDetails != undefined)
    {
      	nlapiLogExecution('ERROR','Process Error', 'process() ' + error.getCode() + ': ' + error.getDetails());
      	throw error;
    }
    else
    {
   	 	nlapiLogExecution('ERROR','Unexpected Error', 'process() ' + error.toString());
   	 	throw nlapiCreateError('99999', error.toString());
    }
}

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
 *
 * Compilation of common utility functions used for:
 * - Evaluating objects
 * - Parsing objects
 * - Date helper
 */
var Parse =
{
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

var Eval =
{
	/**
	 * Evaluate if the given string or object value is empty, null or undefined.
	 * @param {String} stValue - string or object to evaluate
	 * @returns {Boolean} - true if empty/null/undefined, false if not
	 * @author mmeremilla
	 */
	isEmpty : function(stValue)
	{
		if ((stValue == '') || (stValue == null) || (stValue == undefined))
		{
			return true;
		}
		else
		{
			if (typeof stValue == 'string')
			{
				if ((stValue == ''))
				{
					return true;
				}
			}
			else if (typeof stValue == 'object')
			{
				if (stValue.length == 0 || stValue.length == 'undefined')
				{
					return true;
				}
			}

			return false;
		}
	}
};
