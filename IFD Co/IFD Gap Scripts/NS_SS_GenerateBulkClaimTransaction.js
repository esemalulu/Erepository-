/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * 
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Jun 2016     mbuenavides      Script will get all the claim logs that have not been processed. Generate a claim for each claim generation log on a Quarterly, Monthly, Weekly or Bi-weekly basis.
 * 1.01       01 Feb 2017     mbuenavides      Update the Previous & Next Claim Generation Date of the Rebate Agreement even if the claim log was not successfully processed.
 * 1.02       14 Feb 2017     mbuenavides      Increased Usage Limit Threshold
 * 1.03       13 Jun 2017     lochengco        Applied Fix for isEmpty() function: Missing variable 'NSUtil'
 * 1.04       14 Jun 2017     lochengco        Changed utility function name from 'NSUtil' => 'NSUtil1' to avoid conflict whenever the script yielded
 * 1.05       02 Aug 2019     jostap           TI 223 - Changes to avoid exceeding usage limits, script only processes a number of records and then re-starts itself to finish the batch
 * 1.06       07 Aug 2019     jostap           Fix infinite loop scenario
 * 1.07       05 Sep 2019     jostap           TI 263 - added deployment id to nalipScheduleScript
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
var USAGE_LIMIT_THRESHOLD = 2800;  // 2/14/17 mbuenavides
var TIME_LIMIT_THRESHOLD = 3600000; // 3600000ms = 1hr
var START_TIME = new Date().getTime();
var PERCENT_ALLOWED_TIME = 90;
function scheduled_generateBulkClaimTransaction(type) 
{
    try
    {
        var stLoggerTitle = 'scheduled_generateBulkClaimTransaction';
        nlapiLogExecution('DEBUG', stLoggerTitle, '*Entry log*');
        
        // get parameters
        var objContext = nlapiGetContext(); 
        var stClaimReviewer = objContext.getSetting('SCRIPT', 'custscript_ifd_claim_reviewer');
        var stQuarterlyFreq = objContext.getSetting('SCRIPT', 'custscript_ifd_claimfreq_quarter');
        var stMonthlyFreq = objContext.getSetting('SCRIPT', 'custscript_ifd_claimfreq_monthly');
        var stWeeklyFreq = objContext.getSetting('SCRIPT', 'custscript_ifd_claimfreq_weekly'); 
        var stBiweeklyFreq = objContext.getSetting('SCRIPT', 'custscript_ifd_claimfreq_biweekly');
        nlapiLogExecution('DEBUG', stLoggerTitle, 'parameter |' 
                + ' claim reviewer: ' + stClaimReviewer
                + ', quarterly: ' + stQuarterlyFreq
                + ', monthly: ' + stMonthlyFreq
                + ', weekly: ' + stWeeklyFreq
                + ', bi-weekly: ' + stBiweeklyFreq );
        
        // check parameters
        if(NSUtil1.isEmpty(stClaimReviewer) || NSUtil1.isEmpty(stQuarterlyFreq) || NSUtil1.isEmpty(stMonthlyFreq) || 
           NSUtil1.isEmpty(stWeeklyFreq)  || NSUtil1.isEmpty(stBiweeklyFreq))
        {
            throw nlapiCreateError('ERROR', 'Please set the script parameter/s. Exit script.', true);
        }
        
        // get unprocessed claim logs where status is 'Claim Generation Initiated'
        var arrClaimLogs = getUnprocesssedClaimLogs();
        nlapiLogExecution('DEBUG',stLoggerTitle, 'arrClaimLogs', arrClaimLogs);
        // check if there are claim logs to process
        if(NSUtil1.isEmpty(arrClaimLogs))
        {
            nlapiLogExecution('DEBUG',stLoggerTitle, 'No claim log to process. Exit script.');
            return;
        }
         nlapiLogExecution('DEBUG', stLoggerTitle, 'arrClaimLogs', arrClaimLogs);
        var intClaimCount = arrClaimLogs.length;
        nlapiLogExecution('DEBUG', stLoggerTitle, '# of claim logs to process: ' + intClaimCount);
        
                
        // loop through the claim logs
        var arrClaimsToProcess = new Array();
        for(var x  = 0; x < intClaimCount; x++)
        {
            var result = arrClaimLogs[x];
            var stAgreement = result.getValue('custrecord_nsts_rm_cg_rebate_agreement');
            var stName = result.getValue('name');
            var stClaimId = result.getValue('internalid');
            var stToday = nlapiDateToString(new Date(), 'mm/dd/yyyy');          
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Checking claim : ' + stName + ' ,(id): '+ stClaimId);
            
            try
            {
                // retrieve agreements's Prev Generation Date, Next Date for Claim Generation and Claim Frequency
                var arrAgreementDetails = nlapiLookupField('customrecord_nsts_rm_rebate_agreement', stAgreement, ['custrecord_ifd_prev_claim_date', 'custrecord_ifd_next_claim_date', 'custrecord_ifd_claim_freq']);
                nlapiLogExecution('DEBUG', stLoggerTitle, 'Agreement: ' + stAgreement 
                        + ', previous gen date: ' + arrAgreementDetails['custrecord_ifd_prev_claim_date']
                        + ', next gen date: ' + arrAgreementDetails['custrecord_ifd_next_claim_date']
                        + ', claim freq: ' + arrAgreementDetails['custrecord_ifd_claim_freq']);
                
                // process claim log if previous gen date is blank or next gen date is today/earlier or claim frequency is blank
                // add the claim log's id to the array
                if(NSUtil1.isEmpty(arrAgreementDetails['custrecord_ifd_prev_claim_date']) || arrAgreementDetails['custrecord_ifd_next_claim_date'] <= stToday || NSUtil1.isEmpty(arrAgreementDetails['custrecord_ifd_claim_freq']))
                {
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Process claim: ' + stClaimId);
                    arrClaimsToProcess.push(stClaimId);
                }               
                else
                {
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Do not process claim: ' + stClaimId);
                }
            }
            catch(e)
            {
                nlapiLogExecution('DEBUG', stLoggerTitle, 'An error was encountered during processing of ' + stName + '. Details: ' + e.toString() + '. Proceed to the next claim.');
            }
            
            // check governance
            START_TIME = NSUtil1.rescheduleScript(USAGE_LIMIT_THRESHOLD, START_TIME, TIME_LIMIT_THRESHOLD, PERCENT_ALLOWED_TIME);
        }
        
        // check if there are claim logs to process
        if(NSUtil1.isEmpty(arrClaimsToProcess))
        {
            nlapiLogExecution('DEBUG',stLoggerTitle, 'There are no claim log/rebate agreement to process. Exit script.');
            return;
        }
        
        // process all applicable claim logs
        var arrSuccessIds = generateClaimTransaction(arrClaimsToProcess, stClaimReviewer);
        
        // check if there are successful claim logs to update
        if(NSUtil1.isEmpty(arrSuccessIds))
        {
            nlapiLogExecution('DEBUG',stLoggerTitle, 'No claim log was processed successfully. Exit script.');
            return;
        }           
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
    finally
    {
        // update the previous & next gen date of successfully processed claim logs/rebate agreements
        var rebatesToUpdate = updateRebateAgreements(arrSuccessIds, arrClaimLogs, stQuarterlyFreq, stMonthlyFreq, stWeeklyFreq, stBiweeklyFreq); // 2/13/17 mbuenavides, 8/7/19 v1.06
        nlapiLogExecution('DEBUG', stLoggerTitle, '*End of script*');

        // v1.05 added
        var areRemainingUnprocessedLogs = getUnprocesssedClaimLogs();
        nlapiLogExecution('AUDIT', stLoggerTitle, 'Check unprocessed claims again: '+JSON.stringify(areRemainingUnprocessedLogs));

        if(areRemainingUnprocessedLogs.length > 0 && !NSUtil1.isEmpty(arrClaimsToProcess) && !rebatesToUpdate){ //v1.06

            nlapiLogExecution('DEBUG', stLoggerTitle, 'More unprocessed claims exist.  Rescheduling script...');
            var context = nlapiGetContext();
            nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
        }
    }
}

/**
 * Returns all claim logs where status id 'Claim Generation - Initiated'
 * 
 * @param stStatus - the status of the claim log to be retrieved
 * @returns {Array} of NSTS | RM-Claim Generation Log
 */
function getUnprocesssedClaimLogs()
{
    var arrSearchFilter = [ new nlobjSearchFilter('custrecord_nsts_cgl_claim_generate_stat', null, 'anyof', HC_CLAIM_GEN_LOG_STATUS.Initiated)];
    var arrSearchColumn = [ new nlobjSearchColumn('name'),
                            new nlobjSearchColumn('internalid'),
                            new nlobjSearchColumn('custrecord_nsts_rm_cg_rebate_agreement'),
                            new nlobjSearchColumn('custrecord_nsts_cgl_refund_entity'),
                            new nlobjSearchColumn('custrecordnsts_cgl_credit_entity')];
    
    // v1.05 updated
    var unprocessedClaimSearch = nlapiCreateSearch('customrecord_nsts_rm_claim_generate_log', arrSearchFilter, arrSearchColumn);
    var unprocessedClaimResultSet = unprocessedClaimSearch.runSearch();
    return arrResult = unprocessedClaimResultSet.getResults(0,50);
}

/**
 * Process applicable claim logs (Previous claim date is blank, next gen date is today/earlier)
 * 
 * @param arrClaimsToProcess - array of claim log IDs to be processed
 * @param stClaimReviewer -  employee ID. will be assigned to the 'Claim Reviewed By' field on the Claim Gen Log
 * @return {Array} the internal id of successfully processed claim logs
 */
function generateClaimTransaction(arrClaimsToProcess, stClaimReviewer)
{
    var stLoggerTitle = 'generateClaimTransaction';
    nlapiLogExecution('DEBUG', stLoggerTitle, '----- Processing the following claim/s : ' + arrClaimsToProcess.toString());
        
    var arrSuccessIds = [];
    nlapiLogExecution('AUDIT', stLoggerTitle, 'arrClaimsToProcess', JSON.stringify(arrClaimsToProcess));
    for (var index = 0; index < arrClaimsToProcess.length; index++) 
    {        
        try
        {
            var intCGLId = arrClaimsToProcess[index];    
            var recCGL = nlapiLoadRecord(REC_CLAIM_GENERATION_LOG, intCGLId);
            
            recCGL = previewAndPrintClaim(recCGL, stClaimReviewer); //preview and print claim log        
            recCGL = markClaimReviewed(recCGL, stClaimReviewer); // mark claim reviewed
            recCGL = claimSummary(recCGL, stClaimReviewer); // preview claim summary
            
            var stRebateType = recCGL.getFieldValue(FLD_CLAIM_GEN_REBATE_TYPE);
            var stRemittanceType = recCGL.getFieldValue(FLD_CLAIM_GEN_REMIT_TYPE);
            nlapiLogExecution('DEBUG', stLoggerTitle, 'rebate type: ' + stRebateType + ', remittance type: ' + stRemittanceType);
            
            if ((stRebateType == HC_REBATE_TYPE.Vendor_Rebate_on_Purchase || stRebateType == HC_REBATE_TYPE.Vendor_Rebate_on_Sale) && stRemittanceType == HC_REMIT_TYPE.Credit) 
            {
                nlapiLogExecution('DEBUG', stLoggerTitle, 'createVendorRebateCredit | id: ' + intCGLId + ' , reviewer: ' + stClaimReviewer);
                createVendorRebateCredit(recCGL, stClaimReviewer);
            }
            else if(stRebateType == HC_REBATE_TYPE.Customer_Rebate && stRemittanceType == HC_REMIT_TYPE.Credit)
            {
                nlapiLogExecution('DEBUG', stLoggerTitle, 'createCustomerRebateCredit | id: ' + intCGLId + ' , reviewer: ' + stClaimReviewer);
                createCustomerRebateCredit(recCGL, stClaimReviewer);
            }
            
            if ((stRebateType == HC_REBATE_TYPE.Vendor_Rebate_on_Purchase || stRebateType == HC_REBATE_TYPE.Vendor_Rebate_on_Sale) && stRemittanceType == HC_REMIT_TYPE.Refund) 
            {
                nlapiLogExecution('DEBUG', stLoggerTitle, 'createVendorRebateRefund | id: ' + intCGLId + ' , reviewer: ' + stClaimReviewer);
                createVendorRebateRefund(recCGL, stClaimReviewer);
            }
            else if(stRebateType == HC_REBATE_TYPE.Customer_Rebate && stRemittanceType == HC_REMIT_TYPE.Refund)
            {
                nlapiLogExecution('DEBUG', stLoggerTitle, 'createCustomerRebateRefund | id: ' + intCGLId + ' , reviewer: ' + stClaimReviewer);
                createCustomerRebateRefund(recCGL, stClaimReviewer);
            }
            
            // update the claim log record
            nlapiSubmitField(REC_CLAIM_GENERATION_LOG, intCGLId, [FLD_CLAIM_GEN_STATUS, FLD_CLAIM_GEN_GENERATE_CLAIM, FLD_CLAIM_GEN_CLAIM_DET_UPDATED_BY, FLD_CLAIM_GEN_CLAIM_DET_UPDATED_ON],
                    [HC_CLAIM_GEN_LOG_STATUS.Completed, 'T', stClaimReviewer, nlapiDateToString(new Date(), 'datetimetz')]);
            nlapiLogExecution('AUDIT', stLoggerTitle, 'Successfully submitted claim gen log(id): ' + intCGLId);
        }
        catch(e)
        {
            // script cannot create PDF if claim is Bill Credit, since there is no default layout for the said record
            // if the error is regarding the PDF layout, disregard error
            if(e.getCode() == 'INVALID_PDF_LAYOUT_PLEASE_CONTACT_YOUR_ADMINISTRATOR')
            {
                recCGL.setFieldValue(FLD_CLAIM_GEN_STATUS, HC_CLAIM_GEN_LOG_STATUS.Completed);
                recCGL.setFieldValue(FLD_CLAIM_GEN_GENERATE_CLAIM, 'T');   
                nlapiSubmitField(REC_CLAIM_GENERATION_LOG, intCGLId, [FLD_CLAIM_GEN_STATUS, FLD_CLAIM_GEN_GENERATE_CLAIM], [HC_CLAIM_GEN_LOG_STATUS.Completed, 'T']);
                nlapiLogExecution('AUDIT', stLoggerTitle, 'Successfully submitted claim gen log(id): ' + intCGLId);
            }
            else
            {
                // save the 'Claim Generation Error code' field and change the status to 'Claim Generation Error'
                nlapiSubmitField(REC_CLAIM_GENERATION_LOG, intCGLId, [FLD_CLAIM_GEN_STATUS, FLD_CLAIM_GEN_GENERATE_CLAIM, FLD_CLAIM_GEN_ERR_CODE],
                        [HC_CLAIM_GEN_LOG_STATUS.Error, 'F',  e.toString()]);
                nlapiLogExecution('AUDIT', stLoggerTitle, 'Successfully submitted claim gen log(id): ' + intCGLId);
            }

            nlapiLogExecution('DEBUG', stLoggerTitle, 'Error | code:  '+ e.getCode() + ' - ' + e.toString());
        }
        // 2/1/2017 mbuenavides - store ID of claim log (even if it is not successfully processed)
        arrSuccessIds.push(intCGLId);

        // check governance
        START_TIME = NSUtil1.rescheduleScript(USAGE_LIMIT_THRESHOLD, START_TIME, TIME_LIMIT_THRESHOLD, PERCENT_ALLOWED_TIME);
    }   
    return arrSuccessIds;
}

/**
 * Works the same way as the 'Preview and Print Claim' button on the UI. Creates a claim log search.  See NSTS_RM_SL_ClaimDetailsSummary for more details.
 * 
 * @param recClaimGenLog - the claim log record
 * @param stClaimReviewer - the employee that will be assigned as the reviewer
 * @return {record} the updated claim log record
 */
function previewAndPrintClaim(recClaimGenLog, stClaimReviewer)
{   
    var stLoggerTitle = 'previewAndPrintClaim'; 
    var idClaimGenLog = recClaimGenLog.getId();
    var idClaimGenSearch = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_DEF_SEARCH_CLAIM);
    var idClaimDetSearch = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_DETAIL_SEARCH);
    var idAgreement = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_REBATE_AGREEMENT);
    var idClaimTrans = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_CLAIM_TXN_TXT);
    var dateTransStart = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_TRANSACTION_START_DATE);
    var dateTransEnd = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_TRANSACTION_END_DATE);
    var stCGLTrans = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_CLAIM_TRANSACTION);
    var stToday = nlapiDateToString(new Date(), 'datetimetz');
    var objCheckEmptyFields = checkEmptyFields(idAgreement, dateTransStart, dateTransEnd, idClaimGenSearch);
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Start processing claim log(id): ' 
            + idClaimGenLog + ', idClaimDetSearch: ' + idClaimDetSearch
            + ', idClaimGenSearch: ' + idClaimGenSearch);
    
    if(!NSUtil1.isEmpty(objCheckEmptyFields))
    {
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Please specify the following fields before Preview: ' + objCheckEmptyFields.join(','));
    }
    else
    {      
        var arFilters = [], arUpdateFields = [], arFieldValues = [];
        
        arFilters = [new nlobjSearchFilter(FLD_REBATE_TRAN_DETAIL_REBATE_AGREEMENT, null, 'is', idAgreement),
                     new nlobjSearchFilter(FLD_REBATE_TRAN_DETAIL_CLAIM, null, 'is', '@NONE@'),
                     new nlobjSearchFilter(FLD_REBATE_TRAN_DETAIL_SELECTED, null, 'is', 'T'),
                     new nlobjSearchFilter(FLD_REBATE_TRAN_DATE, FLD_REBATE_TRAN_DETAIL_REBATE_TRANSACTION, 'onorafter', dateTransStart),
                     new nlobjSearchFilter(FLD_REBATE_TRAN_DATE, FLD_REBATE_TRAN_DETAIL_REBATE_TRANSACTION, 'onorbefore', dateTransEnd)];
        
        if(!NSUtil1.isEmpty(idClaimTrans))
        {
            idClaimTrans = idClaimTrans.split(',');
            arFilters.push(new nlobjSearchFilter(FLD_REBATE_TRAN_DETAIL_TRAN_TYPE, null, 'anyof', idClaimTrans));
        }
        
        var objSearch = nlapiLoadSearch(null, idClaimGenSearch);
        if(NSUtil1.isEmpty(idClaimDetSearch))
        {
            var objNewSearch = nlapiCreateSearch(objSearch.getSearchType(), objSearch.getFilters(), objSearch.getColumns());
            objNewSearch.setIsPublic(true);        
            
            // from createRedirectToSearchResults(objNewSearch, null, idClaimGenLog, arFilters, true)
            objNewSearch.addFilters(arFilters);
            var idNewSearch = objNewSearch.saveSearch('Claim Generation Log #' + idClaimGenLog, 'customsearch_cgl_' 
                    + idClaimGenLog + '_claim_detail');
            objSearch = nlapiLoadSearch(null, idNewSearch);
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Claim Detail Search: ' + idNewSearch);
            
            //UPDATE CLAIM GENERATION CHECKLIST FIELDS
            recClaimGenLog.setFieldValue(FLD_CLAIM_GEN_DETAIL_SEARCH, idNewSearch);
            recClaimGenLog.setFieldValue(FLD_CLAIM_GEN_IS_PREVIEWED, 'T');
            recClaimGenLog.setFieldValue(FLD_CLAIM_GEN_PREVIEWED_BY, stClaimReviewer);
            recClaimGenLog.setFieldValue(FLD_CLAIM_GEN_PREVIEWED_ON, stToday);
        }
        else
        {       
            arFilters = arFilters.concat(objSearch.getFilters());
            if(NSUtil1.isEmpty(stCGLTrans))
            {
                objSearch = nlapiLoadSearch(null, idClaimDetSearch);
                objSearch.setFilters(arFilters);
                objSearch.saveSearch();
            }
            else
            {
                updateFilterSearch(idClaimDetSearch, ['custrecord_nsts_rebate_claim'], ['anyof'], [stCGLTrans], true, true);
            }
            
            recClaimGenLog.setFieldValue(FLD_CLAIM_GEN_IS_PREVIEWED, 'T');
            recClaimGenLog.setFieldValue(FLD_CLAIM_GEN_PREVIEWED_BY, stClaimReviewer);
            recClaimGenLog.setFieldValue(FLD_CLAIM_GEN_PREVIEWED_ON, stToday);            
        }
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Updated claim log: ' + idClaimGenLog);
    }
    return recClaimGenLog;
}

