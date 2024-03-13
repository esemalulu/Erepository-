function afterSubmit(){
	var aRecord = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
	
	var vendorId = aRecord.getFieldValue('custrecordr7vendornetsuiteauthvendo');
	
	var pwd = aRecord.getFieldValue('custrecordr7vendornetsuiteauthpwd');
	
	nlapiLogExecution('DEBUG','In here: Vendor Id',vendorId);
	
	if(pwd!=null && pwd.length>=5 && vendorId!=null){
		
		var vendorRecord = nlapiLoadRecord('vendor',vendorId);
		
		var vendorName = vendorRecord.getFieldValue('entityid');
		
		nlapiLogExecution('DEBUG','In here: Vendor Id',vendorId);
		nlapiLogExecution('DEBUG','In here: Password',pwd);
		
		vendorRecord.setFieldValue('password',pwd);
		
		vendorRecord.setFieldValue('password2',pwd);
		
		nlapiLogExecution('DEBUG','SetPasswordTo',pwd);
		nlapiSubmitRecord(vendorRecord);
		var email = "The " + vendorName +  " password was successfully changed to <some password> on " + nlapiDateToString(new Date()) + "\n" + 
					"This change should have been automatically replicated in the local authentication document "+
					" file on the server.\n Next scheduled change is at "+ nlapiDateToString(nlapiAddDays(new Date(),30)) +
					"\nThis email is for your records. \n\nThanks";
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser,adminUser,'Vendor Netsuite PWD Change',email,'derek_zanga@rapid7.com');
	}
}
