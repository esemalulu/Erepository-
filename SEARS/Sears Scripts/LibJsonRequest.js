/**
 * @NModuleScope Public
 * @NApiVersion 2.x
 * 
 * Jarek Tarko 8/22/2016 Fix issue related to address update
 * redelacruz 10/22/2016 added return code for rma and added mapping for sales order paypal fields
 * Aleksandar Stefanovic 10/25/2016 added clearance flag field mapping
 * RajivegandhiS    2/02/2017   Added discount value for promotion. Ref: /*Mca243*./ marked line
 * 
 */

define([ './NSUtil', 'N/record', 'N/search', 'N/runtime', 'N/format', './LibJsonApigee', './LibShipDelivery','N/https' ],
/**
 * @param {Object} nsutil
 * @param {record} nrecord
 * @param {search} nsearch
 * @param {runtime} nruntime
 * @param {format} nformat
 * @param {Object} libApigee
 * @param {Object} libShipDelivery
 * @param {https} nhttps
 */
function(nsutil, nrecord, nsearch, nruntime, nformat, libApigee, libShipDelivery, nhttps)
{
    var CACHE = {}, JSONRequest = {}, LOG_TITLE = 'LibJsonRequest', Helper = {};
    
    var RequestStatus = {
        'SUCCESS' : '3',
        'FAIL' : '4',
        'PENDING' : '1',
        'PROCESSING' : '2'
    };
    var ST_SUCCESS_ID = '200';
    
    var RequestsType = {};
        RequestsType.SalesOrderRequest = 'SalesOrderRequest';
        RequestsType.ReturnAuthorizationCreate = 'ReturnAuthorizationCreate';
        RequestsType.ReturnAuthorizationItemReceipt = 'ReturnAuthorizationItemReceipt';
        RequestsType.FulfillmentRequest = 'FulfillmentRequest';
        RequestsType.TransferOrderItemReceipt = 'TransferOrderItemReceipt';
    
    
    JSONRequest.STATUS = RequestStatus;
    
    // ///// ITEM FULFILLMENT //////////
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.createItemFulfillment = function(recordData, requestId)
    {
        var logTitle = [ LOG_TITLE, 'createItemFulfillment' ].join(':');
        
        var returnObj = {};
        returnObj.custrecord_jsonreq_recordtype = 'itemfulfillment';
        
        try
        {
            // checking for required fields
            if (!recordData.recordtype)
            {
                throw "'recordtype' property is required!";
            }
            
            if (!recordData.salesorder_internalid)
            {
                recordData.salesorder_internalid = this.searchSalesOrder(recordData);
            }
            
            if (!recordData.salesorder_internalid)
            {
                throw "Missing original sales order";
            }
            
            var recSalesOrder = nrecord.load({
                type : nrecord.Type.SALES_ORDER,
                id : recordData.salesorder_internalid
            });
            var stStatusRef = recSalesOrder.getValue({
                fieldId : 'statusRef'
            });
            log.debug(logTitle, '.. pendingFulfillment check..' + stStatusRef);
            
            //recordData.batchid = recSalesOrder.getValue({
            //  fieldId : 'custbody_sears_webrequest_batch'
            //});
            
            // if (stStatusRef != 'pendingFulfillment')
            // //pendingBillingPartFulfilled
            // {
            // throw "Sales Order is not Pending Fulfillment. ";
            // }
            
            log.debug(logTitle, '#### Create Item Fulfillment..' + JSON.stringify(recordData));
            
            var recordObj = nrecord.transform({
                fromType : nrecord.Type.SALES_ORDER,
                fromId : recordData.salesorder_internalid,
                toType : nrecord.Type.ITEM_FULFILLMENT,
                isDynamic : true
            });
            
            var objFieldMap = {
                'itemfulfillmentid' : {
                    'field' : 'externalid',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'trandate' : {
                    'field' : 'trandate',
                    'setas' : 'value',
                    'type' : 'date'
                },
                'quantitycommitted' : {
                    'field' : 'quantitycommitted',
                    'setas' : 'value',
                    'type' : 'integer'
                },
                'memo' : {
                    'field' : 'memo',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'trackingnumber' : {
                    'field' : 'custbody_sears_tracking_num',
                    'setas' : 'value',
                    'type' : 'text'
                }
            };
            
            var arrItemsFulfilled = [];
            
            var arrPackageTrackingNos = []; 
            
            for ( var field in recordData)
            {
                if (!objFieldMap[field] && !nsutil.inArray(field, [ 'items' ]))
                {
                    continue;
                }
                
                var fldMap = objFieldMap[field];
                var fldValue = recordData[field];
                
                if (field == 'trandate')
                {
                    fldValue = nformat.parse({
                        value : fldValue,
                        type : nformat.Type.DATE
                    });
                }
                
                if (objFieldMap[field])
                {
                    switch (fldMap.setas)
                    {
                        case 'text':
                            recordObj.setText({
                                fieldId : fldMap.field,
                                value : fldValue
                            });
                            break;
                        case 'value':
                            recordObj.setValue({
                                fieldId : fldMap.field,
                                value : fldValue
                            });
                            break;
                    }
                }
                else if (nsutil.inArray(field, [ 'items' ]))
                {
                    var listItems = recordData.items;
                    var messages = [];
                    
                    var hasLines = false;
                    var arrItemsToFulfill = [];
                    
                    // first get the internalids of the itemff //
                    recordData.items.forEach(function(itemData, idx){
                        var itemRow = JSONRequest.searchItem(itemData);
                        if ( itemRow.id )
                        {
                            itemData.item_internalid = itemRow.id;
                            itemData.weight = itemRow.weight || '1';
                            //itemData.preferredlocation = itemRow.preferredlocation;
                            
                            itemData.line = recordObj.findSublistLineWithValue({
                                sublistId : 'item',
                                fieldId : 'item',
                                value : itemData.item_internalid
                            });
                            
                            if (nsutil.isEmpty(itemData.line))
                            {
                                messages.push('Line #' + idx + ': Missing line item #');
                            }
                            else
                            {
                                itemData.lineSO = recSalesOrder.findSublistLineWithValue({
                                    sublistId : 'item',
                                    fieldId : 'item',
                                    value : itemData.item_internalid
                                });
                                
                                if (!nsutil.isEmpty(itemData.lineSO))
                                {
                                    itemData.location = recSalesOrder.getSublistValue({
                                        sublistId:'item',
                                        fieldId : 'location',
                                        line : itemData.lineSO
                                    });
                                }
                            }

                            arrItemsToFulfill.push(itemData); 
                        }
                        else
                        {
                            messages.push('Line #' + idx + ': Unable to find item ');
                        }
                        return true;
                    });
                    
                    log.debug(logTitle, '>> arrItemsToFulfill: ' + JSON.stringify(arrItemsToFulfill) );
                    
                    var lineCount = recordObj.getLineCount({sublistId : 'item'});
                    for (var line=0; line < lineCount; line++)
                    {
                        var lineItem = recordObj.getSublistValue({sublistId:'item', line:line, fieldId:'item'});
                        
                        var isFound = false;
                        var _itemData = {};
                        arrItemsToFulfill.forEach(function(itemData){
                            if (lineItem == itemData.item_internalid)
                            {
                                isFound=true;
                                _itemData = itemData;
                                return false;
                            }
                        });
                        
                        recordObj.selectLine({
                            sublistId : 'item',
                            line : line
                        });
                        
                        if ( isFound )
                        {
                            recordObj.setCurrentSublistValue({
                                sublistId : 'item',
                                fieldId : 'itemreceive',
                                value : true
                            });
                        
                            recordObj.setCurrentSublistValue({
                                sublistId : 'item',
                                fieldId : 'quantity',
                                value : _itemData.quantity
                            });
                            
                            recordObj.setCurrentSublistValue({
                                sublistId : 'item',
                                fieldId : 'location',
                                value : _itemData.location || _itemData.preferredlocation
                            });
                            
                            if ( _itemData.trackingnumber )                             
                            {
                                recordObj.setCurrentSublistValue({
                                    sublistId : 'item',
                                    fieldId : 'custcol_sears_tracking_number',
                                    value : _itemData.trackingnumber
                                });
                                
                                /////////////////////
                                arrPackageTrackingNos.push({'packagetrackingnumber': _itemData.trackingnumber, 'packageweight':_itemData.weight * _itemData.quantity});
                                /////////////////////
                            }
                            if ( _itemData.serialnum )                              
                            {
                                recordObj.setCurrentSublistValue({
                                    sublistId : 'item',
                                    fieldId : 'custcol_serial_num_value',
                                    value : _itemData.serialnum
                                });
                            }
                            
                            
                            arrItemsFulfilled.push(_itemData);
                            hasLines = true;
                        }
                        else
                        {
                            recordObj.setCurrentSublistValue({
                                sublistId : 'item',
                                fieldId : 'itemreceive',
                                value : false
                            });                            
                        }
                        
                        recordObj.commitLine({
                            sublistId : 'item'
                        });
                    }
                    
                    if (messages && messages.length)
                    {
                        throw messages.join(';');
                    }
                }
            }
            if (!hasLines)
            {
                throw "No items to fulfill";
            }
            
            log.debug(logTitle, '>> arrItemsFulfilled: ' + JSON.stringify(arrItemsFulfilled) );
            
            if (recordData.batchid)
            {
                recordObj.setValue({
                    fieldId : 'custbody_sears_webrequest_batch',
                    value : recordData.batchid
                });
                returnObj.custrecord_jsonreq_batch = recordData.batchid;
            }
            
            returnObj.custrecord_jsonreq_recordid = recordObj.save({
                enableSourcing : false,
                ignoreMandatoryFields : true
            });
            
            
            // update the itemff //
            
            if (returnObj.custrecord_jsonreq_recordid && arrPackageTrackingNos && arrPackageTrackingNos.length)
            {
                var recItemff = nrecord.load({type : nrecord.Type.ITEM_FULFILLMENT,id : returnObj.custrecord_jsonreq_recordid});
                
                arrPackageTrackingNos.forEach(function(lineData, idx) {
                    recItemff.setSublistValue({
                        sublistId:'package', 
                        line: idx,
                        fieldId:'packagetrackingnumber', 
                        value: lineData.packagetrackingnumber});
                    recItemff.setSublistValue({
                        sublistId:'package', 
                        line: idx,
                        fieldId:'packageweight', 
                        value: lineData.packageweight});
                });
                
                recItemff.save({enableSourcing : false,ignoreMandatoryFields : true});
            }
            
            returnObj.custrecord_jsonreq_status = RequestStatus.SUCCESS;
            
            log.debug(logTitle, '### CREATED ITEM FULFILLMENT ###' + returnObj.custrecord_jsonreq_recordid);
            
            // do the cash sale/invoice transform //
            var paymentMethod = recSalesOrder.getValue({
                fieldId : 'paymentmethod'
            });
            
            var transformOption = {};
            transformOption.fromType = nrecord.Type.SALES_ORDER;
            transformOption.fromId = recordData.salesorder_internalid;
            transformOption.toType = nsutil.isEmpty(paymentMethod) ? nrecord.Type.INVOICE : nrecord.Type.CASH_SALE;
            transformOption.isDynamic = true;
            
            log.debug(logTitle, '## Transforming the item fulfillment...' + JSON.stringify(transformOption));
            var recordNew = null;
            
            try {
                recordNew = nrecord.transform(transformOption);
            }
            catch (transformError)
            {
                throw transformError.toString();
            }
            
            var lineCount = recordNew.getLineCount({sublistId : 'item'});
            var lineNew = lineCount;
            
            while (lineNew-- > 0)
            {
                var lineItem = recordNew.getSublistValue({sublistId:'item', line:lineNew, fieldId:'item'});
                
                // search into our fulfilled items //
                var isFound = false;
                var _itemData = {};
                arrItemsFulfilled.forEach(function(itemData){
                    if (lineItem == itemData.item_internalid)
                    {
                        isFound=true;
                        _itemData = itemData;
                        return false;
                    }
                });
                
                // set the quantity //
                recordNew.selectLine({
                    sublistId : 'item',
                    line : lineNew
                });
                var isFulfillable = recordNew.getSublistValue({sublistId:'item', line:lineNew, fieldId:'custcol_isfulfillable'});
                
                
                if (! isFound && isFulfillable)
                {
                    recordNew.setCurrentSublistValue({
                        sublistId : 'item',
                        fieldId : 'quantity',
                        value : 0
                    });
                }
                else
                {
                    recordNew.setCurrentSublistValue({
                        sublistId : 'item',
                        fieldId : 'quantity',
                        value : _itemData.quantity
                    });
                }
                
                
                recordNew.setCurrentSublistValue({
                    sublistId : 'item',
                    fieldId : 'location',
                    value : _itemData.location || _itemData.preferredlocation
                });
                
                recordNew.commitLine({
                    sublistId : 'item'
                });
            }
            
            
            //arrItemsFulfilled//
            if (recordData.batchid)
            {
                recordNew.setValue({
                    fieldId : 'custbody_sears_webrequest_batch',
                    value : recordData.batchid
                });
            }
            
            try 
            {
                var newId = recordNew.save({
                    enableSourcing : false,
                    ignoreMandatoryFields : true
                });
                log.debug(logTitle, '## .. saving the invoice/cashsale: ' + newId);
                
            }
            catch (billingerror)
            {
                throw billingerror.toString();
            }
        }
        catch (error)
        {
            returnObj.custrecord_jsonreq_status = RequestStatus.FAIL;
            returnObj.custrecord_jsonreq_messsage = error.toString();
        }
        finally
        {
            returnObj.custrecord_jsonreq_processed = (new Date());
        }
        
        returnObj.custrecord_jsonreq_processed = nformat.format(returnObj.custrecord_jsonreq_processed, nformat.Type.DATETIMETZ);
        if (!nsutil.isEmpty(requestId))
        {
            nrecord.submitFields({
                type : 'customrecord_json_webrequest',
                id : requestId,
                values : returnObj
            });
        }
        
        log.debug(logTitle, 'Results:' + JSON.stringify(returnObj));
        return returnObj;
    };
    
    // ///// CREATE ITEM RECEIPT //////////
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.createItemReceipt = function(recordData, requestId)
    {
        var logTitle = [ LOG_TITLE, 'createItemReceipt' ].join(':');
        
        var returnObj = {};
        returnObj.custrecord_jsonreq_recordtype = 'itemreceipt';
        
        try
        {
            // checking for required fields
            if (!recordData.recordtype)
            {
                throw "'recordtype' property is required!";
            }
            
            if (!recordData.transferorder_internalid)
            {
                recordData.transferorder_internalid = this.searchTransferOrder(recordData);
            }
            
            if (!recordData.transferorder_internalid)
            {
                throw "Missing original transfer order";
            }
            
            log.debug(logTitle, '#### Create item receipt..' + JSON.stringify(recordData));
            
            var recordObj = nrecord.transform({
                fromType : nrecord.Type.TRANSFER_ORDER,
                fromId : recordData.transferorder_internalid,
                toType : nrecord.Type.ITEM_RECEIPT,
                isDynamic : true
            });
            
            var listItems = recordData.items;
            var messages = [];
            var lineFields = [ 'itemreceive', 'onhand', 'quantity', 'quantityremaining', 'itemquantity', 'line', 'location', 'orderdoc', 'orderline' ];
            
            var arrLinesNo = [];
            
            for (var i = 0, count = listItems.length; i < count; i++)
            {
                var itemData = listItems[i];
                var itemRow = this.searchItem(itemData);
                itemData.item_internalid = itemRow.id;//this.searchItem(itemData);
                if (!itemData.item_internalid)
                {
                    continue;
                }
                
                var lineNo = recordObj.findSublistLineWithValue({
                    sublistId : 'item',
                    fieldId : 'item',
                    value : itemData.item_internalid
                });
                if (lineNo < 0)
                {
                    messages.push('Unable to find line item (id:' + itemData.item_internalid + ')');
                    continue;
                }
                arrLinesNo.push(lineNo);
            }
            
            var lineCount = recordObj.getLineCount({
                sublistId : 'item'
            });
            for (var line = 0; line < lineCount; line++)
            {
                
                var lineData = {};
                lineFields.map(function(lineField)
                {
                    lineData[lineField] = recordObj.getSublistValue({
                        sublistId : 'item',
                        fieldId : lineField,
                        line : line
                    });
                    return true;
                });
                
                recordObj.selectLine({
                    sublistId : 'item',
                    line : line
                });
                if (nsutil.inArray(line, arrLinesNo))
                {
                    recordObj.setCurrentSublistValue({
                        sublistId : 'item',
                        fieldId : 'itemreceive',
                        value : true
                    });
                    
                    recordObj.setCurrentSublistValue({
                        sublistId : 'item',
                        fieldId : 'quantity',
                        value : lineData.quantity
                    });
                    
                    recordObj.setCurrentSublistValue({
                        sublistId : 'item',
                        fieldId : 'itemquantity',
                        value : lineData.quantity
                    });
                    
                }
                else
                {
                    recordObj.setCurrentSublistValue({
                        sublistId : 'item',
                        fieldId : 'itemreceive',
                        value : false
                    });
                }
                recordObj.commitLine({
                    sublistId : 'item'
                });
            }
            
            if (recordData.batchid)
            {
                recordObj.setValue({
                    fieldId : 'custbody_sears_webrequest_batch',
                    value : recordData.batchid
                });
                returnObj.custrecord_jsonreq_batch = recordData.batchid;
            }
            
            returnObj.custrecord_jsonreq_recordid = recordObj.save();
            returnObj.custrecord_jsonreq_status = RequestStatus.SUCCESS;
            
            log.debug(logTitle, '### CREATED ITEM RECEIPT ###' + returnObj.custrecord_jsonreq_recordid);
        }
        catch (error)
        {
            returnObj.custrecord_jsonreq_status = RequestStatus.FAIL;
            returnObj.custrecord_jsonreq_messsage = error.toString();
        }
        finally
        {
            returnObj.custrecord_jsonreq_processed = (new Date());
        }
        
        returnObj.custrecord_jsonreq_processed = nformat.format(returnObj.custrecord_jsonreq_processed, nformat.Type.DATETIMETZ);
        if (!nsutil.isEmpty(requestId))
        {
            nrecord.submitFields({
                type : 'customrecord_json_webrequest',
                id : requestId,
                values : returnObj
            });
        }
        
        log.debug(logTitle, 'Results:' + JSON.stringify(returnObj));
        return returnObj;
    };
    
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.searchTransferOrder = function(recordData)
    {
        var logTitle = [ LOG_TITLE, 'searchTransferOrder' ].join(':');
        log.debug(logTitle, '## searchTransferOrder: ' + JSON.stringify(recordData));
        
        var stExternalId = recordData.transferorderid;
        
        var stInternalid = null;
        if (!nsutil.isEmpty(stExternalId))
        {
            stInternalid = this.searchTransactionByExternalId(stExternalId, nrecord.Type.TRANSFER_ORDER);
        }
        
        return stInternalid;
    };
    
    // ///// RETURN AUTHORIZATION //////////
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.createReturnAuthorization = function(recordData, requestId)
    {
        var logTitle = [ LOG_TITLE, 'createReturnAuthorization' ].join(':');
        
        log.debug(logTitle, 'Start createReturnAuthorization Library Call');
        
        var returnObj = {};
        returnObj.custrecord_jsonreq_recordtype = 'returnauthorization';
        
        try
        {
            // checking for required fields
            if (!recordData.recordtype)
            {
                throw "'recordtype' property is required!";
            }
            if (!recordData.returnauthorizationid)
            {
                throw "'returnauthorizationid' property is required!";
            }
            if (!recordData.transaction)
            {
                throw "'transaction' property is required!";
            }
            
            // check if this return authorization exists
            var bExisting = this.searchReturnAuthorization(recordData);
            log.debug(logTitle, 'Existing RA ? ' + bExisting);
            
            if (bExisting)
            {
                throw "Duplicate Return Authorization";
            }
            
            log.debug(logTitle, 'recordData' + JSON.stringify(recordData));
            
            var objTranSearchRes = this.searchTransactionId(recordData)

            if (nsutil.isEmpty(objTranSearchRes))
            {
                throw "Cannot find invoice / cash sale number " + recordData.transaction;
            }
            
            if (objTranSearchRes.type == 'CustInvc')
            {
                objTranSearchRes.form = recordData.stParamFormInv;
                objTranSearchRes.type = nrecord.Type.INVOICE;
            }
            else
            {
                objTranSearchRes.form = recordData.stParamFormCS;
                objTranSearchRes.type = nrecord.Type.CASH_SALE;
            }
            
            log.debug(logTitle, 'objTranSearchRes = ' + JSON.stringify(objTranSearchRes));
            
            // Lookup 7/14
            var objIdResult = nsearch.lookupFields({
                type : objTranSearchRes.type,
                id : objTranSearchRes.internalid,
                columns : [ 'createdfrom' ]
            });
            
            log.debug(logTitle, 'objIdResult.createdfrom = ' + JSON.stringify(objIdResult));
            
            if (nsutil.isEmpty(objIdResult) || nsutil.isEmpty(objIdResult.createdfrom))
            {
                throw 'Cannot find created from of ' + objTranSearchRes.type + 'id :' + objTranSearchRes.id;
            }
            
            log.debug(logTitle, 'objIdResult.createdfrom = ' + objIdResult.createdfrom[0].value);
            
            // Create Record
            var recordObj = nrecord.transform({
                fromType : nrecord.Type.SALES_ORDER,
                fromId : objIdResult.createdfrom[0].value,
                toType : nrecord.Type.RETURN_AUTHORIZATION,
                defaultValues : {
                    customform : objTranSearchRes.form
                }
            });
            
            var dTran = nformat.parse({
                value : recordData.trandate,
                type : nformat.Type.DATE
            });
            
            recordObj.setValue({
                fieldId : 'externalid',
                value : recordData.returnauthorizationid
            });
            recordObj.setValue({
                fieldId : 'trandate',
                value : dTran
            });
            recordObj.setValue({
                fieldId : 'memo',
                value : recordData.memo
            });
            
            if (!nsutil.isEmpty(recordData.stParamDept))
            {
                recordObj.setValue({
                    fieldId : 'department',
                    value : recordData.stParamDept
                });
            }
            
            if (!nsutil.isEmpty(recordData.stParamStatus))
            {
                recordObj.setValue({
                    fieldId : 'status',
                    value : recordData.stParamStatus
                });
            }
            
            //start - regina - 10/22 - return reason code
            var stReturnReasonCodeId = this.searchReturnReasonCode(recordData); 
            log.debug(logTitle, 'stReturnReasonCodeId = ' + stReturnReasonCodeId);                      
            if (!nsutil.isEmpty(stReturnReasonCodeId))
            {
                recordObj.setValue({
                    fieldId : 'custbody_return_reason_code',
                    value : stReturnReasonCodeId
                });
            }
            //end - regina - 10/22 - return reason code
            
            var intItemJSONLen = recordData.items.length;
            var arrItemIds = [];
            var objItems = {};
            
            // get the shipping cost
//            var stSalesOrderData = nsearch.lookupFields({
//                type : nrecord.Type.SALES_ORDER,
//                id : objIdResult.createdfrom[0].value,
//                columns : [ 'shippingcost' ]
//            });
//            if (stSalesOrderData)
//          {
//                recordObj.setValue({
//                    fieldId : 'shippingcost',
//                    value : stSalesOrderData.shippingcost
//                });
//          }
            
            // Get Item Internal Id
            for (var intCtr = 0; intCtr < intItemJSONLen; intCtr++)
            {
                var objItem = recordData.items[intCtr];
                
                log.debug(logTitle, 'objItem..' + JSON.stringify(objItem));
                
                var itemRow = this.searchItem(objItem);
                var stItemId = itemRow.id;//this.searchItem(objItem);
                if (nsutil.isEmpty(stItemId))
                {
                    throw "Cannot find item id # " + stItemId;
                }
                
                objItem.itemnumber = stItemId;
                
                var intIdIndex = recordObj.findSublistLineWithValue({
                    sublistId : 'item',
                    fieldId : 'item',
                    value : stItemId
                });
                
                log.debug(logTitle, 'intIdIndex..' + intIdIndex);
                
                if (intIdIndex < 0)
                {
                    arrItemIds.push(intIdIndex);
                    continue;
                }
                
                if (nsutil.isEmpty(objItems[stItemId]))
                {
                    objItems[stItemId] = {};
                    objItems[stItemId].rate = objItem.rate;
                    objItems[stItemId].quantity = objItem.quantity;
                }
                
            }
            
            log.debug(logTitle, 'failed arrItemIds..' + arrItemIds);
            log.debug(logTitle, 'objItems' + JSON.stringify(objItems));
            
            if (!nsutil.isEmpty(arrItemIds))
            {
                throw 'Cannot find items on the invoice/cash sale : ' + arrItemIds
            }
            
            log.debug(logTitle, 'new recordData..' + JSON.stringify(recordData));
            
            var stRecAreaLocId = '';
            var intItemLen = recordObj.getLineCount('item');
            log.debug(logTitle, 'intItemLen..' + intItemLen);
            
            // 7/14 - discount changes
            var arrToDelete = [];
            for (var intCtr = 0; intCtr < intItemLen; intCtr++)
            {
                var stItem = recordObj.getSublistValue({
                    sublistId : 'item',
                    fieldId : 'item',
                    line : intCtr
                });
                
                // 7/14 - discount changes
                var stItemType = recordObj.getSublistValue({
                    sublistId : 'item',
                    fieldId : 'itemtype',
                    line : intCtr
                });
                
                var objResult = objItems[stItem];
                
                // Delete line if object is not found
                if (nsutil.isEmpty(objResult))
                {
                    log.debug(logTitle, 'stItemType..' + stItemType);
                    if (stItemType == 'Subtotal')
                    {
                        continue;
                    }
                    if (stItemType == 'Discount')
                    {
                        if (arrToDelete.length == 0 || (arrToDelete.length > 0 && arrToDelete[arrToDelete.length - 1] != (intCtr - 1)))
                        {
                            continue;
                        }
                    }
                    arrToDelete.push(intCtr);
                    continue;
                }
            }
            
            log.debug(logTitle, 'arrToDelete..' + arrToDelete);
            
            // Add Lines
            for (var intCtr = (intItemLen - 1); intCtr >= 0; intCtr--)
            {
                // Delete line if object is in delete array
                if (nsutil.inArray(intCtr, arrToDelete))
                {
                    recordObj.removeLine('item', intCtr);
                    continue;
                }
                
                // 7/14 - discount changes
                var stItemType = recordObj.getSublistValue({
                    sublistId : 'item',
                    fieldId : 'itemtype',
                    line : intCtr
                });
                
                if (stItemType == 'Subtotal' || stItemType == 'Discount')
                {
                    continue;
                }
                
                var stItem = recordObj.getSublistValue({
                    sublistId : 'item',
                    fieldId : 'item',
                    line : intCtr
                });
                
                log.debug(logTitle, 'stItem' + stItem);
                
                var stLoc = recordObj.getSublistValue({
                    sublistId : 'item',
                    fieldId : 'location',
                    line : intCtr
                });
                
                log.debug(logTitle, 'stItem..' + stItem + 'stLoc..' + stLoc);
                
                var objResult = objItems[stItem];
                
                log.debug(logTitle, 'objResult..' + JSON.stringify(objResult));
                
                recordObj.setSublistValue({
                    sublistId : 'item',
                    fieldId : 'rate',
                    value : objResult.rate,
                    line : intCtr
                });
                
                recordObj.setSublistValue({
                    sublistId : 'item',
                    fieldId : 'quantity',
                    value : objResult.quantity,
                    line : intCtr
                });
                
                if (nsutil.isEmpty(stRecAreaLocId))
                {
                    stRecAreaLocId = this.populateReceivingLocation(stLoc);
                }
                
                if (!nsutil.isEmpty(stRecAreaLocId))
                {
                    recordObj.setSublistValue({
                        sublistId : 'item',
                        fieldId : 'location',
                        line : intCtr,
                        value : stRecAreaLocId
                    });
                }
            }
            
            if (recordData.batchid)
            {
                recordObj.setValue({
                    fieldId : 'custbody_sears_webrequest_batch',
                    value : recordData.batchid
                });
                returnObj.custrecord_jsonreq_batch = recordData.batchid;
            }
            
            returnObj.custrecord_jsonreq_recordid = recordObj.save();
            returnObj.custrecord_jsonreq_status = RequestStatus.SUCCESS;
            
            var recordDataObj = nsearch.lookupFields({
                type : nrecord.Type.RETURN_AUTHORIZATION,
                id : returnObj.custrecord_jsonreq_recordid,
                columns : 'custbody_sears_webrequest_batch'
            });
            returnObj.custrecord_jsonreq_batch = recordDataObj.custbody_sears_webrequest_batch[0].value;
            
            log.debug(logTitle, '### CREATED RETURN AUTHORIZATION ###' + returnObj.custrecord_jsonreq_recordid);
            
            log.debug(logTitle, '** Verify booking? ' + JSON.stringify([ recordData['custbody_delivery_date'], 
                                                                         recordData['custbody_shipping_schedule'], 
                                                                         recordData['custbody_delivery_date'] ]));
            
            if (recordData['custbody_delivery_date'] || recordData['custbody_shipping_schedule'])
            {
                JSONRequest.verifyBooking(recordData, returnObj.custrecord_jsonreq_recordid, 'returnauthorization');
            }
            
        }
        catch (error)
        {
            returnObj.custrecord_jsonreq_status = RequestStatus.FAIL;
            returnObj.custrecord_jsonreq_messsage = error.toString();
        }
        finally
        {
            returnObj.custrecord_jsonreq_processed = (new Date());
        }
        
        returnObj.custrecord_jsonreq_processed = nformat.format(returnObj.custrecord_jsonreq_processed, nformat.Type.DATETIMETZ);
        if (!nsutil.isEmpty(requestId))
        {
            nrecord.submitFields({
                type : 'customrecord_json_webrequest',
                id : requestId,
                values : returnObj
            });
        }
        
        log.debug(logTitle, 'Results:' + JSON.stringify(returnObj));
        return returnObj;
        
    };
    
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.searchReturnAuthorization = function(recordData)
    {
        var logTitle = [ LOG_TITLE, 'searchReturnAuthorization' ].join(':');
        log.debug(logTitle, '## searchReturnAuthorization: ' + JSON.stringify(recordData));
        
        var stExternalId = recordData.returnauthorizationid;
        
        var stRAInternalId = null;
        if (!nsutil.isEmpty(stExternalId))
        {
            stRAInternalId = this.searchTransactionByExternalId(stExternalId, nrecord.Type.RETURN_AUTHORIZATION); // 10
        }
        
        return stRAInternalId;
    };
    
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.searchTransactionId = function(recordData)
    {
        var logTitle = [ LOG_TITLE, 'searchInvoiceId' ].join(':');
        log.debug(logTitle, '## searchInvoiceId: ' + JSON.stringify(recordData));
        
        var arrSearchFilters = [];
        
        arrSearchFilters.push(nsearch.createFilter({
            name : 'type',
            operator : nsearch.Operator.ANYOF,
            values : [ 'CustInvc', 'CashSale' ]
        }));
        
        arrSearchFilters.push(nsearch.createFilter({
            name : 'numbertext',
            operator : nsearch.Operator.IS,
            values : recordData.transaction
        }));
        
        arrSearchFilters.push(nsearch.createFilter({
            name : 'mainline',
            operator : nsearch.Operator.IS,
            values : 'T'
        }));
        
        var arrSearchColumns = [ 'internalid', 'type' ];
        
        var arrSearchResult = nsutil.searchList(null, 'transaction', arrSearchFilters, arrSearchColumns);
        
        log.debug(logTitle, '## arrSearchResult: ' + JSON.stringify(arrSearchResult));
        
        if (!nsutil.isEmpty(arrSearchResult))
        {
            var stInternalId = arrSearchResult[0].getValue({
                name : 'internalid'
            });
            
            var stType = arrSearchResult[0].getValue({
                name : 'type'
            });
            
            return {
                'internalid' : stInternalId,
                'type' : stType
            };
            
        }
        
        return null;
    };
    
    // ///// RETURN AUTHORIZATION ITEM RECEIPT //////////
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.createReturnAuthorizationItemReceipt = function(recordData, requestId, stParamFolderId)
    {
        var logTitle = [ LOG_TITLE, 'createReturnAuthorizationItemReceipt' ].join(':');
        var start_time = (new Date()).getTime();
        
        log.debug(logTitle, 'Start createReturnAuthorizationItemReceipt Library Call');
        
        var returnObj = {};
        returnObj.custrecord_jsonreq_recordtype = 'itemreceipt';
        
        try
        {
            // checking for required fields
            if (!recordData.recordtype)
            {
                throw "'recordtype' property is required!";
            }
            if (!recordData.returnauthorizationid)
            {
                throw "'returnauthorizationid' property is required!";
            }
            
            // check if this return authorization exists
            var stInternalId = this.searchReturnAuthorization(recordData);
            log.debug(logTitle, 'Existing RA ? ' + stInternalId);
            
            if (!stInternalId)
            {
                throw "Return Authorization not existing" + stInternalId;
            }
            
            log.debug(logTitle, 'recordData' + JSON.stringify(recordData));
            
            // Getters and Setters
            var intItemJSONLen = recordData.items.length;
            var arrItemIds = [];
            var objItems = {};
            
            var dTran = nformat.parse({
                value : recordData.trandate,
                type : nformat.Type.DATE
            });
            
            log.debug(logTitle, 'Creating IR : ' + nrecord.Type.RETURN_AUTHORIZATION);
            // Create Item Receipt Record
            var recordObj = nrecord.transform({
                fromType : nrecord.Type.RETURN_AUTHORIZATION,
                fromId : stInternalId,
                toType : nrecord.Type.ITEM_RECEIPT
            });
            
            var stProcType = recordObj.getValue('processtype');
            log.debug(logTitle, 'stProcType = ' + stProcType);
            
            // Get Item Internal Id
            for (var intCtr = 0; intCtr < intItemJSONLen; intCtr++)
            {
                var objItem = recordData.items[intCtr];
                
                log.debug(logTitle, 'objItem..' + JSON.stringify(objItem));
                
                var itemRow = this.searchItem(objItem);
                var stItemId = itemRow.id;//this.searchItem(objItem);
                if (nsutil.isEmpty(stItemId))
                {
                    throw "Cannot find item id # " + stItemId;
                }
                
                recordData.items[intCtr].itemnumber = stItemId;
                
                log.debug(logTitle, 'stItemId..' + stItemId);
                
                var intIdIndex = recordObj.findSublistLineWithValue({
                    sublistId : 'item',
                    fieldId : 'item',
                    value : stItemId
                });
                
                log.debug(logTitle, 'intIdIndex..' + intIdIndex);
                
                if (intIdIndex < 0)
                {
                    arrItemIds.push(intIdIndex);
                    continue;
                }
                
                if (nsutil.isEmpty(objItems[stItemId]))
                {
                    objItems[stItemId] = {};
                    objItems[stItemId].quantity = objItem.quantity;
                }
            }
            
            log.debug(logTitle, 'failed arrItemIds..' + arrItemIds);
            log.debug(logTitle, 'objItems = ' + JSON.stringify(objItems));
            log.debug(logTitle, 'new recordData..' + JSON.stringify(recordData));
            
            recordObj.setValue({
                fieldId : 'trandate',
                value : dTran
            });
            recordObj.setValue({
                fieldId : 'memo',
                value : recordData.memo
            });
            
            if (!nsutil.isEmpty(recordData.stParamDept))
            {
                recordObj.setValue({
                    fieldId : 'department',
                    value : recordData.stParamDept
                });
            }
            
            if (!nsutil.isEmpty(arrItemIds))
            {
                throw 'Cannot find items on return authorization # : ' + arrItemIds
            }
            
            var intItemLen = recordObj.getLineCount('item');
            log.debug(logTitle, 'intItemLen..' + intItemLen);
            
            // Add Lines
            for (var intCtr = 0; intCtr < intItemLen; intCtr++)
            {
                var stItem = recordObj.getSublistValue({
                    sublistId : 'item',
                    fieldId : 'item',
                    line : intCtr
                });
                
                log.debug(logTitle, 'stItem..' + stItem);
                
                var objResult = objItems[stItem];
                log.debug(logTitle, 'objResult..' + JSON.stringify(objResult));
                
                // Uncheck line if object is not found
                if (nsutil.isEmpty(objResult))
                {
                    log.debug(logTitle, 'Unchecking..');
                    recordObj.setSublistValue({
                        sublistId : 'item',
                        fieldId : 'itemreceive',
                        value : false,
                        line : intCtr
                    });
                }
                else
                {
                    log.debug(logTitle, 'Checking and setting..');
                    recordObj.setSublistValue({
                        sublistId : 'item',
                        fieldId : 'itemreceive',
                        value : true,
                        line : intCtr
                    });
                    
                    recordObj.setSublistValue({
                        sublistId : 'item',
                        fieldId : 'quantity',
                        value : objResult.quantity,
                        line : intCtr
                    });
                }
            }
            
            if (recordData.batchid)
            {
                recordObj.setValue({
                    fieldId : 'custbody_sears_webrequest_batch',
                    value : recordData.batchid
                });
                returnObj.custrecord_jsonreq_batch = recordData.batchid;
            }
            
            var stIRId = recordObj.save();
            log.debug(logTitle, 'stIRId = ' + stIRId);
            
            log.debug(logTitle, 'Creating CS or CM');
            
            // Create CS or CM
            var stRecTypeToCreate = '';
            if (stProcType == 'CashRfnd')
            {
                stRecTypeToCreate = 'cashrefund';// /nrecord.Type.CASH_REFUND;
            }
            else
            {
                stRecTypeToCreate = 'creditmemo';// nrecord.Type.CREDIT_MEMO;
            }
            log.debug(logTitle, 'Creating CS or CM: ' + stRecTypeToCreate);
            
            var recordObj = nrecord.transform({
                fromType : nrecord.Type.RETURN_AUTHORIZATION,
                fromId : stInternalId,
                toType : stRecTypeToCreate
            });
            
            recordObj.setValue({
                fieldId : 'trandate',
                value : dTran
            });
            
            if (!nsutil.isEmpty(recordData.stParamDept))
            {
                recordObj.setValue({
                    fieldId : 'department',
                    value : recordData.stParamDept
                });
            }
            recordObj.setValue({
                fieldId : 'memo',
                value : recordData.memo
            });
            
            // START - 7/20/2016 - REVERSAL
            var stLoyaltyId = recordObj.getValue('custbody_loyalty_number');
            var stCCV = recordObj.getValue('custbody_cvv');
            
            log.debug(logTitle, 'stLoyaltyId' + stLoyaltyId + ' | stCCV' + stCCV);
            
            if (!nsutil.isEmpty(stLoyaltyId) && !nsutil.isEmpty(stCCV))
            {
                log.debug(logTitle, 'REVERSAL');
                
                var stPrevTranId = recordObj.getValue('custbody_esi_tran_id');
                log.debug(logTitle, 'stPrevTranId = ' + stPrevTranId);
                
                // Burned Reversal
                if (!nsutil.isEmpty(stPrevTranId))
                {
                    var objReverse = libApigee.reversePts(stLoyaltyId, stPrevTranId);
                    log.audit(logTitle, 'objReverse =' + JSON.stringify(objReverse));
                    
                    if (nsutil.isEmpty(objReverse) || objReverse.code != ST_SUCCESS_ID)
                    {
                        throw error.create({
                            name : 'SYTSTEM ERROR',
                            message : 'Reversing loyalty points has encountered an error. Please contact your administrator for more details.'
                        });
                    }
                    
                    recordObj.setValue({
                        fieldId : 'custbody_esi_tran_id',
                        value : ''
                    });
                    
                }
                
                // Earned Reversal
                log.debug(logTitle, 'EARNED REVERSAL');
                // libApigee.reverseEarnedPoints(stParamFolderId, recordObj,
                // nrecord.Type.RETURN_AUTHORIZATION, stInternalId,
                // stLoyaltyId);
                
                var stEventId = recordObj.getValue('custbody_esi_event_id');
                if (!nsutil.isEmpty(stEventId))
                {
                    var objRollback = libApigee.rollback(stLoyaltyId, stEventId);
                    if (nsutil.isEmpty(objRollback) || objRollback.code != ST_SUCCESS_ID)
                    {
                        throw error.create({
                            name : 'SYTSTEM ERROR',
                            message : 'Rollback of earned loyalty points has encountered an error. Please contact your administrator for more details.'
                        });
                    }
                }
                
                var objCFResult = nsearch.lookupFields({
                    type : nrecord.Type.RETURN_AUTHORIZATION,
                    id : stInternalId,
                    columns : [ 'createdfrom' ]
                });
                
                log.debug(logTitle, 'objCFResult.createdfrom = ' + JSON.stringify(objCFResult));
                
                if (nsutil.isEmpty(objCFResult) || nsutil.isEmpty(objCFResult.createdfrom))
                {
                    throw 'Cannot find created from of ' + objTranSearchRes.type + 'id :' + objTranSearchRes.id;
                }
                
                var stCreatedFromId = objCFResult.createdfrom[0].value;
                log.debug(logTitle, 'stCreatedFromId = ' + objCFResult.createdfrom[0].value);
                
                // Update RA
                var stRecId = nrecord.submitFields({
                    type : nrecord.Type.RETURN_AUTHORIZATION,
                    id : stInternalId,
                    values : {
                        custbody_esi_tran_id : '',
                        custbody_rewards_earned : '',
                        custbody_esi_event_id : ''
                    }
                });
                log.debug(logTitle, 'Updated RA stRecId = ' + stRecId);
                
                // Update SO
                var stRecId = nrecord.submitFields({
                    type : nrecord.Type.SALES_ORDER,
                    id : stCreatedFromId,
                    values : {
                        custbody_esi_tran_id : '',
                        custbody_rewards_earned : '',
                        custbody_esi_event_id : ''
                    }
                });
                
                log.debug(logTitle, 'Updated SO stRecId = ' + stRecId);
            }
            // END - 7/20/2016 - REVERSAL
            
            // Add Lines
            for (var intCtr = (intItemLen - 1); intCtr >= 0; intCtr--)
            {
                var stItem = recordObj.getSublistValue({
                    sublistId : 'item',
                    fieldId : 'item',
                    line : intCtr
                });
                
                log.debug(logTitle, 'stItem..' + stItem);
                
                var objResult = objItems[stItem];
                
                // Delete line if object is not found
                if (nsutil.isEmpty(objResult))
                {
                    recordObj.removeLine('item', intCtr);
                    continue;
                }
                
                log.debug(logTitle, 'objResult..' + JSON.stringify(objResult));
                
                recordObj.setSublistValue({
                    sublistId : 'item',
                    fieldId : 'quantity',
                    value : objResult.quantity,
                    line : intCtr
                });
                
            }
            
            if (recordData.batchid)
            {
                recordObj.setValue({
                    fieldId : 'custbody_sears_webrequest_batch',
                    value : recordData.batchid
                });
            }
            
            try
            {
                
                var stRefId = recordObj.save();
                log.debug(logTitle, 'stRefId = ' + stRefId);
                
            }
            catch (error)
            {
                nrecord.submitFields({
                    type : 'returnauthorization',
                    id : stInternalId,
                    values : {
                        'custbody_item_receipt_json_err' : error.toString()
                    }
                });
            }
            
            returnObj.custrecord_jsonreq_recordid = stIRId;
            returnObj.custrecord_jsonreq_status = RequestStatus.SUCCESS;
            
            log.debug(logTitle, '### CREATED IR AND CM/CS ###' + returnObj.custrecord_jsonreq_recordid);
        }
        catch (error)
        {
            returnObj.custrecord_jsonreq_status = RequestStatus.FAIL;
            returnObj.custrecord_jsonreq_messsage = error.toString();
        }
        finally
        {
            returnObj.custrecord_jsonreq_processed = (new Date());
        }
        
        returnObj.custrecord_jsonreq_processed = nformat.format(returnObj.custrecord_jsonreq_processed, nformat.Type.DATETIMETZ);
        if (!nsutil.isEmpty(requestId))
        {
            nrecord.submitFields({
                type : 'customrecord_json_webrequest',
                id : requestId,
                values : returnObj
            });
        }
        
        log.debug(logTitle, 'Results:' + JSON.stringify(returnObj));
        return returnObj;
    };
    
    
    
    
    // ///// SALES ORDER DATA //////////
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.createSalesOrder = function(recordData, requestId)
    {
        var logTitle = [ LOG_TITLE, 'createSalesOrder' ].join(':');
        var start_time = (new Date()).getTime();
        
        var returnObj = {};
        returnObj.custrecord_jsonreq_recordtype = 'salesorder';
        
        var objHeaderValues = {};
        var objDefaultValues = {};
        var arrLineValues = [];
        
        try
        {
            // checking for required fields
            if (!recordData.recordtype)
            {
                throw "'recordtype' property is required!";
            }
            if (!recordData.salesorderid)
            {
                throw "'salesorderid' property is required!";
            }
            
            log.debug(logTitle, '#### Create Sales Order..' + JSON.stringify(recordData));
            
            
            if (!recordData.customer_internalid)
            {
                var customerOption = {};
                if (recordData.customer_jsonid)
                {
                    customerOption.customer_jsonid = recordData.customer_jsonid; 
                }
                else if (requestId)
                {
                    customerOption.salesorder_jsonid = requestId;
                }               
                var jsonData = this.searchCustomerJSONData(customerOption);
                
                if (jsonData)
                {
                    if (jsonData.custrecord_jsonreq_recordid)
                    {
                        recordData.customer_internalid = jsonData.custrecord_jsonreq_recordid; 
                    }
                    else if (jsonData.custrecord_jsonreq_recordtype == 'customer' && jsonData.custrecord_jsonreq_content)
                    {
                        var customerData = JSON.parse(jsonData.custrecord_jsonreq_content);
                        var returnValue = this.createCustomer(customerData, recordData.customer_jsonid);
                        
                        log.debug(logTitle, '..customer create::returnValue..' + JSON.stringify(returnValue));
                        if (returnValue.custrecord_jsonreq_status == RequestStatus.SUCCESS)
                        {
                            recordData.customer_internalid = returnValue.custrecord_jsonreq_recordid;
                        }
                    }
                }
            }
            
            if (!recordData.customer_internalid)
            {
                recordData.customer_internalid = this.searchCustomer(recordData);
            }
            
            if (!recordData.customer_internalid)
            {
                throw "Missing customer id";
            }
            
            objDefaultValues['entity'] = recordData.customer_internalid;
            
            objHeaderValues['getauth'] = false;
            objHeaderValues['ccapproved'] = true;
            
            // Get the Field Map //
            var objFieldMap = getConfigFieldMap('salesorder');
            
            for ( var field in recordData)
            {
                if (!objFieldMap[field] && !nsutil.inArray(field, [ 'items' ]))
                {
                    continue;
                }
                
                var fldMap = objFieldMap[field];
                var fldValue = recordData[field];
                
                if ( objFieldMap[field] && !nsutil.isEmpty(fldValue))
                {
                    /** Handle Date types **/
                    if (fldMap.type == 'date' && fldValue)
                    {
                        fldValue = nformat.parse({value : fldValue,type : nformat.Type.DATE });
                    }
                    
                    /** Override shippingcosts if its available */
                    if (field == 'shippingcost' && fldValue)
                    {
                        objHeaderValues['shippingcostoverridden'] = true;
                        objHeaderValues['custbody_shipping_cost'] = parseFloat(fldValue);
                    }
                    
                    /** Handle Check box  **/                
                    if (fldMap.type == 'checkbox' && !nsutil.isEmpty(fldValue) )
                    {
                        // check if value is a true value
                        fldValue = !!nsutil.inArray(fldValue, ['Y','y','T','t', true, 1]);
                    }
                }
                
                if (objFieldMap[field])
                {
                    switch (fldMap.setas)
                    {
                        case 'text':
                            objHeaderValues[fldMap.field + ':text'] = fldValue;
                            break;
                        case 'value':
                            if(fldMap.field == 'custbody_shipping_schedule')
                            {
                                objHeaderValues[fldMap.field] = JSON.stringify(fldValue);
                            } 
                            else 
                            {
                                objHeaderValues[fldMap.field] = fldValue;
                            }
                            break;
                    }
                }
                else if (nsutil.inArray(field, [ 'items' ]))
                {
                    var listItems = recordData.items;
                    var hasItemAdded = false;
                    
                    for (var i = 0, count = listItems.length; i < count; i++)
                    {
                        var itemData = listItems[i];
                        var itemRow = this.searchItem(itemData);
                        
                        var lineItemData = {};
                        
                        itemData.item_internalid = itemRow.id;//this.searchItem(itemData);
                        if (!itemData.item_internalid)
                        {
                            continue;
                        }
                        if(itemData.itemnumber == "11112_ESI"){

                            // log.debug(logTitle, 'discount matched..' + JSON.stringify(itemData.itemnumber));
                            // log.debug(logTitle, 'loyaltydiscount ..' + JSON.stringify(recordData['loyaltydiscount']));
                            
                            continue;
                        }
                        
                        lineItemData['item'] = itemData.item_internalid;
                        
                        for ( var itemfld in itemData)
                        {
                            var itemMap = objFieldMap[itemfld];
                            var itemValue = itemData[itemfld];
                            
                            if (!itemMap || !itemValue)
                            {
                                continue;
                            }
                            
                            /** Handle Date types **/
                            if (itemMap.type == 'date')
                            {
                                fldValue = nformat.parse({value : itemValue,type : nformat.Type.DATE });
                            }
                            
                            /** Handle Check box  **/                
                            if (itemMap.type == 'checkbox')
                            {
                                // check if value is a true value
                                itemValue = !!nsutil.inArray(itemValue, ['Y','y','T','t', true, 1]);
                            }
                            
                            lineItemData[itemMap.field] = itemValue;
                        }
                        
                        lineItemData['location'] = itemData.location || itemRow.preferredlocation || null;
                      
                        try 
                        {
                            arrLineValues.push(lineItemData);
                            hasItemAdded = true;
                        }
                        catch (itemError)
                        {
                            throw itemError.toString();
                        }
                        
                        for ( var itemfld in itemData)
                        {
                            var itemMap = objFieldMap[itemfld];
                            var itemValue = itemData[itemfld];
                            if (!itemMap || !itemValue)
                            {
                                continue;
                            }
                            
                            /** Value Added Services **/
                            var itemVAS = JSONRequest.getValueAddedItem(itemMap.field);
                            if (itemVAS)
                            {
                                arrLineValues.push({
                                    'item':itemVAS.itemid,
                                    'quantity':1,
                                    'rate':itemVAS.baseprice
                                });
                            }
                        }
                        
                        /*
                        if (!itemRow.custitem_bigticket && (itemRow.recordType == 'inventoryitem' || (itemRow.recordType == 'serviceite' && itemRow.isfulfillable) ) )
                        {
                            // create a custom rcord
                            var recordWMSLine = nrecord.create({type: 'customrecord_sears_wms_itemlines'});
                            lineItemData['custcol_wmsline_line'] = recordWMSLine.save();
                        }
                        */                        
                    }
                    // end of line items 
                    
                    if (! hasItemAdded)
                    {
                        throw "There were no items added to the order. The items you specified are not found in the system.";
                    }
                    
                }
            }
            if (recordData['loyaltydiscount'] != null)
            {
                
                var arrRedAmts = (recordData.stParamRedemptionAmt) ? recordData.stParamRedemptionAmt.split(',') : '';
                var arrDiscItms = (recordData.stParamDiscItemsIds) ? recordData.stParamDiscItemsIds.split(',') : '';
                                            
                var amt = parseInt(recordData['loyaltydiscount']);
                var intIndexAmt = arrRedAmts.indexOf(JSON.stringify(amt));
                log.debug(logTitle, 'discount index..' + intIndexAmt);
                var stDiscountItem = arrDiscItms[intIndexAmt];
                log.debug(logTitle, 'discount item set..' + stDiscountItem);

                objHeaderValues['discountitem'] = stDiscountItem;

                // if ( recordData.stParamSubtotalItem )
                // {
                //     /**
                //      * (1) Add Subtotal Line
                //      */
                //     arrLineValues.push({'item':recordData.stParamSubtotalItem});
                    
                // }
                
                // if (stDiscountItem)
                // {
                //     /**
                //      * (2) Discount Items - Loyalty Item
                //      */
                //     arrLineValues.push({
                //         'item':stDiscountItem,
                //         'amount':recordData['loyaltydiscount']
                //     });
                    
                // }

            }
         
            
            objHeaderValues['custbody_sears_sales_ordernum'] = recordData.salesorderid;
            objHeaderValues['externalid'] = recordData.salesorderid;
            objHeaderValues['custbody_sears_createdfrom_dware'] = true;
            
            if (recordData.batchid)
            {
                returnObj.custrecord_jsonreq_batch = recordData.batchid;
                objHeaderValues['custbody_sears_webrequest_batch'] = recordData.batchid;
            }
            
            if (recordData.shipcarrier || recordData.shipmethod || recordData.custbody_delivery_date)
            {
                var mapShipMethod = JSONRequest.getShippingMethods();
                
                var shipValues = {};
                
                if (recordData.custbody_delivery_date)
                {
                    shipValues.custbody_delivery_date = nformat.parse({
                        value : recordData.custbody_delivery_date,
                        type : nformat.Type.DATE
                    });
                    
                    objHeaderValues['custbody_ship_date'] = shipValues.custbody_delivery_date;
                    objHeaderValues['custbody_delivery_date'] = shipValues.custbody_delivery_date;
                }

                // added by nikhil on aug20, 2016 to add delivery date
                var shipdelivery = {}; 

                if(recordData.custbody_delivery_date)
                {
                    shipdelivery.custbody_delivery_date = nformat.parse({
                        value : recordData.custbody_delivery_date,
                        type : nformat.Type.DATE
                    });
                    
                    objHeaderValues['custbody_delivery_date'] = shipdelivery.custbody_delivery_date;
                }

                //  var shippingsched = {};
                if(recordData.custbody_shipping_schedule)
                {
                    objHeaderValues['custbody_shipping_schedule'] = JSON.stringify(recordData.custbody_shipping_schedule);
                }

                
                if (recordData.shipcarrier)
                {
                    shipValues.shipcarrier = recordData.shipcarrier == 'More' ? 'nonups' : 'ups';
                    objHeaderValues['shipcarrier'] = shipValues.shipcarrier;
                }
                if (recordData.shipmethodid)
                {
                    // check if shipmethod id is valid
                    var isShipMethodfound= false;
                    for (var shipKey in mapShipMethod)
                    {
                        if (recordData.shipmethodid == mapShipMethod[shipKey])
                        {
                            isShipMethodfound = true;
                            break;
                        }
                    }
                    
                    if (isShipMethodfound)                      
                    {
                        shipValues.shipmethod = recordData.shipmethodid;
                    }
                }
                else
                {
                    if (recordData.shipmethod && mapShipMethod[recordData.shipmethod || recordData.shipmethod[0] || recordData.shipmethod[1]  ])
                    {
                        shipValues.shipmethod = mapShipMethod[recordData.shipmethod || recordData.shipmethod[0] || recordData.shipmethod[1]];
                        objHeaderValues['shipmethod'] = shipValues.shipmethod;
                    }
                }
            }
            
            //custbody_cybersource_approval_status            
            if ( recordData.custbody_cybersource_approval_status != 100)
            {
                //  set the orderstatus to Pending Approval             
                objHeaderValues['orderstatus'] = 'A';
            }
            
            
            log.debug(logTitle, '** ..header field/values: ' + JSON.stringify(objHeaderValues) );
            
            // actually create the SO //
            var recordObj = nrecord.create({type : nrecord.Type.SALES_ORDER, isDynamic : true, defaultValues : objDefaultValues});
            for (var headerFld in objHeaderValues)
            {
                try
                {
                    var headerValue = objHeaderValues[headerFld];           
                    var hfld = headerFld.split(':');
                    if (hfld[1])
                    {
                        recordObj.setText({fieldId : hfld[0], value : headerValue});
                    }
                    else
                    {
                        recordObj.setValue({fieldId : headerFld, value : headerValue});
                    }
                }
                catch(e)
                {
                    log.debug(logTitle, 'error: ' + JSON.stringify(e) );
                }
                
            }
            
            log.debug(logTitle, '** ..lines field/values: ' + JSON.stringify(arrLineValues) );
            // add the lines
            arrLineValues.forEach(function(lineData){
                recordObj.selectNewLine({sublistId : 'item'});
                for (var linefld in lineData)
                {
                    var lineValue = lineData[linefld];
                    recordObj.setCurrentSublistValue({sublistId : 'item',fieldId : linefld,value : lineValue});             
                }
                recordObj.commitLine({sublistId : 'item'});
            });
            
            
            log.audit(logTitle, '## PROFILE:CreateSO : (before) ' + ((new Date).getTime() - start_time));
            returnObj.custrecord_jsonreq_recordid = recordObj.save();
            returnObj.custrecord_jsonreq_status = RequestStatus.SUCCESS;
            log.audit(logTitle, '## PROFILE:CreateSO : (after)' + ((new Date).getTime() - start_time));
            
            log.debug(logTitle, '### CREATED SALES ORDER ###' + returnObj.custrecord_jsonreq_recordid);
        }
        catch (error)
        {
            returnObj.custrecord_jsonreq_status = RequestStatus.FAIL;
            returnObj.custrecord_jsonreq_messsage = JSONRequest.errorInterpreter(error);
        }
        finally
        {
            returnObj.custrecord_jsonreq_processed = (new Date());
        }
        
        returnObj.custrecord_jsonreq_processed = nformat.format(returnObj.custrecord_jsonreq_processed, nformat.Type.DATETIMETZ);
        if (!nsutil.isEmpty(requestId))
        {
            nrecord.submitFields({
                type : 'customrecord_json_webrequest',
                id : requestId,
                values : returnObj
            });
        }
        
        log.debug(logTitle, 'Results:' + JSON.stringify(returnObj));
        return returnObj;
    };
    
    JSONRequest.errorInterpreter = function (errorObj)
    {
        var errorMessage = errorObj.toString();
        
        if (errorObj.message)
        {
            errorMessage = errorObj.message;
        }
        
        return errorMessage;
    };
    
    /**
     * @memberOf JSONRequest
     */
    JSONRequest.getShippingMethods = function(){
        var cacheKey = ['shipmethods'].join(':');
        
        if(CACHE[cacheKey] == null)
        {
            var arrShipMethods = {};
            var arrShipMethodSearch = nsutil.searchAll({
                                        recordType:'shipItem',
                                        filterExpression:['isinactive','is','F'],
                                        columns: ['itemid'] });
            
            arrShipMethodSearch.forEach(function(row){
                if (!arrShipMethods[row.getValue('itemid')] )
                {
                    arrShipMethods[row.getValue('itemid')] = row.id;
                }
            });
            
            CACHE[cacheKey] = arrShipMethods;
        }
        
        return CACHE[cacheKey];
    };
    
    JSONRequest.getValueAddedItem = function (itemField)
    {
        var cacheKey = ['valueaddeditem', itemField].join(':');
        
        if(CACHE[cacheKey] == null)
        {
            if ( itemField )
            {
                var arrItemSearch = nsutil.searchAll({
                    recordType : 'customrecord_sears_vas_svcitems',
                    columns : [ 'custrecord_valueadded_code','custrecord_valueadded_svcitem','custrecord_valueadded_svcitem.baseprice' ],
                    filterExpression : [ [ 'custrecord_valueadded_linecolumn', nsearch.Operator.IS, itemField ] ]
                });
                
                if (arrItemSearch && arrItemSearch.length)
                {
                    CACHE[cacheKey] = {
                            itemid:arrItemSearch[0].getValue('custrecord_valueadded_svcitem'),
                            baseprice:  parseFloat( arrItemSearch[0].getValue({name:'baseprice', join:'custrecord_valueadded_svcitem'}) || '0' )                            
                    }
                }
                else
                {
                    CACHE[cacheKey] = false;
                }
            }
        }
        
        return CACHE[cacheKey];
    };
    
    /**
     * @memberOf JSONRequest
     */
    JSONRequest.verifyBooking = function(recordId, recordType)
    {
        var logTitle = "JSONRequest.verifyBooking";
        log.debug(logTitle, '** Verify Booking:' + JSON.stringify([ recordId, recordType ]));
        
        var recordObj = nrecord.load({
            type : recordType,
            id : recordId
        });
        
        if (!libShipDelivery.hasBigTicketItem({'recordObj' : recordObj }))
        {
            log.debug(logTitle, '---- no big ticket items');
            return true;
        }
        
        if ( recordObj.getValue({fieldId:'custbody_sears_booking_info'}) )
        {
            log.debug(logTitle, '---- already booked');
            return true;
        }
   
        
        // get the shipData //
        var shipData = {};
        shipData.custbody_delivery_date = recordObj.getValue({fieldId:'custbody_delivery_date'});
        shipData.custbody_shipping_schedule = recordObj.getValue({fieldId:'custbody_shipping_schedule'});
        
        log.debug(logTitle, '...ship data:' + JSON.stringify(shipData));
        
        try 
        {
            var recordSS = nrecord.create({
                type : 'customrecord_sears_bigitem_shipping'
                //,isDynamic : true
            });
            
            log.debug(logTitle, 'shipData[custbody_delivery_date] ='+shipData['custbody_delivery_date']);
            var shipdate = nformat.parse(shipData['custbody_delivery_date'], nformat.Type.DATE);
            var timeSlot = JSON.stringify(shipData.custbody_shipping_schedule);
            
            log.debug(logTitle, '>> shipdate | timeSlot: ' + [shipdate, timeSlot]);
            
            recordSS.setValue({
                fieldId : 'custrecord_sears_bigitemship_status',
                value : 'RESERVED'
            });
//            recordSS.setValue({
//                fieldId : 'custrecord_sears_bigitemship_received',
//                value : nformat.parse((new Date()), nformat.Type.DATETIMETZ)
//            });
            recordSS.setValue({
                fieldId : 'custrecord_sears_bigitemship_shipdate',
                value : nformat.parse(shipdate, nformat.Type.DATE)
            });
            recordSS.setValue({
                fieldId : 'custrecord_sears_bigitemship_timeslot',
                value : timeSlot
            });
            recordSS.setValue({
                fieldId : 'custrecord_sears_bigitemship_orderid',
                value : recordId
            });
            recordSS.setValue({
                fieldId : 'custrecord_sears_bigitemship_ordertype',
                value : 'salesorder'
            });
            
            var bigTickId = recordSS.save({enableSourcing:true});
            log.debug(logTitle, '... booking info :' + JSON.stringify([ bigTickId ]));
            // log.debug(logTitle, '** Verify booking? ' +
            // JSON.stringify([recordData['shipdate'],
            // recordData['custbody_shipping_schedule']]) );
            
            nrecord.submitFields({
                type : recordType,
                id : recordId,
                values : {
                    custbody_sears_booking_info : bigTickId,
                    custbody_shipping_schedule : timeSlot
                }
            });
            
            log.debug(logTitle, '... updated the sales order:' + JSON.stringify([ recordId ]));            
        }
        catch (err)
        {
            log.error(logTitle, err.toString());
            
        }

        return true;
    };
    
    /**
     * @param {O}
     * @memberOf JSONRequest
     */
    JSONRequest.ESILoyalty = function(recordId)
    {
        var logTitle = "JSONRequest.ESILoyalty";
        log.debug(logTitle, '** ESI Loya:' + JSON.stringify([ recordId ]));
        
        if (! recordId ) return false;
        
        var newRecordObj = nrecord.load({
            type : nrecord.Type.SALES_ORDER,
            id : recordId
        });
        
        
        // get the loyaltyid from customer
        var customerData = nsearch.lookupFields({
            type : nrecord.Type.CUSTOMER,
            id : newRecordObj.getValue({
                fieldId : 'entity'
            }),
            columns : [ 'custentity_loyaltycard', 'custentity_cvv' ]
        });
        log.debug(logTitle, '.... customerData:' + JSON.stringify([ customerData ]));
        
        var lineCount = newRecordObj.getLineCount({
            sublistId : 'item'
        });
        var arrLineItems = [];
        for (var line = 0; line < lineCount; line++)
        {
            // create the object
            var objItem = {};
            
            objItem.saleLineItemSequenceNumber = line;
            
            // objItem.saleLineItemDepartmentNo = '';
            
            objItem.saleLineItemItemNo = newRecordObj.getSublistValue({
                sublistId : 'item',
                fieldId : 'item',
                line : line
            });
            objItem.saleLineItemSKU = newRecordObj.getSublistValue({
                sublistId : 'item',
                fieldId : 'custcol_sku_srcd',
                line : line
            });
            objItem.saleLineItemQuantity = newRecordObj.getSublistValue({
                sublistId : 'item',
                fieldId : 'quantity',
                line : line
            });
            objItem.saleLineItemSaleAmount = newRecordObj.getSublistValue({
                sublistId : 'item',
                fieldId : 'amount',
                line : line
            });
            
            var linePriceLvl = newRecordObj.getSublistValue({
                sublistId : 'item',
                fieldId : 'price',
                line : line
            });
            
            if (linePriceLvl == 4) // CLearance
            {
                objItem.saleLineItemTags = [ 'Clearance' ];
            }
            
            arrLineItems.push(objItem);
        }
        
        log.debug(logTitle, '.... arrLineItems:' + JSON.stringify([ arrLineItems ]));
        
        var dNow = new Date();
        var stTimeStamp = 'UNIQUE_ID-' + dNow.getTime().toString();
        
        var objEarn = libApigee.earnPts(customerData.custentity_loyaltycard, arrLineItems, stTimeStamp);
        
        if (objEarn.code != ST_SUCCESS_ID)
        {
            return false;
        }
        
        var flTotalRewAmt = 0;
        if (!objEarn.valid)
        {
            log.debug(logTitle, 'No rewards earned.');
        }
        else
        {
            var stRewards = 'Rewards Earned: ';
            var arrRewardsEarned = objEarn.rewards;
            if (!nsutil.isEmpty(arrRewardsEarned))
            {
                for (var intRew = 0; intRew <= arrRewardsEarned.length; intRew++)
                {
                    var flRewAmt = nsutil.forceFloat(arrRewardsEarned[intRew].rewardAmount);
                    flTotalRewAmt += flRewAmt;
                }
                stRewards += flTotalRewAmt + ' pts';
            }
            log.debug(logTitle, ' stRewards =' + stRewards);
        }
        
        log.debug(logTitle, ' recordObj.id =' + recordId + ' | flTotalRewAmt =' + flTotalRewAmt + ' | stTimeStamp =' + stTimeStamp);
        
        nrecord.submitFields({
            type : 'salesorder',
            id : recordId,
            values : {
                custbody_rewards_earned : flTotalRewAmt,
                custbody_esi_event_id : stTimeStamp
            }
        });
        
        return true;
    };
    
    JSONRequest.getNextBatchQueue = function()
    {
        var logTitle = 'JSONRequest.getNextBatchQueue';
        var searchObj = nsearch.create(
                {
                    type : 'customrecord_sears_webrequest_batch',
                    columns :
                    [
                        nsearch.createColumn({name:'internalid', summary:nsearch.Summary.MAX})
                    ],
                    filterExpression :
                    [
                        ['custrecord_batchwebreq_requesttype', 'isnotempty'], 'AND',
//                      [
                            
//                          , 'OR',['custrecord_batchwebreq_status', 'is', 'PENDING-CREATION']
//                      ]
                    ]
                });
        var nextBatchid = false;
        searchObj.run().each(function(row){
            nextBatchid = row.getValue({name:'internalid', summary:nsearch.Summary.MAX});
        });
        
        log.debug(logTitle, '..next batch: ' + JSON.stringify(nextBatchid));
        return nextBatchid;
    };
    
    
    JSONRequest.listPendingRequests = function (stBatchId)
    {
        return nsutil.searchAll({
            recordType:'customrecord_json_webrequest',
            columns: [
               nsearch.createColumn({name:'custrecord_jsonreq_recordtype', sort:nsearch.Sort.ASC}),
               nsearch.createColumn({name:'internalid'}),
               nsearch.createColumn({name:'custrecord_jsonreq_content'}),
               nsearch.createColumn({name:'custrecord_jsonreq_messsage'}),
               nsearch.createColumn({name:'custrecord_jsonreq_status'})
            ],
            filterExpression: [
                ['custrecord_jsonreq_batch','anyof', stBatchId],'AND', 
                ['custrecord_jsonreq_status','anyof', 1] 
            ]});
    };
    
    /**
     * @param {Integer} stBatchId
     * @memberOf JSONRequest
     */
    JSONRequest.validateBatchStatus = function(stBatchId)
    {
        var logTitle = 'JSONRequest.validateBatchStatus::' + stBatchId;
        if (!stBatchId) return true;
        
        var BATCHSTATUS = {};
        BATCHSTATUS.creationSuccess = 'SUCCESS-CREATION';
        BATCHSTATUS.creationFail = 'FAIL-CREATION';
        BATCHSTATUS.creationHasPending = 'PENDING-CREATION';
        BATCHSTATUS.sendwmsSuccess = 'SUCCESS-SENDAPIGEE';
        BATCHSTATUS.sendwmsFail = 'FAIL-APIGEE';
        BATCHSTATUS.sendwmsHasPending = 'PENDING-APIGEE';
        BATCHSTATUS.sendwmsPartial = 'PARTIALSENT-APIGEE';
        BATCHSTATUS.empty = 'EMPTY-REQUEST';
        
        var newBatchData = {};
        
        // get the current batch status | batch request type
        var batchData = nsearch.lookupFields({
            type : 'customrecord_sears_webrequest_batch',
            id : stBatchId,
            columns : [ 'custrecord_batchwebreq_status', 'custrecord_batchwebreq_requesttype' ]
        });
        newBatchData = JSON.parse( JSON.stringify(batchData) );
        
        log.debug(logTitle, 'batchData >> ' + JSON.stringify(batchData) );
     //    if(batchData.custrecord_batchwebreq_status.match(/^INIT-/ig) )
        // {
     //     return batchData;
        // }
        
        var arrErrorMessages = [];
        ////////////////////////////////////////
        var listWebRequest = nsutil.searchAll({
            recordType:'customrecord_json_webrequest',
            columns: ['custrecord_jsonreq_status','custrecord_jsonreq_messsage'],
            filterExpression: [
                ['custrecord_jsonreq_batch','anyof', stBatchId]
            ]});
        
        batchData.has_webrequests = !!listWebRequest.length;
        batchData.has_webrequests_total = listWebRequest.length;
        batchData.has_webrequests_pending = false;
        batchData.has_webrequests_failed = 0;
        ///////////////////////////////////////////////////////////////////////////
        
        log.debug(logTitle, 'batchData >> ' + JSON.stringify(batchData) );
        if (batchData.has_webrequests)
        {
            for (var i=0,j=listWebRequest.length; i<j; i++)
            {
                var webReqRow = listWebRequest[i];
                var webReqStatus = webReqRow.getValue({name:'custrecord_jsonreq_status'});
                var webReqError = webReqRow.getValue({name:'custrecord_jsonreq_messsage'});
                
                if (webReqStatus == RequestStatus.PENDING)
                {
                    batchData.has_pendingRequests = true;
                    break;
                }
                else if (webReqStatus == RequestStatus.FAIL)
                {
                    batchData.has_webrequests_failed++;
                    arrErrorMessages.push(webReqError);
                }
            }
            
            batchData.has_webrequests_allfailed = !!(batchData.has_webrequests_failed == batchData.has_webrequests_total);
        }
        log.debug(logTitle, 'batchData >> ' + JSON.stringify(batchData) );
        
        if (batchData.has_webrequests_pending)
        {
            newBatchData.custrecord_batchwebreq_status = BATCHSTATUS.creationHasPending;
        }
        else if (batchData.has_webrequests_allfailed)
        {
            newBatchData.custrecord_batchwebreq_status = BATCHSTATUS.creationFail;
            if (arrErrorMessages.length)
            {
                newBatchData.custrecord_batchwebreq_message = JSON.stringify(arrErrorMessages);
            }
        }
        else
        {
            ////////////////////////////////////////
            var listTransactions = {};
            
            if (batchData.custrecord_batchwebreq_requesttype == RequestsType.SalesOrderRequest )
            {
                
                listTransactions = nsutil.searchAll({
                    recordType:'transaction',
                    columns: ['internalid',
                              'tranid',
                              'custcol_sent_to_apigee',
                              'custcol_wms_error_sending_chk',
                              'custcol_wms_sending_errormsg',
                              'custcol_bigticket'],
                    filterExpression: [
                        ['mainline','is','F'],'AND',
                        ['custbody_sears_webrequest_batch','anyof', stBatchId], 'AND',                
                        [
                          ['item.type', 'anyof', 'InvtPart'], 'OR',
                          [
                            ['item.type', 'anyof', 'Service'], 'AND', 
                            ['item.isfulfillable', 'is', 'T']                                             
                          ]                                             
                        ]                                            
                    ]});
                batchData.has_transactions = !!listTransactions.length;
                log.debug(logTitle, 'batchData >> ' + JSON.stringify(batchData) );
                
                batchData.has_line_failed = 0;
                batchData.has_line_sent = 0;
                batchData.has_lines_total = 0;
                batchData.has_lines_allsent = true;
                batchData.has_lines_allfailed = true;
                batchData.has_lines = false;
                
                for (var i=0,j=listTransactions.length; i<j; i++)
                {
                    var row = listTransactions[i];
                    var lineData = {};
                    lineData.isSent  = row.getValue({name:'custcol_sent_to_apigee'});
                    lineData.isError = row.getValue({name:'custcol_wms_error_sending_chk'});
                    lineData.errormsg = row.getValue({name:'custcol_wms_sending_errormsg'});
                    lineData.bigticket = row.getValue({name:'custcol_bigticket'});
                    lineData.location = row.getValue({name:'location'});
                    
                    log.debug(logTitle, '.....Line Details: ' + JSON.stringify(lineData) );
                    if ( lineData.bigticket ) continue; //skip it
                    
                    batchData.has_lines_total++;
                    batchData.has_lines = true;
                    
                    if ( lineData.isError )
                    {
                        batchData.has_lines_allsent = false;
                        batchData.has_line_failed++;
                        arrErrorMessages.push(lineData.errormsg);
                    }
                    else if ( lineData.isSent ) 
                    {
                        batchData.has_lines_allfailed = false;
                        batchData.has_line_sent++;
                    }
                    else
                    {
                        batchData.has_lines_allfailed = false;
                        batchData.has_lines_allsent = false; // not yet sent
                    }
                }
                
                if(batchData.has_lines_allsent || batchData.has_lines_total == 0)
                {
                    newBatchData.custrecord_batchwebreq_status = BATCHSTATUS.sendwmsSuccess;
                }
                else if (batchData.has_lines_allfailed && batchData.has_lines_total > 0)
                {
                    newBatchData.custrecord_batchwebreq_status = BATCHSTATUS.sendwmsFail;
                    if (arrErrorMessages.length)
                    {
                        newBatchData.custrecord_batchwebreq_message = JSON.stringify(arrErrorMessages);
                    }
                }
                else
                {
                    if ( batchData.has_lines_allsent && batchData.has_line_sent > 0)
                    {
                        newBatchData.custrecord_batchwebreq_status = BATCHSTATUS.sendwmsSuccess;
                    }
                    else
                    {
                        // this should send to PENDING-QUEUE again //
                        newBatchData.custrecord_batchwebreq_status = BATCHSTATUS.sendwmsHasPending;
                    }
                    
                }
            }
            else
            {
                listTransactions = nsutil.searchAll({
                    recordType : 'transaction',
                    columns : [ 'custbody_sears_webrequest_batch','recordtype' ],
                    filterExpression : [ 
                                         [ 'mainline', 'is', 'T' ], 'AND', 
                                         [ 'custbody_sears_webrequest_batch', 'anyof', stBatchId ] ]
                });
                batchData.has_transactions = !!listTransactions.length;
                log.debug(logTitle, 'batchData >> ' + JSON.stringify(batchData) );
                
                if (batchData.has_transactions)
                {
                    newBatchData.custrecord_batchwebreq_status = BATCHSTATUS.creationSuccess;
                    newBatchData.custrecord_batchwebreq_message = '';
                }
            }
            
            if (!batchData.has_transactions && !batchData.has_webrequests)
            {
                newBatchData.custrecord_batchwebreq_status = BATCHSTATUS.empty;
            }
            ///////////////////////////////////////////////////////////////////////////
        }
        log.debug(logTitle, 'newBatchData >> ' + JSON.stringify(newBatchData) );
        if(batchData.custrecord_batchwebreq_status.match(/^INIT-/ig) )
        {
            return newBatchData;
        }



        if (batchData.custrecord_batchwebreq_status !=  newBatchData.custrecord_batchwebreq_status)
        {
            log.audit(logTitle, 'UPDATE: ' + JSON.stringify([stBatchId, batchData, newBatchData]));

            nrecord.submitFields({
                type : 'customrecord_sears_webrequest_batch',
                id : stBatchId,
                values : newBatchData, 
                options: {enablesourcing: true, ignoreMandatoryFields: true}
            });
        }
        
        return newBatchData;        
    };
    
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.searchSalesOrder = function(recordData)
    {
        var logTitle = [ LOG_TITLE, 'searchSalesOrder' ].join(':');
        log.debug(logTitle, '## searchSalesOrder: ' + JSON.stringify(recordData));
        
        var orderId = recordData.salesorder || recordData.salesorderid;
        
        var salesOrderId = null;
        if (!nsutil.isEmpty(orderId))
        {
            salesOrderId = this.searchTransactionByExternalId(orderId, nrecord.Type.SALES_ORDER); // 10
        }
        
        log.debug(logTitle, '## returns: ' + JSON.stringify(salesOrderId));
        return salesOrderId;
    };
    
    // ///// ITEM DATA //////////
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.searchItem = function(recordData)
    {
        var start_time = (new Date()).getTime();
        var logTitle = [ LOG_TITLE, 'searchItem' ].join(':');
        
        log.debug(logTitle, '## Search Item: ' + JSON.stringify(recordData));
        
        var itemId = null, itemData = {};
        if (!nsutil.isEmpty(recordData.itemnumber))
        {
            itemData = this.searchItemByItemNumber(recordData.itemnumber);
            
            if (!itemData)
            {
                itemData = this.searchItemByExternalId(recordData.itemnumber);
            }
        }
        else if (!nsutil.isEmpty(recordData.itemname))
        {
            itemData = this.searchItemByItemName(recordData.itemname);
        }
        else if (!nsutil.isEmpty(recordData.itemid)) // this is the
        // externalid
        {
            itemData = this.searchItemByExternalId(recordData.itemid);
        }
        
        log.audit(logTitle, '## PROFILE:searchItem : ' + ((new Date).getTime() - start_time));
        log.debug(logTitle, '## returns: ' + JSON.stringify(itemData));
        return itemData;
    };   
    
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.searchItemByExternalId = function(externalId)
    {
        var cacheKey = [ 'searchItemByExternalId', externalId ].join(':');
        
        if (CACHE[cacheKey] == null)
        {
            CACHE[cacheKey] = false;
            
            var arrItemSearch = nsutil.searchAll({
                recordType : 'item',
                columns : [ 'internalid','preferredlocation','weight', 'type','custitem_bigticket','isfulfillable' ],
                filterExpression : [ [ 'externalid', nsearch.Operator.IS, externalId ] ],
            });
            
            if (arrItemSearch && arrItemSearch.length)
            {
                CACHE[cacheKey] = {
                            id: arrItemSearch[0].id,
                            preferredlocation: arrItemSearch[0].getValue('preferredlocation'),
                            weight: arrItemSearch[0].getValue('weight'),
                            
                            recordType: arrItemSearch[0].recordType,//arrItemSearch[0].getValue('type'),
                            custitem_bigticket: arrItemSearch[0].getValue('custitem_bigticket'),
                            isfulfillable: arrItemSearch[0].getValue('isfulfillable')
                        };
                ;
            }
        }
        
        return CACHE[cacheKey];
    };
    
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.searchItemByItemName = function(itemName)
    {
        var cacheKey = [ 'searchItemByItemName', itemName ].join(':');
        
        if (CACHE[cacheKey] == null)
        {
            CACHE[cacheKey] = false;
            
            var arrItemSearch = nsutil.searchAll({
                recordType : 'item',
                columns : [ 'internalid','preferredlocation','weight', 'type','custitem_bigticket','isfulfillable' ],
                filterExpression : [ [ 'displayname', nsearch.Operator.IS, itemName ] ]
            });
            
            if (arrItemSearch && arrItemSearch.length)
            {
                CACHE[cacheKey] = {
                        id: arrItemSearch[0].id,
                        preferredlocation: arrItemSearch[0].getValue('preferredlocation'),
                        weight: arrItemSearch[0].getValue('weight'),
                        
                        recordType: arrItemSearch[0].recordType,
                        custitem_bigticket: arrItemSearch[0].getValue('custitem_bigticket'),
                        isfulfillable: arrItemSearch[0].getValue('isfulfillable')
                    };
            }
        }
        
        return CACHE[cacheKey];
    };
    
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.searchItemByItemNumber = function(itemNumber)
    {
        var cacheKey = [ 'searchItemByItemNumber', itemNumber ].join(':');
        
        if (CACHE[cacheKey] == null)
        {
            CACHE[cacheKey] = false;
            
            var arrItemSearch = nsutil.searchAll({
                recordType : 'item',
                columns : [ 'internalid','preferredlocation','weight', 'type','custitem_bigticket','isfulfillable' ],
                filterExpression : [ [ 'itemid', nsearch.Operator.IS, itemNumber ] ]
            });
            
            if (arrItemSearch && arrItemSearch.length)
            {
                CACHE[cacheKey] = {
                        id: arrItemSearch[0].id,
                        preferredlocation: arrItemSearch[0].getValue('preferredlocation'),
                        weight: arrItemSearch[0].getValue('weight'),
                        
                        recordType: arrItemSearch[0].recordType,
                        custitem_bigticket: arrItemSearch[0].getValue('custitem_bigticket'),
                        isfulfillable: arrItemSearch[0].getValue('isfulfillable')
                    };
            }
        }
        
        return CACHE[cacheKey];
    };
    
    /**
     * @memberOf JSONRequest
     */
    JSONRequest.searchLoyaltyItemGroup = function()
    {
        var cacheKey = [ 'searchLoyaltyItemGroup' ];
        
        if (CACHE[cacheKey] == null)
        {
            var currentScript = nruntime.getCurrentScript();
            var loyaltyItemGroup = currentScript.getParameter({
                name : 'custscript_sears_rl_loyalty_category'
            });
            
            // todo:
            var arrItemSearch = nsutil.searchAll({
                recordType : 'discountitem',
                columns : [ 'internalid', 'itemid', 'displayname', 'baseprice' ],
                filterExpression : [ [ 'parent', 'anyof', loyaltyItemGroup ] ]
            });
            var objLoyaltyAmounts = {};
            
            if (arrItemSearch && arrItemSearch.length)
            {
                arrItemSearch.forEach(function(row, idx)
                {
                    var itemData = {};
                    itemData.internalid = row.getValue({
                        name : 'internalid'
                    });
                    itemData.itemid = row.getValue({
                        name : 'itemid'
                    });
                    itemData.itemname = row.getValue({
                        name : 'displayname'
                    });
                    itemData.baseprice_str = row.getValue({
                        name : 'baseprice'
                    });
                    itemData.baseprice = Math.abs(parseFloat(itemData.baseprice_str));
                    
                    if (!objLoyaltyAmounts[itemData.internalid.toString()])
                    {
                        objLoyaltyAmounts[itemData.internalid.toString()] = itemData;
                    }
                    return true;
                });
            }
            
            CACHE[cacheKey] = objLoyaltyAmounts;
        }
        
        return CACHE[cacheKey];
    };
    
    JSONRequest.searchLoyaltyItem = function(discountAmount)
    {
        var cacheKey = [ 'searchLoyaltyItem', discountAmount ].join(':');
        
        if (CACHE[cacheKey] == null)
        {
            CACHE[cacheKey] = false;
            
            var arrLoyaltyGroup = this.searchLoyaltyItemGroup();
            if (arrLoyaltyGroup)
            {
                discountAmount = Math.abs(parseFloat(discountAmount));
                
                for ( var itemId in arrLoyaltyGroup)
                {
                    var itemData = arrLoyaltyGroup[itemId];
                    
                    if (discountAmount == itemData.baseprice)
                    {
                        CACHE[cacheKey] = itemData;
                        break;
                    }
                }
            }
        }
        
        return CACHE[cacheKey];
    };
    
    JSONRequest.createCustomerOldWay = function(recordData, requestId)
    {
        var start_time = (new Date()).getTime();
        var logTitle = [ LOG_TITLE, 'createCustomerOldWay' ].join(':');
        
        var returnObj = {};
        returnObj.custrecord_jsonreq_recordtype = 'customer';
        
        var objCredential = JSONRequest.getCredentialConfig('customdeploy_sears_sl_process_requests');
            
        log.audit(logTitle, '## PROFILE:create Customer (ms) (before): ' + ((new Date).getTime() - start_time));
        var response = nhttps.post({
            url: objCredential.URL,
            body: {'skey':'SECRETKEY','content':JSON.stringify(recordData)}
        });
        returnObj = JSON.parse(response.body);
        log.debug(logTitle, response.body);
        log.audit(logTitle, '## PROFILE:create Customer (ms) (after): ' + ((new Date).getTime() - start_time));
        
        if (!nsutil.isEmpty(requestId))
        {
            nrecord.submitFields({
                type : 'customrecord_json_webrequest',
                id : requestId,
                values : returnObj
            });
            
        }
        
        return returnObj;
    };

    
    // ///// CUSTOMER DATA //////////
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.createCustomer = function(recordData, requestId)
    {
        var start_time = (new Date()).getTime();
        var logTitle = [ LOG_TITLE, 'createCustomer' ].join(':');
        
        /*** WORKAROUND ***/
        return JSONRequest.createCustomerOldWay(recordData, requestId);
        /*** WORKAROUND ***/
        
        
        var returnObj = {};
        returnObj.custrecord_jsonreq_recordtype = 'customer';
        
        log.debug(logTitle, 'Create Customer..' + JSON.stringify(recordData));
        
        var isNewCustomer = false;
        try
        {
            // checking for required fields
            if (!recordData.recordtype)
            {
                throw "'recordtype' property is required!";
            }
            if (!recordData.customerid)
            {
                throw "'customerid' property is required!";
            }
            
            // first check the customer already exists
            var customerId = this.searchCustomer(recordData);
            
            var hasCustomerChanges = false;
            var hasCustomerAddressChanges = false;
            
            var recordObj = customerId ? nrecord.load({
                type : nrecord.Type.CUSTOMER,
                id : customerId,
                isDynamic : true
            }) : false;
            var recordObjExt = null;
            if (!recordObj)
            {
                recordObj = nrecord.create({
                    type : nrecord.Type.CUSTOMER,
                    isDynamic : true
                });
                
                isNewCustomer=true;
            } 
            else
            {
                recordObjExt = nrecord.load({
                    type : nrecord.Type.CUSTOMER,
                    id : customerId,
                    isDynamic : false
                });         
            }
            
            
            var objFieldMap = {
                'customerid' : {
                    'field' : 'externalid',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'firstname' : {
                    'field' : 'firstname',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'lastname' : {
                    'field' : 'lastname',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'email' : {
                    'field' : 'email',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'phone' : {
                    'field' : 'phone',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'addrphone' : {
                    'field' : 'addrphone',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'companyname' : {
                    'field' : 'companyname',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'addr1' : {
                    'field' : 'addr1',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'addr2' : {
                    'field' : 'addr2',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'addr3' : {
                    'field' : 'addr3',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'attention' : {
                    'field' : 'attention',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'addressee' : {
                    'field' : 'addressee',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'city' : {
                    'field' : 'city',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'country' : {
                    'field' : 'country',
                    'setas' : 'text',
                    'type' : 'text'
                },
                'state' : {
                    'field' : 'state',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'zip' : {
                    'field' : 'zip',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'custentity_loyaltycard' : {
                    'field' : 'custentity_loyaltycard',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'custentity_cvv' : {
                    'field' : 'custentity_cvv',
                    'setas' : 'value',
                    'type' : 'text'
                },
                'language' : {
                    'field' : 'language',
                    'setas' : 'value',
                    'type' : 'text'
                }                
            };
            
            for ( var field in recordData)
            {
                if (!objFieldMap[field] && !nsutil.inArray(field, [ 'billingaddress', 'shippingaddress' ]))
                {
                    continue;
                }
                
                var fldMap = objFieldMap[field];
                var fldValue = recordData[field];
                
                if (objFieldMap[field])
                {
                    var customerValue = null;
                    if (!isNewCustomer)
                    {
                        
                        switch (fldMap.setas)
                        {
                            case 'text':
                                customerValue = recordObj.getText({
                                    fieldId : fldMap.field
                                });
                                break;
                            case 'value':
                                customerValue = recordObj.getValue({
                                    fieldId : fldMap.field
                                });
                                break;
                        }
                    }
                    
                    log.debug(logTitle, '... check values: ' + JSON.stringify([fldMap.field, customerValue, fldValue, (nsutil.isEmpty(customerValue) == nsutil.isEmpty(fldValue)), (!nsutil.isEmpty(customerValue) && customerValue==fldValue)]  ) );
                    
                    if (  (nsutil.isEmpty(customerValue) && nsutil.isEmpty(fldValue)) || (!nsutil.isEmpty(customerValue) && customerValue==fldValue) )
                    {
                        continue;
                    }
                    else
                    {
                        hasCustomerChanges = true;
                        switch (fldMap.setas)
                        {
                            case 'text':
                                recordObj.setText({
                                    fieldId : fldMap.field,
                                    value : fldValue
                                });
                                break;
                            case 'value':
                                recordObj.setValue({
                                    fieldId : fldMap.field,
                                    value : fldValue
                                });
                                break;
                        }
                    
                    }
                }
            }
            
            log.debug(logTitle, 'Customer billing address..' + JSON.stringify(recordData['billingaddress']));
            log.debug(logTitle, 'Customer shipping address..' + JSON.stringify(recordData['shippingaddress']));
            
            log.audit(logTitle, '## PROFILE:Create Customer (Address): (before) ' + ((new Date).getTime() - start_time));
            if (recordData['billingaddress'] && recordData['shippingaddress'] && this.isSameAddress(recordData['billingaddress'], recordData['shippingaddress']))
            {
                log.debug(logTitle, '!!same address..' );
                
                var lineAddr = isNewCustomer ? -1 : this.searchAddressBook(recordObjExt, recordData['billingaddress'], objFieldMap);
                
                if (lineAddr > -1)
                {
                    hasCustomerAddressChanges = this.editAddress(recordObj, lineAddr, recordData['billingaddress'], true, true, objFieldMap);
                }
                else
                {
                    hasCustomerAddressChanges = this.addToAddress(recordObj, recordData['billingaddress'], true, true, objFieldMap);
                }
            }
            else
            {
                log.debug(logTitle, '!!different  address..' );
                
                var arrAddressType = [ 'billingaddress', 'shippingaddress' ];
                
                for ( var ii in arrAddressType)
                {
                    var addressType = arrAddressType[ii];
                    
                    log.debug(logTitle, 'address type..' +  JSON.stringify(recordData[addressType]));
                    
                    if (recordData[addressType])
                    {
                        var lineAddr = isNewCustomer ? -1 : this.searchAddressBook(recordObjExt, recordData[addressType], objFieldMap);
                        
                        var isBilling = (addressType == 'billingaddress');
                        var isShipping = (addressType == 'shippingaddress');
                        
                        if (lineAddr > -1)
                        {
                            hasCustomerAddressChanges = this.editAddress(recordObj, lineAddr, recordData[addressType], isBilling, isShipping, objFieldMap);
                        }
                        else
                        {
                            hasCustomerAddressChanges = this.addToAddress(recordObj, recordData[addressType], isBilling, isShipping, objFieldMap);
                        }
                    }
                }
            }
            log.audit(logTitle, ' isNew / hasChanges / hasAddrChanges ' + JSON.stringify([isNewCustomer, hasCustomerChanges,hasCustomerAddressChanges]));
            log.audit(logTitle, '## PROFILE:Create Customer: (before) ' + ((new Date).getTime() - start_time));
            if (hasCustomerChanges || hasCustomerAddressChanges)
            {
                
                log.debug(logTitle, 'save customer record' );
                returnObj.custrecord_jsonreq_recordid = recordObj.save({
                    enableSourcing : false,
                    ignoreMandatoryFields : true
                });
                returnObj.custrecord_jsonreq_status = RequestStatus.SUCCESS;
            }
            else
            {
                if (customerId)
                {
                    returnObj.custrecord_jsonreq_recordid = customerId;
                    returnObj.custrecord_jsonreq_status = RequestStatus.SUCCESS;
                }
            }
            log.audit(logTitle, '## PROFILE:Create Customer: (after) ' + ((new Date).getTime() - start_time));
            log.debug(logTitle, '### CREATED CUSTOMER ###' + returnObj.custrecord_jsonreq_recordid);
        }
        catch (error)
        {
            returnObj.custrecord_jsonreq_status = RequestStatus.FAIL;
            returnObj.custrecord_jsonreq_messsage = error.toString();
        }
        finally
        {
            returnObj.custrecord_jsonreq_processed = new Date();
        }
        
        returnObj.custrecord_jsonreq_processed = nformat.format(returnObj.custrecord_jsonreq_processed, nformat.Type.DATETIMETZ);
        
        if (!nsutil.isEmpty(requestId))
        {
            nrecord.submitFields({
                type : 'customrecord_json_webrequest',
                id : requestId,
                values : returnObj
            });
            
        }
        
        log.debug(logTitle, 'Results:' + JSON.stringify(returnObj));
        return returnObj;
    };
    
    JSONRequest.editAddress = function(recordObj, lineAddr, addrData, isBilling, isShipping, objFieldMap)
    {
        var start_time = (new Date()).getTime();
        var logTitle = [ LOG_TITLE, 'editAddress' ].join(':');
        recordObj.selectLine({
            sublistId : 'addressbook',
            line : lineAddr
        });
        
        if (isBilling)
        {
            recordObj.setCurrentSublistValue({
                sublistId : 'addressbook',
                fieldId : 'defaultbilling',
                value : true
            });
        }
        if (isShipping)
        {
            recordObj.setCurrentSublistValue({
                sublistId : 'addressbook',
                fieldId : 'defaultshipping',
                value : true
            });
        }
        
        var subRecAddress = recordObj.getCurrentSublistSubrecord({
            sublistId : 'addressbook',
            fieldId : 'addressbookaddress'
        });
        
        if (!nsutil.isEmpty(addrData.country))
        {
            subRecAddress.setValue({
                fieldId : 'country',
                value : addrData.country
            });
        }
        
        for ( var addrfld in addrData)
        {
            if (addrfld !== 'country')
            {
                var fldMap = objFieldMap[addrfld];
                if (nsutil.isEmpty(objFieldMap[addrfld]) || nsutil.isEmpty(addrData[addrfld]))
                {
                    continue;
                }
                subRecAddress.setValue({
                    fieldId : fldMap.field,
                    value : addrData[addrfld]
                });
            }
        }
        recordObj.commitLine({
            sublistId : 'addressbook'
        });
        
        log.audit(logTitle, '## PROFILE:...editAddress: ' + ((new Date).getTime() - start_time));        
        return true;
    };
    
    /**
     * 
     */
    JSONRequest.addToAddress = function(recordObj, addrData, isBilling, isShipping, objFieldMap)
    {
        var start_time = (new Date()).getTime();
        var logTitle = [ LOG_TITLE, 'addToAddress' ].join(':');  
        
        log.debug(logTitle, 'function add address');        
        
        recordObj.selectNewLine({
            sublistId : 'addressbook'
        });
        
        if (isBilling)
        {
            recordObj.setCurrentSublistValue({
                sublistId : 'addressbook',
                fieldId : 'defaultbilling',
                value : true
            });
        }
        if (isShipping)
        {
            recordObj.setCurrentSublistValue({
                sublistId : 'addressbook',
                fieldId : 'defaultshipping',
                value : true
            });
        }
        
        var subRecAddress = recordObj.getCurrentSublistSubrecord({
            sublistId : 'addressbook',
            fieldId : 'addressbookaddress'
        });
        
        if (!nsutil.isEmpty(addrData.country))
        {
            subRecAddress.setText({
                fieldId : 'country',
                value : addrData.country// 
            });
        }
        
        for ( var addrfld in addrData)
        {
            
            log.debug(logTitle, 'addrfld:' + addrfld);
            
            if (addrfld !== 'country' && addrfld !== 'addressee')
            {
                var fldMap = objFieldMap[addrfld];
                if (nsutil.isEmpty(objFieldMap[addrfld]) || nsutil.isEmpty(addrData[addrfld]))
                {
                    continue;
                }
                log.debug(logTitle, '.. addr value: ' + JSON.stringify([addrfld, fldMap.field, addrData[addrfld] ]) );
                subRecAddress.setValue({
                    fieldId : fldMap.field,
                    value : addrData[addrfld]
                });
                log.debug(logTitle, '.. addr value: ' + JSON.stringify([addrfld, fldMap.field, addrData[addrfld] ]) );
            }
        }
        
        recordObj.commitLine({
            sublistId : 'addressbook'
        });
        
        log.debug(logTitle, 'commit addressbook');
        log.audit(logTitle, '## PROFILE:...add Address: ' + ((new Date).getTime() - start_time));
        return true;
    };
    
    JSONRequest.isSameAddress = function(addrData1, addrData2)
    {
//      log.debug('>>>isSameAddress ', '>>> addrData1: ' + JSON.stringify(addrData1));
//      log.debug('>>>isSameAddress ', '>>> addrData2: ' + JSON.stringify(addrData2));
        // combine first the colums 
        var arrAddrCols = [];
        
        for (var fld in addrData1)
        {
            if (!nsutil.inArray(fld,arrAddrCols))
            {
                arrAddrCols.push(fld);
            }
        }
        for (var fld in addrData2)
        {
            if (!nsutil.inArray(fld,arrAddrCols))
            {
                arrAddrCols.push(fld);
            }
        }
//      log.debug('>>>isSameAddress ', '>>> addr columns: ' + JSON.stringify(arrAddrCols));
        
        var isSame = true;
        arrAddrCols.forEach(function(fld)
        {
            if (!isSame) return;
            if (  (nsutil.isEmpty(addrData1[fld]) && nsutil.isEmpty(addrData2[fld])) || (!nsutil.isEmpty(addrData1[fld]) && addrData1[fld]==addrData2[fld]) )
            {
                return;
            }
            else isSame = false;
        });
        log.debug('>>>isSameAddress ', '>>> is same? ' + JSON.stringify(isSame));
        
        return isSame;
    };
    
    /**
     * @param {record.Record}
     * @memberOf JSONRequest
     */
    JSONRequest.searchAddressBook = function(recordObj, addressData, mapFieldAddr)
    {
        var logTitle = [ LOG_TITLE, 'searchAddressBook' ].join(':');
        var start_time = (new Date()).getTime();
        
        var lineMatch = -1;
        var lineAddrCount = recordObj.getLineCount({
            sublistId : 'addressbook'
        });
        
        for (var line = 0; line < lineAddrCount; line++)
        {
            var subrecord = recordObj.getSublistSubrecord({
                sublistId : 'addressbook',
                fieldId : 'addressbookaddress',
                line : line
            });
            // recordObj.selectLine({sublistId: 'addressbook', line: line});
            // var subrecord =
            // recordObj.getCurrentSublistSubrecord({sublistId:'addressbook',fieldId:'addressbookaddress'});
            
            var currentAddrData = {};
            var requestAddrData = {};
            
            for ( var fieldAddr in addressData)
            {
                if (!addressData[fieldAddr] || !mapFieldAddr[fieldAddr])
                {
                    continue;
                }
                var mapField = mapFieldAddr[fieldAddr];
                
                requestAddrData[fieldAddr] = addressData[fieldAddr];
                currentAddrData[fieldAddr] = subrecord.getValue({
                    fieldId : mapField.field
                });
            }
            
            if (this.isSameAddress(requestAddrData, currentAddrData))
            {
                lineMatch = line;
                break;
            }
        }
        log.audit(logTitle, '## PROFILE:...searchAddressBook ' + ((new Date).getTime() - start_time));
        return lineMatch;
    },

    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.searchCustomer = function(recordData)
    {
        var logTitle = [ LOG_TITLE, 'searchCustomer' ].join(':');
        var start_time = (new Date()).getTime(); 
        
        log.debug(logTitle, '## Search Customer: ' + JSON.stringify(recordData));
        
        var entityId = null;
        if (!entityId && !nsutil.isEmpty(recordData.customerid)) // this is
        // the
        // externalid
        {
            entityId = this.searchCustomerByExternalId(recordData.customerid);// 5
        }
        
        if (!entityId && !nsutil.isEmpty(recordData.customer_jsonid))
        {
            entityId = this.searchCustomerByJsonId(recordData.customer_jsonid);// 2
        }
        /*
         * if (!entityId && !nsutil.isEmpty(recordData.email)) // this is the
         * externalid { entityId =
         * this.searchCustomerByEmail(recordData.email);//5 }
         * 
         * if (!entityId) { entityId = this.searchCustomerByInfo(recordData); }
         */
        
        log.audit(logTitle, '## PROFILE:...searchCustomer : ' + ((new Date).getTime() - start_time));
        log.debug(logTitle, '## ...returns: ' + JSON.stringify(entityId));
        return entityId;
    };
    
    
    JSONRequest.searchCustomerJSONData = function (option)
    {
        var logTitle = [ LOG_TITLE, 'searchCustomerJSONData'].join(':');
        log.debug(logTitle, '...search parameter: ' + JSON.stringify(option));

        var jsonData = false;
        
        if ( option.customer_jsonid)
        {
            jsonData = nsearch.lookupFields({
                type : 'customrecord_json_webrequest',
                id : option.customer_jsonid,
                columns : [ 'custrecord_jsonreq_recordid', 'custrecord_jsonreq_recordtype', 'custrecord_jsonreq_content','custrecord_jsonreq_recordid']
            });
        }
        else if (option.salesorder_jsonid)
        {
            // get the batch id 
            var salesOrderData = nsearch.lookupFields({
                type : 'customrecord_json_webrequest',
                id : option.salesorder_jsonid,
                columns : [ 'custrecord_jsonreq_batch']
            });
            
            //regina - fix for _marshal error in prod            
            if (salesOrderData.custrecord_jsonreq_batch)
            {
                log.debug(logTitle, 'salesOrderData.custrecord_jsonreq_batch = '  + JSON.stringify(salesOrderData.custrecord_jsonreq_batch));
                var objJSONBatch = salesOrderData.custrecord_jsonreq_batch[0];
                log.debug(logTitle, 'objJSONBatch = '  + JSON.stringify(objJSONBatch));                               
                var stJSONBatchReq = objJSONBatch.value;
                
                var arrJSONSearch = nsutil.searchAll({
                    recordType: 'customrecord_json_webrequest',
                    columns: ['custrecord_jsonreq_recordid', 'custrecord_jsonreq_recordtype', 'custrecord_jsonreq_content', 'custrecord_jsonreq_recordid'],
                    filterExpression: [['custrecord_jsonreq_batch', 'anyof', stJSONBatchReq], 'AND', ['custrecord_jsonreq_recordtype', 'is', 'customer']]
                });                    
                
                if (arrJSONSearch)
                {
                    arrJSONSearch.forEach(function(rowData){
                        jsonData = {};
                        jsonData.custrecord_jsonreq_recordid = rowData.getValue({name:'custrecord_jsonreq_recordid'});
                        jsonData.custrecord_jsonreq_recordtype = rowData.getValue({name:'custrecord_jsonreq_recordtype'});
                        jsonData.custrecord_jsonreq_content = rowData.getValue({name:'custrecord_jsonreq_content'});
                        jsonData.custrecord_jsonreq_recordid = rowData.getValue({name:'custrecord_jsonreq_recordid'});
                        return true;
                    });
                }
            }
        }
        
        log.debug(logTitle, '...json_data: ' + JSON.stringify(jsonData));
        
        return jsonData;
    };
    
    
    
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.searchCustomerByExternalId = function(externalId)
    {
        var logTitle = [ LOG_TITLE, 'searchCustomer', 'searchCustomerByExternalId' ].join(':');
        log.debug(logTitle, '...search parameter: ' + JSON.stringify(externalId));
        
        var cacheKey = [ 'searchCustomerByExternalId', externalId ].join(':');
        
        if (CACHE[cacheKey] == null)
        {
            CACHE[cacheKey] = false;
            
            var arrCustomerSearch = nsutil.searchAll({
                recordType : nrecord.Type.CUSTOMER,
                columns : [ 'internalid' ],
                filterExpression : [ [ 'externalid', nsearch.Operator.IS, externalId ] ]
            });
            
            if (arrCustomerSearch && arrCustomerSearch.length)
            {
                CACHE[cacheKey] = arrCustomerSearch[0].id;
            }
        }
        
        return CACHE[cacheKey];
    };
    
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.searchCustomerByJsonId = function(jsonId)
    {
        var logTitle = [ LOG_TITLE, 'searchCustomer', 'searchCustomerByJsonId' ].join(':');
        log.debug(logTitle, '...search parameter: ' + JSON.stringify(jsonId));
        
        var cacheKey = [ 'searchCustomerByJsonId', jsonId ].join(':');
        if (CACHE[cacheKey] == null)
        {
            CACHE[cacheKey] = false;
            
            // get it from json //
            var jsonData = nsearch.lookupFields({
                type : 'customrecord_json_webrequest',
                id : jsonId,
                columns : [ 'custrecord_jsonreq_recordid', 'custrecord_jsonreq_recordtype' ]
            });
            if (jsonData && jsonData.custrecord_jsonreq_recordtype == 'customer' && jsonData.custrecord_jsonreq_recordid)
            {
                CACHE[cacheKey] = jsonData.custrecord_jsonreq_recordid;
            }
        }
        
        return CACHE[cacheKey];
    };
    
    /**
     * @param {Object}
     *            customerData
     * @memberOf JSONRequest
     */
    JSONRequest.searchCustomerByInfo = function(customerData)
    {
        var logTitle = [ LOG_TITLE, 'searchCustomer', 'searchCustomerByInfo' ].join(':');
        
        var searchFields = [ 'lastname', 'firstname', 'email' ];
        var searchData = {};
        var hasSearchValue = false;
        searchFields.forEach(function(field)
        {
            var searchValue = customerData[field];
            if (searchValue)
            {
                searchData[field] = searchValue;
                hasSearchValue = true;
            }
            return true;
        });
        
        log.debug(logTitle, '...search parameter: ' + JSON.stringify([ hasSearchValue, searchData ]));
        var cacheKey = [ 'searchCustomerByInfo', JSON.stringify(searchData) ];
        
        if (!hasSearchValue)
        {
            return false;
        }
        
        if (CACHE[cacheKey] == null)
        {
            
            var filterExpr = [];
            var hasFirstName = false;
            
            if (!nsutil.isEmpty(searchData['lastname']) && !nsutil.isEmpty(searchData['firstname']))
            {
                filterExpr.push([ [ 'lastname', nsearch.Operator.IS, searchData.lastname ], 'AND', [ 'firstname', nsearch.Operator.IS, searchData.firstname ] ]);
                
                hasFirstName = true;
            }
            
            if (!nsutil.isEmpty(searchData['email']))
            {
                if (hasFirstName)
                {
                    filterExpr.push('AND');
                }
                
                filterExpr.push([ 'email', nsearch.Operator.IS, searchData.email ]);
            }
            
            var arrCustomerSearch = nsutil.searchAll({
                recordType : nrecord.Type.CUSTOMER,
                columns : [ 'internalid' ],
                filterExpression : filterExpr
            });
            
            if (arrCustomerSearch && arrCustomerSearch.length)
            {
                CACHE[cacheKey] = arrCustomerSearch[0].id;
            }
        }
        
        return CACHE[cacheKey];
    };
    
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.searchCustomerByEmail = function(email)
    {
        return JSONRequest.searchCustomerByInfo({
            'email' : email
        });
    };
    
    // ///// TRANSACTIONS //////////
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.searchTransactionByExternalId = function(externalId, stRecType)
    {
        var cacheKey = [ 'searchTransactionByExternalId', externalId, stRecType ].join(':');
        
        if (CACHE[cacheKey] == null)
        {
            CACHE[cacheKey] = false;
            
            var arrTransaction = nsutil.searchAll({
                recordType : stRecType,
                columns : [ 'internalid' ],
                filterExpression : [ [ 'externalid', nsearch.Operator.IS, externalId ], 'AND', [ 'mainline', nsearch.Operator.IS, true ] ]
            });
            
            if (arrTransaction && arrTransaction.length)
            {
                log.debug(cacheKey, 'arrTransaction[0]: ' + JSON.stringify(arrTransaction[0]));
                CACHE[cacheKey] = arrTransaction[0].id;
            }
        }
        
        return CACHE[cacheKey];
    };
    
    //start - regina - 10/22 - return reason code
    
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.searchReturnReasonCode = function(recordData)
    {
        var externalId = recordData.returnreasoncodeid;
        
        var stReturnReasonCodeId = null;
        if (!nsutil.isEmpty(externalId))
        {
            stReturnReasonCodeId = this.searchReturnReasonCodeByExternalId(externalId); // 10
        }
        
        return stReturnReasonCodeId;
    };
        
     /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.searchReturnReasonCodeByExternalId = function(externalId)
    {
        var logTitle = [ LOG_TITLE, 'searchReturnReasonCode', 'searchReturnReasonCodeByExternalId' ].join(':');
        log.debug(logTitle, '...search parameter: ' + JSON.stringify(externalId));
        
        var cacheKey = [ 'searchReturnReasonCodeByExternalId', externalId ].join(':');
        
        if (CACHE[cacheKey] == null)
        {
            CACHE[cacheKey] = false;
            
            var arrRRCSearch = nsutil.searchAll({
                recordType : 'customrecord_return_reason_code',
                columns : [ 'internalid' ],
                filterExpression : [ [ 'externalid', nsearch.Operator.IS, externalId ] ]
            });
            
            if (arrRRCSearch && arrRRCSearch.length)
            {
                CACHE[cacheKey] = arrRRCSearch[0].id;
            }
        }
        
        return CACHE[cacheKey];
    };
    //end - regina - 10/22 - return reason code
    
    // ///// POPULATE RECEIVING LOCATION //////////
    /**
     * @param {Object}
     *            recordData
     * @memberOf JSONRequest
     */
    JSONRequest.populateReceivingLocation = function(stLoc)
    {
        var logTitle = 'JSONRequest.populateReceivingLocation'
        var stRecAreaLocId = '';
        
        // Get for the parent name..
        var objLookupLoc = nsearch.lookupFields({
            type : 'location',
            id : stLoc,
            columns : [ 'name', 'namenohierarchy' ]
        });
        
        var stParent = objLookupLoc.name.substring(0, objLookupLoc.name.length - objLookupLoc.namenohierarchy.length - 3);
        log.debug(logTitle, 'stParent = ' + stParent);
        
        // If parent name is empty, it means that the current location is the
        // parent
        if (nsutil.isEmpty(stParent))
        {
            stParent = objLookupLoc.namenohierarchy;
        }
        
        // Search for the receiving location based on the parent location
        var arrSearchFilters = [];
        
        arrSearchFilters.push(nsearch.createFilter({
            name : 'name',
            operator : nsearch.Operator.STARTSWITH,
            values : stParent
        }));
        
        arrSearchFilters.push(nsearch.createFilter({
            name : 'custrecord_sears_receiving_area',
            operator : nsearch.Operator.IS,
            values : [ 'T' ]
        }));
        
        arrSearchFilters.push(nsearch.createFilter({
            name : 'isinactive',
            operator : nsearch.Operator.IS,
            values : [ 'F' ]
        }));
        
        var arrSearchColumns = [ 'internalid', 'name', 'namenohierarchy' ];
        
        var arrItemSearchResult = nsutil.searchList(null, 'location', arrSearchFilters, arrSearchColumns);
        
        log.debug(logTitle, 'arrItemSearchResult = ' + JSON.stringify(arrItemSearchResult));
        
        // Set the receiving location
        if (!nsutil.isEmpty(arrItemSearchResult))
        {
            stRecAreaLocId = arrItemSearchResult[0].getValue({
                name : 'internalid'
            });
            
            log.debug(logTitle, 'stRecAreaLocId = ' + stRecAreaLocId);
        }
        
        return stRecAreaLocId;
    };
    
    /////////////////////////////////////////////////////////////
    
    
        //regina - 11/15 - use customrecord for credentials
	JSONRequest.getCredentialConfig = function(stScriptId)
    {
        var objCredential = {};
			
		var arrConfig = nsutil.searchAll({
			recordType : 'customrecord_sears_credentials_config',
			columns : [ 'internalid','custrecord_sears_cc_consumerkey','custrecord_sears_cc_consumersecret','custrecord_sears_cc_tokenkey',
						'custrecord_sears_cc_tokensecret','custrecord_sears_cc_username','custrecord_sears_cc_password','custrecord_sears_cc_passwordtoken',
                        'custrecord_sears_cc_url' ],
			filterExpression : [ [ 'custrecord_sears_cc_scriptid', nsearch.Operator.IS, stScriptId ], 'AND', [ 'isinactive', nsearch.Operator.IS, false ]]
		});
		
		if (arrConfig && arrConfig.length)
		{
			objCredential = {				
				id: arrConfig[0].id,					
				recordType: arrConfig[0].recordType,					
				CONSUMER_KEY: arrConfig[0].getValue('custrecord_sears_cc_consumerkey'),
				CONSUMER_SECRET: arrConfig[0].getValue('custrecord_sears_cc_consumersecret'),					
				TOKEN_KEY: arrConfig[0].getValue('custrecord_sears_cc_tokenkey'),
				TOKEN_SECRET: arrConfig[0].getValue('custrecord_sears_cc_tokensecret'),					
				USERNAME: arrConfig[0].getValue('custrecord_sears_cc_username'),
				PASSWORD: arrConfig[0].getValue('custrecord_sears_cc_password'),
				PASSWORD_TOKEN: arrConfig[0].getValue('custrecord_sears_cc_passwordtoken'),
                URL: arrConfig[0].getValue('custrecord_sears_cc_url')
			};
		}
        return objCredential;
    };
	//regina - 11/15 - end
	
    
    return JSONRequest;
    
    
    //////////////////////////////////////////////////////////////////////////////////
    
    function getConfigFieldMap (recordType)
    {
        var fieldMaps = {};
        
        fieldMaps.valueaddfields = {
                'custcol_va001_gift_box': 'VA001', 
                'custcol_va002_gift_wrap': 'VA020', 
                'custcol_va003_gift_card': 'VA003',
                'custcol_va004_monogrmming': 'VA004',
                'custcol_va005_dryer_hookup_top_fr_ld': 'VA005',
                'custcol_va006_elec_or_bed_frame_assem': 'VA006',
                'custcol_va007_fridge_door_swing_chang': 'VA007',
                'custcol_va008_front_load_washer_hooku': 'VA008',
                'custcol_va009_home_delivery_service': 'VA009',
                'custcol_va010_home_deli_service_weeke': 'VA010',
                'custcol_va011_mattress_pickup': 'VA011',
                'custcol_va012_pedestal_install_per_pa': 'VA012',
                'custcol_va013_time_spec_within_del_wi': 'VA013',
                'custcol_va014_take_away_scrap_applian': 'VA014',
                'custcol_va016_top_load_washer_hookup': 'VA015',
                'custcol_va017_tractor_snowblower_asse': 'VA016',
                'custcol_va018_stacking_kit_install': 'VA018',
                'custcol_va019_store_stock_delivery': 'VA019'
        };
        
        /** SALES ORDER **/
        fieldMaps.salesorder = {
            'customer' : {
                'field' : 'entity',
                'setas' : 'text',
                'type' : 'text'
            },
            'trandate' : {
                'field' : 'trandate',
                'setas' : 'value',
                'type' : 'date'
            },
            'shipdate' : {
                'field' : 'shipdate',
                'setas' : 'value',
                'type' : 'date'
            },
            'shippingcost' : {
                'field' : 'shippingcost',
                'setas' : 'value',
                'type' : 'text'
            },
            'department' : {
                'field' : 'department',
                'setas' : 'text',
                'type' : 'text'
            },
            'memo' : {
                'field' : 'memo',
                'setas' : 'value',
                'type' : 'text'
            },
            'item' : {
                'field' : 'trandate',
                'setas' : 'text',
                'type' : 'date'
            },
            'quantity' : {
                'field' : 'quantity',
                'setas' : 'value',
                'type' : 'integer'
            },
            'amount' : {
                'field' : 'amount',
                'setas' : 'value',
                'type' : 'currency'
            },
            'rate' : {
                'field' : 'rate',
                'setas' : 'value',
                'type' : 'currency'
            },
            'taxcode' : {
                'field' : 'taxcode',
                'setas' : 'text',
                'type' : 'text'
            },
            'description' : {
                'field' : 'description',
                'setas' : 'text',
                'type' : 'text'
            },
            'paymentmethod' : {
                'field' : 'paymentmethod',
                'setas' : 'text',
                'type' : 'text'
            },
            'paymentmethodid' : {
                'field' : 'paymentmethod',
                'setas' : 'value',
                'type' : 'text'
            },
            'ccnumber' : {
                'field' : 'ccnumber',
                'setas' : 'value',
                'type' : 'text'
            },
            'ccexpiredate' : {
                'field' : 'ccexpiredate',
                'setas' : 'value',
                'type' : 'date'
            },
            'custbody_cc_number_last4':{
                'field' : 'custbody_cc_number_last4',
                'setas' : 'value',
                'type' : 'text'
            },

            'custbody_delivery_date' : {
                'field' : 'custbody_delivery_date',
                'setas' : 'value',
                'type' : 'date'
            },
            'custbody_shipping_schedule' : {
                'field' : 'custbody_shipping_schedule',
                'setas' : 'value',
                'type' : 'text'
            },
           
            'departmentid' : {
                'field' : 'department',
                'setas' : 'value',
                'type' : 'text'
            },
            'custbody_esi_tran_id' : {
                'field' : 'custbody_esi_tran_id',
                'setas' : 'value',
                'type' : 'text'
            },
            'shipmethod' : {
                'field' : 'shipmethod',
                'setas' : 'text',
                'type' : 'text'
            },
            'shipmethodid' : {
                'field' : 'shipmethodid',
                'setas' : 'value',
                'type' : 'text'
            },
            'pnrefnum' : {
                'field' : 'pnrefnum',
                'setas' : 'value',
                'type' : 'text'
            },
            'authcode' : {
                'field' : 'authcode',
                'setas' : 'value',
                'type' : 'text'
            },
            'custbody_cybersource_approval_status' : {
                'field' : 'custbody_cybersource_approval_status',
                'setas' : 'value',
                'type' : 'text'
            },
            'custcol_messagetothereceiver': {
                'field' : 'custcol_messagetothereceiver',
                'setas' : 'value',
                'type' : 'text'
            },
            'custcol_clear_flag': {
                'field' : 'custcol_clear_flag',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_gift_registry_num': {
                'field' : 'custcol_gift_registry_num',
                'setas' : 'value',
                'type' : 'text'
            },
            'custcol_va001_gift_box' : {
                'field' : 'custcol_va001_gift_box',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_va002_gift_wrap' : {
                'field' : 'custcol_va002_gift_wrap',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_va003_gift_card' : {
                'field' : 'custcol_va003_gift_card',
                'setas' : 'value',
                'type' : 'text'
            },
            'custcol_va004_monogrmming' : {
                'field' : 'custcol_va004_monogrmming',
                'setas' : 'value',
                'type' : 'text'
            },
            'custcol_va005_dryer_hookup_top_fr_ld' : {
                'field' : 'custcol_va005_dryer_hookup_top_fr_ld',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_va006_elec_or_bed_frame_assem' : {
                'field' : 'custcol_va006_elec_or_bed_frame_assem',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_va007_fridge_door_swing_chang' : {
                'field' : 'custcol_va007_fridge_door_swing_chang',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_va008_front_load_washer_hooku' : {
                'field' : 'custcol_va008_front_load_washer_hooku',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_va009_home_delivery_service' : {
                'field' : 'custcol_va009_home_delivery_service',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_va010_home_deli_service_weeke' : {
                'field' : 'custcol_va010_home_deli_service_weeke',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_va011_mattress_pickup' : {
                'field' : 'custcol_va011_mattress_pickup',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_va012_pedestal_install_per_pa' : {
                'field' : 'custcol_va012_pedestal_install_per_pa',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_va013_time_spec_within_del_wi' : {
                'field' : 'custcol_va013_time_spec_within_del_wi',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_va014_take_away_scrap_applian' : {
                'field' : 'custcol_va014_take_away_scrap_applian',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_va016_top_load_washer_hookup' : {
                'field' : 'custcol_va016_top_load_washer_hookup',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_va017_tractor_snowblower_asse' : {
                'field' : 'custcol_va017_tractor_snowblower_asse',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_va018_stacking_kit_install' : {
                'field' : 'custcol_va018_stacking_kit_install',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custcol_va019_store_stock_delivery' : {
                'field' : 'custcol_va019_store_stock_delivery',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custbody_delivery_date' : {
                'field' : 'custbody_delivery_date',
                'setas' : 'value',
                'type' : 'date'
            },            
            'custbody_phone_wms': {
                'field' : 'custbody_phone_wms',
                'setas' : 'value',
                'type' : 'text'
            },
            'custbody_gift_message': {
                'field' : 'custbody_gift_message',
                'setas' : 'value',
                'type' : 'text'
            },
            'custbody_loyalty_number': {
                'field' : 'custbody_loyalty_number',
                'setas' : 'value',
                'type' : 'text'
            },
            'custbody_email_opt_in': {
                'field' : 'custbody_email_opt_in',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custbody_locale': {
                'field' : 'custbody_locale',
                'setas' : 'value',
                'type' : 'text'         
            },
            'custcol_promo_code': {
                'field' : 'custcol_promo_code',
                'setas' : 'value',
                'type' : 'text'         
            },
            'custcol_promo_id': {
                'field' : 'custcol_promo_id',
                'setas' : 'value',
                'type' : 'text'         
            },
            'custcol_discount_amount': {                /*Mca243*/
                'field' : 'custcol_discount_amount',
                'setas' : 'value',
                'type' : 'text'         
            },
            'custbody_ship_to_store': {
                'field' : 'custbody_ship_to_store',
                'setas' : 'value',
                'type' : 'checkbox'
            },
            'custbody_store_location_id': {
                'field' : 'custbody_store_location_id',
                'setas' : 'value',
                'type' : 'text'
            },
            'custbody_paypalauthrequestid': {
                'field' : 'custbody_paypalauthrequestid',
                'setas' : 'value',
                'type' : 'text'
            },
            'custbody_paypalauthid': {
                'field' : 'custbody_paypalauthid',
                'setas' : 'value',
                'type' : 'text'
            },
            'custbody_paypalauthtoken': {
                'field' : 'custbody_paypalauthtoken',
                'setas' : 'value',
                'type' : 'text'
            }
        };
        

        return fieldMaps[recordType] || false;
    };
});
