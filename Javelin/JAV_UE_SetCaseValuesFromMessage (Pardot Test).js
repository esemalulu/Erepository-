/*  Script Name:  	JAV_UE_SetCaseValuesFromMessage
	Script Type:  	User Event
	Record Type:  	Case
	
	Description:  	Sets the default values for cases based on the incoming message.
					If the message is from Pardot, the system will locate or create contact/company records then create an opportunity.

*/


//  Global Variable Definitions						
var SW_ADDON_TAG = 'Origin = Addon';
var WEBSITE_TAG = 'Origin = Webform';  // [Updated by Robert Gama: 2012-10-19 with new website tag]
var PARDOT_TAG = 'Full Prospect Details';

var ORIGIN_WEB_FORM = -5;  // Internal ID of Case Origin Type for Webform
var ORIGIN_SW_ADDON = 4; // Internal ID of Case Origin Type for SW Addon
var ORIGIN_PARDOT = 5;  // Internal ID of Case Origin Type for Pardot
var ORIGIN_EMAIL = 1;

var FIELD_ORIGIN = 'origin';
var FIELD_PRIORITY = 'priority';
var FIELD_PRODUCT = 'custevent_caseproduct';
var FIELD_INBOUNDEMAIL = 'inboundemail';
var FIELD_INCOMINGMESSAGE = 'incomingmessage';
var FIELD_OUTGOINGMESSAGE = 'outgoingmessage';
var FIELD_TITLE = 'title';

//  Priority internal IDs for case Priority List ('priority')
var PRIORITY_CRITICAL = 4;
var PRIORITY_HIGH = 1;
var PRIORITY_MEDIUM = 2;
var PRIORITY_LOW = 3;
var PRIORITY_QUESTION = 5;

//  Product internal IDs for Product List ('customlist_supproduct') used in field: custevent_caseproduct
var PRODUCTS_SOLIDWORKS = 6;
var PRODUCTS_EPDM = 4;
var PRODUCTS_WPDM = 7;
var PRODUCTS_SIMULATION = 1;
var PRODUCTS_3DVIA = 9;
var PRODUCTS_E3 = 3;
var PRODUCTS_OBJET = 8;
var PRODUCTS_DRIVEWORKS = 2;
var PRODUCTS_PROPERTYLINKS = 5;
var PRODUCTS_PLANTWORKS = 10;
var PRODUCTS_OTHER = 11;

//  Case priority array and their corresponding internal ID values - OREDER IS IMPORTANT - DO NOT CHANGE ORDER
var casePriorities = ['High', 'Medium', 'Low', 'Critical', 'Question'];
var netsuitePriorityIDs = [PRIORITY_HIGH, PRIORITY_MEDIUM, PRIORITY_LOW, PRIORITY_CRITICAL, PRIORITY_QUESTION];

var addOnProducts = ["SolidWorks", "EPDM", "WPDM", "Simulation", "3DVIA Composer", "E3.WireWorks", "Objet", "DriveWorks", "PropertyLinks", "PlantWorks", "Other"];
var websiteProducts = ["SolidWorks", "EPDM", "WPDM", "Simulation", "3DVIA Composer", "E3.WireWorks", "Objet", "DriveWorks", "PropertyLinks", "PlantWorks", "Other"];
var netsuiteProductIDs = [PRODUCTS_SOLIDWORKS, PRODUCTS_EPDM, PRODUCTS_WPDM, PRODUCTS_SIMULATION, PRODUCTS_3DVIA, PRODUCTS_E3, PRODUCTS_OBJET, PRODUCTS_DRIVEWORKS, PRODUCTS_PROPERTYLINKS, PRODUCTS_PLANTWORKS, PRODUCTS_OTHER];

// Temporary initiation for a global variable called lead.  Will later be defined as a new PardotLead
var lead = {};

