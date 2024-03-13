/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define([
    'N/redirect',
    'N/ui/message'
], function (redirect, message) {
    function beforeLoad(context) {
        const { newRecord, type, UserEventType, form, request } = context;
        const { EDIT } = UserEventType;
        const approvalStatus = newRecord.getValue('custbodyr7quoteorderapprovalstatus');

        if(type === EDIT && approvalStatus == 2) { //2 = pending approval
            redirect.toRecord({
                type: newRecord.type, 
                id: newRecord.id,
                parameters: {
                    'redirect':'T'
                }
            }); 
        }

        if(request && request.parameters && request.parameters.redirect == 'T') {
            form.addPageInitMessage({type: message.Type.INFORMATION, message: 'This journal cannot be edited while in the pending approval status. Please reject and request changes if required.', duration: 30000}); 
        }
    }

    return {
        beforeLoad
    };
});