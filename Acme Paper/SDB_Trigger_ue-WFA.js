/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/query', 'N/search', "N/cache", "N/record", "N/format"], function (query, search, cache, record, format) {
    function onAction(context) {

        try {
            var thisRecord = context.newRecord;
            var recid = thisRecord.id;
            var recordType = thisRecord.type;
            log.debug('recid',recid)
            log.debug('recordType',recordType)
            var cmRec = record.load({
                type: recordType,
                id: recid
            })

            log.debug('record saved',cmRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            }))
        } catch (error) {
            log.error('Error at onAction', error)
        }
    }


    return {
        onAction: onAction
    }
});

