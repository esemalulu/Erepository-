/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Aug 2016     mburstein
 *
 * This API will return the result from Amber Road Restricted Party Screening for the provided company information.  The formatting of the company object is important, hence the object constructor method.
 * The results will be returned as one of the following, to coincide with the List: Denied Party Status (customlistr7rps_status):
 * 		1 = Flagged
 *  	2 = Cleared
 *  	3 = Error
 * 
 * MB: 9/14/16 - Chris Crane created a separate org in Amber Road for LRP.  Added logic to switch to handle the new RAPID7_LRP orgcode.  Other records will go to RAPID7_TRX.
 */
// username = XML_INT_RAPID7

// Results of Amber Road service call 
var AR_FLAGGED = 1;
var AR_CLEARED = 2;
var AR_ERROR = 3;

/**
 * Format company inputs into an Amber Road screening ready object
 * @method amberRoadObject
 * @param {String} recTypeId - The ID of the record type we are using to check denied party status
 * @param {Integer} recId - The ID of the record that will be used for as the Partner ID in Amber Road (unique identifier)
 * @param {String} companyName - Name of the company being screened
 * @param {String} contactName - Name of the contact being screened
 * @param {String} secondaryContactName - Additional contact name to be screened
 * @param {String} address1 -  Main address to be screened
 * @param {String} address2 -  Optional additional address line
 * @param {String} address3 -  Optional additional address line
 * @param {String} city - City of company to be included in screen
 * @param {String} stateCode - State code of company to be included in screen
 * @param {String} stateName - State name of company to be included in screen
 * @param {String} postalCode -	Postal/Zip code of company to be included in screen
 * @param {String} countryCode - Country code of company to be included in screen
 * @param {String} countryName - Country name of company to be included in screen
 * @throws {Error} if record type or ID not provided
 * @return {Object} Returns amberRoadObject 
 */
function amberRoadObject(recTypeId,recId,companyName,contactName,secondaryContactName,address1,address2,address3,city,stateCode,stateName,postalCode,countryCode,countryName){
	
	// If recTypeId empty then?
	if(!recTypeId || !recId || !companyName){
		throw nlapiCreateError('RECORD ERROR', 'The record type ID, Record ID, or Company Name was not specified when attempting to create an Amber Road Object', true);
	}
	else{
		var partnerIdPrefix = '';
		// MB: 9/14/16 - Chris Crane created a separate org in Amber Road for LRP.  Added logic to switch to handle the new RAPID7_LRP orgcode.  Other records will go to RAPID7_TRX.
		var orgCode = '';
		// Add PartnerID prefix depnding on recTypeId
		switch (recTypeId){
			case 'customrecordr7licreqprocessing': // LRP record
				partnerIdPrefix = 'LRP_';
				orgCode = 'RAPID7_LRP';
				break;
			case 'partner': // Partner Record
				partnerIdPrefix = 'PRT_';
				orgCode = 'RAPID7_TRX';
				break;
			default: // Else default to a company record (no prefix)
				orgCode = 'RAPID7_TRX';
				break;
		}
		
		// Use Conditional (Ternary) operators to check for blank arguments and return empty strings
		this.PartnerID = partnerIdPrefix+recId; // Required field for Amber Road  // MB: 7/19/16 - add prefix for recTypeId
		this.Name = encodeHtmlEntities(companyName); // Required field for Amber Road 
		this.ContactName = contactName ? encodeHtmlEntities(contactName) : '';
		this.SecondaryContactName = secondaryContactName ? encodeHtmlEntities(secondaryContactName) : '';
		this.Address1 = address1 ? encodeHtmlEntities(address1.replace(/\n/g,"")) : ''; // Remove Line Returns
		this.Address2 = address2 ? encodeHtmlEntities(address2.replace(/\n/g,"")) : '';
		this.Address3 = address3 ? encodeHtmlEntities(address3.replace(/\n/g,"")) : '';
		this.City = city ? city : '';
		this.StateCode = stateCode ? stateCode.substring(0, 5) : ''; // 5 char max, will throw error if more
		this.StateName = stateName ? encodeHtmlEntities(stateName) : '';
		this.PostalCode = postalCode ? postalCode : '';
		this.CountryCode = countryCode ? countryCode.substring(0, 2) : ''; // 2 char max, will throw error if more
		this.CountryName = countryName ? countryName : '';
		
		// Hardcoded Values - These values are always the same for RPS screening
		this.OrgCode = orgCode; // Required field for Amber Road 
		this.PersistPartner = 'Y';	
		this.SkipNewRPL = 'N';
		this.ReturnFullPartnerInformation = 'Y';
		this.ReturnFullMatchDetail = 'Y';	
		this.ForceReScreen = 'N';
		this.IMOVesselNumber = '';
		
		// Make all null arguments blank strings.
		for (prop in this){
			if(this[prop] == null){
				this[prop] = '';
			}
		}
		
		// Add method for screening company to the Amber Road object
		this.screenCompany = sendCompanyToAmberRoad;
	}	
}
/*
 * Testing block for use with NS Script Debugger
 * 
 * var objAR = new amberRoadObject('customer',112860563,'MB TEST TIME','Michael Burstein','Derek Zanga','24243 Martha St','','','Woodland Hills','CA','California','91367','USA','United States');

var test = sendCompanyToAmberRoad(objAR);
var x =0;
*/
/**
 * Send company data via XML to Amber Road for Restricted Party Screening.  
 * @method sendCompanyToAmberRoad
 * @param {Object} companyObject - object containing necessary company info for Amber Road screening
 * @throws {Error} if partner Id (recId) is not provided Amber Road will respond with an Error.
 * @return {Integer} The results will be returned as one of the following, to coincide with the List: Denied Party Status (customlistr7rps_status):
 * 		1 = Flagged
 *  	2 = Cleared
 *  	3 = Error
 */
