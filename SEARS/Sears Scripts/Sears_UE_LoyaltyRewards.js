/**
 * Copyright (c) 1998-2014 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 */

/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00	  	  July 1, 2016	  mjpascual			   
 */

//Add custom button to the form
function beforeLoad_addRewardsBalance(stType, form)
{
	try
	{
		var stLoggerTitle = 'beforeLoad_addRewardsBalance';

		nlapiLogExecution('DEBUG', stLoggerTitle, '>> Entry Log <<');
		
		nlapiLogExecution('DEBUG', stLoggerTitle, 'stType ='+stType);
		
		if(stType != 'edit' && stType != 'create' && stType != 'copy' )
		{
			return;
		}
		
		var stURL = nlapiResolveURL('SUITELET', 'customscript_sl_loyalty_rewards', 'customdeploy_sl_loyalty_rewards');

		nlapiLogExecution('DEBUG', stLoggerTitle, 'stURL = '+stURL);
		
		form.setScript(nlapiGetContext().getScriptId());
		form.addButton('custpage_btnprint', 'Retrieve Rewards Balance', 'addBtn(\'' + stURL + '\')');
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

function addBtn(stURL)
{

	var stCustomer =  nlapiGetFieldValue('entity');
	var stCCV = nlapiGetFieldValue('custbody_cvv');
	var stLoyalty =  nlapiGetFieldValue('custbody_loyalty_number');

	if(isEmpty(stCustomer) || isEmpty(stCCV) || isEmpty(stLoyalty))
	{
		alert('Retrieve Rewards Balance cannot be done. Customer, Loyalty Number and CVV are required fields.');
	} 
	else 
	{
		stURL += '&custpage_action=action';
		stURL += '&custpage_loyalty='+stLoyalty;
		stURL += '&custpage_cvv='+stCCV;
		window.open(stURL,'PopUp','resizable=1,width=300,height=300,scrollbars=no');
	}
}

/**
* Check if a string is empty
* @param stValue (string) value to check
* @returns {Boolean}
*/
function isEmpty (stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
         return true;
    }

    return false;
}
