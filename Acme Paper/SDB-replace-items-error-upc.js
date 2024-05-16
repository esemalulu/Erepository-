/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(["N/log", "N/search", "N/record", "N/https", "N/task", "N/runtime"], function (log, search, record, https, task, runtime) {

    function beforeLoad(context) {
        try {
            var user = runtime.getCurrentUser()
          var thisRecord = context.newRecord;
          var enteredBy=thisRecord.getValue('custbody_aps_entered_by')
           
            if (user.id == 75190 && runtime.executionContext == "WEBSERVICES")return; 
                //-----------------------------  HIDE BTN SAVE ONLY FOR CUSTOMER ------------------------------------
                // Hide btn save for sales order only if customer selected in order has checkbox in false
                if (context.type === context.UserEventType.EDIT) blockSaleOrderGoodStanding(context);
                if (context.type === context.UserEventType.CREATE) return;
        }
        catch (e) {
            log.error('error at beforeLoad', e)
        }
    }

    // FUNCTIONALITY
    function afterSubmit(context) {
        try {
            if (context.type === context.UserEventType.DELETE) return;
            var user = runtime.getCurrentUser()
          log.audit("runtime.executionContext: ", runtime.executionContext);
            if (user.id == 75190 && runtime.executionContext == "WEBSERVICES")return; 
            if (runtime.executionContext == "MAPREDUCE")return; 
                const salesRecord = context.newRecord;
                //Check if entered by field is only sps webservices
                var enteredById = salesRecord.getValue("custbody_aps_entered_by");
                //salesRecord.getValue({ fieldId: 'custbody_sdb_original_sales_order' })
                if (enteredById && (String(enteredById) == "84216" || String(enteredById) == '66155')) {
                    if (salesRecord.getValue("custbody_sdb_order_sps_replaced")) return;
                    // Create new to replace order
                     log.debug('afterSubmit userId2', user.id)
                     log.audit("runtime.executionContext afterSubmit: ", runtime.executionContext)
                    var myRec = record.create({type: "customrecord_sdb_sps_orders_to_replace"});
                    myRec.setValue({fieldId: "custrecord_sdb_transaction_id_replace", value: salesRecord.id});
                    var myId = myRec.save();
                   var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_sdb_replace_items_error_mr',
                    deploymentId: null,
                    params: {
                        custscript_order_id: salesRecord.id,
                    },
                });
                var taskId = mrTask.submit();
                  log.audit("taskId: ", taskId);
                }//If user is sps webservices
            
        }
        catch (error) {
            log.error("error", error);
        }
    }
    function beforeSubmit(context) {
        deleteLockRecord(context);
    }
    return {
        beforeLoad,
        afterSubmit
    }
    // ------------------------- AUXLIAR FUNCTIONS ------------------------------------------
    function deleteLockRecord(context) {
        try {
            if (context.newRecord.type != 'salesorder') return;
            https.get({ url: `https://5774630.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=customscript_sdb_del_lock_custom_record&deploy=customdeploy_sdb_del_lock_custom_record&compid=5774630&h=706670a560b2a1404e0c&salesOrderId=${context.newRecord.id}` });
            log.debug("Delete lock record for order has been triggered");
        } catch (error) {
            log.error("Error deleting record", error);
        }
    }
    function blockSaleOrderGoodStanding(context) {
        var salesRecord = context.newRecord;
        if (!salesRecord) return;

        var customerId = salesRecord.getValue("entity");

        var customerName = salesRecord.getText("entity");
        if (!customerId) return;

        var inGoodStanding = search.lookupFields({
            type: search.Type.CUSTOMER,
            id: customerId,
            columns: "custentity_credit_codech"
        })?.custentity_credit_codech;

        if (inGoodStanding) return;

        var script_field = context.form.addField({ id: 'custpage_hide_save_btn', type: 'INLINEHTML', label: 'Hide save btn' });
        var script =
            `<script>
                          setTimeout(() => {
                              debugger;
                              document.querySelector("#spn_multibutton_submitter").parentElement.parentElement.parentElement.style.display = "none";
                              document.querySelector("#spn_secondarymultibutton_submitter").parentElement.parentElement.parentElement.style.display = "none"; 
                              alert("Customer: ${customerName} dont have permission to save order because it is not in good standing!")
                          }, 3000);
                          </script>`;
        script_field.defaultValue = script;
    }//End blockSaleOrderGoodStanding

    function createNewReplaceOrderRecord(recordId) {
        try {
            const newRecord = record.create({
                type: 'customrecord_sdb_sps_orders_to_replace',
            });

            // Set order Id
            newRecord.setValue({ fieldId: 'custrecord_sdb_transaction_id_replace', value: recordId });

            newRecord.save({ ignoreMandatoryFields: true });

            log.debug("Order Saved", "Order has been saved correctly for replacement");

        }
        catch (error) {
            log.error("Error creating new custom record for orders to replace", error);
        }
    }

    function alreadyStoredForReplacement(recordId) {
        var customrecord_sdb_sps_orders_to_replaceSearchObj = search.create({
            type: "customrecord_sdb_sps_orders_to_replace",
            filters:
                [
                    ["custrecord_sdb_transaction_id_replace", "startswith", recordId]
                ],
            columns:
                [
                    search.createColumn({ name: "internalid", label: "Internal ID" })
                ]
        });
        var searchResultCount = customrecord_sdb_sps_orders_to_replaceSearchObj.runPaged().count;

        if (searchResultCount < 1) return false;

        return true;
    }

});
