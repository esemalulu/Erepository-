/**
 * Proforma Client Script
 *
 * @require sweet_remittance_lib.js
 */

/**
 * FieldChanged hook
 *
 * @return {Void}
 */
function localform_fieldChanged(type, name, linenum) {
  
  // Update remittance fields if template is changed
  if (name == 'custbody_remit_template') {
    var templateId = nlapiGetFieldValue('custbody_remit_template');
    if (templateId) {
      var template = nlapiLoadRecord('customrecord_remittance', templateId);
      nlapiSetFieldValue('custbody_remit_wiretransfer', template.getFieldValue('custrecord_remit_wiretransfer'));
      nlapiSetFieldValue('custbody_remit_cheque', template.getFieldValue('custrecord_remit_cheque'));
    }
  }
}

/**
 * PostSourcing hook
 *
 * @param {String} type
 * @param {String} name
 */
function localform_postSourcing(type, name) {
  if (name == 'entity') {
    // Select remittance template based on currency and subsidiary
    var remittance = SWEET.Remittance.findBySubsidiaryAndCurrency(nlapiGetFieldValue('subsidiary'), nlapiGetFieldValue('currency'));
    var remittanceId = remittance ? remittance.getId() : SWEET_DEFAULT_REMITTANCE_TEMPLATE;
    nlapiSetFieldValue('custbody_remit_template', remittanceId);
  }
}

/**
 * SaveRecord hook
 *
 * @return {Boolean}
 */
function localform_saveRecord() {
  return true;
}
