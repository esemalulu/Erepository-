/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

//** CONSTANTS **/
var CONFRECORDID = 1
var NONRVSDEALER = 11;
var RETAILCUSTOMER = 8;
/** END CONSTANTS **/

define(['N/query', 'N/runtime', 'N/recordContext'],
    /**
     * @param{runtime} runtime
     * @param{recordContext} recordContext
     * @param{serverWidget} serverWidget
     */
    function (query, runtime, recordContext) {

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
            // Load the Configuration Record
            var SuiteQL = 'SELECT * FROM customrecordgd_so_config WHERE id = ' + CONFRECORDID;
            var config_ResultSet = query.runSuiteQL({
                query: SuiteQL
            }).asMappedResults();


            if (runtime.getCurrentUser().role == config_ResultSet[0].custrecordretailpartsreproleid) {
                var isPerson = scriptContext.currentRecord.getValue({
                    fieldId: 'isperson'
                });
                if (scriptContext.mode != 'delete') {
                    if (scriptContext.currentRecord.getValue({
                            fieldId: 'isperson'
                        }) == 'F') {
                        //Non-RVS Dealer
                        scriptContext.currentRecord.setValue({
                            fieldId: 'custentityrvsdealertype',
                            value: NONRVSDEALER,
                            ignoreFieldChange: true
                        });
                        scriptContext.currentRecord.setValue({
                            fieldId: 'pricelevel',
                            value: config_ResultSet[0].custrecordnondealer_msrp,
                            ignoreFieldChange: true
                        });
                    } else {
                        //Retail Customer
                        scriptContext.currentRecord.setValue({
                            fieldId: 'custentityrvsdealertype',
                            value: RETAILCUSTOMER,
                            ignoreFieldChange: true
                        });
                        scriptContext.currentRecord.setValue({
                            fieldId: 'pricelevel',
                            value: config_ResultSet[0].custrecordretailcust_msrp,
                            ignoreFieldChange: true
                        });
                    }
                }
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
            log.debug('scriptContext.fieldId', scriptContext.fieldId);
            if (scriptContext.mode != 'delete') {
                // Load the Configuration Record
                var SuiteQL = 'SELECT * FROM customrecordgd_so_config WHERE id = ' + CONFRECORDID;
                var config_ResultSet = query.runSuiteQL({
                    query: SuiteQL
                }).asMappedResults();
                // log.debug('config_ResultSet', JSON.stringify(config_ResultSet));
                // log.debug('isperson', scriptContext.currentRecord.getValue({
                //     fieldId: 'isperson'
                // }));
                // log.debug('role, config role', runtime.getCurrentUser().role + ', ' + config_ResultSet[0].custrecordretailpartsreproleid);
                if (runtime.getCurrentUser().role == config_ResultSet[0].custrecordretailpartsreproleid) {
                    if (scriptContext.fieldId == 'isperson') {

                        log.debug('isperson', scriptContext.currentRecord.getValue({
                            fieldId: 'isperson'
                        }));

                        if (scriptContext.currentRecord.getValue({
                                fieldId: 'isperson'
                            }) == 'F' || scriptContext.currentRecord.getValue({
                                fieldId: 'isperson'
                            }) == false) {
                            scriptContext.currentRecord.setValue({
                                fieldId: 'custentityrvsdealertype',
                                value: NONRVSDEALER,
                                ignoreFieldChange: true
                            }); //Non-RVS Dealer
                            scriptContext.currentRecord.setText({
                                fieldId: 'pricelevel',
                                text: 'MSRP',
                                ignoreFieldChange: true
                            });
                        }
                        if (scriptContext.currentRecord.getValue({
                                fieldId: 'isperson'
                            }) == 'T' || scriptContext.currentRecord.getValue({
                                fieldId: 'isperson'
                            }) == true) {
                            scriptContext.currentRecord.setValue({
                                fieldId: 'custentityrvsdealertype',
                                value: RETAILCUSTOMER,
                                ignoreFieldChange: true
                            }); //Retail Customer
                            scriptContext.currentRecord.setText({
                                fieldId: 'pricelevel',
                                text: 'MSRP 100',
                                ignoreFieldChange: true
                            });
                        }
                    }
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
            fieldChanged: fieldChanged,
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