// noinspection DuplicatedCode

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([
    'N/config',
    'N/log',
    'N/record',
    'N/runtime',
    'N/search'
], function (config, log, record, runtime, search) {
    function afterSubmit(context) {
        const { type } = context;
        const { EDIT, APPROVE } = context.UserEventType;
        const PENDING_CALCULATION = 2;

        if (!isDynamicCalcsDisabled()) {
            return;
        }

        log.audit({ title: 'Old Calcs', details: 'Running old ARR calcs process' });

        if (type === EDIT || type === APPROVE) {
            try {
                const currentRecord = context.newRecord;
                const recordType = currentRecord.type;

                const tranSearch = loadAndUpdateSearch(currentRecord);
                const searchResults = tranSearch.run();
                const firstRes = searchResults.getRange({ start: 0, end: 1 });

                log.debug({ title: 'recordType', details: recordType });
                log.debug({ title: 'currentRecord.id', details: currentRecord.id });
                log.debug({ title: 'firstRes.length', details: firstRes.length });

                if (firstRes.length >= 1) {
                    const JSONData = {};
                    createJSON(searchResults, JSONData, recordType);
                    const eventId = createOutboundEventrecord(JSONData);
                    if (!isNullOrEmpty(eventId)) {
                        log.debug({ title: 'created ARR Event with id ', details: eventId });
                        record.submitFields({
                            type: recordType,
                            id: currentRecord.id,
                            values: { 'custbody_r7_cash_arr_calc_status': PENDING_CALCULATION }
                        });
                    }
                }
            } catch (ex) {
                log.error({ title: 'ERROR in afterSubmit', details: ex });
            }
        }
    }

    function beforeSubmit(context) {
        // TODO: This function only runs on Return Authorizations.  It should not be deployed on any other types.
        const executionContext = runtime.executionContext;
        const { USER_INTERFACE } = runtime.ContextType;
        const { RETURN_AUTHORIZATION } = record.Type;
        const { EDIT } = context.UserEventType;

        const { type, newRecord: currentRecord } = context;
        const recordType = currentRecord.type;

        const isCashARROverride = currentRecord.getValue({ fieldId: 'custbody_r7_arr_override' });

        if (executionContext === USER_INTERFACE
            && type === EDIT
            && recordType === RETURN_AUTHORIZATION
            && !isCashARROverride
            && isDynamicCalcsDisabled())
        {
            currentRecord.setValue({ fieldId: 'custbody_r7_total_arr', value: null });
            currentRecord.setValue({ fieldId: 'custbody_r7_total_excess_term', value: null });
            currentRecord.setValue({ fieldId: 'custbody_r7_total_perpetual', value: null });
            currentRecord.setValue({ fieldId: 'custbody_r7_total_services', value: null });
            currentRecord.setValue({ fieldId: 'custbody_r7_total_hardware', value: null });
            currentRecord.setValue({ fieldId: 'custbody_r7_cash_other', value: null });
            currentRecord.setValue({ fieldId: 'custbody_r7_total_arr_usd', value: null });
            currentRecord.setValue({ fieldId: 'custbody_r7_cash_arr_calc_status', value: 1 });
            currentRecord.setValue({ fieldId: 'custbody_r7_arr_override', value: false });

            const lineCount = currentRecord.getLineCount({ sublistId: 'item' });
            for (let i = 0; i < lineCount; i++) {
                // var item = currentRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });
                var itemType = currentRecord.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });
                // var inGroup = currentRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'ingroup' });

                if (itemType !== 'Group' && itemType !== 'EndGroup') {
                    currentRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_r7_cash_arr',
                        value: null,
                        line: i
                    });
                    currentRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_r7_expected_arr',
                        value: null,
                        line: i
                    });
                    currentRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcolr7_cash_excess_term_line',
                        value: null,
                        line: i
                    });
                    currentRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_r7_perpetual_cash',
                        value: null,
                        line: i
                    });
                    currentRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_r7_services_cash',
                        value: null,
                        line: i
                    });
                    currentRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_r7_hardware_cash',
                        value: null,
                        line: i
                    });
                    currentRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_r7_other_cash',
                        value: null,
                        line: i
                    });
                }
            }
        }
    }

    ////////////////////////////////////////////////////////

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

    function createJSON(searchResults, JSONData, recordType) {
        fillInHeader(searchResults, JSONData, recordType);
        fillInLines(searchResults, JSONData);
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

        log.debug({ title: 'fillInHeader recordValue', details: recordValue });

        JSONData.id = firstRes.id;
        JSONData.source = 'Netsuite';
        JSONData.object = recordValue;
        JSONData.partner = firstRes.getText({ name: 'partner' });
        JSONData.shippingCountryCode = firstRes.getValue({ name: 'billcountrycode' });
        JSONData.billingCountryCode = firstRes.getValue({ name: 'shipcountrycode' });

        log.debug({ title: 'fillInHeader', details: JSONData });
    }

    function fillInLines(searchResults, JSONData) {
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
                    log.debug({ title: 'result.getValue(column)', details: result.getValue(column) });
                    lineItemValues.grossAmount = parseFloat(result.getValue(column));
                }

                if (column.label === 'Net Amount / Exchange Rate') {
                    log.debug({ title: 'result.getValue(column)', details: result.getValue(column) });
                    lineItemValues.netAmountNoTax = parseFloat(result.getValue(column));
                }
            });

            JSONData.transactionLineItems.push(lineItemValues);

            return true;
        });

        log.debug({ title: 'fillInLines', details: JSONData });
    }

    function createOutboundEventrecord(JSONData) {
        const ARR_EVENT_CREATED = 1;

        const outboundRec = record.create({ type: 'customrecord_arr_event' });

        outboundRec.setValue({ fieldId: 'custrecord_r7_publishing_status', value: ARR_EVENT_CREATED });
        outboundRec.setValue({ fieldId: 'custrecordr7_request_body', value: JSON.stringify(JSONData) });
        outboundRec.setValue({ fieldId: 'name', value: 'ARR Inbound Event ' + JSONData.id });
        outboundRec.setValue({ fieldId: 'custrecord_r7_arr_transaction', value: JSONData.id });

        return outboundRec.save();
    }

    function isDynamicCalcsDisabled() {
        const disabled = runtime.getCurrentScript().getParameter({ name: 'custscript_r7_disable_dynamic_arr_calcs' });

        return disabled;
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

    return {
        beforeSubmit,
        afterSubmit
    };
});