/*
 * @author efagone
 * This suitelet is just the landing suitelet for the Hoovers suitelet (replaced portlet)
 */

function action(request, response){

	/* Finding Forbidden Territories */
	this.forbiddenTerritories = obtainForbiddenTerritories();
	/* Done Finding Forbidden Territories */
	
	/* Obtain Hoovers API Key */
	this.hooversAPIKey = nlapiGetContext().getSetting('SCRIPT', 'custscriptr7hooversapikey');
	/* Done obtaining Hoover API Key */
		
	/* Set the page fields with parameter values */
	
	var form = nlapiCreateForm('NS-Hoovers BETA', false);
	form.setScript('customscriptr7hooversconfirmbutton');
	
	var coNameField = form.addField('custpage_coname', 'text', 'Company Name:', null);
	var coKeywordField = form.addField('custpage_cokeyword', 'text', 'Search Keyword:', null);
	var formDunsNoField = form.addField('custpage_formdunsno', 'integer', 'DUNS#:', null);
	var ultimateDunsNoField = form.addField('custpage_ultimateparentdunsno', 'integer', 'Ultimate Parent DUNS#:', null);
	
	// Industries
	var industryField = form.addField('custpage_industryfield', 'multiselect', 'Industry:');
	var industrySelectOptions = obtainIndustrySelectOptions();
	for (i = 0; industrySelectOptions != null && i < industrySelectOptions.length; i++) {
		var name = industrySelectOptions[i][0];
		var code = industrySelectOptions[i][1];
		industryField.addSelectOption(code, name);
	}
	industryField.setDisplaySize(400, 20);
	
	
	var annualSalesRangeFromField = form.addField('custpage_annualsalesfromfield', 'currency', 'Annual Sales From($mil):', null);
	annualSalesRangeFromField.setLayoutType('normal', 'startcol');
	var annualSalesRangeToField = form.addField('custpage_annualsalestofield', 'currency', 'Annual Sales To($mil):', null);
	var empRangeFromField = form.addField('custpage_emprangefromfield', 'integer', 'Employee Range From:', null);
	var empRangeToField = form.addField('custpage_emprangetofield', 'integer', 'Employee Range To:', null);
	var naicsField = form.addField('custpage_naicsfield', 'text', 'NAICS(atleast first 2):', null);
	var sicField = form.addField('custpage_sicfield', 'text', 'SIC(atleast first 2):', null);
	var areaCodeField = form.addField('custpage_areacodefield', 'text', 'Area Code:', null);
	var cityField = form.addField('custpage_cityfield', 'text', 'City:', null);
	
	var globalStateField = form.addField('custpage_globalstatefield', 'text', 'GlobalState:', null);
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
	regionField.setDefaultValue('7');
	
	var countryField = form.addField('custpage_country', 'select', 'Country:');
	var columns = new Array(new nlobjSearchColumn('custrecordr7hooverscountryid'), new nlobjSearchColumn('custrecordr7hooverscountry'));
	var searchResults = nlapiSearchRecord('customrecordr7hooverscountrymap', 2503, null, columns);
	countryField.addSelectOption('', '');
	for (i = 0; i < searchResults.length && searchResults != null; i++) {
		id = searchResults[i].getValue('custrecordr7hooverscountryid');
		tag = searchResults[i].getValue('custrecordr7hooverscountry');
		countryField.addSelectOption(id, tag);
	}
	
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

	var milesWithinField = form.addField('custpage_mileswithin', 'text', 'Miles Within:', null);
	
	var zipField = form.addField('custpage_zipfield', 'text', 'ZIP:', null);
	// zipField.setDisplayType('hidden');
	
	
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
	orderByField.setDefaultValue('SalesUS');
	orderByField.setLayoutType('outsidebelow');
	
	
	allAnyField = form.addField('custpage_allany', 'checkbox', 'Match All:', null);
	allAnyField.setDefaultValue('T');
	allAnyField.setLayoutType('outsidebelow');
	
	var maxResults = form.addField('custpage_resultsperpage', 'integer', 'Max Records:');
	maxResults.setDefaultValue(50);
	maxResults.setDisplayType('hidden');
	
	var errorTextField = form.addField('custpage_erroralert', 'longtext', 'Error:');
	errorTextField.setDisplayType('hidden');
	
	/* Done setting the page fields with parameter values */

	form.addButton('custpage_button3', 'Search', 'searchAgain');
	
	
	/* Done adding buttons to the form based on kind of results returned */
	response.writePage(form);
	
}


function obtainForbiddenTerritories() {

	var empRecord = nlapiLoadRecord('employee',nlapiGetUser());
	var	mySalesTerritories = empRecord.getFieldValues('custentityr7salesterritoryassignment');
	this.myTer = new Array();
	for( var j=0;mySalesTerritories!=null && j<mySalesTerritories;j++){
		myTer[myTer.length]=mySalesTerritories[j];
	}
	
	
	var searchColumns = new Array(
	new nlobjSearchColumn('custrecordr7salesterritorymapassignment'),
	new nlobjSearchColumn('custrecordr7salesterritorymapcountry'),
	new nlobjSearchColumn('custrecordr7salesterritorymapstate')	
	);
	
	var searchFilters = new Array();
	if (mySalesTerritories != null && mySalesTerritories != '') {
		searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7salesterritorymapassignment', null, 'noneof', mySalesTerritories);
	}
	
	var searchResults = nlapiSearchRecord('customrecordr7salesterritorymap',null, searchFilters, searchColumns);
	
	var countryStates = new Array();
	for(var i=0;searchResults!=null && i<searchResults.length;i++){
		var country = searchResults[i].getText(searchColumns[1])
		var state = searchResults[i].getText(searchColumns[2]);
		if(state!=null){
		var countryState = country + '-' + state;
		}
		countryStates[countryState]=1;
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
