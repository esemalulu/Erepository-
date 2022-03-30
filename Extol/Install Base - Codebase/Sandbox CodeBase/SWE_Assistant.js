/**
 * @author eligon
 * 
 * Script Name:		SWE Setup Assistant
 * Company:			NetSuite, Inc.
 */

var SWE;
if (!SWE) SWE = {};
if (!SWE.Setup) SWE.Setup = {};
if (!SWE.Setup.Assistant) SWE.Setup.Assistant = {};

//error reporting constants
SWE.Setup.ASSISTANT_SCRIPT_NAME	  = 'SWE_Assistant';
SWE.Setup.CUSTOM_ERROR_CODE       = 'SWE_Assistant Error';
SWE.Setup.CUSTOM_DEBUG_CODE       = 'SWE_Assistant Debug';
SWE.Setup.SUITELET_TITLE          = 'Software Edition Setup Assistant';
SWE.Setup.MASTER_TEMPLATE_ACCOUNT = '981178'                                    // SWE Master Template Account
SWE.Setup.CONFIGURATION_ACCOUNT   = '1101379'                                   // SWE Configuration Account 
SWE.Setup.ADMIN_ROLE              = 3;                                          // administrator role id = 3
SWE.Setup.TASK_LINK_HOME          = 'CARD_-29';                                 // Home Page tasklink  
SWE.Setup.TASK_LINK_SETUP         = 'CARD_-10';                                 // Setup Page tasklink          
SWE.Setup.TASK_LINK_ON_CANCEL     = SWE.Setup.TASK_LINK_SETUP; 
SWE.Setup.SETUP_FILE_NAME         = 'SWE_SETUP_IS_DONE.txt'; 
SWE.Setup.SETUP_FOLDER_NAME       = 'SWE_SETUP_FOLDER'; 

/**
 * Implements a 2-step assistant that runs the SWE setup script in the background.
 * State is managed throughout the life of the user's session but is not persisted across sessions.
 *
 * @param request   request object
 * @param response  response object
 */
function showAssistant(request, response){
    SWE.Setup.Assistant.showAssistant(request, response);
}

function afterUpdate_SWEPostInstall(fromversion, toversion) {
	SWE.Setup.Assistant.clearLandingPage();
}

