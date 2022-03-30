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

var logger;
var REMAINING_USAGE_LIMIT   = 1500; // we reschedule the script if we have less than REMAINING_USAGE_LIMIT usage
var MAX_NO_RESCHED_RESULT   = 999; // maximum resultset that don't need re sched 


var DFLT_ORDER_TYPE         = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_dflt_order_type');
var DAYS_BEFORE_RENEWAL     = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_days');
var PRICING_MODEL           = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_pricing_model');
var MS_MODEL                = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_ms_model');
var CO_TERM_BASIS           = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_coterm_end_date');
var ASSIGN_TO_TYPE          = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_assign_to');
var ASSIGN_TO               = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_assign_to_emp_team');
var TRAN_FORM_ID            = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_custom_form');
var DUMMY_ITEM              = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_dummy_item');
var SCRIPT_ID               = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_script_id');
var ENTITY_STATUS_EXPIRED   = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_entity_stat_expired');
var USE_CHANNEL_MGMT        = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_use_channel_mgmt');
var CUSTOMER_TO_PROCESS     = nlapiGetContext().getSetting('SCRIPT', 'custscript_renew_customer_id');
var INCLUDE_TRAN_LINE_DESCR = nlapiGetContext().getSetting('SCRIPT', 'custscript_r5_include_tran_line_desc');
var RENEWAL_FORM_BASIS      = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewal_form_basis');
var SUBSIDIARY_ON           = nlapiGetContext().getSetting('FEATURE', 'SUBSIDIARIES');

