//https://usergroup.netsuite.com/users/showthread.php?t=4591
//https://usergroup.netsuite.com/users/showthread.php?t=5940&highlight=anyof+nlapiSearchRecordhttps://usergroup.netsuite.com/users/showthread.php?t=5940&highlight=anyof+nlapiSearchRecord

var	HOOVERS_SERVICE_URL = 'http://dnbdirect-api.dnb.com/DnBAPI-15';
var	HOOVERS_API_KEY = 'rjcrh44v93rhfh25ty56bg64';

function action(request, response){

	/* Finding Forbidden Territories */
	this.forbiddenTerritories = obtainForbiddenTerritories();
	/* Done Finding Forbidden Territories */
	
	/* Creating Usage Record */
	var comment = '';
	allParameters = request.getAllParameters();
	for (param in allParameters) {
		comment += param + ":" + allParameters[param] + "\n";
	}
	
	/* Obtaining parameters supplied to suitelet */
	
	var competitorSearch = request.getParameter('custparamcompetitorsearch');
	var basicOrAdvanced = request.getParameter('custparambasicoradvanced');
	
	var coName = request.getParameter('custparamcustomername');
	var coKeyword = request.getParameter('custparamcustomerkeyword');
	var paramDunsNo = request.getParameter('custparamdunsno');
	var ultimateParentDuns = request.getParameter('custparamultimateparentduns');
	var industries = request.getParameterValues('custparamindustrytype');
	
	var annualSalesRangeFrom = request.getParameter('custparamannualsalesrangefrom');
	var annualSalesRangeTo = request.getParameter('custparamannualsalesrangeto');
	var empRangeFrom = request.getParameter('custparamemprangefrom');
	var empRangeTo = request.getParameter('custparamemprangeto');
	
	var areaCode = request.getParameter('custparamareacode');
	var city = request.getParameter('custparamcity');
	var globalState = request.getParameter('custparamglobalstate');
	
	var naics = request.getParameter('custparamnaics');
	var sic = request.getParameter('custparamnetsic');
	var milesWithin = request.getParameter('custparammileswithin');
	var zip = request.getParameter('custparamzip');
	
	var region = request.getParameter('custparamregion');
	var country = request.getParameter('custparamcountry');
	var state = request.getParameter('custparamusstate');
	var metroArea = request.getParameter('custparammetroarea');
	
	var orderBy = request.getParameter('custparamorderby');
	var resultsPerPage = request.getParameter('custparamresultsperpage');
	var allAny = request.getParameter('custparamallany');
	var hitOffset = request.getParameter('custparamhitoffset');
	var basicOrAdvanced = request.getParameter('custparambasicoradvanced');
	
	
	if (industries != null && industries.length >= 1) {
		nlapiLogExecution('DEBUG', 'Industries length before', industries.length);
		industries = expandedIndustries(industries);
		nlapiLogExecution('DEBUG', 'Industries length after', industries.length);
	}
	
	
	if (allAny != null && allAny == 'T') {
		allAny = 'all'
	}
	else {
		allAny = 'any';
	}
	industriesSelected = new Array();
	for (var i = 0; industries != null && i < industries.length; i++) {
		industriesSelected[industries[i]] = 1;
	}
	
	var errorText = 'Hoovers Netsuite Alert:\n';
	
	if (competitorSearch == null || competitorSearch != 'true2') {
		if (resultsPerPage != null && resultsPerPage > 60) {
			resultsPerPage = 60;
			errorText += "Netsuite Error: Results Per Page limited to 60\n";
		}
		//added when having them navigate directly to this suitelet and not through portlet
		if (resultsPerPage == null || resultsPerPage == '') {
			resultsPerPage = 20;
		}
		
		if (resultsPerPage == null || resultsPerPage < 0) {
			resultsPerPage = 5;
			errorText += "Netsuite Error: Results Per Page minimum 5\n";
		}
	}
	
	if (parseFloat(empRangeFrom) > parseFloat(empRangeTo)) {
		var c = empRangeFrom;
		empRangeFrom = empRangeTo
		empRangeTo = c;
	}
	
	if (parseFloat(annualSalesRangeFrom) > parseFloat(annualSalesRangeTo)) {
		c = annualSalesRangeFrom;
		annualSalesRangeFrom = annualSalesRangeTo;
		annualSalesRangeTo = c;
	}
	
	
	this.soapRequest = '';
	
	/* Done obtaining parameters supplied to suitelet */
	
	
	
	/*
	 * There are three types of search request: 1. Competitor Search 2. Advanced
	 * Search 3. Keyword Search Based on parameters supplied to the Suitelet we
	 * determine which request to make. The response is stored in a similar way
	 * in hitNodes.
	 */
	if (competitorSearch == 'true2' && paramDunsNo != null) {
	
		var soapText = getCompetitorResults(paramDunsNo);
		nlapiLogExecution('DEBUG', 'SoapText Length', soapText.length);
		
		//Sending SOAP XML text
		//nlapiSendEmail(2,2,'New Soap XML',soapText);
		
		
		var soapXML = nlapiStringToXML(soapText);
		
		try {
			var hitNodes = nlapiSelectNodes(soapXML, '//sch:competitor');
		} 
		catch (err) {
			try {
				var faultNode = nlapiSelectNode(soapXML, '//soapEnv:Fault');
				var faultCode = nlapiSelectValue(faultNode, 'faultCode');
				var faultString = nlapiSelectValue(faultNode, 'faultstring');
				var faultDetail = nlapiSelectValue(faultNode, 'detail');
				errorText += "\nFault String:" + faultString +
				"\nFault Detail:" +
				faultDetail;
			} 
			catch (err) {
			}
			var email = "\nSoap Response:\n" + soapText +
			"\nSoap Request:\n" +
			soapRequest +
			"\nAlert       :\n" +
			errorText;
			
			nlapiSendEmail(nlapiGetContext().getUser(), 55011, 'Hoovers Competitor Search Fail', email);
		}
		
	}
	else {
	
		/* Check if looks like Advanced Search */
		var looksLikeAdvancedSearch = false;
		// nlapiLogExecution('DEBUG','Some parameters',zip + " " + milesWithin +
		// " " + state + " " + sic + " " + naics + " " + empRange + " " +
		// annualSalesRange);
		if ((coKeyword != null && coKeyword.length > 0) ||
		(paramDunsNo != null && paramDunsNo.length > 0) ||
		(ultimateParentDuns != null && ultimateParentDuns.length > 0) ||
		(industries != null && industries.length > 0) ||
		(annualSalesRangeFrom != null && annualSalesRangeFrom.length > 0) ||
		(annualSalesRangeTo != null && annualSalesRangeTo.length > 0) ||
		(empRangeFrom != null && empRangeFrom.length > 0) ||
		(empRangeTo != null && empRangeTo.length > 0) ||
		(areaCode != null && areaCode.length > 0) ||
		(city != null && city.length > 0) ||
		(globalState != null && globalState.length > 0) ||
		(naics != null && naics.length > 0) ||
		(sic != null && sic.length > 0) ||
		(milesWithin != null && milesWithin.length > 0) ||
		(zip != null && zip.length > 0) ||
		(region != null && region.length > 0) ||
		(country != null && country.length > 0) ||
		(state != null && state.length > 0) ||
		(metroArea != null && metroArea.length > 0)) {
			looksLikeAdvancedSearch = true;
			if (coKeyword.length < 1 || coKeyword == null) {
				coKeyword = coName;
				coName = '';
			}
		}
		
		/* Done Checking if look like Advanced Search */
		
		if (looksLikeAdvancedSearch) {
			///soapenv:Envelope/soapenv:Body/sch:FindCompanyByKeywordResponse/sch:return/sch:resultSet/
			//nlapiSendEmail(55011,55011, 'Advanced Hoovers Search', 'Sales range from: ' + annualSalesRangeFrom + '\nSales Range To: ' + annualSalesRangeTo);
			nlapiLogExecution('DEBUG', 'Making Advanced Search Request', 'Yes');
			var soapText = getAdvancedResults(coKeyword, paramDunsNo, ultimateParentDuns, industries, annualSalesRangeFrom, annualSalesRangeTo, empRangeFrom, empRangeTo, areaCode, city, globalState, naics, sic, milesWithin, zip, region, country, state, metroArea, orderBy, resultsPerPage, allAny, hitOffset);
			
			//nlapiSendEmail(2,2,'New SOAP Advanced Response',soapText);
			var soapXML = nlapiStringToXML(soapText);
			
			if (nlapiGetContext().getUser() == 55011) {
			//nlapiSendEmail(55011,55011,'AdvancedCompanySearchRequest + Response',"Request:\n\n\n"+req + "\n\n\nResponse:\n\n\n"+ soapText);	
			}
			
			try {
				var hitNodes = nlapiSelectNodes(soapXML, 'SOAP-ENV:Envelope/SOAP-ENV:Body/sch:AdvancedCompanySearchResponse/sch:return/sch:companies/sch:hit');
			} 
			catch (err) {
				try {
					var faultNode = nlapiSelectNode(soapXML, '//soapEnv:Fault');
					var faultCode = nlapiSelectValue(faultNode, 'faultCode');
					var faultString = nlapiSelectValue(faultNode, 'faultstring');
					var faultDetail = nlapiSelectValue(faultNode, 'detail');
					errorText += "\nHoovers API Fault Code:" + faultCode +
					"\nFault String:" +
					faultString +
					"\nFault Detail:" +
					faultDetail;
				} 
				catch (err) {
				}
				var email = "\nSoap Response:\n" + soapText +
				"\nSoap Request:\n" +
				soapRequest +
				"\nAlert       :\n" +
				errorText;
				
				nlapiSendEmail(nlapiGetContext().getUser(), 55011, 'Hoovers Advanced Search Fail', email);
			}
			
		}
		else {
			nlapiLogExecution('DEBUG', 'Making Standard Keyword Search Request', 'Yes');
			var soapText = getResults(coName, hitOffset, resultsPerPage, orderBy);
			
			//nlapiSendEmail(2,2,'FindCompanyByKeywordRequest + Response',"Request" + req + " Response" + soapText);
			
			if (nlapiGetContext().getUser() == 55011) {
			//nlapiSendEmail(2,2,'Standard Response',soapText);	
			}
			
			var soapXML = nlapiStringToXML(soapText);
			try {
				//var hitNodes = nlapiSelectNodes(soapXML, '//sch:hit');
				var hitNodes = nlapiSelectNodes(soapXML, 'SOAP-ENV:Envelope/SOAP-ENV:Body/sch:FindCompanyByKeywordResponse/sch:return/sch:resultSet/sch:hit');
			} 
			catch (err) {
				try {
					var faultNode = nlapiSelectNode(soapXML, '//soapenv:Fault');
					var faultCode = nlapiSelectValue(faultNode, 'faultCode');
					var faultString = nlapiSelectValue(faultNode, 'faultstring');
					var faultDetail = nlapiSelectValue(faultNode, 'detail');
					errorText += "\nHoovers API Fault Code:" + faultCode +
					"\nFault String:" +
					faultString +
					"\nFault Detail:" +
					faultDetail;
				} 
				catch (err) {
				}
				var email = "\nSoap Response:\n" + soapText +
				"\nSoap Request:\n" +
				soapRequest +
				"\nAlert:\n" +
				errorText;
				
				nlapiSendEmail(nlapiGetContext().getUser(), 55011, 'Hoovers Standard Search Fail', email);
			}
		}
	}
	
	/* Done determining type of Search request, constructing request, and obtaining Response */
	
	//nlapiLogExecution('DEBUG', 'parameters', coName + "\n" + internalId);
	
	
	
	var form = nlapiCreateForm('NS-Hoovers BETA', false);
	form.setScript('customscriptr7hooversconfirmbutton');
	
	this.allDuns = new Array();
	
	
	if (hitNodes != null && hitNodes.length >= 1) {
		/* Obtaining Duns#s based on whether it competitor searcb or not*/
		if (competitorSearch != 'true2') {
			///basic or d search
			for (var j = 0; j < hitNodes.length; j++) {
				var hitNode = nlapiSelectNode(hitNodes[j], 'sch:companyResults');
				var dunsNo = nlapiSelectValue(hitNode, "sch:duns");
				if (dunsNo.length > 2) {
					allDuns[allDuns.length] = dunsNo;
				}
			}
		}
		else {
			for (var j = 0; j < hitNodes.length; j++) {
				var dunsNo = nlapiSelectValue(hitNodes[j], "sch:duns");
				if (dunsNo.length > 2) {
					allDuns[allDuns.length] = parseInt(dunsNo, 10);
				}
			}
		}
		nlapiLogExecution('DEBUG', 'duns', allDuns.length);
		/* Obtaining Duns#s based on whether it competitor search or not*/
		
		
		/* See which SalesRep owns the company based on Duns# */
		this.dunsCompany = getAllDunsPresentInNetsuite(allDuns);
		// obtains the values of dunsCompany
		c = letsSee() + "\n\n\n";
		c += debug;
		
		for (var k = 0; k < allDuns.length; k++) {
			c += "\n" + k + ". " + allDuns[k];
		}
		nlapiLogExecution('DEBUG', 'log', c);
		
	}
	/* See which SalesRep owns the company based on Duns# */
	
	
	/* Set the page fields with parameter values */
	
	if (competitorSearch != 'true2') {
	
	
		var coNameField = form.addField('custpage_coname', 'text', 'Company Name:', null);
		coNameField.setDefaultValue(coName);
		
		var coKeywordField = form.addField('custpage_cokeyword', 'text', 'Search Keyword:', null);
		coKeywordField.setDefaultValue(coKeyword);
		
		var formDunsNoField = form.addField('custpage_formdunsno', 'integer', 'DUNS#:', null);
		formDunsNoField.setDefaultValue(paramDunsNo);
		
		var ultimateDunsNoField = form.addField('custpage_ultimateparentdunsno', 'integer', 'Ultimate Parent DUNS#:', null);
		ultimateDunsNoField.setDefaultValue(ultimateParentDuns);
		
		// Industries
		var industryField = form.addField('custpage_industryfield', 'multiselect', 'Industry:');
		var industrySelectOptions = obtainIndustrySelectOptions();
		for (i = 0; industrySelectOptions != null && i < industrySelectOptions.length; i++) {
			var name = industrySelectOptions[i][0];
			var code = industrySelectOptions[i][1];
			if (industriesSelected[code] != null) {
				industryField.addSelectOption(code, name, true);
			}
			else {
				industryField.addSelectOption(code, name);
			}
		}
		industryField.setDisplaySize(400, 20);
		
		
		var annualSalesRangeFromField = form.addField('custpage_annualsalesfromfield', 'currency', 'Annual Sales From($mil):', null);
		annualSalesRangeFromField.setDefaultValue(annualSalesRangeFrom);
		annualSalesRangeFromField.setLayoutType('normal', 'startcol');
		
		var annualSalesRangeToField = form.addField('custpage_annualsalestofield', 'currency', 'Annual Sales To($mil):', null);
		annualSalesRangeToField.setDefaultValue(annualSalesRangeTo);
		
		
		var empRangeFromField = form.addField('custpage_emprangefromfield', 'integer', 'Employee Range From:', null);
		empRangeFromField.setDefaultValue(empRangeFrom);
		
		
		var empRangeToField = form.addField('custpage_emprangetofield', 'integer', 'Employee Range To:', null);
		empRangeToField.setDefaultValue(empRangeTo);
		
		
		var naicsField = form.addField('custpage_naicsfield', 'text', 'NAICS(atleast first 2):', null);
		naicsField.setDefaultValue(naics);
		// naicsField.setDisplayType('hidden');
		
		var sicField = form.addField('custpage_sicfield', 'text', 'SIC(atleast first 2):', null);
		sicField.setDefaultValue(sic);
		// sicField.setDisplayType('hidden');
		
		var areaCodeField = form.addField('custpage_areacodefield', 'text', 'Area Code:', null);
		areaCodeField.setDefaultValue(areaCode);
		
		var cityField = form.addField('custpage_cityfield', 'text', 'City:', null);
		cityField.setDefaultValue(city);
		
		var globalStateField = form.addField('custpage_globalstatefield', 'text', 'GlobalState:', null);
		globalStateField.setDefaultValue(globalState);
		globalStateField.setLayoutType('normal', 'startcol');
		
		
		var regionField = form.addField('custpage_region', 'select', 'Region:');
		var columns = new Array(new nlobjSearchColumn('custrecordr7hooversregionid'), new nlobjSearchColumn('custrecordr7hooversregiontype'));
		var searchResults = nlapiSearchRecord('customrecordr7hooversregiontypes', null, null, columns);
		regionField.addSelectOption('', '');
		for (i = 0; i < searchResults.length && searchResults != null; i++) {
			id = searchResults[i].getValue('custrecordr7hooversregionid');
			tag = searchResults[i].getValue('custrecordr7hooversregiontype');
			regionField.addSelectOption(id, tag);
		}
		regionField.setDefaultValue(region);
		
		
		var countryField = form.addField('custpage_country', 'select', 'Country:');
		var columns = new Array(new nlobjSearchColumn('custrecordr7hooverscountryid'), new nlobjSearchColumn('custrecordr7hooverscountry'));
		var searchResults = nlapiSearchRecord('customrecordr7hooverscountrymap', 2503, null, columns);
		countryField.addSelectOption('', '');
		for (i = 0; i < searchResults.length && searchResults != null; i++) {
			id = searchResults[i].getValue('custrecordr7hooverscountryid');
			tag = searchResults[i].getValue('custrecordr7hooverscountry');
			countryField.addSelectOption(id, tag);
		}
		countryField.setDefaultValue(country);
		
		
		var stateField = form.addField('custpage_statefield', 'select', 'US State:', null);
		stateField.addSelectOption('', '');
		stateField.addSelectOption('AK', 'Alabama');
		stateField.addSelectOption('AK', 'Alaska');
		// stateField.addSelectOption('AS', 'American Samoa');
		stateField.addSelectOption('AZ', 'Arizona');
		stateField.addSelectOption('AR', 'Arkansas');
		stateField.addSelectOption('CA', 'California');
		stateField.addSelectOption('CO', 'Colorado');
		stateField.addSelectOption('CT', 'Connecticut');
		stateField.addSelectOption('DE', 'Delaware');
		stateField.addSelectOption('DC', 'District of Columbia');
		// stateField.addSelectOption('FM', 'Federated State of Micronesia');
		stateField.addSelectOption('FL', 'Florida');
		stateField.addSelectOption('GA', 'Georgia');
		// stateField.addSelectOption('GU', 'Guam');
		stateField.addSelectOption('HI', 'Hawaii');
		stateField.addSelectOption('ID', 'Idaho');
		stateField.addSelectOption('IL', 'Illinois');
		stateField.addSelectOption('IN', 'Indiana');
		stateField.addSelectOption('IA', 'Iowa');
		stateField.addSelectOption('KS', 'Kansas');
		stateField.addSelectOption('KY', 'Kentucky');
		stateField.addSelectOption('LA', 'Louisiana');
		stateField.addSelectOption('ME', 'Maine');
		// stateField.addSelectOption('MH', 'Marshall Islands');
		stateField.addSelectOption('MD', 'Maryland');
		stateField.addSelectOption('MA', 'Massachussetts');
		stateField.addSelectOption('MI', 'Michigan');
		stateField.addSelectOption('MN', 'Minnesota');
		stateField.addSelectOption('MS', 'Missisippi');
		stateField.addSelectOption('MO', 'Missouri');
		stateField.addSelectOption('MT', 'Montana');
		stateField.addSelectOption('NE', 'Nebraska');
		stateField.addSelectOption('NV', 'Nevada');
		stateField.addSelectOption('NH', 'New Hampshire');
		stateField.addSelectOption('NJ', 'New Jersey');
		stateField.addSelectOption('NM', 'New Mexico');
		stateField.addSelectOption('NY', 'New York');
		stateField.addSelectOption('NC', 'North Carolina');
		stateField.addSelectOption('ND', 'North Dakota');
		// stateField.addSelectOption('MP', 'Northern Mariana Islands');
		stateField.addSelectOption('OH', 'Ohio');
		stateField.addSelectOption('OK', 'Oklahoma');
		stateField.addSelectOption('OR', 'Oregon');
		// stateField.addSelectOption('PW', 'Palau');
		stateField.addSelectOption('PA', 'Pennsylvania');
		stateField.addSelectOption('PR', 'Puerto Rico');
		stateField.addSelectOption('RI', 'Rhode Island');
		stateField.addSelectOption('SC', 'South Carolina');
		stateField.addSelectOption('SD', 'South Dakota');
		stateField.addSelectOption('TN', 'Tennessee');
		stateField.addSelectOption('TX', 'Texas');
		stateField.addSelectOption('UT', 'Utah');
		stateField.addSelectOption('VT', 'Vermont');
		stateField.addSelectOption('VI', 'Virgin Islands');
		stateField.addSelectOption('VA', 'Virginia');
		stateField.addSelectOption('WA', 'Washington');
		stateField.addSelectOption('WV', 'West Virginia');
		stateField.addSelectOption('WI', 'Wisconsin');
		stateField.addSelectOption('WY', 'Wyoming');
		stateField.setDefaultValue(state);
		// stateField.setDisplayType('hidden');
		
		var metroAreaField = form.addField('custpage_metroareafield', 'select', 'Metro Area:');
		
		var columns = new Array(new nlobjSearchColumn('custrecordr7hooversmetroname'), new nlobjSearchColumn('custrecordr7hooversmetroid'));
		var searchResults = nlapiSearchRecord('customrecordr7hooversmetroareas', null, null, columns);
		var id, tag;
		metroAreaField.addSelectOption('', '');
		for (var i = 0; i < searchResults.length && searchResults != null; i++) {
			id = searchResults[i].getValue('custrecordr7hooversmetroid');
			tag = searchResults[i].getValue('custrecordr7hooversmetroname');
			metroAreaField.addSelectOption(id, tag);
		}
		metroAreaField.setDefaultValue(metroArea);
		
		var milesWithinField = form.addField('custpage_mileswithin', 'text', 'Miles Within:', null);
		milesWithinField.setDefaultValue(milesWithin);
		
		
		
		
		var zipField = form.addField('custpage_zipfield', 'text', 'ZIP:', null);
		zipField.setDefaultValue(zip);
		// zipField.setDisplayType('hidden');
		
		
		var basicOrAdvancedField = form.addField('custpage_basicoradvanced', 'text', 'Basic or Advanced:');
		basicOrAdvancedField.setDefaultValue(basicOrAdvanced);
		basicOrAdvancedField.setDisplayType('hidden');
		
		
		var orderByField = form.addField('custpage_orderby', 'select', 'Order by:', null);
		orderByField.addSelectOption('', '');
		orderByField.addSelectOption('CompanyName', 'Company Name');
		orderByField.addSelectOption('StateName', 'State Name');
		orderByField.addSelectOption('CityName', 'City Name');
		orderByField.addSelectOption('TotalAssets', 'Total Assets');
		orderByField.addSelectOption('EmployeesTotal', 'Employee Total');
		orderByField.addSelectOption('MarketCap', 'Market Capitalization');
		orderByField.addSelectOption('NetIncome', 'Net Income');
		orderByField.addSelectOption('SalesUS', 'Sales US');
		//orderByField.addSelectOption('SalesUK', 'Sales UK');
		orderByField.addSelectOption('SalesGrowth12Mon', '12 Month Sales Growth');
		orderByField.addSelectOption('NetIncomeGrowth12Mon', '12 Month NetIncome Growth');
		orderByField.addSelectOption('EmployeeGrowth12Mon', '12 Month Employee Growth');
		//orderByField.addSelectOption('NetMargin', 'Net Margin');
		orderByField.addSelectOption('ROE', 'Return on Equity');
		orderByField.addSelectOption('ROA', 'Return on Assets');
		orderByField.addSelectOption('DividendRate', 'Dividend Rate');
		orderByField.setDefaultValue(orderBy);
		orderByField.setLayoutType('outsidebelow');
		
		
		allAnyField = form.addField('custpage_allany', 'checkbox', 'Match All:', null);
		allAnyField.setDefaultValue(request.getParameter('custparamallany'));
		allAnyField.setLayoutType('outsidebelow');
		
		
		var xmlResp = form.addField('custpage_resp', 'longtext', 'XmlResponse', null);
		xmlResp.setDefaultValue(industries);
		xmlResp.setDisplayType('hidden');
		/*
		
		 *
		
		 * var forbidText=''; var jk=0; for(var k=0;myTer!=null && k<myTer.length;k++){
		
		 * forbidText += myTer[k] + "\n"; }
		
		 *
		
		 * for(var value in forbiddenTerritories){ //var val =
		
		 * value.search("United States"); if(val!=-1){ var line = jk + " . ["+
		
		 * value + "]=" + forbiddenTerritories[value] + "\n"; forbidText +=line;
		
		 * jk++; } } xmlResp.setDefaultValue(forbidText);
		
		 * xmlResp.setDisplayType('false');
		
		 */
		
	}
	
	var hitOffsetField = form.addField('custpage_hitoffset', 'integer', 'Hit Offset', null);
	hitOffsetField.setDefaultValue(hitOffset);
	hitOffsetField.setDisplayType('hidden');
	
	var maxResults = form.addField('custpage_resultsperpage', 'integer', 'Max Records:');
	if (resultsPerPage == null || resultsPerPage == '' || resultsPerPage == ' ') {
		resultsPerPage = 40;
	}
	maxResults.setDefaultValue(resultsPerPage);
	maxResults.setDisplayType('hidden');
	
	var errorTextField = form.addField('custpage_erroralert', 'longtext', 'Error:');
	errorTextField.setDefaultValue(errorText);
	errorTextField.setDisplayType('hidden');
	
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
	somelist.addField('custpage_sublist_hqphone', 'text', 'HQ Phone');
	somelist.addField('custpage_sublist_finsales', 'currency', 'Annual Sales ($mil)');
	somelist.addField('custpage_sublist_salesrep', 'text', 'SalesRep');
	somelist.addField('custpage_sublist_entitystatus', 'text', 'Status');
	somelist.addField('custpage_sublist_activestatus', 'text', 'Active');
	somelist.addField('custpage_sublist_dateassigned', 'text', 'Assigned');
	somelist.addField('custpage_sublist_territory', 'text', 'TRTY');
	// somelist.addField('custpage_sublist_wind', 'text', 'Open');
	somelist.addField('custpage_sublist_check', 'checkbox', '');
	internalidField = somelist.addField('custpage_sublist_internalid', 'text', '');
	internalidField.setDisplayType('hidden');
	hiddenDuns.setDisplayType('hidden');
	
	
	var lineNoFact = 0;
	
	/* Setting the sublist to accept values from the SoapResponse */
	
	
	/* Setting the individual lineItems in the sublist */
	if (hitNodes != null && hitNodes.length >= 1) {
	
	
		for (i = 0; i < hitNodes.length; i++) {
		
			lineNo = i + 1;
			
			if (competitorSearch != 'true2') {
				//Advanced or Keyword
				var hitNode = nlapiSelectNode(hitNodes[i], 'sch:companyResults');
				var companyName = nlapiSelectValue(hitNode, "sch:companyName");
				var companyId = nlapiSelectValue(hitNode, "sch:companyId");
				var dunsNo = nlapiSelectValue(hitNode, "sch:duns");
				var city = nlapiSelectValue(hitNode, "sch:city");
				var state = nlapiSelectValue(hitNode, "sch:stateOrProvince");
				var country = nlapiSelectValue(hitNode, "sch:country");
				var hqPhone = nlapiSelectValue(hitNode, "sch:hqPhone");
				var finSales = nlapiSelectValue(hitNode, "sch:sales");
				if (finSales == 0) {
					finSales = '';
				}
			}
			else {
				var hitNode = hitNodes[i];
				var companyName = nlapiSelectValue(hitNode, "sch:companyName");
				var companyId = nlapiSelectValue(hitNode, "sch:companyId");
				var dunsNo = nlapiSelectValue(hitNode, "sch:duns");
				var city = nlapiSelectValue(hitNode, "sch:addrcity");
				var state = nlapiSelectValue(hitNode, "sch:addrstateprov");
				var country = nlapiSelectValue(hitNode, "sch:addrcountry");
				var hqPhone = nlapiSelectValue(hitNode, "sch:hqPhone");
				var finSales = nlapiSelectValue(hitNode, "sch:finsales");
				if (finSales == 0) {
					finSales = '';
				}
			}
			
			if (parseInt(hitOffset)) {
				lineNoFact = parseInt(lineNo) + parseInt(hitOffset);
			}
			else {
				lineNoFact = parseInt(lineNo);
			}
			
			if (finSales.length >= 1) {
				finSales = Math.round(parseFloat(finSales) * 1000) / 1000;
			}
			
			somelist.setLineItemValue('custpage_sublist_relvrank', lineNo, lineNoFact);
			somelist.setLineItemValue('custpage_sublist_name', lineNo, companyName);
			somelist.setLineItemValue('custpage_sublist_dunsno', lineNo, dunsNo);
			somelist.setLineItemValue('custpage_sublist_dunsno_d', lineNo, dunsNo);
			somelist.setLineItemValue('custpage_sublist_city', lineNo, city);
			somelist.setLineItemValue('custpage_sublist_state', lineNo, state);
			somelist.setLineItemValue('custpage_sublist_country', lineNo, country);
			somelist.setLineItemValue('custpage_sublist_hqphone', lineNo, hqPhone);
			somelist.setLineItemValue('custpage_sublist_finsales', lineNo, finSales);
			somelist.setLineItemValue('custpage_sublist_rep', lineNo, ' ');
			// somelist.setLineItemValue('custpage_sublist_link',lineNo,'<a
			// href="javascript:getThisCompanyRaahr(\''+ companyName + '\',\'' +
			// dunsNo + '\',\'' + city + '\',\'' + state + '\');">Get
			// Customer</a>');
			somelist.setLineItemValue('custpage_sublist_check', lineNo, 'F');
			
			somelist.setLineItemValue('custpage_sublist_salesrep', lineNo, ' ');
			somelist.setLineItemValue('custpage_sublist_activestatus', lineNo, ' ');
			somelist.setLineItemValue('custpage_sublist_entitystatus', lineNo, ' ');
			somelist.setLineItemValue('custpage_sublist_dateassigned', lineNo, ' ');
			somelist.setLineItemValue('custpage_sublist_territory', lineNo, ' ');
			
			custInfo = getCorrespondingNetsuiteInfo(dunsNo);
			if (custInfo != null) {
				if (custInfo["salesRep"] != null) {
					somelist.setLineItemValue('custpage_sublist_salesrep', lineNo, custInfo["salesRep"]);
				}
				if (custInfo["activeStatus"] != null) {
					somelist.setLineItemValue('custpage_sublist_activestatus', lineNo, custInfo["activeStatus"]);
				}
				if (custInfo["entityStatus"] != null) {
					somelist.setLineItemValue('custpage_sublist_entitystatus', lineNo, custInfo["entityStatus"]);
				}
				if (custInfo["dateAssigned"] != null) {
					somelist.setLineItemValue('custpage_sublist_dateassigned', lineNo, custInfo["dateAssigned"]);
				}
				if (custInfo["internalId"] != null) {
					somelist.setLineItemValue('custpage_sublist_internalid', lineNo, custInfo["internalId"]);
					var uUrl = nlapiResolveURL('RECORD', 'customer', custInfo["internalId"], 'VIEW');
					somelist.setLineItemValue('custpage_sublist_name', lineNo, '<a href="' + uUrl + '" target="nwin">' + companyName + '</a>');
				}
				
			}
			
			if ((dunsNo != null && dunsNo.length >= 4) && (companyId!=null && companyId!='')) {
				var c = 9 - dunsNo.length;
				k = "000000000".substring(0, c);
				dunsNo = k + dunsNo;
				var hUrl = "http://subscriber.hoovers.com/H/company360/overview.html?companyId=" + companyId;
				somelist.setLineItemValue('custpage_sublist_dunsno_d', lineNo, '<a href="' + hUrl + '" target="nwin2">' + dunsNo + '</a>');
			}
			
			var countryState = country + "-" + state
			var outTerritory = checkInTerritory(countryState);
			if (!outTerritory) {
				somelist.setLineItemValue('custpage_sublist_territory', lineNo, 'IN');
			}
			
		}
		
	}
	
	/* Done setting the individual lineItems in the sublist */
	
	/* Add buttons to the form based on kind of results returned */
	
	try {
		var lastHit = nlapiSelectValue(soapXML, '//sch:last-hit');
		nlapiLogExecution('DEBUG', 'Last Hit', lastHit);
		var totalHits = nlapiSelectValue(soapXML, '//sch:total-hits');
	} 
	catch (err) {
		nlapiLogExecution('DEBUG', 'Cannot determine lastHit, totalHits', 'yes');
		var lastHit = 0;
		var totalHits = 0;
		hitOffset = 0;
	}
	
	if (hitNodes != null && hitNodes.length > 0) {
		form.addButton('custpage_button1', 'Create Records', 'buttonClicked');
	}
	else {
		form.addButton('custpage_button1', 'No Records Found', 'alert(\'No records found. Please narrow your search criteria\')');
	}
	
	if (hitOffset == null || hitOffset == ' ' || hitOffset == ' ') {
		hitOffset = 0;
	}
	
	if (parseInt(hitOffset) != 0) {
		form.addButton('custpage_button2', 'Previous Page', 'previousResultPage');
	}
	
	if (parseInt(lastHit) + 2 < parseInt(totalHits)) {
		form.addButton('custpage_button3', 'Next Page', 'nextResultPage');
	}
	
	if (competitorSearch != 'true2') {
		form.addButton('custpage_button3', 'Search Again', 'searchAgain');
	}
	
	/* Done adding buttons to the form based on kind of results returned */
	response.writePage(form);
	
}