SWE.Setup.Assistant.showAssistant = function (request, response) {
    var LOG_TITLE = 'SWE.Setup.Assistant.showAssistant';
    var logger = new PSG.Library.Logger(LOG_TITLE, false);                      // by default the logger is disabled
    logger.enable();                                                            // uncomment this line to enable debug
    
	try {
        var setUpExistsAlready = SWE.Setup.Assistant.setUpFileExists();
        if (setUpExistsAlready) {
            logger.audit(PSG.Library.StringUtils.prettifyMessage('setUpExistsAlready', setUpExistsAlready));
            logger.debug('Setup script has already been executed in the current account. Aborting script execution. Redirecting page to Home.');
            SWE.Setup.Assistant.clearLandingPage();
            nlapiSetRedirectURL('tasklink', SWE.Setup.TASK_LINK_HOME);
            return;
        }

		/* if the current user's company is 981178/110137, don't show the assistant */
        var companyAccount    = nlapiGetContext().getCompany();
        var isTemplateAccount = ((companyAccount == SWE.Setup.MASTER_TEMPLATE_ACCOUNT) || (companyAccount == SWE.Setup.CONFIGURATION_ACCOUNT));
        var companyAccount = nlapiGetContext().getCompany();
		if (isTemplateAccount) {
            logger.audit(PSG.Library.StringUtils.prettifyMessage('companyAccount,SWE.Setup.MASTER_TEMPLATE_ACCOUNT,SWE.Setup.CONFIGURATION_ACCOUNT', 
                                                                  companyAccount,SWE.Setup.MASTER_TEMPLATE_ACCOUNT,SWE.Setup.CONFIGURATION_ACCOUNT));
            logger.debug('Current account is a template account. Aborting script execution. Redirecting page to Home');
            nlapiSetRedirectURL('tasklink', SWE.Setup.TASK_LINK_HOME);          //just redirect to home
            return;
        }
        logger.audit(PSG.Library.StringUtils.prettifyMessage('setUpExistsAlready,isTemplateAccount,companyAccount,SWE.Setup.MASTER_TEMPLATE_ACCOUNT,SWE.Setup.CONFIGURATION_ACCOUNT', 
                                                              setUpExistsAlready,isTemplateAccount,companyAccount,SWE.Setup.MASTER_TEMPLATE_ACCOUNT,SWE.Setup.CONFIGURATION_ACCOUNT));
        
        
        var userRole = nlapiGetContext().getRole(); 
        var isUserRoleAdmin = userRole == SWE.Setup.ADMIN_ROLE;
        
        logger.audit(PSG.Library.StringUtils.prettifyMessage('isUserRoleAdmin,userRole,SWE.Setup.ADMIN_ROLE', isUserRoleAdmin,userRole,SWE.Setup.ADMIN_ROLE));
        
		if (isUserRoleAdmin) {                                                  //show the assistant only for administrator role
            logger.audit(PSG.Library.StringUtils.prettifyMessage('userRole,SWE.Setup.ADMIN_ROLE', userRole,SWE.Setup.ADMIN_ROLE));
            logger.debug('User is ADMIN');
		
		    /* first create assistant object and define its steps. */
		    var assistant = nlapiCreateAssistant(SWE.Setup.SUITELET_TITLE);
            
		    assistant.addStep('welcomeAndCongratulations',  'Welcome!!!')
                     .setHelpText("<br><b>Welcome And Congratulations!!!</b>" +
                                  "<br/><br/>" +
                                  "<br/>You have logged in to your newly provisioned NetSuite account for Software Edition." +
                                  "<br/><br/>" +
                                  "<br/>Upon logging in, you automatically scheduled the script that will configure your Software Edition account." +
                                  "<br/><br/><br/>" +
                                  "<b>Congratulations!</b>");
                                  
            assistant.addStep('companypreferences', 'Setup Custom Preferences').setHelpText("<br/><b>Please take your time and accomplish the custom preferences page of your account by going to:</b><br/><br/>&nbsp;&nbsp;&nbsp;&nbsp;[ Setup > Company > General Preferences > Custom Preferences (tab) ].");
            
            /* handle page load (GET) requests. */
		    if (request.getMethod() == 'GET') { 
	        	if (!assistant.isFinished()) {                                  // check if assistant is finished or not
		            if (assistant.getCurrentStep() == null) {                   // set the default step on first use of the assistant
		                logger.debug('assistant.getCurrentStep() == null.');
		                logger.debug('Setting the default Step on first use of the SWE Assistant.');

                        logger.debug('Execute the setup script on first use of the SWE Assistant.');
                        SWE.Setup.Assistant.executeSetup();
                        
		            	assistant.setCurrentStep(assistant.getStep("welcomeAndCongratulations"));
		                assistant.setSplash("Welcome to the Software Edition Setup Assistant!",
		                		"<b>What you'll be doing</b><br/><br/>The SWE Setup Assistant will automatically configure your NetSuite account for Software Edition.",
		                		"<b>When you finish</b><br/><br/>The Software Edition will be properly configured on your account.");

		            } else {
		                logger.debug('assistant.getCurrentStep().getName() == ' + assistant.getCurrentStep().getName());
                    } 
                    
		            var step = assistant.getCurrentStep();
                    if (step.getName() == "companypreferences") {
                        logger.debug('Processing step :: companypreferences.');
                        assistant.addFieldGroup("companyprefs", "NetSuite Software Edition - Custom Preferences");
                    }
		        }
		        response.writePage(assistant);
		    } else { 
                /* handle user submit (POST) requests. */
                assistant.setError(null);
               
                var lastAction = assistant.getLastAction();
		        if (lastAction == "finish") {
		            /* 1. if they clicked the finish button, mark setup as done and redirect to assistant page */
                    logger.debug('Processing step :: lastAction == finish.');
                    
		            assistant.setFinished("<br/>You have successfully scheduled the setup of Software Edition on your account.<br/>Please wait for a while.  <br/><br/>This may take several minutes for the Software Edition to be configured properly.");
		            assistant.sendRedirect(response);
                    
		        } else if (lastAction == "cancel") {
		            /* 2. if they clicked the "cancel" button, take them to a different page (setup tab) altogether as appropriate. */
                    logger.debug('Processing step :: lastAction == cancel.');
	                logger.debug('Redirecting page to Home');
                    nlapiSetRedirectURL('tasklink', SWE.Setup.TASK_LINK_ON_CANCEL);
                    
		        } else {
		            /* 3. For all other actions (next, back, jump), record the step they are on and redirect to assistant page. */
                    logger.debug('Processing :: For all other actions (next, back, jump).');
                    var lastStepName = assistant.getLastStep().getName();
                    if ((lastStepName == "companypreferences") && (lastAction == "next")) {
                        logger.debug('Processing :: ((lastStepName == companypreferences && (lastAction == next)).');
                    }
                    if (!assistant.hasError()) assistant.setCurrentStep(assistant.getNextStep());
                    assistant.sendRedirect(response);
		        }
		    }
		} else { //if the user's role is not administrator, don't show the assistant and tell him/her to logout
            logger.debug('User is NOT ADMIN');
			if (request.getMethod() == 'GET') {
                logger.debug('Redirecting user to warning page');
				var form = nlapiCreateForm(SWE.Setup.SUITELET_TITLE);
				form.addField('custpage_sometext', 'label', '<p align="left"><b>WARNING:</b><br/>This account has not been properly configured.  Please contact your administrator, and logoff immediately.</p>');
				form.addSubmitButton('OK');
				response.writePage(form);
		    } else {
                logger.debug('Redirecting user to home');
				nlapiSetRedirectURL('tasklink', SWE.Setup.TASK_LINK_HOME);      //redirect to home
                return;
			}
		}
	} catch (ex) {
        logger.error(SWE.Setup.CUSTOM_ERROR_CODE, 'showAssistant::exception = ' + ex);
	}
}

