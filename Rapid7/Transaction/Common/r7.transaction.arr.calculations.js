// noinspection DuplicatedCode
/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([
    'N/config',
    'N/error',
    'N/log',
    'N/record',
    'N/runtime',
    'N/search',
    '../../Toolbox/CryptoJS.min',
    './r7.arr.library'
], function (config, error, log, record, runtime, search, cryptojs, arr) {
    function beforeLoad(context) {
        const { type, newRecord } = context;
        const { CREATE, COPY } = context.UserEventType;

        if (type !== CREATE && type !== COPY) {
            return;
        }

        const isCreatedFrom = !!newRecord.getValue({ fieldId: 'createdfrom' });

        if (isCreatedFrom) {
            clearArrValues(newRecord);
        }
    }

    function afterSubmit(context) {
        const { type } = context;
        const { CREATE, EDIT, APPROVE } = context.UserEventType;
        const currentRecord = context.newRecord;
        const recordType = currentRecord.type;

        if (![CREATE, EDIT, APPROVE].includes(type)) {
            return;
        }

        if (isDynamicCalcsDisabled()) {
            return;
        }

        if (arr.isArrOverride(currentRecord)) {
            return;
        }

        log.audit({ title: 'New Calcs', details: 'Running new ARR calcs process' });

        const tranSearch = loadAndUpdateSearch(currentRecord);
        const searchResults = tranSearch.run();
        const firstRes = searchResults.getRange({ start: 0, end: 1 });

        if (firstRes.length >= 1) {
            const request = createRequest(searchResults, recordType, currentRecord);

            const isArrCalculationRequired = arr.isArrCalculationRequired(request, currentRecord);
            if (!isArrCalculationRequired) {
                log.debug({ title: 'ARR Calculation', details: 'Skipping ARR Calculation.' });
                return;
            }

            const response = arr.callArrService(request);
            log.debug({ title: 'response', details: response });

            if (!response.isValid) {
                handleInvalidResponse(currentRecord, request, response);
                return;
            }

            arr.updateTransaction(currentRecord, request, response);
            arr.updateOpportunity(currentRecord, response);

            const payload = arr.buildFinalPayload(currentRecord, request, response);
            log.debug({ title: 'payload', details: payload });

            let arrEventId = null;
            if(isAmendExtend(currentRecord)){
                arrEventId = arr.createArrEvent(request, response, null, 3, payload);
            } else {
                arrEventId = arr.createArrEvent(request, response, null, null, payload);
            }
            arr.updateTransactionArrEvent(currentRecord, arrEventId);
        }
    }

    ////////////////////////////////////////////////////////

    function handleInvalidResponse(currentRecord, request, response) {
        log.debug({ title: 'Invalid Response', details: 'Handling invalid response' });

        const TRANSACTION_STATUS_ERROR = '4';

        record.submitFields({
            type: currentRecord.type,
            id: currentRecord.id,
            values: {
                'custbody_r7_cash_arr_calc_status': TRANSACTION_STATUS_ERROR
            }
        });

        arr.createFailedArrEvent(request, response);
        log.error({ title: response.name, details: response.message });
    }

    function loadAndUpdateSearch(currentRecord) {
        const companyPreferences = config.load({ type: config.Type.COMPANY_PREFERENCES });
        const scriptId = companyPreferences.getValue({ fieldId: 'custscript_r7_arr_search_id' });

        // noinspection JSCheckFunctionSignatures
        const tranSearch = search.load({ id: scriptId });

        tranSearch.filters.push(search.createFilter({
            name: 'internalid',
            operator: search.Operator.ANYOF,
            values: currentRecord.id
        }));

        return tranSearch;
    }

    function createRequest(searchResults, recordType, currentRecord) {
        log.debug({ title: 'createRequest', details: 'start' });
        const request = {};

        fillInHeader(searchResults, request, recordType);
        fillInLines(searchResults, request, currentRecord);

        log.debug({ title: 'request', details: request });
        return request;
    }

    function fillInHeader(searchResults, JSONData, recordType) {
        const firstRes = searchResults.getRange({ start: 0, end: 1 })[0];

        var recordValue = recordType === 'salesorder' ? 'Sales_Order' : 'Quote';
        switch (recordType) {
            case 'salesorder':
                recordValue = 'Sales_Order';
                break;
            case 'estimate':
                recordValue = 'Quote';
                break;
            case 'creditmemo':
                recordValue = 'Credit_Memo';
                break;
            case 'cashrefund':
                recordValue = 'Cash_Refund';
                break;
            case 'returnauthorization':
                recordValue = 'Return_Authorization';
                break;
        }

        // log.debug({ title: 'fillInHeader recordValue', details: recordValue });

        JSONData.id = firstRes.id;
        JSONData.source = 'Netsuite';
        JSONData.object = recordValue;
        JSONData.partner = firstRes.getText({ name: 'partner' });
        JSONData.shippingCountryCode = firstRes.getValue({ name: 'billcountrycode' });
        JSONData.billingCountryCode = firstRes.getValue({ name: 'shipcountrycode' });

        // log.debug({ title: 'fillInHeader', details: JSONData });
    }

    function fillInLines(searchResults, JSONData, currentRecord) {
        JSONData.transactionLineItems = [];
        searchResults.each(function (result) {
            const startDate = isNullOrEmpty(result.getValue({ name: 'custcolr7startdate' }))
                ? ''
                : formatNSDate(new Date(result.getValue({ name: 'custcolr7startdate' })));

            const endDate = isNullOrEmpty(result.getValue({ name: 'custcolr7enddate' }))
                ? ''
                : formatNSDate(new Date(result.getValue({ name: 'custcolr7enddate' })));

            const lineItemValues = {
                id: result.getValue({ name: 'linesequencenumber' }),
                cashValueCategory: result.getText({ name: 'custitemr7_cash_value_cat', join: 'item' }),
                productFamily: result.getText({ name: 'custitemr7itemproductfamily', join: 'item' }),
                startDate: startDate,
                endDate: endDate,
                cashValAddlYearSku: result.getValue({ name: 'custitemr7_cash_val_addl_year_sku', join: 'item' })
            };

            const columns = result.columns;
            columns.forEach(function (column) {
                if (column.label === 'Gross Amount / Exchange Rate') {
                    // log.debug({ title: 'result.getValue(column)', details: result.getValue(column) });
                    lineItemValues.grossAmount = parseFloat(result.getValue(column));
                }

                if (column.label === 'Net Amount / Exchange Rate') {
                    // log.debug({ title: 'result.getValue(column)', details: result.getValue(column) });
                    lineItemValues.netAmountNoTax = parseFloat(result.getValue(column));
                }
            });

            JSONData.transactionLineItems.push(lineItemValues);

            return true;
        });

        // log.debug({ title: 'fillInLines', details: JSONData });
    }

    function clearArrValues(newRecord) {
        const bodyFieldIds = [
            'custbody_r7_total_services',
            'custbody_r7_total_hardware',
            'custbody_r7_cash_other',
            'custbody_r7_total_excess_term',
            'custbody_r7_total_perpetual',
            'custbody_r7_total_perpetual',
            'custbody_r7_total_arr',
            'custbody_r7_total_excess_term',
            'custbody_r7_cash_arr_calc_status',
            'custbody_r7_arr_event_id',
            'custbody_r7_arr_request_hash',
        ];

        const lineFieldIds = [
            'custcol_r7_cash_arr',
            'custcol_r7_services_cash',
            'custcol_r7_hardware_cash',
            'custcol_r7_other_cash',
            'custcolr7_cash_excess_term_line',
            'custcol_r7_perpetual_cash',
            'custcol_r7_perpetual_cash'
        ];

        const value = '';

        bodyFieldIds.forEach(fieldId => newRecord.setValue({ fieldId, value }));

        const sublistId = 'item'
        const lineCount = newRecord.getLineCount({ sublistId });

        for (let i = 0; i < lineCount; i++) {
            const line = i;
            lineFieldIds.forEach(fieldId => newRecord.setSublistValue({ sublistId, fieldId, value, line }));
        }
    }

    function isDynamicCalcsDisabled() {
        return runtime.getCurrentScript().getParameter({ name: 'custscript_r7_disable_dynamic_arr_calcs' });
    }

    function formatNSDate(dateObj) {
        if (dateObj) {
            return dateObj.getFullYear() + '-' + (dateObj.getMonth() + 1) + '-' + dateObj.getDate();
        }

        return null;
    }

    function isNullOrEmpty(value) {
        return (value === undefined || value === null || value === '');
    }

    function isAmendExtend(currentRecord) {
        let amendExtendLine = currentRecord.findSublistLineWithValue({
            sublistId: 'item',
            fieldId: 'custcol_r7_early_renewal',
            value: true
        });

        return amendExtendLine >= 0 ? true : false;
    }

    return {
        beforeLoad,
        afterSubmit
    };
});