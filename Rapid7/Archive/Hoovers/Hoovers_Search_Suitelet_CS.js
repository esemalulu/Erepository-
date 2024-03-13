//Soap Requests from inside SuiteScript??
//https://usergroup.netsuite.com/users/showthread.php?t=3561&highlight=soap+request+suitescript

function pageInit(){
	nlapiDisableLineItemField('custpage_sublistmult', 'custpage_sublist_check', false);
	var errorText = nlapiGetFieldValue('custpage_erroralert');
	if(errorText!=null && errorText.length >=50){
		alert(errorText);
	}
	window.onbeforeunload = function() {};
}

function fieldChanged(type, name, linenum){
	var value = nlapiGetLineItemValue('custpage_sublistmult', name, linenum);
	if(value=='T'){
		var coName = nlapiGetLineItemValue('custpage_sublistmult', 'custpage_sublist_name', linenum);	
		var ter = nlapiGetLineItemValue('custpage_sublistmult', 'custpage_sublist_territory', linenum);
		var salesRep = nlapiGetLineItemValue('custpage_sublistmult', 'custpage_sublist_salesrep', linenum);
	if(salesRep.length>=2){
		alert("Hoovers Netsuite Alert:\nThis company already exists in NetSuite and is assigned to " + salesRep);		  
		nlapiSetLineItemValue(type, name, linenum, 'F');
	}
	else if(ter!='IN'){
		alert('Hoovers Netsuite Alert:\n' + coName + " is not in your assigned territory.  Please see a manager for more information.");
		nlapiSetLineItemValue(type, name, linenum, 'F');
	}
	var count =0;
	for(var i=1;i<=nlapiGetLineItemCount('custpage_sublistmult');i++){
		if(nlapiGetLineItemValue('custpage_sublistmult', name, i)=='T'){
			count++;
		}
		if(count >3){
			alert("Hoovers Netsuite Alert:\nRecord Creation Limit:3                ");
			nlapiSetLineItemValue(type, name, linenum, 'F');
			break;
		}
	}
	}
}

function buttonClicked(){

	var count = nlapiGetLineItemCount('custpage_sublistmult');
	//alert(count);
	
	var recordArray = new Array();
	for (var i = 1; i <= count; i++) {
		value = nlapiGetLineItemValue('custpage_sublistmult', 'custpage_sublist_check', i);
		var name = '';
		var dunsNo = '';
		var status = '';
		var internalId = '';
		if (value == 'T') {
			dunsNo = nlapiGetLineItemValue('custpage_sublistmult', 'custpage_sublist_dunsno', i);
			name = nlapiGetLineItemValue('custpage_sublistmult', 'custpage_sublist_name', i);
			status = nlapiGetLineItemValue('custpage_sublistmult', 'custpage_sublist_activestatus', i);
			internalId = nlapiGetLineItemValue('custpage_sublistmult', 'custpage_sublist_internalid', i);
			
			var cRecord = new Array();
			cRecord['dunsNo'] = dunsNo;
			cRecord['name'] = name;
			cRecord['status'] = status;
			cRecord['internalId'] = internalId;
			cRecord['entityId'] = name;
			
			recordArray[recordArray.length] = cRecord;
		}
	}
	//alert("Found the names");
	
	if (recordArray.length >= 1) {
		var confirmed = confirm('Are you sure you would like to create these customers?');
		if (confirmed) {
			var id = '';
			
			//alert(recordArray.length);
			for (var j = 0; j < recordArray.length; j++) {
				id = createCustomerRecord(recordArray[j]);
				//alert("Submitting the records");
			}
			//var url = nlapiResolveURL('RECORD', 'lead', id, 'VIEW');
			//var url = "/app/common/search/searchresults.nl?searchid=2494";
			//response.sendRedirect('TASKLINK','LIST_SEARCHRESULTS','customsearch2352',null,  {'searchid' : '2335' });
			//window.location = url;
			searchAgain();
		}
		
	}
	else {
		alert('You have not selected any records to create.');
	}
}




