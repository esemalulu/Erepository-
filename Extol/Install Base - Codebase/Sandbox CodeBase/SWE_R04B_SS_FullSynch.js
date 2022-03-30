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
 * This script updates the status of licenses to active or expired as well as customer/product end dates.
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */

var logger;

var REMAINING_USAGE_LIMIT      = 200; // we reschedule the script if we have less than REMAINING_USAGE_LIMIT usage
var MAX_NO_RESCHED_RESULT      = 999; // maximum resultset that don't need re sched 

var MS_MODEL                 = nlapiGetContext().getSetting('SCRIPT', 'custscript_full_synch_ms_model');
var MS_FOR_MULTI             = nlapiGetContext().getSetting('SCRIPT', 'custscript_full_synch_ms_multi_support');
var MS_FOR_EXPIRED           = nlapiGetContext().getSetting('SCRIPT', 'custscript_fullsynch_ms_type_for_expired');
var SCRIPT_ID                = nlapiGetContext().getSetting('SCRIPT', 'custscript_full_synch_script_id');
var EXPIRED_ENTITY_STATUS    = nlapiGetContext().getSetting('SCRIPT', 'custscript_f_synch_entity_status_expired');
var CO_TERM_BASIS            = nlapiGetContext().getSetting('SCRIPT', 'custscript_full_synch_coterm_end_date');
var REINSTATED_ENTITY_STATUS = nlapiGetContext().getSetting('SCRIPT', 'custscript_f_synch_entity_stat_reinstatd');
var CUSTOMER_TO_PROCESS      = nlapiGetContext().getSetting('SCRIPT', 'custscript_cust_to_process');
   
var arrItemCatsTerm          = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_full_synch_item_cat_term'));
var arrItemCatsPerpetual     = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_full_synch_item_cat_perpetual'));
var arrItemCatsToCompute     = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_full_synch_item_cats'));
    
/**
 * main entry point
 */
function main() {
    var MSG_TITLE = 'Full Synch';
    logger        = new Logger(false);
    logger.enableDebug(); //comment this line to disable debug

    logger.audit(MSG_TITLE, '=====Start=====');
    logger.audit(MSG_TITLE, 'Script Parameters:\n'
            + '\nFUTURE_STATUS              = ' + SYNCH_STATUS_FUTURE
            + '\nACTIVE_STATUS              = ' + SYNCH_STATUS_ACTIVE
            + '\nEXPIRED_STATUS             = ' + SYNCH_STATUS_EXPIRED
            + '\nM/S Model                  = ' + MS_MODEL
            + '\nItem Categories for Price  = ' + arrItemCatsToCompute
            + '\nUsage Points               = ' + nlapiGetContext().getRemainingUsage()
            + '\nScript ID                  = ' + SCRIPT_ID
            + '\nEntity Status - Expired    = ' + EXPIRED_ENTITY_STATUS
            + '\nEntity Status - Reinstated = ' + REINSTATED_ENTITY_STATUS
            + '\nItem Category - Term       = ' + arrItemCatsTerm
            + '\nItem Category - Perpetual  = ' + arrItemCatsPerpetual
            + '\nCo-Term Basis              = ' + CO_TERM_BASIS
            + '\nCUSTOMER_TO_PROCESS        = ' + CUSTOMER_TO_PROCESS
    );

    /* Synch Contracts */
    var dtToday     = new Date();
    var stDateToday = nlapiDateToString(dtToday);
    logger.audit(MSG_TITLE, 'Today is ' + stDateToday);

    var runDateTime    = nlapiGetContext().getSetting('SCRIPT', 'custscript_r04b_rundatetime');
    var custIdParam    = nlapiGetContext().getSetting('SCRIPT', 'custscript_r04b_custid');
    var productIdParam = nlapiGetContext().getSetting('SCRIPT', 'custscript_r04b_productid');
    if (runDateTime == null || runDateTime == undefined || runDateTime == '') {
        logger.audit(MSG_TITLE, 'RESCHEDULING: Params -- custIdParam:[' + custIdParam + '] :: productIdParam:[' + productIdParam + '] :: runDateTime:[' + runDateTime + ']');
        var param = new Object();
        runDateTime = dtToday;
        param.custscript_r04b_rundatetime = runDateTime;
        param.custscript_r04b_custid      = custIdParam;
        param.custscript_r04b_productid   = productIdParam;
        param.custscript_cust_to_process  = CUSTOMER_TO_PROCESS;
        logger.audit(MSG_TITLE, 'RESCHEDULING: Params -- custIdParam:[' + custIdParam + '] :: productIdParam:[' + productIdParam + '] :: runDateTime:[' + runDateTime + ']');
        nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
        return;
    } else {
        logger.audit(MSG_TITLE, 'custIdParam:[' + custIdParam + '] :: productIdParam:[' + productIdParam + '] :: runDateTime:[' + runDateTime + ']');
    }

    /*
    * Search for contract records that have a "Future" status that should be set to "Active" and
    * license records that have a "Future" status that should be set to "Expired",
    */
    var arrContractsColumns = [
        new nlobjSearchColumn('custrecord_install_base_type'),
        new nlobjSearchColumn('custrecord_install_base_product'),
        new nlobjSearchColumn('custrecord_install_base_bill_to_customer')
    ];
    var arrActiveContractsFilters = [
        new nlobjSearchFilter('custrecord_install_base_start_date',   null, 'onorbefore', stDateToday, null),
        new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'noneof',     [SYNCH_STATUS_ACTIVE, SYNCH_STATUS_CREDITED], null),
        new nlobjSearchFilter('isinactive',                           null, 'is',         'F'),
        new nlobjSearchFilter('isinactive', 'custrecord_install_base_bill_to_customer', 'is', 'F')
    ];
    if(CUSTOMER_TO_PROCESS != null && CUSTOMER_TO_PROCESS != undefined && CUSTOMER_TO_PROCESS != ''){
        logger.debug(MSG_TITLE, 'Limiting search to customer [' + CUSTOMER_TO_PROCESS + ']');     
        arrActiveContractsFilters.push(new nlobjSearchFilter('custrecord_install_base_bill_to_customer', null, 'is', CUSTOMER_TO_PROCESS));
    }

    if (activateInstallBasesWithEndDates(arrContractsColumns, arrActiveContractsFilters.concat([]), stDateToday, custIdParam, productIdParam, runDateTime, logger) == -1) {
        logger.audit(MSG_TITLE, '=====RESCHEDULED activateInstallBasesWithEndDates=====');
        return;
    }
    if (activateInstallBasesWithoutEndDates(arrContractsColumns, arrActiveContractsFilters.concat([]), stDateToday, custIdParam, productIdParam, runDateTime, logger) == -1) {
        logger.audit(MSG_TITLE, '=====RESCHEDULED activateInstallBasesWithoutEndDates=====');
        return;
    }
    if (expireInstallBases(arrContractsColumns, stDateToday, custIdParam, productIdParam, runDateTime, logger) == -1) {
        logger.audit(MSG_TITLE, '=====RESCHEDULED expireInstallBases=====');
        return;
    }
    if (reinstateCustomer(arrContractsColumns, stDateToday, custIdParam, productIdParam, runDateTime, logger) == -1) {
        logger.audit(MSG_TITLE, '=====RESCHEDULED reinstateCustomer=====');
        return;
    }
    
    if (processAllCustomers(custIdParam, productIdParam, runDateTime, logger) == -1) {
        logger.audit(MSG_TITLE, '=====RESCHEDULED processAllCustomers=====');
        return;
    }
    
    if (processAllProducts(custIdParam, productIdParam, runDateTime, logger) == -1) {
        logger.audit(MSG_TITLE, '=====RESCHEDULED processAllProducts=====');
        return;
    }
    logger.audit(MSG_TITLE, '=====END=====');
}   

