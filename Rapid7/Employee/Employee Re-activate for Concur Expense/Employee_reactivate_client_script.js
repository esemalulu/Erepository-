/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/ui/dialog', 'N/url', 'N/currentRecord'], function (dialog, url, currentRecord) {
    function pageInit(scriptContext) {}

    function reactivateEmployee(scriptContext) {

        var options = {
            title: 'Confirmation',
            message: 'This will re-activate this employee for Concur Expense. This employee will be set back to inactive later this night. Press OK to proceed.'
        }

        function success(result) {
            if (result === true) {
                var employeeId = currentRecord.get().id
                var suiteletURL = url.resolveScript({
                    scriptId: 'customscript_r7_reactivate_employee_sl',
                    deploymentId: 'customdeploy_r7_reactivate_employee_sl',
                    params: {
                        employeeId: employeeId
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
        reactivateEmployee: reactivateEmployee
    }
})