/**
 * Works the same way as the 'Preview Claim Summary' button on the UI. See NSTS_RM_SL_ClaimDetailsSummary for more details.
 * 
 * @param recClaimGenLog - the claim log record
 * @param stClaimReviewer - employee id
 * @return {record} - the updated claim log record
 */
function claimSummary(recClaimGenLog, stClaimReviewer)
{
    var stLoggerTitle = 'claimSummary'; 
    var idClaimGenLog = recClaimGenLog.getId();
    var idClaimGenSearch = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_DEF_SEARCH_CLAIM);
    var idClaimDetSearch = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_DETAIL_SEARCH);
    var idAgreement = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_REBATE_AGREEMENT);
    var idClaimTrans = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_CLAIM_TXN_TXT);
    var dateTransStart = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_TRANSACTION_START_DATE);
    var dateTransEnd = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_TRANSACTION_END_DATE);
    var stCGLTrans = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_CLAIM_TRANSACTION);
    var stIdRebateType = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_REBATE_TYPE);
    var bPostByDept = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_POST_BY_DEPT);
    var bPostByClass = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_POST_BY_CLASS);
    var bPostByLocation = recClaimGenLog.getFieldValue(FLD_CLAIM_GEN_POST_BY_LOC);
    var arFilters = [], arUpdateFields = [], arFieldValues = [];
    
    var objCheckEmptyFields = checkEmptyFields(idAgreement, dateTransStart, dateTransEnd, stIdRebateType);
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Start processing claim log(id): ' 
            + idClaimGenLog + ', idClaimDetSearch: ' + idClaimDetSearch
            + ', idClaimGenSearch: ' + idClaimGenSearch);
    
    var objClaimSummarySearch = getClaimSummarySearch(idClaimDetSearch, stIdRebateType, bPostByDept, bPostByClass, bPostByLocation);
    nlapiLogExecution('DEBUG', stLoggerTitle, 'objClaimSummarySearch: ' + objClaimSummarySearch.getId());
    
    var flSummaryClaimAmount = 0;
    if(NSUtil1.isEmpty(stCGLTrans))
    {
//        objClaimSummarySearch.setRedirectURLToSearchResults();
    }
    else
    {
        objClaimSummarySearch = updateFilterSearch(null, ['custrecord_nsts_rebate_claim'], ['anyof'], [stCGLTrans], true, false, objClaimSummarySearch);
    }     
    
    nlapiLogExecution('DEBUG', stLoggerTitle, 'objSummaryResults - before');
    var objSummaryResults = getAllResults(REC_REBATE_TRAN_DETAIL, null, objClaimSummarySearch.getFilters(), [new nlobjSearchColumn(FLD_REBATE_TRAN_DETAIL_TOTAL_REBATE_AMT)]);
    nlapiLogExecution('DEBUG', stLoggerTitle, 'objSummaryResults - after: ');

    if (!NSUtil1.isEmpty(objSummaryResults))
    {
        var results = objSummaryResults.results;
        nlapiLogExecution('DEBUG', stLoggerTitle, 'results', results);
        for (var i = 0; i < results.length; i++)
        {
            var flAmountResult = parseFloat(results[i].getValue(FLD_REBATE_TRAN_DETAIL_TOTAL_REBATE_AMT));
            flSummaryClaimAmount += (!isNaN(flAmountResult)) ? flAmountResult : 0;

            // check governance
            START_TIME = NSUtil1.rescheduleScript(USAGE_LIMIT_THRESHOLD, START_TIME, TIME_LIMIT_THRESHOLD, PERCENT_ALLOWED_TIME);
        }
        recClaimGenLog.setFieldValue(FLD_CLAIM_GEN_TOTAL_CLAIM, flSummaryClaimAmount);        
    }
    
    //UPDATE CLAIM GENERATION CHECKLIST FIELDS
    recClaimGenLog.setFieldValue(FLD_CLAIM_GEN_IS_REVIEWED, 'T');
    recClaimGenLog.setFieldValue(FLD_CLAIM_GEN_REVIEWED_BY, stClaimReviewer);
    recClaimGenLog.setFieldValue(FLD_CLAIM_GEN_REVIEWED_ON, nlapiDateToString(new Date(), 'datetimetz'));
    recClaimGenLog.setFieldValue(FLD_CLAIM_GEN_GENERATE_CLAIM, 'T');
    
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Updated claim log: ' + idClaimGenLog);
    return recClaimGenLog;
}

