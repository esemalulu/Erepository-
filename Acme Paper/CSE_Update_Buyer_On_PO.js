/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

function() {
    

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

          /**
         * @Task Buyer field on Purchase orders  Clickup Task Code/Id: 86ayzy2qv  https://app.clickup.com/t/86ayzy2qv
         * @Date 1 / 17 / 2024
         * @Context This code was commented for the task 'Buyer field on Purchase orders' to cancel the logic that hard set the PO buyer body field with the buyer
         *          of the first item line of the PO 
         */
      
    	// var curRec = scriptContext.currentRecord;
    	// var lineCount = curRec.getLineCount({sublistId: 'item'});
    	// if(lineCount > 0){
    	// 	var buyer = curRec.getSublistValue({sublistId: 'item', fieldId: 'custcol_acc_buyer', line: 0});
    	// 	if(buyer){
    	// 		curRec.setValue({fieldId: 'custbody_acc_buyer', value: buyer});
              	
    	// 	}
    	// }
      
      	window.onbeforeunload = null;
    	return true;
    }

    return {
       // pageInit: pageInit,
       // fieldChanged: fieldChanged,
      //  postSourcing: postSourcing,
      //  sublistChanged: sublistChanged,
      //  lineInit: lineInit,
      //  validateField: validateField,
      //  validateLine: validateLine,
      //  validateInsert: validateInsert,
      //  validateDelete: validateDelete,
        saveRecord: saveRecord
    };
    
});
