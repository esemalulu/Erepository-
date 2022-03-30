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
 * Module Description
 *
 */

/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/record', './NSUtil', 'N/error', 'N/runtime'],
/**
 * @param {Record} record
 * @param {Object} NSUtil
 * @param {Error} error 
 */
function(record, NSUtil, error, runtime)
{
	
	var EndPoint = {};
	
    /**
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
	EndPoint.saveRecord = function (scriptContext)
	{
		var logTitle = 'saveRecord';
		var currentScript = runtime.getCurrentScript();
		
		var eventType = 'create';
		var recordCurrent = scriptContext.currentRecord;
		if (recordCurrent.id)
		{
			eventType = 'edit';
		}
		
		log.debug(logTitle, '** START ** ' + JSON.stringify(eventType) );
		
		try 
		{
			var errmsg = [];
			
			if (! validatePaymentMethod(scriptContext,eventType))
			{
				errmsg.push(currentScript.getParameter({name: 'custscript_errormsg_invalidpmtmethod'}) || 'Invalid Payment Method');
			}
			
			if (! validateBigItemShipping(scriptContext,eventType))
			{
				errmsg.push(currentScript.getParameter({name: 'custscript_errormsg_noshipping'}) || 'Missing booked shipping details.');
			}
			
			if (errmsg.length)
			{
				alert('Unable to continue: \n\n' + errmsg.join('\n'));
				return false;
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
	};
	
	function validatePaymentMethod (scriptContext)
	{
		var logTitle = 'saveRecord:validatePaymentMethod';
		var returnValue = true;
		
		var currentScript = runtime.getCurrentScript();
		
		var recordCurrent = scriptContext.currentRecord;
		var strAllowedPmethods = currentScript.getParameter({name: 'custscript_sears_sovalid_pmtmethod'});
		var arrAllowedPmethods = [];
		
		if (!NSUtil.isEmpty(strAllowedPmethods)) 
		{
			arrAllowedPmethods = strAllowedPmethods.replace(/\s+?/g, '').split(/,/g);
			var orderData = {};
			orderData['paymentmethod'] = recordCurrent.getValue({fieldId:'paymentmethod'});
			
			if (! NSUtil.inArray(orderData.paymentmethod, arrAllowedPmethods))
			{
				returnValue = false;
			}
		}
	
		
		log.debug(logTitle, '** returnValue : '  +JSON.stringify([returnValue, [strAllowedPmethods, arrAllowedPmethods]]) );
		return returnValue;
	}
	
	
	function validateBigItemShipping(scriptContext)
	{
		// check first if there are bigItems value
		var logTitle = 'saveRecord:validateBigItemShipping';
		var returnValue = true;
		
		var recordCurrent = scriptContext.currentRecord;
		
		var lineCount = recordCurrent.getLineCount({sublistId : 'item'});
		
		var hasBigTicket = false;
		for (var line = 0; line < lineCount; line++) {
			var isBigTicket = recordCurrent.getSublistValue({
				sublistId : 'item',
				fieldId : 'custcol_bigticket',
				line : line
			});
			if (isBigTicket) {
				hasBigTicket = true;
				break;
			}
		}
		var hasBookingInfo = recordCurrent.getValue({fieldId:'custbody_sears_booking_info'});
		
		if (hasBigTicket)
		{
			returnValue = !! hasBookingInfo;
		}
		
		log.debug(logTitle, '** returnValue: ' + JSON.stringify([returnValue, [hasBigTicket, hasBookingInfo]]) );
		return returnValue;
	}
	

	return EndPoint;
});
