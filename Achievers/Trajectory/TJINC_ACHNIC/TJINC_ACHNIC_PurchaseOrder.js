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
 * @DocumentationUrl: https://docs.google.com/a/trajectoryinc.com/document/d/1HM4h-JzTynEKS_9VTjXRybntXX-CL-wgLdMV-JVKwdo/edit?usp=sharing
 * @FileName: TJINC_ACHNIC_PurchaseOrder.js
 * @NamingStandard: TJINC_NSJ-1-3-3
 */

/*global TJINC, Ext, isNotBlank, isBlank, isNumber, jSuite, nlobjError */
/*exported TJINC_ACHNIC_ReRun_Transaction, TJINC_ACHNIC_BeforeLoad_PurchaseOrder, TJINC_ACHNIC_AfterSubmit_PurchaseOrder,
 TJINC_ACHNIC_RerunTransaction_MassUpdate */


//https://docs.google.com/document/d/1HM4h-JzTynEKS_9VTjXRybntXX-CL-wgLdMV-JVKwdo/edit#heading=h.7qvtrbyndycp
var INTERCO_ERRORS = {
    'No_Customer_Found': 1,
    'More_Than_1_Customer_Found': 2,
    'Vendor_Missing_Data': 3,
    'Error_Creating_SO': 4
};
var s__ACHNIC_InterCompanySOForm = '127'; //ACH-42

//https://docs.google.com/document/d/1HM4h-JzTynEKS_9VTjXRybntXX-CL-wgLdMV-JVKwdo/edit#heading=h.qmvr2qf1j6tb
function TJINC_ACHNIC_ReRun_Transaction() {
    Ext.MessageBox.confirm('Rerun Transaction', 'This will rerun the Intercompany Transaction automation.<br/><br/>Do you wish to continue?', function (btn) {
        if (btn.toString() === 'yes') {
            window.location.href = nlapiResolveURL('SUITELET', 'customscript_tjinc_achnic_rerun_trans_ss', 'customdeploy_tjinc_achnic_rerun_trans') + '&recordType='+nlapiGetRecordType()+'&recordId='+nlapiGetRecordId();
        }
    });
}

//https://docs.google.com/document/d/1HM4h-JzTynEKS_9VTjXRybntXX-CL-wgLdMV-JVKwdo/edit#heading=h.5r78w7p4mkzo
function TJINC_ACHNIC_BeforeLoad_PurchaseOrder(s_type, o_form) { // jshint ignore:line
    'use strict';

    var b_hasErrors = isNotBlank(nlapiGetFieldValue('custbody_tjinc_achnic_po_errors'));

    if (b_hasErrors) {
        o_form.addButton('custpage_rerunbtn', 'Rerun To Create Intercompany SO ', 'TJINC_ACHNIC_ReRun_Transaction()');
        o_form.setScript('customscript_tjinc_achnic_rerun_trans_cs');
    }
}

