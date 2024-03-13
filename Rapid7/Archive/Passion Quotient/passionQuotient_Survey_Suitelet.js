/**
 * 
 * Module Description
 * 
 * Author	mburstein
 * Version	1.10
 * Date		01 Aug 2013
 * 
 * @record
 * @script
 * @scriptlink <a href=""></a>      
 *
 * MB: 4/21/2014 - Commented out lines that encode html entities.  These aren't needed when recording the data in NetSuite
 * MB: 10/29/14 - Updated Referrer for 2014 part 2.  Also, added debugging statements for checking referer format.
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */

//TODO block dual submits???
function createPQSurvey(request, response){
	if (request.getMethod() == 'GET') {
	    var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
	
		var sId = request.getParameter('custparam_sid');
		//r7Pq$urv3y sha256
		if (sId != '32bdfb824e039757fafced1597d0f93f0d671f7064bbfdbfc074fe875d3e6e38') {
			response.write('INSUFFICIENT PERMISSIONS');
		}
		else{
			var record = nlapiCreateRecord('customrecordr7passionquotientsurvey');
			var custFields = getCustRecFields(record);
			var objOptions = getObjOptions(record,custFields);
			var responseJSON = formatJSON(objOptions);
			//var file = createFileJSON(responseJSON);
			/*var headers = {
				'Access-Control-Allow-Origin' : '*'
			};
			response.addHeaders(headers);*/
			response.write(responseJSON);	
			return;	
		}
	}	
	if (request.getMethod() == 'POST'){
		nlapiLogExecution('DEBUG','test');
		var sId = request.getParameter('custparam_sid');
		if (sId != '32bdfb824e039757fafced1597d0f93f0d671f7064bbfdbfc074fe875d3e6e38') {
			response.write('INSUFFICIENT PERMISSIONS');
			nlapiLogExecution('DEBUG','insufficient perm');
			return;
		}
		else {
			
			var record = nlapiCreateRecord('customrecordr7passionquotientsurvey');
			// Get headers and parameters
			var headers = request.getAllHeaders()
			var params = request.getAllParameters();
			
			// If the referer isn't the PQ homepage then error
			var referer = headers['Referer'];
			if (referer != toURL+'/c.663271/PassionQuotient2014%20part%202/passionQuotient.html') {
				response.write('The originating page is invalid');
				nlapiLogExecution('DEBUG','referer',referer);
				return;
			}
			// Log headers
			for(header in headers){
				nlapiLogExecution('DEBUG',header,headers[header]);	
			}
			// Set field values
			for (param in params) {			
				if(param.indexOf('custrecord') != -1 && params[param] != 0){
					// Get rid of [] for checkbox fields
					if (param.indexOf('[]') != -1){
						var val = params[param];
						// Make the string into an array
						val = val.split(',');
						for(v in val){
							//val[v] = encodeHtmlEntities(val[v]);
							val[v] = val[v];
						}
						// Delete old param key:val pair and replace with new param key:val pair
						delete params[param];
						param = param.replace(/\[\]/g,'');
						params[param] = val;
						nlapiLogExecution('DEBUG', param, params[param]);
						record.setFieldValue(param,params[param]);
					}
					else{
						nlapiLogExecution('DEBUG', param, params[param]);
						//record.setFieldValue(param,encodeHtmlEntities(params[param]));
						record.setFieldValue(param,params[param]);
					}			
				}
			}
			// If record with custrecordr7pqclientsid already exists then ignore this as duplicate
			var clientSid = params['custrecordr7pqclientsid'];	
			var isDupe = isDuplicateSubmission(clientSid);
			if (!isDupe) {
				var id = nlapiSubmitRecord(record);			
				if (id != null && id != '' || isDupe) {
					response.write('Thank You');
					return;
				}
				else {
					response.write('There was an error');
					
				}
			}
		}
	}
}

function getObjOptions(record, custFields){

	var objOptions = new Object();
	for (var i in custFields) {
		var fieldId = custFields[i];
		var field = record.getField(fieldId);
		var fieldType = field.getType();
		// Grab options (nlobjSelectOption) from list and store in array
		if (fieldType == 'select' || fieldType == 'multiselect') {
			var options = field.getSelectOptions();
			var fieldOptions = new Object();
			for (var option in options) {
				if (fieldId == 'custrecordr7pqsurveydepartment') {
					fieldOptions[options[option]['id']] = options[option]['text'];
				}
				else{
					fieldOptions[options[option]['id']] = options[option]['text'];
				}
			}
			objOptions[fieldId] = fieldOptions;
		}
	}
	return objOptions;
}