/*	Function to handle the grab events for Pardot created cases
	Purpose:  Parse the incoming email message, create an opportunity - fill in opportunity fields, delete the case, redirect to the new opportunity
	
*/
function beforeSubmitProcessing(type) {
	//log('beforeSubmitProcessing','Pardot case processing beginning, Type =' + type);
	if (type == 'reassign' || type == 'edit') { // GAMATEST - change deployment too to remove type = create restriction
		//log('beforeSubmitProcessing','Case getting reassigned');
		var userID = nlapiGetUser();  // DELETE THIS
		if (userID == 105) {  // GAMATEST - remove restriction after.  Restrict to Pardot.  USER 105 = Robert Gama.
			//log('beforeSubmitProcessing','User is Robert Gama');
			
			var initOrigin = nlapiGetFieldValue(FIELD_ORIGIN);
			if (initOrigin == ORIGIN_PARDOT) { 
				log('beforeSubmitProcessing','Case origin is Pardot');
				var caseID = nlapiGetRecordId();
				var userID = nlapiGetUser();
				var message = nlapiGetFieldValue(FIELD_INCOMINGMESSAGE);
				
				//log('beforeSubmitProcessing', message);
				lead = new PardotLead(message);
				
				if (!lead.netsuiteURL) {
					// If it didn't find a lead in the system, create one
					if (!findNetsuiteContact(lead.email)) {  
						// ADD CODE TO SEARCH FOR COMPANY!!!!!!!!!!!!!!!!1
						createNetsuiteContact();
					}
					// if a lead was found in Netsuite by email
					else {  
						lead.getNetsuiteCompanyID();
					}
				}
				else {
					
					log('beforeSubmitProcessing', 'Contact is a duplicate = ' + ((findNetsuiteContact(lead.email) > 1) ? true : false) );
					// ADD CODE TO DEAL WITH DUPLICATE FOUND CONTACTS
				}
				
				//
				
				if (lead.createOpportunity()) {
					log('beforeSubmitProcessing', 'Opportunity successfully created');
				}
				else {
					log('beforeSubmitProcessing', 'Opportunity not created');
				}
				
				logAudit('beforeSubmitProcessing', 'Log Properties:      ' + logObjectProperties(lead));
			}
		}
	}
}

//  Object definition for a Pardot lead.
function PardotLead(msg) {
	this.originalPardotEmail = msg;
	this.email = parsePardotFieldValue(msg, 'Email');
	this.pardotURL = parsePardotFieldValue(msg, 'View in Pardot');
	this.netsuiteURL = parsePardotFieldValue(msg, 'View in CRM');
	this.score = parsePardotFieldValue(msg, 'Score');
	this.phone = parsePardotFieldValue(msg, 'Phone');
	this.firstName = parsePardotFieldValue(msg, 'First Name') ? parsePardotFieldValue(msg, 'First Name') : parsePardotFieldValue(msg, 'First name');
	this.lastName = parsePardotFieldValue(msg, 'Last Name') ? parsePardotFieldValue(msg, 'Last Name') : parsePardotFieldValue(msg, 'Last name');
	this.state = ifExistsToUppercase(parsePardotFieldValue(msg, 'State'));
	this.zip = ifExistsToUppercase(parsePardotFieldValue(msg, 'Zip'));
	this.fsa = parseFSA(this.zip);  // (this.zip).toString().toUpperCase().substr(0,3);  //
	this.company = parsePardotFieldValue(msg, 'Company');
	this.assignedUser = parsePardotFieldValue(msg, 'Assigned user');
	this.product = parsePardotFieldValue(msg, 'Product');
	this.quantity = parsePardotFieldValue(msg, 'Quantity');
	this.requestType = parsePardotFieldValue(msg, 'Product Request Type');
	this.formSubmission = parsePardotFieldValue(msg, 'Form Submission') ? parsePardotFieldValue(msg, 'Form Submission') : parsePardotFieldValue(msg, 'Form Handler Submission');
	this.comments = parsePardotFieldValue(msg, 'Comments');
	this.trainingLocation = parsePardotFieldValue(msg, 'Training Loacation');
	this.trainingCourse = parsePardotFieldValue(msg, 'Training Course');
	this.service = parsePardotFieldValue(msg, 'Service');
	this.netsuiteConactID;
	this.netsuiteCompanyID;
	this.netsuiteCompanyName;
	this.netsuiteOpportunityID;
	this.netsuiteContactCategory;
	this.emailDomain = parseEmailDomain(this.email);
	this.salesRep;
	this.swxRep;
	this.rpRep;
	this.e3Rep;
	this.companyStatus;
	this.companyPhone;
	this.opportunityReady;

	// Below are the methods for the lead object
	this.getNetsuiteID();
	this.getNetsuiteCompanyID();
	this.getOpportunityReady();
	this.createOpportunity();
	
	// Lead contact record object in Netsuite
	this.contactRecord = {};
	this.companyRecord = {};
	this.opportunityRecord = {};
}

