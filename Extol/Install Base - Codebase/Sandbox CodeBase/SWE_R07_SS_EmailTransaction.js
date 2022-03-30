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
    var MSG_TITLE = 'Email Transaction at N Days';
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
 * This script loops through transactions that fit the parameters and sets them to send an email to the customer.
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */
 function main(){
    debugMsg('=====Start=====');

     var CHECK_LOG_TYPE = nlapiGetContext().getSetting('SCRIPT', 'custscript_email_tran_check_log_type');
     var SCRIPT_ID = nlapiGetContext().getSetting('SCRIPT', 'custscript_email_tran_script_id');

    debugMsg('Script Parameters: '
            + '\n' + 'Check Log Type:' + CHECK_LOG_TYPE
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
         new nlobjSearchFilter('custrecord_check_log_type', null, 'is', CHECK_LOG_TYPE),
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
            try{
                var stTranId = arrCheckLogResults[idx].getValue('custrecord_transaction');
                var recTran = nlapiLoadRecord(nlapiLookupField('transaction',stTranId,'recordType'),stTranId);
                var stCustId = recTran.getFieldValue('entity');
                var stEmailAddress = nlapiLookupField('entity',stCustId,'email');
                debugMsg('Processing Transaction #' + stTranId
                        + '\n' + 'Customer:' + stCustId
                        + '\n' + 'Email:' + stEmailAddress
                        );

                /* Send the email only when there is a valid email for the entity. */
                if(stEmailAddress != null && stEmailAddress != undefined && stEmailAddress != '' && stEmailAddress != '- None -'){
                    debugMsg('Sending Email to ' + stEmailAddress);
                    recTran.setFieldValue('tobeemailed','T');
                    recTran.setFieldValue('email',stEmailAddress);
                    nlapiSubmitRecord(recTran,true,true);
                }else{
                    debugMsg('Customer email address is missing.');
                    throw nlapiCreateError('CUST_EMAIL_MISS','Email address of Customer ' +  stCustId + ' for Transaction ' + stTranId + ' is missing.');
                }

                debugMsg('Updating Check Log status');
                var arrCheckLogUpdateFields = ['custrecord_check_log_status','custrecord_check_log_error_details'];
                var arrCheckLogUpdateValues = [CHECK_LOG_STATUS_PROCESSED,''];
                nlapiSubmitField('customrecord_check_log', arrCheckLogResults[idx].getId(), arrCheckLogUpdateFields, arrCheckLogUpdateValues);

            }catch(ex){
                debugMsg('Error Occurred.');
                if (ex.getDetails != undefined)
                {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Sending Email for transaction ' + stTranId + ':' + ex.getDetails());
                }
                else
                {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR','Sending Email for transaction ' + stTranId + ':' + ex.toString());
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