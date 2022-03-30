// Function used to remove duplicates in an array
Array.prototype.unique = function () {
    var a = this.concat();
    for (var i = 0; i < a.length; ++i) {
        for (var j = i + 1; j < a.length; ++j) {
            if (a[i] === a[j])
                a.splice(j, 1);
        }
    }

    return a;
};

function project() {
    this.id = null;
    this.name = null;
}
var projects = new Array();

function getProject(id) {
    var name = nlapiLookupField('job', id, 'companyname');
    return name;
}

function employee() {
    this.id = null;
    this.name = null;
}
var employees = new Array();

function getEmployee(id) {
    var name = nlapiLookupField('employee', id, 'entityid');
    return name;
}

function client() {
    this.id = null;
    this.name = null;
}
Date.prototype.valid = function () {
    return isFinite(this);
};

function actionType() {
    this.id = null;
    this.name = null;
}

// SB2 https://forms.sandbox.netsuite.com/app/site/hosting/scriptlet.nl?script=42&deploy=1&compid=1283888_SB2&h=18ff0087c11a916eee8e;
// SB1 https://forms.sandbox.netsuite.com/app/site/hosting/scriptlet.nl?script=46&deploy=1&compid=1283888&h=55f63e79d0531f3fc1ce
// PROD https://forms.netsuite.com/app/site/hosting/scriptlet.nl?script=46&deploy=1&compid=1283888&h=55f63e79d0531f3fc1ce
var getClientProjectsSuiteletURL = 'https://forms.netsuite.com/app/site/hosting/scriptlet.nl?script=46&deploy=1&compid=1283888&h=55f63e79d0531f3fc1ce'; // TODO

// SB2 https://forms.sandbox.netsuite.com/app/site/hosting/scriptlet.nl?script=41&deploy=1&compid=1283888_SB2&h=b13926d3818974a810e6;
// SB1 https://forms.sandbox.netsuite.com/app/site/hosting/scriptlet.nl?script=47&deploy=1&compid=1283888&h=62ac3c4d47090866e791
// PROD https://forms.netsuite.com/app/site/hosting/scriptlet.nl?script=47&deploy=1&compid=1283888&h=62ac3c4d47090866e791
var getTimeExpensesSuiteletURL = 'https://forms.netsuite.com/app/site/hosting/scriptlet.nl?script=47&deploy=1&compid=1283888&h=62ac3c4d47090866e791'; // TODO

function item() {

    this.id = null;
    this.type = null;
    this.hours = null;
    this.billingRate = null;
    this.billingTitleId = null;
    this.billingTitleTextAndRate = null;
    this.isNoCharge = false;
    this.isNoShow = false;
    this.isMarked = false;
    this.NSUpdated = false;
}

var clients = new Array();

var HTMLtemplateFileId = 53894; // PROD/SB1 53894; SB2 53788; // TODO change id in prod

var HTMLtemplateFileId1 = 53895; // PROD/SB1 53895; SB2 53789; // TODO change id in prod

//var rdServiceItem = 6;

var expenseItem = 120; // TODO change id in prod

var customSalesOrderFormId = 100;

var billableStatus = {billable:"1", notBillable:"2"};

// Statuses for queue items
var queueStatuses = {
    PendingBillingTitle:1,      // Billing title update available, awaiting user input
    QueuedBillingTitle:6,       // Billing title waiting for processing
    ProcessingBillingTitle:2,   // Billing title in progress
    QueuedWipFromBillingTitle:7,// Billing title finished, waiting for WIP processing
    PendingWipAdjustment:3,     // WIP adjustment available, awaiting user input
    QueuedWipAdjustment:8,      // WIP adjustment waiting for processing
    ProcessingWipAdjustment:4,  // WIP adjustment in progress
    Done:5,                      // WIP (and possibly billing) finished
    RetrievedForProcessing:9    // queue record pulled by external processor to begin parallel processing
};

var pendingQueueStatuses = [
    queueStatuses.PendingBillingTitle,queueStatuses.QueuedBillingTitle,queueStatuses.QueuedWipFromBillingTitle,
    queueStatuses.PendingWipAdjustment,queueStatuses.QueuedWipAdjustment
];

var pendingWipStatuses = [
    queueStatuses.QueuedWipFromBillingTitle,queueStatuses.PendingWipAdjustment,queueStatuses.QueuedWipAdjustment
];

var scheduledScriptIDs =
{
    TimeBilling:'customscript_ec_scheduled_timeentryupdat',
    Wip:'customscript_ec_scheduled_wip_and_billab'
};

var scheduledScriptDeploymentIDs =
{
    TimeBilling:'customdeploy_ec_scheduled_timeentryupdat',
    WipTimeBilling:'customdeploy_ec_scheduled_wip_time_bill',
    WipStandAlone:'customdeploy_ec_scheduled_wip_standalone'
};

var FeeCapDifferenceDelta = 1.00;

