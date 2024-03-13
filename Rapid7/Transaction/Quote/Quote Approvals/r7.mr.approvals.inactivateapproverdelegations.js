/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */

define([
        'N/log',
        'N/record',
        'N/runtime',
        'N/search',
], function (log, record, runtime, search) {
        function getInputData() {
                //log.debug('***inside getinputdata***');
                let scriptparam = runtime.getCurrentScript();
                // noinspection JSCheckFunctionSignatures
                let savedsearchid = scriptparam.getParameter('custscript_del_saved_search_id');
                if (savedsearchid) {
                        let searchobj = search.load({
                                id: savedsearchid
                        });
                        return searchobj;
                }

        }

        function map(context) {
                //log.debug('***inside map***');
                let mapdata = JSON.parse(context.value);
                let mapdatavalues = mapdata.values;

                log.debug('mapdatavalues', mapdatavalues)
                let internalid = mapdatavalues['internalid']['value'];

                context.write({
                        key: internalid,
                        value: null
                });
        }

        // noinspection JSCheckFunctionSignatures
        function reduce(context) {
                log.debug('***inside reduce***');
                //log.debug('context', JSON.stringify(context));
                let internalid = context.key;
                log.debug('internalid',internalid);

                record.submitFields({
                        type: 'customrecord_quote_approver_delegations',
                        id: internalid,
                        values: {
                                'isinactive': 'T',
                        }
                });
        }

        function summarize(context) {
                if (context.inputSummary.error) {
                        log.debug({ title: 'context.inputSummary.error', details: context.inputSummary.error });
                }

                context.mapSummary.errors.iterator().each(function (key, error) {
                        log.error({ title: `Map error: ${key}`, details: error });
                });

                context.reduceSummary.errors.iterator().each(function (key, error) {
                        log.error({ title: `Reduce error: ${key}`, details: error });
                });
        }

        return {
                getInputData,
                map,
                reduce,
                summarize
        };
});