function getAllDunsPresentInNetsuite(allDunsL){
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
	
	var arrSearchFilters, arrSearchResults, searchResult, duns, salesRep, activeStatus, internalId, entityStatus, dateAssigned, custInfo;
	debug += allDunsL.length;
	
	for (var i = 0; i < allDunsL.length; i++) {
		if (allDunsL[i] == null || allDunsL[i] == ''){
			continue;
		}
		nlapiLogExecution('AUDIT', 'allDunsL[i]', allDunsL[i]);
		arrSearchFilters = new nlobjSearchFilter('custentityr7dunsnumber', null, 'equalto', allDunsL[i]);
		arrSearchResults = nlapiSearchRecord('customer', null, arrSearchFilters, arrSearchColumns);
		
		if (arrSearchResults != null) {
			nlapiLogExecution('AUDIT', 'MATCH', allDunsL[i]);
			custInfo = new Array();
			debug += "\n" + " ArrSearchResults length " + arrSearchResults.length;
			searchResult = arrSearchResults[0];
			duns = pad(searchResult.getValue('custentityr7dunsnumber'), 9);
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
			debug += "\n" + duns + " " + salesRep + " " + activeStatus + " " + entityStatus + " " + dateAssigned;

			dunsCompany[duns] = custInfo;
		}
	}
	return dunsCompany;
}

