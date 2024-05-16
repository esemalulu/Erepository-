
var SPARAM_PRIV_LBL_EVOX_BRAND_ID = 'custscript_prvtlbl_evoxbrandid';
var FLD_PRIVATE_LABEL = 'custitem_private_label';
var FLD_EVOX_BRAND_ID = 'custitem_evox_brand_id';


/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function setBrandIDFieldChanged(type, name, linenum){
    var sDefaultBrandId = nlapiGetContext().getSetting('SCRIPT', SPARAM_PRIV_LBL_EVOX_BRAND_ID);
    if(name == FLD_PRIVATE_LABEL) {
        if(nlapiGetFieldValue(FLD_PRIVATE_LABEL) == 'T') {
            nlapiSetFieldValue(FLD_EVOX_BRAND_ID, sDefaultBrandId);
        } else {
            if(nlapiGetFieldValue(FLD_EVOX_BRAND_ID) == sDefaultBrandId) {
                nlapiSetFieldValue(FLD_EVOX_BRAND_ID, '');
            }
        }
    }
}