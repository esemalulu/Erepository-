/* Main function
*****************************************************************************/

/**
 * Pack fulfilment
 *
 * @param {Object} request
 * @param {Object} response
 */
function packFulfilmentPortlet(portlet, column) {

  nlapiLogExecution('DEBUG', 'Start', 'packFulfilmentPortlet');

  // Get a list of jobs awaiting packs
  var jobList = getJobSearchResults();

  // Sort the jobs by end date
  jobList = jobList.sort(compareJobs);

  nlapiLogExecution('DEBUG', 'Job count', jobList.length);

  // Display the portlet


  var packReportSuiteletLink = nlapiResolveURL('SUITELET', 'customscript_job_packfulfilment', 1);

  portlet.setTitle('Bookings awaiting fulfilment');

  var jobLink = portlet.addColumn('internalid','text', 'Item', 'LEFT');
  jobLink.setURL(nlapiResolveURL('RECORD','job'));
  jobLink.addParamToURL('id','internalid', true);

  portlet.addColumn('enddate', 'date', 'Date', 'LEFT');
  portlet.addColumn('companyname_customer', 'text', 'Client', 'LEFT');
  portlet.addColumn('custentity_bo_course_display', 'text', 'Product', 'LEFT');
  portlet.addColumn('custentity_bo_coach_display', 'text', 'Coach', 'LEFT');
  portlet.addColumn('custentity_bo_optprepack', 'text', 'Prepack required?', 'LEFT');

  if (jobList != null) {

    for (var i = 0; i < jobList.length; i++) {
      portlet.addRow(jobList[i]);
    }

  }

  nlapiLogExecution('DEBUG', 'End', 'packFulfilmentPortlet');
}

/*
* Do a Netsuite search to get all job records awaiting packs
*
*/
function getJobSearchResults() {

  var jobList = new Array();

  var columns = new Array();
  columns[0] = new nlobjSearchColumn('enddate');
  columns[1] = new nlobjSearchColumn('custentity_bo_course');
  columns[2] = new nlobjSearchColumn('custentity_bo_coach');
  columns[3] = new nlobjSearchColumn('companyname', 'customer');
  columns[4] = new nlobjSearchColumn('custentity_bo_isprepackshipped');
  columns[5] = new nlobjSearchColumn('custentity_bo_ispackshipped');
  columns[6] = new nlobjSearchColumn('custentity_bo_optprepack');
  columns[7] = new nlobjSearchColumn('internalId');

  var filters = new Array();
  filters[0] = new nlobjSearchFilter('custentity_bo_optpack', null, 'is', 'T'); // Pack option true
  filters[1] = new nlobjSearchFilter('custentity_bo_ispackshipped', null, 'is', 'F'); // Pack not sent
  filters[2] = new nlobjSearchFilter('custentity_bo_iscancelled', null, 'isnot', 'T'); // Not cancelled
  filters[3] = new nlobjSearchFilter('custentity_bo_isprovisional', null, 'isnot', 'T'); // Not Provisional  
  //filters[3] = new nlobjSearchFilter('enddate', null, 'within', 'quartersfromnow1');
  filters[4] = new nlobjSearchFilter('enddate', null, 'after', '1/3/2003');
  //filters[5] = new nlobjSearchFilter('custentity_bo_item', null, 'noneof', 1570); // Not Parent Gym 
  //filters[6] = new nlobjSearchFilter('custentity_bo_item', null, 'noneof', '@NONE@');

  jobList = nlapiSearchRecord('job', null, filters, columns);

  return jobList;
}

/*
* Callback function for Javascript Sort(), sort jobs by enddate descending
*
* @param nlobjSearchResult jobA
* @param nlobjSearchResult jobB
*/
function compareJobs(jobA, jobB) {

  var jobATimestamp = new Date(jobA.getValue('enddate')).getTime();
  var jobBTimestamp = new Date(jobB.getValue('enddate')).getTime();

  if (jobATimestamp == jobBTimestamp) {
    return 0;
  }

  if (jobATimestamp > jobBTimestamp) {
      return -1;
  } else {
    return 1;
  }

}