/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */

/**
 * Copyright (c) 2019 Trajectory Inc.
 * 250 The Esplanade, Suite 402, Toronto, ON, Canada, M5A 1J2
 * www.trajectoryinc.com
 * All Rights Reserved.
 */

/**
 * @System: D-Wave
 * @Module: DWNMR
 * @Version: 1.0.0
 * @Company: Trajectory Inc.
 * @CreationDate: 20160623
 * @FileName: TJINC_DWVNMR_SL_CreateCS.js
 * @NamingStandard: TJINC_NSJ-2-0-0
 */
define(['N/format', 'N/record', 'N/search', '/SuiteScripts/trajectoryinc.com/TJINC_COMMON/TJINC_moment.js', '/SuiteScripts/trajectoryinc.com/TJINC_COMMON/TJINC_NS_Library_SS2'], function (format, record, search, moment, tj) {
    var o__sqs = { 'pending': '1', 'success': '2', 'failed': '3' };
    var o__qubist = { 'active': '1', 'paymentIssue': '2', 'pending': '4' };

    function onRequest(context) {
        try {
            if (context.request.method === 'POST') {
                var s_idSC = '';
                var s_status = '';
                var o_values = {};

                var soId = context.request.parameters.id;
                var s_qty = context.request.parameters.qty;
                log.debug('onRequest - In', 'soId: ' + soId + ', Qty: ' + s_qty);

                var d_start = tj.date2str(format, moment(context.request.parameters.start, 'YYYYMMDD').toDate());
                var o_recCS = record.transform({
                    fromType: record.Type.SALES_ORDER, fromId: soId,
                    toType: record.Type.CASH_SALE, isDynamic: true,
                    defaultValues: { 'billdate': d_start }
                });
                o_recCS.setValue({ fieldId: 'tobeemailed', value: false });

                o_recCS.selectLine({ sublistId: 'item', line: 0 });
                o_recCS.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_tjinc_print_qty', value: s_qty });
                o_recCS.commitLine({ sublistId: 'item' });

                try {
                    s_idSC = o_recCS.save();
                    if (s_idSC) {
                        var o_dat = search.lookupFields({ type: search.Type.CASH_SALE, id: s_idSC, columns: ['status'] });
                        s_status = o_dat.status[0].value;

                        if (s_status === 'deposited') {
                            o_values.custbody_tjinc_sqs_flag = o__sqs.pending;
                            o_values.custbody_tjinc_qubist_status = o__qubist.active;

                        } else {
                            var a_filter = [];
                            a_filter.push(search.createFilter({ name: 'internalid', operator: search.Operator.IS, values: s_idSC }));
                            a_filter.push(search.createFilter({ name: 'mainline', operator: search.Operator.IS, values: true }));
                            var o_result = tj.searchAll({ 'search': search.create({ type: 'transaction', columns: ['paymenteventholdreason'], filters: a_filter }), total: 1 });

                            o_values.custbody_tjinc_sqs_error_description = o_result[0].getValue('paymenteventholdreason');
                            o_values.custbody_tjinc_qubist_status = o__qubist.paymentIssue;
                        }

                    } else {
                        o_values.custbody_tjinc_qubist_status = o__qubist.paymentIssue;
                        log.debug('onRequest [W]', 'CashSale not created');
                    }

                } catch (e) {
                    o_values.custbody_tjinc_sqs_error_description = e.message;
                    o_values.custbody_tjinc_qubist_status = o__qubist.paymentIssue;
                    log.debug('onRequest [W]', e.message);
                }

                record.submitFields({
                    type: record.Type.SALES_ORDER, id: soId, values: o_values,
                    options: { enableSourcing: false, ignoreMandatoryFields: true }
                });
                log.debug('onRequest - Out', 'CashSale: ' + s_idSC + ', Status: ' + s_status + ', Values: ' + JSON.stringify(o_values));
            }
        } catch (e) {
            log.error('onRequest', e.message);
        }
    }

    return {
        onRequest: onRequest
    };
});