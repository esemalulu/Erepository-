/**
 * 
 * @NApiVersion 2.x
 * @NScriptType usereventscript
 */
define(['N/record', 'N/search', 'N/task', 'N/format', 'N/runtime'],

function(record, search, task, format, runtime) {
    var EndPoint = {};
    var logTitle = "ValidateRefundAmount";

    EndPoint.beforeSubmit = function (scriptContext)
    {
        log.debug(logTitle, "***START***");
        var createdFromId = scriptContext.newRecord.getValue({fieldId:'createdfrom'});
        var currentRefundTotal = scriptContext.newRecord.getValue({fieldId:'total'});

        //this weird set of try/catch statements is to find the sales order record. it should technically go into a function i guess
        log.debug(logTitle, "CREATED FROM:"+createdFromId);
        var orderRecord = getSalesOrderRecord(createdFromId);
        if (orderRecord == null) {
            return;
        }
        var externalId = orderRecord.getValue({fieldId:'externalid'});
        var orderId = orderRecord.id;
        log.debug(logTitle, "SALES ORDER EXT ID:"+externalId);
        log.debug(logTitle, "SALES ORDER INTERNAL ID:"+orderId);

        var refundIds = getRefundIds(orderId);
        log.debug(logTitle, "ALL REFUNDS FOR ORDER:"+refundIds);

        /*var orderRecord = record.load({
            type: record.Type.SALES_ORDER, 
            id: orderId
        }); 
        var orderTotal = orderRecord.getValue({fieldId:'total'});*/
        var cashSaleIds = getIds(orderId, search.Type.CASH_SALE);
        var orderTotal = 0;
        for (var i=0; i < cashSaleIds.length; i++) {
            var cashSaleRecord = record.load({
                type: record.Type.CASH_SALE, 
                id: cashSaleIds[i]
            }); 
            var cashSaleAmount = cashSaleRecord.getValue({fieldId:'total'});
            orderTotal += cashSaleAmount;
        }
        log.debug(logTitle, "CASH SALE ORDER TOTAL:"+orderTotal);
        
        var refundTotal = currentRefundTotal;
        var messageObj = [];
        for (var i=0; i < refundIds.length; i++) {
            var refundRecord = record.load({
                type: record.Type.CASH_REFUND, 
                id: refundIds[i]
            }); 
            var refundAmount = refundRecord.getValue({fieldId:'total'});
            var tranId = refundRecord.getValue({fieldId:'tranid'});
            
            messageObj.push({
                "amount":refundAmount,
                "tranId":tranId
            });
            log.debug(logTitle, "REFUND " + refundIds[i] + " AMOUNT IS " + refundAmount);
            refundTotal += refundAmount;
        }
        log.debug(logTitle, "REFUND TOTAL AMOUNT:"+refundTotal);
        
        if (refundTotal > orderTotal) {
            var message = "Creating this refund will bring total refunded amount to $" +refundTotal+ " (order total is $" +orderTotal+ ").  You can not refund more than the customer has been charged for.\n\nPlease review existing refund records:\n";
            for (var i=0; i < messageObj.length; i++) {
                message += messageObj[i].tranId + "- $" +  messageObj[i].amount + "\n";
            }
            throw message;
        }        
        else {
            log.debug(logTitle, "REFUND AMOUNT VALID");
        }
        log.debug(logTitle, "***FINISH***");
        return;
    };

    function getSalesOrderRecord (createdFromId) {
        var orderRecord;
        log.debug(logTitle, "CREATED FROM:"+createdFromId);
        try {
            orderRecord = record.load({
                type: record.Type.PURCHASE_ORDER, 
                id: createdFromId
            }); 
            log.debug(logTitle, "IS A PURCHASE ORDER, IGNORING");
            log.debug(logTitle, "***FINISH***");
            return null;
        }
        catch (e) {
            try {
                orderRecord = record.load({
                    type: record.Type.CASH_SALE, 
                    id: createdFromId
                }); 
                log.debug(logTitle, "IS A CASH SALE");
                createdFromId = orderRecord.getValue({fieldId:'createdfrom'});

                orderRecord = record.load({
                    type: record.Type.SALES_ORDER, 
                    id: createdFromId
                }); 
                log.debug(logTitle, "IS A SALES ORDER");
            }
            catch (e) {
                orderRecord = record.load({
                    type: record.Type.RETURN_AUTHORIZATION, 
                    id: createdFromId
                }); 
                log.debug(logTitle, "IS A RETURN AUTHORIZATION");
                createdFromId = orderRecord.getValue({fieldId:'createdfrom'});

                try {
                    orderRecord = record.load({
                        type: record.Type.SALES_ORDER, 
                        id: createdFromId
                    }); 
                    log.debug(logTitle, "IS A SALES ORDER");
                }
                catch (e) {
                    try {
                        orderRecord = record.load({
                            type: record.Type.CASH_SALE, 
                            id: createdFromId
                        }); 
                        log.debug(logTitle, "IS A CASH SALE");

                        createdFromId = orderRecord.getValue({fieldId:'createdfrom'});
                        orderRecord = record.load({
                            type: record.Type.SALES_ORDER, 
                            id: createdFromId
                        }); 
                        log.debug(logTitle, "IS A SALES ORDER");
                    }
                    catch (e) {
                        log.debug(logTitle, "IS A PURCHASE ORDER, IGNORING");
                        log.debug(logTitle, "***FINISH***");
                        return null;
                    }
                }
            }
        }
        return orderRecord;
    }

    function getRefundIds (orderId) {
        var refundIds = [];
        var returnIds = getIds(orderId, search.Type.RETURN_AUTHORIZATION);  
        var cashSaleIds = getIds(orderId, search.Type.CASH_SALE);
        for (var i=0; i < cashSaleIds.length; i++) {
            returnIds = returnIds.concat(getIds(cashSaleIds[i], search.Type.RETURN_AUTHORIZATION));
        }

        log.debug(logTitle, "LETS GO FIND SOME REFUNDS:"+cashSaleIds+","+returnIds);
        for (var i=0; i < returnIds.length; i++) {
            refundIds = refundIds.concat(getIds(returnIds[i], search.Type.CASH_REFUND));
        }
        for (var i=0; i < cashSaleIds.length; i++) {
            refundIds = refundIds.concat(getIds(cashSaleIds[i], search.Type.CASH_REFUND));
        }
        return refundIds;
    }

    function getIds (orderId, searchType) {
        var ids = [];
        var idSearch = search.create({
            type: searchType,
            columns: [{
                name: 'internalid'
            }],
            filters: [{
                name: 'createdfrom',
                operator: 'is',
                values: [orderId]
            },
            {
                name: 'mainline',
                operator: 'is',
                values: ['T']
            }]
        });
        idSearch.run().each(function(result) {
            ids.push(result.getValue({ name:'internalid'}));
            return true;
        });
        log.debug(logTitle, searchType + " found:"+ ids);
        return ids;
    }

    return EndPoint;
});
