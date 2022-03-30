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
 */
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       12 Aug 2016     brianff
 *
 */

var _REQUEST, _RESPONSE, _FORM, _PARAM = {};
var _CACHE = {};
var _CONTEXT = nlapiGetContext();

var FILTER_FIELDS = ['custpage_filterreceived','custpage_filterbatchstatus'];
var BATCH_STATUS = ['PENDING-CREATION','QUEUE-CREATION','INPROCESS-CREATION','FAILED-CREATION','SUCCESS-CREATION',
                    'PENDING-APIGEE', 'QUEUE-APIGEE','FAIL-SENDAPIGEE','SUCCESS-SENDAPIGEE'];

var GLOBAL_BATCHID = 412;

var DEFAULT_VALUES = {
        custpage_filterbatchstatus: 'PENDING-CREATION',
        custpage_filterreceived: nlapiDateToString(new Date())
};

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function suitelet_batchMonitor(request, response)
{
	var logTitle = 'Integration::Monitor';
	try
	{
		// get the act
		_PARAM.action = request.getParameter('action');
		
		FILTER_FIELDS.forEach(function(fieldId){
		    _PARAM[fieldId] =  (request.getParameter(fieldId) !== null) ? request.getParameter(fieldId) :  DEFAULT_VALUES[fieldId] || null;
			return true;
		});
		
		if (request.getMethod() == 'POST')
		{
			//PROCESS THE REQUEST
		    switch (_PARAM.action)
		    {
		        case 'updatePayload':
		            processUpdatePayload(request, response);
		            break;
		        case 'resendBatches':
		            processResendBatches(request, response);
		            break;
		    }
		}
		else
		{
   		    switch (_PARAM.action)
            {
                case 'viewPayload':
                    printViewPayLoad(request, response);
                    break;
                default:
                    printMainForm(request, response);
                    break;
            }
		}
		
		return true;
		
	}
	catch (error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error: ' + logTitle, error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error: ' + logTitle, error.toString());
			throw nlapiCreateError('99999', error.toString());
		}

		return true;
	}
	finally
	{
		
	}
}

function getBatchStatus()
{
    var arrStatus = [];
    
    var arrBatchStatusSearch = NSUtil.search('customrecord_sears_webrequest_batch', null,
                                        [(new nlobjSearchFilter('isinactive', null, 'is', 'F'))],
                                        [(new nlobjSearchColumn('custrecord_batchwebreq_status',null,'GROUP'))]);
    
    if (arrBatchStatusSearch && arrBatchStatusSearch.length)
    {
        arrBatchStatusSearch.forEach(function(row){
            arrStatus.push( row.getValue('custrecord_batchwebreq_status', null, 'group') );
        })
    }
    
    
    return arrStatus;
}


/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns
 */
function processResendBatches(request, response)
{
    var arrData = [];
    
    var lineCount = request.getLineItemCount('custpage_batchsublist');
    for (var line=1; line<=lineCount; line++)
    {
        var chkBox = request.getLineItemValue('custpage_batchsublist', 'custpage_check', line);
        var batchId = request.getLineItemValue('custpage_batchsublist', 'custpage_batchid', line);
        
        if (chkBox == 'T' && !NSUtil.inArray(batchId, arrData))
        {
            arrData.push(batchId);
        }
    }
    
    if (arrData.length > 0)
    {
        arrData.forEach(function(batchId){
            nlapiSubmitField('customrecord_sears_webrequest_batch', batchId, ['custrecord_batchwebreq_status','custrecord_batchwebreq_message'], ['PENDING-CREATION','']);
        });
        
//        var arrSearchBatches = nlapiSearchRecord('customrecord_sears_webrequest_batch', null, 
//                                    [(new nlobjSearchFilter('internalid', null, 'anyof', arrData))],
//                                    [ (new nlobjSearchColumn('custrecord_batchwebreq_status')),
//                                      (new nlobjSearchColumn('internalid'))
//                                    ]);
//        if (arrSearchBatches && arrSearchBatches.length)
//        {
//            arrSearchBatches.forEach(function(rowBatch){
//                var batchStatus = rowBatch.getValue('custrecord_batchwebreq_status');
//                var batchId = rowBatch.getValue('internalid');
//                
//                var resetStatus = '';
//                
//                if( batchStatus.match(/APIGEE/))
//                {
//                    resetStatus = 'PENDING-CREATION';
//                }
//                else if( batchStatus.match(/CREATION/))
//                {
//                    resetStatus = 'PENDING-CREATION';
//                }
//                
//                nlapiSubmitField('customrecord_sears_webrequest_batch', batchId, ['custrecord_batchwebreq_status'], [resetStatus]);
//            });
//        }
    }
    
    _FORM = nlapiCreateForm('Resend Batch Ids', true);
    _FORM.addField('custpage_innerhtml', 'inlinehtml')
        .setDefaultValue('Succesfully reset the batches...');
    _FORM.addButton('custpage_btngoback', 'Go Back', 'history.go(-1);');
    
    response.writePage(_FORM);
}


/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns
 */
function processUpdatePayload(request, response)
{
    var reqid = request.getParameter('reqid');
    var payloadContent = request.getParameter('custpage_payload');
    var batchId = request.getParameter('batchid');
    
    // validate the payload
    var validRequest = false;
    try {
        var parsedRequest = JSON.parse(payloadContent);
        validRequest = true;    
    }catch(err)
    {
        validRequest = false;
    }
    
    _FORM = nlapiCreateForm('Update Request', true);
    
    if (! validRequest )
    {
        _FORM.addField('custpage_innerhtml', 'inlinehtml')
        .setDefaultValue('ERROR: The payload you submitted is invalid. Please go back and validate the payload content by running them first on a JSON Lint or go to http://jsoneditoronline.org');
        _FORM.addButton('custpage_btngoback', 'Go Back', 'history.go(-1);');
    }
    else
    {
        nlapiSubmitField('customrecord_json_webrequest', reqid, 
                [ 'custrecord_jsonreq_content','custrecord_jsonreq_status', 'custrecord_jsonreq_messsage' ], 
                [ payloadContent, '1', '']);
        
        nlapiSubmitField('customrecord_sears_webrequest_batch', batchId, 
                ['custrecord_batchwebreq_status','custrecord_batchwebreq_message'], ['PENDING-CREATION','']);        
        
        _FORM.addField('custpage_innerhtml', 'inlinehtml')
        .setDefaultValue('Updated the payload and reset its Batch');
        _FORM.addButton('custpage_btnclose', 'Close', 'opener.location.reload();self.close();');
    }
    
    
    response.writePage(_FORM);
}