var TRAN_TYPE               = RENEWAL_TRAN_TYPE[nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_transaction_type')];

var NON_RENEWAL_IB_TYPE     = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_non_renewal_ib_types'));
var arrMaintCat             = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_maintenance_item_cat'));
var arrSupportCat           = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_support_item_cat'));
var arrPerpeptualCat        = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_perpetual_item_cat'));
var arrSupportBasisCat      = splitList(nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_support_basis'));

var ALLOW_DISCOUNT          = nlapiGetContext().getSetting('SCRIPT', 'custscript_r05_allow_inline_discounting')  == YES;
var DFLT_CUST_DISCOUNT      = nlapiGetContext().getSetting('SCRIPT', 'custscript_r05_dflt_cust_disc_on_renewal') == YES;
var ALLOW_DISC_ON_MS        = nlapiGetContext().getSetting('SCRIPT', 'custscript_r05_ms_cust_inline_disc')       == YES;

/*
 * main entry point
 */
function main() {
    var MSG_TITLE = 'Create Renewal Transaction';
    logger        = new Logger(false);
    logger.enableDebug(); //comment this line to disable debug

    logger.audit(MSG_TITLE, '======Start======');
    logger.indent();

    logger.audit(MSG_TITLE, 'Script Parameters:'
            + '\nDFLT_ORDER_TYPE            : ' + DFLT_ORDER_TYPE
            + '\nTRAN_TYPE                  : ' + TRAN_TYPE
            + '\nPRICING_MODEL              : ' + PRICING_MODEL
            + '\nDAYS_BEFORE_RENEWAL        : ' + DAYS_BEFORE_RENEWAL
            + '\nCONTRACT_TYPE_MAINTENANCE  : ' + CONTRACT_TYPE_MAINTENANCE
            + '\nCONTRACT_TYPE_SUPPORT      : ' + CONTRACT_TYPE_SUPPORT
            + '\nCONTRACT_TYPE_LICENSE      : ' + CONTRACT_TYPE_LICENSE
            + '\nASSIGN_TO                  : ' + ASSIGN_TO
            + '\nASSIGN_TO_TYPE             : ' + ASSIGN_TO_TYPE
            + '\nMS_MODEL                   : ' + MS_MODEL
            + '\nActive Synch Status        : ' + SYNCH_STATUS_ACTIVE
            + '\nSCRIPT_ID                  : ' + SCRIPT_ID
            + '\narrPerpeptualCat           : ' + arrPerpeptualCat
            + '\narrMaintCat                : ' + arrMaintCat
            + '\narrSupportCat              : ' + arrSupportCat
            + '\narrSupportBasisCat         : ' + arrSupportBasisCat
            + '\nUsage Limit                : ' + nlapiGetContext().getRemainingUsage()
            + '\nEntity Status-Expired      : ' + ENTITY_STATUS_EXPIRED
            + '\nDefault Tran Form ID       : ' + TRAN_FORM_ID
            + '\nTran Form Based on         : ' + RENEWAL_FORM_BASIS
            + '\nNon-Renewal IB Type        : ' + NON_RENEWAL_IB_TYPE
            + '\nCustomer to Process        : ' + CUSTOMER_TO_PROCESS
            + '\nSubsidiary Feature On      : ' + SUBSIDIARY_ON
            + '\nInclude Tran Line Desc     : ' + INCLUDE_TRAN_LINE_DESCR
    );

    /* Retrieve Field Mappings */
    var FLD_MAPPINGS = retrieveFieldMappings(MAP_IB_TO_RENEWAL_TRAN_MAP);
    var BODY_FIELD_MAPS = new Array();
    var iBodyFldCount   = 0;
    for(var i = 0; i < FLD_MAPPINGS.length; i++) {
        if(FLD_MAPPINGS[i]['custrecord_swe_tran_field_type'] == TRAN_BODY_FIELD) {
            BODY_FIELD_MAPS[iBodyFldCount] = new Array();
            BODY_FIELD_MAPS[iBodyFldCount].tran_field_id  = FLD_MAPPINGS[i]['custrecord_swe_tran_field_id_map'];
            BODY_FIELD_MAPS[iBodyFldCount].ib_field_id    = FLD_MAPPINGS[i]['custrecord_swe_install_base_field_id_map'];
            BODY_FIELD_MAPS[iBodyFldCount].value          = null;
            BODY_FIELD_MAPS[iBodyFldCount].ib_datecreated = new Date(0);
            iBodyFldCount++;
        }
    }

    var custIdParam     = nlapiGetContext().getSetting('SCRIPT', 'custscript_r05_custid');
    var endUserIdParam  = nlapiGetContext().getSetting('SCRIPT', 'custscript_r05_enduserid');
    var productIdParam  = nlapiGetContext().getSetting('SCRIPT', 'custscript_r05_productid');
    var contractIdParam = nlapiGetContext().getSetting('SCRIPT', 'custscript_r05_contractid');
    logger.audit(MSG_TITLE, 'PARAMS : custIdParam:[' + custIdParam + '] :: endUserIdParam:[' + endUserIdParam + '] :: productIdParam:[' + productIdParam + '] :: contractIdParam:[' + contractIdParam + ']');

    var arrSOCreated    = new Array();
    var iSOCreatedCnt   = 0;
    var dtToday         = new Date();
    var dtTimeStart     = new Date();

    var stDateFilter = nlapiDateToString(nlapiAddDays(new Date(dtToday), DAYS_BEFORE_RENEWAL));

    logger.audit(MSG_TITLE, 'Today is    : ' + dtToday);
    logger.audit(MSG_TITLE, 'Date Filter : ' + stDateFilter);
    
    /* Loop through customer records that has renewable contracts. */
    var arrCustomerFilters = [
        new nlobjSearchFilter('custentity_install_base_earliest_end', null, 'onorbefore',  stDateFilter),
        new nlobjSearchFilter('custentity_install_base_earliest_end', null, 'isnotempty'),
        new nlobjSearchFilter('entitystatus',                         null, 'noneof',      [ENTITY_STATUS_EXPIRED]),
        new nlobjSearchFilter('isinactive',                           null, 'is',          'F')
    ];
    if(CUSTOMER_TO_PROCESS != null && CUSTOMER_TO_PROCESS != undefined && CUSTOMER_TO_PROCESS != ''){
        arrCustomerFilters.push(new nlobjSearchFilter('internalid', null, 'is',CUSTOMER_TO_PROCESS ));
    }
    var arrCustomerColumns = [
        new nlobjSearchColumn('custentity_uplift'),
        new nlobjSearchColumn('custentity_install_base_latest_end'),
        new nlobjSearchColumn('salesrep'),
        new nlobjSearchColumn('custentity_customer_channel_tier'),
        new nlobjSearchColumn('custentity_install_base_earliest_end'),
        new nlobjSearchColumn('custentity_swe_customer_discount'),
        new nlobjSearchColumn('custentity_customer_channel_tier')
    ];
    if(SUBSIDIARY_ON == 'T' || SUBSIDIARY_ON == 't' || SUBSIDIARY_ON == true){
        arrCustomerColumns.push(new nlobjSearchColumn('subsidiary'));    
    }

	var srchColumnInternalId = new nlobjSearchColumn("internalid");
    srchColumnInternalId.setSort(false);
	arrCustomerColumns[arrCustomerColumns.length] = srchColumnInternalId;
	
//    if ((endUserIdParam != null) && (custIdParam != null)) {
//        arrCustomerFilters.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthanorequalto', custIdParam));
//    } else 
    if (custIdParam != null) {
        arrCustomerFilters.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthanorequalto', custIdParam));
    }
    var arrCustomerResults = nlapiSearchRecord('customer', '', arrCustomerFilters, arrCustomerColumns);
    if (arrCustomerResults != null && arrCustomerResults != undefined && arrCustomerResults != '') {
        logger.audit(MSG_TITLE, 'Processing ' + arrCustomerResults.length + ' customers. PARAMS: custId:[' + custIdParam + '] :: usageLimitLeft:[' + nlapiGetContext().getRemainingUsage() + ']');
        logger.indent();
        for (var idx = 0; idx < arrCustomerResults.length; idx++) {
            try {
                var stCustId          = arrCustomerResults[idx].getId();
                var stCustChannelTier = arrCustomerResults[idx].getValue('custentity_customer_channel_tier');
                var stLatestEndDate   = arrCustomerResults[idx].getValue('custentity_install_base_latest_end');
                var stEarliestEndDate = arrCustomerResults[idx].getValue('custentity_install_base_earliest_end');
				var flCustDiscount    = arrCustomerResults[idx].getValue('custentity_swe_customer_discount');
                
                var param = new Object();
                param.custscript_r05_custid     = stCustId;
                param.custscript_r05_enduserid  = null;
                param.custscript_r05_productid  = null;                       
                param.custscript_r05_contractid = null;                                         
                if (isScriptReQueued(arrCustomerResults.length, idx, logger, param) == true) {
                    logger.audit(MSG_TITLE, '=====RESCHEDULED=====');
                    return;
                }
                
                if(flCustDiscount != null && flCustDiscount != undefined && flCustDiscount != '') {
                    flCustDiscount = parseFloat(flCustDiscount.replace('%',''));
					if(isNaN(flCustDiscount)) {
						flCustDiscount = null;
					}
                } else {
                    flCustDiscount = null;
                }
                
                var flUpliftRate = arrCustomerResults[idx].getValue('custentity_uplift');
                if (flUpliftRate != null && flUpliftRate != undefined && flUpliftRate != '') {
                    flUpliftRate = parseFloat(flUpliftRate.replace('%',''));
                } else {
                    flUpliftRate = 0;
                }

                logger.debug(MSG_TITLE, 'stCustId:[' + stCustId + '] :: ' +
//                                        'stCustChannelTier:[' + stCustChannelTier + '] :: ' +
                                        'stLatestEndDate:[' + stLatestEndDate + '] :: ' +
                                        'stEarliestEndDate:[' + stEarliestEndDate + '] :: ' +
//                                        'flCustDiscount:[' + flCustDiscount + '] :: ' +
//                                        'flUpliftRate:[' + flUpliftRate + '] :: ' +
                                        ':: usageLimitLeft:[' + nlapiGetContext().getRemainingUsage() + ']' +
                                        'Index:[' + idx + '/' + arrCustomerResults.length + '].'
                );

//                logger.debug(MSG_TITLE, 'stCustId:[' + stCustId + ']  Index [' + idx + '/' + arrCustomerResults.length + '].');

                /* Loop through and create SO per End User. */
                var arrEndUserFilter = [
                    new nlobjSearchFilter('custrecord_bill_to_customer', null, 'is', stCustId),
                    new nlobjSearchFilter('isinactive', null, 'is', 'F')
                ];
                var arrEndUserColumn = [
                    new nlobjSearchColumn('custrecord_end_user',null,'group'),
                ];
                
//                if ((productIdParam != null) && (endUserIdParam != null)) {
//                    arrEndUserFilter.push(new nlobjSearchFilter('internalidnumber', 'custrecord_end_user', 'greaterthanorequalto', endUserIdParam));
//                } else 
                if (endUserIdParam != null) {
                    arrEndUserFilter.push(new nlobjSearchFilter('internalidnumber', 'custrecord_end_user', 'greaterthanorequalto', endUserIdParam));
                }
                var arrEndUserResults = nlapiSearchRecord('customrecord_product', null, arrEndUserFilter, arrEndUserColumn);
                if (arrEndUserResults != null && arrEndUserResults != undefined && arrEndUserResults != '') {
                    logger.audit(MSG_TITLE, 'Processing ' + arrEndUserResults.length + ' end users. stCustId:[' + stCustId + '] : PARAMS :: custId:[' + custIdParam + '] : endUserId:[' + endUserIdParam + '] :: usageLimitLeft:[' + nlapiGetContext().getRemainingUsage() + ']');
                    logger.indent();
                    for (var iEndUserIdx = 0; iEndUserIdx < arrEndUserResults.length; iEndUserIdx++) {

                        /* Get the End User */
                        var stEndUser = arrEndUserResults[iEndUserIdx].getValue('custrecord_end_user',null,'group');
                        var arrContractsRenewalProcOn = new Array(); //array for IBs whose Renewal Processed On Dates are updated
                        
                        var param = new Object();
                        param.custscript_r05_custid     = stCustId;
                        param.custscript_r05_enduserid  = stEndUser;
                        param.custscript_r05_productid  = null;                       
                        param.custscript_r05_contractid = null;                                         
                        if (isScriptReQueued(arrEndUserResults.length, iEndUserIdx, logger, param) == true) {
                            logger.audit(MSG_TITLE, '=====RESCHEDULED=====');
                            return;
                        }
                        
                        logger.debug(MSG_TITLE, 'stEndUser:[' + stEndUser + ']  Index [' + iEndUserIdx + '/' + arrEndUserResults.length + ']. usageLimitLeft:[' + nlapiGetContext().getRemainingUsage() + ']');

                        /* Get the Co-Term End date */
                        var arrCoTermFilter = [
                            new nlobjSearchFilter('custrecord_install_base_synch_status',     null, 'anyof',      [SYNCH_STATUS_ACTIVE]),
                            new nlobjSearchFilter('custrecord_install_base_end_date',         null, 'isnotempty'),
                            new nlobjSearchFilter('custrecord_install_base_bill_to_customer', null, 'is',         stCustId),
                            new nlobjSearchFilter('custrecord_renewal_processed_on',          null, 'isempty'),
                            new nlobjSearchFilter('custrecord_renewals_exclusion',            null, 'is',         'F'), 
                            new nlobjSearchFilter('isinactive',                               null, 'is',         'F')
                        ];
                        if (CO_TERM_BASIS == END_DATE_EARLIEST) {
                            arrCoTermFilter.push(new nlobjSearchFilter('custrecord_install_base_end_date', null, 'onorbefore', stDateFilter));
                        }
                        if(arrPerpeptualCat != null && arrPerpeptualCat != undefined && arrPerpeptualCat != ''){
                            if(arrPerpeptualCat.length > 0){
                                // -- logger.debug(MSG_TITLE, 'Adding filter for Perpetual Item Cats');
                                arrCoTermFilter.push(new nlobjSearchFilter('custrecord_item_category', null, 'noneof', arrPerpeptualCat));
                            }
                        }

                        if(stEndUser != null && stEndUser != undefined && stEndUser != '') {
                            // -- logger.debug(MSG_TITLE, 'End User is not empty.');
                            arrCoTermFilter.push(new nlobjSearchFilter('custrecord_ib_end_user', null, 'is', stEndUser));
                        } else {
                            // -- logger.debug(MSG_TITLE, 'End User is empty.');
                            arrCoTermFilter.push(new nlobjSearchFilter('custrecord_ib_end_user', null, 'is', '@NONE@'));
                        }

                        var arrCoTermColumn = [
                            new nlobjSearchColumn('custrecord_install_base_end_date', null, 'max'),
                            new nlobjSearchColumn('custrecord_install_base_end_date', null, 'min')
                        ];
                        var arrCoTermResults = nlapiSearchRecord('customrecord_install_base','',arrCoTermFilter,arrCoTermColumn);

                        var stCoTermEndDateEarliest = null;
                        var stCoTermEndDateLatest   = null;
                        if(arrCoTermResults != null && arrCoTermResults != undefined && arrCoTermResults != '') {
                            stCoTermEndDateEarliest = arrCoTermResults[0].getValue('custrecord_install_base_end_date', null, 'min');
                            stCoTermEndDateLatest   = arrCoTermResults[0].getValue('custrecord_install_base_end_date', null, 'max');
                            // -- logger.debug(MSG_TITLE, 'stCoTermEndDateEarliest : ' + stCoTermEndDateEarliest);
                            // -- logger.debug(MSG_TITLE, 'stCoTermEndDateLatest   : ' + stCoTermEndDateLatest);
                        }
                        
                        if (!stCoTermEndDateEarliest && !stCoTermEndDateLatest) {  
                            arrCoTermFilter = new Array(); 
                            arrCoTermFilter = [
                                new nlobjSearchFilter('custrecord_install_base_synch_status',     null, 'anyof', [SYNCH_STATUS_ACTIVE]),
                                new nlobjSearchFilter('custrecord_install_base_end_date',         null, 'isnotempty'),
                                new nlobjSearchFilter('custrecord_install_base_bill_to_customer', null, 'is', stCustId),
                                new nlobjSearchFilter('custrecord_renewals_exclusion',            null, 'is', 'F'), 
                                new nlobjSearchFilter('isinactive',                               null, 'is', 'F')
                            ];
                            
                            if (CO_TERM_BASIS == END_DATE_EARLIEST) {
                                arrCoTermFilter.push(new nlobjSearchFilter('custrecord_install_base_end_date', null, 'onorbefore', stDateFilter));
                            }
                            
                            if(arrPerpeptualCat != null && arrPerpeptualCat != undefined && arrPerpeptualCat != ''){
                                if(arrPerpeptualCat.length > 0){
                                    // -- logger.debug(MSG_TITLE, 'Adding filter for Perpetual Item Cats');
                                    arrCoTermFilter.push(new nlobjSearchFilter('custrecord_item_category', null, 'noneof', arrPerpeptualCat));
                                }
                            }
                            if(stEndUser != null && stEndUser != undefined && stEndUser != ''){
                                // -- logger.debug(MSG_TITLE, 'End User is not empty.');
                                arrCoTermFilter.push(new nlobjSearchFilter('custrecord_ib_end_user', null, 'is', stEndUser));
                            }else{
                                // -- logger.debug(MSG_TITLE, 'End User is empty.');
                                arrCoTermFilter.push(new nlobjSearchFilter('custrecord_ib_end_user', null, 'is', '@NONE@'));
                            }
                            arrCoTermResults = nlapiSearchRecord('customrecord_install_base','',arrCoTermFilter,arrCoTermColumn);                    

                            if(arrCoTermResults != null && arrCoTermResults != undefined && arrCoTermResults != '') {
                                stCoTermEndDateEarliest = arrCoTermResults[0].getValue('custrecord_install_base_end_date', null, 'min');
                                stCoTermEndDateLatest   = arrCoTermResults[0].getValue('custrecord_install_base_end_date', null, 'max');
                                // -- logger.debug(MSG_TITLE, 'stCoTermEndDateEarliest : ' + stCoTermEndDateEarliest);
                                // -- logger.debug(MSG_TITLE, 'stCoTermEndDateLatest   : ' + stCoTermEndDateLatest);
                            }
                        }

                        /* Issue 173905 fix */                        
                        var stCoTermDate = null;
                        switch (CO_TERM_BASIS) {
                            case END_DATE_EARLIEST:
                                stCoTermDate = stCoTermEndDateEarliest;
                                break;
                            case END_DATE_LATEST:
                                stCoTermDate = stCoTermEndDateLatest;
                                break;
                        }
                        if (!stCoTermDate) continue; 
                        stCoTermDate = nlapiDateToString(nlapiAddMonths(nlapiStringToDate(stCoTermDate), 12));

                        // -- logger.debug(MSG_TITLE, 'Co-Term End Date : ' + stCoTermDate);
                        var stSOEarliestStartDate = nlapiStringToDate(stCoTermDate);
                        var recTran               = nlapiCreateRecord(TRAN_TYPE); // Create an SO for the customer
                        // Clear the currently mapped body field values
                        for(var idxBodyMap = 0; idxBodyMap < BODY_FIELD_MAPS.length; idxBodyMap++) {
                            BODY_FIELD_MAPS[idxBodyMap].value          = null;
                            BODY_FIELD_MAPS[idxBodyMap].ib_datecreated = new Date(0);
                        }
                        
                        /* Determine the form to use */
                        var stTranFormId             = '';
                        var stCustTranFormBasisValue = '';
                        switch(RENEWAL_FORM_BASIS) {
                            case RENEWAL_TRAN_FORM_SOURCE_CLASS:
                                break;
                            case RENEWAL_TRAN_FORM_SOURCE_DEPARTMENT:
                                break;
                            case RENEWAL_TRAN_FORM_SOURCE_LOCATION:
                                break;
                            case RENEWAL_TRAN_FORM_SOURCE_SUBSIDIARY:
                                stCustTranFormBasisValue = arrCustomerResults[idx].getValue('subsidiary');
                                break;
                            case RENEWAL_TRAN_FORM_SOURCE_CHANNEL:
                                stCustTranFormBasisValue = arrCustomerResults[idx].getValue('custentity_customer_channel_tier');
                                break;
                        }
                        // -- logger.debug(MSG_TITLE,'stCustTranFormBasisValue : ' + stCustTranFormBasisValue);
                        
                        if(stCustTranFormBasisValue != null && stCustTranFormBasisValue != '' && stCustTranFormBasisValue != undefined){
                            var arrTranFormFilters = [
                                new nlobjSearchFilter('custrecord_renewal_tran_form_source',            null, 'is', RENEWAL_FORM_BASIS),
                                new nlobjSearchFilter(RENEWAL_TRAN_FORM_MAP_FIELDS[RENEWAL_FORM_BASIS], null, 'is', stCustTranFormBasisValue),
                                new nlobjSearchFilter('custrecord_renewal_map_tran_type',               null, 'is', TRAN_TYPE),
                                new nlobjSearchFilter('isinactive',                                     null, 'is', 'F')
                            ];
                            var arrTranFormColumns = [
                                new nlobjSearchColumn('custrecord_renewal_tran_form_id')
                            ];
                            var arrTranFormResults = nlapiSearchRecord('customrecord_renewal_tran_form_map', null, arrTranFormFilters, arrTranFormColumns);
                            // -- logger.debug(MSG_TITLE,'Use the first result if there is one.');
                            if (arrTranFormResults != null && arrTranFormResults != undefined && arrTranFormResults != '') {
                                if(arrTranFormResults.length > 0) {
                                    stTranFormId = arrTranFormResults[0].getValue('custrecord_renewal_tran_form_id');                                    
                                    // -- logger.debug(MSG_TITLE,'Tran Form Mapping found -- id : ' + arrTranFormResults[0].getId());
                                }
                            }
                        }
                        if(stTranFormId != null && stTranFormId != '') {
                            // -- logger.debug(MSG_TITLE,'Using tran form mapping : ' + stTranFormId);
                            recTran.setFieldValue('customform', stTranFormId);
                        } else {
                            // -- logger.debug(MSG_TITLE,'Using tran form default : ' + TRAN_FORM_ID);
                            recTran.setFieldValue('customform', TRAN_FORM_ID);
                        }
                        /* *******************************/
                        
                        /* Determine the salesrep for the transaction */
                        var stSalesRep = ASSIGN_TO;
                        switch(ASSIGN_TO_TYPE) {
                            case ASSIGN_TO_TYPE_CUST_SALES_REP:
                                stSalesRep = arrCustomerResults[idx].getValue('salesrep');
                                if(stSalesRep == null || stSalesRep == undefined || stSalesRep == '') {
                                    stSalesRep = ASSIGN_TO;
                                }
                                break;
                            case ASSIGN_TO_TYPE_EMPLOYEE:
                                stSalesRep = ASSIGN_TO;
                                break;
                        }
                        // -- logger.debug(MSG_TITLE, 'Assigned SalesRep =' + stSalesRep);

                        /* Set the salesrep */
                        if(nlapiGetContext().getSetting('FEATURE','TEAMSELLING')=='T') {
                            // Account uses Team Selling
                            // -- logger.debug(MSG_TITLE,'Account is using Team Selling');
                            recTran.insertLineItem('salesteam',1);
                            recTran.setLineItemValue('salesteam', 'salesrole',    1, '-2');
                            recTran.setLineItemValue('salesteam', 'employee',     1, stSalesRep);
                            recTran.setLineItemValue('salesteam', 'isprimary',    1, 'T');
                            recTran.setLineItemValue('salesteam', 'contribution', 1, '100%');
                        }else{
                            // -- logger.debug(MSG_TITLE,'Account is not using Team Selling');
                            recTran.setFieldValue('salesrep', stSalesRep);
                        }

                        /* Set the SO field values */
                        recTran.setFieldValue('enddate', stCoTermDate);
                        recTran.setFieldValue('entity', stCustId);
                        if(USE_CHANNEL_MGMT == YES) {
                            if(stEndUser != null && stEndUser != undefined && stEndUser != '') {
                                recTran.setFieldValue('custbody_end_user', stEndUser);
                            }
                            recTran.setFieldValue('custbody_bill_to_tier', stCustChannelTier);
                            recTran.setFieldValue('custbody_ship_to_tier', stCustChannelTier);
    
                            switch (stCustChannelTier) {
                                case BILL_TO_TIER_END_USER:
                                    recTran.setFieldValue('custbody_end_user', stCustId);
                                    break;
                                case BILL_TO_TIER_RESELLER:
                                    recTran.setFieldValue('custbody_reseller', stCustId);
                                    break;
                                case BILL_TO_TIER_DISTRIBUTOR:
                                    recTran.setFieldValue('custbody_distributor', stCustId);
                                    break;
                            }
                        }
                        recTran.setFieldValue('custbody_order_type', DFLT_ORDER_TYPE);

                        /* Take note of process contracts & tran lines created */
                        var arrContractIdsToUpdate = new Array();
                        var iContractCnt           = 0;
                        var iTranLineCnt           = 0;

                        /* Loop through all the products of the Customer. */
                        var arrProductFilters = [
                            new nlobjSearchFilter('custrecord_bill_to_customer', null, 'is', stCustId),
                            new nlobjSearchFilter('isinactive',                  null, 'is', 'F')
                        ];
                        if(stEndUser != null && stEndUser != undefined && stEndUser != '') {
                            arrProductFilters.push(new nlobjSearchFilter('custrecord_end_user', null, 'is', stEndUser));
                        } else {
                            arrProductFilters.push(new nlobjSearchFilter('custrecord_end_user', null, 'is', '@NONE@'));
                        }

                        var arrProductColumns = [
                            new nlobjSearchColumn('custrecord_opt_out_ms'),
                            new nlobjSearchColumn('custrecord_previous_product_rate'),
                            new nlobjSearchColumn('custrecord_current_product_rate'),
                            new nlobjSearchColumn('custrecord_product_future_rate'),
                            new nlobjSearchColumn('custrecord_p_product_line'),
                            new nlobjSearchColumn('custrecord_product_item'),
                            new nlobjSearchColumn('custrecord_m_s_item'),
                            new nlobjSearchColumn('custrecord_product_renew_with'),
                            new nlobjSearchColumn('custrecord_uplift'),
                            new nlobjSearchColumn('custrecord_coterm_prorate_ratio'),
                            new nlobjSearchColumn('custrecord_install_base_earliest_end')
                        ];
//                        if ((contractIdParam != null) && (productIdParam != null)) {
//                            arrProductFilters.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthanorequalto', productIdParam));
//                        } else if (productIdParam != null) {
//                            arrProductFilters.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', productIdParam));            
//                        }
                        var arrProductResults = nlapiSearchRecord('customrecord_product', null, arrProductFilters, arrProductColumns);
                        var stProdId = null;
                        if(arrProductResults != null && arrProductResults != undefined && arrProductResults != '') {
                            logger.audit(MSG_TITLE, 'Processing ' + arrProductResults.length + ' products. stCustId:[' + stCustId + '] : stEndUser:[' + stEndUser + '] : PARAMS :: custId:[' + custIdParam + '] : endUserId:[' + endUserIdParam + '] : productId:[' + productIdParam + '] :: usageLimitLeft:[' + nlapiGetContext().getRemainingUsage() + ']');
                            logger.indent();
                            for (var iProdIdx = 0; iProdIdx < arrProductResults.length; iProdIdx++){

                                var stProdEarliestStart = arrProductResults[iProdIdx].getValue('custrecord_install_base_earliest_end');
                                if (!stProdEarliestStart) continue;
                                
                                stProdId = arrProductResults[iProdIdx].getId();
                                logger.debug(MSG_TITLE, 'stProdId:[' + stProdId + ']  Index [' + iProdIdx + '/' + arrProductResults.length + '].');

                                var bShouldCreateProductMS = false;
                                var stProductMSTranLnDescr = '';
								var flProductMSDiscount    = null;
                                var dtLastMSStartDt        = new Date(0);
                                var bIsProdOptOut          = arrProductResults[iProdIdx].getValue('custrecord_opt_out_ms')=='T';
                                // -- logger.debug(MSG_TITLE, 'Is Product Opt-Out : ' + bIsProdOptOut);

                                /* Retrieve all Contracts for renewal. */
                                var arrContractsFilters = [
                                    new nlobjSearchFilter('custrecord_install_base_end_date',     null, 'isnotempty'),
                                    new nlobjSearchFilter('custrecord_install_base_end_date',     null, 'onorbefore', stCoTermDate),
                                    new nlobjSearchFilter('custrecord_renewal_processed_on',      null, 'isempty'),
                                    new nlobjSearchFilter('custrecord_install_base_product',      null, 'is',         stProdId),
                                    new nlobjSearchFilter('custrecord_renewals_exclusion',        null, 'is',         'F'),
                                    new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'anyof',      [SYNCH_STATUS_ACTIVE,SYNCH_STATUS_EXPIRED]),
                                    new nlobjSearchFilter('isinactive', null, 'is', 'F')
                                ];

                                if(NON_RENEWAL_IB_TYPE.length > 0){
                                    // -- logger.debug(MSG_TITLE, 'Adding filter for Non-Renewal IB Types');
                                    arrContractsFilters.push(new nlobjSearchFilter('custrecord_install_base_type', null, 'noneof', NON_RENEWAL_IB_TYPE));
                                }
                                if(arrPerpeptualCat.length > 0){
                                    // -- logger.debug(MSG_TITLE, 'Adding filter for Perpetual Item Cats');
                                    arrContractsFilters.push(new nlobjSearchFilter('custrecord_item_category', null, 'noneof', arrPerpeptualCat));
                                }

                                var arrContractsColumns = [
                                    new nlobjSearchColumn('custrecord_install_base_item'),
                                    new nlobjSearchColumn('custrecord_install_base_end_date'),
                                    new nlobjSearchColumn('custrecord_orignal_list_rate'),
                                    new nlobjSearchColumn('custrecord_current_list_rate'),
                                    new nlobjSearchColumn('custrecord_quantity'),
                                    new nlobjSearchColumn('custrecord_renew_with'),
                                    new nlobjSearchColumn('custrecord_replaced_with'),
                                    new nlobjSearchColumn('custrecord_install_base_type'),
                                    new nlobjSearchColumn('custrecord_original_transaction'),
// Comment out Uplift Caps functionality
//                                    new nlobjSearchColumn('custrecord_uplift_cap_basis_rate'),
                                    new nlobjSearchColumn('custrecord_install_base_product'),
                                    new nlobjSearchColumn('custrecord_ib_tran_line_description'),
                                    new nlobjSearchColumn('custrecord_original_discount'),
                                    new nlobjSearchColumn('custitem_item_pricing_type','CUSTRECORD_INSTALL_BASE_ITEM')
                                ];
                                /* ===== Perform extra mappings defined START ===== */
                                // Get the Date Created of the Install Base
                                arrContractsColumns.push(new nlobjSearchColumn('created'));

                                for(var idxMap = 0; idxMap < FLD_MAPPINGS.length; idxMap++) {
                                    if(FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] != '' && FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] != null && FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] != undefined) {
                                        arrContractsColumns.push(new nlobjSearchColumn(FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map']));
                                    }
                                }
                                /* ===== Perform extra mappings defined END ===== */

//                                if (contractIdParam != null) {
//                                    arrContractsFilters.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', contractIdParam));
//                                }
                                var arrContractsResults = nlapiSearchRecord('customrecord_install_base', null, arrContractsFilters, arrContractsColumns);
                                if (arrContractsResults != null && arrContractsResults != undefined && arrContractsResults != '') {
                                    logger.audit(MSG_TITLE, 'Processing ' + arrContractsResults.length + ' contracts. stCustId:[' + stCustId + '] : stEndUser:[' + stEndUser + '] : stProdId:[' + stProdId + '] : PARAMS :: custId:[' + custIdParam + '] : endUserId:[' + endUserIdParam + '] : productId:[' + productIdParam + '] : contractId:[' + contractIdParam + '] :: usageLimitLeft:[' + nlapiGetContext().getRemainingUsage() + ']');
                                    logger.indent();
                                    for (var iContractIdx = 0; iContractIdx < arrContractsResults.length; iContractIdx++) {
//                                        logger.debug(MSG_TITLE, 'stContractId:[' + arrContractsResults[iContractIdx].getId() + ']  Index [' + iContractIdx + '/' + arrContractsResults.length + '].');

                                        var stStartDate = arrContractsResults[iContractIdx].getValue('custrecord_install_base_end_date');
                                        if (!stStartDate) continue;

                                        stStartDate = nlapiDateToString(nlapiAddDays(nlapiStringToDate(stStartDate), 1));
                                        if(nlapiStringToDate(stStartDate) >= nlapiStringToDate(stCoTermDate)){
                                            continue;
                                        }

                                        /* All contracts that get looped through should have their renewal date populated later. */
                                        var stContractId = arrContractsResults[iContractIdx].getId();
                                        
                                        /* Update the Contracts */
                                        var renewalProcessedOnDate = nlapiDateToString(dtToday);
                                        logger.debug(MSG_TITLE,'Updating Contract renewalProcessedOnDate:[' + renewalProcessedOnDate + '] :: stContractId:[' + stContractId + '] :: stCustId:[' + stCustId + '] :: stEndUser:[' + stEndUser + ']');
                                        nlapiSubmitField('customrecord_install_base', stContractId, 'custrecord_renewal_processed_on', renewalProcessedOnDate);
                                        arrContractsRenewalProcOn[arrContractsRenewalProcOn.length] = stContractId;

                                        /* Skip this if this is a M/S record */
                                        if (arrContractsResults[iContractIdx].getValue('custrecord_install_base_type')== CONTRACT_TYPE_MAINTENANCE || arrContractsResults[iContractIdx].getValue('custrecord_install_base_type')== CONTRACT_TYPE_SUPPORT) {
                                            /* If we are using an Itemized M/S Model, then don't skip M/S Items but renew each one instead. */
                                            switch(MS_MODEL) {
                                                case MS_MODEL_PERCENTAGE:
                                                case MS_MODEL_PERCENTAGE_NET:
                                                    /* Keep track of the M/S Item's Tran Line Description*/
                                                    var dtTempMSStartDt = arrContractsResults[iContractIdx].getValue('custrecord_install_base_end_date');
                                                    dtTempMSStartDt = nlapiStringToDate(dtTempMSStartDt);
                                                    if(dtTempMSStartDt > dtLastMSStartDt) {
                                                        stProductMSTranLnDescr = arrContractsResults[iContractIdx].getValue('custrecord_ib_tran_line_description');
														flProductMSDiscount = arrContractsResults[iContractIdx].getValue('custrecord_original_discount');
                                                    }
                                                    bShouldCreateProductMS = true;
                                                    continue;
                                                case MS_MODEL_ITEMIZED:
                                                    break; 
                                            }
                                        }
                                        
                                        if(nlapiStringToDate(stStartDate) < stSOEarliestStartDate){
                                            stSOEarliestStartDate = nlapiStringToDate(stStartDate);
                                        }

//                                        logger.debug(MSG_TITLE, 'Processing Contract:[' + stContractId + '] : '
//                                                + 'ib_item:[' + arrContractsResults[iContractIdx].getValue('custrecord_install_base_item') + '] : '
//                                                + 'ib_type:[' + arrContractsResults[iContractIdx].getValue('custrecord_install_base_type') + '] : '
//                                                + 'ib_product:[' + arrContractsResults[iContractIdx].getValue('custrecord_install_base_product') + '] : '
//                                                + 'ib_end_date:[' + arrContractsResults[iContractIdx].getValue('custrecord_install_base_end_date') + '] : '
//                                                + 'orignal_lr:[' + arrContractsResults[iContractIdx].getValue('custrecord_orignal_list_rate') + '] : '
//                                                + 'current_lr:[' + arrContractsResults[iContractIdx].getValue('custrecord_current_list_rate') + '] : '
//                                                + 'quantity:[' + arrContractsResults[iContractIdx].getValue('custrecord_quantity') + '] : '
//                                                + 'renew_w:[' + arrContractsResults[iContractIdx].getValue('custrecord_renew_with') + '] : '
//                                                + 'replaced_w:[' + arrContractsResults[iContractIdx].getValue('custrecord_replaced_with') + '] : '
//                                                + 'original_tran:[' + arrContractsResults[iContractIdx].getValue('custrecord_original_transaction') + '] : '
//                                                + 'ib_tran_line_description:[' + arrContractsResults[iContractIdx].getValue('custrecord_ib_tran_line_description') + ']'
//                                                + ' -- stCustId:[' + stCustId + '] : stEndUser:[' + stEndUser + '] : stProdId:[' + stProdId + '] : PARAMS :: custId:[' + custIdParam + '] : endUserId:[' + endUserIdParam + '] : productId:[' + productIdParam + '] : contractId:[' + contractIdParam + ']'     
//                                         );
                                                                                        
                                        logger.debug(MSG_TITLE, 'Updating Contract:[' + stContractId
                                                            + '] ' + '(' + iContractIdx + ' of ' + arrContractsResults.length + ')' 
                                                            + ' -- stCustId:[' + stCustId + '] : stEndUser:[' + stEndUser + '] : stProdId:[' + stProdId + '] : PARAMS :: custId:[' + custIdParam + '] : endUserId:[' + endUserIdParam + '] : productId:[' + productIdParam + '] : contractId:[' + contractIdParam + '] :: usageLimitLeft:[' + nlapiGetContext().getRemainingUsage() + ']'     
                                        );

                                        iTranLineCnt += 1;
                                        recTran.insertLineItem('item', iTranLineCnt);
                                        
                                        /* Use either renew with or replaced with renew with */
                                        var stItemUsedToReplace = arrContractsResults[iContractIdx].getValue('custrecord_replaced_with');
                                        var stItemUsedToRenew   = arrContractsResults[iContractIdx].getValue('custrecord_renew_with');
                                        if(stItemUsedToReplace != null && stItemUsedToReplace != undefined && stItemUsedToReplace != '') {
                                            stItemUsedToRenew   = nlapiLookupField('item',stItemUsedToReplace,'custitem_replaced_with');
                                        }

                                        if (stItemUsedToRenew == null || stItemUsedToRenew == undefined || stItemUsedToRenew == '') {
                                            stItemUsedToRenew = '-3'; // This is a discount item
                                            /* Log an error and skip this contract. */
                                            /* Insert description line so that user can see it. */
                                            recTran.setLineItemValue('item', 'item', iTranLineCnt, DUMMY_ITEM);
                                            recTran.setLineItemValue('item', 'description', iTranLineCnt, 'The contract(' + stContractId + ') being renewed doesn\'t have a valid "renew with" or "replaced with, renew with" item defined.');
                                            continue;
                                        }

                                        recTran.setLineItemValue('item', 'item', iTranLineCnt, stItemUsedToRenew);
                                        recTran.setLineItemValue('item', 'quantity', iTranLineCnt, arrContractsResults[iContractIdx].getValue('custrecord_quantity'));
                                        //Commented - Fix for Issue 179890 //recTran.setLineItemValue('item', 'price', iTranLineCnt, '-1'); // setting Price Level to Custom

                                        // Add Tran Line Description if needed (switch used for future expansion)
                                        switch (INCLUDE_TRAN_LINE_DESCR) {
                                            case YES:
                                                var stDescr = arrContractsResults[iContractIdx].getValue('custrecord_ib_tran_line_description');
                                                recTran.setLineItemValue('item', 'description', iTranLineCnt, stDescr);
                                                break;
                                            case NO:
                                                break;
                                        }

                                        // only salesorder & invoice use rev rec start & end dates
                                        if (TRAN_TYPE == 'salesorder' || TRAN_TYPE == 'invoice') {
                                            recTran.setLineItemValue('item', 'revrecstartdate', iTranLineCnt, stStartDate);
                                            recTran.setLineItemValue('item', 'revrecenddate',   iTranLineCnt, stCoTermDate);
                                        }
                                        
                                        /* Compute for Term in Months */
                                        var iTermInMonths = computeTermInMonths(stStartDate, stCoTermDate);
                                        recTran.setLineItemValue('item', 'revrecterminmonths', iTranLineCnt, iTermInMonths);

                                        /* Compute for License Amount */
                                        var flListRate = 0;
                                        switch (PRICING_MODEL) {
                                            case PRICING_MODEL_CURRENT_LIST:
                                                // Do not add the rates. The transaction needs to be saved first to get the real rates.
                                                break;
                                            case PRICING_MODEL_HISTORIC_LIST:
                                                recTran.setLineItemValue('item', 'price',             iTranLineCnt, '-1');
                                                flListRate = parseFloatOrZero(arrContractsResults[iContractIdx].getValue('custrecord_orignal_list_rate'));
                                                flListRate = Math.round(flListRate * (100 + flUpliftRate) * 100) / 10000;

                                                var flRate = Math.round(flListRate * iTermInMonths * 10000) / 10000;
												flListRate = flListRate.toFixed(6);												
                                                recTran.setLineItemValue('item', 'custcol_list_rate', iTranLineCnt, flListRate);
                                                recTran.setLineItemValue('item', 'rate',              iTranLineCnt, flRate);
                                                break;
                                            case PRICING_MODEL_HISTORIC_NET:
                                                /**
                                                 * This needs to be coded.
                                                 */
                                                break;
                                        }
                                        
                                        /* ===== Perform extra mappings defined START ===== */
                                        for(var idxMap = 0; idxMap < FLD_MAPPINGS.length; idxMap++) {
                                            var stDataToMap = '';
                                            
                                            // Determine Data To Map 
                                            if(FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] != '' && FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] != null && FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] != undefined) {
                                                stDataToMap = arrContractsResults[iContractIdx].getValue(FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map']);
                                            }
                                            // Map Data
                                            if(stDataToMap != '' && stDataToMap != null && stDataToMap != undefined) {
                                                if(FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map'] != '' && FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map'] != null) {
                                                    if(FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_type'] == TRAN_BODY_FIELD) {
                                                        recTran.setFieldValue(FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map'], stDataToMap);
                                                    }
                                                    if(FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_type'] == TRAN_LINE_FIELD) {
                                                        recTran.setLineItemValue('item', FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map'], iTranLineCnt, stDataToMap);
                                                    }
                                                    logger.debug(MSG_TITLE,'Mapping [' + FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] + ']= \'' + stDataToMap + '\' to Tran field ' + FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map']);
                                                }
                                            }
                                        }
                                        // Store the body field values if these are the latest values
                                        for(var iBodyFlds = 0; iBodyFlds < BODY_FIELD_MAPS.length; iBodyFlds++) {
                                            if(BODY_FIELD_MAPS[iBodyFlds].ib_field_id != null && BODY_FIELD_MAPS[iBodyFlds].ib_field_id != '') {
                                                var stIBFieldValue = arrContractsResults[iContractIdx].getValue(BODY_FIELD_MAPS[iBodyFlds].ib_field_id);
                                                var dtIBCreated = arrContractsResults[iContractIdx].getValue('created');
                                                if(dtIBCreated == null || dtIBCreated == '') {
                                                    dtIBCreated = new Date(0);
                                                } else {
                                                    dtIBCreated = nlapiStringToDate(dtIBCreated);
                                                }
                                                if(BODY_FIELD_MAPS[iBodyFlds].ib_datecreated < dtIBCreated) {
                                                    logger.debug(MSG_TITLE,'Replacing Body Field Value for ' + BODY_FIELD_MAPS[iBodyFlds].tran_field_id + ': ' + stIBFieldValue + '(' + dtIBCreated + ')');
                                                    BODY_FIELD_MAPS[iBodyFlds].value = stIBFieldValue;
                                                    BODY_FIELD_MAPS[iBodyFlds].ib_datecreated = dtIBCreated;
                                                }
                                            }
                                        }
                                        /* ===== Perform extra mappings defined END ===== */
                                        
                                        /* ===== Inline Discounting START ===== */
                                       
                                        if (ALLOW_DISCOUNT) {
                                            // Set either the customer discount rate or the original discount rate
											if(DFLT_CUST_DISCOUNT) {
                                                var flDiscountRate = flCustDiscount;
											} else {
                                                var flDiscountRate = arrContractsResults[iContractIdx].getValue('custrecord_original_discount');
											}
                                            if(flDiscountRate != null && flDiscountRate != '' && flDiscountRate != undefined) {
                                                recTran.setLineItemValue('item', 'custcol_inline_discount', iTranLineCnt, flDiscountRate); 
                                            }
                                        }

                                        // Calculate Discount if needed and if pricing model is Historic
                                        performDiscountCalcOnLine(recTran, iTranLineCnt);
                                        /* ===== Inline Discounting END ===== */

//                                        var param = new Object();
//                                        param.custscript_r05_custid     = stCustId;
//                                        param.custscript_r05_enduserid  = stEndUser;
//                                        param.custscript_r05_productid  = stProdId;     
//                                        param.custscript_r05_contractid = stContractId;                                         
//                                        if (isScriptReQueued(arrContractsResults.length, iContractIdx, logger, param) == true) {
//                                            logger.audit(MSG_TITLE, '=====RESCHEDULED=====');
//                                            return;
//                                        }
                                    } // for (var iContractIdx = 0; iContractIdx < arrContractsResults.length; iContractIdx++) {
                                    logger.unindent();
                                    logger.audit(MSG_TITLE, 'DONE : Processing ' + arrContractsResults.length + ' contracts. stCustId:[' + stCustId + '] : stEndUser:[' + stEndUser + '] : stProdId:[' + stProdId + '] : PARAMS :: custId:[' + custIdParam + '] : endUserId:[' + endUserIdParam + '] : productId:[' + productIdParam + '] : contractId:[' + contractIdParam + '] :: usageLimitLeft:[' + nlapiGetContext().getRemainingUsage() + ']');
                                } // if (arrContractsResults != null && arrContractsResults != undefined && arrContractsResults != '') {

                                /* If Product is not opt-out, create renewal M/S */
                                if (!bIsProdOptOut && bShouldCreateProductMS) {
                                    /* Create the M/S Line */
                                    switch(MS_MODEL) {
                                        case MS_MODEL_ITEMIZED:
                                            /* Skip Product M/S Item if we are using the Itemized M/S record. */
                                            break;
                                        case MS_MODEL_PERCENTAGE:
                                        case MS_MODEL_PERCENTAGE_NET:
                                            /* M/S as a percentage of license */

                                            /* Get the end date of the earliest M/S Product which is active/expired and is being renewed. */
                                            var stMSStartDate = '';
                                            var arrMSItemEndDtFilters = [
                                                new nlobjSearchFilter('custrecord_install_base_end_date',     null, 'isnotempty'),
                                                new nlobjSearchFilter('custrecord_install_base_end_date',     null, 'onorbefore', stCoTermDate),
                                                new nlobjSearchFilter('custrecord_install_base_product',      null, 'is',         stProdId),
			                                    new nlobjSearchFilter('custrecord_renewals_exclusion',        null, 'is',         'F'),
			                                    new nlobjSearchFilter('custrecord_renewal_processed_on',      null, 'isempty'),
			                                    new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'anyof',      [SYNCH_STATUS_ACTIVE, SYNCH_STATUS_EXPIRED]),
			                                    new nlobjSearchFilter('custrecord_install_base_type',         null, 'anyof',      [CONTRACT_TYPE_MAINTENANCE, CONTRACT_TYPE_SUPPORT]),
                                                new nlobjSearchFilter('isinactive',                           null, 'is',         'F')
											];
                                            var arrMSItemEndDtColumns = [
                                                new nlobjSearchColumn('custrecord_install_base_end_date',null,'min')
                                            ];
                                            var arrMSItemEndDtResults = nlapiSearchRecord('customrecord_install_base',null,arrMSItemEndDtFilters, arrMSItemEndDtColumns);
                                            if(arrMSItemEndDtResults){
                                                stMSStartDate = arrMSItemEndDtResults[0].getValue('custrecord_install_base_end_date',null,'min');
                                                if(stMSStartDate != null && stMSStartDate != undefined && stMSStartDate != ''){
                                                    stMSStartDate = nlapiDateToString(nlapiAddDays(nlapiStringToDate(stMSStartDate), 1));
                                                }
                                            }
                                            if(stMSStartDate == null || stMSStartDate == undefined || stMSStartDate == ''){
                                                stMSStartDate = nlapiDateToString(nlapiAddDays(nlapiStringToDate(stProdEarliestStart), 1));;
                                            }

                                            if(nlapiStringToDate(stMSStartDate) < stSOEarliestStartDate){
                                                stSOEarliestStartDate = nlapiStringToDate(stMSStartDate);
                                            }
                                            
                                            if(nlapiStringToDate(stMSStartDate) >= nlapiStringToDate(stCoTermDate)){
                                                break;
                                            }

                                            /* Use products M/S Item to create the renewal M/S line */
                                            var stMSItemId = arrProductResults[iProdIdx].getValue('custrecord_m_s_item');
                                            var stProdLine = arrProductResults[iProdIdx].getValue('custrecord_p_product_line');
                                            logger.debug(MSG_TITLE, 'Product\'s M/S item: ' + stMSItemId);

                                            /* If there's still no M/S Item, set an error message. */
                                            if(stMSItemId == null || stMSItemId == undefined || stMSItemId == ''){

                                                /* Insert description line so that user can see it. */
                                                iTranLineCnt += 1;
                                                recTran.insertLineItem('item', iTranLineCnt);
                                                recTran.setLineItemValue('item', 'item',        iTranLineCnt, DUMMY_ITEM);
                                                recTran.setLineItemValue('item', 'description', iTranLineCnt, 'Maintenance/Support was not created for product line ' + nlapiLookupField('customlist_product_line',stProdLine,'name') + ' because the product doesn\'t have a M/S item defined.');

                                            }else{

                                                /* Get the Renew With & Replace With fields of the M/S Item */
                                                var arrMSItemFields     = ['custitem_renew_with','custitem_replaced_with'];
                                                var arrMSItemValues     = nlapiLookupField('item',stMSItemId,arrMSItemFields);
                                                var msiItemReplacedWith = arrMSItemValues['custitem_replaced_with'];
                                                
                                                if (msiItemReplacedWith != null && msiItemReplacedWith != undefined && msiItemReplacedWith != '') {
                                                    stMSItemId = nlapiLookupField('item', msiItemReplacedWith, 'custitem_renew_with');
                                                }else{
                                                    stMSItemId = arrMSItemValues['custitem_renew_with'];
                                                }

                                                if(stMSItemId == null || stMSItemId == undefined || stMSItemId == ''){
                                                    /* Insert description line so that user can see it. */
                                                    iTranLineCnt += 1;
                                                    recTran.insertLineItem('item', iTranLineCnt);
                                                    recTran.setLineItemValue('item', 'item',        iTranLineCnt, DUMMY_ITEM);
                                                    recTran.setLineItemValue('item', 'description', iTranLineCnt, 'Maintenance/Support was not created for product line ' + nlapiLookupField('customlist_product_line',stProdLine,'name') + ' because the "renew with" M/S item defined.');
                                                } else {
                                                    /* Get Item Category*/
                                                    var stItemCat = nlapiLookupField('item', stMSItemId, 'custitem_item_category');

                                                    /* Insert transaction line */
                                                    iTranLineCnt += 1;
                                                    recTran.insertLineItem('item', iTranLineCnt);
                                                    recTran.setLineItemValue('item', 'item',     iTranLineCnt, stMSItemId);
                                                    recTran.setLineItemValue('item', 'quantity', iTranLineCnt, '1');
                                                    
                                                    // Add Tran Line Description if needed (switch used for future expansion)
                                                    switch (INCLUDE_TRAN_LINE_DESCR) {
                                                        case YES:
                                                            if(stProductMSTranLnDescr != '' && stProductMSTranLnDescr != null && stProductMSTranLnDescr != undefined) {
                                                                recTran.setLineItemValue('item', 'description', iTranLineCnt, stProductMSTranLnDescr);
                                                            }
                                                            break;
                                                        case NO:
                                                            break;
                                                    }

                                                    /* Compute for Term in Months */
                                                    var iMSTermInMonths = computeTermInMonths(stMSStartDate, stCoTermDate);
                                                    recTran.setLineItemValue('item', 'revrecterminmonths', iTranLineCnt, iMSTermInMonths);
                                                    
                                                    if (TRAN_TYPE == 'salesorder' || TRAN_TYPE == 'invoice') {                  // only salesorder & invoice use rev rec start & end dates
                                                        recTran.setLineItemValue('item', 'revrecstartdate', iTranLineCnt, stMSStartDate);
                                                        recTran.setLineItemValue('item', 'revrecenddate',   iTranLineCnt, stCoTermDate);
                                                    }

                                                    /* Retrieve Maintenance/Support % */
                                                    var stMaintType  = nlapiLookupField('item',                            stMSItemId,  'custitem_mtce_support_type');
                                                    var flPercentage = nlapiLookupField('customrecord_mtce_support_types', stMaintType, 'custrecord_support_percentage');
                                                    flPercentage     = flPercentage.replace('%','');
                                                    flPercentage     = parseFloatOrZero(flPercentage);

                                                    /* ===== Inline Discounting START ===== */
                                                    if(ALLOW_DISCOUNT && ALLOW_DISC_ON_MS) {
                                                        // Set either the customer discount rate or the original discount rate
                                                        if(DFLT_CUST_DISCOUNT) {
                                                            var flDiscountRate = flCustDiscount; 
                                                        } else {
                                                            var flDiscountRate = flProductMSDiscount;
                                                        }
                                                        if(flDiscountRate != null && flDiscountRate != '' && flDiscountRate != undefined) {
                                                            recTran.setLineItemValue('item', 'custcol_inline_discount', iTranLineCnt, flDiscountRate);
                                                        }
                                                    }
                                                    /* ===== Inline Discounting END ===== */

                                                    /* Retrieve Product List Rate */
                                                    var flCoTermProRate = parseFloatOrZero(arrProductResults[iProdIdx].getValue('custrecord_coterm_prorate_ratio'));
                                                    var flTotalListAmts = 0;
                                                    switch (PRICING_MODEL) {
                                                        case PRICING_MODEL_CURRENT_LIST:
                                                            var flMSListRate = 0;
                                                            if (searchInList(arrMaintCat,stItemCat)) {
                                                                flTotalListAmts = parseFloatOrZero(arrProductResults[iProdIdx].getValue('custrecord_product_future_rate'));

                                                                /* Compute for the new rates */
                                                                flMSListRate = Math.round(flTotalListAmts * flPercentage / 12 * flCoTermProRate) / 10000;   // Take Co-term Ratio into consideration
                                                                var flMSRate = Math.round(flMSListRate * iMSTermInMonths * 10000) / 10000;
                                                                
                                                                recTran.setLineItemValue('item', 'rate',              iTranLineCnt, flMSRate);
                                                                recTran.setLineItemValue('item', 'custcol_list_rate', iTranLineCnt, flMSListRate);
                                                                recTran.setLineItemValue('item', 'price',             iTranLineCnt, '-1');
                                                            }
                                                            if (searchInList(arrSupportCat,stItemCat)) {
                                                                // Do not add the rates if this is for support. The transaction needs to be saved first to get the real rates.
                                                            }
                                                            break;
                                                        case PRICING_MODEL_HISTORIC_LIST:
                                                        case PRICING_MODEL_HISTORIC_NET:
                                                            var flMSListRate = 0;
                                                            if (searchInList(arrMaintCat,stItemCat)) {
                                                                flTotalListAmts = parseFloatOrZero(arrProductResults[iProdIdx].getValue('custrecord_product_future_rate'));
                                                                flMSListRate = Math.round(flTotalListAmts * flPercentage / 12 * flCoTermProRate) / 10000; // Take Co-term Ratio into consideration
                                                            }
                                                            if (searchInList(arrSupportCat,stItemCat)) {
                                                                flTotalAmts = calculateForSupport(recTran, arrSupportBasisCat, iTranLineCnt, stProdLine);
                                                                flMSListRate = Math.round(flTotalAmts * flPercentage * 100) / 10000;    // No need to take Co-term Ratio into consideration
                                                            }
                                                            var flMSRate = Math.round(flMSListRate * iMSTermInMonths * 10000) / 10000;
                                                            recTran.setLineItemValue('item', 'rate',              iTranLineCnt, flMSRate);
                                                            recTran.setLineItemValue('item', 'custcol_list_rate', iTranLineCnt, flMSListRate);
                                                            recTran.setLineItemValue('item', 'price',             iTranLineCnt, '-1');
                                                            break;
                                                    }
                                                    /* ===== Perform extra mappings defined START ===== */
                                                    /* Retrieve latest M/S Contracts for renewal. */
                                                    var arrMSFilters = [
                                                        new nlobjSearchFilter('custrecord_install_base_end_date', null, 'isnotempty'),
                                                        new nlobjSearchFilter('custrecord_install_base_end_date', null, 'onorbefore', stCoTermDate),
                                                        new nlobjSearchFilter('custrecord_install_base_product', null, 'is', stProdId),
        			                                    new nlobjSearchFilter('custrecord_renewals_exclusion', null, 'is', 'F'),
        			                                    new nlobjSearchFilter('custrecord_renewal_processed_on', null, 'isempty'),
        			                                    new nlobjSearchFilter('custrecord_install_base_synch_status', null, 'anyof', [SYNCH_STATUS_ACTIVE,SYNCH_STATUS_EXPIRED]),
        			                                    new nlobjSearchFilter('custrecord_install_base_type', null, 'anyof',[CONTRACT_TYPE_MAINTENANCE,CONTRACT_TYPE_SUPPORT]),
                                                        new nlobjSearchFilter('isinactive', null, 'is', 'F')
                                                    ];
                                                    var arrMSColumns = [
                                                        new nlobjSearchColumn('custrecord_install_base_item')
                                                    ];
                                                    for(var idxMap = 0; idxMap < FLD_MAPPINGS.length; idxMap++) {
                                                        if(FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] != '' && FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] != null && FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] != undefined) {
                                                            arrContractsColumns.push(new nlobjSearchColumn(FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map']));
                                                        }
                                                    }
                                                    var arrMSResults = nlapiSearchRecord('customrecord_install_base', null, arrMSFilters, arrMSColumns);
                                                    logger.debug(MSG_TITLE,'Retrieve Data from M/S Install Base');
                                                    logger.indent();
                                                    if (arrMSResults != null && arrMSResults != undefined && arrMSResults != '') {
                                                        for(var idxMap = 0; idxMap < FLD_MAPPINGS.length; idxMap++) {
                                                            var stDataToMap = '';
                                                            
                                                            // Determine Data To Map 
                                                            if(FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] != '' && FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] != null && FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] != undefined) {
                                                                stDataToMap = arrMSResults[0].getValue(FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map']);
                                                            }
                
                                                            // Map Data
                                                            if(stDataToMap != '' && stDataToMap != null && stDataToMap != undefined) {
                                                                if(FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map'] != '' && FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map'] != null) {
                                                                    if(FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_type'] == TRAN_BODY_FIELD) {
                                                                        recTran.setFieldValue(FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map'], stDataToMap);
                                                                    }
                                                                    if(FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_type'] == TRAN_LINE_FIELD) {
                                                                        recTran.setLineItemValue('item', FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map'], iTranLineCnt, stDataToMap);
                                                                    }
                                                                    logger.debug(MSG_TITLE,'Mapping [' + FLD_MAPPINGS[idxMap]['custrecord_swe_install_base_field_id_map'] + ']= \'' + stDataToMap + '\' to Tran field ' + FLD_MAPPINGS[idxMap]['custrecord_swe_tran_field_id_map']);
                                                                }
                                                            }
                                                        }
                                                    }
                                                    /* ===== Perform extra mappings defined END ===== */
                                                }
                                            }
                                            break; //MS_MODEL_PERCENTAGE
                                    } // MS_MODEL Switch
                                }// Is Product Opt-Out
                                
//                                var param = new Object();
//                                param.custscript_r05_custid     = stCustId;
//                                param.custscript_r05_enduserid  = stEndUser;
//                                param.custscript_r05_productid  = stProdId;                       
//                                param.custscript_r05_contractid = null;                                         
//                                if (isScriptReQueued(arrProductResults.length, iProdIdx, logger, param) == true) {
//                                    logger.audit(MSG_TITLE, '=====RESCHEDULED=====');
//                                    return;
//                                }
                                
                            } // for (var iProdIdx = 0; iProdIdx < arrProductResults.length; iProdIdx++){
                            logger.unindent();
                            logger.audit(MSG_TITLE, 'DONE : Processing ' + arrProductResults.length + ' products. stCustId:[' + stCustId + '] : stEndUser:[' + stEndUser + '] : PARAMS :: custId:[' + custIdParam + '] : endUserId:[' + endUserIdParam + '] : productId:[' + productIdParam + '] :: usageLimitLeft:[' + nlapiGetContext().getRemainingUsage() + ']');
                        } // if(arrProductResults != null && arrProductResults != undefined && arrProductResults != ''){

                        var param = new Object();
                        param.custscript_r05_custid     = stCustId;
                        param.custscript_r05_enduserid  = stEndUser;
                        param.custscript_r05_productid  = null;                       
                        param.custscript_r05_contractid = null;                                         

                        if (iTranLineCnt > 0) {
                            var iLongestTermInMonths = computeTermInMonths(nlapiDateToString(stSOEarliestStartDate), stCoTermDate);
                            recTran.setFieldValue('custbody_tran_term_in_months',iLongestTermInMonths);         // Set the longest term in months
                            recTran.setFieldValue('startdate', nlapiDateToString(stSOEarliestStartDate));       // Set the earliest start date.

                            if (setTranLineResetData(recTran, param) == -1) return;                             // Set the Reset Data for the tran lines.
                            /* Set the earliest start date. */
                            recTran.setFieldValue('startdate', nlapiDateToString(stSOEarliestStartDate));

                            /* ===== Perform extra mappings defined START ===== */
                            // Store the body field in the transaction
                            for(var iBodyFlds = 0; iBodyFlds < BODY_FIELD_MAPS.length; iBodyFlds++) {
                                if(BODY_FIELD_MAPS[iBodyFlds].tran_field_id != null && BODY_FIELD_MAPS[iBodyFlds].tran_field_id != '') {
                                    logger.debug(MSG_TITLE,'Setting Body Field (' + BODY_FIELD_MAPS[iBodyFlds].tran_field_id + ') to \'' + BODY_FIELD_MAPS[iBodyFlds].value + '\'');
                                    recTran.setFieldValue(BODY_FIELD_MAPS[iBodyFlds].tran_field_id,BODY_FIELD_MAPS[iBodyFlds].value);
                                }
                            }
                            /* ===== Perform extra mappings defined END ===== */

                            /* Set the Reset Data for the tran lines. */
                            if (setTranLineResetData(recTran, param) == -1) {
                                return;
                            }
                            
                            /* If Pricing Model is not Current List Rate, then this will not be reloaded so we need to set Display Amounts now. */
                            if (PRICING_MODEL != PRICING_MODEL_CURRENT_LIST) {
                                if (setDisplayAmount(recTran, param) == -1) return; 
                            }


                            try {
	                            var stTranId = nlapiSubmitRecord(recTran, true,true);
	                            logger.debug(MSG_TITLE, 'Transaction created: ' + stTranId);                        // Save the transaction 
	                            arrSOCreated[iSOCreatedCnt++] = stTranId;
                            }
                            catch (ex) {
                            	logger.debug(MSG_TITLE, 'Error Occurred.');
                            	var stErrorOnSubmitRec = 'Error on Saving Renewal Transaction: stCustId:[' + stCustId + '] : stEndUser:[' + stEndUser + '] :: Error: ';
                                if (ex.getDetails != undefined) {
                                    nlapiLogExecution('ERROR', ex.getCode(), stErrorOnSubmitRec + ex.getDetails());
                                } else {
                                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', stErrorOnSubmitRec + ex.toString());
                                }
                                
                                //reset to blank the renewal processed on dates of affected IBs
                                for (var iContractRenProcIdx = 0; iContractRenProcIdx < arrContractsRenewalProcOn.length; iContractRenProcIdx++) {
                                	var stContractIdRenProc = arrContractsRenewalProcOn[iContractRenProcIdx];
                                	logger.debug(MSG_TITLE,'Resetting back to blank the Contract renewalProcessedOnDate for:: stContractId:[' + stContractIdRenProc +
                                			'] :: stCustId:[' + stCustId + '] :: stEndUser:[' + stEndUser + ']');
                                    nlapiSubmitField('customrecord_install_base', stContractIdRenProc, 'custrecord_renewal_processed_on', null);
                                }
                                
                            	continue; //continue on next end user
                            }

                            if (stTranId != null && stTranId != undefined && stTranId != '') {
                                /* If the Pricing Model was Current List Rate, then reload transaction and set up rates for Term & Support */
                                if (PRICING_MODEL == PRICING_MODEL_CURRENT_LIST) {
                                    try {
                                        recTran = nlapiLoadRecord(TRAN_TYPE,stTranId);
                                        var iLineCount = recTran.getLineItemCount('item');
                                        logger.debug(MSG_TITLE,'stCustId:[' + stCustId + '] :: stEndUser:[' + stEndUser + '] :: iLineCount:[' + iLineCount + ']');

                                        for (var i = 1; i <= iLineCount; i++) {
                                            var flCurRate         = recTran.getLineItemValue('item', 'rate',i);
                                            var stItemPricingType = recTran.getLineItemValue('item', 'custcol_item_pricing_type',i);
                                            var flCurTiM          = recTran.getLineItemValue('item', 'revrecterminmonths',i);
                                            var stProdLine        = recTran.getLineItemValue('item', 'custcol_product_line',i);
                                            var stItemCat         = recTran.getLineItemValue('item', 'custcol_item_category',i);
                                            var flPercentage      = recTran.getLineItemValue('item', 'custcol_mtce_support_percent', i);

                                            if (stItemPricingType == ITEM_PRICING_ANNUAL) {
                                                flCurRate = Math.round(flCurRate / 12 * 10000) / 10000;
                                            }
                                            
                                            if (flPercentage != null && flPercentage != undefined && flPercentage != '') {
                                                flPercentage = flPercentage.replace('%', '');
                                                flPercentage = parseFloat(flPercentage);
                                            } else {
                                                flPercentage = 0;
                                            }
                                            
                                            /* Handle M/S lines based on the model they are using */
                                            switch(MS_MODEL){
                                                case MS_MODEL_ITEMIZED:
                                                    /* Process both Maintenance & Support like any Term License. */
                                                    if (searchInList(arrSupportCat,stItemCat) || searchInList(arrMaintCat,stItemCat)) {
                                                        var flRate = Math.round(flCurRate * flCurTiM * 10000) / 10000;
                                                        flRate     = Math.round(flRate * (100 + flUpliftRate)) / 100;
                                                        recTran.setLineItemValue('item', 'custcol_list_rate', i, flCurRate);
                                                        recTran.setLineItemValue('item', 'rate', i, flRate);
                                                    }
                                                    break;
                                                case MS_MODEL_PERCENTAGE:
                                                case MS_MODEL_PERCENTAGE_NET:
                                                    /* Process only Support because Maintenance is already computed for.(M/S Percentage) */
                                                    if (searchInList(arrSupportCat,stItemCat)) {
                                                        var flTotalAmts = calculateForSupport(recTran, arrSupportBasisCat, i, stProdLine);
                                                        var flMSListRate = Math.round(flTotalAmts * flPercentage / flCurTiM * 100) / 10000;
                                                        var flMSRate = Math.round(flMSListRate * flCurTiM * 10000) / 10000;
                                                        recTran.setLineItemValue('item', 'rate', i, flMSRate);
                                                        recTran.setLineItemValue('item', 'custcol_list_rate', i, flMSListRate);
                                                    }
                                                    break;
                                            }
                                            
                                            /* Term Licenses should always be computed for. */
                                            if(!searchInList(arrPerpeptualCat,stItemCat) && !searchInList(arrSupportCat,stItemCat) && !searchInList(arrMaintCat,stItemCat)) {
                                                var flRate = Math.round(flCurRate * flCurTiM * 10000) / 10000;
                                                flRate = Math.round(flRate * (100 + flUpliftRate)) / 100;
                                                recTran.setLineItemValue('item', 'custcol_list_rate', i, flCurRate);
                                                recTran.setLineItemValue('item', 'rate', i, flRate);
                                            }
                                            recTran.setLineItemValue('item', 'price', i, '-1');
                                            /* ===== Inline Discounting START ===== */
                                            // Calculate Discount
                                            performDiscountCalcOnLine(recTran, i);
                                            /* ===== Inline Discounting END ===== */
											if (isScriptReQueuedWithLessParams(logger, param) == true) {
												logger.audit(MSG_TITLE, '=====RESCHEDULED=====');
												return;
											}
                                        } // for (var i = 1; i <= iLineCount; i++) {
                                        /* Set the Reset Data for the tran lines. */
                                        if (setTranLineResetData(recTran, param) == -1)  return;    

                                        /* Set the Display Amounts */
                                        if (setDisplayAmount(recTran, param) == -1)  return;    
                                        
                                        logger.debug('Reprocessing Tran Lines','Resubmitting Transaction:' + stTranId);
                                        nlapiSubmitRecord(recTran, true,true);
                                    } catch(ex) {
                                        /* Delete the transaction if the script failed to update it. */                                    
                                        nlapiDeleteRecord(TRAN_TYPE,stTranId);
                                        arrSOCreated.pop();
                                        --iSOCreatedCnt;
                                        throw ex;
                                    }
                                } // if (PRICING_MODEL == PRICING_MODEL_CURRENT_LIST) {
                                
                                /* Create the check log record. */
                                var stCheckLogId = insertToCheckLog(stTranId,CHECK_LOG_TYPE_INSTALL_BASE,CHECK_LOG_STATUS_PENDING);
                                if(stCheckLogId != null && stCheckLogId != undefined && stCheckLogId != ''){
                                    // logger.debug(MSG_TITLE, 'Contract Check Log Created. ID = ' + stCheckLogId);
                                }

                                /* Populate Segment fields */
                                setSegmentValues(TRAN_TYPE,stTranId);
                            } else {
                                var bCustomerHasError = true;
                                logger.debug(MSG_TITLE, 'Customer renewal transaction creation failed.');
                                nlapiLogExecution('ERROR','SO_CREATION_FAILED','Renewals Transaction for Customer ' + stCustId + ' failed.');
                            }

                            if(!bCustomerHasError){
                                /* Update the customer renewal process date. */
                                logger.debug(MSG_TITLE, 'Updating the Customer Renewal Processed on date.');
                                nlapiSubmitField(nlapiLookupField('entity',stCustId,'recordtype'),stCustId,'custentity_renewal_processed_on',nlapiDateToString(new Date),false);
                            }
                        }
                    } // for(var iEndUserIdx = 0; iEndUserIdx < arrEndUserResults.length; iEndUserIdx++) {
                    logger.unindent();
                    logger.audit(MSG_TITLE, 'DONE : Processing ' + arrEndUserResults.length + ' end users. stCustId:[' + stCustId + '] : PARAMS :: custId:[' + custIdParam + '] : endUserId:[' + endUserIdParam + '] :: usageLimitLeft:[' + nlapiGetContext().getRemainingUsage() + ']');
                    endUserIdParam = null; //reset back to null as the next iteration continues
                } // if(arrEndUserResults != null && arrEndUserResults != undefined && arrEndUserResults != '') {
            } catch(ex) {
                logger.debug(MSG_TITLE, 'Error Occurred.');
                if (ex.getDetails != undefined) {
                    nlapiLogExecution('ERROR', ex.getCode(), 'Renewing Customer ' + stCustId + ':' + ex.getDetails());
                } else {
                    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR','Renewing Customer ' + stCustId + ':' + ex.toString());
                }
                throw ex;
            }
        } // for (var idx = 0; idx < arrCustomerResults.length; idx++) {
        logger.unindent();
        logger.audit(MSG_TITLE, 'DONE : Processing ' + arrCustomerResults.length + ' customers. PARAMS: custId:[' + custIdParam + '] :: usageLimitLeft:[' + nlapiGetContext().getRemainingUsage() + ']');
    } // if (arrCustomerResults != null && arrCustomerResults != undefined && arrCustomerResults != '') {

    logger.audit(MSG_TITLE, 'List of SO\'s Created:');
    logger.indent();
    for(var i=0;i<arrSOCreated.length; i++){
        logger.audit(MSG_TITLE, 'SO #' + arrSOCreated[i]);
    }
    logger.unindent();
    
    logger.unindent();
    logger.audit(MSG_TITLE, '=======End=======');
} // main()

