/* Global variable definition
*/
var lead = {};
var statusArray = [[],[]];
var testingMode = true;
/**
 * [beforeSubmitProcessing description]
 * @param  {string} type Netsuite record operation type
 * @return {null}
 */
function beforeSubmitProcessing(type) {

	//log('beforeSubmitProcessing','Pardot case processing beginning, Type =' + type);
	if (type == 'reassign' || type == 'edit') { // GAMATEST - change deployment too to remove type = create restriction
		//log('beforeSubmitProcessing','Case getting reassigned');
		var userID = nlapiGetUser();  // DELETE THIS
		if (userID == 105) {  // GAMATEST - remove restriction after. USER 105 = Robert Gama.
			var initOrigin = nlapiGetFieldValue('origin');
			if (initOrigin == 5) {  // initOrigin = Pardot  <Q1> - Flowchart Reference
				log('beforeSubmitProcessing','Q1-Y: Flowchart Reference - Case origin is Pardot');
				var caseID = nlapiGetRecordId();
				// var userID = nlapiGetUser();
				var message = nlapiGetFieldValue('incomingmessage');
				
				parseEmail(message);
				getNetsuiteRecords();
				createOpportunity();
				logObjectProperties(lead, 'lead');
			}
			else {
				log('beforeSubmitProcessing','Q1-N: Flowchart Reference - Case origin is not Pardot');
			}
		}
	}
}
function parseEmail(pardotEmail) {
	log('parseEmail', 'Creating a new PardotLead object and parsing email to populate properties');
	lead = new PardotLead(pardotEmail);
}
function PardotLead(msg) {
	//  Object definition for a Pardot lead.
	this.originalPardotEmail = msg;
	this.email = parsePardotFieldValue(msg, 'Email');
	this.pardotURL = parsePardotFieldValue(msg, 'View in Pardot');
	this.pardotProspectID = parsePardotProspectID(this.pardotURL);
	this.netsuiteURL = parsePardotFieldValue(msg, 'View in CRM');
	this.companyAsIndividual = false;
	this.score = parsePardotFieldValue(msg, 'Score');
	this.phone = parsePardotFieldValue(msg, 'Phone');
	this.validFormPhoneNumber = getVerifiedNumber(this.phone);
	this.hasBadPhoneNumber = (this.phone && !this.validFormPhoneNumber) ? true : false;
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
	this.emailDomain = parseEmailDomain(this.email);
	this.noCompanyAlertString = '';
	this.hasPardotHardBounce = hasHardBounce(this.pardotProspectID);
	this.badDataOpportunity = false;
	this.insideSalesRepID = false;
	this.outsideSalesRepID = false;
	this.salesTerritoryID = false;
	this.salesTerritoryName = false;
	
	this.netsuiteContactID = false;
	this.netsuiteCompanyID = false;
	
	this.opportunityReady = false;
	this.netsuiteOpportunityID = false;
	this.netsuiteCompanyName = false;
	this.netsuiteOpportunityID = false;
	this.netsuiteContactCategory = false;
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
function parseEmailDomain(email) {
	if (email !== null && email !== false) {
		return email.replace(/.+@/gi,'');
	}
	else {
		return false;
	}
}
function myTrim(myString) {
	return myString.replace(/^\s+|\s+$/g,"");
}
function log(title, details) {
	nlapiLogExecution('DEBUG',title,details);
}
function logObjectProperties(myObj, objName) {
	if (typeof objName == 'undefined') {
		objName = 'object';
	}
	var propertyListMsg = '';
	for (var myObjProperty in myObj) {
		if (myObj[myObjProperty] && typeof myObj[myObjProperty] !== 'function' && typeof myObj[myObjProperty] !== 'object') {
			propertyListMsg += objName + '.' + myObjProperty + ' = ' + myObj[myObjProperty] + '\n';
			nlapiLogExecution('DEBUG', 'Iterating Object Variables', objName + '.' + myObjProperty + ' = ' + myObj[myObjProperty]); // + ', type=' + (typeof myObj[myObjProperty]));
		}
	}
	return (propertyListMsg === '') ?  false : propertyListMsg;
}
function getNetsuiteRecords() {
	log('getNetsuiteRecords', 'Entering getNetsuiteRecords function');
	if (lead.netsuiteURL) {  // <Q2> - Flowchart Reference
		// <Q2-Y> - Flowchart Reference
		// (2a) - Flowchart Reference
		log('getNetsuiteRecords','Q2-Y: Flowchart Reference - lead.netsuiteContactID = ' + lead.netsuiteURL);
		lead.companyAsIndividual = (String(lead.netsuiteURL).indexOf('contact') == -1 ) ? true : false;  // <Q3> & [S2] - Flowchart Reference
		log('getNetsuiteRecords', 'lead.companyAsIndividual = ' + lead.companyAsIndividual);
		if (!lead.companyAsIndividual) {
			// <Q3-Y> - Flowchart Reference
			log('getNetsuiteRecords', 'Q3-Y: Flowchart Reference - Lead record is a contact record');
			
			
			var contactExistsInNetsuite = (getNetsuiteContactID() === false) ? false : true;
			if (contactExistsInNetsuite) {  // <Q4> - Flowchart Reference
				// <Q4-Y> - Flowchart Reference
				// (2c) - Flowchart Reference
				log('getNetsuiteRecords','Q4-Y: Flowchart Reference - Contact still exists in Netsuite.');
				var prospectCompanyExistsInNetsuite = (getNetsuiteCompanyID() === false) ? false : true;
				if (prospectCompanyExistsInNetsuite) {
					return true;
				}
				else {
					// contact exists in Netsuite but is not attached to a company.  TBD
				}
			}
			else {
				// <Q4-N> - Flowchart Reference
				// ->(2b) - Flowchart Reference
				log('getNetsuiteRecords','Q4-N: Flowchart Reference - Contact doesn\'t exist in Netsuite anymore.  Proceding to search by email');
				searchNetsuiteForContactByEmail(lead.email);
				lead.contactRecord =  nlapiLoadRecord('contact', lead.netsuiteContactID);
				// TBD ->(2c)
				getNetsuiteCompanyID();
				
			}
		}
		else {
			// <Q3-N> - Flowchart Reference
			log('getNetsuiteContactID', 'Q3-N: Flowchart Reference - Lead record is a company as individual record');
			lead.netsuiteContactID = false;
			if (getNetsuiteCompanyID()) {
				return true;
			}
			else {
				return false;
			}
		}
	
	}
	else {
		// <Q2-N> - Flowchart Reference
		// ->(2b) - Flowchart Reference - TBD
		log('getNetsuiteRecords','Q2-N: Flowchart Reference - lead.netsuiteContactID = false, since there was no netsuiteURL');
		searchNetsuiteForContactByEmail(lead.email);
		getNetsuiteCompanyID();
	}

}
function getNetsuiteContactID() {
	log('getNetsuiteContactID', 'Entering getNetsuiteContactID function');
	var strNetsuiteURL = lead.netsuiteURL;
	lead.netsuiteContactID = strNetsuiteURL.replace(/.+contact.+=/g,'');
	try {
		lead.contactRecord = nlapiLoadRecord('contact', lead.netsuiteContactID);  // attempt to load record
		log('getNetsuiteContactID','lead.netsuiteContactID = ' + lead.netsuiteContactID);
		return lead.netsuiteContactID;
	}
	catch (err) {
		// Possible error code: RCRD_DSNT_EXIST if contact had been deleted in NS
		log('getNetsuiteContactID','ERROR - ' + err.toString() +'\n' + 'Netsuite contact no longer exists');
		lead.netsuiteContactID = false;
		lead.netsuiteURL = false;
		return false;
	}
}
function parsePardotProspectID(pardotURL) {
	log('parsePardotProspectID', 'Entering parsePardotProspectID function');
	var strPardotID = pardotURL;
	strPardotID = strPardotID.replace(/.+\/id\//g,'');
	if (pardotURL == strPardotID) {
		return false;
	}
	else {
		log('parsePardotProspectID', 'Pardot ProspectID =' + strPardotID);
		return strPardotID;
	}
}
function getNetsuiteCompanyID() {
	log('getNetsuiteCompanyID', 'Entering getNetsuiteCompanyID');
	if (lead.contactRecord !== null) {  // If there is a contact record stored
		log('getNetsuiteCompanyID', 'There is a contact record stored');
		lead.netsuiteCompanyID = getAttachedCompany();
		if (!lead.netsuiteCompanyID) {  // <Q5> - Flowchart Reference
			// <Q5-N> - Flowchart Reference
			// Didn't find any attached companies, must go search for company
			lead.netsuiteCompanyID = false;
			log('getNetsuiteCompanyID','Contact is not attached to any companies');
			//  ->(2d) - Flowchart Reference - TBD
			lead.netsuiteCompanyID = searchNetsuiteForCompany();
			// <Q13-N> - Flowchart Reference
			// <Q5-Y> - Flowchart Reference
		}
		else {  // <Q5-Y> - Flowchart Reference
			// contact is attached to company
			try {  // <Q6> - Flowchart Reference
				// TBD - Determine if we still have to load this record
				lead.companyRecord = nlapiLoadRecord('customer', lead.netsuiteCompanyID);
				// <Q6-Y> - Flowchart Reference
				log('getNetsuiteCompanyID', 'lead.netsuiteCompanyID = ' + lead.netsuiteCompanyID);
			}
			catch (err) {
				// <Q6-N> - Flowchart Reference
				// ->(2d) - Flowchart Reference - TBD
				// Possible error code: RCRD_DSNT_EXIST if company had been deleted in NS
				log('getNetsuiteCompanyID','ERROR - ' + err.toString() +'\n' + 'Netsuite company no longer exists.  Attempting to find company by name');
				lead.netsuiteCompanyID = searchNetsuiteForCompany();
			}
		}
	}
	else if (lead.companyAsIndividual) {
		var strNetsuiteURL = lead.netsuiteURL;
		lead.netsuiteCompanyID = strNetsuiteURL.replace(/.+custjob.+=/g,'');
		try {  // <Q7> - Flowchart Reference
			lead.companyRecord = nlapiLoadRecord('customer', lead.netsuiteCompanyID);
			// <Q7-Y> - Flowchart Reference
			log('getNetsuiteCompanyID', 'Q7-Y: Flowchart Reference - lead.netsuiteCompanyID = ' + lead.netsuiteCompanyID);
		}
		catch (err) {
			// <Q7-N> - Flowchart Reference
			// Possible error code: RCRD_DSNT_EXIST if company had been deleted in NS
			log('getNetsuiteCompanyID','Q7-N: Flowchart Reference - ERROR - ' + err.toString() +'\n' + 'Netsuite company as individual no longer exists');
			lead.netsuiteCompanyID = searchNetsuiteForCompany();
		}
	}
	if (!lead.netsuiteCompanyID) {
		// <Q13-N> - Flowchart Reference
		if (lead.company) {  // If there was a company name create it, otherwise put contact under '1 Annonymous Customer' with internal ID = 4
			lead.netsuiteCompanyID = createNetsuiteCompany();
		}
		else {
			lead.netsuiteCompanyID = '4';
		}
	}
	
	return lead.netsuiteCompanyID;
}
function searchNetsuiteForContactByEmail(contactEmail) {
	var companyStatuses = [];
	
	var filters = [];
	var columns = [];
	filters[0] =  new nlobjSearchFilter('email', null, 'is', contactEmail);
	filters[1] =  new nlobjSearchFilter('isinactive', null, 'is', 'F');
	filters[2] =  new nlobjSearchFilter('isjob', 'customer', 'is', 'F');
	filters[3] =  new nlobjSearchFilter('isinactive', 'customer', 'is', 'F');
	
	columns[0] = new nlobjSearchColumn('internalid');  // Netsuite contact internalid
	columns[1] = new nlobjSearchColumn('status', 'customer');  // Netsuite company status
	columns[2] = new nlobjSearchColumn('internalid','customer');  // Netsuite company internalid
	columns[3] = new nlobjSearchColumn('entityid','customer');  // Netsuite company name id
	columns[4] = new nlobjSearchColumn('firstname');  // Netsuite contact first name
	columns[5] = new nlobjSearchColumn('lastname');  // Netsuite contact last name
	columns[6] = new nlobjSearchColumn('stage','customer');  // Netsuite company name id

	var contactRecords = nlapiSearchRecord('contact', null, filters, columns);
	if (contactRecords !== null) {  // <Q8> - Flowchart Reference
		// <Q8-Y> - Flowchart Reference
		log('searchNetsuiteForContactByEmail', 'Q8-Y:  Flowchart Reference - Found at least 1 matching contact by email address');
		var nsContact;
		var fname;
		var lname;
		var customerStatus;
		var overallHighestCustomerStatus;
		var overallHighestCustomerStatusContactID;
		var exactNameMatchHighestCustomerStatus;
		var exactNameMatchHighestCustomerStatusContactID;
		var customerStatusList = [];
		var exactNameMatchIndexes = [];
		var exactNameMatchCounter = 0;
		if (contactRecords.length > 1) {  // <Q9> - Flowchart Reference
			// <Q9-Y> - Flowchart Reference
			log('searchNetsuiteForContactByEmail', 'Q9-Y:  Flowchart Reference - Found (' + contactRecords.length + ') contacts with email address = ' + contactEmail);
			customerStatusList = getProbabilitySortedCompanyStatusList();
			for (var i = 0 ; i < contactRecords.length ; i++) {
				nsContact = contactRecords[i];
				fname = nsContact.getValue('firstname');
				lname = nsContact.getValue('lastname');
				internalID = nsContact.getValue('internalid');
				customerStatus = getStatusNameByID(nsContact.getValue('status', 'customer'));
				
				if (i === 0) {
					overallHighestCustomerStatus = customerStatus;
					overallHighestCustomerStatusContactID = internalID;
				}
				else if (customerStatusList.indexOf(customerStatus) > customerStatusList.indexOf(overallHighestCustomerStatus)) {
					overallHighestCustomerStatus = customerStatus;
					overallHighestCustomerStatusContactID = internalID;
				}
				log('searchNetsuiteForContactByEmail', 'Matching contact #' + (i + 1) + ' internalID = ' + internalID + ', ' + fname + ' ' + lname + ', Customer status = ' + customerStatus);
				if (fname == lead.firstName && lname == lead.lastName) {  // <Q10> - Flowchart Reference
					// <Q10-Y> - Flowchart Reference
					log('searchNetsuiteForContactByEmail', 'Q10-Y: - Flowchart Reference - Exact name match found');
					exactNameMatchIndexes[exactNameMatchCounter] = i;
					exactNameMatchCounter++;
					if (exactNameMatchCounter == 1) {
						exactNameMatchHighestCustomerStatus = customerStatus;
						exactNameMatchHighestCustomerStatusContactID = internalID;
					}
					else if (customerStatusList.indexOf(customerStatus) > customerStatusList.indexOf(exactNameMatchHighestCustomerStatus)) {
						log('searchNetsuiteForContactByEmail', 'This exact match has a higher customer status than the previously found contact');
						exactNameMatchHighestCustomerStatus = customerStatus;
						exactNameMatchHighestCustomerStatusContactID = internalID;
					}
					else {
						log('searchNetsuiteForContactByEmail', 'This exact match does not have a higher customer status than the previously found contact');
					}
				}
			}
			if (exactNameMatchCounter > 1) { // <Q11> - Flowchart Reference
				// <Q11-Y> - Flowchart Reference
				log('searchNetsuiteForContactByEmail', 'Q11-Y: - Flowchart Reference.  There were multiple exact name matches.  Selected contact with Internal ID = ' + exactNameMatchHighestCustomerStatusContactID);
				lead.netsuiteContactID = exactNameMatchHighestCustomerStatusContactID;
				lead.netsuiteURL = 'https://system.netsuite.com/app/common/entity/contact.nl?id=' + lead.netsuiteContactID;
				return exactNameMatchCounter;
			}
			else if (exactNameMatchCounter == 1) {
				// <Q11-N> - Flowchart Reference
				// Found single contact
				log('searchNetsuiteForContactByEmail', 'Q11-N: - Flowchart Reference.  There was only one exact name match.  Contact Internal ID = ' + exactNameMatchHighestCustomerStatusContactID);
				lead.netsuiteContactID = exactNameMatchHighestCustomerStatusContactID;
				lead.netsuiteURL = 'https://system.netsuite.com/app/common/entity/contact.nl?id=' + lead.netsuiteContactID;
				log('searchNetsuiteForContactByEmail', 'Matched contact email and exact name.  Internal ID = ' + exactNameMatchHighestCustomerStatusContactID + ', Name: ' + fname + ' ' + lname);
				return exactNameMatchCounter;
			}
			else {
				// <Q10-N> - Flowchart Reference
				// No Exact Name Match
				lead.netsuiteContactID = overallHighestCustomerStatusContactID;
				lead.netsuiteURL = 'https://system.netsuite.com/app/common/entity/contact.nl?id=' + lead.netsuiteContactID;
				log('searchNetsuiteForContactByEmail', 'Q10-N: - Flowchart Reference.  There was no exact name match.  Selected contact with Internal ID = ' + overallHighestCustomerStatusContactID);
				// TBD - check this
				return 0;
			}
		}
		else {
			// Found 1 matching contact
			// <Q9-N> - Flowchart Reference
			log('searchNetsuiteForContactByEmail', 'Q9-N: - Flowchart Reference.  Found exactly one matching contact');
			nsContact = contactRecords[0];
			lead.netsuiteContactID = nsContact.getValue('internalid');
			lead.netsuiteURL = 'https://system.netsuite.com/app/common/entity/contact.nl?id=' + lead.netsuiteContactID;
			log('searchNetsuiteForContactByEmail', 'Attempting to find the company');
			lead.netsuiteCompanyID = getAttachedCompany();
			
			//log('searchNetsuiteForContactByEmail', 'Found contact by email address = ' + contactEmail + ', lead.netsuiteURL = ' + lead.netsuiteURL + ', lead.netsuiteCompanyID = ' + lead.netsuiteCompanyID);
			return 1;
			
		}
	}
	else {
		// <Q8-N> - Flowchart Reference
		// Did not find any matching contacts
		log('searchNetsuiteForContactByEmail', 'Q8-N: Flowchart Reference - Did not find any matching contacts by email address = ' + contactEmail);
		createNetsuiteContact();
		return 0; // TBD - check this
	}
}
function isOpportunityReady() {
	if (lead.companyAsIndividual) {
		if (lead.netsuiteCompanyID) {
			lead.opportunityReady = true;
		}
		else {
			lead.opportunityReady = false;
		}
		log('isOpportunityReady', 'Company as individual record, isOpportunityReady = ' + lead.opportunityReady);
	}
	else {
		if (lead.netsuiteContactID && lead.netsuiteCompanyID) {
			lead.opportunityReady = true;
		}
		else {
			lead.opportunityReady = false;
		}
		log('isOpportunityReady', 'Contact record, isOpportunityReady = ' + lead.opportunityReady);
	}
	return lead.opportunityReady;
}
function createOpportunity(){
	// TBD - Add code to create the opportunity
	if (isOpportunityReady()) {
		log('createOpportunity', 'Creating new opportunty');
		
		var newOpp = nlapiCreateRecord( 'opportunity',{customform: 152});
		var today = new Date();
		var expectedCloseDate = nlapiAddDays(today, 90);
		var oppTitle;
		if (lead.formSubmission == 'Product Quote Request') {
			oppTitle = lead.formSubmission + ': ' + lead.product;
		}
		else {
			oppTitle = lead.formSubmission;
		}
		if (!lead.validFormPhoneNumber && lead.hasPardotHardBounce === true) {
			log('createOpportunity - BAD OPP', 'BAD OPPORTUNITY - CONFIRMED BOUNCE FOR EMAIL ADDRESS AND INVALID PHONE NUMBER');
			lead.badDataOpportunity = true;
		}
		else {
			log('createOpportunity - BAD OPP', 'lead.validFormPhoneNumber =' + lead.validFormPhoneNumber + 'lead.hasPardotHardBounce = ' + lead.hasPardotHardBounce );
		}
		newOpp.setFieldValue( 'title', oppTitle);
		if (lead.badDataOpportunity) {
			
			newOpp.setFieldValue( 'entitystatus', '19'); // ID=24: S - Pass to OSR, ID=19: L - Loss
			newOpp.setFieldValue( 'winlossreason', '10'); // ID=10: Pardot - Prospect Not Valid, (as of Jan 30, 2013)
			newOpp.setFieldValue( 'custbody_oppfeedback', '9');  // custbody_oppfeedback  ID=9 : Dead - Bad data from Pardot, from: customlist_leadfeedback
		}
		else {
			newOpp.setFieldValue( 'entitystatus', '24'); // ID=24: S - Pass to OSR, ID=19: L - Loss
			newOpp.setFieldValue( 'custbody_oppfeedback', '8');	//// custbody_oppfeedback  ID=8 :Passed to OSR
		}
		newOpp.setFieldValue( 'entity', lead.netsuiteCompanyID);
		if (lead.companyAsIndividual === false) {
			log('createOpportunity', 'Attempting to add contact with internal id = ' + lead.netsuiteContactID + ' to opportunity with customer internal id = ' + lead.netsuiteCompanyID);
			newOpp.setFieldValue( 'custbody_oppcontact', lead.netsuiteContactID);
		}
		newOpp.setFieldValue( 'leadsource', '198651');  //Pardot Priority Lead
		newOpp.setFieldValue( 'custbody_pardotgeneratedopp', 'T'); // custbody_pardotgeneratedopp

		newOpp.setFieldValue( 'custbody_pardotemail', lead.originalPardotEmail);
		newOpp.setFieldValue( 'expectedclosedate', nlapiDateToString(expectedCloseDate));
		newOpp.setFieldValue( 'custbody_viewcontactinpardot', lead.pardotURL);
		newOpp.setFieldValue( 'custbody_pardotformphonenumber', lead.validFormPhoneNumber);
		newOpp.setFieldValue( 'custbody_pardotformname', (lead.formSubmission === false) ? null : lead.formSubmission);
		newOpp.setFieldValue( 'custbody_pardotproduct',(lead.product === false) ? null : lead.product);
		newOpp.setFieldValue( 'custbody_pardottrainingcourse',(lead.trainingCourse === false) ? null : lead.trainingCourse);
		newOpp.setFieldValue( 'custbody_pardotscore',(lead.score === false) ? null : lead.score);
		newOpp.setFieldValue( 'custbody_salesterritory',(lead.salesTerritoryID === false) ? null : parseInt(lead.salesTerritoryID, 10));
		newOpp.setFieldValue( 'custbody_pardothardbounce',(lead.hasPardotHardBounce === false) ? null : 'T');
		newOpp.setFieldValue( 'custbody_pardotbadphonenumber',(lead.hasBadPhoneNumber === false) ? null : 'T');

		var oppMemo = 'This is a Pardot lead that requires immediate follow up (ie. Quote Request, Call Me Request, Eval Request, Demo Request, etc. from the website), and the time-to-follow-up is KPI that will be measured.  \n\nIf you feel this type of form completion should not require immediate follow-up please notify marketing. \n\nProvince: ' + lead.state + ', Postal Code: ' + lead.zip + ', \n\nPlease see Pardot tab on opportunity for full Pardot notification email details.' + lead.noCompanyAlertString;
		newOpp.setFieldValue( 'memo', oppMemo);
		if (getSalesTerritoryInfo()) {
			// Add code to set the geographical territory on the company record
		}
		if (testingMode) {  // Only create opportunities in my Name if in testing mode
			lead.insideSalesRepID = '105';  // Robert Gama = 105
		}
		newOpp = replaceSalesTeam(newOpp, lead.insideSalesRepID);  // Replace the opportunity sales team with the inside sales rep
		incrementRepSalesLeadCounters(lead.insideSalesRepID);  //
		lead.netsuiteOpportunityID = nlapiSubmitRecord(newOpp, true, true);	// Ignore mandatory fields
		lead.opportunityRecord = newOpp;
		log('createOpportunity', 'Opportunity created with internal id = ' + lead.netsuiteOpportunityID);
		return lead.netsuiteOpportunityID;
	}
	else {
		log('createOpportunity', 'The prospect was not opportunity ready according to the script for some reason, please debug');
		return false;
	}
	
}
function getCompanyID(contactID, contactSearchResult, contactSearchResultIndex) {
	// 1213173 - example attached to company
	// 19691 - example not attached to company (temporary)
	// 1213173 - example attached to 2 companies (temporary)
	if (typeof contactSearchResult == 'undefined' || contactSearchResult === null) {
		//  TBD - Determine how many companies contact is attached to
		var companyValues = ['customer.internalid','customer.companyname'];
		var columns = nlapiLookupField('contact', contactID, companyValues);
		lead.netsuiteCompanyID = columns['customer.internalid'] === null ? false : columns['customer.internalid'];
		log('getCompanyID','netsuiteCompanyID = ' + netsuiteCompanyID);
	}
	else {
		log('getCompanyID','search result passed');
		// TBD - Add code if search result was passed to the function
	}
}
function getProbabilitySortedCompanyStatusList() {
	/*  Customer Status List (as of Dec 19, 2012)
	
	Internal ID		Customer Status						Stage		Probability		Description												Include In Lead Reports
	---------------------------------------------------------------------------------------------------------------------------------------------------------------
	21				Dead Lead - No Fit					Lead		0				Lead will never have a requirement for our solutio		No
	23				Development - Keep Warm				Lead		0				Identified opportunity but the company is not read		No
	32				Out of Business						Lead		0				Lead no longer in business								No
	20				Semi Qualified - Good Fit Later		Lead		0				Lead is a fit for Javelin but the timing is not ri		No
	6				Unqualified - Have not spoken to	Lead		0				Recent Reponse (Call in, email, Campaign) that has		No
	31				Unqualified - No Response			Lead		0				Lead has not responded to messages or emails.			No
	8				A - Closing							Prospect	60				Active account that has completed the prove out of
	14				B - Prove Out						Prospect	25				Active Account working thru the prove out of a sol
	9				C - Development						Prospect	15				Active account working with us ot determin the too
	26				F - Fulfillment						Prospect	25				Account that does not require any education or pro
	19				L - Loss							Prospect	0				Buyer chooses another competitior or no decision o
	22				N - Nurture							Prospect	1				Good Long term deals that OSR wants to follow up w
	33				Out of Business						Prospect	0				Prospect no longer in business
	25				S - Javelin Internal Hand Off		Prospect	1				Use this status to pass an opportunity to the sale
	24				S - Pass to OSR						Prospect	1				A Gold, Silver, or Bronze Opportunity is being pas
	28				T - ISR Nurture						Prospect	1				Opportunity for internal Javelin people to follow
	13				Closed Won							Customer	100
	16				Lost Customer						Customer	0
	30				Out of Business						Customer	0				Customer no longer in business
	*/
	//  Function to return a list of customer status names in order of importance
	
	
	/*  Sorting of multidimensional arrays functions
		See: http://www.webxpertz.net/forums/content.php/146-JavaScript-Sorting-a-Multidimensional-Array-quicksort
	*/
	Array.prototype.swap = function(a, b) {
		var tmp = this[a];
		this[a] = this[b];
		this[b] = tmp;
	};
	function partition(array, begin, end, pivot) {
		var sortColArray = new Array(0, 1);
		var ColIndex = 0;
		var secondIndex = sortColArray[ColIndex];
		var piv = array[pivot];
		array.swap(pivot, end - 1);
		var store = begin;
		var ix;
		var secondFlag = false;
		
		for (ix = begin; ix < end - 1; ++ix ) {
			if (array[ix][secondIndex] == piv[secondIndex]) {
				secondIndex = sortColArray[++ColIndex];
				secondFlag = true;
			}

			if (array[ix][secondIndex] <= piv[secondIndex]) {
				array.swap(store, ix);
				++store;
			}
			if (secondFlag === true)
				{
					secondIndex = sortColArray[--ColIndex];
					secondFlag = false;
				}
		}
		array.swap(end - 1, store);
		return store;
	}
	function qsort(array, begin, end) {
		if (end - 1 > begin) {
			var pivot = begin + Math.floor( Math.random() * (end - begin));
			pivot = partition(array, begin, end, pivot);
			qsort(array, begin, pivot);
			qsort(array, pivot + 1, end);
		}
	}
	function quick_sort(array) {
		qsort(array, 0, array.length);
	}
	function dosort(array) {
		quick_sort(array);
	}
	/*  END OF Sorting of multidimensional arrays functions
	 ***********************************************************************************************************
	*/

	
	
	var filters = [];
	var columns = [];
	
	filters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('name');
	columns[2] = new nlobjSearchColumn('probability');
	
	var statusList = nlapiSearchRecord('customerstatus',null,filters, columns);
	if (statusList !== null) {
		for (var i = 0 ; i < statusList.length ; i++) {
			var myStatus = statusList[i];
			statusArray[i] = [parseInt(myStatus.getValue('probability'), 10), myStatus.getValue('name'), myStatus.getValue('internalid')];
		}
		var sortedStatuses = [];
		dosort(statusArray);
		for (var j = 0 ; j < statusList.length ; j++) {
			sortedStatuses[j] = statusArray[j][1];
		}
		//log('getProbabilitySortedCompanyStatusList', sortedStatuses);
		return sortedStatuses;
	}
	return false;
}
function getStatusNameByID(statusID) {
	if (statusArray !== null && statusArray.length >0 ) {
		for (var i = 0; i < statusArray.length; i++) {
			if (statusArray[i][2] == statusID) {
				return statusArray[i][1];
			}
		}
	}
}
function getAttachedCompany(contactID) {
	if (typeof contactID == 'undefined') {
		contactID = lead.netsuiteContactID;
	}
	var searchForCompanyNameMatch;
	var companyName;
	var partialCompanyName;
	var overallHighestCustomerStatus;
	var overallHighestCustomerStatusCustomerID;
	var customerStatusList;

	try {
		var debugCmdCount = 0;
		companyName = String(lead.company);
		
		debugCmdCount++;
		if (companyName.length > 0 && companyName != 'false') {
			debugCmdCount++;
			searchForCompanyNameMatch = true;
			debugCmdCount++;
			partialCompanyName = companyName.replace(/\./g,'').replace(/\s(parters|limited|incorporated|corporation|group|inc|ltd|corp)/i,'');
			log('getAttachedCompany', 'companyName:  ' + companyName + ', partialCompanyName:  ' + partialCompanyName);
			debugCmdCount++;
		}
		else {
			searchForCompanyNameMatch = false;
			debugCmdCount++;
		}
	}
	catch (err) {
		log('getAttachedCompany', '# of completed commands: ' + debugCmdCount + ', ERROR - ' + err.toString());
	}
	// 19691 - example not attached to company (temporary)
	// 1213173 - example attached to 2 companies (temporary)

	var filters = [];
	var columns = [];
	filters[0] = new nlobjSearchFilter('internalid', null, 'anyof', parseInt(contactID, 10), null);
	columns[0] = new nlobjSearchColumn('status', 'customer');  // Netsuite company status
	columns[1] = new nlobjSearchColumn('internalid','customer');  // Netsuite company internalid
	columns[2] = new nlobjSearchColumn('companyname','customer');  // Netsuite company name id

	var contactRecords = nlapiSearchRecord('contact', null, filters, columns);
	if (contactRecords !== null) {  // <TBD> - Flowchart Reference
		if (searchForCompanyNameMatch) {
			var exactNameMatches = [];
			var partialNameMatches = [];
			var foundCompanyName;
			var exactMatchIndex = 0;
			var partialMatchIndex = 0;
			for (var k = 0; k < contactRecords.length ; k++) {
				foundCompanyName = contactRecords[k].getValue('companyname', 'customer');
				if (foundCompanyName == companyName) {
					exactNameMatches[exactMatchIndex] = contactRecords[k];
					exactMatchIndex++;
				}
				else if (foundCompanyName == partialCompanyName) {
					partialNameMatches[partialMatchIndex] = contactRecords[k];
					partialMatchIndex++;
				}
			}
			if (exactMatchIndex) {
				contactRecords = exactNameMatches;
			}
			else if (partialMatchIndex) {
				contactRecords = partialNameMatches;
			}
		}

		if (typeof statusArray[0][0] == 'undefined' || statusArray[0][0] === null) {
			customerStatusList = getProbabilitySortedCompanyStatusList();
		}
		for (var i = 0 ; i < contactRecords.length ; i++ ) {
			var curContact = contactRecords[i];
			var companyInternalID = curContact.getValue('internalid', 'customer');
			var customerStatus = getStatusNameByID(curContact.getValue('status', 'customer'));
			if (i === 0) {
				overallHighestCustomerStatus = customerStatus;
				overallHighestCustomerStatusCustomerID = companyInternalID;
			}
			else if (customerStatusList.indexOf(customerStatus) > customerStatusList.indexOf(overallHighestCustomerStatus)) {
				overallHighestCustomerStatus = customerStatus;
				overallHighestCustomerStatusCustomerID = companyInternalID;
			}
			log('getAttachedCompany', 'Company ID = ' + companyInternalID + ', Company Name = ' + curContact.getValue('companyname', 'customer') + ', Status = ' + customerStatus);
		}
	}
	else {
		log('getAttachedCompany', 'Contact is not attached to a company');
		return false;
	}
	log('getAttachedCompany', 'Final Result:  Company ID = ' + overallHighestCustomerStatusCustomerID + ', Company Name = ' + nlapiLookupField('customer', overallHighestCustomerStatusCustomerID, 'companyname') + ', Status = ' + overallHighestCustomerStatus);
	return overallHighestCustomerStatusCustomerID;
}
function getVerifiedNumber(inputPhoneNumber) {

	var regex = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension\.?|xt\.?|.)\s*(\d+))?$/;
	var i = 0 ;
	var formattedNumber = '';
	var areaCode = '';
	var number1 = '';
	var number2 = '';
	var ext = '';
	if (regex.test(inputPhoneNumber)) {
		var matches = inputPhoneNumber.match(regex);
		for (var match in matches) {
			if (typeof matches[match] == 'undefined') {
			// if undefined type, just skip
			}
			else {
				i+=1;
				switch(i) {
					case 2:
						areaCode = matches[match];
						break;
					case 3:
						number1 = matches[match];
						break;
					case 4:
						number2 = matches[match];
						break;
					case 5:
						ext = matches[match];
						break;
				}
			}
		}
		if (parseInt(ext, 10) > 0) {
			formattedNumber = areaCode + '-' + number1 + '-' + number2 + 'x' + ext;  // This is the properly formatted number!!!!
		}
		else {
			formattedNumber = areaCode + '-' + number1 + '-' + number2;
		}
		lead.validFormPhoneNumber = formattedNumber;
		//nlapiLogExecution('DEBUG', 'regEx Test', 'Formatted Number = ' + formattedNumber);
		return formattedNumber;
	}
	else {
		log('getVerifiedNumber', 'Regex test failed for:  ' + inputPhoneNumber);
		lead.validFormPhoneNumber = false;
		//lead.phone = null;
		return null;
	}
}
function createNetsuiteContact() {
	// <Q8-N> - Flowchart Reference
	log('createNetsuiteContact', 'Creating a new contact');
	var newContact = nlapiCreateRecord( 'contact', {customform: 36});
	newContact.setFieldValue( 'firstname', lead.firstName);
	if (lead.lastName) {
		newContact.setFieldValue( 'lastname', lead.lastName);
	}
	newContact.setFieldValue( 'email', lead.email);
	newContact.setFieldValue( 'phone', lead.validFormPhoneNumber);
	newContact.setFieldValue( 'custentitypi_url', lead.pardotURL);
	lead.netsuiteCompanyID = searchNetsuiteForCompany();
	if (!lead.netsuiteCompanyID) {
		log('createNetsuiteContact', 'Did not find a matching company in Netsuite.  Calling createNetsuiteCompany() to create one');
		createNetsuiteCompany();
	}
	newContact.setFieldValue( 'company', lead.netsuiteCompanyID);
	try {
		lead.netsuiteContactID = nlapiSubmitRecord(newContact, true, true);	// Ignore mandatory fields
		lead.netsuiteURL = 'https://system.netsuite.com/app/common/entity/contact.nl?id=' + lead.netsuiteContactID;
		log('createNetsuiteContact', lead.email + ', ' + lead.netsuiteURL);
		return lead.netsuiteContactID;
	}
	catch (err) {
		log('createNetsuiteContact', 'Unable to create contact for some reason. \n' + err.toString());  // TBD - check why
	}
	
}
function searchNetsuiteForCompany() {
	log('searchNetsuiteForCompany', 'Entering search for Netsuite Company function');
	// TBD - prevent 1000's of matching companies if someone puts in 'm' for a company name.
	var searchForCompanyNameMatch;
	var partialCompanyName;
	var debugCmdCount;
	var overallHighestCustomerStatus;
	var overallHighestCustomerStatusCustomerID;
	var customerStatusList;

	try {
		debugCmdCount = 0;
		companyName = String(lead.company);
		debugCmdCount++;
		if (companyName.length > 0 && companyName != 'false') {
			debugCmdCount++;
			searchForCompanyNameMatch = true;
			debugCmdCount++;
			partialCompanyName = companyName.replace(/\./g,'').replace(/\s(parters|limited|incorporated|corporation|group|inc|ltd|corp)/i,'');
			log('searchNetsuiteForCompany', 'companyName:  ' + companyName + ', partialCompanyName:  ' + partialCompanyName);
			debugCmdCount++;
		}
		else {
			searchForCompanyNameMatch = false;
			debugCmdCount++;
		}
	}
	// Delete this try/catch once error is found.  TBD
	catch (err) {
		log('searchNetsuiteForCompany', '# of completed commands: ' + debugCmdCount + ', ERROR - ' + err.toString());
	}
	// 19691 - example not attached to company (temporary)
	// 1213173 - example attached to 2 companies (temporary)
	if (searchForCompanyNameMatch) {
		var filters = [];
		var columns = [];
		filters[0] = new nlobjSearchFilter('companyname', null, 'startswith', partialCompanyName);
		columns[0] = new nlobjSearchColumn('status');  // Netsuite company status
		columns[1] = new nlobjSearchColumn('internalid');  // Netsuite company internalid
		columns[2] = new nlobjSearchColumn('companyname');  // Netsuite company name id

		var companyRecords = nlapiSearchRecord('customer', null, filters, columns);
		if (companyRecords !== null) {  // <TBD> - Flowchart Reference
			
				var exactNameMatches = [];
				var partialNameMatches = [];
				var foundCompanyName;
				var exactMatchIndex = 0;
				var partialMatchIndex = 0;
				for (var k = 0; k < companyRecords.length ; k++) {
					foundCompanyName = companyRecords[k].getValue('companyname');
					if (foundCompanyName == companyName) {
						exactNameMatches[exactMatchIndex] = companyRecords[k];
						exactMatchIndex++;
					}
					else if (foundCompanyName == partialCompanyName) {
						partialNameMatches[partialMatchIndex] = companyRecords[k];
						partialMatchIndex++;
					}
				}
				if (exactMatchIndex) {
					companyRecords = exactNameMatches;
				}
				else if (partialMatchIndex) {
					companyRecords = partialNameMatches;
				}

			if ( typeof statusArray[0][0] == 'undefined' || statusArray[0][0] === null) {
				customerStatusList = getProbabilitySortedCompanyStatusList();
			}
			for (var i = 0 ; i < companyRecords.length ; i++) {
				var curCompany = companyRecords[i];
				var companyInternalID = curCompany.getValue('internalid');
				var customerStatus = getStatusNameByID(curCompany.getValue('status'));
				if (i === 0) {
					overallHighestCustomerStatus = customerStatus;
					overallHighestCustomerStatusCustomerID = companyInternalID;
				}
				else if (customerStatusList.indexOf(customerStatus) > customerStatusList.indexOf(overallHighestCustomerStatus)) {
					overallHighestCustomerStatus = customerStatus;
					overallHighestCustomerStatusCustomerID = companyInternalID;
				}
				log('searchNetsuiteForCompany', 'Company ID = ' + companyInternalID + ', Company Name = ' + curCompany.getValue('companyname') + ', Status = ' + customerStatus);
			}
		}
		else {
			log('searchNetsuiteForCompany', 'Could not find a matching company by a name search');
			return false;
		}
		log('searchNetsuiteForCompany', 'Final Result:  Company ID = ' + overallHighestCustomerStatusCustomerID + ', Company Name = ' + nlapiLookupField('customer', overallHighestCustomerStatusCustomerID, 'companyname') + ', Status = ' + overallHighestCustomerStatus);
		return overallHighestCustomerStatusCustomerID;
	}
	else {
		log('searchNetsuiteForCompany', 'There was an no company name provided to search with');
		return false;
	}
}
function createNetsuiteCompany() {
	// <Q13-N> - Flowchart Reference
	log('createNetsuiteCompany', 'Creating a new company record in Netsuite');
	var newCompany = nlapiCreateRecord( 'prospect', {customform: 35});
	
	if (lead.company !== false) {
		newCompany.setFieldValue( 'companyname', lead.company);
		newCompany.setFieldValue( 'phone', lead.validFormPhoneNumber);
		newCompany.setFieldValue( 'entitystatus', '24');
		newCompany.setFieldValue( 'leadsource', '198651');  // 198651 = Pardot Priority Lead.  For full list:  https://system.netsuite.com/app/crm/marketing/campaignlist.nl?Campaign_ISSALESCAMPAIGN=F
		
		if (lead.zip !== false || lead.state !== false) {
			log('createNetsuiteCompany', 'Zip or State values are not blank so adding a new address to the customer record');
			newCompany.selectNewLineItem('addressbook');
			newCompany.setCurrentLineItemValue('addressbook','defaultbilling','T');
			newCompany.setCurrentLineItemValue('addressbook','defaultshipping','T');
			newCompany.setCurrentLineItemValue('addressbook','state', (lead.state === false) ? null : lead.state);
			newCompany.setCurrentLineItemValue('addressbook','zip', (lead.zip === false) ? null : lead.zip);
			newCompany.setCurrentLineItemValue('addressbook','label', 'Pardot_Script_Address');
			newCompany.commitLineItem('addressbook');
		}

		getSalesTerritoryInfo();
		var newCompanyRep;
		if (lead.outsideSalesRepID === false) {
			newCompanyRep = lead.insideSalesRepID;
		}
		else {
			newCompanyRep = lead.outsideSalesRepID;
		}
		newCompany.selectNewLineItem('salesteam');
		newCompany.setCurrentLineItemValue('salesteam','employee', newCompanyRep);  // Assign company to outside sales rep
		newCompany.setCurrentLineItemValue('salesteam','salesrole', '-2');  // -2 = Account Manager
		newCompany.setCurrentLineItemValue('salesteam','contribution', '100.0');
		newCompany.setCurrentLineItemValue('salesteam','isprimary', 'T');
		newCompany.commitLineItem('salesteam');
		log('createNetsuiteCompany', 'Added Sales Team Member: ' + newCompanyRep + ' to the customer record');
		try {
			lead.netsuiteCompanyID = nlapiSubmitRecord(newCompany, true, true);	// Ignore mandatory fields
		}
		catch (err) {
			log('createNetsuiteCompany', 'Unable to create company for some reason. \n' + err.toString());  // TBD - why?
		}
	}
	else {
		lead.netsuiteCompanyID = '4';  // Internal ID of annonymous customer
		noCompanyAlertString = '\n\n****ALERT: This prospect did not have a company name from Pardot, addded to default company record.  Please fix or have Netsuite Admin fix Netsuite and Pardot records';
	}
	log('createNetsuiteCompany', 'netsuiteCompanyID = ' + lead.netsuiteCompanyID);
	return lead.netsuiteCompanyID;
}
function getSalesTerritoryInfo() {
	var foundSalesTerritory = false;
	var filters = [];
	var columns = [];
	
	if (lead.fsa !== false) {
		filters[0] =  new nlobjSearchFilter('custrecord_fsalist', null, 'contains', lead.fsa);
		columns[0] = new nlobjSearchColumn('internalid');
		columns[1] = new nlobjSearchColumn('custrecord_outsidesalesrep');
		columns[2] = new nlobjSearchColumn('custrecord_insidesalesrep');
		columns[3] = new nlobjSearchColumn('name');
		
		log('getSalesTerritoryInfo', 'Attempting to find the Javelin Sales Territory by FSA');
		var territoryRecords = nlapiSearchRecord('customrecord_javelinsalesterritory', null, filters, columns);
		for (var i = 0 ; territoryRecords !== null && i < territoryRecords.length ; i++) {
			var javSalesTerritory = territoryRecords[i];
			foundSalesTerritory = true;
			lead.insideSalesRepID = javSalesTerritory.getValue('custrecord_insidesalesrep');
			lead.outsideSalesRepID = javSalesTerritory.getValue('custrecord_outsidesalesrep');
			lead.salesTerritoryID = javSalesTerritory.getValue('internalid');
			lead.salesTerritoryName = javSalesTerritory.getValue('name');
			log('getSalesTerritoryInfo', 'Success! Found sales territory.  lead.salesTerritoryName = ' + lead.salesTerritoryName + ', lead.salesTerritoryID = ' + lead.salesTerritoryID + ', lead.insideSalesRepID = ' + lead.insideSalesRepID + ', lead.outsideSalesRepID = ' + lead.outsideSalesRepID);
		}
	}
	if (foundSalesTerritory) {
		return true;
	}
	else {
		//Saved Search for setting who is in the queue:  Javelin Employees with Access to Inside Sales Role (DO NOT DELETE), internalID = customsearch_insidesalequeue
		lead.insideSalesRepID = getNextInsideSalesRep();
		return false;
	}
}
function getNextInsideSalesRep() {
	// TBD - Add a way to update the counter on the employee record
	var filters = [];
	var columns = [];
	
	filters[0] =  new nlobjSearchFilter('custentity_salesleadqueuemember', null, 'is', 'T');
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('custentity_salesleadcount').setSort();
	columns[2] = new nlobjSearchColumn('entityid');
	
	log('getNextInsideSalesRep', 'Attempting to find the next Javelin inside sales rep in the sales queue');
	var insideRepsInQueue = nlapiSearchRecord('employee', null, filters, columns);
	if (insideRepsInQueue !== null && insideRepsInQueue.length > 0) {
		var insideRepInQueue = insideRepsInQueue[0];
		var insideRepID = insideRepInQueue.getValue('internalid');
		log('getNextInsideSalesRep', 'Employee internal ID = ' + insideRepID + ', Employee Name/ID = ' + insideRepInQueue.getValue('entityid')  + ', Sales Lead Count = ' + insideRepInQueue.getValue('custentity_salesleadcount'));
		return insideRepID;
	}
	else {
		return false;
	}
}
function replaceSalesTeam(recordObject, newRepID) {
	//Function to return the recordObject with the sales team replaced with the new sales rep
	
	if (typeof recordObject == 'object') {
		var iRep = 1;
		var reps = recordObject.getLineItemCount('salesteam');
		for (var rep = 1; rep <= reps; rep++) {
			recordObject.removeLineItem('salesteam', rep);
		}
		recordObject.selectNewLineItem('salesteam');
		recordObject.setCurrentLineItemValue('salesteam','employee', newRepID);
		recordObject.setCurrentLineItemValue('salesteam','salesrole', '-2');  // -2 = Account Manager
		recordObject.setCurrentLineItemValue('salesteam','contribution', '100.0');
		recordObject.setCurrentLineItemValue('salesteam','isprimary', 'T');
		recordObject.commitLineItem('salesteam');
		log('replaceSalesTeam', 'Replaced whole Sales Team with sales rep with ID: ' + newRepID + ' to the record');
		return recordObject;
	}
	else {
		log('replaceSalesTeam', 'You must provide a record object as the first argument');
		return false;
	}
}
function incrementRepSalesLeadCounter(repID, counterFieldInternalID) {
	var newCount;
	try {
		if (!isNaN(parseInt(nlapiLookupField('employee', repID, counterFieldInternalID), 10))) {
			newCount = parseInt(nlapiLookupField('employee', repID, counterFieldInternalID), 10) + 1;
		}
		else {
			newCount = 1;
		}
		nlapiSubmitField('employee', repID, counterFieldInternalID, newCount, true);
		log('incrementRepSalesLeadCounter', 'Successfully incremented counter (' + counterFieldInternalID + ') for employeeID = ' + repID + ' to ' + newCount);
		return true;
	}
	catch (err) {
		log('incrementRepSalesLeadCounter', 'Unexpected error, could not update counter(' + counterFieldInternalID + ').  ' + err.toString());
		return false;
	}
}
function incrementRepSalesLeadCounters(repID) {
	incrementRepSalesLeadCounter(repID, 'custentity_salesleadcount');
	incrementRepSalesLeadCounter(repID, 'custentity_salesleadcounttotal');
}
/**
 * getPardotAuthentication gets an api key from Pardot
 * @return {string} Returns either an authentication string or false if authentication was not successful
 */
	// base query string with the record type and the authentication string
