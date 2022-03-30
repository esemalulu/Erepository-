function afterSubmitRecord(type) {
	if(type == 'edit' || type == 'xedit' || type == 'create') {
		try {
			var approval_needed_valuesObj = JSON.parse(JSON.stringify(nlapiGetFieldValue("custrecord_approval_needed_values")));
			eval('var approval_needed_values = ' + approval_needed_valuesObj);
			nlapiLogExecution('DEBUG', "approval_needed_values", JSON.stringify(approval_needed_values));
			if(nlapiGetFieldValue("custrecord_is_approved")) {
				nlapiLogExecution('DEBUG', "custrecord_partner_ref_id", nlapiGetFieldValue("custrecord_partner_ref_id"));
				var parentRec = nlapiLoadRecord("vendor", nlapiGetFieldValue("custrecord_partner_ref_id"));
				if(approval_needed_values.Company_Name) {
					parentRec.setFieldValue('companyname', approval_needed_values.Company_Name);
				}
				if(approval_needed_values.Tax_ID) {
					parentRec.setFieldValue('custentitytax_id_c', approval_needed_values.Tax_ID);
				}
				if(approval_needed_values.Bank_Account) {
					parentRec.setFieldValue('custentityetailz_bank_acct_c', approval_needed_values.Bank_Account);
				}
				if(approval_needed_values.Billing_Address) {
					for(var i=0; i < parentRec.getLineItemCount('addressbook'); i++) {
						if(i+1 == parseInt(approval_needed_values.Billing_Address.default_billing_line)) {
							parentRec.setLineItemValue('addressbook', 'defaultbilling', i+1, 'T');
						}
					}
					parentRec.setLineItemValue('addressbook', 'attention', parseInt(approval_needed_values.Billing_Address.default_billing_line), approval_needed_values.Billing_Address.attention);
					parentRec.setLineItemValue('addressbook', 'addressee', parseInt(approval_needed_values.Billing_Address.default_billing_line), approval_needed_values.Billing_Address.addressee);
					parentRec.setLineItemValue('addressbook', 'addr1', parseInt(approval_needed_values.Billing_Address.default_billing_line), approval_needed_values.Billing_Address.addr1);
					parentRec.setLineItemValue('addressbook', 'addr2', parseInt(approval_needed_values.Billing_Address.default_billing_line), approval_needed_values.Billing_Address.addr2);
					parentRec.setLineItemValue('addressbook', 'city', parseInt(approval_needed_values.Billing_Address.default_billing_line), approval_needed_values.Billing_Address.city);
					parentRec.setLineItemValue('addressbook', 'dropdownstate', parseInt(approval_needed_values.Billing_Address.default_billing_line), approval_needed_values.Billing_Address.state);
					parentRec.setLineItemValue('addressbook', 'zip', parseInt(approval_needed_values.Billing_Address.default_billing_line), approval_needed_values.Billing_Address.zip);
					parentRec.setLineItemValue('addressbook', 'country', parseInt(approval_needed_values.Billing_Address.default_billing_line), approval_needed_values.Billing_Address.country);
				}
				if(approval_needed_values.Main_Email) {
					parentRec.setFieldValue('custentitymain_email_c', approval_needed_values.Main_Email);
				}
				if(approval_needed_values.Payment_Method) {
					parentRec.setFieldText('custentitypayment_method_c', approval_needed_values.Payment_Method);
				}
				if(approval_needed_values.ReOrder_Payment) {
					parentRec.setFieldText('custentitypayment_stocking_reorder_c', approval_needed_values.ReOrder_Payment);
				}
				nlapiSubmitRecord(parentRec, false, true);
			}
		} catch(ex) {
			nlapiLogExecution('DEBUG', "ERROR::", ex.message);
		}
	}
}