function isScriptReQueuedWithLessParams(logger, param) {
    var MSG_TITLE = 'Create Renewal Transaction - ReQueueing';    
    if (nlapiGetContext().getRemainingUsage() < REMAINING_USAGE_LIMIT) {
        logger.unindent();
        logger.audit(MSG_TITLE, 'PARAMS :: custid:[' + param.custscript_r05_custid + '] : enduserid:[' + param.custscript_r05_enduserid + '] : productid:[' + param.custscript_r05_productid + '] : contractid:[' + param.custscript_r05_contractid +']');
        logger.audit(MSG_TITLE, 'Reschedule. Remaining usage is : ' + nlapiGetContext().getRemainingUsage() + '.');
        nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
        logger.unindent();
        return true;
    }
    return false;
}

function isScriptReQueued(arrayLength, index, logger, param) {
    var MSG_TITLE = 'Create Renewal Transaction - ReQueueing';    
    if (nlapiGetContext().getRemainingUsage() < REMAINING_USAGE_LIMIT) {
        logger.unindent();
        logger.audit(MSG_TITLE, 'PARAMS :: custid:[' + param.custscript_r05_custid + '] : enduserid:[' + param.custscript_r05_enduserid + '] : productid:[' + param.custscript_r05_productid + '] : contractid:[' + param.custscript_r05_contractid +']');
        logger.audit(MSG_TITLE, 'Reschedule. Remaining usage is : ' + nlapiGetContext().getRemainingUsage() + '. Index is ' + index + '.');
        nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
        logger.unindent();
        return true;
    }
    // When the end of the result set is reached, schedule another run just to make sure that all records were processed 
    if ((arrayLength > MAX_NO_RESCHED_RESULT) && (arrayLength <= (index + 1))) {
        logger.unindent();
        logger.audit(MSG_TITLE, 'PARAMS :: custid:[' + param.custscript_r05_custid + '] : enduserid:[' + param.custscript_r05_enduserid + '] : productid:[' + param.custscript_r05_productid + '] : contractid:[' + param.custscript_r05_contractid +']');
        logger.audit(MSG_TITLE, 'Reschedule due to resultset limitation. Remaining usage is: ' + nlapiGetContext().getRemainingUsage() + '. Index is ' + index + '.');
        nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
        logger.unindent();
        return true;
    }
    return false;
}

