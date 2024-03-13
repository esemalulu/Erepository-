/*
 * @author efagone
 */

function replaceLicense(request, response){

	if (request.getMethod() == 'GET') {
		var licenseId = request.getParameter('custparam_licenseid');
		var reason = request.getParameter('custparam_reason');
		
		nlapiLogExecution('DEBUG', 'User ' + nlapiGetUser() + ' is proccessing', 'LicenseId: ' + licenseId);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, nlapiGetContext().getName() + ' is replacing license', 'LicenseId: ' + licenseId + '\n\nReason: ' + decodeURI(reason));
		
		if (licenseId != null && licenseId != '') {
		
			//copy existing and expire old
			var arrLicenseInfo = copyAndReplace(licenseId);
			
			if (arrLicenseInfo != null) {
				var oldProductKey = arrLicenseInfo[0];
				var newProductKey = arrLicenseInfo[1];
				var customerId = arrLicenseInfo[2];
				var newLicenseId = arrLicenseInfo[3];
				var newLicenseName = arrLicenseInfo[4];
				
				try {
					var arrAllOpps = replaceOnOpenOpportunities(arrLicenseInfo);
					replaceOnAssociatedQuotes(arrAllOpps, arrLicenseInfo);
					replaceOnUnprocessedSalesOrders(arrLicenseInfo);
				} 
				catch (e) {
					var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
					nlapiSendEmail(adminUser, adminUser, 'Could not update product key', 'Support button.\n\n' + e + '\n\nOld Product Key: ' + oldProductKey + '\nNew Product Key: ' + newProductKey);
				}
			}
		}
		
		//done, now expire the old and redirect the user to new	
		var recLicenseToExpire = nlapiLoadRecord('customrecordr7nexposelicensing', licenseId);
		var currentComments = recLicenseToExpire.getFieldValue('custrecordr7nxlicensecomments');
				
		var newComments = '';
		newComments += nlapiDateToString(new Date()) + ' - ';
		newComments += nlapiGetContext().getName() + ': This key was replaced by ' + newProductKey;
		if (reason != null && reason != '') {
			newComments += ' (' + decodeURI(reason) + ')';
		}
		newComments += '\n' + currentComments;
		
		recLicenseToExpire.setFieldValue('custrecordr7nxlicensecomments', newComments);
		recLicenseToExpire.setFieldValue('custrecordr7nxlicenseexpirationdate', nlapiDateToString(new Date()));
		recLicenseToExpire.setFieldValue('custrecordr7nxlicensefeaturemgmntcreated', 'F');
		nlapiSubmitRecord(recLicenseToExpire);
		
		var url = '/app/common/custom/custrecordentry.nl?rectype=58&id=' + newLicenseId;
		response.writeLine(url);
	}
	
}

function replaceOnUnprocessedSalesOrders(arrLicenseInfo){

	var oldProductKey = arrLicenseInfo[0];
	var newProductKey = arrLicenseInfo[1];
	var customerId = arrLicenseInfo[2];
	var newLicName = arrLicenseInfo[4];
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('entity', null, 'is', customerId);
	arrSearchFilters[1] = new nlobjSearchFilter('custbodyr7renewaloppcreated', null, 'is', 'F');
	arrSearchFilters[2] = new nlobjSearchFilter('custcolr7itemmsproductkey', null, 'is', oldProductKey);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('internalid', null, 'group');
	
	var arrSearchResults = nlapiSearchRecord('salesorder', null, arrSearchFilters, arrSearchColumns);
	
	//replacing it on all open quotes
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		var searchResult = arrSearchResults[i];
		var orderId = searchResult.getValue(arrSearchColumns[0]);
		
		var recOrder = nlapiLoadRecord('salesorder', orderId);
		lineItemCount = recOrder.getLineItemCount('item');
		for (var j = 1; j <= lineItemCount; j++) {
		
			var currentProductKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', j);
			var currentLicenseId = recOrder.getLineItemValue('item', 'custcolr7translicenseid', j);
			
			if (currentProductKey == oldProductKey) {
				recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', j, newProductKey);
				
				if (currentLicenseId != null && currentLicenseId != '' && currentLicenseId != 'XXX'){
					recOrder.setLineItemValue('item', 'custcolr7translicenseid', j, newLicName);
				}
			}
		}
		
		try {
			nlapiLogExecution('DEBUG', 'Updating SalesOrder', orderId);
			nlapiSubmitRecord(recOrder);
		} 
		catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Could not update product key on opp', 'Support button. \n\nSalesOrderId: ' + orderId);
		}
	}
}
	
function replaceOnOpenOpportunities(arrLicenseInfo){
	
	var oldProductKey = arrLicenseInfo[0];
	var newProductKey = arrLicenseInfo[1];
	var customerId = arrLicenseInfo[2];
	var newLicName = arrLicenseInfo[4];
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('entity', null, 'is', customerId);
	arrSearchFilters[1] = new nlobjSearchFilter('custcolr7itemmsproductkey', null, 'is', oldProductKey);
	arrSearchFilters[2] = new nlobjSearchFilter('probability', null, 'greaterthan', 0);
	arrSearchFilters[3] = new nlobjSearchFilter('probability', null, 'lessthan', 100);
		
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('internalid', null, 'group');
	
	var arrSearchResults = nlapiSearchRecord('opportunity', null, arrSearchFilters, arrSearchColumns);
	var arrAllOpps = new Array();
	//replacing it on all open opps
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
		var searchResult = arrSearchResults[i];
		var orderId = searchResult.getValue(arrSearchColumns[0]);
		
		var recOrder = nlapiLoadRecord('opportunity', orderId);
		lineItemCount = recOrder.getLineItemCount('item');
		for (var j = 1; j <= lineItemCount; j++) {
		
			var currentProductKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', j);
			var currentLicenseId = recOrder.getLineItemValue('item', 'custcolr7translicenseid', j);
			
			if (currentProductKey == oldProductKey) {
				recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', j, newProductKey);
				
				if (currentLicenseId != null && currentLicenseId != '' && currentLicenseId != 'XXX'){
					recOrder.setLineItemValue('item', 'custcolr7translicenseid', j, newLicName);
				}
				
			}
		}
		
		try {
			nlapiLogExecution('DEBUG', 'Updating Opp', orderId);
			nlapiSubmitRecord(recOrder);
		}
		catch (e){
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Could not update product key on opp', 'Support button. \n\nOppId: ' + orderId);
		}
		arrAllOpps[arrAllOpps.length] = orderId;
	}
	
	return arrAllOpps;
}

