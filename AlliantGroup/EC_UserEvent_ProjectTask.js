/**
 * Company            Explore Consulting
 * Copyright            2012 Explore Consulting, LLC
 * Type                NetSuite EC_UserEvent_ProjectTask
 * Version            1.0.0.0
 * Description        User Event script for Project Task functionality.
 **/

function onBeforeLoad(type, form, request) {

}

function onBeforeSubmit(type) {

}

function onAfterSubmit(type) {

    // ADDED 11/8/2012 RMH:  If yesterday was one of the recognized holidays, then we will not execute the script
    var holiday = WasYesterdayAHoliday();
    nlapiLogExecution('DEBUG', 'onAfterSubmit()', 'Was Yesterday a Holiday?  ' + holiday);

    if ( type == 'create' )
    {
        var newRecord = nlapiGetNewRecord();
        var newProps = new Array();
        newProps.push('custevent_replicate_in_other_years');
        newProps.push('company');
        newProps.push('title');
        newProps.push('status');
        newProps.push('estimatedwork');
        newProps.push('custevent_milestone');
        newProps.push('custevent_enddateadjusted');
        newProps.push('custevent10');
        newProps.push('custevent_taskstatus');
        newProps.push('custevent_linked_project_tasks');
        newProps.push('custevent_poc_value');
        newProps.push('parent');

        var newRecordObj = nsdal.loadObject('projectTask',newRecord.getId(),newProps);

        if ( newRecordObj.custevent_replicate_in_other_years === true &&
            newRecordObj.custevent_replicate_in_other_years == 'T' )
        {
            // 5. Replicate in other years function
            // Search for all project tasks associated with this project where task is year is true
            replicateTaskInOtherYears(newRecordObj);
            if ( newRecordObj.custevent_replicate_in_other_years == 'T')
                newRecordObj.custevent_replicate_in_other_years = 'F';
            else
                newRecordObj.custevent_replicate_in_other_years = false;
        }
    }
    if ( type == 'edit' )
    {
        if ( !holiday )
        {
            milestoneTracking();
        }
        else
        {
            nlapiLogExecution('DEBUG', 'onAfterSubmit() -- milestoneTracking logic will not execute', 'Yesterday was a Holiday:  ' + holiday);
        }
        updateRelatedTasks();
    }
}

var CURRENTENDDATEADJ = '';

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
        nlapiLogExecution('DEBUG', 'Unexpected Error in milestoneTracking()', msg);
        var emailbody = "Function:  milestoneTracking\nEnvironment:  Sandbox\nError:  " + msg;
        Messaging.SendMessage(25846, 'alliant1@exploreconsulting.com', 'Unexpected Error Occurred in EC_UserEvent_ProjectTask.js', emailbody);
    }

    return false;
}


