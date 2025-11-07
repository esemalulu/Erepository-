/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/search', 'N/ui/message', 'N/url', 'N/https', 'SuiteScripts/Lib/veic_master_lib.js'],
    /**
     * @param{search} search
     * @param{message} message 
     */
    function (record, runtime, search, message, url, https, lib) {
        var myScript = runtime.getCurrentScript()

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {

        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.line - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            if (scriptContext.sublistId) { // Apply this logic on line items only.
                switch (scriptContext.fieldId) {
                    // Setting the BUB based on the selected Project
                    case 'entity': // Project on JE
                    case 'customer': // Project on VB & Timesheet
                        debugger;
                        var projectId = scriptContext.currentRecord.getCurrentSublistValue({
                            sublistId: scriptContext.sublistId,
                            fieldId: scriptContext.fieldId
                        });
                        if (!lib.isNotEmpty(projectId)) return;
                        log.debug("Project Id", projectId);
                        var projectFields = lib.lookupFields({
                            type: search.Type.JOB,
                            id: projectId,
                            columns: ['custentity_pc_class']
                        });

                        if (projectFields && projectFields.error) {
                            log.error('Error looking up project fields:', projectFields.error);
                            return;
                        }

                        if (projectFields && projectFields.custentity_pc_class && projectFields.custentity_pc_class.length > 0) {
                            let projectBUB = projectFields.custentity_pc_class[0].value;
                            if (!lib.isNotEmpty(projectBUB)) return;
                            log.audit("Setting BUB on line " + scriptContext.line, projectBUB);

                            scriptContext.currentRecord.setCurrentSublistValue({
                                sublistId: scriptContext.sublistId,
                                fieldId: 'class', // BUB
                                value: projectBUB
                            });
                        }

                        break;

                    // Setting RL1 based on the selected Project Task
                    case 'custcol_cp_projecttask': // Project Task on JEs
                    case 'casetaskevent': // Project Task on Timesheets
                    case 'projecttask': // Project Task on Expense Reports
                        //debugger;
                        var projectTaskId = scriptContext.currentRecord.getCurrentSublistValue({
                            sublistId: scriptContext.sublistId,
                            fieldId: scriptContext.fieldId
                        });
                        log.debug("Project Task Id", projectTaskId);
                        console.log("Project Task Id", projectTaskId);

                        if (projectTaskId) {
                            // Get the Restrict RL1 value
                            var projectTaskFields = lib.lookupFields({
                                type: search.Type.PROJECT_TASK,
                                id: projectTaskId,
                                columns: ['custevent_veic_restrict_to_rl1', 'custevent_veic_proj_task']
                            });
                            if (projectTaskFields && projectTaskFields.error) {
                                log.error('Error looking up project task fields:', projectTaskFields.error);
                            }

                            log.debug("Project Task Flags", JSON.stringify(projectTaskFields));
                            console.log("Project Task Flags", JSON.stringify(projectTaskFields));

                            var restrictToRL1 = projectTaskFields['custevent_veic_restrict_to_rl1'];
                            log.audit("restrictToRL1", restrictToRL1);
                            console.log("restrictToRL1", restrictToRL1);
                            var shadowProjectTask = projectTaskFields['custevent_veic_proj_task'];
                            log.audit("shadowProjectTask", shadowProjectTask);
                            console.log("shadowProjectTask", shadowProjectTask);

                            // If the Restrict RL1 field is set, use this value to set RL1
                            if (restrictToRL1 && restrictToRL1.length > 0) {
                                var restrictToRL1Id = restrictToRL1[0].value;
                                var restrictToRL1Text = restrictToRL1[0].text;

                                log.audit("Setting RL1 on line " + scriptContext.line, restrictToRL1Text);
                                console.log("Setting RL1 on line " + scriptContext.line, restrictToRL1Text);
                                scriptContext.currentRecord.setCurrentSublistValue({
                                    sublistId: scriptContext.sublistId,
                                    fieldId: 'cseg_veic_mmprog', // RL1
                                    value: restrictToRL1Id
                                });
                            }

                            if (shadowProjectTask && shadowProjectTask.length > 0) {
                                var shadowProjectTaskId = shadowProjectTask[0].value;
                                log.audit("Setting Shadow Project Task on line " + scriptContext.line, shadowProjectTaskId);
                                console.log("Setting Shadow Project Task on line " + scriptContext.line, shadowProjectTaskId);
                                scriptContext.currentRecord.setCurrentSublistValue({
                                    sublistId: scriptContext.sublistId,
                                    fieldId: 'cseg_veic_proj_task', // Shadow Project Task
                                    value: shadowProjectTaskId
                                });
                            }

                        }
                        break;
                }
            }
        }

        /**
         * Function to be executed when field is slaved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         *
         * @since 2015.2
         */
        function postSourcing(scriptContext) {

        }

        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function sublistChanged(scriptContext) {

        }

        /**
         * Function to be executed after line is selected.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function lineInit(scriptContext) {

        }

        /**
         * Validation function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @returns {boolean} Return true if field is valid
         *
         * @since 2015.2
         */
        function validateField(scriptContext) {

        }

        /**
         * Validation function to be executed when sublist line is committed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateLine(scriptContext) {
            debugger;
            var projectId = 0;
            var restrictToBUBId = 0;
            var restrictToBUBText = "";
            var BUBId = 0;
            var requireRL1 = false;
            var rl1Id = 0;
            var requireRL2 = false;
            var rl2Id = 0;
            var restrictToRL1Id = 0;
            var restrictToRL1Text = "";
            var errorMessages = [];
            var isProject = false;

            try {
                var chargeFromId = scriptContext.currentRecord.getCurrentSublistValue({
                    sublistId: scriptContext.sublistId,
                    fieldId: 'department' // Charge From
                }) || 0;
                log.debug("Charge From Id", chargeFromId);

                var projectId = scriptContext.currentRecord.getCurrentSublistValue({
                    sublistId: scriptContext.sublistId,
                    fieldId: 'entity' // Project on JE
                }) || 0;

                if (!projectId) projectId = scriptContext.currentRecord.getCurrentSublistValue({
                    sublistId: scriptContext.sublistId,
                    fieldId: 'customer' // Project on VB and Timesheets
                }) || 0;


                // Get Restrict to BUB from Project
                if (lib.isNotEmpty(projectId)) {
                    // If we are in Employee Center role, use the Suitelet to get the BUB & check if it's a project
                    var projectFields = lib.lookupFields({
                        type: search.Type.JOB,
                        id: projectId,
                        columns: ['custentity_pc_class', 'customer']
                    });
                    if (projectFields && !projectFields.error) {
                        restrictToBUBId = projectFields.custentity_pc_class ? projectFields.custentity_pc_class[0].value : null;
                        restrictToBUBText = projectFields.custentity_pc_class ? projectFields.custentity_pc_class[0].text : null;
                        console.log('BUB from Suitelet: ' + restrictToBUBId + ' - ' + restrictToBUBText);
                        // If the record has a customer, then it's a project
                        var customerId = projectFields.customer && projectFields.customer.length > 0 ? projectFields.customer[0].value : null;
                        isProject = !(!customerId);
                        console.log('isProject: ' + isProject);
                    } else {
                        log.error('Error looking up project fields:', projectFields.error);
                    }
                }

                var BUBId = scriptContext.currentRecord.getCurrentSublistValue({
                    sublistId: scriptContext.sublistId,
                    fieldId: 'class'
                }) || 0;
                log.debug("BUB Id", BUBId);
                console.log("BUB Id", BUBId);

                if (BUBId) {
                    var BUBFields = lib.lookupFields({
                        type: search.Type.CLASSIFICATION,
                        id: BUBId,
                        columns: ['custrecord_veic_requires_rl1']
                    });
                    if (BUBFields && BUBFields.error) {
                        log.error('Error looking up BUB fields:', BUBFields.error);
                    }

                    log.debug("BUB Flags", JSON.stringify(BUBFields));

                    var requireRL1 = BUBFields['custrecord_veic_requires_rl1'];
                    log.audit("requireRL1", requireRL1);
                }

                var rl1Id = scriptContext.currentRecord.getCurrentSublistValue({
                    sublistId: scriptContext.sublistId,
                    fieldId: 'cseg_veic_mmprog'
                }) || 0;
                log.debug("Reporting Level 1 Id", rl1Id);

                if (rl1Id) {
                    var rl1Fields = lib.lookupFields({
                        type: 'customrecord_cseg_veic_mmprog',
                        id: rl1Id,
                        columns: ['custrecord_veic_requires_rl2']
                    });
                    if (rl1Fields && rl1Fields.error) {
                        log.error('Error looking up RL1 fields:', rl1Fields.error);
                    }

                    log.debug("RL1 Flags", JSON.stringify(rl1Fields));

                    var requireRL2 = rl1Fields['custrecord_veic_requires_rl2'];
                    log.audit("requireRL2", requireRL2);
                }

                var rl2Id = scriptContext.currentRecord.getCurrentSublistValue({
                    sublistId: scriptContext.sublistId,
                    fieldId: 'cseg_veic_eeu_initi'
                }) || 0;
                log.debug("Reporting Level 2 Id", rl2Id);

                var projectTaskId = scriptContext.currentRecord.getCurrentSublistValue({
                    sublistId: scriptContext.sublistId,
                    fieldId: 'custcol_cp_projecttask' // Project Task on JE
                }) || 0;

                if (!projectTaskId) projectTaskId = scriptContext.currentRecord.getCurrentSublistValue({
                    sublistId: scriptContext.sublistId,
                    fieldId: 'casetaskevent' // Project Task on VB and Timesheet
                }) || 0;

                if (!projectTaskId) projectTaskId = scriptContext.currentRecord.getCurrentSublistValue({
                    sublistId: scriptContext.sublistId,
                    fieldId: 'projecttask' // Project Task on Expense Reports
                }) || 0;

                log.debug("Project Task Id", projectTaskId);

                if (projectTaskId) {
                    var projectTaskFields = lib.lookupFields({
                        type: search.Type.PROJECT_TASK,
                        id: projectTaskId,
                        columns: ['custevent_veic_restrict_to_rl1']
                    });
                    if (projectTaskFields && projectTaskFields.error) {
                        log.error('Error looking up project task fields:', projectTaskFields.error);
                    }

                    log.debug("Project Task Flags", JSON.stringify(projectTaskFields));

                    var restrictToRL1 = projectTaskFields['custevent_veic_restrict_to_rl1'];
                    log.audit("restrictToRL1 Id", restrictToRL1);
                    if (restrictToRL1 && restrictToRL1.length > 0) {
                        restrictToRL1Id = restrictToRL1[0].value;
                        restrictToRL1Text = restrictToRL1[0].text;
                    }
                }
                log.debug("scriptContext.currentRecord.type", scriptContext.currentRecord.type);

                // Validation logic
                if (projectId && !isProject) {
                    errorMessages.push("Please select a project, not a client!")
                }
                if (scriptContext.currentRecord.type != 'vendorbill' && !chargeFromId) {
                    errorMessages.push("Charge From field cannot be empty.");
                }
                if (projectId && restrictToBUBId != BUBId) {
                    errorMessages.push("Business Unit: Budget field can only be '" + restrictToBUBText + "'.")
                }
                if (requireRL1 && !rl1Id) {
                    errorMessages.push("Reporting Level 1 field cannot be empty.");
                }
                if (restrictToRL1Id && restrictToRL1Id != rl1Id) {
                    errorMessages.push("Reporting Level 1 field can only be '" + restrictToRL1Text + "'.")
                }
                if (requireRL2 && !rl2Id) {
                    errorMessages.push("Reporting Level 2 field cannot be empty.");
                }

                if (errorMessages && errorMessages.length > 0) {
                    var errorMessage = "ERRORS!\n\nPlease fix the following errors:\n* ";
                    errorMessage += errorMessages.join("\n* ");
                    alert(errorMessage);
                    return false;
                }

            } catch (ex) {
                log.debug("Error", ex.message);
            }

            return true; // Valid line by default.
        }

        /**
         * Validation function to be executed when sublist line is inserted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateInsert(scriptContext) {

        }

        /**
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(scriptContext) {

        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {

        }

        return {
            //    pageInit: pageInit,
            fieldChanged: fieldChanged,
            //    postSourcing: postSourcing,
            //    sublistChanged: sublistChanged,
            //    lineInit: lineInit,
            //    validateField: validateField,
            validateLine: validateLine,
            //    validateInsert: validateInsert,
            //    validateDelete: validateDelete,
            //    saveRecord: saveRecord
        };

    });
