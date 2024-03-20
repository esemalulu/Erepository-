/**
 * Copyright (c) 1998-2017 NetSuite, Inc.
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
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Jun 2017     lochengco        Initial Commit
 * 1.01       20 Jun 2017     lochengco        Added logs and usage checking in getting high and low IDs
 * 1.02       20 Jun 2017     lochengco        Force the copied deployment's queue not '1'
 * 1.03       20 Jun 2017     lochengco        Relocate script some parameters to controller script
 * 1.04       21 Jun 2017     lochengco        Changed queue assignment logic
 *
 */

var OBJ_CONTEXT = nlapiGetContext();
var OBJ_SCRIPT_PARAMETERS = {};
var INT_USAGE_LIMIT_THRESHOLD = 500;
var INT_START_TIME = new Date().getTime();
var INT_TIME_LIMIT_THRESHOLD = 3600000; // 3600000ms = 1hr
var INT_PERCENT_ALLOWED_TIME = 90;

/**
 * @param {String} stType Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled_masterUpdateRebCont(stType)
{
    try
    {
        var stLoggerTitle = 'scheduled_controllerUpdateRebCont';
        
        nlapiLogExecution('AUDIT', stLoggerTitle, '>>Entry<< | Server Date = ' + checkCurrentDateTime());
        
        // Get Script Parameters
        OBJ_SCRIPT_PARAMETERS['search_rebate_agree_det'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_ifd_search_rebate_agree_det');
        OBJ_SCRIPT_PARAMETERS['process_deployment_id'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_ifd_process_deployment_id');
        OBJ_SCRIPT_PARAMETERS['max_threshold'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_ifd_max_threshold');
            
        nlapiLogExecution('DEBUG', stLoggerTitle, '- Script Parameters -'
                + ' | Search: Rebate Agreements Details = ' + OBJ_SCRIPT_PARAMETERS['search_rebate_agree_det']
                + ' | Processor Deployment ID = ' + OBJ_SCRIPT_PARAMETERS['process_deployment_id']
                + ' | Max Threshold = ' + OBJ_SCRIPT_PARAMETERS['max_threshold']
                );
        
        // Collect Script Parameters Values
        var arrRequiredScriptParams = [OBJ_SCRIPT_PARAMETERS['search_rebate_agree_det'],
                                       OBJ_SCRIPT_PARAMETERS['process_deployment_id'],
                                       OBJ_SCRIPT_PARAMETERS['max_threshold']
                                        ];
        
        // Check if there's empty mandatory script parameter
        if (NSUtil.inArray(null, arrRequiredScriptParams) || NSUtil.inArray('', arrRequiredScriptParams))
        {
            // Throw an error if there were missing script parameters (exit)
            throw nlapiCreateError('99999', 'Please enter value for required script parameters.');
        }
        
        var intMaxThreshold = NSUtil.forceInt(OBJ_SCRIPT_PARAMETERS['max_threshold']);
        var arrDeploymnetIDs = convertStringToArray(OBJ_SCRIPT_PARAMETERS['process_deployment_id'], ',');
        var intNumOfDeployIDs = arrDeploymnetIDs.length;
        var intNumOfRebateAgreeDet = countNumOfRebateAgreementDet(); // Count Total Number of Rebate Agreement Details to process 
        var intNumOfDataPerQueue = 0;
        
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Number of rebate agreement found = ' + intNumOfRebateAgreeDet);
        
        if (intNumOfRebateAgreeDet == 0)
        {
            nlapiLogExecution('DEBUG', stLoggerTitle, 'No Rebate Agreement Detail found.');
            nlapiLogExecution('DEBUG', stLoggerTitle, '>>Exit<< | Server Date = ' + checkCurrentDateTime());
            return;
        }
        
        // Use only one queue when number of rebate agreement details to process is less than the max threshold
        if (intNumOfRebateAgreeDet <= intMaxThreshold)
        {
            intNumOfDataPerQueue = intNumOfRebateAgreeDet;
        }
        else
        {
            intNumOfDataPerQueue = Math.ceil(intNumOfRebateAgreeDet/intNumOfDeployIDs);
        }
        
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Number of data per queue = ' + intNumOfDataPerQueue);
        
        // Collect Rebate Internal IDs that will be used in the filters
        var arrLowAndHighIntIDs = getLowAndHighInternalIDs(null, OBJ_SCRIPT_PARAMETERS['search_rebate_agree_det'], null, null, intNumOfDataPerQueue, intNumOfRebateAgreeDet);
        
        if (arrLowAndHighIntIDs.length != 0)
        {
            for (var intCtr = 0; intCtr < arrLowAndHighIntIDs.length; intCtr++)
            {
                if (NSUtil.isEmpty(arrLowAndHighIntIDs[intCtr].low) || NSUtil.isEmpty(arrLowAndHighIntIDs[intCtr].high))
                {
                    nlapiLogExecution('DEBUG', stLoggerTitle, '- Low or High Internal ID is empty -'
                            + ' | Low Internal ID = ' + arrLowAndHighIntIDs[intCtr].low
                            + ' | High Internal ID = ' + arrLowAndHighIntIDs[intCtr].high
                            );
                    continue;
                }
                
                var objPrepareData = {};
                    objPrepareData.custscript_ifd_values_from_master = null;
                var objParams = {};
                
                NSUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME, INT_TIME_LIMIT_THRESHOLD, INT_PERCENT_ALLOWED_TIME);
                
                // Note: arrDeploymnetIDs AND arrLowAndHighIntIDs should have the same length (not unless intNumOfRebateAgreeDet it's less than the intMaxThreshold
                var stDeployId = arrDeploymnetIDs[intCtr];
                objParams.record_type = '';
                objParams.search_id = OBJ_SCRIPT_PARAMETERS['search_rebate_agree_det'];
                objParams.low_int_id = arrLowAndHighIntIDs[intCtr].low;
                objParams.high_int_id = arrLowAndHighIntIDs[intCtr].high;
                
                objPrepareData.custscript_ifd_values_from_master = JSON.stringify(objParams);
                
                nlapiLogExecution('DEBUG', stLoggerTitle, '- Calling scheduled script -'
                        + ' | Deploy ID = ' + stDeployId
                        + ' | Record type = ' + objParams.record_type
                        + ' | Search ID = ' + objParams.search_id
                        + ' | Low Internal ID = ' + objParams.low_int_id
                        + ' | High Internal ID = ' + objParams.high_int_id
                        );
                
                NSUtil.scheduleScript('customscript_sc_rebcontupdate_controller', stDeployId, objPrepareData);
            }
        }
        
        nlapiLogExecution('AUDIT', stLoggerTitle, '>>Exit<< | Server Date = ' + checkCurrentDateTime());
    }
    catch (error)
    {
        if (error.getDetails != undefined)
        {
            nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else
        {
            nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }
}

/**
 * @param {String} stType Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled_processRebateContractUpdate(stType)
{
    try
    {
        var stLoggerTitle = 'scheduled_processRebateContractUpdate';
        
        nlapiLogExecution('AUDIT', stLoggerTitle, '>>Entry<< | Server Date = ' + checkCurrentDateTime());
        
        var stScriptParamValuesFromMaster = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_ifd_values_from_master');
        
        OBJ_SCRIPT_PARAMETERS['search_cust_item_pricing_new'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_ifd_search_custitempricingnew');
        OBJ_SCRIPT_PARAMETERS['contract_status_processed'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_ifd_contract_status_processed');
        OBJ_SCRIPT_PARAMETERS['contract_status_failed'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_ifd_contract_status_failed');
        OBJ_SCRIPT_PARAMETERS['rcm_perc_flc'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_ifd_rcm_perc_flc');
        OBJ_SCRIPT_PARAMETERS['rcm_dollar_flc'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_ifd_rcm_dollar_flc');
        OBJ_SCRIPT_PARAMETERS['rcm_perc_fob'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_ifd_rcm_perc_fob');
        OBJ_SCRIPT_PARAMETERS['rcm_dollar_fob'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_ifd_rcm_dollar_fob');
        OBJ_SCRIPT_PARAMETERS['rcm_amt_guarantee_fob'] = OBJ_CONTEXT.getSetting('SCRIPT', 'custscript_ifd_rcm_amt_guarantee_fob');

        nlapiLogExecution('DEBUG', stLoggerTitle, '- Script Parameters -'
                + ' | Search: Customer Item Pricing (new) = ' + OBJ_SCRIPT_PARAMETERS['search_cust_item_pricing_new']
                + ' | Contract Status: Processed = ' + OBJ_SCRIPT_PARAMETERS['contract_status_processed']
                + ' | Contract Status: Failed = ' + OBJ_SCRIPT_PARAMETERS['contract_status_failed']
                + ' | Rebate Amount Calc: Percent FLC = ' + OBJ_SCRIPT_PARAMETERS['rcm_perc_flc']
                + ' | Rebate Amount Calc: Dollar FLC = ' + OBJ_SCRIPT_PARAMETERS['rcm_dollar_flc']
                + ' | Rebate Amount Calc: Percent FOB = ' + OBJ_SCRIPT_PARAMETERS['rcm_perc_fob']
                + ' | Rebate Amount Calc: Dollar FOB = ' + OBJ_SCRIPT_PARAMETERS['rcm_dollar_fob']
                + ' | Rebate Amount Calc: Amount Guaranteed Cost FOB = ' + OBJ_SCRIPT_PARAMETERS['rcm_amt_guarantee_fob']
                );
        
        // Collect Script Parameters Values
        var arrRequiredScriptParams = [
                                       OBJ_SCRIPT_PARAMETERS['search_cust_item_pricing_new'],
                                       OBJ_SCRIPT_PARAMETERS['contract_status_processed'],
                                       OBJ_SCRIPT_PARAMETERS['contract_status_failed'],
                                       OBJ_SCRIPT_PARAMETERS['rcm_perc_flc'],
                                       OBJ_SCRIPT_PARAMETERS['rcm_dollar_flc'],
                                       OBJ_SCRIPT_PARAMETERS['rcm_perc_fob'],
                                       OBJ_SCRIPT_PARAMETERS['rcm_dollar_fob'],
                                       OBJ_SCRIPT_PARAMETERS['rcm_amt_guarantee_fob']
                                        ];
        
        // Check if there's empty mandatory script parameter
        if (NSUtil.inArray(null, arrRequiredScriptParams) || NSUtil.inArray('', arrRequiredScriptParams))
        {
            // Throw an error if there were missing script parameters (exit)
            throw nlapiCreateError('99999', 'Please enter value for required script parameters.');
        }

        if (NSUtil.isEmpty(stScriptParamValuesFromMaster))
        {
            nlapiLogExecution('ERROR', stLoggerTitle, 'No values passed from the master script. >>Exit<<');
            return;
        }
        
        nlapiLogExecution('DEBUG', stLoggerTitle, 'stScriptParamValuesFromMaster = ' + stScriptParamValuesFromMaster);
        
        var objScriptParamValuesFromMaster = JSON.parse(stScriptParamValuesFromMaster);
        
        var stRecordType = objScriptParamValuesFromMaster.record_type;
        var stSearchId = objScriptParamValuesFromMaster.search_id;
        var intLowInternalId = objScriptParamValuesFromMaster.low_int_id;
        var intHighInternalId = objScriptParamValuesFromMaster.high_int_id;
        
        nlapiLogExecution('DEBUG', stLoggerTitle, '- Values from Master Script -'
                + ' | Record Type = ' + stRecordType
                + ' | Search ID = ' + stSearchId
                + ' | Low Internal ID = ' + intLowInternalId
                + ' | High Internal ID = ' + intHighInternalId
                );
        
        var arrSearchFilter = [];
            arrSearchFilter.push(new nlobjSearchFilter('internalidnumber', null, 'notlessthan', intLowInternalId));
            arrSearchFilter.push(new nlobjSearchFilter('internalidnumber', null, 'notgreaterthan', intHighInternalId));
        var arrSearchColumn = [];
        
        if (stRecordType == null && stSearchId == null)
        {
            throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'search: Missing a required argument. Either stRecordType or stSearchId should be provided.');
        }

        var objSavedSearch;

        if (stSearchId != null)
        {
            objSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

            // add search filter if one is passed
            if (arrSearchFilter != null)
            {
                objSavedSearch.addFilters(arrSearchFilter);
            }

            // add search column if one is passed
            if (arrSearchColumn != null)
            {
                objSavedSearch.addColumns(arrSearchColumn);
            }
        }
        else
        {
            objSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
        }

        var objResultset = objSavedSearch.runSearch();
        var intSearchIndex = 0;
        var arrRebateAgreeDet = null;
        
        do // Looping Rebate Agreement Details
        {
            arrRebateAgreeDet = null; // Memory dump before rescheduling the script
            
            NSUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME, INT_TIME_LIMIT_THRESHOLD, INT_PERCENT_ALLOWED_TIME);
            
            // NOTE: objResultset.getResults decreases every after the update
            arrRebateAgreeDet = objResultset.getResults(intSearchIndex, intSearchIndex + 1000);
            
            if (arrRebateAgreeDet == null)
            {
                break;
            }
            
            /**************************************
             *  Processing actually starts below  *
             **************************************/ 
            
            // Loop through all Agreement Details
            for (var intRebateAgreeDetCtr = 0; intRebateAgreeDetCtr < arrRebateAgreeDet.length; intRebateAgreeDetCtr++)
            {
                try // TRY-CATCH (START)
                {
                    // Get Customer-Item Combination
                    var objResultRebateAgreeDet = arrRebateAgreeDet[intRebateAgreeDetCtr];
                    var objRebAgreeDetData = {};
                    var objCustContItemPriceResult = {};
                    
                    NSUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME, INT_TIME_LIMIT_THRESHOLD, INT_PERCENT_ALLOWED_TIME);
                    
                        objRebAgreeDetData.reb_agree_det_id = objResultRebateAgreeDet.getId();
                        objRebAgreeDetData.customer = objResultRebateAgreeDet.getValue('custrecord_nsts_rm_eligible_customer');
                        objRebAgreeDetData.item = objResultRebateAgreeDet.getValue('custrecord_nsts_rm_eligible_item');
                        objRebAgreeDetData.item_lastpurchprice = objResultRebateAgreeDet.getValue('lastpurchaseprice', 'custrecord_nsts_rm_eligible_item');
                        objRebAgreeDetData.calc_method = objResultRebateAgreeDet.getValue('custrecord_nsts_rm_calculation_method');
                        objRebAgreeDetData.amount = objResultRebateAgreeDet.getValue('custrecord_nsts_rm_rebate_amount');
                        objRebAgreeDetData.percent = objResultRebateAgreeDet.getValue('custrecord_nsts_rm_rebate_percent');
                        objRebAgreeDetData.guaranteed_amount = objResultRebateAgreeDet.getValue('custrecord_ifd_guaranteedamt');
                    
                    nlapiLogExecution('DEBUG', stLoggerTitle, '- Rebate Agreement Detail -'
                            + ' | Rebate Agreement Det. ID (ID) = ' + objRebAgreeDetData.reb_agree_det_id
                            + ' | Customer = ' + objRebAgreeDetData.customer
                            + ' | Item = ' + objRebAgreeDetData.item
                            + ' | Item: Last Purchase Price = ' + objRebAgreeDetData.item_lastpurchprice
                            + ' | Calculation Method = ' + objRebAgreeDetData.calc_method
                            + ' | Amount = ' + objRebAgreeDetData.amount
                            + ' | Percent = ' + objRebAgreeDetData.percent
                            + ' | Guaranteed Amount = ' + objRebAgreeDetData.guaranteed_amount
                            );
                    
                    if (NSUtil.isEmpty(objRebAgreeDetData.customer) 
                    || NSUtil.isEmpty(objRebAgreeDetData.item)
                    || NSUtil.isEmpty(objRebAgreeDetData.calc_method))
                    {
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Customer, Item, or Rebate Calculation is empty. Rebate Agreement Detail = ' + objRebAgreeDetData.reb_agree_id);
                        nlapiSubmitField('customrecord_nsts_rm_agreement_detail', objRebAgreeDetData.reb_agree_det_id, 'custrecord_ifd_contractstatus', OBJ_SCRIPT_PARAMETERS['contract_status_failed']);
              
                        //set the Note field = Rebate Agreement Detail failed processing.
                		
                		//create a note
                        /*
                		var recNote = nlapiCreateRecord('note');
                		recNote.setFieldValue('record', objRebAgreeDetData.reb_agree_det_id);
                		recNote.setFieldValue('recordtype', 'customrecord_nsts_rm_agreement_detail');
                		recNote.setFieldValue('title', 'Rebate Agreement Detail failed processing');
                		recNote.setFieldValue('note', 'Rebate Agreement Detail failed processing. ID = ' + objRebAgreeDetData.reb_agree_det_id);
                		nlapiSubmitRecord(recNote);
                		*/
                        
                        nlapiLogExecution('AUDIT', stLoggerTitle, 'Rebate Agreement Detail failed processing. ID = ' + objRebAgreeDetData.reb_agree_det_id);
                        continue; // Proceed to next Rebate Agreement Detail
                    }
                    
                    // Search the 'Customer Item Pricing (New)' record using the Customer-Item Combination - NOTE: It is expected to have unique Customer-Item combination in Rebate Agreement
                    objCustContItemPriceResult = getCustItemPricingByCustAndItem(objRebAgreeDetData);
                    
                    // Skip process if 'Customer Item Pricing (New)' is empty
                    if (NSUtil.isEmpty(objCustContItemPriceResult))
                    {
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'No Customer Item Price Data Found.');
                        
                        //set the status= Processed // Note: No customer item pricing found
                    	nlapiSubmitField('customrecord_nsts_rm_agreement_detail', objRebAgreeDetData.reb_agree_det_id, 'custrecord_ifd_contractstatus', OBJ_SCRIPT_PARAMETERS['contract_status_processed']);
                        
                        continue; // Proceed to next Rebate Agreement Detail
                    }
                    
                    var objContCustItemPriceData = {};
                    objContCustItemPriceData.id = objCustContItemPriceResult.getId();
                    objContCustItemPriceData.reb_agree_det_id = objCustContItemPriceResult.getValue('custrecord_cip_rebagreement_detail');
                    objContCustItemPriceData.customer = objCustContItemPriceResult.getValue('custrecord_cip_customer');
                    objContCustItemPriceData.item = objCustContItemPriceResult.getValue('custrecord_cip_item');
                    objContCustItemPriceData.item_lastpurchprice = objCustContItemPriceResult.getValue('lastpurchaseprice', 'custrecord_cip_item');
                    objContCustItemPriceData.calc_method = objCustContItemPriceResult.getValue('custrecord_nsts_rm_calculation_method', 'custrecord_cip_rebagreement_detail');
                    objContCustItemPriceData.amount = objCustContItemPriceResult.getValue('custrecord_nsts_rm_rebate_amount', 'custrecord_cip_rebagreement_detail');
                    objContCustItemPriceData.percent = objCustContItemPriceResult.getValue('custrecord_nsts_rm_rebate_percent', 'custrecord_cip_rebagreement_detail');
                    objContCustItemPriceData.guaranteed_amount = objCustContItemPriceResult.getValue('custrecord_ifd_guaranteedamt', 'custrecord_cip_rebagreement_detail');
                
                    nlapiLogExecution('DEBUG', stLoggerTitle, '- Customer Item Pricing Data -'
                            + ' | ID = ' + objContCustItemPriceData.id
                            + ' | Rebate Agreement Det. ID = ' + objContCustItemPriceData.reb_agree_det_id
                            + ' | Customer = ' + objContCustItemPriceData.customer
                            + ' | Item = ' + objContCustItemPriceData.item
                            + ' | Item: Last Purchase Price = ' + objContCustItemPriceData.item_lastpurchprice
                            + ' | Calculation Method = ' + objContCustItemPriceData.calc_method
                            + ' | Amount = ' + objContCustItemPriceData.amount
                            + ' | Percent = ' + objContCustItemPriceData.percent
                            + ' | Guaranteed Amount = ' + objContCustItemPriceData.guaranteed_amount
                            );

                    if(NSUtil.isEmpty(objContCustItemPriceData.calc_method))
                    {
                    	// Update 'Rebate Agreement Detail' field of 'Customer Item Pricing (New)' record
                        nlapiSubmitField('customrecord_item_pricing_cust', objContCustItemPriceData.id, 'custrecord_cip_rebagreement_detail', objRebAgreeDetData.reb_agree_det_id, true);
                        nlapiLogExecution('AUDIT', stLoggerTitle, 'Customer Item Pricing has been successfully processed. ID = ' + objContCustItemPriceData.id);
                    }
                    
                    if (NSUtil.isEmpty(objContCustItemPriceData.customer) 
                    || NSUtil.isEmpty(objContCustItemPriceData.item)
                    || NSUtil.isEmpty(objContCustItemPriceData.calc_method))
                    {
                    	//Set status of the RM detail record to �Processed� if the pricing is not found
                    	nlapiSubmitField('customrecord_nsts_rm_agreement_detail', objRebAgreeDetData.reb_agree_det_id, 'custrecord_ifd_contractstatus', OBJ_SCRIPT_PARAMETERS['contract_status_processed']);
                    	
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Customer, Item, or Rebate Calculation is empty. Rebate Agreement Detail = ' + objContCustItemPriceData.reb_agree_det_id);
                        continue; // Proceed to next Rebate Agreement Detail
                    }
                    
                    var flCurrentRebAgreeDetAmt = getAgreementDetailRebateAmt(objContCustItemPriceData);
                    var flNewRebAgreeDetAmt = getAgreementDetailRebateAmt(objRebAgreeDetData);
                    
                    // If the rebate amount of 'Rebate Agreement Detail' >= rebate amount of 'Customer Item Pricing (New)' record
                    if (flCurrentRebAgreeDetAmt < flNewRebAgreeDetAmt)
                    {
                        // Update 'Rebate Agreement Detail' field of 'Customer Item Pricing (New)' record
                        nlapiSubmitField('customrecord_item_pricing_cust', objContCustItemPriceData.id, 'custrecord_cip_rebagreement_detail', objRebAgreeDetData.reb_agree_det_id, true);
                        nlapiLogExecution('AUDIT', stLoggerTitle, 'Customer Item Pricing has been successfully processed. ID = ' + objContCustItemPriceData.id);
                    }
                    
                    // Update Rebate Agreement Detail
                    nlapiSubmitField('customrecord_nsts_rm_agreement_detail', objRebAgreeDetData.reb_agree_det_id, 'custrecord_ifd_contractstatus', OBJ_SCRIPT_PARAMETERS['contract_status_processed']);
                    nlapiLogExecution('AUDIT', stLoggerTitle, 'Rebate Agreement Detail has been successfully processed. ID = ' + objContCustItemPriceData.id);
                }
                catch(err)
                {
                    if (err.getDetails != undefined)
                    {
                        nlapiLogExecution('ERROR', 'Process Error', err.getCode() + ': ' + err.getDetails());
                    }
                    else
                    {
                        nlapiLogExecution('ERROR', 'Unexpected Error', err.toString());
                    }

                    nlapiSubmitField('customrecord_nsts_rm_agreement_detail', objRebAgreeDetData.reb_agree_det_id, 'custrecord_ifd_contractstatus', OBJ_SCRIPT_PARAMETERS['contract_status_failed']);
                    nlapiLogExecution('AUDIT', stLoggerTitle, 'Rebate Agreement Detail failed processing. ID = ' + objRebAgreeDetData.reb_agree_det_id);
                }
            }
        }
        while (arrRebateAgreeDet.length >= 1000);
        
        nlapiLogExecution('AUDIT', stLoggerTitle, '>>Exit<< | Server Date = ' + checkCurrentDateTime());
    }
    catch (error)
    {
        if (error.getDetails != undefined)
        {
            nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else
        {
            nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }
}

/**
 * This function collects high & low Internal IDs per batch to be used as a filter on another search
 * 
 * @param stRecordType
 * @param stSearchId
 * @param arrSearchFilter
 * @param arrSearchColumn
 * @param intNumOfDataPerQueue
 * @param intTotalNumOfData
 * @returns {Array}
 */
function getLowAndHighInternalIDs(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn, intNumOfDataPerQueue, intTotalNumOfData)
{
    var stLoggerTitle = 'getLowAndHighInternalIDs';
    
    if (stRecordType == null && stSearchId == null)
    {
        throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'search: Missing a required argument. Either stRecordType or stSearchId should be provided.');
    }

    var objSavedSearch;

    if (stSearchId != null)
    {
        objSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

        // add search filter if one is passed
        if (arrSearchFilter != null)
        {
            objSavedSearch.addFilters(arrSearchFilter);
        }

        // add search column if one is passed
        if (arrSearchColumn != null)
        {
            objSavedSearch.addColumns(arrSearchColumn);
        }
    }
    else
    {
        objSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
    }

    var objResultset = objSavedSearch.runSearch();
    
    var intSearchIndex = 0;
    var arrResultSlice = null;
    var arrLowAndHighIDs = [];
    var intLastIndexNum = intNumOfDataPerQueue;
    do
    {
        NSUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME, INT_TIME_LIMIT_THRESHOLD, INT_PERCENT_ALLOWED_TIME);
        
        // Once it reached the last batch replace the Data intNumOfDataPerQueue with the intTotalNumOfData so it won't exceed the number of item
        if (intLastIndexNum > intTotalNumOfData)
        {
            intLastIndexNum = intTotalNumOfData;
        }
        
        nlapiLogExecution('DEBUG', stLoggerTitle, '[START] Getting LOW internal id. Time = ' + checkCurrentDateTime());
        // Getting the lowest internal id
        var objLowResultData = objResultset.getResults(intSearchIndex, intSearchIndex + 1);    // 0, 1 | 7, 8   | 14, 15
        var intLowInternalID = objLowResultData[0].getId();
        nlapiLogExecution('DEBUG', stLoggerTitle, '[END] Getting low internal id. Time = ' + checkCurrentDateTime());
        
        // Adding reschedule script checking. This might be causing 
        NSUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME, INT_TIME_LIMIT_THRESHOLD, INT_PERCENT_ALLOWED_TIME);
        
        nlapiLogExecution('DEBUG', stLoggerTitle, '[START] Getting HIGH internal id. Time = ' + checkCurrentDateTime());
        // Getting the highest internal id
        var objHighResultData = objResultset.getResults(intLastIndexNum - 1, intLastIndexNum); // 6, 7 | 13, 14 | 14, 15
        var intHighInternalID = objHighResultData[0].getId();
        nlapiLogExecution('DEBUG', stLoggerTitle, '[END] Getting HIGH internal id. Time = ' + checkCurrentDateTime());
        
        var objLowAndHighIDs = {'low': intLowInternalID, 'high': intHighInternalID};
        arrLowAndHighIDs.push(objLowAndHighIDs);
        
        // Adjusting indexes
        intSearchIndex = intLastIndexNum;
        intLastIndexNum = intLastIndexNum + intNumOfDataPerQueue;
    }
    while (intSearchIndex < intTotalNumOfData);

    return arrLowAndHighIDs;
}

