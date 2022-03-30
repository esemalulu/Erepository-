var SGD_SUBSIDIARY_ID = '4';
var UAE_SUBSIDIARY_ID = '5';
/**
 * PageInit hook
 *
 */
function localform_pageInit() {
	var company = nlapiGetFieldValue('company');
	var type = nlapiGetRecordId() == '' ? 'create' : 'edit';
    if (company != null && company != '')
     {
       if (type == 'create')
        {
         // nlapiSetFieldValue('addr1', '');
         // nlapiSetFieldValue('addr2', '');

         nlapiSetFieldValue('defaultshipping', 'F');
         nlapiSetFieldValue('defaultbilling', 'F');
        }
     }

}
/**
 * SaveRecord hook
 *
 * @return bool
 */
function localform_saveRecord() {
  
	var type = nlapiGetRecordId() == '' ? 'create' : 'edit';
	var valid = true;
	  
  // Email is a required field when user enables Client Portal access
  var access = nlapiGetFieldValue('custentity_co_clientportal_access');
  if (access == 'T') {
    var email = nlapiGetFieldValue('email');
    if (!email) {
      alert('Please enter value(s) for: Email');
      valid = false;
    }
  }
  
  // Validate billing address
  if (type == 'create') {
    var returnObj = validateBillingAddressFields();
    if (returnObj.valid == false) {
      alert('Please add a billing address: ' + returnObj.invalidFields.join(', '));
      valid = false;
    }
  }
  
  return valid;
}

/**
 * Validate billing address fields
 *
 * @return {Object}
 */
function validateBillingAddressFields() {
  
  var returnObj = new Object();
  returnObj.valid = true;
  returnObj.invalidFields = new Array();
  
  // Is this a pop-up form?
  if (isPopup()) {
    var subsidiary = nlapiGetFieldValue('subsidiary');
    // Check address 1
    if (nlapiGetFieldValue('addr1') == '') {
      returnObj.valid = false;
      returnObj.invalidFields.push('Address 1');
    }
    
    // Check city
    if (nlapiGetFieldValue('city') == '') {
      returnObj.valid = false;
      returnObj.invalidFields.push('City');
    }
  
    // Check postcode/zip
    if(subsidiary != SGD_SUBSIDIARY_ID && subsidiary != UAE_SUBSIDIARY_ID){
    if (nlapiGetFieldValue('zip') == '') {
      returnObj.valid = false;
      returnObj.invalidFields.push('Postcode');
    }
    }
  
    // Check country
    if (nlapiGetFieldValue('country') == '') {
      returnObj.valid = false;
      returnObj.invalidFields.push('Country');
    }
  
    // Check county/state
    if(subsidiary != SGD_SUBSIDIARY_ID && subsidiary != UAE_SUBSIDIARY_ID){
    if (nlapiGetFieldValue('state') == '') {
      returnObj.valid = false;
      returnObj.invalidFields.push('County');
    }
    }
    
  } else {
    
    // Get the number of addresses
    var n = nlapiGetLineItemCount('addressbook');
  
    // Do we have 1 or more addresses?
    if (n < 1) {
      returnObj.valid = false;
      returnObj.invalidFields.push('Address 1');
      returnObj.invalidFields.push('City');
      returnObj.invalidFields.push('County');
      returnObj.invalidFields.push('Postcode');
      returnObj.invalidFields.push('Country');
      return returnObj; // No
    }
  
    // Do we have a billing address?
    var i = 1;
    n++;
    var defaultbilling = false;
    for (; i < n; i++) {
      var defaultbilling = nlapiGetLineItemValue('addressbook', 'defaultbilling', i);
      if (defaultbilling) {
        break; // Found it, let's break
      }
    }
  
    // Nope, did not find a billing address
    if (!defaultbilling) {
      returnObj.valid = false;
      returnObj.invalidFields = mandatoryFields;
      return returnObj;
    }
  
    // Yes, found one. Let's validate it...
  
    // Check address 1
    if (nlapiGetLineItemValue('addressbook', 'addr1', i) == '') {
      returnObj.valid = false;
      returnObj.invalidFields.push('Address 1');
    }
  
    // Check city
    if (nlapiGetLineItemValue('addressbook', 'city', i) == '') {
      returnObj.valid = false;
      returnObj.invalidFields.push('City');
    }
  
    // Check postcode/zip
    if (nlapiGetLineItemValue('addressbook', 'zip', i) == '') {
      returnObj.valid = false;
      returnObj.invalidFields.push('Postcode');
    }
  
    // Check country
    if (nlapiGetLineItemValue('addressbook', 'country', i) == '') {
      returnObj.valid = false;
      returnObj.invalidFields.push('Country');
    }
  
    // Check county/state
    if (nlapiGetLineItemValue('addressbook', 'state', i) == '') {
      returnObj.valid = false;
      returnObj.invalidFields.push('County');
    }
  }
  
  return returnObj;
}

/**
 * Get URL parameters
 *
 * @return {Object}
 */
function getUrlParameters() {
  var map = {};
  var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
    map[key] = value;
  });
  return map; 
}

/**
 * Test if the form is run in a pop-up window
 *
 * @return {Boolean}
 */
function isPopup() {
  var params = getUrlParameters();
  return params.parent ? true : false;
}