function calculateForSupport(recTran, arrSupportBasisCat,iLineIndex, stProdLine){
    var logger = new Logger((nlapiGetContext(). getExecutionContext() != 'scheduled'));
    var MSG_TITLE = 'calculateForSupport';
    if(nlapiGetContext(). getExecutionContext() == 'scheduled'){
        logger.enableDebug();
    }
    //logger.enableDebug(); //comment this line to disable debug

    /* Get parameters */
    var MS_MODEL = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_ms_model');
    var ALLOW_DISCOUNT = nlapiGetContext().getSetting('SCRIPT', 'custscript_r05_allow_inline_discounting') == YES;

    /* Get the total amount for support basis */
    var iLineCount = recTran.getLineItemCount('item');
    var flTotalAmt = 0;
    for (var idx = 1; idx <= iLineCount; idx++)
    {
        /* Retrieve extra info for the item line */
        var stItemId = recTran.getLineItemValue('item','item',idx);
        var arrItemFields = ['custitem_item_category', 'custitem_product_line', 'custitem_opt_out_ms'];
        var arrItemFieldValues = nlapiLookupField('item',stItemId,arrItemFields);

        var stItemCat = arrItemFieldValues['custitem_item_category'];
        var stCurProdLine = arrItemFieldValues['custitem_product_line'];
        var stOptOut = arrItemFieldValues['custitem_opt_out_ms'];
        logger.debug(MSG_TITLE, 'Item Id=' + stItemId
                + '\nItem Cat=' + stItemCat
                + '\nCurrent Product Line=' + stCurProdLine
                + '\nOpt-Out=' + stOptOut
                );
                
        /* Accumulate the total amount for the licenses */
        if (searchInList(arrSupportBasisCat, stItemCat) && stCurProdLine == stProdLine && stOptOut != 'T')
        {
            logger.debug(MSG_TITLE, 'Match Found.');
            var flCurAmt = recTran.getLineItemValue('item', 'custcol_list_rate', idx);
            var flQty = recTran.getLineItemValue('item', 'quantity', idx);
            logger.debug(MSG_TITLE, 'flCurAmt=' + flCurAmt
                    + '\nflQty=' + flQty
                    );
                    
            /* Apply discount if it needs to be tracked. */
            if(ALLOW_DISCOUNT && MS_MODEL == MS_MODEL_PERCENTAGE_NET) {
                /* Get the discount rate */    
                var flDiscountRate = recTran.getLineItemValue('item','custcol_inline_discount',idx);
                if(flDiscountRate != null && flDiscountRate != '' && flDiscountRate != undefined) {
                    flDiscountRate = flDiscountRate.replace('%','');
                    flDiscountRate = parseFloat(flDiscountRate);
                    flDiscountRate = flDiscountRate / 100;
                } else {
                    flDiscountRate = 0;
                }
                if (flDiscountRate != 0) {
                    flCurAmt = flCurAmt * (1 - flDiscountRate);
                }
            }
                    
            if (flCurAmt != null && flCurAmt != undefined && flCurAmt != '')
            {
                flCurAmt = parseFloat(flCurAmt);
                flQty = parseFloat(flQty);
                flTotalAmt += (flCurAmt * flQty);
                logger.debug(MSG_TITLE, 'Current Amount=' + flCurAmt
                        + '\nRunning Total=' + flTotalAmt
                        );
            }
        }
    }

    return flTotalAmt;
}


