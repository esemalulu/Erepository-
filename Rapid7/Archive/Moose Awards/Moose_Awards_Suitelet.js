/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Feb 2013     mburstein
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */

function nominateMoose(request, response) {
	
	//https://system.netsuite.com/app/site/hosting/scriptlet.nl?script=684&deploy=1
	this.context = nlapiGetContext();
	//GET call	



/*
 * TODO Need to set up case that grabs quarter from new Date().
 * TODO why can't I generate the results from a search?
 * 		If no search, then set up different XML for each Moose Winners group
 * 		Then use list to drive nominations results from previous quarter
 * TODO Need field for select moose and field for core value + Moose Description
 */
  if(request.getMethod() == 'GET') {
   
    //Create the form
    var form = nlapiCreateForm("Nominate a fellow MOOSE!", true);
	form.setScript('customscriptr7mooseawards_suitelet_cs');
    
	/*
	 * Add selectable fields
	 */ 
	var fldTo = form.addField('custpage_mooseawardsto', 'select', 'Who?: ', 'employee');
	var fldMooseType = form.addField('custpage_mooseawardsmoose', 'select', 'Which Award: ','customrecordr7mooseawardtypes');
    var fldReason =  form.addField('custpage_mooseawardsreason', 'textarea', 'Reason For Nomination: ');
	var fldDescAndCV = form.addField('custpage_mooseawardsdescandcv', 'inlinehtml');
	var fldMooseImg = form.addField('custpage_mooseawardsmooseimg', 'inlinehtml');
	var fldFrom = form.addField('custpage_mooseawardsfrom', 'select', 'From: ', 'employee');
	var fldMooseImgId = form.addField('custpage_mooseawardsmooseimgid','text');
	
	// Display error if reason is less than 30 char or User nominated self
	var objError = new Object();
	objError.reason = request.getParameter('custparam_reasonerror');
	objError.to = request.getParameter('custparam_toerror');
	objError.duplicate = request.getParameter('custparam_isduplicate');
	if((objError.reason != null && objError.reason !='') || (objError.to != null && objError.to !='') || (objError.duplicate != null && objError.duplicate !='')){
		// Display error
		var fldError = form.addField('custpage_error','text');
		fldError.setDisplayType('inline');
		fldError.setLayoutType('outsideabove');
		
		// Concatenate the errors and set default text
		var errorText = '';
		for(errorType in objError)
		if (objError[errorType] != null) {
			errorText += '   \n' + objError[errorType];
		}
		fldError.setDefaultValue(errorText);
		
		//  Get previously submitted fields and set default values
		var previousTo = request.getParameter('custpage_mooseawardsto');
		fldTo.setDefaultValue(previousTo);
		var previousFrom = request.getParameter('custpage_mooseawardsfrom');
		fldFrom.setDefaultValue(previousFrom);
		var previousMooseId = request.getParameter('custpage_mooseawardsmoose');
		fldMooseType.setDefaultValue(previousMooseId);
		var previousReason = request.getParameter('custpage_mooseawardsreason');
		fldReason.setDefaultValue(previousReason);
	}
	
	//var fldWinners = form.addField( 'custpage_winners', 'inlinehtml');
	var fldNominations = form.addField( 'custpage_nominations', 'inlinehtml');
	
	// Get HTML Content
	var content = getMooseHtmlContent();
	
	// Get name and department of current user
	//var userName = context.getName();
	var userId = context.getUser();
	
	/*
	 *  Set field defaults (some set by CS script on field change)
	 */	
	fldFrom.setDefaultValue(userId);
	fldNominations.setDefaultValue(content.nominations);
	//fldWinners.setDefaultValue(content.winners);
	fldMooseImg.setDefaultValue('');
	fldMooseImgId.setDefaultValue('');
	fldDescAndCV.setDefaultValue('');
	
	// Set Display
	fldFrom.setDisplayType('hidden');
	fldMooseImgId.setDisplayType('hidden');
	
	fldTo.setDisplaySize(100);
	fldMooseType.setDisplaySize(120);
	fldReason.setDisplaySize(100);	
	
	//Set Layout
	fldTo.setLayoutType('midrow');
	fldReason.setLayoutType('startrow');
	fldDescAndCV.setLayoutType('midrow');
	fldMooseImg.setLayoutType('endrow');
	//fldWinners.setLayoutType('normal');
	fldNominations.setLayoutType('normal');
	
	// Set Mandatory
	fldTo.setMandatory(true);
	fldReason.setMandatory(true);
	fldMooseType.setMandatory(true);
	
	// Submit form
    form.addSubmitButton('Nominate Moose!');
	
	//contextTest();
    response.writePage(form);
	
	}
	
//POST call
  if(request.getMethod() == 'POST')
  {
    var objMooseSubmission = new Object();
	objMooseSubmission.toId = request.getParameter('custpage_mooseawardsto');
	objMooseSubmission.fromId = request.getParameter('custpage_mooseawardsfrom');
	objMooseSubmission.mooseId = request.getParameter('custpage_mooseawardsmoose');
	objMooseSubmission.reason = request.getParameter('custpage_mooseawardsreason');	
	
	// Get length of comments string
	var reasonLength = objMooseSubmission.reason.length;
	
	// Initialize Error param array
	var arrParams = new Array();
	var nominatedSelf = false;
	var reasonTooShort = false;
	
	// Check to make sure user doesn't nominated self
	if (objMooseSubmission.toId == objMooseSubmission.fromId ){
		arrParams['custparam_toerror'] = "YOU CANNOT NOMINATE YOURSELF.";
		nominatedSelf = true;
	}
	
	// Check to make sure comment is greater than 50 char
	if (reasonLength < 50){
		arrParams['custparam_reasonerror'] = "YOUR REASON MUST BE AT LEAST 50 CHARACTERS.";
		reasonTooShort = true;
	}
	
	// Check to make sure the user isn't double submitting
	var isDuplicate = isDuplicateSubmission(objMooseSubmission);
	if(isDuplicate){
		arrParams['custparam_isduplicate'] = "YOU CANNOT SUBMIT THE SAME NOMINATION TWICE.";
	}
	
	// If no Errors create new Moose Nomination
	if (!nominatedSelf && !reasonTooShort && !isDuplicate) {
		
		var recMoose = nlapiCreateRecord('customrecordr7mooseawards');
		
		// Set record values
		recMoose.setFieldValue('custrecordr7mooseawardsfrom', objMooseSubmission.fromId);
		recMoose.setFieldValue('custrecordr7mooseawardsto', objMooseSubmission.toId);
		recMoose.setFieldValue('custrecordr7mooseawardsmoose', objMooseSubmission.mooseId);
		recMoose.setFieldValue('custrecordr7mooseawardsreason', objMooseSubmission.reason);
		
		// Submit new Moose Record
		nlapiSubmitRecord(recMoose);
		
		// Write thank you splash page	
		var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
		var thanksPage = '<!DOCTYPE html><html style="background:url('+toURL+'/core/media/media.nl?id=693055&c=663271&h=a99a10ab543f899618e6) no-repeat center center fixed;-webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover; background-size: cover;"><body><h1 style="text-align: center; color:#ea5709;">Thank you!  Your nomination has been submitted!</h1></body></html';
    	response.write(thanksPage);
	}
	else{
		arrParams['custpage_mooseawardsto'] = objMooseSubmission.toId;
		arrParams['custpage_mooseawardsfrom'] = objMooseSubmission.fromId;
		arrParams['custpage_mooseawardsmoose'] = objMooseSubmission.mooseId;
		arrParams['custpage_mooseawardsreason'] = objMooseSubmission.reason;
		nlapiSetRedirectURL('SUITELET', 'customscriptr7mooseawardssuitelet', 'customdeployr7mooseawardssuitelet', null, arrParams);
	}	
	//response.writeLine("<html><body onload='win_close()'><script language='Javascript'>function win_close(){ window.opener = top; window.close(); }</script></body></html>");
  }
}




