/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NAmdConfig ./IFD_Special_Order_Item_Config.json
 *
 * @description Map Event script used to send summary of special order items sales and purchase order quantity discrepancies
 * @author Franklin Ilo (AddCore Software Corp.)
 */
define(['N/log', 'N/runtime', 'N/search', 'N/email'],
    /**
     * @param {log} log
     * @param {runtime} runtime
     * @param {search} search
     * @param {email} email
    */
    (log, runtime, search, email) => {
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
                log.audit({
                    title: 'Special Order Item Summary Notification',
                    details: 'Process Start'
                });

                let specialOrderItemDailySummarySearchId = runtime.getCurrentScript().getParameter({
                    name: 'custscript_ifd_special_item_summary'
                });

                if (specialOrderItemDailySummarySearchId) {
                    let specialOrderItemDailySummarySearch = search.load({id: specialOrderItemDailySummarySearchId});
                    let specialOrderItemDailySummarySearchColumns = specialOrderItemDailySummarySearch.columns;

                    /* Add additional search columns */

                    //Sales Order Total Qty
                    specialOrderItemDailySummarySearchColumns.push(
                        search.createColumn({
                            name: "formulanumeric1",
                            summary: "SUM",
                            formula: "CASE WHEN ({type} = 'Sales Order') THEN NVL2({quantity}, {quantity}, 0) ELSE 0 END ",
                            label: "Sales Order Total Qty"
                        })
                    );

                    //Purchase Order Total Qty
                    specialOrderItemDailySummarySearchColumns.push(
                        search.createColumn({
                            name: "formulanumeric2",
                            summary: "SUM",
                            formula: "CASE WHEN ({type} = 'Purchase Order') THEN NVL2({quantity}, {quantity}, 0) ELSE 0 END ",
                            label: "Purchase Order Total Qty"
                        })
                    );

                    //Sales Order Total Count
                    specialOrderItemDailySummarySearchColumns.push(
                        search.createColumn({
                            name: "formulanumeric3",
                            summary: "SUM",
                            formula: "CASE WHEN ({type} = 'Sales Order') THEN 1 ELSE 0 END ",
                            label: "Sales Order Total Count"
                        })
                    );

                    //Purchase Order Total Count
                    specialOrderItemDailySummarySearchColumns.push(
                        search.createColumn({
                            name: "formulanumeric4",
                            summary: "SUM",
                            formula: "CASE WHEN ({type} = 'Purchase Order') THEN 1 ELSE 0 END ",
                            label: "Purchase Order Total Count"
                        })
                    );

                    //Return search
                    return specialOrderItemDailySummarySearch;
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
            try {
                log.debug({title: 'Map Context', details: JSON.stringify(mapContext)});

                let specialOrderItemValues = JSON.parse(mapContext.value).values;

                let specialOrderItemBuyerDetails = {};

                let buyerId = specialOrderItemValues['GROUP(custitem_ifd_buyer.item)'].value || 0;
                specialOrderItemBuyerDetails.buyerId = buyerId;

                specialOrderItemBuyerDetails.buyerText = specialOrderItemValues['GROUP(custitem_ifd_buyer.item)'].text;
                specialOrderItemBuyerDetails.preferredVendorText = specialOrderItemValues['GROUP(vendor.item)'].text;
                specialOrderItemBuyerDetails.preferredVendorId = specialOrderItemValues['GROUP(vendor.item)'].value;
                specialOrderItemBuyerDetails.itemText = specialOrderItemValues['GROUP(item)'].text;
                specialOrderItemBuyerDetails.itemId = specialOrderItemValues['GROUP(item)'].value;
                specialOrderItemBuyerDetails.itemDisplayName = specialOrderItemValues['GROUP(displayname.item)'];
                specialOrderItemBuyerDetails.salesOrderTotalQty = specialOrderItemValues['SUM(formulanumeric1)'];
                specialOrderItemBuyerDetails.purchaseOrderTotalQty = specialOrderItemValues['SUM(formulanumeric2)'];
                specialOrderItemBuyerDetails.salesOrderTotalCount = specialOrderItemValues['SUM(formulanumeric3)'];
                specialOrderItemBuyerDetails.purchaseOrderTotalCount = specialOrderItemValues['SUM(formulanumeric4)'];

                log.debug({title: 'Buyer Details', details: JSON.stringify(specialOrderItemBuyerDetails)});

                mapContext.write({
                    key: buyerId,
                    value: specialOrderItemBuyerDetails
                });

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
            try {
                log.debug({title: 'reduceContext', details: JSON.stringify(reduceContext)});
                let emailAuthor = runtime.getCurrentScript().getParameter({name: 'custscript_ifd_special_item_email_auth'});

                if (!emailAuthor) {
                    log.error({title: 'Unable to send notification', details: 'No Email author defined on the script deployment'});
                    return;
                }

                let buyerId = reduceContext.key;
                if (!buyerId || buyerId == 0) {
                    log.error({title: 'Unable to send notification', details: 'Invalid buyer ID: ' + buyerId});
                    return;
                }

                let buyerValues = reduceContext.values;
                if (!buyerValues || buyerValues.length < 1) {
                    log.error({title: 'Unable to send notification', details: 'Missing buyer values'});
                    return;
                }

                let buyerText = JSON.parse(buyerValues[0]).buyerText || '';

                emailAuthor = parseInt(emailAuthor);
                let emailRecipient = parseInt(buyerId);
                let emailSubject = 'Special Order Item Daily Transaction Summary';

                let emailBody = '';
                emailBody += "<html>";
                emailBody += "<head><style>";
                emailBody += "th, td {border: 1px solid #ddd;} table {border-collapse: collapse;}";
                emailBody += "</style></head><body><div>";
                emailBody += "Hi " + buyerText + "," ;
                emailBody += "<br><br>";
                emailBody += "Below is a summary of your special order item(s) on future Sales Order and Purchase Orders";
                emailBody += "<br><br>";

                emailBody += "<table style='width: 100%;'>";
                emailBody += "<tr style='background-color: darkgrey;'>";
                emailBody += "<th style='text-align: center;'>Item</th>" +
                    "<th style='text-align: center;'>Preffered Vendor</th>" +
                    "<th style='text-align: center;'>Total Sales Order Qty</th>" +
                    "<th style='text-align: center;'>Total Purchase Order Qty</th>" +
                    "<th style='text-align: center;'>No. of Sales Orders</th>" +
                    "<th style='text-align: center;'>No. of Purchase Orders</th>" +
                    "</tr>";

                for (let count = 0; count < buyerValues.length; count++) {
                    let buyerDetail = JSON.parse(buyerValues[count]);
                    log.debug({title: 'Reduce Stage - Buyer Detail', details: JSON.stringify(buyerDetail)});

                    emailBody += "<tr>";
                    emailBody += "<td>" + buyerDetail.itemText + " " + buyerDetail.itemDisplayName + "</td>";
                    emailBody += "<td>" + buyerDetail.preferredVendorText + "</td>";
                    emailBody += "<td style='text-align: right;'>" + buyerDetail.salesOrderTotalQty + "</td>";
                    emailBody += "<td style='text-align: right;'>" + buyerDetail.purchaseOrderTotalQty + "</td>";
                    emailBody += "<td style='text-align: right;'>" + buyerDetail.salesOrderTotalCount + "</td>";
                    emailBody += "<td style='text-align: right;'>" + buyerDetail.purchaseOrderTotalCount + "</td>";
                    emailBody += "</tr>";
                }

                emailBody += "</table>";
                emailBody += "</div></body></html>";

                //Send the email
                email.send({
                    author: emailAuthor,
                    recipients: [emailRecipient],
                    subject: emailSubject,
                    body: emailBody
                });

                log.audit({title: 'Sent Notification Email - Buyer Details', details: buyerId + ' - ' + buyerText});

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