function milestoneTracking()
{
    try
    {
        var recordID = nlapiGetRecordId();
        var recordType = nlapiGetRecordType();
        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "recordID: " + recordID);
        var ptRec = nlapiLoadRecord(recordType, recordID);
        var milestone = ptRec.getFieldValue('custevent_milestone');
        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "milestone: " + milestone);
        var tStatus = ptRec.getFieldValue('custevent_taskstatus');
        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "tStatus: " + tStatus);

        // Task has to be marked as a Milestone and the Task Status has to either be Active (1) or Completed (2)
        if ( milestone == 'T' && ( tStatus == 1 || tStatus == 2 ) )
        {
            var newRecData = new Object();
            newRecData.currentProjTaskID = recordID;

            // NetSuite Bug Found - nlapiGetFieldValues is currently not working so we have to use a String Separating
            //   Delimiter in order to get the values selected in the Linked Project Tasks multi-select field
            var lpt = ptRec.getFieldValue('custevent_linked_project_tasks');
            var linkedProjTasks = new Array();
            if ( lpt != null && lpt != '' )
            {
                var strChar5 = String.fromCharCode(5);
                linkedProjTasks = lpt.split(strChar5);
            }
            else
            {
                nlapiLogExecution('DEBUG', 'milestoneTracking()', "NO Linked Project Tasks found");
            }

            linkedProjTasks.push(recordID);

            newRecData.endDateAdjusted = ptRec.getFieldValue('custevent_enddateadjusted');
            CURRENTENDDATEADJ = ptRec.getFieldValue('custevent_enddateadjusted');
            newRecData.taskStatus = ptRec.getFieldValue('custevent_taskstatus');
            newRecData.numDateMoved = ptRec.getFieldValue('custevent_datemoved');
            newRecData.numDateBlown = ptRec.getFieldValue('custevent_dateblown');
            newRecData.projectID = ptRec.getFieldValue('company');
            newRecData.projectManager = nlapiLookupField('job', newRecData.projectID, 'custentity_primary_project_manager');
            newRecData.changeReason = ptRec.getFieldValue('custevent_reasonchangerecord');


            // PUll OLD Record data to see if the End Date Adjusted or Task Status fields have changed
            var oldRecData = getOldRecData(recordID, recordType);

            nlapiLogExecution('DEBUG', 'milestoneTracking()', "formerEndDateAdjusted:  " + oldRecData.endDateAdj);
            nlapiLogExecution('DEBUG', 'milestoneTracking()', "currentEndDateAdjusted:  " + newRecData.endDateAdjusted);
            if ( oldRecData.endDateAdj != null && newRecData.endDateAdjusted != null )
            {
                var formerEndDateAdjusted = new Date(oldRecData.endDateAdj);
                //nlapiLogExecution('DEBUG', 'milestoneTracking()', "formerEndDateAdjusted: " + formerEndDateAdjusted);
                var formerEndDateAdjustedSTRING = oldRecData.endDateAdj;
                nlapiLogExecution('DEBUG', 'milestoneTracking()', "formerEndDateAdjustedSTRING: " + formerEndDateAdjustedSTRING);

                var currentEndDateAdjusted = new Date(newRecData.endDateAdjusted);
                //nlapiLogExecution('DEBUG', 'milestoneTracking()', "currentEndDateAdjusted: " + currentEndDateAdjusted);
                var currentEndDateAdjustedSTRING = newRecData.endDateAdjusted;
                nlapiLogExecution('DEBUG', 'milestoneTracking()', "currentEndDateAdjustedSTRING: " + currentEndDateAdjustedSTRING);

                var metAlreadyCreated = false;

                var today = new Date();
                var todayString = today;
                //nlapiLogExecution('DEBUG', 'milestoneTracking()', "todayString: " + todayString);


                if ( formerEndDateAdjustedSTRING != currentEndDateAdjustedSTRING )
                {
                    nlapiLogExecution('DEBUG', 'milestoneTracking()', "The Former End Date Adjusted DOES NOT equal the current End Date Adjusted");
                    // If the End Date Adjusted field changed, determine if a Milestone Project Task History Record needs to be created
                    /*if ( currentEndDateAdjusted < formerEndDateAdjusted && todayString < currentEndDateAdjusted )
                    {
                        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "currentEndDateAdjusted is after today AND the Current End Date Adjusted is before the Former End Date Adjusted");
                        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "Dont create a History record but do still update the linked project tasks");
                        updateEndDateAdjOnProjectTasks(linkedProjTasks, newRecData.currentProjTaskID, newRecData.endDateAdjusted);
                    }
                    else */
                    if ( formerEndDateAdjusted < todayString && todayString < currentEndDateAdjusted )        // BLOWN MILESTONE
                    {
                        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "formerEndDateAdjusted is before today");
                        createMilestoneHistoryRecord(linkedProjTasks, oldRecData, newRecData, "blown");     // BLOWN MILESTONE
                    }
                    else if ( todayString < formerEndDateAdjusted )       // MOVED MILESTONE
                    {
                        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "formerEndDateAdjusted is after today - " + formerEndDateAdjusted);
                        createMilestoneHistoryRecord(linkedProjTasks, oldRecData, newRecData, "moved");     // MOVED MILESTONE
                    }
                    else
                    {
                        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "formerEndDateAdjusted was EQUAL TO TODAY");
                        createMilestoneHistoryRecord(linkedProjTasks, oldRecData, newRecData, "moved");     // MOVED MILESTONE
                    }

                    // Still need to make sure the End Date Adjusted is updated on all linked tasks
                    if ( linkedProjTasks != null )
                        updateEndDateAdjOnProjectTasks(linkedProjTasks, newRecData.currentProjTaskID, newRecData.endDateAdjusted);

                }
                else  // End Date Adjusted did not change
                {

                    nlapiLogExecution('DEBUG', 'milestoneTracking()', "Current todayString value: " + todayString);
                    //nlapiLogExecution('DEBUG', 'milestoneTracking()', "Transforming todayString to a new Date Object: " + new Date(todayString));
                    //nlapiLogExecution('DEBUG', 'milestoneTracking()', "Using native toString function: " + new Date().toString());

                    nlapiLogExecution('DEBUG', 'milestoneTracking()', "The Former End Date Adjusted equals the current End Date Adjusted");
                    if ( currentEndDateAdjusted < todayString && oldRecData.taskStatus != 2 )      // BLOWN MILESTONE             // status 2 = Completed
                    {
                        nlapiLogExecution('DEBUG', 'milestoneTracking()', "currentEndDateAdjusted is before today - " + currentEndDateAdjusted);

                        var tCompletionDate = ptRec.getFieldValue('custevent6');
                        nlapiLogExecution('DEBUG', 'milestoneTracking()', "tCompletionDate: " + tCompletionDate);
                        if ( newRecData.taskStatus == 2 && currentEndDateAdjustedSTRING < tCompletionDate )
                        {
                            //nlapiLogExecution('DEBUG', 'milestoneTracking()', "currentEndDateAdjusted is before to todayString - Creating Blown milestone");
                            //nlapiLogExecution('DEBUG', 'milestoneTracking()', "currentEndDateAdjusted is before tCompletionDate:  " + tCompletionDate);
                            createMilestoneHistoryRecord(linkedProjTasks, oldRecData, newRecData, "blown");     // BLOWN MILESTONE
                        }
                        else
                        {
                            //nlapiLogExecution('DEBUG', 'milestoneTracking()', "currentEndDateAdjusted is on or after the tCompletionDate - " + tCompletionDate);
                            //nlapiLogExecution('DEBUG', 'milestoneTracking()', "So We will Create a MET MILESTONE");
                            createMilestoneHistoryRecord(linkedProjTasks, oldRecData, newRecData, "met");      // MET MILESTONE
                            metAlreadyCreated = true;
                        }

                        /*if ( currentEndDateAdjusted <= tCompletionDate && newRecData.taskStatus == 2 )
                        {
                            nlapiLogExecution('DEBUG', 'milestoneTracking()', "currentEndDateAdjusted is on or after the tCompletionDate - " + tCompletionDate);
                            nlapiLogExecution('DEBUG', 'milestoneTracking()', "So We will Create a MET MILESTONE");
                            createMilestoneHistoryRecord(linkedProjTasks, oldRecData, newRecData, "met");      // MET MILESTONE
                            metAlreadyCreated = true;
                        }
                        else
                        {
                            nlapiLogExecution('DEBUG', 'milestoneTracking()', "currentEndDateAdjusted is before to tCompletionDate - " + tCompletionDate);
                            createMilestoneHistoryRecord(linkedProjTasks, oldRecData, newRecData, "blown");     // BLOWN MILESTONE
                        } */

                        //createMilestoneHistoryRecord(linkedProjTasks, oldRecData, newRecData, "blown");
                    }
                    else if ( currentEndDateAdjusted < todayString && oldRecData.taskStatus == 2 )
                    {
                        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "currentEndDateAdjusted is before today, but the Task is already Complete");
                        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "No action needed");
                    }
                    else if ( todayString < currentEndDateAdjusted && oldRecData.taskStatus != 2 && newRecData.taskStatus == 2 )
                    {
                        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "currentEndDateAdjusted is after today - DEADLINE MET");
                        createMilestoneHistoryRecord(linkedProjTasks, oldRecData, newRecData, "met");     // MET MILESTONE
                        metAlreadyCreated = true;
                    }
                    else if ( oldRecData.taskStatus == newRecData.taskStatus )
                    {
                        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "If there was no End Date Adjusted Date change and no Status change - DO NOTHING");
                    }
                    else
                    {
                        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "Current End Date Adjusted: " + currentEndDateAdjusted);
                        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "Today String: " + todayString);
                        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "Current End Date Adjusted MAY EQUAL Today -- THIS is the else catchall block executing");
                        //nlapiLogExecution('DEBUG', 'milestoneTracking()', "No History Records will be created.");
                        //createMilestoneHistoryRecord(linkedProjTasks, oldRecData, newRecData, "moved");
                    }

                } // END IF Former Adjusted Date does not equal Current Adjusted Date

                // ADDED 8/12/2012 RMH:  Every milestone when set to complete, should result in the creation of a MET Milestone
                if ( oldRecData.taskStatus != 2 && newRecData.taskStatus == 2 && metAlreadyCreated != true )
                {
                    //nlapiLogExecution('DEBUG', 'milestoneTracking()', "Status has been set to Complete - DEADLINE MET");
                    createMilestoneHistoryRecord(linkedProjTasks, oldRecData, newRecData, "met");     // MET MILESTONE
                }

            } // END IF dates are not null
            else if ( oldRecData.endDateAdj == null && newRecData.endDateAdjusted != null )
            {
                // There wasn't a end date before but now there is - so we should update the linked project tasks
                nlapiLogExecution('DEBUG', 'milestoneTracking()', "Former Adjusted Date was null but Current Adjusted Date is not null");
                updateEndDateAdjOnProjectTasks(linkedProjTasks, newRecData.currentProjTaskID, CURRENTENDDATEADJ);
            }
            else
            {
                // DO NOTHING
                nlapiLogExecution('DEBUG', 'milestoneTracking()', "Either Former Adjusted Date or Current Adjusted Date was null");
            }

        } // END IF milestone = T
        else
        {
            //nlapiLogExecution('DEBUG', 'milestoneTracking() -- Milestone was FALSE', "milestone: " + milestone);
        } // END ELSE milestone = T

    }
    catch(e)
    {
        var msg = Logger.FormatException(e);
        nlapiLogExecution('DEBUG', 'Unexpected Error in milestoneTracking()', msg);
        var emailbody = "Function:  milestoneTracking\nEnvironment:  Sandbox\nError:  " + msg;
        Messaging.SendMessage(25846, 'alliant1@exploreconsulting.com', 'Unexpected Error Occurred in EC_UserEvent_ProjectTask.js', emailbody);
    }
}

