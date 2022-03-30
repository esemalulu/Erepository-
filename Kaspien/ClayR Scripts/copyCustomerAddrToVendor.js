/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Jul 2015     clayr
 *
 */

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
function beforeSubmitCopyAddress(type){

	try {
		
		if (type == 'create' || type == 'edit') {
			
			var recVendor = nlapiGetNewRecord();
			var customerId = recVendor.getFieldValue('custentitycustomer_internal_id');
			
			if (customerId) {
				
				var recCustomer = nlapiLoadRecord('customer',customerId);
						
				nlapiLogExecution('DEBUG', 'Copy Address to Vendor', 'type: ' + type + '; customerId: ' + customerId);

				for (var i = 1, len = recCustomer.getLineItemCount('addressbook')+1; i < len; i++) {
					
					var attention = recCustomer.getLineItemValue('addressbook','attention', i);
					var addressee = recCustomer.getLineItemValue('addressbook','addressee', i);
					var addr1 = recCustomer.getLineItemValue('addressbook','addr1', i);
					var addr2 = recCustomer.getLineItemValue('addressbook','addr2', i);
					var city = recCustomer.getLineItemValue('addressbook','city', i);
					var state = recCustomer.getLineItemValue('addressbook','state', i);
					var country = recCustomer.getLineItemValue('addressbook','country', i);
					var zipcode = recCustomer.getLineItemValue('addressbook','zip', i);
					var defaultbilling = recCustomer.getLineItemValue('addressbook','defaultbilling', i);
					var defaultshipping = recCustomer.getLineItemValue('addressbook','defaultshipping', i);
							
					recVendor.selectNewLineItem('addressbook');
					recVendor.setCurrentLineItemValue('addressbook','attention', attention);
					recVendor.setCurrentLineItemValue('addressbook','addressee', addressee);
					recVendor.setCurrentLineItemValue('addressbook','addr1', addr1);
					recVendor.setCurrentLineItemValue('addressbook','addr2', addr2);
					recVendor.setCurrentLineItemValue('addressbook','city', city);
					recVendor.setCurrentLineItemValue('addressbook','state', state);
					recVendor.setCurrentLineItemValue('addressbook','country', country);
					recVendor.setCurrentLineItemValue('addressbook','zip',zipcode);
					recVendor.setCurrentLineItemValue('addressbook','defaultbilling',defaultbilling);
					recVendor.setCurrentLineItemValue('addressbook','defaultshipping',defaultshipping);
					
					recVendor.commitLineItem('addressbook'); 
				}
			
			} else {
				customerId = 'na'; i = 0; addr1 = 'na'; defaultBilling = 'na';
			}
			
				nlapiLogExecution('DEBUG', 'Copy Address Line', 'customerId: ' + customerId + '; Line: ' + i + '; addr1: ' + addr1 + '; defaultbilling: ' + defaultbilling);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Update Address Zipcode', 'type: ' + type + '; customerId: ' + customerId +  
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
	
}
