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
 * This script updates the status of licenses to active or expired.
 *
 * @author Michael Franz V. Sumulong
 * @version 1.0
 */

var logger;

var REMAINING_USAGE_LIMIT      = 200; // we reschedule the script if we have less than REMAINING_USAGE_LIMIT usage
var MSG_TITLE                  = 'Contract Synch';

var MS_MODEL                 = nlapiGetContext().getSetting('SCRIPT', 'custscript_synch_ms_model');
var MS_FOR_MULTI             = nlapiGetContext().getSetting('SCRIPT', 'custscript_synch_ms_multi_support');
var MS_FOR_EXPIRED           = nlapiGetContext().getSetting('SCRIPT', 'custscript_synch_ms_type_for_expired');
var SCRIPT_ID                = nlapiGetContext().getSetting('SCRIPT', 'custscript_synch_script_id');
var EXPIRED_ENTITY_STATUS    = nlapiGetContext().getSetting('SCRIPT', 'custscript_synch_entity_status_expired');
var CO_TERM_BASIS            = nlapiGetContext().getSetting('SCRIPT', 'custscript_cntrct_synch_coterm_end_date');
var REINSTATED_ENTITY_STATUS = nlapiGetContext().getSetting('SCRIPT', 'custscript_synch_entity_stat_reinstated');

var arrItemCatsTerm          = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_contract_synch_item_cat_term'));
var arrItemCatsPerpetual     = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_cntr_synch_item_cat_perpetual'));
var arrItemCatsToCompute     = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_synch_item_cats'));

/**
 * main entry point
 */
