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
            return search.create({
                type: 'customerrefund',
                filters:
                    [
                        ['type', 'anyof', 'CustRfnd'],
                        'AND',
                        ['mainline', 'is', 'T'],
                        'AND',
                        ['trandate', 'onorafter', '4/14/2023']
                    ],
                columns:
                    [
                        search.createColumn({name: 'internalid', label: 'Internal ID'}),
                        search.createColumn({name: 'trandate', label: 'Date'}),
                        search.createColumn({
                            name: 'tranid',
                            sort: search.Sort.ASC,
                            label: 'Document Number'
                        })
                    ]
            });

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
            const dealerRefundId = mapContext.key;
            log.debug('Dealer Refund', `Processing Dealer Refund ${dealerRefundId}`);
            const dealerRefund = record.load({
                type: record.Type.CUSTOMER_REFUND,
                id: dealerRefundId,
            });
            const applyCount = dealerRefund.getLineCount({sublistId: 'apply'});
            try {
                for (let i = 0; i < applyCount; i++) {
                    const applyType = dealerRefund.getSublistValue({sublistId: 'apply', fieldId: 'type', line: i});
                    const applied = dealerRefund.getSublistValue({sublistId: 'apply', fieldId: 'apply', line: i});
                    log.debug('Apply Type', `Apply Type: ${applyType} Applied: ${applied}`);
                    if (applyType === 'Credit Memo' && applied) {
                        const appliedTo = dealerRefund.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'doc',
                            line: i
                        });
                        const lookup = search.lookupFields({
                            type: search.Type.CREDIT_MEMO,
                            id: appliedTo,
                            columns: ['custbodyrvscreatedfromclaim']
                        });
                        const claimId = lookup?.custbodyrvscreatedfromclaim[0]?.value;
                        if (claimId) {
                            const claimInfo = search.lookupFields({
                                type: 'customrecordrvsclaim',
                                id: claimId,
                                columns: ['custrecordclaim_dealerrefund', 'custrecordclaim_status']
                            });
                            const claimStatus = claimInfo.custrecordclaim_status[0].value;
                            const claimDealerRefund = claimInfo.custrecordclaim_dealerrefund[0]?.value;
                            log.debug('Claim Status',`Claim '${claimId}' has status '${claimStatus}' and refund '${claimDealerRefund}'`);
                            if (Number(claimStatus) !== 5 || !claimDealerRefund) {
                                record.submitFields({
                                    type: 'customrecordrvsclaim',
                                    id: claimId,
                                    values: {
                                        custrecordclaim_dealerrefund: dealerRefundId,
                                        custrecordclaim_status: '5'
                                    },
                                    options: {
                                        enableSourcing: false,
                                        ignoreMandatoryFields: true
                                    }
                                });
                                log.audit('Updated Claim', `Claim ${claimId} updated with Dealer Refund ${dealerRefundId}`);
                            }
                        }
                    }
                }
            } catch (e) {
                log.error({
                    title: 'Error Updating Claim',
                    details: e
                });
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
        }

        return {getInputData, map, summarize}

    });
