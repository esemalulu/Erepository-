/*
This script is used for posting calls from Fuze DB to NetSuite.

GET-method is used for getting the last FuzeCallId from NetSuite.
This ID will be used by Java-service for limiting the data volume got from Fuze DB.

POST-method accepts Fuze calls and submits them to NetSuite.
*/

// If this var is 1 then script will submit null instead of inactive employee.
// In other cases script will not submit calls if employee is inactive.
var trackInactives = 1;

// Get the last FuzeCallId
function get(dataIn) {
	var filter = null;
	var lastId = null;
				 
	
	if (dataIn.lastKnownId != null) {
		filter = new nlobjSearchFilter( 'custrecordr7phonefuzecallid', null, 'greaterthan',  dataIn.lastKnownId)
	} else {
		filter = new nlobjSearchFilter( 'custrecordr7phonefuzecallid', null, 'greaterthan',  lastId);
	}
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn( 'custrecordr7phonefuzecallid', null, 'max' );
	
	var searchresults = nlapiSearchRecord( 'customrecordphonestatistics', null, filter, columns );
	
	if (searchresults.length > 0) {
		if (searchresults[0].getValue(columns[0]).length > 0) {
			return parseInt(searchresults[0].getValue(columns[0]));
		} else {
			return lastId;
		}
	}

	return lastId;
}

// dataIn is array of calls.
// Fields of calls:
// 	- fuzeCallId
//	- extension
// 	- phoneNumber
// 	- phoneTypeId
// 	- duration
// 	- date
// 	- time
function post(dataIn) {
	var dataOut = new Object();

	if (Object.prototype.toString.call(dataIn) === '[object Array]') {
		dataOut = createRecords(dataIn);
	} else {
		dataOut = createRecord(dataIn);
	}

	return dataOut;
}

function getEmployeeAsContact(extension) {
	var contact = null;
	
	var employee = getEmployee(extension);
	if (employee != null) {
		contact = getContactByPhone(employee.phone);
	}
	
	return contact;
}

function getContactByPhone(phoneNumber) {
	var filters = new Array();
	filters.push(new nlobjSearchFilter( 'phone', null, 'is',  phoneNumber));
	filters.push(new nlobjSearchFilter( 'isinactive', null, 'is',  'F'));
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn( 'internalid' ));
	columns.push(new nlobjSearchColumn( 'entityid' ));
	columns.push(new nlobjSearchColumn( 'phone' ));
	columns.push(new nlobjSearchColumn( 'company'));
	columns.push(new nlobjSearchColumn( 'isinactive' ));
	
	var contact = null;
	var searchResults = nlapiSearchRecord( 'contact', null, filters, columns);
	if (searchResults != null) {
		for (var i=0;i<searchResults.length;i++) {
			contact = new Object();
			contact.id = searchResults[i].getValue('internalid');
			contact.inactive = searchResults[i].getValue('isinactive');
			contact.entityid = searchResults[i].getValue('entityid');
			contact.companyId = searchResults[i].getValue('company');
			contact.phone = searchResults[i].getValue('phone');
		}
	}
	
	return contact;
}

function getEmployee(extension) {
	if (extension == null) {
		return null;
	}
	var phoneNumber = extension.replace(/[^\d]/g,'');
	
	var filters = new Array();
	
	// For Fuze System, this was updated to employee fuze extension field, instead of Shoretel extension field
	filters.push(new nlobjSearchFilter( 'custentityr7phonefuzeextension', null, 'is',  phoneNumber));
	filters.push(new nlobjSearchFilter( 'isinactive', null, 'is',  'F'));
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn( 'internalid' ));
	columns.push(new nlobjSearchColumn( 'isinactive' ));
	columns.push(new nlobjSearchColumn( 'phone' ));
	
	var searchResults = nlapiSearchRecord( 'employee', null, filters, columns);
	
	var employee = null;
	if (searchResults != null) {
		for (var i=0;i<searchResults.length;i++) {
			if (searchResults[i].getValue('isinactive') == 'F') {
				employee = new Object();
				employee.id = searchResults[i].getValue('internalid');
				employee.inactive = searchResults[i].getValue('isinactive');
				employee.phone = searchResults[i].getValue('phone');
			}
		}
	}
	
	return employee;
}

