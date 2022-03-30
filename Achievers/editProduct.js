function afterSubmit(type) {

	currentRecord = nlapiGetNewRecord();
	externalId = currentRecord.getFieldValue('externalid');
	if (externalId != null && externalId != '') { 
		// If this is empty then it wasn't created from express
		// Grab the purchase price and send it back
		cost = currentRecord.getFieldValue('cost');
		oldRecord = nlapiGetOldRecord();
		oldCost = oldRecord.getFieldValue('cost');
		if (cost != null && cost != '' && oldCost != cost) {
			var header = getStandardHeader();
			var post = new Array();
			post["externalId"] = externalId
			var url = getExpressServer()+"/netsuite/EditProduct";
			var response = nlapiRequestURL(url,	post, header);
			handleResponse(response,url,post);
		}

	}
}