function replaceOnAssociatedQuotes(arrAllOpps, arrLicenseInfo){

	var oldProductKey = arrLicenseInfo[0];
	var newProductKey = arrLicenseInfo[1];
	var customerId = arrLicenseInfo[2];
	var newLicName = arrLicenseInfo[4];
	
	if (arrAllOpps != null && arrAllOpps.length > 0) {
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('entity', null, 'is', customerId);
		arrSearchFilters[1] = new nlobjSearchFilter('opportunity', null, 'anyof', arrAllOpps);
		arrSearchFilters[2] = new nlobjSearchFilter('custcolr7itemmsproductkey', null, 'is', oldProductKey);
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('internalid', null, 'group');
		
		var arrSearchResults = nlapiSearchRecord('estimate', null, arrSearchFilters, arrSearchColumns);
		var foundKey = false
		//replacing it on all open quotes
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			var searchResult = arrSearchResults[i];
			var orderId = searchResult.getValue(arrSearchColumns[0]);
			
			var recOrder = nlapiLoadRecord('estimate', orderId);
			lineItemCount = recOrder.getLineItemCount('item');
			for (var j = 1; j <= lineItemCount; j++) {
			
				var currentProductKey = recOrder.getLineItemValue('item', 'custcolr7itemmsproductkey', j);
				var currentLicenseId = recOrder.getLineItemValue('item', 'custcolr7translicenseid', j);
				
				if (currentProductKey == oldProductKey) {
					recOrder.setLineItemValue('item', 'custcolr7itemmsproductkey', j, newProductKey);
					
					if (currentLicenseId != null && currentLicenseId != '' && currentLicenseId != 'XXX'){
						recOrder.setLineItemValue('item', 'custcolr7translicenseid', j, newLicName);
					}
					
					foundKey = true;
				}
			}
			
			if (foundKey) {
				try {
					nlapiLogExecution('DEBUG', 'Updating Quote', orderId);
					nlapiSubmitRecord(recOrder);
				} 
				catch (e) {
					var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
					nlapiSendEmail(adminUser, adminUser, 'Could not update product key on opp', 'Support button. \n\n' + e + '\n\nQuote Id: ' + orderId);
				}
			}
		}
	}
}

function copyAndReplace(licenseId){

	var comments = '';
	comments += nlapiDateToString(new Date()) + ' - ';
	comments += nlapiGetContext().getName() + ': This key replaced ';
	
	var recNewLicense = nlapiCopyRecord('customrecordr7nexposelicensing', licenseId);
	var oldProductKey = recNewLicense.getFieldValue('custrecordr7nxproductkey');
	var customerId = recNewLicense.getFieldValue('custrecordr7nxlicensecustomer');
	comments += oldProductKey;
	
	//Null out ProductKey, Nexpose License Serial No, Product Serial No
	recNewLicense.setFieldValue('custrecordr7nxproductkey', '');
	recNewLicense.setFieldValue('custrecordr7nxlicenseserialnumber', '');
	recNewLicense.setFieldValue('custrecordr7nxproductserialnumber', '');
	
	recNewLicense.setFieldValue('custrecordr7nxfirstaccessdate', '');
	recNewLicense.setFieldValue('custrecordr7nxlastaccessed', '');
	
	recNewLicense.setFieldValue('custrecordr7nxlicenseoemstartdate', nlapiDateToString(new Date()));
	recNewLicense.setFieldValue('custrecordr7nxlicensecomments', comments);
	
	try {
		var id = nlapiSubmitRecord(recNewLicense);
		var newLicInfo = nlapiLookupField('customrecordr7nexposelicensing', id, new Array('custrecordr7nxproductkey', 'name'));
		var newProductKey = newLicInfo['custrecordr7nxproductkey'];
		var newLicName = newLicInfo['name'];
		
		copyFMRs(oldProductKey, newProductKey, id);
		return new Array(oldProductKey, newProductKey, customerId, id, newLicName);
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Could not create new license', 'Support button. \n\n' + e + '\n\licenseId: ' + licenseId);
	}

	return null;
	
}

function copyFMRs(oldProductKey, newProductKey, newLicenseId){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', 'customrecordr7nexposelicensing');
	arrSearchFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', oldProductKey);
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrSearchFilters);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var featureManagementId = arrSearchResults[i].getId();
		
		var recFMR = nlapiLoadRecord('customrecordr7licensefeaturemanagement', featureManagementId);
		recFMR.setFieldValue('custrecordr7licfmproductkey', newProductKey);
		recFMR.setFieldValue('custrecordr7licfmlicense', newLicenseId);
		recFMR.setFieldValue('custrecordr7licfmnexposelicense', newLicenseId);
		nlapiSubmitRecord(recFMR, true);
		
	}
}


