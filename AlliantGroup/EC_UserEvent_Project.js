/**
 * Company            Explore Consulting
 * Copyright            2012 Explore Consulting, LLC
 * Type                NetSuite EC_UserEvent_Project
 * Version            1.0.0.0
 * Description        User Event script to execute on the Project record.
 **/

function onBeforeLoad(type, form, request) {

}

function onBeforeSubmit(type) {
}

var projectRecordChanged = false;
function onAfterSubmit(type)
{
    nlapiLogExecution('DEBUG','Fired Project User Event',nlapiGetContext().getExecutionContext());

    if ( nlapiGetContext().getExecutionContext() == 'scheduled' )
        return;

    var projRecord = null;
    var scheduleTimeEntryUpdateScript = false;
    var scheduleWIPAndBillableAdjustmentScript = false;

    if ( type == 'create' || type == 'edit' )
    {
        projRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
        // Recalculate Adjusted Fee Cap
        processWIPRecords(projRecord);
        projectRecordChanged = true;
    }

    if ( type == 'edit' )
    {
		//7.15.2013:  Removed to prevent Project Task re-processing in userEvent for Project.  Logic only fires
		//in the workflow action script for Project Task setup, via shared common library.
        //if(projectTaskInitializationSetup(projRecord))
        //{
        //    projectRecordChanged = true;
        //}

        if ( projRecord.getFieldValue('custentity_fee_type') == 3 &&    // Contingency
             projRecord.getFieldValue('entitystatus') == 1 )            // Completed
        {
            projRecord.setFieldValue('custentity_remaining_wip',0.00);
        }
        else
        {
            scheduleTimeEntryUpdateScript = updateBillingRateScheduleInTimeEntries(projRecord) ||
            adjustedFeeCapPercentChanged(projRecord);

            // 12-11-2012 KW calculateRemainingWIP now fires the WIP scheduled script.

            // Only fire the remaining WIP calculation if we haven't already fired the BillingRateSchedule calculation.
            // This is because the BillingRateSchedule calculation will automatically fire the WIP calculation on
            // completion.
            handleAdjustedFeeCapChange(projRecord,!scheduleTimeEntryUpdateScript);
        }
    }

    if ( type == 'create' || type == 'edit' )
    {
        cacheBillingRateScheduleAndAdjustedFeeCapPercent(projRecord);
    }

    nlapiLogExecution('DEBUG','Schedule time entry update?',scheduleTimeEntryUpdateScript);

    if(scheduleTimeEntryUpdateScript)
    {
        projectRecordChanged = true;

        if ( getAllWipDetails(projRecord.getId()) )
            makeProjectQueueEntry(projRecord.getId(),queueStatuses.PendingBillingTitle);
    }

    if(projectRecordChanged)
    {
        nlapiSubmitRecord(projRecord);
        Logger.Debug("onAfterSubmit", "Project Record Resubmitted:  " + projRecord.getId());
    }
}

// If adjusted fee cap has changed (NOT adjusted fee cap %), make a queue entry.  Don't bother if we already need
// to do a WIP update based on fee cap % or bill rate schedule.
function handleAdjustedFeeCapChange(projRecord,fireUpdateWIP)
{
    var oldRec = nlapiGetOldRecord();
    var oldAdjustedFeeCap = oldRec ? parseFloat(oldRec.getFieldValue('custentity58')).toFixed(2) : '0.00';
    var newAdjustedFeeCap = parseFloat(projRecord.getFieldValue('custentity58')).toFixed(2);
    Logger.Debug("handleAdjustedFeeCapChange", "oldAdjustedFeeCap: " + oldAdjustedFeeCap);
    Logger.Debug("handleAdjustedFeeCapChange", "newAdjustedFeeCap: " + newAdjustedFeeCap);

    if(  getAllWipDetails(projRecord.getId()) && adjustedFeeCapChanged(oldAdjustedFeeCap,newAdjustedFeeCap) )
    {
        Logger.Debug("handleAdjustedFeeCapChange", "Adjusted Fee Cap Changed.  Re-calculating Remaining WIP.");
        projectRecordChanged = true;
        projRecord.setFieldValue('custentity_remaining_wip', newAdjustedFeeCap);

        // Calculate Remaining WIP based on Time Entry records
        if ( fireUpdateWIP )
            makeProjectQueueEntry(projRecord.getId(),queueStatuses.PendingWipAdjustment);
    }
}

// Compare the previous bill rate schedule (cached in custentity_old_bill_rate_schedule) to the current bill rate
// schedule (custentity_bill_rate_schedule).  If they are different, update adjusted fee cap to match remaining WIP.
// Set the global projectRecordChanged variable so we save the project record after we're done.
// Return true if the values don't match, false if they do
function updateBillingRateScheduleInTimeEntries(newRecord)
{
    var retVal = false;

    Logger.Debug('Field values',newRecord.getFieldValue('custentity_old_bill_rate_schedule') + ':' +
                                    newRecord.getFieldValue('custentity_bill_rate_schedule'));

    if ( newRecord.getFieldValue('custentity_old_bill_rate_schedule') !=
        newRecord.getFieldValue('custentity_bill_rate_schedule') )
    {
        Logger.Debug('updateBillingRateScheduleInTimeEntries', 'bill rate schedule has changed');
        retVal = true;
        // Set Remaining WIP equal to Adjusted Fee Cap
        var adjustedFeeCap = newRecord.getFieldValue('custentity58');
        newRecord.setFieldValue('custentity_remaining_wip', adjustedFeeCap);

        projectRecordChanged = true;
    }

    return retVal;
}

// Compare the previous fee cap % (cached in custentity_old_fee_cap) to the current fee cap % (custentity65).
// Return true if they don't match, else false
function adjustedFeeCapPercentChanged(rec)
{
    var oldFeeCapPercent = rec.getFieldValue('custentity_old_fee_cap');
    var newFeeCapPercent = rec.getFieldValue('custentity65');

    return oldFeeCapPercent != newFeeCapPercent;
}

// Cache the current bill rate schedule and fee cap % if they've changed.  Set flag to save changes if appropriate.
function cacheBillingRateScheduleAndAdjustedFeeCapPercent(rec)
{
    if(rec.getFieldValue('custentity_bill_rate_schedule') != rec.getFieldValue('custentity_old_bill_rate_schedule'))
    {
        Logger.Debug('cacheBillingRateScheduleAndAdjustedFeeCapPercent', 'Billing Rate Schedule changed.');
        rec.setFieldValue('custentity_old_bill_rate_schedule',rec.getFieldValue('custentity_bill_rate_schedule'));
        projectRecordChanged = true;
    }

    if(rec.getFieldValue('custentity65') != rec.getFieldValue('custentity_old_fee_cap'))
    {
        Logger.Debug('cacheBillingRateScheduleAndAdjustedFeeCapPercent', 'Fee Cap % changed.');
        rec.setFieldValue('custentity_old_fee_cap',rec.getFieldValue('custentity65'));
        projectRecordChanged = true;
    }
}

