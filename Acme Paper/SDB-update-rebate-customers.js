/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['N/log', 'N/record', 'N/runtime', 'N/search'],
    (log, record, runtime, search) => {
        function execute (context){
            try {
                var scriptObj = runtime.getCurrentScript();	
                var customerId = scriptObj.getParameter("custscript_sdb_customer_id");
                var salesMembers = scriptObj.getParameter("custscript_sdb_sales_member");

                if(!customerId || !salesMembers) return;
                log.audit("customerId",customerId);
                var customerSalesMembers = JSON.parse(salesMembers);
                log.audit("customerSalesMembers",customerSalesMembers);
                var customrecord_rebate_customerSearchObj = search.create({
                    type: "customrecord_rebate_customer",
                    filters:
                    [
                        ["custrecord_rebate_customer_customer.internalid","anyof",customerId]
                    ],
                    columns:
                    [
                        search.createColumn({name: "internalid", label: "Internal ID"})
                    ]
                });
                customrecord_rebate_customerSearchObj.run().each(function(result){
                    var rebateId = result.getValue({name:'internalid'})
                    log.debug("rebateid",rebateId)
                    try {
                        record.submitFields({
                            type: 'customrecord_rebate_customer',
                            id: rebateId,
                            values: {'custrecord_sdb_sales_rep':customerSalesMembers},
                        })
                    } catch (error) {
                        log.error("Error updating Rebate Customer " + rebateId , error);
                    }
                    return true;
                });

            } catch (error) {
                log.error("execute error",error)
            }
        }
        return {
            execute:execute
        }

    });
