/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log','N/runtime'],
    function(record, search, log,runtime) {

        function afterSubmit(context) {
            if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
                return;
            }

            try {
                log.debug("Hii in the code");
                var scriptParameterSS = runtime.getCurrentScript().getParameter({
                    name: 'custscript_saved_search'
                });
                var mySavedSearch = search.load({
                    id: scriptParameterSS
                });

                var searchResultSet = mySavedSearch.run();
                var allResults = [];
                var resultIndex = 0;
                var resultStep = 1000; // Number of records to fetch in each iteration

                do {
                    var resultSlice = searchResultSet.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });
                    resultIndex += resultStep;

                    if (resultSlice && resultSlice.length > 0) {
                        allResults = allResults.concat(resultSlice);
                    }
                } while (resultSlice.length > 0);

                log.debug({
                    title: 'Search Results',
                    details: allResults
                });

            } catch (e) {
                log.error({
                    title: 'Error retrieving search results',
                    details: e.toString()
                });
            }
        }

        return {
            afterSubmit: afterSubmit
        };

    });
