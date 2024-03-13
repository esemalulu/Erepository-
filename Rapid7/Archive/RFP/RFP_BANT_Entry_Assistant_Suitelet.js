/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       02 Jan 2013     mburstein
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */

function qualifyRFP(request, response){
	
	
	// TODO restrict to 1 rfp per opp
	
	
	// Get User Id
	var userId = nlapiGetUser();
				
	/* first create assistant object and define its steps. */
	var assistant = nlapiCreateAssistant('Submit a new RFP');
	assistant.setOrdered(false);
	assistant.addStep('generalinformation','General Information').setHelpText("Enter general information about the RFP.");
	assistant.addStep('bant','BANT').setHelpText("Provide BANT information. Please fill out each section.  Leave it blank if you don't know the answer.");
	assistant.addStep('legal','Legal Information').setHelpText("Additional Legal information.");
	assistant.addStep('additional','Additional Questions').setHelpText("Additional product/service qualification information.");
	assistant.addStep('upload','Upload File').setHelpText("Please upload the RFP.");
	assistant.addStep('submit','Submit RFP').setHelpText("Are you ready to submit your RFP qualification request? <br>You can go back to previous steps to change your answers or click finish if you are done.");
	//nlapiLogExecution( 'DEBUG', "Create Assistant ", "Assistant Created" );
	
	var oppId = request.getParameter('custparam_oppid');
	var refresh = request.getParameter('custparam_refresh');
	
	// If cancel or finish then refresh is true, empty session object, Refresh is set to true when comming from Opp initially
	if (refresh == 'T') {
		nlapiGetContext().setSessionObject('rfp_json', '');
		//assistant.setCurrentStep(assistant.getStep("generalinformation"));
	}
	// Get session object for persistant data
	var json = nlapiGetContext().getSessionObject('rfp_json');
	if (json == null || json == '') {
		json = '{}';
	}
	
	// Parse session object to get access to field values by name
	this.objRfpSession = JSON.parse(json);
	if(oppId == null || oppId == ''){
		oppId = objRfpSession.custpage_opportunity;
	}
 
	/* handle page load (GET) requests. */
	if (request.getMethod() == 'GET') {
		
		/*.Check whether the assistant is finished */
		if (!assistant.isFinished()) {
			// If initial step, set the Splash page and set the intial step
			if (assistant.getCurrentStep() == null) {
				if (oppId == null || oppId == '') {
					throw nlapiCreateError('MISSING_PARAM', 'Request is missing a required parameter', true);
				}
				assistant.setCurrentStep(assistant.getStep("generalinformation"));
				assistant.setSplash("Welcome to the RFP Setup Assistant!", "The RFP Assistant will help you enter a new RFP for qualification.");
			}
			// Build the page for a step by adding fields, field groups, and sublists to the assistant
			var step = assistant.getCurrentStep();
			
			// General Info fields
			if (step.getName() == "generalinformation") {
			
				// Add RFP info fields
				var generalGroup = assistant.addFieldGroup('generalinfo', 'RFP Info');
				generalGroup.setCollapsible(false);
				generalGroup.setShowBorder(false);
				
				var fldCustomer = assistant.addField('custpage_customer', 'select', 'Customer: ', 'customer', 'generalinfo');
				var fldSalesRep = assistant.addField('custpage_salesrep', 'select', 'Sales Rep: ', null, 'generalinfo');
				var fldSe = assistant.addField('custpage_securitysolutionsrep', 'select', 'Security Solutions: ', null, 'generalinfo');
				var fldOpportunity = assistant.addField('custpage_opportunity', 'select', 'Opportunity: ', 'opportunity', 'generalinfo');
				var fldRFPType = assistant.addField('custpage_type', 'select', 'RFP Type: ', 'customlistr7rfptype', 'generalinfo');
				
				var salesDepartmentId = 2; // Sales
				// Dynamically add Sales Reps to fldSalesRep select field
				try{
					var objSalesReps = findEmployeesByDepartment(salesDepartmentId);
					fldSalesRep.addSelectOption('','');
					for(key in objSalesReps){		
						fldSalesRep.addSelectOption(key,objSalesReps[key]);
					}
				}
				catch(e){
					assistant.setError(e);
				}
				
				var seDepartmentId = 9; // Security Solutions
				// Dynamically add SEs to fldSe select field
				try{
					var objSEs = findEmployeesByDepartment(seDepartmentId);
					fldSe.addSelectOption('','');
					for(key in objSEs){		
						fldSe.addSelectOption(key,objSEs[key]);
					}
				}
				catch(e){
					assistant.setError(e);
				}
				if (oppId != null && oppId != '') {
					var oppRfpAttached = nlapiLookupField('opportunity',oppId,'custbodyr7opprfp');
					if (oppRfpAttached != null && oppRfpAttached != '') {
						throw nlapiCreateError('OPP_ALREADY_HAS_RFP_ATTACHED', 'Opportunity: ' + oppId + ' already has an RFP attached. ', true);
					}
					// Get Customer, Sales Rep, Security Engineer from Opp
					var recOpp = nlapiLoadRecord('opportunity', oppId);
					var customerId = recOpp.getFieldValue('entity');
					var salesRepId = recOpp.getFieldValue('salesrep');
					var seId = recOpp.getFieldValue('custbodyr7presalesopprep');
					
					/*nlapiLogExecution('DEBUG','customerId',customerId);
					nlapiLogExecution('DEBUG','salesRepId',salesRepId);
	 				nlapiLogExecution('DEBUG','seId',seId);*/
					
					// Set Default Values
					if (customerId != null && customerId != '') {
						fldCustomer.setDefaultValue(customerId);
					}
					if (salesRepId != null && salesRepId != '') {
						fldSalesRep.setDefaultValue(salesRepId);
					}
					if (seId != null && seId != '') {
						fldSe.setDefaultValue(seId);
					}
					fldOpportunity.setDefaultValue(oppId);
				}

				// Set Fields Mandatory
				fldCustomer.setMandatory(true);
				fldSalesRep.setMandatory(true);
				fldSe.setMandatory(true); 
				fldOpportunity.setMandatory(true);
				fldRFPType.setMandatory(true);
			}	
			
			if (step.getName() == "bant") {
				
				// Add Budget fields
				var budgetGroup = assistant.addFieldGroup('budgetgroup', 'Budget').setSingleColumn(false);
				budgetGroup.setCollapsible(true,false);
				budgetGroup.setShowBorder(false);
				
				var fldBudgetAmount = assistant.addField('custpage_budgetamount', 'currency', 'What is the budget?', null, 'budgetgroup');
				var fldBudgetApproved = assistant.addField('custpage_budgetapproved', 'checkbox', 'Has the budget/project been approved?', null, 'budgetgroup');
				var fldR7Before = assistant.addField('custpage_workedwr7before', 'checkbox', 'Has this company done work with Rapid7 before?', null, 'budgetgroup');
				var fldR7BeforeComments = assistant.addField('custpage_budgetcomments', 'textarea', 'Please include details.', null, 'budgetgroup');
				
				// Set Budget Help column
				//------------//
					var budgetHelpText = 'Please be as detailed as possible.<br>';
					budgetHelpText += 'If you know the amount that the client has budgeted for this project, please enter that amount to the left.<br><br><br>';
					budgetHelpText += 'If &#34;Yes&#34;, the company has done work with Rapid7 in the past, please include any information regarding what <br>';
					budgetHelpText += 'type of service, and if they seemed satisfied with past work.<br><br>';
					budgetHelpText += 'If &#34;No&#34;, the company has not done work with Rapid7, please include any information as to<br>';
					budgetHelpText += ' why we&#39;re included in the RFP, as well as, any information on companies who may have done the work in the past and their level of satisfaction with that work.';
					
					var fldBudgetHelp = assistant.addField('custpage_budgethelp','textarea', '', null, 'budgetgroup');
					fldBudgetHelp.setDefaultValue(budgetHelpText);
					fldBudgetHelp.setDisplayType('inline');
					fldBudgetHelp.setLayoutType('normal','startcol');
				//------------//
				
				// Add Authority fields
				var authGroup = assistant.addFieldGroup('authgroup', 'Authority').setSingleColumn(false);
				authGroup.setCollapsible(true,false);
				authGroup.setShowBorder(false);
				
				var fldApproverKnown = assistant.addField('custpage_approverknown', 'select', 'Who is the person with approval authority? (Must be in Netsuite)', null, 'authgroup');
				var fldApproverRelationship = assistant.addField('custpage_approverrelationship', 'checkbox', 'Do you have a strong relationship with the decision maker?', null, 'authgroup');
				var fldNumberOfBidders = assistant.addField('custpage_otherbidders', 'integer', 'How many other comapnies are bidding on the RFP? ', null, 'authgroup');
				var fldApproverComments = assistant.addField('custpage_approvercomments', 'textarea', 'Approver relationship comments: ', null, 'authgroup');
				
				// Set Authority Help column
				//------------//
					var authHelpText = '<br><br><br><br>If you know the total number of companies that have been invited to bid, please enter that number to the left.<br><br>';
					authHelpText += 'Approver Relationship&#58; Please include any relationship information that would indicate that we might have a any advantage.';
					authHelpText += '<br<br>  Example&#58; We&#39;ve been working with this company for 2 years, and the client has loved our work in the past, and would like to have us perform the work as well, but is required to go out to bid on this work.';
					
					var fldAuthHelp = assistant.addField('custpage_authorityhelp','textarea', '', null, 'authgroup');
					fldAuthHelp.setDefaultValue(authHelpText);
					fldAuthHelp.setDisplayType('inline');
					fldAuthHelp.setLayoutType('normal','startcol');
				//------------//
				
				// Get customerId from session Object
				var customerId = objRfpSession.custpage_customer;
				nlapiLogExecution('DEBUG','customerId: ', customerId);
				
				// Dynamically add contacts to approverKnown select field
				if(customerId != null && customerId != ''){
					try{
						var objCustomerContacts = findCustomerContacts(customerId);
						fldApproverKnown.addSelectOption('','');
						for(key in objCustomerContacts){		
							fldApproverKnown.addSelectOption(key,objCustomerContacts[key]);
						}
					}
					catch(e){
						assistant.setError(e);
					}
				}
				
				// Set Mandatory and layouts
				//fldApproverKnown.setHelpText('Do you know the person with approval authority? (Must be in Netsuite)',true);
				fldApproverRelationship.setHelpText('Please included details in the comments section.',true);
				//fldNumberOfBidders
				//fldApproverComments
				
				// Add Need fields
				var needGroup = assistant.addFieldGroup('needgroup', 'Need').setSingleColumn(false);
				needGroup.setCollapsible(true,false);
				needGroup.setShowBorder(false);
				
				var fldServicesRequired = assistant.addField('custpage_servicesrequired', 'checkbox', 'Are the services necessary (for compliance etc.)?', null, 'needgroup');
				var fldServicesDeadline = assistant.addField('custpage_ddd', 'date', 'Deadline for services? (leave blank if no deadline)', null, 'needgroup');
				var fldStrategicPlay = assistant.addField('custpage_strategicplay', 'checkbox', 'Is this strategic, in some way for Rapid7?', null, 'needgroup');
				var fldStrategicPlayComments = assistant.addField('custpage_needcomments', 'textarea', 'If so please explain why.', null, 'needgroup');
				
				// Set Mandatory
				/*fldServicesRequired.setLayoutType("normal", "startcol");
				fldServicesDeadline
				fldStrategicPlay.setLayoutType("normal", "startcol");
				fldStrategicPlayComments */
				
				// Set Need Help column
				//------------//
					var needHelpText = '<br><br>Please enter the date the client needs the work completed.<br><br>';
					needHelpText += 'If &#34;Yes&#34;, please include any explanation.<br>';
					needHelpText += 'Example&#58; This client is also looking at an entire vulnerability management program and is evaluating Nexpose&#47;Metasploit.';

					var fldNeedHelp = assistant.addField('custpage_needhelp','textarea', '', null, 'needgroup');
					fldNeedHelp.setDefaultValue(needHelpText);
					fldNeedHelp.setDisplayType('inline');
					fldNeedHelp.setLayoutType('normal','startcol');
				//------------//
				
				
				// Add Timing fields
				var timeingGroup = assistant.addFieldGroup('timinggroup', 'Timing').setSingleColumn(false);
				timeingGroup.setCollapsible(true,false);
				timeingGroup.setShowBorder(false);
				
				var fldQuestionsDueDate = assistant.addField('custpage_questionsduedate', 'date', 'When are the RFP Questions due?', null, 'timinggroup');
				var fldScopingCallDate = assistant.addField('custpage_vendorscopedate', 'date', 'When is the scoping call?', null, 'timinggroup');
				var fldResponseDueDate = assistant.addField('custpage_responseduedate', 'date', 'When is the RFP Response due?', null, 'timinggroup');
				var fldHardcopy = assistant.addField('custpage_hardcopyyesorno', 'checkbox', 'Is a hardcopy (printed version) required?', null, 'timinggroup');
				var fldServiceExpectationsLabel = assistant.addField('custpage_expectations_label','label', 'Are service delivery date expectations?', null, 'timinggroup');
				var fldExpectedStart = assistant.addField('custpage_expectedstartdate', 'date', 'Start Date: ', null, 'timinggroup');
				var fldExpectedEnd = assistant.addField('custpage_expectedenddate', 'date', 'End Date: ', null, 'timinggroup');
			
				// Set Timing Help column
				//------------//
					var timingHelpText = '<br><br><br><br><br><br>Please review the RFP to determine if a hard copy is necessary.<br> This will require us';
					timingHelpText += 'to have the response prepared one day early so that it can be couriered to the client by the deadline.<br>  '
					timingHelpText += 'Please note if there are any expected dates of delivery/completion.';
				
					var fldTimingHelp = assistant.addField('custpage_timinghelp','textarea', '', null, 'timinggroup');
					fldTimingHelp.setDefaultValue(timingHelpText);
					fldTimingHelp.setDisplayType('inline');
					fldTimingHelp.setLayoutType('normal','startcol');
				//------------//
			
				// Set Field Mandatory and Options
			/*	fldQuestionsDueDate
				fldScopingCallDate
				fldResponseDueDate
				fldHardcopy	
				fldExpectedStart
				fldExpectedEnd*/
			}
			if (step.getName() == "legal") {
			
				// Add Legal fields
				var legalGroup = assistant.addFieldGroup('legalgroup', 'Legal').setSingleColumn(true);
				legalGroup.setCollapsible(false);
				legalGroup.setShowBorder(false);
				var fldLegalDocs = assistant.addField('custpage_legaldocs', 'multiselect', 'Does the RFP/RFI require that we have contracts\n reviewed by legal?  Select all that apply.', 'customlistr7rfplegaldocs', 'legalgroup');
				fldLegalDocs.setDisplaySize(275, 8);
				fldLegalDocs.setHelpText('<b><i>Use CNTRL-Click to slect more than one option.</i></b>',true);
				
				// Set Legal Help Column
				//------------//
					var legalHelpText = 'It is important that we allocate the proper resources to review any requirements and contracts.<br>';
					legalHelpText += 'Please review the RFP/RFI to identify any contracts that must be reviewed and/or negotiated.';
				
					var fldLegalHelp = assistant.addField('custpage_legalhelp','textarea', '', null, 'legalgroup');
					fldLegalHelp.setDefaultValue(legalHelpText);
					fldLegalHelp.setDisplayType('inline');
					fldLegalHelp.setLayoutType('normal','startcol');
				//------------//
			}
			
			if (step.getName() == "additional") {
				
				// Get rfpType from Session Object
				var rfpType = objRfpSession.custpage_type;
				//= nlapiGetContext().getSessionObject('rfp_type');
				nlapiLogExecution('DEBUG','add RFP Type: ', rfpType);
				
				if(rfpType == 2 || rfpType == 3){
					// Product Specific
					var productGroup = assistant.addFieldGroup('productgroup', 'Additional Product Questions').setSingleColumn(true);
					productGroup.setCollapsible(false);
					productGroup.setShowBorder(false);
					var fldProductEvalDate = assistant.addField('custpage_evaldate', 'date', 'When is the prospect evaluating?', null, 'productgroup');
					var fldProductEvalLength = assistant.addField('custpage_evallength', 'text', 'How long do they need to evaluate?', null, 'productgroup');
					var fldProductImplementationDate = assistant.addField('custpage_implementationdate', 'date', 'When is the prospect implementing the chosen solution?', null, 'productgroup');
					var fldProductDifferentiators = assistant.addField('custpage_favorablediff', 'textarea', 'What Rapid7 technical differentiators make this opportunity favorable?', null, 'productgroup');
					var fldProductIntegrations = assistant.addField('custpage_integrationpoints', 'textarea', 'Expecting Integration?', null, 'productgroup');
					
					fldProductIntegrations.setHelpText('Are there any integration points that should be highlighted <br> (e.g. is the prospect using Splunk or RedSeal and is this a potential "inroad" for Rapid7)?',true);
					
				// Set Product Help column
				//------------//
					var productHelpText = '<br><br><br><br>For instance&#58; Do they want the work from the same company that they are buying the product from?<br>';
					productHelpText += 'Have they heard about us and want us to do the work? Do they want &#34;one throat to choke&#34;?<br><br><br>';
					productHelpText += 'If so, with what products? If integrations are important, as it might be easier to discuss &#34;why us&#34; <br>';
					productHelpText += 'because of our background and experience with this type of work.';

					var fldProductHelp = assistant.addField('custpage_producthelp','textarea', '', null, 'productgroup');
					fldProductHelp.setDefaultValue(productHelpText);
					fldProductHelp.setDisplayType('inline');
					fldProductHelp.setLayoutType('normal','startcol');
				//------------//

				}
				if(rfpType == 1 || rfpType == 3){
					//Service Specific
					var serviceGroup = assistant.addFieldGroup('servicegroup', 'Additional Service Questons').setSingleColumn(true);
					serviceGroup.setCollapsible(false);
					serviceGroup.setShowBorder(false);
					var fldSubcontractors = assistant.addField('custpage_subcontractorsallowed', 'checkbox', 'Are we able to use Subcontractors?', null, 'servicegroup');
					var fldCommonWork = assistant.addField('custpage_commonorcustom', 'checkbox', 'Is the RFP asking for our typical services ("sweetspot") or are they custom services? ', null, 'servicegroup');
					var fldServiceScope = assistant.addField('custpage_completescope', 'checkbox', 'Has the SE completed the scoping document?', null, 'servicegroup');
					var fldMakeSOW = assistant.addField('custpage_sowpossible', 'checkbox', 'Can the existing inassistantation be parlayed into an SOW?', null, 'servicegroup');
					var flOpenToQuestions = assistant.addField('custpage_opentoquestions', 'checkbox', 'Is the RFP still open to questions (by the time SecSol/PSO gets involved)?', null, 'servicegroup');
					var fldAuditRelated = assistant.addField('custpage_auditrelated', 'checkbox', 'Is this audit related (HIPAA/PCI/SOX/GLBA)?', null, 'servicegroup');
					var fldServicesComments = assistant.addField('custpage_servicecomments', 'textarea', 'Additional Service Comments: ', null, 'servicegroup');	
					
					fldServicesComments.setHelpText('If annual work, who did the work in the past?<br> How much did they pay for the service?<br> What kind of compliance?',true);	
				
				// Set Service Help column
				//------------//
					var serviceHelpText = 'If there are tight timelines this could be important.<br>';
					serviceHelpText +='Example&#58; Deployment, Integration, Pen Testing<br><br><br>';
					serviceHelpText += 'Can we respond with a typical SOW, or is the RFP very structured in how we must respond?<br><br>';
					serviceHelpText += 'Always important to know the drivers for work. Include the particulars in the comment field below.';

					var fldServiceHelp = assistant.addField('custpage_servicehelp','textarea', '', null, 'servicegroup');
					fldServiceHelp.setDefaultValue(serviceHelpText);
					fldServiceHelp.setDisplayType('inline');
					fldServiceHelp.setLayoutType('normal','startcol');
				//------------//
				
				}	
			}
			
			if(step.getName() == "upload"){
				var fldFile = assistant.addField('custpage_file', 'file', 'Select File');
				//fldFile.setLayoutType('outsideabove', 'startcol') 
      			fldFile.setMandatory(true);
				fldFile.setHelpText('Please send any additional documents associated with the RFP to RFI/RFPResponseCenter_@rapid7.com',true);	
			}
			/*if(step.getName() == "submit"){
				
			}*/
		}
	
		response.writePage(assistant);
	}
		
	// Handle user submit POST requests
	if (request.getMethod() == 'POST') {
		assistant.setError(null);
					
		/* 1. if they clicked the finish button, mark setup as done and redirect to assistant page */
		if (assistant.getLastAction() == "finish") {
			
			var rfpId = createNewRfp(objRfpSession);
			
			// Attach RFP to Opportunity
			try{
				var oppId = objRfpSession.custpage_opportunity;
				var recOpportunity = nlapiLoadRecord('opportunity',oppId);
				recOpportunity.setFieldValue('custbodyr7opprfp',rfpId);
				nlapiSubmitRecord(recOpportunity);
			}
			catch(e){
				nlapiLogExecution('DEBUG','ERROR ATTACHING RFP TO OPPORTUNITY',e);
				nlapiSendEmail(340932,340932,'ERROR ATTACHING RFP TO OPPORTUNITY','ERROR ATTACHING RFP TO OPPORTUNITY\n'+e);
			}
			
			assistant.setFinished('Your RFP'+rfpId+' has been submitted.');
			nlapiGetContext().setSessionObject('rfp_json', '{}');
			nlapiSetRedirectURL('RECORD', 'customrecordr7rfp', rfpId, false );
			//assistant.sendRedirect(response); //send response to reset assistant
		}
		
		/* 2. if they clicked the "cancel" button, take them to a different page (setup tab) altogether as appropriate. */
		else if (assistant.getLastAction() == "cancel") {
			/*
			 * If cancel, clear session object and return to the referring opp
			 */
			
			nlapiGetContext().setSessionObject('rfp_json', '{}');
			objRfpSession = new Object;
			// Redirect to the first step
			//if (!assistant.hasError()) assistant.setCurrentStep(assistant.getStep("generalinformation"));
			// Redirect to referrinOpp
			//nlapiSetRedirectURL('RECORD', 'opportunity', oppId, false );
			//nlapiSetRedirectURL('SUITELET', 'customscriptr7rfpbantassistant', 'customdeployqualifyrfp', params);
			/*
			 * Close Window
			 */
			response.writeLine("<html><body onload='win_close()'><script language='Javascript'>function win_close(){ window.opener = top; window.close(); }</script></body></html>");
		}
			
		/* 3. For all other actions (next, back, jump), process the step and redirect to assistant page. */
		else {
			/*
			 * POST for General Info
			 */
			if (assistant.getLastStep().getName() == "generalinformation" && (assistant.getLastAction() == "next" || assistant.getLastAction() == "jump" )) {

				// Add all fields to session object
				objRfpSession['custpage_customer'] = request.getParameter('custpage_customer');
				objRfpSession['custpage_salesrep'] = request.getParameter('custpage_salesrep');
				objRfpSession['custpage_securitysolutionsrep'] = request.getParameter('custpage_securitysolutionsrep');
				objRfpSession['custpage_opportunity'] = request.getParameter('custpage_opportunity');
				objRfpSession['custpage_type']  = request.getParameter('custpage_type');
				
				// Persist Data in rfp_json session
				persistData(objRfpSession);
				//nlapiGetContext().setSessionObject('custparam_oppid', oppId);
			}
			/*
			 * POST for BANT
			 */
			if (assistant.getLastStep().getName() == "bant" &&  (assistant.getLastAction() == "next" || assistant.getLastAction() == "jump" )) {
				// Add all fields to session object
	
				objRfpSession['custpage_budgetamount'] = request.getParameter('custpage_budgetamount');
				objRfpSession['custpage_budgetapproved'] = request.getParameter('custpage_budgetapproved'); // Y=+1
				objRfpSession['custpage_workedwr7before'] = request.getParameter('custpage_workedwr7before'); // Y=+1
				objRfpSession['custpage_budgetcomments'] = request.getParameter('custpage_budgetcomments');
				objRfpSession['custpage_approverknown'] = request.getParameter('custpage_approverknown');
				objRfpSession['custpage_approverrelationship'] = request.getParameter('custpage_approverrelationship'); // Y=+1
				objRfpSession['custpage_otherbidders'] = request.getParameter('custpage_otherbidders'); // (n>7)=-3; (n<7 and >=5)=-2; (n=4)=-1; (n=3)=0; (n=2)=+1; (n=1)=+2
				objRfpSession['custpage_approvercomments'] = request.getParameter('custpage_approvercomments');
				objRfpSession['custpage_servicesrequired'] = request.getParameter('custpage_servicesrequired');
				objRfpSession['custpage_ddd'] = request.getParameter('custpage_ddd'); // If date is <30 from today�s date = -1
				objRfpSession['custpage_strategicplay'] = request.getParameter('custpage_strategicplay'); // y=+1
				objRfpSession['custpage_needcomments'] = request.getParameter('custpage_needcomments');
				objRfpSession['custpage_questionsduedate'] = request.getParameter('custpage_questionsduedate'); // If date is <3 from today�s date = -1
				objRfpSession['custpage_vendorscopedate'] = request.getParameter('custpage_vendorscopedate'); 
				objRfpSession['custpage_responseduedate'] = request.getParameter('custpage_responseduedate'); // If date is <15 from today�s date = -1
				objRfpSession['custpage_hardcopyyesorno'] = request.getParameter('custpage_hardcopyyesorno'); //If Y recalculate date from cell above and if now less than 15 days, put -1 above. (If it was already -1, no action)
				objRfpSession['custpage_expectedstartdate'] = request.getParameter('custpage_expectedstartdate'); // If date is <30 from today�s date = -1
				objRfpSession['custpage_expectedenddate'] = request.getParameter('custpage_expectedenddate'); // If date is <30 from today�s date = -1
				
				// Handle BANT Scoring
				//-------------------//
					var today = new Date();
					var score = new Number();
					if(objRfpSession['custpage_budgetapproved'] == 'T'){
						score += 1;
					}
					if(objRfpSession['custpage_workedwr7before'] == 'T'){
						score +=1;
					}
					if(objRfpSession['custpage_approverrelationship'] == 'T'){
						score +=1;
					}
					var bidders = objRfpSession['custpage_otherbidders'];
					if (bidders != null && bidders != '') {
						if (bidders >= 7) {
							score -= 3;
						}
						else if (7 > bidders >= 5) {
							score -= 2;
						}
						else if (bidders == 4) {
							score -= 1;
						}
						else if (bidders == 3) {
							score += 0;
						}
						else if (bidders == 2) {
							score += 1;
						}
						else if (bidders <= 1) {
							score += 2;
						}
					}
					if (objRfpSession['custpage_ddd'] != null && objRfpSession['custpage_ddd'] != '') {
						var ddd = nlapiStringToDate(objRfpSession['custpage_ddd']);
						if (ddd.getDate() < (today.getDate() + 30)) {
							score -= 1;
						}
					}
					if(objRfpSession['custpage_strategicplay'] == 'T'){
						score +=1;
					}
					if (objRfpSession['custpage_questionsduedate'] != null && objRfpSession['custpage_questionsduedate'] != '') {
						var questionsDueDate = nlapiStringToDate(objRfpSession['custpage_questionsduedate']);
						if (questionsDueDate.getDate() < (today.getDate() + 3)) {
							score -= 1;
						}
					}
					var hardcopy = objRfpSession['custpage_hardcopyyesorno'];
					if (objRfpSession['custpage_responseduedate'] != null && objRfpSession['custpage_responseduedate'] != '') {
						var responseDueDate = nlapiStringToDate(objRfpSession['custpage_responseduedate']);
						if (hardcopy == 'Y'){
							responseDueDate.setDate(responseDueDate.getDate() -1);
							objRfpSession['custpage_responseduedate'] = nlapiDateToString(responseDueDate);
						}
						if (responseDueDate.getDate() < (responseDueDate.getDate() +15)){
							score -=1;
						}
					}
					if (objRfpSession['custpage_expectedstartdate'] != null && objRfpSession['custpage_expectedstartdate'] != '') {
						var expectedStart = nlapiStringToDate(objRfpSession['custpage_expectedstartdate']);
						if (expectedStart.getDate() < (today.getDate() +30)){
							score -=1;
						}
					}
					if (objRfpSession['custpage_expectedenddate'] != null && objRfpSession['custpage_expectedenddate'] != '') {
						var expectedEnd = nlapiStringToDate(objRfpSession['custpage_expectedenddate']);
						if (expectedEnd.getDate() < (today.getDate() + 30)) {
							score -= 1;
						}
					}	
					
					objRfpSession['bantscore'] = score;
				//-------------------//

				// Persist Data in rfp_json session
				persistData(objRfpSession);
				//nlapiGetContext().setSessionObject('custparam_oppid', oppId);
			}
			/*
			 * POST for Legal
			 */
			if (assistant.getLastStep().getName() == "legal" &&  (assistant.getLastAction() == "next" || assistant.getLastAction() == "jump" )) {
				// Add all fields to session object
				objRfpSession['custpage_legaldocs'] = request.getParameter('custpage_legaldocs');
				
				// Calculate Legal Score
				//-------------------//
				var score = new Number();
				if (objRfpSession['custpage_legaldocs'] != null && objRfpSession['custpage_legaldocs'] != ''){
					score -=1;
				}
				objRfpSession['legalscore'] = score;
				//-------------------//
				
				// Persist Data in rfp_json session
				persistData(objRfpSession);
			}
			/*
			 * POST for Additional
			 */
			if (assistant.getLastStep().getName() == "additional" &&  (assistant.getLastAction() == "next" || assistant.getLastAction() == "jump" )) {
				// Add all fields to session object
				var rfpType = objRfpSession.custpage_type;
				
				// Product questions
				if (rfpType == 2 || rfpType == 3) {
					objRfpSession['custpage_evaldate'] = request.getParameter('custpage_evaldate');
					objRfpSession['custpage_evallength'] = request.getParameter('custpage_evallength');
					objRfpSession['custpage_implementationdate'] = request.getParameter('custpage_implementationdate');
					objRfpSession['custpage_favorablediff'] = request.getParameter('custpage_favorablediff');
					objRfpSession['custpage_integrationpoints'] = request.getParameter('custpage_integrationpoints');
				}
				// Service questions
				if (rfpType == 1 || rfpType == 3) {
					objRfpSession['custpage_subcontractorsallowed'] = request.getParameter('custpage_subcontractorsallowed');
					objRfpSession['custpage_commonorcustom'] = request.getParameter('custpage_commonorcustom');
					objRfpSession['custpage_completescope'] = request.getParameter('custpage_completescope');
					objRfpSession['custpage_sowpossible'] = request.getParameter('custpage_sowpossible');
					objRfpSession['custpage_opentoquestions'] = request.getParameter('custpage_opentoquestions');
					objRfpSession['custpage_auditrelated'] = request.getParameter('custpage_auditrelated');
					objRfpSession['custpage_servicecomments'] = request.getParameter('custpage_servicecomments');
					
					// Calculate Service Score
					//-------------------//
					var score = new Number();
					if(objRfpSession['custpage_subcontractorsallowed'] == 'T'){
						score +=1;
					}
					if(objRfpSession['custpage_commonorcustom'] == 'T'){
						score +=1;
					}
					if(objRfpSession['custpage_sowpossible'] == 'T'){
						score +=1;
					}
					objRfpSession['servicescore'] = score;
					//-------------------//
				}
				// Persist Data in rfp_json session				
				persistData(objRfpSession);
			}
			/*
			 * POST for Upload
			 */
			if (assistant.getLastStep().getName() == "upload" &&  (assistant.getLastAction() == "next" || assistant.getLastAction() == "jump" )) {
				// Get file from upload step
				var file = request.getFile('custpage_file');
				// Upload File to File Cabinet
				var fileId = uploadFile(file);
				nlapiLogExecution('DEBUG','file',fileId);	
				// Store fileId in session object
				objRfpSession['custpage_file'] = fileId;
				persistData(objRfpSession);
			}
			/*
			 * Load Next step if user clicks next and no error.
			 */
			if (!assistant.hasError()) assistant.setCurrentStep(assistant.getNextStep());
			
			/*var params = new Array();
			params['custparam_oppid'] = oppId;*/
			 
			assistant.sendRedirect(response);//,params);
		}
	}
}

