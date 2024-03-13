/**
 *  @NAPIVersion 2.1
 *  @NModuleScope Public
 *  @NScriptType ClientScript
 */
define(['N/log'], function () {
    function pageInit(context) {
        let redirectSingleRecord = JSON.parse(window.localStorage.getItem('redirectSingleRecord')) || true;

        context.currentRecord.setValue({
            fieldId: 'auto_redirect',
            value: redirectSingleRecord,
            ignoreFieldChange: true
        });
    }

    function fieldChanged(context) {
        if (context.fieldId === 'auto_redirect') {
            const redirectSingleRecord = context.currentRecord.getValue({
                fieldId: 'auto_redirect'
            }).toString();

            window.localStorage.setItem('redirectSingleRecord', redirectSingleRecord);
        }
    }


    return {
        pageInit,
        fieldChanged
    };
});