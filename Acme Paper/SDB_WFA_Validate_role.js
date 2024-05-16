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
            var customer = newRecord.getValue('entity');

            if (context.type == 'view' && orderStatus == 'A') {
                var arrayRolesList = getRolesListValues();
                var currentRoleId = runtime.getCurrentUser().role;
                var roleLabel = search.lookupFields({
                    type: search.Type.ROLE,
                    id: currentRoleId,
                    columns: 'name'
                })?.name;
            }
            var hasPermissionToApprove;

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
            type: "customlist_sdb_approval_roles_so_restr",
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

