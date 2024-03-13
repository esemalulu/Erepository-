/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * author: ngrigoriev
 * Date: 18.07.2019
 * Version: 1.0
 */

define([],

    /**

     */
    function() {

        /**
         * Function to be executed at validateInsert
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - The sublist ID name.
         * @since 2015.2
         */
        function validateLine(scriptContext) {
            var vendRec = scriptContext.currentRecord;
            console.log('vendRec.getValue(\'isinactive\')',vendRec.getValue('isinactive'))
            if((scriptContext.sublistId=='achacct' || scriptContext.sublistId=='recmachcustrecord_r7_ach_vendor') &&vendRec.getValue('isinactive')==false){
                console.log('validateInsert achacct');
                alert('You can not update this sublist for an active vendor!');
                //vendRec.cancelLine(scriptContext.sublistId);
                return false;
            }
            if(scriptContext.sublistId=='recmachcustrecord_r7_ach_vendor' && vendRec.getValue('isinactive')==true){

                var intACHCount = vendRec.getLineCount('recmachcustrecord_r7_ach_vendor');
                console.log('intACHCount ' + intACHCount);
                var currentACHID = vendRec.getCurrentSublistValue('recmachcustrecord_r7_ach_vendor', 'id');
                console.log('currentACHID ' + currentACHID);
                var activeACHCount= 0;
                for(var i=0;i<intACHCount;i++){

                    var ACHID = vendRec.getSublistValue('recmachcustrecord_r7_ach_vendor', 'id', i);
                    console.log('ACHID ' + ACHID);

                    var inactive = vendRec.getSublistValue('recmachcustrecord_r7_ach_vendor', 'custrecord_r7_ach_inactive', i);
                    if((currentACHID != ACHID || !ACHID ) && inactive == false){
                        console.log('Inside IF ACHID ' + ACHID);
                        activeACHCount = activeACHCount + 1;
                    }
                }
                console.log('activeACHCount ' + activeACHCount);

                var currentACHInactive = vendRec.getCurrentSublistValue('recmachcustrecord_r7_ach_vendor', 'custrecord_r7_ach_inactive');
                console.log('currentACHInactive ' + currentACHInactive);
                if(currentACHInactive == false && activeACHCount > 0){
                    alert('A vendor may only have one active ACH account.');
                    return false;
                }
            }
            return true;

        }

        return {
            validateLine: validateLine,
        }
    }
);