function activateInstallBasesWithEndDates(arrContractsColumns, arrActiveContractsFilters, stDateToday, custIdParam, productIdParam, runDateTime, logger) {
    // Check for contracts that need to be activated (with end dates)
    var MSG_TITLE = 'Full Synch - Activating IBs with end dates';    
    logger.audit(MSG_TITLE,'Activating Install Base with end dates');
    logger.indent();
    
    arrActiveContractsFilters.push(new nlobjSearchFilter('custrecord_install_base_end_date', null, 'after', stDateToday, null));
    arrActiveContractsFilters.push(new nlobjSearchFilter('custrecord_install_base_end_date', null, 'isnotempty'));
    var arrActiveContractsResults = nlapiSearchRecord('customrecord_install_base', null, arrActiveContractsFilters, arrContractsColumns);

    if (arrActiveContractsResults != null && arrActiveContractsResults != undefined && arrActiveContractsResults != '') {
        logger.audit(MSG_TITLE, 'Activating ' + arrActiveContractsResults.length + ' contracts');
        logger.indent();
        for (var i = 0; i < arrActiveContractsResults.length; i++) {
            try {
                var stProdId     = arrActiveContractsResults[i].getValue('custrecord_install_base_product');
                var stCustId     = arrActiveContractsResults[i].getValue('custrecord_install_base_bill_to_customer');
                var stContractId = arrActiveContractsResults[i].getId();
                
                logger.debug(MSG_TITLE, 'Activating IB [' + stContractId + '] with Customer ID [' + stCustId + '] and  Product ID [' + stProdId + '] (' + i + ' of ' + arrActiveContractsResults.length + ')');
                nlapiSubmitField(arrActiveContractsResults[i].getRecordType(), stContractId, 'custrecord_install_base_synch_status', SYNCH_STATUS_ACTIVE);

                if (isScriptReQueued(arrActiveContractsResults.length, i, logger) == true) return -1;
                
            } catch(ex) {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined) {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Activate Contract ' + stContractId + ':' + ex.getDetails());
                } else {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Activate Contract ' + stContractId + ':' + ex.toString());
                }
                throw ex;
            }
        } // end loop
        logger.unindent();
        logger.audit(MSG_TITLE, 'DONE : Activating ' + arrActiveContractsResults.length + ' contracts');
    }
    logger.unindent();
    logger.audit(MSG_TITLE, 'DONE : Activating Install Base with end dates');
}

function activateInstallBasesWithoutEndDates(arrContractsColumns, arrActiveContractsFilters, stDateToday, custIdParam, productIdParam, runDateTime, logger) {
    // Check for contracts that need to be activated (without end dates)
    var MSG_TITLE = 'Full Synch - Activating IBs without end dates';    
    logger.audit(MSG_TITLE,'Activating Install Base without end dates');
    logger.indent();

    arrActiveContractsFilters.push(new nlobjSearchFilter('custrecord_install_base_end_date', null, 'isempty'));
    var arrActiveContractsResults = nlapiSearchRecord('customrecord_install_base', null, arrActiveContractsFilters, arrContractsColumns);

    if (arrActiveContractsResults != null && arrActiveContractsResults != undefined && arrActiveContractsResults != '') {
        logger.audit(MSG_TITLE, 'Activating ' + arrActiveContractsResults.length + ' contracts');
        logger.indent();
        for (var i = 0; i < arrActiveContractsResults.length; i++) {
            try {
                var stProdId     = arrActiveContractsResults[i].getValue('custrecord_install_base_product');
                var stCustId     = arrActiveContractsResults[i].getValue('custrecord_install_base_bill_to_customer');
                var stContractId = arrActiveContractsResults[i].getId();

                logger.debug(MSG_TITLE, 'Activating IB [' + stContractId + '] with Customer ID [' + stCustId + '] and  Product ID [' + stProdId + '] (' + i + ' of ' + arrActiveContractsResults.length + ')');
                nlapiSubmitField(arrActiveContractsResults[i].getRecordType(), stContractId, 'custrecord_install_base_synch_status', SYNCH_STATUS_ACTIVE);

                if (isScriptReQueued(arrActiveContractsResults.length, i, logger) == true) return -1;
                
            } catch(ex) {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined) {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Activate Contract ' + stContractId + ':' + ex.getDetails());
                } else {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Activate Contract ' + stContractId + ':' + ex.toString());
                }
                throw ex;
            }

        } // end loop
        logger.unindent();
        logger.audit(MSG_TITLE, 'DONE : Activating ' + arrActiveContractsResults.length + ' contracts');
    }
    logger.unindent();
    logger.audit(MSG_TITLE, 'DONE : Activating Install Base without end dates');
}

