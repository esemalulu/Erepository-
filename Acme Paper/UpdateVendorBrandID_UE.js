
var FLD_ITEM_BRAND_ID = 'custitem_evox_brand_id';
var FLD_VENDOR_BRAND_ID = 'custentity_evox_vendor_brandid';
var FLD_OVERRIDE = 'custitem6';

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function updateIDAfterSubmit(type){
    var recOld;

    if(type == 'edit') {
        //recOld = nlapiGetOldRecord();
        //if(recOld.getFieldValue(FLD_VENDOR_BRAND_ID) != nlapiGetFieldValue(FLD_VENDOR_BRAND_ID)) 
        {
            updateItems(nlapiGetRecordId(),nlapiGetFieldValue(FLD_VENDOR_BRAND_ID));
        }
    }
}


function updateItems(idVendor, sBrandId) {
    var aColSearch = []; 
    var aFltSearch = []; 
    var aResult; 
    var rndInt = Math.floor(Math.random() * 6) + 1;
    
    if(rndInt == 1)
        aColSearch.push(new nlobjSearchColumn('internalid').setSort()); 
    else
        aColSearch.push(new nlobjSearchColumn('internalid').setSort('DESC')); 
        
    aColSearch.push(new nlobjSearchColumn('itemid')); 
    aColSearch.push(new nlobjSearchColumn(FLD_ITEM_BRAND_ID)); 

    aFltSearch.push(new nlobjSearchFilter('type','null','anyof',['InvtPart'])); 
    aFltSearch.push(new nlobjSearchFilter('vendor','null','is',idVendor)); 
    aFltSearch.push(new nlobjSearchFilter(FLD_OVERRIDE,'null','is','F')); 

    aResult = nlapiSearchRecord('item', null, aFltSearch, aColSearch); 

    if(typeof aResult !== 'undefined' && aResult) {
        aResult.forEach(function(oItem) {
            if(sBrandId != oItem.getValue(FLD_ITEM_BRAND_ID)) {
                try {    
                    nlapiSubmitField('inventoryitem',oItem.getId(),FLD_ITEM_BRAND_ID,sBrandId);
                } catch(e) {
                    nlapiLogExecution('ERROR','Item ID: '+oItem.getId(),e.message);
                }
            }
        }); 
    }
}

/*
jQuery('.uir-list-row-tr').each(function (i, row) {
    var internalid = jQuery(row).find('td:nth-child(2)').html();
    var brand_id = jQuery(row).find('td:nth-child(4)').html();
    
    if(i >= 8) {
        console.log(i + ' - ' + internalid + ' - ' + brand_id);
        updateItems(internalid, brand_id);
    }
});
*/