function trimLeadingTrailingSpaces(fv){
	var pattern = /^[ \t]+|[ \t]*$/g;
	fv = fv.replace(pattern, '');
	return fv;
}

function letsSee(){
	var lineT = '';
	var i = 0;
	for (var word in dunsCompany) {
		i++;
		lineT += "\n" + i + ". " + word + " " + dunsCompany[word]["salesRep"] + dunsCompany[word]["activeStatus"];
	}
	lineT = i + "\n" + lineT;
	return lineT;
}


function getCorrespondingNetsuiteInfo(dunsNo) {
	nlapiLogExecution('DEBUG', 'duns lookup', dunsNo);
	var custInfo = dunsCompany[dunsNo];
	return custInfo;
}

function getXmlResponse() {
	return "abcd";
}

function getResults(coName, hitOffset, resultsPerPage, orderBy) {
	
	/*
	var counter = nlapiGetContext().getSetting('SCRIPT','custscriptr7hooverscounter');
	nlapiLogExecution('DEBUG','Counter before',counter);
	if(counter==''||counter==null){counter=0;}
	nlapiLogExecution('DEBUG','Counter intermediate',counter);
	counter = parseInt(counter) + 1;
	nlapiGetContext().setSetting('SCRIPT','custscriptr7hooverscounter',counter+'');
	counter = nlapiGetContext().getSetting('SCRIPT','custscriptr7hooverscounter');
	nlapiLogExecution('DEBUG','Counter after',counter);
	*/
	
	var req = getRequest(coName, hitOffset, resultsPerPage, orderBy);
	this.req = req;
	var resp = '';
	var soapHeaders = new Array(); /*
									 * Add required SOAP header indicating the
									 * intent of this service call.
									 */
	//soapHeaders['SOAPAction'] = 'FindCompanyByKeywordRequest';
	resp = nlapiRequestURL(HOOVERS_SERVICE_URL, req, soapHeaders);
	var responseCode = resp.getCode();
	var soapText = resp.getBody();
	return soapText;
}