function expireInstallBases(arrContractsColumns, stDateToday, custIdParam, productIdParam, runDateTime, logger) {
    // Check for contracts that need to be expired
    var MSG_TITLE = 'Full Synch - Expiring IBs';    
    logger.audit(MSG_TITLE,'Expiring Install Base');
    logger.indent();
    
    var arrExpiredContractsFilters = [
        new nlobjSearchFilter('custrecord_install_base_end_date',     null, 'onorbefore', stDateToday, null),
        new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'noneof',     [SYNCH_STATUS_EXPIRED,SYNCH_STATUS_CREDITED], null),
        new nlobjSearchFilter('isinactive',                           null, 'is',         'F'),
        new nlobjSearchFilter('isinactive', 'custrecord_install_base_bill_to_customer', 'is', 'F')
    ];
    if(CUSTOMER_TO_PROCESS != null && CUSTOMER_TO_PROCESS != undefined && CUSTOMER_TO_PROCESS != ''){
        logger.debug(MSG_TITLE, 'Limiting search to customer [' + CUSTOMER_TO_PROCESS + ']');     
        arrExpiredContractsFilters.push(new nlobjSearchFilter('custrecord_install_base_bill_to_customer', null, 'is', CUSTOMER_TO_PROCESS ));
    }
    var arrExpiredContractsResults = nlapiSearchRecord('customrecord_install_base', null, arrExpiredContractsFilters, arrContractsColumns);

    if (arrExpiredContractsResults != null && arrExpiredContractsResults != undefined && arrExpiredContractsResults != '') {
        logger.audit(MSG_TITLE, 'Expiring ' + arrExpiredContractsResults.length + ' contracts');
        logger.indent();
        for (var i = 0; i < arrExpiredContractsResults.length; i++) {
            try {
                var stProdId     = arrExpiredContractsResults[i].getValue('custrecord_install_base_product');
                var stCustId     = arrExpiredContractsResults[i].getValue('custrecord_install_base_bill_to_customer');
                var stContractId = arrExpiredContractsResults[i].getId();
                
                logger.debug(MSG_TITLE, 'Expiring IB [' + stContractId + '] with Customer ID [' + stCustId + '] and  Product ID [' + stProdId + '] (' + i + ' of ' + arrExpiredContractsResults.length + ')');
                nlapiSubmitField(arrExpiredContractsResults[i].getRecordType(), arrExpiredContractsResults[i].getId(), 'custrecord_install_base_synch_status', SYNCH_STATUS_EXPIRED);
                
                if (isScriptReQueued(arrExpiredContractsResults.length, i, logger) == true) return -1;
                
           } catch(ex) {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined) {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Expiring Contracts:' + ex.getDetails());
                } else {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Expiring Contracts:' + ex.toString());
                }
                throw ex;
            }
        } // end loop
        logger.unindent();
        logger.audit(MSG_TITLE, 'DONE : Expiring ' + arrExpiredContractsResults.length + ' contracts');
    }
    logger.unindent();
    logger.audit(MSG_TITLE,'DONE : Expiring Install Base');
}

function reinstateCustomer(arrContractsColumns, stDateToday, custIdParam, productIdParam, runDateTime, logger) {
    // Check for customers that need to be reinstated
    var MSG_TITLE = 'Full Synch - Reinstating Customer';    
    logger.audit(MSG_TITLE, 'Reinstating Customers');
    logger.indent();

    var arrExpiredCustomerFilter = [
        new nlobjSearchFilter('custrecord_install_base_synch_status',     null,                                       'is',     SYNCH_STATUS_ACTIVE),
        new nlobjSearchFilter('internalid',                               'custrecord_install_base_bill_to_customer', 'noneof', '@NONE@'),
        new nlobjSearchFilter('entitystatus',                             'custrecord_install_base_bill_to_customer', 'is',     EXPIRED_ENTITY_STATUS)
    ];
    if(CUSTOMER_TO_PROCESS != null && CUSTOMER_TO_PROCESS != undefined && CUSTOMER_TO_PROCESS != '') {
        logger.debug(MSG_TITLE, 'Limiting search to customer [' + CUSTOMER_TO_PROCESS + ']');     
        arrExpiredCustomerFilter.push(new nlobjSearchFilter('internalid', 'custrecord_install_base_bill_to_customer', 'is', CUSTOMER_TO_PROCESS));
    }
    var arrExpiredCustomerColumns = [
        new nlobjSearchColumn('custrecord_install_base_bill_to_customer', null, 'group')
    ];
    var arrExpiredCustomerResults = nlapiSearchRecord('customrecord_install_base', null, arrExpiredCustomerFilter, arrExpiredCustomerColumns);

    if (arrExpiredCustomerResults != null && arrExpiredCustomerResults != undefined && arrExpiredCustomerResults != '') {
        logger.audit(MSG_TITLE, 'Reinstating ' + arrExpiredCustomerResults.length + ' customers');
        logger.indent();
        for (var i = 0; i < arrExpiredCustomerResults.length; i++) {
            try {
                var stCustId = arrExpiredCustomerResults[i].getValue('custrecord_install_base_bill_to_customer', null, 'group');
                var stRecordType = 'customer';

                if (stCustId == null || stCustId == undefined || stCustId == '') {
                    logger.debug(MSG_TITLE, 'SKIPPING: customer:[' + stCustId + ']');
                    continue;                    
                }

                logger.debug(MSG_TITLE, 'Reinstating Customer [' + stCustId + '] (' + i + ' of ' + arrExpiredCustomerResults.length + ')');
                nlapiSubmitField(stRecordType, stCustId, 'entitystatus', REINSTATED_ENTITY_STATUS, true);

                if (isScriptReQueued(arrExpiredCustomerResults.length, i, logger) == true) return -1;

            } catch(ex) {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined) {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Reinstating customer ' + stCustId + ':' + ex.getDetails());
                } else {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Reinstating customer ' + stCustId + ':' + ex.toString());
                }
                throw ex;
            }
        } // end loop
        logger.unindent();
        logger.audit(MSG_TITLE, 'DONE : Reinstating ' + arrExpiredCustomerResults.length + ' customers');
    }
    logger.unindent();
    logger.audit(MSG_TITLE,'DONE : Reinstating Customers');
}