//  Method for a PardotLead to set the Netsuite Internal ID
PardotLead.prototype.getNetsuiteID = function() {
	//log('PardotLead.prototype.getNetsuiteID','PardotLead.prototype.getNetsuiteID = ' + this.netsuiteURL);
	var strNetsuiteURL = this.netsuiteURL;
	if (this.netsuiteURL) {
		this.netsuiteConactID = strNetsuiteURL.replace(/.+contact.+=/g,'');
	}
	else {
		this.netsuiteConactID = false;
	}
}

PardotLead.prototype.getNetsuiteCompanyID = function() {
	//log('PardotLead.prototype.getNetsuiteCompanyID',this.netsuiteConactID);
	var contactNetsuiteID = this.netsuiteConactID;
	if (contactNetsuiteID) {  // If there is a contact record already in Netsuite
		var contactNetsuiteRecord = nlapiLoadRecord('contact', contactNetsuiteID);
		var contactNSCompanyID = contactNetsuiteRecord.getFieldValue('company');
		if (contactNSCompanyID == null) {
			// findNetsuiteCompany is Not complete yet
			findNetsuiteCompany();
		
		}
		else {
			// contactCategory:  Get the category of the contact in Netsuite to check for employees or vendors
			var contactCategory = contactNetsuiteRecord.getFieldValue('category');
			var ucaseEmailDomain = (this.emailDomain).toUpperCase();
			this.contactRecord = contactNetsuiteRecord;
			if (contactNSCompanyID != null) {
				log('getNetsuiteCompany', 'contactNSCompanyID = ' + contactNSCompanyID);
				var companyNetsuiteRecord = nlapiLoadRecord('customer', contactNSCompanyID);
				this.netsuiteCompanyID = contactNSCompanyID;
				this.companyRecord = companyNetsuiteRecord;
				// Populate the company reps when getting the ID
				this.salesRep = getEmployeeName(companyNetsuiteRecord.getFieldValue('salesrep'));
				this.swxRep = getEmployeeName(companyNetsuiteRecord.getFieldValue('custentity_swxrep'));
				this.rpRep = getEmployeeName(companyNetsuiteRecord.getFieldValue('custentity_rprep'));
				this.e3Rep = getEmployeeName(companyNetsuiteRecord.getFieldValue('custentity_e3rep'));
				   
				if (contactCategory == '2' || contactCategory == '7' || ucaseEmailDomain == 'JAVELIN-TECH.COM') {
					this.netsuiteContactCategory = 'Employee or Vendor';
					log('getNetsuiteCompany', 'Contact is either an employee or vendor.  Not processing further');
				}
				else {
					this.netsuiteContactCategory = 'Prospect or Customer';
					this.opportunityReady = true;
					log('getNetsuiteCompany', 'Contact is not attached to a company');
				}

			}
			else {

				var contactCategory = contactNetsuiteRecord.getFieldValue('category');
				if (contactCategory == '2' || contactCategory == '7' || ucaseEmailDomain == 'JAVELIN-TECH.COM') {
					this.netsuiteContactCategory = 'Employee or Vendor';
					log('getNetsuiteCompany', 'Contact is either an employee or vendor.  Not processing further');
				}
				else {
					this.netsuiteContactCategory = 'Prospect or Customer';
					log('getNetsuiteCompany', 'Contact is not attached to a company');
					
					/*
					ADD CODE TO SEARCH FOR COMPANY IN NETSUITE AND POSSIBLY CREATE COMPANY IF NOT FOUND
					
					*/
					findNetsuiteCompany();
					
				}
				return false;
			}	
		}
	}
	else {
		findNetsuiteCompany();
		this.netsuiteCompanyID = false;
	}
}

PardotLead.prototype.getOpportunityReady = function() {
	
	
	if (this.contactRecord != null && this.companyRecord != null ) {
		log('PardotLead.prototype.getOpportunityReady', 'Previous value = ' + this.OpportunityReady + ', New Value = true');
		this.OpportunityReady = true;
	}
	else {
		this.OpportunityReady = false;
		//log('PardotLead.prototype.getOpportunityReady', 'OpportunityReady value = false');
	}
}

