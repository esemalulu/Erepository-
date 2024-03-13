/*
 * @author efagone
 */
/*
 * @author efagone
 */

function resourceResponse(request, response){

	if (request.getMethod() == 'GET') {
	
		var surveyType = request.getParameter('custparamtype');
		var resourceId = request.getParameter('custparamresourceid');
		
		if (surveyType != 1 && surveyType != 2 && surveyType != 3) {
			throw nlapiCreateError('INVALID TYPE', 'Invalid type parameter', true);
		}
		
		if (surveyType == 1 || surveyType == 2) {
			var engSID = request.getParameter('custparamengsid');
				
			if (engSID == null || engSID == '') {
				throw nlapiCreateError('MISSING PARAM', 'Missing a required parameter', true);
			}
			
			var engagementId = validateSID(engSID);
		}
		
		if (surveyType == 3) {
			var compSID = request.getParameter('custparamcompsid');
			var validateCompResult = validateCompSID(compSID);
			
			if (validateCompResult == null) {
				throw nlapiCreateError('INVALID COMP', 'Administrator has been notified.', false);
			}
			
			var componentId = validateCompResult[0];
			var engagementId = validateCompResult[1];
			
			if (componentId == null || componentId == '' || engagementId == null || engagementId == '') {
				throw nlapiCreateError('SUITELET ERROR', 'Administrator has been notified.', false);
			}
		}
		
		if (engagementId == null || engagementId == '') {
			throw nlapiCreateError('INVALID ENG', 'Administrator has been notified.', false);
		}
		
		var recEngagement = nlapiLoadRecord('customrecordr7psoengagement', engagementId);
		
		if (validateResourceId(engagementId, resourceId) == null) {
			throw nlapiCreateError('INVALID RESOURCE', 'Administrator has been notified.', false);
		}
		
		var form = nlapiCreateForm('Resource Response Survey', true);
		form.setScript('customscriptr7psoresourceresponse_cs');
		
		var primaryGroup = form.addFieldGroup('primarygroup', 'Engagement Information');
		var questionsGroup = form.addFieldGroup('questionsgroup', 'Please Fill In Below');
		
		var fldSurveyType = form.addField('custpagesurvtype', 'text').setDisplayType('hidden');
		var fldEngagementSID = form.addField('custpageengsid', 'text').setDisplayType('hidden');
		var fldCompSID = form.addField('custpagecompsid', 'text').setDisplayType('hidden');
		var fldResourceId = form.addField('custpageresourceid', 'text').setDisplayType('hidden');
		var fldProjectManager = form.addField('custpageprojectmanager', 'text', 'Project Manager', null, 'primarygroup').setDisplayType('inline');
		var fldEngType = form.addField('custpageengtype', 'text', 'Type', null, 'primarygroup').setDisplayType('inline');
		var fldItem = form.addField('custpageitem', 'text', 'Item', null, 'primarygroup').setDisplayType('inline');
		var fldSpacer = form.addField('custpagespacer', 'inlinehtml', null, null, 'primarygroup');
		fldProjectManager.setDisplaySize(200);
		fldProjectManager.setLayoutType('normal', 'startcol');
		fldSpacer.setPadding(1);
		
		//populate default values for all types
		fldSurveyType.setDefaultValue(surveyType);
		fldEngagementSID.setDefaultValue(engSID);
		fldCompSID.setDefaultValue(compSID);
		fldResourceId.setDefaultValue(resourceId);
		fldProjectManager.setDefaultValue(recEngagement.getFieldText('custrecordr7psoengprojectmanager'));
		fldItem.setDefaultValue(nlapiLookupField('item', recEngagement.getFieldValue('custrecordr7psoengitemnumber'), 'displayname'));
		fldEngType.setDefaultValue(recEngagement.getFieldText('custrecordr7psoengtype'));
		
		//begin type specific stuff
		
		if (surveyType == 1) {
			//type 1 
			var fldQuestion1 = form.addField('custpage1question1', 'inlinehtml', null, null, 'questionsgroup');
			var fldAnswer1 = form.addField('custpage1answer1', 'select', null, null, 'questionsgroup');
			var fldComments = form.addField('custpage1comment', 'textarea', 'Comments', null, 'questionsgroup');
			
			sourceYesNoRisk(fldAnswer1);
			fldComments.setDisplaySize(90, 4);
			fldAnswer1.setDisplaySize(50);
			fldAnswer1.setMandatory(true);
			fldComments.setMandatory(true);
			fldQuestion1.setLayoutType('normal', 'startcol');
			fldQuestion1.setPadding(1);
			
			//now type specific
			var maxEngDateNonReport = recEngagement.getFieldValue('custrecordr7psoengdatemaxcompnonreport');
			if (maxEngDateNonReport == null || maxEngDateNonReport == '') {
				maxEngDateNonReport = nlapiDateToString(new Date());
				var deadlineDate = null;
			}
			
			var deadlineDate = nlapiDateToString(add2BusinessDays(nlapiStringToDate(maxEngDateNonReport)));
			
			fldQuestion1.setDefaultValue('Will the deliverable from the work ending on ' + getDay(nlapiStringToDate(maxEngDateNonReport)) + ', ' + maxEngDateNonReport + ' be in Peer Review by <b>' + getDay(nlapiStringToDate(deadlineDate)) + ', ' + deadlineDate + '</b>?');
		}
		
		if (surveyType == 2 || surveyType == 3) {
		
			//type 2 and 3
			var fld2Question1 = form.addField('custpage2question1', 'textarea', 'How did the Engagement go?', null, 'questionsgroup');
			var fld2Question1a = form.addField('custpage2question1a', 'textarea', 'Please comment on the Political Landscape for this account. (People, security initiatives, pain points, compelling event, etc.)', null, 'questionsgroup');
			var fld2Question2 = form.addField('custpage2question2', 'select', 'Were there any Upsell Opportunities you identified?', null, 'questionsgroup');
			var fld2Question2a = form.addField('custpage2question2a', 'select', 'What type(s)?', null, 'questionsgroup');
			var fld2Comments2 = form.addField('custpage2comments2', 'textarea', 'Upsell Information', null, 'questionsgroup');
			
			if (surveyType == 2) {
				var fld2Question3 = form.addField('custpage2question3', 'select', 'Was the Engagement scoped properly?', null, 'questionsgroup');
				fld2Question3.setMandatory(true);
				sourceYesNo(fld2Question3);
			}
			
			fld2Question1.setLayoutType('normal', 'startcol');
			fld2Question1.setPadding(1);
			sourceYesNoRisk(fld2Question2);

			sourceUpsellType(form, fld2Question2a);
			fld2Question1.setDisplaySize(90, 4);
			fld2Question1a.setDisplaySize(90, 4);
			fld2Comments2.setDisplaySize(90, 4);
			fld2Question2.setDisplaySize(50);
			fld2Question1.setMandatory(true);
			fld2Question1a.setMandatory(true);
			fld2Question2.setMandatory(true);
			fld2Question2a.setMandatory(true);
			fld2Comments2.setMandatory(true);
			
			fld2Question2a.setDisabled(true);
			fld2Comments2.setDisabled(true);
		}
		
		form.addSubmitButton('Submit');
		response.writePage(form);
		
	}
	
	if (request.getMethod() == 'POST') {
	
		var surveyType = request.getParameter('custpagesurvtype');
		var engSID = request.getParameter('custpageengsid');
		var resourceId = request.getParameter('custpageresourceid');
		
		//type 1
		var atRisk = request.getParameter('custpage1answer1');
		var atRiskComments = request.getParameter('custpage1comment');
		
		//type 2 and 3
		var howEngGo = request.getParameter('custpage2question1');
		var polLandscape = request.getParameter('custpage2question1a');
		var upsellComments = request.getParameter('custpage2comments2');
		var scopedRight = request.getParameter('custpage2question3');
		
		if (resourceId != null && resourceId != '') {
			if (surveyType == 3) {
				var compSID = request.getParameter('custpagecompsid');
				var validateCompResult = validateCompSID(compSID);
				
				if (validateCompResult == null) {
					throw nlapiCreateError('INVALID COMP', 'Administrator has been notified.', false);
				}
				
				var componentId = validateCompResult[0];
				var engagementId = validateCompResult[1];
				
				if (componentId == null || componentId == '' || engagementId == null || engagementId == '') {
					throw nlapiCreateError('SUITELET ERROR', 'Administrator has been notified.', false);
				}
			}
			else {
				var engagementId = validateSID(engSID);
				if (engagementId == null || engagementId == '') {
					throw nlapiCreateError('INVALID ENG', 'Administrator has been notified.', false);
				}
			}
			
			var recEngagement = nlapiLoadRecord('customrecordr7psoengagement', engagementId);
			
			var resourceName = validateResourceId(engagementId, resourceId);
			
			if (resourceName == null) {
				throw nlapiCreateError('INVALID RESOURCE', 'Administrator has been notified.', false);
			}
			
			atRiskComments = cleanString(atRiskComments);
			howEngGo = cleanString(howEngGo);
			polLandscape = cleanString(polLandscape);
			upsellComments = cleanString(upsellComments);
						
			if (atRiskComments != null && atRiskComments != '') {
				var currentAtRiskComments = recEngagement.getFieldValue('custrecordr7psoengcomments');
				recEngagement.setFieldValue('custrecordr7psoengcomments', formatComments(currentAtRiskComments) + '\n' + nlapiDateToString(new Date()) + ' - ' + resourceName + ': ' + atRiskComments);
			}
			
			if (recEngagement.getFieldValue('custrecordr7psoengatrisk') == 6) {
				recEngagement.setFieldValue('custrecordr7psoengatrisk', atRisk);
			}
			
			if (upsellComments != null && upsellComments != '') {
				var currentUpsellComments = recEngagement.getFieldValue('custrecordr7psoengupsellopps');
				recEngagement.setFieldValue('custrecordr7psoengupsellopps', formatComments(currentUpsellComments) + nlapiDateToString(new Date()) + ' - ' + resourceName + ': ' + upsellComments);
			}
			
			if (howEngGo != null && howEngGo != '') {
				var currentPostComments = recEngagement.getFieldValue('custrecordr7psoengpostcomments');
				recEngagement.setFieldValue('custrecordr7psoengpostcomments', formatComments(currentPostComments) + '\n' + nlapiDateToString(new Date()) + ' - ' + resourceName + ': ' + howEngGo);
			}
			
			if (polLandscape != null && polLandscape != '') {
				var currentPolLands = recEngagement.getFieldValue('custrecordr7psoengpolitcallandscape');
				recEngagement.setFieldValue('custrecordr7psoengpolitcallandscape', formatComments(currentPolLands) + '\n' + nlapiDateToString(new Date()) + ' - ' + resourceName + ': ' + polLandscape);
			}
			
			if (scopedRight != null && scopedRight != '') {
				recEngagement.setFieldValue('custrecordr7psoengscopevalid', scopedRight);
			}
			
			//type 1 
			if (surveyType == 1) {
				recEngagement.setFieldValue('custrecordr7psoengdatemaxcompnonreprespo', nlapiDateToString(new Date()));
				nlapiSubmitRecord(recEngagement);
			}
			//type 2
			if (surveyType == 2) {
				recEngagement.setFieldValue('custrecordr7psoengdatemaxcompreprespond', nlapiDateToString(new Date()));
				nlapiSubmitRecord(recEngagement);
			}
			//type 3
			if (surveyType == 3) {
				nlapiSubmitRecord(recEngagement);
				nlapiSubmitField('customrecordr7psocomponent', componentId, 'custrecordr7psodatepostcomponentemailres', nlapiDateToString(new Date()));
			}
			
			response.writeLine('Thanks for filling this out!');
		}
	}
}

