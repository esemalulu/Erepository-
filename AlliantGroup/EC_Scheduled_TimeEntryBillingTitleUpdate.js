/**
 * Company            Explore Consulting
 * Copyright            2012 Explore Consulting, LLC
 * Type                NetSuite EC_Scheduled_UpdateTimeBillingTitle
 * Version            1.0.0.0
 * Description        Boilerplate startup code for a NetSuite RESTlet.
 **/

function onStart()
{
    // Closure variables
    var projectObj,billingLookupTable,employeesWithTimeArray,billRateTableColumns;

    // 0. Grab the first enqueued entry, by last modified date
    var firstEntry = getFirstQueueEntry(queueStatuses.QueuedBillingTitle);

    // If we don't have any billing title jobs queued up, just quit
    if ( !firstEntry )
        return;

    Logger.Debug('First entry',firstEntry.getId());

    var context = nlapiGetContext();
    var projectID = firstEntry.getValue('custrecord_queue_project');

    temporarilyAllowNonAssignedTimeEntries(null,projectID);

    // Set active entry to "Processing"
    modifyQueueStatus(projectID,queueStatuses.ProcessingBillingTitle,
        queueStatuses.QueuedBillingTitle,firstEntry.getId());

    Logger.Debug('Project ID',projectID);

    var limitTime = new Date();
    limitTime.setHours(limitTime.getHours() + 1);

    var projectProps = [
        'custentity_bill_rate_schedule',
        'custentity_project_class',
        'custentity_department',
        'custentity_location',
        'custentity_rate_schedule_last_changed_by',
        'companyname',
        'custentity_last_rate_schedule_update',
        'custentity58',
        'custentity_legacy_update_finished'
    ];

    projectObj = nsdal.loadObject('job',projectID,projectProps);
    // We will use this to store a map: employeeID -> billingRateSearchResult
    billingLookupTable = {
        class:{}
    };

    // 1. Find all employees who have time entries for this project.
    setupProjectEmployeeArray();

    Logger.Debug('Employees with time',JSON.stringify(employeesWithTimeArray));

    if ( !employeesWithTimeArray )
    {
        finish();
        return;
    }

    // 2. Find all of the bill rate table entries for employees on this project and this project's bill rate.  Build
    //    an object such that obj[employeeID] = tableEntry.
    billRateTableColumns = [
        new nlobjSearchColumn('custrecord_billing_title'),
        new nlobjSearchColumn('custrecord_bill_rate'),
        new nlobjSearchColumn('custrecord_employee')
    ];

    buildBillRateLookupTable();

    Logger.Debug('Bill rate lookup table',JSON.stringify(billingLookupTable));

    // 3. Go through all time entries
    var filters = [];
    filters.push(new nlobjSearchFilter('customer',null,'anyof',projectID));

    var columns = [];
    columns.push(new nlobjSearchColumn('internalid').setSort(false));   // Ascending order

    // Iterate through time entries for this project.

    // Properties for loading time entries with nsdal
    var timeProps = [
        'customer',
        'employee',
        'custcol_bill_table_lookup_status',
        'custcol_time_entry_billing_rate_table',
        'custcol_time_entry_billing_title',
        'custcol_time_entry_billing_rate',
        'item',
        'class',
        'department',
        'location'
    ];


    iterateSearchResults(processTimeEntry,'timebill',null,filters,columns,100,context);

    var now = new Date();
    // Use nlapiSubmitField instead of nlapiSubmitRecord to avoid Record Has Been Changed error.
    // When timeObj is saved above, the onAfterSubmit function in EC_UserEvent_TimeEntry.js is executed
    // and that function updates the project record.

    // projectObj.custentity_last_rate_schedule_update = nlapiDateToString(now);
    // projectObj.save();

    // TODO: Jon uncomment 'custentity_remaining_wip' and 'projectObj.custentity58'
    // Last rate schedule, remaining WIP
    var fieldsToSubmit = ['custentity_last_rate_schedule_update' /*,'custentity_remaining_wip'*/];
    // Today's date and time, Adjusted Fee Cap
    var valuesToSubmit = [nlapiDateToString(now)/*,projectObj.custentity58*/];

    nlapiSubmitField('job', projectID, fieldsToSubmit,valuesToSubmit);

    finish();

    function setupProjectEmployeeArray()
    {
        employeesWithTimeArray = [];

        var filters = [new nlobjSearchFilter('customer',null,'anyof',projectID)];

        var columns = [new nlobjSearchColumn('employee',null,'group')];

        var employeesWithTimeResults = nlapiSearchRecord('timebill',null,filters,columns);

        if ( !employeesWithTimeResults )
        {
            employeesWithTimeArray = null;
            return;
        }

        for ( var i=0; i < employeesWithTimeResults.length; i++ )
        {
            if ( employeesWithTimeArray.indexOf(employeesWithTimeResults[i].getValue(columns[0])) == -1 )
                employeesWithTimeArray.push(employeesWithTimeResults[i].getValue(columns[0]));
        }
    }

    function buildBillRateLookupTable()
    {
        var filters = [
            new nlobjSearchFilter('custrecord_employee',null,'anyof',employeesWithTimeArray),
            new nlobjSearchFilter('isinactive',null,'is','F')
        ];

        if ( projectObj.custentity_bill_rate_schedule )
            filters.push( new nlobjSearchFilter('custrecord_billing_schedule',null,'anyof',
                projectObj.custentity_bill_rate_schedule) );
        else
            filters.push(new nlobjSearchFilter('custrecord_billing_schedule',null,'anyof','11'));   // Default billing schedule

        var billRateResults = nlapiSearchRecord('customrecord_bill_rate_table',null,filters,billRateTableColumns);

        if ( !billRateResults )
        {
            finish();
            return;
        }

        var curEmployee = '';
        for ( var i=0; i < billRateResults.length; i++ )
        {
            curEmployee = billRateResults[i].getValue(billRateTableColumns[2]);
            if ( billingLookupTable[curEmployee] )
                billingLookupTable[curEmployee] = 'DUPLICATE';
            else
                billingLookupTable[curEmployee] = billRateResults[i];
        }
        nlapiLogExecution('DEBUG','Billing Rate Lookup Table',JSON.stringify(billingLookupTable));
    }

    function processTimeEntry(value,index,slice,page)
    {
        Logger.Debug('Next TimeEntry','ProjectID: ' + projectID + ', TimeEntryID: ' + value.getId());
        var timeObj = nsdal.loadObject('timebill',value.getId(), timeProps); // 5 units

        automateBillingAndTitle(timeObj,billingLookupTable,billRateTableColumns); // 20 units

        // 10-20 units
        try
        {
            timeObj.save();
        }
            // Weird things have been happening.  Sometimes we get an UNEXPECTED_ERROR, but opening and closing
            // (NOT EVEN SAVING) the time entry in the UI, then re-running fixes it.  Just re-running the
            // script will reliably continue to error.  We hope and pray that an extra load/save will fix
            // the problem.
            //
            // The only thing we're changing on the time entry is the service item.  Load the time entry again
            // (this time with native NS APIs), set service item from timeObj, and save
        catch(ex)
        {
            Logger.Error('Caught 1st error saving time entry','ID: ' + timeObj.getId());

            var timeObj2 = nlapiLoadRecord('timebill',timeObj.getId());
            timeObj2.setFieldValue('item',timeObj.item);
            try
            {
                nlapiSubmitRecord(timeObj2);
            }
            catch(ex)
            {
                Logger.Error('Caught 2nd error saving time entry','ID: ' + timeObj.getId());
                nlapiSubmitField('timebill',timeObj.getId(),'item',timeObj.item);
            }
        }

        if ( new Date() > limitTime )
        {
            nlapiLogExecution('AUDIT','Doing Yield for long-running script');
            limitTime.setHours(limitTime.getHours() + 1);
            nlapiYieldScript();
        }
    }

    /**
     * Advance current queue to Queued WIP From Billing Title
     */
    function finish()
    {
        modifyQueueStatus(projectObj.getId(),queueStatuses.QueuedWipFromBillingTitle,
            queueStatuses.ProcessingBillingTitle);

        nlapiScheduleScript(scheduledScriptIDs.Wip,scheduledScriptDeploymentIDs.WipTimeBilling);
        nlapiScheduleScript(scheduledScriptIDs.TimeBilling,scheduledScriptDeploymentIDs.TimeBilling);
    }
}