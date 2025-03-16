/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log'], function(record, search, log) {

    function afterSubmit(context) {
        try {
            if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
                return;
            }

            var newRecord = context.newRecord;
            var recordId = newRecord.id;
            var locationType = newRecord.getValue({ fieldId: 'name' });

            if (!locationType) {
                log.error({
                    title: 'Missing Location Type',
                    details: 'The location type field is empty or undefined.'
                });
                return;
            }

            // Load the saved search
            var savedSearch = search.load({
                id: 'customsearch_region_search_2'
            });

            // Add a filter for the location type
            var filters = savedSearch.filters;
            var newFilter = search.createFilter({
                name: 'name',
                operator: search.Operator.IS,
                values: locationType
            });
            filters.push(newFilter);

            // Run the search with the new filter
            var searchResult = savedSearch.run().getRange({
                start: 0,
                end: 1 // Assuming we need only the first result
            });

            if (searchResult.length > 0) {
                // Extract the value of 'custrecord_location_region' from the search results
                var locationRegion = searchResult[0].getValue({ name: 'custrecord_location_region' });
                log.debug({
                    title: 'Location Region',
                    details: locationRegion
                });

                if (locationRegion) {
                    record.submitFields({
                        type: newRecord.type,
                        id: recordId,
                        values: {
                            parent: locationRegion
                        }
                    });
                    log.debug({
                        title: 'Parent Field Updated',
                        details: 'Record ID: ' + recordId + ', Parent: ' + locationRegion
                    });
                }
            } else {
                log.error({
                    title: 'No Search Results',
                    details: 'No results found for the given location type.'
                });
            }

        } catch (e) {
            log.error({
                title: 'Error in afterSubmit function',
                details: e.toString()
            });
        }
    }

    return {
        afterSubmit: afterSubmit
    };

});
