/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @NScriptType MapReduceScript
 * @module
 * @description
 */
define(['N/runtime', 'N/search', 'N/record'], function (runtime, search, record) {

    //get current script object.
    var scriptObj = runtime.getCurrentScript();

    function getInputData(inputContext) {
        /**
         * input data will be summary search of partners with delinquent/
         * severely delinquent status, but whose customers have no overdue
         * balance.
         **/
        return {
            type: "search",
            id: scriptObj.getParameter({
                name: 'custscript_r7_ar_status_search'
            })
        }
    }

    function map(mapContext) {
        /**
         * for each search result, get the partner record internal ID,
         * then set the AR Credit Status to OFF
         */
        var contextValue = JSON.parse(mapContext.value);
        var partnerObj = contextValue.values["GROUP(partner)"];
        var recIntId = partnerObj.value;
        log.debug('Updating Partner (Internal ID)', recIntId);
        record.submitFields({
            type: 'PARTNER',
            id: recIntId,
            values: {
                custentityr7_ar_credit_status: null //3: OFF
            }
        });
    }

    function summarize(summaryContext) {
        if (summaryContext.inputSummary.error) {
            log.error('Input Error', summaryContext.inputSummary.error);
        }

        summaryContext.mapSummary.errors.iterator().each(
            function (key, error, executionNo) {
                var errorObject = JSON.parse(error);
                log.error({
                    title: 'Map error for key: ' + key + ', execution no. ' + executionNo,
                    details: errorObject.name + ': ' + errorObject.message
                });
                return true;
            }
        );

        var totalRecordsUpdated = 0;

        summaryContext.output.iterator().each(function (key, value) {
            totalRecordsUpdated++;
            return true;
        });

        log.debug({
            title: 'Total records updated',
            details: totalRecordsUpdated
        });
    }
    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
});