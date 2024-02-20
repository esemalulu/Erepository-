/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       21 Oct 2019     jeffrb
 *
 */

//Constants
var GD_AB_RECORDTYPE_REGISTRATION = '1';

var GD_AB_OUT_STATUS_PENDING = '1';
var GD_AB_OUT_STATUS_CONNECTIONFAILURE = '2';
var GD_AB_OUT_STATUS_ERROROPEN = '3';
var GD_AB_OUT_STATUS_ERRORCANCELLEDBYUSER = '4';
var GD_AB_OUT_STATUS_COMPLETE = '5';
var GD_AB_OUT_STATUS_PENDINGRETRY = '6';

var AB_OUGOING_SCHEDULED_SCRIPT_NAME_ID = 'customscriptgd_ab_outgoingqueueschedule';

var NETSUITE_LONGTEXT_MAX_LENGTH = 100000;

/**
 * Sends records that are part of the integration to Aimbase.
 * 
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function SendRecordsToAimbaseScheduled(type){
	if (((nlapiGetContext().getEnvironment() == 'SANDBOX' || nlapiGetContext().getEnvironment() == 'BETA') && nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_ab_runoutgoingqueuetestmode') == 'T') || 
			nlapiGetContext().getEnvironment() == 'PRODUCTION'){
		if(IsAnyOutgoingQueueScheduledScriptRunning()) { return; }
		
		if(CanProcessOutgoingQueue())
			ProcessRegistrationToAimbase(GetAimbaseUserAuthenticationToken());
	}
}

/**
 * Sends all registration in the outgoing queue to Aimbase.
 * @param authToken
 */
function ProcessRegistrationToAimbase(authToken){
	var filters = new Array();
	filters.push(new nlobjSearchFilter('custrecordab_queue_status', null, 'anyof', [GD_AB_OUT_STATUS_PENDING, GD_AB_OUT_STATUS_PENDINGRETRY, GD_AB_OUT_STATUS_CONNECTIONFAILURE]));
	filters.push(new nlobjSearchFilter('custrecordab_queue_recordtype', null, 'anyof', GD_AB_RECORDTYPE_REGISTRATION));
	filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
		
	var cols = new Array();
	cols.push(new nlobjSearchColumn('internalid', null, null));
	cols.push(new nlobjSearchColumn('custrecordab_queue_recordid', null, null));
	cols.push(new nlobjSearchColumn('custrecordab_queue_reference', null, null));
	cols.push(new nlobjSearchColumn('custrecordab_queue_recordtype', null, null));
	cols.push(new nlobjSearchColumn('custrecordab_queue_status', null, null));
	cols.push(new nlobjSearchColumn('custrecordab_queue_lastattemptdate', null, null));
	cols.push(new nlobjSearchColumn('custrecordab_queue_lastattemptresult', null, null));
	cols.push(new nlobjSearchColumn('custrecordab_queue_aimbaserecordid', null, null));
	cols.push(new nlobjSearchColumn('custrecordab_queue_isrecorddeleted', null, null));
	cols[0].setSort(); //sort by internal id to make sure that we process queue Sequential
	
	var queueResults = nlapiSearchRecord('customrecordgd_ab_outgoingintegrationque', null, filters, cols) || [];

	// get all contacts in the system so it can be searched on later for sales reps.
	var salesRepResults = '';
	if (queueResults.length > 0)
		salesRepResults = GetSteppedSearchResults('contact', null, [new nlobjSearchColumn('entityid'), (new nlobjSearchColumn('internalid')).setSort()]) || [];
	
	for(var i = 0; i < queueResults.length; i++){
		SendRegistrationQueueToAimbase(authToken, queueResults[i], salesRepResults);  // Process each queue record.
		nlapiGetContext().getRemainingUsage() < 300 ? nlapiYieldScript() : '';  // Yield if necessary
	}
}

/**
 * Send Registration in the queue search result to Aimbase.
 * @param sessionId
 * @param queueResult
 */
