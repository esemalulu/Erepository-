/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@NModuleScope public
 */

define(
  ['N/search', 'N/runtime'],
function (search, runtime){

  var FILE_CONSTANT = {
    SAVED_SEARCH: {
      ITEM_PRICE_SEARCH: ''
    },
    CLIENT_SCRIPT: 'SuiteScripts/order_guide/client/order_guide_cs.js'
  }

  //add the Order Guides button to the sales order form and the functionality
  //is defined in serp_cs_orderguide/orderGuidesButton
  function BeforeLoad(context) {
    try {
      var currentRecord = context.newRecord
      var currentScript = runtime.getCurrentScript()

      if (currentRecord.type.toLowerCase() == "salesorder") {

        if (runtime.executionContext === runtime.ContextType.USER_INTERFACE) {

          if (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT || context.type == context.UserEventType.COPY) {
            var form = context.form

            form.clientScriptModulePath = FILE_CONSTANT.CLIENT_SCRIPT

            form.addButton({
              id: 'custpage_orderguidessbutton',
              label: 'Order Guides',
              functionName: 'orderGuidesButton'
            })
          }
        }
      }
    } catch (err) {
        log.error("BeforeLoad", err)
    }
  }

  return {
    beforeLoad: BeforeLoad
  }
})