function processAllCustomers(custIdParam, productIdParam, runDateTime, logger) {
    var MSG_TITLE = 'Full Synch - Processing All Customers';    
    logger.audit(MSG_TITLE, 'Process All Customers');
    logger.indent();
    
    var arrCustomerEndDatesFilter = new Array();
    var srchColumnInternalId = new nlobjSearchColumn("custrecord_install_base_bill_to_customer");
    srchColumnInternalId.setSort(false);
    arrCustomerEndDatesFilter[arrCustomerEndDatesFilter.length] = srchColumnInternalId;
    
    var arrCustomerEndDatesFilter = [
        new nlobjSearchFilter('isinactive', 'custrecord_install_base_bill_to_customer', 'is', 'F'),
        new nlobjSearchFilter('custrecord_install_base_bill_to_customer', null, 'noneof', '@NONE@')
        ];
    if(CUSTOMER_TO_PROCESS != null && CUSTOMER_TO_PROCESS != undefined && CUSTOMER_TO_PROCESS != ''){
        logger.debug(MSG_TITLE, 'Limiting search to customer [' + CUSTOMER_TO_PROCESS + ']');     
        arrCustomerEndDatesFilter.push(new nlobjSearchFilter('custrecord_install_base_bill_to_customer', null, 'is', CUSTOMER_TO_PROCESS));
    }
    if (custIdParam != null) {
        logger.debug(MSG_TITLE, 'Limiting search above customer [' + custIdParam + ']');     
        arrCustomerEndDatesFilter.push(new nlobjSearchFilter('internalidnumber', 'custrecord_install_base_bill_to_customer', 'greaterthan', custIdParam));
    }
    
    var arrCustomerEndDatesResults = nlapiSearchRecord('customrecord_install_base', 'customsearch_cust_install_base_end_dates', arrCustomerEndDatesFilter, '');
    if (arrCustomerEndDatesResults != null && arrCustomerEndDatesResults != undefined && arrCustomerEndDatesResults != '') {
        logger.audit(MSG_TITLE, 'Processing ' + arrCustomerEndDatesResults.length + ' customers');
        logger.indent();
        var stCustId = null; 
        var stTempCustID = null;
        for (var custIdx = 0; custIdx < arrCustomerEndDatesResults.length; custIdx++) {
            try {
                var remainingUsageStart = nlapiGetContext().getRemainingUsage(); 
                stCustId = arrCustomerEndDatesResults[custIdx].getValue('custrecord_install_base_bill_to_customer', null, 'group');
                
                if (stCustId == null || stCustId == undefined || stCustId == '') {
                    logger.debug(MSG_TITLE, 'SKIPPING: customer:[' + stCustId + ']');
                    continue;                    
                } else {
					stTempCustID = stCustId;
				}

                var retval = processCustomer(arrCustomerEndDatesResults[custIdx], stCustId, productIdParam, runDateTime, logger);
                if (retval === 0) {
                    continue;
                } else {
                    logger.debug(MSG_TITLE, retval + ' (' + custIdx + ' of ' + arrCustomerEndDatesResults.length + ')');
                }

                var remainingUsageEnd = nlapiGetContext().getRemainingUsage(); 
                var usage = remainingUsageStart - remainingUsageEnd;
                // logger.debug(MSG_TITLE, 'Remaining usage is [' + nlapiGetContext().getRemainingUsage()+ ']. 1 iteration takes ' + usage);

                if (isScriptReQueuedWithParams(arrCustomerEndDatesResults.length, custIdx, stCustId, productIdParam, runDateTime, logger) == true) return -1;
            } catch(ex) {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined) {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Updating Customer ' + stCustId + ' End Dates : ' + ex.getDetails());
                } else {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Updating Customer  ' + stCustId + ' End Dates:' + ex.toString());
                }
                throw ex;
            }
        } // for (var i = 0; i < arrCustomerEndDatesResults.length; i++) {
        logger.unindent();
        logger.audit(MSG_TITLE, 'DONE : Processing ' + arrCustomerEndDatesResults.length + ' customers');
        // when the loop finishes naturally, reschedule the script and pass the latest parameter parameter
        if (updateParameters(stTempCustID, productIdParam, runDateTime, logger) == true) return -1;
    }
    logger.unindent();
    logger.audit(MSG_TITLE, 'DONE : Process All Customers');
}

/**
 * processCustomer: Updating Customer End Dates
 */