/**
 * This function calculates the rebate amount using based from the Calculation Method 
 * 
 * @param {Object} objData
 * @return {Float} flAmount
 */
function getAgreementDetailRebateAmt(objData)
{
    var flAmount = 0;
    
    // Rebate Calculation Action
    switch(objData.calc_method)
    {
        case OBJ_SCRIPT_PARAMETERS['rcm_perc_flc']:
            flAmount = calcFixedPctLandedCost(objData);
            break;
        case OBJ_SCRIPT_PARAMETERS['rcm_dollar_flc']:
            flAmount = calcFixedDollarLandedCost(objData);
            break;
        case OBJ_SCRIPT_PARAMETERS['rcm_perc_fob']:
            flAmount = calcFixedPctFOB(objData);
            break;
        case OBJ_SCRIPT_PARAMETERS['rcm_dollar_fob']:
            flAmount = calcFixedDollarFOB(objData);
            break;
        case OBJ_SCRIPT_PARAMETERS['rcm_amt_guarantee_fob']:
            flAmount = calcFixedGuaranteedLPP(objData);
            break;
    }
    
    return flAmount;
}

/***************************************************************************************
 *                              Calculation Methods                                    *
 ****************************************************************************************/

function calcFixedPctLandedCost(objData)
{
    var stLoggerTitle = 'calcFixedPctLandedCost';

    var flAmount = 0.00;
    var stFrozenLandCost = nlapiLookupField('item', objData.item, 'custitem_flc_weekly');
    var flFrozenLandCost = NSUtil.forceFloat(stFrozenLandCost);
    var flPercent = convertPercentageToDecimal(objData.percent);

    flAmount = flFrozenLandCost * flPercent;
    
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Frozen Landed Cost = ' + flFrozenLandCost 
            + ' | Percent = ' + flPercent
            + ' | Calculated Amount = ' + flAmount);

    return flAmount;
}

