/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Sep 2012     mburstein
 * 2.00		  14 Jun 2013	  mburstein		   Script cleanup, added check LRP functions, modified.  Modified the function to return lastContact instead of a license count
 * 3.00	      2	 Jan 2015
 * 
 * MB: 1/2/15 - LRP has been updated and queues up product key.  No longer able to search key in real time.  
 * Updating monitoring to attempt to create license insteal of look for key after submitting form.
 * MB: 3/21/15 - Change some comments and made Random String generate 8 char instead of 4.  Also, wrapped submitLicenseForm function in try/catch.  Removed Mobilisafe stuff
 * 	
 * @class checkLastUpdate
 * @param{arrayTo} array of receiving phone numbers
 * @param{body} body text for SMS message
 * @param{cookie} cookie for SMS conversation tracking
 * returns{Object} smsId
 */

function checkLastUpdate(acrId){
	
	/**
	 * lastContact is the minimum Last Contact Timestamp if there is an issue with updates. It's 0 when everything is functioning properly
	 * @property lastContact
	 */
	var lastContact = 0;
	
	// Build multi-dimensional object to hold searchType and searchId based on acrId
	var searchIndex = {
		// Nexpose acrId
		1 : {
			// Use Search SCRIPT - Check Last NX Update  id=14170 'customrecordr7nexposelicensing record'
			searchType : 'customrecordr7nexposelicensing',
			searchId   : 14146,
		},
		// Metasploit acrId
		2 : {
			// Use Search SCRIPT - Check Last MS Update id=12669 'customrecordr7metasploitlicensing record'
			searchType : 'customrecordr7metasploitlicensing',
			searchId   : 12669,
		}
	};
	
	var results = nlapiSearchRecord(searchIndex[acrId][searchType], searchIndex[acrId][searchId]);	
	
	if (results != null) {
		var columns = results[0].getAllColumns();
		lastContact = results[0].getValue(columns[0]);	
	}
	return lastContact;
}
/**
 * @method checkRecentLRP
 * @return {Object} objIssuesLRP
 */
function checkRecentLRP(){
	// Use Search SCRIPT - Check LRP Delay  id=14138 'License Request Processing' record
	var recentLRP = nlapiSearchRecord('customrecordr7licreqprocessing', 14138);
	/**
	 * This object's length is the number of alerts to send. Key = acrId.  Value = object of issue details.
	 * @property {Object} objIssuesLRP 
	 */
	var objIssuesLRP = new Object();
	
	for (var i = 0; recentLRP != null && i < recentLRP.length; i++) {
		var result = recentLRP[i];
		var columns = result.getAllColumns();
		
		var acrId = result.getValue(columns[3]);
		var objLRPIssueDetails = new Object();
		objIssuesLRP[acrId] = objLRPIssueDetails;
		objLRPIssueDetails.product = result.getText(columns[3]);
		objLRPIssueDetails.id = result.getValue(columns[0]);
		objLRPIssueDetails.requested = result.getValue(columns[1]);
		objLRPIssueDetails.count = result.getValue(columns[2]);
	}
	return objIssuesLRP;
}

