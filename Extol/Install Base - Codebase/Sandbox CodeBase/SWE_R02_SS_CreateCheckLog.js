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

{
    var ENABLE_DEBUG = true;
    var MSG_TITLE = 'Create License Check Log';
}

/** 
 * Print's a log message
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function debugMsg(msg)
{
    if (ENABLE_DEBUG)
    {
        nlapiLogExecution('DEBUG', MSG_TITLE, msg);
    }
}


/**
 * This script would create a Contract Check Log record.
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function afterSubmit_CreateInstallBaseCheckLog(stType)
{
    debugMsg('=====Start=====');

    var stExecutionMode = nlapiGetContext().getExecutionContext();
	if (stExecutionMode != 'webservices' && stExecutionMode != 'csvimport' 
	    && stType != 'create' && stType != 'edit' && stType != 'xedit')
    {
       debugMsg('Type of Operation Unsupported.  ======Exit afterSubmit_CreateInstallBaseCheckLog======');
       return;
    }    

    var DFLT_CHECK_LOG_TYPE = nlapiGetContext().getSetting('SCRIPT', 'custscript_create_check_log_type');
    var ORDER_TYPES = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_checklog_creation_order_types'));

    debugMsg('Script Parameters:'
            + '\n' + 'Default Check Log Type:' + DFLT_CHECK_LOG_TYPE
            + '\n' + 'Order Types:' + ORDER_TYPES
            );

	var stTranInternalId = nlapiGetRecordId();
	var record = nlapiLoadRecord(nlapiGetRecordType(), stTranInternalId);
	var stOrderType = record.getFieldValue('custbody_order_type'); 
    debugMsg('Order Type: ' + stOrderType);
    debugMsg('Transaction Internal ID: ' + stTranInternalId);

    if (searchInList(ORDER_TYPES, stOrderType))
    {
        var stCheckLogID = insertToCheckLog(stTranInternalId, DFLT_CHECK_LOG_TYPE, CHECK_LOG_STATUS_PENDING);
        debugMsg('Check Log ID:' + stCheckLogID);
    }

    debugMsg('======End======');
}


function CreateCheckLogFromSearch()
{
    debugMsg('=====Start=====');

    var DFLT_CHECK_LOG_TYPE = nlapiGetContext().getSetting('SCRIPT', 'custscript_create_transform_chklog_type');
    var SAVED_SEARCH = nlapiGetContext().getSetting('SCRIPT', 'custscript_create_check_log_search');
    var SCRIPT_ID = nlapiGetContext().getSetting('SCRIPT', 'custscript_cr8_chklog_frm_srch_script_id');
    var DEPLOY_ID = nlapiGetContext().getSetting('SCRIPT', 'custscript_cr8_chklog_frm_srch_deploy_id');
    debugMsg('Script Parameters:'
            + '\n' + 'Default Check Log Type:' + DFLT_CHECK_LOG_TYPE
            + '\n' + 'Saved Search:' + SAVED_SEARCH
            + '\n' + 'Script ID:' + SCRIPT_ID
            + '\n' + 'Deployment ID:' + DEPLOY_ID
            );

    /* For Batch Scheduler */
    var beacon = new BatchScheduler(SCRIPT_ID, DEPLOY_ID);
    beacon.begin();

    /* Define how to retrieve variables that you want to be saved. */
    var funcMyVars = function()
    {
        var stFunctionForVars = '';
        stFunctionForVars = 'function funcReturnVars(){';
        stFunctionForVars += '    var objVars = new Array();';
        if(arrTranIDs.length > 0){
            stFunctionForVars += '    var tmp = \'' + arrTranIDs + '\';';
            stFunctionForVars += '    objVars[\'arrTranIDs\'] = tmp.split(\',\');';
        }
        stFunctionForVars += '    return objVars;';
        stFunctionForVars += '} funcReturnVars();';
        return stFunctionForVars;
    }
    beacon.setVariableFunction(funcMyVars);

    beacon.startParagraph();
    /* ***************************/

    /* Keep a list of processed IDs. */
    var arrTranIDs = new Array();

    /* Check if there's stored information for the variable */
    if (beacon.getVariables() != null && beacon.getVariables() != undefined)
    {
        var objMyVariables = beacon.getVariables();
        arrTranIDs = objMyVariables['arrTranIDs'];
        if (arrTranIDs == null)
        {
            arrTranIDs = new Array();
        }
    }
    debugMsg('Tran IDs to skip:' + arrTranIDs.toString());

    var arrTranFilters = [
        new nlobjSearchFilter('internalid', null, 'noneof', arrTranIDs),
    ];
    if (arrTranIDs.length > 0)
    {
        var arrTranResults = nlapiSearchRecord('transaction', SAVED_SEARCH, arrTranFilters, null);
    }
    else
    {
        var arrTranResults = nlapiSearchRecord('transaction', SAVED_SEARCH, null, null);
    }

    if (arrTranResults != null && arrTranResults != undefined && arrTranResults != '')
    {
        for (var iTranIdx = 0; iTranIdx < arrTranResults.length; iTranIdx ++)
        {
            try
            {
                var stTranId = arrTranResults[iTranIdx].getValue('internalid', null, 'group');
                debugMsg('Processing Transaction ' + stTranId);
                insertToCheckLog(stTranId, DFLT_CHECK_LOG_TYPE, CHECK_LOG_STATUS_PENDING);
                if (!searchInList(arrTranIDs, stTranId))
                {
                    debugMsg('Adding Tran ' + stTranId + ' in the list.');
                    arrTranIDs.push(stTranId);
                }
            }
            catch(ex)
            {
                debugMsg('Error Occurred.');
                if (ex.getDetails != undefined)
                {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Creation of Check Log for ' + stTranId + ':' + ex.getDetails());
                }
                else
                {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Creation of Check Log for ' + stTranId + ':' + ex.toString());
                }
            }
            /* Batch Scheduler processing */
            if (beacon.endParagraph())
            {
                break;
            }
            /* ****************************/
        }
    }

    /* Batch Scheduler processing */
    beacon.end();
    /* ****************************/

    debugMsg('======End======');
}