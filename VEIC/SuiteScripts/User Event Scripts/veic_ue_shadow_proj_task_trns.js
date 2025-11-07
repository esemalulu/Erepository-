/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search) => {
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
            if (scriptContext.type !== scriptContext.UserEventType.DELETE) {
                const newRec = scriptContext.newRecord;
                log.debug("Processing record type: " + newRec.type, "Record ID: " + newRec.id);
                // Iterate through the lists on the record and update the shadow project task, if applicable.
                // Since this script is deployed for different types of transactions, it checks all possible types of sublists.
                ['item', 'expense', 'line', 'timeitem'].forEach((listId, index) => {
                    try {
                        const lineCount = newRec.getLineCount({ sublistId: listId });
                        log.debug("list Id: " + listId, "" + lineCount + (lineCount > 0 ? " line(s) found." : " no lines found. Skip list Id: " + listId));
                        for (let lineNum = 0; lineNum < lineCount; lineNum++) {
                            // Initialize projectTaskId to 0 to handle cases where the field is not set.
                            let projectTaskId = 0;
                            try {
                                // Get the project task ID from the current line using the native Project Task field.
                                projectTaskId = newRec.getSublistValue({
                                    sublistId: listId,
                                    fieldId: 'projecttask',
                                    line: lineNum
                                });
                                // If not available, try to get it from the custom field.
                                if (!projectTaskId) {
                                    projectTaskId = newRec.getSublistValue({
                                        sublistId: listId,
                                        fieldId: 'custcol_cp_projecttask',
                                        line: lineNum
                                    });
                                }
                                log.debug("Processing list " + listId + ", line no. " + lineNum, "Project Task ID: " + projectTaskId);

                                if (!projectTaskId) {
                                    log.debug("No Project Task ID found for line " + lineNum + " in list " + listId);
                                    continue; // Skip to the next line if no project task ID is found.
                                }
                                // Lookup the shadow project task ID using the project task ID.
                                var projectTaskFields = search.lookupFields({
                                    type: search.Type.PROJECT_TASK,
                                    id: projectTaskId,
                                    columns: ['custevent_veic_proj_task']
                                });
                                const shadowProjectTask = projectTaskFields["custevent_veic_proj_task"];
                                let shadowProjectTaskId = null; // Initialize shadowProjectTaskId to null.
                                if (shadowProjectTask && shadowProjectTask.length > 0) {
                                    shadowProjectTaskId = shadowProjectTask[0].value;
                                } else {
                                    log.audit("No shadow project task found for Project Task ID: " + projectTaskId);
                                    // Edge case: If no shadow project task is associated with the project task, 
                                    // then we will clear the Shadow Project Task column on the transaction line to be consistent with the project task.
                                }

                                log.debug("Shadow Project Task ID for Project Task ID " + projectTaskId + " on  line " + lineNum, shadowProjectTaskId);

                                log.debug("Setting shadow project task for line " + lineNum, shadowProjectTaskId);
                                newRec.setSublistValue({
                                    sublistId: listId,
                                    fieldId: 'cseg_veic_proj_task',
                                    line: lineNum,
                                    value: shadowProjectTaskId
                                });

                            } catch (e) {
                                log.error("Error processing list " + listId + ", line no. " + lineNum, e.message);
                            }
                        }
                    } catch (e) {
                        log.error("Error processing list " + listId, e.message);
                    }
                });
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

        }

        return {/*beforeLoad,*/ beforeSubmit /*, afterSubmit*/ }

    });