PardotLead.prototype.createOpportunity = function() {  

	if (this.opportunityReady == true && !this.netsuiteOpportunityID ) {
		log('PardotLead.prototype.createOpportunity', 'this.opportunityReady = ' + this.opportunityReady);
		var newOpp = nlapiCreateRecord( 'opportunity');
		var today = new Date();
		var expectedCloseDate = nlapiAddDays(today, 90);
		newOpp.setFieldValue( 'title', this.formSubmission);
		newOpp.setFieldValue( 'entitystatus', '24'); //S - Pass to OSR
		newOpp.setFieldValue( 'custbody_oppcontact', this.netsuiteConactID); 
		newOpp.setFieldValue( 'leadsource', '198651');  //Pardot Priority Lead
		newOpp.setFieldValue( 'entity', this.netsuiteCompanyID); 
		newOpp.setFieldValue( 'customlist_leadfeedback', '9'); 
		newOpp.setFieldValue( 'custbody_pardotemail', this.originalPardotEmail);
		newOpp.setFieldValue( 'expectedclosedate', nlapiDateToString(expectedCloseDate));
		newOpp.setFieldValue( 'custbody_viewcontactinpardot', this.pardotURL); 
		newOpp.setFieldValue( 'memo', 'This is a Pardot lead that requires immediate follow up (ie. Quote Request, Call Me Request, Eval Request, Demo Request, etc. from the website), and the time-to-follow-up is KPI that will be measured.  \n\nIf you feel this type of form completion should not require immediate follow-up please notify marketing. \n\nProvince: ' + this.state + ', Postal Code: ' + this.zip + ', \n\nPlease see Pardot tab on opportunity for full Pardot notification email details.' ); 
		this.netsuiteOpportunityID = nlapiSubmitRecord(newOpp, true);	
		this.opportunityRecord = newOpp;
		log('createOpportunity', 'Opportunity created with internal id = ' + this.netsuiteOpportunityID);
		return this.netsuiteOpportunityID;
	}
	else {
		return false;
	}
} 

function parsePardotFieldValue(msg, strValueName) {
	var valueStartPos = msg.indexOf(strValueName + ':');
	if (valueStartPos == -1) {
		//log('parsePardotFieldValue', '\'' + strValueName + '\' not found, ' + valueStartPos);
		return false;
	}
	else {
		valueStartPos = valueStartPos + (strValueName.length + 2);
	}
	var valueEndPos = msg.indexOf('\n',valueStartPos);
	var matchedValue = myTrim(msg.substring(valueStartPos,valueEndPos - 1));
	//log('parsePardotFieldValue', '\'' + strValueName + '\' = ' + matchedValue);
	return matchedValue;
}

function log(title, details) {
	nlapiLogExecution('DEBUG',title,details);
}
function logAudit(title, details) {
	nlapiLogExecution('AUDIT',title,details);
}

function logObjectProperties(myObj) {
	var propertyListMsg = '';
	for (var myObjProperty in myObj) {
		if (myObj[myObjProperty] && typeof myObj[myObjProperty] !== 'function' && typeof myObj[myObjProperty] !== 'object') {
			propertyListMsg += 'lead.' + myObjProperty + ' = ' + myObj[myObjProperty] + '\n';
			log('Iterating Object Variables', 'lead.' + myObjProperty + ' = ' + myObj[myObjProperty]); // + ', type=' + (typeof myObj[myObjProperty]));
		}
	}
	return (propertyListMsg == '') ?  false : propertyListMsg;
}

