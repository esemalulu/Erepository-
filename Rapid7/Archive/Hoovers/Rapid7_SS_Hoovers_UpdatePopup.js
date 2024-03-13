//https://usergroup.netsuite.com/users/showthread.php?t=4591
//https://usergroup.netsuite.com/users/showthread.php?t=5940&highlight=anyof+nlapiSearchRecordhttps://usergroup.netsuite.com/users/showthread.php?t=5940&highlight=anyof+nlapiSearchRecord


var	HOOVERS_SERVICE_URL = 'http://dnbdirect-api.dnb.com/DnBAPI-15';
var	HOOVERS_API_KEY = 'rjcrh44v93rhfh25ty56bg64';

function action(request, response) {

	/* Obtaining parameters supplied to suitelet */
	var coName = request.getParameter('custparamcustomername');
	var internalId = request.getParameter('custparaminternalid');
	var recordType = request.getParameter('custparamrecordtype');
	var hitOffset = request.getParameter('custparamhitoffset');
	var resultsPerPage =request.getParameter('custparamresultsperpage');
	
	/* Done obtaining parameters supplied to suitelet */

	nlapiLogExecution('DEBUG','Making Standard Keyword Search Request', 'Yes');
	var soapText = getResults(coName, hitOffset, resultsPerPage);
	
	var soapXML = nlapiStringToXML(soapText);
	
	try{
	var hitNodes = nlapiSelectNodes(soapXML, 'SOAP-ENV:Envelope/SOAP-ENV:Body/sch:FindCompanyByKeywordResponse/sch:return/sch:resultSet/sch:hit');
	}catch(err){
		email = "\n\n\n\n\nSoapRequest:\n" + soapRequest + "\n\n\n\nSoap Response:\n" + soapText; 
		nlapiSendEmail(nlapiGetContext().getUser(), 55011,'Update Company Fail',email);
	}
	//nlapiSendEmail(55011, 55011, 'hitNodes', 'is: ' + soapText);
	var form = nlapiCreateForm('Hoovers', false);
	form.setScript('customscriptr7hooverscsresolve');

	this.allDuns = new Array();

	
	
	/* See which SalesRep owns the company based on Duns# */		
	if(hitNodes!=null && hitNodes.length>=1){	
		for ( var j = 0; j < hitNodes.length; j++) {
			var hitNode = nlapiSelectNode(hitNodes[j], 'sch:companyResults');
			var dunsNo = nlapiSelectValue(hitNode, "sch:duns");
			if (dunsNo!=null && dunsNo.length > 2) {
				allDuns[allDuns.length] = parseInt(dunsNo, 10);
			}
		}
	}
	this.dunsCompany = getAllDunsPresentInNetsuite(allDuns);
	/* See which SalesRep owns the company based on Duns# */
	
	
	/* Set the page fields with parameter values */

		var coNameField = form.addField('custpage_coname', 'text',
				'Company Name', null);
		coNameField.setDefaultValue(coName);
		
		var internalIdField = form.addField('custpage_internalid', 'integer','InternalId', null);
		internalIdField.setDefaultValue(internalId);
		internalIdField.setDisplayType('hidden');
		
		var recordTypeField = form.addField('custpage_recordtype', 'text','RecordType', null);
		recordTypeField.setDefaultValue(recordType);
		recordTypeField.setDisplayType('hidden');
	
		var hitOffsetField = form.addField('custpage_hitoffset', 'integer','Hit Offset', null);
		hitOffsetField.setDefaultValue(hitOffset);
		hitOffsetField.setDisplayType('hidden');

		var resultsPerPageField = form.addField('custpage_resultsperpage','integer', 'Results Per Page', null);
		resultsPerPageField.setDefaultValue(resultsPerPage);
		resultsPerPageField.setDisplayType('hidden');
	
	/* Done setting the page fields with parameter values */

	/* Setting the sublist to accept values from the SoapResponse */
	
	var resultNode, companyName, dunsNo, city, state, hqPhone;
	resultNode = companyName = dunsNo = city = state = hqPhone = countryState = country = '';

	var somelist = form.addSubList('custpage_sublistmult', 'list', 'Results');
	somelist.addField('custpage_sublist_relvrank', 'float', 'Relv');
	somelist.addField('custpage_sublist_name', 'text', 'Company Name');
	var hiddenDuns = somelist.addField('custpage_sublist_dunsno', 'text', 'DUNS #');
	somelist.addField('custpage_sublist_dunsno_d', 'text', 'DUNS #');
	somelist.addField('custpage_sublist_city', 'text', 'City');
	somelist.addField('custpage_sublist_state', 'text', 'State');
	somelist.addField('custpage_sublist_country', 'text', 'Country');
	somelist.addField('custpage_sublist_headquarters', 'text', 'Location Type');
	somelist.addField('custpage_sublist_hqphone', 'text', 'HQ Phone');
	somelist.addField('custpage_sublist_finsales', 'currency', 'Annual Sales');
	somelist.addField('custpage_sublist_salesrep', 'text', 'SalesRep');
	somelist.addField('custpage_sublist_entitystatus', 'text', 'Status');
	somelist.addField('custpage_sublist_activestatus', 'text', 'Active');
	somelist.addField('custpage_sublist_dateassigned', 'text', 'Assigned');
	//somelist.addField('custpage_sublist_territory', 'text', 'TRTY');
	//somelist.addField('custpage_sublist_wind', 'text', 'Open');
	somelist.addField('custpage_sublist_check', 'radio', '');
	internalidField = somelist.addField('custpage_sublist_internalid', 'text', '');
	internalidField.setDisplayType('hidden');
	hiddenDuns.setDisplayType('hidden');
	
	var lineNoFact = 0;
	
	/* Setting the sublist to accept values from the SoapResponse */

	
	/* Setting the individual lineItems in the sublist */
	if(hitNodes!=null && hitNodes.length>=1){	
	
	for (i = 0; i < hitNodes.length; i++) {

			lineNo = i + 1;
			
			var hitNode = nlapiSelectNode(hitNodes[i], 'sch:companyResults');
			var companyName = nlapiSelectValue(hitNode, "sch:companyName");
			var dunsNo = nlapiSelectValue(hitNode, "sch:duns");
			var city = nlapiSelectValue(hitNode, "sch:city");
			var state = nlapiSelectValue(hitNode, "sch:stateOrProvince");	
			var country = nlapiSelectValue(hitNode, "sch:country");
			var hqPhone = nlapiSelectValue(hitNode, "sch:hqPhone");
			var finSales = nlapiSelectValue(hitNode, "sch:sales");
			var locationType = nlapiSelectValue(hitNode, "sch:locationType");
			if (finSales == 0) {
				finSales = '';
			}
		
		if(parseInt(hitOffset)){
		lineNoFact = parseInt(lineNo) + parseInt(hitOffset);
		}
		else{
			lineNoFact = parseInt(lineNo);
		}
		
		if(finSales!=null && finSales.length>=1){
		finSales = Math.round(parseFloat(finSales)*1000)/1000;
		}
		
		somelist.setLineItemValue('custpage_sublist_relvrank', lineNo,
				lineNoFact);
		somelist.setLineItemValue('custpage_sublist_name', lineNo, companyName);
		somelist.setLineItemValue('custpage_sublist_dunsno', lineNo, dunsNo);
		somelist.setLineItemValue('custpage_sublist_dunsno_d', lineNo, dunsNo);
		somelist.setLineItemValue('custpage_sublist_city', lineNo, city);
		somelist.setLineItemValue('custpage_sublist_state', lineNo, state);
		somelist.setLineItemValue('custpage_sublist_country', lineNo, country);
		somelist.setLineItemValue('custpage_sublist_headquarters', lineNo, locationType);
		somelist.setLineItemValue('custpage_sublist_hqphone', lineNo, hqPhone);
		somelist.setLineItemValue('custpage_sublist_finsales', lineNo, finSales);
		somelist.setLineItemValue('custpage_sublist_rep', lineNo, ' ');
		somelist.setLineItemValue('custpage_sublist_check', lineNo, 'F');
		somelist.setLineItemValue('custpage_sublist_salesrep', lineNo, ' ');
		somelist.setLineItemValue('custpage_sublist_activestatus', lineNo, ' ');
		somelist.setLineItemValue('custpage_sublist_entitystatus', lineNo, ' ');
		somelist.setLineItemValue('custpage_sublist_dateassigned', lineNo, ' ');
		//somelist.setLineItemValue('custpage_sublist_territory', lineNo, ' ');
		
		custInfo = getCorrespondingNetsuiteInfo(dunsNo);
		if (custInfo != null) {
			if (custInfo["salesRep"] != null) {
				somelist.setLineItemValue('custpage_sublist_salesrep', lineNo,
						custInfo["salesRep"]);
			}
			if (custInfo["activeStatus"] != null) {
				somelist.setLineItemValue('custpage_sublist_activestatus',
						lineNo, custInfo["activeStatus"]);
			}
			if (custInfo["entityStatus"] != null) {
				somelist.setLineItemValue('custpage_sublist_entitystatus',
						lineNo, custInfo["entityStatus"]);
			}
			if (custInfo["dateAssigned"] != null) {
				somelist.setLineItemValue('custpage_sublist_dateassigned',
						lineNo, custInfo["dateAssigned"]);
			}
			
			if (custInfo["internalId"] != null) {
				somelist.setLineItemValue('custpage_sublist_internalid',lineNo, custInfo["internalId"]);
				var uUrl = nlapiResolveURL('RECORD','customer',custInfo["internalId"],'VIEW');
				somelist.setLineItemValue('custpage_sublist_name', lineNo, '<a href="'+uUrl+'" target="nwin">'+companyName+'</a>');
			}			
		}
		
		if(dunsNo!=null && dunsNo.length >=5){
		var hUrl = "http://premium.hoovers.com/subscribe/search/simple/company/index.xhtml?query_string="+dunsNo;	
		somelist.setLineItemValue('custpage_sublist_dunsno_d', lineNo, '<a href="'+hUrl+'" target="nwin2">'+dunsNo+'</a>');
		}
		
		}	
	}

	/* Done setting the individual lineItems in the sublist */
	
	/* Add buttons to the form based on kind of results returned */
	
	try{
	var lastHit = nlapiSelectValue(soapXML, '//sch:last-hit');
	nlapiLogExecution('DEBUG','Last Hit',lastHit);
	var totalHits = nlapiSelectValue(soapXML, '//sch:total-hits');
	}
	catch(err){
		nlapiLogExecution('DEBUG','Cannot determine lastHit, totalHits','yes');
		var lastHit=0;
		var totalHits=0;
		hitOffset=0;
	}
	
	if(hitNodes!=null && hitNodes.length > 0){
		form.addButton('custpage_button1', 'This is ' + coName , 'buttonClicked');
	}
	else{
		form.addButton('custpage_button1', 'No Results');
	}
	
	form.addButton('custpage_searchagain', 'Search Different Name', 'searchAgain()');
	
	if(hitOffset==null || hitOffset==' ' || hitOffset==' '){hitOffset=0;}
	
	if (parseInt(hitOffset) != 0) {
		form.addButton('custpage_button2', 'Previous Page',
				'previousResultPage');
	}
	
	if (parseInt(lastHit) + 2 < parseInt(totalHits)) {
		form.addButton('custpage_button3', 'Next Page', 'nextResultPage');
	}

	/* Done adding buttons to the form based on kind of results returned */	
	response.writePage(form);

}