//https://docs.google.com/document/d/1HM4h-JzTynEKS_9VTjXRybntXX-CL-wgLdMV-JVKwdo/edit#heading=h.ryfuqxwh1ut2
function TJINC_ACHNIC_AfterSubmit_PurchaseOrder(s_type) {
    'use strict';
    var o_salesOrderValue, o_transactionInfo = {Items: []}, isReRun;
    TJINC.Log.Debug({'Title': 'TJINC_ACHNIC_AfterSubmit_PurchaseOrder Start', 'Details': 'Type: ' + s_type});

    isReRun = isNotBlank(nlapiGetFieldValue('custbody_tjinc_achnic_rerun_trans')) && nlapiGetFieldValue('custbody_tjinc_achnic_rerun_trans').toString() === 'T';

    if (s_type.toString() === 'dropship' || (s_type.toString() === 'edit' && isReRun)) 
    {
        if (nlapiGetFieldValue('custbodyinterco_transaction') === 'T') 
        {
            if (isReRun) {
                nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), ['custbody_tjinc_achnic_rerun_trans', 'custbody_tjinc_achnic_po_errors', 'custbody_tjinc_achnic_po_err_desc'], ['F', '', '']);
            }

            o_salesOrderValue = nlapiLookupField('salesorder', parseInt(nlapiGetFieldValue('createdfrom'), 10), ['custbody_tjinc_achnic_intercompany']);

            if (isBlank(o_salesOrderValue.custbody_tjinc_achnic_intercompany)) 
            {
                o_transactionInfo.purchaseOrderID = nlapiGetRecordId();
                o_transactionInfo.customerID = getIntercompanyCustomerId();
                o_transactionInfo.poCurrencyId = nlapiGetFieldValue('currency');

                if (o_transactionInfo.customerID !== -1)
                {
                    TJINC.Log.Debug({
                        'Title': 'TJINC_ACHNIC_AfterSubmit_PurchaseOrder',
                        'Details': 'Processing PO id: ' + o_transactionInfo.purchaseOrderID
                    });

                    for (var i = 1, i_itemCount = parseInt(nlapiGetLineItemCount('item'), 10); i <= i_itemCount; i = i + 1) 
                    {
                        o_transactionInfo.Items.push({
                            item: nlapiGetLineItemValue('item', 'item', i),
                            quantity: nlapiGetLineItemValue('item', 'quantity', i),
                            amount: nlapiGetLineItemValue('item', 'amount', i),
                            rate: nlapiGetLineItemValue('item', 'rate', i),
                            lineitemid: nlapiGetLineItemValue('item', 'custcol_tjinc_achnic_itemlineid', i),
                            intercoshipper: nlapiGetLineItemValue('item', 'custcol_tjinc_ach_intercoshipper', i),
                          	vendoruniqueid: nlapiGetLineItemValue('item', 'custcolcreated_po_for_vendor_internal', i),
							coreorderdate: nlapiGetLineItemValue('item', 'custcolcustbodycore_order_date', i)

                        });
                    }






//-----------------------------------------------ELIJAH TESTING-----------------------------------------------------------
/*
                  var soCurrency = nlapiLookupField('salesorder', parseInt(nlapiGetFieldValue('createdfrom'), 10), 'currency');
                  var poCurrency = o_transactionInfo.poCurrencyId;

                  if(soCurrency != poCurrency )
                  {
                    var sbj = 'Type ='+ s_type.toString() +'for Order# '+nlapiGetFieldValue('tranid');

                    var msg = 'SO Currency = '+soCurrency+'<br/> PO Currency = '+ poCurrency+'<br/>';
						msg += JSON.stringify(o_transactionInfo)+'<br/>';

						for (i = 0, i_itemCount = o_transactionInfo.Items.length; i < i_itemCount; i = i + 1)
                        {
							msg += 'Item: '+o_transactionInfo.Items[i].item +' Amount: '+o_transactionInfo.Items[i].amount+'<br/>' ;
                        }

                    nlapiSendEmail(29116069, 'elijah@semalulu.com', sbj, msg);
                  }
*/
//-------------------------------------------------------------------------------------------------------------------------






                    createInterCompanySalesOrder(o_transactionInfo);
                }
            }
        }











      //-----------------------------------------------ELIJAH TESTING-----------------------------------------------------------
/*
      if(nlapiGetFieldValue('custbodyinterco_transaction') == 'F' && nlapiGetFieldValue('custbody_tjinc_achnic_intercompany'))
      {
          var soCurrency = nlapiLookupField('salesorder', nlapiGetFieldValue('createdfrom'), 'currency');
          var poCurrency = nlapiGetFieldValue('currency');

          if(soCurrency != poCurrency )
          {
            var sbj = 'Type ='+ s_type.toString() +'for Order#'+nlapiGetFieldValue('tranid');
            var msg = 'SO Currency = '+soCurrency+'<br/> PO Currency = '+ poCurrency ;

            nlapiSendEmail(29116069, 'elijah@semalulu.com', sbj, msg);            
          }

      }
*/
      //-------------------------------------------------------------------------------------------------------------------------











    }
    TJINC.Log.Debug({'Title': 'TJINC_ACHNIC_AfterSubmit_PurchaseOrder OUT', 'Details': ''});










}

//https://docs.google.com/document/d/1HM4h-JzTynEKS_9VTjXRybntXX-CL-wgLdMV-JVKwdo/edit#heading=h.r8unatl4il3e
/**
 * @return {number}
 */
