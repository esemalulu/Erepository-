/**
 * Company            Explore Consulting
 * Copyright            2012 Explore Consulting, LLC
 * Type                NetSuite EC_Scheduled_ProjectTask
 * Version            1.0.0.0
 * Description        Scheduled script for Project Task functionality.
 **/

function onStart() {

    // ADDED 11/8/2012 RMH:  If yesterday was one of the recognized holidays, then we will not execute the script
    var holiday = WasYesterdayAHoliday();
    nlapiLogExecution('DEBUG', 'onAfterSubmit()', 'Was Yesterday a Holiday?  ' + holiday);
    if ( !holiday )
    {
        milestoneTracking();
    }
    else
    {
        nlapiLogExecution('DEBUG', 'onStart() -- Script will not execute', 'Yesterday was a Holiday:  ' + holiday);
    }

}

var HOLIDAYS = new Array();
HOLIDAYS.push('11/22/2012');    // Thanksgiving
HOLIDAYS.push('12/25/2012');    // Christmas
HOLIDAYS.push('1/1/2013');      // New Year's Day
HOLIDAYS.push('5/27/2013');     // Memorial Day
HOLIDAYS.push('7/4/2013');      // Independence Day
HOLIDAYS.push('9/2/2013');      // Labor Day
HOLIDAYS.push('11/28/2013');    // Thanksgiving
HOLIDAYS.push('12/25/2013');    // Christmas
HOLIDAYS.push('1/1/2014');      // New Year's Day
HOLIDAYS.push('5/26/2014');     // Memorial Day
HOLIDAYS.push('7/4/2014');      // Independence Day
HOLIDAYS.push('9/1/2014');      // Labor Day
HOLIDAYS.push('11/28/2014');    // Thanksgiving
HOLIDAYS.push('12/25/2014');    // Christmas

function WasYesterdayAHoliday()
{
    try
    {
        var today = new Date();
        today.setDate(today.getDate()-1);
        nlapiLogExecution('DEBUG', 'WasYesterdayAHoliday()', 'Yesterday:  ' + today);
        var yesterdayString = (today.getMonth() + 1) + "/" + today.getDate() + "/" + today.getFullYear();
        nlapiLogExecution('DEBUG', 'WasYesterdayAHoliday()', 'yesterdayString:  ' + yesterdayString);

        for ( var i=0; i<HOLIDAYS.length; i++ )
        {
            if ( yesterdayString == HOLIDAYS[i] )
            {
                return true;
            }
        }

    }
    catch(e)
    {
        var msg = Logger.FormatException(e);
        nlapiLogExecution('DEBUG', 'Unexpected Error in WasYesterdayAHoliday()', msg);
        var emailbody = "Function:  WasYesterdayAHoliday\nEnvironment:  Sandbox\nError:  " + msg;
        Messaging.SendMessage(25846, 'alliant1@exploreconsulting.com', 'Unexpected Error Occurred in EC_Scheduled_ProjectTask.js', emailbody);
    }

    return false;
}


