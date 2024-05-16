/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
 define(['N/record', 'N/error', 'N/ui/message', 'N/runtime', 'N/search'], function (record, error, message, runtime, search) {
    function onAction(context) {

        try {
            
            var newRecord = context.newRecord;
            let myReturn = 0;
            var orderStatus = newRecord.getValue('orderstatus');
                var arrayRolesList = getRolesListValues();
                var currentRoleId = runtime.getCurrentUser().role;
                var roleLabel = search.lookupFields({
                    type: search.Type.ROLE,
                    id: currentRoleId,
                    columns: 'name'
                })?.name;
            var hasPermissionToApprove;
            log.debug('ROLE: ', roleLabel)
            if (arrayRolesList) hasPermissionToApprove = arrayRolesList.includes(roleLabel);

            if (hasPermissionToApprove){
                myReturn = 1;
            }
            log.debug('myReturn: ', myReturn)
            return myReturn;
        } catch (e) {
            log.debug('onAction: ', e)
        }

    }

    function getRolesListValues() {
        var arrayRoles = [];
        var rolesList = search.create({
            type: "customlist_sdb_rma_restricted_roles",
            filters:
                [
                ],
            columns:
                [
                    search.createColumn({
                        name: "name",
                        sort: search.Sort.ASC,
                        label: "name"
                    }),
                ]
        });
        rolesList.run().each(function (result) {
            arrayRoles.push(result.getValue("name"));
            return true;
        });

        return arrayRoles;
    }//end getRolesListValues
    return {
        onAction: onAction
    }
});

