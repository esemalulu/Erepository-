/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       13 May 2016     WORK-rehanlakhani
 *
 */

function displayButtons(type, form, request)
{
    if(type == 'view')
    {
        var salesOrderStatus = nlapiGetFieldValue('status');
        var isProcessed = nlapiGetFieldValue('custbody_axcr_contractprocessed');
        var isCRATrans = nlapiGetFieldValue('custbody_axcr_iscratrx');
        var contractRef = nlapiGetFieldValue('custbody_axcr_contractreference');

        if(salesOrderStatus == 'Pending Billing' && isProcessed == 'T' && isCRATrans == 'T' && contractRef)
        {
            form.addButton('custpage_refreshopp','Update Renewal Opportunity','refreshRenewalOpp(' + contractRef +')');
            form.setScript('customscript_aux_ue_refreshopp');
        }
    }
}

function refreshRenewalOpp(contractRef)
{
    var itemArray = [];
    var oppItems = [];
    var contractRec = nlapiLoadRecord('customrecord_axcr_contract',contractRef);
    var renewalOpp  = contractRec.getFieldValue('custrecord_crc_latestrenewopp');

    var Opp = nlapiLoadRecord('opportunity', renewalOpp);
    var itemCount = Opp.getLineItemCount('item');
    alert('Number of Items ' + itemCount);

    var billStartDate = Opp.getLineItemValue('item','custcol_contract_start_date', 1);
    alert(billStartDate);
    var billEndDate = Opp.getLineItemValue('item','custcol_contract_end_date',1);
    alert(billEndDate);

    var sf = [
            new nlobjSearchFilter('isinactive', null, 'is','F'),
            new nlobjSearchFilter('custrecord_cra_contract', null, 'anyof', contractRef)
    ];

    var sc = [
        new nlobjSearchColumn('custrecord_cra_item'),
    ];

    var assetSearch = nlapiSearchRecord('customrecord_axcr_assets', null, sf, sc);
    if(assetSearch)
    {
        for(var i = 0; i < assetSearch.length; i+=1)
        {
            itemArray.push(assetSearch[i].getValue('custrecord_cra_item'));
        }
    }

    for(var y = 1; y <= itemCount; y+=1)
    {
        oppItems.push(Opp.getLineItemValue('item','item',y));
    }

    var index;
    for(var x = 0; x < oppItems.length; x+=1)
    {
        index = itemArray.indexOf(oppItems[x]);
        if(index > -1)
        {
            itemArray.splice(index, 1);
        }
    }

    for(var a = 0; a < itemArray.length; a+=1)
    {
        Opp.setLineItemValue('item','item', itemCount+1, itemArray[0]);
        Opp.setLineItemValue('item','custcol_contract_start_date', itemCount+1, billStartDate);
        Opp.setLineItemValue('item','custcol_contract_end_date', itemCount+1, billEndDate);
        if(itemArray > 1)
        {
            itemCount+=1;
        }
    }

    var oppID = nlapiSubmitRecord(Opp, true, true);
    alert(oppID);



}
