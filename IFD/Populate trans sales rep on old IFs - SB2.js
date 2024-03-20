/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */
define(['N/record', 'N/search'], function(record, search) {

    function execute(context) {
        // Set the specific date for filtering Item Fulfillments (January 1, 2022)
        var startDate = '01/01/2022 12:00 am';

        // Search for existing Item Fulfillments created after the specified date
        var fulfillmentSearch = search.create({
            type: search.Type.ITEM_FULFILLMENT,
            filters: [
                ['datecreated', 'after', startDate]
                // Add additional filters if needed
            ],
            columns: [
                'createdfrom',
                'salesrep'
            ]
        });

        var searchResults = fulfillmentSearch.run().getRange({ start: 0, end: 1000 });

        // Loop through the search results
        for (var i = 0; i < searchResults.length; i++) {
            var fulfillmentId = searchResults[i].id;

            // Load the Item Fulfillment record
            var fulfillmentRecord = record.load({
                type: record.Type.itemfulfillment,
                id: fulfillmentId
            });

            // Get the 'Created From' transaction ID
            var createdFromId = fulfillmentRecord.getValue({
                fieldId: 'createdfrom'
            });

            if (createdFromId) {
                // Load the 'Created From' transaction (e.g., Sales Order, Estimate)
                var createdFromRecord = record.load({
                    type: record.Type.SALES_ORDER,
                    id: createdFromId
                });

                // Get the Sales Rep from the 'Created From' transaction
                var salesRep = createdFromRecord.getValue({
                    fieldId: 'salesrep'
                });

                // Update the custom field on the Item Fulfillment
                fulfillmentRecord.setValue({
                    fieldId: 'custbody_ifd_sales_rep',
                    value: salesRep
                });

                // Save the changes
                fulfillmentRecord.save();
            }
        }
    }

    return {
        execute: execute
    };
});
