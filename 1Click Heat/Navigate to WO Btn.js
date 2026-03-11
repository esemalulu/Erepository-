/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget', 'N/url'], function(ui, url) {

  function beforeLoad(context) {
    if (context.type !== context.UserEventType.VIEW) return;

    const form = context.form;
    const rec = context.newRecord;
    const suiteletUrl = url.resolveScript({
      scriptId: 'customscript_navigate_to_wo_sl',
      deploymentId: 'customdeploy_navigate_to_wo_sl',
      params: { equipServiceId: rec.id }
    });

    form.addButton({
      id: 'custpage_stamp_wo_button',
      label: 'Stamp Navigate to WO Links',
      functionName: `handleButtonClick('${suiteletUrl}')`
    });

    form.clientScriptModulePath = './Navigate to WO CL.js';
  }

  return { beforeLoad };
});
