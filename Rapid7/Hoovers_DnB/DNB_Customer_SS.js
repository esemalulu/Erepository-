/*
 * @author efagone
 */

/* DEPLOYMENT STEPS
 * - Recreate NAICS map record
 * - Recreate DUNS Match Requirements record
 * - recreate any fields not in production: custentityr7dnblocationtype, custentityr7dunsmatch_type, custentityr7dunsmatch_count, custentityr7dunsmatch_resultgrades, custentityr7dnbdomesticultimateduns, custentityr7dnbdomesticultimateparentnam, custentityr7performdunsmatch
 * - Export current data, change necessary field types (fix DUNS field?, custentityr7hooverscompanytype, custentityr7corporatecountry), import data back to fields
 * - Rename Used Fields
 * - Hide/disable unused fields
 * - combine with other Customer beforeSubmits to prevent any field setting order of operations problems. (especially Customer_SS_Misc.js as that currently has updateSegment stuff)
 * - change fields to Rich Text: custentityr7hooversrankingslist, custentityr7hooversalluksic, custentityr7hooversallussic, custentityr7hooversphones, custentityr7hooversurls, custentityr7hooversallhic, custentityr7hooversallnaic
 * - custentityr7corporatecountry has other scripts pointing to it... creating separate field for new version, need to figure out what to do to merge processes
 */


function r7dnb_beforeLoad(type, form, request){

	try {
	
		if (type == 'view') {
			
			var dunsNo = nlapiGetFieldValue('custentityr7dunsnumber');
			form.setScript('customscriptr7dnb_customer_cs');
			if (dunsNo != null && dunsNo.length > 2) {
				form.addButton('custpage_updatednbdata', 'Update D&B Data', 'r7_updateDNB_Data()');
			}
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'ERROR on r7dnb_beforeLoad', 'ID: ' + nlapiGetRecordId() + '\nError: ' + e);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'ERROR on r7dnb_beforeLoad', 'Error: \n\n' + e);
	}
}

function r7dnb_beforeSubmit(type){

	try {
		
		this.type = type;
		this.oldRecord = nlapiGetOldRecord();
		this.newRecord = nlapiGetNewRecord();
		this.arrUpdatedFields = newRecord.getAllFields();
		this.arrNewlyUpdatedFields = [];
		
		if (type == 'create' || type == 'edit' || type == 'xedit') {
			
			checkIfNeedMatchDUNS();
			checkIfNeedUpdateDUNS();
			updateIndustryFromNAICS();
			updateCustomerSegment(type);
			
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'ERROR on r7dnb_beforeSubmit', 'ID: ' + nlapiGetRecordId() + '\nError: ' + e);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'ERROR on r7dnb_beforeSubmit', 'Error: \n\n' + e);
	}
	
}

function updateIndustryFromNAICS(){

	try {
		var objIndustryMap = getIndustryNAICSMap();
		
		var naics = getNewFieldValue('custentityr7hooversnaics');
		
		var objProperMap = (naics && naics.length == 2) ? objIndustryMap.twoDigitMap : objIndustryMap.sixDigitMap;
		
		if (objProperMap.hasOwnProperty(naics)) {
			var currentIndustry = getNewFieldValue('custentityr7rapid7industry');
			var currentSubIndustry = getNewFieldValue('custentityr7rapid7subindustry');
			
			if ((isBlank(currentIndustry) && isBlank(currentSubIndustry)) || (isBlank(currentSubIndustry) && currentIndustry == objProperMap[naics].industry)) {
				updateField_always('custentityr7rapid7industry', objProperMap[naics].industry);
				updateField_always('custentityr7rapid7subindustry', objProperMap[naics].sub_industry);
			}
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'ERROR on updateIndustryFromNAICS', 'ID: ' + nlapiGetRecordId() + '\nError: ' + e);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'ERROR on updateIndustryFromNAICS', 'Error: \n\n' + e);
	}
}

function updateCustomerSegment(type){

	try {
		/*
		 Search 13908 is the cleanup search for this logic (scheduled)
		 
		 LIST:
		 customlistr7customersegment
		 1	Federal
		 2	Fortune 1000
		 3	Mid-Market
		 4	Transactional
		 5	Unknown
		 6	Large Enterprise
		 7	Mid-Sized Enterprise
		 8	Small Market
		 
		 DEFINITION: (from Nick L on 11/10/14)
		 
		 Segment					Revenue	(custentityr7hooverssales)		Employees (custentityr7hooversemployeestotal)
		 Large Enterprise			>=$10Bil					OR			>=10,000
		 Mid-Sized Enterprise		<$10Bil AND >=$1Bil			OR			<10,000 AND >=2,500
		 Mid-Market					<$1Bil AND >=$100Mil		OR			<2,500 AND >=500
		 Small Market				<$100Mil					AND			<500
		 
		 */
		//BEGIN LOGIC
		var currentSegment = getNewFieldValue('custentityr7customersegment');
		var lockSegment = getNewFieldValue('custentityr7lockcustomersegment');
		
		if (lockSegment == 'T'){
			return;
		}

		var revenue = parseFloat(getNewFieldValue('custentityr7hooverssales') || 0); //this is in Millions
		var employees = parseFloat(getNewFieldValue('custentityr7hooversemployeestotal') || 0);
		
		// Large Enterprise
		if (revenue >= 10000 || employees >= 10000) {
			updateField_always('custentityr7customersegment', 6);
			return;
		}
		
		// Mid-Sized Enterprise
		if (revenue >= 1000 || employees >= 2500) {
			updateField_always('custentityr7customersegment', 7);
			return;
		}
		
		// Mid-Market
		if (revenue >= 100 || employees >= 500) {
			updateField_always('custentityr7customersegment', 3);
			return;
		}
		
		// Small Market
		if (revenue || employees) {
			updateField_always('custentityr7customersegment', 8);
			return;
		}
		
		// DEFAULT: NULL
		updateField_always('custentityr7customersegment', '');
		return;
		
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'ERROR on updateCustomerSegment', 'ID: ' + nlapiGetRecordId() + '\nError: ' + e);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'ERROR on updateCustomerSegment', 'Error: \n\n' + e);
	}
}

