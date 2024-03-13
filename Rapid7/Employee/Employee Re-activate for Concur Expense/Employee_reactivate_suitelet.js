/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define([
    "N/ui/serverWidget",
    "N/redirect",
    "N/record",
    "N/search",
    "N/error",
], function (serverWidget, redirect, record, search, error) {
    function onRequest(context) {
        if (context.request.method === "GET") {
            try {
                log.debug('employeeId', context.request.parameters.employeeId)
                // Reactivaded for Concur Expense Employee must have no roles assigned to him. 
                // Search needed, since roles are sublist values
                var employeeSearchObj = search.create({
                    type: record.Type.EMPLOYEE,
                    filters: [
                        [
                            "internalid",
                            "anyof",
                            context.request.parameters.employeeId,
                        ],
                    ],
                    columns: [search.createColumn({ name: "role" })],
                });
                employeeSearchObj.run().each(function (result) {
                    log.debug('result role', result.getValue({ name: "role" }))
                    if (result.getValue({ name: "role" }) !== "") {
                        throw error.create({
                            name: "EMPLOYEE_HAS_ROLE",
                            message:
                                "Reactivaded for Concur Expense Employee must have no roles assigned to him.",
                        });
                    }
                    return true;
                });

                record.submitFields({
                    type: record.Type.EMPLOYEE,
                    id: context.request.parameters.employeeId,
                    values: {
                        isinactive: "F",
                        releasedate: "",
                    },
                });

                redirect.toRecord({
                    type: record.Type.EMPLOYEE,
                    id: context.request.parameters.employeeId,
                });
            } catch (err) {
                if (err.name === "EMPLOYEE_HAS_ROLE") {
                    throw err;
                } else {
                    log.error({
                        title: "error",
                        details: JSON.stringify(err),
                    });
                }
            }
        }
    }

    return {
        onRequest: onRequest,
    };
});