function sendCompanyToAmberRoad(){
	nlapiLogExecution('AUDIT','Screening Company','Name: '+this.Name+' \n ID: '+this.PartnerID)
	try {
		var amberRoadXML = createAmberRoadXML(this);
		if(!amberRoadXML){
			throw nlapiCreateError('XML BLANK', 'Attempt to create Amber Road XML failed', true);
		}
		else{
			var authHeaders = [];
			authHeaders['Content-Type'] = 'text/xml';
			authHeaders['Content-Length'] = amberRoadXML.length;
			
			var req_url = '';
			var context = nlapiGetContext();

			// Username is XML_INT_RAPID7
			// Auth = Basic<Space><Base 64 Encode(UserName:Password)>
			if (context.getEnvironment() != 'PRODUCTION'){
				// Set the api url and auth for sandbox with script parameters
				req_url = context.getSetting('SCRIPT', 'custscriptr7amberroad_sb_req_url');
				authHeaders['Authorization'] = context.getSetting('SCRIPT', 'custscriptr7amberroad_sb_auth_header');
			} else {
				// Set the api url and auth for production
				req_url = context.getSetting('SCRIPT', 'custscriptr7amberroad_prod_req_url');
				authHeaders['Authorization'] = context.getSetting('SCRIPT', 'custscriptr7amberroad_prod_auth_header');
			}
			
			// Send request to Amber Road
			var response = nlapiRequestURL(req_url, amberRoadXML, authHeaders);
			var responseBody = response.getBody();
			
			// Check for response
			if (!response || !responseBody) {
				nlapiLogExecution('ERROR', 'NULL Response from Amber Road', 'req_url: ' + req_url);
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, adminUser, 'NULL Response from Amber Road', 'req_url: ' + req_url);
				throw nlapiCreateError('NULL RESPONSE', 'NULL Response from Amber Road', true);
			}
			
			// Check valid response code
			if (response.getCode() != 200) {
				nlapiLogExecution('ERROR', 'non 200 Response from Amber Road', 'Code: ' + response.getCode() + '\nresponseBody: ' + responseBody  + '\nreq_url: ' + req_url);
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser,adminUser, 'non 200 response from Amber Road server', 'Code: ' + response.getCode() + '\nresponseBody: ' + responseBody  + '\nreq_url: ' + req_url);
				throw nlapiCreateError('INVALID RESPONSE CODE', 'non 200 response from Amber Road server. Code: ' + response.getCode(), true);
			}
			// Parse result and return Cleared/Flagged based on Amber Road Decision.
			return parseDecision(responseBody);
		}
	} 
	catch (e) {
		nlapiLogExecution("ERROR", 'Error from Amber Road XML Integration', +'\n'+e.name+'\n'+e.message);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser,adminUser, 'error Amber Road RPS attempt','Error: ' + +'\n'+e.name+'\n'+e.message);
		return AR_ERROR; // Return 3 for Error
	}
}