function createCustomerRecord(cRecord){
	if (cRecord['internalId'] != null && cRecord['internalId'].length >= 2) {
		var salesRep = nlapiGetUser();
		alert(salesRep);
		var name = nlapiGetContext().getName();
		alert(name);
		alert(salesRep + " " + cRecord['internalId']);
		nlapiSubmitField('customer', cRecord['internalId'], new Array('salesrep', 'custentityr7hooversupdateflag', 'custentityr7territoryassignmentflag'), new Array(salesRep, 'T', 'T'));		
		var id = cRecord['internalId'];
		alert("Successfully updated customer " + cRecord['name'] + " with SalesRep " + name);
	}
	else {
		var result = checkRecordExists(cRecord);
		cRecord = result[0];
		txt = result[1];
		
		var custRecord = nlapiCreateRecord('lead');
		custRecord.setFieldValue('leadsource', 126762);
		custRecord.setFieldValue('custentityr7hooversupdateflag', 'T');
		custRecord.setFieldValue('custentityr7dunsnumber', cRecord['dunsNo']);
		custRecord.setFieldValue('entityid', cRecord['entityId']);
		custRecord.setFieldValue('companyname', cRecord['name']);
		custRecord.setFieldValue('entitystatus', 51);
		custRecord.setFieldValue('custentityr7territoryassignmentflag', 'T');
		          
		//alert("boom here");
		try {
			var id = nlapiSubmitRecord(custRecord, null, true);
			var name = nlapiGetContext().getName();
			
			if (txt.length >= 50) {
				alert(txt);
			}
			
			alert('Hoovers Netsuite Alert:\n' +
			"Successfully created customer " +
			cRecord['name'] +
			" with SalesRep " +
			name);
		} 
		catch (err) {
			alert("Error: " + err.description);
		}
	}
	return id;
}

function checkRecordExists(cRecord){
	//alert("here");
	var dupEmail = nlapiGetContext().getSetting('SCRIPT','custscriptr7hooversdupemail');
	var dupEmailCC = nlapiGetContext().getSetting('SCRIPT','custscriptr7hooversdupemailcc');
	var dupEmailBCC = nlapiGetContext().getSetting('SCRIPT','custscriptr7hooversdupemailbcc');
			
	var columns = new Array(new nlobjSearchColumn('entityid'),new nlobjSearchColumn('salesrep'), new nlobjSearchColumn('internalid'));
	var filters = new Array(new nlobjSearchFilter('companyname',null,'is',cRecord['name']));
	var searchResults = nlapiSearchRecord('customer', null, filters, columns);
	var txt ='Hoovers Netsuite Alert:\n';
	if(searchResults!=null && searchResults.length>=1){
		//alert("cos found");
		var salesRep = searchResults[0].getText('salesRep');
		cRecord['entityId'] += "." + (searchResults.length + 1);
		if(salesRep!=null && salesRep.length>=1){
			txt = "The company " + cRecord['name'] + " is a potential duplicate with " + cRecord['name'] + 
			" assigned to " + salesRep + ". A record will be created for you but you should investigate the possible duplicate record"; 
		}
		else{
			txt = "The company " + cRecord['name'] + " is a potential duplicate with " + cRecord['name'] + 
			". A record will be created for you but you should investigate the possible duplicate record";
		}
		//alert(txt);
		var emailText = "A duplicate record has potentially been created in Netsuite. \n\n" +			
						cRecord['entityId'] + " is a potential duplicate of " + cRecord['name'] + "\n\n" +
						cRecord['entityId'] + " has been recently created by " + nlapiGetContext().getName() + "\n\n\n" + 
						"Please investigate. \n" + 
						"Thank You. \n";
		//alert(dupEmail + emailText + dupEmailCC + dupEmailBCC);
		nlapiSendEmail(2,dupEmail,"Potential Duplicate Record",emailText,dupEmailCC, dupEmailBCC);
	}
	return new Array(cRecord,txt);
}