// Function to find all WIPDetails records associated with the projectID (parameter), add up their
// current credit calculations, multiply by the Project's Fee Cap %, and save in the Adjusted Fee Cap field
// on the Project record
function processWIPRecords(projectRecord) {
    var projectID = projectRecord.getId();
    // Search for all WIPDetails records associated with this projectID
    var filters = [];
    filters[0] = new nlobjSearchFilter('custrecord10', null, 'anyof', projectID);

    var columns = [];
    columns[0] = new nlobjSearchColumn('custrecord_original_credit', null, null);
    columns[1] = new nlobjSearchColumn('custrecord_30_day_est_credit', null, null);
    columns[2] = new nlobjSearchColumn('custrecord_final_qre', null, null);
    columns[3] = new nlobjSearchColumn('custrecord_interest', null, null);
    columns[4] = new nlobjSearchColumn('custrecord_curr_credit_calc', null, null);

    var WIPDetailRecords = nlapiSearchRecord('customrecord_wip_details', null, filters, columns);

    var CurrentCreditCalculationTotal = 0.00;

    if (WIPDetailRecords) {
        for (var i = 0; i < WIPDetailRecords.length; i++) {
            var OriginalCredit = WIPDetailRecords[i].getValue('custrecord_original_credit');
            var ThirtyDayEstimate = WIPDetailRecords[i].getValue('custrecord_30_day_est_credit');
            var FinalQRE = WIPDetailRecords[i].getValue('custrecord_final_qrd');
            var Interest = WIPDetailRecords[i].getValue('custrecord_interest');
            var CurrentCreditCalculation = parseFloat(WIPDetailRecords[i].getValue('custrecord_curr_credit_calc'));
            var internalID = WIPDetailRecords[i].getId();
            Logger.Debug('currentCreditCalculation, InternalID: ' + internalID, CurrentCreditCalculation);


            CurrentCreditCalculationTotal += CurrentCreditCalculation ? CurrentCreditCalculation : 0.00;
            Logger.Debug('Running CC Total', CurrentCreditCalculationTotal);
        }
    }

    // Load the project record
//    if(null == projectRecord)
//    {
//        projectRecord = nlapiLoadRecord('job',projectID);
//    }

//    var FeeCap = projectRecord.getFieldValue('custentity65');
    var FeeCap = isNaN(parseFloat(projectRecord.getFieldValue('custentity65'))) ? 0.00 : parseFloat(projectRecord.getFieldValue('custentity65'));
    Logger.Debug('Fee Cap', FeeCap);


    // If Fee Cap is XX.X%, it parses as XX.X. We want to multiply by .XXX.
//    var AdjustedFeeCap = (parseFloat(FeeCap) * 0.01) * CurrentCreditCalculationTotal;
    var AdjustedFeeCap = (FeeCap * 0.01) * CurrentCreditCalculationTotal;

    // Finally, set AdjustedFeeCap on projectRecord and save.  We're done.
    projectRecord.setFieldValue('custentity58', AdjustedFeeCap.toString());
    //nlapiSubmitRecord(projectRecord);
}

/**
 * Escalates a project from "PendingWipAdjustment" to "QueuedWipAdjustment" in the WIP/ProjectBilling Queue.  If no
 * queue entry exists for the project, do nothing.
 * Attempt to fire the WIP scheduled script.  It may be already running, in which case it will pick up the escalated
 * queue record when it has processed all queue records ahead of this one.
 * @param projectID The internal ID for the project to calculate WIP on
 * @param queueID (optional) The internal ID of the queue record.  If you already have this, pass it in to save a search
 */
function calculateRemainingWIP(projectID,queueID)
{
    Logger.Debug('Calculate billing title','Project: ' + projectID + ', Queue: ' + queueID);
    modifyQueueStatus(projectID,queueStatuses.QueuedWipAdjustment,queueStatuses.PendingWipAdjustment,queueID);
}

/**
 * Escalates a project from "PendingBillingTitle" to "QueuedBillingTitle" in the WIP/ProjectBilling Queue.  If no
 * queue entry exists for the project, do nothing.
 * Attempt to fire the Time/Billing script.  It may be already running, in which case it will pick up the escalated
 * queue record when it has processed all queue records ahead of this one.
 * @param projectID - the internal ID for the project to calculate WIP on
 * @param queueID (optional) The internal ID of the queue record.  If you already have this, pass it in to save a search
 */
function calculateTimeBillingTitle(projectID,queueID)
{
    Logger.Debug('Calculate billing title','Project: ' + projectID + ', Queue: ' + queueID);
    modifyQueueStatus(projectID,queueStatuses.QueuedBillingTitle,queueStatuses.PendingBillingTitle,queueID);
}

/**
 *
 * @param projectID The ID of the project to re/enqueue
 * @param newStatus The status to set for the given project
 * @param oldStatus (Optional) The queue status to search for for the given project.  Int or array of ints.
 * @param queueID (Optional) The ID of the queue record to modify.  If you already have it, pass it to save a search
 */
function modifyQueueStatus(projectID,newStatus,oldStatus,queueID)
{
    // If we're given a queue ID, just set its status and we're done
    if ( queueID )
    {
        nlapiSubmitField('customrecord_proj_wip_bill_queue',queueID,'custrecord_queue_status',newStatus);
    }
    else
    {
        // Grab all queue entries for this project at old status.
        // There should only ever be 1, so delete all but the most-recently modified
        var filters = [
            new nlobjSearchFilter('custrecord_queue_project',null,'anyof',projectID),
            new nlobjSearchFilter('custrecord_queue_status',null,'anyof',oldStatus)
        ];

        var columns = [
            new nlobjSearchColumn('lastmodified').setSort(true),    // DESCENDING
            new nlobjSearchColumn('custrecord_queue_status')
        ];

        var queueEntries = nlapiSearchRecord('customrecord_proj_wip_bill_queue',null,filters,columns);

        _.map(queueEntries,function(val,idx,lst)
        {
            Logger.Debug('Modifying queue entry',val.getId() + ' - ' + idx);
            if ( idx == 0 )
            {
                nlapiSubmitField('customrecord_proj_wip_bill_queue',val.getId(),'custrecord_queue_status',newStatus);
            }
            else
            {
                nlapiDeleteRecord('customrecord_proj_wip_bill_queue',val.getId());
            }
        });
    }

}

