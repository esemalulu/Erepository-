/**
 * Send email notification to coach after pack has been shipped
 */

var SWEET_SUBSIDIARY_UK = '2';

/**
 * Main
 *
 */
function main_scheduled() {

  var script = new SweetScriptScheduled();
  script.run();
}

/**
 * SweetScriptScheduled Class
 *
 */
var SweetScriptScheduled = function() {
  
  this.log = new Array();
  this.reschedule = false;
  this.emailAuthorId = '-5'; // The Mind Gym
  this.scriptOwner = '2'; // Andre Borgstrom
  this.action = undefined;
  this.name = "Coach Pack Email";
  this.context = undefined;
  
  this._log = function(message) {
    this.log.push(message);
    nlapiLogExecution('DEBUG', 'Info', message);
  }
  
  /**
   * Start hook
   *
   * @return void
   */
  this._start = function() {
    this._log('Start of script');
  }
  
  /**
   * End hook
   *
   * @return void
   */
  this._end = function() {
    this._log('End of script');
    if (this.context.getLogLevel() == 'DEBUG') {
      var subject = '[NetSuite] ' + this.name;
      var body = this.log.join('\n');
      this._sendEmail(this.emailAuthorId, this.scriptOwner, subject, body);
    }
  }
  
  /**
   * Run script
   *
   * @return void
   */
  this.run = function() {
    this._start();
    
    this.context = nlapiGetContext();
    var startTime = new Date().getTime();
    
    var jobs = this._findJobs();
    
    // Do we have any jobs?
    if (!jobs) {
      
      // No, exit the script
      this._log('Found no jobs to process.');
      this._end();
      return;
    }
    
    // Yes, process the jobs
    var n = jobs.length;
    this._log('Found ' + n + ' jobs to process.');
    var i = 0;
    for (; i < n; i++) {        
      var jobId = jobs[i].getId();
      this._log('Processing job: ' + jobId);
      
      // Check script usage
      var remainingUsage = this.context.getRemainingUsage();
      this._log('Remaining usage: ' + remainingUsage);
      var nowTime = new Date().getTime();
      var elapsedTime = ((nowTime - startTime) / 1000); // in seconds
      this._log('Time elapsed: ' + elapsedTime);
      
      // Are we running out of credits?
      if (remainingUsage < 500 || elapsedTime > 360) {
        
        // Yes, let's exit
        this._log('Script ran out of credits');
        this._end();
        return;
      }
      
      // Send the email and update the flag on the job
      try {
        
        // Load job record
        this._log('Load job record');
        var job = nlapiLoadRecord('job', jobId);
        var courseName = job.getFieldText('custentity_bo_course');
        var eventDate = job.getFieldValue('enddate');
        
        // Load coach record
        this._log('Load coach record');
        var coachId = job.getFieldValue('custentity_bo_coach');
        var coach = nlapiLoadRecord('vendor', coachId);
        var coachFirstName = coach.getFieldValue('firstname');
        
        // Send email
        var subject = "Coaches Materials sent: " + courseName + " taking place on the " + eventDate;
        var body = new Array();
        body.push("Dear " + coachFirstName + ",\n\n");
        body.push("Your materials for " + courseName + " taking place on the " + eventDate + " have been sent.\n\n");
        body.push("Please expect delivery in the next 2-3 days. If you have not received your package or a pick-up card from the sorting office after this time then please get in touch with us.\n\n");
        body.push("If the coaches materials have been changed or this is the first time that you are delivering this session then you will receive an email within the next 48 hours with a link the presentation.\n\n");
        body.push("Many thanks,\n\n");
        body.push("The Mind Gym");
        body = body.join('');
        
        this._sendEmail(this.emailAuthorId, coachId, subject, body);
        
        // Update job, set Is Coach Pack Email Sent to True
        job.setFieldValue('custentity_bo_iscoachpackemailsent', 'T');
        nlapiSubmitRecord(job);
        
      } catch (e) {
        this._log('Failed to process job: ' + jobId);
        
        if (e instanceof nlobjError) {
          var errorMessage = e.getCode() + ': ' + e.getDetails();
        } else {
          var errorMessage = e.toString();
        }
        
        this._log('Error: ' + errorMessage);
      }
    }
    
    // Exit
    this._log('Finished processing all jobs.');
    this._end();
  }
  
  /**
   * Find jobs were we have shipped the pack but not sent the coach pack email 
   *
   * @return void
   */
  this._findJobs = function() {
    
    var today = new Date();
    
    // Add offset
    var filter = new Array();
    filter.push(new nlobjSearchFilter('custentity_bo_ispackshipped', null, 'is', 'T'));
    filter.push(new nlobjSearchFilter('custentity_bo_iscoachpackemailsent', null, 'is', 'F'));
    filter.push(new nlobjSearchFilter('enddate', null, 'onorafter', 'today'));
    filter.push(new nlobjSearchFilter('custentity_bo_packshippingdate', null, 'onorafter', 'today'));
    filter.push(new nlobjSearchFilter('subsidiary', null, 'is', SWEET_SUBSIDIARY_UK));
    filter.push(new nlobjSearchFilter('custentity_bo_sendcoachpackemail', null, 'is', 'T'));
    
    // Search
    var columns = new Array();
    columns.push(new nlobjSearchColumn('internalid'));
    return nlapiSearchRecord('job', null, filter, columns);
  }
  
  /**
   * Send email
   *
   * @param {String} author
   * @param {String} recipient
   * @param {String} subject
   * @param {String} body
   */
  this._sendEmail = function(author, recipient, subject, body) {
    nlapiSendEmail(author, recipient, subject, body);
  }
}
