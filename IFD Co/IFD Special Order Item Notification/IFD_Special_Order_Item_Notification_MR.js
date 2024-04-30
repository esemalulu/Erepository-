/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NAmdConfig ./IFD_Special_Order_Item_Config.json
 *
 * @description Map/Reduce send hourly special order items notification
 * @author Franklin Ilo (AddCore Software Corp.)
 */

define(['N/log', 'N/search', 'N/error', 'N/runtime', 'N/record', 'special_order_item_library'],
    /**
     * @param {log} log
     * @param {search} search
     * @param {error} error
     * @param {runtime} runtime
     * @param {record} record
     * @param {Object} special_order_item_library
    */
    (log, search, error, runtime, record, special_order_item_library) => {

        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         * @param {Object} inputContext
         */
        const getInputData = (inputContext) => {
            try {

                log.audit({
                    title: 'Special Order Item Modification Notification',
                    details: 'Process Start'
                });

                let specialItemOrdersModifiedSearchId = runtime.getCurrentScript().getParameter({
                    name: 'custscript_ifd_special_item_ord_mod'
                });

                if (specialItemOrdersModifiedSearchId) {
                    return search.load({id: specialItemOrdersModifiedSearchId});
                }
            }
            catch (err) {
                log.error({title: 'getInputData() Error', details: err});
                throw err;
            }
        };

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         */
        const map = (mapContext) => {
            try {
                log.debug({title: 'mapContext', details: JSON.stringify(mapContext)});
                let orderValues = JSON.parse(mapContext.value).values;

                let categoriesToExclude = runtime.getCurrentScript().getParameter({name: 'custscript_ifd_categories_to_exclude'});
                log.debug({title: 'Categories To Exclude', details: categoriesToExclude});

                let categoriesToExcludeArray = (categoriesToExclude) ? categoriesToExclude.split(',') : [];
                log.debug({title: 'Categories To Exclude Array', details: JSON.stringify(categoriesToExcludeArray)});

                let specialOrderItemNotificationDetails = special_order_item_library.getSalesOrderSpecialOrderNotificationDetails(orderValues, categoriesToExcludeArray);

                //Write the Notification Details to the reduce stage
                if (specialOrderItemNotificationDetails && Array.isArray(specialOrderItemNotificationDetails) && specialOrderItemNotificationDetails.length > 0) {

                    specialOrderItemNotificationDetails.forEach(function (detail) {
                        if (detail && detail.recipientid) {
                            mapContext.write({key: detail.recipientid, value: detail});
                        }
                    });
                }
            }
            catch (err) {
                log.error({title: 'map() Error', details: err});
                throw err;
            }
        };

        /**
         * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
         * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
         * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
         *     provided automatically based on the results of the map stage.
         */
        const reduce = (reduceContext) => {
            try {
                log.debug({title: 'reduceContext', details: JSON.stringify(reduceContext)});

                let notificationAuthorId = runtime.getCurrentScript().getParameter({name: 'custscript_ifd_special_item_notify_auth'});
                let notificationRecipientId = reduceContext.key;
                let notificationDetails = reduceContext.values;

                if (notificationAuthorId && notificationRecipientId && notificationDetails) {
                    special_order_item_library.sendNotificationEmail(notificationAuthorId, notificationRecipientId, notificationDetails);
                }
                else {
                    log.error({
                        title: 'Unable to send notification email',
                        details: 'Missing required parameters: ' + notificationAuthorId + ' || ' + notificationRecipientId + ' || ' + notificationDetails
                    });
                }
            }
            catch (err) {
                log.error({title: 'reduce() Error', details: err});
                throw err;
            }
        };

        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
         */
        const summarize = (summaryContext) => {
            try {
                if (summaryContext.inputSummary.error) {
                    log.error({title: 'Input Stage Error: ', details: summaryContext.inputSummary.error});
                }

                summaryContext.mapSummary.errors.iterator().each(function (key, error, executionNo) {
                    log.error({title: 'Map Stage Error for key ' + key, details: error + ', Execution No: ' + executionNo});
                });

                summaryContext.reduceSummary.errors.iterator().each(function (key, error, executionNo) {
                    log.error({title: 'Reduce Stage Error for key ' + key, details: error + ', Execution No: ' + executionNo});
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

        return {getInputData, map, reduce, summarize};

    });
