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
 * 1.00       23 Jul 2015     jerfernandez			Demo version
 * 1.10       08 Jun 2016     memeremilla			Initial version (working copy)
 *
 */

//'use strict';

//-- Import cw_util.js
var CONTEXT = nlapiGetContext();
var BTN_CALC = 'custpage_button_calc_catch_weight';

/**
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @return {void}
 */
function btnCalculateBeforeLoad(type, form, request)
{
	try
	{
		var stLoggerTitle = 'btnCalculateBeforeLoad'
		nlapiLogExecution('DEBUG', stLoggerTitle, '**** START: Script entry point function.****' + ' | Operation Type: ' + type);

		if (!(type == 'edit' || type == 'create'))
		{
			nlapiLogExecution('DEBUG', stLoggerTitle, 'Unsupported operation type. | **** END: Script entry point function.****');
			return;
		}

		//No need to be populated
		var stCatchWeightScriptId = CONTEXT.getSetting('SCRIPT', 'custscript_catchweight_scriptid');
		nlapiLogExecution('DEBUG', stLoggerTitle, ' stCatchWeightScriptId  = ' + stCatchWeightScriptId);

		if (!NSUtil.isEmpty(stCatchWeightScriptId))
		{
			var stScript = 'calculateCatchWeights()';
			form.setScript(stCatchWeightScriptId);
			form.addButton(BTN_CALC, 'Calculate Catch Weight', stScript);
		}

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
		}
	};