/**
 * Works the same way as the 'Mark as Claim Reviewed' button on the UI. See NSTS_RM_SL_ClaimDetailsSummary for more details.
 * 
 * @param recClaimGenLog - the claim log record
 * @param stClaimReviewer - employee id
 * @return {record} the updated claim log record
 */
function markClaimReviewed(recClaimGenLog, stClaimReviewer)
{
    recClaimGenLog.setFieldValue(FLD_CLAIM_GEN_IS_CLAIM_DET_UPDATED, 'T');
    recClaimGenLog.setFieldValue(FLD_CLAIM_GEN_CLAIM_DET_UPDATED_BY, stClaimReviewer);
    recClaimGenLog.setFieldValue(FLD_CLAIM_GEN_CLAIM_DET_UPDATED_ON, nlapiDateToString(new Date(), 'datetimetz'));
    nlapiLogExecution('DEBUG', 'markClaimReviewed', 'Updated claim log: ' + recClaimGenLog.getId());
    
    return recClaimGenLog;
}

/**
 * Checks particular fields are empty/blank/null
 * @param idAgreement - Rebate Agreement
 * @param dateTransStart - Transaction Start Date
 * @param dateTransEnd - Transaction End Date
 * @param idDefClaimSearch - Claim Generation Default Search
 * @returns {Array} of blnk/null/epty fields
 */