function checkIfNeedUpdateDUNS(){

	try {
		
		// --------------------- BEGIN ENVIRONMENT CHECK ---------------------
		if (['PRODUCTION'].indexOf(nlapiGetContext().getEnvironment()) == -1) {
			return;
		}
		// --------------------- END ENVIRONMENT CHECK ---------------------
		
		var dunsNo = getNewFieldValue('custentityr7dunsnumber');
		if (isBlank(dunsNo) || dunsNo.length <= 3) {
			// doesn't have duns
			return;
		}
		
		dunsNo = zeroPad(dunsNo, 9); // duns is integer field... should be text... 9 digits always
		if (getNewFieldValue('custentityr7hooversupdateflag') == 'T') {
			
			if (type == 'xedit' || type == 'create'){
				//1) scheduling for xedit due to sublist not available on xedit
				//2) scheduling for create as there are many times the record ends up not getting created for
				//   reasons outside of DNB (example is MUV tries creating customer and fails with "A Customer with
				//   this ID already exists". So to save calls on failed creates I push to scheduled
				updateField_always('custentityr7dnb_scheduledupdate', 'T');
				return;
			}
			
			var dtNow = new Date();
			var minDaysLimit = nlapiGetContext().getSetting('SCRIPT', 'custscriptr7dnbmindaysupdate') || 0;
			
			var dateLastUpdated = getNewFieldValue('custentityr7hooversdateupdated');
			var dateLastAttemptUpdated = getNewFieldValue('custentityr7hooversdatelastupdateattempt');
			
			//If the record should be updated
			if (!dateLastAttemptUpdated || !dateLastUpdated || nlapiAddDays(nlapiStringToDate(dateLastUpdated), minDaysLimit) < dtNow) { //null date last update or attempted, or date is outside limit to re-update
				
				updateField_always('custentityr7hooversdatelastupdateattempt', nlapiDateToString(dtNow));
				
				// run update
				var success = update_DNB(dunsNo);
				
				if (success){
					updateField_always('custentityr7hooversupdateflag', 'F');
					updateField_always('custentityr7dnb_scheduledupdate', 'F');
					updateField_always('custentityr7hooversdateupdated', nlapiDateToString(dtNow));
				}
				
			}
		} else {
			//just in case
			updateField_always('custentityr7dnb_scheduledupdate', 'F');
		}
		
	} 
	catch (e) {
		updateField_always('custentityr7dnb_errortext', e);
		nlapiLogExecution('ERROR', 'ERROR on checkIfNeedUpdateDUNS', 'ID: ' + nlapiGetRecordId() + '\nError: ' + e);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'ERROR on checkIfNeedUpdateDUNS', 'Error: \n\n' + e);
	}
}

function checkIfNeedMatchDUNS(){

	try {
		
		// --------------------- BEGIN ENVIRONMENT CHECK ---------------------
		if (['PRODUCTION'].indexOf(nlapiGetContext().getEnvironment()) == -1) {
			return;
		}
		// --------------------- END ENVIRONMENT CHECK ---------------------
		
		if (getNewFieldValue('custentityr7performdunsmatch') == 'T') {
			var success = runMatchRoutine();
			
			if (success){
				updateField_always('custentityr7performdunsmatch', 'F');
				return;
			}
		}
		
		
	} 
	catch (e) {
		updateField_always('custentityr7dunsmatcherrortext', e);
		nlapiLogExecution('ERROR', 'ERROR on run_DUNS_Match', 'ID: ' + nlapiGetRecordId() + '\nError: ' + e);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'ERROR on run_DUNS_Match', 'Error: \n\n' + e);
	}
}