function processCustomer(customerSearchResultObj, custIdParam, productIdParam, runDateTime, logger) {
    var MSG_TITLE = 'Full Synch - Processing Customer';    
//    logger.audit(MSG_TITLE, 'Process customer');
    
    var stEndDateEarliest = customerSearchResultObj.getValue('formuladate',                              null, 'min');
    var stEndDateLatest   = customerSearchResultObj.getValue('formuladate',                              null, 'max');
    var stCustRetentionDt = customerSearchResultObj.getValue('custrecord_install_base_end_date',         null, 'max');
    var stEndDateUpdated  = nlapiDateToString(new Date());
    var stCustId          = customerSearchResultObj.getValue('custrecord_install_base_bill_to_customer', null, 'group');
    var stCustSinceDt     = '';
    
    // logger.debug(MSG_TITLE, 'Get the customer since date');
    var arrProductCustSinceDateColumns = [
        new nlobjSearchColumn('custrecord_install_base_start_date', null, 'min'),
        new nlobjSearchColumn('custrecord_install_base_product',    null, 'group')
    ];
    var arrProductCustSinceDateFilters = [
        new nlobjSearchFilter('custrecord_install_base_start_date',       null, 'isnotempty'),
        new nlobjSearchFilter('custrecord_install_base_bill_to_customer', null, 'is',          stCustId),
        new nlobjSearchFilter('custrecord_install_base_synch_status',     null, 'noneof',      [SYNCH_STATUS_CREDITED], null),
        new nlobjSearchFilter('isinactive',                               null, 'is',          'F')
    ];
    var arrProductCustSinceDateResults = nlapiSearchRecord('customrecord_install_base', null, arrProductCustSinceDateFilters, arrProductCustSinceDateColumns);
    if (arrProductCustSinceDateResults) {
        if(arrProductCustSinceDateResults.length > 0) {
            stCustSinceDt = arrProductCustSinceDateResults[0].getValue('custrecord_install_base_start_date', null, 'min');
        }
    }
    
    // logger.debug(MSG_TITLE, 'Get the customer end and start dates filtering out renewals exclusion');
    var arrCustomerRetDatesFilter = [
        new nlobjSearchFilter('custrecord_renewals_exclusion',            null, 'is',     'F'),
        new nlobjSearchFilter('custrecord_install_base_bill_to_customer', null, 'is',     stCustId),
        new nlobjSearchFilter('custrecord_install_base_synch_status',     null, 'is',     SYNCH_STATUS_ACTIVE),
        new nlobjSearchFilter('custrecord_renewal_processed_on',          null, 'isempty')
    ];
    var arrCustomerRetDatesResults = nlapiSearchRecord('customrecord_install_base', 'customsearch_cust_install_base_end_dates', arrCustomerRetDatesFilter, '');
    if (arrCustomerRetDatesResults) {
        if(arrCustomerRetDatesResults.length > 0){
            stEndDateEarliest = arrCustomerRetDatesResults[0].getValue('formuladate', null, 'min');
            stEndDateLatest   = arrCustomerRetDatesResults[0].getValue('formuladate', null, 'max');
        }
    }

    if (!stEndDateEarliest && !stEndDateLatest) {  
        arrCustomerRetDatesFilter = new Array();
        arrCustomerRetDatesFilter = [
            new nlobjSearchFilter('custrecord_renewals_exclusion',            null, 'is', 'F'),
            new nlobjSearchFilter('custrecord_install_base_bill_to_customer', null, 'is', stCustId),
            new nlobjSearchFilter('custrecord_install_base_synch_status',     null, 'is', SYNCH_STATUS_ACTIVE)
        ];
        arrCustomerRetDatesResults = nlapiSearchRecord('customrecord_install_base', 'customsearch_cust_install_base_end_dates', arrCustomerRetDatesFilter, '');                    
        if (arrCustomerRetDatesResults) {
            if(arrCustomerRetDatesResults.length > 0){
                stEndDateEarliest = arrCustomerRetDatesResults[0].getValue('formuladate', null, 'min');
                stEndDateLatest   = arrCustomerRetDatesResults[0].getValue('formuladate', null, 'max');
            }
        }
    }

    /* Get the Active Customer's M/S Level */
    // logger.debug(MSG_TITLE, 'Get the Active Customer M/S Level');
    var stSupportLevel = '';
    var arrCustomerActiveMSTypeFilters = [
        new nlobjSearchFilter('isinactive',                               null, 'is', 'F'),
        new nlobjSearchFilter('custrecord_install_base_bill_to_customer', null, 'is', stCustId),
        new nlobjSearchFilter('custrecord_install_base_synch_status',     null, 'is', SYNCH_STATUS_ACTIVE)
    ];
    var arrCustomerActiveMSTypeResults = nlapiSearchRecord('customrecord_install_base', 'customsearch_customer_ms_type', arrCustomerActiveMSTypeFilters, null);
    if (arrCustomerActiveMSTypeResults) {
        // logger.debug(MSG_TITLE, 'Active M/S Item Result Count:' + arrCustomerActiveMSTypeResults.length);
        stSupportLevel = arrCustomerActiveMSTypeResults[0].getValue('custitem_mtce_support_type', 'CUSTRECORD_INSTALL_BASE_ITEM', 'group');
        /* If Customer has more than 1 M/S Type, set it to multi-ms type */
        if (arrCustomerActiveMSTypeResults.length > 1) {
            // logger.debug(MSG_TITLE, 'Customer has multiple M/S Types.');
            stSupportLevel = MS_FOR_MULTI;
        }
    }

    /* If no active M/S was found, check if there are expired ones. */
    if (stSupportLevel == null || stSupportLevel == undefined || stSupportLevel == '') {
        var arrCustomerExpiredMSTypeFilters = [
            new nlobjSearchFilter('isinactive',                               null, 'is', 'F'),
            new nlobjSearchFilter('custrecord_install_base_bill_to_customer', null, 'is', stCustId),
            new nlobjSearchFilter('custrecord_install_base_synch_status',     null, 'is', SYNCH_STATUS_EXPIRED)
        ];
        var arrCustomerExpiredMSTypeResults = nlapiSearchRecord('customrecord_install_base', 'customsearch_customer_ms_type', arrCustomerExpiredMSTypeFilters, null);
        // logger.debug(MSG_TITLE, 'Expired M/S Item Result Count:' + arrCustomerExpiredMSTypeResults);
        if (arrCustomerExpiredMSTypeResults) {
            stSupportLevel = MS_FOR_EXPIRED;
        }
    }
    // logger.debug(MSG_TITLE, 'Support Level=' + stSupportLevel);

    var arrFieldToUpdate = [ 'custentity_install_base_earliest_end'
                           , 'custentity_install_base_latest_end'
                           , 'custentity_end_dates_last_updated'
                           , 'custentity_ms_support_level'
                           , 'custentity_install_base_retention_date'
                           , 'custentity_install_base_customer_since'
    ];
    var arrFieldToUpdateVal = [ stEndDateEarliest
                              , stEndDateLatest
                              , stEndDateUpdated
                              , stSupportLevel
                              , stCustRetentionDt
                              , stCustSinceDt
    ];
    var retString = 'Updating stCustId:[' + stCustId
              + '] : Cust EED:[' + stEndDateEarliest 
              + '] : Cust LED:[' + stEndDateLatest 
//              + '] : stEndDateUpdated:[' + stEndDateUpdated 
//              + '] : stCustRetentionDt:[' + stCustRetentionDt 
//              + '] : stCustSinceDt:[' + stCustSinceDt 
//              + '] : stSupportLevel:[' + stSupportLevel 
              + '] -- custId:[' + custIdParam + '] :: prodId:[' + productIdParam + ']';
                   
    nlapiSubmitField('customer', stCustId, arrFieldToUpdate, arrFieldToUpdateVal);

    /* Check if all install base records are expired. */
    var arrCustExpiredFilters = [
        new nlobjSearchFilter('custrecord_install_base_bill_to_customer', '', 'is',     stCustId),
        new nlobjSearchFilter('custrecord_install_base_synch_status',     '', 'noneof', [SYNCH_STATUS_EXPIRED])
    ];
    var arrCustExpiredResults = nlapiSearchRecord('customrecord_install_base', '', arrCustExpiredFilters, '');

    var bShouldExpireCust = false;
    if (arrCustExpiredResults != null && arrCustExpiredResults != undefined && arrCustExpiredResults != '') {
        if (arrCustExpiredResults.length == 0) {
            bShouldExpireCust = true;
        }
    } else {
        bShouldExpireCust = true;
    }
    if (bShouldExpireCust) {
        logger.debug(MSG_TITLE, 'Expiring Customer ' + stCustId);
        nlapiSubmitField('customer', stCustId, 'entitystatus', EXPIRED_ENTITY_STATUS, true);
    }
    return retString;
} 

