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
 * Send To WMS Sales Order
 *
 * Version    Date            Author        Remarks
 * 1.0        11/22/2016      redelacruz    converted scheduled to map reduce
 * 1.1        01/03/2017      Rajivegandhi  Item Description as per the Customer's locale preference (eg: french item discription). Ref: /*Mca172*./ marked lines
 */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/record', 'N/runtime', 'N/http', 'N/search', './NSUtil', './oauthv2', 'N/error','N/task','./LibJsonRequest'],
        
/**
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 * @param {Object} nsutil
 * @param {error} error
 */
function(record, runtime, http, search, NSUtil, NSAuth, error, task, libJsonReq) {
    var EndPoint = {}, CACHE = {}, Helper = {}, PARAM = {};
    var runCount = 0;
    var maxRunTime = 15 * 1000 * 60; 
    var startTime = (new Date()).getTime();
    var MAXRESULTS = 100;
    var MAXBATCHORDER = 5;
    var STATUS_PENDINGFULFILLMENT = 'SalesOrd:B';
    
    var HTTP_ERROR_CODES = {
            '400': 'Bad request:The request could not be understood by the server due to malformed syntax. ',
            '401': 'Unauthorized: The request requires user authentication',
            '403': 'Forbidden: Failed to authenticate the request',
            '404': 'Not Found: Resource not found.',
            '405': 'Method Not Allowed.',
            '406': 'Not Acceptable.',
            '407': 'Proxy Authentication Required',
            '408': 'Request Timeout',
    };
    
    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }
    
    EndPoint.getInputData = function ()
    {
        try
        {
            var currentScript = runtime.getCurrentScript();
            var logTitle = ['SendToWMS_SO', 'getInputData',currentScript.deploymentId, runCount].join(':');
            var deltaTime = (new Date()).getTime() - startTime; 
            log.debug(logTitle, '**START SCRIPT**: ' + JSON.stringify([deltaTime, maxRunTime]) );
            
            Helper.getScriptParameters();
            log.debug(logTitle, '>>PARAM :' + JSON.stringify(PARAM)); 
            
            var arrPendingBatches = [];
            var arrOrdersToProcess = [];
            var arrPendingBatchesToProcess = [];
            
            //run this when invoked from UE trigger script
            if ( PARAM.batchId )
            {
                // generate a hash value
                var hashValue = [(new Date()).getTime().toString(),getRandomInt(0,100000000)].join(':');
                log.debug(logTitle, '.. hash value: ' + hashValue);

                // get the next batch id one by one //
                arrPendingBatchesToProcess = Helper.getNextBatchIds(PARAM.searchId, MAXRESULTS);
                if (! arrPendingBatchesToProcess || !arrPendingBatchesToProcess.length)
                {
                    // exit .. no orders to process
                    log.debug(logTitle, '** No Pending Batches to Process');
                    //return true;
                }

                arrPendingBatchesToProcess.forEach(function(batchId){                        
                    //regina - 11/17 - try catch to be sure the status hasn't been changed by another deployment. trigger xedit of beforesubmit script
                    try
                    {
                        record.submitFields({
                            type : 'customrecord_sears_webrequest_batch',
                            id : batchId,
                            values :{ custrecord_batchwebreq_status : 'INPROCESS-APIGEE',
                                      custrecord_batchwebreq_hashvalue : hashValue
                                    }
                        });
                
                        arrPendingBatches.push(batchId);
                    }
                    catch(errorSave)
                    {
                        var stMsg = (errorSave.message != undefined) ? errorSave.name + ' ' + errorSave.message : errorSave.toString();
                        log.debug(logTitle, '--Error flaging to INPROCESS-APIGEE batch id = '+batchId + ',msg = ' + stMsg);
                    }                    
                });
                
                log.audit(logTitle, '.. arrPendingBatches: ' + arrPendingBatches.length);

                if (arrPendingBatches && arrPendingBatches.length)
                {                 
                    //regina - 12/20 - fix to filter closed orders, must run for sales roder status=B pending fulfillment   
                    var arrPendingOrders = NSUtil.searchAll({
                        recordType: 'salesorder',
                        filterExpression: [
                           ['mainline','is','T'],'AND',
                           ['status','anyof',STATUS_PENDINGFULFILLMENT],'AND',
                           ['custbody_sears_webrequest_batch.custrecord_batchwebreq_hashvalue','is',hashValue],'AND',
                           ['custbody_sears_webrequest_batch','anyof',arrPendingBatches]
                        ],
                        columns: [ search.createColumn({name:'custbody_sears_webrequest_batch'}),
                                   search.createColumn({name:'custrecord_batchwebreq_hashvalue', join:'custbody_sears_webrequest_batch'}),
                                   search.createColumn({name:'internalid'}) ]
                    });

                    if (arrPendingOrders && arrPendingOrders.length)
                    {
                        arrPendingOrders.forEach(function(row){
                            var internalId = row.getValue({name:'internalid'});
                            if (! NSUtil.inArray(internalId, arrOrdersToProcess)){
                                arrOrdersToProcess.push(internalId);
                            }
                            return true;
                        });
                    }
                }
            }
            //run this when invoked from scheduled deployment
            else
            {
                arrOrdersToProcess = Helper.getPendingOrders(PARAM.searchId);
            }            
            
            log.debug(logTitle, '--arrOrdersToProcess = ' + arrOrdersToProcess.join(','));
            log.debug(logTitle, '--arrOrdersToProcess.length = ' + arrOrdersToProcess.length);
            
            //order results will be sent to reduce by batches/chunks
            var arrOrdersByBatch = [];
            
            var arrOrderBatch = [];
            for (var i = 0; i < arrOrdersToProcess.length; i++)
            {
                arrOrderBatch.push(arrOrdersToProcess[i]);                    
                if (arrOrderBatch.length == PARAM.maxOrderBatch) 
                {
                    arrOrdersByBatch.push(arrOrderBatch);
                    var arrOrderBatch = [];
                }
            }            
            if (arrOrderBatch.length > 0) 
            {
                arrOrdersByBatch.push(arrOrderBatch);                
            }
            
            log.debug(logTitle, '--arrOrdersByBatch = ' + JSON.stringify(arrOrdersByBatch));
            log.debug(logTitle, '--arrOrdersByBatch.length = ' + arrOrdersByBatch.length);
            
            return arrOrdersByBatch;
        }
        catch (e)
        {
            if (e.message != undefined)
            {
                log.error('ERROR' , e.name + ' ' + e.message);
                throw e.name + ' ' + e.message;
            }
            else
            {
                log.error('ERROR', 'Unexpected Error' , e.toString()); 
                throw error.create({
                    name: '99999',
                    message: e.toString()
                });
            }
            
        }
    };
    
    
    EndPoint.reduce = function (reduceContext)
    {
        var currentScript = runtime.getCurrentScript();
        var logTitle = ['SendToWMS_SO::reduce', currentScript.deploymentId, runCount].join(':');
        var deltaTime = (new Date()).getTime() - startTime; 
        
        try
        {
            var intIteration = reduceContext.key  
            log.debug(logTitle, "intIteration: " + intIteration);
            
            Helper.getScriptParameters();
            log.debug(logTitle, '>>PARAM :' + JSON.stringify(PARAM)); 
            
            //in reduce, the sales orders will be grouped by location and for each location, it will send it to wms
            
            var arrSendtoWMS = {};
            var arrPendingBatches = [];
             
            reduceContext.values.forEach(function(contextValue){
                
                var arrSalesOrderId = JSON.parse(contextValue);
                log.debug(logTitle, "["+intIteration+"] Processing Sales Order #s = " + JSON.stringify(arrSalesOrderId));
                
                var arrSendtoWMS = {};
                 
                for(var i = 0; i < arrSalesOrderId.length; i++)
                {
                    try
                    {
                        var stSalesOrderId = arrSalesOrderId[i];
                        log.debug(logTitle, "["+intIteration+"] Processing Sales Order = " + stSalesOrderId);
                    
                        // load the sales order
                        var recObj = Helper.loadRecord({type:'salesorder', id:stSalesOrderId});

                        if (!recObj) return true;
                        
                        var stBatchId = recObj.getValue({fieldId:'custbody_sears_webrequest_batch'});                       
                        if (!NSUtil.isEmpty(stBatchId) && !NSUtil.inArray(stBatchId, arrPendingBatches) )
                        {
                            //write the batch id to summary
                            reduceContext.write(stBatchId);   
                        }
                                                
                        var arrHeaderData = Helper.extractRecordData(recObj);
                        var arrLineData = Helper.extractLineData(recObj);
        
                        log.debug(logTitle, '... header Data: ' + JSON.stringify(arrHeaderData));
                        log.debug(logTitle, '... line Data: ' + JSON.stringify(arrLineData));
        
                        /*
                         * the line data are grouped by location
                         * {
                         *      'locationId01':
                         *      {
                         *          name: 'Location Name 01',
                         *          lines: [
                         *              {lineData:line01},
                         *              {lineData:line02},
                         *              {lineData:line03}
                         *          ]
                         *      }
                         * }
                         */
                        for (var locationId in arrLineData)
                        {
                            var locationData = arrLineData[locationId];
        
                            if (! arrSendtoWMS[locationId])
                            {
                                arrSendtoWMS[locationId] = {salesOrders:[]};
                            }
        
                            var orderData = JSON.parse( JSON.stringify(arrHeaderData) );
        
                            orderData.location = locationData.name;

                            orderData.items = locationData.lines;
        
                            // set the header shipdate from line level
                            orderData.shipdate = locationData.lines[0] ? locationData.lines[0].custcol_ship_date : '';
        
                            arrSendtoWMS[locationId].salesOrders.push(orderData);
                        }
                        
                    }
                    catch(err)
                    {
                        var stMsg = (err.message != undefined) ? err.name + ' ' + err.message : err.toString();
                        log.debug(logTitle, '--Error order id = '+stSalesOrderId+ ',msg = ' + stMsg);
                    }
                }
                
                
                log.debug(logTitle, '.. arrSendtoWMS: ' + JSON.stringify(arrSendtoWMS));

                ////////////////
                for (var locationId in arrSendtoWMS)
                {
                    var url = (PARAM.locationSCI == locationId)  ? PARAM.urlSCI : PARAM.urlLogfire;
                    var requestData = arrSendtoWMS[locationId].salesOrders;
                    
                    // ADD CMARGALLO 11/3 START
                    if (requestData) {
                    // ADD CMARGALLO 11/3 END
                        requestData = {'salesOrders': requestData};

                        log.audit(logTitle, '** REQUEST: location:' + locationId);
                        log.audit(logTitle, '** REQUEST: url:' + url);
                        log.audit(logTitle, '** REQUEST: Data:' + JSON.stringify(requestData));

                        var response = Helper.sendToWMS(JSON.stringify(requestData), url);
                        log.audit(logTitle, '** RESPONSE: ' + JSON.stringify(response));

                        arrSendtoWMS[locationId].response = response;
                    }
                }
                
                ////////////////
                for(var i = 0; i < arrSalesOrderId.length; i++)
                {
                    try
                    {
                        var stSalesOrderId = arrSalesOrderId[i];
                        log.debug(logTitle, "["+intIteration+"] Processing Sales Order = " + stSalesOrderId);
                    
                        // load the sales order
                        var recObj = Helper.loadRecord({type:'salesorder', id:stSalesOrderId});
                        log.debug(logTitle, "["+intIteration+"] Loaded Sales Order = " + JSON.stringify([recObj]));
                        
						if (!recObj) return true;
                        
						log.debug(logTitle, "["+intIteration+"] Loaded Sales Order = " + JSON.stringify([recObj]));
                        
						var stBatchId = recObj.getValue({fieldId:'custbody_sears_webrequest_batch'});                       
                        if (!NSUtil.isEmpty(stBatchId) )
                        {
                            //write the batch id to summary
                            reduceContext.write(stBatchId);   
                        }
                        
                        var arrLocationLines = Helper.extractValidLines(recObj);
        
                        for (var locationId in arrLocationLines)
                        {
                            log.debug(logTitle, '..stSalesOrderId = '+ stSalesOrderId + ',locationId = ' + locationId );
							
							if( !NSUtil.isEmpty(arrSendtoWMS[locationId]) )
                            {
                                var locationResponse = arrSendtoWMS[locationId].response;
                                var arrLines = arrLocationLines[locationId];
                                log.debug(logTitle, '..stSalesOrderId = '+ stSalesOrderId + ',locationId = ' + locationId + '.. lines/response: ' + JSON.stringify([arrLines, locationResponse]));
        
                                arrLines.forEach(function(line)
                                {
                                    try
                                    {
                                        // first clear all //
                                        recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_apigee',value: false ,line : line});
                                        recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_errormsg',value: '',line : line});
                                        recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_error_sending_chk',value: false,line : line});
                                        recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_wms_timestamp',value: null,line : line});
                                        recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_seconds',value: null,line : line});
                                        var apigeeResponse = locationResponse.RESPONSE;
                                        var failOrdersResponseArray = null;
                                        var apigeeResponseCode = null;
                                        if(!NSUtil.isEmpty(apigeeResponse)){
                                            apigeeResponse = JSON.parse(apigeeResponse);
                                            failOrdersResponseArray= apigeeResponse.orders;
                                            apigeeResponseCode = apigeeResponse.code;
        
                                        }
                                        
                                        if (locationResponse.CODE == '200' && apigeeResponseCode=='200')
                                        {
                                            recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_apigee',value: true,line : line});
                                            recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_wms_timestamp',value: locationResponse.TIME_END,line : line});
                                            recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_seconds',value: locationResponse.DELTA_TIME,line : line});
                                        }
                                        else
                                        {
                                            if( NSUtil.isEmpty(failOrdersResponseArray)){
                                                recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_errormsg',value: [locationResponse.ERROR_CODE, locationResponse.ERROR_MSG].join(':') ,line : line});
                                                recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_error_sending_chk',value: true,line : line});
                                                recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_wms_timestamp',value: locationResponse.TIME_END,line : line});
                                                recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_seconds',value: locationResponse.DELTA_TIME,line : line});
                                            }else{
                                                var lineLocationText    = recObj.getSublistValue({sublistId : 'item',fieldId : 'location_display',line : line});
                                                var lineNum             = recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_line_id',line : line});
                                                var orderExternalID = recObj.getValue({fieldId : 'externalid'});
                                                var matchFound = false;
                                                failOrdersResponseArray.forEach(function(arrayObj){
                                                   // var arrayObj = failOrdersResponseArray[arrLine];
                                                    log.audit(logTitle, '** Checking:'+ JSON.stringify(arrayObj) );
                                                    log.audit(logTitle, '** Checking:'+ arrayObj );
                                                    //log.debug( 'failOrdersResponseArray[arrLine][orderExternalID]' ,arrayObj[orderExternalID])
                                                    var matchOrderExternalID = arrayObj[orderExternalID];
                                                    if(!NSUtil.isEmpty(matchOrderExternalID)){
                                                        if(lineLocationText==matchOrderExternalID.location){
                                                            if (matchOrderExternalID.linenums.indexOf(lineNum) != -1) {
                                                                recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_errormsg',value: [apigeeResponseCode, matchOrderExternalID.message].join(':') ,line : line});
                                                                recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_error_sending_chk',value: true,line : line});
                                                                recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_wms_timestamp',value: locationResponse.TIME_END,line : line});
                                                                recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_seconds',value: locationResponse.DELTA_TIME,line : line});
                                                                matchFound =true;
                                                            }
                                                        }
                                                    }
        
                                                });
                                                if(matchFound==false){
                                                    recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_apigee',value: true,line : line});
                                                    recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_sent_to_wms_timestamp',value: locationResponse.TIME_END,line : line});
                                                    recObj.setSublistValue({sublistId : 'item',fieldId : 'custcol_wms_sending_seconds',value: locationResponse.DELTA_TIME,line : line});
                                                }
                                            }
                                        }
                                    }
                                    catch(errline)
                                    {
                                        var stMsg = (errline.message != undefined) ? errline.name + ' ' + errline.message : errline.toString();
                                        log.debug(logTitle, '>>>Error order id = '+stSalesOrderId+ ', skip line = '+ line+ ', msg = ' + stMsg);
                                    }
                                });
                            }
                        }
                        
                        try 
                        {
                             var stSalesOrderId = recObj.save();
                             log.debug(logTitle,'## Update Sales Order ID: ' + stSalesOrderId);
                        }
                        catch(err)
                        {
                            var stMsg = (err.message != undefined) ? err.name + ' ' + err.message : err.toString();
                            log.debug(logTitle, '##Error order id = '+stSalesOrderId+ ',msg = ' + stMsg);
                        }
                            
                        log.debug(logTitle, "["+intIteration+"] Completed Processing Sales Order: " + stSalesOrderId);     
                        
                        
                    }
                    catch(err)
                    {
                        var stMsg = (err.message != undefined) ? err.name + ' ' + err.message : err.toString();
                        log.debug(logTitle, '--Error order id = '+stSalesOrderId+ ',msg = ' + stMsg);
                    }
                }
                
                
                            
                return true;
            });
            
            return true;
        }
        catch (e)
        {
            if (e.message != undefined)
            {
                log.error('ERROR' , e.name + ' ' + e.message);
                throw e.name + ' ' + e.message;
            }
            else
            {
                log.error('ERROR', 'Unexpected Error' , e.toString()); 
                throw error.create({
                    name: '99999',
                    message: e.toString()
                });
            }
            
        }
    };
    
    EndPoint.summarize = function(summary)
    {
        var currentScript = runtime.getCurrentScript();
        var logTitle = ['BatchRequestProcess::summarize', currentScript.deploymentId, runCount].join(':');
        
        try
        {
            Helper.getScriptParameters();
            log.debug(logTitle, '>>PARAM :' + JSON.stringify(PARAM)); 
                
            summary.output.iterator().each(function(key, value) {
                try
                {
                    libJsonReq.validateBatchStatus(key);
                }
                catch(err)
                {
                    var stMsg = (err.message != undefined) ? err.name + ' ' + err.message : err.toString();
                    log.debug(logTitle, '--Error validateBatchStatus for batchId id = '+key+ ',msg = ' + stMsg);
                }          
                return true;
            });
            
            
            if (PARAM.batchId)
            {
                // get a new pending batches
                var arrQueuedBatches = Helper.getQueuedBatches(100);
                log.audit(logTitle,'## Queued Batches: ' + JSON.stringify(arrQueuedBatches));
                if (arrQueuedBatches && arrQueuedBatches.length)
                {
                    arrQueuedBatches.forEach(function(batchId){
                        record.submitFields({
                            type : 'customrecord_sears_webrequest_batch',
                            id : batchId,
                            values :{ custrecord_batchwebreq_status : 'PENDING-APIGEE', custrecord_batchwebreq_hashvalue : null}
                        });
                    });
                }
            }            
        }
        catch (e)
        {
            if (e.message != undefined)
            {
                log.error('ERROR' , e.name + ' ' + e.message);
                throw e.name + ' ' + e.message;
            }
            else
            {
                log.error('ERROR', 'Unexpected Error' , e.toString()); 
                throw error.create({
                    name: '99999',
                    message: e.toString()
                });
            }
            
        }

        log.debug('****  END OF SCRIPT ****');
    };
    
    
    function getActiveDeployments(script_id) {
        var arrDeployments = [];
        var arrSearch = NSUtil.searchAll({
            recordType : 'scriptdeployment',
            columns : [ 'scriptid' ],
            filterExpression : [
                    [ 'script.scriptid', 'is', script_id ], 'AND',
                    [ 'isdeployed', 'is', true ], 'AND',
                    [ 'status', 'anyof', 'NOTSCHEDULED' ]
                ]
        });
        
        arrSearch.forEach(function(row) {
            arrDeployments.push({
                id: row.id,
                name: row.getValue({name : 'scriptid'})
            });
        });
        
        return arrDeployments;
    }
    
    
    function getNextBatches(numLines)
    {
        var maxLines = parseFloat(numLines || '200');
        
        var currentScript = runtime.getCurrentScript();
        var stParamSearch = currentScript.getParameter({name: 'custscript_pending_init_batch'});

        return NSUtil.searchAll({'id': stParamSearch,maxResults:maxLines});
    }
    
    /**
     * @memberOf Helper
     */
    Helper.sendToWMS = function(stRequest, stURL)
    {
        var logTitle = 'Helper.sendToWMS';

        var returnResult = {
            SENT_TO_WMS: false,
            CODE: null,

            ERROR_CODE: null,
            ERROR_RAWMSG: null,
            ERROR_MSG: null,

            SENT_TO_WMS_TIME: null,
            TIME_START: (new Date()),
            TIME_END: null,
            DELTA_TIME: null,

            RESPONSE: null,
            REQUEST: null
        };

        try
        {
            if (! stRequest ) throw "Empty request data";
                       
            //regina - 11/15 - use customrecord for credentials
            var arrTokenAuth = libJsonReq.getCredentialConfig('sendToWMS');
            
            //log.debug(logTitle, '>>arrTokenAuth: ' + JSON.stringify(arrTokenAuth));
            if (!arrTokenAuth)
            {
                returnResult.ERROR_CODE = 'E110';
                returnResult.ERROR_RAWMSG = 'Invalid token settings';
                returnResult.ERROR_MSG = 'Invalid token settings';
                throw 'Invalid Token Settings!';
            }

            //user objToken
            var objToken = {
                public: arrTokenAuth.TOKEN_KEY,
                secret: arrTokenAuth.TOKEN_SECRET
            };

            //app credentials
            var objOauth = NSAuth.authenticate({
                consumer :
                {
                    public : arrTokenAuth.CONSUMER_KEY,
                    secret : arrTokenAuth.CONSUMER_SECRET
                },
                signature_method : 'HMAC-SHA1'
            });
            //log.debug(logTitle, '>> nsauth: ' + JSON.stringify([objToken, objOauth]));

            var objRequestData = {url: stURL,method: 'POST',data: {} };

            var objOauth_data = {
                objOauth_consumer_key: objOauth.consumer.public,
                objOauth_nonce: objOauth.getNonce(),
                objOauth_signature_method: objOauth.signature_method,
                objOauth_timestamp: objOauth.getTimeStamp(),
                objOauth_version: '1.0',
                objOauth_token: objToken.public
            };

            var objHeaderWithRealm = objOauth.toHeader(objOauth.authorize(objRequestData, objToken));
            objHeaderWithRealm.Authorization += ',realm= " " ';

            //HTTP headers
            var objHeaders = new Array();
            objHeaders['Content-Type'] = 'application/json';
            objHeaders['Authorization'] = objHeaderWithRealm.Authorization;

            var objResponse = null;

            try
            {
                log.audit('### sendObjToURL: Request', '### PAYLOAD Size: ' + stRequest.length + ' chars  ###');
                returnResult.TIME_START  = new Date();

                objResponse = http.request({
                    method: 'POST',
                    url: stURL,
                    body: stRequest,
                    headers: objHeaders
                });
                returnResult.TIME_END = new Date();
                returnResult.DELTA_TIME = returnResult.TIME_END - returnResult.TIME_START;

                if (objResponse)
                {
                    returnResult.SENT_TO_WMS = true;
                    returnResult.CODE = objResponse.code;
                    returnResult.RESPONSE =  objResponse.body;

                    if ( objResponse.code != 200)
                    {
                        returnResult.ERROR_CODE = objResponse.code;
                        returnResult.ERROR_MSG = HTTP_ERROR_CODES[objResponse.code] || objResponse.body;
                    }
                }
            }
            catch (wmserr)
            {
                log.error(logTitle, wmserr.toString() );

                returnResult.CODE          = returnResult.CODE || 'E120';
                returnResult.ERROR_CODE    = returnResult.ERROR_CODE || 'E120';
                returnResult.ERROR_RAWMSG  = returnResult.ERROR_RAWMSG || JSON.stringify(wmserr);
                returnResult.ERROR_MSG     = returnResult.ERROR_MSG || wmserr.toString();
            }
        }
        catch(error)
        {
            log.error(logTitle, error.toString() );

            returnResult.CODE          = returnResult.CODE || 'E120';
            returnResult.ERROR_CODE    = returnResult.ERROR_CODE || 'E120';
            returnResult.ERROR_RAWMSG  = returnResult.ERROR_RAWMSG || JSON.stringify(error);
            returnResult.ERROR_MSG     = returnResult.ERROR_MSG || error.toString();
        }

        log.audit(logTitle, JSON.stringify(returnResult));
        return returnResult;
    };


    /**
     * @memberOf Helper
     */
    Helper.extractRecordData = function (recObj)
    {
        if (! recObj) return false;

        var objRecordData = {};

        var arrListFieldsToSync = [
            'internalid', 'externalid', 'entity','tranid', 'otherrefnum', 'location', 'trandate','shipmethod', 'source',
            'billaddressee', 'billaddr1', 'billaddr2', 'billcity', 'billstate', 'billzip','billcountry', 'billphone',
            'shipaddressee', 'shipaddr1', 'shipaddr2', 'shipcity', 'shipstate', 'shipzip', 'shipcountry', 'shipphone',
            'custbody_phone_shipping','custbody_phone_billing','custbody_phone_wms','custbody_gift_message',
            'custbody_loyalty_number','custbody_email','custbody_email_opt_in','custbody_ship_to_store','email',
            'otherrefnum'
            //'shipdate', 'custbody_ship_date',
        ];

        var arrTextFields = ['location','entity','shipmethod'];

        var objBillAddrFields =
        {
            'billaddressee' : 'addressee',
            'billaddr1' : 'addr1',
            'billaddr2' : 'addr2',
            'billcity' : 'city',
            'billstate' : 'state',
            'billzip' : 'zip',
            'billcountry' : 'country',
            'billphone' : 'phone',
        };

        var objShipAddrFields =
        {
            'shipaddressee' : 'addressee',
            'shipaddr1' : 'addr1',
            'shipaddr2' : 'addr2',
            'shipcity' : 'city',
            'shipstate' : 'state',
            'shipzip' : 'zip',
            'shipcountry' : 'country',
            'shipphone' : 'phone'
        };

        arrListFieldsToSync.forEach(function(fieldId){
            var objFieldValue = null;

            if (fieldId == 'internalid')
            {
                objFieldValue = recObj.id;
            }
            else if (fieldId.match(/phone/i))
            {
                objFieldValue = recObj.getValue({fieldId : fieldId});
                if (objFieldValue)
                {
                    objFieldValue = objFieldValue.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
                }
            }
            else if (objBillAddrFields[fieldId] || objShipAddrFields[fieldId])
            {
                var addressId = null, addressField = null;

                if (objBillAddrFields[fieldId])
                {
                    addressId = recObj.getValue({fieldId : 'billingaddress'});
                    addressField = objBillAddrFields[fieldId];
                }
                else if (objShipAddrFields[fieldId])
                {
                    addressId = recObj.getValue({fieldId : 'shippingaddress'});
                    addressField = objShipAddrFields[fieldId];
                }
                if (addressId)
                {
                    var cacheKey = ['address', addressId].join('::');
                    if (CACHE[cacheKey] == null)
                    {
                        CACHE[cacheKey] = Helper.loadRecord({type:'address',id:addressId});
                    }
                    if (CACHE[cacheKey])
                    {
                        objFieldValue = CACHE[cacheKey].getValue({fieldId:addressField});
                    }
                }
            }

            if (!objFieldValue)
            {
                if (NSUtil.inArray(fieldId,arrTextFields) )
                {
                    objFieldValue = recObj.getText({fieldId : fieldId});
                }
                else
                {
                    objFieldValue = recObj.getValue({fieldId : fieldId});
                }
            }

            objRecordData[fieldId] = objFieldValue;
        });

        return objRecordData;
    };

    /**
     * @memberOf Helper
     */
    Helper.extractValidLines = function (recObj)
    {
        var arrLines = {};
        var lineCount = recObj.getLineCount({sublistId : 'item'});

        for (var line = 0; line <= lineCount; line ++)
        {
            var isProcessed = recObj.getSublistValue({sublistId : 'item', fieldId : 'custcol_sent_to_apigee',line : line});
            var isBigTicket = recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_bigticket',line : line});

            if (isProcessed || isBigTicket) continue;

            var lineItemType        = recObj.getSublistValue({sublistId : 'item',fieldId : 'itemtype',line : line});
            var lineItem            = recObj.getSublistValue({sublistId : 'item',fieldId : 'item',line : line});
            var lineIsFulfillable   = recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_isfulfillable',line : line});
            var lineLocation        = recObj.getSublistValue({sublistId : 'item',fieldId : 'location',line : line});
            var lineLocationText    = recObj.getSublistText({sublistId : 'item',fieldId : 'location',line : line});
            
            if (lineItemType == 'InvtPart' || (lineItemType == 'Service' && lineIsFulfillable))
            {
                if (!arrLines[lineLocation] ) arrLines[lineLocation] = [];
                arrLines[lineLocation].push(line);
            }
        }

        return arrLines;
    };


    /**
     * @memberOf Helper
     */
    Helper.extractLineData = function (recObj)
    {
        if (! recObj) return false;

        var objLineData = {};

        var arrListLineitemFieldsToSync = [
            'custcol_searsitemname','item', 'itemid','externalid', 'item_display', 'displayname',
            'description', 'custcol_isgiftcard','custcolfrench_item_desc','rate', 'quantity', 'amount','custcol_line_id','location' , 'location_display' , 'custcol_messagetothereceiver',
            'custcol_va001_gift_box', 'custcol_va002_gift_wrap','custcol_va003_gift_card', 'custcol_va004_monogrmming',
            'custcol_va005_dryer_hookup_top_fr_ld','custcol_va005_dryer_hookup_top_fr_ld',
            'custcol_va007_fridge_door_swing_chang','custcol_va008_front_load_washer_hooku',
            'custcol_va009_home_delivery_service','custcol_va010_home_deli_service_weeke',
            'custcol_va011_mattress_pickup','custcol_va012_pedestal_install_per_pa',
            'custcol_va013_time_spec_within_del_wi','custcol_va014_take_away_scrap_applian',
            'custcol_va016_top_load_washer_hookup','custcol_va017_tractor_snowblower_asse',
            'cust_name','custcol_ship_date',
            'custcol_va018_stacking_kit_install','custcol_va019_store_stock_delivery', 'custcol_externalid' ];

        var arrListItemFieldsToSync = ['externalid'];

        var lineCount = recObj.getLineCount({sublistId : 'item'});

        for (var line = 0; line < lineCount; line ++)
        {
            var lineData = {};
            var isProcessed = recObj.getSublistValue({sublistId : 'item', fieldId : 'custcol_sent_to_apigee',line : line});
            var isBigTicket = recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_bigticket',line : line});

            lineData.line = line;

            if (isProcessed || isBigTicket) continue;

            var lineItemType        = recObj.getSublistValue({sublistId : 'item',fieldId : 'itemtype',line : line});
            var lineItem            = recObj.getSublistValue({sublistId : 'item',fieldId : 'item',line : line});
            var lineIsFulfillable   = recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_isfulfillable',line : line});
            var lineLocation        = recObj.getSublistValue({sublistId : 'item',fieldId : 'location',line : line});
            var lineLocationText    = recObj.getSublistText({sublistId : 'item',fieldId : 'location',line : line});
            log.debug ("extractLineData " , '..  lineLocationText ' +  lineLocationText );
            var lineItemExternalId  = recObj.getSublistValue({sublistId : 'item',fieldId : 'custcol_externalid',line : line});
            var lineLocationAutoAssigned    = recObj.getSublistValue({sublistId : 'item',fieldId : 'locationautoassigned',line : line});
            var lineQuantityBackOrderd  = recObj.getSublistValue({sublistId : 'item',fieldId : 'quantitybackordered',line : line});

            if(! (lineItemType == 'InvtPart' || (lineItemType == 'Service' && lineIsFulfillable)) ||   NSUtil.isEmpty(lineLocation) || NSUtil.isEmpty(lineItemExternalId) || NSUtil.forceFloat(lineQuantityBackOrderd)>0 )
            {
                log.debug('extractLineData', 'Skipping Line: ' + line);

                log.debug('extractLineData','Expression '+lineItemType + ': ' + lineItemType +' Fulfillable: '+ lineIsFulfillable
					+ '--' + 'NSUtil.isEmpty(lineLocation)'+lineLocation + ': ' + NSUtil.isEmpty(lineLocation)
					+ '--' + ' NSUtil.isEmpty(lineItemExternalId'+lineItemExternalId + ': ' +  NSUtil.isEmpty(lineItemExternalId)
					+ '--' + 'NSUtil.forceFloat(lineQuantityBackOrderd)>0'+lineQuantityBackOrderd + ': ' + NSUtil.forceFloat(lineQuantityBackOrderd)>0);

                continue;
            }

            //var locale = recObj.getText({fieldId:'custbody_locale'});
/*Mca172*/
            var customerObj = Helper.loadRecord({type: 'customer', id: recObj.getValue('entity')});
            var locale = customerObj.getValue({fieldId: 'language'});
            log.debug('LOCALE::CUSTOMER LOCALE', locale);
/*Mca172*/     
            arrListLineitemFieldsToSync.forEach(function(lineField) {
                var lineValue = recObj.getSublistValue({sublistId : 'item', fieldId : lineField, line : line});
/*Mca172*/      log.debug('LOCALE::lineValue, lineField', lineValue + ', ' + lineField);

                if (lineValue)
                {
                    if (lineField == 'custcol_searsitemname' && (locale == 'en_CA' || locale == ''))
                    {
                        lineData['item'] = lineValue;
                        log.debug('extractLineData', 'englishlocale:' + lineValue);
                    }
                    else if (lineField == 'custcolfrench_item_desc' && locale == 'fr_CA')
                    {
                        lineData['item'] = lineValue;
                        log.debug('extractLineData', 'frenchlocale:' + lineValue);
                    }
                    else if (lineField == 'itemid')
                    {
                        lineData['item_itemid'] = lineValue;
                    }
                    else if (lineField == 'item')
                    {
                        lineData['iteminternalid'] = lineValue;
                    }
/*Mca172*/          else if (lineField == 'description' && locale == 'fr_CA')
                    {
                        var itemId = recObj.getSublistValue({sublistId : 'item', fieldId : 'item', line : line});

                        if(!NSUtil.isEmpty(itemId)){
                            var fields = search.lookupFields({
                                type: 'inventoryitem',
                                id: itemId,
                                columns: ['custitem_french_item_desc']
                            });

                            lineData['description'] = fields.custitem_french_item_desc;
                            log.debug('LOCALE::description:', lineData['description']);
                        }
/*Mca172*/          }
                    else
                    {
                        lineData[lineField] = lineValue;
                    }
                }
            });

            var cacheKey = ['itemdata', lineItem].join(':');
            if (CACHE[cacheKey] == null )
            {
                CACHE[cacheKey] = search.lookupFields({type:'item',id:lineItem, columns:arrListItemFieldsToSync});
            }
            var lineItemData = CACHE[cacheKey];
            log.debug('extractLineData', 'lookupItems:' + JSON.stringify(lineItemData));
            arrListItemFieldsToSync.forEach(function(itemField){
                var itemValue =lineItemData[itemField];
                log.debug('extractLineData', 'lookupItems-itemValue: ' + JSON.stringify([itemField, itemValue]));
                if (itemField == 'externalid')
                {
                    lineData['itemid'] = itemValue[0].value || itemValue.value || itemValue;
                }
                else
                {
                    lineData[itemField] = itemValue;
                }

                return true;
            });
          lineData['location_display'] = lineLocationText;
           objLineData[lineLocation] = {name:lineLocationText, lines:[]};
           objLineData[lineLocation].lines.push(lineData);
        }

        return objLineData;
    };


    /**
     * @memberOf Helper
     */
    Helper.loadRecord = function (option)
    {
        var logTitle = 'Helper.loadRecord';
        var cacheKey = ['Helper.loadRecord', option.type, option.id].join(':');

        log.debug(logTitle, '>>' + JSON.stringify([option, cacheKey]) );
        if (CACHE[cacheKey] == null )
        {
            CACHE[cacheKey] = record.load(option);
            if (!CACHE[cacheKey])
            {
                CACHE[cacheKey] = false;
            }
        }

        return CACHE[cacheKey];
    };


    /**
     * get the script parameters
     *
     * @param {Object} context
     * @memberOf Helper
     */
    Helper.getScriptParameters = function ()
    {
        var logTitle = 'Helper.getScriptParameters';
        var paramFlds = {
                searchId: 'custscript_mr_send_wms_order_search',
                searchIdPending: 'custscript_mr_send_wms_order_queuebatch',
                batchId: 'custscript_mr_send_wms_batchid',
                urlLogfire: 'custscript_mr_sendso_bigurl',
                urlSCI: 'custscript_mr_sendso_regurl',
                locationSCI : 'custscript_mr_sendso_sci_location',
                shipDateAdj: 'custscript_mr_big_item_shipping_date',
                maxOrderBatch : 'custscript_mr_send_wms_order_batch_max'
        };
        log.debug(logTitle, '>> paramFlds:  ' + JSON.stringify(paramFlds));

        for (var fld in paramFlds)
        {
            PARAM[fld] = runtime.getCurrentScript().getParameter(paramFlds[fld]);
        }
        if (PARAM.shipDateAdj)
        {
            PARAM.shipDateAdj = NSUtil.forceInt(PARAM.shipDateAdj);
        }
        
        PARAM.maxOrderBatch = NSUtil.forceInt(PARAM.maxOrderBatch);
        if(PARAM.maxOrderBatch == 0)
        {
            PARAM.maxOrderBatch  = MAXBATCHORDER;
        }
        
        log.debug(logTitle, '>> values:  ' + JSON.stringify(PARAM));

        return true;
    };

    /**
     * @memberOf Helper
     */
    Helper.getPendingOrders = function (searchId, maxResults)
    {
        var logTitle = 'Helper.getPendingOrders';
        var arrReturnVar = [];
        var arrSearchResults = NSUtil.searchAll({id:searchId, maxResults: maxResults});
        log.debug(logTitle, "ALL SEARCH RESULTS:"+JSON.stringify(arrSearchResults));

        if (arrSearchResults && arrSearchResults.length)
        {
            for (var i=0; i<arrSearchResults.length; i++)
            {
                var internalId = arrSearchResults[i].getValue({name:'internalid', summary:'GROUP'});
                if (! NSUtil.inArray(internalId, arrReturnVar))
                {
                    arrReturnVar.push(internalId);                    
                }
            }            
        }

        log.debug(logTitle, '>> values: ' + JSON.stringify(arrReturnVar) );

        return arrReturnVar;
    }

    /**
     * @memberOf Helper
     */
    Helper.getNextBatchIds = function (searchId, maxResult)
    {
        var logTitle = 'Helper.getNextBatchIds';

        var arrReturnVar = [];
        var arrSearchResults = NSUtil.searchAll({
            id: searchId,
            columns: [ search.createColumn({name:'custbody_sears_webrequest_batch', summary:search.Summary.GROUP}) ],
            maxResults: maxResult
        });

        if (arrSearchResults && arrSearchResults.length)
        {
            for (var i=0; i<arrSearchResults.length; i++)
            {
                var internalId = arrSearchResults[i].getValue({name:'custbody_sears_webrequest_batch', summary:search.Summary.GROUP});
                if (! NSUtil.isEmpty(internalId) && ! NSUtil.inArray(internalId, arrReturnVar))
                {
                    arrReturnVar.push(internalId);
                }
            }
        }

        log.debug(logTitle, '>> values: ' + JSON.stringify(arrReturnVar) );
        return arrReturnVar;
    };



    /**
     * @memberOf Helper
     */
    Helper.getQueuedBatches = function (maxResults)
    {
        var logTitle = 'Helper.getPendingBatches';
        var searchId = PARAM.searchIdPending;
        log.debug(logTitle, 'Search ID: ' + searchId);

        if (NSUtil.isEmpty(searchId)) return false;

        var arrReturnVar = [];
        var arrSearchResults = NSUtil.searchAll({id: searchId, maxResults: maxResults});

        log.debug(logTitle, '...search results: ' + arrSearchResults.length);

        if (!NSUtil.isEmpty(arrSearchResults))
        {
            arrSearchResults.forEach(function(rowResult){
                var batchId = rowResult.id;//getValue({name:'internalid'});

                if (!NSUtil.inArray(batchId, arrReturnVar) )
                {
                    arrReturnVar.push(batchId);
                }
            })
        }

        log.debug(logTitle, '...return value: ' + JSON.stringify(arrReturnVar) );

        return arrReturnVar;
    };
    return EndPoint;
});