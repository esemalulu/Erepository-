/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

// START FUNCTION =======================================================================================
define(['N/record', 'N/search', 'N/url'],

    function(record,search, url) {

        function afterSubmit(scriptContext) {

            try {

                if (scriptContext.type == 'create' || scriptContext.type == 'copy') 
				{
                    var o_currentRecord = scriptContext.newRecord;
					var recId = o_currentRecord.id;
                    var recType = o_currentRecord.type;
                    var o_recObj = record.load({
                        type: recType,
                        id: recId,
						isDynamic:true
                    });					
                    var discountChangeAmt = o_recObj.getValue('custbody_bill_discount_amount');
					if(_logValidation(discountChangeAmt)){
						discountChangeAmt = parseFloat(discountChangeAmt)
					}else{
						discountChangeAmt = 0;
					}
					var b_createdFlag = false;
					if(discountChangeAmt >0)
					{
						o_recObj.selectNewLine({sublistId:'item'})
						o_recObj.setCurrentSublistValue({sublistId:'item', fieldId:'item', value:'103215'});
						o_recObj.setCurrentSublistValue({sublistId:'item', fieldId:'price', value:'-1'});
						o_recObj.setCurrentSublistValue({sublistId:'item', fieldId:'rate', value:(discountChangeAmt)*-1});
						o_recObj.commitLine({sublistId:'item'});
						
						b_createdFlag =true;
					}
					
					if(b_createdFlag == true){
						var recordId = o_recObj.save({
							enableSourcing: true,
							ignoreMandatoryFields: true
						});
					}
            
                }
				
				if (scriptContext.type == 'edit') 
				{
					log.debug('debug', 'In Edit ');
                    var o_currentRecord = scriptContext.newRecord;  
					var oldRecordObj = scriptContext.oldRecord; 
					var recId = o_currentRecord.id;
                    var recType = o_currentRecord.type;
                    var o_recObj = record.load({
                        type: recType,
                        id: recId,
						isDynamic:true
                    });		
					var b_createdFlag = false;
					if(o_currentRecord.getValue('custbody_bill_discount_amount') !== oldRecordObj.getValue('custbody_bill_discount_amount'))
					{
						var discountChangeAmt = o_recObj.getValue('custbody_bill_discount_amount');
						if(_logValidation(discountChangeAmt)){
							discountChangeAmt = parseFloat(discountChangeAmt)
						}else{
							discountChangeAmt = 0;
						}
						
						var lineNumber = o_recObj.findSublistLineWithValue({
							sublistId: 'item',
							fieldId: 'item',
							value: 103215
						});
						
						log.debug('debug', 'discountChangeAmt ' +discountChangeAmt);
						log.debug('debug', 'lineNumber ' +lineNumber);
						if(lineNumber > -1 && discountChangeAmt >0)
						{
							o_recObj.selectLine({sublistId:'item',line:lineNumber})
							o_recObj.setCurrentSublistValue({sublistId:'item', fieldId:'rate', value:(discountChangeAmt)*-1});
							o_recObj.commitLine({sublistId:'item'})
							b_createdFlag = true;
						}else if(lineNumber == -1 && discountChangeAmt >0){
							o_recObj.selectNewLine({sublistId:'item'})
							o_recObj.setCurrentSublistValue({sublistId:'item', fieldId:'item', value:'103215'});
							o_recObj.setCurrentSublistValue({sublistId:'item', fieldId:'price', value:'-1'});
							o_recObj.setCurrentSublistValue({sublistId:'item', fieldId:'rate', value:(discountChangeAmt)*-1});
							o_recObj.commitLine({sublistId:'item'})
							b_createdFlag = true;
						}else if(lineNumber > -1 && discountChangeAmt ==0){
							o_recObj.removeLine({sublistId:'item',line:lineNumber})
							b_createdFlag = true;
						}
						
						if(b_createdFlag == true){
							var recordId = o_recObj.save({
								enableSourcing: true,
								ignoreMandatoryFields: true
							});
						}
					}
                }

            } //try
            catch (e) {
                log.debug('exception', e);
            }
        }
        // START VALIDATION FUNCTION ====================================================================
        function _logValidation(value) {
            if (value != null && value != '' && value != undefined && value.toString() != 'NaN' && value.toString() != '' && value != NaN) {
                return true;
            } else {
                return false;
            }
        }
        // END VALIDATION FUNCTION ======================================================================
        return {
            afterSubmit: afterSubmit
        };
    });

// END FUNCTION ==========================================================================================