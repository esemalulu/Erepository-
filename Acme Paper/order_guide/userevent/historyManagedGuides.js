/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@NModuleScope public
 */

define(
[
  'N/search', 'N/runtime', "N/log",
  "/SuiteScripts/order_guide/order_guide_lib_2.js",
  "N/record",
  '/SuiteBundles/Bundle 429314/q_2_lib.js'
],

function (search, runtime, log, og_lib, record, q_control){

  function afterSubmit(context) {
    try {

      var current_record = context.newRecord
      var current_script = runtime.getCurrentScript()

      if(current_record.type.toLowerCase() !== "invoice"){
        return
      }
      log.error("context.type", JSON.stringify(context.type))
      if(context.type == context.UserEventType.DELETE){
        return
      }
      if(context.type == context.UserEventType.COPY){
        return
      }

      var customer_id = current_record.getValue({fieldId: "entity"})
      var nl_customer = record.load({
        type: "customer",
        id: customer_id
      })
      var use_managed_guide = nl_customer.getValue({
        fieldId: "custentity_create_history_guide"
      })
      if(!use_managed_guide){
        return
      }

      current_record = JSON.parse(JSON.stringify(current_record))
      var q_data = {
        customer_id: customer_id,
        invoice_id: current_record.id
      }

      var script_id = "customscript_og_update_history_guides_q"
      var deployment_id = "customdeploy_og_update_history_guides_q"

      var new_item = q_control.addQueueItem(JSON.stringify(q_data), deployment_id, script_id)

      var task_id = q_control.initiateQueueScript(script_id, deployment_id)
      var task_initiated = task_id ? true : false
      log.error("task init, id", JSON.stringify([task_initiated, task_id]))

      return

    } catch (err) {
        log.error("after submit", err)
    }
  }

  return {
    afterSubmit: afterSubmit
  }
})
