/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/log', 'N/search', '/SuiteScripts/Toolbox/Check_Custom_Permissions_2.0'], function (record, log, search, permissonLib) {
    function beforeLoad(context) {
        if (context.type === context.UserEventType.VIEW && permissonLib.userHasPermission('reactivate_employee')) {
            // "Re-activate for Concur Expense" button appears for AR/AP Analyst role on inactive employee records. https://issues.corp.rapid7.com/browse/APPS-13050
            var employeeInactive = context.newRecord.getValue({
                fieldId: 'isinactive'
            })
            var employeeReleaseDate = context.newRecord.getValue({
                fieldId: 'releasedate'
            })
            if (employeeInactive === true && employeeReleaseDate !== "") {
                context.form.addButton({
                    id: 'custpage_reactivate_employee',
                    label: 'Re-activate for Concur Expense',
                    functionName: 'reactivateEmployee'
                })
                context.form.clientScriptModulePath = 'SuiteScripts/Employee/Employee Re-activate for Concur Expense/Employee_reactivate_client_script.js'
            }
        }
    }

    function afterSubmit(context){
        try {
            var newRecord = context.newRecord;
            var objEmployee = record.load({
                type: newRecord.type,
                id: newRecord.id,
                isDynamic: true
            })
            var jobLevel = objEmployee.getValue({fieldId: 'custentity_r7_job_level'});
            log.debug('jobLevel', jobLevel);

            var discountApprovalPercent = 0;
            if(jobLevel){
                var lookup = search.lookupFields({
                    type: 'customrecord_r7_job_level',
                    id: jobLevel,
                    columns: ['custrecord_r7_discount_approval_percent']
                });
                discountApprovalPercent = lookup.custrecord_r7_discount_approval_percent;
                discountApprovalPercent = discountApprovalPercent.toString().replace('%','');
                log.debug('discountApprovalPercent', discountApprovalPercent);
            }
            objEmployee.setValue({fieldId: 'custentityr7approvaldiscountlimit', value: discountApprovalPercent});

            var employeeId = objEmployee.save({
                enableSourcing: true,
                ignoreMandatoryFields: true,
            });
            log.debug('employeeId',employeeId);

        }catch (e) {
            log.debug({ title: 'error occured on afterSubmit stage: ', details: e });
        }
    }
    return {
        beforeLoad: beforeLoad,
        afterSubmit: afterSubmit
    }
})