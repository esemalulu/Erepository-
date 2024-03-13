/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Nov 2014     efagone
 *
 */

var DNB_PRODUCT_ID = 'DCP_PREM';
var DNB_USERNAME = 'P100000FA1800FEFD194C86890DC5512';
var DNB_PASSWORD_ZONE_ZONE = 'QhRqehy!OHIRA@DaxPQUuRn1Weh1nnkiyX#QHLyfdfTniOdg';

function dnb_authHeaders(){

	//Setting up Headers 
	var authHeaders = [];
	authHeaders['Accept'] = 'application/json';
	authHeaders['Content-Type'] = 'application/json';
	authHeaders['Authorization'] = dnb_getAuthToken();
	
	return authHeaders;
}

function dnb_getAuthToken(){

	//Setting up Headers 
	var authHeaders = [];
	authHeaders['Accept'] = 'application/json';
	authHeaders['Content-Type'] = 'application/json';
	authHeaders['x-dnb-user'] = DNB_USERNAME;
	authHeaders['x-dnb-pwd'] = DNB_PASSWORD_ZONE_ZONE;

	var response = nlapiRequestURL('https://direct.dnb.com/rest/Authentication', null, authHeaders, null, 'POST');
	
	if (response == null || response == '' || (response.getCode() != 200 && response.getCode() != 204)) {
		nlapiLogExecution('ERROR', 'Could not get DnB Token.', 'BAD RESPONSE\nResponse Code: ' + response.getCode() + '\nResponse Body: ' + response.getBody());
		throw nlapiCreateError('PROBLEM', 'Could not get DnB Token. Please contact Administrator.');
	}
	
	var token = response.getHeader('Authorization');
	if (token == 'INVALID CREDENTIALS') {
		nlapiLogExecution('ERROR', 'Could not get DnB Token.', 'INVALID CREDENTIALS');
		throw nlapiCreateError('PROBLEM', 'Could not get DnB Token. Please contact Administrator.');
	}
	return token;
}

function dnb_getDetailedCompanyProfile_order(DUNS){

	var url = 'https://direct.dnb.com/V3.2/organizations/' + DUNS + '/products/' + DNB_PRODUCT_ID;
	nlapiLogExecution('DEBUG', 'dnb_getDetailedCompanyProfile_order', url);
	
	var attemptCount = 0;
	do {
		attemptCount++;
		var response = nlapiRequestURL(url, null, dnb_authHeaders(), null, 'GET');
		
		if (response != null && response != '') {
			var body = response.getBody();
			
			if (body != null && body != '') {
				//nlapiSendEmail(55011, 55011, 'dnb_getDetailedCompanyProfile', 'Attached', null, null, null, nlapiCreateFile('response.txt', 'PLAINTEXT', 'URL: ' + url + '\n\nResponse: ' + body));
				
				var objProfile = JSON.parse(body);
				var OrderProductResponse = objProfile.OrderProductResponse;
				
				switch (OrderProductResponse.TransactionResult.ResultID) {
					case 'CM000':
						//SUCCESS
						return {
							success: true,
							error: '',
							profile_data: objProfile
						};
						break;
					case 'CM003':
						//Reason Code required for Germany.
						nlapiLogExecution('AUDIT', 'RETRYING dnb_getDetailedCompanyProfile_order', OrderProductResponse.TransactionResult.ResultText + '\nDetails: ' + JSON.stringify(objProfile));
						url = 'https://direct.dnb.com/V3.2/organizations/' + DUNS + '/products/' + DNB_PRODUCT_ID + '?OrderReasonCode=6333';
						continue;
						break;
					default:
						nlapiLogExecution('ERROR', 'ERROR on dnb_getDetailedCompanyProfile_order', OrderProductResponse.TransactionResult.ResultText + '\nDetails: ' + JSON.stringify(objProfile));
						return {
							success: false,
							error: 'URL: ' + url + '<br><br>Error: ' + OrderProductResponse.TransactionResult.ResultText + '<br><br>Details: ' + JSON.stringify(objProfile),
							profile_data: null
						};
				}
				
			}
		}
		
		return {
			success: false,
			error: 'URL: ' + url + '<br><br>Error: Null response',
			profile_data: null
		};
		
	} while (attemptCount <= 3);
}