function subimtLicenseForm(object,acrId){
	// Store Library Script product type for email notifications
	nlapiLogExecution('DEBUG','','Call of subimtLicenseForm');


	var productType = arrProductTypes[acrId]['name'];
	var IPRScriptId = arrProductTypes[acrId]['iprscriptid'];
	var IPRDeployId = arrProductTypes[acrId]['iprdeployid'];
	
	// Array for email CCs
	var arrEmailCC = new Array();
	
	// Use Suitelet Script: In Product Registration Suitelet
	
	// get random string to ensure unique customer record
	var randomString = getRandomString(8);
	r7Contact.companyname += randomString;
	
	var suiteletURL = nlapiResolveURL('SUITELET', IPRScriptId, IPRDeployId, true);
	// Build postdata object from r7Contact parameters
	var postdata = new Object();
	for (prop in object){
		postdata['custparam'+prop] = object[prop];
	}
	try {
		var response = null;
                
		try {
			response = nlapiRequestURL(suiteletURL,postdata);
		} catch(err) {
			if (response != null) {
				nlapiLogExecution('ERROR','Error while submitting data for LRP','Response code:  ' + response.getCode() + '. Response error: ' + response.getError());
			}
			nlapiLogExecution('ERROR','Error while submitting data for LRP','Error while submitting data for LRP to ' + suiteletURL + '. ' + err);
			licenseMonitoringReport(productType,r7Contact,'submitIprFail',arrEmailCC,err, 'Error while submitting data for LRP to ' + suiteletURL);
			return;
		}
		nlapiLogExecution('DEBUG','Resulting response','Response code:  ' + response.getCode() + '. Response body: ' + response.getBody());
		var responseCode = response.getCode();

		// If response page is correct then go check for license email, if not then go to auto create
		// response 302 is success, 200 means missing parameter?? (actually Mobilisafe returns 200..)
		/* MB: 1/2/15 - LRP has been updated and queues up product key.  No longer able to search key in real time
		 *  Updating monitoring to attempt to create license instead of look for key after submitting form.
		 */		
		if (responseCode == 302 || responseCode == 200) { // create lead, contact, license from scratch
			
			//Setting lead record fields
			var customerRecordFields = new Array();
			customerRecordFields['companyname'] = r7Contact.companyname;
			customerRecordFields['country'] = r7Contact.country;
			customerRecordFields['state'] = r7Contact.state;
			customerRecordFields['email'] = r7Contact.email;
			customerRecordFields['phone'] = r7Contact.phone;
			customerRecordFields['leadsource'] = r7Contact.leadsource;		
			customerRecordFields['custentityr7territoryassignmentflag'] = 'F';
			// Set Subsidiary field to Rapid7 IID=1
			customerRecordFields['subsidiary'] = 1;
			
			//Creating new lead record
			var customerIid = createNewCustomerRecord(customerRecordFields);
			if (customerIid == null) {
				nlapiLogExecution('ERROR',productType+' - Could not create customer record', 'problem');
				// Send Email to NS team
				licenseMonitoringReport(productType,r7Contact,'customerFail',arrEmailCC,err);
				return;
			}
			else {
				r7Contact.customerIid = customerIid;
			}
			
			//Setting contact record fields
			var contactRecordFields = new Array();
			contactRecordFields['firstname'] = r7Contact.firstname;
			contactRecordFields['lastname'] = r7Contact.lastname;
			contactRecordFields['title'] = r7Contact.title;
			contactRecordFields['email'] = r7Contact.email;
			contactRecordFields['phone'] = r7Contact.phone;
			contactRecordFields['company'] = customerIid;
			contactRecordFields['custentityr7leadsourcecontact'] = r7Contact.leadsource;
			
			//Creating new contact record
			var contactIid = createNewContactRecord(contactRecordFields);
			if (contactIid == null) {
				nlapiLogExecution('ERROR', productType+'Could not create contact record', 'problem');
				// Send Email to NS team
				licenseMonitoringReport(productType,r7Contact,'contactFail',arrEmailCC,err);
				return;
			}
			else {
				r7Contact.contactIid = contactIid;
			}
			
			//Setting License Record Fields
			var licenseFields = new Array();
			var product = getTemplateIdForAXSCode(r7Contact.productaxscode,acrId);
			var markTempRecId = arrProductTypes[acrId]['marktemprecid'];
			var templateRecord = nlapiLoadRecord(markTempRecId, product);
			licenseFields[markTempRecId] = product;
			licenseFields['iidForTemplate'] = templateRecord.getFieldValue(arrProductTypes[acrId]['marklictemprecid']);
			licenseFields['customer'] = customerIid;
			licenseFields['contact'] = contactIid;
			licenseFields['duration'] = templateRecord.getFieldValue(arrProductTypes[acrId]['expindaysid']); //trial license days
			licenseFields['salesrep'] = '';
			licenseFields['salesorder'] = '';
			licenseFields['opportunity'] = '';

			var activationKeyFieldId = arrProductTypes[acrId]['activationid'];
			var newLicenseFields = createNewLicense(licenseFields,acrId);
			if (newLicenseFields[activationKeyFieldId] == null || newLicenseFields[activationKeyFieldId] == '') {
				nlapiLogExecution('ERROR', 'Could not create '+productType+' license record', 'problem');
				// Add IT to email CC
				arrEmailCC.push('nagios_alerts@rapid7.com');
				licenseMonitoringReport(productType,r7Contact,'licenseFail',arrEmailCC,err);
				return;
			}
		}	
		// If IPR form not Successful
		else {
			nlapiLogExecution('ERROR','Could not request' +productType+' IPR form: ','IPR Form Response Code = '+responseCode);
			licenseMonitoringReport(productType,r7Contact,'iprFail',arrEmailCC,null,'IPR Form Response Code = '+responseCode);
		}
	} catch (e) {
		nlapiLogExecution('ERROR','Could not request' +productType+' IPR form: ',e);
		licenseMonitoringReport(productType,r7Contact,'iprFail',arrEmailCC,e);
	}
	return;
}