function getOldRecData(recID, recType)
{
    try
    {
        var oldData = new Object();
        if ( recID != null )
        {
            var oldRec = nlapiGetOldRecord(recType, recID);
            oldData.endDateAdj = oldRec.getFieldValue('custevent_enddateadjusted');
            oldData.taskStatus = oldRec.getFieldValue('custevent_taskstatus');
            oldData.numDateMoved = oldRec.getFieldValue('custevent_datemoved');
            oldData.numDateBlown = oldRec.getFieldValue('custevent_dateblown');
        }
        else
        {
            nlapiLogExecution('DEBUG', 'getOldRecData() -- Record ID was null', recID);
        }
    }
    catch(e)
    {
        var msg = Logger.FormatException(e);
        nlapiLogExecution('DEBUG', 'Unexpected Error in getOldRecData()', msg);
        var emailbody = "Function:  getOldRecData\nEnvironment:  Sandbox\nError:  " + msg;
        Messaging.SendMessage(25846, 'alliant1@exploreconsulting.com', 'Unexpected Error Occurred in EC_UserEvent_ProjectTask.js', emailbody);
    }

    return oldData;
}

function createMilestoneHistoryRecord(linkedProjTasks, oldRecData, newRecData, typeOfAdjustment)
{
    try
    {
        nlapiLogExecution('DEBUG', 'createMilestoneHistoryRecord()', 'STARTED');

        // Since the actual Project Task record has not been updated yet to reflect the new Number Blown and Number Moved
        //      We need to project it for the Project Task History record.
        var numBlown = oldRecData.numDateBlown;
        var numMoved = oldRecData.numDateMoved;
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


        // Create new Blown Milestone Record
        var historyRecord = nlapiCreateRecord('customrecord_projecttaskhistory');
        historyRecord.setFieldValue('custrecord_originalenddate', oldRecData.endDateAdj);
        nlapiLogExecution('DEBUG', 'createBlownMilestoneRecord()', "oldRecData.endDateAdj: " + oldRecData.endDateAdj);
        historyRecord.setFieldValue('custrecord_newenddate', newRecData.endDateAdjusted);
        nlapiLogExecution('DEBUG', 'createBlownMilestoneRecord()', "newRecData.endDateAdjusted: " + newRecData.endDateAdjusted);
        historyRecord.setFieldValue('custrecord_adjustmentdate', nlapiDateToString(new Date()));
        historyRecord.setFieldValue('custrecord_dateblownno', parseInt(oldRecData.numDateBlown));
        historyRecord.setFieldValue('custrecord_newdateblownno', numBlown);
        historyRecord.setFieldValue('custrecord_username', nlapiGetUser());
        historyRecord.setFieldValue('custrecord_originaldatemovedno', parseInt(oldRecData.numDateMoved));
        historyRecord.setFieldValue('custrecord_newdatemovedno', numMoved);
        historyRecord.setFieldValue('custrecord_reasonforchange', newRecData.changeReason);
        if ( linkedProjTasks.length == 1 )
        {
            nlapiLogExecution('DEBUG', 'createMilestoneHistoryRecord()', "A");
            if (linkedProjTasks[0] != '') {
                nlapiLogExecution('DEBUG', 'createMilestoneHistoryRecord()', "B");
                historyRecord.setFieldValues('custrecord_projecttasks', linkedProjTasks);
            }
        }
        else if ( linkedProjTasks != null )
        {
            nlapiLogExecution('DEBUG', 'createMilestoneHistoryRecord()', "C");
            historyRecord.setFieldValues('custrecord_projecttasks', linkedProjTasks);
        }
        historyRecord.setFieldValue('custrecord_sr_pth_project', parseInt(newRecData.projectID));

        if ( typeOfAdjustment == 'met' ){
            historyRecord.setFieldValue('custrecord_met_milestone', 'T');
            nlapiLogExecution('DEBUG', 'createMilestoneHistoryRecord()', "MET Milestone - marked Met Milestone checkbox");
        }

        nlapiLogExecution('DEBUG', 'createMilestoneHistoryRecord()', "newRecData.projectManager: " + newRecData.projectManager);
        if ( newRecData.projectManager != '' )
            historyRecord.setFieldValue('custrecord_sr_pth_projectmanager', parseInt(newRecData.projectManager));
        nlapiLogExecution('DEBUG', 'createMilestoneHistoryRecord()', "9");

        var id = nlapiSubmitRecord(historyRecord, false, true);
        nlapiLogExecution('DEBUG', 'createMilestoneHistoryRecord()', 'New ' + recTypeLogged + ' Milestone Record Created: ' + id);

        // Need to increment the Project Tasks to reflect another Milestone Date Blown occurrence
        incrementProjectTasks(linkedProjTasks, newRecData.currentProjTaskID, newRecData.endDateAdjusted, typeOfAdjustment, newRecData.taskStatus);
        nlapiLogExecution('DEBUG', 'createMilestoneHistoryRecord()', "11");

    }
    catch(e)
    {
        var msg = Logger.FormatException(e);
        nlapiLogExecution('DEBUG', 'Unexpected Error in createMilestoneHistoryRecord()', msg);
        var emailbody = "Function:  createMilestoneHistoryRecord\nEnvironment:  Sandbox\nError:  " + msg;
        Messaging.SendMessage(25846, 'alliant1@exploreconsulting.com', 'Unexpected Error Occurred in EC_UserEvent_ProjectTask.js', emailbody);
    }
}