function getPardotAuthentication() {
		var pardotUserEmail = encodeURIComponent('robert.gama@javelin-tech.com');  // enter your pardot email
		var pardotPassword = encodeURIComponent('6dUEVRCYrAJ6Cn9V');  // enter your pardot pw
		var user_key = encodeURIComponent('2738d5f6a40a03179a4c318c605e7f88');  // enter your pardot user_key (find in your settings in Pardot)

		var url = 'https://pi.pardot.com/api/login/version/3?email=' + pardotUserEmail + '&password=' + pardotPassword + '&user_key=' + user_key;
		var api_key;
		var responseXML;
		// Submit the authentication request to Pardot in order to get an api_key for further commands.  Save the response
		var response = nlapiRequestURL(url, null, null );
		// Convert the response to an XML response for parsing
		try {
			responseXML = nlapiStringToXML( response.getBody() );
		}
		catch (err) {
			nlapiLogExecution('Debug', 'getPardotAuthentication', 'Pardot Authentication Failed. ' + err.toString());
		}
		// Select the value of the api_key from the XML response
		api_key = nlapiSelectValue( responseXML, '//api_key' );
		// As long as there is an api_key, create the authentication string and return it to be appended on the url command
		if (api_key) {
			var authenticationString =  'user_key=' + user_key + '&api_key=' + api_key ;
			nlapiLogExecution( 'Debug', 'getPardotAuthentication', 'Pardot Authentication Successful');
			return authenticationString;
		}
		else {
			nlapiLogExecution( 'Debug', 'getPardotAuthentication', 'Pardot Authentication Failed');
			return false;
		}
}
/**
 * hasHardBounce checks to see if the specifeid prospect has had a hard bounce email by Pardot. Checking for valid email address
 * @param  {string}  prospectID        Pardot propect ID
 * @param  {string}  authenticationStr [optional] Pardot authentication string with the following format: 'user_key=' + user_key + '&api_key=' + api_key
 * @return {Boolean}
 */