SWE.Setup.Assistant.setUpFileExists = function() {
    var retBool = false;
    if (PSG.Library.FileUtils.getFolderId(SWE.Setup.SETUP_FOLDER_NAME)) {
        retBool = true;
    } 
    return retBool;
}

SWE.Setup.Assistant.createSetUpFile = function() {
    var setUpFolderId = PSG.Library.FileUtils.getOrCreateFolder(SWE.Setup.SETUP_FOLDER_NAME);
}

SWE.Setup.Assistant.clearLandingPage = function() {
    var objConfig = nlapiLoadConfiguration('companypreferences');
    if (objConfig.getFieldText('CUSTOMLANDINGPAGE') == SWE.Setup.ASSISTANT_SCRIPT_NAME)
    	objConfig.setFieldValue('CUSTOMLANDINGPAGE', null);
    nlapiSubmitConfiguration(objConfig);
}

/**
 * Main function to call when doing data setup after SWE Bundle Instrallation 
 */
SWE.Setup.Assistant.executeSetup =  function () {
    nlapiLogExecution('DEBUG', 'Setup Script :: SWE', 'Executing Migrate.');

    /*
     setupFeatures() 				                                            // feature is not a scriptable record - candidate for automation
                                                                                // Only feature status verification is scriptable
     setupCompanyPreferences() 		                                            // SEMI SCRIPTABLE - companypreference2 is exposed as a configuration object.
     setupNamingPreferences() 		                                            // namingpreference2 is not a scriptable record - candidate for automation
     setupTransactionNames() 		                                            // tranname2 is not a scriptable record - candidate for automation
     */
    SWE.Setup.Assistant.setupSWECustomerCategory();                             // SCRIPTABLE - custtype        is now a scriptable record as of 2009.2
    SWE.Setup.Assistant.setupSWECustomerStatus()                                // SCRIPTABLE - entitystatus    is now a scriptable record as of 2009.2
    SWE.Setup.Assistant.setupSWEJobType()                                       // SCRIPTABLE - jobtype         is now a scriptable record as of 2009.2
    SWE.Setup.Assistant.setupSWEJobStatus()                                     // SCRIPTABLE - entitystatus    is now a scriptable record as of 2009.2
    SWE.Setup.Assistant.setupSWEBillingSchedule()                               // SCRIPTABLE - billingschedule is now a scriptable record as of 2009.2

    nlapiLogExecution('DEBUG', 'Setup Script :: SWE', 'Clear the Landing Page.');
    SWE.Setup.Assistant.clearLandingPage();
    
    nlapiLogExecution('DEBUG', 'Setup Script :: SWE', 'Creating setup file.');
    SWE.Setup.Assistant.createSetUpFile();
}