function incrementProjectTasks(linkedProjTasks, currentProjTaskID, endDateAdjustedToSet, adjustmentType, newRecStatus)
{
    try
    {
        nlapiLogExecution('DEBUG', 'incrementProjectTasks()', "linkedProjTasks.length: " + linkedProjTasks.length);
        for ( var i=0; linkedProjTasks != null && i<linkedProjTasks.length; i++ )
        {
            var projTask = nlapiLoadRecord('projecttask', linkedProjTasks[i]);
            if ( linkedProjTasks[i] != currentProjTaskID && adjustmentType != 'met' )
            {
                nlapiLogExecution('DEBUG', 'incrementProjectTasks() -- type != met', "Setting End Date Adjusted: " + CURRENTENDDATEADJ);
                projTask.setFieldValue('custevent_enddateadjusted', CURRENTENDDATEADJ);
                nlapiLogExecution('DEBUG', 'incrementProjectTasks()', "AFTER Setting End Date Adjusted: " + projTask.getFieldValue('custevent_enddateadjusted'));
            }
            else if ( linkedProjTasks[i] != currentProjTaskID && adjustmentType == 'met' )
            {
                nlapiLogExecution('DEBUG', 'incrementProjectTasks() -- type = met', "Setting Task Status");
                projTask.setFieldValue('custevent_taskstatus', newRecStatus);
            }

            if ( adjustmentType == 'blown' )
            {
                var numBlown = projTask.getFieldValue('custevent_dateblown');
                nlapiLogExecution('DEBUG', 'incrementProjectTasks() -- type = Blown', "BEFORE Incrementing Date Blown field: " + newNumBlown);
                if ( numBlown == null )
                    var newNumBlown  = 1;
                else
                    var newNumBlown  = parseInt(numBlown) + 1;
                projTask.setFieldValue('custevent_dateblown', newNumBlown);
                nlapiLogExecution('DEBUG', 'incrementProjectTasks() -- type = Blown', "Incrementing Date Blown field: " + newNumBlown);
            }
            else if ( adjustmentType == 'moved' )
            {
                var numMoved = projTask.getFieldValue('custevent_datemoved');
                nlapiLogExecution('DEBUG', 'incrementProjectTasks() -- type = Moved', "BEFORE Incrementing Date Moved field: " + newNumMoved);
                if ( numMoved == null )
                    var newNumMoved  = 1;
                else
                    var newNumMoved  = parseInt(numMoved) + 1;
                projTask.setFieldValue('custevent_datemoved', newNumMoved);
                nlapiLogExecution('DEBUG', 'incrementProjectTasks() -- type = Moved', "Incrementing Date Moved field: " + newNumMoved);
            }
            else if ( adjustmentType == 'met' )
            {
                projTask.setFieldValue('custevent_milestone_met', 'T');
                projTask.setFieldValue('custevent_milestone_met_date', nlapiDateToString(new Date()));
                nlapiLogExecution('DEBUG', 'incrementProjectTasks() -- type = Met', "Setting Mielstone Date and Flag: " + projTask.getFieldValue('custevent_milestone_met'));
            }

            // Always need to make sure that the End Date matches the End Date Adjusted
            nlapiLogExecution('DEBUG', 'incrementProjectTasks()', "endDateAdjustedToSet: " + CURRENTENDDATEADJ);
            projTask.setFieldValue('enddate', CURRENTENDDATEADJ);
            nlapiLogExecution('DEBUG', 'incrementProjectTasks()', "After End Date is set: " + projTask.getFieldValue('enddate'));

            var id = nlapiSubmitRecord(projTask, false, true);
            nlapiLogExecution('DEBUG', 'incrementProjectTasks() -- Project Task Updated', id);

            //nlapiSubmitField('projecttask', linkedProjTasks[i], 'enddate', endDateAdjustedToSet);
        }
    }
    catch(e)
    {
        var msg = Logger.FormatException(e);
        nlapiLogExecution('DEBUG', 'Unexpected Error in incrementProjectTasks()', msg);
        var emailbody = "Function:  incrementProjectTasks\nEnvironment:  Sandbox\nError:  " + msg;
        Messaging.SendMessage(25846, 'alliant1@exploreconsulting.com', 'Unexpected Error Occurred in EC_UserEvent_ProjectTask.js', emailbody);
    }
}


