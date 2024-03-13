/*
 * @author suvarshi
 */

var	HOOVERS_SERVICE_URL = 'http://dnbdirect-api.dnb.com/DnBAPI-15';
var	HOOVERS_API_KEY = 'rjcrh44v93rhfh25ty56bg64';

function beforeLoad(type, form, request){

	var userId = nlapiGetUser();
	
	if (type == 'view') {
		var dunsNo = nlapiGetFieldValue('custentityr7dunsnumber');
		form.setScript('customscripthoovers_findcompetitors');
		if (dunsNo != null && dunsNo.length > 2) {
			form.addButton('custpage_findCompetition', 'Find Competitors', "findCompetitors('" + dunsNo + "')");
			form.addButton('custpage_updatehoovers', 'Update Hoovers Data', 'updateData()');
		}
		else {
			var name = nlapiGetFieldValue('companyname');
			form.addButton('custpage_matchhoovers', 'Match To Hoovers', "matchHoovers('" + name + "')");
		}
		
	}
}

function afterSubmit(type){

	try {
		
		if (nlapiGetUser() == 55011){
			return;
		}
		// --------------------- BEGIN ENVIRONMENT CHECK ---------------------
		if (['PRODUCTION'].indexOf(nlapiGetContext().getEnvironment()) == -1) {
			return;
		}
		// --------------------- END ENVIRONMENT CHECK ---------------------
	
		if (type == 'create' || type == 'edit' || type == 'xedit') {
		
			this.type = type;
			var user = nlapiGetUser();
			var recordId = nlapiGetRecordId();
			var record = nlapiGetNewRecord();
			var updateFlag = record.getFieldValue('custentityr7hooversupdateflag');
			
			
			if (updateFlag == 'T') {
			
				if (type == 'xedit') {
				
					var custFields = nlapiLookupField('customer', recordId, new Array('custentityr7dunsnumber', 'custentityr7hooversdateupdated', 'custentityr7hooversdatelastupdateattempt'));
					
					var dunsNo = custFields['custentityr7dunsnumber'];
					var minDaysLimit = nlapiGetContext().getSetting('SCRIPT', 'custscriptr7hooversmindaysupdate');
					var dateLastUpdated = custFields['custentityr7hooversdateupdated'];
					var dateLastAttemptUpdated = custFields['custentityr7hooversdatelastupdateattempt'];
					
					try {
						this.custRecord = nlapiLoadRecord('customer', recordId);
					} 
					catch (err) {
						try {
							this.custRecord = nlapiLoadRecord('lead', recordId);
						} 
						catch (err) {
							this.custRecord = nlapiLoadRecord('prospect', recordId);
						}
					}
				}
				
				if (type == 'create' || type == 'edit') {
				
					var dunsNo = record.getFieldValue('custentityr7dunsnumber');
					var minDaysLimit = nlapiGetContext().getSetting('SCRIPT', 'custscriptr7hooversmindaysupdate');
					var dateLastUpdated = record.getFieldValue('custentityr7hooversdateupdated');
					var dateLastAttemptUpdated = record.getFieldValue('custentityr7hooversdatelastupdateattempt');
				}
				
				if (dunsNo != null && dunsNo != '' && dunsNo.length >= 4) {
				
					var allowUpdate = false;
					
					if ((dateLastAttemptUpdated != null && dateLastAttemptUpdated != '') && (dateLastUpdated != null && dateLastUpdated != '')) {
						var minDate = nlapiAddDays(nlapiStringToDate(dateLastUpdated), minDaysLimit);
						nlapiLogExecution('DEBUG', 'Date when update will be allowed:', nlapiDateToString(minDate));
						var today = new Date();
						if (minDate < today) {
							allowUpdate = true;
						}
					}
					
					//If the record should be updated
					if ((dateLastAttemptUpdated == null || dateLastAttemptUpdated == '') || (dateLastUpdated == null || dateLastUpdated == '') || allowUpdate) {
					
						if (type != 'xedit') { //already grabbed the record for xedits
							try {
								this.custRecord = nlapiLoadRecord('customer', recordId);
							} 
							catch (err) {
								try {
									this.custRecord = nlapiLoadRecord('lead', recordId);
								} 
								catch (err) {
									this.custRecord = nlapiLoadRecord('prospect', recordId);
								}
							}
						}
						
						custRecord.setFieldValue('custentityr7hooversdatelastupdateattempt', nlapiDateToString(new Date()));
						
						//Process Company Basic Information(dunsNo);
						processCompanyBasicDetail(dunsNo);
						
						//Process Company Regular Information
						processRegularInformationCompany(dunsNo);
						
						//Process Company Financial Information			
						processCompanyFinancialSummaryInformation(dunsNo);
						
						custRecord.setFieldValue('custentityr7hooversupdateflag', 'F');
						
						date = nlapiDateToString(new Date());
						if (date != null) {
							custRecord.setFieldValue('custentityr7hooversdateupdated', date);
						}
						
						nlapiSubmitRecord(custRecord, false, true);
						nlapiLogExecution('DEBUG', 'Sucessfully submitted updated Hoovers Record', "Yes");
					}
				}
			}
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'ERROR on hoovers ss customer', e);
		nlapiSendEmail(55011, 55011, 'ERROR on hoovers ss customer', 'Error: \n\n' + e);
	}
}


function processCompanyBasicDetail(dunsNo){
	
	soapText = getBasicDetail(dunsNo);
	
	nlapiLogExecution('DEBUG','Detail for type '+ this.type + " and user.",nlapiGetUser());
	if (nlapiGetUser() == 55011) {
		nlapiSendEmail(55011, 55011, 'Basic Detail for ' + dunsNo, "Basic Detail \n\n\n\n" + soapText);
	}
	
	var soapXML = nlapiStringToXML(soapText);
	
	try {
		var indexOf = soapText.search('sch:GetCompanyDetailSimpleResponse');
		if (indexOf != -1) {
			var hitNode = nlapiSelectNode(soapXML, '/SOAP-ENV:Envelope/SOAP-ENV:Body/sch:GetCompanyDetailSimpleResponse/sch:return');
		}
	} 
	catch (err) {
		var errorEmail = "Cannot process Regular Company Information\n" +
		"Thrown by:" +
		nlapiGetContext().getName() +
		"\n\nSoap Request:\n\n" +
		regularSoapRequest +
		"\n\n\nSoap Response:\n\n" +
		soapText;
	//nlapiSendEmail(nlapiGetContext().getUser(),'derek_zanga@rapid7.com','Error parsing Regular Response', errorEmail);
	}
		var comments = '';
		if (hitNode != null) {
			
			//nlapiSendEmail(2,2,'Found BasicDetail Node','Found it!');
		
			var name = nlapiSelectValue(hitNode,'sch:name');
		
			var primaryLocationNode = nlapiSelectNode(hitNode,'sch:primaryLocation');
			
			if(primaryLocationNode!=null){
				
				var address1 = nlapiSelectValue(primaryLocationNode,'sch:address1');
				var address2 = nlapiSelectValue(primaryLocationNode,'sch:address2');
				var city = nlapiSelectValue(primaryLocationNode,'sch:city');
				var state = nlapiSelectValue(primaryLocationNode,'sch:state');
				var country = nlapiSelectValue(primaryLocationNode,'sch:country');
				var zip = nlapiSelectValue(primaryLocationNode,'sch:zip');
				var zip4 = nlapiSelectValue(primaryLocationNode,'sch:zip4');
				var latitude = nlapiSelectValue(primaryLocationNode,'sch:latitude');
				var longitude = nlapiSelectValue(primaryLocationNode,'sch:longitude');
				var latLongAccuracy = nlapiSelectValue(primaryLocationNode,'sch:latLongAccuracy');
				
			}
			 
			var primaryPhoneNode = nlapiSelectNode(hitNode,'sch:primaryPhone');
			var primaryPhone ='';
			if(primaryPhoneNode!=null){
				var countryCode = nlapiSelectValue(primaryPhoneNode,'sch:countryCode');
				var areaCode = nlapiSelectValue(primaryPhoneNode,'sch:areaCode');
				var phoneNumber = nlapiSelectValue(primaryPhoneNode,'sch:phoneNumber');
				if (countryCode != '1') {
					primaryPhone = countryCode + areaCode + phoneNumber;
				}else{
					primaryPhone = areaCode + phoneNumber;
				}
			}
				
			var primaryUrl = nlapiSelectValue(hitNode,'sch:primaryURL');
			
			var minorityOwned = nlapiSelectValue(hitNode,'sch:minorityOwned');
			
			var womenOwned = nlapiSelectValue(hitNode,'sch:womenOwned');
			
			var yearFounded = nlapiSelectValue(hitNode,'sch:yearFounded');
			
			var legalStatus = nlapiSelectValue(hitNode,'sch:legalStatus');
			
			var primaryURL = nlapiSelectValue(hitNode,'sch:primaryURL');
			
			primaryPhone = "" + primaryPhone;
			if(custRecord.getFieldValue('custentityr7corporatephone')==null ||
			custRecord.getFieldValue('custentityr7corporatephone')==''){				
				if (primaryPhone != null && primaryPhone.length > 5) {
					custRecord.setFieldValue('custentityr7corporatephone', primaryPhone);
				}
			}
			
			if(custRecord.getFieldValue('phone')==null ||
			custRecord.getFieldValue('phone')==''){
				if (primaryPhone != null && primaryPhone.length > 5) {
					custRecord.setFieldValue('phone', primaryPhone);
				}
			}
			
			if(custRecord.getFieldValue('url')==null ||
			custRecord.getFieldValue('url')==''){
				if (primaryURL != null && primaryURL.length >= 3) {
					custRecord.setFieldValue('url', primaryURL);
				}
			}
			
			if (primaryURL != null) {
				var existingEmail = custRecord.getFieldValue('email');
				//nlapiLogExecution('DEBUG','Existing Email', existingEmail);
				if (existingEmail == null || existingEmail.length <= 3) {
				
					var wwwIndex = primaryURL.indexOf('www');
					if (wwwIndex == -1) {
						var charBeginDomain = '/'
						var beginDomain = primaryURL.indexOf(charBeginDomain) + 2;
					}
					else {
						var charBeginDomain = '.';
						var beginDomain = primaryURL.indexOf(charBeginDomain) + 1;
					}
					
					var endDomain = primaryURL.indexOf('/', beginDomain);
					if (endDomain == -1) {
						endDomain = primaryURL.length;
					}
					var domain = primaryURL.substring(beginDomain, endDomain);
					var email = 'info@' + domain;
					try {
						custRecord.setFieldValue('email', email);
					} 
					catch (err) {
						var emailError = "Primary URL returned by Hoovers:" + primaryURL;
						var emRT = nlapiGetRecordType();
						var emRI = nlapiGetRecordId();
						var recordLink = nlapiResolveURL('RECORD', emRT, emRI, 'VIEW');
						//emailError += "\n\n" + recordLink + "\nEmail:" + email + "\nFirstDot:" + firstDot + "\nLastFS:" + lastFS;
						//nlapiSendEmail(2,2, 'Error on Email', emailError);
					}
				}
			}
			
			
			//CUSTCORPORATESTATE NULL OR EMPTY
			nlapiLogExecution('DEBUG','State',state);
			if(custRecord.getFieldValue('custentityr7corporatestate')==null ||
			custRecord.getFieldValue('custentityr7corporatestate')==''){
				if (state != null && state != '') {
					try {
						custRecord.setFieldText('custentityr7corporatestate', state);
					}catch(err){
					}
				}
			}
			
			//CUSTCORPORATEZIP NULL OR EMPTY
			nlapiLogExecution('DEBUG','Zip',zip);
			if (custRecord.getFieldValue('custentityr7corporatezip') == null ||
			custRecord.getFieldValue('custentityr7corporatezip') == '') {
				if (zip != null && zip != '') {
					try {
						custRecord.setFieldValue('custentityr7corporatezip', zip);
					} 
					catch (err) {
					}
				}
			}
			
			
			//CUSTCORPORATECOUNTRY NULL OR EMPTY
			if(custRecord.getFieldValue('custentityr7corporatecountry')==null ||
			custRecord.getFieldValue('custentityr7corporatecountry')==''){
				var netsuiteCountry = mapHooversCountryToNetsuiteCountry(country);
				try {
					custRecord.setFieldText('custentityr7corporatecountry', netsuiteCountry);
				}catch(err){
					nlapiLogExecution('ERROR','Country not found',netsuiteCountry);
				}
			}
				
		}
}
		