function runMatchRoutine(){

	try {
	
		var matchedDUNS = null;
		var matchCriteriaText = '';
		var matchCount = '';
		var objMatchGrades = [];
		
		nlapiLogExecution('DEBUG', 'Matching DUNS', 'id: ' + nlapiGetRecordId());
		
		var dunsNo = zeroPad(getNewFieldValue('custentityr7dunsnumber'), 9); // duns is integer field... should be text... 9 digits always
		var recCustomer_withAddressSublist = (newRecord.getLineItemCount('addressbook') != -1) ? newRecord : oldRecord;
		var objCustomerAddressData = getAddressFromCustomer(recCustomer_withAddressSublist);

		var objResponse = dnb_getDUNSMatch(getNewFieldValue('companyname'), dunsNo, getNewFieldValue('phone'), objCustomerAddressData);
		
		updateField_always('custentityr7dunsmatcherrortext', objResponse.error);
	
		if (!objResponse.success) {
			return false;
		}
		
		var errorTxt = '';
		var objMatchData = objResponse.match_data;
		
		if (objMatchData.hasOwnProperty('GetCleanseMatchResponse') && objMatchData.GetCleanseMatchResponse) {
			var GetCleanseMatchResponse = objMatchData.GetCleanseMatchResponse;
			
			if (GetCleanseMatchResponse.hasOwnProperty('TransactionResult') && GetCleanseMatchResponse.TransactionResult.hasOwnProperty('ResultText')) {
				matchCriteriaText = GetCleanseMatchResponse.TransactionResult.ResultText;
			}
			
			if (GetCleanseMatchResponse.hasOwnProperty('GetCleanseMatchResponseDetail') && GetCleanseMatchResponse.GetCleanseMatchResponseDetail) {
			
				var objMatchDetails = GetCleanseMatchResponse.GetCleanseMatchResponseDetail.MatchResponseDetail || {};
				
				if (objMatchDetails.hasOwnProperty('MatchDataCriteriaText')) {
					matchCriteriaText = objMatchDetails.MatchDataCriteriaText.$;
				}
				if (objMatchDetails.hasOwnProperty('CandidateMatchedQuantity')) {
					matchCount = objMatchDetails.CandidateMatchedQuantity
				}
				
				if (objMatchDetails.hasOwnProperty('MatchCandidate')) {
					var arrMatchCandidates = objMatchDetails.MatchCandidate;
					
					
					var arrDUNSMatchRequirements = getDUNSMatchRequirements();
					
					// pop match grade texts for all resutls
					for (var i = 0; arrMatchCandidates && i < arrMatchCandidates.length; i++) {
					
						var MatchQualityInformation = arrMatchCandidates[i].MatchQualityInformation;
						
						if (!MatchQualityInformation) {
							continue;
						}
						
						if (!isBlank(MatchQualityInformation.MatchGradeText)) {
							objMatchGrades.push({
								DUNSNumber: arrMatchCandidates[i].DUNSNumber,
								ConfidenceCodeValue: MatchQualityInformation.ConfidenceCodeValue,
								MatchGradeText: MatchQualityInformation.MatchGradeText
							});
						}
					}
					
					// now check for match
					for (var i = 0; arrMatchCandidates && i < arrMatchCandidates.length; i++) {
					
						var MatchQualityInformation = arrMatchCandidates[i].MatchQualityInformation;
						
						if (!MatchQualityInformation) {
							continue;
						}
						
						//check if candidate meets requirements
						if (matchMeetsRequirements(arrDUNSMatchRequirements, MatchQualityInformation)) {
							matchedDUNS = arrMatchCandidates[i].DUNSNumber;
							break;
						} 
					}
				}
			}
			else {
				errorTxt += '<br>INVALID DUNS Match Response - GetCleanseMatchResponseDetail: ' + JSON.stringify(objMatchData);
				nlapiLogExecution('ERROR', 'INVALID DUNS Match Response - GetCleanseMatchResponseDetail', JSON.stringify(objMatchData));
			}
		}
		else {
			errorTxt += '<br>INVALID DUNS Match Response - GetCleanseMatchResponse: ' + JSON.stringify(objMatchData);
			nlapiLogExecution('ERROR', 'INVALID DUNS Match Response - GetCleanseMatchResponse', JSON.stringify(objMatchData));
			matchCriteriaText = 'Match missing GetCleanseMatchResponse';
		}
		
		updateField_always('custentityr7dunsmatcherrortext', errorTxt);
		updateField_always('custentityr7dunsmatch_type', matchCriteriaText);
		updateField_always('custentityr7dunsmatch_count', matchCount);
		updateField_ifBlank('custentityr7dunsnumber', matchedDUNS);
		updateField_always('custentityr7hooversdateupdated', '');
		updateField_always('custentityr7hooversdatelastupdateattempt', '');
		updateField_always('custentityr7dunsmatch_resultgrades', objMatchGrades.map(function(elem){
			return elem.DUNSNumber + ': ' + elem.ConfidenceCodeValue + '-' + elem.MatchGradeText;
		}).join('<br>'));
		
	} 
	catch (e) {
		updateField_always('custentityr7dunsmatcherrortext', e);
		nlapiLogExecution('ERROR', 'ERROR on runMatchRoutine', 'ID: ' + nlapiGetRecordId() + '\nError: ' + e);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'ERROR on runMatchRoutine', 'Error: \n\n' + e);
	}
	
	return true;
}