function updateEndDateAdjOnProjectTasks(linkedProjTasks, currentProjTaskID, endDateAdjustedToSet)
{
    try
    {
        nlapiLogExecution('DEBUG', 'updateEndDateAdjOnProjectTasks()', "linkedProjTasks.length: " + linkedProjTasks.length);
        for ( var i=0; linkedProjTasks != null && i<linkedProjTasks.length; i++ )
        {
            var projTask = nlapiLoadRecord('projecttask', linkedProjTasks[i]);
            if ( linkedProjTasks[i] != currentProjTaskID )
            {
                nlapiLogExecution('DEBUG', 'updateEndDateAdjOnProjectTasks()', "Setting End Date Adjusted: " + CURRENTENDDATEADJ);
                projTask.setFieldValue('custevent_enddateadjusted', CURRENTENDDATEADJ);
                nlapiLogExecution('DEBUG', 'updateEndDateAdjOnProjectTasks()', "AFTER Setting End Date Adjusted: " + projTask.getFieldValue('custevent_enddateadjusted'));

                // Always need to make sure that the End Date matches the End Date Adjusted
                nlapiLogExecution('DEBUG', 'updateEndDateAdjOnProjectTasks()', "endDateAdjustedToSet: " + CURRENTENDDATEADJ);
                projTask.setFieldValue('enddate', CURRENTENDDATEADJ);
                nlapiLogExecution('DEBUG', 'updateEndDateAdjOnProjectTasks()', "After End Date is set: " + projTask.getFieldValue('enddate'));

                var id = nlapiSubmitRecord(projTask, false, true);
                nlapiLogExecution('DEBUG', 'updateEndDateAdjOnProjectTasks() -- Project Task Updated', id);
            }
            else
            {
                nlapiLogExecution('DEBUG', 'updateEndDateAdjOnProjectTasks()', "Project Task was the Current Task ID -- date not set");
            }

        }
    }
    catch(e)
    {
        var msg = Logger.FormatException(e);
        nlapiLogExecution('DEBUG', 'Unexpected Error in updateEndDateAdjOnProjectTasks()', msg);
        var emailbody = "Function:  updateEndDateAdjOnProjectTasks\nEnvironment:  Sandbox\nError:  " + msg;
        Messaging.SendMessage(25846, 'alliant1@exploreconsulting.com', 'Unexpected Error Occurred in EC_UserEvent_ProjectTask.js', emailbody);
    }
}