// Get all custom fields from record
function getCustRecFields(record){
	var fields = record.getAllFields();
	var custFields = new Array();
	for (var i = 0; fields != null && i < fields.length; i++) {
		var field = fields[i];
		if (field.indexOf('custrecord') != -1) {
			custFields[custFields.length] = field;
		}
	}
	return custFields;
}

function formatJSON(objText){
	this.response.setContentType('HTMLDOC');
	return JSON.stringify(objText);
}

function createFileJSON(content){
	var name = 'passionQuotient.json';
	var folder = 818696; // Web Site Hosting Files > Live Hosting Files > PassionQuotient
	var file = nlapiCreateFile(name,'HTMLDOC',content);
	file.setFolder(folder);
	try {
		nlapiSubmitFile(file);
	}
	catch(e){
		nlapiLogExecution('ERROR','Could not submit PQ JSON file',e);
	}
}
/*
 * This might be used at a later time to make more dynamic
 *
function getObjOptions(record,custFields){
	
	var objOptions = new Object();
	for (var i in custFields) {
		var fieldId = custFields[i];
		var field = record.getField(fieldId);
		var fieldType = field.getType();
		// Grab options (nlobjSelectOption) from list and store in array
		var fieldOptions = new Object();
		fieldOptions['type'] = fieldType;
		fieldOptions['mandatory'] = field.mandatory;
		fieldOptions['section'] = getSection(fieldId);
		// Get options for selects
		if (fieldType == 'select' || fieldType =='multiselect') {
			var options = field.getSelectOptions();				
			fieldOptions['options'] = new Object();
			for (var option in options) {
				fieldOptions['options'][options[option]['id']] = options[option]['text'];			
			}		
		}
		//objOptions[fieldId] = fieldOptions;
	}
	return objOptions;
}	*/

// Since there is no way to get the subtab - hardcode array
function getSection(fieldId){
	// Default to general section
	var section = 'general';
	
	var objSections = {
		career : [
			'custrecordr7pqsurveyclearcareerpath',
			'custrecordr7pqsurveycareerpathresources',
			'custrecordr7pqsurveyreceptrecruit',
			'custrecordr7pqwhatdowrecruitercom',
			'custrecordr7pqsurveyrolegrowthspeed',
			'custrecordr7pqsurveywhattoleave',
			'custrecordr7pqsurveyreasonforjoining',
			'custrecordr7pqsurveycarerrcomments'
		],	
		communication : [
			'custrecordr7pqsurveycomfortcomwmanager',
			'custrecordr7pqsurveycomeffectoneng',
			'custrecordr7pqsurveycomtypepref',
			'custrecordr7pqsurveyfeelaboutcomemail',
			'custrecordr7pqsurveyfeelaboutcomthall',
			'custrecordr7pqsurveyfeelaboutcomvideo',
			'custrecordr7pqsurveyfeelaboutcomleadshar',
			'custrecordr7pqsurveycomcomment'
		],	
		compensation : [
			'custrecordr7pqsurveyfaircomp',
			'custrecordr7pqsurveyinspiredbypayinc',
			'custrecordr7pqsurveycompcomments'
		],
		morale :[
			'custrecordr7pqsurveyinspiredbyexec',
			'custrecordr7pqsurveyinspiredbyyourteam',
			'custrecordr7pqsurveyinspiredbyyourmang',
			'custrecordr7pqsurveychallengedbymang',
			'custrecordr7pqsurveychallengedbyrole',
			'custrecordr7pqsurveychallengedbyself',
			'custrecordr7pqsurveyworkismeaningful',
			'custrecordr7pqsurveypowtomakedecisions',
			'custrecordr7pqsurveyinterestedinr7bus',
			'custrecordr7pqsurveycareerdevthoughtyou',
			'custrecordr7pqsurveycareerdevthoughtmang',
			'custrecordr7pqsurveycareerdevthoughtvp',
			'custrecordr7pqsurveycareerdevthoughtexec',
			'custrecordr7pqsurveytoolstosucced',
			'custrecordr7pqsurveydeliveronpromteam',
			'custrecordr7pqsurveydeliveronprommang',
			'custrecordr7pqsurveydeliveronpromvp',
			'custrecordr7pqsurveydeliveronpromexec',
			'custrecordr7pqsurveyhowwellcomteam',
			'custrecordr7pqsurveyhowwellcommang',
			'custrecordr7pqsurveyhowwellcomvp',
			'custrecordr7pqsurveyhowwellcomexec',
			'custrecordr7pqsurveybiggestdriverbegin',
			'custrecordr7pqsurveywhattofix',
			'custrecordr7pqsurveybiggestdrivernow',
			'custrecordr7pqsurveymoralecomments',
		],
	};
	
	// If the fieldId is found in one of the section arrays then set the section.
	for (sect in objSections) {
		var arrSection = objSections[sect];
		if (arrSection.indexOf(fieldId) != -1) {
			section = sect;
			break;
		}
	}
	
	return section;
}

