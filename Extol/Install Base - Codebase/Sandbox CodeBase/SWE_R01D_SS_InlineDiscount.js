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
var MSG_TITLE = 'Calculate Inline Discounts';
var logger = new Logger(false);
logger.enableDebug(); // comment this line to turn debugging off.    

/**
 * This computes for the discount rates
 *
 * @author Robbi Palacios
 * @version 1.0
 */
function afterSubmit_CalculateDiscounts(stType)
{
    logger.debug(MSG_TITLE,'======Start afterSubmit_CalculateDiscounts======');

    var stExecutionMode = nlapiGetContext().getExecutionContext();
    logger.debug(MSG_TITLE, 'stExecutionMode: ' + stExecutionMode);

    if (stExecutionMode != 'webservices' && stExecutionMode != 'csvimport' && stType != 'xedit') 
    {
        logger.debug(MSG_TITLE, 'Script Exit. Execution mode is not webservices or csvimport.');
        return true;
    }
    
    var ALLOW_DISCOUNT = nlapiGetContext().getSetting('SCRIPT', 'custscript_r01d_allow_inline_discounting')== YES;
    if(!ALLOW_DISCOUNT)
    {
        logger.debug('Exit Log', 'Type of Operation Unsupported.  ======Exit afterSubmit_CalculateDiscounts======');
        return true;
    }
	try
    {
        var recType    = nlapiGetRecordType();
        var stRecordId = nlapiGetRecordId();   
        var recSO      =  nlapiLoadRecord(recType, stRecordId);
		if(recType == 'salesorder') 
		{	
			var intItemLineCount = recSO.getLineItemCount('item');		
    		for (var i = 1; i <= intItemLineCount; i++) 
			{
                var bResetLine      =  (recSO.getLineItemValue('item','custcol_reset_renewal_data',i) =='T'); 
                if (bResetLine) 
                {
                    return true;
                } 
                /* Get the discount rate */    
                var flDiscountRate     = recSO.getLineItemValue('item','custcol_inline_discount',i);
                logger.debug('Discount Rate', flDiscountRate);
                
                if(flDiscountRate != null && flDiscountRate != '' && flDiscountRate != undefined)
                {
                	flDiscountRate = flDiscountRate.replace('%','');
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
                    var flExtendedRate = recSO.getLineItemValue('item','rate', i);
                    if(flExtendedRate != 0 && flExtendedRate != null && flExtendedRate != '' && flExtendedRate != undefined)
                    {
                        flExtendedRate = parseFloat(flExtendedRate);
                        var flNewRate = Math.round(flExtendedRate * (1 - flDiscountRate) * 10000) / 10000;
                        recSO.setLineItemValue('item','rate',i,flNewRate);    
                    }
                }      
			}
		}
        // Since i updted the rate i must enable doSourcing so this script will recompute 
        // the amount, subtotal, and other fields.
        nlapiSubmitRecord(recSO,true);
	}	 
	catch (error)
    {
        if (error.getDetails != undefined) 
        {
            nlapiLogExecution('ERROR','Process Error',  error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else 
        {
            nlapiLogExecution('ERROR','Unexpected Error', error.toString()); 
            throw nlapiCreateError('99999', error.toString());
        }
    }   
    logger.debug(MSG_TITLE,'======End afterSubmit_CalculateDiscounts======');
}