function updateRelatedTasks()
{
    var executionContext = nlapiGetContext().getExecutionContext();
    if (executionContext == 'userevent' || executionContext == 'scheduled' )
        return;         // If this has been triggered by one of our scripts, do nothing

    var newRecord = nlapiGetNewRecord();
    var newProps = new Array();
    newProps.push('custevent_taskstatus');
    newProps.push('custevent_enddateadjusted');
    newProps.push('custevent_linked_project_tasks');
    newProps.push('custevent_apply_status_to_other_tasks');
    newProps.push('custevent_poc_value');
    newProps.push('custevent_replicate_in_other_years');
    newProps.push('custevent6');    // Custom field for completion date
    newProps.push('company');
    newProps.push('title');
    newProps.push('status');
    newProps.push('estimatedwork');
    newProps.push('custevent_milestone');
    newProps.push('custevent10');   // Project Task Type
    newProps.push('parent');

    var newRecordObj = nsdal.loadObject('projectTask',newRecord.getId(),newProps);

    var oldRecord = nlapiGetOldRecord();
    var oldProps = new Array();
    oldProps.push('custevent_taskstatus');
    var oldRecordObj = nsdal.fromRecord(oldRecord,oldProps);


    // scurry 11/7/2012: Temporarily removing requirement that the taskstatus field has changed, per Jon Love.
    //if ( !oldRecord || newRecordObj.custevent_taskstatus != oldRecordObj.custevent_taskstatus )
    //{
        // If task status is completed or terminated, set status to completed
        var taskStatus = newRecordObj.custevent_taskstatus;

        if ( taskStatus == '3' || taskStatus == '2' )
            newRecordObj.status = 'COMPLETE';

        // 2. Manage Status Change
        // 3. Manage Completed Date
        updateStatusChangeAndCompletionDate(newRecordObj);

        if ( newRecordObj.custevent_taskstatus == '3' ) // Terminated
        {
            updateProjectPOC(newRecordObj);
        }
    //}

    newRecordObj.save();
}

