/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */

define(['N/record'], (record) => {
    const afterSubmit = (scriptContext) => {
        if(scriptContext.type !== scriptContext.UserEventType.EDIT &&
           scriptContext.type !== scriptContext.UserEventType.CREATE) {
            return;
        }
        // We only want to set the external id on create or edit events.
        // If the event is not one of these, we exit early.
        let id = "";
        let type = "";
        try {
            let rec = scriptContext.newRecord;
            id = rec.id;
            type = rec.type;
            const newExtId = rec.getValue({ fieldId: 'custentity_adp_fieldid' });
            const currentExtId = rec.getValue({ fieldId: 'externalid' });
            log.debug({
                title: "Processing " + type + " (" + id + ")",
                details: "Current External Id = " + currentExtId + ", new External Id = " + newExtId
            });
            
            // If the external id needs to be updated, we update it.
            if (newExtId != currentExtId) {
                record.submitFields({
                    id: id,
                    type: type,
                    values: {
                        'externalid': newExtId
                    }
                });
                log.audit({
                    title: "Successfully updated " + type + " (" + id + ")",
                    details: "Old External Id = " + currentExtId + ", New External Id = " + newExtId
                });
            }

        } catch (ex) {
            log.error({
                title: 'Failed to set external Id for ' + type + ' (' + id + ')',
                details: ex.message
            });
        }

    }

    const beforeSubmit = (scriptContext) => {
        if(scriptContext.type !== scriptContext.UserEventType.EDIT &&
           scriptContext.type !== scriptContext.UserEventType.CREATE) {
            return;
        }
        // We only want to set the external id on create or edit events.
        // If the event is not one of these, we exit early.
        let id = "";
        let type = "";
        try {
            let rec = scriptContext.newRecord;
            id = rec.id;
            type = rec.type;
            const newExtId = rec.getValue({ fieldId: 'custentity_adp_fieldid' });
            const currentExtId = rec.getValue({ fieldId: 'externalid' });
            
            // If the external id needs to be updated, we update it.
            if (newExtId != currentExtId) {
                rec.setValue({ fieldId: 'externalid', value: newExtId });
                log.audit({
                    title: "Successfully updated " + type + " (" + id + ")",
                    details: "Old External Id = " + currentExtId + ", New External Id = " + newExtId
                });
            }

        } catch (ex) {
            log.error({
                title: 'Failed to set external Id for ' + type + ' (' + id + ')',
                details: ex.message
            });
        }

    }

    return {
        afterSubmit: afterSubmit,
        /* beforeSubmit: beforeSubmit */
    }
});