function previousResultPage(){
	
	
	var coNameField = escape(nlapiGetFieldValue('custpage_coname'));	
	var coKeywordField = escape(nlapiGetFieldValue('custpage_cokeyword')); 
	var dunsNoField = nlapiGetFieldValue('custpage_formdunsno');
	var ultimateDunsNoField = nlapiGetFieldValue('custpage_ultimateparentdunsno');
	var industryField = nlapiGetFieldValue('custpage_industryfield');
    
	var empRangeFromField = nlapiGetFieldValue('custpage_emprangefromfield');
	var empRangeToField = nlapiGetFieldValue('custpage_emprangetofield');
	var annualSalesRangeFromField = nlapiGetFieldValue('custpage_annualsalesfromfield');
	var annualSalesRangeToField = nlapiGetFieldValue('custpage_annualsalestofield');

	var naicsField = nlapiGetFieldValue('custpage_naicsfield');
	var sicField = nlapiGetFieldValue('custpage_sicfield');
	var areaCodeField = nlapiGetFieldValue('custpage_areacodefield');
	var cityField = escape(nlapiGetFieldValue('custpage_cityfield')); 
	var globalStateField = escape(nlapiGetFieldValue('custpage_globalstatefield')); 
	var regionField = nlapiGetFieldValue('custpage_region');
	var countryField = nlapiGetFieldValue('custpage_country');
	var stateField = nlapiGetFieldValue('custpage_statefield');
	var metroAreaField = nlapiGetFieldValue('custpage_metroareafield');
	var milesWithinField = nlapiGetFieldValue('custpage_mileswithin');
	var zipField = nlapiGetFieldValue('custpage_zipfield');
	var orderByField = nlapiGetFieldValue('custpage_orderby');
	var allAnyField = nlapiGetFieldValue('custpage_allany');
	var resultsPerPageField = nlapiGetFieldValue('custpage_resultsperpage');
	var hitOffsetField = nlapiGetFieldValue('custpage_hitoffset');
	var basicOrAdvancedField = nlapiGetFieldValue('custpage_basicoradvanced');
	
	hitOffsetField -= parseInt(resultsPerPageField);

	
	var baseUrl = nlapiResolveURL('SUITELET','customscriptr7hooverspopup', 'customdeployr7hooverspopup');
	var url3 = baseUrl +
	'&custparamcustomername=' + coNameField +
	'&custparamcustomerkeyword=' + coKeywordField +
	'&custparamdunsno=' + dunsNoField +
	'&custparamultimateparentduns=' + ultimateDunsNoField +
	'&custparamindustrytype=' + industryField +
	'&custparamannualsalesrangefrom=' + annualSalesRangeFromField +
	'&custparamannualsalesrangeto='+ annualSalesRangeToField +
	'&custparamemprangefrom='+ empRangeFromField +
	'&custparamemprangeto=' + empRangeToField +
	'&custparamnaics=' + naicsField + 
	'&custparamnetsic=' + sicField +
	'&custparamareacode=' + areaCodeField +
	'&custparamcity=' + cityField +
	'&custparamglobalstate=' + globalStateField +
	'&custparamregion=' + regionField + 
	'&custparamcountry=' + countryField +
	'&custparamusstate=' + stateField +
	'&custparammetroarea=' + metroAreaField + 
	'&custparammileswithin=' + milesWithinField +
	'&custparamzip=' + zipField + 
	'&custparamorderby=' + orderByField + 
	'&custparamallany=' + allAnyField + 
	'&custparamhitoffset=' + hitOffsetField + 
	'&custparamresultsperpage=' + resultsPerPageField +
	'&custparambasicoradvanced='+ basicOrAdvancedField ;
	
	//alert(url3);
	
	window.location = url3;
}

