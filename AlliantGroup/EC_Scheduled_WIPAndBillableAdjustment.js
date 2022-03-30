/**
 * Company            Explore Consulting
 * Copyright          2012 Explore Consulting, LLC
 * Type               NetSuite EC_Scheduled_WIPAndBillableAdjustment
 * Version            1.0.0.0
 * Description
 **/


function onStart()
{
    var context = nlapiGetContext();
    var targetQueueStatus = context.getSetting('SCRIPT', 'custscript_queue_status');

    var firstQueueEntry = getFirstQueueEntry(targetQueueStatus);

    if ( !firstQueueEntry )
        return;

    Logger.Debug('First entry',firstQueueEntry.getId());

    var projectID = firstQueueEntry.getValue('custrecord_queue_project');

    if ( targetQueueStatus == queueStatuses.QueuedWipAdjustment )
        temporarilyAllowNonAssignedTimeEntries(null,projectID);

    modifyQueueStatus(projectID,queueStatuses.ProcessingWipAdjustment,targetQueueStatus,firstQueueEntry.getId());

    var limitTime = new Date();
    limitTime.setHours(limitTime.getHours() + 1);

    var filters = [
        new nlobjSearchFilter('customer',null,'anyof',projectID)
    ];

    var columns = [
        new nlobjSearchColumn('date'),
        new nlobjSearchColumn('hours'),
        new nlobjSearchColumn('custcol_time_entry_billing_rate'),
        new nlobjSearchColumn('internalid').setSort(false) // Ascending
    ];

    var fields = [],values = [];
    var adjustedRemainingWIP =  parseFloat(nlapiLookupField('job', projectID, 'custentity58')) || 0.00;

    iterateSearchResults(processTimeEntry,'timebill',null,filters,columns,100,context);

    Logger.Debug('Initial remaining WIP',nlapiLookupField('job', projectID, 'custentity58'));
    Logger.Debug('Initial remaining WIP as float',adjustedRemainingWIP);

    function processTimeEntry(searchResult)
    {
        var timeEntryInternalID = searchResult.getId();
        var tranDate = searchResult.getValue("date");
        var hours = ConvertTimeToDecimal(searchResult.getValue("hours"));
        var rate = isNaN(parseFloat(searchResult.getValue("custcol_time_entry_billing_rate"))) ? 0.00 :
            parseFloat(searchResult.getValue("custcol_time_entry_billing_rate"));
        var totalValue = hours * rate;

        Logger.Write(LogType.Debug,"Project, TranDate, InternalID, Hours, Rate, TotalValue","ProjectID: " +
            projectID + ", Trandate: " + tranDate + ", InternalID: " + timeEntryInternalID + ", Hours: " + hours +
            ", Rate: " + rate + ", TotalValue: " + totalValue);

        var updateBillableStatus = null;

        if(totalValue <= adjustedRemainingWIP)
        {
            updateBillableStatus = billableStatus.billable;
            adjustedRemainingWIP -= totalValue;
            Logger.Write(LogType.Debug,"Billable.  adjustedRemainingWIP:",adjustedRemainingWIP);
        }
        else
        {
            updateBillableStatus = billableStatus.notBillable;
            adjustedRemainingWIP = 0;
            Logger.Write(LogType.Debug,"Not Billable.  adjustedRemainingWIP:",adjustedRemainingWIP);
        }

        fields = ['custcol_billable_status','custcol_cached_total_amount'];
        values = [updateBillableStatus,totalValue];

        Logger.Write(LogType.Debug,"Updating Time bill", 'Internal ID: ' + timeEntryInternalID + ', Fields: (' + fields.join(',') +
            '), Values: (' + values.join(',') + ')');

        try
        {
            nlapiSubmitField('timebill', timeEntryInternalID, fields, values);
        }
        catch(ex)
        {
            Logger.Write(LogType.Error,'Failed to submit field.  Trying load/save.',
                'Internal ID: ' + timeEntryInternalID + ', Fields: (' + fields.join(',') +
                    '), Values: (' + values.join(',') + ')');

            var rec = nlapiLoadRecord('timebill',timeEntryInternalID);
            rec.setFieldValue('custcol_billable_status',updateBillableStatus);
            rec.setFieldValue('custcol_cached_total_amount',totalValue);
            nlapiSubmitRecord(rec);
        }

        if ( new Date() > limitTime)
        {
            limitTime.setHours(limitTime.getHours() + 1);
            nlapiLogExecution('AUDIT','Doing Yield for long-running script');
            nlapiYieldScript();
        }
    }

    // Fire "done" logic if we have processed all time entries.  Because the script quits when it reschedules itself,
    // we know we're done once we reach this point.

    fields = ['custentity_rate_schedule_last_changed_by','companyname','custentity_ec_limit_time_cached_value'];
    var projectObj = nlapiLookupField('job',projectID,fields);
    // When all entries are done, send an e-mail and set the last rate schedule update
    var subject = 'Rate schedule update';
    var body = 'All time entries for project ' + projectObj.companyname + ' have been updated to reflect the new ' +
        'rate schedule';

    if ( !projectObj.custentity_rate_schedule_last_changed_by ||
        projectObj.custentity_rate_schedule_last_changed_by.trim() == '' )
        nlapiSendEmail('24','laura.thornton@alliantgroup.com',subject,body);
    else
    {
        Logger.Debug('Recipient',projectObj.custentity_rate_schedule_last_changed_by);
        nlapiSendEmail('24',projectObj.custentity_rate_schedule_last_changed_by,subject,body);
    }

    Logger.Debug('Setting remaining WIP',adjustedRemainingWIP);

    fields = ['custentity_updatetimeentrybillablestatus','custentity_remaining_wip','limittimetoassignees'];
    values = ['F',adjustedRemainingWIP,projectObj.custentity_ec_limit_time_cached_value];

    nlapiSubmitField('job', projectID, fields, values);

    modifyQueueStatus(projectID,queueStatuses.Done,queueStatuses.ProcessingWipAdjustment,firstQueueEntry.getId());
    nlapiScheduleScript(context.getScriptId(),context.getDeploymentId());

    Logger.Debug('Recalc in progress unchecked', 'ProjectID: ' + projectID);
}