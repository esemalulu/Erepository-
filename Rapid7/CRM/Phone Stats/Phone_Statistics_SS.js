/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Apr 2013     efagone
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
function beforeSubmit(type){
	
var fuzeID = nlapiGetFieldValue('custrecordr7phonefuzecallid');
	
	if (fuzeID == '' || fuzeID == null) {
		try {
			if (type == 'create' || type == 'copy') {
				if (hasDupe(nlapiGetFieldValue('custrecordr7phoneshoretelcallid'))) {
					throw nlapiCreateError('DUPLICATE_ERROR', 'Already Exists',
							true);
				}
			}

			this.type = type;
			this.oldRecord = nlapiGetOldRecord();
			this.updatedFields = nlapiGetNewRecord().getAllFields();

			var resolveCall = getNewFieldValue('custrecordr7phonestatsresolvecall');

			if (type == 'create' || resolveCall == 'T') {

				var company = getNewFieldValue('custrecordr7phonecompany');
				var contact = getNewFieldValue('custrecordr7phonecontact');

				if (((company == null || company == '') && (contact == null || contact == ''))
						|| (resolveCall == 'T')) {
					resolveNumber();

					nlapiSetFieldValue('custrecordr7phonestatsresolvecall', 'F');
				}

			}

		} catch (e) {
			if (e.getCode() == 'DUPLICATE_ERROR') {
				throw nlapiCreateError(e.getCode(), e.getDetails(), true);
				return;
			}
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error on phoneStats beforeSubmit',
					'Error: ' + e);
		}
	}
}

function resolveNumber(){
	
	var phone = getNewFieldValue('custrecordr7phonephonenumber');
	
	var arrResults = lookupPhone(phone);
	nlapiSetFieldValue('custrecordr7phonecompany', arrResults[0]);
	nlapiSetFieldValue('custrecordr7phonecontact', arrResults[1]);
	
	nlapiSetFieldValue('custrecordr7phonestatsresolvecall', 'F');
}

function hasDupe(callId){

	try {
		if (callId != null && callId != '') {
		
			var arrFilters = new Array();
			arrFilters[0] = new nlobjSearchFilter('custrecordr7phoneshoretelcallid', null, 'equalto', callId);
			
			var searchResults = nlapiSearchRecord('customrecordphonestatistics', null, arrFilters);
			
			if (searchResults != null && searchResults.length >= 1) {
				return true;
			}
		}
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Error checking for dupes', err);
		return false;
	}
	
	return false;
}

function lookupPhone(phone){

	if (phone != null && phone != '') {
		phone = phone.replace(/\D/g, "");

		//check contacts
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrSearchFilters[1] = new nlobjSearchFilter('phone', null, 'isnotempty');
		arrSearchFilters[2] = new nlobjSearchFilter('formulatext', null, 'is', phone);
		arrSearchFilters[2].setFormula("REGEXP_REPLACE({phone}, '\\D' , '')");
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('internalid', null, 'count');
		arrSearchColumns[1] = new nlobjSearchColumn('internalid', 'company', 'group');
		arrSearchColumns[2] = new nlobjSearchColumn('internalid', null, 'max');
		arrSearchColumns[3] = new nlobjSearchColumn('datecreated', 'company', 'max');
		arrSearchColumns[4] = new nlobjSearchColumn('type', 'company', 'max');
		arrSearchColumns[0].setSort(true);
		arrSearchColumns[3].setSort(false);
		
		var arrSearchResults = nlapiSearchRecord('contact', null, arrSearchFilters, arrSearchColumns);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			var searchResult = arrSearchResults[i];
			var columns = searchResult.getAllColumns();
			
			var companyType = searchResult.getValue(columns[4]);
			//had to do it this way as opposed to in criteria... netsuite is eff'd
			
			if (companyType != null && companyType != '' && companyType.toLowerCase() == 'customer') {
				if (arrSearchResults.length == 1 && searchResult.getValue(columns[0]) == '1') {
					return new Array(searchResult.getValue(columns[1]), searchResult.getValue(columns[2]));
				}
				else {
					return new Array(searchResult.getValue(columns[1]), '');
				}
			}
		}
		
		// now check just company
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrSearchFilters[1] = new nlobjSearchFilter('phone', null, 'isnotempty');
		arrSearchFilters[2] = new nlobjSearchFilter('formulatext', null, 'is', phone);
		arrSearchFilters[2].setFormula("REGEXP_REPLACE({phone}, '\\D' , '')");
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('internalid');
		arrSearchColumns[1] = new nlobjSearchColumn('datecreated').setSort(false);
		
		var arrSearchResults = nlapiSearchRecord('customer', null, arrSearchFilters, arrSearchColumns);
		
		if (arrSearchResults != null) {
			return new Array(arrSearchResults[0].getId(), '');
		}
		
	}
	
	return new Array('', '');
}

function getNewFieldValue(fieldId){
	// if the record is direct list edited or mass updated, run the script
	if (type == 'xedit') {
		// loop through the returned fields
		for (var i = 0; i < updatedFields.length; i++) {
			//nlapiLogExecution('DEBUG', 'field', updatedFields[i]);
			if (updatedFields[i] == fieldId) {
				return nlapiGetFieldValue(fieldId);
			}
		}
		return oldRecord.getFieldValue(fieldId);
	}
	else {
		return nlapiGetFieldValue(fieldId);
	}
}