/*  findNetsuiteContact function can search for duplicates based on a record type, field, and value
	Check Netsuite Help: https://system.netsuite.com/help/helpcenter/en_US/Output/Help/SuiteFlex/SuiteScript/SSAPI_SearchAPIs.html#N52695420-5
*/
function findNetsuiteContact(contactEmail) {
	var filters = new Array();
	var columns = new Array();
	filters[0] =  new nlobjSearchFilter('email', null, 'is', contactEmail);
	filters[1] =  new nlobjSearchFilter('isinactive', null, 'is', 'F');
	filters[2] =  new nlobjSearchFilter('isjob', 'customer', 'is', 'F');
	filters[3] =  new nlobjSearchFilter('isinactive', 'customer', 'is', 'F');
	//filters[4] =  new nlobjSearchFilter('contact', 'type', 'is', 'F');
	columns[0] = new nlobjSearchColumn('internalid');  // Netsuite contact internalid
	columns[1] = new nlobjSearchColumn('status', 'customer');  // Netsuite company status
	columns[2] = new nlobjSearchColumn('internalid','customer');  // Netsuite company internalid
	columns[3] = new nlobjSearchColumn('entityid','customer');  // Netsuite company name id

	var contactRecords = nlapiSearchRecord('contact', null, filters, columns);
	if (contactRecords != null) {
		var nsContact;
		if (contactRecords.length > 1) {
			log('findNetsuiteContact', 'Found (' + contactRecords.length + ') contacts with email address = ' + contactEmail);
			for (var i = 0 ; i < contactRecords.length ; i++) {
				nsContact = contactRecords[i];
				log('findNetsuiteContact', 'Matching contact #' + (i + 1) + ' internalID = ' + nsContact.getValue('internalid'));
			}	
			// Found multiple matching contacts 
			// image for mutiple COMPANIES https://system.netsuite.com/core/media/media.nl?id=634469&c=265419&h=b0de63282f33296b1219
			return contactRecords.length;
		}
		else {
			// Found 1 matching contact
			nsContact = contactRecords[0];
			lead.netsuiteConactID = nsContact.getValue('internalid');
			lead.netsuiteURL = 'https://system.netsuite.com/app/common/entity/contact.nl?id=' + lead.netsuiteConactID;
			log('findNetsuiteContact', 'Attempting to find the company');
			lead.netsuiteCompanyID = lead.getNetsuiteCompanyID();
			
			log('findNetsuiteContact', 'Found contact by email address = ' + contactEmail + ', lead.netsuiteURL = ' + lead.netsuiteURL + ', lead.netsuiteCompanyID = ' + lead.netsuiteCompanyID);
			return 1;
			
		}
	}
	else {
		log('findNetsuiteContact', 'Did not find any matching contacts by email address = ' + contactEmail);
		// Did not find any matching contacts
		return 0;
	}
}

function createNetsuiteContact() {
	
	
	var newContact = nlapiCreateRecord( 'contact');
	newContact.setFieldValue( 'firstname', lead.firstName);
	if (lead.lastName) {
		newContact.setFieldValue( 'lastname', lead.lastName);
	}
	newContact.setFieldValue( 'email', lead.email);
	newContact.setFieldValue( 'phone', lead.phone);
	newContact.setFieldValue( 'custentitypi_url', lead.pardotURL);
	// ADD CODE TO TRY TO FIND THE COMPANY
	newContact.setFieldValue( 'company', '4');
	lead.netsuiteConactID = nlapiSubmitRecord(newContact, true);	
	lead.netsuiteURL = 'https://system.netsuite.com/app/common/entity/contact.nl?id=' + lead.netsuiteConactID;
	lead.netsuiteCompanyID = '4';
	lead.opportunityReady = true;
	log('createNetsuiteContact', lead.email + ', ' + lead.netsuiteURL);
	return lead.netsuiteConactID;
	
}

function findNetsuiteCompany() {
	log('findNetsuiteCompany', 'Starting function');
	if (lead.company == null || !lead.company) {
		log('findNetsuiteCompany', 'lead.company either not defined or equal to false');
	}
	else {
		log('findNetsuiteCompany', 'Attempting to find company');
		var companyRootName = toString(lead.company);
		companyRootName = companyRootName.replace(/\./g, '').replace(/ (inc|ltd|corp|corporation|limited|incorporated|partners|group)/i, '');
		log('findNetsuiteCompany', 'lead.company: ' + lead.company + ', companyRootName: ' + companyRootName);
		
		var filters = new Array();
		var columns = new Array();
		filters[0] = new nlobjSearchFilter('entityid', null, 'startswith',companyRootName);
		columns[0] = new nlobjSearchColumn('internalid');
		columns[1] = new nlobjSearchColumn('entityid');
		var matchingCompanies = nlapiSearchRecord('customer', null, filters, columns);
		var nsCompany;
		for (var i = 0; matchingCompanies != null && i < matchingCompanies.length; i++) {
			nsCompany = matchingCompanies[i];
			log('findNetsuiteCompany', 'matchingCompanies[' + i + ' of ' + matchingCompanies.length + '] = ' + nsCompany.getValue('entityid') + ', Internal ID = ' + nsCompany.getValue('internalid'));
		}
	}

}

