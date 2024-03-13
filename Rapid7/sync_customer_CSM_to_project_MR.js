/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */

// https://issues.corp.rapid7.com/browse/APPS-7957
// Onetime map/reduce to update all projects with differing CSM
// on Customer record and the Project record itself to be the same.
define(['N/search', 'N/record', 'N/log'], function(search, record, log) {
    var CSM_FIELD = 'custentityr7accountmanager';
    var DELETED_STATUS = '76'; // project 'Delete' status ID
    function getInputData() {
        // create search of Projects to be processed
        var filters = [
            // filter to exclude DELETE status Projects from results
            search.createFilter({
                name: 'status',
                operator: search.Operator.NONEOF,
                values: DELETED_STATUS
            }),
            // formula filter to only include Projects with differing CSM on Customer record and the Project record itself.
            search.createFilter({
                name: 'formulanumeric',
                operator: search.Operator.EQUALTO,
                values: [1],
                formula:
                    'CASE WHEN {customer.' +
                    CSM_FIELD +
                    '} IS NULL THEN 0 WHEN {customer.' +
                    CSM_FIELD +
                    '} != {' +
                    CSM_FIELD +
                    '} THEN 1 WHEN {' +
                    CSM_FIELD +
                    '} IS NULL THEN 1 ELSE 0 END'
            })
            // search filter of daterange for testing purposes
            // search.createFilter({
            //     name: 'datecreated',
            //     operator: search.Operator.WITHIN,
            //     values: ['10/3/2018 12:00 am', '10/5/2018 11:59 pm']
            // })
        ];

        // the id of CSM to be submitted on the Project
        var columns = search.createColumn({
            name: 'formulatext',
            formula: '{customer.' + CSM_FIELD + '.id}'
        });

        var projectSearch = search.create({ type: search.Type.JOB, filters: filters, columns: columns });
        return projectSearch;
    }

    function map(context) {
        //read the search result data
        var data = JSON.parse(context.value);
        var jobId = data.id;
        var CsmId = data.values.formulatext;

        try {
            // new fileds values for submitting
            var values = {};
            values[CSM_FIELD] = CsmId;
            record.submitFields({
                type: record.Type.JOB,
                id: jobId,
                values: values
            });

            // log.debug({ title: 'jobId & CsmId', details: jobId + ' ' + CsmId });
            // write to context for summarizing
            context.write({
                key: jobId,
                value: CsmId
            });
        } catch (e) {
            // there can be an exeption, when trying to assing inactive CSM from Customer to related Project
            // so check for this case
            var lookup = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: CsmId,
                columns: ['isinactive']
            });
            var csmInactive = lookup.isinactive;
            if (csmInactive) {
                context.write({
                    key: 'skipped inactive CSM',
                    value: CsmId
                });
            } else {
                log.debug({ title: 'unexpected error occured on map stage', details: e });
            }
        }
    }

    function summarize(context) {
        var totalProjectsProcessed = 0;
        var skippedProjects = 0;
        var inactiveCsms = [];
        context.output.iterator().each(function(key, value) {
            totalProjectsProcessed++;
            if (key === 'skipped inactive CSM') {
                skippedProjects++;
                if (inactiveCsms.indexOf(value) === -1) {
                    inactiveCsms.push(value);
                }
            }
            return true;
        });
        var summaryMessage =
            'Usage: ' +
            context.usage +
            ' Concurrency: ' +
            context.concurrency +
            ' Number of yields: ' +
            context.yields +
            ' Total Projects Processed: ' +
            totalProjectsProcessed +
            ' Skipped Projects with inactive customer CSM: ' +
            skippedProjects;

        log.audit({ title: 'Inactive CSMs ids: ', details: inactiveCsms.join(', ') });
        log.audit({ title: 'Summary of usage', details: summaryMessage });
    }
    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
});
