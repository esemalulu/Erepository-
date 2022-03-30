/**
 * Copyright (c) 1998-2008 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */


/**
 * This script is triggered whenever a Suitescript Tracker record is created/updated and schedules the Batch Scheduler script to run.
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function afterSubmit_runBatchScheduler(){
    var logger = new Logger(false);
    var MSG_TITLE = 'afterSubmit_runBatchScheduler';
    logger.enableDebug(); // comment this line to turn debugging off.
    logger.debug(MSG_TITLE, '=====Start=====');

    var bSendEmail = (nlapiGetContext().getSetting('SCRIPT','custscript_ss_tracker_send_email_sw')=='T');
    var stAdminToEmail = nlapiGetContext().getSetting('SCRIPT','custscript_ss_tracker_send_email_to');
    var stCurrentUser = nlapiGetContext().getUser();
    var stEmailSubject = '';
    var stEmailBody = '';
    var bNeedToSendEmail = false;
    var stSSTrackerURL = nlapiResolveURL('RECORD','customrecord_scheduled_script_tracker',nlapiGetRecordId(),false);
    logger.debug(MSG_TITLE, 'bSendEmail= ' + bSendEmail);
    logger.debug(MSG_TITLE, 'stAdminToEmail= ' + stAdminToEmail);
    logger.debug(MSG_TITLE, 'stCurrentUser= ' + stCurrentUser);
    logger.debug(MSG_TITLE, 'stSSTrackerURL= ' + stSSTrackerURL);

    /* Load the SS Tracker Record */
    var rec = nlapiLoadRecord('customrecord_scheduled_script_tracker',nlapiGetRecordId());

    if(rec != null && rec != undefined && rec != ''){

        var stStatus = rec.getFieldValue('custrecord_suitescript_run_status');
        var stDeploymentID = rec.getFieldValue('custrecord_ss_tracking_deploy_id');
        var stScriptID = rec.getFieldValue('custrecord_suitescript_script_id');
        logger.debug(MSG_TITLE, 'stStatus=' + stStatus);

        /*  If Incomplete, try and schedule another run */
        if(stStatus == SS_STATUS_INCOMPLETE){
            logger.debug(MSG_TITLE, 'stDeploymentID=' + stDeploymentID);
            logger.debug(MSG_TITLE, 'stScriptID=' + stScriptID);
            
            var stSchedStat = null;
            if(stDeploymentID == null || stDeploymentID == undefined || stDeploymentID == ''){
                stSchedStat = nlapiScheduleScript(stScriptID);
            }else{
                stSchedStat = nlapiScheduleScript(stScriptID, stDeploymentID);
            }
            logger.debug(MSG_TITLE, 'stDeploymentID=' + stDeploymentID);
            logger.debug(MSG_TITLE, 'stScriptID=' + stScriptID);
            
            /* If the script was not queued, try to send the email*/
            if(stSchedStat != 'QUEUED')
            {
                bNeedToSendEmail = true;
                stEmailSubject = 'Script '+ stScriptID +' Deployment '+ stDeploymentID +' :Script Execution Limit Reached';
                stEmailBody = 'Please schedule another run for Script (' + stScriptID + ') Deployment (' + stDeploymentID + ') because the last execution ran out of usage points and was not able to complete.\n Tracker ID: '
                        + nlapiGetRecordId() + '( https://system.netsuite.com' + stSSTrackerURL + ' )';
            }

            logger.debug(MSG_TITLE, 'Batch Scheduler Status:' + stSchedStat);
        }

        /* If Complete, build the email to be sent as a notification */
        if(stStatus == SS_STATUS_COMPLETE){
            bNeedToSendEmail = true;
            stEmailSubject = 'Script Execution Tracker Notification';
            stEmailBody = 'Script (' + stScriptID + ') Deployment (' + stDeploymentID + ') has been completed.\n Tracker ID: '
                    + nlapiGetRecordId() + '( https://system.netsuite.com' + stSSTrackerURL + ' )';
        }
        
        /* If In Error, build the email to be sent as a notification */
        if(stStatus == SS_STATUS_ERROR)
        {
            bNeedToSendEmail = true;
            stEmailSubject = 'Script Execution Tracker Notification';
            stEmailBody = 'Script (' + stScriptID + ') Deployment (' + stDeploymentID + ') encountered an error and should be reviewed.\n Tracker ID: '
                    + nlapiGetRecordId() + '( https://system.netsuite.com' + stSSTrackerURL + ' )';
        }
        
        /* Send an email if needed */
        if(bNeedToSendEmail)
        {
            logger.debug(MSG_TITLE, 'stEmailSubject=' + stEmailSubject);
            logger.debug(MSG_TITLE, 'stEmailBody=' + stEmailBody);
            if(stCurrentUser != stAdminToEmail)
            {
                if (stCurrentUser != '' && stCurrentUser != undefined && stCurrentUser != null && stCurrentUser != '-4') 
                {
                    if(bSendEmail)
                    {
                        logger.debug(MSG_TITLE, 'Email To User ID=' + stCurrentUser);
                        nlapiSendEmail( -5, stCurrentUser, stEmailSubject, stEmailBody );
                    }
                }
            }
            if(stAdminToEmail != null && stAdminToEmail != undefined && stAdminToEmail != '')
            {
                logger.debug(MSG_TITLE, 'Email To User ID=' + stAdminToEmail);
                nlapiSendEmail( -5, stAdminToEmail, stEmailSubject, stEmailBody );
            }
        }
    }

    logger.debug(MSG_TITLE, '=====End=====');
}