function myTrim(myString) {
	return myString.replace(/^\s+|\s+$/g,"");
}

function getEmployeeName(employeeID) {
	if (employeeID != null && employeeID != false) {
		var empRecord = nlapiLoadRecord('employee', employeeID);
		return empRecord.getFieldValue('entityid');
	}
	else {
		return false;
	}
}

function parseEmailDomain(email) {
	if (email != null && email != false) {
		return email.replace(/.+@/gi,'');
	}
	else {
		return false;
	}
}

function ifExistsToUppercase(someText) {
	if (someText) {
		return someText.toString().toUpperCase();
	}
	else {
		return false;
	}
}

function parseFSA(zip) {
	var FSA = zip.toString().toUpperCase().substring(0,3);
	var formatTester = /[A-Z][0-9][A-Z]/g;
	if (formatTester.test(FSA)) {
		//log('parseFSA',FSA);
		return FSA;
	}
	else {
		return false;
	}
}

/*  function afterSubmitProcessing
function afterSubmitProcessing(type){  // GAMATEST - updatename in script
    //log("Type", type);
    if (type == 'create') {  
        //log('Create', 'Message');
		
        var caseID = nlapiGetRecordId();
        var message = nlapiGetFieldValue(FIELD_INCOMINGMESSAGE);
		var inboundEmail = nlapiGetFieldValue(FIELD_INBOUNDEMAIL);
        var initOrigin = nlapiGetFieldValue(FIELD_ORIGIN);  // Gets the initial case origin
		var newOrigin = initOrigin;  // Temporarily initialize newOrigin to the original
		var isFromAutoGeneratedSource = false;  // Variable to identify case from an autogenerated source (website, addon, Pardot)  extract and update case fields
		var isSupportCase = true;	
			
		//Check Incoming Message - Debug output message
		log('message detail', message);
		
		//Check if message came from SolidWorks Addon
		if (isMessageFromSwAddon(message)) {
			log('SolidWorks Addon','Found ' + SW_ADDON_TAG + ' tagging in the message');
			isFromAutoGeneratedSource = true;
			//Check The Origin set on the Support Case
			if (initOrigin != ORIGIN_SW_ADDON) {  
				newOrigin = ORIGIN_SW_ADDON;
			}
		}
		//Check if message came from Online Webform
		else if (isMessageFromOnlineForm(message)) {
			log('Website Form','Found ' + WEBSITE_TAG + ' tagging in the message');
			isFromAutoGeneratedSource = true;
			//Check The Origin set on the Support Case
			if (initOrigin != ORIGIN_WEB_FORM) {  
				newOrigin = ORIGIN_WEB_FORM;
			} 
		}
		//Check if message came from Pardot
		else if (isMessageFromPardot(message)) {
			log('Pardot Lead','Found ' + PARDOT_TAG + ' tagging in the message');
			isFromAutoGeneratedSource = true;
			isSupportCase = false;
			//Check The Origin set on the Support Case
			if (initOrigin != ORIGIN_PARDOT) {  
				newOrigin = ORIGIN_PARDOT;
			}
		}
		else {
			setCaseFieldValue(FIELD_PRODUCT, getProductByInboundEmail(inboundEmail), caseID);  
		}
		
		//Check if message came from SolidWorks Addon OR Online Webform
		if (isFromAutoGeneratedSource) {
			setCaseFieldValue(FIELD_ORIGIN, newOrigin, caseID);
			
			if (isSupportCase) {
				setCaseFieldValue(FIELD_PRIORITY, getPriorityValue(message, newOrigin), caseID);
				setCaseFieldValue(FIELD_PRODUCT, getProductValue(message, newOrigin), caseID);
			}
			else {
				// Fill in sales lead defaults later
			}
		}

    }
}
*/

