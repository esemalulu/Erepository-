/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 define([], function () {
    function beforeLoad (context) {

        var form = context.form;
        var project = context.newRecord.getValue({fieldId:"job"})
        form.addButton({
            id : 'custpage_buttonid',
            label : 'Update Charges',
            functionName : 'clientButton('+project+')'
        });



        form.clientScriptFileId = 18551;
    }




    return {
        beforeLoad: beforeLoad
    }
});
