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
 * @DocumentationUrl: https://docs.google.com/document/d/1T-3m7yXSsQuwVxrG7y06Iu7Uh4AJ6Q7UptE0oOM-T5g/edit
 * @FileName: TJINC_ACHNED_InterCompanyLibrary.js
 * @NamingStandard: TJINC_NSJ-1-3-4
 */

/* exported TJINC_ACHNED_AS_VendorBill, TJINC_ACHNED_ValidatingTransactions, TJINC_ACHNED_BL_VendorBill, TJINC_ACHNED_UpdateAmounts,
 TJINC_ACHNED_TransformTransactions, TJINC_ACHNED_ValidateDropShipPo, TJINC_ACHNED_CheckDropShipItem, TJINC_ACHNED_BillDropShipPOs */

var o_ACHNED_processSteps = {};

// https://docs.google.com/document/d/1T-3m7yXSsQuwVxrG7y06Iu7Uh4AJ6Q7UptE0oOM-T5g/edit#heading=h.9zx4p2k43clw
function TJINC_ACHNED_ValidateDropShipPo(o_dropShipPO, s_step) {
    tj.log('TJINC_ACHNED_ValidateDropShipPo IN', 'Step: ' + s_step);

    var s_vendorRepresentSub = '';
        o_ACHNED_processSteps[s_step] = {};

    // Validating interCompany PO
    // if there is no value for "RELATED INTERCOMPANY TRX (C)" and "CREATED FROM"
    if (!o_dropShipPO.getFieldValue('custbody_tjinc_achnic_intercompany') && !o_dropShipPO.getFieldValue('createdfrom')) 
    {

        // Checking PO Vendor
        s_vendorRepresentSub = nlapiLookupField('vendor', o_dropShipPO.getFieldValue('entity'), 'custentity_tjinc_represents_subsidiary');

        if (s_vendorRepresentSub === null || s_vendorRepresentSub === '') 
        {
            tj.log('TJINC_ACHNED_ValidateDropShipPo', 'Continue, POs vendor has not representative subsidiary');
            o_ACHNED_processSteps[s_step].status = 'ok';
            o_ACHNED_processSteps[s_step].transactiontype = 'purchaseorder';
            o_ACHNED_processSteps[s_step].transactionid = o_dropShipPO.getId();
        } else {
            tj.log('TJINC_ACHNED_ValidateDropShipPo ', 'Stop process, POs vendor has representative subsidiary');
            o_ACHNED_processSteps[s_step].status = 'Stop process, POs vendor has representative subsidiary';
        }
    } else {
        tj.log('TJINC_ACHNED_ValidateDropShipPo', 'PO does not have Intercompany transaction or Created from transaction');
        o_ACHNED_processSteps[s_step].status = 'PO does not have Intercompany transaction or Created from transaction';
    }
    tj.log('TJINC_ACHNED_ValidateDropShipPo OUT', 'Return: ' + o_ACHNED_processSteps[s_step].status);
}









