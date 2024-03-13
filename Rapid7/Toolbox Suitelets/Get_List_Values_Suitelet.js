/**
 * Module Description
 * 
 * Author     mburstein 
 * Version    1.00
 * Date       04 Mar 2013   
 * 
 * Version    1.1
 * Date       20 Jun 2013 
 * 
 * Returns the values from a Netsuite list in the specified format. If no paramters entered, list the possible list internal Ids. 
 * Valid lists and their respective parameter values are described in the custom record 'Valid IDs - GetList Suitelet' (customrecordr7valididsgetlistsuitelet)
 * 
 *
 * Accepted parameters:
 * 
 * 	custparamlist = internal Id of the list
 * 	custparamformat = xml or jsonp
 * 
 * Formats:
 * 
 * 	text
 * 	xml
 * 	jsonp
 * 
 * 
 * @script (customscriptr7getlistvaluessuitlet)
 *
 * @module Get List Values Suitelet
 */

/**
 * Returns the values from a Netsuite list in the specified format. If no paramters entered, list the possible list internal Ids.
 * @class getListValues
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function getListValues(request, response){
	if (request.getMethod() == 'GET' || request.getMethod() == 'POST') {
		
		/*
		 * Get valid IDs from record 'Valid IDs - GetList Suitelet'
		 * objValidIds contains recId and listId for all listParams
		 */
		this.objValidIds = getValidIds();
		// objOptionsTxt for text
		this.objOptionsTxt = new Object();
		var responseText = "";		
		/**
		 * The response format
		 * @property format 
		 * @type {String}
		 */
		// What format? xml or JSON
		this.format = request.getParameter('custparamformat');
		if (this.format == null || this.format == '') {
			this.format = 'jsonp';
		}
		nlapiLogExecution('DEBUG','Format',format);
		
		// Test if we have valid paramters
		var validateParameters = testIsValidParameters(request);
		// if not then write the error page, which lists valid list IDs
		if (!validateParameters.valid) {
			response.write(validateParameters.responseText);
		}
		
		else {
			//Create placeholder form to grab list options
			var form = nlapiCreateForm("", true);
			var listParam = request.getParameter('custparamlist');
			// If looking for State/Province/Country record then run SOAP service request
			if (listParam == 'statecountry') {
				var objStates = getStates(listParam);
				responseText = formatTextForType(objStates);
			}
			else if(listParam =='countries'){
				var objCountries = getCountries(listParam);
				responseText = formatTextForType(objCountries);
			}
			else {
				var listId = objValidIds[listParam]['listId'];
				
				// Create a select field to look up list options for list whos internal ID is listParam
				var listParamField = form.addField('custpage_' + listId, 'select', null, listId);
				
				// Grab options (nlobjSelectOption) from list and store in array
				var arrListOptions = listParamField.getSelectOptions();
				
				var objListValues = buildListValuesObject(listParam, arrListOptions);
				
				// Format the list values for XML or JSON
				// TODO add text format option
				responseText = formatTextForType(objListValues);
			}
			
			response.write(responseText);
			return;
		}
	}
}
/**
 * Build an object to format the States/Provinces/Countries.
 * 
 * @method getStates
 * @param {String} listParam The list id
 * @return {Object} Returns an object for XML/JSON formatting and stores a text version in this.objOptionsTxt
 */
function getStates(listParam){
	// Object for XML/JSON
	var object = new Object();

	object[listParam] = new Object();
	
	var listId = objValidIds[listParam]['listId'];
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('custrecordr7statecountrycuscountry').setSort(true);
	columns[2] = new nlobjSearchColumn('name').setSort(false);
	columns[3] = new nlobjSearchColumn('custrecordr7statecountrycusstate');
	columns[4] = new nlobjSearchColumn('custrecordr7statecountrycuscountryid');		
		
	var searchResults = nlapiSearchRecord(listId, null, null, columns);
	var arrOptions = new Array();
	for (var i = 0; searchResults != null && i < searchResults.length; i++) {
		searchResult = searchResults[i];
		// Build object where key is contactId and value is 'first last'
		var stateId = encodeHtmlEntities(searchResult.getValue(columns[2]));
		var country = encodeHtmlEntities(searchResult.getText(columns[1]));
		var state = encodeHtmlEntities(searchResult.getValue(columns[3]));
		var countryId = encodeHtmlEntities(searchResult.getValue(columns[4]));
		
		// Build object for XML and JSON
		arrOptions[arrOptions.length] = {
			option: {
				'countryid': countryId,
				'country': country,
				'id': stateId,
				'state': state,
			}	
		};
		
		//Build object for Text
		objOptionsTxt[i] = countryId + ':' + country + ':' + stateId + ':' + state;	
	}
	object[listParam] = arrOptions;
	
	return object;	
}
/**
 * Build an object to format the Countries (Native) record.
 * 
 * @method getCountries
 * @param {String} listParam The list id
 * @return {Object} Returns an object for XML/JSON formatting and stores a text version in this.objOptionsTxt
 */
