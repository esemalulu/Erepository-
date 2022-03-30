/**
 * After Submit event
 *
 * @param {String} type
 */
function userevent_afterSubmit(type)
{
  nlapiLogExecution('DEBUG', 'Function', 'Start::userevent_afterSubmit');
  
  try {
    switch (type.toLowerCase()) {
      case 'edit':
        // Update records relating to the participant
        sweet_updateRelatedRecords();
        break;
    }
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Exception', e.toString());
    }
    throw e;
  }
  
  nlapiLogExecution('DEBUG', 'Function', 'End::userevent_afterSubmit');
}

/**
 * Update related records if fields have been modified
 *
 * Child records:
 *
 *   Participant Attendance
 *   Email Message
 *
 * @todo Monitor usage limit to prevent script to exit unexpectically 
 */
function sweet_updateRelatedRecords()
{
  nlapiLogExecution('DEBUG', 'Function', 'Start::sweet_updateRelatedRecords');
  
  // Get all modified fields
  var newRecord = nlapiGetNewRecord();
  var fields = newRecord.getAllFields();
  var update = false;
  
  // Have any 'interesting' fields been changed?
  var i = 0, n = fields.length;
  outer_loop:
  for (;i < n; i++) {
    switch (fields[i]) {
      case 'custrecord_pa_firstname':
      case 'custrecord_pa_lastname':
      case 'custrecord_pa_email':
        update = true;
        break outer_loop;
    }
  }
  
  if (!update) {
    return; // Nope, nothing to do
  }
  
  // UPDATE PARTICIPANT ATTENDANCE
  
  // Find related records
  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_paat_participant', null, 'is', newRecord.getId());
  
  var columns = new Array();
  columns[0] = new nlobjSearchColumn('internalId');
  
  var searchResults = nlapiSearchRecord('customrecord_participantattendance', null, filters, columns);
  
  if (searchResults && searchResults.length > 0) {
    nlapiLogExecution('DEBUG', 'Info', 'Found ' + searchResults.length + ' Participant Attendance records to update');
    
    // Update records
    var i = 0, n = searchResults.length;
    for (;i < n; i++) {
      var attendanceRecord = nlapiLoadRecord('customrecord_participantattendance', searchResults[i].getId());
      attendanceRecord.setFieldValue('custrecord_paat_firstname', newRecord.getFieldValue('custrecord_pa_firstname'));
      attendanceRecord.setFieldValue('custrecord_paat_lastname', newRecord.getFieldValue('custrecord_pa_lastname'));
      attendanceRecord.setFieldValue('custrecord_paat_email', newRecord.getFieldValue('custrecord_pa_email'));
      nlapiSubmitRecord(attendanceRecord);
    }
  }
  
  // UPDATE EMAIL MESSAGE (Only update messages that has NOT been sent)
  
  // Find related records
  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_emailmsg_participant', null, 'is', newRecord.getId());
  //filters[1] = new nlobjSearchFilter('custrecord_emailmsg_emailmsgstatus', null, 'is', 1); // Not Sent
  
  var columns = new Array();
  columns[0] = new nlobjSearchColumn('internalId');
  
  var searchResults = nlapiSearchRecord('customrecord_emailmessage', null, filters, columns);
  
  if (searchResults && searchResults.length > 0) {
    nlapiLogExecution('DEBUG', 'Info', 'Found ' + searchResults.length + ' Email Message records to update');
    
    // Update records
    var i = 0, n = searchResults.length;
    for (;i < n; i++) {
      try {
        var emailMsgRecord = nlapiLoadRecord('customrecord_emailmessage', searchResults[i].getId());     
        emailMsgRecord.setFieldValue('custrecord_emailmsg_firstname', newRecord.getFieldValue('custrecord_pa_firstname'));
        emailMsgRecord.setFieldValue('custrecord_emailmsg_lastname', newRecord.getFieldValue('custrecord_pa_lastname'));
        emailMsgRecord.setFieldValue('custrecord_emailmsg_email', newRecord.getFieldValue('custrecord_pa_email'));
        nlapiSubmitRecord(emailMsgRecord);
      } catch (e) {
        // Ignore
      }
    }
  }
  
  nlapiLogExecution('DEBUG', 'Function', 'End::sweet_updateRelatedRecords');
}