function calcFixedDollarLandedCost(objData)
{
    var stLoggerTitle = 'calcFixedDollarLandedCost';
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Retail Agreement Detail Amount = ' + objData.amount);
    return objData.amount;
}

function calcFixedPctFOB(objData)
{
    var stLoggerTitle = 'calcFixedPctFOB';

    var flAmount = 0.00;
    var flItemLastPurchPrice = NSUtil.forceFloat(objData.item_lastpurchprice);
    var flPercent = convertPercentageToDecimal(objData.percent);

    flAmount = flItemLastPurchPrice * flPercent;
    
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Last Purchase Price = ' + flItemLastPurchPrice
            + ' | Percent = ' + flPercent
            + ' | Calculated Amount = ' + flAmount);

    return flAmount;
}

function calcFixedDollarFOB(objData)
{
    var stLoggerTitle = 'calcFixedDollarFOB';
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Retail Agreement Detail Amount = ' + objData.amount);
    return objData.amount;
}

function calcFixedGuaranteedLPP(objData)
{
    var stLoggerTitle = 'calcFixedGuaranteedLPP';

    var flAmount = 0.00;
    var flGuaranteedAmt = NSUtil.forceFloat(objData.guaranteed_amount);
    var flItemLastPurchPrice = NSUtil.forceFloat(objData.item_lastpurchprice);

    flAmount = flItemLastPurchPrice - flGuaranteedAmt;

    nlapiLogExecution('DEBUG', stLoggerTitle, 'Guaranteed Amount = ' + flGuaranteedAmt
            + ' | Last Purchase Price = ' + flItemLastPurchPrice
            + ' | Calculated Amount = ' + flAmount);
    
    return flAmount;
}