function getProductByInboundEmail(inboundEmailAddress) {
	var emailName = (inboundEmailAddress) ? inboundEmailAddress.replace("@javelin-tech.com","") :  'noEmail' ;
	var productID = PRODUCTS_SOLIDWORKS;
	switch (emailName) {
		case 'dasupport':
			productID = PRODUCTS_DRIVEWORKS;
			break;
		case 'e3support':
			productID = PRODUCTS_E3;
			break;
		case 'plmsupport':
			productID = PRODUCTS_EPDM;
			break;
		case 'rpsupport':
			productID = PRODUCTS_OBJET;
			break;
		default:
			productID = PRODUCTS_SOLIDWORKS;
	}
	log('getProductByInboundEmail', 'Parsed inbound email address (' + inboundEmailAddress + ') to ' + emailName + ', Now setting product to:  ' + productID);
	return productID;
}	

/*  parseValue : function uses Regular Expression (Regex) to get the value after the strValueName in the message 
	Regular expression exlanation:
		strValueName + .....................................Means look for the value of the variable strValueName
		' = ([A-Z3][a-zA-Z\. 3]+)...........................Means after previous match space = space then a capital letter or a 3
															followed by one or more upper or lower case letters, spaces, periods or a 3.
		[\\n\\r]+'..........................................Means previous must be followed by one or more new lines or line returns.
*/
function parseValue(msg, strValueName) {
	//log('parseValue', msg + '\t\t\n' + strValueName);
	var myRegexp = new RegExp('(?:^ *' + strValueName + ' += +)([A-Z3][a-zA-Z\. 3]+)(?:\\n|\\r)+?', 'gm');
	log('parseValue', 'myRegexp = ' + myRegexp.toString());
	var match = myRegexp.exec(msg);
	log('parseValue', 'returning match = ' + match[1] );
	return match[1];
}

function getPriorityValue(msg, caseOrigin) {
	var casePriority = parseValue(msg, 'Priority');
	//log('getPriorityValue', 'Result of parseValue = ' + casePriority);
	if (caseOrigin == ORIGIN_WEB_FORM) {
		//log('getPriorityValue', 'case origin  = ' + ORIGIN_WEB_FORM);
		//log('getPriorityValue', 'Returning Priority = ' + casePriority.replace('Priority ',''));
		return netsuitePriorityIDs[casePriorities.indexOf(casePriority.replace('Priority ',''))];  // Webform value are like:  Priority = Priority Low
	}
	else if (caseOrigin == ORIGIN_SW_ADDON) {
		return netsuitePriorityIDs[casePriorities.indexOf(casePriority)];  // Add on values are like:  Priority = Low
	}
	else {
		return PRIORITY_LOW;
	}
}

function getProductValue(msg, caseOrigin) {
	var caseProduct = parseValue(msg, 'Product');
	//log('getPriorityValue', 'Result of parseValue = ' + caseProduct);
	if (caseOrigin == ORIGIN_WEB_FORM) {
		return netsuiteProductIDs[websiteProducts.indexOf(caseProduct)]; 
	}
	else if (caseOrigin == ORIGIN_SW_ADDON) {
		return netsuiteProductIDs[addOnProducts.indexOf(caseProduct)]; 
	}
	else {
		return PRODUCTS_OTHER;
	}
}

function setCaseFieldValue(fieldID, fieldValue, caseID) {
	log('Setting case ' + fieldID, 'Setting case ' + fieldID + ' to  = ' + fieldValue + ' for case internal ID = ' + caseID);
	nlapiSubmitField('supportcase', caseID, fieldID, fieldValue);
}

/**  isMessageFromSwAddon:  Function to test if message is from SolidWorks Addon
 * Checks to see if incoming message contains SolidWorks Addon tag
 * Origin = Addon
 */
function isMessageFromSwAddon(msg) {
	return msg.indexOf(SW_ADDON_TAG) != -1;
}

/**  isMessageFromOnlineForm:  Function to test if message is from Website
 * Checks to see if incoming message contains website tag
 * Origin = Web form
 */
function isMessageFromOnlineForm(msg){
	return msg.indexOf(WEBSITE_TAG) != -1;
}

/**  isMessageFromPardot:  Function to test if message is from Pardot
 * Checks to see if incoming message contains Pardot tag
 * Origin = Pardot
 */
function isMessageFromPardot(msg) {
	return msg.indexOf(PARDOT_TAG) != -1;
}
// Logs all of the properties of the object and ignores methods