function processRegularInformationCompany(dunsNo){		
		
		//nlapiLogExecution('DEBUG','Regular Company Information 01', 'begin');
		nlapiLogExecution('DEBUG', 'precessRegularInformationCompany(dunsNo): dunsNo=', dunsNo);
		soapText = getRegularResults(dunsNo);
		//soapText = escape(soapText);
		
		if (nlapiGetUser() == 55011 && this.type == 'edit') {
			nlapiSendEmail(55011, 55011, 'Detail for ' + dunsNo, "Regular Detail \n\n\n\n" + soapText);
		}
		
		var soapXML = nlapiStringToXML(soapText);
		try{
			var indexOf = soapText.search('sch:GetCompanyDetailResponse');
			if(indexOf!=-1){
			var hitNode = nlapiSelectNode(soapXML, '/SOAP-ENV:Envelope/SOAP-ENV:Body/sch:GetCompanyDetailResponse/sch:return');
			}
		}catch(err){
			var errorEmail = "Cannot process Regular Company Information\n"+
							 "Thrown by:" + nlapiGetContext().getName()+ 
							 "\n\nSoap Request:\n\n" + regularSoapRequest +
							 "\n\n\nSoap Response:\n\n" + soapText;
			nlapiSendEmail(nlapiGetContext().getUser(),'derek_zanga@rapid7.com','Error parsing Regular Response', errorEmail);
		}
		
		var comments = '';
		if(hitNode!=null){
			
			nlapiLogExecution('DEBUG','Found hitNode sch:return', 'yes');
			
			var companyId = nlapiSelectValue(hitNode, 'sch:companyId'); /* 3.3 new */ 
			
			var companyType = nlapiSelectValue(hitNode, 'sch:companyType');

			var locationType = nlapiSelectValue(hitNode, "sch:locationType"); 

			var ultimateParentDuns =  nlapiSelectValue(hitNode, "sch:ultimateParentDuns");
			
			var ultimateParentName = nlapiSelectValue(hitNode, "sch:ultimateParentName");
			
			//parent DUNS 3.3 provides
			//parent Name 3.3 provides	
			
			var name = nlapiSelectValue(hitNode, "sch:name");
			//nlapiSendEmail(2,2,'Full Description Synopsis', "Full Description:\n\n" + fullDescription + "\n\n\n" + "Synopsis:\n\n" + synopsis); 
		
			var dbaNode = nlapiSelectNode(hitNode, "sch:dbaNames");
			var dba ='';
			if(dbaNode!=null){
					dba+= nlapiSelectValue(dbaNode,'sch:dba');
			}
			
			var stateOfIncorporation = nlapiSelectValue(hitNode,"sch:stateOfIncorporation");			
			var primaryURL = nlapiSelectValue(hitNode, "sch:primaryURL");
			
			var dnbGlobalLinkage = nlapiSelectNode(hitNode,"sch:dnbGlobalLinkage");
			var immediateParentName = nlapiSelectValue(hitNode, "sch:dnbGlobalLinkage/sch:immediateParentName");
			var immediateParentDuns =  nlapiSelectValue(hitNode, "sch:dnbGlobalLinkage/sch:immediateParent");
			
			/*
			 * INDUSTRIES 
			 * 
			 */
			
			var industriesNode = nlapiSelectNode(hitNode,'sch:industries');
			
			var hicName = nlapiSelectValue(industriesNode, "sch:primaryHIC");
			var naics = nlapiSelectValue(industriesNode, "sch:primaryNAICS");
			var primaryUSSIC = nlapiSelectValue(industriesNode, "sch:primaryUSSIC"); /* 3.3 new */
			var primaryUKSIC = nlapiSelectValue(industriesNode, "sch:primaryUKSIC");
				
			var siac = nlapiSelectValue(industriesNode, "sch:sIAC"); /* 3.3 not present */
			var siac = "SIC#"+ primaryUSSIC;
			
			/* INDUSTRIES - UK SIC			 * 
			 */
						
			var allUKSICNode = nlapiSelectNode(industriesNode,'sch:allUKSIC');
			if (allUKSICNode != null) {
				var allUKSICNodes = nlapiSelectNodes(allUKSICNode, 'sch:item');
				var allUKSIC = '';
				for (var i = 0; i < allUKSICNodes.length; i++) {
					var ukSIC = nlapiSelectValue(allUKSICNodes[i], 'sch:uksic');
					var ukSICDescription = nlapiSelectValue(allUKSICNodes[i], 'sch:description');
					allUKSIC += ukSIC + " " + ukSICDescription + "\n";
				}
			}
			/* INDUSTRIES - US SIC			 * 
			 */
			
			var allUSSICNode = nlapiSelectNode(industriesNode,'sch:allUSSIC');
			if (allUSSICNode != null) {
				var allUSSICNodes = nlapiSelectNodes(allUSSICNode, 'sch:item');
				var allUSSIC = '';
				for (var i = 0; i < allUSSICNodes.length; i++) {
					var usSIC = nlapiSelectValue(allUSSICNodes[i], 'sch:ussic');
					var usSICDescription = nlapiSelectValue(allUSSICNodes[i], 'sch:description');
					allUSSIC += usSIC + " " + usSICDescription + "\n";
				}
			}
			/* INDUSTRIES - ALL NAICS			 * 
			 */
			
			var allNAICSNode = nlapiSelectNode(industriesNode,'sch:allNAICS');
			if (allNAICSNode != null) {
				var allNAICSNodes = nlapiSelectNodes(allNAICSNode, 'sch:item');
				var allNAICS = '';
				for (var i = 0; i < allNAICSNodes.length; i++) {
					var NAICS = nlapiSelectValue(allNAICSNodes[i], 'sch:naics');
					var NAICSDescription = nlapiSelectValue(allNAICSNodes[i], 'sch:description');
					allNAICS += NAICS + " " + NAICSDescription + "\n";
				}
			}
			/* INDUSTRIES - ALL HIC			 * 
			 */
			
			var allHICNode = nlapiSelectNode(industriesNode,'sch:allHIC');
			if (allHICNode != null) {
				var allHICNodes = nlapiSelectNodes(allHICNode, 'sch:item');
				var allHIC = '';
				for (var i = 0; i < allHICNodes.length; i++) {
					var HIC = nlapiSelectValue(allHICNodes[i], 'sch:hic');
					var HICDescription = nlapiSelectValue(allHICNodes[i], 'sch:description');
					allHIC += HIC + " " + HICDescription + "\n";
				}
			}
			//Subsidiary Status - weird place in the XML
			var subsidiaryStatus = nlapiSelectValue(hitNode,"sch:subsidiaryStatus");
			
			
			
			/*
			 * KEY NUMBERS - Quarterly and Annually
			 * 3.3 Come back to key numbers
			 */
			
			
			//have to debug THIS STATEMENT- REMOVE WHEN DONE!!!!!
			var keyNosHistory = nlapiSelectNode(hitNode,'sch:keyNumbersHistory');
			var annualKeyNosHistory = nlapiSelectNode(hitNode,"sch:keyNumbersHistory/sch:annualKeyNumbersHistory");
			var keyNos1 = nlapiSelectNodes(keyNosHistory,"annualKeyNumbersHistory/sch:keyNumbers");
			var keyNos2 = nlapiSelectNodes(annualKeyNosHistory,"sch:keyNumbers");
			
			var keyNumbersNodes = nlapiSelectNodes(hitNode,"sch:keyNumbersHistory/sch:annualKeyNumbersHistory/sch:keyNumbers");
			var keyNos = '';
			var allKeyNos = new Array();
			var sales, empTotal, empGrowthPercent, researchDevelopment, advertising, fiscalPeriod;
			for (j = 0; j < keyNumbersNodes.length; j++) {
				
				var keyNoEntry = new Array();
				
				var recordType = nlapiSelectValue(keyNumbersNodes[j], "sch:record-type"); /* 3.3 not present */
				
				var sales = nlapiSelectValue(keyNumbersNodes[j], "sch:sales");
				var empAtLocation = nlapiSelectValue(keyNumbersNodes[j], "sch:employeesAtThisLocation");
				var empTotal = nlapiSelectValue(keyNumbersNodes[j],
						"sch:employeesTotal");
				var empGrowthPercent = nlapiSelectValue(keyNumbersNodes[j],
						"sch:totalEmployeeGrowthPercent");
				var researchDevelopment = nlapiSelectValue(keyNumbersNodes[j],
						"sch:researchAndDevelopment");
				var advertising = nlapiSelectValue(keyNumbersNodes[j],
						"sch:advertising");
				var fiscalPeriod = nlapiSelectValue(keyNumbersNodes[j],
						"sch:fiscal-period");
				var periodEndMonth = nlapiSelectValue(keyNumbersNodes[j],
						"sch:periodEndMonth");		
						

				keyNos += "Fiscal Period" + fiscalPeriod + "\n---------------";
				keyNos += "\n Sales:" + sales;
				keyNos += "\n Total Employees :" + empTotal;
				keyNos += "\n Employee Growth Percentage:" + empGrowthPercent;
				keyNos += "\n Research and Development:" + researchDevelopment;
				keyNos += "\n Advertising :" + advertising;
				
				
				keyNoEntry['recordType']='A';
				keyNoEntry['fiscalPeriod']=fiscalPeriod;
				keyNoEntry['sales'] = sales;
				keyNoEntry['totalEmployees'] = empTotal;
				keyNoEntry['empGrowthPercent'] = empGrowthPercent;
				keyNoEntry['researchDevelopment'] = researchDevelopment;
				keyNoEntry['advertising'] = empTotal;
				keyNoEntry['employeesAtLocation']= empAtLocation;
				
				allKeyNos[allKeyNos.length] = keyNoEntry;
				
			}
			
			//Do the same for quarterly			
			var keyNumbersNodes = nlapiSelectNodes(hitNode,"sch:keyNumbersHistory/sch:quarterlyKeyNumbersHistory/sch:keyNumbers");
			var keyNos = '';
				//var allKeyNos = new Array();
			var sales, empTotal, empGrowthPercent, researchDevelopment, advertising, fiscalPeriod;
			for (j = 0; j < keyNumbersNodes.length; j++) {
				
				var keyNoEntry = new Array();
				
				var recordType = nlapiSelectValue(keyNumbersNodes[j], "sch:record-type"); /* 3.3 not present */
				
				var sales = nlapiSelectValue(keyNumbersNodes[j], "sch:sales");
				var empAtLocation = nlapiSelectValue(keyNumbersNodes[j], "sch:employeesAtThisLocation");
				var empTotal = nlapiSelectValue(keyNumbersNodes[j],
						"sch:employeesTotal");
				var empGrowthPercent = nlapiSelectValue(keyNumbersNodes[j],
						"sch:totalEmployeeGrowthPercent");
				var researchDevelopment = nlapiSelectValue(keyNumbersNodes[j],
						"sch:researchAndDevelopment");
				var advertising = nlapiSelectValue(keyNumbersNodes[j],
						"sch:advertising");
				var fiscalPeriod = nlapiSelectValue(keyNumbersNodes[j],
						"sch:fiscal-period");
				var periodEndMonth = nlapiSelectValue(keyNumbersNodes[j],
						"sch:periodEndMonth");
						

				keyNos += "Fiscal Period" + fiscalPeriod + "\n---------------";
				keyNos += "\n Sales:" + sales;
				keyNos += "\n Total Employees :" + empTotal;
				keyNos += "\n Employee Growth Percentage:" + empGrowthPercent;
				keyNos += "\n Research and Development:" + researchDevelopment;
				keyNos += "\n Advertising :" + advertising;
				
				
				keyNoEntry['recordType']='Q';
				keyNoEntry['fiscalPeriod']=fiscalPeriod;
				keyNoEntry['sales'] = sales;
				keyNoEntry['totalEmployees'] = empTotal;
				keyNoEntry['empGrowthPercent'] = empGrowthPercent;
				keyNoEntry['researchDevelopment'] = researchDevelopment;
				keyNoEntry['advertising'] = empTotal;
				keyNoEntry['employeesAtLocation']= empAtLocation;
				
				allKeyNos[allKeyNos.length] = keyNoEntry;
				
			}		
			/*
			 * LOCATIONS
			 *  
			 */
			
			var locationNode = nlapiSelectNode(hitNode, 'sch:locations');
			var locationNodes = null;
			if (locationNode != null) {
				locationNodes = nlapiSelectNodes(locationNode, 'sch:location')
				
				var address = '';
				var addressArray = new Array();
				var address1, address2, city, country, state, zip, zip4;
				for (var j = 0; j < locationNodes.length; j++) {
					var entry = new Array();
					var address1 = nlapiSelectValue(locationNodes[j], 'sch:address1');
					var address2 = nlapiSelectValue(locationNodes[j], 'sch:address2');
					var city = nlapiSelectValue(locationNodes[j], 'sch:city');
					var country = nlapiSelectValue(locationNodes[j], 'sch:country');
					var state = nlapiSelectValue(locationNodes[j], 'sch:state');
					var zip = nlapiSelectValue(locationNodes[j], 'sch:zip');
					var zip4 = nlapiSelectValue(locationNodes[j], 'sch:zip4');
					
					address += "\n" + (j + 1) + ".";
					address += "Address " + (j + 1) + "\n-------------";
					address += "\nAddr1: " + address1;
					address += "\nAddr2: " + address2;
					address += "\nCity: " + city;
					address += "\nState: " + state;
					address += "\n " + zip + "-" + zip4;
					address += "\nCountry" + country;
					
					entry['addr1'] = address1;
					entry['addr2'] = address2;
					entry['city'] = city;
					entry['state'] = state;
					entry['zip'] = zip;
					entry['country'] = country;
					
					addressArray[addressArray.length] = entry;
				}
			
				user = nlapiGetUser();
				
			}
			
			
			
			//Weird place for ownership Year
			var ownershipYear = nlapiSelectValue(hitNode,"sch:ownershipYear");
			
				
			/*
			 * PHONES
			 */
			
			
			var phoneNodes = nlapiSelectNodes(hitNode,"sch:phoneNumber");
			var phones = ''; var phone='';
			var allPhones = new Array();
			var countryCode, areaCode, phoneNumber, phoneNode;
			for (var j = 0; j < phoneNodes.length; j++) {
				phone = '';
				countryCode = nlapiSelectValue(phoneNodes[j],'sch:countryCode');
				areaCode = nlapiSelectValue(phoneNodes[j], 'sch:areaCode');
				phoneNumber = nlapiSelectValue(phoneNodes[j],'sch:phoneNumber');
				phone =  countryCode + areaCode +  phoneNumber;
				allPhones[allPhones.length] = phone;
			}

			var faxNode = nlapiSelectNode(hitNode, 'sch:faxNumber');
			var faxNo ='';
			if(faxNode!=null){
				var faxCountryCode = nlapiSelectValue(faxNode, 'sch:countryCode');
				var faxAreaCode = nlapiSelectValue(faxNode, 'sch:areaCode');
				var faxPhoneNumber = nlapiSelectValue(faxNode, 'sch:phoneNumber');
				faxNo = faxCountryCode + faxAreaCode + faxPhoneNumber;
			}
			else if(allPhones!=null && allPhones[0]!=null){
			}
			
			/*
			 * SYNOPSIS
			 */
			var synopsis = nlapiSelectValue(hitNode,"sch:synopsis");
			
			/*
			 * FULL DESCRIPTION
			 */
			
			var fullDescription = nlapiSelectValue(hitNode,"sch:full-description");
			
			
			/*
			 * STOCKS
			 */

			var stocksNode = nlapiSelectNode(hitNode, "sch:stocks");
			var tickerSymbolUS = '';
			if (stocksNode != null) {
			 	tickerSymbolUS = nlapiSelectValue(stocksNode, 'sch:tickerUS');
			}

			/* 
			 * TOP-EXECUTIVES
			 */
			
			var top3Executives = nlapiSelectNodes(hitNode,'//sch:official');
			var top3ExecText ='';
			for(var tj=0;tj<top3Executives.length;tj++){				
				var latestPosition = nlapiSelectNode(top3Executives[tj],'sch:latest-position');
				var title = '';
				title = nlapiSelectValue(latestPosition,'sch:title');
				var person = nlapiSelectNode(top3Executives[tj],'sch:person');
				var prefix = nlapiSelectValue(person,'sch:prefix');
				var firstName = nlapiSelectValue(person,'sch:first-name');
				var lastName =  nlapiSelectValue(person,'sch:last-name');
				var fullName = prefix + " " + firstName + " " + lastName;	
				top3ExecText += title + " " + fullName + "\n"; 
			}
			
			
			//weird place for family tree link
			var familyTreeLink = nlapiSelectValue(hitNode,"sch:familyTreeLink");
			
			
			/*
			 * Primary URLS
			 */
				
			
			/*
			 * Other URLS
			 */
			var otherURLsNode = nlapiSelectNode(hitNode, 'sch:otherURLs');
			var otherURLs ='';
			if(otherURLsNode!=null){
				allUrls = nlapiSelectValues(otherURLsNode,'sch:url');
				for(var i=0;allUrls!=null && i<allUrls.length;i++){
				url = allUrls[i];
				if(url!=null && url.length>=2){
				otherURLs +=  url +"\n";
				}
				}
			}
						
			
			var accountingFirm = nlapiSelectValue(hitNode,'sch:accountingFirm');
			var bankName = nlapiSelectValue(hitNode,'sch:bankName');
			var marketingPreScreenScore = nlapiSelectValue(hitNode,'sch:marketingPreScreenScore'); /* 3.3 new */
			
			
			/*
			 * KEY FINANCIALS 
			 * // 3.3 Come back to key financials
			 */
			
			//try{
			
			var keyFinancialsNode = nlapiSelectNodes(hitNode,"sch:keyFinancials");
			if (keyFinancialsNode != null) {
				var marketValueInfo = nlapiSelectNode(keyFinancialsNode[0], 'sch:marketValueInfo');
				
				var incomeAssets = nlapiSelectNode(keyFinancialsNode[0], 'sch:incomeAssets');
				
				if (marketValueInfo != null) {
					var marketValue = nlapiSelectValue(marketValueInfo, 'sch:marketValue');
					var marketValueDate = nlapiSelectValue(marketValueInfo, 'sch:marketValueDate');
					var marketValueCurrency = nlapiSelectValue(marketValueInfo, 'sch:marketValueCurrency');
				}
				
				if (incomeAssets != null) {
					var keyFinancialsPeriod = nlapiSelectValue(incomeAssets, 'sch:period');
					var keyFinancialsAssets = nlapiSelectValue(incomeAssets, 'sch:assets');
					var keyFinancialsSalesGrowthPercentage = nlapiSelectValue(incomeAssets, 'sch:salesGrowthPercent');
					var keyFinancialsNetIncome = nlapiSelectValue(incomeAssets, 'sch:netIncome');
					var keyFinancialsNetIncomeGrowthPercent = nlapiSelectValue(incomeAssets, 'sch:netIncomeGrowthPercent');
					var keyFinancialsIncomeAssetsCurrency = nlapiSelectValue(incomeAssets, 'sch:currency');
				}
			}
		
			/*
			catch(err){
				nlapiLogExecution('DEBUG', 'Error', 'Error with key Financials' + err.description);
			}
			*/
			
			/*
			 * UK SPECS
			 */

			//RANKINGS
			
			var rankings = nlapiSelectNode(hitNode, "sch:rankings");
			var allRanks = '';
			if (rankings != null) {
				var rank = nlapiSelectNodes(rankings, "sch:rank");
				if (rank != null) {
					for (var i = 0; i < rank.length; i++) {
						//var rankNumber = nlapiSelectValue(rank[i], "sch:rankNumber");
						var rankDefinition = nlapiSelectValue(rank[i], "sch:definition");
						allRanks += rankDefinition + '\n'; //' (' + rankNumber + ')\n';
					}
				}
			}
			nlapiLogExecution('DEBUG', 'allRanks', allRanks);
			
			var ukNode = nlapiSelectNode(hitNode,'sch:ukSpecs');
			if(ukNode!=null){
			nlapiLogExecution('DEBUG','UKSpecs Node','Found');
			var ukSubsidiariesNode = nlapiSelectNode(ukNode,'sch:numberOfSubsidiaries');
			var ukRegistration = nlapiSelectValue(ukNode,'sch:uKRegistration');
			var ukVAT= nlapiSelectValue(ukNode,'sch:uKVAT');
			if(ukSubsidiariesNode!=null){
				var ukDomestic = nlapiSelectValue(ukSubsidiariesNode,'sch:domestic');
				var ukForeign = nlapiSelectValue(ukSubsidiariesNode,'sch:foreign');
			}
			}
			else{
				nlapiLogExecution('DEBUG','UKSpecs Node','Not Found');
			}
			
			var noOfPcs = nlapiSelectValue(hitNode,'sch:numberOfPCs');
			var yearFounded = nlapiSelectValue(hitNode,'sch:yearFounded');
			
			
			/*
			 * MISC DETAILS
			 */
			/*
			var noOfPCs = nlapiSelectVa	
			<sch:numberOfPCs>410</sch:numberOfPCs>
	<sch:spaceAtAddress>53000</sch:spaceAtAddress><sch:spaceAtAddressUnitOfMeasurement>sq ft</sch:spaceAtAddressUnitOfMeasurement>
	<sch:spaceAtAddressAccuracy>0</sch:spaceAtAddressAccuracy>
	<sch:ownedOrLeased>Location Is Rented By This Company</sch:ownedOrLeased>
	<sch:manufacturingIndicator/>
	<sch:minorityOwned>false</sch:minorityOwned>
	<sch:ethnicity>Unknown</sch:ethnicity>
	<sch:womenOwned>false</sch:womenOwned>
		<sch:yearFounded>1982</sch:yearFounded>
			<sch:legalStatus>Corporation</sch:legalStatus>
			*/
			
			
			}else{
			nlapiLogExecution('DEBUG','Hit Node not found','No.');
			}
			
			/*
			 * End of parsing beginning of setting custRecord 
			 * 
			 * 
			 * */
			
			nlapiLogExecution('DEBUG','02', 'checkpoint');
			
			
			var d = new Date();
			var date =  nlapiDateToString(new Date());
			
			
			if(name!=null){custRecord.setFieldValue('custentityr7hooversname',name);}
			if(dba!=null){custRecord.setFieldValue('custentityr7hooversdba',dba);}
			
			if(immediateParentName!=null){custRecord.setFieldValue('custentityr7hooversimmediateparentname',immediateParentName);}
			if(immediateParentDuns!=null && immediateParentDuns!=''){
				immediateParentDuns = parseInt(immediateParentDuns);
				custRecord.setFieldValue('custentityr7hooversimmediateparent',immediateParentDuns);
			}			
			
			if(ultimateParentDuns!=null){custRecord.setFieldValue('custentityr7hooversultimateparentduns',ultimateParentDuns);}
			if(ultimateParentName!=null){custRecord.setFieldValue('custentityr7hooversultimateparentname',ultimateParentName);}
			if(familyTreeLink!=null){custRecord.setFieldValue('custentityr7hooversfamilytreelink',familyTreeLink);}
			
			if(naics!=null){custRecord.setFieldValue('custentityr7hooversnaics',naics);}
			if(siac!=null){custRecord.setFieldValue('custentityr7hooverssiac',siac);}
			if(hicName!=null){custRecord.setFieldValue('custentityr7hoovershicname',hicName);}
			//try{
				if(primaryUKSIC!=null){custRecord.setFieldValue('custentityr7hooversprimaryuksic',primaryUKSIC);}
			//}catch(err){}
			
			if(allUKSIC!=null){custRecord.setFieldValue('custentityr7hooversalluksic',allUKSIC);}
			if(allUSSIC!=null){custRecord.setFieldValue('custentityr7hooversallussic',allUSSIC);}
			if(allNAICS!=null){custRecord.setFieldValue('custentityr7hooversallnaic',allNAICS);}
			if(allHIC!=null){custRecord.setFieldValue('custentityr7hooversallhic',allHIC);}
			if(allRanks!=null){custRecord.setFieldValue('custentityr7hooversrankingslist',allRanks);}
			
			//weird stuff below
			//try{
				if(subsidiaryStatus!=null){
				//InternalId of List/Record 1 Yes 2 No
				if(subsidiaryStatus=='true'){custRecord.setFieldValue('custentityr7hooverssubsidiarystatus',1);}
				if(subsidiaryStatus=='false'){custRecord.setFieldValue('custentityr7hooverssubsidiarystatus',2);}
				}
			//}catch(err){}
			
			
			if(bankName!=null){custRecord.setFieldValue('custentityr7hooversbankname',bankName);}
			if(accountingFirm!=null){
				nlapiLogExecution('DEBUG','AccountingFirm will be overwritten even if null','yup');
				custRecord.setFieldValue('custentityr7hooversaccountingfirm',accountingFirm);
			}
			else{
				nlapiLogExecution('DEBUG','Old fields will not be overwritten','yup');
			}
			

			if(familyTreeLink!=null){custRecord.setFieldValue('custentityr7hooversfamilytreelink', familyTreeLink);}
			//try{
			if(stateOfIncorporation!=null){custRecord.setFieldValue('custentityr7hooversstateofincorporation', stateOfIncorporation);}
			//}catch(e){}		
			if(synopsis!=null){
				custRecord.setFieldValue('custentityr7hooverssynopsis',synopsis);
			}
			if(fullDescription!=null){
				custRecord.setFieldValue('custentityr7hooversfulldescription',fullDescription);
			}
			//try{
				if(faxNo!=null && faxNo.length >=9){
				var existingFaxNo = custRecord.getFieldValue('fax');
				if(existingFaxNo==null || existingFaxNo.length<=3){
				custRecord.setFieldValue('fax', faxNo);
				}
				}
			//}catch(err){} //sometimes is 0.0?
			if(ownershipYear!=null){custRecord.setFieldValue('custentityr7hooversownershipyear',ownershipYear);}
			
						
						
			nlapiLogExecution('DEBUG','Value of Last Updated',
			custRecord.getFieldValue('custentityr7hooversdateupdated'));
			
						
			//According to DZ email 3/10/2011
			//If it is the first time the Hoovers information is being updated
			//then populate the address array
			if(custRecord.getFieldValue('custentityr7hooversdateupdated')=='' ||
			custRecord.getFieldValue('custentityr7hooversdateupdated')==null){
				
				//update withe address values
				
				for(var i=0;addressArray!=null && i<addressArray.length;i++){
				
				//var addressCountIndex = custRecord.getLineItemCount('addressbook') + 1;
				//custRecord.insertLineItem('addressbook',addressCountIndex);
				custRecord.selectNewLineItem('addressbook');
				
				if(i==0){
				custRecord.setCurrentLineItemValue('addressbook', 'defaultbilling', 'T');
				custRecord.setCurrentLineItemValue('addressbook', 'defaultshipping', 'T');
				}
				//if addr1 or addr2 is set then only set address
				custRecord.setCurrentLineItemValue('addressbook', 'addr1',  addressArray[i]['addr1']);
				custRecord.setCurrentLineItemValue('addressbook', 'label', addressArray[i]['addr1']);
				custRecord.setCurrentLineItemValue('addressbook', 'addr2', addressArray[i]['addr2']);
				try{
					if(name.length>=80){
						name = name.substring(0,80);
					}
					custRecord.setCurrentLineItemValue('addressbook', 'addressee', name);
				}
				catch(err){}
				
				nlapiLogExecution('DEBUG','Setting state to ',addressArray[i]['state']);
				
				custRecord.setCurrentLineItemValue('addressbook', 'city', addressArray[i]['city']);
				
				if (addressArray[i]['country'] != '' && addressArray[i]['country'] != null) {
					var netsuiteCountry = mapHooversCountryToNetsuiteCountry(addressArray[i]['country']);
					try {
						custRecord.setCurrentLineItemText('addressbook', 'country', netsuiteCountry);
					}catch(e){
						nlapiLogExecution('ERROR','Details:',e);
					}
				}else{
					custRecord.setCurrentLineItemText('addressbook', 'country','');
				}
				
				custRecord.setCurrentLineItemText('addressbook', 'state', addressArray[i]['state']);
				//custRecord.setCurrentLineItemValue('addressbook', 'displaystate', addressArray[i]['state']);
				custRecord.setCurrentLineItemValue('addressbook', 'zip',  addressArray[i]['zip']);
				custRecord.commitLineItem('addressbook');
				
			}	
				
			}			
			  
			
			
			
			
			
			//Key Financials
			
			if(marketValue!=null){custRecord.setFieldValue('custentityr7hooversmarketvalue',marketValue);}
			if(marketValueDate!=null){
				mValue = marketValueDate.split(" ");
				marketValueDate = mValue[0];
				//marketValueDate = marketValueDate.replace("-","/");
				custRecord.setFieldValue('custentityr7hooversmarketvaluedate',marketValueDate);
			}
			//if(marketValueCurrency!=null){custRecord.setFieldValue('',);}
			if(keyFinancialsPeriod!=null){custRecord.setFieldValue('custentityr7hooversperiod',keyFinancialsPeriod);}
			if(keyFinancialsAssets!=null){custRecord.setFieldValue('custentityr7hooversassets',keyFinancialsAssets);}
			if(keyFinancialsSalesGrowthPercentage!=null){
				keyFinancialsSalesGrowthPercentage = parseInt(parseFloat(keyFinancialsSalesGrowthPercentage,10) * 100)/100;
				custRecord.setFieldValue('custentityr7hooverssalesgrowthpercentage',keyFinancialsSalesGrowthPercentage);
			}
			if(keyFinancialsNetIncome!=null){custRecord.setFieldValue('custentityr7hooversnetincome',keyFinancialsNetIncome);}
			if(keyFinancialsNetIncomeGrowthPercent!=null){
				keyFinancialsNetIncomeGrowthPercent = parseInt(parseFloat(keyFinancialsNetIncomeGrowthPercent,10) * 100)/100;
				custRecord.setFieldValue('custentityr7hooversnetincomegrowthpercen',keyFinancialsNetIncomeGrowthPercent);
			}
			//if(keyFinancialsIncomeAssetsCurrency!=null){custRecord.setFieldValue('',);}
			
			if(allKeyNos!=null && allKeyNos.length>=1){
				
				keyNoEntry = allKeyNos[0];
				
				if (keyNoEntry != null && keyNoEntry['recordType'] != null && keyNoEntry['recordType'] == 'A') {
				
					if (keyNoEntry['employeesAtLocation'] != null) {
						custRecord.setFieldValue('custentityr7hooversemployeesatthislocati', keyNoEntry['employeesAtLocation'])
					}
					if (keyNoEntry['researchDevelopment'] != null) {
						custRecord.setFieldValue('custentityr7hooversresearchanddevelopmen', keyNoEntry['researchDevelopment']);
					}
					if (keyNoEntry['advertising'] != null) {
						custRecord.setFieldValue('custentityr7hooversadvertising', keyNoEntry['advertising']);
					}
					if (keyNoEntry['sales'] != null) {
						custRecord.setFieldValue('custentityr7hooverssales', keyNoEntry['sales']);
					}
					if (keyNoEntry['totalEmployees'] != null) {
						custRecord.setFieldValue('custentityr7hooversemployeestotal', keyNoEntry['totalEmployees']);
					}
					if (keyNoEntry['empGrowthPercent'] != null) {
						keyNoEntry['empGrowthPercent'] = parseInt(parseFloat(keyNoEntry['empGrowthPercent'], 10) * 100);
						keyNoEntry['empGrowthPercent'] = keyNoEntry['empGrowthPercent'] / 100;
						custRecord.setFieldValue('custentityr7hooverstotalemployeegrowthpe', keyNoEntry['empGrowthPercent']);
					}
				}
			}
			
			
			if(allPhones!=null){
			var existingPhone = custRecord.getFieldValue('phone');	
			if(allPhones[0]!=null){
				if(existingPhone==null || existingPhone.length <=3){
					var ph = allPhones[0]+"";
					if (ph != null && ph.length > 5) {
						custRecord.setFieldValue('phone', allPhones[0]);
					}	
				}
			}
			var otherPhoneNos =  '';
			for(var i=0;i<allPhones.length;i++){
				otherPhoneNos += allPhones[i] + '\n';
			}
			custRecord.setFieldValue('custentityr7hooversphones',otherPhoneNos);
			}
			
			if(top3ExecText!=null){
				custRecord.setFieldValue('custentityr7hooverstopexecutives', top3ExecText);
			}
			
			
			if(otherURLs!=null){
				custRecord.setFieldValue('custentityr7hooversurls',otherURLs);
			}
			
			if (tickerSymbolUS != null){
				custRecord.setFieldValue('custentityr7hooversstockticker', tickerSymbolUS);
			}
			
			if(ukRegistration!=null && ukRegistration.length>1){custRecord.setFieldValue('custentityr7hooversukregistration',ukRegistration);}
			if(ukVAT!=null){custRecord.setFieldValue('custentityr7hooversukvat',ukVAT);}
			if(ukDomestic!=null){custRecord.setFieldValue('custentityr7hooversnumberofuksubsidiarie',ukDomestic);}
			if(ukForeign!=null){custRecord.setFieldValue('custentityr7hooversnumberofsubsidiaries',ukForeign);}
			
			
			//try{
			if(primaryURL!=null){
				var existingURL = custRecord.getFieldValue('url');
				if(existingURL==null || existingURL.length <=3){
					var indexURL = primaryURL.search("http");
					if(indexURL==-1){
						primaryURL = "http://" + primaryURL;
					}
					nlapiLogExecution('DEBUG', 'Company URL', primaryURL);
					custRecord.setFieldValue('url',primaryURL);
				}
			}
			//}catch(err){}
			
			
			if(primaryURL!=null){
				var existingEmail = custRecord.getFieldValue('email');
				nlapiLogExecution('DEBUG','Existing Email', existingEmail);
				if(existingEmail==null || existingEmail.length<=3){
					
					var wwwIndex = primaryURL.indexOf('www');
					if(wwwIndex==-1){
						var charBeginDomain = '/'
						var beginDomain = primaryURL.indexOf(charBeginDomain)+2;
					}
					else{
						var charBeginDomain = '.';
						var beginDomain = primaryURL.indexOf(charBeginDomain)+1;
					}
					
					var endDomain = primaryURL.indexOf('/',beginDomain);
					if(endDomain==-1){endDomain = primaryURL.length;}					
					var domain = primaryURL.substring(beginDomain,endDomain);
					var email = 'info@' + domain;
					try{
						custRecord.setFieldValue('email',email);
					}catch(err){
						var emailError = "Primary URL returned by Hoovers:" + primaryURL;
						var emRT = nlapiGetRecordType();
						var emRI = nlapiGetRecordId();
						var recordLink = nlapiResolveURL('RECORD',emRT,emRI,'VIEW'); 
						emailError += "\n\n" + recordLink + "\nEmail:" + email + "\nFirstDot:" + firstDot + "\nLastFS:" + lastFS ;
						nlapiSendEmail(2,2,'Error on Email', emailError);
					}
					
					/*
					nlapiLogExecution('DEBUG','Email field will be overwritten', 'yes');
					var regexString = 'http://www.([^\.]*\.(com|edu|net|org|co\.uk))'
					var myRegExp = new RegExp(regexString, "i");
					var m = myRegExp.exec(primaryURL);
					if(m!=null && m[1]!=null){
						var email = 'info@' + m[1];	
						try{
						custRecord.setFieldValue('email',email);
					}
					catch(err){
						var emailError = "Primary URL returned by Hoovers:" + primaryURL;
						var emRT = nlapiGetRecordType();
						var emRI = nlapiGetRecordId();
						var recordLink = nlapiResolveURL('RECORD',emRT,emRI,'VIEW'); 
						emailError += "\n\n" + recordLink;
						nlapiSendEmail(2,2,'Error on Email', emailError);
					}
					 */
				}
				else{
					//custRecord.setFieldValue('email','replacethiswithinfo@domain.com');
				}
			}
						
			
			//custentityr7hooverssynopsis
				//custRecord.setFieldValue('custentityr7hooverslocationtype',locationType);
			if (companyType != null && companyType != '') {
				companyType = companyType.toLowerCase();
				if (
				companyType == 'public' ||
				companyType == 'private' ||
				companyType == 'private_cooperative' ||
				companyType == 'private_partnership' ||
				companyType == 'private_member_owned_banking_authority' ||
				companyType == 'private_mutual_company' ||
				companyType == 'private_non_profit' ||
				companyType == 'government' ||
				companyType == 'government_agency' ||
				companyType == 'government_owned' ||
				companyType == 'joint_venture' ||				
				companyType == 'subsidiary' ||
				companyType == 'school'
				) {
					custRecord.setFieldText('custentityr7hooverscompanytype', companyType);
				}
				else {
					//nlapiSendEmail('2', 'derek_zanga@rapid7.com', 'New sublist value:' + companyType, companyType);
				}
			}
			
		
			/*
			comments += "\n Immediate Parent Name: " + immediateParentName;
			comments += "\n Immediate Parent Duns: " + immediateParentDuns;
			comments += "\n Other Urls " + otherURLs;
			comments += "\n BankName " + bankName;
			comments += "\n Accounting Firm " + accountingFirm;
			
			
			comments += "\n Key No Entry Emp Growth Percent" + allKeyNos[0]['empGrowthPercent'];
						
			comments += "\n Addresses :" + "\n" + address;
			comments += "\n Phones :" + "\n" + phones;
			comments += "\n Key Numbers :" + "\n" + keyNos;
			
		 	comments += "\n Full description:" + "\n" + fullDescription;
			comments += "\n Fax No" + faxNo;
			comments += "\n Key Numbers :" + "\n" + keyNos;
						
			comments += "\n MarketValue: " + marketValue;
			comments += "\n MarketValue Date: " + marketValueDate;
			comments += "\n MarketValue Currency: " + marketValueCurrency;
			comments += "\n IncomeAsets Period: " + keyFinancialsPeriod;
			comments += "\n IncomeAsets Assets: " + keyFinancialsAssets;
			comments += "\n IncomeAsets Sales Growth Percent: " + keyFinancialsSalesGrowthPercentage;
			comments += "\n IncomeAsets Net Income: " + keyFinancialsNetIncome;
			comments += "\n IncomeAsets Net Income Growth Percentage: " + keyFinancialsNetIncomeGrowthPercent;
			comments += "\n IncomeAsets Currency: " + keyFinancialsIncomeAssetsCurrency;
			
			comments += "\n Ownership Year:" + "\n" + ownershipYear;
			comments += "\n Primary URL:" + primaryURL;
			nlapiLogExecution('DEBUG', 'Final Checkpoint', 'reached');
			
			*/
			
		
		
		soapText = soapText + "\n\n\n" + comments + "\n\n\n\n\n";
		//custRecord.setFieldValue('custentityr7hooverssoapresponse', soapText);
		//nlapiLogExecution('DEBUG', 'boom', soapText);

		/*
		*}
		catch(err){
			custRecord.setFieldValue('custentityr7hooverssoapresponse', soapText);
			nlapiLogExecution('DEBUG','Some error with Regular', err.description);
		}
		*/
		
		//soapText = '<!--------' + "\n" + soapText + "\n" + "------>";
		//nlapiSendEmail(2,2, 'Soap Text', soapText, null,
		//null, null, null);
}
		


