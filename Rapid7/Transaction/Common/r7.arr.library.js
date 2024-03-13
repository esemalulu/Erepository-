/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([
    'N/error',
    'N/https',
    'N/log',
    'N/record',
    'N/runtime',
    '/SuiteScripts/Toolbox/CryptoJS.min',
    '../../Toolbox/r7.tryCatch',
    'N/format',
], function (error, https, log, record, runtime, cryptojs, tryCatch, format) {

    function callArrService(requestBody) {
        log.debug({ title: 'callArrService', details: 'start' });

        const environment = runtime.envType === runtime.EnvType.PRODUCTION ? 'prod' : 'test';
        const url = runtime.getCurrentScript().getParameter({ name: `custscript_r7_cash_arr_service_url_${environment}` });
        const apiSecret = `custsecret_r7_cash_arr_service_api_${environment}`;

        const secureString = https.createSecureString({
            input: '{' + apiSecret + '}'
        });

        const calculate = tryCatch(https.post, {
            url,
            body: JSON.stringify({ body: requestBody }),
            headers: {
                'x-api-key': secureString
            }
        });

        if (!calculate.isSuccess) {
            calculate.isValid = false;
            return calculate;
        }

        const response = calculate.result;

        return validateAndFormatResponse(response?.body, requestBody);
    }

    function updateTransactionHeaderFields(currentRecord, response) {
        const headerFieldsMap = {
            'SERVICES': 'custbody_r7_total_services',
            'HARDWARE': 'custbody_r7_total_hardware',
            'OTHER': 'custbody_r7_cash_other',
            'EXCESS': 'custbody_r7_total_excess_term',
            'PERPETUAL': 'custbody_r7_total_perpetual',
            'PERPETUAL-AS': 'custbody_r7_total_perpetual'
        };
        response.body.cashValues
        .filter(cashValue => cashValue.rule !== 'SUBSCRIPTION')
        .forEach(cashValue => {
            const fieldId = headerFieldsMap[cashValue.rule];
            const value = cashValue.oneTimeRevenue;
            currentRecord.setValue({ fieldId, value });
            response.arrValues[cashValue.rule] = value;
        });

        currentRecord.setValue({ fieldId: 'custbody_r7_total_arr', value: response.totalArr });
        currentRecord.setValue({ fieldId: 'custbody_r7_total_excess_term', value: response.totalExcess });
        response.arrValues.totalCashARR = response.totalArr;
        response.arrValues.totalExcessTerm = response.totalExcess;
    }

    function updateTransactionLineFields(currentRecord, response) {
        const lineFieldsMap = {
            'Services': 'custcol_r7_services_cash',
            'Hardware': 'custcol_r7_hardware_cash',
            'Other': 'custcol_r7_other_cash',
            'Excess': 'custcolr7_cash_excess_term_line',
            'Perpetual': 'custcol_r7_perpetual_cash',
            'Perpetual-AS': 'custcol_r7_perpetual_cash'
        };
        response.body.transactionLineItems
        .forEach(lineItem => {
            const sublistId = 'item';
            const line = lineItem.id - 1;
            const cashValueField = lineFieldsMap[lineItem.cashValueCategory];

            if (cashValueField && lineItem.cashValueCategory !== 'Subscription') {
                currentRecord.setSublistValue({
                    sublistId,
                    line,
                    fieldId: cashValueField,
                    value: lineItem.oneTimeRevenue
                });
            }

            currentRecord.setSublistValue({
                sublistId,
                line,
                fieldId: 'custcol_r7_cash_arr',
                value: lineItem.annualRecurringRevenue
            });

            currentRecord.setSublistValue({
                sublistId,
                line,
                fieldId: 'custcolr7_cash_excess_term_line',
                value: lineItem.excessTerm
            });
        });
    }

    function buildFinalPayload(newRecord, request, response) {
        log.debug({ title: 'Final Payload', details: 'Building final payload' });

        const isSalesOrder = response.recordType === record.Type.SALES_ORDER;
        const isReturnAuthorization = response.recordType === record.Type.RETURN_AUTHORIZATION;
        const currentRecord = record.load({ type: newRecord.type, id: newRecord.id });
        
        if (!isSalesOrder && !isReturnAuthorization) {
            return;
        }

        const payload = {
            id: currentRecord.id,
            source: "Netsuite",
            salesforceOrderId: currentRecord.getValue({
                fieldId: 'custbodyr7salesforceorderid'
            }),
            object: response.recordType === record.Type.SALES_ORDER ? "Sales_Order" : "Return_Authorization",
            cashValues: {
                totalCashARR: response.arrValues.totalCashARR,
                totalExcessTerm: response.arrValues.totalExcessTerm,
                totalPerpetual: response.arrValues.PERPETUAL,
                totalServices: response.arrValues.SERVICES,
                totalHardware: response.arrValues.HARDWARE,
                totalOther: response.arrValues.OTHER
            },
            transactionLineItems: []
        }

        payload.transactionLineItems = response.body.transactionLineItems
        .map(requestLine => {
            return {
                id: requestLine.id,
                excessTerm: requestLine.excessTerm,
                grossAmount: requestLine.grossAmount,
                netAmountNoTax: requestLine.netAmountNoTax,
                oneTimeRevenue: requestLine.oneTimeRevenue,
                annualRecurringRevenue: requestLine.annualRecurringRevenue,
                startDate: isNullOrEmpty(requestLine.startDate) ? null : requestLine.startDate,
                endDate: isNullOrEmpty(requestLine.endDate) ? null : requestLine.endDate,
                item: currentRecord.getSublistText({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: requestLine.id - 1
                }),
                description: currentRecord.getSublistText({
                    sublistId: 'item',
                    fieldId: 'description',
                    line: requestLine.id - 1
                })
            };
        });

        return payload;
    }

    function updateTransaction(newRecord, request, response) {
        log.debug({ title: 'Updating transaction', details: 'Updating transaction' });

        const currentRecord = record.load({ type: newRecord.type, id: newRecord.id });

        updateTransactionHeaderFields(currentRecord, response);
        updateTransactionLineFields(currentRecord, response);

        const requestHash = cryptojs.MD5(JSON.stringify(request)).toString();
        currentRecord.setValue({ fieldId: 'custbody_r7_arr_request_hash', value: requestHash });

        var save = tryCatch(currentRecord.save);

        if (!save.isSuccess) {
            // setArrEventFailed(newRecord, arrEventId, save);
            log.error("Cannot Save Current Record", save);
        }
    }

    function updateTransactionArrEvent(newRecord, arrEventId) {
        const CALCULATION_COMPLETED = '3';
        const currentRecord = record.load({ type: newRecord.type, id: newRecord.id });

        currentRecord.setValue({ fieldId: 'custbody_r7_cash_arr_calc_status', value: CALCULATION_COMPLETED });
        currentRecord.setValue({ fieldId: 'custbody_r7_arr_event_id', value: arrEventId });

        var save = tryCatch(currentRecord.save);

        if (!save.isSuccess) {
            setArrEventFailed(newRecord, arrEventId, save);
        }
    }

    function updateOpportunity(currentRecord, response) {
        const isQuote = response.recordType === record.Type.ESTIMATE;
        const isPrimary = currentRecord.getValue({ fieldId: 'custbodyr7includeinsalesforecast' });
        const opportunityId = currentRecord.getValue({ fieldId: 'opportunity' });

        if (!isQuote || !isPrimary || !opportunityId) {
            return;
        }

        const headerFieldsMap = {
            'SERVICES': 'custbody_r7_total_services',
            'HARDWARE': 'custbody_r7_total_hardware',
            'OTHER': 'custbody_r7_cash_other',
            'EXCESS': 'custbody_r7_total_excess_term',
            'PERPETUAL': 'custbody_r7_total_perpetual',
            'PERPETUAL-AS': 'custbody_r7_total_perpetual'
        };

        const values = {
            'custbody_r7_total_arr': response.totalArr,
            'custbody_r7_total_excess_term': response.totalExcess
        };

        response.body.cashValues
            .filter(cashValue => cashValue.rule !== 'SUBSCRIPTION')
            .forEach(cashValue => {
                const fieldId = headerFieldsMap[cashValue.rule];
                values[fieldId] = cashValue.oneTimeRevenue;
            });

        record.submitFields({
            type: record.Type.OPPORTUNITY,
            id: opportunityId,
            values
        });
    }

    function validateAndFormatResponse(responseBody, requestBody) {
        let formattedResponse = {};
        let body;

        const defaultResponse = {
            isValid: false,
            body: responseBody
        };

        try {
            body = JSON.parse(responseBody)?.body;
        } catch (ex) {
            log.error({ title: 'Invalid Response', details: ex.message });

            return {
                ...defaultResponse,
                name: 'INVALID_RESPONSE',
                message: `There was an error with your request.  The request body could not be parsed.  Error Message: ${ex.message}`
            };
        }

        if (!body) {
            log.error({ title: 'Empty Response Body', details: responseBody });

            return {
                ...defaultResponse,
                name: 'EMPTY_BODY',
                message: 'No body was returned with the response',
                response: responseBody
            };
        }

        if (Object.keys(body).length === 0) {
            return {
                ...defaultResponse,
                body,
                name: 'EMPTY_RESPONSE',
                message: 'There was an error with your response. The response body is empty'
            };
        }

        if (isNullOrEmpty(body.id) || !Array.isArray(body.transactionLineItems)) {
            return {
                ...defaultResponse,
                body,
                name: 'INVALID_RESPONSE_DATA',
                message: 'There was an error with your request data. Please check request JSON. SO id or transactionLineItems arr is empty'
            };
        }

        const linesValid = body.transactionLineItems.every(function (item) {
            return !isNullOrEmpty(item.id) && !isNullOrEmpty(item.annualRecurringRevenue);
        });

        if (!linesValid) {
            return {
                ...defaultResponse,
                body,
                name: 'INVALID_RESPONSE_DATA',
                message: 'There was an error with your request data in transactionLineItems. Please check request JSON. Line id or annualRecurringRevenue value is empty'
            };
        }

        formattedResponse.totalArr = body.transactionLineItems
            .reduce((accumulator, item) => accumulator + item.annualRecurringRevenue, 0);

        formattedResponse.totalExcess = body.transactionLineItems
            .reduce((accumulator, item) => accumulator + item.excessTerm, 0);

        formattedResponse.arrValues = body.cashValues
            .filter(item => item.rule !== 'SUBSCRIPTION')
            .reduce((accumulator, item) => {
                accumulator[item.rule] = item.oneTimeRevenue;
                return accumulator;
            }, {});

        formattedResponse.isValid = true;
        formattedResponse.recordType = getRecordType(body);
        formattedResponse.body = body;

        return formattedResponse;
    }

    function createArrEvent(request, response, error, status, payload) {
        log.debug({ title: 'createArrEvent', details: 'Creating ARR Event' });

        const body = response?.body;
        const FINAL_ARR_EVENT_CREATED = 6;

        status = status || FINAL_ARR_EVENT_CREATED;
        error = error || '';

        const arrEvent = record.create({ type: 'customrecord_arr_event' })
            .setValue({ fieldId: 'custrecord_r7_publishing_status', value: status })
            .setValue({ fieldId: 'custrecordr7_request_body', value: JSON.stringify(request) })
            .setValue({ fieldId: 'name', value: 'ARR Inbound Event ' + request.id })
            .setValue({ fieldId: 'custrecord_r7_arr_transaction', value: request.id })
            .setValue({ fieldId: 'custrecordr7_errormessage', value: error || '' })
            .setValue({ fieldId: 'custrecordr7_body2', value: JSON.stringify(body) })
            .setValue({ fieldId: 'custrecordr7_final_arr_payload', value: JSON.stringify(payload) });

        const create = tryCatch(arrEvent.save);

        return create.result;
    }

    function createFailedArrEvent(request, response) {
        const ARR_EVENT_PROCESS_RESPONSE_FAILED = '4';
        const error = response?.body;

        createArrEvent(request, null, error, ARR_EVENT_PROCESS_RESPONSE_FAILED);
    }

    function setArrEventFailed(transaction, eventId, error) {
        log.debug({ title: 'error', details: error });
        const ARR_EVENT_RESPONSE_PROCESS_FAILED = 4;
        const ERROR = 4;

        record.submitFields({
            type: 'customrecord_arr_event',
            id: eventId,
            values: {
                'custrecord_r7_publishing_status': ARR_EVENT_RESPONSE_PROCESS_FAILED,
                'custrecordr7_errormessage': JSON.stringify(error)
            }
        });

        record.submitFields({
            type: transaction.type,
            id: transaction.id,
            values: {
                'custbody_r7_cash_arr_calc_status': ERROR,
                'custbody_r7_arr_event_id': eventId
            }
        });
    }

    function getRecordType(responseBody) {
        const recordTypes = {
            'Sales_Order': record.Type.SALES_ORDER,
            'Quote': record.Type.ESTIMATE,
            'Credit_Memo': record.Type.CREDIT_MEMO,
            'Cash_Refund': record.Type.CASH_REFUND,
            'Return_Authorization': record.Type.RETURN_AUTHORIZATION
        };

        return recordTypes[responseBody.object];
    }

    function isArrCalculationRequired(request, currentRecord) {
        const CALCULATION_COMPLETED = '3';

        const forceCalculation = runtime.getCurrentScript().getParameter({ name: 'custscript_r7_force_arr_calculation' });
        const isCalculationCompleted = currentRecord.getValue({ fieldId: 'custbody_r7_cash_arr_calc_status' }) === CALCULATION_COMPLETED;

        const oldHash = currentRecord.getValue({ fieldId: 'custbody_r7_arr_request_hash' });
        const newHash = cryptojs.MD5(JSON.stringify(request)).toString();

        currentRecord.setValue({ fieldId: 'custbody_r7_arr_request_hash', value: newHash });

        return forceCalculation || !isCalculationCompleted || newHash !== oldHash;
    }

    function isArrOverride(currentRecord) {
        return currentRecord.getValue({ fieldId: 'custbody_r7_arr_override' });
    }

    function isNullOrEmpty(value) {
        return !!(value === undefined || value === null || value === '');
    }

    return {
        callArrService,
        createArrEvent,
        createFailedArrEvent,
        updateTransaction,
        buildFinalPayload,
        updateOpportunity,
        isArrOverride,
        isArrCalculationRequired,
        updateTransactionArrEvent
    };
});