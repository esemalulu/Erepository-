/**
 * PageInit hook
 *
 */
function localform_pageInit() {

  // Disable name field
  nlapiDisableField('name', true);
}

/**
 * SaveRecord hook
 *
 * @return {Boolean}
 */
function localform_saveRecord() {

  // Client name is mandatory if Is Custom is checked
  if (nlapiGetFieldValue('custrecord_course_iscustom') == 'T' &&
      nlapiGetFieldValue('custrecord_course_clientname') == '') {
    alert('Please enter a Client Name. The Client Name field is mandatory when Is Custom is checked.');
    return false;
  }
  
  // Set name field
  nlapiDisableField('name', false);
  localform_updateNameField();
  
  return true;
}

/**
 * FieldChanged hook
 *
 * @param {String} type
 * @param {String} name
 * @return {Void}
 */
function localform_fieldChanged(type, name) {
  name = name.toLowerCase();
  
  switch (name) {
    case 'custrecord_course_displayname':
    case 'custrecord_course_clientname':
    case 'custrecord_course_language':
    case 'custrecord_course_group':
    case 'custrecord_course_iscustom':
      localform_updateNameField();
  }
}

function localform_updateNameField() {
  var name = new Array();
  var groupName = nlapiGetFieldText('custrecord_course_group');
  
  if (groupName) {
    name.push(groupName);
  }
  
  var isCustom = nlapiGetFieldValue('custrecord_course_iscustom') == 'T' ? true : false;
  var clientName = nlapiGetFieldValue('custrecord_course_clientname');
  if (isCustom && clientName) {
    name.push(clientName);
  }
  
  var displayName = nlapiGetFieldValue('custrecord_course_displayname');
  if (displayName) {
    name.push(displayName);
  }
  
  var languageName = nlapiGetFieldText('custrecord_course_language');
  if (languageName) {
    name.push(languageName);
  }
  
  if (name.length > 0) {
    nlapiSetFieldValue('name', name.join(', '));
  }
}
