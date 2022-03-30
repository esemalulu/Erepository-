/**
 * Copyright (c) 2015 Trajectory Inc. 
 * 2 Berkeley Street, Unit 205, Toronto, ON, Canada, M5A 4J5 
 * www.trajectoryinc.com 
 * All Rights Reserved. 
 */

/**
 * @System: Achievers
 * @Module: Experience on Demand
 * @Version: 1.0.0
 * @Company: Trajectory Inc. / Kuspide Canada Inc.
 * @CreationDate: 20151006
 * @RequirementsUrl: Jira Ticket ACH-35
 * @DocumentationUrl: https://docs.google.com/document/d/1GWePNY6PwCI2khh0J5176WO0Y37NEJZglH6pj6YCDG0/edit#
 * @FileName: TJINC_ACHNED_UE_VendorBill.js
 * @NamingStandard: TJINC_NSJ-1-3-4
 */

/* exported TJINC_ACHNED_AS_VendorBill, TJINC_ACHNED_ValidatingTransactions, TJINC_ACHNED_BL_VendorBill */
/* global TJINC_ACHNED_ValidateDropShipPo, o_ACHNED_processSteps, TJINC_ACHNED_TransformTransactions, TJINC_ACHNED_UpdateAmounts,
TJINC_ACHNED_LoadRecord, TJINC_ACHNED_CheckDropShipItem */

// https://docs.google.com/document/d/1GWePNY6PwCI2khh0J5176WO0Y37NEJZglH6pj6YCDG0/edit#heading=h.9zx4p2k43clw
function TJINC_ACHNED_BL_VendorBill(s_type) {

    tj.log('TJINC_ACHNED_BL_VendorBill IN', 'Type: ' + s_type);
    var s_itemId = '',
        s_poId = '',
        o_po = {},
        i = 1,
        i_total = 0,
        i_quantity = 1,
        i_rate = 1,
        i_amount = 1,
        i_exchangeRate = 1;

    if (s_type === 'create') {

        s_poId = nlapiGetFieldValue('custbody_tjinc_achnic_intercompany');
        if (s_poId !== null) {
            o_po = TJINC_ACHNED_LoadRecord('purchaseorder', s_poId, 'loadingpo');
            if (o_po.getFieldValue('currency') !== nlapiGetFieldValue('currency')) {
                i_exchangeRate = nlapiExchangeRate(o_po.getFieldValue('currency'), nlapiGetFieldValue('currency'));
                tj.log('TJINC_ACHNED_BL_VendorBill', 'i_exchangeRate: ' + i_exchangeRate);
            }
            for (i = 1; i <= nlapiGetLineItemCount('item'); i++) {
                s_itemId = nlapiGetLineItemValue('item', 'item', i);
                if (o_po.getLineItemValue('item', 'item', i) === s_itemId) {
                    i_quantity = o_po.getLineItemValue('item', 'quantity', i);
                    i_rate = parseFloat(o_po.getLineItemValue('item', 'rate', i) * i_exchangeRate).toFixed(2);
                    i_amount = parseFloat(i_quantity * i_rate).toFixed(2);
                    i_total = parseFloat(i_total + i_amount).toFixed(2);

                    nlapiSetLineItemValue('item', 'quantity', i, i_quantity);
                    nlapiSetLineItemValue('item', 'rate', i, i_rate);
                    nlapiSetLineItemValue('item', 'amount', i, i_amount);

                }
            }
            tj.log('TJINC_ACHNED_BL_VendorBill', 'i_total: ' + i_total);
            nlapiSetFieldValue('usertotal', i_total);
            nlapiSetFieldValue('origtotal', i_total);
            nlapiSetFieldValue('total', i_total);
        }
    }
    tj.log('TJINC_ACHNED_BL_VendorBill OUT', 'Out - Units: ' + nlapiGetContext().getRemainingUsage());
}

// https://docs.google.com/document/d/1GWePNY6PwCI2khh0J5176WO0Y37NEJZglH6pj6YCDG0/edit#heading=h.p1hus4arj81k
function TJINC_ACHNED_AS_VendorBill(s_type) {
    tj.log('TJINC_ACHNED_AS_VendorBill IN', 'Type: ' + s_type);

    if (s_type === 'edit' || s_type === 'xedit' || s_type === 'create') {
        TJINC_ACHNED_ValidatingTransactions(nlapiGetRecordId(), s_type);
    }
    tj.log('TJINC_ACHNED_AS_VendorBill OUT', 'Out - Units: ' + nlapiGetContext().getRemainingUsage() + ', JSON Object: ' +
            JSON.stringify(o_ACHNED_processSteps));
}