function hasHardBounce(prospectID, authenticationStr) {
	// authenticationStr - optionalal - provide if you already have it.

	if (typeof authenticationStr == 'undefined') {
		// getPardotAuthentication is a custom function that must be included
		try {
			authenticationStr = getPardotAuthentication();
		}
		catch (err) {
			nlapiLogExecution('Debug','hasHardBounce', 'Error authenticating Pardot - cannot determine if prospect has hard bounce');
			return false;
		}
		if (!authenticationStr) {
			nlapiLogExecution('Debug','hasHardBounce', 'Could not get authentication, exiting function');
			throw "Pardot authentication failed.  Could not determine if there was a hard bounce.";
		}
	}
	// create two json objects for both the criteria and the desired results to be passed to the generalized pardotQuery function
	var myCriteria = { prospect_id : prospectID, type : 13};  // type = 13 is a hardbounce for a visitorActivity
	var myResults = { total_results : 0};
	myResults = pardotQuery(authenticationStr, 'visitorActivity', myCriteria, myResults);
	nlapiLogExecution('Debug','hasHardBounce', 'myResults.total_results -> ' + ( parseInt(myResults.total_results, 10) > 0 ) );
	return (parseInt(myResults.total_results, 10) > 0);
}
/**
 * [pardotQuery description]
 * @param  {string} authenticationStr [this is an authentication string with the following format: 'user_key=' + user_key + '&api_key=' + api_key]
 * @param  {string} recordType        [Pardot recordType: Prospects, Users, Visits, Opportunities, Visitors, Lists, Visitor Activities, Prospect Accounts]
 * @param  {object} criteriaSetObj    [json object with the disired criteria for the query. Ex. { prospect_id : 98888158, type : 13}]
 * @param  {object} resultColumnsObj  [json object with a list of your desired results. Ex. { 'total_results':null , 'visitor_activity/id':null }]
 * @return {object}                   [Will either return a json object of results if criteria were specified or XML data otherwise]
 */