function createNewCustomerRecord(fields) {
 
    nlapiLogExecution('DEBUG', 'createNewCustomerRecord', fields['companyname']); // Record new customer name, so it will allow us to see if it was already created before Error might occur
	
    var noOfCompaniesWithSameName = getNoOfCompaniesWithSameName(fields['companyname'], 'lead');
	var newCompanyId = fields['companyname'];

    var record = nlapiCreateRecord('lead');
    for (field in fields) {
        record.setFieldValue(field, fields[field]);
    }

    var randomNo = Math.floor(Math.random() * 1001);
	
    if (noOfCompaniesWithSameName != 0) {
		newCompanyId = newCompanyId+ ".dup" + parseInt(noOfCompaniesWithSameName + 1) + "." + randomNo;
        record.setFieldValue('companyname', newCompanyId);
    }

    var id = null;
    try {
        id = nlapiSubmitRecord(record, null, true);
    }
    catch (err) {
        id = err.getInternalId(); //If error was thrown in afterSubmit script
		
        // This code ensures that possible NS bug identified and we are trying to apply workaround
        // Bug shows that even not looking on previous error, record was created
        //
        // IMPORTANT ! Further investigation of this bug required, it shouldn't happen in future
        if (id == null) {
            if (err.getCode() == 'UNIQUE_CUST_ID_REQD') {
                nlapiLogExecution('DEBUG', 'Details. entityid: ' + fields['companyname'], 'UNIQUE_CUST_ID_REQD exception catched. Trying to check that the record exists.');
                logExceptionDetails(err, 'DEBUG');
                id = findRecordByName('companyname' , fields['companyname'], 'lead');
                if (id == null) {
					var dubRec = nlapiCreateRecord('lead');
					for (field in fields) {
						dubRec.setFieldValue(field, fields[field]);
					}

					randomNo = Math.floor(Math.random() * 1001);
					
					newCompanyId = fields['companyname']+ ".dup" + parseInt(noOfCompaniesWithSameName + 1) + "." + randomNo;
					dubRec.setFieldValue('companyname', newCompanyId);

                    try {
                        id = nlapiSubmitRecord(dubRec, null, true);
                    }
                    catch (err2) {
                        nlapiLogExecution('ERROR', 'Details. entityid: ' + record.getFieldValue('companyname'), err2);
                        logExceptionDetails(err2);
                    }
                } 
            }
        }
    }
    return id;
}

function getStackTraceAsString(ex){
	var res = '';
	var stacktrace = ex.getStackTrace();
	var ln = stacktrace.length;
	for(var i = 0; i < ln;i++){
		res += stacktrace[i]+(i<(ln-1)?'<br />':'');
	}
	return res;
}

function getNoOfCompaniesWithSameName(companyName, recordType){

	var searchFilters = new Array(new nlobjSearchFilter('companyname', null, 'is', companyName));
	var searchResults = nlapiSearchRecord((recordType==undefined || recordType==null)?'customer':recordType, null, searchFilters);
	if (searchResults != null) {
		return searchResults.length;
	}
	else {
		return 0;
	}
}

function createNewContactRecord(fields){
	//Creating contact record
	var record = nlapiCreateRecord('contact');
	
	//Setting field values
	for (field in fields) {
		record.setFieldValue(field, fields[field]);
	}
	
	var id = null;
	try {
		id = nlapiSubmitRecord(record);
	} 
	catch (err) {
	
		id = err.getInternalId(); //If error was thrown in afterSubmit script
//		nlapiLogExecution('ERROR', 'Details', err);

        if (id == null) {
            if (err.getCode().indexOf("UNIQUE") >=0) {
                nlapiLogExecution('DEBUG', 'Details. entityid: ' + fields['firstname'], 'UNIQUE_ID_REQD exception catched. Trying to check that the record exists.');
                logExceptionDetails(err, 'DEBUG');
                id = findRecordByName('firstname',fields['firstname'], 'contact');
                if (id == null) {
					var dubRec = nlapiCreateRecord('contact');
					for (field in fields) {
						dubRec.setFieldValue(field, fields[field]);
					}

					var randomNo = Math.floor(Math.random() * 1001);
					
					var newFirstName = fields['firstname']+ "_dup_" + randomNo;
					dubRec.setFieldValue('firstname', newFirstName);

                    try {
                        id = nlapiSubmitRecord(dubRec, null, true);
                    }
                    catch (err2) {
                        nlapiLogExecution('ERROR', 'Details. entityid: ' + record.getFieldValue('firstname'), err2);
                        logExceptionDetails(err2);
                    }
                } 
            }
        }
	}
	
	//Return id if contact was created (even with errors)
	return id;
}

