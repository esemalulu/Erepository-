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
    var MSG_TITLE = 'Transform Transaction';
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
 * This script transforms transaction and sets them for printing
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
function main()
{
    debugMsg('=====Start=====');

    var SHOULD_CREATE_CHECK_LOG = (nlapiGetContext().getSetting('SCRIPT', 'custscript_transform_tran_cr8_check_log')==YES);
    var CHECK_LOG_TYPE_TO_CREATE = nlapiGetContext().getSetting('SCRIPT', 'custscript_trnsfrm_tran_chk_log_type_cr8');
    var TO_BE_PRINTED = (nlapiGetContext().getSetting('SCRIPT', 'custscript_tranform_trans_to_be_printed')==YES);
    var TRAN_TYPE_TO = RENEWAL_TRAN_TYPE[parseInt(nlapiGetContext().getSetting('SCRIPT', 'custscript_transform_tran_type'))];
    var CHECK_LOG_TYPE_TO_PROCESS = nlapiGetContext().getSetting('SCRIPT', 'custscript_transform_tran_check_log_type');
    var arrItemCatsToProcess = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_transform_tran_item_cat'));
    var SCRIPT_ID = nlapiGetContext().getSetting('SCRIPT', 'custscript_transform_tran_script_id');

    debugMsg('Script Parameters: '
            + '\n' + 'Check Log Type to Process:' + CHECK_LOG_TYPE_TO_PROCESS
            + '\n' + 'Transaction Type to transform to:' + TRAN_TYPE_TO
            + '\n' + 'To be printed:' + TO_BE_PRINTED
            + '\n' + 'Create Check Log Entries:' + SHOULD_CREATE_CHECK_LOG
            + '\n' + 'Check Log Type to Create:' + CHECK_LOG_TYPE_TO_CREATE
            + '\n' + 'Script ID:' + SCRIPT_ID
            );

    /* For Batch Scheduler */
    var beacon = new BatchScheduler(SCRIPT_ID);
    beacon.begin();
    beacon.startParagraph();
    /* ***************************/

    /* Get all transactions from the check log. */
    var arrCheckLogFilters = [
        new nlobjSearchFilter('custrecord_check_log_status', null, 'is', CHECK_LOG_STATUS_PENDING),
        new nlobjSearchFilter('custrecord_check_log_type', null, 'is', CHECK_LOG_TYPE_TO_PROCESS),
        new nlobjSearchFilter('isinactive', null, 'is', 'F')
    ];
    var arrCheckLogColumns = [
        new nlobjSearchColumn('custrecord_transaction')
    ];
    var arrCheckLogResults = nlapiSearchRecord('customrecord_check_log', '', arrCheckLogFilters, arrCheckLogColumns);
    if (arrCheckLogResults)
    {
        for (var idx = 0; idx < arrCheckLogResults.length; idx++)
        {
            try
            {

                var stTranId = arrCheckLogResults[idx].getValue('custrecord_transaction');
                debugMsg('Tranforming Transaction #' + stTranId);
                /* Transform the transaction */
                var recTransformed = nlapiTransformRecord(nlapiLookupField('transaction', stTranId, 'recordType'), stTranId, TRAN_TYPE_TO);
                recTransformed.setFieldValue('tobeprinted', ((TO_BE_PRINTED)?'T':'F'));

                /* Default the dates if they are missing. */
                var stTranDate = recTransformed.getFieldValue('trandate'); 
                if(stTranDate == null || stTranDate == undefined || stTranDate == ''){
                    recTransformed.setFieldValue('trandate',nlapiDateToString(new Date()));
                }
                var stStartDate = recTransformed.getFieldValue('startdate');
                if(stStartDate == null || stStartDate == undefined || stStartDate == ''){
                    recTransformed.setFieldValue('startdate',stTranDate);
                }
                var stEndDate = recTransformed.getFieldValue('enddate');
                if(stEndDate == null || stEndDate == undefined || stEndDate == ''){
                    recTransformed.setFieldValue('enddate',nlapiDateToString(nlapiAddDays(nlapiAddMonths(nlapiStringToDate(stTranDate),12),-1)));
                }

                for(var x=1;x<=recTransformed.getLineItemCount('item');x++){
                    debugMsg('Looping through line item ' + x);
                    var stRevRecStartDate = recTransformed.getLineItemValue('item','revrecstartdate',x);
                    debugMsg('stRevRecStartDate=' + stRevRecStartDate);
                    if(stRevRecStartDate == null || stRevRecStartDate == undefined || stRevRecStartDate == ''){
                        var stItemCat = recTransformed.getLineItemValue('item','custcol_item_category',x);
                        if(searchInList(arrItemCatsToProcess,stItemCat)){
                            debugMsg('Populating Rev Rec Start Date for Line ' + x);
                            recTransformed.setLineItemValue('item','revrecstartdate',x,stStartDate);
                        }
                    }
                }


                var stTransformedId = nlapiSubmitRecord(recTransformed, true, true);
                debugMsg('New Transaction ID: ' + stTransformedId);

                if(SHOULD_CREATE_CHECK_LOG){
                    /* Create the check log record. */
                    debugMsg('Creating Check Log');
                    var stCheckLogId = insertToCheckLog(stTransformedId,CHECK_LOG_TYPE_TO_CREATE,CHECK_LOG_STATUS_PENDING);
                    if(stCheckLogId != null && stCheckLogId != undefined && stCheckLogId != ''){
                        debugMsg('Contract Check Log Created. ID = ' + stCheckLogId);
                    }else{
                        debugMsg('Transaction already in check log.');
                    }
                }

                debugMsg('Updating Check Log status');
                var arrCheckLogUpdateFields = ['custrecord_check_log_status','custrecord_check_log_error_details'];
                var arrCheckLogUpdateValues = [CHECK_LOG_STATUS_PROCESSED,''];
                nlapiSubmitField('customrecord_check_log', arrCheckLogResults[idx].getId(), arrCheckLogUpdateFields, arrCheckLogUpdateValues);

            }
            catch(ex)
            {
                debugMsg('Error Occurred.');
                if (ex.getDetails != undefined)
                {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Transaction Transformation ' + stTranId + ':' + ex.getDetails());
                }
                else
                {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Transaction Transformation ' + stTranId + ':' + ex.toString());
                }

                var arrCheckLogUpdateFields = ['custrecord_check_log_status','custrecord_check_log_error_details'];
                var arrCheckLogUpdateValues = [CHECK_LOG_STATUS_ERROR,ex.toString()];

                nlapiSubmitField('customrecord_check_log', arrCheckLogResults[idx].getId(), arrCheckLogUpdateFields, arrCheckLogUpdateValues);
            }
            /* Batch Scheduler processing */
            if(beacon.endParagraph()){
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