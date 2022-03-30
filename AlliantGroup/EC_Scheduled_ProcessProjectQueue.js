/**
 * Company            Explore Consulting
 * Copyright            2013 Explore Consulting, LLC
 * Type                NetSuite EC_Scheduled_ProcessProjectQueue
 * Version            1.0.0.0
 * Description        Boilerplate startup code for a NetSuite RESTlet.
 **/

function onStart()
{
    var projectID = nlapiGetContext().getSetting('SCRIPT','custscript_ec_scheduled_processproject');
    nlapiLogExecution('DEBUG','Project ID',projectID);
    // Find all queue entries that are pending billing title or WIP
    var filters =
        [
            new nlobjSearchFilter('custrecord_queue_status',null,'anyof',['1','3']),
            new nlobjSearchFilter('custrecord_queue_project',null,'anyof',projectID)
        ];

    var columns =
        [
            new nlobjSearchColumn('internalid').setSort(false), // Ascending
            new nlobjSearchColumn('custrecord_queue_status'),
            new nlobjSearchColumn('custrecord_queue_project')
        ];

    var pendingQueue = nlapiSearchRecord('customrecord_proj_wip_bill_queue',null,filters,columns);

    if ( pendingQueue )
    {
        // Take the first result and read its status
        var firstRes = pendingQueue[0];
        var status = firstRes.getValue(columns[1]);

        var projRecord = nlapiLoadRecord('job',firstRes.getValue(columns[2]));

        if ( status == '1' )
        {
            nlapiSubmitField('customrecord_proj_wip_bill_queue',firstRes.getId(),'custrecord_queue_status','2');
            calculateTimeBillingTitle(projRecord,'queue');
        }
        else
        {
            nlapiSubmitField('customrecord_proj_wip_bill_queue',firstRes.getId(),'custrecord_queue_status','4');
            calculateRemainingWIP(projRecord,'queue');
        }
    }
}