function createNewLicense(fields,acrId){
	var licenseRecId = arrProductTypes[acrId]['recordid'];
	var activationId = arrProductTypes[acrId]['activationid'];
	var expirationId = arrProductTypes[acrId]['expiration'];
	//Creating new Nexpose License record from Template
	var newRecord = nlapiCopyRecord(licenseRecId, fields['iidForTemplate']);
	
	//Computing endDate = today + quantityPurchased*duration
	var daysToBeAdded = parseInt(fields['duration']);
	var computedExpirationDate = nlapiAddDays(new Date(), daysToBeAdded);
	var endDate = nlapiDateToString(computedExpirationDate);
	
	//Null out ProductKey, License Serial No, Product Serial No
	// Null out any necessary fields
	var fieldsToEmpty = arrProductTypes[acrId]['emptyfields'];
	
	if (fieldsToEmpty != null && fieldsToEmpty != '' && fieldsToEmpty != 'undefined') {
		var arrFieldsToEmpty = fieldsToEmpty.split(',');
		for (var i = 0; i < arrFieldsToEmpty.length; i++) {
			newRecord.setFieldValue(arrFieldsToEmpty[i], '');
		}
	}
		
	//Setting End Date	
	newRecord.setFieldValue(expirationId, endDate);
	
	//Setting other miscellaneous fields on the license record
	var customerFieldId = arrProductTypes[acrId]['customer'];
	var contactFieldId = arrProductTypes[acrId]['contact'];
	var marketingTemplateId = arrProductTypes[acrId]['marktemprecid'];
	newRecord.setFieldValue(customerFieldId, fields['customer']);
	newRecord.setFieldValue(contactFieldId, fields['contact']);
	newRecord.setFieldValue(marketingTemplateId, fields[marketingTemplateId]);
		
	var id = null;
	try {
		id = nlapiSubmitRecord(newRecord);
	} 
	catch (err) {
		id = err.getInternalId(); //If error was thrown in afterSubmit script
		nlapiLogExecution('ERROR', 'Details', err);
	}
	
	var newProductKey = null;
	if (id != null) {
		newProductKey = nlapiLookupField(licenseRecId, id, activationId);
	}
	
	fields[activationId] = newProductKey;
	fields['internalid'] = id;
	return fields;
}

function sendErrorEmail(fields,text){
	nlapiLogExecution("ERROR",'Error on',text);
	var fieldListing ="";
	for(field in fields){
		fieldListing += field + ": " + fields[field] + "<br>";
	}	
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	nlapiSendEmail(adminUser,null,
	'Error on License_Monitoring_Sch, License Monitoring Library Script',
	text + "<br>" + fieldListing);
}

function findRecordByName(fieldName, nameValue, recordType) {
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid', null, null);
	 
	var searchFilters = new Array(new nlobjSearchFilter(fieldName, null, 'is', nameValue));
	var searchResults = nlapiSearchRecord(recordType, null, searchFilters, columns);
	if (searchResults != null) {
		return searchResults[0].getValue(columns[0]);
	}
	else {
		return null;
	}
}

function getTemplateIdForAXSCode(accessCode,acrId){
	
	var axcsCodeField = arrProductTypes[acrId]['axscoderecid'];
	var searchRecord = arrProductTypes[acrId]['marktemprecid'];
	var searchFilters = new Array(
	new nlobjSearchFilter(axcsCodeField,null,'is',accessCode)
	);
	var searchResults = nlapiSearchRecord(searchRecord,
	null,
	searchFilters);
	if(searchResults!=null){
		return searchResults[0].getId();
	}
	return null;	
}

function logExceptionDetails(ex, msgType){
    var mType = (msgType==undefined || msgType==null)?'ERROR':msgType;
	nlapiLogExecution(mType, 'Error #(Id): ', ex.getId());
	nlapiLogExecution(mType, 'User Event:  ', ex.getUserEvent());
	nlapiLogExecution(mType, 'Stack trace: ', getStackTraceAsString(ex));
}

/********************************************************************
ADDED BY BSD - self monitoring part
*********************************************************************/

/*********************************************************************
*  Sends self monitoring e-mail to BSD monitoring team
*
*  Things for further improvement - 
*  implement sending of monitoring email every 60 or 30 minutes instead of each script's run
*
*********************************************************************/
function sendSelfMonitorEmail(){
	// Send predefined email message
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
    nlapiSendEmail( adminUser, getMonitoringEmail(), 'License Monitoring Report', 'Script is working', null , null, null ); //to support@bostonsd.com
}

// Get monitoring team's email from script's parameters
function getMonitoringEmail(){
	var monitoringEmail = nlapiGetContext().getSetting('SCRIPT', 'customscript_monitoringemail');
	
	// Use predefined value if parameter does not exists or is not set
	if(isNullOrEmpty(monitoringEmail)){ 
		monitoringEmail = 'support@bostonsd.com';
	}
	return monitoringEmail;
}

// Check if passed value is empty, e.g. it is undefined, null or empty string
function isNullOrEmpty(val){
	return val===undefined || val===null || val===''; // Comparison order - matters
}

/*******************************************************************/
