/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 *
 * @description Map/Reduce used to copy Special Order Notification Details to Last Notification field
 * @author Franklin Ilo (AddCore Software Corp.)
 */

define(['N/log', 'N/record', 'N/search', 'N/runtime'],
    /**
     * @param {log} log
     * @param {record} record
     * @param {search} search
     * @param {runtime} runtime
    */
    (log, record, search, runtime) => {

        const getInputData = (inputContext) => {
            try {
                let specialOrdersWithDetailsIdSearcId = runtime.getCurrentScript().getParameter({
                    name: 'custscript_ifd_special_item_ord_copy'
                });

                if (specialOrdersWithDetailsIdSearcId) {
                    return search.load({id: specialOrdersWithDetailsIdSearcId});
                }
            }
            catch (err) {
                log.error({title: 'getInputData() Error', details: err});
                throw err;
            }
        };


        const map = (mapContext) => {
            try {
                let orderId = mapContext.key;

                let orderRecord = record.load({
                    type: record.Type.SALES_ORDER,
                    id: orderId
                });

                let specialOrderItemDetails = orderRecord.getValue({fieldId: 'custbody_ifd_special_ord_item_details'});

                orderRecord.setValue({
                    fieldId: 'custbody_ifd_special_ord_item_det_not',
                    value: specialOrderItemDetails
                });

                orderId = orderRecord.save({enableSourcing: false, ignoreMandatoryFields: true});
                log.audit({title: 'Updated Sales Order ID', details: orderId});

            }
            catch (err) {
                log.error({title: 'map() Error', details: err});
                throw err;
            }
        };


        const summarize = (summaryContext) => {
            try {
                if (summaryContext.inputSummary.error) {
                    log.error({title: 'Input Stage Error: ', details: summaryContext.inputSummary.error});
                }

                summaryContext.mapSummary.errors.iterator().each(function (key, error, executionNo) {
                    log.error({title: 'Map Stage Error for key ' + key, details: error + ', Execution No: ' + executionNo});
                });

                log.audit({
                    title: 'Script Execution Details',
                    details: 'Date Created: ' + summaryContext.dateCreated + ', Total Seconds: ' + summaryContext.seconds + ', Usage: ' + summaryContext.usage
                });
            }
            catch (err) {
                log.error({title: 'summarize() Error', details: err});
            }
        };

        return {getInputData, map, summarize};

    });
