function createLicenseAndNotifyContact(){
	
		
	
		nlapiLogExecution('DEBUG','NeXpose License record submitted w/ id',nxLicenseRecordId);
		
		/* Notifying the contact with his license information */
		var associatedRecords = new Array();
		associatedRecords[nlapiGetRecordType()]=nlapiGetRecordId();
		associatedRecords['customrecordr7nexposelicensing']=nxLicenseRecordId;
		
		var body = nlapiMergeRecord(emailTemplateId, 'customrecordr7nexposelicensing',nxLicenseRecordId);
		nlapiSendEmail(sendEmailFrom,contactEmailAddress,body.getName(),body.getValue(),null,null,associatedRecords);		
		/* Notifying the contact with his license information */
		
		
		/* Notifying the salesRep and the notificationList */
		var notificationText = contactName + " from " + companyName + " has been automatically given"+
		 " a NeXpose License expiring on " + nlapiDateToString(nlapiAddDays(new Date(),days)) +
		 ". This was created from the " + description + " template.";
		 
		if(notificationList!=null){
			nlapiSendEmail(owner,notificationList,'NeXpose License Activation',notificationText);				
		}
		
		if(notifySalesRep=='T'){
			var salesRepEmail = nlapiLookupField('customer',companyId,'salesrep');
			nlapiLogExecution('DEBUG','SalesRep',salesRepEmail);
			nlapiSendEmail(owner,salesRepEmail,'NeXpose License Activation',notificationText);
		}
		/* Notifying the salesRep and the notificationList */
			
		nlapiSubmitField(nlapiGetRecordType(),nlapiGetRecordId(),'custentityr7contactnxlicensetemplate','');
		nlapiLogExecution('DEBUG','FinalStep:Nulling out templateField','--------------------------------');	
		
			
}
