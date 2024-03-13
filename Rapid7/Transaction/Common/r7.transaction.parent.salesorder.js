/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/record', 'N/search'], function (log, record, search) {
    function beforeSubmit(context) {
        const { type, newRecord } = context;
        const { CREATE } = context.UserEventType;
        const { CREDIT_MEMO, CASH_REFUND } = record.Type;
        const recordType = newRecord.type;

        log.debug({ title: 'type', details: type });

        if (type !== CREATE || (recordType !== CREDIT_MEMO && recordType !== CASH_REFUND)) {
            return;
        }

        newRecord.setValue({
            fieldId: 'custbody_r7_originating_txn',
            value: null
        });
    }

    function afterSubmit(context) {
        const { type, newRecord } = context;
        const { CREATE, COPY, EDIT } = context.UserEventType;
        const hasOriginatingTransaction = !!newRecord.getValue({ fieldId: 'custbody_r7_originating_txn' });

        if (![ CREATE, COPY, EDIT ].includes(type)) {
            return;
        }

        // If we already have an Originating Transation, no need to re-calculate.  It can't be changed.
        if (hasOriginatingTransaction) {
            log.debug({ title: 'Originating Txn', details: 'Transaction already defined' });
            return;
        }

        const requestedTransactionTypes = ['invoice', 'salesorder'];
        const newOriginatingTransaction = getOriginatingTransaction(newRecord.id, requestedTransactionTypes);
        log.debug({ title: 'newOriginatingTransaction', details: newOriginatingTransaction });

        if (!newOriginatingTransaction) {
            return;
        }

        record.submitFields({
            type: newRecord.type,
            id: newRecord.id,
            values: {
                'custbody_r7_originating_txn': newOriginatingTransaction
            }
        });
    }

    ////////////////////////////////////////////

    function getOriginatingTransaction(transactionId, requestedTypes) {
        log.debug({ title: 'getOriginatingTransaction', details: 'Getting type and parent for transaction id: ' + transactionId });
        // noinspection JSCheckFunctionSignatures
        const results = search.lookupFields({
            type: 'transaction',
            id: transactionId,
            columns: ['recordtype', 'createdfrom']
        });

        const createdFrom = results['createdfrom'];

        const isDesiredTransactionType = requestedTypes.includes(results['recordtype']);
        const hasCreatedFrom = createdFrom && Array.isArray(createdFrom) && createdFrom.length > 0;

        if (isDesiredTransactionType) {
            return transactionId;
        }

        if (hasCreatedFrom) {
            const createdFromTransactionId = createdFrom[0].value;
            return getOriginatingTransaction(createdFromTransactionId, requestedTypes);
        }
   }

    return {
        beforeSubmit,
        afterSubmit
    };
});