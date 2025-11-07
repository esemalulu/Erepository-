/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */

define(['N/record'], (record) => {
    const afterSubmit = (scriptContext) => {
        let id = "";
        let type = "";
        try {
            let rec = scriptContext.newRecord;
            id = rec.id;
            type = rec.type;
            const newExtId = rec.getValue({ fieldId: 'custevent_veic_external_id' });
            const currentExtId = rec.getValue({ fieldId: 'externalid' });
            log.debug({
                title: type + " (" + id + ")",
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
            }

        } catch (ex) {
            log.error({
                title: 'Failed to set external Id for ' + type + ' (' + id + ')',
                details: ex.message
            });
        }

    }

    return {
        afterSubmit: afterSubmit
    }
});