/***************************************************************************************
 *                                    SEARCHES                                         *
 ****************************************************************************************/

function countNumOfRebateAgreementDet()
{
    var arrResult = null;
    
    var arrSearchFilters = [];
    var arrSearchColumns = [new nlobjSearchColumn('internalid', null, 'COUNT')];
        
    arrResult = nlapiSearchRecord(null, OBJ_SCRIPT_PARAMETERS['search_rebate_agree_det'], arrSearchFilters, arrSearchColumns);
    
    return arrResult[0].getValue('internalid', null, 'COUNT');
}

function getRebateAgreementDetByAgreement()
{
    var arrResult = [];
    
    var arrSearchFilters = [];
    var arrSearchColumns = [];
        
    try
    {
        arrResult = NSUtil.search(null, OBJ_SCRIPT_PARAMETERS['search_rebate_agree_det']);
    }
    catch (error)
    {
        arrResult = [];
    }
    
    return arrResult;
}

function getCustItemPricingByCustAndItem(objRebAgreeDetData)
{
    var arrResult = [];
    
    var arrSearchFilters = [new nlobjSearchFilter('custrecord_cip_customer', null, 'anyof', objRebAgreeDetData.customer),
                            new nlobjSearchFilter('custrecord_cip_item', null, 'anyof', objRebAgreeDetData.item),];
    var arrSearchColumns = [];
        
    try
    {
        arrResult = NSUtil.search('', OBJ_SCRIPT_PARAMETERS['search_cust_item_pricing_new'], arrSearchFilters, arrSearchColumns);
    }
    catch (error)
    {
        arrResult = [];
    }
    
    return arrResult[0];
}