function matchMeetsRequirements(arrDUNSMatchRequirements, MatchQualityInformation){

	var arrMatchComponents = MatchQualityInformation.MatchGradeComponent;
	
	// now check to see if match meets requirements set
	for (var j = 0; arrDUNSMatchRequirements && j < arrDUNSMatchRequirements.length; j++) {

		if (!isBlank(arrDUNSMatchRequirements[j].confidence)) {
		
			if (parseFloat(arrDUNSMatchRequirements[j].confidence) > parseFloat(MatchQualityInformation.ConfidenceCodeValue || 0)) {
				// doesn't meet criteria
				continue;
			}
		}
		if (!isBlank(arrDUNSMatchRequirements[j].company_name)) {
		
			if (parseFloat(arrDUNSMatchRequirements[j].company_name) > getMatchScoreByTypeText(arrMatchComponents, 'Name')) {
				// doesn't meet criteria
				continue;
			}
		}
		if (!isBlank(arrDUNSMatchRequirements[j].street_number)) {
		
			if (parseFloat(arrDUNSMatchRequirements[j].street_number) > getMatchScoreByTypeText(arrMatchComponents, 'Street Number')) {
				// doesn't meet criteria
				continue;
			}
		}
		if (!isBlank(arrDUNSMatchRequirements[j].street)) {
		
			if (parseFloat(arrDUNSMatchRequirements[j].street) > getMatchScoreByTypeText(arrMatchComponents, 'Street Name')) {
				// doesn't meet criteria
				continue;
			}
		}
		if (!isBlank(arrDUNSMatchRequirements[j].city)) {
		
			if (parseFloat(arrDUNSMatchRequirements[j].city) > getMatchScoreByTypeText(arrMatchComponents, 'City')) {
				// doesn't meet criteria
				continue;
			}
		}
		if (!isBlank(arrDUNSMatchRequirements[j].state)) {
		
			if (parseFloat(arrDUNSMatchRequirements[j].state) > getMatchScoreByTypeText(arrMatchComponents, 'State')) {
				// doesn't meet criteria
				continue;
			}
		}
		if (!isBlank(arrDUNSMatchRequirements[j].phone)) {
		
			if (parseFloat(arrDUNSMatchRequirements[j].phone) > getMatchScoreByTypeText(arrMatchComponents, 'Phone')) {
				// doesn't meet criteria
				continue;
			}
		}
		if (!isBlank(arrDUNSMatchRequirements[j].zipcode)) {
		
			if (parseFloat(arrDUNSMatchRequirements[j].zipcode) > getMatchScoreByTypeText(arrMatchComponents, 'Postal Code')) {
				// doesn't meet criteria
				continue;
			}
		}
		
		return true;
	}
	
	return false;
}

function getMatchScoreByTypeText(arrMatchComponents, typeText){

	for (var i = 0; arrMatchComponents && i < arrMatchComponents.length; i++) {
	
		if (arrMatchComponents[i].MatchGradeComponentTypeText.$ == typeText) {
			return parseFloat(arrMatchComponents[i].MatchGradeComponentScore || -1);
		}
	}
	
	return -1;
}

