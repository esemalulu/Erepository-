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
 * Module Description
 *
 */
/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       03 June2016     bfeliciano       initial
 */

/**
 * @NModuleScope Public
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */
define (['./NSUtil' , './LibJsonRequest' , 'N/record' , 'N/search' , 'N/runtime' , 'N/error' , 'N/format' , 'N/task'] ,
    /**
     * @param {Object} nsutil
     * @param {Object} JSONRequest
     * @param {record} record
     * @param {search} search
     * @param {runtime} runtime
     * @param {error} error
     * @param {format} format
     * @param {task} task
     */
    function ( nsutil , JSONRequest , record , search , runtime , error , format , task ) {
        var LOG_TITLE = 'MapReduceProcessWebRequests';
        var CACHE = {} , Helper = {} , ErrorHandler = {} , EndPoint = {};

        var param_searchid = 'custscript_procwebrequest_search';
        var param_batchid = 'custscript_procwebrequest_batchid';
        var param_recordtype = 'custscript_procwebrequest_recordtype';
        var param_folderId = 'custscript_esi_folder_id';
        var param_disc_items = 'custscript_reward_ids';
        var param_redemption_amt = 'custscript_redemption_amts';
        var param_sub_item = 'custscript_subtotal_item';

        var WEBREQ = {};
        WEBREQ.Status = {};
        WEBREQ.Status.Pending = '1';
        WEBREQ.Status.Processing = '2';
        WEBREQ.Status.Success = '3';
        WEBREQ.Status.Failed = '4';

        /**
         * @memberOf EndPoint
         */
        EndPoint.getInputData = function () {
            var logTitle = LOG_TITLE + '::getInputData';
            log.debug (logTitle , '*** START ***');
            var arrParamValues = Helper.getParameterValues ();
            log.debug ("debug" , "checking right after first parameters");
            // get the searchId //
            if (nsutil.isEmpty (arrParamValues[param_searchid])) {
                throw error.create ({
                    name: 'MISSING_PARAMETER' ,
                    message: 'Missing Saved Search'
                });
            }

            var searchObj = search.load ({ id: arrParamValues[param_searchid] });
            var arrFilters = searchObj.filters;
            var arrColumns = searchObj.columns;

            arrColumns.push (search.createColumn ({ name: 'custrecord_jsonreq_batch' , sort: search.Sort.DESC }));

            var objSearchNew = search.create ({
                type: searchObj.searchType ,
                filters: arrFilters ,
                columns: arrColumns
            });

            // maximum of 100 lines
            var MAXLINES = 1000;

            var arrReturnResults = [];
            objSearchNew.run ().each (function ( row ) {
                var rowData = {};
                rowData.id = row.id;
                rowData.json_content = row.getValue ({ name: 'custrecord_jsonreq_content' });
                rowData.batch = row.getValue ({ name: 'custrecord_jsonreq_batch' });

                record.submitFields ({
                    type: 'customrecord_json_webrequest' , id: row.id ,
                    values: { custrecord_jsonreq_status: JSONRequest.STATUS.PROCESSING }
                });

                arrReturnResults.push (rowData);
                return (arrReturnResults.length < MAXLINES);
            });

            return arrReturnResults;
        };

        /**
         * @memberOf EndPoint
         */
        EndPoint.map = function ( mapContext ) {
            var logTitle = LOG_TITLE + '::map';
            log.debug ("debug" , mapContext.value);
            var rowData = JSON.parse (mapContext.value);
            log.debug ("debug" , "checking right before parameters");
            var arrParamValues = Helper.getParameterValues ();
            //log.debug("debug", "IF:"+ (rowData && !nsutil.isEmpty(rowData.json_content) && JSON.parse(rowData.json_content) ));
            log.debug ("debug" , "rowData:" + rowData + "rowData.json_content:" + rowData.json_content);
            log.debug ("debug" , "checking right before parameters");
            if (rowData && !nsutil.isEmpty (rowData.json_content)) {
                log.debug ("debug" , "entered the if");
                var jsonObj = JSON.parse (rowData.json_content);
                var result = {};
                log.debug ("debug" , "Record Type:" + jsonObj.recordtype);
                switch (jsonObj.recordtype) {
                    case 'salesorder':
                        jsonObj.stParamDiscItemsIds = arrParamValues[param_disc_items];
                        jsonObj.stParamRedemptionAmt = arrParamValues[param_redemption_amt];
                        jsonObj.stParamSubtotalItem = arrParamValues[param_sub_item];

                        result = JSONRequest.createSalesOrder (jsonObj , rowData.id);
                        break;
                    case 'customer':
                        result = JSONRequest.createCustomer (jsonObj , rowData.id);
                        break;
                    case 'itemfulfillment':
                        log.debug ("debug" , "entering fulfillment");
                        result = JSONRequest.createItemFulfillment (jsonObj , rowData.id);
                        break;
                    case 'itemreceipt':
                        result = JSONRequest.createReturnAuthorizationItemReceipt (jsonObj , rowData.id , arrParamValues[param_folderId]);
                        break;
                    case 'returnauthorization':
                        result = JSONRequest.createReturnAuthorization (jsonObj , rowData.id);
                        break;
                    default:
                        break;
                }

                var resultBatch = JSONRequest.validateBatchStatus (rowData.batch);
                log.debug (logTitle , '>>> ' + JSON.stringify ([result , resultBatch]));
            }

            return true;
        };

        /**
         * @memberOf EndPoint
         */
        EndPoint.summarize = function ( summary ) {
            var logTitle = LOG_TITLE + '::summarize::';

            //    	var nextBatchId = JSONRequest.getNextBatchQueue();
            //    	log.debug(logTitle, ' Next Batch ID >>' + nextBatchId);
            //    	if ( nextBatchId )
            //		{
            //    		log.debug(logTitle, '... set Batch ID to  PENDING-CREATION >>' + nextBatchId);
            //    		return record.submitFields({
            //    			type : 'customrecord_sears_webrequest_batch',
            //    			id : nextBatchId,
            //    			values :
            //    			{
            //    				custrecord_batchwebreq_status : 'PENDING-CREATION'
            //    			}
            //    		});
            //		}

            log.debug ('****  END OF SCRIPT ****');
        };

        // /////////////////////////////
        /**
         * @returns {Object} parameter Values
         * @memberOf Helper
         */
        Helper.getParameterValues = function () {
            var logTitle = LOG_TITLE + '::getParameterValues';
            var cacheKey = ['getParameterValues'].join (':');

            if (CACHE[cacheKey] == null) {
                var arrParamVals = {};
                var arrParamFlds = [param_searchid , param_batchid , param_recordtype , param_folderId , param_disc_items , param_redemption_amt , param_sub_item];

                var currentScript = runtime.getCurrentScript ();

                arrParamFlds.forEach (function ( paramField ) {
                    arrParamVals[paramField] = currentScript.getParameter ({ name: paramField });
                    return 1;
                });

                CACHE[cacheKey] = arrParamVals;
            }

            log.debug (logTitle , '** Script Parameters: ' + JSON.stringify (CACHE[cacheKey]));

            return CACHE[cacheKey];
        };

        return EndPoint;
    });
