/**
 * Record library file for Solution Source accounts.
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Sep 2020     Jeffrey Bajit
 *
 */

/**
 * Returns item record whose item id is specified. Use this when you don't know the type of item you need to load.
 * This method has 10 usage points.
 */
function GetItemRecord(itemId) {
    //Create a search to get the item's type
    var results = nlapiSearchRecord('item', null, 
        new nlobjSearchFilter('internalid', null, 'anyof', itemId));
    
    var type = null;    
    if (results != null && results.length > 0) {
        type = results[0].getRecordType();
    }
	
	//Return the loaded record.
	try {
	    return nlapiLoadRecord(type, itemId);
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
function GetTransactionRecord(transactionId) {
	//Create a search to get the record's type
    var results = nlapiSearchRecord('transaction', null, 
        new nlobjSearchFilter('internalid', null, 'anyof', transactionId));
	
    var transType = null;    
    if (results != null && results.length > 0) {
        transType = results[0].getRecordType();
    }
    
	//Return the loaded record.
	try {
		return record.load({type: transType, id: transactionId});
	}
    catch(err) {
        return null;
    }
	return null;
}