function getRequest(coName, hitOffset, resultsPerPage, orderBy) {

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
	(orderBy==''||orderBy==null||orderBy.length<2)? soap=soap: '<sch:orderBy>' + orderBy + '</sch:orderBy>';
	soap += '<sch:sortDirection>Descending</sch:sortDirection>';
	soap += '</sch:FindCompanyByKeywordRequest>';
	soap += '</soapenv:Body>';
	soap += '</soapenv:Envelope>';

	this.soapRequest = soap;
	return soap;
}

function getAdvancedRequest(coKeyword,paramDunsNo,ultimateParentDuns,industries,annualSalesRangeFrom,
		annualSalesRangeTo,empRangeFrom,empRangeTo,areaCode,city,globalState,naics,
		sic,milesWithin,zip,region,country,state,metroArea,orderBy,resultsPerPage,allAny,
		hitOffset){
	
	nlapiLogExecution('DEBUG', 'Making Advanced Search Request', 'Yes');

	if (naics != null && naics.length < 2) {
			naics = '';
	}
	
	if (sic != null && sic.length < 2) {
		sic = '';
	}

	var assetsRangeFrom ='';
	var assetsRangeTo ='';
	
	var industry ='';
	if(industries!=null && industries.length>=1){
		industry = industries[0];
	}
	
	var sortDirection ='Descending';
	if(orderBy!=null && orderBy=='CompanyName'){
		sortDirection = 'Ascending';
	}
	
	if ((zip != null && zip.length >= 3) && (milesWithin == 0)) {
		milesWithin = 1;
	}
	
	var soap = '';
	soap += '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://applications.dnb.com/webservice/schema/">';
	soap += '<soapenv:Header>';
	soap += '<sch:API-KEY>' + HOOVERS_API_KEY +'</sch:API-KEY>';
	soap += '</soapenv:Header>';
	soap += '<soapenv:Body>';
	soap += '<sch:AdvancedCompanySearchRequest>';
	soap += '<sch:bal>';
	
	(hitOffset==''||hitOffset==null)? soap=soap:soap += '<sch:hitOffset>' + hitOffset + '</sch:hitOffset>' ;
	(resultsPerPage==''||resultsPerPage==null)? soap=soap:soap += '<sch:maxRecords>' + resultsPerPage + '</sch:maxRecords>' ;
	(orderBy==''||orderBy==null)? soap=soap:soap += '<sch:orderBy>' + orderBy +'</sch:orderBy>' ;
	(sortDirection==''||sortDirection==null)? soap=soap:soap += '<sch:sortDirection>' + sortDirection + '</sch:sortDirection>' ;
	
	
	if (
	(empRangeFrom != '' && empRangeFrom!=null) ||
	( empRangeTo!=null && empRangeTo != '') ||
	( annualSalesRangeFrom!=null && annualSalesRangeFrom != '') ||
	( annualSalesRangeTo!=null && annualSalesRangeTo != '')
	) {
		soap += '<sch:companySize>';
		(empRangeFrom == '' || empRangeFrom == null) ? soap = soap : soap += '<sch:employeesFrom>' + empRangeFrom + '</sch:employeesFrom>';
		(empRangeTo == '' || empRangeTo == null) ? soap = soap : soap += '<sch:employeesTo>' + empRangeTo + '</sch:employeesTo>';
		(annualSalesRangeFrom == '' || annualSalesRangeFrom == null) ? soap = soap : soap += '<sch:salesFrom>' + annualSalesRangeFrom + '</sch:salesFrom>';
		(annualSalesRangeTo == '' || annualSalesRangeTo == null) ? soap = soap : soap += '<sch:salesTo>' + annualSalesRangeTo + '</sch:salesTo>';
		soap += '</sch:companySize>';
	}
	
	/*
	soap += '<sch:companytype>';
	soap += '<sch:location></sch:location>';
	soap += '<sch:publicPrivate></sch:publicPrivate>';
	soap += '<sch:status></sch:status>';
	soap += '</sch:companytype>';
	*/
	/*
	soap += '<sch:financialdata>';
	soap += '<sch:advertisingExpenseFrom></sch:advertisingExpenseFrom>';
	soap += '<sch:advertisingExpenseTo></sch:advertisingExpenseTo>';
	soap += '<sch:assetsFrom></sch:assetsFrom>';
	soap += '<sch:assetsTo></sch:assetsTo>';
	soap += '<sch:filingDateFrom></sch:filingDateFrom>';
	soap += '<sch:filingDateTo></sch:filingDateTo>';
	soap += '<sch:fiscalYearEnd></sch:fiscalYearEnd>';
	soap += '<sch:incomeFrom></sch:incomeFrom>';
	soap += '<sch:incomeGrowthFrom></sch:incomeGrowthFrom>';
	soap += '<sch:incomeGrowthTo></sch:incomeGrowthTo>';
	soap += '<sch:incomeTo></sch:incomeTo>';
	soap += '<sch:offerFrom></sch:offerFrom>';
	soap += '<sch:offerTo></sch:offerTo>';
	soap += '<sch:priceRangeFrom></sch:priceRangeFrom>';
	soap += '<sch:priceRangeTo></sch:priceRangeTo>';
	soap += '<sch:researchExpenseFrom></sch:researchExpenseFrom>';
	soap += '<sch:researchExpenseTo></sch:researchExpenseTo>';
	soap += '<sch:tradingDateFrom></sch:tradingDateFrom>';
	soap += '<sch:tradingDateTo></sch:tradingDateTo>';
	soap += '<sch:underwriters></sch:underwriters>';
	soap += '</sch:financialdata>';
	*/
	soap += '<sch:industry>';
	if(industries!=null && industries.length>=1){
	for(var i=0;industries!=null && i<industries.length;i++){
		soap += '<sch:hooversIndustryCode>' + industries[i] + '</sch:hooversIndustryCode>';
	}
	}
	else{
		soap += '<sch:hooversIndustryName>' + industry + '</sch:hooversIndustryName>';
	}
	soap += '<sch:primaryOnly>false</sch:primaryOnly>';
	(naics==''||naics==null)? soap=soap : soap += '<sch:nAICS>' + naics + '</sch:nAICS>' ;
	(naics==''||naics==null)? soap=soap: soap += '<sch:sIAC>' + sic + '</sch:sIAC>' ;
	soap += '</sch:industry>';
	soap += '<sch:location>';
	(areaCode==''||areaCode==null)? soap=soap: soap += '<sch:areaCode>'+ areaCode  +'</sch:areaCode>' ;
	(city==''||city==null)? soap=soap: soap += '<sch:city>' + city + '</sch:city>' ;
	(state==''||state==null)? soap=soap: soap += '<sch:usStateCanadaProvince>' + state + '</sch:usStateCanadaProvince>' ;
	(country==''||country==null)? soap=soap: soap += '<sch:countryId>' + country + '</sch:countryId>' ;
	(globalState==''||globalState==null)? soap=soap: soap += '<sch:globalState>'+ globalState + '</sch:globalState>';
	(metroArea==''||metroArea==null)? soap=soap: soap += '<sch:metropolitanId>' + metroArea + '</sch:metropolitanId>' ;
	(region==''||region==null)? soap=soap: soap += '<sch:regionId>' + region + '</sch:regionId>' ;
	if(zip!=null && zip!=''){
		if (milesWithin != null && milesWithin != '') {
			soap += "<sch:zipAreaSearch>";
			soap += '<sch:scale>' + 'miles' + '</sch:scale>';
			(milesWithin == '' || milesWithin == null) ? soap = soap : soap += '<sch:radius>' + milesWithin + '</sch:radius>';
			(zip == '' || zip == null) ? soap = soap : soap += '<sch:zipCode>' + zip + '</sch:zipCode>';
			soap += "</sch:zipAreaSearch>";
		}
		else {
			(zip == '' || zip == null) ? soap = soap : soap += '<sch:postalCode>' + zip + '</sch:postalCode>';
		}
	}	
	(allAny==''||allAny==null)? soap=soap:soap += '<sch:allAny>'+ allAny +'</sch:allAny>' ;
	soap += '</sch:location>';
	
	if (
	(coKeyword != '' && coKeyword!=null) || 
	(paramDunsNo != '' && paramDunsNo!=null) || 
	(ultimateParentDuns!='' && ultimateParentDuns != null)
	) {
		soap += '<sch:specialtyCriteria>';
		(coKeyword == '' || coKeyword == null) ? soap = soap : soap += '<sch:companyKeyword>' + coKeyword + '</sch:companyKeyword>';
		(paramDunsNo == '' || paramDunsNo == null) ? soap = soap : soap += '<sch:duns>' + paramDunsNo + '</sch:duns>';
		(ultimateParentDuns == '' || ultimateParentDuns == null) ? soap = soap : soap += '<sch:ultimateParentDUNS>' + ultimateParentDuns + '</sch:ultimateParentDUNS>';
		soap += '</sch:specialtyCriteria>';
	}
	
	soap += '</sch:bal>';
	soap += '</sch:AdvancedCompanySearchRequest>';
	soap += '</soapenv:Body>';
	soap += '</soapenv:Envelope>';

	this.soapRequest = soap;
	nlapiLogExecution('DEBUG', 'soapRequest', 'Request' + soap);
	
	return soap;
}

