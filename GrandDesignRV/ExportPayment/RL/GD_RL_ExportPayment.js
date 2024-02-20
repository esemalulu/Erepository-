/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/runtime', 'N/search', 'N/task', 'N/file', '../lib/GD_LIB_ExportData'],
    /**
     * @param{record} record
     * @param{runtime} runtime
     * @param{search} search
     * @param{task} task
     * @param{file} file
     * @param{ExportData} ExportData
     */
    (record, runtime, search, task, file, ExportData) => {

        let exportData = new ExportData();

        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
         *     content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const get = (requestParams) => {
            let results = [];
            try {
                results = executeGetMethod(requestParams);
            } catch (e) {
                log.error('Error in doGet', e);
            }
            return results;
        }

        const executeGetMethod = (datain) => {
            log.debug({title: 'executeGetMethod datain', details: datain});

            let results = [];

            const methodRouter = {
                'getVendorPayments': exportData.getVendorPaymentData,
                'getDealerRefunds': exportData.getDealerRefundExportData,
                'getHistory': exportData.getHistoryData,
                'getHistoryDetails': exportData.getHistoryDataById,
                'isTaskComplete': isTaskComplete,
                'getExportFileInfo': getExportFileInfo,
                processHistory: processHistory
            };

            if (datain.method)
                results = methodRouter[datain.method](datain);

            return results;
        }

        const isTaskComplete = (datain) => {
            const taskId = datain.taskId;
            if (taskId) {
                const taskInfo = task.checkStatus(taskId);
                log.debug('taskStatus', taskInfo);
                if (taskInfo) {
                    const status = {
                        status: taskInfo.status,
                        stage: taskInfo.stage,
                        isCompleted: (taskInfo.status === task.TaskStatus.COMPLETE || taskInfo.status === task.TaskStatus.FAILED)
                    }
                    return (status);
                }
            }
            return true;
        }

        const getExportFileInfo = (datain) => {
            log.debug('getExportFileInfo', datain);
            const lookup = search.lookupFields({
                type: 'customrecord_vendor_export',
                id: !datain.isDealerRefund ? 1 : 2,
                columns: 'custrecord_export_file'
            });
            log.debug('lookup', lookup);
            if (lookup && lookup.custrecord_export_file && lookup.custrecord_export_file[0] && lookup.custrecord_export_file[0].value) {
                const fileId = lookup.custrecord_export_file[0].value;
                const fileObj = file.load({id: fileId});
                if (fileObj) {
                    const fileUrl = fileObj.url;
                    return {
                        fileId: fileId,
                        fileUrl: fileUrl
                    };
                }
            }
            return {fileId: 0};
        }
        const processHistory = (datain) => {
            log.debug('processHistory', datain);
            const historyId = datain.historyId;
            if (historyId) {
                const historyRec = record.load({
                    type: 'customrecord_gd_export_payment_history',
                    id: historyId
                });
                if (historyRec) {
                    historyRec.setValue({fieldId: 'custrecord_gd_eh_date_restored', value: new Date()});
                    historyRec.setValue({fieldId: 'custrecord_gd_eh_is_restored', value: true});
                    historyRec.setValue({fieldId: 'custrecord_gd_eh_restored_by', value: runtime.getCurrentUser().id});
                    historyRec.setValue({fieldId: 'custrecord_gd_eh_export_file', value: datain.fileId});
                    historyRec.save();
                }
            }
            return true;
        }
        /**
         * Defines the function that is executed when a PUT request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body are passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const put = (requestBody) => {

        }

        /**
         * Defines the function that is executed when a POST request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const post = (requestBody) => {
            let results = [];
            log.debug('POST', requestBody);
            const methodRouter = {
                'createPaymentFile': exportData.createPaymentFile,
                'updatePaymentSearch': exportData.updatePaymentSearch,
            };

            if (typeof methodRouter[requestBody.method] !== 'function') {
                log.debug({title: 'Request', details: 'PostData: Bad method specified: ' + requestBody.method});
                return;
            }

            results = methodRouter[requestBody.method](requestBody);
            return results;
        }

        return {get, post}

    })
;
