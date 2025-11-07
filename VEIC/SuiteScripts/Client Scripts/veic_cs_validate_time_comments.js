/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/runtime', 'N/search', 'N/url', 'N/https', 'SuiteScripts/Lib/veic_master_lib.js'],
    /**
     * @param{search} search
     */
    function (runtime, search, url, https, lib) {

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
            // If the customer field in the timeitem sublist has tasks, make sure that the casetaskevent field is not empty
            var currentRecord = scriptContext.currentRecord;
            var sublistId = scriptContext.sublistId;

            var timesheetStartDate = currentRecord.getValue({ fieldId: 'trandate' });
            var timesheetStartDayOfWeek = (new Date(timesheetStartDate)).getDay(); // 0 (Sun) to 6 (Sat)

            if (sublistId === 'timeitem') {
                var projectId = currentRecord.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'customer' });
                debugger;
                if (projectId) {
                    var commentsRequired = isCommentsRequired(projectId);
                    log.debug("Project " + projectId, "Requires comments on time entires: " + commentsRequired);

                    for (var i = 0; i < 7; i++) {
                        var hours = currentRecord.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'hours' + i });
                        var memo = currentRecord.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'memo' + i });
              
                        if (hours && !memo && commentsRequired) {
                            // Translate the index to a day of the week
                            var dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][(i+timesheetStartDayOfWeek) % 7];
                            alert('Please fill in the memo field for ' + dayOfWeek + '. This is required for the selected project.');
                            return false; // Prevent saving if validation fails
                        }
                    }
                }
            }

            return true; // Allow saving if validation passes

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

        // Helper function to determine if a project requires comments on time entries
        function isCommentsRequired(projectId) {
            var requiresComments = false; // Default value
            
            if (!projectId) {
                log.debug('No project ID provided', 'Skipping requires comments check');
                return false;
            }

            var projectFields = lib.lookupFields({
                    type: search.Type.JOB,
                    id: projectId,
                    columns: ['custentity_veic_require_comments_on_time']
            });

            if (projectFields) requiresComments = projectFields.custentity_veic_require_comments_on_time;
            return requiresComments;
        }

        
        return {
            //pageInit: pageInit,
            //fieldChanged: fieldChanged,
            //postSourcing: postSourcing,
            //sublistChanged: sublistChanged,
            //lineInit: lineInit,
            //validateField: validateField,
            validateLine: validateLine,
            //validateInsert: validateInsert,
            //validateDelete: validateDelete,
            //saveRecord: saveRecord
        };

    });
