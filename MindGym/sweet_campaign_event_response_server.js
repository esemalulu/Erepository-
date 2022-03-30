/**
 * After Submit
 *
 * @return {Void}
 */
function userevent_afterSubmit(type) {
  type = type.toLowerCase();
  
  switch (type) {
    case 'edit':
      // if status is "Event - Signed Up"
      if (nlapiGetFieldValue('custrecord_cer_status') == 2) {
        
        //create new task record
        var task = nlapiCreateRecord('task');
        
        //retrieve today's date and calculate due date
        var currentTime = new Date();
        var dueDate = nlapiAddDays(currentTime, 2)
        
        //get contact and company id
        var contact = nlapiGetFieldValue('custrecord_cer_contact'); 
        var contactRecord = nlapiLoadRecord('contact', contact);
        var company = contactRecord.getFieldValue('company');
        
        //set the values of the task record
        task.setFieldValue('title', 'Follow Up');
        task.setFieldValue('owner', -5);
        task.setFieldValue('assigned', 64980);
        task.setFieldValue('startdate', nlapiDateToString(currentTime));
        task.setFieldValue('duedate', nlapiDateToString(dueDate));
        task.setFieldValue('priority', 'MEDIUM');
        task.setFieldValue('status', 'NOTSTART');
        task.setFieldValue('company', company);
        task.setFieldValue('contact', contact);
        task.setFieldValue('custevent_task_campaigneventresponse', nlapiGetFieldValue('id'));
        
        try {
          if (company != null) {
            var taskID = nlapiSubmitRecord(task, true);
            nlapiLogExecution('DEBUG', 'task record created successfully', 'ID = ' + taskID);
          }
        }
        catch(e) {
          nlapiLogExecution('ERROR', e.getCode(), e.getDetails());
        }         
      }
      else {
        nlapiLogExecution('DEBUG', 'task record is not created, status is ' + nlapiGetFieldValue('custrecord_cer_status'));
      }     
      break;
  }
}