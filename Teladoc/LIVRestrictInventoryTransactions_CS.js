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
    function saveRecord(context) {
    	var currentRecord = context.currentRecord;
    	var transactionAccountingPeriod = currentRecord.getValue({
            fieldId: 'postingperiod'
        }); 
    	
    	 var livAccountingPeriodSearch = search.create({
    	        type: 'customrecord_liv_inv_accounting_period',
    	        columns: ['custrecord_lock_inventory_transactions','custrecord_accounting_period'],
    	        filters: ['custrecord_accounting_period', 'ANYOF', transactionAccountingPeriod]
    	 });
    	 
    	 var resultSet = livAccountingPeriodSearch.run();

    	    var resultRange = resultSet.getRange({
    	        start: 0,
    	        end: 50
    	    });
       log.debug('resultRange.length =' + resultRange.length);
       /*message.create({
           title: "INFORMATION", 
           message: 'resultRange.length =' + resultRange.length, 
           type: message.Type.INFORMATION
       });*/
       //alert('resultRange.length =' + resultRange.length);
       
    	if(resultRange.length > 0){
    		var lockInventoryTransactions = resultRange[0].getValue({
                name: 'custrecord_lock_inventory_transactions'
            });
    		log.debug('lockInventoryTransactions =' + lockInventoryTransactions);
    		var accountingPeriod = resultRange[0].getText({
                name: 'custrecord_accounting_period'
            });
    		log.debug('accountingPeriod =' + accountingPeriod);
    		if(lockInventoryTransactions == true){
    			/*var errorMessage = message.create({
                    title: "ERROR", 
                    message: "Inventory Transactions are locked for "+accountingPeriod, 
                    type: message.Type.ERROR
                });
    			errorMessage.show();*/
    			alert("Inventory Transactions are locked for "+accountingPeriod);
    			return false;
    		}
    		else
    		{
    			return true;			
    		}
    	}
    	else
    	{
    		return true;
    	}
    }
    
    return {
        saveRecord: saveRecord
    };
});
