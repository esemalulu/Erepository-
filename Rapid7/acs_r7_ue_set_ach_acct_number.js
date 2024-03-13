/**
 *    Copyright (c) 2020, Oracle and/or its affiliates. All rights reserved.
 */

/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record'],
    /**
     * @param {record} record
     */
    function (record) {



        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {

            try {
                if(scriptContext.type == "create" || scriptContext.type == "edit"){
                    var objVendor = scriptContext.newRecord;

                    var intACHCount = objVendor.getLineCount('achacct');
                    if (intACHCount > 0) {
                        var strAccountNumber = objVendor.getSublistValue('achacct', 'accountnumber', 0);
                        objVendor.setValue('custentity_r7_ach_acct_number', strAccountNumber);
                    }
                }
            }catch(e){
                log.error('Error: not possible to set Account Number', JSON.stringify(e));
            }
        }


        return {

            beforeSubmit: beforeSubmit

        };

    });