/**
 * Get the first queue item that matches the given status, sorted by last-modified ASC (oldest first)
 * @param status {queueStatuses} The status to search for
 * @returns {nlobjSearchResult[]|nlobjSearchResult}
 */
function getFirstQueueEntry(status)
{
    var filters = [
        new nlobjSearchFilter('custrecord_queue_status',null,'anyof',status)
    ];

    var columns = [
        new nlobjSearchColumn('lastmodified').setSort(false),    // ASCENDING
        new nlobjSearchColumn('custrecord_queue_project')
    ];

    var queueEntries = nlapiSearchRecord('customrecord_proj_wip_bill_queue',null,filters,columns);

    return queueEntries && queueEntries[0];
}

// This function determines if the adjusted fee cap has changed, using a delta from the settings above
// Returns true if the new and old cap differ by at least FeeCapDifferenceDelta AND the new cap is non-negative
function adjustedFeeCapChanged(oldCap,newCap)
{
    var oldCapFloat = parseFloat(oldCap) || 0.00;
    var newCapFloat = parseFloat(newCap) || 0.00;
    var feeCapDifference = Math.abs(oldCapFloat - newCapFloat);

    return (feeCapDifference >= FeeCapDifferenceDelta) && (newCapFloat >= 0);
}

// This function will make an entry in the project wip/billing queue.
// Set the second parameter to true to calculate time billing title, false to only calculate remaining WIP
function makeProjectQueueEntry(projectID, status)
{
    // If we already have this project enqueued and not processing, make sure we only have 1 queue entry.
    var filters =
        [
            new nlobjSearchFilter('custrecord_queue_project', null, 'anyof', projectID),
            new nlobjSearchFilter('custrecord_queue_status', null, 'anyof',pendingQueueStatuses)
        ];
    var columns =
        [
            new nlobjSearchColumn('custrecord_queue_status')
        ];

    var entry = nlapiSearchRecord('customrecord_proj_wip_bill_queue', null, filters,columns);

    nlapiLogExecution('DEBUG', 'Values', 'ID: ' + projectID + ' - Status: ' + status);

    if (!entry)
    {
        var queueEntry = nlapiCreateRecord('customrecord_proj_wip_bill_queue');
        queueEntry.setFieldValue('custrecord_queue_status', status);
        queueEntry.setFieldValue('custrecord_queue_project', projectID);
        queueEntry.setFieldValue('custrecord_initiated_by',nlapiGetContext().getUser());
        nlapiSubmitRecord(queueEntry);
    }
    else
    {
        // If we have duplicate entries, clear out all but the "highest priority" in the queue
        // Priority Order: Queued Billing, PendingBilling, Everything Else
        if ( entry.length > 1 )
        {
            entry = getHighestPriority(entry);
        }
        else
            entry = entry[0];

        // If the desired status is PendingBillingTitle, set the first entry's status to PendingBillingTitle.
        // If the desired status is PendingWipAdjustment and we're at any other stage in the queue, WipAdjustment will
        // either occur after BillingTitle, or WipAdjustment is already in progress
        if
        (
            status == queueStatuses.QueuedBillingTitle ||
            entry.getValue('custrecord_queue_status') == queueStatuses.PendingWipAdjustment ||
            (
                status == queueStatuses.PendingBillingTitle &&
                entry.getValue('custrecord_queue_status') != queueStatuses.QueuedBillingTitle
            )
        )
        {
            nlapiSubmitField('customrecord_proj_wip_bill_queue',entry.getId(),'custrecord_queue_status',status);
        }
    }
}

function getHighestPriority(queueEntries)
{
    return _.max(queueEntries,getHighestPriorityEntry);

    function getHighestPriorityEntry(entry)
    {
        switch( entry.getValue('custrecord_queue_status') )
        {
            case queueStatuses.QueuedBillingTitle:
                return 3;
            case queueStatuses.PendingBillingTitle:
                return 2;
            case queueStatuses.PendingWipAdjustment:
                return 0;
            default:
                return 1;
        }
    }
}

// Make sure that at least 1 WIP details exists for the project.
function getAllWipDetails(projectID)
{
    var wipDetailFilters = [new nlobjSearchFilter('custrecord10',null,'anyof',projectID)];
    return nlapiSearchRecord('customrecord_wip_details',null,wipDetailFilters);
}

function sortTimeEntriesByTranDateAscending(a, b) {
    var a_trandDate = nlapiStringToDate(a.getValue("date"));
    var b_trandDate = nlapiStringToDate(b.getValue("date"));
    return (a_trandDate - b_trandDate);
}

function sortTimeEntriesByInternalIDAscending(a, b) {
    return (a.getId() - b.getId());
}

function ConvertTimeToDecimal(timeEntered) {
    var retVal = 0;
    if (timeEntered == null || timeEntered == 0 || timeEntered == "0") {
        retVal = 0;
    }
    else {
        var myTime = new Date("1/1/2008 " + timeEntered);
        var hour = myTime.getHours();
        var minute = myTime.getMinutes();
        if (!hour) {
            hour = 0;
        }
        if (!minute) {
            minute = 0;
        }
        retVal = (parseInt(hour) + parseFloat(parseInt(minute) / 60));
    }

    return retVal;
}

//
// Project Task Inititialization Setup
//

