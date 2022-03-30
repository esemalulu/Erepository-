function afterSubmit() {
	if (nlapiGetFieldValue(productVendorFieldId()) == "T") {
		var header = getStandardHeader();
		var post = new Array();
		post["internalId"] = nlapiGetRecordId();
		var url = getExpressServer()+"/netsuite/CreateVendor";
		var response = nlapiRequestURL(url,	post, header);
		handleResponse(response,url,post);
	}
	
}