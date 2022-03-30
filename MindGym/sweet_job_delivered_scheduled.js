/**
 * Job - Training Course (aka Booking) - Delivered Script
 *
 * This script will automatically mark jobs (training courses) as
 * delivered based on an offset in days after the end date (event date)
 *
 * Script should be scehduled to run during weekdays (exclude Saturday and Sunday)
 *
 */

var SWEET_JOB_STATUS_PENDING_DELIVERY = '35';

/**
 * Main
 */
function scheduled_jobDelivered(type)
{
  nlapiLogExecution('DEBUG', 'Start', 'scheduled_jobDelivered');
  
  try {
    
    // Get parameter
    var context = nlapiGetContext();
    var daysAgo = context.getSetting('SCRIPT', 'custscript_job_delivered_daysago');
    if (!daysAgo) {
      daysAgo = 2; // Set to two days by default
    }
    if (daysAgo > 99) {
      daysAgo = 99;
    }
    if (daysAgo < 10) {
      daysAgo = '0' + daysAgo;
    }
    daysAgo = 'daysago' + daysAgo;
    
    // Get list of jobs with status pending delivery and in the past (-48 hours)
    var filters = new Array();
    filters[0] = new nlobjSearchFilter('status', null, 'is', SWEET_JOB_STATUS_PENDING_DELIVERY);
    filters[1] = new nlobjSearchFilter('enddate', null, 'onorbefore', daysAgo);
    
    var columns = new Array();
    columns[0] = new nlobjSearchColumn('internalId');
    var jobs = nlapiSearchRecord('job', null, filters, columns);
    
    var jobCount = 0;
    var jobProcessed = 0;
    var maxJobs = 250;
    var limitReached = false;
    
    if (jobs) {
      jobCount = jobs.length;
      var i = 0;
      for (; i < maxJobs; i++) {
        try {
          var job = nlapiLoadRecord('job', jobs[i].getId());
          job.setFieldValue('custentity_bo_isdelivered', 'T');
          var currentDate = new Date();
          job.setFieldValue('custentity_bo_deliverydate', nlapiDateToString(currentDate));        
          nlapiSubmitRecord(job);
          jobProcessed++;
        } catch (e) {
          // Do nothing
        }
      }
      
      // If more than max jobs (specify value)
      if (jobs.length > maxJobs) {
        limitReached = true;
      }
    }
        
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Exception', e.toString());
    }
  }
  
  nlapiLogExecution('DEBUG', 'End', 'scheduled_jobDelivered');
}