// https://docs.google.com/document/d/1T-3m7yXSsQuwVxrG7y06Iu7Uh4AJ6Q7UptE0oOM-T5g/edit#heading=h.n7e6o6bqo78h
function TJINC_ACHNED_TransformTransactions(o_intercompanySO) {
    tj.log('TJINC_ACHNED_TransformTransactions IN');
    var o_interCompanyPO = {},
        o_originalSO = {},
        s_interCompanyPoId = '',
        s_step = '';

    // Create Invoice
    s_step = 'intercompanyinvoice';
    TJINC_ACHNED_TransformRecord(o_intercompanySO, 'invoice', s_step);

    // Create Bill
    s_step = 'intercompanypo';
    s_interCompanyPoId = o_intercompanySO.getFieldValue('custbody_tjinc_achnic_intercompany');
    if (s_interCompanyPoId !== null && s_interCompanyPoId !== undefined) {
        o_interCompanyPO = TJINC_ACHNED_LoadRecord('purchaseorder', s_interCompanyPoId, s_step);
        TJINC_ACHNED_TransformRecord(o_interCompanyPO, 'vendorbill', 'intercompanyvendorbill');
    } else {
        o_ACHNED_processSteps[s_step] = {};
        o_ACHNED_processSteps[s_step].status = 'InterCompany SO does not have InterCompany PO';
        o_ACHNED_processSteps[s_step].transactiontype = 'salesorder';
        o_ACHNED_processSteps[s_step].transactionid = o_intercompanySO.getId();
    }

    // Create Invoice
    s_step = 'originalso';
    o_originalSO = TJINC_ACHNED_LoadRecord('salesorder', o_interCompanyPO.getFieldValue('createdfrom'), s_step);
    TJINC_ACHNED_TransformRecord(o_originalSO, 'invoice', 'originalinvoice');

    tj.log('TJINC_ACHNED_TransformTransactions OUT', 'Returning: ' + JSON.stringify(o_ACHNED_processSteps));
}










// https://docs.google.com/document/d/1T-3m7yXSsQuwVxrG7y06Iu7Uh4AJ6Q7UptE0oOM-T5g/edit#heading=h.sww0cb7zyl3u
function TJINC_ACHNED_TransformRecord(o_record, s_typeTransformTo, s_step) {
    tj.log('TJINC_ACHNED_TransformRecord IN');

    TJINC_ACHNED_TransformRecordById(o_record.getRecordType(), o_record.getId(), s_typeTransformTo, s_step);

    tj.log('TJINC_ACHNED_TransformRecord OUT');
}

function TJINC_ACHNED_TransformRecordById(s_recordType, s_recordId, s_typeTransformTo, s_step) {
    tj.log('TJINC_ACHNED_TransformRecordById IN');
    o_ACHNED_processSteps[s_step] = {};
    var o_newRecord = {},
        s_newRecordId = '';
    try {

        // Transform Record
        o_newRecord = nlapiTransformRecord(s_recordType, s_recordId, s_typeTransformTo, {
            recordmode: 'dynamic'
        });
        s_newRecordId = nlapiSubmitRecord(o_newRecord, true, true);
        tj.log('TJINC_ACHNED_TransformRecordById', 'Step: ' + s_step + ', Record Created type: ' + s_typeTransformTo + ', id: ' + s_newRecordId);

        o_ACHNED_processSteps[s_step].status = 'ok';
        o_ACHNED_processSteps[s_step].transactiontype = s_typeTransformTo;
        o_ACHNED_processSteps[s_step].transactionid = s_recordId;

    } catch (e) {
        tj.logError('Step: ' + s_step + ', There was an error transforming transaction type: ' + s_recordType + ', into: ' + s_typeTransformTo, e);
        o_ACHNED_processSteps[s_step].status = 'There was an error transforming transaction type: ' + s_recordType + ', into: ' + s_typeTransformTo +
                ' Error: ' + e.getDetails();
    }
    tj.log('TJINC_ACHNED_TransformRecordById OUT');
}

// https://docs.google.com/document/d/1T-3m7yXSsQuwVxrG7y06Iu7Uh4AJ6Q7UptE0oOM-T5g/edit#heading=h.g7xptidbgy4m
function TJINC_ACHNED_LoadRecord(s_recordType, s_recordId, s_step) {
    tj.log('TJINC_ACHNED_LoadRecord IN');
    var o_newRecord = {};
    try {
        // Transform Record
        o_newRecord = nlapiLoadRecord(s_recordType, s_recordId);
        if (s_step !== null) {
            o_ACHNED_processSteps[s_step] = {};
            o_ACHNED_processSteps[s_step].status = 'ok';
            o_ACHNED_processSteps[s_step].transactiontype = s_recordType;
            o_ACHNED_processSteps[s_step].transactionid = s_recordId;
        }
    } catch (e) {
        tj.logError('There was an error loading record Type: ' + s_recordType + ', Id: ' + s_recordId, e);
        o_ACHNED_processSteps[s_step] = {};
        o_ACHNED_processSteps[s_step].status = 'There was an error loading transaction type: ' + s_recordType + ', id: ' + s_recordId + ' Error: ' +
                e.getDetails();
        return false;
    }
    tj.log('TJINC_ACHNED_LoadRecord OUT', 'Record Loaded, Step: ' + s_step + ', type: ' + o_newRecord.getRecordType() + ', Record id: ' +
            o_newRecord.getId());
    return o_newRecord;
}

