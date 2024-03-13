/**
 * @NApiVersion 2.0
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record'],
    function (search, record) {

        var SEARCH_JOBS = 37061;

        //entry - getInputData
        function getInputData() {

            var results = [];

            var jobsSearch = search.load({ id: SEARCH_JOBS });
            var jobsPages = jobsSearch.runPaged();
            jobsPages.pageRanges.forEach(function (pageRange) {
                var currentJobsPage = jobsPages.fetch({ index: pageRange.index });
                currentJobsPage.data.forEach(function (result) {

                    var columns = result.columns;
                    var recId = result.getValue(columns[0]);
                    var newAmount = result.getValue(columns[2]);
                    var newAmount606 = result.getValue(columns[3]);

                    results.push({
                        recId: recId,
                        newAmount: newAmount,
                        newAmount606: newAmount606
                    });
                });
            });

            log.audit({
                title: '# results to process',
                details: results.length
            });

            return results; 
        }

        //entry - map
        function map(context) {

            var result = JSON.parse(context.value);

            try {
                var idUpdated = record.submitFields({
                    type: record.Type.JOB,
                    id: result.recId,
                    values: {
                        custentityr7jobvsoeallocation: result.newAmount,
                        custentityr7_606_jobvsoeallocation: result.newAmount606
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });

                log.debug({
                    title: 'record successfully updated',
                    details: idUpdated
                });
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