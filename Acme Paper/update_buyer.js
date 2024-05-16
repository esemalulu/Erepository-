/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/error', 'N/ui/message', 'N/runtime', 'N/search'], function (record, error, message, runtime, search) {
    function beforeLoad(context) {
        try {
          
            var newRecord = context.newRecord;
            var orderStatus = newRecord.getValue('orderstatus');
          
            if (context.type == context.UserEventType.VIEW && orderStatus == 'A') {
               
                var currentRoleId = runtime.getCurrentUser().role;
                var roleLabel = search.lookupFields({
                    type: search.Type.ROLE,
                    id: currentRoleId,
                    columns: 'name'
                })?.name;

                var arrayRolesList = getRolesListValues();

                var hasPermissionToApprove = arrayRolesList.includes(roleLabel);

                if (hasPermissionToApprove) {
                    context.form.addPageInitMessage({ type: message.Type.WARNING, message: 'This sales order has restricted items and needs to be approved manually!', duration: 30000 });
                    return true;
                }

                //Showing pop-up
                context.form.addPageInitMessage({ type: message.Type.WARNING, message: 'You do not own the right role to approve this order!', duration: 30000 });
            }

        }
        catch (e) {
            log.error('ERROR in before Load', e);
        }
    }//End before load
 
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
        beforeLoad: beforeLoad,
    };

});			