function getAdvancedResults(coKeyword,paramDunsNo,ultimateParentDuns,industries,annualSalesRangeFrom,
		annualSalesRangeTo,empRangeFrom,empRangeTo,areaCode,city,globalState,naics,
		sic,milesWithin,zip,region,country,state,metroArea,orderBy,resultsPerPage,allAny,
		hitOffset){
	
	/*
	var counter = nlapiGetContext().getSetting('SCRIPT','custscriptr7hooverscounter');
	counter = parseInt(counter) + 1;
	nlapiGetContext().setSetting('SCRIPT','custscriptr7hooverscounter',counter);
	*/
	
	var req = getAdvancedRequest(coKeyword,paramDunsNo,ultimateParentDuns,industries,annualSalesRangeFrom,
			annualSalesRangeTo,empRangeFrom,empRangeTo,areaCode,city,globalState,naics,
			sic,milesWithin,zip,region,country,state,metroArea,orderBy,resultsPerPage,allAny,
			hitOffset);
	
	
	this.req = req;
	var resp = '';
	var soapHeaders = new Array(); /*
									 * Add required SOAP header indicating the
									 * intent of this service call.
									 */
	//soapHeaders['SOAPAction'] = 'AdvancedCompanySearchRequest';
	resp = nlapiRequestURL(HOOVERS_SERVICE_URL, req, soapHeaders);
	var responseCode = resp.getCode();
	var soapText = resp.getBody();
	
	//nlapiSendEmail(2,55011,'Advanced Search Request DEBUG + Response',req + "\n\n\n" + soapText);
	
	return soapText;
}