var DEFAULT_PERCENTAGE = 5.0;        // We will be using a default rate of 5% for the POC Values that are not found in the POC table
var finalNumbersTaskTypeInternalID = '8';

//
// Note, the isInactive value should be null, T or F.
// If null, first matching result will be returned, regardless of isInactive flag
// If T or F, first matching result where isInactive equals the given parameter value will be returned.
//
function getSearchResultInternalID(nlobjSearchResultArray, searchColumnName, searchColumnValue, isInactive) {
    var retVal = null;
    if (nlobjSearchResultArray) {
        for (var i = 0; i < nlobjSearchResultArray.length; i++) {
            var currentValue = nlobjSearchResultArray[i].getValue(searchColumnName);
            if (currentValue == searchColumnValue) {
                if (isInactive) {
                    if (nlobjSearchResultArray[i].getValue('isinactive') == isInactive) {
                        retVal = nlobjSearchResultArray[i].getId();
                        break;
                    }
                }
                else {
                    retVal = nlobjSearchResultArray[i].getId();
                    break;
                }
            }
        }
    }
    return retVal;
}

function getChildTasks(allProjectTasksSearchResults, parentTaskInternalID) {
    var retVal = new Array();

    if (allProjectTasksSearchResults) {
        for (var i = 0; i < allProjectTasksSearchResults.length; i++) {
            if (parentTaskInternalID == allProjectTasksSearchResults[i].getValue('parent')) {
                retVal.push(allProjectTasksSearchResults[i]);
            }
        }
    }

    return retVal;
}

function getTopLevelYearTasks(allProjectTasksSearchResults) {
    var retVal = new Array();
    if (allProjectTasksSearchResults) {
        for (var i = 0; i < allProjectTasksSearchResults.length; i++) {
            var parent = allProjectTasksSearchResults[i].getValue('parent');
            if (!parent && allProjectTasksSearchResults[i].getValue('custevent_task_is_year') == 'T') {
                retVal.push(allProjectTasksSearchResults[i]);
            }
        }
    }
    return retVal;
}