function getIntercompanyCustomerId() {
    'use strict';
    var i_returnValue = -1, a_customers, o_vendorDetails;
    nlapiLogExecution('DEBUG', 'getIntercompanyCustomerId IN', 'Vendor ID: ' + nlapiGetFieldValue('entity'));

    o_vendorDetails = nlapiLookupField('vendor', parseInt(nlapiGetFieldValue('entity'), 10), ['subsidiary', 'custentity_tjinc_represents_subsidiary']);
    TJINC.Log.Debug({
        'Title': 'getIntercompanyCustomerId',
        'Details': 'Vendor Details: ' + JSON.stringify(o_vendorDetails)
    });

    if (o_vendorDetails && isNumber(o_vendorDetails.subsidiary) && isNumber(o_vendorDetails.custentity_tjinc_represents_subsidiary)) {
        a_customers = jSuite.runSearch({
            recordType: 'customer',
            filterExpression: [['subsidiary', 'anyof', o_vendorDetails.custentity_tjinc_represents_subsidiary], 'AND', ['custentity_tjinc_represents_subsidiary', 'anyof', o_vendorDetails.subsidiary]]
        }).Results;

        if (a_customers.length === 1) {
            i_returnValue = a_customers[0].id;
        } else if (a_customers.length < 1) {
            //Log an error that NO corresponding intercompany Customer was found!
            nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custbody_tjinc_achnic_po_errors', INTERCO_ERRORS.No_Customer_Found, true);
            TJINC.Log.Error({
                'Title': 'getIntercompanyCustomerId',
                'Details': 'Vendor ID: ' + nlapiGetFieldValue('entity') + ' - NO corresponding intercompany Customer was found!'
            });
        } else {
            //Log an error that more than 1 corresponding intercompany Customer was found!
            nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custbody_tjinc_achnic_po_errors', INTERCO_ERRORS.More_Than_1_Customer_Found, true);
            TJINC.Log.Error({
                'Title': 'getIntercompanyCustomerId',
                'Details': 'Vendor ID: ' + nlapiGetFieldValue('entity') + ' - More than 1 corresponding intercompany Customer was found!'
            });
        }
    } else {
        //Log an error that the Vendor is missing data
        nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custbody_tjinc_achnic_po_errors', INTERCO_ERRORS.Vendor_Missing_Data, true);
        TJINC.Log.Error({
            'Title': 'getIntercompanyCustomerId',
            'Details': 'Vendor ID: ' + nlapiGetFieldValue('entity') + ' is missing data'
        });
    }
    return i_returnValue;
}

//https://docs.google.com/document/d/1HM4h-JzTynEKS_9VTjXRybntXX-CL-wgLdMV-JVKwdo/edit#heading=h.esdp5zk6mn8
function TJINC_ACHNIC_RerunTransaction_Suitelet(request, response) { // jshint ignore:line
    'use strict';
    var i_recordId, s_recordType, o_record;
    s_recordType = request.getParameter('recordType');
    i_recordId = Math.floor(parseInt(request.getParameter('recordId'), 10));

    o_record = nlapiLoadRecord(s_recordType, i_recordId);
    o_record.setFieldValue('custbody_tjinc_achnic_rerun_trans', 'T');
    i_recordId = nlapiSubmitRecord(o_record, true, false);
    nlapiSetRedirectURL('RECORD', s_recordType, i_recordId, false, null);
}

//https://docs.google.com/document/d/1HM4h-JzTynEKS_9VTjXRybntXX-CL-wgLdMV-JVKwdo/edit#heading=h.8hde5w8gwwth
function TJINC_ACHNIC_RerunTransaction_MassUpdate(s_recordType, i_recordId) {
    'use strict';
    var o_record;
    o_record = nlapiLoadRecord(s_recordType, i_recordId);
    o_record.setFieldValue('custbody_tjinc_achnic_rerun_trans', 'T');
    nlapiSubmitRecord(o_record, true, false);
}