function persistData(object){
	var json = JSON.stringify(object);
	nlapiGetContext().setSessionObject('rfp_json',json);
}

function findEmployeesByDepartment(departmentId){
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('department',null,'is',departmentId);
	filters[1] = new nlobjSearchFilter('isinactive',null,'is','F');
	
	var columns = new Array();
		columns[0] = new nlobjSearchColumn('internalid');
		columns[1] = new nlobjSearchColumn('firstname');
		columns[1].setSort(false);
		columns[2] = new nlobjSearchColumn('lastname');
	
	var object = new Object();
		
	var searchResults = nlapiSearchRecord('employee', null, filters, columns);
	for (var i=0; searchResults != null && i < searchResults.length; i++){
		searchResult = searchResults[i];
		// Build object where key is contactId and value is 'first last'
		var contactId = searchResult.getValue(columns[0]);
		var firstName = searchResult.getValue(columns[1]);
		var lastName = searchResult.getValue(columns[2]);
		object[contactId] = firstName + ' ' + lastName;
	}
	return object;
}

function findCustomerContacts(customerId){
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('company',null,'is',customerId);
	filters[1] = new nlobjSearchFilter('isinactive',null,'is','F');
	
	var columns = new Array();
		columns[0] = new nlobjSearchColumn('internalid');
		columns[1] = new nlobjSearchColumn('firstname');
		columns[2] = new nlobjSearchColumn('lastname');
	
	var objCustomerContacts = new Object();
		
	var searchResults = nlapiSearchRecord('contact', null, filters, columns);
	for (var i=0; searchResults != null && i < searchResults.length; i++){
		searchResult = searchResults[i];
		// Build object where key is contactId and value is 'first last'
		var contactId = searchResult.getValue(columns[0]);
		var firstName = searchResult.getValue(columns[1]);
		var lastName = searchResult.getValue(columns[2]);
		objCustomerContacts[contactId] = firstName + ' ' + lastName;
	}
	return objCustomerContacts;
}

