/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/file', 'N/log', 'N/record', 'N/runtime', 'N/search'], function (file, log, record, runtime, search) {
    function getInputData(context) {
        return search.create({
            type: 'scriptdeployment',
            filters: [
                // ['internalid', 'anyof', 3746]
            ],
            columns: [
                'internalid',
                { name: 'internalid', sort: search.Sort.ASC }
            ]
        });
    }

    function reduce(context) {
        var csvFileId = runtime.getCurrentScript().getParameter({ name: 'custscript_mdr_spv_csv_file_id' });
        var csvFile = file.load({ id: csvFileId });

        var deployment = record.load({
            type: 'scriptdeployment',
            id: context.key
        });

        const scriptDeploymentId = context.key;
        const fields = deployment.getFields().filter(f => f.startsWith('custscript'));

        fields.forEach(field => {
            let value = deployment.getValue({ fieldId: field });
            value = '"' + value + '"'

            const row = [scriptDeploymentId, field, value];
            
            csvFile.appendLine({
                value: row.join(',')
            });

        });

        csvFile.save();
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