/*
  Returns contact by given normalized phone number.
*/
function getContact(phone) {
	// We don't need lookups for contacts anymore.
	return null;
	
	if (phone == undefined) {
		return null;
	}
	// For Fuze System, this was updated to 6 instead of 4 for Shoretel System
	if (phone.length == 6) {
		return getEmployeeAsContact(phone);
	}
	
	var filter = new nlobjSearchFilter('custentityr7normalizedphone', null, 'is', phone);
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn( 'internalid' ));
	columns.push(new nlobjSearchColumn( 'email'));
	columns.push(new nlobjSearchColumn( 'company'));
	columns.push(new nlobjSearchColumn( 'custentityr7normalizedphone'));
	
	var searchResults = nlapiSearchRecord( 'contact', null, filter, columns );
	var contact = null;
	
	if (searchResults != null) {
		for (var i=0;i<searchResults.length;i++) {
			contact = new Object();
			contact.id = searchResults[i].getValue('internalid');
			contact.companyId = searchResults[i].getValue('company');
			contact.email = searchResults[i].getValue('email');
		}
	}

	return contact;
}

/*
  Returns customer (company) by given normalized phone number.
*/
function getCustomer(phone) {
	// We don't need lookups for contacts anymore.
	return null;
	
	if (phone == undefined) {
		return null;
	}
	var filter = new nlobjSearchFilter('custentityr7normalizedphone', null, 'is', phone);
	
	var columns = new Array();
	columns.push(new nlobjSearchColumn( 'internalid' ));
	columns.push(new nlobjSearchColumn( 'email'));
	columns.push(new nlobjSearchColumn( 'custentityr7normalizedphone'));
	
	var searchResults = nlapiSearchRecord( 'customer', null, filter, columns );
	var customer = null;
	
	if (searchResults != null) {
		for (var i=0;i<searchResults.length;i++) {
			customer = new Object();
			customer.id = searchResults[i].getValue('internalid');
			customer.email = searchResults[i].getValue('email');
			customer.phone = searchResults[i].getValue('custentityr7normalizedphone');
		}
	}

	return customer;
}

/*
  Accepts list of calls to store.
  Fields of each call:
  - fuzeCallId
  - extension
  - duration
  - date
  - time
  - phoneTypeId
  - phoneNumber
  
  Returns list the results of storing for each call.
  Fields of each result:
  - fuzeCallId
  - employeeId
  - contactId
  - customerId
  - statusDescription
  - status
    0 - success
    1 - general error
    2 - inactive employee
	3 - error while searching employee
	4 - error while searching contact
	5 - error while searching customer
*/
function createRecords(dataIn) {
	var ret = new Array();

	for (var i = 0; i < dataIn.length; i++) {
		ret.push(createRecord(dataIn[i]));
	}
	
	return ret;
}

