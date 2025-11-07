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
            try {
                var recordId = scriptContext.newRecord.id;
                log.debug('recordId:' + recordId, "Type: " + scriptContext.type);
                var currentShadowProjectTaskId = null;

                switch (scriptContext.type) {
                    case scriptContext.UserEventType.CREATE:
                        // Create a new shadow project task
                        currentShadowProjectTaskId = createShadowProjectTask(recordId);
                        log.audit('Created Shadow Project Task for project task ' + recordId, currentShadowProjectTaskId);
                        break

                    case scriptContext.UserEventType.EDIT:
                    case scriptContext.UserEventType.XEDIT:
                        currentShadowProjectTaskId = scriptContext.newRecord.getValue({ fieldId: 'custevent_veic_proj_task' });
                        log.debug('currentShadowProjectTaskId for project task ' + recordId, currentShadowProjectTaskId);
                        // Check if no shadow project task is created yet
                        // If no shadow project task is created yet, create one
                        if (!currentShadowProjectTaskId) {
                            currentShadowProjectTaskId = createShadowProjectTask(recordId);
                            log.audit('Created Shadow Project Task for project task ' + recordId, currentShadowProjectTaskId);
                        }

                        var values = {};
                        // Update the shadow project task title
                        var shadowProjectTaskTitle = scriptContext.newRecord.getValue({ fieldId: 'title' }) + ' {' + recordId + '}';
                        values['name'] = shadowProjectTaskTitle;

                        // Update the shadow project task parent
                        var parentProjectTaskId = scriptContext.newRecord.getValue({ fieldId: 'parent' });
                        log.debug('parent for project task ' + recordId, parentProjectTaskId);
                        var shadowParentProjectTaskId = parentProjectTaskId ? getLinkedRecordId('projecttask', parentProjectTaskId, 'custevent_veic_proj_task') : null;
                        log.debug('shadow parent for shadow project task ID ' + currentShadowProjectTaskId, shadowParentProjectTaskId);
                        var parentShadowProjectTaskId = currentShadowProjectTaskId ? getLinkedRecordId('customrecord_cseg_veic_proj_task', currentShadowProjectTaskId, 'parent') : null;
                        log.debug('current parent for shadow project task ID ' + currentShadowProjectTaskId, parentShadowProjectTaskId);

                        // Update parent only if it has changed
                        if (shadowParentProjectTaskId != parentShadowProjectTaskId) {
                            values['parent'] = shadowParentProjectTaskId;
                        }

                        if (currentShadowProjectTaskId && values.length != 0) {
                            // Update the shadow project task
                            record.submitFields({
                                type: 'customrecord_cseg_veic_proj_task',
                                id: currentShadowProjectTaskId,
                                values: values
                            });
                            log.audit({
                                title: 'Updated Shadow project task ID ' + currentShadowProjectTaskId,
                                details: values
                            });
                        }
                        break;

                    case scriptContext.UserEventType.DELETE:
                        var oldShadowProjectTaskId = scriptContext.oldRecord.getValue({ fieldId: 'custevent_veic_proj_task' });
                        var shadowProjectTaskTitle = 'DNU - ' + scriptContext.oldRecord.getValue({ fieldId: 'title' }) + ' {' + recordId + '}';
                        log.debug('oldShadowProjectTaskId for project task ' + recordId, oldShadowProjectTaskId);
                        if (oldShadowProjectTaskId && shadowProjectTaskTitle) {
                            // Deactivate the shadow project task
                            record.submitFields({
                                type: 'customrecord_cseg_veic_proj_task',
                                id: oldShadowProjectTaskId,
                                values: {
                                    isinactive: true,
                                    name: shadowProjectTaskTitle
                                }
                            });
                            log.audit({
                                title: 'Shadow Project Task Deactivated',
                                details: 'Shadow project task with ID ' + oldShadowProjectTaskId + ' has been deactivated.'
                            });
                        }
                        break;

                    default:
                        log.debug('User Event Type', scriptContext.type + ' - No action taken.');
                }
            } catch (error) {
                log.error({
                    title: 'Error in User Event Script',
                    details: error.message
                });
            }

        }

        // Create a shadow project task when a project task is created
        // Recursively create shadow project tasks for all parent project tasks
        const createShadowProjectTask = (projectTaskId) => {
            let parentProjectTaskId = null;
            let shadowProjectTaskId = null;
            let parentShadowProjectTaskId = null;

            const projectTaskFields = search.lookupFields({
                type: 'projecttask',
                id: projectTaskId,
                columns: ['title', 'parent', 'custevent_veic_proj_task']
            });
            log.debug('projectTaskFields', projectTaskFields);
            if (!projectTaskFields || projectTaskFields.length === 0) {
                log.error('Project Task Not Found', 'Project task with ID ' + projectTaskId + ' not found.');
                return null;
            }

            const projectTaskFullTitle = projectTaskFields.title;
            // get the last part after the last colons
            const projectTaskFullTitleParts = projectTaskFullTitle.split(' : ');
            const projectTaskTitle = projectTaskFullTitleParts[projectTaskFullTitleParts.length - 1].trim() + ' {' + projectTaskId + '}';
            log.debug('projectTaskTitle', projectTaskTitle);
            if (projectTaskFields['parent'].length > 0) parentProjectTaskId = projectTaskFields['parent'][0]['value'];
            if (projectTaskFields['custevent_veic_proj_task'].length > 0) shadowProjectTaskId = projectTaskFields['custevent_veic_proj_task'][0]['value'];
            log.debug('parentProjectTaskId for ' + projectTaskTitle, parentProjectTaskId);
            log.debug('shadowProjectTaskId for ' + projectTaskTitle, shadowProjectTaskId);

            if (shadowProjectTaskId) {
                // Shadow project task already exists, no need to create a new one
                log.debug('Shadow Project Task Already Exists', 'Shadow project task with ID ' + shadowProjectTaskId + ' already exists for project task ' + projectTaskTitle);
                return shadowProjectTaskId;
            }

            if (parentProjectTaskId) {
                // Recursively create shadow project tasks for parent project tasks
                parentShadowProjectTaskId = createShadowProjectTask(parentProjectTaskId);
            }


            // Create a new shadow project task
            var newShadowProjectTask = record.create({
                type: 'customrecord_cseg_veic_proj_task',
                isDynamic: true
            });
            newShadowProjectTask.setValue({
                fieldId: 'name',
                value: projectTaskTitle
            });
            if (parentShadowProjectTaskId) newShadowProjectTask.setValue({
                fieldId: 'parent',
                value: parentShadowProjectTaskId
            });

            const newShadowProjectTaskId = newShadowProjectTask.save();

            // Update the project task with the new shadow project task ID
            record.submitFields({
                type: 'projecttask',
                id: projectTaskId,
                values: {
                    custevent_veic_proj_task: newShadowProjectTaskId
                }
            });

            log.debug('Shadow Project Task Created', 'Shadow project task with ID ' + newShadowProjectTaskId + ' has been created for project task ' + projectTaskTitle);
            return newShadowProjectTaskId;
        }

        // Return the internal id of a related record linked via a field
        const getLinkedRecordId = (recordType, recordId, fieldId) => {
            const recordFields = search.lookupFields({
                type: recordType,
                id: recordId,
                columns: [fieldId]
            });
            if (recordFields[fieldId].length > 0) {
                return recordFields[fieldId][0]['value'];
            } else {
                return null;
            }
        }

        return {/*beforeLoad, beforeSubmit,*/ afterSubmit }

    });