function getCompetitorRequest(dunsNo) {
	
	var soap = '';
	soap += '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://applications.dnb.com/webservice/schema/">';
	soap += '<soapenv:Header>';
	soap += '<sch:API-KEY>' + HOOVERS_API_KEY + '</sch:API-KEY>';
	soap += '</soapenv:Header>';
	soap += '<soapenv:Body>';
	soap += '<sch:FindCompetitorsByCompanyIDRequest>';
	soap += '<sch:uniqueId>' + dunsNo + '</sch:uniqueId>';
	soap += '</sch:FindCompetitorsByCompanyIDRequest>';
	soap += '</soapenv:Body>';
	soap += '</soapenv:Envelope>';
	this.soapRequest = soap;
	return soap;
}

function getCompetitorResults(dunsNo) {
	
	/*
	var counter = nlapiGetContext().getSetting('SCRIPT','custscriptr7hooverscounter');
	counter = parseInt(counter) + 1;
	nlapiGetContext().setSetting('SCRIPT','custscriptr7hooverscounter',counter);
	*/
	
	var req = getCompetitorRequest(dunsNo);
	var resp = '';
	var soapHeaders = new Array();
	/* Add required SOAP header indicating the intent of this service call. */
	//soapHeaders['SOAPAction'] = 'FindCompetitorsByCompanyIDRequest';
	resp = nlapiRequestURL(HOOVERS_SERVICE_URL, req, soapHeaders);
	var responseCode = resp.getCode();
	var soapText = resp.getBody();
	return soapText;
}