function processAllProducts(custIdParam, productIdParam, runDateTime, logger) {
    var MSG_TITLE = 'Full Synch - Processing All Products';    
    logger.audit(MSG_TITLE, 'Process All Products');
    logger.indent();    

    /* Loop through all the product records. */
    var arrProductColumns = [
        new nlobjSearchColumn('custrecord_product_item'),
        new nlobjSearchColumn('custrecord_previous_product_rate'),
        new nlobjSearchColumn('custrecord_current_product_rate'),
        new nlobjSearchColumn('custrecord_bill_to_customer'),
        new nlobjSearchColumn('custrecord_end_user'),
        new nlobjSearchColumn('custrecord_product_item_category')
    ];
    var srchColumnInternalId = new nlobjSearchColumn("internalid");
    srchColumnInternalId.setSort(false);
    arrProductColumns[arrProductColumns.length] = srchColumnInternalId;
    var arrProductFilters = [
        new nlobjSearchFilter('isinactive', null, 'is', 'F'),
        new nlobjSearchFilter('isinactive', 'custrecord_bill_to_customer', 'is', 'F')
    ];
    if(productIdParam != null) {
       arrProductFilters.push(new nlobjSearchFilter('internalidnumber', '', 'greaterthan', productIdParam));
    }
    if(CUSTOMER_TO_PROCESS != null && CUSTOMER_TO_PROCESS != undefined && CUSTOMER_TO_PROCESS != '') {
        logger.debug(MSG_TITLE, 'Limiting search to customer [' + CUSTOMER_TO_PROCESS + ']');     
        arrProductFilters.push(new nlobjSearchFilter('custrecord_bill_to_customer', null, 'is', CUSTOMER_TO_PROCESS ));
    }
    var arrProductResults = nlapiSearchRecord('customrecord_product', null, arrProductFilters, arrProductColumns);

    if (arrProductResults != null && arrProductResults != undefined && arrProductResults != '') {
        logger.audit(MSG_TITLE, 'Processing ' + arrProductResults.length + ' products');
        logger.indent();    
        for (var prodIdx = 0; prodIdx < arrProductResults.length; prodIdx ++) {
            try {
                var remainingUsageStart = nlapiGetContext().getRemainingUsage(); 
                var stProdId = arrProductResults[prodIdx].getId();
                
                if (stProdId == null || stProdId == undefined || stProdId == '') {
                    logger.debug(MSG_TITLE, 'SKIPPING: product:[' + stProdId + ']');
                    continue;                    
                }

                var retval = processProduct(arrProductResults[prodIdx], custIdParam, stProdId, runDateTime, logger);
                if (retval === 0) {
                    continue;
                } else {
                    logger.debug(MSG_TITLE, retval + ' (' + prodIdx + ' of ' + arrProductResults.length + ')');
                }

                var remainingUsageEnd = nlapiGetContext().getRemainingUsage(); 
                var usage = remainingUsageStart - remainingUsageEnd;
                // logger.debug(MSG_TITLE, 'Remaining usage is [' + nlapiGetContext().getRemainingUsage()+ ']. 1 iteration takes ' + usage);

                if (isScriptReQueuedWithParams(arrProductResults.length, prodIdx, custIdParam, stProdId, runDateTime, logger) == true) return -1;
            } catch(ex) {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined) {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Updating Product ' + stProdId + ' fields:' + ex.getDetails());
                } else {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Updating Product ' + stProdId + ' fields:' + ex.toString());
                }
                throw ex;
            }
        } // for (var prodIdx = 0; prodIdx < arrProductResults.length; prodIdx ++) {
        logger.unindent();
        logger.audit(MSG_TITLE, 'DONER : Processing ' + arrProductResults.length + ' products');
    } // if (arrProductResults != null && arrProductResults != undefined && arrProductResults != '')
    logger.unindent();
    logger.audit(MSG_TITLE, 'DONE : Process All Products');
}

