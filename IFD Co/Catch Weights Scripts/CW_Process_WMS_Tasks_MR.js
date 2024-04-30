/**
 * Copyright (c) 1998-2018 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of
 * the license agreement you entered into with NetSuite.
 *
 * Map/Reduce Description
 * Map/Reduce
 *
 * Version   Date           Author      Remarks
 * 1.00      Aug 16 2018    MGOTSCH     Rework
 * 1.10      Sept 7 2018    MGOTSCH     Changes after Script Review
 * 1.5       May 7, 2019    JOSTAP      Change design to process only one IF record
 *                                      'Closed Task Search' is now an 'Open Task Search'
 * 1.6       August 9, 2019 JOSTAP      Return total weight from first WMS Task Record found only
 *
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/error', 'N/record', 'N/runtime'],

    function(search, error, record, runtime) {

        //Function to check if value empty
        function isEmpty(stValue)
        {
            if ((stValue === '') //Strict checking for this part to properly evaluate integer value.
                || (stValue == null) || (stValue == undefined) || (stValue == 'null'))
            {
                return true;
            }
            else
            {
                if (stValue.constructor === Array)//Strict checking for this part to properly evaluate constructor type.
                {
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
        }

        //Function to force float
        function forceFloat(stValue)
        {
            var flValue = parseFloat(stValue);
            if (isNaN(flValue) || (stValue == Infinity)) {
                return 0.00;
            }
            return flValue;
        }

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
        function getInputData() {
            var logTitle = 'getInputData';
            log.audit(logTitle, '** START **');

            try{
                //Get parameter saved search for "shipped" item fulfillment lines w/ catch weight items
                //If parameter not empty, load search and return results. Otherwise, log error
                var ifID = runtime.getCurrentScript().getParameter('custscript_cw_if_id');

                var ifSearch = search.create({
                    type: 'transaction',
                    filters: [
                        ['internalidnumber','equalto',ifID],
                        'AND',
                        ['item.custitem_jf_cw_catch_weight_item','is','T'],
                        'AND',
                        ['cogs','is','F'],
                        'AND',
                        ['shipping','is','F'],
                        'AND',
                        ['taxline','is','F'],
                        'AND',
                        ['custcol_jf_cw_act_wght','isempty',''],
                        'AND',
                        ['custcol_jf_cw_catch_weight','isempty','']
                    ],
                    columns: [
                        'internalid',
                        'item',
                        'linesequencenumber',
                        'custcol_jf_cw_catch_weight',
                        'item.custitem_jf_cw_catch_weight_item'
                    ]
                });
                log.debug(logTitle, JSON.stringify(ifSearch));

                log.audit(logTitle, '** END **');
                return ifSearch;

            } catch (error) {
                log.error('Map Error', error.message);
            }
        }

        /**
         * Executes when the map entry point is triggered and applies to each key/value pair.
         *
         * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
         * @since 2015.1
         */
        function map(context) {
            var logTitle = 'map';
            log.audit(logTitle, '** START **');
            log.debug(logTitle + ' context', context);

            try{
                var searchResult = JSON.parse(context.value);

                //Get result from IF search passed from getInputData()
                var stIFId = searchResult.values.internalid.value;
                var intLineNum = searchResult.values.linesequencenumber;
                var stItem = searchResult.values.item.value;
                //Convert Line Sequence No to Line No
                intLineNum = forceFloat(forceFloat(intLineNum)/3);

                //Get parameter saved search for active WMS Closed Tasks where task is "Pick"
                //If parameter not empty, load search and add filters for NS CONFIRMATION # = IF ID and Item = Item. Otherwise, log error
                var intWMSClosedTaskSearch = runtime.getCurrentScript().getParameter('custscript_wms_closed_tasks');
                if(!isEmpty(intWMSClosedTaskSearch)){
                    var ssWMSClosedTaskSearch = search.load({
                        id : intWMSClosedTaskSearch
                    });
                } else {
                    log.error(logTitle, 'No WMS Closed Task Search Parameter Loaded');
                    return false;
                }
                ssWMSClosedTaskSearch.filters.push(search.createFilter({
                    name : 'custrecord_wmsse_nsconfirm_ref_no',
                    operator : search.Operator.ANYOF,
                    values : stIFId
                }));
                ssWMSClosedTaskSearch.filters.push(search.createFilter({
                    name : 'custrecord_wmsse_sku',
                    operator : search.Operator.ANYOF,
                    values : stItem
                }));
                log.debug(logTitle, 'filter 1 NSCONFITMATION REF #: ' + stIFId + ' | filter 2 Item: '+stItem);

                //Run the search
                var arrWMSClosedTaskSearchResults = ssWMSClosedTaskSearch.run();
                var searchResults = arrWMSClosedTaskSearchResults.getRange({
                    start: 0,
                    end: 1  //v1.6
                });
                log.debug(logTitle+' search results', searchResults);

                //If the search yeilded a result, pull the total weight, else log that no WMS Closed task record was found
                if(!isEmpty(searchResults)) {
                    var flTotalWeight = forceFloat(searchResults[0].getValue({
                        name: 'custrecord_wmsse_total_weight'
                    }));        //v1.6
                    log.debug(logTitle,'flTotalWeight: ' +flTotalWeight + ' lineNo: '+intLineNum);

                } else {
                    log.debug(logTitle, 'No WMS Closed Task records found for item: '+stItem+' from item fulfillment: '+stIFId);
                }

                //If a total weight was pulled from search, write it to context
                if(flTotalWeight > 0){
                    context.write({
                        key : stIFId,
                        value : {
                            lineno : intLineNum,
                            totweight : flTotalWeight
                        }
                    });
                    log.debug(logTitle+ ' context to pass to reduce', JSON.stringify(context));
                } else {
                    log.debug(logTitle, 'Empty wms search results, no context passed');
                }

            } catch (error) {
                log.error(logTitle + ' Error', error.message);
            }
            log.audit(logTitle, '** END **');
        }

        /**
         * Executes when the reduce entry point is triggered and applies to each group.
         *
         * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
         * @since 2015.1
         */
        function reduce(context) {
            var logTitle = 'reduce';
            log.audit(logTitle, '** START **');
            log.debug(logTitle+ ' context', JSON.stringify(context));

            try {
                //Pull context values passed from map() and load the IF
                var stItemFulfillmentId = context.key;
                var arrIFLines = context.values;
                var recItemFulfillment = record.load({
                    type : record.Type.ITEM_FULFILLMENT,
                    id : stItemFulfillmentId
                });

                //Get the number of lines in the IF and the map results
                //Loop through the map results (IF lines to update) and update the appropriate matching line on the IF
                var intIFLineCt = recItemFulfillment.getLineCount('item');
                var intArrayLength = arrIFLines.length;
                for(var i = 0; i <intArrayLength; i++){
                    var objLine = JSON.parse(arrIFLines[i]);
                    var intLine = objLine.lineno;
                    var flWeight = objLine.totweight;
                    log.debug(logTitle, 'intLine: '+intLine+' flWeight: '+flWeight);
                    recItemFulfillment.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_jf_cw_catch_weight',
                        line: intLine,
                        value: flWeight
                    });
                    log.audit(logTitle, 'Setting line '+intLine+' with catchweight '+flWeight);

                    // for(var j = 0; j <intIFLineCt; j++) {
                    //     var intLineNo = recItemFulfillment.getSublistValue({
                    //         sublistId: 'item',
                    //         fieldId: 'line',
                    //         line: j,
                    //     });
                    //     if(intLineNo == intLine){
                    //         recItemFulfillment.setSublistValue({
                    //             sublistId: 'item',
                    //             fieldId: 'custcol_jf_cw_catch_weight',
                    //             line: j,
                    //             value: flWeight
                    //         });
                    //         log.audit(logTitle + ' match', 'Setting line '+j+' with catchweight '+flWeight);
                    //     }
                    // }
                }
                recItemFulfillment.save();
            } catch (error) {
                log.error(logTitle + ' Error', error.message);
            }
            log.audit(logTitle, '** END **');
        }


        /**
         * Executes when the summarize entry point is triggered and applies to the result set.
         *
         * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
         * @since 2015.1
         */
        function summarize(summary) {
            var logTitle = 'summary';
            log.audit(logTitle, '** START **');

            //Grab Map errors
            summary.mapSummary.errors.iterator().each(function(key, value) {
                log.error(key, 'ERROR String: '+value);
                return true;
            });
            //Grab Reduce errors
            summary.reduceSummary.errors.iterator().each(function(key, value) {
                log.error(key, 'ERROR String: '+value);
                return true;
            });

            //Log Start and End time as well as the elapsed time of the run
            log.audit('Map/Reduce Start: ', JSON.stringify(summary.dateCreated));
            var endDate = new Date();
            log.audit('Map/Reduce End: ', endDate);
            log.audit('Summary Time','Total Seconds: '+summary.seconds);

            log.audit(logTitle, '** END **');
        }
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };

    });