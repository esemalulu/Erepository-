/**
 * Company            Explore Consulting
 * Copyright            2013 Explore Consulting, LLC
 * Type                NetSuite EC_WorkflowAction_ManuallyProcessQueue
 * Version            1.0.0.0
 * Description        Boilerplate startup code for a NetSuite RESTlet.
 **/

function onStart()
{
    var queueRecord = nlapiGetNewRecord();
    var projectID = queueRecord.getFieldValue('custrecord_queue_project');
    nlapiSubmitField('job',projectID,'custentity_updatetimeentrybillablestatus','T');
    var queueStatus = queueRecord.getFieldValue('custrecord_queue_status');

    if ( queueStatus == queueStatuses.PendingBillingTitle )
        calculateTimeBillingTitle(projectID,queueRecord.getId());
    else if ( queueStatus == queueStatuses.PendingWipAdjustment)
        calculateRemainingWIP(projectID,queueRecord.getId());
}