/**
 * Creating a new record based on the parameters.
 * 
 * This function is a candidate for putting into a separate SWE utilities library 
 * 
 * @param {Object} recordType
 * @param {Object} recordText
 * @param {Object} fieldNames
 * @param {Object} fieldValues
 */

SWE.Setup.Assistant.createNewRecord = function (recordType, recordText, fieldNames, fieldValues) {
	if (!recordType || !recordText) {
		nlapiLogExecution('ERROR', 'ERROR: createRecord', '<pre>' + 
						  'FAILED :: Please provide a correct [Record Type] and [Record Text].' +
						  '\n' + '       :: Provided Record Type is [' + recordType + '] and Provided Record Text is [' + recordText + ']' +
						  '</pre>');
	} else if (!fieldNames || !fieldValues) {
		nlapiLogExecution('ERROR', 'ERROR: createRecord', '<pre>' + 
						  'FAILED :: Please provide the correct [Field Names] and [Field Values]. Record Type is [' + recordType + '].' +
						  '\n' + '       :: Provided Field Names are [' + fieldNames + ']' +
						  '\n' + '       :: Provided Field Values are [' + fieldValues + ']' +
						  '</pre>');
	} else if (fieldNames.length != fieldValues.length) {
		nlapiLogExecution('ERROR', 'ERROR: createRecord', '<pre>' + 
						  'FAILED :: [Field Names] and [Field Values] does not match. Record Type is [' + recordType + '].' +
						  '\n' + '       :: Provided Field Names are [' + fieldNames + ']' +
						  '\n' + '       :: Provided Field Values are [' + fieldValues + ']' + 
						  '</pre>');
	} else {
		try {
			var newRecord = nlapiCreateRecord(recordType);
			for (var counter = 0; fieldNames && fieldValues && (counter < fieldNames.length) && (counter < fieldValues.length); counter++) {
				newRecord.setFieldValue(fieldNames[counter], fieldValues[counter]);
			}
			var newRecordId = nlapiSubmitRecord(newRecord, true);
			nlapiLogExecution('AUDIT', 'CREATE : ' + recordType, 'ADDED :: ' + recordText + ' [ ' + fieldValues[0] + ' ] with Id = ' + newRecordId);
		} catch (exception) {
			if (exception instanceof nlobjError) {
				nlapiLogExecution('ERROR', exception.getCode(), 
								  'FAILED :: Creation of ' + recordText + ' [ ' + fieldValues[0] + ' ] ' + 
								  '\n     :: ' + exception.getDetails());
			} else {
				nlapiLogExecution('ERROR', exception.getCode(), 
								  'FAILED :: Creation of ' + recordText + ' [ ' + fieldValues[0] + ' ] '+ 
				                  '\n     :: ' + exception);
			}
		}
	}
}

