function createCustomerContact(request,response){
	//try {
		//var coId = 130910;
		
		this.parameters = request.getAllParameters();
		this.url = request.getURL();
		this.headers = request.getAllHeaders();
		this.customerId = parameters["custparamcoid"];
		
		for (param in parameters) {
			nlapiLogExecution('DEBUG', 'Parameter: ' + param, parameters[param]);
		}
		
		//Validate parameters NS side		
		var result = validateParameters(request);
		nlapiLogExecution('DEBUG','Valid Parameters?',result);
		if(!authenticated){
			redirectToErrorPage(response,"Parameters not valid");
		}
		
		//Authenticate using loginCode
		var authenticated=authenticateUsingLoginCode();
		nlapiLogExecution('DEBUG','Authentication Returned',authenticated);
		if(!authenticated){
			redirectToErrorPage(response,"Could not authenticate.");
		}
		
		//Create Subcustomer and provide access
		var subcustomerId = createSubcustomerAndGiveAccess();
		nlapiLogExecution('DEBUG','SubcustomerId',subcustomerId);
		if(subcustomerId==null){
			redirectToErrorPage(response,"Could not create customer record");
			return;
		}
		
		//Create contact and attach to subcustomer
		var contactId = createContactAndAttachToSubcustomer(subcustomerId);
		nlapiLogExecution('DEBUG','ContactId',contactId);
		if(contactId==null){
			redirectToErrorPage(response,"Could not create contact record");
			return;
		}
		
		//Send contact created email to admin
		sendContactCreatedInfoEmailToAdmin();
		
		//Send Contact his authentication details
		if (parameters["custparamaccess"]=='T') {
			sendContactPasswordEmail();
		}
		
		//Get Redirect URL From Jessica
		response.sendRedirect('EXTERNAL', parameters["custparamreturn"]);
			
	/*
	}catch(err){
		nlapiLogExecution('ERROR',"Code: "+err);
		redirectToErrorPage(response,"Your request cannot be processed presently. Please contact Rapid7 Support.");
	}
	*/	
}