/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function printViewPayLoad(request, response, edit)
{
    var logTitle = 'printMainForm';
    
    _FORM = nlapiCreateForm('View Payload', true);
    _FORM.setScript( 'customscript_sears_batch_monitor_helper' );
    
    
    var fldGroup = _FORM.addFieldGroup('payload', 'Payload Content');
    fldGroup.setSingleColumn(true);
    
    var requestId = request.getParameter('reqid');
    
    var recRequest = nlapiLoadRecord('customrecord_json_webrequest', requestId);
    
    _FORM.addField('custpage_payload', 'textarea', 'Content', null, 'payload')
           .setDefaultValue(recRequest.getFieldValue('custrecord_jsonreq_content'))
           
    _FORM.addField('reqid', 'text', 'Content', null, 'payload')
            .setDisplayType('hidden')
            .setDefaultValue(requestId);

    _FORM.addField('batchid', 'text', 'Content', null, 'payload')
            .setDisplayType('hidden')
            .setDefaultValue(recRequest.getFieldValue('custrecord_jsonreq_batch'));
    
    _FORM.addField('action', 'text', 'Action')
        .setDisplayType('hidden')
        .setDefaultValue('updatePayload');
           
    
    _FORM.addSubmitButton('Update Payload');
    _FORM.addButton('btnClose', 'Cancel', 'btnCloseWindow();');
    
    response.writePage(_FORM);
}