/**
 * SWE Utilities - in creating:
 *     Customer Category 
 *     Customer Status   
 *     Job Type 		
 *     Job Status   	
 *     Billing Schedule
 */

/**
 * Creates all the customer category necessary for SWE
 *  
 * ORIGINAL SQL Statements:
 * 	   INSERT INTO custtype (nkey, sname, binactive) SELECT nl_seq.next_val('custtype'), 'Distributor',   'F' FROM DUAL;
 * 	   INSERT INTO custtype (nkey, sname, binactive) SELECT nl_seq.next_val('custtype'), 'Donation',      'F' FROM DUAL;
 * 	   INSERT INTO custtype (nkey, sname, binactive) SELECT nl_seq.next_val('custtype'), 'End User',      'F' FROM DUAL;
 * 	   INSERT INTO custtype (nkey, sname, binactive) SELECT nl_seq.next_val('custtype'), 'Internal',      'F' FROM DUAL;
 * 	   INSERT INTO custtype (nkey, sname, binactive) SELECT nl_seq.next_val('custtype'), 'Press/Analyst', 'F' FROM DUAL;
 * 	   INSERT INTO custtype (nkey, sname, binactive) SELECT nl_seq.next_val('custtype'), 'Reseller',      'F' FROM DUAL;
 */
SWE.Setup.Assistant.setupSWECustomerCategory = function() {

    // NEED TO CONFIRM: Upon checking, these values already exist even prior to running the setup scripts

    /* To verify go to: 
     *    [ Setup > Accounting > Accounting List > Customer Category ] 
     */
    
    nlapiLogExecution('DEBUG', 'setupSWECustomerCategory', '*** START - setupSWECustomerCategory ***');

	var recordType = 'customerCategory';
	var recordText = 'Customer Category';
	
	var fieldNames01 = new Array('customer',      'inactive');
	var fieldValues1 = new Array('End User',      'F');
	var fieldValues2 = new Array('Distributor',   'F');
	var fieldValues3 = new Array('Reseller',      'F');
	var fieldValues4 = new Array('Donation',      'F');
	var fieldValues5 = new Array('Internal',      'F');
	var fieldValues6 = new Array('Press/Analyst', 'F');
	
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues1);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues2);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues3);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues4);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues5);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues6);
	
    nlapiLogExecution('DEBUG', 'setupSWECustomerCategory', '*** END - setupSWECustomerCategory ***');
}

/**
 * Creates all the customer status necessary for SWE 
 * 
 * ORIGINAL SQL Statements:
 *     INSERT INTO entitystatus (nkey, rprobability, sname, sdescr, binactive, bincludeinleadreports, sentitytype) VALUES (nl_seq.next_val('entitystatus'),   0.0, 'Expired',      NULL, 'F', 'T', 'CUSTOMER');
 *     INSERT INTO entitystatus (nkey, rprobability, sname, sdescr, binactive, bincludeinleadreports, sentitytype) VALUES (nl_seq.next_val('entitystatus'),   0.0, 'Non Renewing', NULL, 'F', 'T', 'CUSTOMER');
 *     INSERT INTO entitystatus (nkey, rprobability, sname, sdescr, binactive, bincludeinleadreports, sentitytype) VALUES (nl_seq.next_val('entitystatus'), 100.0, 'Pending',      NULL, 'F', 'T', 'CUSTOMER');
 */
