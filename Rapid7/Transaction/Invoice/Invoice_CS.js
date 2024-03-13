/*
 * @author efagone
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function pageInit(type){
	if (type == 'create' || type =='copy'){
		// Get the internal id of the customer   
		var customerId = nlapiGetFieldValue('entity');
		var partnerId = nlapiGetFieldValue('partner');
		var partnerDealType = nlapiGetFieldValue('custbodyr7partnerdealtype');
		if(customerId && customerId != ''){
			// Get Billing Contact and Send Invoices Via Email fields from Customer
			var fieldsToLookup = ['custentity_tt_billing_contact','custentity_tt_send_invoice_email'];
			/*
			if(partnerId && partnerId !=''){ // If partner, source Partner Record instead of customer
				var fieldValues = nlapiLookupField('partner',partnerId,fieldsToLookup);
			}
			else{
				var fieldValues = nlapiLookupField('entity',customerId,fieldsToLookup);
			}*/
			var fieldValues = nlapiLookupField('entity',customerId,fieldsToLookup);
			var billingContact = fieldValues.custentity_tt_billing_contact;
			var sendInvoicesChecked = fieldValues.custentity_tt_send_invoice_email;
			nlapiLogExecution('DEBUG', 'Billing Contact', billingContact);
			nlapiLogExecution('DEBUG', 'Send Invoice Checked', sendInvoicesChecked);
			// Set Billing Contact on Invoice to match Billing Contact on Customer 
			if (billingContact != "" && billingContact !=''){
				nlapiSetFieldValue('custbody_tt_billing_contact', billingContact); 
			}else{ 
				nlapiSetFieldValue('custbody_tt_billing_contact', ''); 
			}
			// If "Send Invoices Via Email" is checked on Customer then mark "Invoice To Be Emailed" true on Invoice 
			if (sendInvoicesChecked == "T"){
				nlapiSetFieldValue('custbody_tt_invoice_to_be_email', 'T'); 
			}else{ 
				nlapiSetFieldValue('custbody_tt_invoice_to_be_email', 'F'); 
			}
			
		}
	}
}



function saveRecord(){

	var tranIsVSOEBundle = nlapiGetFieldValue('tranisvsoebundle');

	if (tranIsVSOEBundle == 'F') {
		return confirm('Transaction Is VSOE Bundle is unchecked. Are you sure you would like to save this Invoice?');
	}
	
	return true;
	
}

function executeRatableScript(invoiceId){
	
	var params = new Array();
	params['custparam_scriptid'] = 955;
	params['custscriptr7ratscripttrantoproccess'] = invoiceId;
		
	nlapiRequestURL(nlapiResolveURL('SUITELET', 'customscriptr7schedulescriptsuitlet', 'customdeployr7schedulescriptsuitelet', false), params);
	
	alert('Script is scheduled. Please allow a few minutes for system to process');
}


function fieldChange(type, name){
	try{
		
		//if the customer has changed the logic runs again
		if(name == "entity"){

			nlapiLogExecution('ERROR', ' script log ',"this only a test2");
			var customerId = nlapiGetFieldValue('entity');
			if(customerId && customerId != ""){
				// Get Billing Contact and Send Invoices Via Email fields from Customer
				var fieldsToLookup = ['custentity_tt_billing_contact','custentity_tt_send_invoice_email'];
				var fieldValues = nlapiLookupField('entity',customerId,fieldsToLookup);
				var billingContact = fieldValues.custentity_tt_billing_contact;
				var sendInvoicesChecked = fieldValues.custentity_tt_send_invoice_email;
				nlapiLogExecution('DEBUG', 'Billing Contact', billingContact);
				nlapiLogExecution('DEBUG', 'Send Invoice Checked', sendInvoicesChecked);
				// Set Billing Contact on Invoice to match Billing Contact on Customer 
				if (billingContact != "" && billingContact !=''){
					nlapiSetFieldValue('custbody_tt_billing_contact', billingContact); 
				}else{ 
					nlapiSetFieldValue('custbody_tt_billing_contact', ''); 
				}
				// If "Send Invoices Via Email" is checked on Customer then mark "Invoice To Be Emailed" true on Invoice 
				if (sendInvoicesChecked == "T"){
					nlapiSetFieldValue('custbody_tt_invoice_to_be_email', 'T'); 
				}else{ 
					nlapiSetFieldValue('custbody_tt_invoice_to_be_email', 'F'); 
				}
			}
			

		}
	}
	catch(e){	
		nlapiLogExecution('ERROR', 'FieldChange', e);	
	}
}