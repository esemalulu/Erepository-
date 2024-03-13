/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Dec 2012     efagone
 *
 */

/*
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
	
	nlapiLogExecution('DEBUG', 'running afterSubmit', 'yup');
	nlapiLogExecution('DEBUG', 'type', 'type');
	if (type != 'delete') {
		var rec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		
		var processed = rec.getFieldValue('custrecordr7employeecontactinfoprocessed');
		var autoUpdate = rec.getFieldValue('custrecordr7empcontact_autoupdate');
		nlapiLogExecution('DEBUG', 'autoUpdate', autoUpdate);
		if (autoUpdate == 'T') {
		
			var formType = rec.getFieldValue('custrecordr7employeecontactinfotype');
			nlapiLogExecution('DEBUG', 'formType', formType);
			switch (formType) {
				case '1':
					updateContactInfo(rec);
					nlapiLogExecution('DEBUG', 'marking complete', 'yup');
					markComplete();
					break;
				case '3':
					updateDirectDepositInfo(rec);
					nlapiLogExecution('DEBUG', 'marking complete', 'yup');
					markComplete();
					break;
			}
						
		}
		
	}
	
}

function updateContactInfo(rec){

	try {
	
		var employeeId = rec.getFieldValue('custrecordr7empcontactinfoemployee');
		nlapiLogExecution('DEBUG', 'employeeId', employeeId);
		if (employeeId != null && employeeId != '') {
			var recEmployee = nlapiLoadRecord('employee', employeeId);
			
			cleanEmployeeList(recEmployee, 'addressbook');
			
			recEmployee.selectNewLineItem('addressbook');
			recEmployee.setCurrentLineItemValue('addressbook', 'defaultbilling', 'T');
			recEmployee.setCurrentLineItemValue('addressbook', 'defaultshipping', 'T');
			recEmployee.setCurrentLineItemValue('addressbook', 'label', rec.getFieldValue('custrecordr7empcontactinfostreet'));
			recEmployee.setCurrentLineItemValue('addressbook', 'addressee', recEmployee.getFieldValue('firstname') + ' ' + recEmployee.getFieldValue('lastname'));
			recEmployee.setCurrentLineItemValue('addressbook', 'phone', rec.getFieldValue('custrecordr7empcontactinfohomephone'));
			recEmployee.setCurrentLineItemValue('addressbook', 'addr1', rec.getFieldValue('custrecordr7empcontactinfostreet'));
			recEmployee.setCurrentLineItemValue('addressbook', 'city', rec.getFieldValue('custrecordr7empcontactinfocity'));
			recEmployee.setCurrentLineItemText('addressbook', 'state', rec.getFieldText('custrecordr7empcontactinfostate'));
			recEmployee.setCurrentLineItemValue('addressbook', 'zip', rec.getFieldValue('custrecordr7empcontactinfozipcode'));
			recEmployee.setCurrentLineItemText('addressbook', 'country', rec.getFieldText('custrecordr7employeecontactinfocountry'));
			recEmployee.commitLineItem('addressbook');
			
			recEmployee.setFieldValue('homephone', rec.getFieldValue('custrecordr7empcontactinfohomephone'));
			recEmployee.setFieldValue('mobilephone', rec.getFieldValue('custrecordr7empcontactinfomobilephone'));
			recEmployee.setFieldValue('custentityr7employeepersonalemail', rec.getFieldValue('custrecordr7employeecontactpersonalemail'));
			
			nlapiSubmitRecord(recEmployee);
			nlapiLogExecution('DEBUG', 'submitted employee', employeeId);
		}
		
		
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Could not update employee contact information', e);
		throw nlapiCreateError('UNEXPECTED ERROR', 'Something went wrong ' + e);
	}
	
}

function updateDirectDepositInfo(rec){

	try {
	
		var employeeId = rec.getFieldValue('custrecordr7empcontactinfoemployee');
		
		if (employeeId != null && employeeId != '') {
			var recEmployee = nlapiLoadRecord('employee', employeeId);
			
			cleanEmployeeList(recEmployee, 'directdeposit');
			
			recEmployee.selectNewLineItem('directdeposit');
			var savingsAccount = (rec.getFieldValue('custrecordr7employeecontactinfodd1type') == 2) ? 'T' : 'F';
			recEmployee.setCurrentLineItemValue('directdeposit', 'savingsaccount', savingsAccount);
			recEmployee.setCurrentLineItemValue('directdeposit', 'directdeposit', 'T');
			recEmployee.setCurrentLineItemValue('directdeposit', 'accountprenoted', 'T');
			recEmployee.setCurrentLineItemValue('directdeposit', 'bankname', rec.getFieldValue('custrecordr7employeecontactinfodd1bank'));
			recEmployee.setCurrentLineItemValue('directdeposit', 'bankroutingnumber', rec.getFieldValue('custrecordr7employeecontactinfodd1route'));
			recEmployee.setCurrentLineItemValue('directdeposit', 'bankaccountnumber', rec.getFieldValue('custrecordr7employeecontactinfodd1acctnu'));
			recEmployee.setCurrentLineItemValue('directdeposit', 'netaccount', rec.getFieldValue('custrecordr7employeecontactinfodd1netamt'));
			if (rec.getFieldValue('custrecordr7employeecontactinfodd1netamt') == 'F') {
				recEmployee.setCurrentLineItemValue('directdeposit', 'amount', rec.getFieldValue('custrecordr7employeecontactinfodd1fixamn'));
			}
			recEmployee.commitLineItem('directdeposit');
			
			if (rec.getFieldValue('custrecordr7employeecontactinfodd2bank') != null && rec.getFieldValue('custrecordr7employeecontactinfodd2bank') != '') {
			
				recEmployee.selectNewLineItem('directdeposit');
				var savingsAccount = (rec.getFieldValue('custrecordr7employeecontactinfodd2type') == 2) ? 'T' : 'F';
				recEmployee.setCurrentLineItemValue('directdeposit', 'savingsaccount', savingsAccount);
				recEmployee.setCurrentLineItemValue('directdeposit', 'directdeposit', 'T');
				recEmployee.setCurrentLineItemValue('directdeposit', 'accountprenoted', 'T');
				recEmployee.setCurrentLineItemValue('directdeposit', 'bankname', rec.getFieldValue('custrecordr7employeecontactinfodd2bank'));
				recEmployee.setCurrentLineItemValue('directdeposit', 'bankroutingnumber', rec.getFieldValue('custrecordr7employeecontactinfodd2route'));
				recEmployee.setCurrentLineItemValue('directdeposit', 'bankaccountnumber', rec.getFieldValue('custrecordr7employeecontactinfodd2acctnu'));
				recEmployee.setCurrentLineItemValue('directdeposit', 'netaccount', rec.getFieldValue('custrecordr7employeecontactinfodd2netamt'));
				if (rec.getFieldValue('custrecordr7employeecontactinfodd2netamt') == 'F') {
					recEmployee.setCurrentLineItemValue('directdeposit', 'amount', rec.getFieldValue('custrecordr7employeecontactinfofixamn'));
				}
				recEmployee.commitLineItem('directdeposit');
				
			}
			
			if (rec.getFieldValue('custrecordr7employeecontactinfodd3bank') != null && rec.getFieldValue('custrecordr7employeecontactinfodd3bank') != '') {
			
				recEmployee.selectNewLineItem('directdeposit');
				var savingsAccount = (rec.getFieldValue('custrecordr7employeecontactinfodd3type') == 2) ? 'T' : 'F';
				recEmployee.setCurrentLineItemValue('directdeposit', 'savingsaccount', savingsAccount);
				recEmployee.setCurrentLineItemValue('directdeposit', 'directdeposit', 'T');
				recEmployee.setCurrentLineItemValue('directdeposit', 'accountprenoted', 'T');
				recEmployee.setCurrentLineItemValue('directdeposit', 'bankname', rec.getFieldValue('custrecordr7employeecontactinfodd3bank'));
				recEmployee.setCurrentLineItemValue('directdeposit', 'bankroutingnumber', rec.getFieldValue('custrecordr7employeecontactinfodd3route'));
				recEmployee.setCurrentLineItemValue('directdeposit', 'bankaccountnumber', rec.getFieldValue('custrecordr7employeecontactinfodd3acctnu'));
				recEmployee.setCurrentLineItemValue('directdeposit', 'netaccount', rec.getFieldValue('custrecordr7employeecontactinfodd3netamt'));
				if (rec.getFieldValue('custrecordr7employeecontactinfodd3netamt') == 'F') {
					recEmployee.setCurrentLineItemValue('directdeposit', 'amount', rec.getFieldValue('custrecordr7employeecontactinfodd3fixamn'));
				}
				recEmployee.commitLineItem('directdeposit');
				
			}
			
			nlapiSubmitRecord(recEmployee);
			
		}
		
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Could not update employee direct deposit information', e);
		throw nlapiCreateError('UNEXPECTED ERROR', 'Something went wrong ' + e);
	}
	
}

function markComplete(){

	var rec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
	rec.setFieldValue('custrecordr7employeecontactinfoprocessed', 'T');
	rec.setFieldValue('custrecordr7empcontact_autoupdate', 'F');
	nlapiSubmitRecord(rec);
}

function cleanEmployeeList(recEmployee, list){
	
	while (recEmployee.getLineItemCount(list) > 0) {
		recEmployee.removeLineItem(list, 1);
	}
	
	nlapiLogExecution('DEBUG', 'so fresh', 'and so clean');
	return recEmployee;
}

