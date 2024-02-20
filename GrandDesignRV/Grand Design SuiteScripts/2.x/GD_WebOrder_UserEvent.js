/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/query', 'N/record', 'N/recordContext', 'N/search'],
    /**
     * @param{log} log
     * @param{query} query
     * @param{record} record
     * @param{recordContext} recordContext
     * @param{search} search
     */
    (log, query, record, recordContext, search) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
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
            try{
                var newRecordid = scriptContext.newRecord.getValue({
                    fieldId: 'id'
                });
                var recordSQLStatement = (`SELECT "id", "type", "shippingaddress" FROM transaction WHERE id = ${newRecordid}`);
                var resultRecordSuiteQL = query.runSuiteQL({
                    query: recordSQLStatement
                });
                var resultRecordSuiteQLMapped = resultRecordSuiteQL.results[0].asMap();
                var sqlStatement = (`SELECT addrphone FROM transactionShippingAddressbookEntityAddress WHERE nkey = ${resultRecordSuiteQLMapped.shippingaddress}`);
                var resultSuiteQL = query.runSuiteQL({
                    query: sqlStatement
                });
                var resultSuiteQLMapped = resultSuiteQL.results[0].asMap();
                var phone = resultSuiteQLMapped.addrphone;
                
                var myRecord = record.load({
                    type: record.Type.ESTIMATE,
                    id: newRecordid,
                });

                myRecord.setValue({
                    fieldId: 'custbodygd_shiptophone',
                    value: phone,
                    ignoreFieldChange: true
                });

                myRecord.save({
                    enableSourcing: false,
                    ignoreManditoryFields: true
                });

            }catch(e){
                log.debug('e', e);
            }
        }

        return {
            beforeLoad,
            //beforeSubmit,
            afterSubmit
        }

    });