// Find Blown UNTOUCHED milestones that needs Milestone Tracking records created
function milestoneTracking()
{
    try
    {
        // ADDED 11/8/2012 RMH:  If yesterday was one of the recognized holidays, then we will not execute the script
        var holiday = WasYesterdayAHoliday();
        if ( !holiday )
        {
            var searchresults = nlapiSearchRecord('projecttask', 1009, null, null);
            if ( searchresults != null )
            {
                for ( var i=0; i<searchresults.length; i++ )
                {
                    var recordID = searchresults[i].getId();
                    nlapiLogExecution('DEBUG', 'milestoneTracking()', "recordID: " + recordID);
                    var ptRec = nlapiLoadRecord('projecttask', recordID);

                    // NetSuite Bug Found - nlapiGetFieldValues is currently not working so we have to use a String Separating
                    //   Delimiter in order to get the values selected in the Linked Project Tasks multi-select field
                    var lpt = ptRec.getFieldValue('custevent_linked_project_tasks');
                    nlapiLogExecution('DEBUG', 'milestoneTracking()', "lpt: " + lpt);
                    nlapiLogExecution('DEBUG', 'milestoneTracking()', "lpt - escape: " + escape(lpt));
                    var linkedProjTasks = new Array();
                    if ( lpt != null && lpt != '' )
                    {
                        var strChar5 = String.fromCharCode(5);
                        linkedProjTasks = lpt.split(strChar5);
                        nlapiLogExecution('DEBUG', 'milestoneTracking()', "linkedProjTasks - length: " + linkedProjTasks.length);
                        nlapiLogExecution('DEBUG', 'milestoneTracking()', "linkedProjTasks - joined: " + linkedProjTasks.join());
                    }
                    else
                    {
                        nlapiLogExecution('DEBUG', 'milestoneTracking()', "linkedProjTasks was null - no splitting needed");
                    }

                    linkedProjTasks.push(recordID);


                    var newRecData = new Object();
                    newRecData.currentProjTaskID = recordID;
                    newRecData.endDateAdjusted = ptRec.getFieldValue('custevent_enddateadjusted');
                    nlapiLogExecution('DEBUG', 'milestoneTracking()', "End Date Adjusted: " + ptRec.getFieldValue('custevent_enddateadjusted'));
                    newRecData.taskStatus = ptRec.getFieldValue('custevent_taskstatus');
                    newRecData.numDateMoved = ptRec.getFieldValue('custevent_datemoved');
                    newRecData.numDateBlown = ptRec.getFieldValue('custevent_dateblown');
                    newRecData.projectID = ptRec.getFieldValue('company');
                    newRecData.projectManager = nlapiLookupField('job', newRecData.projectID, 'custentity_primary_project_manager');
                    newRecData.changeReason = ptRec.getFieldValue('custevent_reasonchangerecord');

                    createMilestoneHistoryRecord(linkedProjTasks, newRecData, "blown");

                }
            }
            else
            {
                nlapiLogExecution('DEBUG', 'milestoneTracking()', "No Search Results Found");
            }
        }
        else
        {
            nlapiLogExecution('DEBUG', 'onAfterSubmit() -- Script will not execute', 'Yesterday was a Holiday:  ' + holiday);
        }
    }
    catch(e)
    {
        var msg = Logger.FormatException(e);
        nlapiLogExecution('DEBUG', 'Unexpected Error in milestoneTracking()', msg);
        var emailbody = "Function:  milestoneTracking\nEnvironment:  Sandbox\nError:  " + msg;
        Messaging.SendMessage(25846, 'alliant1@exploreconsulting.com', 'Unexpected Error Occurred in EC_Scheduled_ProjectTask.js', emailbody);
    }
}