function processProduct(productSearchResultObj, custIdParam, productIdParam, runDateTime, logger) {
    var MSG_TITLE = 'Full Synch - Processing Product';    
//    logger.audit(MSG_TITLE, 'Process product');
    
    var stProdId = productSearchResultObj.getId();
    // logger.debug(MSG_TITLE, 'Processing Product ' + stProdId);

    /* Retrieve Product End Dates */
    // logger.debug(MSG_TITLE, 'Get Product End Dates');
    var arrProductEndDatesColumns = [
        new nlobjSearchColumn('custrecord_install_base_end_date', null, 'max'),
        new nlobjSearchColumn('custrecord_install_base_end_date', null, 'min')
    ];
    var arrProductEndDatesFilters = [
        new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'is',         SYNCH_STATUS_ACTIVE),
        new nlobjSearchFilter('custrecord_install_base_end_date',     null, 'isnotempty'),
        new nlobjSearchFilter('custrecord_renewals_exclusion',        null, 'is',         'F'),
        new nlobjSearchFilter('custrecord_install_base_product',      null, 'is',         stProdId),
        new nlobjSearchFilter('isinactive',                           null, 'is',         'F')
    ];
    var arrProductEndDatesResults = nlapiSearchRecord('customrecord_install_base', null, arrProductEndDatesFilters, arrProductEndDatesColumns);

    var stProdEndDateEarliest = null;
    var stProdEndDateLatest   = null;
    var stProdEndDateUpdated  = nlapiDateToString(new Date());
    if (arrProductEndDatesResults) {
        stProdEndDateEarliest = arrProductEndDatesResults[0].getValue('custrecord_install_base_end_date', null, 'min');
        stProdEndDateLatest   = arrProductEndDatesResults[0].getValue('custrecord_install_base_end_date', null, 'max');
        // logger.debug(MSG_TITLE, 'stEndDateEarliest : ' + stProdEndDateEarliest);
        // logger.debug(MSG_TITLE, 'stEndDateLatest   : ' + stProdEndDateLatest);
    }
    if (!stProdEndDateEarliest && !stProdEndDateLatest) {
        arrProductEndDatesFilters = [
            new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'is',         SYNCH_STATUS_EXPIRED),
            new nlobjSearchFilter('custrecord_install_base_end_date',     null, 'isnotempty'),
            new nlobjSearchFilter('custrecord_renewals_exclusion',        null, 'is',         'F'),
            new nlobjSearchFilter('custrecord_renewal_processed_on',      null, 'isempty'),
            new nlobjSearchFilter('custrecord_install_base_product',      null, 'is',         stProdId),
            new nlobjSearchFilter('isinactive',                           null, 'is',         'F')
        ];
        arrProductEndDatesResults = nlapiSearchRecord('customrecord_install_base', null, arrProductEndDatesFilters, arrProductEndDatesColumns);        
        if (arrProductEndDatesResults) {
            stProdEndDateEarliest = arrProductEndDatesResults[0].getValue('custrecord_install_base_end_date', null, 'min');
            stProdEndDateLatest   = arrProductEndDatesResults[0].getValue('custrecord_install_base_end_date', null, 'max');
            // logger.debug(MSG_TITLE, 'recomputed stEndDateEarliest : ' + stProdEndDateEarliest);
            // logger.debug(MSG_TITLE, 'recomputed stEndDateLatest   : ' + stProdEndDateLatest);
        }
    }
    
    /* Check if the product should be opted-out */
    var arrProductContractsColumns = [
        new nlobjSearchColumn('custrecord_install_base_opt_out_ms')
    ];
    var arrProductContractsFilters = [
        new nlobjSearchFilter('custrecord_install_base_product',      null, 'is', stProdId),
        new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'is', SYNCH_STATUS_ACTIVE),
        new nlobjSearchFilter('isinactive',                           null, 'is', 'F'),
        new nlobjSearchFilter('custrecord_install_base_opt_out_ms',   null, 'is', 'F')
    ];
    var arrProductContractsResults = nlapiSearchRecord('customrecord_install_base', null, arrProductContractsFilters, arrProductContractsColumns);
    var stOptOut = 'F';
    if (arrProductContractsResults) {
        if (arrProductContractsResults.length == 0) {
            stOptOut = 'T';
        }
    } else {
        stOptOut = 'T';
    }

    /* Determine the M/S Item for the product. */
    var stProductMSItemId = "";
    switch(MS_MODEL) {
        case MS_MODEL_PERCENTAGE:
        case MS_MODEL_PERCENTAGE_NET:
            /* Get the Product's M/S item which has the highest M/S % value */
            var arrProductMSItemFilters = [
                new nlobjSearchFilter('isinactive',                      null, 'is', 'F'),
                new nlobjSearchFilter('custrecord_install_base_product', null, 'is', stProdId)
            ];
            var arrProductMSItemResults = nlapiSearchRecord('customrecord_install_base', 'customsearch_product_ms_item', arrProductMSItemFilters, null);
            
            if (arrProductMSItemResults) {
                // logger.debug(MSG_TITLE, 'M/S Item Result Count:' + arrProductMSItemResults.length);
                stProductMSItemId = arrProductMSItemResults[0].getValue('custrecord_install_base_item', null, 'group');
            }
            break;
        case MS_MODEL_ITEMIZED:
            /* Get the product's Renew with item to set as M/S Item Id */
            var stProdItemId = productSearchResultObj.getValue('custrecord_product_item');
            // logger.debug(MSG_TITLE, 'Product Item Id=' + stProdItemId);
            if (stProdItemId == null || stProdItemId == undefined || stProdItemId == '') {
                // we should never end up here...
                logger.audit('Data is corrupted. Product '+stProdId+' has no item!');
                return 0;
            }
            var arrRenewItems = nlapiLookupField('item', stProdItemId, ['custitem_renew_with','custitem_replaced_with']);
            if (arrRenewItems['custitem_replaced_with'] != null &&     
                arrRenewItems['custitem_replaced_with'] != undefined && 
                arrRenewItems['custitem_replaced_with'] != '') {
                // logger.debug(MSG_TITLE, 'Product Replaced With Item Id=' + arrRenewItems['custitem_replaced_with']);
                stProductMSItemId = nlapiLookupField('item', arrRenewItems['custitem_replaced_with'], 'custitem_renew_with');
            } else {
                stProductMSItemId = arrRenewItems['custitem_renew_with'];
            }
            break;
    }

    /* Get the Old Current List Price. */
    var flNewListProdRate    = productSearchResultObj.getValue('custrecord_previous_product_rate');
    var flOldCurrentProdRate = productSearchResultObj.getValue('custrecord_current_product_rate');
    // logger.debug(MSG_TITLE, 'Previous Product Rate    : ' + flNewListProdRate);
    // logger.debug(MSG_TITLE, 'Old Current Product Rate : ' + flOldCurrentProdRate);

    /* Compute for the New Current List Price */
    var flNewCurrentProdRate = getProductCurrentListRate(stProdId,arrItemCatsToCompute, MS_MODEL);

    if (flNewCurrentProdRate != parseFloatOrZero(flOldCurrentProdRate) && flOldCurrentProdRate != null && flOldCurrentProdRate != '') {
        // logger.debug(MSG_TITLE, 'Current Product Rate changed.');
        flNewListProdRate = flOldCurrentProdRate;
    }

    // logger.debug(MSG_TITLE, 'Updating the retention dates for products');
    var stNewRetentionDt = "";
    var arrProductRetEndDatesColumns = [
        new nlobjSearchColumn('custrecord_install_base_end_date',       null,                              'max'),
        new nlobjSearchColumn('custrecord_install_base_product',        null,                              'group'),
        new nlobjSearchColumn('custrecord_install_base_retention_date', 'custrecord_install_base_product', 'group')
    ];
    var arrProductRetEndDatesFilters = [
        new nlobjSearchFilter('custrecord_install_base_end_date',     null, 'isnotempty'),
        new nlobjSearchFilter('custrecord_install_base_product',      null, 'is',         stProdId),
        new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'noneof',     [SYNCH_STATUS_CREDITED, SYNCH_STATUS_EXPIRED], null),
        new nlobjSearchFilter('isinactive',                           null, 'is',         'F')
    ];
    var arrProductRetEndDatesResults = nlapiSearchRecord('customrecord_install_base', null, arrProductRetEndDatesFilters, arrProductRetEndDatesColumns);

    if (arrProductRetEndDatesResults) {
        for (var i = 0; i < arrProductRetEndDatesResults.length; i++) {
            var stProdRetEndDateLatest = arrProductRetEndDatesResults[i].getValue('custrecord_install_base_end_date', null, 'max');
            var stProdCurRetEndDate    = arrProductRetEndDatesResults[i].getValue('custrecord_install_base_retention_date', 'custrecord_install_base_product', 'group');
            if (stProdCurRetEndDate == null || nlapiStringToDate(stProdCurRetEndDate) < nlapiStringToDate(stProdRetEndDateLatest)) {
                stNewRetentionDt = stProdRetEndDateLatest;
            } else { 
                stNewRetentionDt = stProdCurRetEndDate;
            }
        } 
    }

    // logger.debug(MSG_TITLE, 'Updating the customer since date for products');
    var stNewCustSinceDt = "";
    var arrProductCustSinceDateColumns = [
        new nlobjSearchColumn('custrecord_install_base_start_date', null, 'min'),
        new nlobjSearchColumn('custrecord_install_base_product',    null, 'group')
    ];
    var arrProductCustSinceDateFilters = [
        new nlobjSearchFilter('custrecord_install_base_start_date',   null, 'isnotempty'),
        new nlobjSearchFilter('custrecord_install_base_product',      null, 'is',        stProdId),
        new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'noneof',    [SYNCH_STATUS_CREDITED], null),
        new nlobjSearchFilter('isinactive',                           null, 'is',        'F')
    ];
    var arrProductCustSinceDateResults = nlapiSearchRecord('customrecord_install_base', null, arrProductCustSinceDateFilters, arrProductCustSinceDateColumns);
    if (arrProductCustSinceDateResults) {
        if(arrProductCustSinceDateResults.length > 0) { 
            var stNewCustSinceDt = arrProductCustSinceDateResults[0].getValue('custrecord_install_base_start_date', null, 'min');
        }
    }
    if (stProductMSItemId != null && stProductMSItemId != undefined && stProductMSItemId != '') {
        var stCurCustomerId = productSearchResultObj.getValue('custrecord_bill_to_customer');
        var stCPR = getCPRValue(stCurCustomerId, stProdId, productSearchResultObj, stProductMSItemId, arrItemCatsTerm, arrItemCatsPerpetual, arrItemCatsToCompute, CO_TERM_BASIS, MS_MODEL);
    }
    if(stCPR == null || stCPR == '' || stCPR == undefined){
        stCPR = '100%';
    }    
    
    /* Update the Product Record. */
    var arrProductFieldToUpdate = ['custrecord_install_base_earliest_end'
                                 , 'custrecord_install_base_latest_end'
                                 , 'custrecord_end_dates_last_updated'
                                 , 'custrecord_opt_out_ms'
                                 , 'custrecord_m_s_item'
                                 , 'custrecord_previous_product_rate'
                                 , 'custrecord_current_product_rate'
                                 , 'custrecord_coterm_prorate_ratio'
                                 , 'custrecord_install_base_retention_date'
                                 , 'custrecord_product_customer_since'
    ];

    var arrProductFieldToUpdateVal = [stProdEndDateEarliest,
                                      stProdEndDateLatest,
                                      stProdEndDateUpdated,
                                      stOptOut,
                                      stProductMSItemId,
                                      flNewListProdRate,
                                      flNewCurrentProdRate,
                                      stCPR,
                                      stNewRetentionDt,
                                      stNewCustSinceDt
    ];

    /* Ensures that the 2 fields related to the M/S Item is cleared too. */
    if (stProductMSItemId == null || stProductMSItemId == undefined || stProductMSItemId == '') {
        arrProductFieldToUpdateVal.push('');
        arrProductFieldToUpdateVal.push('');
        arrProductFieldToUpdate.push('custrecord_mtce_support_type');
        arrProductFieldToUpdate.push('custrecord_mtce_support_percent');
    }
    var retString = 'Updating stProdId:[' + stProdId 
              + '] : Prod EED:[' + stProdEndDateEarliest 
              + '] : Prod LED:[' + stProdEndDateLatest 