SWE.Setup.Assistant.setupSWECustomerStatus = function() { 

    // NEED TO CONFIRM: Upon checking, these values already exist even prior to running the setup scripts
    
    /* To verify go to: 
     *    [ Setup > Sales > Customer Statuses ] 
     */
    
    nlapiLogExecution('DEBUG', 'setupSWECustomerStatus', '*** START - setupSWECustomerStatus ***');
	
	var recordType = 'customerStatus';
	var recordText = 'Customer Status';
	
	var fieldNames01 = new Array('probability', 'name',         'descr', 'isinactive', 'includeinleadreports', 'entitytype');
	var fieldValues1 = new Array(   0.0,        'Expired',       null,   'F',          'T',                    'CUSTOMER');
	var fieldValues2 = new Array(   0.0,        'Non Renewing',  null,   'F',          'T',                    'CUSTOMER');
	var fieldValues3 = new Array( 100.0,        'Pending',       null,   'F',          'T',                    'CUSTOMER');

	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues1);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues2);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues3);

    nlapiLogExecution('DEBUG', 'setupSWECustomerStatus', '*** END - setupSWECustomerStatus ***');
}

/**
 * Creates all the job types necessary for SWE 
 * 
 * You can create a new customer status at Setup > Sales > Customer Statuses > New.
 * 
 * ORIGINAL SQL Statements:
 *     INSERT INTO jobtype (nkey, sname, binactive, kparent) VALUES (nl_seq.next_val('jobtype'), 'Consulting Services', 'F', NULL);
 *     INSERT INTO jobtype (nkey, sname, binactive, kparent) VALUES (nl_seq.next_val('jobtype'), 'Technical Services',  'F', NULL);
 *     INSERT INTO jobtype (nkey, sname, binactive, kparent) VALUES (nl_seq.next_val('jobtype'), 'Training',            'F', NULL);
 */
SWE.Setup.Assistant.setupSWEJobType =  function () {
    
    // NEED TO CONFIRM: Upon checking, these values already exist even prior to running the setup scripts
    
    /* To verify go to: 
     *    [ Setup > Accounting > Accounting List > Project Type ] 
     */
    
    nlapiLogExecution('DEBUG', 'setupSWEJobType', '*** START - setupSWEJobType ***');
	
	var recordType = 'jobtype';
	var recordText = 'Job Type';
	
	var fieldNames01 = new Array('name',                'isinactive');
	var fieldValues1 = new Array('Consulting Services', 'F');
	var fieldValues2 = new Array('Technical Services',  'F');
	var fieldValues3 = new Array('Training',            'F');

	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues1);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues2);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues3);

    nlapiLogExecution('DEBUG', 'setupSWEJobType', '*** END - setupSWEJobType ***');
}

/**
 * Creates all job status necessary for SWE
 * 
 * ORIGINAL SQL Statements:
 *     INSERT INTO entitystatus (nkey, sname, binactive, sdescr, sentitytype) VALUES (nl_seq.next_val('entitystatus'), 'In Progress - GREEN',    'F', NULL, 'JOB');
 *     INSERT INTO entitystatus (nkey, sname, binactive, sdescr, sentitytype) VALUES (nl_seq.next_val('entitystatus'), 'In Progress - YELLOW',   'F', NULL, 'JOB');
 *     INSERT INTO entitystatus (nkey, sname, binactive, sdescr, sentitytype) VALUES (nl_seq.next_val('entitystatus'), 'In Progress - RED',      'F', NULL, 'JOB');
 *     INSERT INTO entitystatus (nkey, sname, binactive, sdescr, sentitytype) VALUES (nl_seq.next_val('entitystatus'), 'Monitoring',             'F', NULL, 'JOB');
 *     INSERT INTO entitystatus (nkey, sname, binactive, sdescr, sentitytype) VALUES (nl_seq.next_val('entitystatus'), 'Delayed - per Customer', 'F', NULL, 'JOB');
 *     INSERT INTO entitystatus (nkey, sname, binactive, sdescr, sentitytype) VALUES (nl_seq.next_val('entitystatus'), 'Delayed - per Internal', 'F', NULL, 'JOB');
 *     
 *     UPDATE ENTITYSTATUS SET SNAME='Completed' where sname='Closed';
 */