/*  function getVerifiedNumber
function getVerifiedNumber(inputPhoneNumber) {

	var myRegexp = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension\.?|xt\.?|.)\s*(\d+))?$/; 
	
} */
/*  EXAMPLE WEBFORM DATA - OCT 2012

SoupermailConf = /main/scripts/problem.txt
Name = Robert Gama
Company = dshsfjdgj
Phone = 4169514262
Email = robertgama@gmail.com
Product = SolidWorks
SWSerialNumber = 0000 0000 0000 0000
SWVersion = 2013
SWServicePack = 2
EPDMVersion = 1
EPDMServicePack = 1
ObjetModel = Not Specified
DriveWorksPackage = Not Specified
OS = Windows XP 32 bit
Priority = Priority Low
Title = TEST WEBSITE CASE 2345sfsf
Description = Testing new script for setting case origin from web
*/
/*  EXAMPLE ADDON DATA - OCT 2012
SoupermailConf = /main/scripts/problem.txt
Origin = Addon
Name = Paul McDonnell
Company = Javelin Technologies
Phone = (905) 815-1906
Ext = 236
Email = paul.mcdonnell@javelin-tech.com
Product = SolidWorks
SWVersion = 2012
SWServicePack = SP1.0
SW SN = 9000 0075 5024 3107
OS = Microsoft Windows 7 Ultimate 
Platform = x86
Priority = Low
Title = Test email for Robert Gama
Description = I need to know what the support email looks like
Javelin Support Add-in Version = 2012 SP1.5
Send to = support@javelin-tech.com (this line only appears in the test emails)
*/
/*  Internal ID's of Case Priority List ('priority')

Critical = 4
High = 1
Medium = 2
Low = 3
Question = 5
*/
/*  Internal ID's of Product List ('customlist_supproduct') used in field: custevent_caseproduct

SolidWorks	6	 
Enterprise PDM	4	 
Workgroup PDM	7	 
Simulation	1	 
Plastics	13	 
Electrical	14	 
3DVIA	9	 
E3 WireWorks	3	 
Objet	8	 
PropertyLinks	5	 
DriveWorks	2	 
PlantWorks	10	 
BuiltWorks	12	 
OTHER	11
*/
/*  Case Origin Types for field = 'origin'

2	Phone
1	E-mail
-5	Web form
4	SW Add-on
3	Other
6	Pardot
*/
/*  Product Names from the Webform (In quotes will be in value in email, After is the name on webform)

"SolidWorks">SolidWorks Standard, Professional, or Premium
"EPDM">SolidWorks Enterprise PDM (EPDM)
"WPDM">SolidWorks Workgroup PDM (WPDM)
"Simulation">SolidWorks Simulation
"3DVIA Composer">3DVIA Composer
"E3.WireWorks">E�.Series or E�.WireWorks
"Objet">Objet 3D Printer
"DriveWorks">DriveWorks
"PropertyLinks">PropertyLinks
"PlantWorks">PlantWorks
"Other">Other product

["SolidWorks", "EPDM", "WPDM", "Simulation", "3DVIA Composer", "E3.WireWorks", "Objet", "DriveWorks", "PropertyLinks", "PlantWorks", "Other"]
*/
/*  Product Names from the Addon Email
["SolidWorks Standard, Professional, or Premium", "SolidWorks Enterprise PDM (EPDM)", "SolidWorks Workgroup PDM (WPDM)", "SolidWorks Simulation", "3DVIA Composer", "E�.Series or E�.WireWorks", "Objet 3D Printer", "DriveWorks", "PropertyLinks", "PlantWorks", "Other product"]
*/
/*  Priority Values from Addon Email
["Critical", "High", "Medium", "Low"]
*/
/*  Old isMessageFromOnlineForm function before Rod added the origin field  -  Reference for regEx for later use.
	//msg = msg.replace(/\s/gm,'');  // Replace all spaces, tabs, line returns, etc. with nothing - REMOVE ALL SPACES
	//var patt = /Name\=.+Company\=.+Phone\=.+Email\=.+Product\=.+SerialNumber\=/gm;  // Regular expression pattern to test
	//var isMatch = patt.test(msg);  //  Tests if the pattern can be found in the string
	//nlapiLogExecution('DEBUG', 'Online Web Form Test', 'Matches for website = ' + isMatch);
	//return isMatch;
*/