/**
 * Credit Note Script
 *
 */

/**
 * Constants
 */
var UK_SUBSIDIARY_ID = '2';
var US_SUBSIDIARY_ID = '3';
var SG_SUBSIDIARY_ID = '4';
var UAE_SUBSIDIARY_ID = '5';

var UK_CREDITNOTE_FORM_ID = '105';
var US_CREDITNOTE_FORM_ID = '128';
var SG_CREDITNOTE_FORM_ID = '142';
var UAE_CREDITNOTE_FORM_ID = '144';


/**
 * Before loading invoice form
 *
 * @return {Void}
 */
function localform_pageInit(type) {
 
  // Check if the correct form is being used
  var subsidiary = nlapiGetFieldValue('subsidiary');
  var formID = nlapiGetFieldValue('customform');
  
  if ((subsidiary == UK_SUBSIDIARY_ID) && (formID != UK_CREDITNOTE_FORM_ID)) {
      nlapiSetFieldValue('customform', UK_CREDITNOTE_FORM_ID,false);
      return true;
  }
  
  if ((subsidiary == US_SUBSIDIARY_ID) && (formID != US_CREDITNOTE_FORM_ID)) {
      nlapiSetFieldValue('customform', US_CREDITNOTE_FORM_ID,false);
      return true;
  }

  if ((subsidiary == SG_SUBSIDIARY_ID) && (formID != SG_CREDITNOTE_FORM_ID)) {
      nlapiSetFieldValue('customform', SG_CREDITNOTE_FORM_ID,false);
      return true;
  }

  if ((subsidiary == UAE_SUBSIDIARY_ID) && (formID != UAE_CREDITNOTE_FORM_ID)) {
      nlapiSetFieldValue('customform', UAE_CREDITNOTE_FORM_ID,false);
      return true;
  }
}

/**
 * SaveRecord hook
 *
 * @return {Boolean}
 */
function localform_saveRecord() {
  
}


/**
 * FieldChanged hook
 *
 * @return {Void}
 */
function localform_fieldChanged(type, name, linenum) {
  
  
}