SWE.Setup.Assistant.setupSWEJobStatus = function () {
    
    // NEED TO CONFIRM: Upon checking, these values already exist even prior to running the setup scripts
    
    /* To verify go to: 
     *    [ Setup > Accounting > Accounting List > Project Status ] 
     */
    
    nlapiLogExecution('DEBUG', 'SsetupSWEJobStatus', '*** START - setupSWEJobStatus ***');
	
	var recordType = 'customerstatus';
	var recordText = 'Job Status';
	
	var fieldNames01 = new Array('name',                   'inactive', 'descr', 'entitytype');
	var fieldValues1 = new Array('In Progress - GREEN',    'F',         null,   'JOB');
	var fieldValues2 = new Array('In Progress - YELLOW',   'F',         null,   'JOB');
	var fieldValues3 = new Array('In Progress - RED',      'F',         null,   'JOB');
	var fieldValues4 = new Array('Monitoring',             'F',         null,   'JOB');
	var fieldValues5 = new Array('Delayed - per Customer', 'F',         null,   'JOB');
	var fieldValues6 = new Array('Delayed - per Internal', 'F',         null,   'JOB');

	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues1);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues2);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues3);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues4);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues5);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues6);
	
	nlapiLogExecution('DEBUG', 'setupSWEJobStatus', '*** END - setupSWEJobStatus ***');
}

/**
 * Creates all billing schedule necessary for SWE
 * 
 * ORIGINAL SQL Statements:
 *     INSERT INTO billingschedule (nkey, sname, rinitialamount, kinitialterms, binitialamountispct,             nremaining, binarrears, krecurterms, binactive, bpublic, bmilestone) VALUES ((SELECT GREATEST(NVL(MAX(nkey),0),0)+1 FROM billingschedule), '100% Upfront',                     100.0, 4.0,  'T',                 0.0, 'T', NULL, 'F', 'T', 'F');
 *     INSERT INTO billingschedule (nkey, sname, rinitialamount, kinitialterms, binitialamountispct,             nremaining, binarrears, krecurterms, binactive, bpublic, bmilestone) VALUES ((SELECT GREATEST(NVL(MAX(nkey),0),0)+1 FROM billingschedule), '100% Net 30',                      100.0, 2.0,  'T',                 0.0, 'T', NULL, 'F', 'T', 'F');
 *     INSERT INTO billingschedule (nkey, sname, rinitialamount, kinitialterms, binitialamountispct,             nremaining, binarrears, krecurterms, binactive, bpublic, bmilestone) VALUES ((SELECT GREATEST(NVL(MAX(nkey),0),0)+1 FROM billingschedule), '100% Due Net 60',                  100.0, 3.0,  'T',                 0.0, 'T', NULL, 'F', 'T', 'F');
 *      
 *     INSERT INTO billingschedule (nkey, sname, rinitialamount, kinitialterms, binitialamountispct, kfrequency, nremaining, binarrears, krecurterms, binactive, bpublic, bmilestone) VALUES ((SELECT GREATEST(NVL(MAX(nkey),0),0)+1 FROM billingschedule), 'Monthly - 1 Year',                   0.0, NULL, 'F', 'MONTHLY',     12.0, 'T', NULL, 'F', 'T', 'F');
 *     INSERT INTO billingschedule (nkey, sname, rinitialamount, kinitialterms, binitialamountispct, kfrequency, nremaining, binarrears, krecurterms, binactive, bpublic, bmilestone) VALUES ((SELECT GREATEST(NVL(MAX(nkey),0),0)+1 FROM billingschedule), 'Quarterly - 1 Year',                 0.0, NULL, 'F', 'QUARTERLY',    4.0, 'T', 1.0,  'F', 'T', 'F');
 *     INSERT INTO billingschedule (nkey, sname, rinitialamount, kinitialterms, binitialamountispct, kfrequency, nremaining, binarrears, krecurterms, binactive, bpublic, bmilestone) VALUES ((SELECT GREATEST(NVL(MAX(nkey),0),0)+1 FROM billingschedule), '50% Upon Receipt/50% Net 30',       50.0, 4.0,  'T', 'ENDOFPERIOD',  2.0, 'T', 2.0,  'F', 'T', 'F');
 *     INSERT INTO billingschedule (nkey, sname, rinitialamount, kinitialterms, binitialamountispct, kfrequency, nremaining, binarrears, krecurterms, binactive, bpublic, bmilestone) VALUES ((SELECT GREATEST(NVL(MAX(nkey),0),0)+1 FROM billingschedule), '50% Net 30 / 50% Net 60',           50.0, 2.0,  'T', 'ENDOFPERIOD',  2.0, 'T', 3.0,  'F', 'T', 'F');
 *     INSERT INTO billingschedule (nkey, sname, rinitialamount, kinitialterms, binitialamountispct, kfrequency, nremaining, binarrears, krecurterms, binactive, bpublic, bmilestone) VALUES ((SELECT GREATEST(NVL(MAX(nkey),0),0)+1 FROM billingschedule), '25% Upon receipt, Balance Monthly', 25.0, 4.0,  'T', 'ENDOFPERIOD', 12.0, 'T', NULL, 'F', 'T', 'F');
 */