function uploadFile(file){
	if (file != null && file != '') {
		try {
			// set the folder where this file will be added.
			// 529916 is Sales & Marketing > RFP Qualification
			file.setFolder(529916);
			
			// now create file and upload it to the file cabinet
			var id = nlapiSubmitFile(file);
		}
		catch(e){
			nlapiLogExecution('DEBUG','ERROR UPLOADING RFP FILE',e);
			nlapiSendEmail(340932,340932,'ERROR UPLOADING RFP FILE','ERROR UPLOADING RFP FILE\n'+e);
		}
		return id;
	}
}

function attachFile(file,rfpId){
	if (file != null && file != '' && rfpId != null && rfpId != '') {
		try {
			nlapiAttachRecord('file', file, 'customrecordr7rfp', rfpId);
		}
		catch(e){
			nlapiLogExecution('DEBUG','ERROR ATTACHING RFP FILE TO RFP'+rfpId,e);
			nlapiSendEmail(340932,340932,'ERROR ATTACHING RFP FILE TO RFP'+rfpId,e);
		}
	}  
}

function createNewRfp(objRfpSession){
	
	// Loop through all submitted values to set new record values
	var rfpFields = new Object();
	
	// Build RFP name as 'customer + type + month + year'
	var customerId = objRfpSession.custpage_customer;
	var customerName = nlapiLookupField('customer',customerId,'companyname');
	var rfpType = objRfpSession.custpage_type;

	switch(rfpType){
		case '1': // Service
			rfpType = 'Service';
			break;
		case '2': // Product
			rfpType = 'Product';
			break;
		case '3': // Service/Product
			rfpType = 'Product/Service';
			break;
	}
	// Calculate score by adding step scores
	nlapiLogExecution('DEBUG','BANT Score',objRfpSession['bantscore']);
	nlapiLogExecution('DEBUG','Legal Score',objRfpSession['legalscore']);
	nlapiLogExecution('DEBUG','Service Score',objRfpSession['servicescore']);
	objRfpSession['custpage_totalscore'] = parseInt(objRfpSession['bantscore']) + parseInt(objRfpSession['legalscore']) + parseInt(objRfpSession['servicescore']); // + additionalscore
	// if score is empty then = 0
	if(objRfpSession['custpage_totalscore'] == null || objRfpSession['custpage_totalscore'] == ''){
		objRfpSession['custpage_totalscore'] = 0;
	}
	
	// Grab date today, then month name and year
	var today = new Date();
	var monthNames = [ "January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December" ];
	var month = monthNames[today.getMonth()];
	var year = today.getFullYear();

	rfpFields['altname'] = customerName + ' - ' + rfpType + ' -  ' + month + ' ' + year; // altname instead of name
	// Set approval status
	rfpFields['custrecordr7rfpapprovalstatus'] = 1; //Pending Approval
	for(key in objRfpSession){
		if (objRfpSession[key] != null && objRfpSession[key] != '' && objRfpSession[key] != 'custpage_file') { // Exclude file field
			// switch 'custpage_' to 'custrecordr7rfp'
			var newPrefix = key.replace('custpage_','custrecordr7rfp');
			// set field key:value pairs
			rfpFields[newPrefix] = objRfpSession[key];
			nlapiLogExecution('DEBUG', key, objRfpSession[key]);
		}
	}
	// Create New RFP Record using key:value pairs from rfpFields
	var recRfp = nlapiCreateRecord('customrecordr7rfp');
	for (rfpField in rfpFields) {
		recRfp.setFieldValue(rfpField, rfpFields[rfpField]);
	}
	// Submit Record
	var rfpId = nlapiSubmitRecord(recRfp);
	
	/*
	 * Attach File to newly created RFP
	 */
	var file = objRfpSession['custpage_file'];
	attachFile(file,rfpId);
	return rfpId;
}

