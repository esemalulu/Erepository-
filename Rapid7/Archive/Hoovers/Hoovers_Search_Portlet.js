/**
 * @author suvarshi
 * https://usergroup.netsuite.com/users/showthread.php?p=94008#post94008
 */

function callSuitelet(portlet, column){
	
	nlapiLogExecution('DEBUG','Badamamam', 'In this portlet');
	
	var noSearchResults = nlapiGetContext().getSetting('SCRIPT','custscriptr7hooverssearchresultsadv');
	//var noSearchResults = nlapiGetContext().getSetting('SCRIPT','custscriptr7hooversnosearchresultsbas');
	
	portlet.setTitle('Netsuite Hoovers 3.3 BETA');
	//portlet.setRefreshInterval(80);

		
		var fld1 = portlet.addField('custparamcustomername', 'text', 'Company Name:');
		//fld1.setLayoutType('outside','startcol');
		var fld2 = portlet.addField('custparamcustomerkeyword', 'text', 'Search Keyword:');
		var fld3 = portlet.addField('custparamdunsno', 'integer', 'DUNS#:');
		var fld4 = portlet.addField('custparamultimateparentduns', 'integer', 'Ultimate Parent DUNS#:');
		
		
		var fld5 = portlet.addField('custparamindustrytype', 'multiselect', 'Industry:');
		var industrySelectOptions = obtainIndustrySelectOptions();
		for (i = 0; industrySelectOptions != null && i < industrySelectOptions.length; i++) {
			var name = industrySelectOptions[i][0];
			var code = industrySelectOptions[i][1];
			fld5.addSelectOption(code, name);
		}
		
		fld5.setDisplaySize(300, 20);
		
		var fld7 = portlet.addField('custparamannualsalesrangefrom', 'currency', 'Annual Sales From($mil):');
		
		//fld7.setBreakType('startcol');
		fld7.setLayoutType('normal', 'startcol');
		
		
		
		var fld8 = portlet.addField('custparamannualsalesrangeto', 'currency', 'Annual Sales To($mil):');
		//fld8.setBreakType('startcol');
		//fld8.setLayoutType('normal','startcol');
		
		var fld9 = portlet.addField('custparamemprangefrom', 'integer', 'Employee Range From:');
		var fld10 = portlet.addField('custparamemprangeto', 'integer', 'Employee Range To:');
		//var fld11 = portlet.addField('custparammktcaprangefrom','currency','MarketCap Range From:');
		//var fld12 = portlet.addField('custparammktcaprangeto','currency','To:');
		var fld15 = portlet.addField('custparamnaics', 'text', 'NAICS(atleast first 2):');
		var fld16 = portlet.addField('custparamnetsic', 'text', 'SIC(atleast first 2):');
		var fld13 = portlet.addField('custparamareacode', 'text', 'Area Code:');
		var fld14 = portlet.addField('custparamcity', 'text', 'City:');
		var fld145 = portlet.addField('custparamglobalstate', 'text', 'Global State:');
		fld145.setLayoutType('normal', 'startcol');
		
		var fld19 = portlet.addField('custparamregion', 'select', 'Region:');
		var columns = new Array(new nlobjSearchColumn('custrecordr7hooversregionid'), new nlobjSearchColumn('custrecordr7hooversregiontype'));
		var searchResults = nlapiSearchRecord('customrecordr7hooversregiontypes', null, null, columns);
		fld19.addSelectOption('', '');
		for (i = 0; i < searchResults.length && searchResults != null; i++) {
			id = searchResults[i].getValue('custrecordr7hooversregionid');
			tag = searchResults[i].getValue('custrecordr7hooversregiontype');
			fld19.addSelectOption(id, tag);
		}
		fld19.setDefaultValue('7');
		
		var fld20 = portlet.addField('custparamcountry', 'select', 'Country:');
		//fld20.setLayoutType('normal','startcol');
		var columns = new Array(new nlobjSearchColumn('custrecordr7hooverscountryid'), new nlobjSearchColumn('custrecordr7hooverscountry'));
		var searchResults = nlapiSearchRecord('customrecordr7hooverscountrymap', 2503, null, columns);
		fld20.addSelectOption('', '');
		for (i = 0; i < searchResults.length && searchResults != null; i++) {
			id = searchResults[i].getValue('custrecordr7hooverscountryid');
			tag = searchResults[i].getValue('custrecordr7hooverscountry');
			fld20.addSelectOption(id, tag);
		}
		
		
		var fld21 = portlet.addField('custparamusstate', 'select', 'US State:');
		fld21.addSelectOption('', '');
		fld21.addSelectOption('Al', 'Alabama');
		fld21.addSelectOption('AK', 'Alaska');
		//fld21.addSelectOption('AS','American Samoa');
		fld21.addSelectOption('AZ', 'Arizona');
		fld21.addSelectOption('AR', 'Arkansas');
		fld21.addSelectOption('CA', 'California');
		fld21.addSelectOption('CO', 'Colorado');
		fld21.addSelectOption('CT', 'Connecticut');
		fld21.addSelectOption('DE', 'Delaware');
		fld21.addSelectOption('DC', 'District of Columbia');
		//fld21.addSelectOption('FM','Federated State of Micronesia');
		fld21.addSelectOption('FL', 'Florida');
		fld21.addSelectOption('GA', 'Georgia');
		//fld21.addSelectOption('GU','Guam');
		fld21.addSelectOption('HI', 'Hawaii');
		fld21.addSelectOption('ID', 'Idaho');
		fld21.addSelectOption('IL', 'Illinois');
		fld21.addSelectOption('IN', 'Indiana');
		fld21.addSelectOption('IA', 'Iowa');
		fld21.addSelectOption('KS', 'Kansas');
		fld21.addSelectOption('KY', 'Kentucky');
		fld21.addSelectOption('LA', 'Louisiana');
		fld21.addSelectOption('ME', 'Maine');
		//fld21.addSelectOption('MH','Marshall Islands');
		fld21.addSelectOption('MD', 'Maryland');
		fld21.addSelectOption('MA', 'Massachusetts');
		fld21.addSelectOption('MI', 'Michigan');
		fld21.addSelectOption('MN', 'Minnesota');
		fld21.addSelectOption('MS', 'Mississippi');
		fld21.addSelectOption('MO', 'Missouri');
		fld21.addSelectOption('MT', 'Montana');
		fld21.addSelectOption('NE', 'Nebraska');
		fld21.addSelectOption('NV', 'Nevada');
		fld21.addSelectOption('NH', 'New Hampshire');
		fld21.addSelectOption('NJ', 'New Jersey');
		fld21.addSelectOption('NM', 'New Mexico');
		fld21.addSelectOption('NY', 'New York');
		fld21.addSelectOption('NC', 'North Carolina');
		fld21.addSelectOption('ND', 'North Dakota');
		//fld21.addSelectOption('MP','Northern Mariana Islands');
		fld21.addSelectOption('OH', 'Ohio');
		fld21.addSelectOption('OK', 'Oklahoma');
		fld21.addSelectOption('OR', 'Oregon');
		//fld21.addSelectOption('PW','Palau');
		fld21.addSelectOption('PA', 'Pennsylvania');
		//fld21.addSelectOption('PR','Puerto Rico');
		fld21.addSelectOption('RI', 'Rhode Island');
		fld21.addSelectOption('SC', 'South Carolina');
		fld21.addSelectOption('SD', 'South Dakota');
		fld21.addSelectOption('TN', 'Tennessee');
		fld21.addSelectOption('TX', 'Texas');
		fld21.addSelectOption('UT', 'Utah');
		fld21.addSelectOption('VT', 'Vermont');
		//fld21.addSelectOption('VI','Virgin Islands');
		fld21.addSelectOption('VA', 'Virginia');
		fld21.addSelectOption('WA', 'Washington');
		fld21.addSelectOption('WV', 'West Virginia');
		fld21.addSelectOption('WI', 'Wisconsin');
		fld21.addSelectOption('WY', 'Wyoming');
		
		var fld22 = portlet.addField('custparammetroarea', 'select', 'Metro Area:');
		var columns = new Array(new nlobjSearchColumn('custrecordr7hooversmetroname'), new nlobjSearchColumn('custrecordr7hooversmetroid'));
		var searchResults = nlapiSearchRecord('customrecordr7hooversmetroareas', null, null, columns);
		var id, tag;
		fld22.addSelectOption('', '');
		for (var i = 0; i < searchResults.length && searchResults != null; i++) {
			id = searchResults[i].getValue('custrecordr7hooversmetroid');
			tag = searchResults[i].getValue('custrecordr7hooversmetroname');
			fld22.addSelectOption(id, tag);
		}
		var fld17 = portlet.addField('custparammileswithin', 'integer', 'Miles within:');
		var fld18 = portlet.addField('custparamzip', 'text', 'Zip Code:');
		
		
		var fld21 = portlet.addField('custparamorderby', 'select', '   Order By:');
		fld21.addSelectOption('', '');
		fld21.addSelectOption('CompanyName', 'Company Name');
		fld21.addSelectOption('TotalAssets', 'Total Assets');
		fld21.addSelectOption('EmployeesTotal', 'Employee Total');
		fld21.addSelectOption('MarketCap', 'Market Capitalization');
		fld21.addSelectOption('NetIncome', 'Net Income');
		fld21.addSelectOption('SalesUS', 'Sales US');
		fld21.addSelectOption('SalesUK', 'Sales UK');
		fld21.addSelectOption('SalesGrowth12Mon', '12 Month Sales Growth');
		fld21.addSelectOption('NetIncomeGrowth12Mon', '12 Month NetIncome Growth');
		fld21.addSelectOption('EmployeeGrowth12Mon', '12 Month Employee Growth');
		fld21.addSelectOption('NetMargin', 'Net Margin');
		fld21.addSelectOption('ROE', 'Return on Equity');
		fld21.addSelectOption('ROA', 'Return on Assets');
		fld21.addSelectOption('DividendRate', 'Dividend Rate');
		fld21.setLayoutType('outsidebelow');
		
		var fld22 = portlet.addField('custparamresultsperpage', 'integer', 'Max Records:');
		//fld16.setDisplayType('hidden');
		if (noSearchResults == null || noSearchResults == '' || noSearchResults == ' ') {
			noSearchResults = 40;
		}
		fld22.setDefaultValue(noSearchResults);
		//fld16.setDisplaySize(30);
		fld22.setLayoutType('outsidebelow', 'startrow');
		
		fld23 = portlet.addField('custparamallany', 'checkbox', 'Match All:');
		fld23.setDefaultValue('T');
		fld23.setLayoutType('outsidebelow', 'startrow');
		
		var fld24 = portlet.addField('custparamhitoffset', 'integer', 'Hit Offset');
		fld24.setDisplayType('hidden');
		fld24.setDefaultValue(0);
		
		var fld25 = portlet.addField('custparambasicoradvanced', 'text', 'Basic or Advanced');
		fld25.setDisplayType('hidden');
		
		portlet.setSubmitButton(
		nlapiResolveURL('SUITELET', 'customscriptr7hooverspopup', 'customdeployr7hooverspopup'), 
		'Submit',
		'abc');
	
	/*	
	}else{
			portlet.setTitle('Notice: Hoovers Integration is offline for maintenance from Oct 1,2010');
			var fld2 = portlet.addField('custparamcustomerkeyword', 'text', 'The Hoovers-Netsuite integration is offline for maintenance.');	
			fld2.setDisplaySize(0,0);
			fld2.setDisplayType('inline');
	}
	*/
    
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
