/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/error', 'N/log', 'N/query', 'N/record', 'N/recordContext', 'N/search'],
    /**
     * @param{currentRecord} currentRecord
     * @param{error} error
     * @param{log} log
     * @param{query} query
     * @param{record} record
     * @param{recordContext} recordContext
     * @param{search} search
     */
    function (currentRecord, error, log, query, record, recordContext, search) {

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
            if (scriptContext.mode == 'create' || scriptContext.mode == 'edit') {
                //get Retail Email Address
                var retailCustEmail = scriptContext.currentRecord.getValue({
                    fieldId: 'custbodygd_retailcustemail'
                });
                if (!retailCustEmail){
                    var customrecordrvsunitSearchObj = search.create({
                        type: "customrecordrvsunit",
                        filters: [
                            ["internalidnumber", "equalto", scriptContext.currentRecord.getValue({
                                fieldId: 'custbodyrvsunit'
                            })],
                            "AND",
                            ["custrecordunitretailcustomer_unit.custrecordunitretailcustomer_currentcust", "is", "T"]
                        ],
                        columns: [
                            search.createColumn({
                                name: "custrecordunitretailcustomer_email",
                                join: "CUSTRECORDUNITRETAILCUSTOMER_UNIT",
                                label: "Email"
                            }),
                        ]
                    });
                    customrecordrvsunitSearchObj.run().each(function (result) {
                        var retailEmail = result.getValue({
                            name: 'custrecordunitretailcustomer_email',
                            join: 'CUSTRECORDUNITRETAILCUSTOMER_UNIT'
                        }) || '';
                        if (retailEmail) {
                            scriptContext.currentRecord.setValue({
                                fieldId: 'custbodygd_retailcustemail',
                                value: retailEmail,
                                ignoreFieldChange: true
                            });
                        };
                        return false;
                    });
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
            if (scriptContext.fieldId == 'shipaddresslist') {
                var phone = '';
                var currentRecord = scriptContext.currentRecord;
                if (!scriptContext.currentRecord.getValue('shipaddresslist')){
                    currentRecord.setValue({
                            fieldId: 'custbodygd_shiptophone',
                            value: phone,
                            ignoreFieldChange: true
                        });
                }else{
                    
                    var addr = currentRecord.getValue({
                        fieldId: 'shipaddresslist'
                    });
                    log.debug('shipaddresslist', addr);
                    var shippingaddress_key = currentRecord.getValue({
                        fieldId: 'shippingaddress_key'
                    });
                    log.debug('shippingaddress_key', shippingaddress_key);
                    
                    var filters = new Array();
                    filters[0] = search.createFilter({
                        name: 'formulatext',
                        operator: search.Operator.IS,
                        values: addr,
                        formula: '{address.addressinternalid}',
                    });

                    var columns = new Array();
                    columns[0] = search.createColumn({
                        name: "formulatext",
                        formula: '{address.addressphone}',
                    });

                    var searchresults = search.create({
                        type: search.Type.CUSTOMER,
                        columns: columns,
                        filters: filters
                    });

                    searchresults.run().each(function (result) {
                        phone = result.getValue('formulatext') || '';
                        currentRecord.setValue({
                            fieldId: 'custbodygd_shiptophone',
                            value: phone,
                            ignoreFieldChange: true
                        });
                        return false;
                    });
                    
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
            if (scriptContext.currentRecord.getValue({fieldId: 'tobeemailed'})) {
                scriptContext.currentRecord.setValue({fieldId: 'tobeemailed', value: false});
            }

            return true;
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
            saveRecord: saveRecord
        };

    });