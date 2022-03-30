/**
 * Job eprompt script
 *
 * Schedule email eprompts based on jobs
 *
 */

/**
 * SweetScriptScheduled Class
 *
 */
var SweetScriptScheduled = function() {
  this.mailClient = new SWEET.REST.Client('http://community.themindgym.com/mail-api');
  this.b2cClient = new SWEET.REST.Client('http://community.themindgym.com/api');
  this.b2cClient.setAPIKey('284533A693EAD512E158D794120109A125672A8A');
  this.log = new Array();
  this.debug = true;
  
  this._log = function(message) {
    this.log.push(message);
    nlapiLogExecution('DEBUG', 'Info', message);
  }
  
  this._exit = function() {
    this._log('End of script');
    if (this.debug) {
      var subject = '[NetSuite] Debug log';
      var body = this.log.join('\n');
      this._sendEmailAlert(subject, body);
    }
  }
  
  /**
   * Run script
   *
   * @return void
   */
  this.run = function() {
    this._log('Start of script');
    var context = nlapiGetContext();
    var startTime = new Date().getTime();
    
    // Get jobs pending emails
    var jobId = context.getSetting('SCRIPT', 'custscript_mail_job');
    var jobs = jobId ? this._getSingleJob(jobId) : this._getJobsPendingEmails();
    
    var i = 0, n = jobs.length;
    for (; i < n; i++) {
      var jobId = jobs[i].getId();
      this._log('Processing job: ' + jobId + ' @ ' + jobs[i].getValue('enddate'));
      
      // Check script usage
      var remainingUsage = context.getRemainingUsage();
      this._log('Remaining usage: ' + remainingUsage);
      var nowTime = new Date().getTime();
      var elapsedTime = ((nowTime - startTime) / 1000); // in seconds
      this._log('Time elapsed: ' + elapsedTime);
      if (remainingUsage < 2000 || elapsedTime > 360) { // Less than 2000 credits or more than 6 minutes
        this._log('Close to maximum usage - Reschedule script');
        
        // Below threshold - reschedule script
        var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId())
        var subject = '[NetSuite] Script rescheduled - ' + status;
        var body = 'Processed ' + i + ' of ' + n + ' jobs.';
        this._sendEmailAlert(subject, body);
        this._exit();
        return;
      }
      
      // Control check 1: Does this job have any existing campaigns?
      var campaigns = this._getEmailCampaigns(jobId);
      if (campaigns.length > 0) {
        this._log('Found ' + campaigns.length + ' existing campaigns - Skip job');
        var subject = '[NetSuite] Eprompt Error';
        var body = 'Found existing campaigns when processing job: ' + jobId;
        this._sendEmailAlert(subject, body);
        continue; // Skip this job
      }
      
      // Control check 2: Does this job have any existing messages?
      var messages = this._getEmailMessages(jobId);
      if (messages.length > 0) {
        this._log('Found ' + messages.length + ' existing messages - Skip job');
        var subject = '[NetSuite] Eprompt Error';
        var body = 'Found existing messages when processing job: ' + jobId;
        this._sendEmailAlert(subject, body);
        continue; // Skip this job
      }
      
      // Control check 3: Does this course have any eprompt tasks?
      var courseId = jobs[i].getValue('custentity_bo_course');
      var tasks = this._getEmailTasksByCourse(courseId);
      if (tasks.length < 1) {        
        this._log('Could not find any eprompt tasks associated with course: ' +  courseId + ' - Skip job');
        var subject = '[NetSuite] Eprompt Error';
        var body = 'Could not find any eprompts tasks associated with course when processing job: ' + jobId;
        this._sendEmailAlert(subject, body);
        continue; // Skip this job
      }
      
      // Control check 4: Does this job have any participants?
      var attendance = this._getParticipantAttendanceByJob(jobId);
      if (attendance.length < 1) {
        this._log('Could not find any participants - Skip job');
        var subject = '[NetSuite] Eprompt Error';
        var body = 'Could not find any participants when processing job: ' + jobId;
        this._sendEmailAlert(subject, body);
        continue; // Skip this job
      }
      
      // Create campaigns
      this._log('Create campaigns');
      var ret = this._createEmailCampaigns(jobs[i], tasks);
      var campaigns = ret.campaigns;
      var templates = ret.templates;
      
      // Schedule messages
      this._log('Schedule messages');
      this._createEmailMessages(jobs[i].getId(), campaigns, templates, attendance);
      
      // Activate campaigns
      //this._log('Activate campaigns');
      //this._activateEmailCampaigns(campaigns);
      
      // Update eprompt status as completed
      this._log('Set job eprompt status to completed');
      this._setEpromptStatusToCompleted(jobId);
    }
    
    var subject = 'Eprompt Script Summary';
    var body = 'Processed ' + i + ' of ' + n + ' jobs.';
    this._sendEmailAlert(subject, body);
    this._exit();
  }
  
  /**
   * Get jobs pending emails
   *
   * @return {Array}
   */
  this._getJobsPendingEmails = function() {
    var filters = new Array();
    filters.push(new nlobjSearchFilter('custentity_bo_isepromptsent', null, 'is', 'F'));
    filters.push(new nlobjSearchFilter('enddate', null, 'onorafter', nlapiDateToString(new Date('2009/08/01'))));
    filters.push(new nlobjSearchFilter('custentity_bo_iscancelled', null, 'is', 'F'));
    filters.push(new nlobjSearchFilter('custentity_bo_optonlineregistrations', null, 'is', 'T')); // Eprompts Option
    filters.push(new nlobjSearchFilter('custentity_bo_isonlineregistrations', null, 'is', 'T')); // Email Addresses Entered
    
    var columns = new Array();
    columns.push(new nlobjSearchColumn('internalId'));
    columns.push(new nlobjSearchColumn('custentity_bo_course'));
    columns.push(new nlobjSearchColumn('enddate'));
    
    var result = nlapiSearchRecord('job', null, filters, columns);
    return (result ? result : new Array());
  }
  
  /**
   * Get single jobs for processig
   *
   * @return {Array}
   */
  this._getSingleJob = function(internalId) {
    var filters = new Array();
    filters.push(new nlobjSearchFilter('internalId', null, 'is', internalId));
    
    var columns = new Array();
    columns.push(new nlobjSearchColumn('internalId'));
    columns.push(new nlobjSearchColumn('custentity_bo_course'));
    columns.push(new nlobjSearchColumn('enddate'));
    
    var result = nlapiSearchRecord('job', null, filters, columns);
    return (result ? result : new Array());
  }
  
  /**
   * Get email campaigns
   *
   * @param {String} jobId
   * @return {Array}
   */
  this._getEmailCampaigns = function(jobId) {
    var filters = new Array();
    filters.push(new nlobjSearchFilter('custrecord_ecam_job', null, 'is', jobId));
    
    var columns = new Array();
    columns.push(new nlobjSearchColumn('internalId'));
    
    var result = nlapiSearchRecord('customrecord_emailcampaign', null, filters, columns);
    return (result ? result : new Array());
  }
  
  /**
   * Get email messages
   *
   * @param {String} jobId
   * @return {Array}
   */
  this._getEmailMessages = function(jobId) {
    var filters = new Array();
    filters.push(new nlobjSearchFilter('custrecord_emailmsg_job', null, 'is', jobId));
    
    var columns = new Array();
    columns.push(new nlobjSearchColumn('internalId'));
    
    var result = nlapiSearchRecord('customrecord_emailmessage', null, filters, columns);
    return (result ? result : new Array());
  }
  
  /**
   * Get email tasks by course
   * 
   * @param {String} courseId
   * @return {Array}
   */
  this._getEmailTasksByCourse = function(courseId) {
    var filters = new Array();
    filters.push(new nlobjSearchFilter('custrecord_emailtsk_course', null, 'is', courseId));
    
    var result = nlapiSearchRecord('customrecord_emailtask', '225', filters, null);
    return (result ? result : new Array());
  }
  
  /**
   * Get participant attendance by job
   *
   * @param {String} jobId
   * @return {Array}
   */
  this._getParticipantAttendanceByJob = function(jobId) {
    var filters = new Array();
    filters.push(new nlobjSearchFilter('custrecord_paat_job', null, 'is', jobId));
    filters.push(new nlobjSearchFilter('custrecord_paat_isepromptsent', null, 'is', 'F'));
    
    var columns = new Array();
    columns.push(new nlobjSearchColumn('custrecord_paat_participant'));
    columns.push(new nlobjSearchColumn('custrecord_paat_firstname'));
    columns.push(new nlobjSearchColumn('custrecord_paat_lastname'));
    columns.push(new nlobjSearchColumn('custrecord_paat_email'));
    
    var result = nlapiSearchRecord('customrecord_participantattendance', null, filters, columns);
    return (result ? result : new Array());
  }
  
  /**
   * Create B2C User
   * 
   * @param {Object} participant
   * @return {Object}
   */
  this._createB2CUser = function(participant) {
  
    // Create B2B user record
    var user = new SWEET.B2C.User();
    user.cortexid = participant.getId();
    user.firstname = participant.getFieldValue('custrecord_pa_firstname');
    user.lastname = participant.getFieldValue('custrecord_pa_lastname');
    user.emailaddress = participant.getFieldValue('custrecord_pa_email');
    
    var response = this.b2cClient.create('users', user);
    
    // Update participant record
    participant.setFieldValue('custrecord_pa_b2cid', response.id);   
    participant.setFieldValue('custrecord_pa_emailcode', response.emailcode);
    
    // In some cases the email might already be registered, if so,
    // we need to update these additional details.
    var isEnabled = isEnabled = (user.enabled ? true : false);
    if (isEnabled) {
      participant.setFieldValue('custrecord_pa_b2cenabled', 'T');
      participant.setFieldValue('custrecord_pa_cortexid', user.cortexid);
    }
    
    nlapiSubmitRecord(participant);
    return response;
  }
  
  /**
   * Test if participant's B2C user account is enabled
   * 
   * @param {Object} participant
   * @return {Boolean}
   */
  this._isEnabledOnB2C = function(participant) {
    var isEnabled = (participant.getFieldValue('custrecord_pa_b2cenabled') == 'T');
    if (isEnabled) {
      return true;
    }
    
    // Get user record from B2C webservice
    var userId = participant.getFieldValue('custrecord_pa_b2cid');
    var user = this.b2cClient.show('user', userId);
    isEnabled = (user.enabled ? true : false);
    
    if (!isEnabled) {
      return false;
    }
    
    // Update participant record
    participant.setFieldValue('custrecord_pa_b2cenabled', 'T');
    nlapiSubmitRecord(participant);
    return true;
  }
  
  /**
   * Test if participant is registered on B2C
   * 
   * @param {Object} participant
   * @return {Boolean}
   */
  this._isRegisteredOnB2C = function(participant) {
    var isRegistered = (participant.getFieldValue('custrecord_pa_b2cid') ? true : false);
    return isRegistered;
  }

  /**
   * Return current time in GMT
   *
   * @return {Date}
   */
  this._getNowDate = function() {
    var nowDate = new Date();
    nowDate = nowDate.toGMTString(); // Convert to GMT
    nowDate = new Date(nowDate);
    return nowDate;
  }
  
  /**
   * Return send date in GMT
   *
   * @param {Date} eventDate
   * @param {Integer} offset
   * @return {Date}
   */
  this._getSendDate = function(eventDate, offset) {
    var today = new Date();
    var sendDate = eventDate;
    
    // Check if delivery date is still in the future
    // Note: error due to timezones is possible
    if (eventDate <= today) {
      sendDate = today;
    }
    
    // Don't allow negative offsets
    if (offset < -1) {
      offset = 0;
    }
    
    // Add the offset to the send date
    sendDate = nlapiAddDays(sendDate, offset);
    
    // Convert to GMT
    sendDate = sendDate.toGMTString();
    sendDate = new Date(sendDate);
    
    return sendDate;
  }
  
  /**
   * Create email campaigns
   *
   * @param {Object} job
   */
  this._createEmailCampaigns = function(job, tasks) {
    var returnObj = new Object();
    returnObj.templates = new Array();
    returnObj.campaigns = new Array();
    var jobId = job.getId();
    var eventDate = nlapiStringToDate(job.getValue('enddate'));
    
    var j = 0, m = tasks.length;
    for (; j < m; j++) {
      var taskId = tasks[j].getId();
      
      // Prepare template
      var templateId = tasks[j].getValue('custrecord_emailtsk_emailtemplate');
      var template = nlapiLoadRecord('customrecord_emailtemplate', templateId);
      var html = template.getFieldValue('custrecord_emailtpl_html');
      returnObj.templates.push(template);
      
      // Prepare dates
      var offset = tasks[j].getValue('custrecord_emailtsk_dayoffset');
      var nowDate = this._getNowDate();
      var sendDate = this._getSendDate(eventDate, offset);
      
      // Create email campaign
      var campaign = nlapiCreateRecord('customrecord_emailcampaign');
      campaign.setFieldValue('custrecord_ecam_job', jobId);
      campaign.setFieldValue('custrecord_ecam_emailtask', taskId);
      campaign.setFieldValue('custrecord_ecam_emailtemplate', templateId);
      campaign.setFieldValue('custrecord_ecam_senddate', nlapiDateToString(sendDate));
      
      // Create mail job
      var mailJob = new SWEET.mail.Job();
      mailJob.subject = template.getFieldValue('custrecord_emailtpl_subject'); 
      mailJob.sender = SWEET.HTML.entity_decode(template.getFieldValue('custrecord_emailtpl_from'));
      var replyTo = template.getFieldValue('custrecord_emailtpl_replyto');
      if (replyTo) {
        mailJob.replyTo = SWEET.HTML.entity_decode(replyTo);
      }
      mailJob.body = template.getFieldValue('custrecord_emailtpl_plaintext');
      mailJob.html = html;
      mailJob.scheduledAt = sendDate.format('Y-m-d H:i:s');
      mailJob.createdAt = nowDate.format('Y-m-d H:i:s');
      var response = this.mailClient.create('jobs', mailJob);
      var mailJobId = response.id;
      campaign.setFieldValue('custrecord_ecam_mailjobid', mailJobId);
      this._log('New mail.Job: ' + mailJobId);
      if (!mailJobId) {
        throw nlapiCreateError('SWEET_CREATE_MAILJOB_FAILED', 'Failed to create mail job.');
      }
      
      // Create mail queue
      var mailQueue = new SWEET.mail.Queue();
      mailQueue.jobId = mailJobId;
      mailQueue.createdAt = nowDate.format('Y-m-d H:i:s');
      mailQueue.status = 'ACTIVE';
      var response = this.mailClient.create('queues', mailQueue);
      var mailQueueId = response.id;
      campaign.setFieldValue('custrecord_ecam_mailqueueid', mailQueueId);
      this._log('New mail.Queue: ' + mailQueueId);
      if (!mailQueueId) {
        throw nlapiCreateError('SWEET_CREATE_MAILQUEUE_FAILED', 'Failed to create mail queue.');
      }
      
      // Save email campaign record
      var campaignId = nlapiSubmitRecord(campaign);
      campaign.setFieldValue('id', campaignId);
      returnObj.campaigns.push(campaign);
    }
    
    // Return campaigns and templates
    return returnObj;
  }
  
  /**
   * Create email messages
   *
   * @param {String} jobId
   * @param {Array} campaigns
   * @param {Array} templates
   * @param {Array} attendance
   * @return void
   */
  this._createEmailMessages = function(jobId, campaigns, templates, attendance) {
    var i = 0, n = attendance.length;
    for (; i < n; i++) {
      var participantId = attendance[i].getValue('custrecord_paat_participant');
      
      // Load participant record
      var participant = nlapiLoadRecord('customrecord_participant', participantId);
      var firstName = participant.getFieldValue('custrecord_pa_firstname');
      var lastName = participant.getFieldValue('custrecord_pa_lastname');
      var email = participant.getFieldValue('custrecord_pa_email');
      var b2cId = participant.getFieldValue('custrecord_pa_b2cid');
      this._log('Processing participant: ' + participantId + ' <' + firstName + ' ' + lastName + '> ' + email);
      
      if (!firstName) {
        this._log('First name is missing - Skip participant');
        continue;
      }
      
      if (!lastName) {
        this._log('Last name is missing - Skip participant');
        continue;
      }
      
      if (!email) {
        this._log('Emali is missing - Skip participant');
        continue;
      }
      
      // Should we create B2C user account?
      if (!this._isRegisteredOnB2C(participant)) {
        var b2cUser = this._createB2CUser(participant);
        b2cId = b2cUser.id;
      }
      
      // Is B2C ID missing?
      if (!b2cId) {
        var subject = 'B2C ID is missing';
        var body = 'Participant #' + participantId;
        this._sendEmailAlert(subject, body);
        continue; // Skip this participant
      }
      
      // Create a message for each campaign
      var j = 0, m = campaigns.length;
      for (; j < m; j++) {
        
        // Prepare dates
        var nowDate = this._getNowDate();
        var sendDate = nlapiStringToDate(campaigns[j].getFieldValue('custrecord_ecam_senddate'));
        
        // Build custom data
        var customData = new Array();
        var custom1 = templates[j].getFieldValue('custrecord_emailtpl_custom1');
        if (custom1) {
          var emailCode = this._createEmailCode(b2cId);
          customData['link'] = custom1.replace(/\[%emailCode%\]/gi, emailCode);
        }
        
        // Create mail message
        var mailMessage = new SWEET.mail.Message();
        mailMessage.queueId = campaigns[j].getFieldValue('custrecord_ecam_mailqueueid');
        mailMessage.fullName = firstName + ' ' + lastName;
        mailMessage.email = email;
        if (customData) {
          mailMessage.customData = SWEET.PHP.serialize(customData);
        }
        mailMessage.scheduledAt = sendDate.format('Y-m-d H:i:s');
        mailMessage.createdAt = nowDate.format('Y-m-d H:i:s');
        var response = this.mailClient.create('messages', mailMessage);
        var mailMessageId = response.id;
        if (!mailMessageId) {
          throw nlapiCreateError('SWEET_CREATE_MAILMESSAGE_FAILED', 'Failed to create mail message.');
        }
        
        // Save email message record
        var message = nlapiCreateRecord('customrecord_emailmessage');
        message.setFieldValue('custrecord_emailmsg_job', jobId);
        message.setFieldValue('custrecord_emailmsg_emailtask', campaigns[j].getFieldValue('custrecord_ecam_emailtask'));
        message.setFieldValue('custrecord_emailmsg_emailcampaign', campaigns[j].getFieldValue('id'));
        message.setFieldValue('custrecord_emailmsg_firstname', firstName);
        message.setFieldValue('custrecord_emailmsg_lastname', lastName);
        message.setFieldValue('custrecord_emailmsg_email', email);
        message.setFieldValue('custrecord_emailmsg_participant', participantId);
        message.setFieldValue('custrecord_emailmsg_senddate', nlapiDateToString(sendDate));
        message.setFieldValue('custrecord_emailmsg_emailtemplate', templates[j].getId());
        message.setFieldValue('custrecord_emailmsg_customfields', mailMessage.customData);
        message.setFieldValue('custrecord_emailmsg_mailmessageid', mailMessageId);
        nlapiSubmitRecord(message);
      }
      
      // Update participant attendance record
      var fields = new Array();
      fields.push('custrecord_paat_isepromptsent');
      fields.push('custrecord_paat_epromptsenddate');
      var values = new Array()
      values.push('T');
      values.push(nlapiDateToString(sendDate));
      nlapiSubmitField(attendance[i].getRecordType(), attendance[i].getId(), fields, values);
    }
  }
  
  /**
   * Activate email campaigns
   *
   * @param {Array} campaigns
   * @return void
   */
  this._activateEmailCampaigns = function(campaigns) {
    var i = 0, n = campaigns.length;
    for (; i < n; i++) {
      var mailQueue = new SWEET.mail.Queue();
      mailQueue.id = campaigns[i].getFieldValue('custrecord_ecam_mailqueueid');
      mailQueue.status = 'ACTIVE';
      var response = this.mailClient.edit('queues', mailQueue.id, mailQueue);
    }
  }
  
  /**
   * Set job eprompt status to completed
   *
   * @param {String} jobId
   * @return void
   */
  this._setEpromptStatusToCompleted = function(jobId) { 
    var fields = new Array();
    fields.push('custentity_bo_isepromptsent');
    fields.push('custentity_bo_epromptsenddate');
    var values = new Array()
    values.push('T');
    values.push(nlapiDateToString(this._getNowDate()));
    nlapiSubmitField('job', jobId, fields, values);
  }
  
  /**
   * Send email alert
   *
   * @param {String} subject
   * @param {String} body
   */
  this._sendEmailAlert = function(subject, body) {
    var employeeId = '2'; // Andre Borgstrom
    nlapiSendEmail(employeeId, employeeId, subject, body);
  }
  
  /**
   * Create email code by obfuscating the B2C ID
   *
   * The computer security is weak but due to legacy code it difficult to
   * make it stronger without refactoring the whole registration process.
   * 
   * @param {String} b2cId
   * @return {String}
   */
  this._createEmailCode = function(b2cId) {
    return ('$' + SWEET.Base64.encode(b2cId).strtr('+/=', '-_,'));
  }
}

/**
 * Main
 */
function main_scheduled() {
  var script = new SweetScriptScheduled();
  script.run();
}