function setSegmentValues(stRecType,stTranId){
    var logger = new Logger(false);
    var MSG_TITLE = 'Populate Segment Fields';
    // logger.enableDebug(); // comment this line to turn debugging off.
    logger.debug(MSG_TITLE,'=====Start setSegmentValues=====');

    var DEPT_SRC = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_department');
    var LOC_SRC = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_location');
    var CLASS_SRC = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_class');

    logger.debug(MSG_TITLE,'Script Parameters:'
            + '\n' + 'Dept. Sourced by:' + DEPT_SRC
            + '\n' + 'Loc. Sourced by:' + LOC_SRC
            + '\n' + 'Class Sourced by:' + CLASS_SRC
            );


    var recTran = nlapiLoadRecord(stRecType,stTranId);

    var stDepartment = '';
    var stLocation = '';
    var stClass = '';

    /* Get Department */
    switch(DEPT_SRC){
        case SEGMENT_SOURCED_BY_SALESREP:
            stDepartment = recTran.getFieldValue('custbody_sales_rep_department');
            break;

        case SEGMENT_SOURCED_BY_ORDERTYPE:
            var stOrderType = recTran.getFieldValue('custbody_order_type');
            var stOrderTypeText = nlapiLookupField('customlist_order_type',stOrderType,'name');
            logger.debug(MSG_TITLE,'Order Type =' + stOrderType + '(' + stOrderTypeText + ')');
            var arrDeptFilter = [
                new nlobjSearchFilter('name','','is',stOrderTypeText),
                new nlobjSearchFilter('isinactive','','is','F')
            ];
            var arrDeptColumn = [new nlobjSearchColumn('internalid')];
            var arrDeptResults = nlapiSearchRecord('department','',arrDeptFilter,arrDeptColumn);
            if(arrDeptResults != null && arrDeptResults != undefined && arrDeptResults != ''){
                stDepartment = arrDeptResults[0].getValue('internalid');
            }
            break;

        case SEGMENT_SOURCED_BY_PRODLINE:
            for(var i=1; i<=recTran.getLineItemCount('item'); i++){
                var stProdLine = recTran.getLineItemValue('item','custcol_product_line',i);
                if(stProdLine != null && stProdLine != undefined && stProdLine != ''){
                    logger.debug(MSG_TITLE,'Product Line found.');
                    var stProdLineText = nlapiLookupField('customlist_product_line',stProdLine,'name');
                    logger.debug(MSG_TITLE,'Product Line =' + stProdLine + '(' + stProdLineText + ')');
                    var arrDeptFilter = [
                        new nlobjSearchFilter('name','','is',stProdLineText),
                        new nlobjSearchFilter('isinactive','','is','F')
                    ];
                    var arrDeptColumn = [new nlobjSearchColumn('internalid')];
                    var arrDeptResults = nlapiSearchRecord('department','',arrDeptFilter,arrDeptColumn);
                    if(arrDeptResults != null && arrDeptResults != undefined && arrDeptResults != ''){
                        stDepartment = arrDeptResults[0].getValue('internalid');
                    }
                    break;
                }
            }
            break;
    }
    logger.debug(MSG_TITLE,'Setting Department to ' + stDepartment);

    recTran.setFieldValue('department',stDepartment);

    /* Get Location */
    switch(LOC_SRC){
        case SEGMENT_SOURCED_BY_SALESREP:
            stLocation = recTran.getFieldValue('custbody_sales_rep_location');
            break;

        case SEGMENT_SOURCED_BY_ORDERTYPE:
            var stOrderType = recTran.getFieldValue('custbody_order_type');
            var stOrderTypeText = nlapiLookupField('customlist_order_type',stOrderType,'name');
            logger.debug(MSG_TITLE,'Order Type =' + stOrderType + '(' + stOrderTypeText + ')');
            var arrLocFilter = [
                new nlobjSearchFilter('name','','is',stOrderTypeText),
                new nlobjSearchFilter('isinactive','','is','F')
            ];
            var arrLocColumn = [new nlobjSearchColumn('internalid')];
            var arrLocResults = nlapiSearchRecord('location','',arrLocFilter,arrLocColumn);
            if(arrLocResults != null && arrLocResults != undefined && arrLocResults != ''){
                stLocation = arrLocResults[0].getValue('internalid');
            }

            break;

        case SEGMENT_SOURCED_BY_PRODLINE:
            for(var i=1; i<=recTran.getLineItemCount('item'); i++){
                var stProdLine = recTran.getLineItemValue('item','custcol_product_line',i);
                if(stProdLine != null && stProdLine != undefined && stProdLine != ''){
                    logger.debug(MSG_TITLE,'Product Line found.');
                    var stProdLineText = nlapiLookupField('customlist_product_line',stProdLine,'name');
                    logger.debug(MSG_TITLE,'Product Line =' + stProdLine + '(' + stProdLineText + ')');
                    var arrLocFilter = [
                        new nlobjSearchFilter('name','','is',stProdLineText),
                        new nlobjSearchFilter('isinactive','','is','F')
                    ];
                    var arrLocColumn = [new nlobjSearchColumn('internalid')];
                    var arrLocResults = nlapiSearchRecord('location','',arrLocFilter,arrLocColumn);
                    if(arrLocResults != null && arrLocResults != undefined && arrLocResults != ''){
                        stLocation = arrLocResults[0].getValue('internalid');
                    }
                    break;
                }
            }
            break;
    }
    logger.debug(MSG_TITLE,'Setting Location to ' + stLocation);

    recTran.setFieldValue('location',stLocation);

    /* Get Class */
    switch(CLASS_SRC){
        case SEGMENT_SOURCED_BY_SALESREP:
            stClass = recTran.getFieldValue('custbody_sales_rep_class');
            break;

        case SEGMENT_SOURCED_BY_ORDERTYPE:
            var stOrderType = recTran.getFieldValue('custbody_order_type');
            var stOrderTypeText = nlapiLookupField('customlist_order_type',stOrderType,'name');
            logger.debug(MSG_TITLE,'Order Type =' + stOrderType + '(' + stOrderTypeText + ')');
            var arrClassFilter = [
                new nlobjSearchFilter('name','','is',stOrderTypeText),
                new nlobjSearchFilter('isinactive','','is','F')
            ];
            var arrClassColumn = [new nlobjSearchColumn('internalid')];
            var arrClassResults = nlapiSearchRecord('classification','',arrClassFilter,arrClassColumn);
            if(arrClassResults != null && arrClassResults != undefined && arrClassResults != ''){
                stClass = arrClassResults[0].getValue('internalid');
            }

            break;

        case SEGMENT_SOURCED_BY_PRODLINE:
            for(var i=1; i<=recTran.getLineItemCount('item'); i++){
                var stProdLine = recTran.getLineItemValue('item','custcol_product_line',i);
                if(stProdLine != null && stProdLine != undefined && stProdLine != ''){
                    logger.debug(MSG_TITLE,'Product Line found.');
                    var stProdLineText = nlapiLookupField('customlist_product_line',stProdLine,'name');
                    logger.debug(MSG_TITLE,'Product Line =' + stProdLine + '(' + stProdLineText + ')');
                    var arrClassFilter = [
                        new nlobjSearchFilter('name','','is',stProdLineText),
                        new nlobjSearchFilter('isinactive','','is','F')
                    ];
                    var arrClassColumn = [new nlobjSearchColumn('internalid')];
                    var arrClassResults = nlapiSearchRecord('classification','',arrClassFilter,arrClassColumn);
                    if(arrClassResults != null && arrClassResults != undefined && arrClassResults != ''){
                        stClass = arrClassResults[0].getValue('internalid');
                    }
                    break;
                }
            }
            break;
    }
    logger.debug(MSG_TITLE,'Setting Class to ' + stClass);
    recTran.setFieldValue('class',stClass);
    nlapiSubmitRecord(recTran,true,true);
    logger.debug(MSG_TITLE,'======End setSegmentValues======');
}