function main() {
    logger = new Logger(false);
    logger.enableDebug(); //comment this line to disable debug

 	var custIdParam    = nlapiGetContext().getSetting('SCRIPT', 'custscript_custid');
	var productIdParam = nlapiGetContext().getSetting('SCRIPT', 'custscript_productid');

    logger.debug(MSG_TITLE, '=====Start=====');
    logger.debug(MSG_TITLE, 'Script Parameters:\n'
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
            + '\nproductIdParam             = ' + productIdParam
    );

    /* Synch Contracts */
    var stDateToday = nlapiDateToString(new Date());
    logger.debug(MSG_TITLE, 'Today is ' + stDateToday);

    /*
    * Search for contract records that have a "Future" status that should be set to "Active" and
    * license records that have a "Future" status that should be set to "Expired",
    */
    var arrContractsColumns = [
        new nlobjSearchColumn('custrecord_install_base_type'),
        new nlobjSearchColumn('custrecord_install_base_product'),
        new nlobjSearchColumn('custrecord_install_base_bill_to_customer')
    ];

    // **************************************************************
    // Check for contracts that need to be activated (with end dates)
    MSG_TITLE = 'Contract Synch - Activating IBs with end dates';    
    logger.audit(MSG_TITLE,'Activating Install Base with end dates');
    var arrActiveContractsFilters = [
        new nlobjSearchFilter('custrecord_install_base_start_date',   null, 'onorbefore', stDateToday, null),
        new nlobjSearchFilter('custrecord_install_base_end_date',     null, 'after',      stDateToday, null),
        new nlobjSearchFilter('custrecord_install_base_end_date',     null, 'isnotempty'),
        new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'noneof',     [SYNCH_STATUS_ACTIVE, SYNCH_STATUS_CREDITED], null),
        new nlobjSearchFilter('isinactive',                           null, 'is',         'F'),
        new nlobjSearchFilter('isinactive', 'custrecord_install_base_bill_to_customer', 'is', 'F')
    ];
    var arrActiveContractsResults = nlapiSearchRecord('customrecord_install_base', null, arrActiveContractsFilters, arrContractsColumns);

    logger.debug(MSG_TITLE, 'Loop through future install bases with end dates');
    logger.indent();
    if (arrActiveContractsResults != null && arrActiveContractsResults != undefined && arrActiveContractsResults != '') {
        logger.debug(MSG_TITLE, 'Activating ' + arrActiveContractsResults.length + ' contracts');
        for (var i = 0; i < arrActiveContractsResults.length; i++) {
            try {
				var stProdId     = arrActiveContractsResults[i].getValue('custrecord_install_base_product');
				var stCustId     = arrActiveContractsResults[i].getValue('custrecord_install_base_bill_to_customer');
				var stContractId = arrActiveContractsResults[i].getId();
				
				logger.debug(MSG_TITLE, 'Activating contract record with end dates [' + stContractId + '] with Customer ID [' + stCustId + '] and  Product ID [' + stProdId + '] (' + i + ' of ' + arrActiveContractsResults.length + ')');
                nlapiSubmitField(arrActiveContractsResults[i].getRecordType(), stContractId, 'custrecord_install_base_synch_status', SYNCH_STATUS_ACTIVE);
				
                //logger.audit(MSG_TITLE, 'before processCustomer. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
				if (stCustId != custIdParam ) // if we are rescheduling processProducts, no need to execute processCustomer
					processCustomer(stCustId);

				//logger.audit(MSG_TITLE, 'before processProducts. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
				// if processProduct is causes the script to be rescheduled, exit
				if (processProducts(stCustId) == -1) return;
                
                if (nlapiGetContext().getRemainingUsage() < REMAINING_USAGE_LIMIT) {
                    logger.unindent();
                    logger.debug(MSG_TITLE, 'Reschedule. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
                    nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
                    return;
                }
                // When the end of the result set is reached, schedule another run just to make sure that all records were processed 
                if (arrActiveContractsResults.length <= (i + 1)) {
                    logger.unindent();
                    logger.debug(MSG_TITLE, 'Reschedule due to resultset limitation. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
                    nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
                    return;
                }
            } catch(ex) {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined) {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Activate Contract ' + stContractId + ':' + ex.getDetails());
                } else {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Activate Contract ' + stContractId + ':' + ex.toString());
                }
                return;
            }
        } // end loop
        logger.debug(MSG_TITLE, 'DONE : Activating ' + arrActiveContractsResults.length + ' contracts');
        logger.audit(MSG_TITLE, 'i + 100 == arrActiveContractsResults.length :: ' + i + ' + 100 == ' + arrActiveContractsResults.length);
    }
    logger.unindent();
    logger.debug(MSG_TITLE, 'DONE : Loop through future install bases with end dates');
    logger.audit(MSG_TITLE, 'DONE : Activating Install Base with end dates');
    // **************************************************************

    // *****************************************************************
    // Check for contracts that need to be activated (without end dates)
    MSG_TITLE = 'Contract Synch - Activating IBs without end dates';    
	logger.audit(MSG_TITLE,'Activating Install Base without end dates');
    var arrActiveContractsFilters = [
        new nlobjSearchFilter('custrecord_install_base_start_date',   null, 'onorbefore', stDateToday, null),
        new nlobjSearchFilter('custrecord_install_base_end_date',     null, 'isempty'),
        new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'noneof',     [SYNCH_STATUS_ACTIVE,SYNCH_STATUS_CREDITED], null),
        new nlobjSearchFilter('isinactive',                           null, 'is',         'F'),
        new nlobjSearchFilter('isinactive', 'custrecord_install_base_bill_to_customer', 'is', 'F')
    ];
    var arrActiveContractsResults = nlapiSearchRecord('customrecord_install_base', null, arrActiveContractsFilters, arrContractsColumns);

    logger.debug(MSG_TITLE, 'Loop through future install bases without end dates');
    logger.indent();
    if (arrActiveContractsResults != null && arrActiveContractsResults != undefined && arrActiveContractsResults != '') {
        logger.debug(MSG_TITLE, 'Activating ' + arrActiveContractsResults.length + ' contracts');
        for (var i = 0; i < arrActiveContractsResults.length; i++) {
            try {
                var stProdId     = arrActiveContractsResults[i].getValue('custrecord_install_base_product');
                var stCustId     = arrActiveContractsResults[i].getValue('custrecord_install_base_bill_to_customer');
                var stContractId = arrActiveContractsResults[i].getId();
                
                logger.debug(MSG_TITLE, 'Activating contract record without end dates [' + stContractId + '] with Customer ID [' + stCustId + '] and  Product ID [' + stProdId + '] (' + i + ' of ' + arrActiveContractsResults.length + ')');
                nlapiSubmitField(arrActiveContractsResults[i].getRecordType(), stContractId, 'custrecord_install_base_synch_status', SYNCH_STATUS_ACTIVE);
                
				if (stCustId != custIdParam ) // if we are rescheduling processProducts, no need to execute processCustomer
	                processCustomer(stCustId);
                    
				if (processProducts(stCustId) == -1) return;
                
                if (nlapiGetContext().getRemainingUsage() < REMAINING_USAGE_LIMIT) {
                    logger.unindent();
                    logger.debug(MSG_TITLE, 'Reschedule. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
                    nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
                    return;
                }
                // When the end of the result set is reached, schedule another run just to make sure that all records were processed 
                if (arrActiveContractsResults.length <= (i + 1)) {
                    logger.unindent();
                    logger.debug(MSG_TITLE, 'Reschedule due to resultset limitation. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
                    nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
                    return;
                }
            } catch(ex) {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined) {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Activate Contract ' + stContractId + ':' + ex.getDetails());
                } else {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Activate Contract ' + stContractId + ':' + ex.toString());
                }
                return;
            }

        } // end loop
        logger.debug(MSG_TITLE, 'DONE : Activating ' + arrActiveContractsResults.length + ' contracts');
        logger.audit(MSG_TITLE, 'i + 100 == arrActiveContractsResults.length :: ' + i + ' + 100 == ' + arrActiveContractsResults.length);
    }
    logger.unindent();
    logger.debug(MSG_TITLE, 'DONE : Loop through future install bases without end dates');
    logger.audit(MSG_TITLE, 'DONE : Activating Install Base without end dates');
    // *****************************************************************

    // *******************************************
    // Check for contracts that need to be expired
    MSG_TITLE = 'Contract Synch - Expiring IBs';    
    logger.audit(MSG_TITLE,'Expiring Install Base');
    var arrExpiredContractsFilters = [
        new nlobjSearchFilter('custrecord_install_base_end_date',     null, 'onorbefore', stDateToday, null),
        new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'noneof',     [SYNCH_STATUS_EXPIRED,SYNCH_STATUS_CREDITED], null),
        new nlobjSearchFilter('isinactive',                           null, 'is',         'F'),
        new nlobjSearchFilter('isinactive', 'custrecord_install_base_bill_to_customer', 'is', 'F')
    ];
    var arrExpiredContractsResults = nlapiSearchRecord('customrecord_install_base', null, arrExpiredContractsFilters, arrContractsColumns);

    logger.debug(MSG_TITLE, 'Loop through expiring contracts');
    logger.indent();
    if (arrExpiredContractsResults != null && arrExpiredContractsResults != undefined && arrExpiredContractsResults != '') {
        logger.debug(MSG_TITLE, 'Expiring ' + arrExpiredContractsResults.length + ' contracts');
        for (var i = 0; i < arrExpiredContractsResults.length; i++) {
            try {
                var stProdId     = arrExpiredContractsResults[i].getValue('custrecord_install_base_product');
                var stCustId     = arrExpiredContractsResults[i].getValue('custrecord_install_base_bill_to_customer');
                var stContractId = arrExpiredContractsResults[i].getId();
                
                logger.debug(MSG_TITLE, 'Expiring contract record [' + stContractId + '] with Customer ID [' + stCustId + '] and  Product ID [' + stProdId + '] (' + i + ' of ' + arrExpiredContractsResults.length + ')');
                nlapiSubmitField(arrExpiredContractsResults[i].getRecordType(), arrExpiredContractsResults[i].getId(), 'custrecord_install_base_synch_status', SYNCH_STATUS_EXPIRED);
                
				if (stCustId != custIdParam ) // if we are rescheduling processProducts, no need to execute processCustomer
	                processCustomer(stCustId);

				if (processProducts(stCustId) == -1) return;
                
                if (nlapiGetContext().getRemainingUsage() < REMAINING_USAGE_LIMIT) {
                    logger.unindent();
                    logger.debug(MSG_TITLE, 'Reschedule. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
                    nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
                    return;
                }
                // When the end of the result set is reached, schedule another run just to make sure that all records were processed 
                if (arrExpiredContractsResults.length <= (i + 1)) {
                    logger.unindent();
                    logger.debug(MSG_TITLE, 'Reschedule due to resultset limitation. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
                    nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
                    return;
                }
           } catch(ex) {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined) {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Expiring Contracts:' + ex.getDetails());
                } else {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Expiring Contracts:' + ex.toString());
                }
                return;
            }
        } // end loop
        logger.debug(MSG_TITLE, 'DONE : Expiring ' + arrExpiredContractsResults.length + ' contracts');
        logger.audit(MSG_TITLE, 'i + 100 == arrExpiredContractsResults.length :: ' + i + ' + 100 == ' + arrExpiredContractsResults.length);
    }
    logger.unindent();
    logger.debug(MSG_TITLE, 'DONE : Loop through expiring contracts');
    logger.audit(MSG_TITLE, 'DONE : Expiring Install Base');
    // *******************************************
    
    // **********************************************
    // Check for customers that need to be reinstated
    MSG_TITLE = 'Contract Synch - Reinstating Customer';    
    logger.debug(MSG_TITLE,'Reinstating Customers');

    var arrExpiredCustomerFilter = [
        new nlobjSearchFilter('entitystatus',                         null,                                       'is',     EXPIRED_ENTITY_STATUS),
        new nlobjSearchFilter('custrecord_install_base_synch_status', 'custrecord_install_base_bill_to_customer', 'is',     SYNCH_STATUS_ACTIVE),
        new nlobjSearchFilter('internalid',                           null,                                       'noneof', '@NONE@')
    ];
    var arrExpiredCustomerColumns = [
        new nlobjSearchColumn('internalid', null, 'group')
    ];
    var arrExpiredCustomerResults = nlapiSearchRecord('customer', null, arrExpiredCustomerFilter, arrExpiredCustomerColumns);

    logger.debug(MSG_TITLE, 'Loop through customers to be reinstated');
    logger.indent();
    if (arrExpiredCustomerResults != null && arrExpiredCustomerResults != undefined && arrExpiredCustomerResults != '') {
        logger.debug(MSG_TITLE, 'Reinstating ' + arrExpiredCustomerResults.length + ' customers');
        for (var i = 0; i < arrExpiredCustomerResults.length; i++) {
            try {
                var stCustId     = arrExpiredCustomerResults[i].getValue('internalid',null,'group');
                var stRecordType = 'customer';

                logger.debug(MSG_TITLE, 'Reinstating customer ' + stCustId + ' (' + i + ' of ' + arrExpiredCustomerResults.length + ')');
                nlapiSubmitField(stRecordType, stCustId, 'entitystatus', REINSTATED_ENTITY_STATUS, true);

                if (nlapiGetContext().getRemainingUsage() < REMAINING_USAGE_LIMIT) {
                    logger.unindent();
                    logger.debug(MSG_TITLE, 'Reschedule. Remaining usage is : ' + nlapiGetContext().getRemainingUsage());
                    nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
                    return;
                }
                // When the end of the result set is reached, schedule another run just to make sure that all records were processed 
                if (arrExpiredCustomerResults.length <= (i + 1)) {
                    logger.unindent();
                    logger.debug(MSG_TITLE, 'Reschedule due to resultset limitation. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
                    nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
                    return;
                }
            } catch(ex) {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined) {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Reinstating customer ' + stCustId + ':' + ex.getDetails());
                } else {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Reinstating customer ' + stCustId + ':' + ex.toString());
                }
                return;
            }
        } // end loop
        logger.debug(MSG_TITLE, 'DONE : Reinstating ' + arrExpiredCustomerResults.length + ' customers');
    }
    logger.unindent();
    logger.debug(MSG_TITLE, 'DONE : Loop through customers to be reinstated');
    logger.debug(MSG_TITLE, 'DONE : Reinstating Customers');
    // **********************************************
    
    logger.debug(MSG_TITLE, '=====End=====');
}    
    