function getCountries(listParam){
	// Object for XML/JSON
	var object = new Object();

	object[listParam] = new Object();
	
	var listId = objValidIds[listParam]['listId'];
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('name');
	columns[2] = new nlobjSearchColumn('custrecordr7countriescountryid');	
		
	var searchResults = nlapiSearchRecord(listId, null, null, columns);
	var arrOptions = new Array();
	for (var i = 0; searchResults != null && i < searchResults.length; i++) {
		searchResult = searchResults[i];
		// Build object where key is contactId and value is 'first last'
		var country = encodeHtmlEntities(searchResult.getValue(columns[1]));
		var countryId = encodeHtmlEntities(searchResult.getValue(columns[2]));
		
		arrOptions[arrOptions.length] = {
			option : {
				countryid : countryId,
				country : country
			}
		};
		//Build object for Text
		objOptionsTxt[i] = countryId + ':' + country;	
	}
	
	object[listParam] = arrOptions;
	return object;	
}
/**
 * Build an object to store the selected list's values.
 * 
 * @method buildListValuesObject
 * @param {String} listParam The requested list
 * @param {Array} arrListOptions The list values
 * @return {Object} Returns and object for XML/JSON formatting and stores a text version in 'this'
 */
function buildListValuesObject(listParam,arrListOptions){
	// Object for XML/JSON
	var object = new Object();

	object[listParam] = new Object();
	for (var i = 0; arrListOptions != null && i < arrListOptions.length; i++) {
		var listOption = arrListOptions[i];
		var listId = listOption.getId();
		var listText = listOption.getText();
		
		// Build object for XML and JSON
		object[listParam]['option' + i] = {
			'id': listId,
			'text': listText,
		};
			
		//Build object for Text
		objOptionsTxt[listId] = listText;
		
		//nlapiLogExecution('DEBUG',listParam +' option '+i+':',listOption.getId() +' / '+listOption.getText());
	}
	
	return object;
}
/**
 * Search for valid list IDs - custrecord Valid IDs - GetList Suitelet (customrecordr7valididsgetlistsuitelet)
 * @method getValidIds
 * @return {Object} validLists
 */
function getValidIds(){
	
	// Search for valid list IDs - custrecord Valid IDs - GetList Suitelet
	
	var columns = new Array();
		columns[0] = new nlobjSearchColumn('internalid');
		columns[1] = new nlobjSearchColumn('custrecordr7valididsgetlistsuitlistiid'); // List Internal ID
		columns[2] = new nlobjSearchColumn('custrecordr7valididsgetlistsuitlistparam'); // List Param
	
	var validLists = new Object();
		
	var searchResults = nlapiSearchRecord('customrecordr7valididsgetlistsuitelet', null, null, columns);
	for (var i=0; searchResults != null && i < searchResults.length; i++){
		searchResult = searchResults[i];
		// Build object where key is contactId and value is 'first last'
		var recId = searchResult.getValue(columns[0]);
		var listId = searchResult.getValue(columns[1]);
		var listParam = searchResult.getValue(columns[2]);
		/**
		 * Build object where:
		 * 
		 * 	key = listParam (from request)
		 * 	value = object of recId and listId
		 * @property validLists
		 * @type {Object}
		 */
		validLists[listParam] = {recId:recId,listId:listId};
	}
	
	return validLists;
}
/**
 * Check if the custparamlist is a valid list.  If not valid then list out the valid list IDs.
 * @method testIsValidParameters
 * @param {Object} request
 * @return {Object} response
 */
function testIsValidParameters(request){
    var response = {};
    var text = new Object;
	var listParam = request.getParameter('custparamlist');
	nlapiLogExecution('DEBUG','list param: ',listParam);
	text.error = 'The parameter '+listParam+' is not a valid list ID.';
	text.validIds = {};
	response.valid = false;
	
	for (prop in objValidIds){
        if (listParam == prop) {
            response.valid = true;	
            break;
        }
		var recId = objValidIds[prop]['recId'];
		text['validIds']['Id'+recId] = prop;
    }
   
    if (!response.valid) {
        response.responseText = formatTextForType(text);
        return response;
    } 
    response.responseText = "";
    
    return response;
}
/**
 * Use response.setContentType to format the document response type for the given format
 * Formats:
 * 
 * 	text
 * 	xml
 * 	jsonp
 * 	
 * @method formatTextForType
 * @param {Object} objText
 * @return {String} Formatted Text
 */
function formatTextForType(objText){
	// 

	if (this.format == 'jsonp') {
		this.response.setContentType('HTMLDOC');
        return JSON.stringify(objText);
    }
	if (this.format == 'text'){
		this.response.setContentType('HTMLDOC');
		var string = '';
		for(prop in objOptionsTxt){
			string += prop+':'+objOptionsTxt[prop]+'<br />';
		}
		return string;
	}
    else {
		this.response.setContentType('XMLDOC');
		var xml = '<xml>';
		xml += formatXMLSubObjects(objText);
		xml += '</xml>';
		return xml;
    }
}