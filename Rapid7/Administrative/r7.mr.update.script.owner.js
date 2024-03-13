/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/search'], function (log, record, search) {
    function getInputData(context) {
        const JOHN_COITEUX = 547036;

        return search.create({
            type: 'script',
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

        const scriptTypeMap = {
            "scriptlet": record.Type.SUITELET,
            "scheduled": record.Type.SCHEDULED_SCRIPT,
            "userevent": record.Type.USEREVENT_SCRIPT,
            "mapreduce": record.Type.MAP_REDUCE_SCRIPT,
            "client": record.Type.CLIENT_SCRIPT,
            "action": record.Type.WORKFLOW_ACTION_SCRIPT,
            "restlet": record.Type.RESTLET,
            "massupdate": record.Type.MASSUPDATE_SCRIPT,
            "portlet": record.Type.PORTLET,
            "bundleinstallation": record.Type.BUNDLE_INSTALLATION_SCRIPT

        }

        log.debug({ title: 'scriptType', details: data.recordType });

        var script = record.load({
            type: scriptTypeMap[data.recordType] || data.recordType,
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