//https://docs.google.com/document/d/1HM4h-JzTynEKS_9VTjXRybntXX-CL-wgLdMV-JVKwdo/edit#heading=h.z3p7l63iz6el
function createInterCompanySalesOrder(o_transactionInfo) {
    'use strict';
    var o_so, 
    	i_soId = null, 
    	i, 
    	i_itemCount;
    	//i_exchangeRate = 1; //ACH-39

    TJINC.Log.Debug({
        'Title': 'createInterCompanySalesOrder Start',
        'Details': 'o_transactionInfo: ' + JSON.stringify(o_transactionInfo)
    });

    try {
        o_so = nlapiTransformRecord('customer', o_transactionInfo.customerID, 'salesorder', {recordmode: 'dynamic'});

        o_so.setFieldValue('customform', s__ACHNIC_InterCompanySOForm); //ACH-42
        o_so.setFieldValue('location', nlapiLookupField('subsidiary', o_so.getFieldValue('subsidiary'), 'custrecord_tjinc_achnic_default_shipper'));
        o_so.setFieldValue('custbody_tjinc_achnic_intercompany', o_transactionInfo.purchaseOrderID);

        //ACH-39
        /*if (o_transactionInfo.poCurrencyId !== o_so.getFieldValue('currency')){ 
        	i_exchangeRate = nlapiExchangeRate(o_transactionInfo.poCurrencyId, o_so.getFieldValue('currency'));
        }
        nlapiLogExecution('DEBUG', 'createInterCompanySalesOrder', 'Exchange Rate = ' + i_exchangeRate);*/

        for (i = 0, i_itemCount = o_transactionInfo.Items.length; i < i_itemCount; i = i + 1) {
            o_so.selectNewLineItem('item');
            o_so.setCurrentLineItemValue('item', 'item', o_transactionInfo.Items[i].item);
            o_so.setCurrentLineItemValue('item', 'quantity', o_transactionInfo.Items[i].quantity);


            o_so.setCurrentLineItemValue('item', 'location', o_transactionInfo.Items[i].intercoshipper);


            // o_so.setCurrentLineItemValue('item', 'amount', o_transactionInfo.Items[i].amount); //ACH-39
            o_so.setCurrentLineItemValue('item', 'rate', o_transactionInfo.Items[i].rate); // ACH-39
            o_so.setCurrentLineItemValue('item', 'porate', o_transactionInfo.Items[i].rate);
            o_so.setCurrentLineItemValue('item', 'custcol_tjinc_achnic_itemlineid', o_transactionInfo.Items[i].lineitemid);
          	o_so.setCurrentLineItemValue('item', 'custcolcreated_po_for_vendor_internal', o_transactionInfo.Items[i].vendoruniqueid);
            o_so.setCurrentLineItemValue('item', 'custcolcustbodycore_order_date', o_transactionInfo.Items[i].coreorderdate);
            //lineitemid: nlapiGetLineItemValue('item', 'custcol_tjinc_achnic_itemlineid', i)
            o_so.commitLineItem('item');
        }

        TJINC.Log.Debug({
            'Title': 'createInterCompanySalesOrder',
            'Details': 'generated Sales Order (before create): ' + JSON.stringify(o_so)
        });

        i_soId = nlapiSubmitRecord(o_so, true, true);


        TJINC.Log.Debug({'Title': 'createInterCompanySalesOrder', 'Details': 'SO created id: ' + i_soId});

        //Link this PO to the generated Sales Order
        nlapiSubmitField('purchaseorder', o_transactionInfo.purchaseOrderID, 'custbody_tjinc_achnic_intercompany', i_soId);
    }
    catch (ex) 
    {
        //Log an error that the Intercompany Sales Order failed to create.
        nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), ['custbody_tjinc_achnic_po_errors', 'custbody_tjinc_achnic_po_err_desc'], [INTERCO_ERRORS.Error_Creating_SO, errText(ex)], false);

        TJINC.Log.Debug({
            'Title': 'createInterCompanySalesOrder',
            'Details': 'Failed to generate Intercompany SO for PO: ' + o_transactionInfo.purchaseOrderID
        });
    }

    TJINC.Log.Debug({'Title': 'createInterCompanySalesOrder Out', 'Details': ''});
}

function errText(_e) {
    var txt = '';
    if (_e instanceof nlobjError) {
        //this is netsuite specific error
        txt = 'Code: ' + _e.getCode() + ' \r\n';
        txt += 'Details: ' + _e.getDetails() + ' \r\n';
        txt += 'ID: ' + _e.getId() + ' \r\n';
        txt += 'Internal ID: ' + _e.getInternalId() + ' \r\n';
        txt += 'Stack Trace: ' + _e.getStackTrace().join('\n') + ' \r\n';
        txt += 'User Event: ' + _e.getUserEvent() + ' \r\n';
    } else {
        //this is generic javascript error
        txt = 'JavaScript/Other Error: ' + _e.toString();
    }
    return txt;
}