/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function printMainForm(request, response)
{
    var logTitle = 'printMainForm';
    
    _FORM = nlapiCreateForm('Batch Monitor');
    _FORM.setScript( 'customscript_sears_batch_monitor_helper' );
    
    _FORM.addField('action', 'text', 'Action')
        .setDisplayType('hidden')
        .setDefaultValue('resendBatches');
    
    _FORM.addSubmitButton('Re-send Checked');
    
    BATCH_STATUS = getBatchStatus();
    
    // add Some Filter
    var objSelBatchStatus = _FORM.addField('custpage_filterbatchstatus', 'select', 'Batch Status');
    objSelBatchStatus.addSelectOption('', 'ALL');
    BATCH_STATUS.forEach(function(batchStatus){
        objSelBatchStatus.addSelectOption(batchStatus, batchStatus);    
    });
    if( _PARAM.custpage_filterbatchstatus )
    {
        objSelBatchStatus.setDefaultValue(_PARAM.custpage_filterbatchstatus);
    }
    
    var objFormRecvd = _FORM.addField('custpage_filterreceived', 'date', 'Date Received');
    if( _PARAM.custpage_filterreceived )
    {
         objFormRecvd.setDefaultValue(_PARAM.custpage_filterreceived);
    }
     
    _FORM.addField('custpage_baseurl', 'text', 'Date Received')
        .setDisplayType('hidden')
        .setDefaultValue( nlapiResolveURL('SUITELET', _CONTEXT.getScriptId(), _CONTEXT.getDeploymentId()) );
    
    
    
    var objSublist = _FORM.addSubList('custpage_batchsublist', 'list', 'Request Batches');
    
    objSublist.addMarkAllButtons();
    
    objSublist.addField('custpage_check', 'checkbox', 'Resend');
    
    objSublist.addField('custpage_batchid', 'select', 'Batch ID', 'customrecord_sears_webrequest_batch').setDisplayType('inline');
    objSublist.addField('custpage_batchstatus', 'text', 'Status');
    
    objSublist.addField('custpage_batchrcvd', 'text', 'Request Received');
    objSublist.addField('custpage_batchreqtype', 'text', 'Request Type');
    objSublist.addField('custpage_batchmsg', 'textarea', 'Message');
    
    objSublist.addField('custpage_reqstatus', 'text', 'Request Status');
    objSublist.addField('custpage_reqrcvd', 'text', 'Req-Recvd');
    objSublist.addField('custpage_reqproc', 'text', 'Req-Procd');
    objSublist.addField('custpage_reqrecordid', 'select', 'Record', 'transaction').setDisplayType('inline');
    objSublist.addField('custpage_transtatus', 'text', 'Status');
    objSublist.addField('custpage_reqcontent', 'textarea', 'Payload');
    objSublist.addField('custpage_reqmsg', 'textarea', 'Message');
    
    objSublist.addField('custpage_tranid', 'text', 'Transaction', 'transaction');
    objSublist.addField('custpage_tranitem', 'text', 'Item','item');
    objSublist.addField('custpage_transenttowms', 'text', 'Sent to WMS').setDisplayType('inline');
    objSublist.addField('custpage_tranwmserror', 'text','Error WMS').setDisplayType('inline');
    objSublist.addField('custpage_tranwmssenttsamp', 'text','WMS Sent Timestamp');
    objSublist.addField('custpage_tranwmssentdelta', 'text','WMS Sent Delta');
    objSublist.addField('custpage_tranwmssenterror', 'text','WMS Sent Error');
    
    
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    var arrSublistData = {};
    
    // first search for all the batches //
    var arrBatchFilter = [(new nlobjSearchFilter('isinactive', null, 'is', 'F')),
                          (new nlobjSearchFilter('custrecord_batchwebreq_requesttype', null, 'isnotempty'))];
    if (_PARAM.custpage_filterbatchstatus)
    {
        arrBatchFilter.push( new nlobjSearchFilter('custrecord_batchwebreq_status', null, 'is', _PARAM.custpage_filterbatchstatus));
    }
    if (_PARAM.custpage_filterreceived)
    {
        arrBatchFilter.push( new nlobjSearchFilter('custrecord_batchwebreq_received', null, 'on', _PARAM.custpage_filterreceived));
    }
    
    if (GLOBAL_BATCHID)
    {
        arrBatchFilter.push( new nlobjSearchFilter('internalid', null, 'anyof', GLOBAL_BATCHID));
    }
    
    var arrBatchSearch = NSUtil.search('customrecord_sears_webrequest_batch', null, 
                            arrBatchFilter, 
                            [(new nlobjSearchColumn('custrecord_batchwebreq_received')).setSort(true),
                             (new nlobjSearchColumn('custrecord_batchwebreq_status')),
                             (new nlobjSearchColumn('custrecord_batchwebreq_requesttype')),
                             (new nlobjSearchColumn('custrecord_batchwebreq_message'))
                             ]);
    
    if ( arrBatchSearch && arrBatchSearch.length > 0)
    {
        arrBatchSearch.forEach(function(rowBatch)
        {
            var batchId = rowBatch.getId();
            if (!arrSublistData[batchId])
            {
                arrSublistData[batchId] = {};
            }
            var batchData = {};
            batchData.custpage_batchid = rowBatch.getId();
            batchData.custpage_batchstatus = rowBatch.getValue('custrecord_batchwebreq_status');
            batchData.custpage_batchrcvd = rowBatch.getValue('custrecord_batchwebreq_received');
            batchData.custpage_batchreqtype = rowBatch.getValue('custrecord_batchwebreq_requesttype');
            
            var batchMessage = rowBatch.getValue('custrecord_batchwebreq_message');
            if (batchMessage)
            {
                try {
                    var parsedBatchMessage = JSON.parse(batchMessage);
                    
                    if (parsedBatchMessage.type && parsedBatchMessage.message)
                    {
                        batchData.custpage_batchmsg = [parsedBatchMessage.type, parsedBatchMessage.message].join(': ');
                    }
                    else if(parsedBatchMessage.length)
                    {
                        var arrBatchMessage =  NSUtil.removeDuplicate( parsedBatchMessage );
                        batchData.custpage_batchmsg = arrBatchMessage.join('\n')
                    }
                    
                }catch(err){}
            }
            
            arrSublistData[batchId] = {data: batchData, requests: [], transactions:{}, transactionList:[] };
        });
        
        nlapiLogExecution('DEBUG', logTitle, '### Batch Record: ' + JSON.stringify(arrSublistData));
    }
    ///////////////////////////////////////////////////////////////////////////////////////////////////////
    
    // then search for the requests
    var arrRequestFilters = [ (new nlobjSearchFilter('isinactive', null, 'is', 'F')), 
                              (new nlobjSearchFilter('custrecord_batchwebreq_requesttype','custrecord_jsonreq_batch', 'isnotempty')),
                              (new nlobjSearchFilter('custrecord_jsonreq_batch', null, 'noneof', '@NONE@')) ];
    
    if (GLOBAL_BATCHID)
    {
        arrBatchFilter.push( new nlobjSearchFilter('custrecord_jsonreq_batch', null, 'anyof', GLOBAL_BATCHID));
    }
    else
    {
        if (_PARAM.custpage_filterbatchstatus)
        {
            arrRequestFilters.push( new nlobjSearchFilter('custrecord_batchwebreq_status', 'custrecord_jsonreq_batch', 'is', _PARAM.custpage_filterbatchstatus));
        }
        if (_PARAM.custpage_filterreceived)
        {
            arrBatchFilter.push( new nlobjSearchFilter('custrecord_batchwebreq_received', 'custrecord_jsonreq_batch', 'on', _PARAM.custpage_filterreceived));
        }
    }

    
    var arrRequestSearch = NSUtil.search('customrecord_json_webrequest', null,
                                arrRequestFilters,
                                [ (new nlobjSearchColumn('custrecord_jsonreq_type')),
                                  (new nlobjSearchColumn('custrecord_jsonreq_status')),
                                  (new nlobjSearchColumn('custrecord_jsonreq_received')).setSort(true),
                                  (new nlobjSearchColumn('custrecord_jsonreq_content')),
                                  (new nlobjSearchColumn('custrecord_jsonreq_messsage')),
                                  (new nlobjSearchColumn('custrecord_jsonreq_processed')),
                                  (new nlobjSearchColumn('custrecord_jsonreq_recordid')),
                                  (new nlobjSearchColumn('custrecord_jsonreq_recordtype')),
                                  (new nlobjSearchColumn('custrecord_jsonreq_batch')),
                                ]);
    var sletURL = nlapiResolveURL('SUITELET', _CONTEXT.getScriptId(), _CONTEXT.getDeploymentId());
    
    if (arrRequestSearch && arrRequestSearch.length > 0)
    {
        arrRequestSearch.forEach(function(rowReq)
        {
            var batchId = rowReq.getValue('custrecord_jsonreq_batch');
            if (batchId && arrSublistData[batchId])
            {
                var requestData = {};
                requestData.custpage_reqstatus = rowReq.getText('custrecord_jsonreq_status');
                requestData.custpage_reqrcvd = rowReq.getValue('custrecord_jsonreq_received');
                requestData.custpage_reqproc = rowReq.getValue('custrecord_jsonreq_processed');
                
                requestData.custpage_reqrecordtype = rowReq.getValue('custrecord_jsonreq_recordtype');
                requestData.custpage_reqrecordid = rowReq.getValue('custrecord_jsonreq_recordid');
                
//                var recordId = rowReq.getValue('custrecord_jsonreq_recordid');
//                if (recordType && recordId)
//                {
//                    var createdRecordURL = nlapiResolveURL('RECORD', recordType, recordId);
//                    requestData.custpage_reqrecordid = '<a href="'+createdRecordURL+'" target="_blank"> ' + [recordType, recordId].join(':') + '</a>'; 
//                }
                
                requestData.custpage_reqmsg = rowReq.getValue('custrecord_jsonreq_messsage');
                requestData.custpage_batchid = rowReq.getValue('custrecord_jsonreq_batch');
                
                
                var viewPayloadURL = sletURL + '&action=viewPayload&reqid=' + rowReq.getId();
                requestData.custpage_reqcontent = '<a href="'+viewPayloadURL+'" onclick="popup(this.href);return false;">View Payload</a>'; 
                
                nlapiLogExecution('DEBUG', logTitle, '## requestData: ['+batchId+'] ' + JSON.stringify(requestData));
                arrSublistData[batchId].requests.push(requestData);
            }
        });
    }
    
    
    ///////////////////////////////////////////////////////
    var arrTransFilterExpr = [
                               ['mainline','is','F'],'AND',
                               ['custbody_sears_webrequest_batch','noneof', '@NONE@'], 'AND',
                               [
                                    ['item.type', 'anyof', 'InvtPart'], 'OR',
                                    [
                                      ['item.type', 'anyof', 'Service'], 'AND', 
                                      ['item.isfulfillable', 'is', 'T']                                             
                                    ]                                             
                               ]
//                               ,'AND',['custcol_bigticket','is','F']
                             ];
    if (_PARAM.custpage_filterbatchstatus)
    {
        arrTransFilterExpr.push('AND');
        arrTransFilterExpr.push(['custbody_sears_webrequest_batch.custrecord_batchwebreq_status','is',_PARAM.custpage_filterbatchstatus]);
    }
    
    if (_PARAM.custpage_filterreceived)
    {
        arrTransFilterExpr.push('AND');
        arrTransFilterExpr.push(['custbody_sears_webrequest_batch.custrecord_batchwebreq_received','on',_PARAM.custpage_filterreceived]);
    }
    
    if (GLOBAL_BATCHID)
    {
        arrBatchFilter.push( new nlobjSearchFilter('custbody_sears_webrequest_batch', null, 'anyof', GLOBAL_BATCHID));
    }

    var arrTransSearch = NSUtil.search('transaction', null, 
                            arrTransFilterExpr,
                            [
                              (new nlobjSearchColumn('custbody_sears_webrequest_batch')).setSort(true),
                              (new nlobjSearchColumn('recordtype')),
                              (new nlobjSearchColumn('statusRef')),
                              (new nlobjSearchColumn('type')),
                              (new nlobjSearchColumn('tranid')),
                              (new nlobjSearchColumn('internalid')),
                              (new nlobjSearchColumn('item')),
                              (new nlobjSearchColumn('custcol_sent_to_apigee')),
                              (new nlobjSearchColumn('custcol_wms_error_sending_chk')),
                              (new nlobjSearchColumn('custcol_wms_sending_errormsg')),
                              (new nlobjSearchColumn('custcol_wms_sending_seconds')),
                              (new nlobjSearchColumn('custcol_sent_to_wms_timestamp')),
                              (new nlobjSearchColumn('custcol_bigticket'))
                            ]);
    if ( arrTransSearch && arrTransSearch.length)
    {
        arrTransSearch.forEach(function(rowTrans)
        {
            var batchId = rowTrans.getValue('custbody_sears_webrequest_batch');
            var transInternalId = rowTrans.getValue('internalid')
            
            var transData = {};
            
            transData.custpage_tranid = rowTrans.getValue('tranid');
            transData.custpage_tranitem = rowTrans.getValue('item');
            transData.custpage_transenttowms = rowTrans.getValue('custcol_sent_to_apigee');
            transData.custpage_tranwmserror = rowTrans.getValue('custcol_wms_error_sending_chk');
            transData.custpage_tranwmssenttsamp = rowTrans.getValue('custcol_sent_to_wms_timestamp');
            transData.custpage_tranwmssentdelta = rowTrans.getValue('custcol_wms_sending_seconds');
            transData.custpage_tranwmssenterror = rowTrans.getValue('custcol_wms_sending_errormsg');
            
            transData.custpage_reqrecordid = rowTrans.getValue('internalid');
            transData.custpage_transtatus = rowTrans.getValue('statusRef');
            
            nlapiLogExecution('DEBUG', logTitle, '## transData: ['+batchId+';'+transInternalId+'] ' + JSON.stringify(transData));
            
            if (arrSublistData[batchId])
            {
                if(!arrSublistData[batchId].transactions[transInternalId])
                {
                    arrSublistData[batchId].transactions[transInternalId] = [];
                }
                
                arrSublistData[batchId].transactions[transInternalId].push(transData);
                
                arrSublistData[batchId].transactionList.push(transData);
            }
        });
    }
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
    // populate the sublist
    nlapiLogExecution('DEBUG', logTitle, 'arrSublistData: ' + JSON.stringify(arrSublistData));
    var arrSublistLines = [];
    for (var batchId in arrSublistData)
    {
        var batchData = arrSublistData[batchId]
        if(!batchData) continue;
        
        var lineData = {};
        
        for (var field in batchData.data)
        {
            lineData[field] = batchData.data[field];
        }
        
        batchData.requests.forEach(function(reqData)
        {
            // clone the lineData
            var newLineData = JSON.parse(JSON.stringify(lineData));
            for (var field in reqData)
            {
                newLineData[field] = reqData[field];
            }
            nlapiLogExecution('DEBUG', logTitle, '---# newLineData: ' + JSON.stringify(newLineData));
            
            if ( reqData.custpage_reqrecordid && batchData.transactions[reqData.custpage_reqrecordid] )
            {
                batchData.transactions[reqData.custpage_reqrecordid].forEach(function(transData)
                {
                    var transLineData = JSON.parse(JSON.stringify(newLineData) );
                    for (var field in transData)
                    {
                        transLineData[field] = transData[field];
                    }
                    
                    nlapiLogExecution('DEBUG', logTitle, '------# transLineData: ' + JSON.stringify([transLineData, transData]));
                    
                    arrSublistLines.push(transLineData);
                })
            }
            else
            {
                arrSublistLines.push(newLineData);
            }
        });
        
        
        batchData.transactionList.forEach(function(transData)
        {
            var transLineData = JSON.parse(JSON.stringify(lineData) );
            for (var field in transData)
            {
                transLineData[field] = transData[field];
            }
            
            nlapiLogExecution('DEBUG', logTitle, '------# transLineData: ' + JSON.stringify([transLineData, transData]));
            
            arrSublistLines.push(transLineData);
        })
    }
    
    objSublist.setLineItemValues(arrSublistLines);
    response.writePage(_FORM);    
}