function dnb_getDetailedCompanyProfile_retrieve(DUNS){
  	
	var objProduct = dnb_getDetailedCompanyProfile_order(DUNS);
	var assetId = objProduct.OrderProductResponse.OrderProductResponseDetail.Product.ArchiveDetail.PortfolioAssetID;
	
	var url = 'https://direct.dnb.com/V3.2/assets/' + assetId + '/' + DNB_PRODUCT_ID;
	
	var response = nlapiRequestURL(url, null, dnb_authHeaders(), null, 'GET');
	
	if (response != null && response != '') {
		var body = response.getBody();
		
		if (body != null && body != '') {
			var txtFile = nlapiCreateFile('response.txt', 'PLAINTEXT', body);
			//nlapiSendEmail(55011, 55011, 'dnb_getDetailedCompanyProfile', 'Attached', null, null, null, txtFile);
			return JSON.parse(body);
		}
	}
	
	return false;

}

function dnb_getDUNSMatch(companyName, duns, phone, objCustomerAddress){

	var attemptCount = 0;
	do {
		attemptCount++;
		
		var url = 'https://direct.dnb.com/V4.0/organizations?cleansematch=true';
		
		if (!companyName) { // name and country code are required
			nlapiLogExecution('DEBUG', 'NOT ENOUGH DATA');
			return {
				success: false,
				error: 'URL: ' + url + '<br><br>Error: Missing company name.',
				match_data: null
			};
		}
		
		url += '&CandidateMaximumQuantity=10';
		url += '&SubjectName=' + encodeURI(companyName);
		url += '&CountryISOAlpha2Code=' + encodeURI(objCustomerAddress.country || 'US');
		
		if (duns) 
			url += '&DUNSNumber=' + encodeURI(duns);
		
		if (objCustomerAddress.addr1) 
			url += '&StreetAddressLine-1=' + encodeURI(objCustomerAddress.addr1);
		
		if (objCustomerAddress.addr2) 
			url += '&StreetAddressLine-2=' + encodeURI(objCustomerAddress.addr2);
		
		if (objCustomerAddress.city) 
			url += '&PrimaryTownName=' + encodeURI(objCustomerAddress.city);
		
		if (objCustomerAddress.state) 
			url += '&TerritoryName=' + encodeURI(objCustomerAddress.state);
		
		if (objCustomerAddress.zip) 
			url += '&FullPostalCode=' + encodeURI(objCustomerAddress.zip);
		
		if (phone || objCustomerAddress.phone) 
			url += '&TelephoneNumber=' + encodeURI(phone || objCustomerAddress.phone);
		
		var response = nlapiRequestURL(url, null, dnb_authHeaders(), null, 'GET');
		
		if (isBlank(response) || isBlank(response.getBody())) {
			nlapiLogExecution('ERROR', 'NULL dnb_getDUNSMatch Resonse', 'Match URL: ' + url);
			return {
				success: false,
				error: 'URL: ' + url + '<br><br>Error: NULL response.',
				match_data: null
			};
		}
		
		var objMatch = JSON.parse(response.getBody());
		var GetCleanseMatchResponse = objMatch.GetCleanseMatchResponse;
		nlapiLogExecution('DEBUG', 'Match Response', JSON.stringify(objMatch));
		
		switch (GetCleanseMatchResponse.TransactionResult.ResultID) {
			case 'CM000':
				//SUCCESS
				return {
					success: true,
					error: '',
					match_data: objMatch
				};
				break;
			case 'CM008':
				//No match found for the requested Duns number.
				nlapiLogExecution('AUDIT', 'RETRYING dnb_getDUNSMatch', GetCleanseMatchResponse.TransactionResult.ResultText + '\nDetails: ' + JSON.stringify(objMatch));
				duns = '';
				updateField_always('custentityr7dunsnumber', '');
				continue;
				break;
			default:
				nlapiLogExecution('ERROR', 'ERROR on dnb_getDUNSMatch', GetCleanseMatchResponse.TransactionResult.ResultText + '\nDetails: ' + JSON.stringify(objMatch));
				return {
					success: false,
					error: 'URL: ' + url + '<br><br>Error: ' + GetCleanseMatchResponse.TransactionResult.ResultText + '<br><br>Details: ' + JSON.stringify(objMatch),
					match_data: null
				};
		}
		
	} while (attemptCount <= 3);
	
	return {
		success: false,
		error: 'URL: ' + url + '<br><br>Error: Too many attempts.',
		match_data: null
	};
}

