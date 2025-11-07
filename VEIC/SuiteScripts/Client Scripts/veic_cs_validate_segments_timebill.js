/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search'],
    /**
     * @param{search} search
     */
    function (search) {

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
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            if (scriptContext.fieldId === 'customer') {
                try {
                    // This is the code to set the class field on the time bill record
                    var projectId = scriptContext.currentRecord.getValue('customer');
                    log.debug('projectId', projectId);
                    if (projectId) {
                        var projectFields = search.lookupFields({
                            type: search.Type.JOB,
                            id: projectId,
                            columns: ['custentity_pc_class']
                        });
                        log.debug('projectFields', projectFields);
                        if (projectFields.custentity_pc_class && projectFields.custentity_pc_class.length > 0) {
                            var classId = projectFields.custentity_pc_class[0].value;
                            log.debug('classId', classId);
                            scriptContext.currentRecord.setValue({
                                fieldId: 'class',
                                value: classId
                            });
                        }
                    }
                } catch (ex) {
                    log.error('Error in fieldChanged. Record Id ' + scriptContext.currentRecord.id, ex);
                }
            }
            return true;
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
            debugger;
            var projectId = 0;
            var projectTaskId = 0;
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

            try {
                var chargeFromId = scriptContext.currentRecord.getValue({
                    fieldId: 'department' // Charge From
                }) || 0;
                log.debug("Charge From Id", chargeFromId);

                if (!projectId) projectId = scriptContext.currentRecord.getValue({
                    fieldId: 'customer' // Project
                }) || 0;

                log.debug("Project Id", projectId);

                if (projectId) {
                    var projectFields = search.lookupFields({
                        id: projectId,
                        type: search.Type.JOB,
                        columns: ['custentity_pc_class']
                    });

                    log.debug("Project Flags", JSON.stringify(projectFields));

                    var restrictToBUB = projectFields['custentity_pc_class'];
                    log.audit("restrictToBUB Id", restrictToBUB);
                    if (restrictToBUB && restrictToBUB.length > 0) {
                        restrictToBUBId = restrictToBUB[0].value;
                        restrictToBUBText = restrictToBUB[0].text;
                    }
                }

                var BUBId = scriptContext.currentRecord.getValue({
                    fieldId: 'class'
                }) || 0;
                log.debug("BUB Id", BUBId);

                if (BUBId) {
                    var BUBFields = search.lookupFields({
                        id: BUBId,
                        type: search.Type.CLASSIFICATION,
                        columns: ['custrecord_veic_requires_rl1']
                    });

                    log.debug("BUB Flags", JSON.stringify(BUBFields));

                    var requireRL1 = BUBFields['custrecord_veic_requires_rl1'];
                    log.audit("requireRL1", requireRL1);
                }

                var rl1Id = scriptContext.currentRecord.getValue({
                    fieldId: 'cseg_veic_mmprog' // RL1
                }) || 0;
                log.debug("Reporting Level 1 Id", rl1Id);

                if (rl1Id) {
                    var rl1Fields = search.lookupFields({
                        id: rl1Id,
                        type: 'customrecord_cseg_veic_mmprog',
                        columns: ['custrecord_veic_requires_rl2']
                    });

                    log.debug("RL1 Flags", JSON.stringify(rl1Fields));

                    var requireRL2 = rl1Fields['custrecord_veic_requires_rl2'];
                    log.audit("requireRL2", requireRL2);
                }

                var rl2Id = scriptContext.currentRecord.getValue({
                    fieldId: 'cseg_veic_eeu_initi'
                }) || 0;
                log.debug("Reporting Level 2 Id", rl2Id);

                if (!projectTaskId) projectTaskId = scriptContext.currentRecord.getValue({
                    fieldId: 'casetaskevent' // Project Task
                }) || 0;

                if (!projectTaskId) projectTaskId = scriptContext.currentRecord.getValue({
                    fieldId: 'projecttask' // Project Task on Expense Reports
                }) || 0;

                log.debug("Project Task Id", projectTaskId);

                if (projectTaskId) {
                    var projectTaskFields = search.lookupFields({
                        id: projectTaskId,
                        type: search.Type.PROJECT_TASK,
                        columns: ['custevent_veic_restrict_to_rl1']
                    });

                    log.debug("Project Task Flags", JSON.stringify(projectTaskFields));

                    var restrictToRL1 = projectTaskFields['custevent_veic_restrict_to_rl1'];
                    log.audit("restrictToRL1 Id", restrictToRL1);
                    if (restrictToRL1 && restrictToRL1.length > 0) {
                        restrictToRL1Id = restrictToRL1[0].value;
                        restrictToRL1Text = restrictToRL1[0].text;
                    }

                }

                // Validation logic
                if (!chargeFromId) {
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

            return true; // Valid by default.
        }

        return {
            //pageInit: pageInit,
            fieldChanged: fieldChanged,
            //postSourcing: postSourcing,
            //sublistChanged: sublistChanged,
            //lineInit: lineInit,
            //validateField: validateField,
            //validateLine: validateLine,
            //validateInsert: validateInsert,
            //validateDelete: validateDelete,
            saveRecord: saveRecord
        };

    });