// https://docs.google.com/document/d/1GWePNY6PwCI2khh0J5176WO0Y37NEJZglH6pj6YCDG0/edit#heading=h.8pq4k43c2oin
function TJINC_ACHNED_ValidatingTransactions(s_vendorBillId, s_type) {
  
    tj.log('TJINC_ACHNED_ValidatingTransactions IN');

    var i_billPoCounter = 1, i_billItemCounter = 1, o_vendorBill = {}, o_billItemLineInfo = {}, o_dropShipPO = {}, o_intercompanySO = {}, o_interCompanyPO = {}, s_dropShipPoId = '', s_interCompanyPoId = '', s_orderDoc = '', s_itemId = '', s_itemLineId = '', i_exchangeRate = 1, i = 1, s_invoiceId = '', o_invoice = {}, a_itemsId = [];

    // Get VendorBill Information
    o_vendorBill = TJINC_ACHNED_LoadRecord('vendorbill', s_vendorBillId, 'finalvendorbill');



    o_billItemLineInfo.currency = o_vendorBill.getFieldValue('currency');
  

    tj.log('TJINC_ACHNED_ValidatingTransactions', 'Bill Currency: ' + o_billItemLineInfo.currency);
  
    for (i_billItemCounter = 1; i_billItemCounter && i_billItemCounter < o_vendorBill.getLineItemCount('item'); i_billItemCounter++) {
        s_orderDoc = o_vendorBill.getLineItemValue('item', 'orderdoc', i_billItemCounter);
        s_itemId = o_vendorBill.getLineItemValue('item', 'item', i_billItemCounter);
        s_itemLineId = o_vendorBill.getLineItemValue('item', 'custcol_tjinc_achnic_itemlineid', i_billItemCounter); // DRG TEST
        a_itemsId.push(s_itemId);
        if (s_orderDoc !== null && s_orderDoc !== '') {
            if (o_billItemLineInfo[s_orderDoc] === undefined) {
                o_billItemLineInfo[s_orderDoc] = {};
            }
            if (o_billItemLineInfo[s_orderDoc][s_itemLineId] === undefined) {
                o_billItemLineInfo[s_orderDoc][s_itemLineId] = {};
            }
            o_billItemLineInfo[s_orderDoc][s_itemLineId].quantity = o_vendorBill.getLineItemValue('item', 'quantity', i_billItemCounter);
            o_billItemLineInfo[s_orderDoc][s_itemLineId].rate = o_vendorBill.getLineItemValue('item', 'rate', i_billItemCounter);
            o_billItemLineInfo[s_orderDoc][s_itemLineId].amount = o_vendorBill.getLineItemValue('item', 'amount', i_billItemCounter);
        }
    }

      //Updated 7.29.2020 by elijah.semaululu@achievers.com
      //

      if (a_itemsId > 0)
      {
        TJINC_ACHNED_CheckDropShipItem(a_itemsId);
      }
      else
      {
        return; 
      }

    // Check each Bill PO Line
    for (i_billPoCounter = 1; i_billPoCounter <= o_vendorBill.getLineItemCount('purchaseorders'); i_billPoCounter++) {

        s_dropShipPoId = o_vendorBill.getLineItemValue('purchaseorders', 'id', i_billPoCounter);
        if (s_dropShipPoId !== null) {
            o_dropShipPO = TJINC_ACHNED_LoadRecord('purchaseorder', s_dropShipPoId, 'loaddropshippo');
        }

        // Validate InterCompany PO
        TJINC_ACHNED_ValidateDropShipPo(o_dropShipPO, 'validatedropshippo');
        if (o_ACHNED_processSteps.validatedropshippo.status !== 'ok') {
            continue;
        }

        if (s_type === 'create') {
            // InterCompany SO
            o_intercompanySO = TJINC_ACHNED_LoadRecord('salesorder', o_dropShipPO.getFieldValue('createdfrom'), 'loadintercompanyso');
            if (o_ACHNED_processSteps.loadintercompanyso.status !== 'ok') {
                return;
            }
            if (o_intercompanySO.getFieldValue('status') === 'Billed') {
                tj.log('TJINC_ACHNED_ValidatingTransactions', 'InterCompany SO is already billed.');
                o_ACHNED_processSteps.transformtransactions = {};
                o_ACHNED_processSteps.transformtransactions.status = 'InterCompany SO is already billed.';
                o_ACHNED_processSteps.transformtransactions.transactiontype = 'salesorder';
                o_ACHNED_processSteps.transformtransactions.transactionid = o_intercompanySO.getId();
            } else {
                if (o_intercompanySO.getFieldValue('status') !== 'Pending Fulfillment') {
                    //TJINC_ACHNED_BillDropShipPOs(o_intercompanySO, s_dropShipPoId);
                    TJINC_ACHNED_TransformTransactions(o_intercompanySO);

                } else {
                    tj.log('TJINC_ACHNED_ValidatingTransactions', 'InterCompany SO does not have Item Fulfillment, You should fulfill SO id: ' +
                            o_intercompanySO.getId());
                    o_ACHNED_processSteps.transformtransactions = {};
                    o_ACHNED_processSteps.transformtransactions.status = 'InterCompany SO does not have Item Fulfillment, You should fulfill SO id: ' +
                            o_intercompanySO.getId();
                    o_ACHNED_processSteps.transformtransactions.transactiontype = 'salesorder';
                    o_ACHNED_processSteps.transformtransactions.transactionid = o_intercompanySO.getId();
                }
            }
        }

        // DropShip PO
        TJINC_ACHNED_UpdateAmounts(o_dropShipPO, o_billItemLineInfo[s_dropShipPoId], i_exchangeRate, 'updatedropshippo');

        // InterCompany SO
        o_intercompanySO = TJINC_ACHNED_LoadRecord('salesorder', o_dropShipPO.getFieldValue('createdfrom'), 'loadintercompanyso');
        if (o_ACHNED_processSteps.loadintercompanyso.status !== 'ok') {
            return;
        }

        // Invoice
        for (i = 1; i <= o_intercompanySO.getLineItemCount('links'); i++) {
            s_type = o_intercompanySO.getLineItemValue('links', 'type', i);

            if (s_type === 'Invoice') {
                s_invoiceId = o_intercompanySO.getLineItemValue('links', 'id', i);

                if (s_invoiceId !== null) {
                    o_invoice = TJINC_ACHNED_LoadRecord('invoice', s_invoiceId, 'intercompanyinvoice');
                    if (o_invoice.getFieldValue('currency') !== o_billItemLineInfo.currency) {
                        i_exchangeRate = nlapiExchangeRate(o_billItemLineInfo.currency, o_invoice.getFieldValue('currency'));
                    }
                    TJINC_ACHNED_UpdateAmounts(o_invoice, o_billItemLineInfo[s_dropShipPoId], i_exchangeRate, 'updateintercompanyinvoice');
                }
            }
        }

        // InterCompany PO
        s_interCompanyPoId = o_intercompanySO.getFieldValue('custbody_tjinc_achnic_intercompany');
        if (s_interCompanyPoId !== null && s_interCompanyPoId !== undefined) {
            o_interCompanyPO = TJINC_ACHNED_LoadRecord('purchaseorder', s_interCompanyPoId, 'intercompanypo');

            for (i = 1; i <= o_interCompanyPO.getLineItemCount('links'); i++) {
                s_type = o_interCompanyPO.getLineItemValue('links', 'type', i);

                if (s_type === 'Bill') {
                    var s_billId = o_interCompanyPO.getLineItemValue('links', 'id', i);

                    if (s_billId !== null) {
                        var o_vendorbill = nlapiLoadRecord('vendorbill', s_billId, {
                            recordmode: 'dynamic'
                        });
                        TJINC_ACHNED_UpdateAmounts(o_vendorbill, o_billItemLineInfo[s_dropShipPoId], i_exchangeRate, 'updateintercompanybill');
                    }
                }
            }
        } else {
            tj.log('TJINC_ACHNED_ValidatingTransactions OUT', 'Sales order id: ' + o_intercompanySO.getId() + ' has not intercompany PO');
        }
    }
    tj.log('TJINC_ACHNED_ValidatingTransactions OUT');
}