function getAllDunsPresentInNetsuite(allDunsL) {
	this.debug = '';
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custentityr7activestatus');
	arrSearchColumns[1] = new nlobjSearchColumn('salesrep');
	// arrSearchColumns[2] = new nlobjSearchColumn('firstname');
	arrSearchColumns[2] = new nlobjSearchColumn('entitystatus');
	arrSearchColumns[3] = new nlobjSearchColumn('custentityr7dateassigned');
	arrSearchColumns[4] = new nlobjSearchColumn('custentityr7dunsnumber');
	arrSearchColumns[5] = new nlobjSearchColumn('internalid');

	var dunsCompany = new Array();

	var arrSearchFilters, arrSearchResults, searchResult, duns, salesRep, activeStatus, internalId, entityStatus, dateAssigned, custInfo, word;
	debug += allDunsL.length;

	for ( var i = 0; i < allDunsL.length; i++) {

		arrSearchFilters = new nlobjSearchFilter('custentityr7dunsnumber',
				null, 'equalto', allDunsL[i], null);
		arrSearchResults = nlapiSearchRecord('customer', null,
				arrSearchFilters, arrSearchColumns);

		if (arrSearchResults != null) {
			custInfo = new Array();
			debug += "\n" + " ArrSearchResults length "
					+ arrSearchResults.length;
			searchResult = arrSearchResults[0];
			duns = searchResult.getValue('custentityr7dunsnumber');
			salesRep = searchResult.getText('salesrep');
			activeStatus = searchResult.getValue('custentityr7activestatus');
			entityStatus = searchResult.getText('entitystatus');
			dateAssigned = searchResult.getValue('custentityr7dateassigned');
			internalId = searchResult.getValue('internalid');
			if (salesRep != null) {
				custInfo["salesRep"] = salesRep;
			}
			if (activeStatus != null) {
				custInfo["activeStatus"] = activeStatus;
			}
			if (entityStatus != null) {
				custInfo["entityStatus"] = entityStatus;
			}
			if (dateAssigned != null) {
				custInfo["dateAssigned"] = dateAssigned;
			}
			if (internalId != null) {
				custInfo["internalId"] = internalId;
			}
			debug += "\n" + duns + " " + salesRep + " " + activeStatus + " "
					+ entityStatus + " " + dateAssigned;
			c = 9 - duns.length;
			k = "000000000".substring(0, c);
			duns = k + duns;
			// word=""+allDunsL[i]+"";
			dunsCompany[duns] = custInfo;
		}
	}
	return dunsCompany;
}


