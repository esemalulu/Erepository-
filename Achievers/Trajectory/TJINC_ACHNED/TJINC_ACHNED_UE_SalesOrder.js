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
 * @CreationDate: 20151109
 * @RequirementsUrl: Jira Ticket ACH-52
 * @DocumentationUrl: 
 * @FileName: TJINC_ACHNED_UE_SalesOrder.js
 * @NamingStandard: TJINC_NSJ-1-3-4
 */

/*exported TJINC_ACHNED_AS_SalesOrder */
/*global TJINC_ACHNED_CheckDropShipItem, TJINC_ACHNED_LoadRecord, TJINC_ACHNED_TransformTransactions */

function TJINC_ACHNED_AS_SalesOrder(s_type) {
    if (s_type !== null) {
        s_type = s_type.toString();
    }
    tj.logActive = true;
    tj.log('TJINC_ACHNED_AfterSubmit_SalesOrder IN', 'Type: ' + s_type);

    var o_so = {},
        b_fulfillMemberSo = false,
        s_fulfill = 'F',
        o_itemsToFulfill = {},
        o_intercoPoIds = {},
        o_itemLineIdsForPO = {};
  
    if(s_type === 'create') 
    {
      nlapiLogExecution('DEBUG', 'TJINC_ACHNED_AfterSubmit_SalesOrder', 'Type: ' + s_type+' -- Record ID = '+nlapiGetRecordId());
    }
  
  
  

    if (s_type === 'edit') 
    {
        if (nlapiGetFieldValue('custbodyinterco_transaction') === 'T') {
            
            o_so = nlapiLoadRecord ('salesorder', nlapiGetRecordId());
            //Member SO
            if (o_so.getFieldValue ('custbody_tjinc_achnic_intercompany') === null){
                
                for (var i = 1; i <= o_so.getLineItemCount('item'); i++){
                    s_fulfill = 'F';
                    if (o_so.getLineItemValue('item', 'custcol_tjinc_achnic_intercofulfill', i) === 'T'){
                        if (o_so.getLineItemValue('item', 'quantityfulfilled', i) < o_so.getLineItemValue('item', 'quantity', i)){
                            b_fulfillMemberSo = true;
                            s_fulfill = 'T';
                        }
                    }
                    o_itemsToFulfill [o_so.getLineItemValue('item', 'custcol_tjinc_achnic_itemlineid', i)] = {
                            'quantity' : o_so.getLineItemValue('item', 'quantity', i),
                            'intercopoid': o_so.getLineItemValue('item', 'createdpo', i),
                            'membershipper': o_so.getLineItemValue('item', 'location', i),
                            'fulfillline': s_fulfill 
                            };
                    
                    if (o_intercoPoIds [o_so.getLineItemValue('item', 'createdpo', i)] === undefined){
                        o_intercoPoIds [o_so.getLineItemValue('item', 'createdpo', i)] = {'itemlineids':{}, 'fulfill': 'F'};
                    }
                    if (s_fulfill === 'T'){
                        o_intercoPoIds [o_so.getLineItemValue('item', 'createdpo', i)].fulfill = 'T';
                    }
                    o_itemLineIdsForPO = o_intercoPoIds [o_so.getLineItemValue('item', 'createdpo', i)].itemlineids;
                    o_itemLineIdsForPO[o_so.getLineItemValue('item', 'custcol_tjinc_achnic_itemlineid', i)] = {
                            'quantity' : o_so.getLineItemValue('item', 'quantity', i),
                            'intercoshipper' : o_so.getLineItemValue('item', 'custcol_tjinc_ach_intercoshipper', i),
                            'fulfillline': s_fulfill 
                            };
                    o_intercoPoIds [o_so.getLineItemValue('item', 'createdpo', i)].itemlineids = o_itemLineIdsForPO;
                }
            //InterCompany SO
            }else{
                
            }
        }
    }
  
  
  
  
  
    if (b_fulfillMemberSo){
        tj.log('TJINC_ACHNED_AfterSubmit_SalesOrder OUT', 'Items to fulfill: ' + JSON.stringify(o_itemsToFulfill) +
                ' InterCo PO ids: ' + JSON.stringify(o_intercoPoIds));
        TJINC_ACHNED_CreateItemFulfillmentMemberSO (o_so, o_itemsToFulfill);
        TJINC_ACHNED_CreateItemFulfillmentIntercoSO (o_so, o_itemsToFulfill, o_intercoPoIds);
    }

    tj.log('TJINC_ACHNED_AfterSubmit_SalesOrder OUT', 'Out - Units: ' + nlapiGetContext().getRemainingUsage());
}

