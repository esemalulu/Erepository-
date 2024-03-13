/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search'],
    function (search) {

        //get for searchid param, throw error if not provided
        function getSearchId(context){
            var searchId = context.searchid;
            if (!searchId) {
                throw new Error('searchid parameter was not provided.');
            }
            return searchId;
        }

        //get filter params, if only partially provided throw an error
        function createSearchFilter(context){
            var filterField = context.filterField;
            var filterOperator = context.filterOperator;
            var filterValue = context.filterValue;
            var searchFilter;
            if(filterField && filterOperator && filterValue) {
                searchFilter = search.createFilter({
                    name: filterField,
                    operator: filterOperator,
                    values: filterValue
                });
            } else if(filterField || filterOperator || filterValue){
                throw new Error('filterField, filterOperator and filterValue are required to filter results');
            }
            return searchFilter;
        }

        //run search 
        function runSearch(searchId, searchFilter, context) {

            //init
            var SEARCH_ID = searchId;
            var currentResultSet = [];

            //load search
            var currentSearch = search.load({ id: SEARCH_ID });
            if(searchFilter) {
                currentSearch.filters.push(searchFilter);
            }
            log.debug({
                title: 'SEARCH_ID',
                details: SEARCH_ID
            });

            if(context.returnCount && context.returnCount === 'true') {
                return currentSearch.runPaged().count;
            }

            var startIndex = context.startIndex;
            var pageSize = context.pageSize;

            var resultProcessor = function (result) {
                var currentResult = {};
                for (var prop in result) {
                    currentResult[prop] = result[prop];
                }
                currentResultSet.push(currentResult);
                return true;
            };

            if(startIndex) {
                currentSearch.run().getRange({
                    start: startIndex,
                    end: Number(startIndex) + Number(pageSize)
                }).forEach(resultProcessor);
            } else {
                //run search, build results table
                currentSearch.run().each(resultProcessor);
            }
            

            log.debug({
                title: 'results',
                details: JSON.stringify(currentResultSet)
            });
            //return results
            return currentResultSet;
        }

        //http get
        function _get(context) {
            try {
                var searchId = getSearchId(context);
                var searchFilter = createSearchFilter(context);
                return runSearch(searchId, searchFilter, context);
            } catch(e){
                return {error: true, message: e.message}
            }
        }

        return {
            get: _get
        };
    });