function projectTaskInitializationSetup(projRecord) {
    var projectRecordChanged = false;
    var projID = nlapiGetRecordId();
    if (null == projRecord) {
        projID = nlapiGetRecordId();
        projRecord = nlapiLoadRecord(nlapiGetRecordType(), projID);
    }
    else {
        projID = projRecord.getId();
    }
    var runLogic = projRecord.getFieldValue('custentity_proj_task_initial_setup_comp');
    Logger.Debug("projectTaskInitializationSetup", "Project Record ID:  " + projID);
    Logger.Debug("projectTaskInitializationSetup", "Has logic already been ran?:  " + runLogic);

    // We DON'T want to run the logic on a template project
    var templateRecord = projRecord.getFieldValue('custentity_template_record');
    Logger.Debug("projectTaskInitializationSetup", "Template Record:  " + templateRecord);
    if (templateRecord != 'T') {
        // Make sure logic has not already been ran on this record.
        if (runLogic == 'F') {
            // Get the yeah field values - multi-select fields
            var federalYears = projRecord.getFieldTexts('custentity59');
            var state1Years = projRecord.getFieldTexts('custentity_state1_yrs');
            var state2Years = projRecord.getFieldTexts('custentity_state2_yrs');
            var state3Years = projRecord.getFieldTexts('custentity_state3_yrs');

            // Merge and sort all of the year text strings into a new array - a unique list
            var mergedYears = federalYears.concat(state1Years).unique();
            Logger.Debug("projectTaskInitializationSetup", "mergedYears Array:  " + mergedYears.join());
            var mergedYears2 = state2Years.concat(state3Years).unique();
            Logger.Debug("projectTaskInitializationSetup", "mergedYears2 Array:  " + mergedYears2.join());
            var fullYearSet = mergedYears.concat(mergedYears2).unique();
            Logger.Debug("projectTaskInitializationSetup", "fullYearSet Array:  " + fullYearSet.join());
            fullYearSet.sort();

            //
            // Retrieve all tasks for the project
            //
            var filters = new Array();
            filters[0] = new nlobjSearchFilter('company', null, 'is', projID);

            var columns = new Array();
            columns[0] = new nlobjSearchColumn('parent');
            columns[1] = new nlobjSearchColumn('custevent_study_years');
            columns[2] = new nlobjSearchColumn('custevent_milestone');
            columns[3] = new nlobjSearchColumn('custevent10');
            columns[4] = new nlobjSearchColumn('custevent_task_is_year');
            columns[5] = new nlobjSearchColumn('title');


            var allProjectTasksSearchResults = nlapiSearchRecord('projecttask', null, filters, columns);
            Logger.Debug('allProjectTasksSearchResults length',
                allProjectTasksSearchResults ? allProjectTasksSearchResults.length : 'No Results');

            // Determine how many years we will need by referencing how many years are in the template
            var taskInfo = getTemplateYears(projID, allProjectTasksSearchResults);
            Logger.Debug("projectTaskInitializationSetup", "taskInfo.templateYears:  " + taskInfo.templateYears);
            if (taskInfo.templateYears != 0 && fullYearSet != null) {
                // Retrieve all Year entries in the Years custom list
//                    var years = nlapiSearchRecord('customrecord15',null, null, [new nlobjSearchColumn('custrecord_year_text'), new nlobjSearchColumn('isinactive')]);
                var years = nlapiSearchRecord('customlist15', null, null, [new nlobjSearchColumn('name'), new nlobjSearchColumn('isinactive')]);


                var finalSetOfYears = fullYearSet.slice(0, taskInfo.templateYears);
                Logger.Debug("projectTaskInitializationSetup", "finalSetOfYears:  " + finalSetOfYears.join());

                Logger.Debug("projectTaskInitializationSetup", "taskInfo.templateYears:  " + taskInfo.templateYears);
                Logger.Debug("projectTaskInitializationSetup", "finalSetOfYears.length:  " + finalSetOfYears.length);

                // If there are more years selected than parent tasks to connect them to, then stop when you run out of years.
                if (taskInfo.templateYears < finalSetOfYears.length)
                    var stopPoint = parseInt(taskInfo.templateYears);
                // If there are less years selected than parent tasks to connect them to, then stop when you run out of tasks.
                else if (finalSetOfYears.length < taskInfo.templateYears)
                    var stopPoint = parseInt(finalSetOfYears.length);
                // Default -- use all project tasks found.
                else
                    var stopPoint = parseInt(taskInfo.templateYears);

                // Set POC Value for each of the project tasks
                //calculateProjTaskCompletionPercentages(projID);
                var typeDataForPercentages = calcCompletionPercentages(projID, taskInfo.templateYears);


                Logger.Debug("projectTaskInitializationSetup", "stopPoint:  " + stopPoint);
                // Update all of the Project's Project Tasks to include the appropriate year
                for (var i = 0; i < stopPoint; i++) {
                    Logger.Debug("projectTaskInitializationSetup", "Project Task Being Processed:  " + taskInfo.projectTaskIDs[i]);
                    if (taskInfo.projectTaskIDs[i] != null) {
                        // Update the Parent Project Tasks with the Template Years
                        var currentProjTask = nlapiLoadRecord('projecttask', taskInfo.projectTaskIDs[i]);
                        var currentTitle = currentProjTask.getFieldValue('title');
                        //Logger.Debug("projectTaskInitializationSetup", "currentTitle:  " + currentTitle);
                        //var updatedTitle = currentTitle + " - " + finalSetOfYears[i];
                        //Logger.Debug("projectTaskInitializationSetup", "updatedTitle:  " + updatedTitle);

                        // 10/17/2012 RMH CHANGE:  Want the title to replace text in the task title now - not just add to it
                        var updatedTitle = currentTitle.replace('[xxxx]', finalSetOfYears[i]);
                        Logger.Debug("projectTaskInitializationSetup", "updatedTitle:  " + updatedTitle);
                        currentProjTask.setFieldValue('title', updatedTitle);

                        // Lookup the internalID of the Year record to set the Study Year field
//                            var yearInternalID = getSearchResultInternalID(years, 'custrecord_year_text', finalSetOfYears[i], 'F');
                        var yearInternalID = getSearchResultInternalID(years, 'name', finalSetOfYears[i], 'F');
                        currentProjTask.setFieldValue('custevent_study_years', yearInternalID);

                        // Set POC value for this parent task
                        /*var pttype = currentProjTask.getFieldValue('custevent10');
                         if ( pttype == '' || pttype == null ){ pttype = 'noType'; }
                         Logger.Debug("projectTaskInitializationSetup", "pttype:  " + pttype);
                         for ( var c=0; typeDataForPercentages != null && c<typeDataForPercentages.length; c++ )
                         {
                         Logger.Debug("projectTaskInitializationSetup", "typeDataForPercentages[c].Type:  " + typeDataForPercentages[c].Type);
                         if ( pttype == typeDataForPercentages[c].Type )
                         {
                         currentProjTask.setFieldValue('custevent_poc_value', typeDataForPercentages[c].PercPerTask);
                         Logger.Debug("projectTaskInitializationSetup", "Type Found:  " + typeDataForPercentages[c].PercPerTask);
                         break;
                         }
                         } */

                        // Just added to clear out any former values here that are not needed.
                        //currentProjTask.setFieldValue('custevent_poc_value', '');

                        // Also update the Child Project Tasks with the same Template Year
                        var filters2 = new Array();
                        filters2[0] = new nlobjSearchFilter('company', null, 'is', projID);
                        //filters2[1] = new nlobjSearchFilter('custevent_task_is_year', null, 'is', 'T');
                        //filters2[1] = new nlobjSearchFilter('custevent_milestone', null, 'is', 'T');
                        filters2[1] = new nlobjSearchFilter('parent', null, 'anyof', taskInfo.projectTaskIDs[i]);

                        var columns2 = new Array();
                        columns2[0] = new nlobjSearchColumn('custevent10'); // Project Task Type

//                            var results2 = nlapiSearchRecord('projecttask', null, filters2, columns2);
                        var results2 = getChildTasks(allProjectTasksSearchResults, taskInfo.projectTaskIDs[i]);
                        if (results2 != null) {
                            // Determine how many tasks of each task type exist for this year
                            var taskTypeCounts = getTaskTypeCounts(results2);
                            Logger.Debug("projectTaskInitializationSetup", "Child Project Tasks found:  " + results2.length);
                            for (var e = 0; e < results2.length; e++) {
                                var childProjTask = nlapiLoadRecord('projecttask', results2[e].getId());
                                var currentChildTitle = childProjTask.getFieldValue('title');
                                //Logger.Debug("projectTaskInitializationSetup", "currentChildTitle:  " + currentChildTitle);
                                //var updatedChildTitle = currentChildTitle + " - " + finalSetOfYears[i];
                                //Logger.Debug("projectTaskInitializationSetup", "updatedChildTitle:  " + updatedChildTitle);

                                // 10/17/2012 RMH CHANGE:  Need to replace text in the task title now - not just add to it
                                var updatedChildTitle = currentChildTitle.replace('[xxxx]', finalSetOfYears[i]);
                                //Logger.Debug("projectTaskInitializationSetup", "updatedChildTitle:  " + updatedChildTitle);
                                childProjTask.setFieldValue('title', updatedChildTitle);
                                childProjTask.setFieldValue('custevent_study_years', yearInternalID);

                                // Set POC value for this parent task
                                var pttype2 = childProjTask.getFieldValue('custevent10');
                                //Logger.Debug("projectTaskInitializationSetup", "Project Task Type of Child Task:  " + pttype2);
                                if (pttype2 == '' || pttype2 == null) {
                                    pttype2 = 'noType';
                                }
                                for (var c = 0; typeDataForPercentages != null && c < typeDataForPercentages.length; c++) {
                                    //Logger.Debug("projectTaskInitializationSetup", "typeDataForPercentages[c].Type:  " + typeDataForPercentages[c].Type);
                                    if (pttype2 == typeDataForPercentages[c].Type) {
                                        var percentagePerTask = typeDataForPercentages[c].PercPerTask;
                                        if (pttype2 == finalNumbersTaskTypeInternalID) {
                                            // This is the parent Final Numbers task.
                                            // There can be more than 1 Finalized Numbers child tasks.
                                            // Need to divide the calculated percentage by the number of tasks in the year.
                                            //
                                            //percentagePerTask = parseFloat(percentagePerTask) / parseInt(taskTypeCounts[pttype2]);
                                            var finalNumbersChildTasks = getChildTasks(allProjectTasksSearchResults, childProjTask.getId());
                                            if (finalNumbersChildTasks && finalNumbersChildTasks.length > 0) {
                                                percentagePerTask = parseFloat(percentagePerTask) / finalNumbersChildTasks.length;
                                                for (var f = 0; f < finalNumbersChildTasks.length; f++) {
                                                    var finalNumbersChildProjTask = nlapiLoadRecord('projecttask', finalNumbersChildTasks[f].getId());
                                                    var finalNumbersChildTitle = finalNumbersChildProjTask.getFieldValue('title');
                                                    updatedChildTitle = finalNumbersChildTitle.replace('[xxxx]', finalSetOfYears[i]);
                                                    finalNumbersChildProjTask.setFieldValue('title', updatedChildTitle);
                                                    finalNumbersChildProjTask.setFieldValue('custevent_study_years', yearInternalID);
                                                    finalNumbersChildProjTask.setFieldValue('custevent_poc_value', percentagePerTask);
                                                    var id3 = nlapiSubmitRecord(finalNumbersChildProjTask);
                                                    Logger.Debug("Final Numbers Child Task Submitted", "Child Project Task Record Resubmitted:  " + id3);

                                                }
                                                //Logger.Debug('Final Numbers','Year: ' + finalSetOfYears[i] + ', Revised Percentage: ' + percentagePerTask);
                                            }
                                            break;
                                        }
                                        else {
                                            //Logger.Debug("projectTaskInitializationSetup", "Type Found -- PercPerTask:  " + percentagePerTask);
                                            childProjTask.setFieldValue('custevent_poc_value', percentagePerTask);
                                            break;
                                        }

                                    }
                                }

                                var id2 = nlapiSubmitRecord(childProjTask);
                                Logger.Debug("projectTaskInitializationSetup", "Child Project Task Record Resubmitted:  " + id2);
                            }
                        }
                        else {
                            Logger.Debug("projectTaskInitializationSetup", "No Child Project Tasks found");
                        }

                        var id = nlapiSubmitRecord(currentProjTask);
                        Logger.Debug("projectTaskInitializationSetup", "Project Task Record Resubmitted:  " + id);
                    }
                }
            }
            else {
                Logger.Debug("projectTaskInitializationSetup", "There were no search results found -- so there are no proj tasks to update");
            }

            // Make sure to set the initial setup flag to True now, to show that the logic has already been ran on this record
            //projRecord.setFieldValue('custentity_proj_task_initial_setup_comp', 'T');
            //projectRecordChanged = true;
        }
        else {
            Logger.Debug("projectTaskInitializationSetup", "Project Setup has already been executed on this Project Record - logic will not run");
        }
    }
    else {
        Logger.Debug("projectTaskInitializationSetup", "Project is a template record - don't run logic on it");
    }

    return projectRecordChanged;
}

