/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 *
 * @description Map/Reduce script used to notate (or mark) Sales Orders with related Return Authorizations (RA)
 * @author Franklin Ilo (AddCore Software Corp.)
 */

define(['N/log', 'N/record', 'N/runtime', 'N/search', 'N/error'],
    /**
     * @param {log} log
     * @param {record} record
     * @param {runtime} runtime
     * @param {search} search
     * @param {error} error
    */
    (log, record, runtime, search, error) => {

        /**
         * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
         *
         * @param {Object} inputContext
         * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
         */
        const getInputData = (inputContext) => {
            try {
                let pickupReturnAuthorizationSearchId = runtime.getCurrentScript().getParameter({
                    name: 'custscript_ifd_pickup_ra_srch'
                });

                if (pickupReturnAuthorizationSearchId) {
                    return search.load({id: pickupReturnAuthorizationSearchId});
                }
                else {
                    log.error({title: 'Missing Pick up Return Authorization Search', details: 'No search specified on the script deployment'});
                    return [];
                }
            }
            catch (err) {
                log.error({title: 'Get Input Data stage error', details: err});
            }
        };

        /**
         * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
         * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
         * context.
         *
         * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
         *     is provided automatically based on the results of the getInputData stage.
         */
        const map = (mapContext) => {
            try {
                let mapContextValues = JSON.parse(mapContext.value).values;
                let pickupAccount = mapContextValues.custbody_ra_pickup_account;
                log.debug({title: 'Pickup Account', details: JSON.stringify(pickupAccount)});

                let pickupDate = mapContextValues.custbody_ifd_rapickupdate;
                log.debug({title: 'Pickup Date', details: pickupDate});

                if (pickupAccount && pickupAccount.value && pickupDate) {
                    log.debug({title: 'Pickup Account: ', details: 'ID: ' + pickupAccount.value + ', Name: ' + pickupAccount.text});

                    let pickupSalesOrderSearchId = runtime.getCurrentScript().getParameter({name: 'custscript_ifd_pickup_so_srch'});
                    if (pickupSalesOrderSearchId) {
                        let pickupSalesOrderSearch = search.load({id: pickupSalesOrderSearchId});

                        //Further filter the Pickup Sales Order search using the Pickup Account (i.e., Entity) and RA Pickup Date
                        pickupSalesOrderSearch.filters = (pickupSalesOrderSearch.filters) ? pickupSalesOrderSearch.filters : [];

                        pickupSalesOrderSearch.filters.push(search.createFilter({
                            name: 'entity',
                            operator: search.Operator.ANYOF,
                            values: [pickupAccount.value]
                        }));

                        pickupSalesOrderSearch.filters.push(search.createFilter({
                            name: 'shipdate',
                            operator: search.Operator.ON,
                            values: pickupDate
                        }));

                        //Run the Pickup Sales Order search
                        pickupSalesOrderSearch.run().each(function (result) {
                            let salesOrderId = result.id;
                            let salesOrderDocumentNumber = result.getValue({name: 'tranid'});

                            log.debug({
                                title: 'Pickup Sales Order for ' + pickupAccount.text,
                                details: 'Internal ID: ' + salesOrderId + ', Doc No. : ' + salesOrderDocumentNumber
                            });

                            //Mark the RA checkbox on the Sales Order
                            record.submitFields({
                                type: record.Type.SALES_ORDER,
                                id: salesOrderId,
                                values: {
                                    'custbody_ifd_ra': true
                                },
                                options: {
                                    enablesourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            });

                            log.audit({title: 'Updated Sales Order', details: 'Internal ID: ' + salesOrderId + ', Doc No. : ' + salesOrderDocumentNumber});
                            return true;
                        });

                    }
                    else {
                        log.error({title: 'Missing Pick up Sales Order Search', details: 'No search specified on the script deployment'});
                    }
                }

            }
            catch (err) {
                log.error({title: 'Map stage error', details: err});
            }
        };

        /**
         * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
         * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
         *
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

                log.audit({
                    title: 'Summary Details: ',
                    details: 'Total Seconds: ' + summaryContext.seconds + ', Total Usage: ' + summaryContext.usage +
                        ', Total yields : ' + summaryContext.yields
                });
            }
            catch (err) {
                log.error({title: 'Summarize stage error', details: err});
                throw error.create({name: 'IFD_NOTATE_SO_ERROR', message: err, notifyOff: false});
            }

        };

        return {getInputData, map, summarize};

    });