//            + '] : stOptOut:[' + stOptOut 
//            + '] : stProdEndDateUpdated:[' + stProdEndDateUpdated 
//            + '] : stProductMSItemId:[' + stProductMSItemId
//            + '] : flOldCurrentProdRate:[' + flOldCurrentProdRate
//            + '] : flNewCurrentProdRate:[' + flNewCurrentProdRate
//            + '] : stNewRetentionDt:[' + stNewRetentionDt
//            + '] : stNewCustSinceDt:[' + stNewCustSinceDt
//            + '] : stCPR:[' + stCPR
              + '] -- custId:[' + custIdParam + '] :: prodId:[' + productIdParam + ']';     
                        
    nlapiSubmitField('customrecord_product', stProdId, arrProductFieldToUpdate, arrProductFieldToUpdateVal, true);
    return retString;
}

function isScriptReQueued(arrayLength, index, logger) {
    var MSG_TITLE = 'Full Synch - ReQueueing';
    // check if we have enough usage for another iteration
    if (nlapiGetContext().getRemainingUsage() < REMAINING_USAGE_LIMIT) {
        logger.unindent();
        logger.audit(MSG_TITLE, 'RESCHEDULING: Index [' + index + ']. Remaining usage [' + nlapiGetContext().getRemainingUsage() + '].');
        nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
        return true;
    }
    // When the end of the result set is reached, schedule another run just to make sure that all records were processed 
    if ((arrayLength > MAX_NO_RESCHED_RESULT) && (arrayLength <= (index + 1))) {
        logger.unindent();
        logger.audit(MSG_TITLE, 'RESCHEDULING: Index [' + index + ']. Remaining usage [' + nlapiGetContext().getRemainingUsage() + '].');
        nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
        return true;
    }
    return false;
}

function isScriptReQueuedWithParams(arrayLength, index, custIdParam, productIdParam, runDateTime, logger) {
    var MSG_TITLE = 'Full Synch - ReQueueing with Params';    
    // check if we have enough usage for another iteration
    if (nlapiGetContext().getRemainingUsage() < REMAINING_USAGE_LIMIT) {
        var param = new Object();
        param.custscript_r04b_rundatetime = runDateTime;
        param.custscript_r04b_custid      = custIdParam;
        param.custscript_r04b_productid   = productIdParam;
        param.custscript_cust_to_process  = CUSTOMER_TO_PROCESS;
        logger.audit(MSG_TITLE, 'RESCHEDULING: Index [' + index + ']. Remaining usage [' + nlapiGetContext().getRemainingUsage() + ']. Params custIdParam:[' + custIdParam + '] :: productIdParam:[' + productIdParam + '] :: runDateTime:[' + runDateTime + ']');
        var statusScheduleScript = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
        return true;
    }
    // When the end of the result set is reached, schedule another run just to make sure that all records were processed 
    if ((arrayLength > MAX_NO_RESCHED_RESULT) && (arrayLength <= (index + 1))) {
        var param = new Object();
        param.custscript_r04b_rundatetime = runDateTime;
        param.custscript_r04b_custid      = custIdParam;
        param.custscript_r04b_productid   = productIdParam;
        param.custscript_cust_to_process  = CUSTOMER_TO_PROCESS;
        logger.audit(MSG_TITLE, 'RESCHEDULING: Index [' + index + ']. Remaining usage [' + nlapiGetContext().getRemainingUsage() + ']. Params custIdParam:[' + custIdParam + '] :: productIdParam:[' + productIdParam + '] :: runDateTime:[' + runDateTime + ']'); 
        var statusScheduleScript = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
        return true;
    }
    return false;
}

function updateParameters(custIdParam, productIdParam, runDateTime, logger) {
    var MSG_TITLE = 'Full Synch - ReQueue and Update Params';    
    var param = new Object();
    param.custscript_r04b_rundatetime = runDateTime;
    param.custscript_r04b_custid      = custIdParam;
    param.custscript_r04b_productid   = productIdParam;
    param.custscript_cust_to_process  = CUSTOMER_TO_PROCESS;
    logger.audit(MSG_TITLE, 'RESCHEDULING TO UPDATE PARAMS: Params custIdParam:[' + custIdParam + '] :: productIdParam:[' + productIdParam + '] :: runDateTime:[' + runDateTime + ']'); 
    var statusScheduleScript = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
    return true;
}

function parseFloatOrZero(f) {
    var r = parseFloat(f);
    return isNaN(r) ? 0 : r;
}