function pardotQuery(authenticationStr, recordType, criteriaSetObj, resultColumnsObj) {
	var queryURL = 'https://pi.pardot.com/api/' + recordType + '/version/3/do/query?' + authenticationStr ;
	
	// iterate all the values in the criteriaSetObj json argument
	for (var thisCriteria in criteriaSetObj) {
		
		// check to make sure that the object in the criteriaSetObj was a property
		if (criteriaSetObj.hasOwnProperty(thisCriteria)) {
			nlapiLogExecution('Debug', 'pardotQuery', 'recordType = ' + recordType + ', ' + thisCriteria + ' -> ' + criteriaSetObj[thisCriteria]);
			
			// appending on the criteria names and values to our url
			queryURL += '&' + thisCriteria + '=' + criteriaSetObj[thisCriteria];
		}
	}
	nlapiLogExecution('Debug', 'pardotQuery', 'queryURL -> ' + queryURL);
	
	// Netsuite command to send a request to a website
	var response = nlapiRequestURL(queryURL, null, null );
	
	// Netsuite command to convert the body of the response to XML
	var responseXML = nlapiStringToXML( response.getBody() );
	
	// Check if specific results were requested
	if (typeof resultColumnsObj == 'object') {
		// iterate all of the requested results
		for (var thisResult in resultColumnsObj) {
			// use the Netsuite command to select an XML value by an xpath
			resultColumnsObj[thisResult] = nlapiSelectValue( responseXML, '//' + thisResult );
			nlapiLogExecution('Debug', 'pardotQuery', thisResult + ' -> ' + resultColumnsObj[thisResult]);
		}
		// returning the resultColumnsObj json object with the results
		return resultColumnsObj;
	}
	else {
		nlapiLogExecution('Debug', 'pardotQuery', 'No specific results requested, returning the entire XMLResponse');
		return responseXML;
	}
}
// TBD - Add code to rename companies that are named:  'ONLINE345' to a company name if we have one.
// TBD - replace sales team of Robert Gama with Outside sales rep
// TBD - check for hard bounce
// TBD - fix search for partial company name returning too many records
// TBD - go over test scenarios on viso diagram
// TBD - properly document script
// TBD - create spreadsheet / XML document for product associations
// TBD Vacation - inside rep
// -auto-responder email from Netsuite.