function nextResultPage(){
	/* Constructing the 'Next Page' search 
	 * First, we read the search parameter values from the page
	 * Then we increment the hitOffSet Counter
	 */
	
		var coNameField = escape(nlapiGetFieldValue('custpage_coname'));	
		var coKeywordField = escape(nlapiGetFieldValue('custpage_cokeyword')); 
		var dunsNoField = nlapiGetFieldValue('custpage_formdunsno');
		var ultimateDunsNoField = nlapiGetFieldValue('custpage_ultimateparentdunsno');
		var industryField = nlapiGetFieldValue('custpage_industryfield');
	    
		var empRangeFromField = nlapiGetFieldValue('custpage_emprangefromfield');
		var empRangeToField = nlapiGetFieldValue('custpage_emprangetofield');
		var annualSalesRangeFromField = nlapiGetFieldValue('custpage_annualsalesfromfield');
		var annualSalesRangeToField = nlapiGetFieldValue('custpage_annualsalestofield');

		var naicsField = nlapiGetFieldValue('custpage_naicsfield');
		var sicField = nlapiGetFieldValue('custpage_sicfield');
		var areaCodeField = nlapiGetFieldValue('custpage_areacodefield');
		var cityField = escape(nlapiGetFieldValue('custpage_cityfield')); 
		var globalStateField = escape(nlapiGetFieldValue('custpage_globalstatefield')); 
		var regionField = nlapiGetFieldValue('custpage_region');
		var countryField = nlapiGetFieldValue('custpage_country');
		var stateField = nlapiGetFieldValue('custpage_statefield');
		var metroAreaField = nlapiGetFieldValue('custpage_metroareafield');
		var milesWithinField = nlapiGetFieldValue('custpage_mileswithin');
		var zipField = nlapiGetFieldValue('custpage_zipfield');
		var orderByField = nlapiGetFieldValue('custpage_orderby');
		var allAnyField = nlapiGetFieldValue('custpage_allany');
		var resultsPerPageField = nlapiGetFieldValue('custpage_resultsperpage');
		var hitOffsetField = nlapiGetFieldValue('custpage_hitoffset');
		var basicOrAdvancedField = nlapiGetFieldValue('custpage_basicoradvanced');
	
		hitOffsetField = parseInt(hitOffsetField) + parseInt(resultsPerPageField);
	
	var baseUrl = nlapiResolveURL('SUITELET','customscriptr7hooverspopup', 'customdeployr7hooverspopup');
	var url3 = baseUrl +
	'&custparamcustomername=' + coNameField +
	'&custparamcustomerkeyword=' + coKeywordField +
	'&custparamdunsno=' + dunsNoField +
	'&custparamultimateparentduns=' + ultimateDunsNoField +
	'&custparamindustrytype=' + industryField +
	'&custparamannualsalesrangefrom=' + annualSalesRangeFromField +
	'&custparamannualsalesrangeto='+ annualSalesRangeToField +
	'&custparamemprangefrom='+ empRangeFromField +
	'&custparamemprangeto=' + empRangeToField +
	'&custparamnaics=' + naicsField + 
	'&custparamnetsic=' + sicField +
	'&custparamareacode=' + areaCodeField +
	'&custparamcity=' + cityField +
	'&custparamglobalstate=' + globalStateField +
	'&custparamregion=' + regionField + 
	'&custparamcountry=' + countryField +
	'&custparamusstate=' + stateField +
	'&custparammetroarea=' + metroAreaField + 
	'&custparammileswithin=' + milesWithinField +
	'&custparamzip=' + zipField + 
	'&custparamorderby=' + orderByField + 
	'&custparamallany=' + allAnyField + 
	'&custparamhitoffset=' + hitOffsetField + 
	'&custparamresultsperpage=' + resultsPerPageField +
	'&custparambasicoradvanced='+ basicOrAdvancedField ;
	
	//alert(url3);
	
	window.location = url3;
}

