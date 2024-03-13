/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       08 Feb 2015     mburstein
 *
 *Server Side script executed on EDU - Higher Education Program (customrecordr7eduprogram) record submits.
 *	Before Submit:
 *		Set Customer - If an entity record exists with domain, set customer field to that record.
 *		Set Contact - If contact record exists with university email then set contact field to that record.
 */
/* MB - 4/1/15 - Added check for customer name matching edu name.
		 * If the user provided a name of the EDU, also check to make sure the unique ID doesn't exist.
		 * 	This should solve the following error:
		 * 		"A customer record with this ID already exists. You must enter a unique customer ID for each record you create."
		 */
/* MB - 5/28/15 - Added check for contact name matching edu contact name.
	 * If the user provided a name, also check to make sure the unique ID doesn't exist.
	 * 	This should solve the following error:
	 * 		"A contact record with this ID already exists. You must enter a unique customer ID for each record you create."
	 */
/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord customrecordr7eduprogram
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function beforeLoad(type, form, request){
	
}

/**
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
	if (type == 'create' || type == 'edit') {
		var email = nlapiGetFieldValue('custrecordr7eduprogrameduemail');
		if (email != null && email != ''){
			var customerId = nlapiGetFieldValue('custrecordr7eduprogramcustomer');		
			// If Customer is empty then find current record using email domain
			if (customerId == null || customerId == '') {	
				var domain = email.substr(email.indexOf('@'));
				nlapiLogExecution('DEBUG','Domain',domain);
				var eduEntityName = nlapiGetFieldValue('custrecordr7eduprogramuniversityname'); //Name of the university or college.
				// Search for the lowest internal ID of customer record with matching domain
				var previousCustomerId = findCustomerFromDomain(domain,eduEntityName);
				if (previousCustomerId) {
					nlapiLogExecution('DEBUG','Set Customer',previousCustomerId);
					nlapiSetFieldValue('custrecordr7eduprogramcustomer',previousCustomerId); // Set customer field if match found
					customerId = previousCustomerId;
				}				
			}
			
			var contactId = nlapiGetFieldValue('custrecordr7eduprogramcontact');
			// If contact is empty and customer is not then find current contact using email (or first/last)
			if ( (contactId == null || contactId == '') && customerId != null && customerId != '') {
				var eduFirstName = nlapiGetFieldValue('custrecordr7eduprogramfirstname'); // First name of program participant
				var eduLastName = nlapiGetFieldValue('custrecordr7eduprogramlastname'); // Last name of program participant
				var previousContactId = findContactFromEmail(email,customerId,eduFirstName,eduLastName);
				if (previousContactId){
					nlapiLogExecution('DEBUG','Set Contact',previousContactId);
					nlapiSetFieldValue('custrecordr7eduprogramcontact',previousContactId); // Set Contact Field if match found
				}
			}	
		}
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function afterSubmit(type){
  
}

/**
 * Search for customer records where email domain matches EDU record
 * @param domain
 */
function findCustomerFromDomain(domain,eduEntityName){
	if (domain != null && domain != '') {
		
		var arrFilters = [];
		arrFilters[0] = new nlobjSearchFilter('formulatext', null, 'is', domain);
		arrFilters[0].setFormula("SUBSTR({email}, INSTR({email}, '@'))");
		
		/* MB - 4/1/15 - Added check for customer name matching edu name.
		 * If the user provided a name of the EDU, also check to make sure the unique ID doesn't exist.
		 * 	This should solve the following error:
		 * 		"A customer record with this ID already exists. You must enter a unique customer ID for each record you create."
		 */
		if(eduEntityName != null && eduEntityName != ''){
			arrFilters[0].setOr(true);
			arrFilters[0].setLeftParens(1);
			arrFilters[1] = new nlobjSearchFilter('formulatext', null, 'is', eduEntityName);
			arrFilters[1].setFormula('{entityid}');
			arrFilters[1].setRightParens(1);
		}
		
		var arrColumns = [];
		arrColumns[0] = new nlobjSearchColumn('internalid',null,'min');
		
		var arrResults = nlapiSearchRecord('customer', null, arrFilters,arrColumns);
		// Return the record with the min internal ID
		if (arrResults){
			return arrResults[0].getValue(arrColumns[0]);
		}
		else{
			return false;
		}
	}
}

/**
 * Search for Contact record where email and customer matches EDU record
 * @param email
 * @param customerId
 */
function findContactFromEmail(email,customerId,eduFirstName,eduLastName){
	
	var arrFilters = [];
	arrFilters[0] = new nlobjSearchFilter('company', null, 'is', customerId);
	arrFilters[1] = new nlobjSearchFilter('email', null, 'is', email);
	
	/* MB - 5/28/15 - Added check for contact name matching edu contact name.
	 * If the user provided a name, also check to make sure the unique ID doesn't exist.
	 * 	This should solve the following error:
	 * 		"A contact record with this ID already exists. You must enter a unique customer ID for each record you create."
	 */
	if (eduFirstName != null && eduFirstName != '' && eduLastName != null && eduLastName != ''){
		arrFilters[1].setOr(true);
		arrFilters[1].setLeftParens(1);
		arrFilters[2] = new nlobjSearchFilter('formulatext', null, 'is', eduFirstName);
		arrFilters[2].setFormula('{firstname}');
		arrFilters[3] = new nlobjSearchFilter('formulatext', null, 'is', eduLastName);
		arrFilters[3].setFormula('{lastname}');
		arrFilters[3].setRightParens(1);
	}
	
	var arrColumns = [];
	arrColumns[0] = new nlobjSearchColumn('internalid',null,'min');
	
	var arrResults = nlapiSearchRecord('contact', null, arrFilters,arrColumns);
	// Return the record with the min internal ID
	if (arrResults){
		return arrResults[0].getValue(arrColumns[0]);
	}
	else{
		return false;
	}
}