/***************************************************************************************
 *                                    Utils                                            *
 ****************************************************************************************/

function checkCurrentDateTime()
{
    var intTime = new Date().getTime();
    var dtDate = new Date(intTime);
    return dtDate.toString(); // Wed Jan 12 2011 12:42:46 GMT-0800 (PST)
}

/**
 * Parsing delimited string
 * @param {String}
 * @param {String}
 * @returns {Array} 
 */
function convertStringToArray(stString, stDelimeter)
{   
    var arrParsedString = [];

    if (!NSUtil.isEmpty(stString))
    {
        arrParsedString = stString.replace(/\s/g, '').split(stDelimeter);
    }
    
    return arrParsedString;
}

/**
 * Check if an object is empty
 * @param obj (string) value to check
 * @returns {Boolean}
 */
function isEmptyObj(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
        {
            return false;
        }
    }

    return true;
}

/**
 * Converts a percent string to percent decimal
 * @param {String}
 * @returns {Float} 
 */
function convertPercentageToDecimal(stPercentage)
{
    stPercentage = stPercentage.replace('%', '');
    var flPercentage = parseFloat(stPercentage);
    var flDecimal = flPercentage/100;
    
    if (isNaN(flDecimal))
    {
        return 0;
    }
    
    return flDecimal;
}