function checkInTerritory(word){
	//forbiddenTerritories
	if(forbiddenTerritories[word]!=null){
		return true; // forbidden
	}
	else{
		return false; // not forbidden
	}
}


function obtainForbiddenTerritories(){

	var empRecord = nlapiLoadRecord('employee', nlapiGetUser());
	var mySalesTerritories = empRecord.getFieldValues('custentityr7salesterritoryassignment');
	
	this.myTer = new Array();
	for (var j = 0; mySalesTerritories != null && j < mySalesTerritories; j++) {
		myTer[myTer.length] = mySalesTerritories[j];
	}
	
	var searchColumns = new Array();
	searchColumns[0] = new nlobjSearchColumn('custrecordr7salesterritorymapassignment');
	searchColumns[1] = new nlobjSearchColumn('custrecordr7salesterritorymapcountry');
	searchColumns[2] = new nlobjSearchColumn('custrecordr7salesterritorymapstate');
	
	var searchFilters = new Array();
	if (mySalesTerritories != null && mySalesTerritories != '') {
		searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7salesterritorymapassignment', null, 'noneof', mySalesTerritories);
	}
	
	var searchResults = nlapiSearchRecord('customrecordr7salesterritorymap', null, searchFilters, searchColumns);
	
	var countryStates = new Array();
	for (var i = 0; searchResults != null && i < searchResults.length; i++) {
		var country = searchResults[i].getText(searchColumns[1])
		var state = searchResults[i].getText(searchColumns[2]);
		
		if (state != null) {
			var countryState = country + '-' + state;
		}
		
		countryStates[countryState] = 1;
	}
	
	return countryStates;
}