function processCompanyFinancialSummaryInformation(dunsNo){
	
	nlapiLogExecution('DEBUG','0 Checkpoint','Here');
	
	var soapText = getCompanyFinancialSummaryResults(dunsNo);
	
		
//	soapText = escape(soapText);																
	//try{
	
	var soapXML = nlapiStringToXML(soapText);
	try{
		//nlapiSendEmail(2,2,'Financial Soap Response',soapText);
		var indexOf = soapText.search('sch:GetCompanyFinancialSummaryResponse');
		if(indexOf!=-1){
		var returnNode = nlapiSelectNode(soapXML,'/SOAP-ENV:Envelope/SOAP-ENV:Body/sch:GetCompanyFinancialSummaryResponse/sch:return');
		}
	}
	catch(err){
		var errorEmail = "Cannot process Regular Financial Information\n"+
		 "Thrown by:" + nlapiGetContext().getName()+ 
		 "\n\n\nSoap Request:\n\n" + financialSoapRequest +
		 "\n\n\nSoap Response:\n\n" + soapText;
		nlapiSendEmail(nlapiGetContext().getUser(),'derek_zanga@rapid7.com','Error parsing Financial Summary Response', errorEmail);
	}
	
	nlapiLogExecution('DEBUG','1st Checkpoint','Here');
	
	if(returnNode!=null){
		
		//nlapiSendEmail(nlapiGetContext().getUser(),'derek_zanga@rapid7.com','Financial Summary Response', soapText);
		
		nlapiLogExecution('DEBUG','2','Return Node Found');
		
	/* basicFinancialInformationNode */
	var basicFinancialInformationNode = nlapiSelectNode(returnNode, 'sch:basicFinancialInformation');
	
	if(basicFinancialInformationNode != null){
			
		nlapiLogExecution('DEBUG','3','Basic Financial Node found');
		
		var companyType =  	nlapiSelectValue(basicFinancialInformationNode,'sch:companyType');
		
		/*Exchanges Node */
	var exchangeNode = nlapiSelectNode(basicFinancialInformationNode,'sch:exchanges');
	var exchangeNodes = nlapiSelectNodes(exchangeNode,'sch:exchange');
	var exchangeData=''; var tickerSymbol, exchangeName;
	for(var i=0;i<exchangeNodes.length;i++){
		tickerSymbol = nlapiSelectValue(exchangeNodes[i],'sch:tickerSymbol');
		exchangeName = nlapiSelectValue(exchangeNodes[i],'sch:exchangeName');
		exchangeData = "EXCG:" + exchangeName + "SYMB:" + tickerSymbol + "\n";
	}
	/* Exchanges Node */	
		
		//Location :we ignore
		
		var filingsUrl = nlapiSelectValue(basicFinancialInformationNode,'sch:financialFilingsURL');  
		var fiscalYearEnd = nlapiSelectValue(basicFinancialInformationNode,'sch:fiscalYearEnd');
		
		// latestYearSales
		//var currentYearSalesGrowthNode = nlapiSelectNode(basicFinancialInformationNode,'sch:currentYearSalesGrowth');
		var currentYearSalesGrowthYear = nlapiSelectValue(basicFinancialInformationNode,'sch:latestYearSales/sch:year');
		var currentYearSalesGrowthSales = nlapiSelectValue(basicFinancialInformationNode,'sch:latestYearSales/sch:sales'); 
			
		//oneYearSalesGrowthPercentage : we ignore		

		/*Latest Year Net Income Node */
		var currentYearNetIncomeYear = nlapiSelectValue(basicFinancialInformationNode,'sch:latestYearNetIncome/sch:year');
		var currentYearNetIncomeNetIncome = nlapiSelectValue(basicFinancialInformationNode,'sch:latestYearNetIncome/sch:netIncome'); 
		
		var oneYearNetIncomeGrowthPct = nlapiSelectValue(basicFinancialInformationNode,'sch:oneYearNetIncomeGrowthPct');
		
		var auditor = nlapiSelectValue(basicFinancialInformationNode,'sch:auditor');
	
	var annualReportURL = "";
	var investorRelationsURL="";	
	/*
	var annualReportURL = nlapiSelectValue(basicFinancialInformationNode,'sch:annualReportURL');
	var investorRelationsURL  = nlapiSelectValue(basicFinancialInformationNode,'sch:investorRelationsURL');
	
	if((annualReportURL!=null && annualReportURL.length >=3) || 
	   (investorRelationsURL!=null && investorRelationsURL.length >=3)){
		var anRT = nlapiGetRecordType();
		var anRI = nlapiGetRecordId();
		var anLink = nlapiResolveURL('RECORD',anRT,anRI,'VIEW');
		var anEmail = "AnnualReportURL:" + annualReportURL +"\n"+
					  "InvestorRelations URL:" + investorRelationsURL + "\n"+
					  "Record Link:"+ anLink;
		//nlapiSendEmail(2,2,'Investor relations URL',anEmail);
	}
	else{
		//brute force search
		var arU = soapText.search('<sch:annualReportURL>');
		var irU = soapText.search('<sch:investorRelationsURL>');
		if(arU!=-1 || irU!=-1){
			annualReportPart = "\n\nAnnual Report Part: " + soapText.substring(arU,arU+30);
			investorRelationsPart = "\n\nInvestor Relations Part: " + soapText.substring(irU,irU+30);
			totalEmail = annualReportPart  + investorRelationsPart ;
			//nlapiSendEmail(2,2,'annualReportURL found in Soap', totalEmail);
		}
		
	}
	*/
	
	nlapiLogExecution('DEBUG','2nd Checkpoint','Here');
	
	/* basicFinancialInformationNode */
	}
	else{ 
			nlapiLogExecution('DEBUG','Basic Financial Information Node', 'missing');
	}
	
	nlapiLogExecution('DEBUG','3rd Checkpoint','Here');
	
	/* annualIncomeStatementsNode */		
	var annualIncomeStatementNode = nlapiSelectNode(returnNode, 'sch:annualIncomeStatements');
	
	if(annualIncomeStatementNode != null){
	
		nlapiLogExecution('DEBUG','4','Annual Income statements found');
	/* Latest Year Node */
	var annualIncomeLatestYearNode = nlapiSelectNode(annualIncomeStatementNode, 'sch:latestYear');
	
	if (annualIncomeLatestYearNode != null) {
		var annualIncomeLatestYearYear = nlapiSelectValue(annualIncomeLatestYearNode, 'sch:year');
		var annualIncomeLatestYearRevenue = nlapiSelectValue(annualIncomeLatestYearNode, 'sch:revenue');
		var annualIncomeLatestYearGrossProfit = nlapiSelectValue(annualIncomeLatestYearNode, 'sch:grossProfit');
		var annualIncomeLatestYearOperatingIncome = nlapiSelectValue(annualIncomeLatestYearNode, 'sch:operatingIncome');
		var annualIncomeLatestYearDilutedEPS = nlapiSelectValue(annualIncomeLatestYearNode, 'sch:dilutedEPS');
		var annualIncomeLatestYearTotalNetIncome = nlapiSelectValue(annualIncomeLatestYearNode, 'sch:totalNetIncome');
	}
	/* Latest Year Node */
		
	/* Previous years node */
	var annualIncomePreviousYearsNode =	nlapiSelectNode(annualIncomeStatementNode, 'sch:previousYears');
	if (annualIncomePreviousYearsNode != null) {
		var annualIncomePreviousYearsNodes = nlapiSelectNodes(annualIncomePreviousYearsNode, 'sch:previousYear');
		var annualIncomePreviousYears = new Array();
		var annualIncomePreviousYearsYear, annualIncomePreviousYearsRevenue, annualIncomePreviousYearsGrossProfit;
		var annualIncomePreviousYearsOperatingIncome, annualIncomePreviousYearsTotalNetIncome, annualIncomePreviousYearsDilutedEPS;
		var previousYearsData = '';
		var allAnnualData = new Array();
		for (var i = 0; i < annualIncomePreviousYearsNodes.length; i++) {
		
			var annualData = new Array();
			annualIncomePreviousYearsYear = nlapiSelectValue(annualIncomePreviousYearsNodes[i], 'sch:year');
			annualIncomePreviousYearsRevenue = nlapiSelectValue(annualIncomePreviousYearsNodes[i], 'sch:revenue');
			annualIncomePreviousYearsGrossProfit = nlapiSelectValue(annualIncomePreviousYearsNodes[i], 'sch:grossProfit');
			annualIncomePreviousYearsOperatingIncome = nlapiSelectValue(annualIncomePreviousYearsNodes[i], 'sch:operatingIncome');
			annualIncomePreviousYearsTotalNetIncome = nlapiSelectValue(annualIncomePreviousYearsNodes[i], 'sch:totalNetIncome');
			annualIncomePreviousYearsDilutedEPS = nlapiSelectValue(annualIncomePreviousYearsNodes[i], 'sch:dilutedEPS');
			
			previousYearsData += "\n Year :" + annualIncomePreviousYearsYear;
			previousYearsData += "\n Revenue :" + annualIncomePreviousYearsRevenue;
			previousYearsData += "\n Gross Profit :" + annualIncomePreviousYearsGrossProfit;
			previousYearsData += "\n Operating Income :" + annualIncomePreviousYearsOperatingIncome;
			previousYearsData += "\n Total Net Income :" + annualIncomePreviousYearsTotalNetIncome;
			previousYearsData += "\n Diluted EPS :" + annualIncomePreviousYearsDilutedEPS;
			previousYearsData += "\n ----------------";
			
			annualData['year'] = annualIncomePreviousYearsYear;
			annualData['revenue'] = annualIncomePreviousYearsRevenue;
			annualData['grossProfit'] = annualIncomePreviousYearsGrossProfit;
			annualData['operatingIncome'] = annualIncomePreviousYearsOperatingIncome;
			annualData['totalNetIncome'] = annualIncomePreviousYearsTotalNetIncome;
			annualData['dilutedEPS'] = annualIncomePreviousYearsDilutedEPS;
			
			allAnnualData[allAnnualData.length] = annualData;
		}
	}
	
	}
	else{
		nlapiLogExecution('DEBUG','4','Annual Income statements node not found');
		
	}
	
	/* annualIncomeStatementsNode */
	
	/* quarterly Income statements */
	var quarterlyIncomeStatementsNode = nlapiSelectNode(returnNode, 'sch:quarterlyIncomeStatements');
	if(quarterlyIncomeStatementsNode!=null){
		
		nlapiLogExecution('DEBUG','5','Quarterly Income Node found');
		
		var latestQuarterNode =  nlapiSelectNode(quarterlyIncomeStatementsNode,'sch:latestQuarter');
	
	if(latestQuarterNode!=null){
		nlapiLogExecution('DEBUG','6','Latest quarter node found.');
		var latestQuarterMonth = nlapiSelectValue(latestQuarterNode,'sch:quarterMonth');
		var latestQuarterYear = nlapiSelectValue(latestQuarterNode,'sch:quarterYear');
		var latestQuarterRevenue = nlapiSelectValue(latestQuarterNode,'sch:revenue');
		var latestQuarterGrossProfit = nlapiSelectValue(latestQuarterNode,'sch:grossProfit');
		var latestQuarterOperatingIncome = nlapiSelectValue(latestQuarterNode,'sch:operatingIncome');
		var latestQuarterTotalNetIncome = nlapiSelectValue(latestQuarterNode,'sch:totalNetIncome');
		var latestQuarterDilutedEPS = nlapiSelectValue(latestQuarterNode,'sch:dilutedEPS');
		}else { nlapiLogExecution('DEBUG','6','Latest quarter node not found.');}
	
	var previousQuartersNode =  nlapiSelectNode(quarterlyIncomeStatementsNode,'sch:previousQuarters');

	if(previousQuartersNode!=null){
		nlapiLogExecution('DEBUG','8','Previous Quarters node found');
		var previousQuarterNodes =  nlapiSelectNodes(previousQuartersNode,'sch:previousQuarter');	
				
		var quarterlyIncomePreviousQuarterMonth, quarterlyIncomePreviousQuarterYear, quarterlyIncomePreviousQuarterRevenue;
		var quarterlyIncomePreviousQuarterGrossProfit, quarterlyIncomePreviousQuarterOperatingIncome, quarterlyIncomePreviousQuarterTotalNetIncome;
		var quarterlyIncomePreviousQuarterDilutedEPS;
		var quarterlyIncomeData ='';
		
		var allQuarterlyData = new Array();
		for(var i=0;i < previousQuarterNodes.length;i++){
		var quarterlyData = new Array();	
		quarterlyIncomePreviousQuarterMonth = nlapiSelectValue(previousQuarterNodes[i], 'sch:quarterMonth');
		quarterlyIncomePreviousQuarterQuarterYear = nlapiSelectValue(previousQuarterNodes[i], 'sch:quarterYear');
		quarterlyIncomePreviousQuarterRevenue = nlapiSelectValue(previousQuarterNodes[i], 'sch:revenue');
		quarterlyIncomePreviousQuarterGrossProfit = nlapiSelectValue(previousQuarterNodes[i], 'sch:grossProfit');
		quarterlyIncomePreviousQuarterOperatingIncome = nlapiSelectValue(previousQuarterNodes[i], 'sch:operatingIncome');
		quarterlyIncomePreviousQuarterTotalNetIncome = nlapiSelectValue(previousQuarterNodes[i], 'sch:totalNetIncome');
		quarterlyIncomePreviousQuarterDilutedEPS = nlapiSelectValue(previousQuarterNodes[i], 'sch:dilutedEPS');
	
		quarterlyIncomeData += "\n\n Quarter Month" + quarterlyIncomePreviousQuarterMonth;
		quarterlyIncomeData += "\n Quarter Year" + quarterlyIncomePreviousQuarterYear;
		quarterlyIncomeData += "\n Quarter Revenue" + quarterlyIncomePreviousQuarterRevenue;
		quarterlyIncomeData += "\n Quarter Gross Profit" + quarterlyIncomePreviousQuarterGrossProfit;
		quarterlyIncomeData += "\n Quarter Operating Income" + quarterlyIncomePreviousQuarterOperatingIncome;
		quarterlyIncomeData += "\n Quarter Total Net Income" + quarterlyIncomePreviousQuarterTotalNetIncome;
		quarterlyIncomeData += "\n Quarter Diluted EPS" + quarterlyIncomePreviousQuarterDilutedEPS;
		
		quarterlyData['month'] = quarterlyIncomePreviousQuarterMonth;
		quarterlyData['year'] = quarterlyIncomePreviousQuarterQuarterYear;
		quarterlyData['revenue'] = quarterlyIncomePreviousQuarterRevenue;
		quarterlyData['grossProfit'] = quarterlyIncomePreviousQuarterGrossProfit;
		quarterlyData['operatingIncome'] = quarterlyIncomePreviousQuarterOperatingIncome;
		quarterlyData['totalNetIncome'] = quarterlyIncomePreviousQuarterTotalNetIncome;
		quarterlyData['dilutedEPS']= quarterlyIncomePreviousQuarterDilutedEPS;
		
		allQuarterlyData[allQuarterlyData.length]=quarterlyData;
	}
	}else{nlapiLogExecution('DEBUG','8','Previous Quarters node not found');}
	}
	else{nlapiLogExecution('DEBUG','5','Quarterly Income Node not found');}
	
	/* quarterly Income statements */
	
	/* Comparison to Industry and market node */
	var comparisonToIndustryAndMarketNode = nlapiSelectNode(returnNode, 'sch:comparisonToIndustryAndMarket');
	if(comparisonToIndustryAndMarketNode!=null){
		
		nlapiLogExecution('DEBUG','9','Comparison to Industry and Market node found');
	
	var comparisonCompanyNode = nlapiSelectNode(comparisonToIndustryAndMarketNode, 'sch:company');
	
	if(comparisonCompanyNode!=null){
	var companyPriceSalesRatio = nlapiSelectValue(comparisonCompanyNode,'sch:priceSalesRatio');
	var companyPriceEarningsRatio = nlapiSelectValue(comparisonCompanyNode,'sch:priceEarningRatio');
	var companyPriceBookRatio = nlapiSelectValue(comparisonCompanyNode,'sch:priceBookRatio');
	var companyCashFlowRatio = nlapiSelectValue(comparisonCompanyNode,'sch:priceCashFlowRatio');
	}
	
	
	var comparisonIndustryNode = nlapiSelectNode(comparisonToIndustryAndMarketNode, 'sch:industryMedian');
	
	if(comparisonIndustryNode!=null){
	var industryPriceSalesRatio = nlapiSelectValue(comparisonIndustryNode,'sch:priceSalesRatio');
	var industryPriceEarningsRatio = nlapiSelectValue(comparisonIndustryNode,'sch:priceEarningRatio');
	var industryPriceBookRatio = nlapiSelectValue(comparisonIndustryNode,'sch:priceBookRatio');
	var industryCashFlowRatio = nlapiSelectValue(comparisonIndustryNode,'sch:priceCashFlowRatio');
	}
	
	var comparisonMarketNode = nlapiSelectNode(comparisonToIndustryAndMarketNode, 'sch:marketMedian');
	
	if(comparisonMarketNode!=null){
		var marketPriceSalesRatio = nlapiSelectValue(comparisonMarketNode,'sch:priceSalesRatio');
		var marketPriceEarningsRatio = nlapiSelectValue(comparisonMarketNode,'sch:priceEarningRatio');
		var marketPriceBookRatio = nlapiSelectValue(comparisonMarketNode,'sch:priceBookRatio');
		var marketCashFlowRatio = nlapiSelectValue(comparisonMarketNode,'sch:priceCashFlowRatio');
	}
	
	}
	else{
		nlapiLogExecution('DEBUG','9','Comparison to Industry and Market node not found');
		
	}
	
	/* Comparison to Industry and market node */
	
	
	/* Top competitors node */
		var topCompetitorsNode = nlapiSelectNode(returnNode, 'sch:topCompetitors');
		if(topCompetitorsNode !=null){
		nlapiLogExecution('DEBUG','10','top Competitors node found');
		var competitor1Node = nlapiSelectNode(topCompetitorsNode,'sch:competitor1');
		var competitor2Node = nlapiSelectNode(topCompetitorsNode,'sch:competitor2');
		var competitor3Node = nlapiSelectNode(topCompetitorsNode,'sch:competitor3');
		
		if(competitor1Node!=null){
		var competitor1Name = nlapiSelectValue(competitor1Node,'sch:companyName');
		var competitor1AnnualSales = nlapiSelectValue(competitor1Node,'sch:annualSales');
		var competitor1Employees = nlapiSelectValue(competitor1Node,'sch:employees');
		var competitor1MarketCap = nlapiSelectValue(competitor1Node,'sch:marketCap');
		}
		
		if(competitor2Node!=null){
			var competitor2Name = nlapiSelectValue(competitor2Node,'sch:companyName');
			var competitor2AnnualSales = nlapiSelectValue(competitor2Node,'sch:annualSales');
			var competitor2Employees = nlapiSelectValue(competitor2Node,'sch:employees');
			var competitor2MarketCap = nlapiSelectValue(competitor2Node,'sch:marketCap');
		}
		
		if(competitor3Node!=null){
			var competitor3Name = nlapiSelectValue(competitor3Node,'sch:companyName');
			var competitor3AnnualSales = nlapiSelectValue(competitor3Node,'sch:annualSales');
			var competitor3Employees = nlapiSelectValue(competitor3Node,'sch:employees');
			var competitor3MarketCap = nlapiSelectValue(competitor3Node,'sch:marketCap');
		}
				
	}else{ nlapiLogExecution('DEBUG','10','top Competitors node not found');}
	/* Top competitors node */
	
	nlapiLogExecution('DEBUG','11','Reached 11');
	
	comments = '';
	comments += 'Basic Financial Information';
	comments += '\n1yr Growth %'+ oneYearNetIncomeGrowthPct;
	comments += '\nFiscal Yr end'+ fiscalYearEnd;
	comments += '\nAuditor'+ auditor;
	comments += '\nAnnual Report URL'+ annualReportURL;
	comments += '\nInvestor Relations URL' + investorRelationsURL;
	comments += '\nExchanges \n' + exchangeData;
	comments += '\nCurrent Year Sales Growth';
	comments += '\nCurrent Year Sales Growth Year' + currentYearSalesGrowthYear;
	comments += '\nCurrent Year Sales Growth Sales' + currentYearSalesGrowthSales;
	comments += '\nCurrent Year Net Income';
	comments += '\nCurrent Year Net Income Year' + currentYearNetIncomeYear;
	comments += '\nCurrent Year Net Income Net Income' + currentYearNetIncomeNetIncome;
	comments += '\n-----------------------------------';
	comments += '\n Annual Income Statements';
	comments += '\n Latest Year \n';
	comments += '\n Latest Year Year' + annualIncomeLatestYearYear;
	comments += '\n Latest Year Revenue' + annualIncomeLatestYearRevenue;
	comments += '\n Latest Year GrossProfit' + annualIncomeLatestYearGrossProfit;
	comments += '\n Latest Year Operating Income' + annualIncomeLatestYearOperatingIncome;
	comments += '\n Latest Year Total Net Income' + annualIncomeLatestYearTotalNetIncome;
	comments += '\n Latest Year Diluted EPS' + annualIncomeLatestYearDilutedEPS;
	comments += '\n Previous Years \n' + previousYearsData;
	comments += '\n-----------------------------------';
	comments += '\n Quarterly Income Data ' ;
	comments += '\n Latest quarter ' ;
	comments += '\n Month' + latestQuarterMonth;
	comments += '\n Year' + latestQuarterYear;
	comments += '\n Revenue' + latestQuarterRevenue;
	comments += '\n Gross Profit' + latestQuarterGrossProfit;
	comments += '\n Operating Income' + latestQuarterOperatingIncome; 
	comments += '\n Total Net Income' + latestQuarterTotalNetIncome;
	comments += '\n Diluted EPS' + latestQuarterDilutedEPS;
	comments += '\n Previous Quarters \n' + quarterlyIncomeData;	
	comments += '\n-----------------------------------';
	comments += '\n Company Industry Market Comparison';
	comments += '\n Company Price-Sales Ratio:' + companyPriceSalesRatio;
	comments += '\n Company Price-Earnings Ratio:' + companyPriceEarningsRatio;
	comments += '\n Company Price-Book Ratio:' + companyPriceBookRatio;
	comments += '\n Company Cash-Flow Ratio:' + companyCashFlowRatio;
	comments += '\n Industry Price-Sales Ratio:' + industryPriceSalesRatio;
	comments += '\n Industry Price-Earnings Ratio:' + industryPriceEarningsRatio;
	comments += '\n Industry Price-Book Ratio:' + industryPriceBookRatio;
	comments += '\n Industry Cash-Flow Ratio:' + industryCashFlowRatio;
	comments += '\n Market Price-Sales Ratio:' + marketPriceSalesRatio;
	comments += '\n Market Price-Earnings Ratio:' + marketPriceEarningsRatio;
	comments += '\n Market Price-Book Ratio:' + marketPriceBookRatio;
	comments += '\n Market Cash-Flow Ratio:' + marketCashFlowRatio;
	comments += '\n-----------------------------------';
	comments += '\nTop Competitors';
	comments += '\nCompetitor 1 Name:'+ competitor1Name;
	comments += '\nCompetitor 1 Annual Sales:'+ competitor1AnnualSales;
	comments += '\nCompetitor 1 Employees:'+ competitor1Employees;
	comments += '\nCompetitor 1 MarketCap:'+ competitor1MarketCap;
	comments += '\nCompetitor 2 Name:'+ competitor2Name;
	comments += '\nCompetitor 2 Annual Sales:'+ competitor2AnnualSales;
	comments += '\nCompetitor 2 Employees:'+ competitor2Employees;
	comments += '\nCompetitor 2 MarketCap:'+ competitor2MarketCap;
	comments += '\nCompetitor 3 Name:'+ competitor3Name;
	comments += '\nCompetitor 3 Annual Sales:'+ competitor3AnnualSales;
	comments += '\nCompetitor 3 Employees:'+ competitor3Employees;
	comments += '\nCompetitor 3 MarketCap:'+ competitor3MarketCap;

	comments += '\n1yr Growth %'+ oneYearNetIncomeGrowthPct;
	comments += '\nFiscal Yr end'+ fiscalYearEnd;
	comments += '\nAuditor'+ auditor;
	comments += '\nAnnual Report URL'+ annualReportURL;
	comments += '\nInvestor Relations URL' + investorRelationsURL;
	comments += '\nExchanges \n' + exchangeData;
	comments += '\nCurrent Year Sales Growth';
	comments += '\nCurrent Year Sales Growth Year' + currentYearSalesGrowthYear;
	comments += '\nCurrent Year Sales Growth Sales' + currentYearSalesGrowthSales;
	comments += '\nCurrent Year Net Income';
	comments += '\nCurrent Year Net Income Year' + currentYearNetIncomeYear;
	comments += '\nCurrent Year Net Income Net Income' + currentYearNetIncomeNetIncome;
	
	nlapiLogExecution('DEBUG','12','Reached 12');
	
	/* Setting Basic Financial Information Top Level Data */
	
	//try{
		if(oneYearNetIncomeGrowthPct!=null){custRecord.setFieldValue('custentityr7hooversnetincomegrowthpercen',oneYearNetIncomeGrowthPct);}
	//	}catch(err){}
	
	if(fiscalYearEnd!=null){custRecord.setFieldValue('custentityr7hooversfiscalyearend',fiscalYearEnd);}
	if(auditor!=null && custRecord.getFieldValue('custentityr7hooversaccountingfirm')==null){	custRecord.setFieldValue('custentityr7hooversaccountingfirm',auditor);}
	if(annualReportURL!=null){custRecord.setFieldValue('custentityr7hooversannualreporturl',annualReportURL);}
	if(investorRelationsURL!=null){custRecord.setFieldValue('custentityr7hooversinvestorrelationsurl',investorRelationsURL);}
	//if(exchangeData!=null){custRecord.setFieldValue('',exchangeData);}
	//try{
	if(currentYearSalesGrowthYear!=null && currentYearSalesGrowthYear.length >=2){custRecord.setFieldValue('custentityr7hooverssalesgrowthyear',currentYearSalesGrowthYear);}
	//}catch(err){}
	
	if(currentYearSalesGrowthSales!=null){
		custRecord.setFieldValue('custentityr7hooverslatestyearsales',currentYearSalesGrowthSales);
		custRecord.setFieldValue('custentityr7hooverssales',currentYearSalesGrowthSales);
		}
	if(currentYearNetIncomeYear!=null){custRecord.setFieldValue('custentityr7hooversyear',currentYearNetIncomeYear);}
	if(currentYearNetIncomeNetIncome!=null){custRecord.setFieldValue('custentityr7hooversnetincome',currentYearNetIncomeNetIncome);}
	
	
	
	/* Setting Basic Financial Information Top Level Data */
	
	
	/* Setting company annual data */
	if(annualIncomeLatestYearYear!=null){custRecord.setFieldValue('custentityr7hooversa1year',annualIncomeLatestYearYear);}
	if(annualIncomeLatestYearRevenue!=null){custRecord.setFieldValue('custentityr7hooversa1revenue',annualIncomeLatestYearRevenue);}
	if(annualIncomeLatestYearGrossProfit!=null){custRecord.setFieldValue('custentityr7hooversa1grossprofit',annualIncomeLatestYearGrossProfit);}
	if(annualIncomeLatestYearOperatingIncome!=null){custRecord.setFieldValue('custentityr7hooversa1operatingincome',annualIncomeLatestYearOperatingIncome);}
	if(annualIncomeLatestYearTotalNetIncome !=null){custRecord.setFieldValue('custentityr7hooversa1totalnetincome',annualIncomeLatestYearTotalNetIncome);}
	if(annualIncomeLatestYearDilutedEPS!=null){custRecord.setFieldValue('custentityr7hooversa1dilutedeps',annualIncomeLatestYearDilutedEPS);}
	
	if(allAnnualData!=null){
		
		if(allAnnualData[0]!=null){
		
			if(allAnnualData[0]['year']!=null){custRecord.setFieldValue('custentityr7hooversa2year',allAnnualData[0]['year']);}
			if(allAnnualData[0]['revenue']!=null){custRecord.setFieldValue('custentityr7hooversa2revenue',allAnnualData[0]['revenue']);}
			if(allAnnualData[0]['grossProfit']!=null){custRecord.setFieldValue('custentityr7hooversa2grossprofit',allAnnualData[0]['grossProfit']);}
			if(allAnnualData[0]['operatingIncome']!=null){custRecord.setFieldValue('custentityr7hooversa2operatingincome',allAnnualData[0]['operatingIncome']);}
			if(allAnnualData[0]['totalNetIncome']!=null){custRecord.setFieldValue('custentityr7hooversa2totalnetincome',allAnnualData[0]['totalNetIncome']);}
			if(allAnnualData[0]['dilutedEPS']!=null){custRecord.setFieldValue('custentityr7hooversa2dilutedeps',allAnnualData[0]['dilutedEPS']);}
			
		}
		
		if(allAnnualData[1]!=null){
			if(allAnnualData[1]['year']!=null){custRecord.setFieldValue('custentityr7hooversa3year',allAnnualData[1]['year']);}
			if(allAnnualData[1]['revenue']!=null){custRecord.setFieldValue('custentityr7hooversa3revenue',allAnnualData[1]['revenue']);}
			if(allAnnualData[1]['grossProfit']!=null){custRecord.setFieldValue('custentityr7hooversa3grossprofit',allAnnualData[1]['grossProfit']);}
			if(allAnnualData[1]['operatingIncome']!=null){custRecord.setFieldValue('custentityr7hooversa3operatingincome',allAnnualData[1]['operatingIncome']);}
			if(allAnnualData[1]['totalNetIncome']!=null){custRecord.setFieldValue('custentityr7hooversa3totalnetincome',allAnnualData[1]['totalNetIncome']);}
			if(allAnnualData[1]['dilutedEPS']!=null){custRecord.setFieldValue('custentityr7hooversa3dilutedeps',allAnnualData[1]['dilutedEPS']);}
		}
		
	}
	
	/* Setting company annual data */
	
	
	/* Setting company quarterly data*/
	
	if(latestQuarterYear!=null){custRecord.setFieldValue('custentityr7hooversp1year', latestQuarterYear);}
	//try{
	if(latestQuarterMonth!=null){custRecord.setFieldText('custentityr7hooversp1month', latestQuarterMonth);}
	//}catch(err){}
	if(latestQuarterRevenue!=null){custRecord.setFieldValue('custentityr7hooversp1revenue', latestQuarterRevenue);}
	if(latestQuarterGrossProfit!=null){custRecord.setFieldValue('custentityr7hooversp1grossprofit',latestQuarterGrossProfit);}
	if(latestQuarterOperatingIncome!=null){custRecord.setFieldValue('custentityr7hooversp1operatingincome',latestQuarterOperatingIncome);}
	if(latestQuarterTotalNetIncome!=null){custRecord.setFieldValue('custentityr7hooversp1totalnetincome',latestQuarterTotalNetIncome);}
	if(latestQuarterDilutedEPS!=null){custRecord.setFieldValue('custentityr7hooversp1dilutedeps',latestQuarterDilutedEPS);}
	
	if(allQuarterlyData!=null){
	if(allQuarterlyData[0]!=null){
	
		try{if(allQuarterlyData[0]['month']!=null){custRecord.setFieldText('custentityr7hooversp2month',allQuarterlyData[0]['month']);}}catch(err){}
		if(allQuarterlyData[0]['year']!=null){ custRecord.setFieldValue('custentityr7hooversp2year',allQuarterlyData[0]['year']);}
		if(allQuarterlyData[0]['revenue']!=null){ custRecord.setFieldValue('custentityr7hooversp2revenue',allQuarterlyData[0]['revenue']);}
		if(allQuarterlyData[0]['grossProfit']!=null){ custRecord.setFieldValue('custentityr7hooversp2grossprofit',  allQuarterlyData[0]['grossProfit']);}
		if(allQuarterlyData[0]['operatingIncome']!=null){ custRecord.setFieldValue('custentityr7hooversp2operatingincome',allQuarterlyData[0]['operatingIncome']);}
		if(allQuarterlyData[0]['totalNetIncome']!=null){  custRecord.setFieldValue('custentityr7hooversp2totalnetincome',allQuarterlyData[0]['totalNetIncome']);}
		if(allQuarterlyData[0]['dilutedEPS']!=null){ custRecord.setFieldValue('custentityr7hooversp2dilutedeps', allQuarterlyData[0]['dilutedEPS']);}
		
	}
	
	if(allQuarterlyData[1]!=null){
		try{if(allQuarterlyData[1]['month']!=null){ custRecord.setFieldText('custentityr7hooversp3month',allQuarterlyData[1]['month']);}}catch(err){}
		if(allQuarterlyData[1]['year']!=null){ custRecord.setFieldValue('custentityr7hooversp3year',allQuarterlyData[1]['year']);}
		if(allQuarterlyData[1]['revenue']!=null){ custRecord.setFieldValue('custentityr7hooversp3revenue',allQuarterlyData[1]['revenue']);}
		if(allQuarterlyData[1]['grossProfit']!=null){ custRecord.setFieldValue('custentityr7hooversp3grossprofit',  allQuarterlyData[1]['grossProfit']);}
		if(allQuarterlyData[1]['operatingIncome']!=null){ custRecord.setFieldValue('custentityr7hooversp3operatingincome',allQuarterlyData[1]['operatingIncome']);}
		if(allQuarterlyData[1]['totalNetIncome']!=null){  custRecord.setFieldValue('custentityr7hooversp3totalnetincome',allQuarterlyData[1]['totalNetIncome']);}
		if(allQuarterlyData[1]['dilutedEPS']!=null){ custRecord.setFieldValue('custentityr7hooversp3dilutedeps', allQuarterlyData[1]['dilutedEPS']);}
	}
	}
	
	/* Setting company quarterly data*/
	
	
	/* Setting company-market-industry comparison data*/
	if(companyPriceSalesRatio!=null){ custRecord.setFieldValue('custentityr7hooverscomppricesalescomp',companyPriceSalesRatio);} 
	if(companyPriceEarningsRatio!=null){custRecord.setFieldValue('custentityr7hooverscomppriceearningscomp',companyPriceEarningsRatio);} 
	if(companyPriceBookRatio!=null){custRecord.setFieldValue('custentityr7hooverscomppricebookcomp',companyPriceBookRatio);}
	if(companyCashFlowRatio!=null){custRecord.setFieldValue('custentityr7hooverscomppricecashflowcomp',companyCashFlowRatio);}
	
	if(industryPriceSalesRatio!=null){ custRecord.setFieldValue('custentityr7hooverscomppricesalesind',industryPriceSalesRatio);} 
	if(industryPriceEarningsRatio!=null){custRecord.setFieldValue('custentityr7hooverscomppriceearningsind',industryPriceEarningsRatio);} 
	if(industryPriceBookRatio!=null){custRecord.setFieldValue('custentityr7hooverscomppricebookind',industryPriceBookRatio);}
	if(industryCashFlowRatio!=null){custRecord.setFieldValue('custentityr7hooverscomppricecashflowind',industryCashFlowRatio);}
	
	if(marketPriceSalesRatio!=null){ custRecord.setFieldValue('custentityr7hooverscomppricesalesmark',marketPriceSalesRatio);} 
	if(marketPriceEarningsRatio!=null){custRecord.setFieldValue('custentityr7hooverscomppriceearningsmark',marketPriceEarningsRatio);} 
	if(marketPriceBookRatio!=null){custRecord.setFieldValue('custentityr7hooverscomppricebookmark',marketPriceBookRatio);}
	if(marketCashFlowRatio!=null){custRecord.setFieldValue('custentityr7hooverscomppricecashflowmark',marketCashFlowRatio);}	
	/* Setting company-market-industry comparison data */
	
	
	
	/* Setting competitor values */
	if(competitor1Name!=null){
	custRecord.setFieldValue('custentityr7hooverscompetitorname1',competitor1Name);
	if(competitor1AnnualSales!=null){custRecord.setFieldValue('custentityr7hooverscompetitorsales1',competitor1AnnualSales);}
	if(competitor1Employees!=null){custRecord.setFieldValue('custentityr7hooverscompetitoremployees1',competitor1Employees);}
	if(competitor1MarketCap!=null){custRecord.setFieldValue('custentityr7hooverscompetitormarketcap1',competitor1MarketCap);}
	}
	
	if(competitor2Name!=null){
	custRecord.setFieldValue('custentityr7hooverscompetitorname2',competitor2Name);
	if(competitor2AnnualSales!=null){custRecord.setFieldValue('custentityr7hooverscompetitorsales2',competitor2AnnualSales);}
	if(competitor2Employees!=null){custRecord.setFieldValue('custentityr7hooverscompetitoremployees2',competitor2Employees);}
	if(competitor2MarketCap!=null){custRecord.setFieldValue('custentityr7hooverscompetitormarketcap2',competitor2MarketCap);}
	}
	
	if(competitor3Name!=null){
	custRecord.setFieldValue('custentityr7hooverscompetitorname3',competitor3Name);
	if(competitor3AnnualSales!=null){custRecord.setFieldValue('custentityr7hooverscompetitorsales3',competitor3AnnualSales);}
	if(competitor3Employees!=null){custRecord.setFieldValue('custentityr7hooverscompetitoremployees3',competitor3Employees);}
	if(competitor3MarketCap!=null){custRecord.setFieldValue('custentityr7hooverscompetitormarketcap3',competitor3MarketCap);}
	}
	/* Setting competitor values */
	
	if(filingsUrl!=null)custRecord.setFieldValue('custentityr7hooversfinancialfilingsurl',filingsUrl);
	
	nlapiLogExecution('DEBUG','14','Reached 14');
	
	comments = "\n\n\n\n\n" + soapText + comments;
	comments = custRecord.getFieldValue('custentityr7hooverssoapresponse') + "\n\n\n\n" + comments;
	//custRecord.setFieldValue('custentityr7hooverssoapresponse', comments);
	}
	else{
		var comments = custRecord.getFieldValue('custentityr7hooverssoapresponse');
		//custRecord.setFieldValue('custentityr7hooverssoapresponse',comments+' ');
		nlapiLogExecution('DEBUG','Log','Return Node is null');
	}
}


