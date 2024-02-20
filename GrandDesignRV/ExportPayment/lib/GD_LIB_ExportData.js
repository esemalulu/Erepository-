/**
 * @NApiVersion 2.1
 */
define(['N/record', 'N/search', 'N/task', 'N/runtime', 'N/query', './GD_LIB_ExportConstants', './GD_LIB_ScriptExecutor'],
    /**
     * @param{record} record
     * @param{search} search
     * @param{task} task
     * @param Constants
     * @param ScriptExecutor
     */
    (record, search, task, runtime, query, Constants, ScriptExecutor) => {

        class ExportData {
            constructor() {
                this.processSearch = this.processSearch.bind(this);
                this.getDealerRefundData = this.getDealerRefundData.bind(this);
                this.getDealerRefundExportData = this.getDealerRefundExportData.bind(this);
                this.getVendorPaymentData = this.getVendorPaymentData.bind(this);
                this.getHistoryData = this.getHistoryData.bind(this);
                this._vendorPaymentResultToObject = this._vendorPaymentResultToObject.bind(this);
                this.getVendorPaymentHistoryData = this.getVendorPaymentHistoryData.bind(this);
                this.getDealerRefundHistoryData = this.getDealerRefundHistoryData.bind(this);
                this.getHistoryDataById = this.getHistoryDataById.bind(this);
                this.getVendorPaymentColumns = this.getVendorPaymentColumns.bind(this);
            }

            getExtendedBillInfo(vendorPaymentIds) {

                const resultToObject = (result) => {
                    const billObj = {};
                    billObj.internalId = result.id;
                    billObj.memo = result.getValue('memo');
                    //billObj.date = result.getValue(result.columns[2]);
                    return billObj;
                }

                const searchObj = search.create({
                    type: 'vendorbill',
                    filters:
                        [
                            ['type', 'anyof', 'VendBill'],
                            'AND',
                            ['mainline', 'is', 'T'],
                            'AND',
                            ['custbody_gd_export_processed', 'is', 'F'],
                            'AND',
                            ['applyingtransaction.internalid', 'anyof', vendorPaymentIds],
                            'AND',
                            ['memo', 'isnotempty', '']
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: 'internalid',
                                sort: search.Sort.DESC,
                                label: 'Internal ID'
                            }),
                            search.createColumn({name: 'memo', label: 'Memo'}),
                            /*  search.createColumn({
                                  name: "formulatext",
                                  formula: "TO_CHAR({trandate}, 'MM/DD/YYYY')",
                                  label: "Formula (Text)"
                              }),*/
                        ]
                });
                let records = [];
                searchObj.run().each((result) => {
                    records.push(resultToObject(result));
                    return true;
                });
                return records;
            }

            getAppliedCredits(vendorBillIds) {

                if (!vendorBillIds || vendorBillIds.length === 0)
                    return [];

                const resultToObject = (result) => {
                    const creditObj = {};
                    creditObj.internalId = result.id;
                    creditObj.memo = result.getValue('memo');
                    creditObj.tranDate = result.getValue('trandate');
                    creditObj.amount = result.getValue('amount');
                    creditObj.tranId = result.getValue('tranid');
                    creditObj.appliedToText = result.getValue({name: 'tranid', join: 'appliedToTransaction'});
                    creditObj.appliedToTransactionId = result.getValue({name: 'internalid', join: 'appliedToTransaction'});
                    return creditObj;
                }

                const searchObj = search.create({
                    type: 'vendorcredit',
                    filters:
                        [
                            ['type', 'anyof', 'VendCred'],
                            'AND',
                            ['appliedtotransaction.internalid', 'anyof', vendorBillIds],
                            'AND',
                            ['mainline', 'is', 'T']
                        ],
                    columns:
                        [
                            search.createColumn({name: 'trandate', label: 'Date'}),
                            search.createColumn({name: 'tranid', label: 'Document Number'}),
                            search.createColumn({name: 'memo', label: 'Memo'}),
                            search.createColumn({name: 'amount', label: 'Amount'}),
                            search.createColumn({
                                name: 'internalid',
                                join: 'appliedToTransaction',
                                label: 'Internal ID'
                            }),
                            search.createColumn({
                                name: 'tranid',
                                join: 'appliedToTransaction',
                                label: 'Document Number'
                            }),
                        ]
                });
                let records = [];
                searchObj.run().each((result) => {
                    records.push(resultToObject(result));
                    return true;
                });
                return records;
            }

            getExtendedCreditMemoInfo(refundIds) {
                const resultToObject = (result) => {
                    const creditMemoObj = {};
                    creditMemoObj.internalid = result.id;
                    creditMemoObj.memo = result.getValue('memo');
                    creditMemoObj.poNumber = result.getValue('otherrefnum');
                    return creditMemoObj;
                }
                log.debug('refundIds', refundIds);
                const searchObj = search.create({
                    type: search.Type.CREDIT_MEMO,
                    filters:
                        [
                            ['mainline', 'is', 'T'],
                            'AND',
                            ['appliedtotransaction.internalid', 'anyof', refundIds]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: 'internalid',
                                sort: search.Sort.DESC,
                                label: 'Internal ID'
                            }),
                            search.createColumn({name: 'memo', label: 'Memo'}),
                            search.createColumn({name: 'otherrefnum', label: 'PO Number'}),
                            /*  search.createColumn({
                                  name: "formulatext",
                                  formula: "TO_CHAR({trandate}, 'MM/DD/YYYY')",
                                  label: "Formula (Text)"
                              }),*/
                        ]
                });
                let records = [];
                searchObj.run().each((result) => {
                    records.push(resultToObject(result));
                    return true;
                });
                return records;
            }

            processSearch(searchObj, resultToObject, isDealerRefund) {
                // Let's make 4000 the max number of records to return.
                let beginTime = new Date().getTime();
                let searchResultsPagedData;
                let max = 4;
                let records = [];
                try {
                    searchResultsPagedData = searchObj.runPaged({
                        'pageSize': 1000,
                    });
                } catch (e) {
                    log.error('ERROR IN SEARCH', e);
                    if (e.name === 'ABORT_SEARCH_EXCEEDED_MAX_TIME')
                        return {
                            'errorMsg': 'This search has timed out.'
                        };
                }
                const totalCount = searchResultsPagedData?.count;
                log.debug('TOTAL COUNT', totalCount);
                if (searchResultsPagedData && searchResultsPagedData.count > 0 && searchResultsPagedData.pageRanges) {
                    // If there are more results than the max, then set the pageRanges length to the max.
                    max = searchResultsPagedData.pageRanges.length > max ? max : searchResultsPagedData.pageRanges.length;
                    //searchResultsPagedData.pageRanges.length > max ? searchResultsPagedData.pageRanges.length = max : searchResultsPagedData.pageRanges.length;
                    for (let i = 0; i < max; i++) {
                        const searchPage = searchResultsPagedData.fetch({index: i});
                        if (searchPage && searchPage.data) {
                            searchPage.data.forEach((result) => {
                                /* if (!isDealerRefund && result.getValue({name: 'type', join: 'appliedToTransaction'}) === 'VendBill') {
                                     records.push(resultToObject(result));
                                 }
                                 if (isDealerRefund) {
                                     records.push(resultToObject(result));
                                 }*/
                                records.push(resultToObject(result));
                            });
                        }
                    }
                }
                let elapsedTime = (new Date().getTime() - beginTime);
                log.debug({title: 'processSearch elapsedTime', details: elapsedTime});
                return records;
            }

            getVendorPaymentColumns() {
                return [
                    search.createColumn({
                        name: 'internalid',
                        summary: 'GROUP',
                        label: 'Internal ID'
                    }),
                    search.createColumn({
                        name: 'entity',
                        summary: 'GROUP',
                        label: 'Name'
                    }),
                    search.createColumn({
                        name: 'tranid',
                        summary: 'GROUP',
                        sort: search.Sort.DESC,
                        label: 'Document Number'
                    }),
                    search.createColumn({
                        name: 'netamount',
                        summary: 'MIN',
                        label: 'Amount (Net)'
                    }),
                    search.createColumn({
                        name: 'grossamount',
                        summary: 'MIN',
                        label: 'Amount (Gross)'
                    }),
                    search.createColumn({
                        name: 'trandate',
                        summary: 'GROUP',
                        label: 'Date'
                    }),
                    search.createColumn({
                        name: 'memo',
                        summary: 'GROUP',
                        label: 'Memo'
                    })
                ]
            }

            getVendorPaymentData(isPrepProcessed = true) {
                const prepProcessedFilter = isPrepProcessed ? 'T' : 'F';
                log.debug('prepProcessedFilter', prepProcessedFilter)
                const filters =
                    [
                        ['type', 'anyof', 'VendPymt'],
                        'AND',
                        ['status', 'noneof', 'VendPymt:E', 'VendPymt:D', 'VendPymt:V'],
                        'AND',
                        ['mainline', 'is', 'F'],
                        'AND',
                        [[['custbody_gd_export_processed', 'is', 'F']], 'OR', [['tobeprinted', 'is', 'T'], 'OR', ['custbodyrvstobeprinted', 'is', 'T']]], 
                        //[[['custbody_gd_export_processed', 'is', 'T']], 'OR', [['tobeprinted', 'is', 'T'], 'OR', ['custbodyrvstobeprinted', 'is', 'T']]],// just for testing
                        'AND',
                        ['custbody_gd_export_prep_processed', 'is', prepProcessedFilter],
                        'AND',
                        ['datecreated', 'onorafter', 'lastyear'],
                        //['datecreated', 'onorafter', '10/1/2022 12:00 am'],// just for testing
                        'AND',
                        ['appliedtotransaction.type', 'anyof', 'VendBill'],
                        'AND',
                        ['amount', 'greaterthan', '0.00']
                    ];
                if (!isPrepProcessed) {
                    filters.push('AND');
                    filters.push(['tranid', 'isempty', '']);
                }
                log.debug('filters', filters);
                const paymentSearch = search.create({
                    type: 'vendorpayment',
                    filters: filters,
                    columns: this.getVendorPaymentColumns()
                });
                const records = this.processSearch(paymentSearch, this._vendorPaymentResultToObject, false);
                return {
                    'records': records
                }
            }
            
            _vendorPaymentResultToObject(result) {
                const paymentObj = {};
                paymentObj.internalId = result.getValue({name: 'internalid', summary: search.Summary.GROUP});
                paymentObj.vendor = result.getValue({name: 'entity', summary: search.Summary.GROUP});
                paymentObj.vendorName = result.getText({name: 'entity', summary: search.Summary.GROUP});
                paymentObj.tranId = result.getValue({name: 'tranid', summary: search.Summary.GROUP});
                paymentObj.tranDate = result.getValue({name: 'trandate', summary: search.Summary.GROUP});
                paymentObj.netAmount = Math.abs(result.getValue({name: 'netamount', summary: search.Summary.MIN}));
                paymentObj.grossAmount = Math.abs(result.getValue({name: 'grossamount', summary: search.Summary.MIN}));
                paymentObj.memo = result.getValue({name: 'memo', summary: search.Summary.GROUP});
                return paymentObj;
            }

            _dealerRefundResultToObject = (result) => {
                const refundObj = {};
                refundObj.internalId = result.getValue({name: 'internalid', summary: search.Summary.GROUP});
                refundObj.dealer = result.getValue({name: 'entity', summary: search.Summary.GROUP});
                refundObj.dealerName = result.getText({name: 'entity', summary: search.Summary.GROUP});
                refundObj.tranId = result.getValue({name: 'tranid', summary: search.Summary.GROUP});
                refundObj.tranDate = result.getValue({name: 'trandate', summary: search.Summary.GROUP});
                refundObj.netAmount = Math.abs(result.getValue({name: 'netamount', summary: search.Summary.GROUP}));
                refundObj.grossAmount = Math.abs(result.getValue({name: 'grossamount', summary: search.Summary.GROUP}));
                //refundObj.memo = result.getValue('memo');
                return refundObj;
            }

            getDealerRefundData(isPrepProcessed = true) {
                const prepProcessedFilter = isPrepProcessed ? '1' : '0';
                const filters =
                    [
                        ['type', 'anyof', 'CustRfnd'],
                        'AND',
                        ['mainline', 'is', 'F'],
                        'AND',
                        [[['custbody_gd_export_processed', 'is', 'F']], 'AND', [['tobeprinted', 'is', 'T'], 'OR', ['custbodyrvstobeprinted', 'is', 'T']]],
                        'AND',
                        ['trandate', 'after', '4/7/2023'],
                        'AND',
                        ['applyingtransaction.type', 'anyof', 'CustCred'],
                        'AND',
                        ['voided', 'is', 'F'],
                        'AND',
                        [['paymentmethod', 'anyof', '2'], 'OR', ['paymentoption', 'startswith', 'Check']],
                        'AND',
                        ['transactionnumbernumber', 'isnotempty', ''],
                        'AND',
                        ['formulanumeric: CASE NVL({custbody_gd_export_prep_processed}, \'F\') WHEN \'F\' THEN 0 ELSE 1 END', 'equalto', `${prepProcessedFilter}`]
                    ];
                log.debug('filters', filters);
                const searchObj = search.create({
                    type: 'customerrefund',
                    filters: filters,
                    columns:
                        [
                            search.createColumn({
                                name: 'tranid',
                                summary: 'GROUP',
                                sort: search.Sort.DESC,
                                label: 'Document Number'
                            }),
                            search.createColumn({
                                name: 'trandate',
                                summary: 'GROUP',
                                label: 'Date'
                            }),
                            search.createColumn({
                                name: 'netamount',
                                summary: 'GROUP',
                                label: 'Amount (Net)'
                            }),
                            search.createColumn({
                                name: 'grossamount',
                                summary: 'GROUP',
                                label: 'Amount (Gross)'
                            }),
                            search.createColumn({
                                name: 'type',
                                join: 'applyingTransaction',
                                summary: 'GROUP',
                                label: 'Type'
                            }),
                            search.createColumn({
                                name: 'entity',
                                summary: 'GROUP',
                                label: 'Name'
                            }),
                            search.createColumn({
                                name: 'internalid',
                                summary: 'GROUP',
                                label: 'Internal ID'
                            }),
                            search.createColumn({
                                name: 'trandate',
                                summary: 'GROUP',
                                label: 'Date'
                            })
                        ]
                });

                const records = this.processSearch(searchObj, this._dealerRefundResultToObject, true);
                return {
                    'records': records
                }
            }
            getDealerRefundExportData() {
                const filters =
                    [
                        ['type', 'anyof', 'CustRfnd'],
                        'AND',
                        ['mainline', 'is', 'F'],
                        'AND',
                        ['custbody_gd_export_processed', 'is', 'F'],
                        'AND',
                        ['trandate', 'after', '4/7/2023'],
                        'AND',
                        ['applyingtransaction.type', 'anyof', 'CustCred'],
                        'AND',
                        ['voided', 'is', 'F'],
                        'AND',
                        [['paymentmethod', 'anyof', '2'], 'OR', ['paymentoption', 'startswith', 'Check']],
                        'AND',
                        ['transactionnumbernumber', 'isnotempty', ''],
                        'AND',
                        ['formulanumeric: CASE NVL({custbody_gd_export_prep_processed}, \'F\') WHEN \'F\' THEN 0 ELSE 1 END', 'equalto', '1']
                    ];
                log.debug('filters', filters);
                const searchObj = search.create({
                    type: 'customerrefund',
                    filters: filters,
                    columns:
                        [
                            search.createColumn({
                                name: 'tranid',
                                summary: 'GROUP',
                                sort: search.Sort.DESC,
                                label: 'Document Number'
                            }),
                            search.createColumn({
                                name: 'trandate',
                                summary: 'GROUP',
                                label: 'Date'
                            }),
                            search.createColumn({
                                name: 'netamount',
                                summary: 'GROUP',
                                label: 'Amount (Net)'
                            }),
                            search.createColumn({
                                name: 'grossamount',
                                summary: 'GROUP',
                                label: 'Amount (Gross)'
                            }),
                            search.createColumn({
                                name: 'type',
                                join: 'applyingTransaction',
                                summary: 'GROUP',
                                label: 'Type'
                            }),
                            search.createColumn({
                                name: 'entity',
                                summary: 'GROUP',
                                label: 'Name'
                            }),
                            search.createColumn({
                                name: 'internalid',
                                summary: 'GROUP',
                                label: 'Internal ID'
                            }),
                            search.createColumn({
                                name: 'trandate',
                                summary: 'GROUP',
                                label: 'Date'
                            })
                        ]
                });

                const records = this.processSearch(searchObj, this._dealerRefundResultToObject, true);
                return {
                    'records': records
                }
            }
            getClaimInfoFromCreditMemos(creditMemos) {
                
                const getSpiffInfo = (claimInfo) => {
                    const spiffResultSet = query.runSuiteQL({query: spiffSQL, params: []});
                    const spiffResults = spiffResultSet.results;
                    const spiffClaimInfo = spiffResultSet.asMappedResults();
                    claimInfo.push(...spiffClaimInfo);
                }
                
                log.debug('getClaimInfoFromCreditMemos creditMemos', creditMemos);
                const internalIds = creditMemos.map(creditMemo => `'${creditMemo.internalid}'`).join(',');
                log.debug('getClaimInfoFromCreditMemos internalIds', internalIds);
                const sql = `
                    SELECT
                        TRANSACTION.id AS internalid, 
                        BUILTIN_RESULT.TYPE_STRING(TRANSACTION.tranid) AS tranid, 
                        BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORDRVSCLAIM.name) AS claimid,
                        BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(CUSTOMRECORDRVSCLAIM.custrecordclaim_unit)) AS vin 
                     FROM 
                        TRANSACTION, CUSTOMRECORDRVSCLAIM 
                    WHERE TRANSACTION.custbodyrvscreatedfromclaim = CUSTOMRECORDRVSCLAIM.ID 
                    AND ((TRANSACTION.TYPE IN ('CustCred') 
                    AND TRANSACTION.ID IN (${internalIds})))`;
                const spiffSQL = `
                    SELECT
                        TRANSACTION.id AS internalid, 
                        BUILTIN_RESULT.TYPE_STRING(TRANSACTION.tranid) AS tranid, 
                        BUILTIN_RESULT.TYPE_STRING(CUSTOMRECORDRVSSPIFF.name) AS spiffid,
                        BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(CUSTOMRECORDRVSSPIFF.custrecordspiff_unit)) AS vin 
                     FROM 
                        TRANSACTION, CUSTOMRECORDRVSSPIFF 
                    WHERE TRANSACTION.custbodyrvscreatedfromspiff = CUSTOMRECORDRVSSPIFF.ID 
                    AND ((TRANSACTION.TYPE IN ('CustCred') 
                    AND TRANSACTION.ID IN (${internalIds})));`;
                log.debug('sql', sql);
                let claimInfo = [];
                const resultSet = query.runSuiteQL({query: sql, params: []});
                if(resultSet && resultSet.results && resultSet.results.length) {
                    const results = resultSet.results;
                    claimInfo = resultSet.asMappedResults();
                    log.debug('getClaimInfoFromCreditMemos claimInfo', claimInfo);
                    if (!claimInfo.length || claimInfo.some(claim => !claim.claimid)) {
                        getSpiffInfo(claimInfo);
                    }
                    return claimInfo;
                } else {
                    getSpiffInfo(claimInfo);
                    return claimInfo;
                }
            }
            getHistoryData(request) {
                const resultToObject = (result) => {
                    const historyObj = {};
                    historyObj.internalId = result.id;
                    historyObj.type = result.getValue('custrecord_gd_eh_type');
                    historyObj.dateRestored = result.getValue('custrecord_gd_eh_date_restored');
                    historyObj.isRestored = result.getValue('custrecord_gd_eh_is_restored');
                    historyObj.restoredBy = result.getText('custrecord_gd_eh_restored_by');
                    historyObj.dateCreated = result.getValue('created');
                    historyObj.dateModified = result.getValue('lastmodified');
                    historyObj.recordIds = result.getValue('custrecord_gd_eh_recordids')?.split(',');
                    historyObj.recordCount = historyObj.recordIds?.length;
                    return historyObj;
                }
                var searchObj = search.create({
                    type: 'customrecord_gd_export_payment_history',
                    filters:
                        [
                            ['isinactive', 'is', 'F']
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: 'internalid',
                                label: 'Internal ID'
                            }),
                            search.createColumn({name: 'custrecord_gd_eh_type', label: 'Type'}),
                            search.createColumn({name: 'custrecord_gd_eh_date_restored', label: 'Date Restored'}),
                            search.createColumn({name: 'custrecord_gd_eh_is_restored', label: 'Is Restored'}),
                            search.createColumn({name: 'custrecord_gd_eh_restored_by', label: 'Restored By'}),
                            search.createColumn({name: 'custrecord_gd_eh_export_file', label: 'Export File'}),
                            search.createColumn({name: 'created', label: 'Date Created', sort: search.Sort.DESC}),
                            search.createColumn({name: 'lastmodified', label: 'Last Modified'}),
                            search.createColumn({name: 'custrecord_gd_eh_recordids', label: 'Record IDs'})
                        ]
                });
                const records = this.processSearch(searchObj, resultToObject, true);
                log.debug('records', records);
                return {
                    'records': records
                }
            }

            getHistoryDataById(datain) {
                log.debug('datain', datain);
                const historyId = datain.historyId;
                const type = datain.type;
                return (type === 'Vendor Payment') ? this.getVendorPaymentHistoryData(datain) : this.getDealerRefundHistoryData(datain);
            }

            getVendorPaymentHistoryData(datain) {
                const historyId = datain.historyId;
                const lookup = search.lookupFields({
                    type: 'customrecord_gd_export_payment_history',
                    id: historyId,
                    columns: ['custrecord_gd_eh_recordids']
                })
                log.debug('lookup', lookup);
                const recordIds = lookup['custrecord_gd_eh_recordids'].split(',');
                log.debug('recordIds', recordIds);
                const paymentSearch = search.create({
                    type: 'vendorpayment',
                    filters:
                        [
                            ['mainline', 'is', 'T'],
                            'AND',
                            ['internalid', 'anyof', recordIds]
                        ],
                    columns: this.getVendorPaymentColumns()
                });

                const records = this.processSearch(paymentSearch, this._vendorPaymentResultToObject, false);
                return {
                    'records': records
                }
            }

            getDealerRefundHistoryData(datain) {
                const historyId = datain.historyId;
                const lookup = search.lookupFields({
                    type: 'customrecord_gd_export_payment_history',
                    id: historyId,
                    columns: ['custrecord_gd_eh_recordids']
                })
                log.debug('lookup', lookup);
                const recordIds = lookup['custrecord_gd_eh_recordids'].split(',');
                log.debug('recordIds', recordIds);
                const searchObj = search.create({
                    type: 'customerrefund',
                    filters:
                        [
                            ['mainline', 'is', 'F'],
                            'AND',
                            ['internalid', 'anyof', recordIds]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: 'tranid',
                                summary: 'GROUP',
                                sort: search.Sort.DESC,
                                label: 'Document Number'
                            }),
                            search.createColumn({
                                name: 'trandate',
                                summary: 'GROUP',
                                label: 'Date'
                            }),
                            search.createColumn({
                                name: 'netamount',
                                summary: 'GROUP',
                                label: 'Amount (Net)'
                            }),
                            search.createColumn({
                                name: 'grossamount',
                                summary: 'GROUP',
                                label: 'Amount (Gross)'
                            }),
                            search.createColumn({
                                name: 'type',
                                join: 'applyingTransaction',
                                summary: 'GROUP',
                                label: 'Type'
                            }),
                            search.createColumn({
                                name: 'entity',
                                summary: 'GROUP',
                                label: 'Name'
                            }),
                            search.createColumn({
                                name: 'internalid',
                                summary: 'GROUP',
                                label: 'Internal ID'
                            }),
                            search.createColumn({
                                name: 'trandate',
                                summary: 'GROUP',
                                label: 'Date'
                            })
                        ]
                });

                const records = this.processSearch(searchObj, this._dealerRefundResultToObject, true);
                return {
                    'records': records
                }
            }

            updatePaymentSearch(request) {
                log.debug('updatePaymentSearch', request);
                let internalIds = request.data.paymentIds;
                const isHistorical = request.data.historyId;
                //custrecord_ex_record_ids
                // Processing Historical Export
                if (isHistorical) {
                    const historyId = request.data.historyId;
                    const lookup = search.lookupFields({
                        type: 'customrecord_gd_export_payment_history',
                        id: historyId,
                        columns: ['custrecord_gd_eh_recordids', 'custrecord_gd_eh_type']
                    })
                    log.debug('lookup', lookup);
                    internalIds = lookup['custrecord_gd_eh_recordids'].split(',');
                    if (lookup['custrecord_gd_eh_type'] === 'Dealer Refund') {
                        request.data.isDealerRefund = true;
                    }
                }
               
                try {

                    record.submitFields({
                        type: 'customrecord_vendor_export',
                        id: !request.data.isDealerRefund ? 1 : 2,
                        values: {
                            custrecord_ex_record_ids: internalIds.join(','),
                            custrecord_is_historical: !!isHistorical
                        }
                    })
                    return {result: 'success'};
                }
                catch (e) {
                    log.error('Error updating vendor export record', e);
                    
                }
                return {result: 'failed'};
            }

            createPaymentFile(request) {
                let taskId = undefined;
                log.debug('createPaymentFile', request);
                try {
                    if (!request.data.isDealerRefund) {
                        taskId = ScriptExecutor.executeMapReduceScript(Constants.EXPORT_MR_SCRIPT_VENDOR.scriptId, Constants.EXPORT_MR_SCRIPT_VENDOR.deploymentId);
                    } else {
                        taskId = ScriptExecutor.executeMapReduceScript(Constants.EXPORT_MR_SCRIPT_DEALER.scriptId, Constants.EXPORT_MR_SCRIPT_DEALER.deploymentId);
                    }
                } catch (e) {
                    log.error('ERROR IN MAP REDUCE', e);
                }
                return {taskId: taskId};
            }
        }

        return ExportData;
    });