// https://docs.google.com/document/d/1T-3m7yXSsQuwVxrG7y06Iu7Uh4AJ6Q7UptE0oOM-T5g/edit#heading=h.icqeeglxjhut
function TJINC_ACHNED_UpdateAmounts(o_transToUpdate, o_itemInfo, i_exchangeRate, s_step) {
    tj.log('TJINC_ACHNED_UpdateAmounts IN');
    o_ACHNED_processSteps[s_step] = {};
  
			nlapiSendEmail(
				29116069, 
				'elijah@semalulu.com',
				'Transaction To Be Updated '+ o_transToUpdate, 
				'TEST', 
				null, 
				null, 
				null, 
				null, 
				true, 
				null, 
				null  
              )
   
  

    var b_update = false,
        s_transUpdatedId = 0,
        i = 0,
        s_itemLineId = '',
        i_quantity = 1,
        i_rate = 1,
        i_total = 0,
        i_amount = 0;

    try {
        for (i = 1; i <= o_transToUpdate.getLineItemCount('item'); i++) 
        {
            s_itemLineId = o_transToUpdate.getLineItemValue('item', 'custcol_tjinc_achnic_itemlineid', i);
            if (o_itemInfo[s_itemLineId] !== undefined) 
            {
                i_quantity = o_itemInfo[s_itemLineId].quantity;
                if (o_itemInfo[s_itemLineId].quantity !== o_transToUpdate.getLineItemValue('item', 'quantity', i)) 
                {
                    o_transToUpdate.setLineItemValue('item', 'quantity', i, o_itemInfo[s_itemLineId].quantity);
                    b_update = true;
                }

                if (o_itemInfo[s_itemLineId].rate !== o_transToUpdate.getLineItemValue('item', 'rate', i)) 
                {
                    i_rate = parseFloat((o_itemInfo[s_itemLineId].rate) * (i_exchangeRate)).toFixed(2);
                    o_transToUpdate.setLineItemValue('item', 'rate', i, parseFloat(i_rate).toFixed(2)); // ACH-39
                    b_update = true;
                }

                i_amount = parseFloat((o_itemInfo[s_itemLineId].quantity) * i_rate).toFixed(2);

                tj.log('TJINC_ACHNED_UpdateAmounts', 'Line ' + s_itemLineId + ' amount: ' + i_amount);

                i_total = parseFloat(i_total) + parseFloat(i_amount);

                tj.log('TJINC_ACHNED_UpdateAmounts', 'Line ' + s_itemLineId + ' total: ' + i_total);
              
                if (o_itemInfo[s_itemLineId].amount !== o_transToUpdate.getLineItemValue('item', 'amount', i)) 
                {
                    o_transToUpdate.setLineItemValue('item', 'amount', i, i_amount);
                    b_update = true;
                }
            }
          	else
            {
                i_total = parseFloat(i_total) + parseFloat(o_transToUpdate.getLineItemValue('item', 'amount', i));
            }
        }
        tj.log('TJINC_ACHNED_UpdateAmounts', 'It is going to update: ' + b_update);
        if (b_update) {
            i_total = i_total.toFixed(2);
            if (o_transToUpdate.getRecordType() === 'vendorbill') {
                tj.log('TJINC_ACHNED_UpdateAmounts', 'Body field total: ' + i_total);
                o_transToUpdate.setFieldValue('usertotal', i_total);
                o_transToUpdate.setFieldValue('origtotal', i_total);
                o_transToUpdate.setFieldValue('total', i_total);
            }
            s_transUpdatedId = nlapiSubmitRecord(o_transToUpdate, true, true);
            o_ACHNED_processSteps[s_step].status = 'ok';
            o_ACHNED_processSteps[s_step].transactiontype = o_transToUpdate.getRecordType();
            o_ACHNED_processSteps[s_step].transactionid = s_transUpdatedId;
            tj.log('TJINC_ACHNED_UpdateAmounts', 'Transaction Updated, Type: ' + o_transToUpdate.getRecordType() + ', Id: ' + s_transUpdatedId +
                    ' , Exchange Rate: ' + i_exchangeRate);
        } else {
            tj.log('TJINC_ACHNED_UpdateAmounts', 'There are no value differences');
            o_ACHNED_processSteps[s_step].status = 'ok';
            b_update = true;
        }
    }
  	catch (e) 
    {
        tj.logError('Record Type: ' + o_transToUpdate.getRecordType() + ', Id: ' + o_transToUpdate.getId(), e);

        o_ACHNED_processSteps[s_step].status = 'Record Type: ' + o_transToUpdate.getRecordType() + ', Id: ' + o_transToUpdate.getId() + ' Error: ' +e.getDetails();

        return false;
    }

    tj.log('TJINC_ACHNED_UpdateAmounts OUT', 'Return: ' + b_update);
    return b_update;
}