function obtainIndustrySelectOptions(){
	
	var columns = new Array(new nlobjSearchColumn('custrecordr7hooversindustryid'),new nlobjSearchColumn('custrecordr7hooversindustrytype'),new nlobjSearchColumn('custrecordr7hooversparentindustryid'));
	var searchResults = nlapiSearchRecord('customrecordr7hooversindustrytypes',null,null,columns);
	var name,code,parentCode;
	this.childIndustries = new Array();
	this.highLevelIndustries = new Array();
	this.options = new Array();
	for(var i=0;searchResults!=null && i<searchResults.length;i++){
		name = searchResults[i].getValue('custrecordr7hooversindustrytype');
		code = searchResults[i].getValue('custrecordr7hooversindustryid');
		parentCode = searchResults[i].getValue('custrecordr7hooversparentindustryid'); 
		var entry = new Array(name,code,parentCode);
		
		if(parentCode!=null && parentCode.length>=1){
			if(childIndustries[parentCode]!=null){
				childIndustries[parentCode][childIndustries[parentCode].length]=entry;
			}
			else{
				childIndustries[parentCode]=new Array(entry);
			}
		}
		if(parentCode==null||parentCode==''){
			highLevelIndustries[highLevelIndustries.length]=entry;
		}
	}
	
	for(var j=0;j<highLevelIndustries.length;j++){
		addToOptions(highLevelIndustries[j],0);
	}
	
	return options;
}

function addToOptions(industry, level){
	var name = industry[0];
	var code = industry[1];
	var parentCode = industry[2];
	
	var spc = ''; for(var l=0;l<level;l++){ spc += '-';}
	var optionEntry = new Array(spc+name,code);
	if(parentCode==null || parentCode==''){
		optionEntry[0] = optionEntry[0].toUpperCase(); 
	}
	options[options.length] = optionEntry;
	
	if(childIndustries[code]!=null){
		//nlapiLogExecution('DEBUG', 'Found child industries', childIndustries[code].length);
		for(var k=0;k<childIndustries[code].length;k++){
			addToOptions(childIndustries[code][k],level+1);
		}
	}
}

function getParentIndustriesList(industries){
	//nlapiLogExecution('DEBUG','GettingParentIndustriesList','yup');
	
	var filters = new Array(new nlobjSearchFilter('custrecordr7hooversindustryid',null,'isnotempty')); 
	var columns = new Array(new nlobjSearchColumn('custrecordr7hooversparentindustryid'),
							new nlobjSearchColumn('custrecordr7hooversindustryid'));
	var allEntries = nlapiSearchRecord('customrecordr7hooversindustrytypes',null,filters,columns);
	
	//if(allEntries!=null){nlapiLogExecution('DEBUG','AllEntries.length',allEntries.length);}
	
	var allIndustries = new Array();
	for(var i=0;allEntries!=null && i<allEntries.length;i++){
		var industryId = allEntries[i].getValue(columns[1]);
		//nlapiLogExecution('DEBUG','IndustryId',industryId);
		var parentIndustryId = allEntries[i].getValue(columns[0]);
		//nlapiLogExecution('DEBUG','ParentIndustryId',parentIndustryId);
		if(parentIndustryId!=null && parentIndustryId!=''){
			if(allIndustries[parentIndustryId]!=null){
				var entry=allIndustries[parentIndustryId];
				entry[entry.length]=industryId;
				allIndustries[parentIndustryId]=entry;
			}
			else{
				var entry = new Array();
				entry[0]=industryId;
				allIndustries[parentIndustryId]=entry;
			}
		}		
	}
	this.allParentIndustriesList = allIndustries;
}


function expandedIndustries(industries){
	getParentIndustriesList();
	if(industries==null){return null;}
	var existingList = new Array();
	
	//nlapiLogExecution('DEBUG','Expanding Industry Query','----------------------');
	
	for(var i=0;i<industries.length;i++){
		if(existingList[industries[i]]!=1){
			var children = new Array(); 
			children = returnChildren(industries[i]);
			industries = industries.concat(children);
			for(var j=0;children!=null && j<children.length;j++){
				existingList[children[j]]=1;
			}
		}	
	}
	//nlapiLogExecution('DEBUG','Done Expanding Industry Query','----------------------');
	return industries;
}

function returnChildren(parentId){
	if(allParentIndustriesList[parentId]!=null){
		///nlapiLogExecution('DEBUG','Children Returned.Length',allParentIndustriesList[parentId].length);
	}
	var children = new Array();
	for(var i=0;allParentIndustriesList[parentId]!=null && i< allParentIndustriesList[parentId].length;i++){
		var value = allParentIndustriesList[parentId][i];
		//nlapiLogExecution('DEBUG','Value of Children',value);
		children[children.length]=parseInt(value);
		var furtherChildren = returnChildren(value);
		if (furtherChildren != null) {
			children = children.concat(furtherChildren);
		}
	}
	return children;
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
