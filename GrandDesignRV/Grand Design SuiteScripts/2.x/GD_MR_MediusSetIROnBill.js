/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search'],
    (record, search) => {
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
            // Get the bills created by medius that do not have a corresponding item receipt.
            return search.create({
                type: 'vendorbill',
                filters:
                    [
                        ['type', 'anyof', 'VendBill'],
                        'AND',
                        ['custbody_medius_created_by_medius', 'is', 'T'],
                        'AND',
                        ['appliedtotransaction.internalidnumber', 'isempty', ''],
                        'AND',
                        ['mainline', 'is', 'T']
                    ],
                columns:
                    [
                        search.createColumn({
                            name: 'internalid',
                            summary: 'GROUP',
                            label: 'Internal ID'
                        }),
                        search.createColumn({
                            name: 'datecreated',
                            summary: 'GROUP',
                            sort: search.Sort.DESC,
                            label: 'Date Created'
                        }),
                        search.createColumn({
                            name: 'tranid',
                            summary: 'GROUP',
                            label: 'Document Number'
                        })
                    ]
            });
        }

        const getRelatedBillsAndReceipts = (uniquePurchaseOrders) => {
            const poSearch = search.create({
                type: 'purchaseorder',
                filters:
                    [
                        ['type', 'anyof', 'PurchOrd'],
                        'AND',
                        ['internalid', 'anyof', uniquePurchaseOrders],
                        'AND',
                        ['mainline', 'is', 'F'],
                        'AND',
                        ['applyingtransaction.internalidnumber', 'isnotempty', '']
                    ],
                columns:
                    [
                        search.createColumn({name: 'internalid', label: 'Internal ID'}),
                        search.createColumn({name: 'tranid', label: 'Document Number'}),
                        search.createColumn({name: 'applyingtransaction', label: 'Applying Transaction'}),
                        search.createColumn({
                            name: 'internalid',
                            join: 'applyingTransaction',
                            label: 'Internal ID'
                        }),
                        search.createColumn({name: 'applyinglinktype', label: 'Applying Link Type'}),
                        search.createColumn({
                            name: 'type',
                            join: 'applyingTransaction',
                            label: 'Type'
                        })
                    ]
            });
            const relatedReceipts = [];
            const relatedBills = [];
            poSearch.run().each(function (result) {
                const type = result.getValue({name: 'type', join: 'applyingTransaction'});
                if (type === 'ItemRcpt') {
                    relatedReceipts.push({
                        id: Number(result.getValue({name: 'internalid', join: 'applyingTransaction'})),
                        type: result.getValue({name: 'type', join: 'applyingTransaction'}),
                    });
                }
                if (type === 'VendBill') {
                    relatedBills.push({
                        id: Number(result.getValue({name: 'internalid', join: 'applyingTransaction'})),
                        type: result.getValue({name: 'type', join: 'applyingTransaction'}),
                    });
                }
                return true;
            });
            return {relatedReceipts, relatedBills};
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
         * @since 2015.2
         */

        const map = (mapContext) => {
            const mapResult = JSON.parse(mapContext.value);
            const searchResult = mapResult.values;
            log.debug('mapResult', mapResult);
            log.debug('searchResult', searchResult);
            // These are the bills.
            const dummy = {
                'GROUP(internalid)': {value: '20199335', text: '20199335'},
                'GROUP(datecreated)': '12/14/2023 9:39 am',
                'GROUP(tranid)': '0403569-IN'
            }
            // Load the bill and get the purchase orders
            const bill = record.load({
                type: 'vendorbill',
                id: searchResult['GROUP(internalid)'].value,
            });
            const lineCount = bill.getLineCount({sublistId: 'purchaseorders'});
            const purchaseOrders = [];
            for (let i = 0; i < lineCount; i++) {
                // Check for bill receipts
                const purchaseOrderId = bill.getSublistValue({
                    sublistId: 'purchaseorders',
                    fieldId: 'id',
                    line: i
                });
                log.debug('map purchaseOrderId', purchaseOrderId);
                purchaseOrders.push(purchaseOrderId);
            }
            // Make the purchase order array unique
            const uniquePurchaseOrders = [...new Set(purchaseOrders)];
            log.debug('uniquePurchaseOrders', uniquePurchaseOrders);
            // This search gets the bills and item receipts related to the purchase orders.
            const {relatedReceipts, relatedBills} = getRelatedBillsAndReceipts(uniquePurchaseOrders);
            log.debug('relatedReceipts', relatedReceipts);
            log.debug('relatedBills', relatedBills);
            const billsToLink = [];
            // Load the vendor bills and remove the bills with item receipts that have been applied.
            relatedBills.forEach((bill) => {
                const billRecord = record.load({
                    type: 'vendorbill',
                    id: bill.id,
                });
                const lineCount = billRecord.getLineCount({sublistId: 'item'});
                let hasReceipts = false;
                for (let i = 0; i < lineCount; i++) {
                    // Check for bill receipts
                    const billReceipts = billRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'billreceipts',
                        line: i
                    });
                    if (billReceipts?.length) {
                        hasReceipts = true;
                        // remove the receipts that have already been linked.
                        billReceipts.forEach((receipt) => {
                            const index = relatedReceipts.findIndex((relatedReceipt) => Number(receipt) === relatedReceipt.id);
                            if (index > -1) {
                                relatedReceipts.splice(index, 1);
                            }
                        });
                    }
                }
                if (!hasReceipts) {
                    billsToLink.push(bill.id);
                }
            });
            if (relatedReceipts.length) {
                // Get the line information from the item receipts.
                const itemReceiptSearch = search.create({
                    type: 'itemreceipt',
                    filters:
                        [
                            ['type', 'anyof', 'ItemRcpt'],
                            'AND',
                            ['mainline', 'is', 'F'],
                            'AND',
                            ['internalid', 'anyof', relatedReceipts.map((receipt) => receipt.id)]
                        ],
                    columns:
                        [
                            search.createColumn({name: 'internalid', sort: search.Sort.ASC, label: 'Internal ID'}),
                            search.createColumn({name: 'item', label: 'Item'}),
                            search.createColumn({name: 'rate', label: 'Item Rate'}),
                            search.createColumn({name: 'quantity', label: 'Quantity'})
                        ]
                });
                let currentReceiptId = 0;
                let currentReceipt = null;
                itemReceiptSearch.run().each((result) => {
                    const receiptId = Number(result.getValue({name: 'internalid'}));
                    if (receiptId !== currentReceiptId) {
                        currentReceipt = relatedReceipts.find((receipt) => receipt.id === receiptId);
                        if (!currentReceipt.lines)
                            currentReceipt.lines = [];
                    }
                    currentReceipt.lines.push({
                        item: Number(result.getValue({name: 'item'})),
                        rate: Number(result.getValue({name: 'rate'})),
                        quantity: Number(result.getValue({name: 'quantity'}))
                    });
                    return true;
                });
            }
            billsToLink.forEach((billId) => {
                mapContext.write({
                    key: billId,
                    value: relatedReceipts,
                })
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
            const billId = reduceContext.key;
            const relatedReceipts = reduceContext.values.map(JSON.parse);
            log.debug('reduce billId', billId);
            log.debug('reduce relatedReceipts', relatedReceipts);
            const dummy = [
                {
                    id: 20174603,
                    type: 'ItemRcpt',
                    lines: [{item: 79874, rate: 56.49, quantity: 20}]
                },
                {
                    id: 20180531,
                    type: 'ItemRcpt',
                    lines: [{item: 78727, rate: 56.49, quantity: 100}]
                }]
            const bill = record.load({
                type: 'vendorbill',
                id: billId,
            });
            let adjusted = false;
            const lineCount = bill.getLineCount({sublistId: 'item'});
            for (let i = 0; i < lineCount; i++) {
                // Check for bill receipts
                const billReceipts = bill.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'billreceipts',
                    line: i
                });
                if (!billReceipts?.length) {
                    const item = Number(bill.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i
                    }));
                    const rate = Number(bill.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        line: i
                    }));
                    const quantity = Number(bill.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i
                    }));
                    let foundLine;
                    log.debug('item', {item, rate, quantity});
                    const receipt = relatedReceipts[0].find((receipt) => {
                        const line =  receipt.lines?.find((line) => line.item === item && line.rate === rate && line.quantity === quantity);
                        if (line) {
                            foundLine = line;
                            log.debug('foundLine', foundLine);
                            return true;
                        }
                        return false;
                    });
                    if (receipt?.id && foundLine) {
                        bill.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'billreceipts',
                            line: i,
                            value: receipt.id
                        });
                        log.debug('Setting bill receipt', receipt.id);
                        adjusted = true;
                        // remove the line from the receipt
                        const lineIndex = receipt.lines.findIndex((line) => line === foundLine);
                        receipt.lines.splice(lineIndex, 1);
                    } else {
                        log.debug('NO RECEIPT FOUND', `Bill ID: ${billId} - No receipt found for item ${item} with rate ${rate} and quantity ${quantity}`);
                    }
                }
            }
            if(adjusted) {
                bill.save();
                log.debug('bill saved', billId);
            }
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
            if (summaryContext.inputSummary.error) {
                log.error({title: 'Input Error', details: summaryContext.inputSummary.error});
            }
            summaryContext.mapSummary.errors.iterator().each(function (key, error) {
                log.error({title: `Map Error for key: ${key}`, details: error});
                return true;
            });
            summaryContext.reduceSummary.errors.iterator().each(function (key, error) {
                log.error({title: `Reduce Error for key: ${key}`, details: error});
                return true;
            });
        }

        return {getInputData, map, reduce, summarize}

    });