// https://docs.google.com/document/d/1T-3m7yXSsQuwVxrG7y06Iu7Uh4AJ6Q7UptE0oOM-T5g/edit#heading=h.qr5e51xflqmf
function TJINC_ACHNED_CheckDropShipItem(a_itemsId) {
    tj.log('TJINC_ACHNED_CheckDropShipItem IN');
    var a_filters = [],
        a_columns = [],
        a_searchResults = [];

    a_filters.push(new nlobjSearchFilter('internalid', null, 'anyof', a_itemsId));
    a_filters.push(new nlobjSearchFilter('isdropshipitem', null, 'is', 'T'));

    a_columns.push(new nlobjSearchColumn('isdropshipitem'));

    a_searchResults = nlapiSearchRecord('item', null, a_filters, a_columns);
    if (a_searchResults === null) {
        tj.log('TJINC_ACHNED_CheckDropShipItem OUT', 'Drop ship Item NOT found');
        return false;
    }
    tj.log('TJINC_ACHNED_CheckDropShipItem OUT', 'Drop ship Item found');
    return true;
}

// https://docs.google.com/document/d/1T-3m7yXSsQuwVxrG7y06Iu7Uh4AJ6Q7UptE0oOM-T5g/edit#heading=h.f7f4mjz4j38j
function TJINC_ACHNED_BillDropShipPOs(o_intercompanySO, s_dropShipPoId) {
    tj.log('TJINC_ACHNED_BillDropShipPOs IN');
    var i = 1,
        s_status = '',
        s_type = '',
        s_poId = '';

    for (i = 1; i <= o_intercompanySO.getLineItemCount('links'); i++) {
        s_type = o_intercompanySO.getLineItemValue('links', 'type', i);
        s_status = o_intercompanySO.getLineItemValue('links', 'type', i);
        if (s_type === 'Purchase Order' && s_status !== 'Fully Billed') {
            s_poId = o_intercompanySO.getLineItemValue('links', 'id', i);
            if (s_poId !== s_dropShipPoId) {
                tj.log('TJINC_ACHNED_BillDropShipPOs', 'Transform PO id: ' + s_poId + ' into vendorbill');
                TJINC_ACHNED_TransformRecordById('purchaseorder', s_poId, 'vendorbill', 'billingotherpos');
            }
        }
    }

    tj.log('TJINC_ACHNED_BillDropShipPOs OUT');
}