/*
 * This function is just a place holder for matching all assistant custpage fields with the custom RFP record custrecord IDs
 * 		It shouldn't be necessary since all sufix IDs are the same.  Record create function will match dynamically
 */
function pairRecordIds(){
	var pairIds = new Object();
	
	idPairs['custpage_customer'] = 'custrecordr7rfpcustomer';
	idPairs['custpage_salesrep'] = 'custrecordr7rfpsalesrep';
	idPairs['custpage_securitysolutionsrep'] = 'custrecordr7rfpopportunity';
	idPairs['custpage_opportunity'] = 'custrecordr7rfpsecuritysolutionsrep';
	idPairs['custpage_type'] = 'custrecordr7rfptype';
	
	idPairs['custpage_budgetamount'] = 'custrecordr7rfpbudgetamount';
	idPairs['custpage_budgetapproved'] = 'custrecordr7rfpbudgetapproved';
	idPairs['custpage_workedwr7before'] = 'custrecordr7rfpworkedwr7before';
	idPairs['custpage_budgetcomments'] = 'custrecordr7rfpbudgetcomments';
	
	idPairs['custpage_approverknown'] = 'custrecordr7rfpapproverknown';
	idPairs['custpage_approverrelationship'] = 'custrecordr7rfpapproverrelationship';
	idPairs['custpage_otherbidders'] = 'custrecordr7rfpotherbidders';
	idPairs['custpage_approvercomments'] = 'custrecordr7rfpapprovercomments';
	
	idPairs['custpage_servicesrequired'] = 'custrecordr7rfpservicesrequired';
	idPairs['custpage_ddd'] = 'custrecordr7rfpddd';
	idPairs['custpage_strategicplay'] = 'custrecordr7rfpstrategicplay';
	idPairs['custpage_needcomments'] = 'custrecordr7rfpneedcomments';
	
	idPairs['custpage_questionsduedate'] = 'custrecordr7rfpquestionsduedate';
	idPairs['custpage_vendorscopedate'] = 'custrecordr7rfpvendorscopedate';
	idPairs['custpage_responseduedate'] = 'custrecordr7rfpresponseduedate';
	idPairs['custpage_hardcopyyesorno'] = 'custrecordr7rfphardcopyyesorno';
	idPairs['custpage_expectedstartdate'] = 'custrecordr7rfpexpectedstartdate';
	idPairs['custpage_expectedenddate'] = 'custrecordr7rfpexpectedenddate';
	
	idPairs['custpage_legaldocs'] = 'custrecordr7rfplegaldocs';
	
	idPairs['custpage_evaldate'] = 'custrecordr7rfpevaldate';
	idPairs['custpage_evallength'] = 'custrecordr7rfpevallength';
	idPairs['custpage_implementationdate'] = 'custrecordr7rfpimplementationdate';
	idPairs['custpage_favorablediff'] = 'custrecordr7rfpfavorablediff';
	idPairs['custpage_integrationpoints'] = 'custrecordr7rfpintegrationpoints';
	
	idPairs['custpage_subcontractorsallowed'] = 'custrecordr7rfpcommonorcustom';
	idPairs['custpage_commonorcustom'] = 'custrecordr7rfpsubcontractorsallowed';
	idPairs['custpage_completescope'] = 'custrecordr7rfpopentoquestions';
	idPairs['custpage_sowpossible'] = 'custrecordr7rfpsowpossible';
	idPairs['custpage_opentoquestions'] = 'custrecordr7rfpservicecomments';
	idPairs['custpage_auditrelated'] = 'custrecordr7rfpauditrelated';
	idPairs['custpage_servicecomments'] = 'custrecordr7rfpcompletescope';
	
 	return idPairs;	
}	

