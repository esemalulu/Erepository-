/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/error', 'N/ui/message', 'N/runtime', 'N/search','N/redirect','N/url'], function (record, error, message, runtime, search,redirect,url) {
    function onAction(context) {

        try {
            var newRecord = context.newRecord;
            log.debug('newRecord.type: ', newRecord.type)
            let baseUrl = url.resolveScript({
                scriptId:  'customscript_sdb_so_reject_reason_su',//customscript_set_reject_reason
                deploymentId:'customdeploy_sdb_so_reject_reason_su' //customdeploy_set_reject_reason
               // returnExternalURL: true
            });
           // var url = nlapiResolveURL('SUITELET', 'customscript_set_reject_reason', 'customdeploy_set_reject_reason');
            //alert('Record ID: '+nlapiGetRecordId());
            baseUrl += '&record_id=' + newRecord.id + '&record_type=' + newRecord.type;
            redirect.redirect({
                url: baseUrl
            });

        } catch (e) {
            log.debug('onAction: ', e)
        }

    }

    return {
        onAction: onAction
    }
});

