function reSubmit(){
	
	//Searching for Metasploit License Records which are pending submission
	var searchFilters = new nlobjSearchFilter('custrecordr7mslicensependingsubmission',null,'is','T');
	var results = nlapiSearchRecord('customrecordr7metasploitlicensing',null,searchFilters);
	
	for(var i=0;results!=null && i<results.length;i++){
		var record = nlapiLoadRecord('customrecordr7metasploitlicensing',results[i].getId());
		var newPurchaseOrRenewal = purchaseOrRenewal(record);
		record.setFieldValue('custrecordr7mslicensependingsubmission','F');
		try {
			var id = nlapiSubmitRecord(record);
			if(id!=null){
				var success = sendActivationEmail(record,newPurchaseOrRenewal);
				if(!success)
				serviceException(record,"Could not email license purchaser his license key.");
			}
			
		}catch(e){
			nlapiLogExecution('EMERGENCY',"Unable to process automated Order",results[i].getId());
			var emailText = e.name + " " + e.message + " "+ e;
			nlapiSendEmail(2,2,'Unable to process Automated Order',emailText);
			serviceException(record,emailText);
		}
	}
	
	var results = nlapiSearchRecord('customrecordr7metasploitlicensing',null,searchFilters);
	if(results!=null && results.length >= 5){
		nlapiSendEmail(2,2,'Metasploit Licensing Alert', results.length+' metaploit license records backed up');
		nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId());
	}
		
}

function purchaseOrRenewal(record){
	var value = record.getFieldValue('custrecordr7msproductkey');
	var orderType='';
	if(value=='' || value==null){
		orderType='newPurchase';
	}else {
		orderType='renewal';
	}
}


//To DO:
//Fix issue of emailFrom
//Fix issue of emailTemplateId
function sendActivationEmail(record,newPurchaseOrRenewal){
	nlapiLogExecution('DEBUG','In sendActivationEmail','yup')
	var success= false;
	try {
		var emailTemplateId = null;
		
		if (newPurchaseOrRenewal == 'newPurchase') {
			emailTemplateId = 431;		
		}else if(newPurchaseOrRenewal == 'renewal'){
			emailTemplateId = 431;
		}
		
		sendEmailFrom = record.getFieldValue('custrecordr7mslicensesalesrep');	
		contactEmailAddress = lookupContactEmail(record.getFieldValue('custrecordr7mslicensecontact'));
	
		var records = new Array();
		records['recordtype'] = record.getType();
		records['record'] = record.getId();
		var body = nlapiMergeRecord(emailTemplateId, 'customrecordr7metasploitlicensing', record.getId());
		nlapiLogExecution('DEBUG','Sending the b email','baboom');
		nlapiSendEmail(sendEmailFrom, contactEmailAddress, body.getName(), body.getValue(), null, 'derek_zanga@rapid7.com', records);
		success = true;
	}catch(e){
		nlapiLogExecution("EMERGENCY",'Could not mail activation email',e);
		return success;
	}
	return success;
}

function lookupContactEmail(contactId){
	var email = nlapiLookupField('contact',contactId,'email');
	return email;
}

function serviceException(record,message){
	//Send message to Support indicating error with license purchase.
	nlapiLogExecution("EMERGENCY",'ERROR',message);
	nlapiSendEmail(2,2,
	'Error on R7_MSLicensing_Unscheduled_ResubmitLicenses',
	message);
}
