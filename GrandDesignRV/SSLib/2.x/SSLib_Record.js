/**
 * Record library file for Solution Source accounts.
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(['N/record', 'N/search'],

/**
 * @param {record} record
 * @param {search} search
 */
function(record, search) {
   
	/**
	 * Returns item record whose item id is specified. Use this when you don't know the type of item you need to load.
	 * This method has 10 usage points.
	 */
	function getItemRecord(itemId) {
		//Create a search to get the item's type
		var itemType = null;
		search.create({
			type: search.TYPE.ITEM,
			filters : ['internalid', 'is', itemId]
		}).run().each(function(result){
			itemType = result.recordType;
		});
		
		//Return the loaded record.
		try {
			return record.load({type: itemType,	id: itemId});
		}
        catch(err) {
            return null;
        }
		return null;
	}
	
	/**
	 * Returns transaction record whose transaction id is specified. Use this when you don't know the type of transaction you need to load.
	 * This method has 10 usage points.
	 */
	function getTransactionRecord(transactionId) {
		//Create a search to get the item's type
		var transType = null;
		search.create({
			type: search.TYPE.TRANSACTION,
			filters : ['internalid', 'is', transactionId]
		}).run().each(function(result){
			transType = result.recordType;
		});
		
		//Return the loaded record.
		try {
			return record.load({type: transType, id: transactionId});
		}
        catch(err) {
            return null;
        }
		return null;
	}
	
    return {
    	getItemRecord: getItemRecord,
    	getTransactionRecord: getTransactionRecord
    };
    
});
