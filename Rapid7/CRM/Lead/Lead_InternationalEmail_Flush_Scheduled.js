function findAndFlush(){


	this.internationalAlertEmployee = nlapiGetContext().getSetting('SCRIPT','custscriptmktingcontact');
	if(this.internationalAlertEmployee==null){
		this.internationalAlertEmployee = "154214";
	}	
	
	wait(5);
	
	var internationalLeads = findInternationalLeads();
	
	for (i = 0; internationalLeads != null && i < internationalLeads.length; i++) {
		var leadInternalId = internationalLeads[i].getValue('internalid');
		nlapiLogExecution('DEBUG','Lead Internal Id',leadInternalId);
		var contactEmail = findContactEmail(leadInternalId);
		if (contactEmail != 'bogus@bogus.com' && contactEmail!='') {
			sendEmailTo(contactEmail, leadInternalId);
			wait(5);
		}
	}
}
	

/*
 * This function finds and returns international leads that have yet to receive their emails.
 */
function findInternationalLeads(){
	var searchFilters = new Array(
	new nlobjSearchFilter('custentityr7internationalleademailflag',null,'is','T')
	);
	var searchColumns = new Array(
	new nlobjSearchColumn('internalid',null,null)
	);
	var searchResults = nlapiSearchRecord('lead',null,searchFilters,searchColumns);
	return searchResults;
}

/*
 * Find the contact to whom the email will be sent from the internalid.
 */
function findContactEmail(leadInternalId){
	var searchFilters = new Array(
	new nlobjSearchFilter('company',null,'is',leadInternalId)
	);
	var searchColumns = new Array(
	new nlobjSearchColumn('email',null,null)
	);
	var searchResults = nlapiSearchRecord('contact',null,searchFilters,searchColumns);
	var email = "bogus@bogus.com";
	if(searchResults!=null){
		email = searchResults[0].getValue('email');
	}
	nlapiLogExecution('DEBUG','Email Found',email);
	return email;
}


/*
 * This function sends the international lead
 * 'thank you for your interest but we're too cool...' email.
 */
function sendEmailTo(email,leadInternalId){
		var mktingContact = nlapiGetContext().getSetting('SCRIPT','custscriptemailcontact');
		if(mktingContact==null){mktingContact = "jamie_quine@rapid7.com";}
		
		
		var debugFields = nlapiLookupField('customer',leadInternalId,new Array('entityid','billcountry','address'));
		var debugEmailText = ""+
		"This is a debug email which will be shutoff soon.<br>\n" +
		" This email will enable us to track if which international"+
		" leads receive the 'thank you' email.<br>\n"+
		"------------------------------------------------<br><br>\n\n"+
		debugFields['entityid'] + " received the email at " + email + "; <br>\n" +
		+"Their lead record had 'billcountry' value " + debugFields['billcountry'] + ".<br>\n" +
		"The address field has value " + debugFields['address'] + "<br>\n"+
		"A copy of the email is given below <br>\n"+
		"-------------------------------------------------<br><br>\n";
		
		var sendEmailFrom = internationalAlertEmployee;
		var emailTemplateId = 282;
		var records= new Array();
		records['recordtype'] = nlapiGetRecordType();
		records['record'] = nlapiGetRecordId();
		var body = nlapiMergeRecord(emailTemplateId, 'customer', leadInternalId);
		nlapiLogExecution('DEBUG','Body.getValue()',body.getValue());
		nlapiLogExecution('DEBUG','Body.getName()',body.getName());
		nlapiLogExecution('DEBUG','SendEmailFrom',sendEmailFrom);
		nlapiLogExecution('DEBUG','Email',email);
		
		//nlapiSendEmail(sendEmailFrom, email, body.getName(), body.getValue(), null, null, records);
		
		//Jamie No WANT email
		//nlapiSendEmail(sendEmailFrom,mktingContact,'Copy of Email the International Lead Received',debugEmailText + body.getValue(),'derek_zanga@rapid7.com');
		nlapiLogExecution('DEBUG', 'Sent them a notification email', 'true');
		nlapiSubmitField('lead',
		leadInternalId,
		new Array('custentityr7internationalleademailflag'),
		new Array('F'));
}

function wait(val){
	pauseTime = val * 1000;
	var date = new Date().getTime();
	var newDate = new Date().getTime();
	var stayPut = true;
	while(stayPut){
		newDate = new Date().getTime();
		if(newDate > (date + pauseTime)){
			stayPut= false;
		}
	}
}
