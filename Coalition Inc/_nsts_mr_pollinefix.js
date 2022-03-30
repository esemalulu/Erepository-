/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * Version    Date            Author           Remarks
 * 1.00       21 Dec 2020     ikallish
 *
 *
 */

define(['N/search', 'N/record', 'N/task', 'N/file', 'N/format', 'N/email', 'N/runtime', 'N/error'],

    function(search, record, task, file, format, email, runtime, error) {

        function getInputData(context){
            try {
                //load search
                //return search
                var policySearch = search.load({
                    id: 'customsearch_nsts_linecheck'
                });

                var policySearchResults = getAllResults(policySearch);
                log.debug('this is the policy search results, probably array',policySearchResults);
                //return {
                //type: 'search',
                //  id: quantityNeededSearch
                //}
                return policySearchResults;
            } catch(error) {
                log.error({title: 'Error in getInputData()', details: error});
            }
        }

        function map(context) {
            try {
                //I just left this in for you because this is the code you're going
                //to use here 99.9% of the time!
                var searchResult = JSON.parse(context.value);
                var recordId = searchResult.id;
                //log.debug("Record ID: ", recordId);
                context.write({key: recordId, value: searchResult});
            } catch(error) {
                log.error({title: 'Error in map()', details: error});
            }

        }

        function reduce(context) {
            try {
                var recordId = JSON.parse(context.key);
                var searchResults = context.values;
                //log.debug your searchResults to see the JSON you're working with
                //create a JE
                //fill all the values as needed from your searchResults
                //save the JE
                var loadedPolicyRecord = record.load({
                    type: 'customrecord_coalition_policy',
                    id: recordId,
                    isDynamic: true,
                });
                log.debug('this is the loaded policy record',loadedPolicyRecord);

                loadedPolicyRecord.save();

            } catch(error) {
                log.error({title: 'Error in reduce()', details: error});
            }

        }

        function summarize(context) {
            try {
                //summarize data here!
                //leave blank, you don't need this for this customization :D
            } catch (error) {
                log.error({title: 'Error in summarize()', details: error});
            }
        }

        function getAllResults(objSearch, maxResults)
        {
            var intPageSize = 1000;
            // limit page size if the maximum is less than 1000
            if (maxResults && maxResults < 1000) {
                intPageSize = maxResults;
            }
            var objResultSet = objSearch.runPaged({
                pageSize : intPageSize
            });
            var arrReturnSearchResults = [];
            var j = objResultSet.pageRanges.length;
            // retrieve the correct number of pages. page count = maximum / 1000
            if (j && maxResults) {
                j = Math.min(Math.ceil(maxResults / intPageSize), j);
            }
            for (var i = 0; i < j; i++) {
                var objResultSlice = objResultSet.fetch({
                    index : objResultSet.pageRanges[i].index
                });
                arrReturnSearchResults = arrReturnSearchResults.concat(objResultSlice.data);
            }
            if (maxResults) {
                return arrReturnSearchResults.slice(0, maxResults);
            } else {
                return arrReturnSearchResults;
            }
        }

        function isEmpty(value) {
            if (value == null || value == 'null' || value == undefined || value == 'undefined' || value == '' || value == "" || value.length <= 0) {
                return true;
            }
            return false;
        }

        return{
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    }
);