function validateSID(engSID){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7psoengsid', null, 'is', engSID);
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7psoengagement', null, arrSearchFilters);
	
	if (arrSearchResults != null && arrSearchResults.length == 1) {
		var engagementId = arrSearchResults[0].getId();
		
		return engagementId;
	}
	
	return null;
}

function validateCompSID(compSID){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7psocompsid', null, 'is', compSID);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7psocompengagement');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7psocomponent', null, arrSearchFilters, arrSearchColumns);
	
	if (arrSearchResults != null && arrSearchResults.length == 1) {
		var componentId = arrSearchResults[0].getId();
		var engagementId = arrSearchResults[0].getValue(arrSearchColumns[0]);
		
		return new Array(componentId, engagementId);
	}
	
	return null;
}

function validateResourceId(engagementId, resourceId){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('internalid', 'custrecordr7psocompengagement', 'is', engagementId);
	arrSearchFilters[1] = new nlobjSearchFilter('internalid', 'custrecordr7psocompresource', 'is', resourceId);
	arrSearchFilters[1].setLeftParens(1);
	arrSearchFilters[1].setOr(true);
	arrSearchFilters[2] = new nlobjSearchFilter('custrecordr7psoengresourceprimary', 'custrecordr7psocompengagement', 'is', resourceId);
	arrSearchFilters[2].setRightParens(1);
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7psocomponent', null, arrSearchFilters);
	
	if (arrSearchResults != null && arrSearchResults.length > 0) {
		var resourceName = nlapiLookupField('customrecordr7psoresources', resourceId, 'name');
		
		return resourceName;
	}
	
	return null;
}