/**
 * Mapping of item ids
 * 
 * @param stRecordType
 * @returns
 */
function toItemRecordInternalId(stRecordType) {
    var stRecordTypeInLowerCase = stRecordType.toLowerCase().trim();
   
    switch (stRecordTypeInLowerCase) {
        case 'invtpart':
             return 'inventoryitem';
        case 'description':
             return 'descriptionitem';
        case 'assembly':
             return 'assemblyitem';
        case 'discount':
             return 'discountitem';
        case 'group':
             return 'itemgroup';
        case 'markup':
             return 'markupitem';
        case 'noninvtpart':
             return 'noninventoryitem';
        case 'othcharge':
             return 'otherchargeitem';
        case 'payment':
             return 'paymentitem';
        case 'service':
             return 'serviceitem';
        case 'subtotal':
             return 'subtotalitem';
        case 'giftcert':
             return 'giftcertificateitem';
        case 'dwnlditem':
             return 'downloaditem';
        case 'kit':
             return 'kititem';
        default:
             return stRecordTypeInLowerCase;
    }
}

var NSUtil = (typeof NSUtil === 'undefined') ? {} : NSUtil;

/**
 * 
 * Version 1:
 * @author memeremilla
 * Details: Initial version
 * 
 * Version 2: 
 * @author bfeliciano
 * Details: Revised shorthand version.
 *
 * @param {String} stValue - string or object to evaluate
 * @returns {Boolean} - true if empty/null/undefined, false if not
 * 
 */
NSUtil.isEmpty = function(stValue)
{
    return ((stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function(v)
    {
        for ( var k in v)
            return false;
        return true;
    })(stValue)));
};

/**
 * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
 * @param {String} stValue - any string
 * @returns {Number} - a floating point number
 * @author jsalcedo
 */
NSUtil.forceFloat = function(stValue)
{
    var flValue = parseFloat(stValue);

    if (isNaN(flValue) || (stValue == Infinity))
    {
        return 0.00;
    }

    return flValue;
};

/**
 * Converts string to integer. If value is infinity or can't be converted to a number, 0 will be returned.
 * @param {String} stValue - any string
 * @returns {Number} - an integer
 * @author jsalcedo
 * revision: gmanarang - added parameter on parseInt to ensure decimal as base for conversion 
 */
NSUtil.forceInt = function(stValue)
{
    var intValue = parseInt(stValue, 10);

    if (isNaN(intValue) || (stValue == Infinity))
    {
        return 0;
    }

    return intValue;
};

/**
 * Evaluate if the given string is an element of the array, using reverse looping
 * @param {String} stValue - String value to find in the array
 * @param {String[]} arrValue - Array to be check for String value
 * @returns {Boolean} - true if string is an element of the array, false if not
 */
NSUtil.inArray = function(stValue, arrValue)
{
    var bIsValueFound = false;
    for (var i = arrValue.length - 1; i >= 0; i--)
    {
        if (stValue == arrValue[i])
        {
            bIsValueFound = true;
            break;
        }
    }
    return bIsValueFound;
};

