var SWEET_DOCUMENT_STANDARD_TERMS_AND_CONDITIONS_UK = '666520';
var SWEET_DOCUMENT_STANDARD_TERMS_AND_CONDITIONS_US = '2130871';
var SWEET_SUBSIDIARY_UK = '2';
var SWEET_SUBSIDIARY_US = '3';

/**
 * Refresh Terms and Conditions
 *
 */
function sweet_customer_lib_initTermsAndConditions()
{
  // Select default terms and conditions document
  sweet_customer_lib_setTermsAndConditionsDocument();
  
// Enable T&C fields if Administrator or Global/Client Team Director
  if (nlapiGetRole() == 3 || nlapiGetRole() == 1071) {
    nlapiDisableField('custentity_clifrm_agreedterms', false);
    nlapiDisableField('custentity_clifrm_manuallyagreedterms', false);
  }
  
  var termsAccepted = nlapiGetFieldValue('custentity_clifrm_agreedterms');
  if (termsAccepted == 'T') {
    nlapiDisableField('custentity_clifrm_manuallyagreedterms', true);
    nlapiDisableField('custentity_cli_termsdoc', true);
  }
}

/**
 * Set Terms and Conditions document
 *
 */
 function sweet_customer_lib_setTermsAndConditionsDocument()
{
  // Select default terms and conditions document
  var termsDocument = nlapiGetFieldValue('custentity_cli_termsdoc');
  var subsidiary = nlapiGetFieldValue('subsidiary');
 // if (!termsDocument) {
    switch (subsidiary) {
    case SWEET_SUBSIDIARY_UK: 
    nlapiSetFieldValue('custentity_cli_termsdoc', SWEET_DOCUMENT_STANDARD_TERMS_AND_CONDITIONS_UK);
    break
    case SWEET_SUBSIDIARY_US:
    nlapiSetFieldValue('custentity_cli_termsdoc', SWEET_DOCUMENT_STANDARD_TERMS_AND_CONDITIONS_US);
    break
    }
//  }
}