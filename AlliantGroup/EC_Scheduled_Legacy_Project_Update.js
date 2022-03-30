/**
 * Company            Explore Consulting
 * Copyright            2013 Explore Consulting, LLC
 * Type                NetSuite EC_Scheduled_Legacy_Project_Update
 * Version            1.0.0.0
 * Description        Boilerplate startup code for a NetSuite RESTlet.
 **/

function onStart()
{
    nlapiLogExecution('DEBUG','Saved Search','blahblahblah');

    var context = nlapiGetContext();

    var legacyUpdateSearchID = context.getSetting('SCRIPT','custscript_legacy_update_search');

    nlapiLogExecution('DEBUG','Saved Search',legacyUpdateSearchID);

    var projectsToUpdate = nlapiSearchRecord('job',legacyUpdateSearchID);

    if ( projectsToUpdate )
    {
        // Only grab the 1st one.  Then offload all handling to EC_Scheduled_TimeEntryBillingTitleUpdate.js.
        // When that completes, it will re-schedule this script.
        nlapiLogExecution('DEBUG','Found projects',projectsToUpdate.length);
        var proj = nlapiLoadRecord('job',projectsToUpdate[0].getId());
        // Set "Limit Time To Assignees" to false in case some resources have been removed from the project.
        // EC_Scheduled_UpdateTimeBillingTitle will restore the cached value.
        temporarilyAllowNonAssignedTimeEntries(proj);

        makeProjectQueueEntry(proj.getId(),queueStatuses.PendingBillingTitle);
        calculateTimeBillingTitle(proj.getId());

        nlapiLogExecution('DEBUG','Submitting project record',projectsToUpdate[0].getId());
        nlapiSubmitRecord(proj);
    }
}