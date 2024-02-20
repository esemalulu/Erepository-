/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search'],
    /**
 * @param{search} search
 */
    (search) => {
        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            const newRecord = scriptContext.newRecord;
            let lineCount = newRecord.getLineCount({sublistId: 'item'});
            for (let i = 0; i < lineCount; i++) {
                // Check for bill receipts
                const billReceipt = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'billreceipts',
                    line: i
                });
                log.debug('beforeSubmit billReceipt', billReceipt);
            }
            lineCount = newRecord.getLineCount({sublistId: 'purchaseorders'});
            for (let i = 0; i < lineCount; i++) {
                // Check for bill receipts
                const purchaseOrderId = newRecord.getSublistValue({
                    sublistId: 'purchaseorders',
                    fieldId: 'id',
                    line: i
                });
                log.debug('beforeSubmit purchaseOrderId', purchaseOrderId);
            }
        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            const newRecord = scriptContext.newRecord;
            let lineCount = newRecord.getLineCount({sublistId: 'item'});
            for (let i = 0; i < lineCount; i++) {
                // Check for bill receipts
                const billReceipt = newRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'billreceipts',
                    line: i
                });
                log.debug('afterSubmit billReceipt', billReceipt);
            }
            lineCount = newRecord.getLineCount({sublistId: 'purchaseorders'});
            for (let i = 0; i < lineCount; i++) {
                // Check for bill receipts
                const purchaseOrderId = newRecord.getSublistValue({
                    sublistId: 'purchaseorders',
                    fieldId: 'id',
                    line: i
                });
                log.debug('beforeSubmit purchaseOrderId', purchaseOrderId);
            }
        }

        return {beforeSubmit, afterSubmit}

    });