/*
 * List of each field internal Id organized by steps
 * 
	General Info
		custpage_customer
		custpage_salesrep
		custpage_securitysolutionsrep
		custpage_opportunity
		custpage_type
	BANT
	 budget	
		custpage_budgetamount
		custpage_budgetapproved
		custpage_workedwr7before
		custpage_budgetcomments
	 authority
		custpage_approverknown
		custpage_approverrelationship
		custpage_otherbidders
		custpage_approvercomments
	 need
		custpage_servicesrequired
		custpage_ddd
		custpage_strategicplay
		custpage_needcomments
	 timimg	
		custpage_questionsduedate
		custpage_vendorscopedate
		custpage_responseduedate
		custpage_hardcopyyesorno
		custpage_expectedstartdate
		custpage_expectedenddate
	Legal
		custpage_legaldocs
	Additional
	 product
		custpage_evaldate
		custpage_evallength
		custpage_implementationdate
		custpage_favorablediff
		custpage_integrationpoints
	 services
		custpage_subcontractorsallowed
		custpage_commonorcustom
		custpage_completescope
		custpage_sowpossible
		custpage_opentoquestions
		custpage_auditrelated
		custpage_servicecomments
	Upload
		custpage_file
 */


/*
 * This funtcion grabs an array of fields from the assistant and gets the value of each field.
 * 	Can only be used on GET
 * /
 /*function getAllFieldsValuesByStep(assistant,step){
	var allFields = assistant.getAllFields();
	for (var z = 0; allFields != null && z < allFields.length; z++) {
		var field = allFields[z];
		nlapiLogExecution('DEBUG',step.getName(),field);
		nlapiLogExecution('DEBUG',field,step.getFieldValue(field));
	}
}*/

