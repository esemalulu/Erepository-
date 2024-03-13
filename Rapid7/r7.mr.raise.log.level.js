/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/file', 'N/log', 'N/record', 'N/search'], function (file, log, record, search) {
    function getInputData() {
        // noinspection JSCheckFunctionSignatures
        return search.create({
            type: record.Type.SCRIPT_DEPLOYMENT,
            filters: [
                ['loglevel', 'anyof', 'DEBUG']
            ]
        });
    }

    function reduce(context) {
        const deploymentId = context.key;

        record.submitFields({
            type: record.Type.SCRIPT_DEPLOYMENT,
            id: deploymentId,
            values: {
                'loglevel': 'AUDIT'
            }
        });

        context.write({ key: deploymentId });
    }

    function summarize(context) {
        let updated = 0;

        context.output.iterator().each(() => {
            updated++;
            return true;
        });

        log.audit({ title: 'updated', details: `Updated ${updated} script deployment records` });

        context.reduceSummary.errors.iterator().each((key, error) => {
            log.error({ title: key, details: JSON.parse(error).message });
            return true;
        });
    }

    return {
        getInputData,
        reduce,
        summarize
    };
});