function getAddressFromCustomer(recCustomer){

	if (recCustomer) {
	
		var addressCount = recCustomer.getLineItemCount('addressbook');
		
		if (addressCount > 0) {
		
			// 1) check default shipping
			for (var i = 1; i <= addressCount; i++) {
			
				var defaultShipping = recCustomer.getLineItemValue('addressbook', 'defaultshipping', i);
				if (defaultShipping == 'T') {
					return {
						addr1: recCustomer.getLineItemValue('addressbook', 'addr1', i),
						addr2: recCustomer.getLineItemValue('addressbook', 'addr2', i),
						city: recCustomer.getLineItemValue('addressbook', 'city', i),
						state: recCustomer.getLineItemValue('addressbook', 'state', i),
						zip: recCustomer.getLineItemValue('addressbook', 'zip', i),
						country: recCustomer.getLineItemValue('addressbook', 'country', i),
						phone: recCustomer.getLineItemValue('addressbook', 'phone', i)
					}
				}
			}
			
			// 2) check default billing
			for (var i = 1; i <= addressCount; i++) {
			
				var defaultBilling = recCustomer.getLineItemValue('addressbook', 'defaultbilling', i);
				if (defaultBilling == 'T') {
					return {
						addr1: recCustomer.getLineItemValue('addressbook', 'addr1', i),
						addr2: recCustomer.getLineItemValue('addressbook', 'addr2', i),
						city: recCustomer.getLineItemValue('addressbook', 'city', i),
						state: recCustomer.getLineItemValue('addressbook', 'state', i),
						zip: recCustomer.getLineItemValue('addressbook', 'zip', i),
						country: recCustomer.getLineItemValue('addressbook', 'country', i),
						phone: recCustomer.getLineItemValue('addressbook', 'phone', i)
					}
				}
			}
			
			// 3) just take 1st entry now
			for (var i = 1; i <= addressCount; i++) {
			
				return {
					addr1: recCustomer.getLineItemValue('addressbook', 'addr1', i),
					addr2: recCustomer.getLineItemValue('addressbook', 'addr2', i),
					city: recCustomer.getLineItemValue('addressbook', 'city', i),
					state: recCustomer.getLineItemValue('addressbook', 'state', i),
					zip: recCustomer.getLineItemValue('addressbook', 'zip', i),
					country: recCustomer.getLineItemValue('addressbook', 'country', i),
					phone: recCustomer.getLineItemValue('addressbook', 'phone', i)
				}
			}
		}
	}
	return {};
}

function dnb_searchCompanyBasic(company_keyword){
  
	var url = 'https://direct.dnb.com/V4.0/organizations?SearchModeDescription=Basic&findcompany=true&KeywordText=' + encodeURI(company_keyword);

	var response = nlapiRequestURL(url, null, dnb_authHeaders(), null, 'GET');
	
	if (response != null && response != '') {
		var body = response.getBody();
		
		if (body != null && body != '') {
			var txtFile = nlapiCreateFile('response.txt', 'PLAINTEXT', 'URL: ' + url + '\n\nResponse: ' + body);
			//nlapiSendEmail(55011, 55011, 'dnb_searchCompanyBasic', 'Attached', null, null, null, txtFile);
			return JSON.parse(body);
		}
	}
	
	return false;

}

function getDUNSMatchRequirements(){

	var arrMatchRequirements = [];
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7dunsmatch_minconfidencecodev'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7dunsmatch_minscore_name'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7dunsmatch_minscore_streetnum'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7dunsmatch_minscore_street'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7dunsmatch_minscore_city'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7dunsmatch_minscore_state'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7dunsmatch_minscore_phone'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7dunsmatch_minscore_zip'));
	
	var savedsearch = nlapiCreateSearch('customrecordr7_dunsmatchrequirements', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var i = 0; resultSlice != null && i < resultSlice.length; i++) {
		
			arrMatchRequirements.push({
				id: resultSlice[i].getValue('internalid'),
				confidence: resultSlice[i].getValue('custrecordr7dunsmatch_minconfidencecodev'),
				company_name: resultSlice[i].getValue('custrecordr7dunsmatch_minscore_name'),
				street_number: resultSlice[i].getValue('custrecordr7dunsmatch_minscore_streetnum'),
				street: resultSlice[i].getValue('custrecordr7dunsmatch_minscore_street'),
				city: resultSlice[i].getValue('custrecordr7dunsmatch_minscore_city'),
				state: resultSlice[i].getValue('custrecordr7dunsmatch_minscore_state'),
				phone: resultSlice[i].getValue('custrecordr7dunsmatch_minscore_phone'),
				zipcode: resultSlice[i].getValue('custrecordr7dunsmatch_minscore_zip')
			
			});
			
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return arrMatchRequirements;
	
}
