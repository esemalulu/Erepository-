/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @Description This script will work on Transfer order
 * @author Kapil
 */

define(['N/record', 'N/url', 'N/ui/serverWidget', 'N/runtime'],
  function(record, url, form, runtime) {
    function beforeLoad(context) {
      try {
        var form = context.form;
        var id = context.newRecord.id;
        var suiteletURL = url.resolveScript({
          scriptId: 'customscript_acc_sl_print_long_checks', //Please make sure to replace this with the script ID of your Suitelet
          deploymentId: 'customdeploy1', //Please make sure to replace this with the deployment ID of your Suitelet
          params: { 'id': id }
        });
				
        if (context.type == 'view')
          form.addButton({ id: 'custpage_print_check', label: 'Print Check', functionName: "window.open('" + suiteletURL + "','_blank');" });

      } catch (err) {
        log.debug({ title: 'Error', details: err });
      }

    }

    return {
      beforeLoad: beforeLoad
    };

  });
  
  
