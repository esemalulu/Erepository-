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
 * @CreationDate: 20151020
 * @RequirementsUrl: Jira Ticket ACH-35
 * @DocumentationUrl: https://docs.google.com/document/d/1ZN8wa5toijzNpNjD1k3BfAo4fz4u9l9jeJbxd8n5zTg/edit#
 * @FileName: TJINC_ACHNED_UE_ItemFulfillment.js
 * @NamingStandard: TJINC_NSJ-1-3-4
 */

/* exported TJINC_ACHNED_AS_ItemFulfillment */
/* global TJINC_ACHNED_LoadRecord, TJINC_ACHNED_TransformTransactions, TJINC_ACHNED_CheckDropShipItem, o_ACHNED_processSteps */

//https://docs.google.com/document/d/1ZN8wa5toijzNpNjD1k3BfAo4fz4u9l9jeJbxd8n5zTg/edit#heading=h.9zx4p2k43clw
function TJINC_ACHNED_AS_ItemFulfillment(s_type) {
    tj.log('TJINC_ACHNED_AS_ItemFulfillment Start', 'Type: ' + s_type);
    var o_so = {};
        //i_interCompanyPoId = '';

    if (s_type === 'create') {
        if (tj.isNumber(nlapiGetFieldValue('createdfrom'))) {
            o_so = TJINC_ACHNED_LoadRecord('salesorder', nlapiGetFieldValue('createdfrom'), 'loadmemberso');
            //i_interCompanyPoId = o_so.getFieldValue('custbody_tjinc_achnic_intercompany');
            //if (i_interCompanyPoId === null) {
                if (o_so.getFieldValue('custbodyinterco_transaction') === 'T'){
                    TJINC_ACHNED_MemberItemFulfillment(o_so); //Inventory Item
                //}
           // } else {
                //TJINC_ACHNED_InterCompanyItemFulfillment(o_so, i_interCompanyPoId); //DropShip Item
                
            }
        }
    }
    tj.log('TJINC_ACHNED_AS_ItemFulfillment Out', 'JSON Object: ' + JSON.stringify(o_ACHNED_processSteps));
}

function TJINC_ACHNED_MemberItemFulfillment(o_memberSo) {
    tj.log('TJINC_ACHNED_MemberItemFulfillment In');
    var o_purchaseOrderFields = {},
        o_itemFulfillment = {},
        o_interCompanySo = {},
        i = 0,
        i_soLineCounter = 1,
        i_itemCount = 0,
        i_foundLineIndex = 0,
        a_items = [],
        i_interCompanyPoId = 0,
        o_intercompanyPoIds = {};

    for (i_soLineCounter = 1; i_soLineCounter <= o_memberSo.getLineItemCount('item'); i_soLineCounter++) {
        o_intercompanyPoIds[o_memberSo.getLineItemValue('item', 'createdpo', i_soLineCounter)] = {};
    }
    for (i_interCompanyPoId in o_intercompanyPoIds){

        //i_interCompanyPoId = o_memberSo.getLineItemValue('item', 'createdpo', i_soLineCounter);
        if (tj.isNumber(i_interCompanyPoId)) {
            o_purchaseOrderFields = nlapiLookupField('purchaseorder', i_interCompanyPoId, ['custbody_tjinc_achnic_intercompany']);
            if (tj.isNumber(o_purchaseOrderFields.custbody_tjinc_achnic_intercompany)) {

                o_itemFulfillment = nlapiTransformRecord('salesorder', o_purchaseOrderFields.custbody_tjinc_achnic_intercompany, 'itemfulfillment', {
                    recordmode: 'dynamic'
                });

                // #1 - uncheck the 'itemreceive' on the ItemFulfillment record, before syncing with current Item Fulfillment (looping
                // backwards this way is fastest)
                i = parseInt(o_itemFulfillment.getLineItemCount('item'), 10);
                while (i > 0) {
                    // uncheck the 'itemreceive'
                    o_itemFulfillment.selectLineItem('item', i);
                    o_itemFulfillment.setCurrentLineItemValue('item', 'itemreceive', 'F');
                    a_items.push(o_itemFulfillment.getCurrentLineItemValue('item', 'item'));
                    o_itemFulfillment.commitLineItem('item');
                    i = i - 1;
                }

                // #2 - loop through current Item Fulfillment, find ones with 'itemreceive' == 'T' and check those off on generated Item
                // Fulfillment (with qty)
                for (i = 1, i_itemCount = parseInt(nlapiGetLineItemCount('item'), 10); i <= i_itemCount; i = i + 1) {
                    if (nlapiGetLineItemValue('item', 'itemreceive', i) === 'T') {
                        /*for (j = 1; j <= o_itemFulfillment.getLineItemCount('item'); j++){
                            if (nlapiGetLineItemValue('item', 'custcol_tjinc_achnic_itemlineid', i) === o_itemFulfillment.getLineItemValue('item', 'custcol_tjinc_achnic_itemlineid', j)) {
                                
                            }
                        }*/
                        i_foundLineIndex = o_itemFulfillment.findLineItemValue('item', 'custcol_tjinc_achnic_itemlineid', nlapiGetLineItemValue('item', 'custcol_tjinc_achnic_itemlineid', i));
                        if (tj.isNumber(i_foundLineIndex) && i_foundLineIndex > 0) {
                            o_itemFulfillment.selectLineItem('item', i_foundLineIndex);
                            o_itemFulfillment.setCurrentLineItemValue('item', 'itemreceive', 'T');
                            o_itemFulfillment.setCurrentLineItemValue('item', 'quantity', nlapiGetLineItemValue('item', 'quantity', i));
                            o_itemFulfillment.commitLineItem('item');
                        }
                    }
                }

                try {
                    nlapiSubmitRecord(o_itemFulfillment, true, true);
                    if (!TJINC_ACHNED_CheckDropShipItem(a_items)) {
                        o_interCompanySo = TJINC_ACHNED_LoadRecord('salesorder', o_purchaseOrderFields.custbody_tjinc_achnic_intercompany,
                                'loadintercompanyso');
                        TJINC_ACHNED_TransformTransactions(o_interCompanySo);
                    }
                    tj.log('TJINC_ACHNED_MemberItemFulfillment', 'InterCompany ItemFulfillment saved');
                    //break;
                } catch (e) {
                    tj.logError('Failed to generate Item Fulfillment for SO: ' + o_purchaseOrderFields.createdfrom, e);
                }
            }
        }
    }
    tj.log('TJINC_ACHNED_MemberItemFulfillment Out');
}


