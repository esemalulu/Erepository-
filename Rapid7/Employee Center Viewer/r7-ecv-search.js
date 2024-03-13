/**
 *  @NAPIVersion 2.1
 *  @NModuleScope Public
 *  @NScriptType Suitelet
 */
define([
    'N/log',
    'N/redirect',
    'N/search',
    'N/ui/serverWidget',
    'N/url',
    './r7-ecv-data'
], function (log, redirect, search, ui, url, data) {
    function onRequest(context) {
        const form = buildForm();

        if (context.request.method === 'POST') {
            const { keywords, auto_redirect } = context.request.parameters;
            const results = data.getGlobalSearchResults(keywords);

            if (results.length === 1 && auto_redirect === 'T') {
                redirectToSingleResult(results[0]);
            }

            buildSearchResults(form, results);
        }

        context.response.writePage(form);
    }

    //////////////////////////////////////////////////////////////////////////

    function buildForm() {
        const form = ui.createForm({ title: 'Global Search' });
        form.addSubmitButton({ label: 'Search' });
        // form.clientScriptModulePath = './r7-ecv-search-client.js';

        form.addField({
            id: 'keywords',
            label: 'Search',
            type: ui.FieldType.TEXT,
        });

        form.addField({
            id: 'auto_redirect',
            label: 'Show Single Results as List',
            type: ui.FieldType.CHECKBOX
        });

        form.addField({
            id: 'custpage_start_col',
            label: 'Force New Column',
            type: ui.FieldType.INLINEHTML
        }).updateBreakType({ breakType: ui.FieldBreakType.STARTCOL });

        return form;
    }

    function redirectToSingleResult(result) {
        log.debug({ title: 'result', details: result });

        redirect.toRecord({
            id: result.recordId,
            type: result.recordType
        });
    }

    function buildSearchResults(form, results) {
        const sublist = form.addSublist({
            id: 'custpage_sublist',
            label: 'Search Results',
            type: ui.SublistType.LIST
        });

        const columns = [
            { id: 'name', label: 'Name', type: ui.FieldType.TEXT },
            { id: 'type', label: 'Type', type: ui.FieldType.TEXT },
            { id: 'info1', label: 'Info 1', type: ui.FieldType.TEXT },
            { id: 'info2', label: 'Info 2', type: ui.FieldType.TEXT },
        ]

        columns.forEach(column => {
            sublist.addField(column)
        });

        results.forEach(addSublistRow(sublist));
    }

    function addSublistRow(sublist) {
        return function(result, index) {
            const recordUrl = getRecordViewerUrl(result);

            const link = `<a href="${recordUrl}">${result.name}</a>`;

            sublist.setSublistValue({
                id: 'name',
                value: link,
                line: index
            });

            sublist.setSublistValue({
                id: 'type',
                value: result.type,
                line: index
            });

            sublist.setSublistValue({
                id: 'info1',
                value: result.info2 || ' ',
                line: index
            });

            sublist.setSublistValue({
                id: 'info2',
                value: result.info2 || ' ',
                line: index
            });
        }
    }

    function getRecordViewerUrl({ recordType, recordId }) {
        let scriptInfo;

        if (recordType.includes('customrecord')) {
            return url.resolveRecord({ recordType, recordId });
        }

        if (recordType === 'customer') {
            scriptInfo = {
                scriptId: 'customscript_r7_ecv_customer',
                deploymentId: 'customdeploy_r7_ecv_customer'
            };
        } else {
            scriptInfo = {
                scriptId: 'customscript_r7_ecv_transaction',
                deploymentId: 'customdeploy_r7_ecv_transaction'
            };
        }

        return url.resolveScript({
            ...scriptInfo,
            params: { recordType, recordId }
        });
    }

    return {
        onRequest: onRequest
    };
});