/**
 * Helper functions for managing bookings using Job record
 *
 * @method jobBookingHelper
 * @param {Object} request
 * @param {Object} response
 */
function jobBookingHelper(request, response) {
  
  try {
    
    // Input validation
    var jobId = request.getParameter('jobid');
    if (!jobId) {
      throw nlapiCreateError('SWEET_JOB_ID_REQD', 'Job ID is required', true);
    }
    nlapiLogExecution('DEBUG', 'Var', 'jobId=' + jobId);
    
    var action = request.getParameter('action');
    if (!action) {
      throw nlapiCreateError('SWEET_JOB_ACTION_REQD', 'Action is required', true);
    }
    nlapiLogExecution('DEBUG', 'Var', 'action=' + action);
    
    // Handle action
    switch (action.toLowerCase()) {
      
      case 'prepack':
        var job = nlapiLoadRecord('job', jobId);
        job.setFieldValue('custentity_bo_isprepackshipped', 'T');
        var currentDate = new Date();
        job.setFieldValue('custentity_bo_prepackshippingdate', nlapiDateToString(currentDate));
        nlapiSubmitRecord(job);
        break;
        
      case 'pack':
        var job = nlapiLoadRecord('job', jobId);
        job.setFieldValue('custentity_bo_ispackshipped', 'T');
        job.setFieldValue('custentity_bo_isinproduction', 'T');
        var currentDate = new Date();
        job.setFieldValue('custentity_bo_packshippingdate', nlapiDateToString(currentDate));
        job.setFieldValue('custentity_bo_packproductiondate', nlapiDateToString(currentDate, 'datetimetz'));
        nlapiSubmitRecord(job);
        break;
        
      case 'deliver':
        var job = nlapiLoadRecord('job', jobId);
        job.setFieldValue('custentity_bo_isdelivered', 'T');
        var currentDate = new Date();
        job.setFieldValue('custentity_bo_deliverydate', nlapiDateToString(currentDate));
        nlapiSubmitRecord(job);
        break;
        
      case 'cancel':
        var job = nlapiLoadRecord('job', jobId);
        job.setFieldValue('custentity_bo_iscancelled', 'T');
        var currentDate = new Date();
        job.setFieldValue('custentity_bo_cancellationdate', nlapiDateToString(currentDate));
        nlapiSubmitRecord(job);
        break;
        
      case 'participants':
      
        // Display form
        var form = nlapiCreateForm('Participants Attendace');
        
        var textField1 = form.addField('custpage_step1', 'text', 'Instructions:');
        textField1.setDisplayType('inline');
        textField1.setDefaultValue('First add/remove participants to this event then come back here and mark this task as completed.');
        textField1.setLayoutType('startrow', 'startcol');
        
        // Add/Remove Participants button
        var url = nlapiResolveURL('SUITELET', 'customscript_pa_bulkentry_form', 'customdeploy_pa_bulkentry_form', null);
        url += '&jobid=' + jobId;
        var onClick = "window.open('" + url + "')"; // open in new window
        form.addButton('custpage_addremoveparticipants', 'Add/Remove Participants', onClick);
        
        // Completed button
        var url = nlapiResolveURL('SUITELET','customscript_job_booking_helper', 'customdeploy_job_booking_helper', false);
        url += '&action=participants-completed&jobid=' + jobId;
        var onClick = "window.location.href='" + url + "'";
        form.addButton('custpage_completed', 'Mark as Completed', onClick);
        
        // Go Back button
        var url = nlapiResolveURL('RECORD','job', jobId);
        var onClick = "window.location.href='" + url + "'";
        form.addButton('custpage_goback', 'Go Back', onClick);
        response.writePage(form);
        return; // Exit here
        
        break;
        
      case 'participants-completed':
        var job = nlapiLoadRecord('job', jobId);
        job.setFieldValue('custentity_bo_isparticipantscollected', 'T');
        var currentDate = new Date();
        job.setFieldValue('custentity_bo_participantscollectiondate', nlapiDateToString(currentDate));
        nlapiSubmitRecord(job);
        break;
        
      case 'imfeedback':

    var exturl = "https://admin.themindgym.com/surveys/110691333/collectors/new?booking_netsuite_id=" + jobId;
    var bookingurl = "https://system.sandbox.netsuite.com/app/common/entity/custjob.nl?id="+ jobId;
    var html = "<html>" 
    + "<script type='text/javascript'>"
    +" window.open('"+ exturl +"','_blank');"
    +"var myWindow = window.open('"+ bookingurl +"', '_self');"
    + "</script>"
    + "</html>";

    response.write(html);
        
   /*     // Display form

        // Load the job record
        var job = nlapiLoadRecord('job', jobId);
        var form = nlapiCreateForm('Immediate Feedback');
        
        var textField1 = form.addField('custpage_step1', 'text', 'Instructions:');
        textField1.setDisplayType('inline');
        textField1.setDefaultValue('Add all the immediate feedback to this booking then come back here and mark this task as completed.');
        textField1.setLayoutType('startrow', 'startcol');
        
        // Enter feedback
        var url = "https://admin.themindgym.com/surveys/110691333/collectors/new?booking_netsuite_id=" + jobId;
        var onClick = "window.open('" + url + "')"; // open in new window
        form.addButton('custpage_addimmediatefeedback', 'Enter Feedback', onClick);
        
        // Complete & Go back
        var url = nlapiResolveURL('RECORD','job', jobId);
        var onClick = "window.location.href='" + url + "'";
        form.addButton('custpage_closeimmediatefeedback', 'Complete', onClick);
        form.addButton('custpage_goback', 'Go Back', onClick);
        response.writePage(form);
        return; // Exit here */
        break;
        
      case 'online-completed':
        var job = nlapiLoadRecord('job', jobId);
        job.setFieldValue('custentity_bo_isonlineregistrations', 'T');
        var currentDate = new Date();
        job.setFieldValue('custentity_bo_onlineregistrationsdate', nlapiDateToString(currentDate));
        nlapiSubmitRecord(job);
        break;
      
      case 'elfeedback':
        var job = nlapiLoadRecord('job', jobId);
        job.setFieldValue('custentity_bo_iselfeedbackcollected', 'T');
        var currentDate = new Date();
        job.setFieldValue('custentity_bo_elfeedbackcollectiondate', nlapiDateToString(currentDate));
        nlapiSubmitRecord(job);
        break;
    }
   if(action != 'imfeedback'){ 
    // Redirect
    nlapiSetRedirectURL('RECORD', 'job', jobId);
   }
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Exception', e.toString());
    }
    throw e;
  }
}
