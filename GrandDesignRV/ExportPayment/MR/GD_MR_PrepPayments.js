/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime', 'N/task', '../lib/GD_LIB_ExportFileHandler'],
    /**
     * @param{record} record
     * @param{runtime} runtime
     * @param{task} task
     * @param{ExportFileHandler} ExportFileHandler
     */
    (record, runtime, task, ExportFileHandler) => {
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
                const paymentIdsJSON = runtime.getCurrentScript().getParameter('custscript_gd_paymentids');
                let checkNo = Number(runtime.getCurrentScript().getParameter('custscript_gd_starting_check_no'));
                const payments = JSON.parse(paymentIdsJSON);
                if (payments) {
                    payments.forEach(payment => {
                        payment.checkNo = checkNo;
                        checkNo++;
                    });
                    return payments;
                }
            } catch (e) {
                log.error('Error getting input data', e);
            }
            return []
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
            log.debug('mapContext', mapContext);
            const paymentInfo = JSON.parse(mapContext.value);
            if (paymentInfo.checkNo) {
                paymentInfo.checkNo = paymentInfo.checkNo.toString();
                log.debug('SETTING FIELDS', `ID: ${paymentInfo.internalId} Check No: ${paymentInfo.checkNo}`);
                let isDealerRefund = runtime.getCurrentScript().getParameter('custscript_gd_mr_is_dealer_refund_prep');
                log.debug('isDealerRefund', isDealerRefund);
                log.debug('typeof isDealerRefund', typeof isDealerRefund);
                isDealerRefund = isDealerRefund === 'T' || isDealerRefund === true || isDealerRefund === 'true';
                const values = {
                    custbody_gd_export_prep_processed: true,
                    tranid: paymentInfo.checkNo,
                    tobeprinted: false,
                    custbodyrvstobeprinted: false
                };

                if (isDealerRefund) {
                    values.checknumber = paymentInfo.checkNo;
                    values.transactionnumber = paymentInfo.checkNo;
                }

                //log.debug('values', values);
                let recordType = record.Type.VENDOR_PAYMENT;
                if (isDealerRefund)
                    recordType = record.Type.CUSTOMER_REFUND;
                //log.debug('recordType', recordType);
                if(!isDealerRefund) {
                record.submitFields({
                    type: recordType,
                    id: paymentInfo.internalId,
                    values: values,
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                }) } else {
                    const refundRecord = record.load({
                        type: recordType,
                        id: paymentInfo.internalId
                    });
                    refundRecord.setValue('checknumber', paymentInfo.checkNo);
                    refundRecord.setValue('transactionnumber', paymentInfo.checkNo);
                    refundRecord.setValue('tobeprinted', false);
                    refundRecord.setValue('tranid', paymentInfo.checkNo);
                    refundRecord.setValue('custbody_gd_export_prep_processed', true);
                    refundRecord.setValue('custbodyrvstobeprinted', false);
                    refundRecord.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    });
                }
                mapContext.write({
                    key: runtime.accountId,
                    value: paymentInfo
                });
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
            const paymentInfos = [];
            const internalIds = [];
            summaryContext.output.iterator().each((key, value) => {
                const paymentInfo = JSON.parse(value);
                paymentInfos.push(paymentInfo);
                internalIds.push(paymentInfo.internalId);
                return true;
            });
           log.debug('Summarize paymentInfos', paymentInfos);
            const isDealerRefundExport = runtime.getCurrentScript().getParameter('custscript_gd_mr_is_dealer_refund_prep');
            if (!isDealerRefundExport || isDealerRefundExport === 'F' || isDealerRefundExport === false || isDealerRefundExport === 'false') {
                try {
                    const exportFileHandler = new ExportFileHandler();
                    const updateFileInfo = exportFileHandler.generateUpdateCheckNumberFile(paymentInfos);
                    log.debug('updateFileInfo', updateFileInfo);
                    if (updateFileInfo) {
                        const scheduledTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
                        scheduledTask.scriptId = 'customscript_gd_sch_execute_csv_import';
                        scheduledTask.params = {
                            custscript_gd_sch_import_file_id: updateFileInfo.updateFileId,
                        };
                        const scheduledTaskId = scheduledTask.submit();
                        log.debug('Scheduled Task Id', scheduledTaskId);
                    }
                } catch (e) {
                    log.error('Error generating update check number file', e);
                }
            } else {
                log.debug('DEALER REFUNDS PROCESS, NOT PERFORMING CSV IMPORT', isDealerRefundExport);
            }
        }

        return {getInputData, map, summarize}

    });
