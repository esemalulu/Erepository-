/*
 * Copyright (c) 2023, Oracle and/or its affiliates.
 * 500 Oracle Parkway Redwood Shores, CA 94065
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ('Confidential Information'). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */
/**
 * @NApiVersion 2.x
 * @NScriptType userEventScript
 * @NModuleScope SameAccount
 *
 * Version    Date        Author              Remarks
 * 1.00       5/26/2023   Ricardo Francisco   Case 5186850 - Initial Commit
 *
 */

define(['N/search', 'N/record'], function (search, record) {

    /**
     *
     * Executed prior to any write operation on the record.
     * Changes made to the current record in this script persist after the write operation.
     * This event can be used to validate the submitted record, perform any restriction and permission checks, and
     * perform any last-minute changes to the current record.
     *
     * @param context = { newRecord: record.Record, oldRecord: record.Record, type: string }
     */
    function beforeSubmit(context) {
        if (context.type !== context.UserEventType.CREATE) {
            return;
        }

        var stMethodName = 'beforeSubmit';
        log.debug({
            title: stMethodName, details: '* * * S t a r t * * *'
        });

        try {
            var recNew = context.newRecord;
            var intLineCount = recNew.getLineCount({sublistId: 'line'});

            var arrObjAmorSched = [];
            for (var i = 0; i < intLineCount; i++) {
                var intSchedNum = recNew.getSublistValue({sublistId: 'line', fieldId: 'schedulenum', line: i});
                var intLineuniquekey = recNew.getSublistValue({sublistId: 'line', fieldId: 'lineuniquekey', line: i});

                arrObjAmorSched.push({schedNum: intSchedNum, lineuniquekey: intLineuniquekey});
            }

            log.debug({
                title: stMethodName, details: 'Amortization Schedules: ' + JSON.stringify(arrObjAmorSched)
            });

            if (arrObjAmorSched.length > 0) {
                var arrAmorSched = arrObjAmorSched.map(function (el) {
                    return el.schedNum;
                });

                log.debug({
                    title: stMethodName, details: 'Amortization Schedules Numbers: ' + arrAmorSched
                });

                var arrObjBillId = [];
                var objSearch = search.create({
                    type: search.Type.AMORTIZATION_SCHEDULE,
                    filters:
                        [
                            ['internalid', search.Operator.ANYOF, arrAmorSched]
                        ],
                    columns:
                        [
                            'internalid',
                            'srctran',
                            search.createColumn({
                                name: 'lineuniquekey',
                                join: 'transaction'
                            })
                        ]
                });

                objSearch.run().each(function (result) {
                    // .run().each has a limit of 4,000 results
                    arrObjBillId.push({
                        schedNum: result.getValue('internalid'),
                        sourceTrans: result.getValue('srctran'),
                        sourceLineUniqueKey: result.getValue({
                            name: 'lineuniquekey',
                            join: 'transaction'
                        })
                    });

                    return true;
                });

                log.debug({
                    title: stMethodName,
                    details: 'Amortization Schedules x Source Transac: ' + JSON.stringify(arrObjBillId)
                });

                // getting PO and Invoice #
                if (arrObjBillId.length > 0) {
                    var arrBillId = arrObjBillId.map(function (el) {
                        return el.sourceTrans;
                    });

                    var arrLineUniqueKey = arrObjBillId.map(function (el) {
                        return el.sourceLineUniqueKey;
                    });

                    var arrLineUniqueKeyFilter = [];
                    for (var i = 0; i < arrLineUniqueKey.length; i++) {
                        var arrLineFilter = ['lineuniquekey', search.Operator.EQUALTO, arrLineUniqueKey[i]];

                        arrLineUniqueKeyFilter.push(arrLineFilter);

                        if (i < arrLineUniqueKey.length - 1) {
                            arrLineUniqueKeyFilter.push('OR');
                        }
                    }

                    var objSearch = search.create({
                        type: search.Type.VENDOR_BILL,
                        filters:
                            [
                                ['type', search.Operator.ANYOF, 'VendBill'],
                                'AND',
                                ['internalid', search.Operator.ANYOF, arrBillId],
                                'AND',
                                arrLineUniqueKeyFilter
                            ],
                        columns:
                            [
                                'tranid',
                                'custcol_coupa_po_number',
                                'externalid'
                            ]
                    });

                    var arrObjBillInfo = [];
                    objSearch.run().each(function (result) {
                        // .run().each has a limit of 4,000 results
                        /*log.debug({
                            title: stMethodName,
                            details: 'result: ' + JSON.stringify(result)
                        });*/

                        var stExernalId = result.getValue('externalid');
                        stExernalId = stExernalId.split('Coupa-VendorBill ')[1];

                        arrObjBillInfo.push({
                            sourceTrans: result.id,
                            poNmber: result.getValue('custcol_coupa_po_number'),
                            externalId: stExernalId || ''
                        });

                        return true;
                    });

                    log.debug({
                        title: stMethodName,
                        details: 'Bill Info: ' + JSON.stringify(arrObjBillInfo)
                    });

                    // updating fields
                    for (var x = 0; x < arrObjBillInfo.length; x++) {

                        for (var b = 0; b < arrObjBillId.length; b++) {

                            if (arrObjBillInfo[x].sourceTrans != arrObjBillId[b].sourceTrans) {
                                continue;
                            }

                            for (var i = 0; i < intLineCount; i++) {
                                var intSchedNum = recNew.getSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'schedulenum',
                                    line: i
                                });

                                if (arrObjBillId[b].schedNum != intSchedNum) {
                                    continue;
                                }

                                if (!isEmpty(arrObjBillInfo[x].poNmber)) {
                                    recNew.setSublistValue({
                                        sublistId: 'line',
                                        fieldId: 'custcol_coupa_po_number',
                                        value: arrObjBillInfo[x].poNmber,
                                        line: i
                                    });
                                }

                                if (!isEmpty(arrObjBillInfo[x].externalId)) {
                                    recNew.setSublistValue({
                                        sublistId: 'line',
                                        fieldId: 'custcol_coupa_invoice_number',
                                        value: arrObjBillInfo[x].externalId,
                                        line: i
                                    });
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            log.error({
                title: stMethodName, details: 'Error: ' + error.message
            });
        } finally {
            log.debug({
                title: stMethodName, details: '* * * E n d * * *'
            });
        }
    }

    function isEmpty(value) {
        if (value == null || value == undefined || value == 'undefined' || value == '') {
            return true;
        }
        return false;
    }

    return {
        beforeSubmit: beforeSubmit
    }
});