/*
  Accepts one call to store.
  Fields:
  - fuzeCallId
  - extension
  - duration
  - date
  - time
  - phoneTypeId
  - phoneNumber
  
  Returns the result of storing given call.
  Fields:
  - fuzeCallId
  - employeeId
  - contactId
  - customerId
  - statusDescription
  - status
    0 - success
    1 - general error
    2 - inactive employee
	3 - error while searching employee
	4 - error while searching contact
	5 - error while searching customer
*/
function createRecord(dataIn) {
	var result = new Object();
	result.fuzeCallId = null;
	result.employeeId = null;
	result.contactId = null;
	result.customerId = null;
	result.statusDescription = '';
	result.status = null;
			
	var resolveTime = Date.now();
	try {
		var employee = getEmployee(dataIn.extension);
	} catch (err) {
		result.fuzeCallId = dataIn.fuzeCallId;
		result.statusDescription += 'getEmployee(' + dataIn.extension + ') error: ' + err.message + '. ';
		result.status = 3;
		//ret.push(result);
		//continue;
	}
	var employeeId = null;
	var contactId = null;
	var customerId = null;
	
	// Detecting if employee is active
	if (employee != null) {
		employeeId = employee.id;
		if (employee.inactive != 'F') {
			// We don't want to store calls to/from inactive employees
			result.fuzeCallId = dataIn.fuzeCallId;
			result.employeeId = employeeId;
			employeeId = null;
			result.contactId = contactId;
			result.customerId = customerId;
			result.statusDescription += 'Inactive employee found by given Fuze extension (' + dataIn.extension + ')' + '. ';
			result.status = 2;
			//ret.push(result);
			if (trackInactives != 1) {
				return result;
			}
		}
	} else {
		result.fuzeCallId = dataIn.fuzeCallId;
		result.employeeId = null;
		employeeId = null;
		result.contactId = contactId;
		result.customerId = customerId;
		result.statusDescription += 'Didn\'t find employee by given Fuze extension (' + dataIn.extension + ')' + '. ';
		result.status = 2;
	}
	
	try {
		var contact = getContact(dataIn.phoneNumber);
	} catch (err) {
		result.fuzeCallId = dataIn.fuzeCallId;
		result.statusDescription += 'getContact(' + dataIn.phoneNumber + ') error: ' + err.message + '. ';
		result.status = 4;
		//ret.push(result);
		//continue;
	}
	
	if (contact != null) {
		contactId = contact.id;
		if (contact.companyId != null) {
			customerId = contact.companyId;
		} else {
			try {
				var customer = getCustomer(dataIn.phoneNumber);
			} catch (err) {
				result.fuzeCallId = dataIn.fuzeCallId;
				result.statusDescription += 'getCustomer(' + dataIn.phoneNumber + ') error: ' + err.message + '. ';
				result.status = 5;
				//ret.push(result);
				//continue;
			}
			if (customer != null) {
				customerId = customer.id;
			}
		}
	}
	result.resolveTime = Date.now() - resolveTime;
	
	var record = nlapiCreateRecord('customrecordphonestatistics');
	
	record.setFieldValue('custrecordr7phonefuzecallid', dataIn.fuzeCallId);
	record.setFieldValue('custrecordr7phonetimeofcall', definedNull(dataIn.time));
	record.setFieldValue('custrecordr7phonedateofcall', definedNull(dataIn.date));

	var extension = dataIn.extension;
	if (extension != undefined && extension != null) {
		extension = extension.replace(/[^\d]/g, '');
	}
	record.setFieldValue('custrecordr7phonefuzeextension', definedNull(extension));
	
	if (definedNull(dataIn.phoneNumber) != null) {
		/*result.debugPhoneNumber = dataIn.phoneNumber;
		result.debugNumLength = dataIn.phoneNumber.length;
		result.debugIsTrue = (dataIn.phoneNumber.length == 4) && (contact != null);
		return result;
		*/
		
		// For Fuze System, 4 was updated to 6
		if ((dataIn.phoneNumber.length == 6) && (contact != null)) {
			record.setFieldValue('custrecordr7phonephonenumber', definedNull(contact.phone));
		} else {
			record.setFieldValue('custrecordr7phonephonenumber', definedNull(dataIn.phoneNumber));
		}
	} else {
		record.setFieldValue('custrecordr7phonephonenumber', null);
	}
	
	// Directon of the call:
	// 1 - Inbound
	// 2 - Outbound
	// 3 - Conf call ?
	record.setFieldValue('custrecordr7phonetype', definedNull(dataIn.phoneTypeId));
	record.setFieldValue('custrecordr7phoneemployee', definedNull(employeeId));
	record.setFieldValue('custrecordr7phonecontact', definedNull(contactId));
	record.setFieldValue('custrecordr7phonecompany', definedNull(customerId));
	if (definedNull(dataIn.duration) == null) {
		record.setFieldValue('custrecordr7phonecallduration', null);
	} else {
		record.setFieldValue('custrecordr7phonecallduration', (dataIn.duration/60).toFixed(2));
	}
	
	result.fuzeCallId = dataIn.fuzeCallId;
	result.employeeId = employeeId;
	result.contactId = contactId;
	result.customerId = customerId;
	result.record = record;
	
	try {
		var submitTime = Date.now();
		var id = nlapiSubmitRecord(record, true, true);
		result.submitTime = Date.now() - submitTime;
		if (result.status == null) {
			result.statusDescription += 'OK' + '. ';
			result.status = 0;
		}
	} catch(err) {
		result.statusDescription += 'nlapiSubmitRecord error: (' + err.code + ') ' + err.message;
		result.status = 1;
	}
	
	return result;
}

function definedNull(param) {
	if (param == undefined) {
		return null;
	}
	
	return param;
}