/**
 * Get all of the results from the search even if the results are more than 1000.
 * @param {String} stRecordType - the record type where the search will be executed.
 * @param {String} stSearchId - the search id of the saved search that will be used.
 * @param {nlobjSearchFilter[]} arrSearchFilter - array of nlobjSearchFilter objects. The search filters to be used or will be added to the saved search if search id was passed.
 * @param {nlobjSearchColumn[]} arrSearchColumn - array of nlobjSearchColumn objects. The columns to be returned or will be added to the saved search if search id was passed.
 * @returns {nlobjSearchResult[]} - an array of nlobjSearchResult objects
 * @author memeremilla - initial version
 * @author gmanarang - used concat when combining the search result
 */
NSUtil.search = function(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn)
{
    if (stRecordType == null && stSearchId == null)
    {
        throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'search: Missing a required argument. Either stRecordType or stSearchId should be provided.');
    }

    var arrReturnSearchResults = new Array();
    var objSavedSearch;

    if (stSearchId != null)
    {
        objSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

        // add search filter if one is passed
        if (arrSearchFilter != null)
        {
            objSavedSearch.addFilters(arrSearchFilter);
        }

        // add search column if one is passed
        if (arrSearchColumn != null)
        {
            objSavedSearch.addColumns(arrSearchColumn);
        }
    }
    else
    {
        objSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
    }

    var objResultset = objSavedSearch.runSearch();
    var intSearchIndex = 0;
    var arrResultSlice = null;
    do
    {
        if ((nlapiGetContext().getExecutionContext() === 'scheduled'))
        {
            try
            {
                this.rescheduleScript(1000);
            }
            catch (e)
            {
            }
        }

        arrResultSlice = objResultset.getResults(intSearchIndex, intSearchIndex + 1000);
        if (arrResultSlice == null)
        {
            break;
        }

        arrReturnSearchResults = arrReturnSearchResults.concat(arrResultSlice);
        intSearchIndex = arrReturnSearchResults.length;
    }

    while (arrResultSlice.length >= 1000);

    return arrReturnSearchResults;
};

/**
 * A call to this API places a scheduled script into the NetSuite scheduling queue.
 *
 * @param {String}
 *            stScheduledScriptId - String or number. The script internalId or custom scriptId{String}.
 * @param {String}
 *            stDeployId [optional] - String or number. The deployment internal ID or script ID. If empty, the first "free" deployment will be used.
 *            Free means that the script's deployment status appears as Not Scheduled or Completed.
 *            If there are multiple "free" scripts, the NetSuite scheduler will take the first free script that appears in the scheduling queue.
 * @param {Object}
 *            objParams [optional] - Object of name/values used in this schedule script instance - used to override the script parameters values for this execution.
 * @returns {String} - status
 * @author memeremilla
 */
NSUtil.scheduleScript = function(stScheduledScriptId, stDeployId, objParams)
{

    var stLoggerTitle = 'scheduleScript';

    if (stScheduledScriptId == null)
    {
        throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'scheduleScript: Missing a required argument "stScheduledScriptId".');
    }

    // Deployment name character limit
    var intCharLimit = 28;

    // If stDeployId is a number
    if (!isNaN(stDeployId))
    {
        // Get custom script deployment id to avoid getting null value upon scheduling the script
        stDeployId = nlapiLookupField('scriptdeployment', stDeployId, 'scriptid');
    }
    
    // Invoke script
    var stStatus = nlapiScheduleScript(stScheduledScriptId, stDeployId, objParams);
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Scheduled Script Status : ' + stStatus);

    var stDeployInternalId = null;
    var stBaseName = null;
    if (stStatus != 'QUEUED')
    {
        var arrFilter = new Array();
        arrFilter =
            [
                        [
                                'script.scriptid', 'is', stScheduledScriptId
                        ], 'OR',
                        [
                                [
                                        'formulatext:{script.id}', 'is', stScheduledScriptId
                                ]
                        ]
            ];

        var arrColumn = new Array();
        arrColumn.push(new nlobjSearchColumn('internalid', 'script'));
        arrColumn.push(new nlobjSearchColumn('scriptid', 'script'));
        arrColumn.push(new nlobjSearchColumn('script'));
        arrColumn.push(new nlobjSearchColumn('scriptid'));
        arrColumn.push(new nlobjSearchColumn('internalid').setSort(false));

        var arrResults = nlapiSearchRecord('scriptdeployment', null, arrFilter, arrColumn);

        if ((arrResults != null) && (arrResults.length > 0))
        {
            stDeployInternalId = arrResults[0].getId();
            stBaseName = arrResults[0].getValue('scriptid', 'script');
        }
    }

    if ((stDeployInternalId == null) || (stDeployInternalId == ''))
    {
        return stStatus;
    }

    stBaseName = stBaseName.toUpperCase().split('CUSTOMSCRIPT')[1];

    // If not queued, create deployment
    while (stStatus != 'QUEUED')
    {
        // Copy deployment
        var recDeployment = nlapiCopyRecord('scriptdeployment', stDeployInternalId);

        var stOrder = recDeployment.getFieldValue('title').split(' ').pop();
        var stNewDeploymentId = stBaseName + stOrder;
        var intExcess = stNewDeploymentId.length - intCharLimit;

        stNewDeploymentId = (intExcess > 0) ? (stBaseName.substring(0, (stBaseName.length - intExcess)) + stOrder) : stNewDeploymentId;

        recDeployment.setFieldValue('isdeployed', 'T');
        recDeployment.setFieldValue('status', 'NOTSCHEDULED');
        recDeployment.setFieldValue('scriptid', stNewDeploymentId);

        var intCountQueue = nlapiGetContext().getQueueCount();
        if (intCountQueue > 1)
        {
            var stQueue = null;
//            var stQueue = Math.floor(Math.random() * intCountQueue).toString();
//            stQueue = (stQueue == '0') ? '1' : stQueue;
            
            do {
                stQueue = Math.floor(Math.random() * intCountQueue).toString();
                
            } while (stQueue == '0' || stQueue == '1')
            
            recDeployment.setFieldValue('queueid', stQueue);
        }

        // Save deployment
        var stRecID = nlapiSubmitRecord(recDeployment);
        nlapiLogExecution('AUDIT', stLoggerTitle, 'Script Deployment Record has been created.' + ' | ' + 'ID: ' + stRecID + ' | ' + 'Record Type: ' + recDeployment.getRecordType());

        // Invoke deployment
        stStatus = nlapiScheduleScript(stScheduledScriptId, null, objParams);
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Scheduled Script Status : ' + stStatus);

    }

    return stStatus;
};