function parseFloatOrZero(f)
{
   var r=parseFloat(f);
    return isNaN(r) ? 0 : r;
}



function setTranLineResetData(recTran, param) {
    var logger = new Logger(false);
    var MSG_TITLE = 'setTranLineResetData';
    // logger.enableDebug(); // comment this line to turn debugging off.
    
    var arrFields = recTran.getAllLineItemFields('item');
//    var arrFields = [
//            'item', 
//            'quantity',
//            'price',
//            'custcol_list_rate',
//            'rate',
//            'revrecterminmonths',
//            'revrecstartdate',
//            'revrecenddate',
//            'revrecschedule',
//            'deferrevrec',
//            'custcol_opt_out_ms',
//            'custcol_renewals_exclusion',
//            'closed'
//        ];
        
    var iLineCount = recTran.getLineItemCount('item');
    for (var iLineIdx = 1; iLineIdx <= iLineCount; iLineIdx++) {
        var stFieldData = '';
        for (i in arrFields) {
            if(arrFields[i] == 'custcol_renewal_reset_data') {
                continue;
            }
            var stFieldValue = recTran.getLineItemValue('item', arrFields[i], iLineIdx);
            if (stFieldValue != null && stFieldValue != '' && stFieldValue != undefined) {
                stFieldData = stFieldData + (stFieldData.length > 0 ? ';' : '') + arrFields[i] + '=' + stFieldValue;
            }
//            if (isScriptReQueuedWithLessParams(logger, param) == true) {
//                logger.audit(MSG_TITLE, '=====RESCHEDULED=====');
//                return -1;
//            }
        }
        logger.debug(MSG_TITLE,'Setting Reset Data for line #' + iLineIdx + ':\n' + stFieldData);
        recTran.setLineItemValue('item','custcol_renewal_reset_data',iLineIdx,stFieldData);
    }
}