/**
 * processCustomer: Updating Customer End Dates
 * @param {Object} stCurCustId
 */
function processCustomer(stCurCustId) {
    MSG_TITLE = 'Contract Synch - Processing Customer';    
    logger.debug(MSG_TITLE, 'Process customer '+ stCurCustId);
    
    if (stCurCustId == null || stCurCustId == undefined || stCurCustId == '') {
        logger.debug(MSG_TITLE, 'skipping current customer id ' + stCurCustId);
        return;                    
    }

    var arrCustomerEndDatesFilter = [
        new nlobjSearchFilter('custrecord_install_base_bill_to_customer', '', 'is', stCurCustId)
    ];
    var arrCustomerEndDatesResults = nlapiSearchRecord('customrecord_install_base', 'customsearch_cust_install_base_end_dates', arrCustomerEndDatesFilter, '');

    logger.debug(MSG_TITLE, 'Loop through customers');
    logger.indent();
    if (arrCustomerEndDatesResults != null && arrCustomerEndDatesResults != undefined && arrCustomerEndDatesResults != '') {
        logger.debug(MSG_TITLE, 'Processing ' + arrCustomerEndDatesResults.length + ' customers');
        for (var i = 0; i < arrCustomerEndDatesResults.length; i++) {
            try {
                var stEndDateEarliest = arrCustomerEndDatesResults[i].getValue('formuladate',                              null, 'min');
                var stEndDateLatest   = arrCustomerEndDatesResults[i].getValue('formuladate',                              null, 'max');
                var stCustRetentionDt = arrCustomerEndDatesResults[i].getValue('custrecord_install_base_end_date',         null, 'max');
                var stEndDateUpdated  = nlapiDateToString(new Date());
                var stCustId          = arrCustomerEndDatesResults[i].getValue('custrecord_install_base_bill_to_customer', null, 'group');

                var stCustSinceDt = '';
                
                logger.debug(MSG_TITLE, 'Get the customer since date');
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
                
                logger.debug(MSG_TITLE, 'Get the customer end and start dates filtering out renewals exclusion');
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
                logger.debug(MSG_TITLE, 'Get the Active Customer M/S Level');
                var stSupportLevel = '';
                var arrCustomerActiveMSTypeFilters = [
                    new nlobjSearchFilter('isinactive',                               null, 'is', 'F'),
                    new nlobjSearchFilter('custrecord_install_base_bill_to_customer', null, 'is', stCustId),
                    new nlobjSearchFilter('custrecord_install_base_synch_status',     null, 'is', SYNCH_STATUS_ACTIVE)
                ];
                var arrCustomerActiveMSTypeResults = nlapiSearchRecord('customrecord_install_base', 'customsearch_customer_ms_type', arrCustomerActiveMSTypeFilters, null);
                if (arrCustomerActiveMSTypeResults) {
                    logger.debug(MSG_TITLE, 'Active M/S Item Result Count:' + arrCustomerActiveMSTypeResults.length);
                    stSupportLevel = arrCustomerActiveMSTypeResults[0].getValue('custitem_mtce_support_type', 'CUSTRECORD_INSTALL_BASE_ITEM', 'group');
                    /* If Customer has more than 1 M/S Type, set it to multi-ms type */
                    if (arrCustomerActiveMSTypeResults.length > 1) {
                        logger.debug(MSG_TITLE, 'Customer has multiple M/S Types.');
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
                    logger.debug(MSG_TITLE, 'Expired M/S Item Result Count:' + arrCustomerExpiredMSTypeResults);
                    if (arrCustomerExpiredMSTypeResults) {
                        stSupportLevel = MS_FOR_EXPIRED;
                    }
                }
                logger.debug(MSG_TITLE, 'Support Level=' + stSupportLevel);

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
                logger.debug(MSG_TITLE, 'Updating Contract End Date for customer ' + stCustId + ':\n'
                                      + 'Contract End Date Earliest=' + stEndDateEarliest + '\n'
                                      + 'Contract End Date Latest=' + stEndDateLatest + '\n'
                                      + 'Contract End Date Updated=' + stEndDateUpdated + '\n'
                                      + 'Retention Date=' + stCustRetentionDt + '\n'
                                      + 'Customer Since Date=' + stCustSinceDt + '\n'
                                      + 'Support Level=' + stSupportLevel
                );

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
            } catch(ex) {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined) {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Updating Customer ' + stCustId + ' End Dates:' + ex.getDetails());
                } else {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Updating Customer  ' + stCustId + ' End Dates:' + ex.toString());
                }
                throw ex;
            }
        } // for (var i = 0; i < arrCustomerEndDatesResults.length; i++) {
        logger.debug(MSG_TITLE, 'DONE : Processing ' + arrCustomerEndDatesResults.length + ' customers');
    }
    logger.unindent();
    logger.debug(MSG_TITLE, 'DONE : Loop through customers');
    logger.debug(MSG_TITLE, 'DONE : Process customer '+ stCurCustId);
} 