function createMilestoneHistoryRecord(linkedProjTasks, newRecData, typeOfAdjustment)
{
    try
    {
        nlapiLogExecution('DEBUG', 'createBlownMilestoneRecord()', 'STARTED');

        // Since the actual Project Task record has not been updated yet to reflect the new Number Blown and Number Moved
        //      We need to project it for the Project Task History record.
        var numBlown = newRecData.numDateBlown;
        var numMoved = newRecData.numDateMoved;
        var recTypeLogged = 'UNDEFINED';
        if ( typeOfAdjustment == 'blown' )
        {
            if ( numBlown == null )
                numBlown = 1;
            else
                numBlown = parseInt(numBlown) + 1;
            nlapiLogExecution('DEBUG', 'createMilestoneHistoryRecord()', "Projected numBlown: " + numBlown);
            recTypeLogged = 'BLOWN';
        }
        else if ( typeOfAdjustment == 'moved' )
        {
            if ( numMoved == null )
                numMoved = 1;
            else
                numMoved = parseInt(numMoved) + 1;
            nlapiLogExecution('DEBUG', 'createMilestoneHistoryRecord()', "Projected numBlown: " + numMoved);
            recTypeLogged = 'MOVED';
        }
        else if ( typeOfAdjustment == 'met' )
        {
            recTypeLogged = 'MET';
        }


        // Create a Milestone History Record
        var historyRecord = nlapiCreateRecord('customrecord_projecttaskhistory');
        historyRecord.setFieldValue('custrecord_originalenddate', newRecData.endDateAdjusted);
        historyRecord.setFieldValue('custrecord_newenddate', newRecData.endDateAdjusted);
        historyRecord.setFieldValue('custrecord_adjustmentdate', nlapiDateToString(new Date()));
        historyRecord.setFieldValue('custrecord_dateblownno', parseInt(newRecData.numDateBlown));
        historyRecord.setFieldValue('custrecord_newdateblownno', numBlown);
        historyRecord.setFieldValue('custrecord_username', nlapiGetUser());
        historyRecord.setFieldValue('custrecord_originaldatemovedno', parseInt(newRecData.numDateMoved));
        historyRecord.setFieldValue('custrecord_newdatemovedno', numMoved);
        historyRecord.setFieldValue('custrecord_reasonforchange', newRecData.changeReason);
        if ( linkedProjTasks.length == 1 )
        {
            //nlapiLogExecution('DEBUG', 'createBlownMilestoneRecord()', "A");
            if (linkedProjTasks[0] != '') {
                //nlapiLogExecution('DEBUG', 'createBlownMilestoneRecord()', "B");
                historyRecord.setFieldValues('custrecord_projecttasks', linkedProjTasks);
            }
        }
        else if ( linkedProjTasks != null )
        {
            //nlapiLogExecution('DEBUG', 'createBlownMilestoneRecord()', "C");
            historyRecord.setFieldValues('custrecord_projecttasks', linkedProjTasks);
        }

        historyRecord.setFieldValue('custrecord_sr_pth_project', parseInt(newRecData.projectID));


        if ( typeOfAdjustment == 'met' ){
            historyRecord.setFieldValue('custrecord_met_milestone', 'T');
            nlapiLogExecution('DEBUG', 'createBlownMilestoneRecord()', "MET Milestone - marked Met Milestone checkbox");
        }

        nlapiLogExecution('DEBUG', 'createBlownMilestoneRecord()', "newRecData.projectManager: " + newRecData.projectManager);
        if ( newRecData.projectManager != '' )
            historyRecord.setFieldValue('custrecord_sr_pth_projectmanager', parseInt(newRecData.projectManager));

        var id = nlapiSubmitRecord(historyRecord, false, true);
        nlapiLogExecution('DEBUG', 'createBlownMilestoneRecord()', 'New ' + recTypeLogged + ' Milestone Record Created: ' + id);

        // Need to increment the Project Tasks to reflect another Milestone Date Blown occurrence
        incrementProjectTasks(linkedProjTasks, newRecData.currentProjTaskID);

    }
    catch(e)
    {
        var msg = Logger.FormatException(e);
        nlapiLogExecution('DEBUG', 'Unexpected Error in createBlownMilestoneRecord()', msg);
        var emailbody = "Function:  createBlownMilestoneRecord\nEnvironment:  Sandbox\nError:  " + msg;
        Messaging.SendMessage(25846, 'alliant1@exploreconsulting.com', 'Unexpected Error Occurred in EC_Scheduled_ProjectTask.js', emailbody);
    }
}
function incrementProjectTasks(linkedProjTasks, currentProjTaskID)
{
    try
    {
        nlapiLogExecution('DEBUG', 'incrementProjectTasks()', "linkedProjTasks.length: " + linkedProjTasks.length);
        for ( var i=0; linkedProjTasks != null && i<linkedProjTasks.length; i++ )
        {
            var projTask = nlapiLoadRecord('projecttask', linkedProjTasks[i]);
            if ( linkedProjTasks[i] == currentProjTaskID )
            {
                projTask.setFieldValue('custevent_last_moved_blown_schd_execute', nlapiDateToString(new Date()));
            }

            var numBlown = projTask.getFieldValue('custevent_dateblown');
            nlapiLogExecution('DEBUG', 'incrementProjectTasks() -- type = Blown', "BEFORE Incrementing Date Blown field: " + newNumBlown);
            if ( numBlown == null )
                var newNumBlown  = 1;
            else
                var newNumBlown  = parseInt(numBlown) + 1;
            projTask.setFieldValue('custevent_dateblown', newNumBlown);
            nlapiLogExecution('DEBUG', 'incrementProjectTasks() -- type = Blown', "Incrementing Date Blown field: " + newNumBlown);

            var id = nlapiSubmitRecord(projTask);
            nlapiLogExecution('DEBUG', 'incrementProjectTasks() -- Project Task Updated', id)
        }
    }
    catch(e)
    {
        var msg = Logger.FormatException(e);
        nlapiLogExecution('DEBUG', 'Unexpected Error in incrementProjectTasks()', msg);
        var emailbody = "Function:  incrementProjectTasks\nEnvironment:  Sandbox\nError:  " + msg;
        Messaging.SendMessage(25846, 'alliant1@exploreconsulting.com', 'Unexpected Error Occurred in EC_Scheduled_ProjectTask.js', emailbody);
    }
}

