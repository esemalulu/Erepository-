/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search) {
   
    /**
     * 
     * This is a one time use script for updating the MSRP Amounts on existing Sales Orders.
     * 
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
        var msrpPriceLevel = 14; // MSRP 34

        return search.create({
            type: "salesorder",
            filters:
            [
                ["type","anyof","SalesOrd"],
                "AND",
                ["mainline","is","T"],
                "AND",
                ["status","anyof","SalesOrd:B"], // Pending Fulfillment
                "AND",
                ["custbodyrvsordertype","anyof","2"], // Unit
                "AND",
                ["custbodyrvsunit.custrecordunit_status","anyof","33","7","@NONE@"],
                "AND",
                ["custbodyrvsunitmodel","anyof","66355","65032","66108","65034","65035","65036","65037","65038","66807","70056","68580"],
            ],
            columns: ['internalid']
        });
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
        var msrpPriceLevel = 14; // MSRP 34
        var msrpRate = 34;

        var searchResult = JSON.parse(context.value);
        var salesOrderId = searchResult.id;

        log.debug('Sales Order', salesOrderId);

        try {
            var salesOrder = record.load({
                type: record.Type.SALES_ORDER,
                id: salesOrderId
            });

            salesOrder.setValue('custbodyrvsmsrppricelevel', msrpPriceLevel);
            salesOrder.setValue('custbodyrvsmsrprate', msrpRate);

            //Get the lines so we can search on the price level.
            var nonCustomLines = [];
            var customLines = [];
            for (var i = 0; i < salesOrder.getLineCount('item'); i++) {
                // If the line has custom pricing, use that.
                if (salesOrder.getSublistValue('item', 'price', i) == -1)
                    customLines.push(salesOrder.getSublistValue('item', 'item', i));
                else if (salesOrder.getSublistValue('item', 'custcolrvsmsrpamount', i) > 0)
                    nonCustomLines.push(salesOrder.getSublistValue('item', 'item', i));
            }

            if (nonCustomLines.length > 0) {
                var msrpSearchObj = search.create({
                    type: "item",
                    filters:
                    [
                        search.createFilter({
                            name: 'pricelevel',
                            join: 'pricing',
                            operator: search.Operator.IS,
                            values: msrpPriceLevel
                        }),
                        search.createFilter({
                            name: 'internalid',
                            operator: search.Operator.ANYOF,
                            values: nonCustomLines
                        }),
                    ],
                    columns:
                    [
                        search.createColumn({
                            name: 'unitprice',
                            join: 'pricing'
                        }),
                    ]
                });

                var msrpSearchResultCount = msrpSearchObj.runPaged().count;

                // Match up the msrpResults to the line.
                if (msrpSearchResultCount > 0) {
                    for (var i = 0; i < salesOrder.getLineCount('item'); i++) {
                        if (salesOrder.getSublistValue('item', 'custcolrvsmsrpamount', i) != 0) {
                            // Search for the current item in the results.
                            var curItem = salesOrder.getSublistValue('item', 'item', i);
                            msrpSearchObj.run().each(function(result){
                                // .run().each has a limit of 4,000 results
                                if (result.id == curItem) {
                                    salesOrder.setSublistValue('item', 'custcolrvsmsrpamount', i,
                                        result.getValue({ name: 'unitprice', join: 'pricing' }) * salesOrder.getSublistValue('item', 'quantity', i));

                                    return false;
                                }
                                return true;
                            });
                        }
                    }
                }
            }

            if (customLines.length > 0) {
                for (var i = 0; i < salesOrder.getLineCount('item'); i++) {
                    if (salesOrder.getSublistValue('item', 'custcolrvsmsrpamount', i) != 0) {
                        // See if this line is a custom line
                        for (var j = 0; j < customLines.length; j++) {
                            if (customLines[j] == curItem) {
                                salesOrder.setSublistValue('item', 'custcolrvsmsrpamount', i,
                                    salesOrder.getSublistValue('item', 'amount', i) * (1 + (parseFloat(salesOrder.getValue('custbodyrvsmsrprate')) / 100)));

                                break;
                            }
                        }
                    }
                }
            }

            if (nonCustomLines.length == 0 && customLines.length == 0)
                log.error('SS ERROR', 'No items with MSRP Amount > 0: ' + result.id);
            
            salesOrder.save({ ignoreMandatoryFields: true });
        } catch (error) {
            log.error('SS ERROR', 'Could not update Sales Order with ID ' + result.id + '. Error description:\r\n' + error);
        }
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