function formatComments(comments){

	if (comments != null && comments != '') {
		comments = comments + '\n';
	}
	else {
		comments = '';
	}
	
	return comments;
}

function sourceYesNoRisk(fld){

	fld.addSelectOption('', '');
	fld.addSelectOption(6, 'Yes');
	fld.addSelectOption(4, 'No');
	
}

function sourceYesNo(fld){

	fld.addSelectOption('', '');
	fld.addSelectOption(1, 'Yes');
	fld.addSelectOption(2, 'No');
	
}

function sourceUpsellType(form, fld){
	
	fld.addSelectOption('', '');
	
	var fldTemp = form.addField('custpagetemp4691693', 'select', 'temp', '477').setDisplayType('hidden');
	var arrSelectOptions = fldTemp.getSelectOptions();
	
	for (var i =0; arrSelectOptions != null && i < arrSelectOptions.length; i++){
		
		fld.addSelectOption(arrSelectOptions[i].getId(), arrSelectOptions[i].getText());
		
	}
}

function getDay(dateObject){

	var weekday = new Array(7);
	weekday[0] = "Sunday";
	weekday[1] = "Monday";
	weekday[2] = "Tuesday";
	weekday[3] = "Wednesday";
	weekday[4] = "Thursday";
	weekday[5] = "Friday";
	weekday[6] = "Saturday";
	
	return weekday[dateObject.getDay()];
}

function add2BusinessDays(dateObject){

	var newDate = nlapiAddDays(dateObject, 2);
	
	if (newDate.getDay() == 6) {
		newDate = nlapiAddDays(newDate, 2);
	}
	if (newDate.getDay() == 0) {
		newDate = nlapiAddDays(newDate, 1);
	}
	
	return newDate;
}

function cleanString(str){
	
	if (str != null && str != '') {
		var replaceRegex = new RegExp(/[^A-Za-z0-9\?\@\.\, '"!%$\(\)\#]/g);
		str = str.replace(replaceRegex, '');
	}
	
	return str;
}
