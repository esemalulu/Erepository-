

function afterSubmit(type){

	var userId = nlapiGetUser();
	var roleId = nlapiGetRole();
	
	 if (type != 'delete') {
	 	try {
	 		var rec = nlapiLoadRecord('customrecordr7competitiveproductdata', nlapiGetRecordId());
	 		
	 		var updateTotal = rec.getFieldValue('custrecordr7proddate_updateopptotal');
	 		if (updateTotal == 'T') {
	 			var oppId = rec.getFieldValue('custrecordr7competproddataopportunity');
	 			nlapiLogExecution('DEBUG', 'updating opp total', nlapiGetRecordId());
	 			updateOppTotal(oppId);
	 		}
	 		
	 	} 
	 	catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	 		nlapiSendEmail(adminUser, adminUser, 'Error ProdData afterSubmit', 'Error: ' + e);
	 	}
	 }
}

function beforeSubmit(type){

	var userId = nlapiGetUser();
	var roleId = nlapiGetRole();

    if (type != 'delete') {
    
        try {
            this.oldRecord = nlapiGetOldRecord();
            this.updatedFields = nlapiGetNewRecord().getAllFields();
			
			nlapiSetFieldValue('custrecordr7proddate_updateopptotal', 'F');
			
			var amount = getNewFieldValue('custrecordr7competproddataprojtotal');
			var oldAmount = null;
			if (oldRecord != null){
				oldAmount = oldRecord.getFieldValue('custrecordr7competproddataprojtotal');
			}
			
			if (amount != oldAmount){
				nlapiSetFieldValue('custrecordr7proddate_updateopptotal', 'T');
			}
			
        } 
        catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
            nlapiSendEmail(adminUser, adminUser, 'Error ProdData beforeSubmit', 'Error: ' + e);
        }
    }
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