function SendRegistrationQueueToAimbase(authToken, queueResult, salesRepResults) {
	try {
		var xmlDocString = '';
		var ebErrorMsg = '';
		
		// Get registration data.
		var filters = new Array();
		filters.push(new nlobjSearchFilter('internalid', 'custrecordunitretailcustomer_unit', 'anyof', queueResult.getValue('custrecordab_queue_recordid')));
		
		var columns = new Array();
		columns.push(new nlobjSearchColumn('custrecordunit_retailpurchaseddate'));
		columns.push(new nlobjSearchColumn('custrecordunit_serialnumber'));
		columns.push(new nlobjSearchColumn('custrecordunit_salesrep'));
		columns.push(new nlobjSearchColumn('name'));
		columns.push(new nlobjSearchColumn('custrecordunit_series'));
		columns.push(new nlobjSearchColumn('entitynumber', 'custrecordunit_dealer'));
		columns.push(new nlobjSearchColumn('entityid', 'custrecordunit_dealer'));
		columns.push(new nlobjSearchColumn('companyname', 'custrecordunit_dealer'));
		columns.push(new nlobjSearchColumn('email', 'custrecordunit_dealer'));
		columns.push(new nlobjSearchColumn('address1', 'custrecordunit_dealer'));
		columns.push(new nlobjSearchColumn('address2', 'custrecordunit_dealer'));
		columns.push(new nlobjSearchColumn('city', 'custrecordunit_dealer'));
		columns.push(new nlobjSearchColumn('state', 'custrecordunit_dealer'));
		columns.push(new nlobjSearchColumn('zipcode', 'custrecordunit_dealer'));
		columns.push(new nlobjSearchColumn('countrycode', 'custrecordunit_dealer'));
		columns.push(new nlobjSearchColumn('phone', 'custrecordunit_dealer'));
		columns.push(new nlobjSearchColumn('fax', 'custrecordunit_dealer'));
		columns.push(new nlobjSearchColumn('salesrep', 'custrecordunit_dealer'));
		
		columns.push(new nlobjSearchColumn('itemid', 'custrecordunit_model'));
		columns.push(new nlobjSearchColumn('custitemrvsmodelyear', 'custrecordunit_model'));
		columns.push(new nlobjSearchColumn('displayname', 'custrecordunit_model'));
		
		columns.push(new nlobjSearchColumn('isinactive', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('internalid', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_firstname', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_lastname', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_title', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_address1', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_address2', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_city', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_country', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_state', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_zipcode', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_phone', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_cellphone', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_email', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_retailsold', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_dealsalesrp', 'custrecordunitretailcustomer_unit'));
		columns.push(new nlobjSearchColumn('custrecordunitretailcustomer_dsalesrp2', 'custrecordunitretailcustomer_unit'));
		
		columns.push(new nlobjSearchColumn('totalamount', 'custrecordunit_salesorder'));
		columns.push(new nlobjSearchColumn('transactionnumber', 'custrecordunit_salesorder'));
		
		columns.push(new nlobjSearchColumn('custrecordgd_aimbasebrandcode', 'custrecordunit_series'));
		
		var unitSearchResults = nlapiSearchRecord('customrecordrvsunit', null, filters, columns);
		
		var unitRetailCustomerState = nlapiLoadRecord('state', unitSearchResults[0].getValue('custrecordunitretailcustomer_state', 'custrecordunitretailcustomer_unit')) || null;
		
		if (unitRetailCustomerState != null){
			
			var salesRep1Name = '';
			var salesRepId = '';
			var salesRep2Name = '';
			var salesRep2Id = '';
			var salesRep1Result = salesRepResults.filter(function(data){return data.getId() == unitSearchResults[0].getValue('custrecordunitretailcustomer_dealsalesrp', 'custrecordunitretailcustomer_unit');}) || [];
			if (salesRep1Result.length > 0) {
				salesRep1Name = salesRep1Result[0].getValue('entityid') || '';
				salesRepId = salesRep1Result[0].getId();
			}
			var salesRep2Result = salesRepResults.filter(function(data){return data.getId() == unitSearchResults[0].getValue('custrecordunitretailcustomer_dsalesrp2', 'custrecordunitretailcustomer_unit');}) || [];
			if (salesRep1Result.length > 0) {
				salesRep2Name =  salesRep1Result[0].getValue('entityid') || '';
				salesRep2Id = salesRep1Result[0].getId();
			}
			
			var registrationInfoJSON = '';			

			registrationInfoJSON = [{
										"IsActive" : true, //(unitSearchResults[0].getValue('isinactive', 'custrecordunitretailcustomer_unit') == 'T' ? true : false),
										"Action" : "A",					//Required
										"SrvyType" : "A",					//Required
										"IsUsed" : "0",
										"PurchaseDate" : (new Date(unitSearchResults[0].getValue('custrecordunitretailcustomer_retailsold', 'custrecordunitretailcustomer_unit'))).toJSON(),					//Required
										"SerialNumber" : unitSearchResults[0].getValue('name'),					//Required
										"Dealer" : {
											"DealerLocation" : "",
											"DealerNumber" : unitSearchResults[0].getValue('entitynumber', 'custrecordunit_dealer'),					//Required
											"Name" : (unitSearchResults[0].getValue('companyname', 'custrecordunit_dealer') || '').replace(/"/g, '\"').replace(/'/g, "\'"),					//Required
											"Contact" : "",
											"Email" : unitSearchResults[0].getValue('email', 'custrecordunit_dealer'),
											"Address1" : (unitSearchResults[0].getValue('address1', 'custrecordunit_dealer') || '').replace(/"/g, '\"').replace(/'/g, "\'"),
											"Address2" : (unitSearchResults[0].getValue('address2', 'custrecordunit_dealer') || '').replace(/"/g, '\"').replace(/'/g, "\'"),
											"City" : (unitSearchResults[0].getValue('city', 'custrecordunit_dealer') || '').replace(/"/g, '\"').replace(/'/g, "\'"),
											"State" : (unitSearchResults[0].getValue('state', 'custrecordunit_dealer') || '').replace(/"/g, '\"').replace(/'/g, "\'"),
											"PostalCode" : unitSearchResults[0].getValue('zipcode', 'custrecordunit_dealer'),
											"CountryCode" : unitSearchResults[0].getValue('countrycode', 'custrecordunit_dealer'),
											"Phone" : unitSearchResults[0].getValue('phone', 'custrecordunit_dealer'),
											"Fax" : unitSearchResults[0].getValue('fax', 'custrecordunit_dealer'),
											"TollFree" : "",
											"District" : "",
											"Customs" : []
										},
										"Product" : {
											"Code" : (unitSearchResults[0].getValue('itemid', 'custrecordunit_model') || '').replace(/"/g, '\"').replace(/'/g, "\'"),					//Required
											"ModelYear" : unitSearchResults[0].getText('custitemrvsmodelyear', 'custrecordunit_model'),
											"ModelName" : unitSearchResults[0].getValue('displayname', 'custrecordunit_model'),
											"PlantCode" : "",
											"Brand" : unitSearchResults[0].getValue('custrecordgd_aimbasebrandcode', 'custrecordunit_series'),
											"Category" : "",
											"Segment" : "",
											"Customs" : [
															{
																"FieldName" : "seriesId",
																"FieldValue" : unitSearchResults[0].getValue('custrecordunit_series')
															}
											]
										},
										"Customer" : {
											"CustNumber" : unitSearchResults[0].getValue('internalid', 'custrecordunitretailcustomer_unit'),
											"FirstName" : (unitSearchResults[0].getValue('custrecordunitretailcustomer_firstname', 'custrecordunitretailcustomer_unit') || '').replace(/"/g, '\"').replace(/'/g, "\'"),					//Required
											"LastName" : (unitSearchResults[0].getValue('custrecordunitretailcustomer_lastname', 'custrecordunitretailcustomer_unit') || '').replace(/"/g, '\"').replace(/'/g, "\'"),					//Required
											"Title" : (unitSearchResults[0].getValue('custrecordunitretailcustomer_title', 'custrecordunitretailcustomer_unit') || '').replace(/"/g, '\"').replace(/'/g, "\'"),
											"Address1" : (unitSearchResults[0].getValue('custrecordunitretailcustomer_address1', 'custrecordunitretailcustomer_unit') || '').replace(/"/g, '\"').replace(/'/g, "\'"),					//Required
											"Address2" : (unitSearchResults[0].getValue('custrecordunitretailcustomer_address2', 'custrecordunitretailcustomer_unit') || '').replace(/"/g, '\"').replace(/'/g, "\'"),					//Required
											"City" : (unitSearchResults[0].getValue('custrecordunitretailcustomer_city', 'custrecordunitretailcustomer_unit') || '').replace(/"/g, '\"').replace(/'/g, "\'"),					//Required
											"State" : unitRetailCustomerState.getFieldValue('shortname') || '',
											"PostalCode" : unitSearchResults[0].getValue('custrecordunitretailcustomer_zipcode', 'custrecordunitretailcustomer_unit'),					//Required
											"CompanyYN" : "N",
											"CompanyName" : "",
											"CompanyTitle" : "",
											"County" : "",
											"CountryCode" : unitRetailCustomerState.getFieldValue('country') || '',					//Required
											"HomePhone" : unitSearchResults[0].getValue('custrecordunitretailcustomer_phone', 'custrecordunitretailcustomer_unit'),					//Required
											"MobilePhone" : unitSearchResults[0].getValue('custrecordunitretailcustomer_cellphone', 'custrecordunitretailcustomer_unit'),					//Required
											"WorkPhone" : "",
											"Fax" : "",
											"Email" : unitSearchResults[0].getValue('custrecordunitretailcustomer_email', 'custrecordunitretailcustomer_unit'),					//Required
											"LanguageCode" : "EN",
											"EmailRefused" : "0"
										},
										"Price" : unitSearchResults[0].getValue('totalamount', 'custrecordunit_salesorder'),
										"PriceCurrency" : "USD",
										"SalesID" : unitSearchResults[0].getValue('transactionnumber', 'custrecordunit_salesorder'),
										"StockNbr" : "",
										"RegistrationTypeCode" : "",
										"RegistrationSourceCode" : "",
										"Customs" : [{
												"FieldName" : "salesRepName",
												"FieldValue" : (unitSearchResults[0].getText('custrecordunit_salesrep') || '').replace(/"/g, '\"').replace(/'/g, "\'")
											}, {
												"FieldName" : "primaryDealerSalesRepName",
												"FieldValue" : (salesRep1Name || '').replace(/"/g, '\"').replace(/'/g, "\'")
											}, {
												"FieldName" : "primaryDealerSalesRepId",
												"FieldValue" : (salesRepId || '').replace(/"/g, '\"').replace(/'/g, "\'")
											}, {
												"FieldName" : "secondaryDealerSalesRepName",
												"FieldValue" : (salesRep2Name || '').replace(/"/g, '\"').replace(/'/g, "\'")
											}, {
												"FieldName" : "secondaryDealerSalesRepId",
												"FieldValue" : (salesRep2Id || '').replace(/"/g, '\"').replace(/'/g, "\'")
											}
										]
									}
								];
			
			//To properly escape characters in the json stringified, the stringified json must be stringified twice and each time, the quotes at the beginning and end of the string 
			var aimbaseResponse = SendRegistrationInfo(authToken, JSON.stringify(registrationInfoJSON));  //Send the request to Aimbase and capture the response.
			var aimbaseResponseJSON = JSON.parse(aimbaseResponse);
			ebErrorMsg = GetAimbaseErrorMessage(aimbaseResponse);  // See if there were any errors, return empty string if it was a success.
			
			var gdRegistrationResponse = SendRegistrationInfoToGDRegistrationSite(JSON.stringify(registrationInfoJSON))
			ebErrorMsg += GetGDSiteErrorMessage(gdRegistrationResponse);
			
			//no errors
			if(ebErrorMsg == '') {
				//no issues adding Tracking number, update queue entry to complete
				UpdateOutgoingQueue(queueResult.getId(), aimbaseResponseJSON.RegistrationResponseRecords[0].Id, null, null);
			}
			// Update queue entry with error message.
			else {
				var error_details = 'The following Aimbase error was encountered:\r\n\r\n' + JSON.stringify(aimbaseResponse) +
									'\r\n\r\n';
				error_details = 'The following GD Site error was encountered:\r\n\r\n' + JSON.stringify(gdRegistrationResponse) +
				'\r\n\r\n';
				UpdateOutgoingQueue(queueResult.getId(), aimbaseResponseJSON.RegistrationResponseRecords[0].Id, new Error(ebErrorMsg), GetLongText(error_details)); //complete queue entry
				return;
			}
		}
	}
	catch(ex) {
		// Try to capture the error details and set it on the queue record.
		var error_details = 'The following error was encountered at "SendRegistrationQueueToAimbase" in "GD_AB_OutgoingQueue_Scheduled.js"\r\n' + GetErrorDescription(ex, true);
		UpdateOutgoingQueue(queueResult.getId(), null, ex, error_details); 
	}
}

/**
 * Generates the User Authentication Token.
 * @returns
 */
function GetAimbaseUserAuthenticationToken(){
	var aimbaseGDSpecificBaseAddress = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_ab_baseaddress');
	var userNamePass = '{' +
			'"Username" : "' + nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_ab_username') + '",' +
			'"Password" : "' + nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_ab_password') + '"' +
			'}';
	
	var authHeaders = new Array();
	authHeaders['Content-Type'] = 'application/json';
	authHeaders['Cache-Control'] = 'no-cache';
	
	var tokenResponse = nlapiRequestURL(aimbaseGDSpecificBaseAddress + '/api/Security/login', userNamePass, authHeaders) || '';
	return tokenResponse.getBody().replace(/"/g, '') || '';		//remove the quotes and only return the token.
}

/**
 * Construct the Request and Send it to Aimbase then return the response.
 * @param authToken
 * @param registrationInfo
 * @returns (String}
 */
function SendRegistrationInfo(authToken, registrationInfo) {
	var aimbaseGDSpecificBaseAddress = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_ab_baseaddress');
	var aimbaseGDSpecificMFGCode = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_ab_mfgcode');

	var headers = new Array();
	headers['Authenticate'] = 'Avala-Api ' + authToken;
	headers['Content-Type'] = 'application/json';
	headers['Cache-Control'] = 'no-cache';
	
	var response = nlapiRequestURL(aimbaseGDSpecificBaseAddress + '/csi/api/registration?manufacturer=' + aimbaseGDSpecificMFGCode, registrationInfo, headers) || '';
    return (response != '' ? response.getBody() : response);
}

/**
 * Construct the request and send it to GD Registration site then return the response.
 * @param jsonData
 */
function SendRegistrationInfoToGDRegistrationSite(jsonData) {
	var gdRegLeaderBoardBaseAddress = nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_leaderboardregbaseaddress') || '';

	if (gdRegLeaderBoardBaseAddress != '') {
		var headers = new Array();
		headers['Content-Type'] = 'application/x-www-form-urlencoded';
		headers['Cache-Control'] = 'no-cache';
		
		var response = nlapiRequestURL(gdRegLeaderBoardBaseAddress, 'data=' + jsonData, headers) || '';
	    return (response != '' ? response.getBody() : response);
	}
	return '{"Result": "Success"}';  // Return success if the leader board base address is not set on the company preference.
}

/***********************
 * Name: CreateAimbaseOutgoingQueueRecord
 * 
 * Description: Adds a record to the Aimbase update Queue (Outgoing Queue).  Checks if the record
 * already exists in the queue and skips it if it's already waiting to be updated.
 * 
 * Use: AfterSubmit of various records.  Called if updates need to be sent to Aimbase
 * 
 * @param {Object} type - Record type to be added from the Queue Record Type list
 * @param {Object} recordId - internalId of the record to be added
 * @param {Object} ref - Reference number for the record (Name, Number, etc)
 * @param {String} isRecordDeleted - Whether or not record is deleted in Netsuite, this is 'T' or 'F' and not true or false
 ************************/
function CreateAimbaseOutgoingQueueRecord(type, recordId, ref, isRecordDeleted){
	// Check if this record is already in the queue waiting to be updated
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('custrecordab_queue_recordtype', null, 'anyof', type);
	filters[filters.length] = new nlobjSearchFilter('custrecordab_queue_recordid', null, 'equalto', recordId);
	
	var cols = new Array();
	cols[0] = new nlobjSearchColumn('internalid');
	cols[cols.length] = new nlobjSearchColumn('custrecordab_queue_recordid');
	cols[cols.length] = new nlobjSearchColumn('custrecordab_queue_reference');
	cols[cols.length] = new nlobjSearchColumn('custrecordab_queue_isrecorddeleted');
	cols[cols.length] = new nlobjSearchColumn('custrecordab_queue_status');
	cols[0].setSort(true);
	
	// search for the custom records with this vendor id
	var queueResults = nlapiSearchRecord('customrecordgd_ab_outgoingintegrationque', null, filters, cols) || [];
	
	if (queueResults.length > 0 && isRecordDeleted == 'T')
		nlapiSubmitField(queueResults[0].getRecordType(), queueResults[0].getId(), ['custrecordab_queue_reference', 'custrecordab_queue_isrecorddeleted', 'custrecordab_queue_status'], [ref, isRecordDeleted, GD_AB_OUT_STATUS_COMPLETE], false);
	
	// if the record is already set to be updated, then exit so it isn't added a second time
	if(queueResults.length > 0 && queueResults[0].getValue('custrecordab_queue_status') != GD_AB_OUT_STATUS_COMPLETE){
		//check to make sure that record ref did not change. 
		//This code could be executing because the ref was changed.
		//We want to make sure that queue has the most recent ref (eg, if unit retail customer was changed)
		if(queueResults[0].getValue('custrecordab_queue_reference') != ref || queueResults[0].getValue('custrecordab_queue_isrecorddeleted') != isRecordDeleted)
			nlapiSubmitField(queueResults[0].getRecordType(), queueResults[0].getId(), ['custrecordeb_queue_reference', 'custrecordeb_queue_isrecorddeleted'], [ref, isRecordDeleted], false);
			
		return;
	}
	
	// if the record is not set to be updated, check if it is complete.
	// if it is complete, we want to set it to pending so that it can be processed.
	// we will also update the reference because it is possible that the reference changed.
	filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('custrecordab_queue_recordtype', null, 'anyof', type);
	filters[filters.length] = new nlobjSearchFilter('custrecordab_queue_recordid', null, 'equalto', recordId);
	filters[filters.length] = new nlobjSearchFilter('custrecordab_queue_status', null, 'anyof', GD_AB_OUT_STATUS_COMPLETE);
	
	cols = new Array();
	cols[0] = new nlobjSearchColumn('internalid');
	cols[cols.length] = new nlobjSearchColumn('custrecordab_queue_recordid');
	cols[cols.length] = new nlobjSearchColumn('custrecordab_queue_reference');
	cols[0].setSort(true);
	
	// search Aimbase Queue for this record with complete status
	queueResults = nlapiSearchRecord('customrecordgd_ab_outgoingintegrationque', null, filters, cols) || [];	
	if(queueResults.length > 0 && isRecordDeleted == 'F'){
		nlapiSubmitField(queueResults[0].getRecordType(), queueResults[0].getId(), ['custrecordab_queue_status', 'custrecordab_queue_reference','custrecordab_queue_isrecorddeleted'], [GD_AB_OUT_STATUS_PENDING, ref, isRecordDeleted], false);
		return;
	} else if (queueResults.length > 0 && isRecordDeleted == 'T')
		return;
	
	// if we get here, it means the record is not in queue. create the new queue entry
	var queueEntry = nlapiCreateRecord('customrecordgd_ab_outgoingintegrationque');
	queueEntry.setFieldValue('custrecordab_queue_recordid', recordId);
	queueEntry.setFieldValue('custrecordab_queue_recordtype', type);
	queueEntry.setFieldValue('custrecordab_queue_status', GD_AB_OUT_STATUS_PENDING);
	queueEntry.setFieldValue('custrecordab_queue_reference', ref);
	queueEntry.setFieldValue('custrecordab_queue_isrecorddeleted', isRecordDeleted);
	nlapiSubmitRecord(queueEntry);	
}

/**
 * Updates Aimbase Integration record with the specified error.
 * @param outgoingQueueId
 * @param abRecordId
 * @param errorObj
 * @param detailErrorMsg
 */
function UpdateOutgoingQueue(outgoingQueueId, abRecordId,  errorObj, detailErrorMsg)
{
	var hasError = (trim(detailErrorMsg) != '' || errorObj != null); //either errorMsgWithDebugInfo or errorObj is specified
	var errorCode = GetErrorCode(errorObj);
	var errorMsg = GetErrorDescription(errorObj, false);
	var errorDetails = (errorCode == '' ? 'Error Code: N/A\r\n\r\n' + detailErrorMsg : 'Error Code: ' + errorCode + '\r\n\r\n' + detailErrorMsg);
	if(trim(detailErrorMsg) == '')
		errorDetails = (errorCode == '' ? 'Error Code: N/A\r\n\r\n' + GetErrorDescription(errorObj, true) : 'Error Code: ' + errorCode + '\r\n\r\n' + GetErrorDescription(errorObj, true));
	
	if(hasError){
		//Update queue with open error failed.
		var fieldsToUpdate = ['custrecordab_queue_status','custrecordab_queue_errormsg','custrecordab_queue_errorlog','custrecordab_queue_lastattemptdate', 'custrecordab_queue_lastattemptresult'];
		var fieldsToUpdateValues = [GD_AB_OUT_STATUS_ERROROPEN, errorMsg, errorDetails, getTodaysDate(true), GD_AB_OUT_STATUS_ERROROPEN];
		nlapiSubmitField('customrecordgd_ab_outgoingintegrationque', outgoingQueueId, fieldsToUpdate, fieldsToUpdateValues, false);
	} else{		//no errors, mark queue completed
		var fieldsToUpdate = ['custrecordab_queue_status','custrecordab_queue_errormsg','custrecordab_queue_errorlog','custrecordab_queue_lastattemptdate', 'custrecordab_queue_lastattemptresult', 'custrecordab_queue_aimbaserecordid'];
		var fieldsToUpdateValues = [GD_AB_OUT_STATUS_COMPLETE, '', '', getTodaysDate(true), GD_AB_OUT_STATUS_COMPLETE, abRecordId];
		nlapiSubmitField('customrecordgd_ab_outgoingintegrationque', outgoingQueueId, fieldsToUpdate, fieldsToUpdateValues, false);	
	}
	
}

/**
 * Returns whether or not Integration is allowed to process Outgoing Queue entries.
 * @returns {Boolean}
 */
function CanProcessOutgoingQueue(){
	return nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_ab_processoutgoingqueue') == 'T' ? true : false;
}

/**
 * Returns whether or not Integration is allowed to add records in Outgoing Queue.
 * (i.e, Queue that stores records to be sent to Aimbase from Netsuite)
 * @returns {Boolean}
 */
function CanAddRecordsInOutgoingQueue(){
	return nlapiGetContext().getSetting('SCRIPT', 'custscriptgd_ab_addrecrdstooutgoingqueue') == 'T' ? true : false;
}

/**
 * Check if any of the outgoing queue scheduled scripts is running.
 * @returns {Boolean} - return true or false
 */
function IsAnyOutgoingQueueScheduledScriptRunning(){
	var cols = new Array();
	cols.push(new nlobjSearchColumn('status', null, null));
		
	var filters = [
					 ["status","noneof",['COMPLETE', 'CANCELED', 'FAILED']],
					 	"AND",
					 ["script.scriptid","is", AB_OUGOING_SCHEDULED_SCRIPT_NAME_ID]
				  ];
	
	//Search for any instances of the specified scheduled script whose status is not Complete, Cancelled, or Failed.
	//If there is any results, scheduled script is running.
	var runningScriptInstanceResults = nlapiSearchRecord('scheduledscriptinstance', null, filters, cols) || [];
	
	//Store whether or not this method is executed within a scheduled script context.
	var isScheduledScriptContext = (nlapiGetContext().getExecutionContext() == 'scheduled');
	
	//Store whether or not to check if multiple instances of the scheduled script are running.
	//If the code is executed in a scheduled script context, we need to check if the scheduled script is one of the outgoing queue.
	//If it is, then we know there is at least one instance (the current instance executing this function) running, 
	//so we need to check if there is another instance running.
	var checkMultipleInstances = false;
	if(isScheduledScriptContext){
		var currentScriptNameId = nlapiGetContext().getScriptId().toLowerCase();
		checkMultipleInstances = (currentScriptNameId == AB_OUGOING_SCHEDULED_SCRIPT_NAME_ID);
	}
		
	
	if(checkMultipleInstances)
		return runningScriptInstanceResults.length > 1;
	else
		return runningScriptInstanceResults.length > 0;
}

/**
 * Gets Aimbase error message from Aimbase response if it exist.
 * @param response
 * @returns {String}
 */
function GetAimbaseErrorMessage(response){
	var ebErrorMsg = '';	
	if(trim(response) != ''){
		try{
			var responseJSON = JSON.parse(response);
			if (responseJSON.RegistrationResponseRecords[0].Status == 'Success')
				ebErrorMsg = '';
			else
				ebErrorMsg = 'Status: ' + responseJSON.RegistrationResponseRecords[0].Status + '\n\nMessage: ' + responseJSON.RegistrationResponseRecords[0].StatusMessage;
		}
		catch(err){
			ebErrorMsg = 'Could not retrieve Aimbase error message from the response.';
		}
	}
	
	return ebErrorMsg;
}

/**
 * Gets GD site error message from the response if it exist.
 * @param response
 * @returns {String}
 */
function GetGDSiteErrorMessage(response){
	var gdErrorMsg = '';	
	if(trim(response) != ''){
		try{
			var responseJSON = JSON.parse(response);
			if (responseJSON.Result == 'Success')
				gdErrorMsg = '';
			else
				gdErrorMsg = 'Result: ' + responseJSON.Result + '\n\nMessage: ' + responseJSON.Message;
		}
		catch(err){
			gdErrorMsg = 'Could not retrieve GD Site error message from the response.';
		}
	}
	
	return gdErrorMsg;
}

/**
 * Returns error description given error object.
 * @param {Object} errorObj
 */
function GetErrorDescription(errorObj, includeStackTrace){
	var errorMessage = '';
	try{
		//If this is not a NetSuite error, getDetails will throw an exception. Handle it in catch err2
		errorMessage = errorObj.getDetails(); 		
		try{
			if(includeStackTrace)
				errorMessage = errorObj.getCode() + '\r\n' + errorObj.getDetails() + '\r\n' + errorObj.getStackTrace();
		} 
		catch (err3){		//It failed to get the code or StackTrace of the error, just use error details.
			errorMessage = errorObj.getDetails(); 
		}
	} catch (err2){
		// if it is not a NetSuite error, then getCode() will not work an exception is thrown
		// this means that the error was some other kind of error
		try{
			if(includeStackTrace){		//include stack trace, get as mush details as we can.
				if(errorObj.description != undefined && errorObj.description != null)
					errorMessage += errorObj.description + '\r\n';	
				if(errorObj.message != undefined && errorObj.message != null)
					errorMessage += errorObj.message + '\r\n';
				if(errorObj.name != undefined && errorObj.name != null)
					errorMessage += errorObj.name + '\r\n';			
			}
			else{	//no stack trace, just find the message.
				if(errorObj.description != undefined && errorObj.description != null)
					errorMessage = errorObj.description + '\r\n';	
				else if(errorObj.message != undefined && errorObj.message != null)
					errorMessage = errorObj.message + '\r\n';
				else if(errorObj.name != undefined && errorObj.name != null)
					errorMessage = errorObj.name + '\r\n';					
			}		
		} 
		catch (err3){
			errorMessage = "Unknown error.";
		}
	}
	
	if(errorObj != null)
		errorMessage += '\n\n' + JSON.stringify(errorObj);
	
	return errorMessage;
}

/**
 * Gets NS error code from the error object.
 * @param errorObj
 * @returns {String}
 */
function GetErrorCode(errorObj){
	var errorCode = '';
	try{
		if(errorObj != null)
			errorCode = errorObj.getCode();
	}
	catch(ex){
		//Ignore any error if error object does not have getCode. This means it is not a NS error.
	}
	
	return errorCode;
}

/**
 * Trims specified string and return the result.
 * @param {string} sString left and right trims specified string.
 * @return {string} Returns trimmed string.
 */
function trim(sString) 
{ 
	if(sString != undefined && sString != null)
	{
		if(typeof sString == 'object')
			sString = JSON.stringify(sString);
		while (sString.substring(0,1) == ' ') 
		{ 
			sString = sString.substring(1, sString.length); 
		} 
		while (sString.substring(sString.length-1, sString.length) == ' ') 
		{ 
			sString = sString.substring(0,sString.length-1); 
		} 
		return sString; 	
	}
	else
		return '';

}

/**
 * Returns today's date formatted as m/d/yyyy or m/d/yyyy hh:mm:ss if includeTime is true.
 */
function getTodaysDate(includeTime){
	return getUSDateFormat(new Date(), includeTime);
}

/**
 * Gets United States date format from the date object.
 * @param date: Actual date object
 * @param includeTime
 * @returns {String}
 */
function getUSDateFormat(date, includeTime){
	var dd = date.getDate();
	var mm = date.getMonth() + 1;
	var yyyy = date.getFullYear();
	
	if(dd < 10) { dd = '0' + dd; }
	if(mm < 10) { mm = '0' + mm; }
	var displayDate = mm + '/' + dd + '/' + yyyy;
	
	if(includeTime){
	   var hour   = date.getHours();
	   var minute = date.getMinutes();
	   var second = date.getSeconds();
	   var ap = "AM";
	   
	   if (hour   > 11) { ap = "PM"; }
	   if (hour   > 12) { hour = hour - 12;}
	   if (hour   == 0) { hour = 12; }
	   if (hour   < 10) { hour   = "0" + hour; }
	   if (minute < 10) { minute = "0" + minute;}
	   if (second < 10) { second = "0" + second;}
	   
	   displayDate += ' ' + hour + ':' + minute + ':' +second + " " + ap;
	}
	
	return displayDate;
}

/**
 * Gets text that fits in Long Text field for Netsuite.
 * The maximum chars is 100000. So, if input is more than max, it will be truncated.
 * @param input
 */
function GetLongText(input){
	if(input != null && input.length > NETSUITE_LONGTEXT_MAX_LENGTH){
		return input.substring(0, NETSUITE_LONGTEXT_MAX_LENGTH);
	}
	
	return input;
}