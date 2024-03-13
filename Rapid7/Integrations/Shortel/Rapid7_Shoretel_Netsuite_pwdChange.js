function afterSubmit(){
	//Internal Id of shoretel username: 121014

	var aRecord = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
	//var vendorId = aRecord.getFieldValue('');

	var pwd = aRecord.getFieldValue('custrecordr7thekeytothevault');


	if(pwd!=null && pwd.length>=5){

		var vendorRecord = nlapiLoadRecord('vendor',121014);

		vendorRecord.setFieldValue('password',pwd);

		vendorRecord.setFieldValue('password2',pwd);

		nlapiLogExecution('DEBUG','SetPasswordTo',pwd);

		nlapiSubmitRecord(vendorRecord);

		var email = "The Shoretel-Netsuite Phonesystem password was successfully changed to <some password> on " + nlapiDateToString(new Date()) + "\n" + 
					"This change should have been automatically replicated in the AuthenticationCertificate.xml "+
					" file on the server.\n Next scheduled change is at "+ nlapiDateToString(nlapiAddDays(new Date(),30)) +
					"\nThis email is for your records. \n\nThanks";
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser,adminUser,'Shoretel Netsuite PWD Change',email);
	}
}
