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
      
      case 'create':
        //createEmailMessages();
        break;
        
      case 'delete':
        //deleteEmailMessages();
        break;
    }

  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Exception', e.toString());
    }
  }
  
  nlapiLogExecution('DEBUG', 'Function', 'End::userevent_beforeSubmit');
}

/**
 * Delete Email Messages that have NOT been sent
 */
/*
function deleteEmailMessages() {

  var oldRecord = nlapiGetOldRecord();

  // Find related records
  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_emailmsg_participant', null, 'is', oldRecord.getFieldValue('custrecord_paat_participant'));
  filters[1] = new nlobjSearchFilter('custrecord_emailmsg_emailmsgstatus', null, 'is', 1); // Not Sent

  var columns = new Array();
  columns[0] = new nlobjSearchColumn('internalId');

  var searchResults = nlapiSearchRecord('customrecord_emailmessage', null, filters, columns);

  if (!searchResults) {
    return; // None found, nothing to do
  }

  nlapiLogExecution('DEBUG', 'Info', 'Found ' + searchResults.length + ' Email Message records to delete');

  // Delete records
  var i = 0, n = searchResults.length;
  for (;i < n; i++) {
    nlapiDeleteRecord('customrecord_emailmessage', searchResults[i].getId());
  }
}
*/

/**
 * Create email messages based on the (job) course
 *
 */
/*
function createEmailMessages() {

  nlapiLogExecution('DEBUG', 'Creating new email message');

  var newRecord = nlapiGetNewRecord();

  // Get job and course info
  job = nlapiLoadRecord('job', newRecord.getFieldValue('custrecord_paat_job'));
  courseID = job.getFieldValue('custentity_bo_course');

  nlapiLogExecution('DEBUG', 'Job / Course', newRecord.getFieldValue('custrecord_paat_job') + '/' +  courseID);

  // Get the date the job is taking place
  jobDeliveryDate = nlapiStringToDate(job.getFieldValue('enddate'));

  if ((job != null) && (courseID.length > 0)) {

    // Get email tasks for the course
    emailTasks = getEmailTasksByCourse(courseID);

    for (var i = 0; i < emailTasks.length; i++) {

      var emailTask = emailTasks[i];

      nlapiLogExecution('DEBUG', 'Creating email', newRecord.getFieldValue('custrecord_paat_email'));

      // Create email message
      var emailMsg = nlapiCreateRecord('customrecord_emailmessage');

      // Set all the fields for the new email
      emailMsg.setFieldValue('custrecord_emailmsg_job', newRecord.getFieldValue('custrecord_paat_job'));
      emailMsg.setFieldValue('custrecord_emailmsg_emailtask', emailTask.getId());
      emailMsg.setFieldValue('custrecord_emailmsg_firstname', newRecord.getFieldValue('custrecord_paat_firstname'));
      emailMsg.setFieldValue('custrecord_emailmsg_lastname', newRecord.getFieldValue('custrecord_paat_lastname'));
      emailMsg.setFieldValue('custrecord_emailmsg_email', newRecord.getFieldValue('custrecord_paat_email'));
      emailMsg.setFieldValue('custrecord_emailmsg_participant', newRecord.getFieldValue('custrecord_paat_participant'));
      emailMsg.setFieldValue('custrecord_emailmsg_emailtemplate', emailTask.getValue('custrecord_emailtsk_emailtemplate'));

      // Get custom fields for the participant
      emailMsg.setFieldValue('custrecord_emailmsg_customfields', getEmailMessageCustomField(newRecord.getFieldValue('custrecord_paat_participant')));

      // Calculate the send date for the email message
      var emailTaskDayOffset = emailTask.getValue('custrecord_emailtsk_dayoffset')
      var sendDate = calculateEmailSendDate(jobDeliveryDate, emailTaskDayOffset);
      emailMsg.setFieldValue('custrecord_emailmsg_senddate', sendDate.format("dd/mm/yyyy"));
      nlapiLogExecution('DEBUG', 'Send date', sendDate.format("dd/mm/yyyy"));

      // Save the new record
      nlapiSubmitRecord(emailMsg);

    }

    nlapiLogExecution('DEBUG', 'Created email messages', emailTasks.length);

  }
}
*/
