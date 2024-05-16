
var FLD_ITEM_BRAND_ID = 'custitem_evox_brand_id';
var FLD_VENDOR_BRAND_ID = 'custentity_evox_vendor_brandid';
var FLD_OVERRIDE = 'custitem6';

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function updateIDBeforeSubmit(type){
    var idVendor;
    
    if(nlapiGetFieldValue(FLD_OVERRIDE) != 'T') {
        for(var nFlag=1;nFlag<=nlapiGetLineItemCount('itemvendor');nFlag++) {
            if(nlapiGetLineItemValue('itemvendor','preferredvendor',nFlag) == 'T') {
                idVendor = nlapiGetLineItemValue('itemvendor','vendor',nFlag);

                nlapiSetFieldValue(FLD_ITEM_BRAND_ID, nlapiLookupField('vendor', idVendor, FLD_VENDOR_BRAND_ID));
            }
        }
    }
}