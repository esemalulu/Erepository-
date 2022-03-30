


/*********** User Event Section ***************************/
function emailResetBeforeLoad(type, form, request) {
	//Only Fire for User Event
	if (nlapiGetContext().getExecutionContext() == 'userinterface' && type=='create') {
		//Provide action type to client for to interact with Client Script
		var cltype = form.addField('custpage_actiontype', 'text', 'Action Type', null, null);
		cltype.setDefaultValue(type);
		cltype.setDisplayType('hidden');
		
		form.getField('email').setDefaultValue('');
	}
	
	
}

/*********** Client Script ******************************/
function emailResetPageInit() {
	log('debug','Context test',nlapiGetContext().getExecutionContext() +' // '+ nlapiGetFieldValue('custpage_actiontype'));
	//Only fire for user interface and if type is create
	if (nlapiGetContext().getExecutionContext() == 'userinterface' && nlapiGetFieldValue('custpage_actiontype')=='create') {
		//reset the email value field IF set
		log('debug','Email on page init',nlapiGetFieldValue('email'));
		if (nlapiGetFieldValue('email')) {
			log('debug','about to reset','about to reset');
			nlapiSetFieldValue('email','',true,true);
			log('debug','Reset Email','REset Email: '+nlapiGetFieldValue('email'));
		}		
	}
	
}