SWE.Setup.Assistant.setupSWEBillingSchedule = function() {
    nlapiLogExecution('DEBUG', 'setupSWEBillingSchedule', '*** START - setupSWEBillingSchedule ***');
	
	var recordType = 'billingschedule';
	var recordText = 'Billing Schedule';
	
	var fieldNames01 = new Array('schedname',       'initamount', 'initterms', 'initialamountispct', 'numbremaining', 'inarrears', 'recurrenceterms', 'inactive', 'ispublic', 'milestone');
	var fieldValues1 = new Array('100% Upfront',     100.0,        4.0,        'T',                   0.0,            'T',          null,             'F',        'T',        'F');
	var fieldValues2 = new Array('100% Net 30',      100.0,        2.0,        'T',                   0.0,            'T',          null,             'F',        'T',        'F');
	var fieldValues3 = new Array('100% Due Net 60',  100.0,        3.0,        'T',                   0.0,            'T',          null,             'F',        'T',        'F');
	
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues1);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues2);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames01, fieldValues3);
	
	var fieldNames02 = new Array('schedname',                         'initamount', 'initterms', 'frequency',   'initialamountispct', 'numbremaining', 'inarrears', 'recurrenceterms', 'inactive', 'ispublic', 'milestone');
	var fieldValues4 = new Array('Monthly - 1 Year',                    0.0,         null,       'MONTHLY',     'F',                   12.0,           'T',          null,             'F',        'T',        'F');
	var fieldValues5 = new Array('Quarterly - 1 Year',                  0.0,         null,       'QUARTERLY',   'F',                    4.0,           'T',          1.0,              'F',        'T',        'F');
	var fieldValues6 = new Array('50% Upon Receipt/50% Net 30',        50.0,         4.0,        'ENDOFPERIOD', 'T',                    2.0,           'T',          2.0,              'F',        'T',        'F');
	var fieldValues7 = new Array('50% Net 30 / 50% Net 60',            50.0,         2.0,        'ENDOFPERIOD', 'T',                    2.0,           'T',          3.0,              'F',        'T',        'F');
	var fieldValues8 = new Array('25% Upon receipt, Balance Monthly',  25.0,         4.0,        'ENDOFPERIOD', 'T',                   12.0,           'T',          null,             'F',        'T',        'F');
	
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames02, fieldValues4);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames02, fieldValues5);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames02, fieldValues6);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames02, fieldValues7);
	SWE.Setup.Assistant.createNewRecord(recordType, recordText, fieldNames02, fieldValues8);
	
    nlapiLogExecution('DEBUG', 'setupSWEBillingSchedule', '*** END - setupSWEBillingSchedule ***');
}




