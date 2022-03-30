/**
* Before Submit
*
* @todo REFACTOR
* @return {Void}
*/
function userevent_beforeSubmit(type) {

if (type == 'xedit'){
  var newRecord = nlapiGetNewRecord();
  var fields = newRecord.getAllFields();
  var type = nlapiGetRecordType();
  var id = newRecord.getId();
  var record = nlapiLoadRecord(type , id);
  var isCustom = null, clientName = null,groupName = null,displayName = null, languageName = null;
  var isNameChange= true;
// Client name is mandatory if Is Custom is checked
  for (var i = 0; i < fields.length; i++){
        
    switch (fields[i]) {
      case 'custrecord_course_displayname':
        displayName = nlapiGetFieldValue('custrecord_course_displayname');
        break;
      case 'custrecord_course_clientname':
        clientName = nlapiGetFieldValue('custrecord_course_clientname');
        break;
      case 'custrecord_course_language':
        languageName = nlapiGetFieldText('custrecord_course_language');
        break;
      case 'custrecord_course_group':
        groupName = nlapiGetFieldText('custrecord_course_group');
        break;
      case 'custrecord_course_iscustom':
        isCustom = nlapiGetFieldValue('custrecord_course_iscustom') == 'T' ? true : false;
        break;
     case 'custrecord_course_expiry_date':
     case 'custrecord_course_isvirtual':
       isNameChange = false;
       break;
    }

 }

if(isNameChange){
  if(isCustom == null){
    isCustom = record.getFieldValue('custrecord_course_iscustom') == 'T' ? true : false;
  }
  if(clientName == null){
    clientName = record.getFieldValue('custrecord_course_clientname');
  }

  if (isCustom && (clientName == null || clientName == '')){

    throw nlapiCreateError('ERROR','Please enter a Client Name. The Client Name field is mandatory when Is Custom is checked.', true);

  }

// Modify Name field
  var name = new Array();
  if(groupName == null){
    groupName = record.getFieldText('custrecord_course_group');
  }
  if (groupName){
    name.push(groupName);
  }
  if (isCustom && clientName) {
    name.push(clientName);
  }
  if(displayName == null){
    displayName = record.getFieldValue('custrecord_course_displayname');
  }
  if (displayName) {
    name.push(displayName);
  }
  if(languageName == null){
    languageName = record.getFieldText('custrecord_course_language');
  }
  if (languageName) {
    name.push(languageName);
  }

  if (name.length > 0) {
    nlapiSetFieldValue('name', name.join(', '));
    //var submitRecordId = nlapiSubmitRecord(record, true);
  }
}
}
}
