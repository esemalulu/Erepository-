/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record'],

function(record) {
    
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
    	var currRec = scriptContext.currentRecord;
    	var fieldId = scriptContext.fieldId;
    	if(fieldId == 'shippingaddress'){
    		var shippingaddress = currRec.getSubrecord({fieldId: 'shippingaddress'});
    		if(shippingaddress){
    			var shipZone = shippingaddress.getValue({fieldId: 'custrecord_ship_zone'});
    			if(shipZone){
    				currRec.setValue({fieldId: 'location', value: shipZone});
    			}
    		}
    	}
    	/*if(scriptContext.sublistId == 'item' && scriptContext.fieldId == 'item'){
    		var location = currRec.getValue({fieldId: 'location'});
    		if(_logValidation(location)){
    			currRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: location});
    		}
    	}*/
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
    	try{
    		var currRec = scriptContext.currentRecord;
        	//alert(scriptContext.fieldId);
        	if(scriptContext.fieldId == 'entity'){
        		var shippingaddress = currRec.getSubrecord({fieldId: 'shippingaddress'});
        		if(_logValidation(shippingaddress)){
        			var shipZone = shippingaddress.getValue({fieldId: 'custrecord_ship_zone'});
        			if(_logValidation(shipZone)){
        				currRec.setValue({fieldId: 'location', value: shipZone});
        			}
        		}
        	}
        	
        	/*if(scriptContext.sublistId == 'item' && scriptContext.fieldId == 'item'){
        		var location = currRec.getValue({fieldId: 'location'});
        		if(_logValidation(location)){
        			currRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'location', value: location});
        		}
        	}*/
    	}catch(e){
    		log.debug('Error', e);
    	}
    	
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
    
    function _logValidation(value){
    	if(value != null && value != '' && value != undefined && value != 'undefined' && value != 'NaN'){
    		return true
    	}else{
    		return false;
    	}
    }

    return {
       // pageInit: pageInit,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
      /*  sublistChanged: sublistChanged,
        lineInit: lineInit,
        validateField: validateField,
        validateLine: validateLine,
        validateInsert: validateInsert,
        validateDelete: validateDelete,
        saveRecord: saveRecord*/
    };
    
});
