/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record','N/search','N/ui/message'],
/**
 * @param {search} search
 */
function(record,search,message) {    
    function validateField(context) {    	
    	var acceptableQty = true;
    	var currentRecord = context.currentRecord;
    	var sublistName = context.sublistId;
        var sublistFieldName = context.fieldId;
        var line = context.line;
        //alert('line = '+line);
        if (sublistName === 'item') {
        	        	
            if (sublistFieldName === 'quantity') {
            	var quantityRemaining = currentRecord.getSublistValue({
                    sublistId: sublistName,
                    fieldId: 'quantityremaining',
                    line: line
                });
            	//alert('quantityRemaining = '+quantityRemaining);
            	
            	var quantity = currentRecord.getCurrentSublistValue({
                    sublistId: sublistName,
                    fieldId: 'quantity'
                });
            	//alert('quantity = '+quantity);
            	
            	if(parseInt(quantity)>parseInt(quantityRemaining)){
            		acceptableQty = false;
            		/*currentRecord.setCurrentSublistValue({
                        sublistId: sublistName,
                        fieldId: 'quantity',
                        value: '',
                        ignoreFieldChange: true
                    });
            		alert('Item Receipt should not have more items than the remianing items to be recived. ');
            		return false;*/
            	}
            }
        }
        //return true;
        if(acceptableQty == true)
        	return true;
        else{
        	alert('Item Receipt should not have more items than the remaining items to be received.');
        	return false;
        }
    }
    return {
    	validateField: validateField
    };
});
