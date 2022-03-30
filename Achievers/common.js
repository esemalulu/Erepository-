function getStandardHeader() {
	var header = new Array();
	header['User-Agent-x'] = 'SuiteScript-Call';
	header['Authorization'] = 'Basic ' + getCredentials();
	return header;
}

function getAuthenticatedUsername() {
	var userID = nlapiGetUser();
	return nlapiLookupField("employee", userID, "email");
}

function getAuthenticatedExternalID() {
	var userID = nlapiGetUser();
	return nlapiLookupField("employee", userID, "externalid");
}

function customerRecordTypeFieldId() {
	return "custentityrecord_type";
}

function productVendorFieldId() {
	return "custentity_product_vendor";
}

function getPointsFormId() {
	return 147;
}

function getPointsItemId() {
	return 64;
}

function getKpmgPointsItemId(){
    return 11982;
}

function getPointsOrderedCustomFieldId() {
	return 'custcol_points_ordered';
}

function getCustomerDepth() {
	var depth = 0;
	var parentId = nlapiGetFieldValue("parent");
	var parentRecord;
	while (parentId != null && parentId != "") {
		parentId = nlapiLoadRecord("customer", parentId)
				.getFieldValue("parent");
		depth++;
	}
	return depth;
}

function handleResponse(response, requestUrl, postData) {
	if (response.getCode() >= 400) {
		var userId = nlapiGetUser();
		var subject = "Error: request to " + requestUrl + " failed";
		var body = "A call from NetSuite was not properly handled by CORE. Please notify IT of the issue.\n"
				+ "username: "
				+ getAuthenticatedUsername()
				+ "\n"
				+ "request URL: "
				+ requestUrl
				+ "\n"
				+ "respose code: "
				+ response.getCode() + "\n";
		if (postData != null) {
			if (typeof postData == "string") {
				body += "POST=" + postData + "\n";
			} else {
				body += "POST parameters:\n";
				for (key in postData) {
					body += key + "=" + postData[key] + "\n";
				}
			}
		}
		nlapiSendEmail(29116069, getErrorEmail(), subject, body);		//send email to Elijah Semalulu
	}
}

function memberType() {
	return "1";
}

function memberListType() {
	return "2";
}

function accountType() {
	return "4";
}

function programType() {
	return "3";
}

function parentType() {
	return "5";
}