function mapHooversCountryToNetsuiteCountry(hooversCountry){
	
	if (hooversCountry != null && hooversCountry != '') {
		var customRecord = "customrecordr7hooverscountrymap";
		
		var searchColumns = new Array(new nlobjSearchColumn("custrecordr7hooversnetsuitecountry"));
		
		var searchFilters = new Array(new nlobjSearchFilter("custrecordr7hooverscountry", null, "is", hooversCountry));
		
		//var searchResults = nlapiSearchRecord()
		var searchResults = nlapiSearchRecord("customrecordr7hooverscountrymap", null, searchFilters, searchColumns);
		
		var returnValue = null;
		if (searchResults != null) {
			returnValue = searchResults[0].getText(searchColumns[0]);
		}
		nlapiLogExecution("DEBUG", hooversCountry + " Mapped to ", returnValue);
		return returnValue;
	}else{
		return null;
	}
}

function getRegularSoapRequest(dunsNo) {
	var soap = '';
	
    soap += '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://applications.dnb.com/webservice/schema/">';
    soap += '<soapenv:Header>';
    soap += '<sch:API-KEY>' + HOOVERS_API_KEY + '</sch:API-KEY>';
    soap += '</soapenv:Header>';
    soap += '<soapenv:Body>';
    soap += '<sch:GetCompanyDetailRequest>';
    soap += '<sch:uniqueId>' + dunsNo + '</sch:uniqueId>';
    soap += '</sch:GetCompanyDetailRequest>';
    soap += '</soapenv:Body>';
    soap += '</soapenv:Envelope>';
	
	this.regularSoapRequest = soap;
	return soap;
}

