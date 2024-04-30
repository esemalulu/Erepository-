/**
 * Copyright (c) 1998-2019 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved
 *
 * This software is the confidential and proprietary information of NetSuite, Inc.  ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license
 * you entered into with NetSuite
 */

/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * Script Description
 * Script to reveiw each RM Tran Detail record where a Catch Weight item 
 *
 * Version    Date         Author      Remarks
 * 1.0        01/07/2019   MPG         Initial Version
 * 1.1        05/21/2019   PRIES       Update for TI 61 - get Rebate Amount from RM Tran Detail, change Catch Weights calculatiion for Total Rebate Amount
 * 1.2        05/30/2019   PRIES       Update for TI 61 - changed "Vendor Bill" to "Bill"
 * 1.3        06/04/2019   PRIES       Update for TI 61 - rounding correction for Total Rebate Amount 
 */
define(['N/error', 'N/record', 'N/runtime', 'N/search', './NSUtilvSS2', 'N/cache', 'N/format'],
/**
 * @param {error} error
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */
function(error, record, runtime, search, NSUtil, cache, format) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() 
    {
        var OBJ_LOGS = {};

        var stLogTitle = 'getInputData';

        try
        {
            OBJ_LOGS.start = '---- Start ---';

            /** ---------- Get parameters ---------- **/
            var objScript = runtime.getCurrentScript();
            var stSavedSearch_Rebate_Trans_Det = objScript.getParameter('custscript_ifd_cw_rebatetrandetails');
            
            /** ---------- Validate Parameters ---------- **/
            var stErrorMsgParam = '';
            var objParams = {
                'savedsearch' : stSavedSearch_Rebate_Trans_Det,
            };

            //logs only
            OBJ_LOGS.parameters = JSON.stringify(objParams);

            for (var objkey in objParams )
            { 
                //if one of the parameter is empty, throw an error.
                if(NSUtil.isEmpty(objParams[objkey]))
                {   
                    stErrorMsgParam += objkey + ' parameter is empty \n';
                }
            }

            if(!NSUtil.isEmpty(stErrorMsgParam))
            {
                objError = createError('Invalid Parameter',stErrorMsgParam);
                throw objError.message;
            }
            //reset the cache


            /** ---------- Load saved search ---------- **/
            var objSearchResults = search.load({id:stSavedSearch_Rebate_Trans_Det});

            //fitler to check that the last modified date is today within the last hour - incomplete, commented out 1/10 now that checkbox will handle
            // var dateCurrentMilliseconds = new Date().now();
            // var dateOneHourAgoMilliseconds = dateCurrentMilliseconds - 3600000;
            // var dateTimeComparison = new Date(dateOneHourAgoMilliseconds);
            // var formattedDateTimeComparison = formatDateTime(dateTimeComparison);
            // // dateTimeComparison.setHours(dateTimeComparison.getHours() - 1);
            // // var formattedDateTimeComparison = format.format({value:dateTimeComparison,type:format.Type.DATETIME});
            // OBJ_LOGS.dateTimeComparison = dateTimeComparison;
            // OBJ_LOGS.formattedDateTimeComparison = formattedDateTimeComparison;
            // var obSoIdFilter = search.createFilter({
            //     name: 'lastmodified',
            //     operator: search.Operator.AFTER,
            //     values: formattedDateTimeComparison
            // });
            // objSearchResults.filters.push(obSoIdFilter);

            var arrSearchResults = objSearchResults.run().getRange(0, 1000);
            OBJ_LOGS.arrSearchResults = JSON.stringify(arrSearchResults);
            if(NSUtil.isEmpty(arrSearchResults))
            {
                log.audit(stLogTitle,'Search result is empty');
                return;
            } 
            else 
            {
                var summaryCache = cache.getCache('summaryCache');
                summaryCache.put({
                    key: 'searchSize',
                    value: arrSearchResults.length
                });
                return arrSearchResults; 
            }
        }
        catch(ex)
        {
            log.error(stLogTitle,ex.toString());
            throw ex;
        }
        finally
        {
            OBJ_LOGS.end = '---- End ---';
            scriptLog(OBJ_LOGS,stLogTitle);
        }    
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) 
    {
        var OBJ_LOGS = {};

        var stLogTitle = 'map';

        try {
            OBJ_LOGS.start = '---- Start ----';
            OBJ_LOGS.context_return_values = JSON.stringify(context);

            var objData = context.value;

            OBJ_LOGS.objdata = JSON.stringify(objData);

            //validate
            if(!isJson(objData))
            {
                log.error(stLogTitle,'Data value is not an object');
                return;
            }

            //change to object
            var OBJ_RM_TRAN_DETAILS = JSON.parse(objData);

            //Pull created from transaction
            var stSourceTransaction = OBJ_RM_TRAN_DETAILS.values['CUSTRECORD_NSTS_RM_REBATETRAN.custrecord_nsts_rm_rebate_transaction'][0].text;
            OBJ_LOGS.sourceTransaction = stSourceTransaction;
            var stSourceTransactionID = OBJ_RM_TRAN_DETAILS.values['CUSTRECORD_NSTS_RM_REBATETRAN.custrecord_nsts_rm_rebate_transaction'][0].value;
            OBJ_LOGS.sourceTransactionID = stSourceTransactionID;

            //Pull source transaction type, convert to proper enum and load the source transaction
            var stSourceTransactionType = OBJ_RM_TRAN_DETAILS.values.custrecord_nsts_rm_tran_type[0].text;
            var stSourceTransactionEnum = '';
            if(stSourceTransactionType == 'Invoice') 
            {
                var recSourceTransaction = record.load({
                    type: record.Type.INVOICE,
                    id: stSourceTransactionID
                });
                //stSourceTransactionEnum = 'record.Type.INVOICE';
            }
            else if(stSourceTransactionType == 'Item Receipt')
            {
                var recSourceTransaction = record.load({
                    type: record.Type.ITEM_RECEIPT,
                    id: stSourceTransactionID
                });
                //stSourceTransactionEnum = 'record.Type.ITEM_RECEIPT';
            }
            else if(stSourceTransactionType == 'Bill')                    // v1.2 - updated
            {
                var recSourceTransaction = record.load({
                    type: record.Type.VENDOR_BILL,
                    id: stSourceTransactionID
                });
                //stSourceTransactionEnum = 'record.Type.VENDOR_BILL';
            } else {
                log.debug(stLogTitle, 'Source Transaction Type '+stSourceTransactionType+ ' is not supported. Exiting.');
                return;
            }
            

            //pull source transaction line and convert to base zero rather than base one so that getSublistValue can use proper line
            var stSourceTransactionLine = OBJ_RM_TRAN_DETAILS.values['CUSTRECORD_NSTS_RM_REBATETRAN.custrecord_nsts_rm_tran_lineid'];
            OBJ_LOGS.sourceTransactionLine = stSourceTransactionLine;
            var intSourceTransactionLine = NSUtil.forceInt(stSourceTransactionLine) - 1;

            //Pull the rate and the act weight
            var flRate = recSourceTransaction.getSublistValue({
                sublistId : 'item',
                fieldId: 'rate',
                line: intSourceTransactionLine
            });
            var flActWeight = recSourceTransaction.getSublistValue({
                sublistId : 'item',
                fieldId: 'custcol_jf_cw_act_wght',
                line: intSourceTransactionLine
            });            
            var stItem = recSourceTransaction.getSublistValue({
                sublistId : 'item',
                fieldId: 'item',
                line: intSourceTransactionLine
            });    

            //Check to see if Actual weight is blank or zero
            if(NSUtil.isEmpty(flActWeight) || flActWeight == 0){
                log.debug(stLogTitle,'Actual Weight on line '+intSourceTransactionLine+' of '+stSourceTransaction+' is blank or zero. Exiting map function.');
                return;
            } else {
                //Add Item ID, Rate and Act Weight to context to be passed to reduce() function
                OBJ_LOGS.sourceTransactionItem = stItem;
                OBJ_LOGS.sourceTransactionRate = flRate;
                OBJ_LOGS.sourceTransactionActWeight = flActWeight;

                context.write({
                    key : OBJ_RM_TRAN_DETAILS.id,
                    value : {
                        objRMTransDetails : OBJ_RM_TRAN_DETAILS,
                        sourceTransactionItem : stItem,
                        sourceTransactionRate : flRate,
                        sourceTransactionActWeight : flActWeight
                    }
                });
            }

        }
        catch(ex)
        {
            log.error(stLogTitle,ex.toString());
            throw ex;
        }
        finally
        {
            OBJ_LOGS.end = '---- End ---';
            scriptLog(OBJ_LOGS,stLogTitle);
        }
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) 
    {
         var OBJ_LOGS = {};

        var stLogTitle = 'reduce';

        try {
            OBJ_LOGS.start = '---- Start ----';
            OBJ_LOGS.context_return_values = JSON.stringify(context);

            var objData = context.values[0];

            OBJ_LOGS.objdata = JSON.stringify(objData);

            //validate
            if(!isJson(objData))
            {
                log.error(stLogTitle,'Data value is not an object');
                return;
            }

            //change to object
            var OBJ_REDUCE_CONTEXT = JSON.parse(objData);

            //pull the actual weight, rate, and rebate trans detail amounts
            var flActWeight = OBJ_REDUCE_CONTEXT.sourceTransactionActWeight;
            var flRate = OBJ_REDUCE_CONTEXT.sourceTransactionRate;
            var flRMTranDetId = OBJ_REDUCE_CONTEXT.objRMTransDetails.id;
            // v1.1 - added:
            var flRebateAmount = OBJ_REDUCE_CONTEXT.objRMTransDetails.values.custrecord_nsts_rm_td_amount || 0;
            OBJ_LOGS.sourceTransactionActWeight = flActWeight;
            OBJ_LOGS.sourceTransactionRate = flRate;
            OBJ_LOGS.RMTranDetId = flRMTranDetId;
            OBJ_LOGS.flRebateAmount = flRebateAmount; // 1.1


            //set the rebate quantity
            OBJ_LOGS.RMTranDetUpdated = false;
            // v1.1 - updated:       
            var flTotalRebateAmt = NSUtil.forceFloat(flActWeight*flRebateAmount);
            flTotalRebateAmt = (Math.round(flTotalRebateAmt * 100) / 100).toFixed(2);     // v1.3 - updated
            OBJ_LOGS.newRebateAmt = flTotalRebateAmt;
            var id = record.submitFields({
                type : 'customrecord_nsts_rm_transaction_details',
                id : flRMTranDetId,
                values : {
                    custrecord_nsts_rm_td_item_qty : flActWeight,
                    custrecord_nsts_rm_td_totalamt : flTotalRebateAmt,
                    custrecord_cw_rebate_amt_calculated : 'T'
                }
            });
            if(id) {
                OBJ_LOGS.RMTranDetUpdated = true;
                var summaryCache = cache.getCache('summaryCache');
                var intUpdateCount = summaryCache.get({
                    key : 'recsUpdated',
                    loader : cacheLoader
                });
                intUpdateCount++;
                summaryCache.put({
                    key: 'recsUpdated',
                    value: intUpdateCount
                });
            }
        }
        catch(ex)
        {
            log.error(stLogTitle,ex.toString());
            throw ex;
        }
        finally
        {
            OBJ_LOGS.end = '---- End ---';
            scriptLog(OBJ_LOGS,stLogTitle);
        }
    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) 
    {
        var objSummaryResults = {};
        objSummaryResults['Summary'] = summary;
        objSummaryResults['Total Duration of Execution (seconds)'] = summary.seconds;

        //count the errors across all the stages
        var totalErrors = 0;
        summary.mapSummary.errors.iterator().each(function (key, error)
        {
            totalErrors++;
            return true;
        });
        summary.mapSummary.errors.iterator().each(function (key, error)
        {
            totalErrors++;
            return true;
        });
        summary.mapSummary.errors.iterator().each(function (key, error)
        {
            totalErrors++;
            return true;
        });
        objSummaryResults['Total Errors'] = totalErrors;

         //log Errors from the reduce stage
        if (summary.reduceSummary.errors)
        {
            objSummaryResults['Reduce Errors'] = JSON.stringify(summary.reduceSummary.errors);
        } else {
            objSummaryResults['Reduce Errors'] = '-none-';
        }

        //load cache
        var summaryCache = cache.getCache('summaryCache');
        //pull number of search results in getInputData and log
        var intSearchResultsCount = summaryCache.get({
            key: 'searchSize',
            loader: cacheLoader
        });
        if(NSUtil.isEmpty(intSearchResultsCount)) {
            objSummaryResults['Total # of RM Tran Detail Records Found'] = 0;
        } else { 
            objSummaryResults['Total # of RM Tran Detail Records Found'] = intSearchResultsCount;
        }
        
        //clear out the total search results pulled
        summaryCache.remove({
            key: 'searchSize'
        });

        //count the total records updated
        var totalRecordsUpdated = summaryCache.get({
            key: 'recsUpdated',
            loader: cacheLoader
        });
        if(NSUtil.isEmpty(totalRecordsUpdated)) {
            objSummaryResults['Total Records Updated'] = 0;
        } else { 
            objSummaryResults['Total Records Updated'] = totalRecordsUpdated;
        }
        //clear out the total records updated
        summaryCache.remove({
            key: 'recsUpdated'
        });

        log.audit({
            title: 'Map/Reduce Summary',
            details: objSummaryResults
        });
    }   

    /** -----------------------------------
     * Log all the details - @param{object}
    --------------------------------------- **/
    scriptLog = function(objLogs,stTitle)
    {
        var logs = '';
        var logTitle = stTitle || 'Script Logs';

        for(var key in objLogs)
        {
            logs+='<br> <i>'+key+'</i> : '+objLogs[key];
            if(logs.length>=3000)
            {
                log.debug(logTitle,logs);
                logs = '';
            }
        }
        if(logs) log.debug(logTitle,logs);
    };

    /** ----------------------------------------------------
     * Custom function create error 
     * 
     * @param {string} name - error name
     * @param {string} message - error message
     * @return {object}
    --------------------------------------------------------**/
    createError = function(stName,stMessage)
    {   

        if(typeof(error) == 'undefined'){ error = require('N/error'); }

        stName = (stName) ? stName : 'Error';
        stMessage = (stMessage) ? stMessage : 'Unexpected Error';

        log.error(stName,stMessage);

        var objError = error.create(
        {
            name : stName,
            message : stMessage,
            notifyOff : false
        });

        return objError;
    };

    /** ----------------------------------------------------
     * Check if value is JSON
    ---------------------------------------------------- **/
    isJson = function(stValue)
    {
        try{ JSON.parse(stValue); }
        catch(e){ return false; }
        return true;
    };

    /** ----------------------------------------------------
     * Cache loader function
     * @return int
    ---------------------------------------------------- **/
    cacheLoader = function()
    {
        return 0;
    };

    /** ----------------------------------------------------
     * Function to convert datetime to proper searchable value
     * @return date
    ---------------------------------------------------- **/
    // formatDateTime = function(objDateTime)
    // {
    //     var formattedDateTime = '';
    //     //Month 
    //     formattedDateTime += (objDateTime.getMonth() + 1) + '/';
    //     //Day
    //     formattedDateTime += objDateTime.getDate() + '/';
    //     //Year
    //     formattedDateTime += objDateTime.getYear() + ' ';
    //     //Hours
    //     var intHours = objDateTime.getHours()+1;
        
    //     if(intHours >= 12 && intHours ==24) {

    //     }
    //     //Minutes

        
    //     return formattedDateTime;
    // };

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});