////////////////////////
function fieldChanged_BatchMonitor(sublist, field, line)
{
	try 
	{
	    
	    if (sublist == 'custpage_batchsublist' && field=='custpage_check')
        {
//	        alert(nlapiGetLineItemValue(sublist, 'custpage_batchstatus', line));
        }
	    
		if ( NSUtil.inArray(field, FILTER_FIELDS) )
		{
			var arrQuery = [];
			
			FILTER_FIELDS.forEach(function(fieldId){
				var fldValue = nlapiGetFieldValue(fieldId);
				fldValue = encodeURIComponent(fldValue);
				arrQuery.push([fieldId,fldValue ].join('='));
			});
			
			var currentHref = nlapiGetFieldValue('custpage_baseurl');
			var newURL = currentHref + '&' + arrQuery.join('&');
			
			window.ischanged = false;
			location.href = newURL;
		}
		
	}
	catch (error)
	{
		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error: ' + logTitle, error.getCode() + ': ' + error.getDetails());
	//		throw error;
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error: ' + logTitle, error.toString());
		//	throw nlapiCreateError('99999', error.toString());
		}

		return true;
	}
}

function pageInit_BatchMonitor()
{
    var sublistName = 'custpage_batchsublist'
    var lineCount = nlapiGetLineItemCount(sublistName);
    for (var line=1; line<=lineCount; line++)
    {
        var status = nlapiGetLineItemValue(sublistName, 'custpage_batchstatus', line);
        if (! status.match(/FAIL|EMPTY/gi) )
        {
            var chkItem = nlapiGetLineItemField(sublistName, 'custpage_check', line);
//            chkItem.uifield.disabled = true;
        }
    }
}


