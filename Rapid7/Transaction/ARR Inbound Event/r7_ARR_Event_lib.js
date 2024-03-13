define([
    'N/error',
    'N/search',
    'N/email',
    'N/url',
    'N/https',
    'N/record',
    '/SuiteScripts/Administrative/r7.retry',
    '/SuiteScripts/Transaction/ARR Inbound Event/r7_ARR_Common_Lib.js',
    'N/format'
],
function(error, search, email, url, https, record, retry, commonLib, format) {

    function processEvent(requestBody, eventId, recordType) {
        log.debug('ENTERED LIBRARY event id ' + eventId, requestBody);
        checkRequiredValues(requestBody);

        return retry({
            maxTries: 3,
            functionToExecute: processObject,
            arguments: [requestBody, recordType],
            retryOnError: 'RCRD_HAS_BEEN_CHANGED'
        });
    }

    function processObject(requestBody, recordType) {
        var response = {};
        var tranRecord = record.load({
            type: recordType,
            id: requestBody.id
        });
        var arrValues = {};
        processHeader(requestBody, tranRecord, arrValues);
        requestBody.transactionLineItems.forEach(function(item) {
            processLine(item, tranRecord);
        });
        if (recordType == record.Type.ESTIMATE) {
            var primaryQuote = checkIfPrimary(tranRecord);
            response.id = tranRecord.save();
            if (response.id && primaryQuote) {
                oppId = processOpportunity(requestBody, tranRecord, requestBody);
            }
            return response;
        } else if (recordType == record.Type.SALES_ORDER || recordType == record.Type.RETURN_AUTHORIZATION) {
            buildJSONPayload(response, tranRecord, requestBody, arrValues, recordType);
        }
        response.id = tranRecord.save();
        return response;
    }

    function processHeader(requestBody, tranRecord, arrValues) {
        var totalArr = 0;
        var totalExcess = 0;

        requestBody.cashValues.forEach(function(headerItem) {
            var cashValue = headerItem.oneTimeRevenue;
            totalArr = totalArr + headerItem.annualRecurringRevenue;
            totalExcess = totalExcess + headerItem.excessTerm;
            if (headerItem.rule !== 'SUBSCRIPTION') {
                log.debug('processHeader arrValues',arrValues);
                arrValues[headerItem.rule] = cashValue;
                var fieldName = selectArrField(headerItem, 'header');
                tranRecord.setValue({
                    fieldId: fieldName,
                    value: cashValue
                });
            }
        });
        tranRecord.setValue({
            fieldId: 'custbody_r7_total_arr',
            value: totalArr
        });
        tranRecord.setValue({
            fieldId: 'custbody_r7_total_excess_term',
            value: totalExcess
        });
        arrValues.totalCashARR = totalArr;
        arrValues.totalExcessTerm = totalExcess;
    }

    function processLine(item, tranRecord) {
        var cashValue = item.oneTimeRevenue;
        var arrValue = item.annualRecurringRevenue;
        var excessValie = item.excessTerm;
        if (item.cashValueCategory !== 'Subscription') {
            var fieldName = selectArrField(item, 'line');
            tranRecord.setSublistValue({
                sublistId: 'item',
                line: item.id - 1,
                fieldId: fieldName,
                value: cashValue
            });
        }

        tranRecord.setSublistValue({
            sublistId: 'item',
            line: item.id - 1,
            fieldId: 'custcol_r7_cash_arr',
            value: arrValue
        });
        tranRecord.setSublistValue({
            sublistId: 'item',
            line: item.id - 1,
            fieldId: 'custcolr7_cash_excess_term_line',
            value: excessValie
        });
        
    }

    function selectArrField(item, block) {
        var ruleTypesMap = {};
        if (block === 'header') {
            ruleTypesMap = {
                'SERVICES': 'custbody_r7_total_services',
                'HARDWARE': 'custbody_r7_total_hardware',
                'OTHER': 'custbody_r7_cash_other',
                'EXCESS': 'custbody_r7_total_excess_term',
                'PERPETUAL': 'custbody_r7_total_perpetual',
                'PERPETUAL-AS': 'custbody_r7_total_perpetual'
            };
        } else if (block === 'line') {
            ruleTypesMap = {
                'Services': 'custcol_r7_services_cash',
                'Hardware': 'custcol_r7_hardware_cash',
                'Other': 'custcol_r7_other_cash',
                'Excess': 'custcolr7_cash_excess_term_line',
                'Perpetual': 'custcol_r7_perpetual_cash',
                'Perpetual-AS': 'custcol_r7_perpetual_cash'
            };
        }
        var filedToSeach = block == 'header' ? item.rule : item.cashValueCategory;
        var fieldToUpdate = ruleTypesMap[filedToSeach];
        if (commonLib.isNullOrEmpty(fieldToUpdate)) {
            throw error.create({
                name: 'INVALID_ARR_TYPE',
                message: 'JSON data contains ARR type that is not defined in ruleTypesMap, please check ' + filedToSeach,
            });
        }
        return fieldToUpdate;
    }

    function checkRequiredValues(requestBody) {
        if (commonLib.isNullOrEmpty(requestBody.id) ||
            commonLib.isNullOrEmpty(requestBody.transactionLineItems) ||
            requestBody.transactionLineItems.length === 0
        ) {
            throw error.create({
                name: 'INVALID_REQUEST_DATA',
                message: 'There was an error with your request data. Please check request JSON. SO id or transactionLineItems arr is empty'
            });
        }
        requestBody.transactionLineItems.forEach(function(item) {
            if (commonLib.isNullOrEmpty(item.id) ||
                commonLib.isNullOrEmpty(item.annualRecurringRevenue)
            ) {
                throw error.create({
                    name: 'INVALID_REQUEST_DATA',
                    message: 'There was an error with your request data in transactionLineItems. Please check request JSON. Line id or annualRecurringRevenue value is empty'
                });
            }
        });
    }

    function processOpportunity(requestBody, quoteRecord) {
        var opportunityId = quoteRecord.getValue({
            fieldId: 'opportunity'
        });
        if (!commonLib.isNullOrEmpty(opportunityId)) {
            log.debug('GOT opportunity for primary quote', quoteRecord.id);
            var oppRec = record.load({
                type: record.Type.OPPORTUNITY,
                id: opportunityId
            });
            var arrValues = {};
            processHeader(requestBody, oppRec,arrValues);
            /*requestBody.transactionLineItems.forEach(function(item){
                processLine(item,oppRec)
            })*/
            return oppRec.save();
        }

    }

    function checkIfPrimary(quoteRecord) {
        return quoteRecord.getValue({
            fieldId: 'custbodyr7includeinsalesforecast'
        });
    }

    function buildJSONPayload(response, tranRecord, requestBody, arrValues, recordType) {
        if(recordType == record.Type.SALES_ORDER){
            response.JSONPayload = {
                "id": tranRecord.id,
                "source": "Netsuite",
                "salesforceOrderId": tranRecord.getValue({
                    fieldId: 'custbodyr7salesforceorderid'
                }),
                "object": "Sales_Order",
                "cashValues": {},
                "transactionLineItems": []
            };
        } else if(recordType == record.Type.RETURN_AUTHORIZATION){
            response.JSONPayload = {
                "id": tranRecord.id,
                "source": "Netsuite",
                "salesforceOrderId": tranRecord.getValue({
                    fieldId: 'custbodyr7salesforceorderid'
                }),
                "object": "Return_Authorization",
                "cashValues": {},
                "transactionLineItems": []
            };
        }
        
        var cashValues = response.JSONPayload.cashValues;
        cashValues.totalCashARR = arrValues.totalCashARR;
        cashValues.totalExcessTerm = arrValues.totalExcessTerm;
        cashValues.totalPerpetual = arrValues.PERPETUAL;
        cashValues.totalServices = arrValues.SERVICES;
        cashValues.totalHardware = arrValues.HARDWARE;
        cashValues.totalOther = arrValues.OTHER;
        var lineValues = response.JSONPayload.transactionLineItems;
        for (var i in requestBody.transactionLineItems) {
            var requestLine = requestBody.transactionLineItems[i];
            lineValues.push({
                id: requestLine.id,
                excessTerm: requestLine.excessTerm,
                excegrossAmountssTerm: requestLine.grossAmount,
                netAmountNoTax: requestLine.netAmountNoTax,
                oneTimeRevenue: requestLine.oneTimeRevenue,
                annualRecurringRevenue: requestLine.annualRecurringRevenue,
                startDate: commonLib.isNullOrEmpty(requestLine.startDate)?null:requestLine.startDate,
                endDate: commonLib.isNullOrEmpty(requestLine.endDate)?null:requestLine.endDate,
                item: tranRecord.getSublistText({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: requestLine.id- 1
                }),
                description: tranRecord.getSublistText({
                    sublistId: 'item',
                    fieldId: 'description',
                    line: requestLine.id- 1
                })
            });
        }
        log.debug('buildJSONPayload response', response);
    }
    return {
        processEvent: processEvent
    };
});