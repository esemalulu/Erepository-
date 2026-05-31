/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/search', 'N/record', 'N/runtime', 'N/error', 'N/log'], function(search, record, runtime, error, log) {

    function getInputData() {
        var salesOrder = runtime.getCurrentScript().getParameter({
            name: 'custscript_sales_order_saved_search'
        });
        var commissionPercent = runtime.getCurrentScript().getParameter({
            name: 'custscript_commission_percent_ss'
        });

        var commissionPercentSearchObj = search.load({
            id: commissionPercent
        });

        var commissionPercentSearchResults = commissionPercentSearchObj.run().getRange({
            start: 0,
            end: 1000
        });

        var inputData = [];
        for (var i = 0; i < commissionPercentSearchResults.length; i++) {
            var period = commissionPercentSearchResults[i].getValue({
                name: 'custrecord_period'
            });
            var agency = commissionPercentSearchResults[i].getValue({
                name: 'custrecord_agency'
            });

            log.debug("Period is", period);
            log.debug("Agency is", agency);

            var tl1 = commissionPercentSearchResults[i].getValue({name: 'custrecord_tolerance_limit_1'});
            var tl2 = commissionPercentSearchResults[i].getValue({name: 'custrecord_tolerance_limit_2'});
            var tl3 = commissionPercentSearchResults[i].getValue({name: 'custrecord_tolerance_limit_3'});
            var tl4 = commissionPercentSearchResults[i].getValue({name: 'custrecord_tolerance_limit_4'});
            var cp1 = commissionPercentSearchResults[i].getValue({name: 'custrecord_commissions_percent_1'});
            var cp2 = commissionPercentSearchResults[i].getValue({name: 'custrecord_commissions_percent_2'});
            var cp3 = commissionPercentSearchResults[i].getValue({name: 'custrecord_commissions_percent_3'});
            var cp4 = commissionPercentSearchResults[i].getValue({name: 'custrecord_commissions_percent_4'});
            var internalid = commissionPercentSearchResults[i].getValue({name: 'internalid'});

            inputData.push({
                key: agency,
                value: JSON.stringify({
                    period: period,
                    agency: agency,
                    tl1: tl1,
                    tl2: tl2,
                    tl3: tl3,
                    tl4: tl4,
                    cp1: cp1,
                    cp2: cp2,
                    cp3: cp3,
                    cp4: cp4,
                    internalid: internalid
                })
            });
        }
        log.debug("getInputData", "Returning input data: " + JSON.stringify(inputData));
        return inputData;
    }

    function map(context) {
        var key = context.key;
        var outerResult = JSON.parse(context.value);
        var result = JSON.parse(outerResult.value); // Parse the nested JSON string

        log.debug({
            title: 'Mapped Values',
            details: {
                key: key,
                value: result
            }
        });

        try {
            var agency = result.agency;
            var period = result.period;
            log.debug("Agency:", agency);
            log.debug("Period:", period);
        } catch (e) {
            log.error("Error in map function - parsing values", e.message);
        }

        var totalAmount = 0;
        var salesOrderData = [];

        try {
            var salesOrderSearch = search.load({
                id: 'customsearch_sales_order_sc'
            });

            salesOrderSearch.filters.push(
                search.createFilter({
                    name: "postingperiod",
                    operator: 'abs',
                    values: period,
                }));
            salesOrderSearch.filters.push(
                search.createFilter({
                    name: "salesrep",
                    operator: search.Operator.IS,
                    values: agency,
                }));

            // Run the search and get sales order data
            salesOrderSearch.run().each(function(result) {
                var salesOrderId = result.id;
                var amount = parseFloat(result.getValue({ name: 'amount' }));
                totalAmount += amount;

                salesOrderData.push({
                    salesOrderId: salesOrderId,
                    amount: amount
                });

                return true;
            });
        } catch (e) {
            log.error("Error in map function - running sales order search", e.message);
        }

        context.write({
            key: key,
            value: JSON.stringify({
                commissionData: result,
                salesOrderData: salesOrderData,
                totalAmount: totalAmount
            })
        });
    }

    function reduce(context) {
        var key = context.key;
        var values = context.values.map(function(value) {
            return JSON.parse(value);
        });

        var commissionData = values[0].commissionData;
        var salesOrderData = [];
        var totalAmount = 0;

        values.forEach(function(value) {
            salesOrderData = salesOrderData.concat(value.salesOrderData);
            totalAmount += value.totalAmount;
        });

        log.debug({
            title: 'Reduce Stage',
            details: {
                key: key,
                commissionData: commissionData,
                salesOrderData: salesOrderData,
                totalAmount: totalAmount
            }
        });

        var tl1 = commissionData.tl1;
        var tl2 = commissionData.tl2;
        var tl3 = commissionData.tl3;
        var tl4 = commissionData.tl4;
        var cp1 = commissionData.cp1;
        var cp2 = commissionData.cp2;
        var cp3 = commissionData.cp3;
        var cp4 = commissionData.cp4;

        cp1 = cp1 || 0;
        cp2 = cp2 || 0;
        cp3 = cp3 || 0;
        cp4 = cp4 || 0;

        var commissionPercentage;
        if (totalAmount <= tl1) {
            commissionPercentage = cp1;
        } else if (totalAmount <= tl2) {
            commissionPercentage = cp2;
        } else if (totalAmount <= tl3) {
            commissionPercentage = cp3;
        } else if (totalAmount <= tl4) {
            commissionPercentage = cp4;
        } else {
            commissionPercentage = cp4; // Assuming highest percentage for amounts greater than tl4
        }

        log.debug({
            title: 'Commission Calculation',
            details: {
                totalAmount: totalAmount,
                commissionPercentage: commissionPercentage,
            }
        });

        salesOrderData.forEach(function(order) {
            try {
                record.submitFields({
                    type: record.Type.SALES_ORDER,
                    id: order.salesOrderId,
                    values: {
                        custbody_commission_percent: commissionPercentage
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
                log.debug({
                    title: 'Sales Order Updated',
                    details: {
                        salesOrderId: order.salesOrderId,
                        commissionPercentage: commissionPercentage
                    }
                });
            } catch (e) {
                log.error({
                    title: 'Error Updating Sales Order',
                    details: e.message
                });
            }
        });

        var commisioninternalId = commissionData.internalid;
        try {
            record.submitFields({
                type: 'customrecord_define_commission_percent',
                id: commisioninternalId,
                values: {
                    isinactive: true
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            log.debug({
                title: 'Commission Percentage record Updated',
                details: {
                    commisioninternalId: commisioninternalId
                }
            });
        } catch (e) {
            log.error({
                title: 'Error Updating Commission Percentage',
                details: e.message
            });
        }
    }

    function summarize(summaryContext) {
        log.audit({
            title: 'summarize',
            details: 'Summary: ' + summaryContext.toString() + '| Usage Consumed: ' + summaryContext.usage + ' | Number of Queues: ' + summaryContext.concurrency + ' | Number of Yields: ' + summaryContext.yields
        });
        logErrorIfAny(summaryContext);
    }

    function logErrorIfAny(summaryContext) {
        if (summaryContext.inputSummary.error) {
            log.error({title: 'Get Input Data Error', details: summaryContext.inputSummary.error});
        }
        handleErrorInStage('Map', summaryContext.mapSummary);
        handleErrorInStage('Reduce', summaryContext.reduceSummary);
    }

    function handleErrorInStage(stage, summary) {
        var arrErrorMessage = [];

        if (summary.errors && summary.errors.iterator) {
            summary.errors.iterator().each(function(key, error) {
                arrErrorMessage.push('Key: ' + key + ' | ' + 'Error: ' + JSON.parse(error).message);
                return true;
            });
        }

        if (arrErrorMessage.length > 0) {
            log.error({ title: stage + ' Error', details: JSON.stringify(arrErrorMessage) });
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
});