function checkEmptyFields(idAgreement, dateTransStart, dateTransEnd, idDefClaimSearch){
    var arFieldNames = [];
    if(NSUtil1.isEmpty(idAgreement)) arFieldNames.push('Rebate Agreement');
    if(NSUtil1.isEmpty(dateTransStart)) arFieldNames.push('Transaction Start Date');
    if(NSUtil1.isEmpty(dateTransEnd)) arFieldNames.push('Transaction End Date');
    if(NSUtil1.isEmpty(idDefClaimSearch)) arFieldNames.push('Claim Generation Default Search');
    
    return arFieldNames;
}

/**
 * Updates the Agreement fields: Prev Gen Date, Next Date for Claim Generation, Claim Frequency
 * @param arrClaimLogIds - claim log IDs
 * @param stQuarterlyFreq - Claim Frequency list: Quarterly
 * @param stMonthlyFreq - Claim Frequency list: Monthly
 * @param stWeeklyFreq - Claim Frequency list: Weekly
 * @param stBiweeklyFreq - Claim Frequency list: Bi-weekly
 * @returns {void}
 */
function updateRebateAgreements(arrClaimLogIds, arrClaimLogs, stQuarterlyFreq, stMonthlyFreq, stWeeklyFreq, stBiweeklyFreq)
{
    nlapiLogExecution('DEBUG', 'arrClaimLogIds', JSON.stringify(arrClaimLogIds));

    if(NSUtil1.isEmpty(arrClaimLogIds))
    {
        nlapiLogExecution('DEBUG','There are no claim log/rebate agreement to process. Exit script.');
        return 'There are no claim log/rebate agreement to process. Exit script.'; //v1.06
    }
        
    for(var x = 0; x < arrClaimLogIds.length; x++)
    {
        var stId = arrClaimLogIds[x];
        try
        {   
            var stRebateAgreement;
            
            // search the successful claim log ID in the array of all unprocessed claim logs
            nlapiLogExecution('DEBUG', 'arrClaimLogs', arrClaimLogs);
            for(var y = 0; y < arrClaimLogs.length; y++)
            {
                if (stId == arrClaimLogs[y].getValue('internalid'))
                {
                    stRebateAgreement = arrClaimLogs[y].getValue('custrecord_nsts_rm_cg_rebate_agreement');
                }
            }
            var stClaimFreq = nlapiLookupField('customrecord_nsts_rm_rebate_agreement', stRebateAgreement, 'custrecord_ifd_claim_freq');
            var stToday = new Date();
            var stNextGenDate;
            
            // days to be added will depend on the claim frequency
            if(stClaimFreq == stQuarterlyFreq)
            {
                stNextGenDate = nlapiAddDays(stToday, '90');
            }
            else if(stClaimFreq == stMonthlyFreq)
            {
                stNextGenDate = nlapiAddDays(stToday, '30');
            }
            else if(stClaimFreq == stWeeklyFreq)
            {
                stNextGenDate = nlapiAddDays(stToday, '7');
            }
            else if(stClaimFreq == stBiweeklyFreq)
            {
                stNextGenDate = nlapiAddDays(stToday, '14');
            }
            
            if(!NSUtil1.isEmpty(stNextGenDate))
            {
                stNextGenDate = nlapiDateToString(stNextGenDate,'mm/dd/yyyy');
            }
            
            // update the rebate agreement
            var stAgreementId = nlapiSubmitField('customrecord_nsts_rm_rebate_agreement', stRebateAgreement, ['custrecord_ifd_prev_claim_date', 'custrecord_ifd_next_claim_date'],
                    [nlapiDateToString(stToday,'mm/dd/yyyy'), stNextGenDate]);
            nlapiLogExecution('AUDIT', 'updateRebateAgreements', 'Successfully updated agreement (id) ' + stAgreementId);
        }
        catch(err)
        {                   
            nlapiSubmitField('customrecord_nsts_rm_claim_generate_log', stId, ['custrecord_nsts_cgl_claim_generate_stat', 'custrecord_nsts_rm_claim_gen_error'], [HC_CLAIM_GEN_LOG_STATUS.Error, err.toString()])
            nlapiLogExecution('DEBUG', 'updateRebateAgreements', 'Error in updating agreement. Details: ' + err.toString());
        }
        // check governance
        START_TIME = NSUtil1.rescheduleScript(USAGE_LIMIT_THRESHOLD, START_TIME, TIME_LIMIT_THRESHOLD, PERCENT_ALLOWED_TIME);
    }
}

