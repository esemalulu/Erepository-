/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/runtime', 'N/url'], function (log, record, runtime, url) {
    function beforeSubmit(context) {
        if (!isTargetRecord(context)) {
            return;
        }

        const { newRecord } = context;
        const opportunityStatus = newRecord.getText({ fieldId: 'entitystatus' });
        const isStatusLost = opportunityStatus.toLowerCase().includes('lost');

        const opportunityUrl = url.resolveRecord({
            recordType: record.Type.OPPORTUNITY,
            recordId: newRecord.id,
            isEditMode: true
        });

        if (isStatusLost) {
            throw `<div style="font-size: 1.25em; margin-right: 1em;"><br />You cannot select the status "${opportunityStatus}" here.<br /><br />You must <a href="${opportunityUrl}" target="_blank">edit the opportunity</a> to set this status.<br /></div>`;
        }
    }

    /////////////////////////////////////////////

    function isTargetRecord(context) {
        const { XEDIT } = context.UserEventType;
        const { type, newRecord } = context;

        return type === XEDIT && newRecord.type === record.Type.OPPORTUNITY;
    }

    return {
        beforeSubmit
    };
});