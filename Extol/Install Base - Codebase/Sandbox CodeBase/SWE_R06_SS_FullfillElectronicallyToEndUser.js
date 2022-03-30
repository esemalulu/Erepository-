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
    var MSG_TITLE = 'Fufill Electronically to End User';
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


function main()
{
    debugMsg('=====Start=====');


    var DOWNLOAD_ITEM_TYPE = 'DwnLdItem';
    var SHOULD_EMAIL_PASSWORD = (nlapiGetContext().getSetting('SCRIPT', 'custscript_r9_email_password') == YES);
    var PASSWORD_GEN_TYPE = nlapiGetContext().getSetting('SCRIPT', 'custscript_r9_password_gen_logic');
    var ROLE = nlapiGetContext().getSetting('SCRIPT', 'custscript_r9_role_to_provision');
    var EMAIL_SUBJ = nlapiGetContext().getSetting('SCRIPT', 'custscript_r9_email_subject');
    var EMAIL_FROM = nlapiGetContext().getSetting('SCRIPT', 'custscript_r9_email_from_id');
    var CHECK_LOG_TYPE = nlapiGetContext().getSetting('SCRIPT', 'custscript_r9_check_log_type');
    var EMAIL_TEMPLATE = nlapiGetContext().getSetting('SCRIPT', 'custscript_r9_email_template');
    var CASH_SALE_FORM = nlapiGetContext().getSetting('SCRIPT', 'custscript_fulfill_electronically_cf');
    var SCRIPT_ID = nlapiGetContext().getSetting('SCRIPT', 'custscript_fulfill_elec_script_id');

    debugMsg('Script Parameters: '
            + '\n' + 'CHECK_LOG_TYPE:' + CHECK_LOG_TYPE
            + '\n' + 'ROLE:' + ROLE
            + '\n' + 'EMAIL_SUBJ:' + EMAIL_SUBJ
            + '\n' + 'EMAIL_FROM:' + EMAIL_FROM
            + '\n' + 'SHOULD_EMAIL_PASSWORD:' + SHOULD_EMAIL_PASSWORD
            + '\n' + 'PASSWORD_GEN_TYPE:' + PASSWORD_GEN_TYPE
            + '\n' + 'CASH_SALE_FORM:' + CASH_SALE_FORM
            + '\n' + 'SCRIPT_ID:' + SCRIPT_ID
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
        new nlobjSearchColumn('id', '', 'group'),
    ];
    var arrCheckLogResults = nlapiSearchRecord('customrecord_check_log', 'customsearch_check_log_records_4_process', arrCheckLogFilters, arrCheckLogColumns);
    if (arrCheckLogResults)
    {
        for (var idx = 0; idx < arrCheckLogResults.length; idx++)
        {
            try
            {
                var stOrigTranId = arrCheckLogResults[idx].getValue('internalid', 'CUSTRECORD_TRANSACTION', 'group');

                debugMsg('Processing Transaction ' + stOrigTranId);

                /* Generate Cash Sales using transaction's Download Items */
                var arrTranLineFilter = [
                    new nlobjSearchFilter('internalid', null, 'is', stOrigTranId),
                    new nlobjSearchFilter('type', 'item', 'is', DOWNLOAD_ITEM_TYPE)
                ];
                var arrTranLineColumn = [
                    new nlobjSearchColumn('item', null, 'group'),
                    new nlobjSearchColumn('quantity', null, 'group'),
                    new nlobjSearchColumn('custbody_order_type', null, 'group'),
                    new nlobjSearchColumn('custbody_bill_to_tier', null, 'group'),
                    new nlobjSearchColumn('custbody_distributor', null, 'group'),
                    new nlobjSearchColumn('custbody_reseller', null, 'group'),
                    new nlobjSearchColumn('custbody_end_user', null, 'group'),
                    new nlobjSearchColumn('startdate', null, 'group'),
                    new nlobjSearchColumn('enddate', null, 'group')
                ];

                var arrTranLineResults = nlapiSearchRecord('transaction', null, arrTranLineFilter, arrTranLineColumn);

                if (arrTranLineResults != null && arrTranLineResults != undefined && arrTranLineResults != '')
                {

                    /* Build the Cash Sale */
                    debugMsg('Building the Cash Sale');
                    var recCashSale = nlapiCreateRecord('cashsale');
                    var stCustId = arrTranLineResults[0].getValue('custbody_end_user', null, 'group');
                    if (stCustId == null || stCustId == undefined || stCustId == '')
                    {
                        debugMsg('End user is not defined.');
                        throw nlapiCreateError('END_USER_MISS', 'Transaction ' + stOrigTranId + ' has no End User defined.');
                    }

                    recCashSale.setFieldValue('custbody_bill_to_tier', arrTranLineResults[0].getValue('custbody_bill_to_tier', null, 'group'));
                    recCashSale.setFieldValue('custbody_distributor', arrTranLineResults[0].getValue('custbody_distributor', null, 'group'));
                    recCashSale.setFieldValue('custbody_reseller', arrTranLineResults[0].getValue('custbody_reseller', null, 'group'));
                    recCashSale.setFieldValue('startdate', arrTranLineResults[0].getValue('startdate', null, 'group'));
                    recCashSale.setFieldValue('enddate', arrTranLineResults[0].getValue('enddate', null, 'group'));
                    recCashSale.setFieldValue('customform', CASH_SALE_FORM);
                    recCashSale.setFieldValue('entity', stCustId);
                    recCashSale.setFieldValue('custbody_order_type', arrTranLineResults[0].getValue('custbody_order_type', null, 'group'));
                    recCashSale.setFieldValue('custbody_fulfill_elec_to_end_user', 'T');


                    /* There is at least 1 download item so create a cash sale */
                    for (var i = 0; i < arrTranLineResults.length; i++)
                    {
                        recCashSale.insertLineItem('item', (i + 1));
                        recCashSale.setLineItemValue('item', 'item', (i + 1), arrTranLineResults[i].getValue('item', null, 'group'));
                        recCashSale.setLineItemValue('item', 'quantity', (i + 1), arrTranLineResults[i].getValue('quantity', null, 'group'));
                    }

                    /* Provide Access if Customer is End User */
                    debugMsg('Providing access to ' + stCustId);

                    var stRecordType = nlapiLookupField('entity', stCustId, 'recordType');
                    var recEntity = nlapiLoadRecord(stRecordType, stCustId);

                    /* Build the password */
                    var stPassword = '';
                    switch (PASSWORD_GEN_TYPE)
                            {
                        case PWD_GEN_TYPE_RANDOM:
                            debugMsg('Password Generation:Random');
                            stPassword = passwordGenerator(10);
                            break;
                        case PWD_GEN_TYPE_FNAME_1:
                            debugMsg('Password Generation:First Name(5) + \'1\'');
                            var stFirstname = recEntity.getFieldValue('firstname');
                            if (stFirstname == null || stFirstname == undefined || stFirstname == '')
                            {
                                stFirstname = recEntity.getFieldValue('companyname');
                            }
                            if (stFirstname == null || stFirstname == undefined || stFirstname == '')
                            {
                                stPassword = passwordGenerator(10);
                            }
                            else
                            {
                                stPassword = trim(stFirstname.substring(0,5)) +  '1';
                            }
                            break;
                        case PWD_GEN_TYPE_FNAME_RANDOM:
                            debugMsg('Password Generation:Firstname(5) + Random');
                            var stFirstname = recEntity.getFieldValue('firstname');
                            if (stFirstname == null || stFirstname == undefined || stFirstname == '')
                            {
                                stFirstname = recEntity.getFieldValue('companyname');
                            }
                            if (stFirstname == null || stFirstname == undefined || stFirstname == '')
                            {
                                stPassword = passwordGenerator(10);
                            }
                            else
                            {
                                stPassword = trim(stFirstname.substring(0,5)) +  passwordGenerator(5);
                            }
                            break;
                    }
                    debugMsg('Password:' + stPassword);

                    recEntity.setFieldValue('accessrole', ROLE);
                    recEntity.setFieldValue('giveaccess', 'T');
                    recEntity.setFieldValue('password', stPassword);
                    recEntity.setFieldValue('password2', stPassword);

                    nlapiSubmitRecord(recEntity);

                    if (SHOULD_EMAIL_PASSWORD)
                    {
                        debugMsg('Emailing Password.');
                        var arrParameters = new Array();
                        arrParameters['NLCUSTPASSWORD'] = stPassword;
                        var stEmailBody = nlapiMergeRecord(EMAIL_TEMPLATE, stRecordType, stCustId, null, null, arrParameters).getValue();
                        nlapiSendEmail(EMAIL_FROM, stCustId, EMAIL_SUBJ, stEmailBody, null, null, null);
                    }

                    var stCashSaleId = nlapiSubmitRecord(recCashSale, true, true);
                    debugMsg('Cash Sale ID:' + stCashSaleId);

                    if (stCashSaleId == null || stCashSaleId == undefined || stCashSaleId == '')
                    {
                        debugMsg('Cash Sale creation for Transaction ' + stOrigTranId + ' failed.');
                        throw nlapiCreateError('CASH_SALE_CREATION_FAILED', 'Cash Sale creation for Transaction ' + stOrigTranId + ' failed.');
                    }

                }
                else
                {
                    debugMsg('No Download item is defined for transaction ' + stOrigTranId);
                    throw nlapiCreateError('DOWNLOAD_ITEM_MISS', 'Transaction ' + stOrigTranId + ' has no Download Item defined.');
                }

                debugMsg('Updating Check Log status');
                var arrCheckLogUpdateFields = ['custrecord_check_log_status','custrecord_check_log_error_details'];
                var arrCheckLogUpdateValues = [CHECK_LOG_STATUS_PROCESSED,''];
                nlapiSubmitField('customrecord_check_log', arrCheckLogResults[idx].getValue('id', '', 'group'), arrCheckLogUpdateFields, arrCheckLogUpdateValues);

            }
            catch(ex)
            {
                debugMsg('Error Occurred.');
                if (ex.getDetails != undefined)
                {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Fulfilling electronically for transaction ' + stOrigTranId + ':' + ex.getDetails());
                }
                else
                {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Fulfilling electronically for transaction ' + stOrigTranId + ':' + ex.toString());
                }
                var arrCheckLogUpdateFields = ['custrecord_check_log_status','custrecord_check_log_error_details'];
                var arrCheckLogUpdateValues = [CHECK_LOG_STATUS_ERROR,ex.toString()];

                nlapiSubmitField('customrecord_check_log', arrCheckLogResults[idx].getValue('id', '', 'group'), arrCheckLogUpdateFields, arrCheckLogUpdateValues);
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