/*******************************************************************************
 *                          Utility Functions
 ******************************************************************************/

var NSUtil1 = {
        /**
         * Evaluate if the given string or object value is empty, null or undefined.
         * @param {String} stValue - string or object to evaluate
         * @returns {Boolean} - true if empty/null/undefined, false if not
         * @author mmeremilla
         */
        isEmpty : function(stValue)
        {
            if ((stValue === '') //Strict checking for this part to properly evaluate integer value.
                    || (stValue == null) || (stValue == undefined))
            {
                return true;
            }
            else
            {
                if (stValue.constructor === Array)//Strict checking for this part to properly evaluate constructor type.
                {
                    nlapiLogExecution('DEBUG', 'stValue', stValue);
                    if (stValue.length == 0)
                    {
                        return true;
                    }
                }
                else if (stValue.constructor === Object)//Strict checking for this part to properly evaluate constructor type.
                {
                    for ( var stKey in stValue)
                    {
                        return false;
                    }
                    return true;
                }

                return false;
            }
        },
        /**
         * Get all of the results from the search even if the results are more than 1000. 
         * @param {String} stRecordType - the record type where the search will be executed.
         * @param {String} stSearchId - the search id of the saved search that will be used.
         * @param {Array} arrSearchFilter - array of nlobjSearchFilter objects. The search filters to be used or will be added to the saved search if search id was passed.
         * @param {Array} arrSearchColumn - array of nlobjSearchColumn objects. The columns to be returned or will be added to the saved search if search id was passed.
         * @returns {Array} - an array of nlobjSearchResult objects
         * @author memeremilla - initial version
         * @author gmanarang - used concat when combining the search result
         */
        search : function(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn)
        {
            var arrReturnSearchResults = new Array();
            var nlobjSavedSearch;

            if (stSearchId != null)
            {
                nlobjSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

                // add search filter if one is passed
                if (arrSearchFilter != null)
                {
                    nlobjSavedSearch.addFilters(arrSearchFilter);
                }

                // add search column if one is passed
                if (arrSearchColumn != null)
                {
                    nlobjSavedSearch.addColumns(arrSearchColumn);
                }
            }
            else
            {
                nlobjSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
            }

            var nlobjResultset = nlobjSavedSearch.runSearch();
            var intSearchIndex = 0;
            var nlobjResultSlice = null;
            do
            {
                if ((nlapiGetContext().getExecutionContext() === 'scheduled'))
                {
                    try
                    {
                        this.rescheduleScript(1000);
                    }
                    catch (e)
                    {}
                }

                nlobjResultSlice = nlobjResultset.getResults(intSearchIndex, intSearchIndex + 1000);
                if (!(nlobjResultSlice))
                {
                    break;
                }
                
                arrReturnSearchResults = arrReturnSearchResults.concat(nlobjResultSlice);
                nlapiLogExecution('DEBUG', 'arrReturnSearchResults', arrReturnSearchResults);
                intSearchIndex = arrReturnSearchResults.length;
            }

            

            while (nlobjResultSlice.length >= 1000);

            return arrReturnSearchResults;
        },
            
        /**
         * Pauses the scheduled script either if the remaining usage is less than the specified governance threshold usage amount or the allowed time is
         * @param {Number} intGovernanceThreshold - The value of the governance threshold  usage units before the script will be rescheduled.
         * @param {Number} intStartTime - The time when the scheduled script started
         * @param {Number} intMaxTime - The maximum time (milliseconds) for the script to reschedule. Default is 1 hour.
         * @param {Number} flPercentOfAllowedTime - the percent of allowed time based from the maximum running time. The maximum running time is 3600000 ms.
         * @returns intStartTime - the current time
         * @author memeremilla
         */
        rescheduleScript : function(intGovernanceThreshold, intStartTime, intMaxTime, flPercentOfAllowedTime)
        {
            var stLoggerTitle = 'SuiteUtil.rescheduleScript';
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
//              nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Checking if there is still enough usage units.');

                if (intRemainingUsage < (parseInt(intGovernanceThreshold, 10) + parseInt(20, 10)))
                {
//                  nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
//                  {
//                      'Remaining usage' : nlapiGetContext().getRemainingUsage()
//                  }));
//                  nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

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
//                      nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                        {
                            'Status' : objYield.status,
                            'Information' : objYield.information,
                            'Reason' : objYield.reason
                        }));
                    }
                    else
                    {
//                      nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                        {
                            'After resume with' : intRemainingUsage,
                            'Remaining vs governance threshold' : intGovernanceThreshold
                        }));
                    }
                }
            }

            if ((intStartTime))
            {
                // get current time
                var intCurrentTime = new Date().getTime();

                // check if elapsed time is near the arbitrary value
//              nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Check if elapsed time is near the arbitrary value.');

                var intElapsedTime = intMaxTime - (intCurrentTime - intStartTime);
//              nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Remaining time is ' + intElapsedTime + ' ms.');

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
//                      nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                        {
                            'Status' : objYield.status,
                            'Information' : objYield.information,
                            'Reason' : objYield.reason
                        }));
                    }
                    else
                    {
//                      nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
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
        },
        
        /**  
         * Checks governance then calls yield
         * @param   {Integer} myGovernanceThreshold      * 
         * @returns {Void} 
         * @author memeremilla
         */
        checkGovernance : function(myGovernanceThreshold)
        {
            var context = nlapiGetContext();
            
            if( context.getRemainingUsage() < myGovernanceThreshold )
            {
                var state = nlapiYieldScript();
                if( state.status == 'FAILURE')
                {
                    nlapiLogExecution("ERROR","Failed to yield script, exiting: Reason = "+state.reason + " / Size = "+ state.size);
                    throw "Failed to yield script";
                } 
                else if ( state.status == 'RESUME' )
                {
                    nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason+".  Size = "+ state.size);
                }
            }
        }
};