function setDisplayAmount(recTran, param) {
    var logger = new Logger(false);
    var MSG_TITLE = 'setDisplayAmount';
    // logger.enableDebug(); // comment this line to turn debugging off.
    
    logger.debug(MSG_TITLE,'======Start setDisplayAmount======');

    var iItemLineCnt = recTran.getLineItemCount('item');
    for(var iLineIdx = 1; iLineIdx <= iItemLineCnt; iLineIdx++) {
        var iQty = recTran.getLineItemValue('item','quantity',iLineIdx);
        if(iQty == null || iQty == '' || iQty == undefined) {
            logger.debug('Skipping line ' + iLineIdx + ' because quantity is missing');
            continue;
        }
        var flExtRate = recTran.getLineItemValue('item','rate',iLineIdx);
        if(flExtRate == null || flExtRate == '' || flExtRate == undefined) {
            logger.debug('Skipping line ' + iLineIdx + ' because rate is missing');
            continue;
        }
        var stItem = recTran.getLineItemValue('item','item',iLineIdx);
        logger.debug(MSG_TITLE,'Line ' + iLineIdx + ': Item ID=' + stItem + ' Rate=' + flExtRate+ ' Quantity=' + iQty);
        if(stItem != '' && stItem != null && stItem != undefined) {
            var bDisplayAmt = ('T' == nlapiLookupField('item',stItem,'custitem_display_printed_amount'));
            if(bDisplayAmt) {
                logger.debug(MSG_TITLE,'Setting display amount.');
                recTran.setLineItemValue('item','custcol_display_amount',iLineIdx,iQty * flExtRate);
            }
        }
//        if (isScriptReQueuedWithLessParams(logger, param) == true) {
//            logger.audit(MSG_TITLE, '=====RESCHEDULED=====');
//            return -1;
//        }
        
    }
    logger.debug(MSG_TITLE,'======End setDisplayAmount======');
}