function getTaskTypeCounts(searchResults) {
    //
    // The searchResults parameter contain all the child project tasks for a Year task
    // The return value is an array giving the task type counts
    //
    var retVal = [];
    for (var i = 0; i < searchResults.length; i++) {
        var taskType = searchResults[i].getValue('custevent10');
        if (!taskType) {
            taskType = 'noType';
        }

        if (retVal[taskType]) {
            retVal[taskType]++;
        }
        else {
            retVal[taskType] = 1;
        }
    }

    return retVal;
}
function calcCompletionPercentages(projID, years) {
    try {
        Logger.Debug("calcCompletionPercentages", "STARTING*****************");

        var comPertData = new Array();

        // Determine how many milestones are in the project of each type
        var milestonesFilters = new Array();
        //milestonesFilters[0] = new nlobjSearchFilter('custevent_milestone',null,'is','T');
        //milestonesFilters[1] = new nlobjSearchFilter('custevent_task_is_year',null,'is','T');
        milestonesFilters[0] = new nlobjSearchFilter('custevent_taskstatus', null, 'noneof', '3');
        milestonesFilters[1] = new nlobjSearchFilter('company', null, 'anyof', projID);

        var milestonesColumns = new Array();
        milestonesColumns[0] = new nlobjSearchColumn('custevent10', null, 'group');        // Project Task Type
        milestonesColumns[1] = new nlobjSearchColumn('internalid', null, 'count');

        var milestones = nlapiSearchRecord('projectTask', null, milestonesFilters, milestonesColumns);

        if (milestones == null)
            return comPertData;

        Logger.Debug("calcCompletionPercentages", "*******Counting Task Types*****");
        for (var i = 0; milestones != null && i < milestones.length; i++) {
            //Logger.Debug("calcCompletionPercentages", "Task ID:  " + milestones[i].getId());

            var cptItem = new Object();
            var typeID = milestones[i].getValue('custevent10', null, 'group');
            Logger.Debug("calcCompletionPercentages", "typeID:  " + typeID);
            if (typeID == '')
                cptItem.Type = 'noType';
            else
                cptItem.Type = typeID;

            var total = parseInt(milestones[i].getValue('internalid', null, 'count'));
            if (total == '') {
                total = 0;
            }
            cptItem.Count = total;
            cptItem.Percentage = parseFloat(DEFAULT_PERCENTAGE);
            cptItem.PercPerTask = parseFloat(DEFAULT_PERCENTAGE);

            Logger.Debug("calcCompletionPercentages", "type:  " + cptItem.Type);
            Logger.Debug("calcCompletionPercentages", "count:  " + cptItem.Count);
            Logger.Debug("calcCompletionPercentages", "Percentage:  " + cptItem.Percentage);
            Logger.Debug("calcCompletionPercentages", "PercPerTask:  " + cptItem.PercPerTask);

            comPertData.push(cptItem);
        }


        Logger.Debug("calcCompletionPercentages", "*******Calculating Percentage per Task Types*****");
        if (comPertData != null) {
            Logger.Debug('Percentage for Type: ', "comPertData.length:  " + comPertData.length);

            // Associative array holds the final POC value for each task type
            var pctFilter = new Array();
            pctFilter[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
            var pctColumn = new Array();
            pctColumn[0] = new nlobjSearchColumn('custrecord_percentage_comp', null, null);
            pctColumn[1] = new nlobjSearchColumn('custrecord_task', null, null);

            var compPctRec = nlapiSearchRecord('customrecord_projecttasks_comp', null, pctFilter, pctColumn);
            if (compPctRec != null) {
                for (var b = 0; b < compPctRec.length; b++) {
                    if (compPctRec[b].getValue('custrecord_percentage_comp') != null) {
                        for (var c = 0; c < comPertData.length; c++) {
                            //Logger.Debug("calcCompletionPercentages", "compPctRec[" + b + "].getValue(pctColumn):  " + compPctRec[b].getValue('custrecord_percentage_comp'));
                            if (comPertData[c].Type == compPctRec[b].getValue('custrecord_task')) {
                                Logger.Debug("calcCompletionPercentages", " Type Matched:  " + comPertData[c].Type);
                                comPertData[c].Percentage = compPctRec[b].getValue('custrecord_percentage_comp');
                                if (comPertData[c].Count != 0)
                                //comPertData[c].PercPerTask = parseFloat(comPertData[c].Percentage) / parseInt(comPertData[c].Count);
                                    comPertData[c].PercPerTask = parseFloat(comPertData[c].Percentage) / years;
                                else
                                    comPertData[c].PercPerTask = parseFloat(DEFAULT_PERCENTAGE);

                                Logger.Debug("calcCompletionPercentages", "comPertData[c].Type:  " + comPertData[c].Type);
                                Logger.Debug("calcCompletionPercentages", "comPertData[c].Count:  " + comPertData[c].Count);
                                Logger.Debug("calcCompletionPercentages", "comPertData[c].Percentage:  " + comPertData[c].Percentage);
                                Logger.Debug("calcCompletionPercentages", "comPertData[c].PercPerTask:  " + comPertData[c].PercPerTask);
                            }
                        }
                    }
                }

                // Finally, go through all milestones and set POC according to all of the data we've gathered
                /*milestones = nlapiSearchRecord('projectTask',null,milestonesFilters);

                 for ( var a=0; a < milestones.length; a++ )
                 {
                 var milestoneRec = nlapiLoadRecord('projectTask',milestones[a].getId());
                 Logger.Debug("calcCompletionPercentages", "milestones[i].getId():  " + milestones[a].getId());

                 if ( milestoneRec.getFieldValue('custevent10') == null )
                 milestoneRec.setFieldValue('custevent_poc_value',pcts['noType']);
                 else
                 milestoneRec.setFieldValue('custevent_poc_value',pcts[milestoneRec.getFieldValue('custevent10')]);

                 Logger.Debug("calcCompletionPercentages", "custevent_poc_value:  " + milestoneRec.getFieldValue('custevent_poc_value'));

                 nlapiSubmitRecord(milestoneRec);
                 } */

            }
            else {
                Logger.Debug("calcCompletionPercentages", "No Complete Percentage records found - search was empty");
            }
        }
        else {
            Logger.Debug("calcCompletionPercentages", "Project did not have any milestones found for it");
        }

    }
    catch (e) {
        var msg = Logger.FormatException(e);
        nlapiLogExecution('DEBUG', 'Unexpected Error in calculateProjTaskCompletionPercentages()', msg);
        var emailbody = "Function:  calcCompletionPercentages\nEnvironment:  Sandbox\nError:  " + msg;
        Messaging.SendMessage(25846, 'scurry@exploreconsulting.com', 'Unexpected Error Occurred in EC_WorkflowAction_ProjectTaskInitSetup.js', emailbody);
    }

    Logger.Debug("calcCompletionPercentages", "*******ENDING********");
    return comPertData;

}

function getTemplateYears(pid, allProjectTasksSearchResults) {
    try {
        Logger.Debug("getTemplateYears", "STARTING: " + pid);
        var ptData = new Object();
        if (pid != null) {
            //var filters = new Array();
            //filters[0] = new nlobjSearchFilter('company', null, 'is', pid);
            //var sr = nlapiSearchRecord('projecttask', 'customsearch1022_2', filters, null);
            var sr = getTopLevelYearTasks(allProjectTasksSearchResults);

            if (sr != null) {
                ptData.templateYears = sr.length;
                ptData.projectTaskIDs = new Array();

                // Need to sort the project tasks from smallest to largest internal IDs
                for (var i = 0; i < sr.length; i++) {
                    ptData.projectTaskIDs.push(sr[i].getId());
                }

                // Sort the ids from smallest to largest
                Logger.Debug("getTemplateYears", "ptData.projectTaskIDs - UNSORTED: " + ptData.projectTaskIDs.join());
                //ptData.projectTaskIDs.sort();
                //Logger.Debug("getTemplateYears", "ptData.projectTaskIDs - JOINED: " + ptData.projectTaskIDs.join());
            }
            else {
                ptData.templateYears = 0;
                ptData.projectTaskIDs = null;
            }
        }
        else {
            Logger.Debug("getTemplateYears", "Project ID parameter was null: " + pid);
        }
    }
    catch (e) {
        var msg = Logger.FormatException(e);
        nlapiLogExecution('DEBUG', 'Unexpected Error in getTemplateYears()', msg);
        var emailbody = "Function:  getTemplateYears\nEnvironment:  Sandbox\nError:  " + msg;
        Messaging.SendMessage(25846, 'scurry@exploreconsulting.com', 'Unexpected Error Occurred in EC_WorkflowAction_ProjectTaskInitSetup.js', emailbody);
    }

    Logger.Debug("getTemplateYears", "ENDING: " + ptData.templateYears);
    return ptData;
}

var itemsCollection = null;
function populateItemsCollection(JSONRespObj, itemsData) {

    for (var i = 0; i < JSONRespObj.aaData.length; i++) {

        var _item = new item();

        _item.id = JSONRespObj.aaData[i][3];
        _item.type = JSONRespObj.aaData[i][11];
        _item.hours = JSONRespObj.aaData[i][7];
        _item.billingRate = JSONRespObj.aaData[i][6];
        _item.billingTitleId = JSONRespObj.aaData[i][12];
        _item.expenseLine = parseInt(JSONRespObj.aaData[i][13]);
        _item.isNoCharge = false;
        _item.isNoShow = false;
        _item.isMarked = false;

        /*
         if id not found in any lists and markAllClicked is true then it means its marked.
         if markAllClicked is false then only userSelected, userdeSelected, noChrgAllSelected, noShowAllSelected should be considered.
         if id found in noChrgAllSelected, noShowAllSelected and also found in userdeSelected, then disregard it as userdeSelected
         */

        var x = 0;
        var additem = false;
        var deleteitem = false;

        for (x = 0; x < itemsData.userdeSelected.length; x++) {
            if ((_item.id == itemsData.userdeSelected[x])
                && (_item.type == 'Time'
                || (_item.type == 'Expense' && _.indexOf(itemsData.expenseLineNumbers, _item.expenseLine) >= 0)
                )) {
                deleteitem = true;
                break;
            }
        }

        for (x = 0; x < itemsData.userSelected.length; x++) {
            if ((_item.id == itemsData.userSelected[x])
                && (_item.type == 'Time'
                || (_item.type == 'Expense' && _.indexOf(itemsData.expenseLineNumbers, _item.expenseLine) >= 0)
                )) {
                additem = true;
                break;
            }
        }

        for (x = 0; x < itemsData.noChrgAllSelected.length; x++) {
            if (_item.id == itemsData.noChrgAllSelected[x]) {
                _item.isNoCharge = true;
                additem = true;
                break;
            }
        }

        for (x = 0; x < itemsData.noShowAllSelected.length; x++) {
            if (_item.id == itemsData.noShowAllSelected[x]) {
                _item.isNoShow = true;
                additem = true;
                break;
            }
        }

        if (additem) deleteitem = false;

        if (!itemsData.markAllClicked && additem && !deleteitem) {
            _item.isMarked = true;
            itemsCollection.push(_item);
        }

        if (itemsData.markAllClicked && !deleteitem) {
            _item.isMarked = true;
            itemsCollection.push(_item);
        }
    }
}

function temporarilyAllowNonAssignedTimeEntries(projectRecord,projectID)
{
    if ( projectID )
    {
        var fields = [
            'custentity_ec_limit_time_cached_value',
            'limittimetoassignees'
            ];
        var values = [
            nlapiLookupField('job',projectID,'limittimetoassignees'),
            'F'
        ];

        nlapiSubmitField('job',projectID,fields,values);
    }
    else
    {
        projectRecord.setFieldValue('custentity_ec_limit_time_cached_value',
            projectRecord.getFieldValue('limittimetoassignees'));

        projectRecord.setFieldValue('limittimetoassignees','F');
    }
}