/**
 * Copyright (c) 2015 Trajectory Inc.
 * 2 Berkeley Street, Unit 205, Toronto, ON, Canada, M5A 4J5
 * www.trajectoryinc.com
 * All Rights Reserved.
 */

/**
 * @System: Achievers
 * @Company: Trajectory Inc. / Kuspide Canada Inc.
 * @CreationDate: 20150223
 * @DocumentationUrl: https://docs.google.com/a/trajectoryinc.com/document/d/1uUu0QjdPy9rlDXaQuI-6SK45uPZ7f_B2aJOQXTIUPVY/edit?usp=sharing
 * @FileName: TJINC_ACHNIC_SalesOrder.js
 * @NamingStandard: TJINC_NSJ-1-3-3
 */

/* exported TJINC_ACHNIC_BeforeSubmit_SalesOrder */

//https://docs.google.com/document/d/1uUu0QjdPy9rlDXaQuI-6SK45uPZ7f_B2aJOQXTIUPVY/edit#heading=h.8zxcx6l5nyby
function TJINC_ACHNIC_BeforeSubmit_SalesOrder(s_type) {

    var i = 0,
        s_representsSubsidiary = '',
        s_createdPo = '';

      nlapiLogExecution('DEBUG', 'TJINC_ACHNIC_BeforeSubmit_SalesOrder IN', 'Type: ' + s_type+' -- InterCo = '+nlapiGetFieldValue('custbodyinterco_transaction'));


    if (s_type.toString() === 'create') {
        //DO NOT RUN THIS FOR THE INTERCOMPANY SALES ORDER (contains a customer with a represents sub (customfield)
        if (nlapiGetFieldValue('custbodyinterco_transaction') === 'T') 
        {

            s_representsSubsidiary = nlapiLookupField('customer', nlapiGetFieldValue('entity'), 'custentity_tjinc_represents_subsidiary');

            nlapiLogExecution('DEBUG', 'TJINC_ACHNIC_BeforeSubmit_SalesOrder', 's_representsSubsidiary: ' + s_representsSubsidiary);
          
            if (s_representsSubsidiary === null || s_representsSubsidiary === '') {
                i = parseInt(nlapiGetLineItemCount('item'), 10);
                while (i > 0) {
                    //Check to see if the 'Create PO' Option on the line is set to Drop Shipment
                    s_createdPo = nlapiGetLineItemValue('item', 'createpo', i);
                    nlapiLogExecution('DEBUG', 'TJINC_ACHNIC_BeforeSubmit_SalesOrder', 's_createdPo: ' + s_createdPo);
                    if (s_createdPo === null || s_createdPo === '') {
                        nlapiSetLineItemValue('item', 'createpo', i, 'DropShip');
                    }
                    nlapiSetLineItemValue('item', 'custcol_tjinc_achnic_itemlineid', i, 'lineid' + i);
                    nlapiLogExecution('DEBUG', 'TJINC_ACHNIC_BeforeSubmit_SalesOrder', 'Setting line id: ' + i);
                    i = i - 1;
                }
            }
        }
    }

    nlapiLogExecution('DEBUG', 'TJINC_ACHNIC_BeforeSubmit_SalesOrder OUT');
}
