var FLD_PRIMARY_DESC_TEXTAREA = 'custitem_primarydescriptiontextarea';

/**
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @return {void}
 */
function setValueBeforeLoad(type, form, request) {
    nlapiSetFieldValue(FLD_PRIMARY_DESC_TEXTAREA, nlapiGetFieldValue('displayname'));
   
}

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
function setValueBeforeSubmit(type){
    nlapiSetFieldValue('displayname', nlapiGetFieldValue(FLD_PRIMARY_DESC_TEXTAREA));
    nlapiSetFieldValue('purchasedescription', nlapiGetFieldValue(FLD_PRIMARY_DESC_TEXTAREA));
    nlapiSetFieldValue('salesdescription', nlapiGetFieldValue(FLD_PRIMARY_DESC_TEXTAREA));

}