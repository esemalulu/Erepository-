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
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       14 Apr 2016     lochengco
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.  
 * @appliedtorecord recordType
 *   
 * @param {String} stType Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} objForm Current form
 * @param {nlobjRequest} objRequest Request object
 * @returns {Void}
 */
function beforeLoad_showOrderGuideButton(stType, objForm, objRequest)
{
    try
    {
        var stLoggerTitle = 'beforeLoad_showOrderGuideButton';
        
        nlapiLogExecution('DEBUG', stLoggerTitle, '>>Entry<<');
        
        if (stType != 'create' && stType != 'edit' && stType != 'copy')
        {
            nlapiLogExecution('DEBUG', stLoggerTitle, 'This event is not supported by the script. Event type = ' + stType);
            return true;
        }
        
        // Set Client Script
        objForm.setScript('customscript_cs_order_guide');
        
        objForm.addButton('custpage_invokerOrderGuide', 'Order Guide', 'invokeOrderGuideWindow()');
        
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Order Guide button has been loaded.');

        nlapiLogExecution('DEBUG', stLoggerTitle, '>>Exit<<');
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