/*
function TJINC_ACHNED_InterCompanyItemFulfillment(o_interCompanySo, i_interCompanyPoId) {
    tj.log('TJINC_ACHNED_InterCompanyItemFulfillment Start');
    var o_purchaseOrderFields,
        o_itemFulfillment = {},
        i = 1,
        a_items = [],
        s_type = '',
        s_status = '',
        b_fulfillso = false;

    if (tj.isNumber(i_interCompanyPoId)) {

        o_purchaseOrderFields = nlapiLookupField('purchaseorder', i_interCompanyPoId, ['createdfrom']);
        if (tj.isNumber(o_purchaseOrderFields.createdfrom)) {
            o_itemFulfillment = nlapiTransformRecord('salesorder', o_purchaseOrderFields.createdfrom, 'itemfulfillment', {
                recordmode: 'dynamic'
            });

            for (i = 1; i <= o_itemFulfillment.getLineItemCount('item'); i++) {
                a_items.push(o_itemFulfillment.getLineItemValue('item', 'item', i));
            }

            for (i = 1; i <= o_interCompanySo.getLineItemCount('links'); i++) {
                s_type = o_interCompanySo.getLineItemValue('links', 'type', i);
                s_status = o_interCompanySo.getLineItemValue('links', 'status', i);

                if (s_type === 'Purchase Order' && s_status === 'Pending Receipt') {
                    b_fulfillso = true;
                }
            }
            if (b_fulfillso) {
                TJINC_ACHNED_TransformRecord(o_interCompanySo, 'itemfulfillment', 'transformsoinfulfill');
            }

            try {
                nlapiSubmitRecord(o_itemFulfillment, true, true);
                if (!TJINC_ACHNED_CheckDropShipItem(a_items)) {
                    TJINC_ACHNED_TransformTransactions(o_interCompanySo);
                }
                tj.log('TJINC_ACHNED_InterCompanyItemFulfillment', 'Member ItemFulfillment saved');
            } catch (e) {
                tj.logError('Failed to generate Item Fulfillment for SO: ' + o_purchaseOrderFields.createdfrom, e);
            }
        }
    }
    tj.log('TJINC_ACHNED_InterCompanyItemFulfillment Out', 'Returning: ' + JSON.stringify(o_ACHNED_processSteps));
}
*/
