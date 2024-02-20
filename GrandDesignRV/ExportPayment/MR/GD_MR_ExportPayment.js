/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/runtime', 'N/task', 'N/file', '../lib/GD_LIB_ExportFileHandler', '../lib/moment.min', '../lib/GD_LIB_ExportConstants'],
    /**
     * @param{record} record
     * @param{search} search
     * @param{runtime} runtime
     * @param{task} task
     * @param{file} file
     * @param{ExportFileHandler} ExportFileHandler
     * @param moment
     * @param Constants
     */
    (record, search, runtime, task, file, ExportFileHandler, moment, Constants) => {

        const isDealerRefundExport = () => {
            return runtime.getCurrentScript().getParameter({name: 'custscript_is_dealer_refund_export'});
        }
        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Object} inputContext.ObjectRef - Object that references the input data
         * @typedef {Object} ObjectRef
         * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
         * @property {string} ObjectRef.type - Type of the record instance that contains the input data
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         * @since 2015.2
         */

        const getInputData = (inputContext) => {
            log.debug('isDealerRefundExport', isDealerRefundExport());
            //custscript_is_dealer_refund_export
            record.submitFields({
                type: 'customrecord_vendor_export',
                id: !isDealerRefundExport() ? 1 : 2,
                values: {
                    'custrecord_export_file': ''
                }
            });
            /* This search is modified by the calling suitelet prior to execution. */
            //const searchTemplate = search.load({id: isDealerRefundExport() ? Constants.searchIds.DEALER_REFUND : Constants.searchIds.VENDOR_PAYMENT});
            const lookup = search.lookupFields({
                type: 'customrecord_vendor_export',
                id: !isDealerRefundExport() ? 1 : 2,
                columns: ['custrecord_ex_record_ids', 'custrecord_is_historical']
            })
            log.debug('lookup', lookup);
            const internalIds = lookup['custrecord_ex_record_ids'].split(',');


            if (!isDealerRefundExport()) {
                log.debug('PROCESSING VENDOR PAYMENTS');
                return search.create({
                    type: 'transaction',
                    filters:
                        [
                            ['type', 'anyof', 'VendPymt'],
                            'AND',
                            ['type', 'anyof', 'VendPymt'],
                            'AND',
                            ['status', 'noneof', 'VendPymt:E', 'VendPymt:D', 'VendPymt:V'],
                            'AND',
                            ['mainline', 'is', 'T'],
                            'AND',
                            ['custbody_gd_export_processed', 'is', lookup['custrecord_is_historical'] ? 'T' : 'F'],
                            'AND',
                            ['internalid', 'anyof', internalIds]
                        ],
                    columns:
                        [
                            search.createColumn({name: 'internalid', label: 'Internal ID'}),
                            search.createColumn({name: 'entity', label: 'Name'}),
                            search.createColumn({
                                name: 'tranid',
                                sort: search.Sort.DESC,
                                label: 'Document Number'
                            }),
                            search.createColumn({name: 'netamount', label: 'Amount (Net)'}),
                            search.createColumn({name: 'grossamount', label: 'Amount (Gross)'}),
                            search.createColumn({name: 'trandate', label: 'Date'}),
                            search.createColumn({name: 'memo', label: 'Memo'}),
                            search.createColumn({name: 'custbody_record_processed_for_export', label: 'Record Processed for export'})
                        ]
                });
            } else {
                log.debug('PROCESSING DEALER REFUNDS');
                return search.create({
                    type: 'customerrefund',
                    filters: [
                        ['type', 'anyof', 'CustRfnd'],
                        'AND',
                        ['mainline', 'is', 'F'],
                        'AND',
                        ['custbody_gd_export_processed', 'is', lookup['custrecord_is_historical'] ? 'T' : 'F'],
                        'AND',
                        ['datecreated', 'onorafter', '10/1/2022 12:00 am'],
                        'AND',
                        ['transactionnumbernumber', 'isnotempty', ''],
                        'AND',
                        ['custbody_gd_export_prep_processed', 'is', 'T'],
                        'AND',
                        ['applyingtransaction.type', 'anyof', 'CustCred'],
                        'AND',
                        ['status', 'noneof', 'CustRfnd:R', 'CustRfnd:V'],
                        'AND',
                        ['internalid', 'anyof', internalIds],
                        'AND',
                        ['voided', 'is', 'F'],
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
            }
        
            // return searchTemplate;
        }

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
         *     function on the current key-value pair
         * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
         *     pair
         * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} mapContext.key - Key to be processed during the map stage
         * @param {string} mapContext.value - Value to be processed during the map stage
         * @param {function} mapContext.write - Function used to write key-value pairs to the output data set
         * @since 2015.2
         */

        const map = (mapContext) => {
            const searchResults = JSON.parse(mapContext.value);
            log.debug('In Map Search Results', searchResults.values);
            const searchResult = searchResults.values;
            let entity;
            let id;
            if (isDealerRefundExport()) {
                entity = searchResult['GROUP(entity)'].value; // Could be vendor or customer/dealer, depending on the search
                id = searchResult['GROUP(internalid)'].value;
            } else {
                entity = searchResult.entity.value; // Could be vendor or customer/dealer, depending on the search
                id = mapContext.key;
            }
            mapContext.write({
                key: entity,
                value: id
            });
        }

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
         *     reduce function on the current group
         * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
         * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {string} reduceContext.key - Key to be processed during the reduce stage
         * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
         *     for processing
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            log.debug('In Reduce', reduceContext.values);
            const paymentIds = reduceContext.values;
            let balancedCount = 0;
            const vendor = reduceContext.key;
            const exportFileHandler = new ExportFileHandler();
            paymentIds.forEach((vendorPaymentId) => {
                const paymentInfo = !isDealerRefundExport() ? exportFileHandler.processVendorPayment(vendorPaymentId) : exportFileHandler.processDealerRefund(vendorPaymentId);
                // Only vendor payments are checked. Dealer refunds are always balanced.
                const balanced = !isDealerRefundExport() ? paymentInfo.balanced : true;
                //log.debug('Payment Info', paymentInfo);
                if(balanced) {
                    balancedCount++;
                    reduceContext.write({
                        key: vendor,
                        value: paymentInfo
                    });
                } else {
                    log.error('Payment not balanced', paymentInfo);
                }
            });
        }

        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
         *     script
         * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
         * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
         *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
         * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
         * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
         * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
         *     script
         * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
         * @param {Object} summaryContext.inputSummary - Statistics about the input stage
         * @param {Object} summaryContext.mapSummary - Statistics about the map stage
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
         * @since 2015.2
         */
        const summarize = (summaryContext) => {

            const paymentInfos = [];
            const internalIds = [];
            summaryContext.output.iterator().each((key, value) => {
                const paymentInfo = JSON.parse(value);
                paymentInfos.push(paymentInfo);
                internalIds.push(paymentInfo.internalId);
                return true;
            });
            const exportFileHandler = new ExportFileHandler();
            let fileId = '';
            if (paymentInfos.length) {
                fileId = exportFileHandler.generatePaymentFile(paymentInfos, isDealerRefundExport());
            }
           
            log.debug('File Id', fileId);
            if (fileId) {
                record.submitFields({
                    type: 'customrecord_vendor_export',
                    id: !isDealerRefundExport() ? 1 : 2,
                    values: {
                        'custrecord_export_file': parseInt(fileId, 10).toString()
                    }
                });
                // Update the payment records to indicate that they have been exported
                const recordType = !isDealerRefundExport() ? record.Type.VENDOR_PAYMENT : record.Type.CUSTOMER_REFUND;
                internalIds.forEach((internalId) => {
                    record.submitFields({
                        type: recordType,
                        id: internalId,
                        values: {
                            'custbody_gd_export_processed': true,
                            'tobeprinted': false,
                            'custbodyrvstobeprinted': false
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                });
                
                // Create a history record
                const historyRecord = record.create({
                    type: 'customrecord_gd_export_payment_history',
                    isDynamic: true
                });
                historyRecord.setValue({fieldId: 'custrecord_gd_eh_export_file', value: fileId});
                historyRecord.setValue({
                    fieldId: 'custrecord_gd_eh_type',
                    value: isDealerRefundExport() ? 'Dealer Refund' : 'Vendor Payment'
                });
                historyRecord.setValue({fieldId: 'custrecord_gd_eh_recordids', value: internalIds.join(',')});
                historyRecord.save();
            }

            if (summaryContext.inputSummary.error) {
                log.error('Input Error', summaryContext.inputSummary.error);
            }

            summaryContext.mapSummary.errors.iterator().each(function (key, error) {
                log.error('Map Error for key: ' + key, error);
                return true;
            });

            summaryContext.reduceSummary.errors.iterator().each(function (key, error) {
                log.error('Reduce Error for key: ' + key, error);
                return true;
            });

        }

        return {getInputData, map, reduce, summarize}

    })
;