function TJINC_ACHNED_CreateItemFulfillmentMemberSO (o_memberSo, o_itemsToFulfill){
    tj.log('TJINC_ACHNED_CreateItemFulfillmentMemberSO In');
    var o_itemFulfillment = {},
    i = 1,
    s_lineId = 1,
    s_itemFulfillId = '';

    o_itemFulfillment = nlapiTransformRecord('salesorder', o_memberSo.getId(), 'itemfulfillment', {
        recordmode: 'dynamic'
    });

    //Uncheck the 'itemreceive' on the ItemFulfillment record
    for (i = 1; i <= o_itemFulfillment.getLineItemCount('item'); i++){
        o_itemFulfillment.selectLineItem('item', i);
        s_lineId = o_itemFulfillment.getCurrentLineItemValue('item', 'custcol_tjinc_achnic_itemlineid');

        if (o_itemsToFulfill[s_lineId].fulfillline !== 'T'){
            o_itemFulfillment.setCurrentLineItemValue('item', 'itemreceive', 'F');
            
        }else{
            o_itemFulfillment.setCurrentLineItemValue('item', 'itemreceive', 'T');
            o_itemFulfillment.setCurrentLineItemValue('item', 'quantity', o_itemsToFulfill[s_lineId].quantity);
        }
        o_itemFulfillment.setCurrentLineItemValue('item', 'location', o_itemsToFulfill[s_lineId].membershipper);
        //o_itemFulfillment.setCurrentLineItemValue('item', 'location', 2);
        o_itemFulfillment.commitLineItem('item');
    }

    try {
        s_itemFulfillId = nlapiSubmitRecord(o_itemFulfillment, true, true);
        tj.log('TJINC_ACHNED_CreateItemFulfillmentMemberSO', 'Member SO ItemFulfillment saved id: ' + s_itemFulfillId);

    } catch (e) {
        tj.logError('Failed to generate Item Fulfillment for MemberSO: ' + o_memberSo.getId(), e);
    }
    tj.log('TJINC_ACHNED_CreateItemFulfillmentMemberSO Out');
}



function TJINC_ACHNED_CreateItemFulfillmentIntercoSO (o_memberSo, o_itemsToFulfill, o_intercoPoIds) {
    tj.log('TJINC_ACHNED_CreateItemFulfillmentIntercoSO In');
    var o_purchaseOrderFields = {},
        o_itemFulfillment = {},
        o_interCompanySo = {},
        i = 0,
        i_soLineCounter = 1,
        a_items = [],
        i_interCompanyPoId = 0,
        o_intercompanyPoIds = {},
        s_lineId = '',
        s_itemFulfillId = '';

    for (i_soLineCounter = 1; i_soLineCounter <= o_memberSo.getLineItemCount('item'); i_soLineCounter++) {
        o_intercompanyPoIds[o_memberSo.getLineItemValue('item', 'createdpo', i_soLineCounter)] = {};
    }
    for (i_interCompanyPoId in o_intercoPoIds){
        
        if (tj.isNumber(i_interCompanyPoId)) {
            if (o_intercoPoIds[i_interCompanyPoId].fulfill === 'T'){
            o_purchaseOrderFields = nlapiLookupField('purchaseorder', i_interCompanyPoId, ['custbody_tjinc_achnic_intercompany']);
            if (tj.isNumber(o_purchaseOrderFields.custbody_tjinc_achnic_intercompany)) {

                o_itemFulfillment = nlapiTransformRecord('salesorder', o_purchaseOrderFields.custbody_tjinc_achnic_intercompany, 'itemfulfillment', {
                    recordmode: 'dynamic'
                });

                o_itemsToFulfill = o_intercoPoIds[i_interCompanyPoId].itemlineids;
              
                //Uncheck the 'itemreceive' on the ItemFulfillment record
                for (i = 1; i <= o_itemFulfillment.getLineItemCount('item'); i++){
                    o_itemFulfillment.selectLineItem('item', i);
                    s_lineId = o_itemFulfillment.getCurrentLineItemValue('item', 'custcol_tjinc_achnic_itemlineid');
                    
                    if (o_itemsToFulfill[s_lineId].fulfillline !== 'T'){
                        o_itemFulfillment.setCurrentLineItemValue('item', 'itemreceive', 'F');
                        
                    }else{
                        o_itemFulfillment.setCurrentLineItemValue('item', 'itemreceive', 'T');
                        o_itemFulfillment.setCurrentLineItemValue('item', 'quantity', o_itemsToFulfill[s_lineId].quantity);
                    }
                    o_itemFulfillment.setCurrentLineItemValue('item', 'location', o_itemsToFulfill[s_lineId].intercoshipper);
                    //o_itemFulfillment.setCurrentLineItemValue('item', 'location', 12);
                    o_itemFulfillment.commitLineItem('item');
                }


                try {
                    s_itemFulfillId = nlapiSubmitRecord(o_itemFulfillment, true, true);
                    tj.log('TJINC_ACHNED_CreateItemFulfillmentIntercoSO', 'InterCompany ItemFulfillment saved id: ' + s_itemFulfillId);
                    
                    o_interCompanySo = TJINC_ACHNED_LoadRecord('salesorder', o_purchaseOrderFields.custbody_tjinc_achnic_intercompany,
                    'loadintercompanyso');
                    for (i = 1; i <= o_interCompanySo.getLineItemCount('item'); i++){
                        a_items.push(o_interCompanySo.getLineItemValue('item', 'item', i));
                    }
                    if (!TJINC_ACHNED_CheckDropShipItem(a_items)) {
                        
                        if (o_interCompanySo.getFieldValue('status') === 'Pending Billing') {
                            TJINC_ACHNED_TransformTransactions(o_interCompanySo);
                        }
                    }
                } catch (e) {
                    tj.logError('Failed to generate Item Fulfillment for SO: ' + o_purchaseOrderFields.createdfrom, e);
                }
            }
        }
        }
    }
    tj.log('TJINC_ACHNED_CreateItemFulfillmentIntercoSO Out');
}
