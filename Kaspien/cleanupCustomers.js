function cleanupCustomers() {
	var recLimit = 2;
	try {
		var customerResults = nlapiSearchRecord('customer', 'customsearch6168');
		if(customerResults !== null && customerResults.length > 0) {
			nlapiLogExecution('DEBUG', 'Start Deleting Process', '--------- Start Deleting Customers ---------' );
			for (var i = 0; i < recLimit; i++) {
				if(i >= customerResults.length) break;
				nlapiDeleteRecord('customer', customerResults[i].getId());
				nlapiLogExecution('DEBUG', 'Record Deleted', "Record with Id ->" + customerResults[i].getId() + " Deleted successfully" );
			}
			nlapiLogExecution('DEBUG', 'End Deleting Process', '--------- End Deleting Customers ---------' );
		}
	} catch(e) {
		nlapiLogExecution('DEBUG', 'Error', JSON.stringify(e));
	}
}