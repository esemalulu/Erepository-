/*
 * @author efagone
 */
function pageInit(){
	
	window.onbeforeunload = function() {};
	/*
		var count = nlapiGetLineItemCount('custpage_addonitems');
		if (count == 0) {
			alert('There are no unprocessed add-ons awaiting association for this order');
			window.opener = top;
			window.close();
		}
	*/
}

function fieldChanged(type, name, linenum){
	var userId = nlapiGetUser();
	
	if (type == 'custpage_addonitems' && name == 'custpage_license_acl') {
		var aclValue = nlapiGetLineItemValue(type, name, linenum);
		var aclText = nlapiGetLineItemText(type, name, linenum);
		var aclType = aclText.substr(0, 3);
		var recordType = '';
		var recordField = '';
		
		if (aclType == 'NXL') {
			recordType = 'customrecordr7nexposelicensing';
		}
		
		if (aclType == 'MSL') {
			recordType = 'customrecordr7metasploitlicensing';
		}
		
		var itemFamily = nlapiGetLineItemValue(type, 'custpage_itemfamily', linenum);
		
		if (itemFamily != null && itemFamily != '' && recordType != '') {
			var productKey = aclValue.substr(3);
			var licenseFamily = findLicenceItemFamily(productKey, recordType);
			if (licenseFamily != null && itemFamily.indexOf(licenseFamily) == -1) {
				alert('That ACL/Product Key is not compatible with this add-on feature');
				nlapiSetLineItemValue(type, name, linenum, nlapiGetLineItemValue(type, 'custpage_license_acl_orig', linenum));
			}
			else {
				nlapiSetLineItemValue(type, 'custpage_license_acl_orig', linenum, nlapiGetLineItemValue(type, name, linenum));
			}
		}
		else {
			nlapiSetLineItemValue(type, 'custpage_license_acl_orig', linenum, nlapiGetLineItemValue(type, name, linenum));
		}
	}
	
	if (type == 'custpage_aclitems' && name == 'custpage_license_aclexisting') {
		var productKey = nlapiGetLineItemValue(type, name, linenum);
		var aclText = nlapiGetLineItemText(type, name, linenum);
		var aclType = aclText.substr(0, 3);
		var recordType = '';
		var recordField = '';
		
		if (aclType == 'NXL') {
			recordType = 'customrecordr7nexposelicensing';
		}
		
		if (aclType == 'MSL') {
			recordType = 'customrecordr7metasploitlicensing';
		}
		
		var itemFamily = nlapiGetLineItemValue(type, 'custpage_itemfamily_acl', linenum);
		
		if (itemFamily != null && itemFamily != '' && recordType != '') {
			var licenseFamily = findLicenceItemFamily(productKey, recordType);
			
			if (licenseFamily != null && itemFamily.indexOf(licenseFamily) == -1) {
				alert('That ACL/Product Key is not compatible with this item');
				nlapiSetLineItemValue(type, name, linenum, nlapiGetLineItemValue(type, 'custpage_license_aclexisting_orig', linenum));
			}
			else {
				nlapiSetLineItemValue(type, 'custpage_license_aclexisting_orig', linenum, nlapiGetLineItemValue(type, name, linenum));
			}
		}
		else {
			nlapiSetLineItemValue(type, 'custpage_license_aclexisting_orig', linenum, nlapiGetLineItemValue(type, name, linenum));
		}
	}
	
}

function validateField(type, name, linenum){

	return true;
}

function validateLine(type){

	return true;
}

function findLicenceItemFamily(productKey, recordType){

	if (recordType == 'customrecordr7metasploitlicensing') {
		var searchFilters = new nlobjSearchFilter('custrecordr7msproductkey', null, 'is', productKey);
		var searchColumn = new nlobjSearchColumn('custrecordr7mslicenseitemfamily');
	}
	if (recordType == 'customrecordr7nexposelicensing') {
		var searchFilters = new nlobjSearchFilter('custrecordr7nxproductkey', null, 'is', productKey);
		var searchColumn = new nlobjSearchColumn('custrecordcustrecordr7nxlicenseitemfamil');
	}
	
	if (recordType != null && recordType != '') {
		var searchResults = nlapiSearchRecord(recordType, null, searchFilters, searchColumn);
		
		if (searchResults != null && searchResults.length >= 1) {
			return searchResults[0].getValue(searchColumn);
		}
		else {
			return null;
		}
	}
	return null;
}
