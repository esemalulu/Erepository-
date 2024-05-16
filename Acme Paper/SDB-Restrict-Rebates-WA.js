/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/log', 'N/runtime', 'N/search'], function (log, runtime, search) {
    function onAction(context) {

        try {
            var currentRoleId = runtime.getCurrentUser().role;
            var rebateID = context.newRecord.id
            log.debug("currentRoleId", currentRoleId)
            log.debug("rebateID", rebateID);
            return hasPermission(rebateID, currentRoleId)
        } catch (e) {
            log.debug('onAction: ', e)
        }

    }

    function hasPermission(rebateID, roleID) {
        try {
            var res = 0;
            var myFilters = [["internalid", "anyof", rebateID], "AND", ["custrecord_rebate_customer_rebate_parent.custrecord_sdb_sales_rep", "anyof", "@CURRENT@"]]
            if (roleID == "1046") {
                myFilters[2].push("@HIERARCHY@")
            }
            var customrecord_rebate_parentSearchObj = search.create({
                type: "customrecord_rebate_parent",
                filters: myFilters,
                columns: []
            });
            customrecord_rebate_parentSearchObj.run().each(function (result) {
                res = 1
                return false;
            });
            log.debug("res", res)
            return res;
        } catch (e) {
            log.error(e, "Error at hasPermission")
        }
    }


    return {
        onAction: onAction
    }
});

