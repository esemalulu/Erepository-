/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/file', 'N/log'], function(record, file, log) {

    function getFileSizeMB(fileId) {
        if (!fileId) return 0;
        var f = file.load({ id: fileId });
        return parseFloat((f.size / 1024 / 1024).toFixed(2));
    }

    function beforeSubmit(context) {
        try {
            var newRec = context.newRecord;
            if (context.type === context.UserEventType.CREATE ||
                (context.type === context.UserEventType.EDIT &&
                 newRec.getValue('custrecord_cmms_eventimages_image') !==
                 context.oldRecord.getValue('custrecord_cmms_eventimages_image'))) {

                var fileId = newRec.getValue('custrecord_cmms_eventimages_image');
                if (!fileId) return;

                var sizeMB = getFileSizeMB(fileId);

                newRec.setValue({
                    fieldId: 'custrecord_size',
                    value: sizeMB
                });

                log.audit({ title: 'BeforeSubmit: Set file size', details: sizeMB + ' MB' });
            }
        } catch (e) {
            log.error({ title: 'Error in beforeSubmit', details: e });
        }
    }

    function afterSubmit(context) {
        try {
            var newRec = context.newRecord;
            if (context.type === context.UserEventType.CREATE ||
                (context.type === context.UserEventType.EDIT &&
                 newRec.getValue('custrecord_cmms_eventimages_image') !==
                 (context.oldRecord && context.oldRecord.getValue('custrecord_cmms_eventimages_image')))) {

                var fileId = newRec.getValue('custrecord_cmms_eventimages_image');
                if (!fileId) return;

                var sizeMB = getFileSizeMB(fileId);

                record.submitFields({
                    type: 'customrecord_cmms_eventimages',
                    id: newRec.id,
                    values: { custrecord_size: sizeMB }
                });

                log.audit({ title: 'AfterSubmit: Set file size', details: 'Rec ' + newRec.id + ' → ' + sizeMB + ' MB' });
            }
        } catch (e) {
            log.error({ title: 'Error in afterSubmit', details: e });
        }
    }

    return {
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
});
