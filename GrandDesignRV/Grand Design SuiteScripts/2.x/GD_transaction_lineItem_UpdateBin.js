/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/log', 'N/record', 'N/query'],
    /**
     * @param{log} log
     * @param{record} record
     * @param{query} query
     */
    (log, record, query) => {
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
            try {
                var mainSuiteQL = `SELECT distinct(transaction) as trans_id FROM transactionline WHERE itemtype = 'InvtPart' AND quantitypicked = 0 AND custcolgd_partsbin IN (SELECT bin.id FROM bin WHERE bin.location = '17') AND custcolgd_partsbin NOT IN (8856, 3144, 3101) AND transaction in (SELECT transaction.id FROM transaction where transaction.custbodyrvsordertype = 1 AND transaction.type = 'SalesOrd' AND transaction.status in ('D', 'E', 'B'))`;

                //var mainSuiteQL = `SELECT distinct(transaction) as trans_id FROM transactionline WHERE itemtype = 'InvtPart' AND quantitypicked = 0 AND custcolgd_partsbin IN (SELECT bin.id FROM bin WHERE bin.location = '17') AND transaction in ('15539828')`;


                let data = [];
                var mainSuiteQLResult = query.runSuiteQLPaged({
                    query: mainSuiteQL,
                    pageSize: 1000
                }).iterator();
                // Fetch results using an iterator
                mainSuiteQLResult.each(function (pagedData) {
                    data = data.concat(pagedData.value.data.asMappedResults());
                    return true;
                });
                return data;
            } catch (e) {
                log.error('error: ', e);
            }
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
            var pagedData = JSON.parse(mapContext.value);
            try {
                var myRecord = record.load({
                    type: record.Type.SALES_ORDER,
                    id: pagedData.trans_id,
                    isDynamic: true
                });
                const count = myRecord.getLineCount({
                    sublistId: 'item'
                });
                //log.debug(`pagedData.trans_id & Line count`, `${pagedData.trans_id} | ${count}`);
                for (let i = 0; i < count; i++) {
                    let itemID = myRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i
                    });
                    let lineItemBin = myRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcolgd_partsbin',
                        line: i
                    }) || '';
                    var lineItemPicked = myRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'itempicked',
                        line: i
                    });
                    var lineItemType = myRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'itemtype',
                        line: i
                    }) || '';
                    //log.audit(`line Item Data`,`Item: ${itemID}, Bin: ${lineItemBin}, Type: ${lineItemType}, Picked: ${lineItemPicked}`);
                    if (lineItemPicked && lineItemPicked == 'F' && lineItemType == 'InvtPart') {
                        let itemSuiteQL = `SELECT custitemgd_pspreferredbin FROM item WHERE id = ${itemID}`
                        var itemSuiteQLResult = query.runSuiteQL({
                            query: itemSuiteQL,
                        }).asMappedResults();
                        let preferredBin = itemSuiteQLResult[0].custitemgd_pspreferredbin || '';
                        //log.debug(`${itemID} || lineItemBin | preferredBin > ${i}`, `${lineItemBin} | ${preferredBin}`);
                        if (preferredBin != lineItemBin) {
                            //log.debug(`${itemID} || preferredBin != lineItemBin`, `${lineItemBin} | ${preferredBin}`);
                            myRecord.selectLine({
                                sublistId: 'item',
                                line: i
                            });
                            myRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcolgd_partsbin',
                                value: preferredBin,
                                ignoreFieldChange: true
                            });
                            myRecord.commitLine({
                                sublistId: 'item'
                            });
                        }
                        // else{
                        //     log.debug(`${itemID} || ${lineItemBin} | ${preferredBin} > ${i}`, `preferredBin = lineItemBin`);
                        // }
                    }
                }
                myRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
            } catch (mapError) {
                log.error(`Map Error`, mapError);
            }

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
         * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage`
         * @since 2015.2
         */
        const summarize = (summaryContext) => {
            // Log details about script execution
            log.audit('Usage units consumed', summaryContext.usage);
            log.audit('Concurrency', summaryContext.concurrency);
            log.audit('Number of yields', summaryContext.yields);

        }

        return {
            getInputData,
            map,
            reduce,
            summarize
        }

    });