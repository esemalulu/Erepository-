/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/search'],
    /**
 * @param{record} record
 * @param{search} search
 */
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
            return search.load(6449); // Prod 6449
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
            const dummy = {
                recordType: null,
                id: "1",
                values: {
                    "GROUP(internalid)": {
                        value: "19295514",
                        text: "19295514"
                    },
                    "GROUP(id.CUSTBODYRVSCREATEDFROMCLAIM)": "705158",
                    "GROUP(tranid.appliedToTransaction)": "9100358",
                    "GROUP(appliedtotransaction)": {
                        value: "19315944",
                        text: "Dealer Refund #9100358"
                    },
                    "GROUP(otherrefnum.appliedToTransaction)": "9100358",
                    "GROUP(internalid.CUSTBODYRVSCREATEDFROMCLAIM)": {
                        value: "705158",
                        text: "705158"
                    },
                    "GROUP(custrecordclaim_status.CUSTBODYRVSCREATEDFROMCLAIM)": {
                        value: "5",
                        text: "Paid"
                    },
                    "GROUP(internalid.appliedToTransaction)": {
                        value: "19315944",
                        text: "19315944"
                    },
                    "GROUP(trandate.appliedToTransaction)": "7/14/2023"
                }
            }
            const searchResult = JSON.parse(mapContext.value).values;
            mapContext.write({
                key: searchResult['GROUP(internalid.appliedToTransaction)'].value,
                value:  searchResult['GROUP(internalid.CUSTBODYRVSCREATEDFROMCLAIM)'].value
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
            log.debug('reduceContext key', reduceContext.key);
            log.debug('reduceContext values', reduceContext.values);
            const claimIds = reduceContext.values.map(value => {return Number(value)});
            log.debug('claimIds', claimIds);
            const refund = record.load({
                type: record.Type.CUSTOMER_REFUND,
                id: reduceContext.key,
                isDynamic: false
            })
            
            const applyCount = refund.getLineCount('apply')
            for (let i = 0; i < applyCount; i++) {
                const applyRecType = refund.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'type',
                    line: i
                });
                const apply = refund.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'apply',
                    line: i
                });
                if (applyRecType === 'Credit Memo' && (apply === true || apply === 'T')) {
                    const creditMemoId = refund.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'doc',
                        line: i
                    });
                    const lookupFields = search.lookupFields({
                        type: search.Type.CREDIT_MEMO,
                        id: creditMemoId,
                        columns: ['custbodyrvscreatedfromclaim']
                    });
                    const claimId = Number(lookupFields.custbodyrvscreatedfromclaim[0]?.value);
                    try {
                        if (claimId && claimIds.includes(claimId)) {
                            record.submitFields({
                                type: 'customrecordrvsclaim',
                                id: claimId,
                                values: {
                                    'custrecordclaim_dealerrefund': reduceContext.key,
                                    'custrecordclaim_status': 5 // Paid
                                },
                                options: {
                                    enableSourcing: true,
                                    ignoreMandatoryFields: true
                                }
                            });
                            log.debug('Updating Claim', `Claim ${claimId} updated with Dealer Refund ${reduceContext.key} as Paid`);
                        }
                    } catch (e) {
                        log.error({title: 'Error updating claim', details: e});
                    }
                }
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
