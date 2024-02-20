/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define(['N/search', 'N/runtime', 'N/record'], function(search, runtime, record) {

    function getInputData(context) {

        var scriptObj = runtime.getCurrentScript();
        var preAuthSearchId = scriptObj.getParameter({name: 'custscript_ss_pa_auth_for_denied'});
      	var deniedId = scriptObj.getParameter({name: 'custscript_denied_status_id'});
        if(!preAuthSearchId || !deniedId){
            log.error('MISSING_PARAMETER_VALUE', 'Script parameter is missing');
        }
        var paSearch = search.load({
            id: preAuthSearchId
        });

        var results = [];
        var count = 0;
        var pageSize = 1000;
        var start = 0;

        do {
            var subresults = paSearch.run().getRange({
                start: start,
                end: start + pageSize
            });

            results = results.concat(subresults);
            count = subresults.length;
            start += pageSize;
        } while (count == pageSize);
        log.debug('results', JSON.stringify(results));
        return results;
        
    }

    function map(context) {
        try{
          var scriptObj = runtime.getCurrentScript();
          var deniedId = scriptObj.getParameter({name: 'custscript_denied_status_id'});
            log.debug('map context.value', context.value)
            var resultObj = JSON.parse(context.value);
            record.submitFields({
				type: resultObj.recordType,
				id: resultObj.id,
				values: {
                    'custrecordpreauth_status': deniedId //denied status
                }
			});
        }catch(e){
            log.error('Error @ Map Stage', e.message);
        }
    }

   
    function summarize(context) {

        log.audit({
            title: 'Usage units consumed',
            details: context.usage
        });
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
});