// Since there is no way to get the subtab - hardcode array
function getInputType(fieldId){
	// Default to general section
	var section = 'general';
	
	var objSections = {
		select : [
			'custrecordr7pqsurveyclearcareerpath',
			'custrecordr7pqsurveycareerpathresources',
			'custrecordr7pqsurveyreceptrecruit',
			'custrecordr7pqwhatdowrecruitercom',
			'custrecordr7pqsurveyrolegrowthspeed',
			'custrecordr7pqsurveywhattoleave',
			'custrecordr7pqsurveyreasonforjoining',
			'custrecordr7pqsurveycarerrcomments'
		],	
		communication : [
			'custrecordr7pqsurveycomfortcomwmanager',
			'custrecordr7pqsurveycomeffectoneng',
			'custrecordr7pqsurveycomtypepref',
			'custrecordr7pqsurveyfeelaboutcomemail',
			'custrecordr7pqsurveyfeelaboutcomthall',
			'custrecordr7pqsurveyfeelaboutcomvideo',
			'custrecordr7pqsurveyfeelaboutcomleadshar',
			'custrecordr7pqsurveycomcomment'
		],	
		compensation : [
			'custrecordr7pqsurveyfaircomp',
			'custrecordr7pqsurveyinspiredbypayinc',
			'custrecordr7pqsurveycompcomments'
		],
		morale :[
			'custrecordr7pqsurveyinspiredbyexec',
			'custrecordr7pqsurveyinspiredbyyourteam',
			'custrecordr7pqsurveyinspiredbyyourmang',
			'custrecordr7pqsurveychallengedbymang',
			'custrecordr7pqsurveychallengedbyrole',
			'custrecordr7pqsurveychallengedbyself',
			'custrecordr7pqsurveyworkismeaningful',
			'custrecordr7pqsurveypowtomakedecisions',
			'custrecordr7pqsurveyinterestedinr7bus',
			'custrecordr7pqsurveycareerdevthoughtyou',
			'custrecordr7pqsurveycareerdevthoughtmang',
			'custrecordr7pqsurveycareerdevthoughtvp',
			'custrecordr7pqsurveycareerdevthoughtexec',
			'custrecordr7pqsurveytoolstosucced',
			'custrecordr7pqsurveydeliveronpromteam',
			'custrecordr7pqsurveydeliveronprommang',
			'custrecordr7pqsurveydeliveronpromvp',
			'custrecordr7pqsurveydeliveronpromexec',
			'custrecordr7pqsurveyhowwellcomteam',
			'custrecordr7pqsurveyhowwellcommang',
			'custrecordr7pqsurveyhowwellcomvp',
			'custrecordr7pqsurveyhowwellcomexec',
			'custrecordr7pqsurveybiggestdriverbegin',
			'custrecordr7pqsurveywhattofix',
			'custrecordr7pqsurveybiggestdrivernow',
			'custrecordr7pqsurveymoralecomments',
		],
	};
	
	// If the fieldId is found in one of the section arrays then set the section.
	for (sect in objSections) {
		var arrSection = objSections[sect];
		if (arrSection.indexOf(fieldId) != -1) {
			section = sect;
			break;
		}
	}
	
	return section;
}

// Check to see if the submission is a duplicate, return true if it is duplicate
function isDuplicateSubmission(clientSid){
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter( 'custrecordr7pqclientsid', null, 'is', clientSid);
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid', null, null);
	
	var results = nlapiSearchRecord('customrecordr7passionquotientsurvey', null, filters, columns);
	if (results != null) {
		return true;
	}
	else{
		return false;
	}
}