function update_DNB(dunsNo){

	nlapiLogExecution('AUDIT', 'Updating DUNS', 'id: ' + nlapiGetRecordId() + '\nDUNS: ' + dunsNo);
	var objResponse = dnb_getDetailedCompanyProfile_order(dunsNo);
	nlapiLogExecution('DEBUG', 'DNB Response', JSON.stringify(objResponse));
	updateField_always('custentityr7dnb_errortext', objResponse.error);
	
	if (!objResponse.success) {
		return false;
	}
	
	var objProfile = objResponse.profile_data;
	
	var OrderProductResponseDetail = objProfile.OrderProductResponse.OrderProductResponseDetail;
	
	var countryCode = (OrderProductResponseDetail.hasOwnProperty('InquiryDetail')) ? OrderProductResponseDetail.InquiryDetail.CountryISOAlpha2Code : null;
	var objOrganization = OrderProductResponseDetail.Product.Organization;
	
	if (!objOrganization) {
		return false;
	}
	
	var companyName = '';
	
	// OrganizationName
	if (objOrganization.hasOwnProperty('OrganizationName') && objOrganization.OrganizationName) {
		var OrganizationName = objOrganization.OrganizationName;
		
		if (OrganizationName.hasOwnProperty('OrganizationPrimaryName') && OrganizationName.OrganizationPrimaryName.length > 0) {
			companyName = OrganizationName.OrganizationPrimaryName[0].OrganizationName.$;
			
			updateField_always('custentityr7hooversname', companyName);
		}
		
		if (OrganizationName.hasOwnProperty('TradeStyleName') && OrganizationName.TradeStyleName) {
			var arrTradeStyleNames = OrganizationName.TradeStyleName;
			
			var arrTradeStyleNamesTxt = [];
			
			for (var i = 0; arrTradeStyleNames && i < arrTradeStyleNames.length; i++) {
				if (arrTradeStyleNames[i].hasOwnProperty('OrganizationName')) {
					arrTradeStyleNamesTxt.push(arrTradeStyleNames[i].OrganizationName.$);
				}
			}
			
			updateField_always('custentityr7dnb_doingbusinessasnames', arrTradeStyleNamesTxt.join('<br>'));
			if (arrTradeStyleNamesTxt && arrTradeStyleNamesTxt.length > 0) {
				updateField_always('custentityr7hooversdba', arrTradeStyleNamesTxt[0]); //TODO: deprecate this old version
			}
		}
	}
	
	// OrganizationDetail
	if (objOrganization.hasOwnProperty('OrganizationDetail') && objOrganization.OrganizationDetail) {
		var OrganizationDetail = objOrganization.OrganizationDetail;
		
		updateField_always('custentityr7hooversownershipyear', (OrganizationDetail.hasOwnProperty('ControlOwnershipDate')) ? OrganizationDetail.ControlOwnershipDate.$ : '');
		updateField_always('custentityr7dnb_companytype', (OrganizationDetail.hasOwnProperty('ControlOwnershipTypeText')) ? OrganizationDetail.ControlOwnershipTypeText.$ : '');
		
		if (OrganizationDetail.hasOwnProperty('FamilyTreeMemberRole') && OrganizationDetail.FamilyTreeMemberRole) {
			var arrFamilyTreeMemberRole = OrganizationDetail.FamilyTreeMemberRole;
			
			var arrFamilyTreeMemberRoleTxt = [];
			for (var i = 0; arrFamilyTreeMemberRole && i < arrFamilyTreeMemberRole.length; i++) {
				if (arrFamilyTreeMemberRole[i].hasOwnProperty('FamilyTreeMemberRoleText') && arrFamilyTreeMemberRole[i].FamilyTreeMemberRoleText.$) {
					arrFamilyTreeMemberRoleTxt.push(arrFamilyTreeMemberRole[i].FamilyTreeMemberRoleText.$);
				}
			}
			updateField_always('custentityr7dnblocationtype', arrFamilyTreeMemberRoleTxt.join(', '));
		}
	}
	
	// RegisteredDetail
	if (objOrganization.hasOwnProperty('RegisteredDetail') && objOrganization.RegisteredDetail) {
		var RegisteredDetail = objOrganization.RegisteredDetail;
		
		if (RegisteredDetail.hasOwnProperty('StockExchangeDetails')) {
			var arrStockExchangeDetails = RegisteredDetail.StockExchangeDetails;
			var tickerSymbol = '';
			
			for (var i = 0; arrStockExchangeDetails && i < arrStockExchangeDetails.length; i++) {
				if (arrStockExchangeDetails[i].hasOwnProperty('StockExchangeTickerName')) {
					tickerSymbol = arrStockExchangeDetails[i].StockExchangeTickerName;
					break;
				}
			}
			
			for (var i = 0; arrStockExchangeDetails && i < arrStockExchangeDetails.length; i++) {
				if (arrStockExchangeDetails[i].hasOwnProperty('PrimaryStockExchangeIndicator')) {
					tickerSymbol = arrStockExchangeDetails[i].StockExchangeTickerName;
					break;
				}
			}
			
			updateField_always('custentityr7hooversstockticker', tickerSymbol);
		}
	}
	
	// Telecommunication
	if (objOrganization.hasOwnProperty('Telecommunication') && objOrganization.Telecommunication) {
		var Telecommunication = objOrganization.Telecommunication;
		
		if (Telecommunication.hasOwnProperty('TelephoneNumber')) {
		
			var arrPhones = Telecommunication.TelephoneNumber;
			var primaryPhone = '';
			var arrAllPhones = [];
			
			for (var i = 0; arrPhones && i < arrPhones.length; i++) {
				if (arrPhones[i] && !isBlank(arrPhones[i].TelecommunicationNumber && arrPhones[i].TelecommunicationNumber.length > 3)) {
					if (i == 0){
						primaryPhone = arrPhones[i].TelecommunicationNumber;
					}
					arrAllPhones.push(arrPhones[i].TelecommunicationNumber);
				}
			}
			
			if (countryCode == 'US' && primaryPhone && primaryPhone.charAt(0) == '0') {
				primaryPhone = primaryPhone.substr(1);
			}
			
			updateField_always('custentityr7corporatephone', primaryPhone);
			updateField_ifBlank('phone', primaryPhone);
			
			updateField_always('custentityr7hooversphones', arrAllPhones.join('\n')); //TODO: deprecate this old version
			updateField_always('custentityr7dnb_companyphonenumbers', arrAllPhones.join('<br>'));
		}
		
		if (Telecommunication.hasOwnProperty('WebPageAddress')) {
		
			var arrURLs = Telecommunication.WebPageAddress;
			var primaryURL = '';
			var arrAllURLs = [];
			
			for (var i = 0; arrURLs && i < arrURLs.length; i++) {
				if (arrURLs[i] && !isBlank(arrURLs[i].TelecommunicationAddress)) {
					if (i == 0){
						primaryURL = arrURLs[i].TelecommunicationAddress;
					}
					arrAllURLs.push(arrURLs[i].TelecommunicationAddress);
				}
			}
			
			if (primaryURL && primaryURL.substr(0, 4).toLowerCase() != 'http') {
				primaryURL = 'http://' + primaryURL;
			}
			
			updateField_ifBlank('url', primaryURL);
			
			updateField_always('custentityr7hooversurls', arrAllURLs.join('\n')); //TODO: deprecate this old version
			updateField_always('custentityr7dnb_companyurls_additional', arrAllURLs.join('<br>')); 
			
			if (!isBlank(primaryURL)) {
			
				var beginDomain = (primaryURL.indexOf('www') == -1) ? primaryURL.indexOf('/') + 2 : primaryURL.indexOf('.') + 1;
				var endDomain = (primaryURL.indexOf('/', beginDomain) >= 0) ? (primaryURL.indexOf('/', beginDomain) == -1) : primaryURL.length;
				var domain = primaryURL.substring(beginDomain, endDomain);
				
				updateField_ifBlank('email', 'info@' + domain);
			}
		}
		
		
	}
	
	// Location
	if (objOrganization.hasOwnProperty('Location') && objOrganization.Location) {
		var Location = objOrganization.Location;
		
		if (Location.hasOwnProperty('PrimaryAddress')) {
			var PrimaryAddress = Location.PrimaryAddress[0];

			updateField_ifBlank('custentityr7corporatestate', PrimaryAddress.TerritoryAbbreviatedName, true);
			updateField_ifBlank('custentityr7corporatezip', PrimaryAddress.PostalCode);
			updateField_ifBlank('custentityr7dnb_corporatecountry', getCountriesIdFromCode(PrimaryAddress.CountryISOAlpha2Code));
			
			// ONLY UPDATE ADDRESSBOOK ON FIRST UPDATE
			if (isBlank(getNewFieldValue('custentityr7hooversdateupdated'))) {

				nlapiSelectNewLineItem('addressbook');
				
				if (nlapiGetLineItemCount('addressbook') <= 0) {
					nlapiSetCurrentLineItemValue('addressbook', 'defaultbilling', 'T');
					nlapiSetCurrentLineItemValue('addressbook', 'defaultshipping', 'T');
				}
				
				if (PrimaryAddress.hasOwnProperty('StreetAddressLine')) {
				
					var arrStreets = PrimaryAddress.StreetAddressLine;
					if (arrStreets.length > 0) {
						nlapiSetCurrentLineItemValue('addressbook', 'addr1', arrStreets[0].LineText);
						nlapiSetCurrentLineItemValue('addressbook', 'label', arrStreets[0].LineText);
						
						if (arrStreets.length > 1) {
							nlapiSetCurrentLineItemValue('addressbook', 'addr2', arrStreets[1].LineText);
						}
					}
				}
				
				nlapiSetCurrentLineItemValue('addressbook', 'addressee', companyName.substring(0, 79));
				nlapiSetCurrentLineItemValue('addressbook', 'city', PrimaryAddress.PrimaryTownName);
				nlapiSetCurrentLineItemValue('addressbook', 'country', PrimaryAddress.CountryISOAlpha2Code);
				nlapiSetCurrentLineItemText('addressbook', 'state', PrimaryAddress.TerritoryAbbreviatedName);
				nlapiSetCurrentLineItemValue('addressbook', 'zip', PrimaryAddress.PostalCode);
				
				nlapiCommitLineItem('addressbook');
			}
		}
	}
	
	// Financial
	if (objOrganization.hasOwnProperty('Financial') && objOrganization.Financial) {
		var Financial = objOrganization.Financial;
		
		if (Financial.hasOwnProperty('KeyFinancialFiguresOverview')) {
			var arrKeyFinancialFiguresOverview = Financial.KeyFinancialFiguresOverview;
			
			if (arrKeyFinancialFiguresOverview.length > 0 && arrKeyFinancialFiguresOverview[0].hasOwnProperty('SalesRevenueAmount')) {
				var arrSalesRevenueAmount = arrKeyFinancialFiguresOverview[0].SalesRevenueAmount;
				
				for (var i = 0; i < arrSalesRevenueAmount.length; i++) {
				
					if (!isBlank(arrSalesRevenueAmount[i].$)) {
						var salesRevenue = parseFloat(arrSalesRevenueAmount[i].$ || 0);
						if (arrSalesRevenueAmount[i]['@UnitOfSize'] == 'SingleUnits') {
							salesRevenue = Math.round((salesRevenue / 1000000) * 100) / 100;
						}
						updateField_always('custentityr7hooverssales', salesRevenue);
						break;
					}
				}
			}
		}
	}
	
	// Linkage
	if (objOrganization.hasOwnProperty('Linkage') && objOrganization.Linkage) {
		var Linkage = objOrganization.Linkage;
		
		if (Linkage.hasOwnProperty('GlobalUltimateOrganization')) {
			var GlobalUltimateOrganization = Linkage.GlobalUltimateOrganization;
			var GlobalOrganizationName = (GlobalUltimateOrganization.hasOwnProperty('OrganizationPrimaryName') && GlobalUltimateOrganization.OrganizationPrimaryName.length > 0) ? GlobalUltimateOrganization.OrganizationPrimaryName[0].OrganizationName.$ : '';
			
			updateField_always('custentityr7hooversultimateparentduns', GlobalUltimateOrganization.DUNSNumber);
			updateField_always('custentityr7hooversultimateparentname', GlobalOrganizationName);
		}
		
		if (Linkage.hasOwnProperty('DomesticUltimateOrganization')) {
			var DomesticUltimateOrganization = Linkage.DomesticUltimateOrganization;
			var DomesticOrganizationName = (DomesticUltimateOrganization.hasOwnProperty('OrganizationPrimaryName') && DomesticUltimateOrganization.OrganizationPrimaryName.length > 0) ? DomesticUltimateOrganization.OrganizationPrimaryName[0].OrganizationName.$ : '';
			
			updateField_always('custentityr7dnbdomesticultimateduns', DomesticUltimateOrganization.DUNSNumber);
			updateField_always('custentityr7dnbdomesticultimateparentnam', DomesticOrganizationName);
			updateField_always('custentityr7hooversaccountingfirm', DomesticOrganizationName); //TODO: this field seems to be a dupe
		}
		
		if (Linkage.hasOwnProperty('ParentOrganization')) {
			var ParentOrganization = Linkage.ParentOrganization;
			var ParentOrganizationName = (ParentOrganization.hasOwnProperty('OrganizationPrimaryName') && ParentOrganization.OrganizationPrimaryName.length > 0) ? ParentOrganization.OrganizationPrimaryName[0].OrganizationName.$ : '';
			
			updateField_always('custentityr7hooversimmediateparent', ParentOrganization.DUNSNumber);
			updateField_always('custentityr7hooversimmediateparentname', ParentOrganizationName);
		}
		
	}
	
	// ThirdPartyAssessment
	if (objOrganization.hasOwnProperty('ThirdPartyAssessment') &&  objOrganization.ThirdPartyAssessment) {
		
		var ThirdPartyAssessment = objOrganization.ThirdPartyAssessment;
		var arrThirdPartyAssessments = (ThirdPartyAssessment.hasOwnProperty('ThirdPartyAssessment')) ? ThirdPartyAssessment.ThirdPartyAssessment : [];
		
		var arrAllRankings = [];
		
		for (var i = 0; arrThirdPartyAssessments && i < arrThirdPartyAssessments.length; i++) {
			arrAllRankings.push(arrThirdPartyAssessments[i].AssessmentTypeValue);
		}
		
		updateField_always('custentityr7hooversrankingslist', arrAllRankings.join('\n')); //TODO: deprecate this old version
		updateField_always('custentityr7dnb_rankings', arrAllRankings.join('<br>'));
	}
	
	// EmployeeFigures
	if (objOrganization.hasOwnProperty('EmployeeFigures') && objOrganization.EmployeeFigures) {
		var EmployeeFigures = objOrganization.EmployeeFigures;
		
		if (EmployeeFigures.hasOwnProperty('ConsolidatedEmployeeDetails')) {
			var ConsolidatedEmployeeDetails = EmployeeFigures.ConsolidatedEmployeeDetails;
			
			updateField_always('custentityr7hooversemployeestotal', (ConsolidatedEmployeeDetails.hasOwnProperty('TotalEmployeeQuantity') ? ConsolidatedEmployeeDetails.TotalEmployeeQuantity : ''));
		}
		
		if (EmployeeFigures.hasOwnProperty('IndividualEntityEmployeeDetails')) {
			var IndividualEntityEmployeeDetails = EmployeeFigures.IndividualEntityEmployeeDetails;
			
			updateField_always('custentityr7hooversemployeesatthislocati', (IndividualEntityEmployeeDetails.hasOwnProperty('TotalEmployeeQuantity') ? IndividualEntityEmployeeDetails.TotalEmployeeQuantity : ''));
		}
	}
	
	// IndustryCode
	if (objOrganization.hasOwnProperty('IndustryCode') && objOrganization.IndustryCode) {
		var IndustryCode = objOrganization.IndustryCode;
		
		var arrNAICS = [];
		var arrSIC = [];
		var arrUKSIC = [];
		var arrHIC = [];
		
		if (IndustryCode.hasOwnProperty('IndustryCode')) {
			var arrIndustryCodes = IndustryCode.IndustryCode;
			
			for (var i = 0; arrIndustryCodes && i < arrIndustryCodes.length; i++) {
				if (arrIndustryCodes[i].hasOwnProperty('IndustryCode')) {
				
					var code = arrIndustryCodes[i].IndustryCode.$;
					var description = (arrIndustryCodes[i].hasOwnProperty('IndustryCodeDescription')) ? arrIndustryCodes[i].IndustryCodeDescription[0].$ : '';
					
					switch (arrIndustryCodes[i]['@DNBCodeValue']) {
						case 700: //NAICS
							arrNAICS.push({
								code: code,
								description: description
							});
							break;
						case 25838: //D&B Hoovers Industry Code
							arrHIC.push({
								code: code,
								description: description
							});
							break;
						case 21182: //UK SIC 2003
							arrUKSIC.push({
								code: code,
								description: description
							});
							break;
						case 3599: //D&B Standard Industry Code
							arrSIC.push({
								code: code,
								description: description
							});
							break;
						case 399: //US Standard Industry Code 1987 - 4 digit
							break;
					}
				}
			}
			
			//------------------------------------------------------------------------------------------------------
			//NAICS
			updateField_always('custentityr7hooversnaics', (arrNAICS[0]) ? arrNAICS[0].code : '');
			updateField_always('custentityr7dnb_allnaicscodelist', arrNAICS.map(function(elem){
				return elem.code + ' ' + elem.description;
			}).join('<br>')); 
			updateField_always('custentityr7hooversallnaic', arrNAICS.map(function(elem){
				return elem.code + ' ' + elem.description;
			}).join('\n')); //TODO: deprecate this old version: replaced with custentityr7dnb_allnaicscodelist
			//------------------------------------------------------------------------------------------------------
			
			// US SIC
			updateField_always('custentityr7hooverssiac', (arrSIC[0]) ? arrSIC[0].code : '');
			updateField_always('custentityr7dnb_allussiccodelist', arrSIC.map(function(elem){
				return elem.code + ' ' + elem.description;
			}).join('<br>')); 
			updateField_always('custentityr7hooversallussic', arrSIC.map(function(elem){
				return elem.code + ' ' + elem.description;
			}).join('\n>')); //TODO: deprecate this old version: replaced with custentityr7dnb_allussiccodelist
			//------------------------------------------------------------------------------------------------------
			
			// UK SIC
			updateField_always('custentityr7hooversprimaryuksic', (arrUKSIC[0]) ? arrUKSIC[0].code : '');
			updateField_always('custentityr7dnb_alluksiccodelist', arrUKSIC.map(function(elem){
				return elem.code + ' ' + elem.description;
			}).join('<br>'));
			updateField_always('custentityr7hooversalluksic', arrUKSIC.map(function(elem){
				return elem.code + ' ' + elem.description;
			}).join('\n')); //TODO: deprecate this old version: replaced with custentityr7dnb_alluksiccodelist
			//------------------------------------------------------------------------------------------------------
			
			// HIC
			updateField_always('custentityr7hoovershicname', (arrHIC[0]) ? arrHIC[0].code : '');
			updateField_always('custentityr7dnb_allhiclist', arrHIC.map(function(elem){
				return elem.code + ' ' + elem.description;
			}).join('<br>'));
			updateField_always('custentityr7hooversallhic', arrHIC.map(function(elem){
				return elem.code + ' ' + elem.description;
			}).join('\n')); //TODO: deprecate this old version: replaced with custentityr7dnb_allhiclist
			//------------------------------------------------------------------------------------------------------
		}
	}
	
	return true;
	
}