function getRegularResults(dunsNo) {
	var req = getRegularSoapRequest(dunsNo);
	var resp = '';
	var soapHeaders = new Array(); 
	resp = nlapiRequestURL(HOOVERS_SERVICE_URL, req, soapHeaders);
	var responseCode = resp.getCode();
	var soapText = resp.getBody();
	soapText2 = req + "\n\n" + soapText;
	//nlapiSendEmail(2,2,'Request + Response (Regular)',soapText2);
	return soapText;
}



function getCompanyFinancialSummarySoapRequest(dunsNo) {
	var soap = '';
	
	soap +='<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://applications.dnb.com/webservice/schema/">';
	soap +='<soapenv:Header>';//qyez39xpzcwk6b2grjbegmaf
	soap +='<sch:API-KEY>' + HOOVERS_API_KEY + '</sch:API-KEY>';	
	soap +='</soapenv:Header>';	
	soap +='<soapenv:Body>';	
	soap +='<sch:GetCompanyFinancialSummaryRequest>';
	soap +='<sch:uniqueId>' + dunsNo + '</sch:uniqueId>';
	soap +='</sch:GetCompanyFinancialSummaryRequest>';
	soap +='</soapenv:Body>';
	soap +='</soapenv:Envelope>';
	this.financialSoapRequest = soap;
	return soap;
}

