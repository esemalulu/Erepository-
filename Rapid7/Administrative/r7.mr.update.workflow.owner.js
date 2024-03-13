/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/search'], function (log, record, search) {
    function getInputData(context) {
        const JOHN_COITEUX = 547036;

        return search.create({
            type: 'workflow',
            filters: [
                ['owner', 'is', JOHN_COITEUX]
            ],
            columns: [
                'internalid'
            ]
        });
    }

    function reduce(context) {
        const NETSUITE_ADMIN = 106223954;
        const data = JSON.parse(context.values[0]);

        var script = record.load({
            type: 'workflow',
            id: data.id
        });
        script.setValue({ fieldId: 'owner', value: NETSUITE_ADMIN })
        script.save();
    }

    function summarize(context) {
        context.reduceSummary.errors.iterator().each(function (key, error) {
            log.error({ title: 'reduce error', details: {key, error} });
        });
    }

    return {
        getInputData,
        reduce,
        summarize
    };
});