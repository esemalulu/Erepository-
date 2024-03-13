/*
 * @author efagone
 */

function afterSubmit(type){

	try {
	
		if (type != 'delete') {
		
			var record = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());

			var surveySID = record.getFieldValue('custrecordr7psosurveysid');
			var surveyParentJobId = record.getFieldValue('custrecordr7psosurveyparentjob');
			var surveyEngagementId = record.getFieldValue('custrecordr7psosurveyeng');
			
			
			if (surveySID != null && surveySID != '' && (surveyParentJobId == '' || surveyParentJobId == null || surveyEngagementId == '' || surveyEngagementId == null)) {
			
				var arrSearchFilters = new Array();
				arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7psoengsid', null, 'is', surveySID);
				
				var arrSearchColumns = new Array();
				arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7psoengcustomer');
				arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7psoengparentjob');
				
				var arrSearchResults = nlapiSearchRecord('customrecordr7psoengagement', null, arrSearchFilters, arrSearchColumns);
				
				if (arrSearchResults != null && arrSearchResults.length == 1) {
					var engagementId = arrSearchResults[0].getId();
					var customerId = arrSearchResults[0].getValue(arrSearchColumns[0]);
					var parentJobId = arrSearchResults[0].getValue(arrSearchColumns[1]);
					var arrResources = grabEngagementResources(engagementId);
					
					var arrReactivates = new Array();
					for (var i = 0; arrResources != null && i < arrResources.length; i++) {
					
						var resourceInactive = nlapiLookupField('customrecordr7psoresources', arrResources[i], 'isinactive');
						
						if (resourceInactive == 'T') {
							nlapiSubmitField('customrecordr7psoresources', arrResources[i], 'isinactive', 'F');
							arrReactivates[arrReactivates.length] = arrResources[i];
						}
					}
					
					var fields = new Array();
					fields[0] = 'custrecordr7psosurveyparentjob';
					fields[1] = 'custrecordr7psosurveyeng';
					fields[2] = 'custrecordr7psosurveycustomer';
					fields[3] = 'custrecordr7psosurveyresource';
					
					var values = new Array();
					values[0] = parentJobId;
					values[1] = engagementId;
					values[2] = customerId;
					values[3] = arrResources;
					
					try {
						nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), fields, values);
						
					} 
					catch (e) {
						for (var i = 0; arrReactivates != null && i < arrReactivates.length; i++) {
							nlapiSubmitField('customrecordr7psoresources', arrReactivates[i], 'isinactive', 'T');
						}
					}
					
					for (var i = 0; arrReactivates != null && i < arrReactivates.length; i++) {
						nlapiSubmitField('customrecordr7psoresources', arrReactivates[i], 'isinactive', 'T');
					}
				}
			}
			
			
			var engagementId = nlapiLookupField(nlapiGetRecordType(), nlapiGetRecordId(), 'custrecordr7psosurveyeng');
			
			if (engagementId != null && engagementId != '') {
				
				var surveyDateCreated = record.getFieldValue('created');
				var dtSurveyDateCreated = new Date(Date.parse(surveyDateCreated));

				nlapiSubmitField('customrecordr7psoengagement', engagementId, 'custrecordr7psoengsurveydatecreated', nlapiDateToString(dtSurveyDateCreated, 'datetimetz'));
			}
		}
		
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error saving PSO Survey', 'Error: ' + e);
	}
	
	
}

function grabEngagementResources(engagementId){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7psocompengagement', null, 'is', engagementId);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7psocompresource');
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7psocomponent', null, arrSearchFilters, arrSearchColumns);
	
	var arrResourceList = new Array();
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var currentResource = arrSearchResults[i].getValue(arrSearchColumns[0]);

		if (currentResource != null && currentResource != '') {
			arrResourceList[arrResourceList.length] = currentResource;
		}
		
	}
	
	arrResourceList = unique(arrResourceList);
	
	return arrResourceList;
}

function unique(a){
	a.sort();
	for (var i = 1; i < a.length;) {
		if (a[i - 1] == a[i]) {
			a.splice(i, 1);
		}
		else {
			i++;
		}
	}
	return a;
}