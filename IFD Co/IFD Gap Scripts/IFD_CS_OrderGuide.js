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
 * This funciton opens the window for Order Guide 
 * 
 * @returns {Void}
 */
function invokeOrderGuideWindow()
{
    try
    {
        var stCustomer = nlapiGetFieldValue('entity');
        var stLocation = nlapiGetFieldValue('location');
        
        if (OG.Eval.isEmpty(stCustomer))
        {
            alert(MESSAGES['empty_customer_field']);
            return;
        }
        
        if (OG.Eval.isEmpty(stLocation))
        {
            alert(MESSAGES['empty_location_field']);
            return;
        }
        
        var stUrl = nlapiResolveURL("SUITELET", "customscript_sl_order_guide", "customdeploy_sl_order_guide");
            stUrl += '&custpage_customer_id=' + stCustomer + '&custpage_location_id=' + stLocation;
    
        // Open new window
        window.open(stUrl, "_blank", "height= 800, width=900");
    }
    catch(error)
    {
         if (error.getDetails != undefined)
         {
             nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': '+ error.getDetails());
             throw error;
         }
         else
         {
             nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
             throw nlapiCreateError('99999', error.toString());
         }
    }
}

var OG = {};
OG.Eval =
{
    /**
     * Evaluate if the given string or object value is empty, null or undefined.
     * @param {String} stValue - string or object to evaluate
     * @returns {Boolean} - true if empty/null/undefined, false if not
     * @author bfelciano, mmeremilla
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
