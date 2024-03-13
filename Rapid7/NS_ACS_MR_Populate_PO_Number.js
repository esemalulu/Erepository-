/*
 * Copyright (c) 2023, Oracle and/or its affiliates.
 * 500 Oracle Parkway Redwood Shores, CA 94065
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * Version  Date       Author             Remarks
 * 1.00     6/16/2023  Ricardo Francisco  Case 5186850 - Initial Commit
 *
 */

define(['N/runtime', 'N/search', 'N/record'],
    function (runtime, search, record) {


        /**
         *
         * Marks the beginning of the script’s execution. The purpose of the input stage is to generate the input data.
         * Executes when the getInputData entry point is triggered. This entry point is required.
         *
         * @param inputContext = { isRestarted: boolean, ObjectRef: { id: [string | number], type: string} }
         * @returns {Array | Object | search.Search | inputContext.ObjectRef | file.File Object}
         */
        function getInputData(inputContext) {
            var stMethodName = 'getInputData';

            try {
                log.debug(stMethodName, '* * *  S t a r t * * * ');

                var objScript = runtime.getCurrentScript();
                var intSearchId = objScript.getParameter('custscript_acs_je_to_pop_po_inv_ss');
                log.audit(stMethodName, 'Search Id: ' + intSearchId);

                var objSearch = [];
                if (!isEmpty(intSearchId)) {
                    objSearch = search.load({id: intSearchId});
                }

                return objSearch;
            } catch (error) {
                log.error(stMethodName, error.message);
            }
        }

        function reduce(reduceContext) {
            var stMethodName = 'reduce';

            log.debug({
                title: stMethodName,
                details: '* * * S t a r t * * *'
            });

            try {
                var objValues = JSON.parse(reduceContext.values[0]);
                //log.audit(stMethodName, 'objValues: ' + JSON.stringify(objValues));

                var intJournalId = objValues.values['GROUP(internalid)'].value;
                log.audit(stMethodName, 'JE Id: ' + intJournalId);

                var recJE = record.load({type: record.Type.JOURNAL_ENTRY, id: intJournalId, isDynamic: false});
                var intLineCount = recJE.getLineCount({sublistId: 'line'});

                var arrObjAmorSched = [];
                for (var i = 0; i < intLineCount; i++) {
                    var intSchedNum = recJE.getSublistValue({sublistId: 'line', fieldId: 'schedulenum', line: i});
                    var intLineuniquekey = recJE.getSublistValue({
                        sublistId: 'line',
                        fieldId: 'lineuniquekey',
                        line: i
                    });

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
                            //log.debug({title: stMethodName,details: 'result: ' + JSON.stringify(result)});
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
                        var bUpdated = false;
                        for (var x = 0; x < arrObjBillInfo.length; x++) {

                            for (var b = 0; b < arrObjBillId.length; b++) {

                                if (arrObjBillInfo[x].sourceTrans != arrObjBillId[b].sourceTrans) {
                                    continue;
                                }

                                for (var i = 0; i < intLineCount; i++) {
                                    var intSchedNum = recJE.getSublistValue({
                                        sublistId: 'line',
                                        fieldId: 'schedulenum',
                                        line: i
                                    });

                                    if (arrObjBillId[b].schedNum != intSchedNum) {
                                        continue;
                                    }

                                    if (!isEmpty(arrObjBillInfo[x].poNmber)) {
                                        recJE.setSublistValue({
                                            sublistId: 'line',
                                            fieldId: 'custcol_coupa_po_number',
                                            value: arrObjBillInfo[x].poNmber,
                                            line: i
                                        });

                                        bUpdated = true;
                                    }

                                    if (!isEmpty(arrObjBillInfo[x].externalId)) {
                                        recJE.setSublistValue({
                                            sublistId: 'line',
                                            fieldId: 'custcol_coupa_invoice_number',
                                            value: arrObjBillInfo[x].externalId,
                                            line: i
                                        });
                                        bUpdated = true;
                                    }
                                }
                            }
                        }

                        if (bUpdated) {
                            recJE.save();
                        }
                    }
                }
            } catch (error) {
                log.error({
                    title: stMethodName, details: 'Error: ' + error.message
                });
            } finally {
                log.debug({
                    title: stMethodName,
                    details: '* * * E n d * * *'
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
            getInputData: getInputData,
            reduce: reduce
        }
    });