/**
 * Send a formatted company object via XML to Amber Road for Restricted Party Screening
 * @method createAmberRoadXML
 * @param {Object} companyObject - Amber Road formatted object
 * @throws {Error} if partner ID (recId) is not provided Amber Road will respond with an Error.
 * @return {Object} Returns Amber Road XML prepared object.
 */
function createAmberRoadXML(companyObject) {
	var amberRoadString = '<?xml version="1.0" encoding="UTF-8"?>';
	amberRoadString += '<Partner xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="InboundXMLSchema.xsd" ';
	// Loop through object properties and create xml attribute:value pairs
	for(prop in companyObject){
		if(typeof companyObject[prop] != 'function'){ // Exclude functions
			amberRoadString += prop + '="' + companyObject[prop] + '" ';
		}
	}
	amberRoadString += '/>';
	var amberRoadXML = nlapiStringToXML(amberRoadString);
	return amberRoadXML;
}

/**
 * Parse the response from Amber Road and handle error/decision event
 * @method parseDecision
 * @param {String} responseBody - The response body returned from the xml request to Amber Road.
 * @return {Integer} Returns:
 * 		1 = Flagged
 *  	2 = Cleared
 *  	3 = Error
 */
function parseDecision(responseBody){
	var responseXML = nlapiStringToXML(responseBody);
	// The Partner Node holds the "Decision" attribute, which needs to be returned to the initiating function
	var responsePartnerNode = nlapiSelectNode(responseXML, '/Partner');
	// Check for integration errors. The <Error> node is a child of <Partner>
	var responseError = nlapiSelectValue(responsePartnerNode, '/Error');
	if (responseError != null && responseError != ''){
		nlapiLogExecution('ERROR', 'Error in Amber Road response', 'Error: ' + amberRoadError + '\n responseBody: ' + responseBody  + '\n req_url: ' + req_url +'\n'+e.name+'\n'+e.message);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error in Amber Road response', 'Error: ' + amberRoadError + '\n responseBody: ' + responseBody  + '\n req_url: ' + req_url +'\n'+e.name+'\n'+e.message);
		return AR_ERROR; // Error
	}
	
	var decision = nlapiSelectValue(responsePartnerNode, '@Decision');
	nlapiLogExecution('AUDIT', 'Amber Road Decision', decision);
	/*
	 * The screening results indicate whether Partner data that was submitted has any potential matches or not:
	 *  	N 􏰁􏰂no potential matches (Status - Approved) or
	 *  	P 􏰁􏰂has 1-n potential matches against RPL or partner country is in US embargo list (Status - Potential Match) 
	 *  	M 􏰁􏰂has 1-n matches against RPL or partner country is a US embargo and marked as an actual match by your compliance user after review (Status - Match)
	 */	
	if (decision == 'P' || decision == 'M'){
		return AR_FLAGGED; // Flagged
	}
	else if (decision == 'N'){
		// Only return true/approved if decision is N (No Matches)
		return AR_CLEARED; // Cleared
	}
	else{ // If none of the 3 accepted values then return 3 for error
		return AR_ERROR;
	}
}

function encodeHtmlEntities(string){
/*
 * Replace all special characters with the appropriate html entity
 *  - Cannot replace & # ;
 */

	string = string.replace(/\!/g,"&#33;");	// exclamation mark
	string = string.replace(/\"/g,"&#34;");   // quotation mark
	string = string.replace(/\$/g,"&#36;");	// dollar sign
	string = string.replace(/\%/g,"&#37;");	// percent sign
	string = string.replace(/&/g,'&#38;');	// ampersand
	string = string.replace(/\'/g,"&#39;");	// apostrophe
	string = string.replace(/\(/g,"&#40;");	// left parenthesis
	string = string.replace(/\)/g,"&#41;");	// right parenthesis
	string = string.replace(/\*/g,"&#42;");	// asterisk
	string = string.replace(/\+/g,"&#43;");	// plus sign
	string = string.replace(/\,/g,"&#44;");	// comma
	string = string.replace(/\-/g,"&#45;");	// hyphen
	string = string.replace(/\./g,"&#46;");	// period
	string = string.replace(/\:/g,"&#58;");	// colon
	string = string.replace(/\?/g,"&#63;");	// question mark
	return string;
}