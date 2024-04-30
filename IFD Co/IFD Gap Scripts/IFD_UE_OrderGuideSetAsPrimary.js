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
 * 1.00       15 Apr 2016     lochengco
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} stType Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function afterSubmit_unsetPrimaryOrderGuide(stType)
{
    try
    {
        var stLoggerTitle = 'afterSubmit_unsetPrimaryOrderGuide';
        
        nlapiLogExecution('DEBUG', stLoggerTitle, '>>Entry<<');
        
        // Allow execution only on create
        if (stType != 'create' && stType != 'edit')
        {
            nlapiLogExecution('DEBUG', stLoggerTitle, 'This event is not supported by the script. Event type = ' + stType);
            return;
        }
        
        var stRecordID = nlapiGetRecordId();
        
        var objOrderGuideFields = nlapiLookupField('customrecord_ifd_orderguide_header', stRecordID, ['custrecord_ifd_orderguide_customer', 'custrecord_ifd_orderguide_header_primary']);
        
        var stCustomerID = objOrderGuideFields.custrecord_ifd_orderguide_customer;
        var stIsPrimary = objOrderGuideFields.custrecord_ifd_orderguide_header_primary;
        
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Order Guide ID = ' + stRecordID
                + ' | Customer ID = ' + stCustomerID
                + ' | Is Primary = ' + stIsPrimary
                );
        
        if (stIsPrimary == 'F')
        {
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Record is not set as a primary Order Guide. >>Exit<<');
            return;
        }
        
        // Search for order guide by customer
        var arrCustomerOrderGuide = getOtherPrimaryOrderGuideByCustomerId(stCustomerID, stRecordID);
        
        // If any results found
        if (!Eval.isEmpty(arrCustomerOrderGuide))
        {
            // Update the "primary" field and set it to 'F'
            for (var intCustOrdGuideCount = 0; intCustOrdGuideCount < arrCustomerOrderGuide.length; intCustOrdGuideCount++)
            {
                var stOrderGuideID = arrCustomerOrderGuide[intCustOrdGuideCount].getId();
                
                nlapiLogExecution('DEBUG', stLoggerTitle, 'Order Guide ID = ' + stOrderGuideID);
                
                if (stRecordID == stOrderGuideID)
                {
                    // Skip newly created record
                    continue;
                }
                
                nlapiSubmitField('customrecord_ifd_orderguide_header', stOrderGuideID, 'custrecord_ifd_orderguide_header_primary', 'F');
                
                nlapiLogExecution('AUDIT', stLoggerTitle, 'Primary Order Guide is now set to false. Order Guide ID = ' + stOrderGuideID);
            }
        }
        
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

function getOtherPrimaryOrderGuideByCustomerId(stCustomerID, stRecordID)
{
    var arrResult = [];
    
    var arrSearchFilters = [new nlobjSearchFilter('custrecord_ifd_orderguide_customer', null, 'anyof', stCustomerID),
                            new nlobjSearchFilter('custrecord_ifd_orderguide_header_primary', null, 'is', 'T'),
                            new nlobjSearchFilter('internalid', null, 'noneof', stRecordID)];
    var arrSearchColumns = [new nlobjSearchColumn('custrecord_ifd_orderguide_customer'),
                            new nlobjSearchColumn('custrecord_ifd_orderguide_header_primary')];
    
    arrResult = nlapiSearchRecord('customrecord_ifd_orderguide_header', null, arrSearchFilters, arrSearchColumns);
    
    return arrResult;
}


