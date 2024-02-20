/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

define(['N/search', 'N/runtime', 'N/record'], function(search, runtime, record) {

    function getInputData(context) {

        var finSysSearchId = 6063;
       
        var unitApplianceSearch = search.load({
            id: finSysSearchId
        });

        var results = [];
        var count = 0;
        var pageSize = 1000;
        var start = 0;

        do {
            var subresults = unitApplianceSearch.run().getRange({
                start: start,
                end: start + pageSize
            });

            results = results.concat(subresults);
            count = subresults.length;
            start += pageSize;
        } while (count == pageSize);
        log.debug('results', results.length);
        return results;
        
    }

    function map(context) {
        try{
            var resultObj = JSON.parse(context.value).values;
            log.debug('resultObj', JSON.stringify(resultObj));
            if(['100204', '100205'].indexOf(resultObj['internalid'][0].value) == -1){
            var fieldsMapping = {};
            fieldsMapping.custrecord_17_recordid = resultObj['internalid'][0].value;
            fieldsMapping.custrecord_17_reference = 'CREATE';
            fieldsMapping.custrecord_17_recordtype = 18;
            fieldsMapping.custrecord_17_status = 1;

            var queueIntegRec = record.create({
                type: 'customrecord_17_integration_queue',
                isDynamic: true
            });
            for(var prop in fieldsMapping){
                queueIntegRec.setValue({
                    fieldId: prop,
                    value: fieldsMapping[prop],
                });
            }
            var queueIntegRecId = queueIntegRec.save();
            log.debug('queueIntegRecId', queueIntegRecId);
            }
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