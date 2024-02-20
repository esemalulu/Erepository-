/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/log', 'N/search', 'N/recordContext', 'N/query'],
    /**
     * @param{currentRecord} currentRecord
     * @param{log} log
     * @param{search} search
     * @param{recordContext} recordContext
     */
    function (currentRecord, log, search, recordContext, query) {

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
            try{
            if (scriptContext.mode = 'create') {
                var credlocation;
                var currentUrl=document.location.href;
                var url = new URL(currentUrl);
                var creditMemoId = url.searchParams.get("cred");
                if (creditMemoId) {
                    var transactionSearchObj = search.create({
                        type: "transaction",
                        filters:
                        [
                           ["internalidnumber","equalto",creditMemoId],
                           "AND",
                           ["mainline","is","T"]
                        ],
                        columns:
                        [
                           search.createColumn({name: "location", label: "Location"})
                        ]
                     });
                     transactionSearchObj.run().each(function(result){
                        // .run().each has a limit of 4,000 results
                        credlocation = result.getValue("location") || '';
                        return true;
                     });
                    scriptContext.currentRecord.setValue({
                        fieldId: 'location',
                        value: credlocation,
                        ignoreFieldChange: true,
                        forceSyncSourcing: true
                    });
                }
                var configSuiteQL = 'SELECT * FROM customrecordgd_configurations WHERE id = 1';
                var configSuiteQLResults = query.runSuiteQL({
                    query: configSuiteQL,
                }).asMappedResults();
                var defaultCheckAcc = JSON.parse(configSuiteQLResults[0].custrecordgd_config_json);
                defaultCheckAcc = defaultCheckAcc.gddealerrefunddefaultcheckacc;
                if (defaultCheckAcc != null && defaultCheckAcc != '') {
                    scriptContext.currentRecord.setValue({
                        fieldId: 'account',
                        value: defaultCheckAcc,
                        ignoreFieldChange: true,
                        forceSyncSourcing: true
                    });
                }
            }
        }catch(e){
            log.error(e.title, e.message);
        }

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
            pageInit: pageInit,
            //fieldChanged: fieldChanged,
            //postSourcing: postSourcing,
            //sublistChanged: sublistChanged,
            //lineInit: lineInit,
            //validateField: validateField,
            //validateLine: validateLine,
            //validateInsert: validateInsert,
            //validateDelete: validateDelete,
            //saveRecord: saveRecord
        };

    });