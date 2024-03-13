/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/runtime'],
    function (nsSearch, nsRecord, nsRuntime) {

        var SEARCH_BY_ACTIVE_DATE   = nsRuntime.getCurrentScript().getParameter({name: 'custscriptsearch_by_date'});
        var SEARCH_BY_PAYMENT       = nsRuntime.getCurrentScript().getParameter({name: 'custscriptsearch_by_pay'});
        var SEARCH_BY_BILL          = nsRuntime.getCurrentScript().getParameter({name: 'custscriptsearch_by_bill'});
        var testRun                 = nsRuntime.getCurrentScript().getParameter({name: 'custscripttestRun'});

        //entry - getInputData
        function getInputData() {

            var resultsByActiveDate = [];
            var resultsByPayment = [];
            var resultsByBill = [];
            getResultsArray(SEARCH_BY_ACTIVE_DATE, resultsByActiveDate);
            getResultsArray(SEARCH_BY_PAYMENT, resultsByPayment);
            getResultsArray(SEARCH_BY_BILL, resultsByBill);
            log.debug('resultsByActiveDate',resultsByActiveDate);
            log.debug('resultsByPayment',resultsByPayment);
            log.debug('resultsByBill',resultsByBill);
            var resultsArr = findOverlappingIds(resultsByPayment, resultsByBill);
            resultsArr = findOverlappingIds(resultsArr, resultsByActiveDate);

            log.audit({
                title: '# results to process',
                details: resultsArr
            });
            log.audit({
                title: '# results to process',
                details: resultsArr.length
            });

            return resultsArr; 
        }

        function getResultsArray(searchId, resultsArr){
            var search = nsSearch.load({ id: searchId });
            var pages = search.runPaged();
            pages.pageRanges.forEach(function (pageRange) {
                var currentPage = pages.fetch({ index: pageRange.index });
                currentPage.data.forEach(function (result) {
                    var columns = result.columns;
                    var recId = result.getValue(columns[0]);
                    resultsArr.push(recId);
                });
            });
        }

        function findOverlappingIds(arr1, arr2) {
            return arr1.filter(function(n) {
                return  arr2.indexOf(n) !== -1;
            });
        }

        //entry - map
        function map(context) {
            var recId = context.value;
            try {
                log.debug('test run',testRun);
                if(!testRun){
                    log.debug('we are updating record '+recId);
                    var idUpdated = nsRecord.submitFields({
                        type: nsRecord.Type.VENDOR,
                        id: recId,
                        values: {
                            isinactive:true
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                }
                log.debug({
                    title: 'record successfully updated',
                    details: idUpdated
                });
                
                log.debug('record successfully updated',recId);
            }
            catch (e) {
                log.error({
                    title: 'error updating record',
                    details: e
                });
            }            
        }

        //entry - reduce
        function reduce(context) {

        }

        //entry - summarize
        function summarize(summary) {
            log.audit({
                title: 'summary:',
                details: JSON.stringify(summary)
            });
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };
    });