function btnCloseWindow()
{
    return self.close();
    
}

function popup(url)
{
    var width = 500, height = 500;
    var left = (window.screen.width / 2) - ((width / 2) + 10);
    var top = (window.screen.height / 2) - ((height / 2) + 50);
    var wname = "payload";


    return window.open(url,wname,
        "status=no,height=" + height + ",width=" + width + ",resizable=yes,left="
        + left + ",top=" + top + ",screenX=" + left + ",screenY="
        + top + ",toolbar=no,menubar=no,scrollbars=no,location=no,directories=no");
    
}

////////////////////////////////////////////////////
var NSUtil =
{
    /**
     * Evaluate if the given string or object value is empty, null or undefined.
     * @param {String} stValue - string or object to evaluate
     * @returns {Boolean} - true if empty/null/undefined, false if not
     * @author mmeremilla
     */
    /*
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
    */

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
    isEmpty : function(stValue)
    {
        return ((stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function(v)
        {
            for ( var k in v)
                return false;
            return true;
        })(stValue)));
    },

    /**
     * Evaluate if the given string is an element of the array, using reverse looping
     * @param {String} stValue - String value to find in the array
     * @param {String[]} arrValue - Array to be check for String value
     * @returns {Boolean} - true if string is an element of the array, false if not
     */
    inArray : function(stValue, arrValue)
    {
        var bIsValueFound = false;
        for ( var i = arrValue.length - 1; i >= 0; i--)
        {
            if (stValue == arrValue[i])
            {
                bIsValueFound = true;
                break;
            }
        }
        return bIsValueFound;
    },

    /**
     * Shorthand version of inArray
     * @param {String} stValue - String value to find in the array
     * @param {String[]} arrValue - Array to be check for String value
     * @returns {Boolean} - true if string is an element of the array, false if not
     */
    _inArray : function(stValue, arrValue)
    {
        for ( var i = arrValue.length - 1; i >= 0; i--)
        {
            if (stValue == arrValue[i])
            {
                break;
            }
        }
        return (i > -1);
    },

    /**
     * Evaluate if the given string is an element of the array
     * @param {String} stValue - String value to find in the array
     * @param {String[]} arrValue - Array to be check for String value
     * @returns {Boolean} - true if string is an element of the array, false if not
     */
    inArrayOld : function(stValue, arrValue)
    {
        var bIsValueFound = false;

        for ( var i = 0; i < arrValue.length; i++)
        {
            if (stValue == arrValue[i])
            {
                bIsValueFound = true;
                break;
            }
        }

        return bIsValueFound;
    },

    /**
     * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
     * @param {String} stValue - any string
     * @returns {Number} - a floating point number
     * @author jsalcedo
     */
    forceFloat : function(stValue)
    {
        var flValue = parseFloat(stValue);

        if (isNaN(flValue) || (stValue == Infinity))
        {
            return 0.00;
        }

        return flValue;
    },

    /**
     * Converts string to integer. If value is infinity or can't be converted to a number, 0 will be returned.
     * @param {String} stValue - any string
     * @returns {Number} - an integer
     * @author jsalcedo
     */
    forceInt : function(stValue)
    {
        var intValue = parseInt(stValue);

        if (isNaN(intValue) || (stValue == Infinity))
        {
            return 0;
        }

        return intValue;
    },

    /**
     * Removes duplicate values from an array
     * @param {Object[]} arrValue - any array
     * @returns {Object[]} - array without duplicate values
     */
    removeDuplicate : function(arrValue)
    {
        if ((arrValue === '') //Strict checking for this part to properly evaluate integer value.
                || (arrValue == null) || (arrValue == undefined))
        {
            return arrValue;
        }

        var arrNewValue = new Array();

        o: for ( var i = 0, n = arrValue.length; i < n; i++)
        {
            for ( var x = 0, y = arrNewValue.length; x < y; x++)
            {
                if (arrNewValue[x] == arrValue[i])
                {
                    continue o;
                }
            }

            arrNewValue[arrNewValue.length] = arrValue[i];
        }

        return arrNewValue;
    },

    /**
     * Replaces the character based on the position defined (0-based index)
     * @param {String} stValue - any string
     * @param {Number} intPos - index/position of the character to be replaced
     * @param {String} stReplacement - any string to replace the character in the intPos
     * @returns {String} - new value
     * @author jsalcedo
     *
     * Example: replaceCharAt('hello', 0, 'X'); //"Xello"
     */
    replaceCharAt : function(stValue, intPos, stReplacement)
    {
        return stValue.substr(0, intPos) + stReplacement + stValue.substr(intPos + 1);
    },

    /**
     * Inserts string to the position defined (0-based index)
     * @param {String} stValue - any string
     * @param {Number} intPos - index of the character to be replaced
     * @param {String} stInsert - any string to insert
     * @returns {String} - new value
     * @author jsalcedo
     *
     * Example: insertCharAt('hello', 0, 'X'); //"Xhello"
     */
    insertStringAt : function(stValue, intPos, stInsert)
    {
        return (
        [
                stValue.slice(0, intPos), stInsert, stValue.slice(intPos)
        ].join(''));
    },

    /**
     * Round off floating number and appends it with currency symbol
     * @param {Number} flValue - a floating number
     * @param {String} stCurrencySymbol - currency symbol
     * @param {Number} intDecimalPrecision - number of decimal precisions to use when rounding off the floating number
     * @returns {String} - formatted value
     * @author redelacruz
     */
    formatCurrency : function(flValue, stCurrencySymbol, intDecimalPrecision)
    {
        var flAmount = flValue;

        if (typeof (flValue) != 'number')
        {
            flAmount = parseFloat(flValue);
        }

        var arrDigits = flAmount.toFixed(intDecimalPrecision).split(".");
        arrDigits[0] = arrDigits[0].split("").reverse().join("").replace(/(\d{3})(?=\d)/g, "$1,").split("").reverse().join("");

        return stCurrencySymbol + arrDigits.join(".");
    },

    /**
     * Round off floating number and appends it with percent symbol
     * @param {Number} flValue - a floating number
     * @param {String} stPercentSymbol - percent symbol
     * @param {Number} intDecimalPrecision - number of decimal precisions to use when rounding off the floating number
     * @returns {String} - formatted value
     * @author redelacruz
     */
    formatPercent : function(flValue, stPercentSymbol, intDecimalPrecision)
    {
        var flAmount = flValue;

        if (typeof (flValue) != 'number')
        {
            flAmount = parseFloat(flValue);
        }

        var arrDigits = flAmount.toFixed(intDecimalPrecision).split(".");
        arrDigits[0] = arrDigits[0].split("").reverse().join("").replace(/(\d{3})(?=\d)/g, "$1,").split("").reverse().join("");

        return arrDigits.join(".") + stPercentSymbol;
    },

    /**
     * Round decimal number
     * @param {Number} flDecimalNumber - decimal number value
     * @param {Number} intDecimalPlace - decimal places
     *
     * @returns {Number} - a floating point number value
     * @author memeremilla and lochengco
     */
    roundDecimalAmount : function(flDecimalNumber, intDecimalPlace)
    {
        //this is to make sure the rounding off is correct even if the decimal is equal to -0.995
        var bNegate = false;
        if (flDecimalNumber < 0)
        {
            flDecimalNumber = Math.abs(flDecimalNumber);
            bNegate = true;
        }

        var flReturn = 0.00;
        intDecimalPlace = (intDecimalPlace == null || intDecimalPlace == '') ? 0 : intDecimalPlace;

        var intMultiplierDivisor = Math.pow(10, intDecimalPlace);
        flReturn = Math.round((parseFloat(flDecimalNumber) * intMultiplierDivisor).toFixed(intDecimalPlace)) / intMultiplierDivisor;
        flReturn = (bNegate) ? (flReturn * -1) : flReturn;

        return flReturn;
    },

    /**
     * Returns the difference between 2 dates based on time type
     * @param {Date} stStartDate - Start Date
     * @param {Date} stEndDate - End Date
     * @param {String} stTime - 'D' = Days, 'HR' = Hours, 'MI' = Minutes, 'SS' = Seconds
     * @returns {Number} - (floating point number) difference in days, hours, minutes, or seconds
     * @author jsalcedo
     */
    getTimeBetween : function(dtStartDate, dtEndDate, stTime)
    {
        // The number of milliseconds in one time unit
        var intOneTimeUnit = 1;

        switch (stTime)
        {
            case 'D':
                intOneTimeUnit *= 24;
            case 'HR':
                intOneTimeUnit *= 60;
            case 'MI':
                intOneTimeUnit *= 60;
            case 'SS':
                intOneTimeUnit *= 1000;
        }

        // Convert both dates to milliseconds
        var intStartDate = dtStartDate.getTime();
        var intEndDate = dtEndDate.getTime();

        // Calculate the difference in milliseconds
        var intDifference = intEndDate - intStartDate;

        // Convert back to time units and return
        return Math.round(intDifference / intOneTimeUnit);
    },

    /**
     * Return a valid filename
     *
     * @param {String} stFileName
     * @returns {String} sanitized filename
     */
    sanitizeFilename : function(stFileName)
    {
        var fname = stFileName || 'SampleFileName-' + (new Date()).getTime();
        return fname.replace(/[^a-z0-9]/gi, '_');
    },

    /**
     * Get file contents
     *
     * @param {String} stFileId - File id
     * @returns {String} contents of the file or null if none
     */
    getContent : function(stFileId)
    {
        if ((stFileId === '') //Strict checking for this part to properly evaluate integer value.
                || (stFileId == null) || (stFileId == undefined))
        {
            return null;
        }

        var objFileHandler = nlapiLoadFile(stFileId);

        if (objFileHandler == null)
        {
            return false;
        }
        return objFileHandler.getValue();
    },

    /**
     * Save file OR overwrite if already exists.
     *
     * Version 1:
     * @author Brian Feliciano
     * Details: Initial version.
     * 
     * Version 2:
     * @author Jeremy Jacob
     * 
     * Date: August 11, 2016
     * Details of updates:
     *      1. Function name changed from 'SaveFileOrOvewrite' to 'saveOrOverwriteFile'
     *      2. Comments and logs added.
     *      3. Null checking of all inputs.
     *      4. Correction on 'return when file does not exist'. When file does not exist, the objFile parameter must be saved.
     * 
     * @param {nlobjFile} file object
     * @param {String} stFileName
     * @param {String} stFolderId
     * @returns {Integer} 
     */
    saveOrOverwriteFile : function(objFile, stFileName, stFolderId)
    {

        var stLogTitle = 'saveFileOvewrite';

        // Check inputs
        if (objFile == null || stFileName == null || stFileName == '' || stFolderId == null || stFolderId == '')
        {
            nlapiLogExecution('debug', stLogTitle, 'Missing parameters.');
            return null;
        }

        var arrFilters = [];
        arrFilters.push(new nlobjSearchFilter('name', 'file', 'is', stFileName));
        arrFilters.push(new nlobjSearchFilter('internalid', null, 'anyof', stFolderId));

        var arrColumns = [];
        arrColumns.push(new nlobjSearchColumn('internalid', 'file'));

        // Search file
        var arrSearchFileResults = nlapiSearchRecord('folder', null, arrFilters, arrColumns);

        // Get file id from the results
        var stFileId = arrSearchFileResults ? arrSearchFileResults[0].getValue('internalid', 'file') : null;

        // File exists
        if (stFileId)
        {
            nlapiLogExecution('debug', stLogTitle, 'File already exists. stFileId=' + stFileId);

            // File exists, delete existing file 
            var stFileDeleted = nlapiDeleteFile(stFileId);
            nlapiLogExecution('audit', stLogTitle, 'File has been deleted. File Id=' + stFileDeleted);
        }

        try
        {
            // Save file folder and file name
            objFile.setFolder(stFolderId);
            objFile.setName(stFileName);

            // Save file
            var stNewFileId = nlapiSubmitFile(objFile);
            nlapiLogExecution('audit', stLogTitle, 'File has been saved. File Id=' + stNewFileId);
            return stNewFileId;

        }

        catch (err)
        {
            var stErrorMsg = (err.getDetails != undefined) ? err.getCode() + ': ' + err.getDetails() : err.toString();
            nlapiLogExecution('error', stLogTitle, stErrorMsg);
            return null;
        }

    },

    /**
     * Searches for a file and returns the fileid
     *
     * @param {String} stFileName
     * @param {String} stFolderId
     * @returns {String} file id or null if none
     */
    getFileId : function(stFileName, stFolderId)
    {
        if (stFileName == null || stFolderId == null)
        {
            return null;
        }

        var arrSearchFileResults = nlapiSearchRecord('folder', null,
        [
                (new nlobjSearchFilter('name', 'file', 'is', stFileName)), (new nlobjSearchFilter('internalid', null, 'anyof', stFolderId))
        ],
        [
            (new nlobjSearchColumn('internalid', 'file'))
        ]);

        if (arrSearchFileResults == null || arrSearchFileResults.length == 0)
        {
            return null;
        }

        var objRowSearch = arrSearchFileResults[0];

        return objRowSearch.getValue('internalid', 'file') || null;
    },

    /**
     * Convert item record type to its corresponding internal id (e.g. 'invtpart' to 'inventoryitem')
     * @param {String} stRecordType - record type of the item
     * @returns {String} stRecordTypeInLowerCase - record type internal id
     */
    toItemInternalId : function(stRecordType)
    {
        if ((stRecordType === '') //Strict checking for this part to properly evaluate integer value.
                || (stRecordType == null) || (stRecordType == undefined))
        {
            throw nlapiCreateError('10003', 'Item record type should not be empty.');
        }

        var stRecordTypeInLowerCase = stRecordType.toLowerCase().trim();

        switch (stRecordTypeInLowerCase)
        {
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
    },

    /**
     * Get the posting period internal id for the given date
     * @param {String} stDate - date to search for posting period
     * @returns {String} stPostingPeriod - internal id of posting period retrieved for the date
     * @author redelacruz
     */
    getPostingPeriodByDate : function(stDate)
    {
        var stPostingPeriod = '';

        var arrFilters = [];
        arrFilters.push(new nlobjSearchFilter('startdate', null, 'onorbefore', stDate));
        arrFilters.push(new nlobjSearchFilter('enddate', null, 'onorafter', stDate));
        arrFilters.push(new nlobjSearchFilter('isquarter', null, 'is', 'F'));
        arrFilters.push(new nlobjSearchFilter('isyear', null, 'is', 'F'));

        var arrColumns =
        [
                new nlobjSearchColumn('startdate').setSort(), new nlobjSearchColumn('enddate')
        ];

        var arrResults = nlapiSearchRecord('accountingperiod', null, arrFilters, arrColumns);
        if (arrResults != null && arrResults.length > 0)
        {
            stPostingPeriod = arrResults[0].getId();
        }

        return stPostingPeriod;
    },

    /**
     * Determine whether the posting period for a given date is closed or not
     * @param {String} stDate - date to search for posting period
     * @returns {Boolean} bIsClosed - returns true if posting period is closed; otherwise returns false
     * @author redelacruz
     */
    isClosedDatePostingPeriod : function(stDate)
    {
        var bIsClosed = true;

        var arrFilters = [];
        arrFilters.push(new nlobjSearchFilter('startdate', null, 'onorbefore', stDate));
        arrFilters.push(new nlobjSearchFilter('enddate', null, 'onorafter', stDate));
        arrFilters.push(new nlobjSearchFilter('isyear', null, 'is', 'F'));
        arrFilters.push(new nlobjSearchFilter('isquarter', null, 'is', 'F'));
        arrFilters.push(new nlobjSearchFilter('closed', null, 'is', 'F'));
        arrFilters.push(new nlobjSearchFilter('alllocked', null, 'is', 'F'));

        var arrcolumns = [];
        arrcolumns.push(new nlobjSearchColumn('startdate').setSort());
        arrcolumns.push(new nlobjSearchColumn('periodname'));

        var arrResults = nlapiSearchRecord('accountingperiod', null, arrFilters, arrcolumns);
        if (arrResults != null && arrResults.length > 0)
        {
            bIsClosed = false;
        }

        return bIsClosed;
    },

    /**
     * Determine whether the posting period is closed or not
     * @param {String} stPeriodName - name of posting period to search
     * @returns {Boolean} bIsClosed - returns true if posting period is closed; otherwise returns false
     * @author redelacruz
     */
    isClosedPostingPeriod : function(stPeriodName)
    {
        var bIsClosed = true;

        var arrFilters = [];
        arrFilters.push(new nlobjSearchFilter('periodname', null, 'is', stPeriodName));
        arrFilters.push(new nlobjSearchFilter('isyear', null, 'is', 'F'));
        arrFilters.push(new nlobjSearchFilter('isquarter', null, 'is', 'F'));
        arrFilters.push(new nlobjSearchFilter('closed', null, 'is', 'F'));
        arrFilters.push(new nlobjSearchFilter('alllocked', null, 'is', 'F'));

        var arrColumns = [];
        arrColumns.push(new nlobjSearchColumn('periodname'));

        var arrResults = nlapiSearchRecord('accountingperiod', null, arrFilters, arrColumns);
        if (arrResults != null && arrResults.length > 0)
        {
            bIsClosed = false;
        }

        return bIsClosed;
    },

    /**
     * Get the item price using the price level
     * @param {String} stItemId - item internal id
     * @param {String} stPriceLevel - price level internal id
     * @returns {Number} the price of the item at the given price level
     */
    getItemPrice : function(stItemId, stPriceLevel)
    {
        if (stPriceLevel == '1')
        {
            return nlapiLookupField('item', stItemId, 'baseprice');
        }
        else
        {
            var arrFilters =
            [
                new nlobjSearchFilter('internalid', null, 'is', stItemId)
            ];
            var arrColumns =
            [
                new nlobjSearchColumn('otherprices')
            ];
            var arrResults = nlapiSearchRecord('item', null, arrFilters, arrColumns);
            if (arrResults != null && arrResults.length > 0)
            {
                return arrResults[0].getValue('price' + stPriceLevel);
            }
        }
        return null;
    },

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
    search : function(stRecordType, stSearchId, arrSearchFilter, arrSearchColumn)
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
                {}
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
    },

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
    scheduleScript : function(stScheduledScriptId, stDeployId, objParams)
    {

        var stLoggerTitle = 'scheduleScript';

        if (stScheduledScriptId == null)
        {
            throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'scheduleScript: Missing a required argument "stScheduledScriptId".');
        }

        // Deployment name character limit
        var intCharLimit = 28;

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
                var stQueue = Math.floor(Math.random() * intCountQueue).toString();
                stQueue = (stQueue == '0') ? '1' : stQueue;

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
    },

    /**
     * Pauses the scheduled script either if the remaining usage is less than
     * the specified governance threshold usage amount or the allowed time is
     * @param {Number} intGovernanceThreshold - The value of the governance threshold  usage units before the script will be rescheduled.
     * @param {Number} intStartTime - The time when the scheduled script started
     * @param {Number} intMaxTime - The maximum time (milliseconds) for the script to reschedule. Default is 1 hour.
     * @param {Number} flPercentOfAllowedTime - the percent of allowed time based from the maximum running time. The maximum running time is 3600000 ms.
     * @returns {Number} - intCurrentTime
     * @author memeremilla
     */
    rescheduleScript : function(intGovernanceThreshold, intStartTime, intMaxTime, flPercentOfAllowedTime)
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

            if (intRemainingUsage < (parseInt(intGovernanceThreshold, 10) + parseInt(20, 10)))
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
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                    {
                        'Status' : objYield.status,
                        'Information' : objYield.information,
                        'Reason' : objYield.reason
                    }));
                }
                else
                {
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
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
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                    {
                        'Status' : objYield.status,
                        'Information' : objYield.information,
                        'Reason' : objYield.reason
                    }));
                }
                else
                {
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
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
     * @param   {Integer} intGovernanceThreshold     *
     * @returns {Void}
     * @author memeremilla
     */
    checkGovernance : function(intGovernanceThreshold)
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
    }
};