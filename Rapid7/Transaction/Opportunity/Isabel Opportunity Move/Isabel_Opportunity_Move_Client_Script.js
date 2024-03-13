/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/ui/dialog', 'N/url', 'N/currentRecord'], function (dialog, url, currentRecord) {
    function pageInit(scriptContext) {}

    function migrateToIntSub(scriptContext) {

        // made the same as by scheduled script (Isabel Opportunity Move Scheduled)
        var DEFAULT_SALESREP = 190399631 // Customer Operations Support
        var DEFAULT_PRESALESREP = 20791131 // Moon, HyunWook

        var options = {
            title: 'Confirmation',
            message: 'Are you sure? This action will close this Opportunity and migrate it to International Subsidiary. Press OK to proceed.'
        }

        function success(result) {
            if (result === true) {
                var oppId = currentRecord.get().id
                var suiteletURL = url.resolveScript({
                    scriptId: 'customscript_r7_isabel_opp_move_sl',
                    deploymentId: 'customdeploy_r7_isabel_opp_move_sl',
                    params: {
                        oppId: oppId,
                        custscriptr7_default_salesrep: DEFAULT_SALESREP,
                        custscript_r7_default_presalesrep: DEFAULT_PRESALESREP
                    }
                })
                document.body.style.cursor = 'wait'
                window.location.assign(suiteletURL)
            }
        }

        function failure(reason) {
            console.log('Failure: ' + reason)
        }

        dialog.confirm(options).then(success).catch(failure)
    }

    return {
        pageInit: pageInit,
        migrateToIntSub: migrateToIntSub
    }
})
