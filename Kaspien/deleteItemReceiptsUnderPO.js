function deleteItemReceiptsUnderPO() {
	var recLimit = 99;
	try {
		var itemReceiptsResults = nlapiSearchRecord('itemreceipt', 'customsearch4832');
		if(itemReceiptsResults !== null && itemReceiptsResults.length > 0) {
			for (var i = 0; i < recLimit; i++) {
				if(i > itemReceiptsResults.length) break;
				nlapiDeleteRecord('itemreceipt', itemReceiptsResults[i].getId());
				nlapiLogExecution('DEBUG', 'Delete Record', "Record with Id->" + itemReceiptsResults[i].getId() + " Deleted successfully" );
			}
		}
	} catch(e) {
		nlapiLogExecution('DEBUG', 'Error', JSON.stringify(e));
	}
}