function getCompanyFinancialSummaryResults(dunsNo) {
	//var counter = nlapiGetContext().getSetting('SCRIPT','custscriptr7hooverscounter');
	//counter = parseInt(counter) + 1;
	//nlapiGetContext().setSetting('SCRIPT','custscriptr7hooverscounter',counter);
	var req = getCompanyFinancialSummarySoapRequest(dunsNo);
	var resp = '';

	var soapHeaders = new Array(); 
	resp = nlapiRequestURL(HOOVERS_SERVICE_URL, req, soapHeaders);
	var responseCode = resp.getCode();
	var soapText = resp.getBody();
	soapText2 = req + "\n\n" + soapText;
	//nlapiSendEmail(2,2,'Request + Response (Financial)',soapText2);
	return soapText;
}

function getBasicDetail(dunsNo){
	var req = getCompanyBasicDetailRequest(dunsNo);
	var resp = '';
	
	var soapHeaders = new Array(); 
	resp = nlapiRequestURL(HOOVERS_SERVICE_URL, req, soapHeaders);
	var responseCode = resp.getCode();
	var soapText = resp.getBody();
	soapText2 = req + "\n\n" + soapText;
	//nlapiSendEmail(2,2,'Request + Response (basicDetail)',soapText2);
	return soapText;
}

function getCompanyBasicDetailRequest(dunsNo){
    var soap = '';
    soap += '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://applications.dnb.com/webservice/schema/">';
    soap += '<soapenv:Header>';
    soap += '<sch:API-KEY>' + HOOVERS_API_KEY + '</sch:API-KEY>';
    soap += '</soapenv:Header>';
    soap += '<soapenv:Body>';
    soap += '<sch:GetCompanyDetailSimpleRequest>';
    soap += '<sch:uniqueId>' + dunsNo + '</sch:uniqueId>';
    soap += '</sch:GetCompanyDetailSimpleRequest>';
    soap += '</soapenv:Body>';
    soap += '</soapenv:Envelope>';
    return soap;
}