function getCorrespondingNetsuiteInfo(dunsNo) {
	var custInfo = this.dunsCompany[dunsNo];
	return custInfo;
}

function getResults(coName, hitOffset, resultsPerPage, orderBy) {
	var req = getRequest(coName, hitOffset, resultsPerPage, orderBy);
	var resp = '';

	var soapHeaders = new Array(); /*
									 * Add required SOAP header indicating the
									 * intent of this service call.
									 */
	//soapHeaders['SOAPAction'] = 'FindCompanyByKeywordRequest';
	resp = nlapiRequestURL(HOOVERS_SERVICE_URL, req, soapHeaders);
	var responseCode = resp.getCode();
	var soapText = resp.getBody();
	this.req = req;
	return soapText;
}

function getRequest(coName, hitOffset, resultsPerPage) {
	
	var soap = '';
	soap += '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://applications.dnb.com/webservice/schema/">';
	soap += '<soapenv:Header>';
	soap += '<sch:API-KEY>' + HOOVERS_API_KEY + '</sch:API-KEY>';
	soap += '</soapenv:Header>';
	soap += '<soapenv:Body>';
	soap += '<sch:FindCompanyByKeywordRequest>';
	soap += '<sch:keyword>' + coName + '</sch:keyword>';
	(resultsPerPage==''||resultsPerPage==null)? soap=soap: soap += '<sch:maxRecords>' + resultsPerPage + '</sch:maxRecords>';
	(hitOffset==''||hitOffset==null)? soap=soap: soap += '<sch:hitOffset>' + hitOffset + '</sch:hitOffset>';
	soap += '<sch:searchBy>companyName</sch:searchBy>';
	soap += '<sch:sortDirection>Descending</sch:sortDirection>';
	soap += '</sch:FindCompanyByKeywordRequest>';
	soap += '</soapenv:Body>';
	soap += '</soapenv:Envelope>';

	this.soapRequest = soap;
	return soap;
}

