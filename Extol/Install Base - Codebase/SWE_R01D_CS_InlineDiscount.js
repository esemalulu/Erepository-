/**
 * Copyright (c) 1998-2008 NetSuite, Inc.
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
 * GLOBAL VARIABLES
 */


/**
 * This computes for the discount rates
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function validateLine_CalculateDiscounts(stListName)
{
    var ALLOW_DISCOUNT = nlapiGetContext().getSetting('SCRIPT', 'custscript_r01d_allow_inline_discounting')== YES;
    
    if(stListName != 'item')
    {
        return true;
    }
    
    if(!ALLOW_DISCOUNT)
    {
        return true;
    }

    var bResetLine = (nlapiGetCurrentLineItemValue('item','custcol_reset_renewal_data')=='T');
    if (bResetLine) 
    {
        return true;
    }

    /* Get the discount rate */    
    var flDiscountRate = nlapiGetCurrentLineItemValue('item','custcol_inline_discount');
    flDiscountRate = flDiscountRate.replace('%','');
    if(flDiscountRate != null && flDiscountRate != '' && flDiscountRate != undefined)
    {
        flDiscountRate = parseFloat(flDiscountRate);
        flDiscountRate = flDiscountRate / 100;
    }
    else
    {
        flDiscountRate = 0;
    }
   
    if(flDiscountRate != 0)
    {
        /* Apply the discount rate to the extended rate */
        var flExtendedRate = nlapiGetCurrentLineItemValue('item','rate');
        if(flExtendedRate != 0 && flExtendedRate != null && flExtendedRate != '' && flExtendedRate != undefined)
        {
            flExtendedRate = parseFloat(flExtendedRate);
            var flNewRate = Math.round(flExtendedRate * (1 - flDiscountRate) * 10000) / 10000;
            nlapiSetCurrentLineItemValue('item','rate',flNewRate,false,true);
        }
    }
    
    return true;
}


/**
 * Enables/Disables Inline Discount field as needed
 * 
 */
function pageInit_enableDiscountField()
{
    var ALLOW_DISCOUNT = nlapiGetContext().getSetting('SCRIPT', 'custscript_r01d_allow_inline_discounting')== YES;
    
    nlapiDisableLineItemField('item', 'custcol_inline_discount', !ALLOW_DISCOUNT);
    
}
