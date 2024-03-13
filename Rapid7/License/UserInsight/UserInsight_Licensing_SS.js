/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Sep 2013     efagone
 *
 */

/*
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */



function usrin_beforeSubmit(type){

	//restricted user stuff - MUST BE FIRST
	if (type == 'create' || type == 'edit') {
	
		var contactId = nlapiGetFieldValue('custrecordr7uilicensecontact');
		var isBlackListed = checkBlacklisted(contactId);
		var isRestricted = checkRestricted(contactId);
		
		if (isBlackListed) {
			nlapiSetFieldValue('custrecordr7uilicenseexpirationdate', nlapiDateToString(nlapiAddDays(new Date(), -1)));
		}
		
		if (isRestricted) {
			nlapiSetFieldValue('custrecordr7uilicenseexpirationdate', nlapiDateToString(nlapiAddDays(new Date(), -1)));
			if (type == 'create') {
				throw nlapiCreateError('ERROR', 'Failed to create license.  Please contact Rapid7 Support', true);
			}
		}
		
	}
	//end restricted user stuff
	
	//make request to userInsight server
	if (type == 'create' || type == 'edit') {
	
		var productKey = nlapiGetFieldValue('custrecordr7uilicenseproductkey');
		
		if (productKey == null || productKey == '' || type == 'create') {
			nlapiSetFieldValue('custrecordr7uilicenseproductkey', generateProductKey());
		}
		else 
			if (productKeyExists(nlapiGetFieldValue('custrecordr7uilicenseproductkey'))) {
				throw nlapiCreateError('REQUEST_ERROR', 'Product Key already exists', false);
			}
	}
	else {
		throw nlapiCreateError('FEATURE_UNAVAILABLE', 'Cannot trigger actions on anything other than create or edit', false);
	}
	//end userInsight request
}

function generateProductKey(){

	var productKey = '';
	
	while (productKey == '' || productKeyExists(productKey)) {
	
		var chars = 'BCDEFGHJKLMNPQRSTVWXYZ0123456789';
		var randomKey = '';
		for (var i = 0; i < 16; i++) {
			var rnum = Math.floor(Math.random() * chars.length);
			randomKey += chars.substring(rnum, rnum + 1);
			
			if (i == 3 || i == 7 || i == 11) {
				randomKey += '-';
			}
		}
		
		productKey = randomKey;
	}
	
	return productKey;
}

function productKeyExists(productKey){

	if (productKey != null && productKey != '') {
		var arrFilters = new Array();
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7uilicenseproductkey', null, 'is', productKey);
		
		var internalId = nlapiGetRecordId();
		if (internalId != null && internalId != '') {
			arrFilters[arrFilters.length] = new nlobjSearchFilter('internalid', null, 'noneof', internalId);
		}
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7userinsightlicense', null, arrFilters);
		
		if (arrSearchResults != null && arrSearchResults.length > 0) {
			return true;
		}
		
		return false;
	}
	
	return true;
}