/**
 * 
 * This function perform calculation for the discount an a specific tran line
 * 
 * @param {Object} recTran
 * @param {Object} iLineNbr
 */
function performDiscountCalcOnLine(recTran, iLineNbr)
{
    var logger = new Logger(false);
    var MSG_TITLE = 'Calculate Discount for Tran Line';
    var PRICING_MODEL = nlapiGetContext().getSetting('SCRIPT', 'custscript_renewals_pricing_model');
    var ALLOW_DISCOUNT = nlapiGetContext().getSetting('SCRIPT', 'custscript_r05_allow_inline_discounting') == YES;
    logger.enableDebug(); // comment this line to turn debugging off.

    if(!ALLOW_DISCOUNT)
    {
        logger.debug(MSG_TITLE,'Discount calculation skipped');
        return;
    }    

    logger.debug(MSG_TITLE,'=====Start performDiscountCalcOnLine=====');

    // Calculate Discount if needed and if pricing model is Historic
    if(PRICING_MODEL_HISTORIC_LIST == PRICING_MODEL || PRICING_MODEL_HISTORIC_NET == PRICING_MODEL)
    {
        /* Get the discount rate */    
        var flDiscountRate = recTran.getLineItemValue('item','custcol_inline_discount',iLineNbr);
        if(flDiscountRate != null && flDiscountRate != '' && flDiscountRate != undefined)
        {
            flDiscountRate = flDiscountRate.replace('%','');
            flDiscountRate = parseFloat(flDiscountRate);
            flDiscountRate = flDiscountRate / 100;
        }
        else
        {
            flDiscountRate = 0;
        }
       
        if(flDiscountRate != 0)
        {
            /* Apply the discount rate to the extended rate */
            var flExtendedRate = recTran.getLineItemValue('item','rate',iLineNbr);
            if(flExtendedRate != 0 && flExtendedRate != null && flExtendedRate != '' && flExtendedRate != undefined)
            {
                flExtendedRate = parseFloat(flExtendedRate);
                logger.debug(MSG_TITLE, 'flExtendedRate = ' + flExtendedRate);
                var flNewRate = Math.round(flExtendedRate * (1 - flDiscountRate) * 10000) / 10000;
                logger.debug(MSG_TITLE, 'flNewRate = ' + flNewRate);
                recTran.setLineItemValue('item', 'rate', iLineNbr, flNewRate);
            }
        }
    }

    logger.debug(MSG_TITLE,'=====End performDiscountCalcOnLine=====');

}
