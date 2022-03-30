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
 * @RequirementsUrl: Jira Ticket ACH-43
 * @DocumentationUrl: https://docs.google.com/document/d/1ebbKCB1bZxHdhkMJdbzrep8rPZzL8ohUwl5pUw9Cphg/edit#
 * @FileName: TJINC_ACHNED_UE_PurchaseOrder.js
 * @NamingStandard: TJINC_NSJ-1-3-4
 */

/* exported TJINC_ACHNED_AS_PurchaseOrder */
/* global TJINC_ACHNED_LoadRecord, TJINC_ACHNED_CheckDropShipItem, TJINC_ACHNED_ValidateDropShipPo, o_ACHNED_processSteps */

//https://docs.google.com/document/d/1ebbKCB1bZxHdhkMJdbzrep8rPZzL8ohUwl5pUw9Cphg/edit#heading=h.9zx4p2k43clw
function TJINC_ACHNED_AS_PurchaseOrder(s_type) 
{
    var o_dropShipPO = {},
        i = 0,
        s_interCompanyPoId = '',
        o_intercompanySO = {},
        o_interCompanyPO = {},
        a_itemsId = [],
        s_lineitemid = '',
        j = 1;

    tj.log('TJINC_ACHNED_AS_PurchaseOrder Start', 'Type: ' + s_type);

    if (s_type === 'dropship') 
    {
        o_dropShipPO = TJINC_ACHNED_LoadRecord('purchaseorder', nlapiGetRecordId(), 'loadingdropshippo');

        if (TJINC_ACHNED_ValidateDropShipPo(o_dropShipPO, 'validatedropshippo')) 
        {
            if (o_ACHNED_processSteps.validatedropshippo !== 'ok') 
            {
                return;
            }
        }

        for (i = 1; i <= o_dropShipPO.getLineItemCount('item'); i++) 
        {
            a_itemsId.push(o_dropShipPO.getLineItemValue('item', 'item', i));
        }

        if (TJINC_ACHNED_CheckDropShipItem(a_itemsId)) 
        {
            if (o_dropShipPO.getFieldValue('createdfrom') !== null) 
            {
                o_intercompanySO = TJINC_ACHNED_LoadRecord('salesorder', o_dropShipPO.getFieldValue('createdfrom'), 'intercompanyso');

                if (o_intercompanySO !== null && o_intercompanySO !== undefined) 
                {
                    s_interCompanyPoId = o_intercompanySO.getFieldValue('custbody_tjinc_achnic_intercompany');

                    if (s_interCompanyPoId !== null && s_interCompanyPoId !== undefined) 
                    {
                        o_interCompanyPO = TJINC_ACHNED_LoadRecord('purchaseorder', s_interCompanyPoId, 'intercompanypo');

                        var o_memberSo = TJINC_ACHNED_LoadRecord('salesorder', o_interCompanyPO.getFieldValue('createdfrom'), 'memberso');

                        for (i = 1; i <= o_dropShipPO.getLineItemCount('item'); i++) 
                        {
                            s_lineitemid = o_dropShipPO.getLineItemValue('item', 'custcol_tjinc_achnic_itemlineid', i);

                            for (j = 1; j <= o_memberSo.getLineItemCount('item'); j++) 
                            {
                                if (s_lineitemid === o_memberSo.getLineItemValue('item', 'custcol_tjinc_achnic_itemlineid', j)) 
                                {
                                    o_memberSo.setLineItemValue('item', 'custcolinterco_vendor_po_line_item', j, o_dropShipPO.getId());
                                }
                            }
                        }
                        nlapiSubmitRecord(o_memberSo);

                        tj.log('TJINC_ACHNED_AS_PurchaseOrder', 'Inter-Company Vendor PO Number Submitted,  POid: ' + o_dropShipPO.getId());
                    }
                }
            }
        }
    }
    tj.log('TJINC_ACHNED_AS_PurchaseOrder Out', 'JSON Object: ' + JSON.stringify(o_ACHNED_processSteps));
}
