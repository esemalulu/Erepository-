var SPARAM_DEFAUL_SUBSIDIARY = 'custscript_default_subsidiary';

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function defaultSubPageInit(type){
    if(type == 'create') {
	   nlapiSetFieldValue('subsidiary', nlapiGetContext().getSetting('SCRIPT', SPARAM_DEFAUL_SUBSIDIARY));
    }
}