function searchAgain(){
	//nlapiGetField Value parameters from the page, and nlapiRequestUrl the bitch.
	
	var coNameField = escape(nlapiGetFieldValue('custpage_coname'));	
	var coKeywordField = escape(nlapiGetFieldValue('custpage_cokeyword')); 
	var dunsNoField = nlapiGetFieldValue('custpage_formdunsno');
	var ultimateDunsNoField = nlapiGetFieldValue('custpage_ultimateparentdunsno');
	var industryField = nlapiGetFieldValue('custpage_industryfield');
    
	var empRangeFromField = nlapiGetFieldValue('custpage_emprangefromfield');
	var empRangeToField = nlapiGetFieldValue('custpage_emprangetofield');
	var annualSalesRangeFromField = nlapiGetFieldValue('custpage_annualsalesfromfield');
	var annualSalesRangeToField = nlapiGetFieldValue('custpage_annualsalestofield');

	var naicsField = nlapiGetFieldValue('custpage_naicsfield');
	var sicField = nlapiGetFieldValue('custpage_sicfield');
	var areaCodeField = nlapiGetFieldValue('custpage_areacodefield');
	var cityField = escape(nlapiGetFieldValue('custpage_cityfield')); 
	var globalStateField = escape(nlapiGetFieldValue('custpage_globalstatefield')); 
	var regionField = nlapiGetFieldValue('custpage_region');
	var countryField = nlapiGetFieldValue('custpage_country');
	var stateField = nlapiGetFieldValue('custpage_statefield');
	var metroAreaField = nlapiGetFieldValue('custpage_metroareafield');
	var milesWithinField = nlapiGetFieldValue('custpage_mileswithin');
	var zipField = nlapiGetFieldValue('custpage_zipfield');
	var orderByField = nlapiGetFieldValue('custpage_orderby');
	var allAnyField = nlapiGetFieldValue('custpage_allany');
	var resultsPerPageField = nlapiGetFieldValue('custpage_resultsperpage');
	var hitOffsetField = nlapiGetFieldValue('custpage_hitoffset');
	var basicOrAdvancedField = nlapiGetFieldValue('custpage_basicoradvanced');
	
	hitOffsetField =0;
	
	var baseUrl = nlapiResolveURL('SUITELET','customscriptr7hooverspopup', 'customdeployr7hooverspopup');
	var url3 = baseUrl +
	'&custparamcustomername=' + coNameField +
	'&custparamcustomerkeyword=' + coKeywordField +
	'&custparamdunsno=' + dunsNoField +
	'&custparamultimateparentduns=' + ultimateDunsNoField +
	'&custparamindustrytype=' + industryField +
	'&custparamannualsalesrangefrom=' + annualSalesRangeFromField +
	'&custparamannualsalesrangeto='+ annualSalesRangeToField +
	'&custparamemprangefrom='+ empRangeFromField +
	'&custparamemprangeto=' + empRangeToField +
	'&custparamnaics=' + naicsField + 
	'&custparamnetsic=' + sicField +
	'&custparamareacode=' + areaCodeField +
	'&custparamcity=' + cityField +
	'&custparamglobalstate=' + globalStateField +
	'&custparamregion=' + regionField + 
	'&custparamcountry=' + countryField +
	'&custparamusstate=' + stateField +
	'&custparammetroarea=' + metroAreaField + 
	'&custparammileswithin=' + milesWithinField +
	'&custparamzip=' + zipField + 
	'&custparamorderby=' + orderByField + 
	'&custparamallany=' + allAnyField + 
	'&custparamhitoffset=' + hitOffsetField + 
	'&custparamresultsperpage=' + resultsPerPageField +
	'&custparambasicoradvanced='+ basicOrAdvancedField ;

	//alert(url3);
	window.location = url3;
	
}