function getIndustryNAICSMap(){

	var obj2Digits = {};
	var obj6Digits = {};
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	
	var arrColumns = [];
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('custrecordr7naicsmap_2digitcode');
	arrColumns[2] = new nlobjSearchColumn('custrecordr7naicsmap_6digitcode');
	arrColumns[3] = new nlobjSearchColumn('custrecordr7naicsmap_subindustry');
	arrColumns[4] = new nlobjSearchColumn('custrecordr7subindustryindustry', 'custrecordr7naicsmap_subindustry');
	
	var savedsearch = nlapiCreateSearch('customrecordr7naicsindustrymap', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var i = 0; resultSlice != null && i < resultSlice.length; i++) {
		
			var id = resultSlice[i].getValue(arrColumns[0]);
			var twoDigitCode = resultSlice[i].getValue(arrColumns[1]);
			var sixDigitCode = resultSlice[i].getValue(arrColumns[2]);
			
			if (!isBlank(twoDigitCode)) {
				obj2Digits[twoDigitCode] = {
					id: resultSlice[i].getValue(arrColumns[0]),
					sub_industry: resultSlice[i].getValue(arrColumns[3]),
					industry: resultSlice[i].getValue(arrColumns[4])
				};
			}
			
			if (!isBlank(sixDigitCode)) {
				obj6Digits[sixDigitCode] = {
					id: resultSlice[i].getValue(arrColumns[0]),
					sub_industry: resultSlice[i].getValue(arrColumns[3]),
					industry: resultSlice[i].getValue(arrColumns[4])
				};
			}
			
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return {
		twoDigitMap: obj2Digits,
		sixDigitMap: obj6Digits
	};
}

function getCountriesIdFromCode(countryCode){

	if (isBlank(countryCode)) {
		return null;
	}
	
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	arrFilters.push(new nlobjSearchFilter('custrecordr7countriescountryid', null, 'is', countryCode));
	
	var arrColumns = [];
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('name');
	arrColumns[2] = new nlobjSearchColumn('custrecordr7countriescountryid');
	
	var savedsearch = nlapiCreateSearch('customrecordr7countries', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var i = 0; resultSlice != null && i < resultSlice.length; i++) {
		
			return resultSlice[i].getValue(arrColumns[0]);
			
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return null;
}


function updateField_ifBlank(fieldId, newValue, updateText){

	try {
	
		if (isBlank(getNewFieldValue(fieldId))) {
			arrNewlyUpdatedFields.push(fieldId);
			if (updateText) {
				nlapiSetFieldText(fieldId, newValue);
			}
			else {
				nlapiSetFieldValue(fieldId, newValue);
			}
		}
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Could not updateField_ifBlank', 'fieldId: ' + fieldId + '\nnewValue: ' + newValue + '\nupdateText: ' + updateText + '\nError: ' + err);
	}
}

function updateField_always(fieldId, newValue, updateText){

	try {
		
		arrNewlyUpdatedFields.push(fieldId);
		
		if (updateText) {
			nlapiSetFieldText(fieldId, newValue);
		}
		else {
			nlapiSetFieldValue(fieldId, newValue);
		}
		
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Could not updateField_always', 'fieldId: ' + fieldId + '\nnewValue: ' + newValue + '\nupdateText: ' + updateText + '\nError: ' + err);
	}
}

function isBlank(val){
	return (val == null || val == '') ? true : false;
}

function getNewFieldValue(fieldId){
	// if the record is direct list edited or mass updated, run the script
	if (type == 'xedit') {
		
		if (arrUpdatedFields.indexOf(fieldId) != -1 || arrNewlyUpdatedFields.indexOf(fieldId) != -1) {
			return nlapiGetFieldValue(fieldId);
		}
		
		return oldRecord.getFieldValue(fieldId);
	}
	else {
		return nlapiGetFieldValue(fieldId);
	}
}

function getCustomerRecId(stage){
	
	if (stage == null || stage == ''){
		return null;
	}
	
	stage = stage.toLowerCase();
	
	switch (stage) {
		case '_lead':
			stage = 'lead';
			break;
		case '_prospect':
			stage = 'prospect';
			break;
		case '_customer':
			stage = 'customer';
			break;
	}
	
	return stage;
}

function zeroPad(num, size){

	if (num == null || num == '') {
		return '';
	}
	
	var s = num + '';
	while (s.length < size) {
		s = '0' + s;
	}
	return s;
}