function updateStatusChangeAndCompletionDate(newRecord)
{
    var updateList = new Array();
    newRecord.custevent_linked_project_tasks =
        newRecord.custevent_linked_project_tasks.sort(function(l,r){return parseInt(l) - parseInt(r)});
    newRecord.custevent_apply_status_to_other_tasks =
        newRecord.custevent_apply_status_to_other_tasks.sort(function(l,r){return parseInt(l) - parseInt(r)});

    var i=0;
    var j=0;

    while ( i < newRecord.custevent_linked_project_tasks.length ||
        j < newRecord.custevent_apply_status_to_other_tasks.length)
    {
        if ( j >= newRecord.custevent_apply_status_to_other_tasks.length ||
            parseInt(newRecord.custevent_linked_project_tasks[i]) <
                parseInt(newRecord.custevent_apply_status_to_other_tasks[j]) )
        {
            // Use custevent_linked_project_tasks
            updateList.push(newRecord.custevent_linked_project_tasks[i]);
            i++;
            continue;
        }

        if ( i >= newRecord.custevent_linked_project_tasks.length ||
            parseInt(newRecord.custevent_linked_project_tasks[i]) >
                parseInt(newRecord.custevent_apply_status_to_other_tasks[j]) )
        {
            // Use custevent_apply_status_to_other_tasks
            updateList.push(newRecord.custevent_apply_status_to_other_tasks[j]);
            j++;
            continue;
        }

        if ( parseInt(newRecord.custevent_linked_project_tasks[i]) ==
            parseInt(newRecord.custevent_apply_status_to_other_tasks[j]) )
        {
            // Use custevent_linked_project_tasks, but skip the equal value in custevent_apply_status_to_other_tasks
            updateList.push(newRecord.custevent_linked_project_tasks[i]);
            i++;
            j++;
            continue;
        }
    }

    var linkedProps = new Array();
    linkedProps.push('custevent_taskstatus');
    linkedProps.push('custevent6');    // Custom field for completion date
    linkedProps.push('custevent_poc_value');
    linkedProps.push('status');
    linkedProps.push('custevent_enddateadjusted');

    var POCTotal = 0;
    Logger.Debug('Update List Length',updateList.length);
    for ( var id=0; id < updateList.length; id++ )
    {
        // Load linked records to set fields
        var linkedObj = nsdal.loadObject('projectTask',updateList[id],linkedProps);

        linkedObj.custevent_taskstatus = newRecord.custevent_taskstatus;
        linkedObj.status = newRecord.status;
        linkedObj.custevent_enddateadjusted = newRecord.custevent_enddateadjusted;

        if ( newRecord.custevent_taskstatus == '2' )    // Completed
        {
            linkedObj.custevent6 = newRecord.custevent6;
            POCTotal += linkedObj.custevent_poc_value != null ? parseFloat(linkedObj.custevent_poc_value) : 0;
        }

        linkedObj.save();
    }

    if ( newRecord.custevent_taskstatus == '2' )    // Completed
    {
        POCTotal += newRecord.custevent_poc_value != null ? parseFloat(newRecord.custevent_poc_value) : 0;
        // Use this POCTotal to increment POC in parent project
        var projectProps = new Array();
        projectProps.push('custentity_percentmilecomp');
        var projectObj = nsdal.loadObject('job',newRecord.company,projectProps);
        var currentComplete = projectObj.custentity_percentmilecomp != null ?
                                parseFloat(projectObj.custentity_percentmilecomp) : 0;
        projectObj.custentity_percentmilecomp = currentComplete + POCTotal;
        projectObj.save();
    }

    // Clear out multi-select field 'Apply Status to Other Tasks'
    newRecord.custevent_apply_status_to_other_tasks = [];
}