/**
 * processProducts
 * Process products for given customer
 * @param {Object} stCurCustId
 */			
function processProducts(stCurCustId) {
    MSG_TITLE = 'Contract Synch - Processing Products';    
    logger.debug(MSG_TITLE, 'Process products for customer '+stCurCustId);

 	var custIdParam    = nlapiGetContext().getSetting('SCRIPT', 'custscript_custid');
	var productIdParam = nlapiGetContext().getSetting('SCRIPT', 'custscript_productid');

    if (stCurCustId == null || stCurCustId == undefined || stCurCustId == '') {
        throw 'invalid customer';                    
    }

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
        new nlobjSearchFilter('custrecord_bill_to_customer', '',   'is', stCurCustId),
        new nlobjSearchFilter('isinactive',                  null, 'is', 'F')
    ];
    
    // in the case the script is being rescheduled, we want to exclude the rows already processed
	if (productIdParam != null && custIdParam == stCurCustId) {
        logger.debug(MSG_TITLE, 'restrict search to products above ' + productIdParam); 	
		arrProductFilters.push(new nlobjSearchFilter('internalidnumber', '', 'greaterthan', productIdParam));            
    }

    var arrProductResults = nlapiSearchRecord('customrecord_product', null, arrProductFilters, arrProductColumns);

    logger.debug(MSG_TITLE, 'Loop through Products');
    logger.indent();
    if (arrProductResults != null && arrProductResults != undefined && arrProductResults != '') {
        logger.debug(MSG_TITLE, 'Processing ' + arrProductResults.length + ' products');
        for (var prodIdx = 0; prodIdx < arrProductResults.length; prodIdx ++) {
            try {
                var remainingUsageStart = nlapiGetContext().getRemainingUsage(); 

                var stProdId = arrProductResults[prodIdx].getId();
                logger.debug(MSG_TITLE, 'Processing Product ' + stProdId);

                /* Retrieve Product End Dates */
                logger.debug(MSG_TITLE, 'Get Product End Dates');
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
                    logger.debug(MSG_TITLE, 'stEndDateEarliest = ' + stProdEndDateEarliest);
                    logger.debug(MSG_TITLE, 'stEndDateLatest   = ' + stProdEndDateLatest);
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
                        logger.debug(MSG_TITLE, 'recomputed stEndDateEarliest = ' + stProdEndDateEarliest);
                        logger.debug(MSG_TITLE, 'recomputed stEndDateLatest   = ' + stProdEndDateLatest);
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
                            logger.debug(MSG_TITLE, 'M/S Item Result Count:' + arrProductMSItemResults.length);
                            stProductMSItemId = arrProductMSItemResults[0].getValue('custrecord_install_base_item', null, 'group');
                        }
                        break;
                    
                    case MS_MODEL_ITEMIZED:
                        /* Get the product's Renew with item to set as M/S Item Id */
                        var stProdItemId = arrProductResults[prodIdx].getValue('custrecord_product_item');
                        logger.debug(MSG_TITLE, 'Product Item Id=' + stProdItemId);
                        if (stProdItemId == null || stProdItemId == undefined || stProdItemId == '') {
                            // we should never end up here...
                            logger.audit('Data is corrupted. Product '+stProdId+' has no item!');
                            continue;
                        }
                      
                        var arrRenewItems = nlapiLookupField('item', stProdItemId, ['custitem_renew_with','custitem_replaced_with']);
                        if (arrRenewItems['custitem_replaced_with'] != null &&     
                            arrRenewItems['custitem_replaced_with'] != undefined && 
                            arrRenewItems['custitem_replaced_with'] != '') {
                            logger.debug(MSG_TITLE, 'Product Replaced With Item Id=' + arrRenewItems['custitem_replaced_with']);
                            stProductMSItemId = nlapiLookupField('item', arrRenewItems['custitem_replaced_with'], 'custitem_renew_with');
                        } else {
                            stProductMSItemId = arrRenewItems['custitem_renew_with'];
                        }
                        break;
                }

                /* Get the Old Current List Price. */
                var flNewListProdRate    = arrProductResults[prodIdx].getValue('custrecord_previous_product_rate');
                var flOldCurrentProdRate = arrProductResults[prodIdx].getValue('custrecord_current_product_rate');
                logger.debug(MSG_TITLE, 'Previous Product Rate    : ' + flNewListProdRate);
                logger.debug(MSG_TITLE, 'Old Current Product Rate : ' + flOldCurrentProdRate);

                /* Compute for the New Current List Price */
                var flNewCurrentProdRate = getProductCurrentListRate(stProdId,arrItemCatsToCompute, MS_MODEL);

                if (flNewCurrentProdRate != parseFloatOrZero(flOldCurrentProdRate) && flOldCurrentProdRate != null && flOldCurrentProdRate != '') {
                    logger.debug(MSG_TITLE, 'Current Product Rate changed.');
                    flNewListProdRate = flOldCurrentProdRate;
                }

                logger.debug(MSG_TITLE, 'Updating the retention dates for products');
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

                logger.indent();
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
                logger.unindent();

                logger.debug(MSG_TITLE, 'Updating the customer since date for products');
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

                logger.indent();
                if (arrProductCustSinceDateResults) {
                    if(arrProductCustSinceDateResults.length > 0) { 
                        var stNewCustSinceDt = arrProductCustSinceDateResults[0].getValue('custrecord_install_base_start_date', null, 'min');
                    }
                }
                logger.unindent();

                if (stProductMSItemId != null && stProductMSItemId != undefined && stProductMSItemId != '') {
                    var stCurCustomerId = arrProductResults[prodIdx].getValue('custrecord_bill_to_customer');
                    var stCPR = getCPRValue(stCurCustomerId, stProdId, arrProductResults[prodIdx], stProductMSItemId, arrItemCatsTerm, arrItemCatsPerpetual, arrItemCatsToCompute, CO_TERM_BASIS, MS_MODEL);
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

                logger.debug(MSG_TITLE, 'Updating Contract End Date for Product ' + stProdId + ':\n'
                                      + 'Contract End Date Earliest = ' + stProdEndDateEarliest + '\n'
                                      + 'Contract End Date Latest   = ' + stProdEndDateLatest + '\n'
                                      + 'Opted Out                  = ' + stOptOut + '\n'
                                      + 'Contract End Date Updated  = ' + stProdEndDateUpdated + '\n'
                                      + 'Product M/S Item           = ' + stProductMSItemId + '\n'
                                      + 'Previous List Rate         = ' + flOldCurrentProdRate + '\n'
                                      + 'Current List Rate          = ' + flNewCurrentProdRate + '\n'
                                      + 'Retention Date             = ' + stNewRetentionDt + '\n'
                                      + 'Customer Since Date        = ' + stNewCustSinceDt + '\n'
                                      + 'Co-Term Prorated Rate      = ' + stCPR
                );

                nlapiSubmitField('customrecord_product', stProdId, arrProductFieldToUpdate, arrProductFieldToUpdateVal, true);
				
				var remainingUsageEnd = nlapiGetContext().getRemainingUsage(); 
				var usage = remainingUsageStart - remainingUsageEnd;
				logger.debug(MSG_TITLE, 'processProducts. Remaining usage is: '+nlapiGetContext().getRemainingUsage()+ ' / 1 iteration takes:'+usage);
				
				// check if we have enough usage for another iteration
             	if (nlapiGetContext().getRemainingUsage() < REMAINING_USAGE_LIMIT) {
					// we reschedule the script
					logger.debug(MSG_TITLE, 'Reschedule processProducts. Remaining usage is: ' + nlapiGetContext().getRemainingUsage());
                    
					var param = new Object();
					param.custscript_custid    = stCurCustId;
					param.custscript_productid = stProdId;
                    
					logger.debug(MSG_TITLE, 'Reschedule processProducts and pass parameters: ' + param.custscript_custid + '/' + param.custscript_productid);
					var statusScheduleScript = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
					//logger.debug(MSG_TITLE, 'statusScheduleScript: '+statusScheduleScript);
					return -1; // -1 is a way to tell the caller that the script got rescheduled
				}
            } catch(ex) {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                
                if (ex.getDetails != undefined) {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Updating Product ' + stProdId + ' fields:' + ex.getDetails());
                } else {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', 'Updating Product ' + stProdId + ' fields:' + ex.toString());
                }
                throw ex;
            }
        }
        logger.debug(MSG_TITLE, 'DONE : Processing ' + arrProductResults.length + ' products');
    } // if (arrProductResults != null && arrProductResults != undefined && arrProductResults != '')
    logger.unindent();
    logger.debug(MSG_TITLE, 'DONE : Loop through Products');
    logger.debug(MSG_TITLE, 'DONE : Process products for customer ' + stCurCustId);
}

function parseFloatOrZero(f) {
    var r = parseFloat(f);
    return isNaN(r) ? 0 : r;
}