/**
 * Pauses the scheduled script either if the remaining usage is less than
 * the specified governance threshold usage amount or the allowed time is
 * @param {Number} intGovernanceThreshold - The value of the governance threshold  usage units before the script will be rescheduled.
 * @param {Number} intStartTime - The time when the scheduled script started
 * @param {Number} intMaxTime - The maximum time (milliseconds) for the script to reschedule. Default is 1 hour.
 * @param {Number} flPercentOfAllowedTime - the percent of allowed time based from the maximum running time. The maximum running time is 3600000 ms.
 * @returns {Number} - intCurrentTime
 * @author memeremilla
 * 
 * Version 2
 * @author redelacruz
 * Details: throws an error with error code FAILURE_TO_YIELD when yielding fails
 */
NSUtil.rescheduleScript = function(intGovernanceThreshold, intStartTime, intMaxTime, flPercentOfAllowedTime)
{
    if (intGovernanceThreshold == null && intStartTime == null)
    {
        throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'rescheduleScript: Missing a required argument. Either intGovernanceThreshold or intStartTime should be provided.');
    }

    var stLoggerTitle = 'rescheduleScript';
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
    {
        'Remaining usage' : nlapiGetContext().getRemainingUsage()
    }));

    if (intMaxTime == null)
    {
        intMaxTime = 3600000;
    }

    var intRemainingUsage = nlapiGetContext().getRemainingUsage();
    var intRequiredTime = 900000; // 25% of max time
    if ((flPercentOfAllowedTime))
    {
        var flPercentRequiredTime = 100 - flPercentOfAllowedTime;
        intRequiredTime = intMaxTime * (flPercentRequiredTime / 100);
    }

    // check if there is still enough usage units
    if ((intGovernanceThreshold))
    {
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Checking if there is still enough usage units.');

        if (intRemainingUsage < (NSUtil.forceInt(intGovernanceThreshold, 10) + NSUtil.forceInt(20, 10)))
        {
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
            {
                'Remaining usage' : nlapiGetContext().getRemainingUsage()
            }));
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

            var objYield = null;
            try
            {
                objYield = nlapiYieldScript();
            }
            catch (e)
            {
                if (e.getDetails != undefined)
                {
                    throw e;
                }
                else
                {
                    if (e.toString().indexOf('NLServerSideScriptException') <= -1)
                    {
                        throw e;
                    }
                    else
                    {
                        objYield =
                        {
                            'Status' : 'FAILURE',
                            'Reason' : e.toString(),
                        };
                    }
                }
            }

            if (objYield.status == 'FAILURE')
            {
                nlapiLogExecution('ERROR', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
                nlapiLogExecution('ERROR', stLoggerTitle, 'Script State : ' + JSON.stringify(
                {
                    'Status' : objYield.status,
                    'Information' : objYield.information,
                    'Reason' : objYield.reason
                }));
                throw nlapiCreateError('FAILURE_TO_YIELD', 'Unable to Yield.',true);
            }
            else
            {
                nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
                nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + JSON.stringify(
                {
                    'After resume with' : intRemainingUsage,
                    'Remaining vs governance threshold' : intGovernanceThreshold
                }));
            }
        }
    }

    if ((intStartTime != null && intStartTime != 0))
    {
        // get current time
        var intCurrentTime = new Date().getTime();

        // check if elapsed time is near the arbitrary value
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Check if elapsed time is near the arbitrary value.');

        var intElapsedTime = intMaxTime - (intCurrentTime - intStartTime);
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Remaining time is ' + intElapsedTime + ' ms.');

        if (intElapsedTime < intRequiredTime)
        {
            nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

            // check if we are not reaching the max processing time which is 3600000 secondsvar objYield = null;
            try
            {
                objYield = nlapiYieldScript();
            }
            catch (e)
            {
                if (e.getDetails != undefined)
                {
                    throw e;
                }
                else
                {
                    if (e.toString().indexOf('NLServerSideScriptException') <= -1)
                    {
                        throw e;
                    }
                    else
                    {
                        objYield =
                        {
                            'Status' : 'FAILURE',
                            'Reason' : e.toString(),
                        };
                    }
                }
            }

            if (objYield.status == 'FAILURE')
            {
                nlapiLogExecution('ERROR', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
                nlapiLogExecution('ERROR', stLoggerTitle, 'Script State : ' + JSON.stringify(
                {
                    'Status' : objYield.status,
                    'Information' : objYield.information,
                    'Reason' : objYield.reason
                }));
                throw nlapiCreateError('FAILURE_TO_YIELD', 'Unable to Yield.',true);
            }
            else
            {
                nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
                nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + JSON.stringify(
                {
                    'After resume with' : intRemainingUsage,
                    'Remaining vs governance threshold' : intGovernanceThreshold
                }));

                // return new start time
                intStartTime = new Date().getTime();
            }
        }
    }

    return intStartTime;
};

/**
 * (DEPRECATED, use NSUtil.reschedule instead) Checks governance then calls yield
 * @param   {Integer} intGovernanceThreshold     *
 * @returns {Void}
 * @author memeremilla
 */
NSUtil.checkGovernance = function(intGovernanceThreshold)
{
    if (intGovernanceThreshold == null)
    {
        throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'checkGovernance: Missing a required argument "intGovernanceThreshold".');
    }

    var objContext = nlapiGetContext();

    if (objContext.getRemainingUsage() < intGovernanceThreshold)
    {
        var objState = nlapiYieldScript();
        if (objState.status == 'FAILURE')
        {
            nlapiLogExecution("ERROR", "Failed to yield script, exiting: Reason = " + objState.reason + " / Size = " + objState.size);
            throw "Failed to yield script";
        }
        else if (objState.status == 'RESUME')
        {
            nlapiLogExecution("AUDIT", "Resuming script because of " + objState.reason + ".  Size = " + objState.size);
        }
    }
};
