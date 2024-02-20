/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/log', 'N/query', 'N/record'],
    /**
     * @param{log} log
     * @param{query} query
     * @param{record} record
     */
    (log, query, record) => {
        /**
         * Defines the WorkflowAction script trigger point.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
         * @param {string} scriptContext.type - Event type
         * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
         * @since 2016.1
         */
        const onAction = (scriptContext) => {
            try {
                var objRecord = record.load({
                    type: 'customrecordrvsvendorchargeback',
                    id: scriptContext.newRecord.id
                });

                //Set status Text:"Approved/Pending Credit" Value: 4 to FieldId: custrecordvcb_status
                objRecord.setValue({
                    fieldId: 'custrecordvcb_status',
                    value: 4
                });

                var numLines = objRecord.getLineCount({
                    sublistId: 'recmachcustrecordvcbitem_vendorchargeback'
                });
                for(let i = 0; i < numLines; i++ ){
                    var lineNum = objRecord.getSublistValue({
                        sublistId: 'recmachcustrecordvcbitem_vendorchargeback',
                        fieldId: 'custrecordvcbitem_reqamt',
                        line: i
                    });
                    objRecord.setSublistValue({
                        sublistId: 'recmachcustrecordvcbitem_vendorchargeback',
                        fieldId: 'custrecordvcbitem_amount',
                        line: i,
                        value: lineNum
                    });
                }
                objRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                });
            } catch (err) {
                log.error('ERROR', err);
            }
        }

        return {
            onAction
        };
    });