function replicateTaskInOtherYears(newRecord)
{
    Logger.Debug('Replicating in other years',newRecord.getFieldText('company'));
    var filters = new Array();
    filters.push(new nlobjSearchFilter('company',null,'anyof',newRecord.company));
    filters.push(new nlobjSearchFilter('custevent_task_is_year',null,'is','T'));
    var columns = new Array();
    columns.push(new nlobjSearchColumn('title'));
    columns.push(new nlobjSearchColumn('internalid'));
    var taskYears = nlapiSearchRecord('projectTask',null,filters,columns);

    var createProps = new Array();
    createProps.push('title');
    createProps.push('status');
    createProps.push('estimatedwork');
    createProps.push('custevent_milestone');
    createProps.push('custevent_enddateadjusted');
    createProps.push('custevent10');
    createProps.push('custevent_taskstatus');
    createProps.push('custevent_linked_project_tasks');
    createProps.push('custevent_poc_value');
    createProps.push('parent');
    createProps.push('company');

    for ( var i=0; taskYears && i < taskYears.length; i++ )
    {
        if ( newRecord.parent != taskYears[i].getValue(columns[1]) )
        {
            var title = taskYears[i].getValue(columns[0]);
            var newTask = nsdal.createObject('projectTask',createProps);

            newTask.title = newRecord.title + ';' + title;
            newTask.status = newRecord.status;
            newTask.estimatedwork = newRecord.estimatedwork;
            newTask.custevent_milestone = newRecord.custevent_milestone;
            newTask.custevent_enddateadjusted = newRecord.custevent_enddateadjusted;
            newTask.custevent10 = newRecord.custevent10;
            newTask.custevent_taskstatus = newRecord.custevent_taskstatus;
            newTask.custevent_linked_project_tasks = newRecord.custevent_linked_project_tasks;
            newTask.custevent_poc_value = newRecord.custevent_poc_value;
            newTask.company = newRecord.company;
            newTask.parent = taskYears[i].getValue(columns[1]);

            newTask.save();
        }
    }
}

function updateProjectPOC(newRecord)
{
    var scriptParams = {};
    scriptParams['custscript_task_id'] = newRecord.getId();
    var status = nlapiScheduleScript('customscript_ec_scheduled_projectask_poc','customdeploy_ec_scheduled_projectask_poc',
        scriptParams);
}



