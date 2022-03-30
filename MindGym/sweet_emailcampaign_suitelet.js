/* Main function
*****************************************************************************/

/*
* Use a saved search to get a list of jobs that haven't had their email campaigns queued up
*
*/
function doSomething(request, response) {

  // Execute a saved search to jobs without email campaigns
  var job_list = nlapiSearchRecord('job', 'customsearch_job_emailcampaigns', null, null);

  response.writeLine("Found " + job_list.length + " jobs\n");

  for (var i = 0; (job_list != null) && (i < job_list.length); i++) {

    var job_id = job_list[i].getId();

    scheduleJobEmailCampaigns(job_id);

  }

}


/*
 * Create email campaigns based on a job
 *
 * @return void
*/
function scheduleJobEmailCampaigns(job_id) {

  if ((job_id == null) || (job_id.length == 0)) {
    nlapiLogExecution('DEBUG', 'job ID missing exception');
    response.writeLine('Missing job ID');
    return;
  }

  response.writeLine('Scheduling campaigns for Job : ' + job_id);

  // Load the job record
  var job_record = nlapiLoadRecord('job', job_id);

  // Get the course ID from the job
  var course_id = job_record.getFieldValue('custentity_bo_course');

  response.writeLine('Course ID : ' + course_id);

  // Get the list of email tasks assigned to this course
  var task_list = getCourseEmailTasks(course_id);

  // If there are no tasks assigned to the course then bail
  if (task_list.length == 0) {
      return false;
  }

  response.writeLine('Found ' + task_list.length + ' tasks');

  // Get the list of participants who attendend this job
  var participant_list = getJobParticipants(job_id);

  // If there are no participants entered for this job then bail
  if (task_list.length == 0) {
      return false;
  }

  response.writeLine('Found ' + participant_list.length + " particpiants\n");

  // Create a new email campaign for each task
  for (var i = 0; (task_list != null) && (i < task_list.length); i++) {

    var email_task = task_list[i];

    response.writeLine('Scheduling task : ' + task_list[i].getId());

    var campaign_id = createEmailCampaign(email_task, job_record);

    addCampaignRecipients(campaign_id, participant_list);

  }

  // todo: Mark the job as having all its emails queued up

  response.writeLine('Finished scheduling all campaigns');

}

/**
* Create an email campaign from a task for a particular job
*
* @param nlobjRecord email_task
  @param nlobjRecord job
*/
function createEmailCampaign(email_task, job) {

  // Get details from the task
  var task_days_offset = email_task.getValue('custrecord_emailtsk_dayoffset');
  var email_template_id = email_task.getValue('custrecord_emailtsk_emailtemplate');

  // Get the campaign send date
  var send_date = calculateCampaignSendDate(job.getFieldValue('enddate'), task_days_offset);

  // Create a new email campaign
  var new_campaign = nlapiCreateRecord('customrecord_emailcampaign');

  new_campaign.setFieldValue('custrecord_ecam_job', job.getId());
  new_campaign.setFieldValue('custrecord_ecam_senddate', send_date);
  new_campaign.setFieldValue('custrecord_ecam_emailtemplate', email_template_id);

  // Save the new campaign
  new_campaign_id = nlapiSubmitRecord(new_campaign, true);

  response.writeLine('Scheduled campaign : ' + new_campaign_id + ' to be sent at ' + send_date + "\n");

  return new_campaign_id;
}

/**
*  Add recipients to an email campaign
*
* @param integer campaign_id
* @param array recipient_list
*/
function addCampaignRecipients(campaign_id, participant_list) {

  if (participant_list.length == 0) {
    //throw an error
  }

  for (var i = 0; (participant_list != null) && (i < participant_list.length); i++) {

    var participant = participant_list[i];

    // Create a new email recipient
    var new_recipient = nlapiCreateRecord('customrecord_emailrecipient');

    new_recipient.setFieldValue('custrecord_emailrecip_emailcampaign', campaign_id);
    new_recipient.setFieldValue('custrecord_emailrecip_firstname', participant.getValue('custrecord_paat_participantfirstname'));
    new_recipient.setFieldValue('custrecord_emailrecip_lastname', participant.getValue('custrecord_paat_participantlastname'));
    new_recipient.setFieldValue('custrecord_emailrecip_email', participant.getValue('custrecord_paat_participantemail'));

    // todo: Need to some how mark the participant as having an email queued up for this campaign

    // Save the new recipient
    nlapiSubmitRecord(new_recipient, true);

  }

}

/**
*  Get the list of email tasks that are assigned a course
*
* @param integer course_id
*/
function getCourseEmailTasks(course_id) {

  var task_list = new Array();

  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_emailtsk_course', null, 'is', course_id);

  var columns = new Array();
  columns[0] = new nlobjSearchColumn('custrecord_emailtsk_sendorder');
  columns[1] = new nlobjSearchColumn('custrecord_emailtsk_emailtemplate');
  columns[2] = new nlobjSearchColumn('custrecord_emailtsk_dayoffset');

  // Search for all the tasks
  task_list = nlapiSearchRecord('customrecord_emailtask', null, filters, columns);

  return task_list;
}

/**
* Get a list of participants who attended a certain job
*
* @param integer job_id
*
*/
function getJobParticipants(job_id) {

  var participant_list = new Array();

  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custrecord_paat_job', null, 'is', job_id);

  var columns = new Array();
  columns[0] = new nlobjSearchColumn('custrecord_paat_participant');
  columns[1] = new nlobjSearchColumn('custrecord_paat_participantfirstname');
  columns[2] = new nlobjSearchColumn('custrecord_paat_participantlastname');
  columns[3] = new nlobjSearchColumn('custrecord_paat_participantemail');

  // Search for all the participants
  participant_list = nlapiSearchRecord('customrecord_participantattendance', null, filters, columns);

  return participant_list;

}

/**
* Calculate the date the campaign should be sent from the job date
*
* @params string job_date
* @params integer days_offset
* @return string
*/
function calculateCampaignSendDate(job_date_string, days_offset) {

  var current_date = new Date();
  var job_date = nlapiStringToDate(job_date_string);

  // Set the campaigns to always go out at 11am
  job_date.setHours(11, 00, 00);

  // Increment the job date by the offset
  var campaign_send_date = nlapiAddDays(job_date, days_offset);

  // Need to make sure the send date hasn't already passed
  if (current_date.getTime() > campaign_send_date.getTime()) {

    // If date has passed, schedule campaign from todays date
    campaign_send_date = nlapiAddDays(current_date, days_offset);

  }

  var campaign_send_date_string = campaign_send_date.getDate() + '/' + (campaign_send_date.getMonth()+1) + '/' + campaign_send_date.getFullYear();

  // Return the date as a string
  return campaign_send_date_string;
}