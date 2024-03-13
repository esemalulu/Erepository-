/**
 * @author mburstein

MB: 6/9/2014 - Add search filter for isinactive, remove JSONP functions since they are included by default

Takes in parameters
	custparammessage    listevents | eventdetail
	custparamid         must be a valid internalid 
	custparameventtypefilter  provide id of form type, from list 'R7 Event Registration Type' 
	custparamformtypefilter - provide id of form type, from list 'R7 Event Reg Form Type' (not active)
	custparamcategoryfilter - provide id of category, from list 'R7 Event Categories'
	custparamformat  xml or jsonp
 * 
 * MB: 4/23/15 - Change #360 - Update Event_Master_DisplayOnWeb_Suitelet.js JSON Formatting
 * 		Remove parseEventResponse from JSON responses
 * 
 * MB: 7/30/15 -Change #555 - Update Event Display Suitelet - Bug/Fix
 * 		List Event result Value instead of Text
 */

var validMessages = new Array("listevents","eventdetail","listeventtypes","listformtypes");

//Let Jess specify her own return function
//Validate jsonp along with a return function

function postEvents(request, response){

	if (request.getMethod() == 'GET' || request.getMethod() == 'POST') {
	
		var responseText = "";
		
		var validateParameters = testIsValidParameters(request);
		
		this.format = request.getParameter('custparamformat');
		nlapiLogExecution('DEBUG','Response','test');
		if (this.format == null || this.format == '') 
			this.format = 'jsonp';
		
		if (!validateParameters.valid) {
			response.write(validateParameters.responseText);
		}
		else 
			if (request.getParameter('custparammessage') == 'eventdetail') {
				//TODO  - ask DZ what to return
				if (format == 'jsonp') {
					responseText = listEventJSONP(request);
				}
				else {
					responseText = listEventXML(request);
				}
			}
			else 
				if (request.getParameter('custparammessage') == 'listevents') {
				
					//TODO - ask DZ what to filter on additionally
					if (format == 'jsonp') {
						responseText = searchEventsJSONP(request);
					}
					else {
						responseText = searchEventsXML(request);
					}
				}
				else 
					if (request.getParameter('custparammessage') == 'listeventtypes') {
					
						//TODO - ask DZ what to filter on additionally
						if (format == 'jsonp') {
							responseText = searchEventTypesJSONP(request);
						}
						else {
							responseText = searchEventTypesXML(request);
						}
					}
					/*else 
						if (request.getParameter('custparammessage') == 'listformtypes') {
						
							//TODO - ask DZ what to filter on additionally
							if (format == 'jsonp') {
								responseText = searchLocationsJSONP(request);
							}
							else {
								responseText = searchLocationsXML(request);
							}
						}*/
		
		if (format == 'jsonp') {
			response.setContentType('HTMLDOC');
			response.write(responseText);
		}
		else {
			response.setContentType('XMLDOC');
			response.write(responseText);
		}
		return;
	}
}

function listEventJSONP(request){
    var eventId = request.getParameter('custparamid');
    
    try {
        var eventRecord = nlapiLoadRecord('customrecordr7eventregmaster', eventId);
    } 
    catch (err) {
        return getErrorText("Event not found");
    }
	
    var classSize = eventRecord.getFieldValue('custrecordr7eventreglimit');
	var numberOfAttendees = eventRecord.getFieldValue('custrecordr7eventregnumberofattendees');
	var slotsAvailable = classSize-numberOfAttendees;
	
    var response = new Object();
    var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
    //response.eDetail = new Array();
    for (var i = 0; i < eventDetailFields.length; i++) {
    	
		switch(eventDetailFields[i]){
			case 'custrecordr7eventregtype':
				response[eventDetailFields[i]] = eventRecord.getFieldText(eventDetailFields[i]);
				break;
				
			case 'custrecordr7eventregsku':
				// Get Array of SKUs			 			
				var eventSkus = new Array();
				eventSkus = eventRecord.getFieldValues(eventDetailFields[i]);
				var numberOfSkus = eventSkus.length;
				response['numberOfSkus'] = escape(numberOfSkus);
				for (var w = 0; w < eventSkus.length; w++) {
					var eventSku = eventSkus[w];					
					response[eventDetailFields[i]+(w+1)] = escape(eventSku);
				}
				break;
				
			case 'custrecordr7eventregcategory':
				// Get Array of Categories multi-select
				var eventCategory = new Array();
				eventCategory = eventRecord.getFieldValues(eventDetailFields[i]);
				var numberOfCategories = eventCategory.length;
				response['numberOfCategories'] = escape(numberOfCategories);
				for (var w = 0; w < eventCategory.length; w++) {
					var eventCategory = eventCategory[w];					
					response[eventDetailFields[i]+(w+1)] = escape(eventCategory);
				}
				break;
				
			case 'custrecordr7eventregagenda':
				// Get URL of agenda pdf	
				var fileId = eventRecord.getFieldValue(eventDetailFields[i]);
				if (fileId !=nu& fileId != ''){
					var fileUrl = getFileUrl(fileId);	
					response[eventDetailFields[i]] = toURL+escape(fileUrl);
				}		
				break;
			
			default:
				response[eventDetailFields[i]] = escape(eventRecord.getFieldValue(eventDetailFields[i]));			
		}
	
		/*if (eventDetailFields[i] == 'custrecordr7eventregtype') {
			response[eventDetailFields[i]] = escape(eventRecord.getFieldText(eventDetailFields[i]));
		}
		else if(eventDetailFields[i] == 'custrecordr7eventregsku'){			
			// Get Array of SKUs	
			response[eventDetailFields[i]] = escape(eventRecord.getFieldValues(eventDetailFields[i]));
		}
		else if(eventDetailFields[i] == 'custrecordr7eventregagenda'){			
			// Get URL of agenda pdf	
			var fileId = eventRecord.getFieldValue(eventDetailFields[i])
			var fileUrl = getFileUrl(fileId);	
			response[eventDetailFields[i]] = 'https://system.netsuite.com'+escape(fileUrl);
		}
		else{
			response[eventDetailFields[i]] = escape(eventRecord.getFieldValue(eventDetailFields[i]));
		}*/
    }
	
	// MB: 6/9/14 - Add parsing for Product, Territory, Course Type if Event Type = Open Enrollment
	var eventRecType = eventRecord.getFieldValue('custrecordr7eventregtype'); 
	if (eventType = 7) {
		var strTitle = eventRecord.getFieldValue('custrecordr7eventregtitle');
		strTitle = strTitle.replace(/[\-\(\)]/g, "");
		nlapiLogExecution('DEBUG', 'strTitle', strTitle);
		var titleAsArray = strTitle.split(" ");
		response['product'] = titleAsArray[0];
		response['track'] = titleAsArray[1];
		response['territory'] = titleAsArray[titleAsArray.length - 1];
	}
 	response['slotsAvailable'] = escape(slotsAvailable);
	response['numberOfSkus'] = escape(numberOfSkus);
    var responseString = JSON.stringify(response);
    //responseString = 'parseEventResponse(' + responseString + ')';
    return responseString;
}

function listEventXML(request){
    var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
    var eventId = request.getParameter('custparamid');
    
    try {
        var eventRecord = nlapiLoadRecord('customrecordr7eventregmaster', eventId);
    } 
    catch (err) {
        return getErrorText("Event not found");
    }
    
	var classSize = eventRecord.getFieldValue('custrecordr7eventreglimit');
	var numberOfAttendees = eventRecord.getFieldValue('custrecordr7eventregnumberofattendees');
	var slotsAvailable = classSize-numberOfAttendees;
	
    var responseXml = "\n<eventDetail>";
    //Add in various fields
    for (var i = 0; i < eventDetailFields.length; i++) {
		responseXml += "\n<" + eventDetailFields[i] + ">";		
		switch (eventDetailFields[i]) {
			case 'custrecordr7eventregtype':
				responseXml += eventRecord.getFieldText(eventDetailFields[i]);
				break;
				
			case 'custrecordr7eventregsku':
				// Get Array of SKUs multi-select
				var eventSkus = new Array();
				eventSkus = eventRecord.getFieldValues(eventDetailFields[i]);
				var numberOfSkus = eventSkus.length;
				responseXml += "\n<numberOfSkus>"+numberOfSkus+"</numberOfSkus>"
				for (var w = 0; w < eventSkus.length; w++) {
					var eventSku = eventSkus[w];
					responseXml += "\n<" + eventDetailFields[i] + (w+1) +">";
					responseXml += eventSku + '\n';
					responseXml += "</" + eventDetailFields[i] + (w+1) +">";
				}	
				break;
			
			case 'custrecordr7eventregcategory':
				// Get Array of Categories multi-select
				var eventCategory = new Array();
				eventCategory = eventRecord.getFieldValues(eventDetailFields[i]);
				var numberOfCategories = eventCategory.length;
				responseXml += "\n<numberOfCategories>"+numberOfCategories+"</numberOfCategories>"
				for (var w = 0; w < eventCategory.length; w++) {
					var eventCategory = eventCategory[w];
					responseXml += "\n<" + eventDetailFields[i] + (w+1) +">";
					responseXml += eventCategory + '\n';
					responseXml += "</" + eventDetailFields[i] + (w+1) +">";
				}	
				break;
				
			case 'custrecordr7eventregagenda':
				// Get URL of agenda pdf	
				var fileId = eventRecord.getFieldValue(eventDetailFields[i]);
				if (fileId !=null && fileId != ''){
					var fileUrl = getFileUrl(fileId);
					responseXml += toURL + escape(fileUrl);	
				}
				else{
					responseXml += 'No Agenda Attached';
				}
				break;
				
			default:
				responseXml += eventRecord.getFieldValue(eventDetailFields[i]);
		}
		/*if (eventDetailFields[i] == 'custrecordr7eventregtype') {
			responseXml += eventRecord.getFieldText(eventDetailFields[i]);
		}
		else if(eventDetailFields[i] == 'custrecordr7eventregagenda'){
			
			// Get URL of agenda pdf	
			var fileId = eventRecord.getFieldValue(eventDetailFields[i])
			var fileUrl = getFileUrl(fileId);	
			responseXml += 'https://system.netsuite.com'+escape(fileUrl);
		}
		else {
			responseXml += eventRecord.getFieldValue(eventDetailFields[i]);
		}	*/	
    	responseXml += "</" +
        eventDetailFields[i] +
        ">";
    }
	responseXml += "\n<slotsAvailable>"+slotsAvailable+"</slotsAvailable>"
    responseXml += "\n</eventDetail>";
    return responseXml;
}

function searchEventsXML(request){
    var searchResults = getSearchResults(request);
	
    //Creating and returning the XML
    var responseXML = "\n<listevents>";
    for (var i = 0; searchResults != null && i < searchResults.length; i++) {
        responseXML += '\n<event>';
        for (var j = 0; j < searchColumns.length; j++) {
            responseXML += '\n<' + searchColumns[j].getName() + '>' +
            searchResults[i].getValue(searchColumns[j]) +
            '</' +
            searchColumns[j].getName() +
            '>';
        }
        responseXML += "\n</event>";
    }
    responseXML += "\n</listevents>";
    return responseXML;
}

function searchEventsJSONP(request){
    var searchResults = getSearchResults(request);
    
    var response = new Object();
    response.events = new Array();
    
    for (var i = 0; searchResults != null && i < searchResults.length; i++){
        var entry = new Object();
        for (var j = 0; j < searchColumns.length; j++) {
        	/*
        	 * Change #555 - Update Event Display Suitelet - Bug/Fix
        	 * 	List Event result Value instead of Text
        	 */
        	entry[searchColumns[j].getName()] = searchResults[i].getValue(searchColumns[j]);				
        }
        response.events[response.events.length] = entry;
    }

    var responseString = JSON.stringify(response);
    
    //responseString = 'parseEventResponse(' + responseString + ')';
    
    return responseString;
}

function searchEventTypesXML(request){
	var searchColumns = new Array();
	searchColumns[0] = new nlobjSearchColumn('custrecordr7eventregtype', null, 'group');
	searchColumns[1] = new nlobjSearchColumn('custrecordr7eventregtype', null, 'group');

    var searchResults = getSearchResults(request, searchColumns);
	
    //Creating and returning the XML
    var responseXML = "\n<listEventType>";
    for (var i = 0; searchResults != null && i < searchResults.length; i++) {
        responseXML += '\n<eventType>';
            responseXML += '\n<internalid>' + searchResults[i].getValue(searchColumns[0]) + '</internalid>';
            responseXML += '\n<' + searchColumns[1].getName() + '>' +
            searchResults[i].getText(searchColumns[1]) +
            '</' +
            searchColumns[1].getName() +
            '>';
        responseXML += "\n</eventType>";
    }
    responseXML += "\n</listEventType>";
    return responseXML;
}

function searchEventTypesJSONP(request){
	var searchColumns = new Array();
	searchColumns[0] = new nlobjSearchColumn('custrecordr7eventregtype', null, 'group');
	searchColumns[1] = new nlobjSearchColumn('custrecordr7eventregtype', null, 'group');
	
    var searchResults = getSearchResults(request, searchColumns);
    
    var response = new Object();
    response.eventTypes = new Array();
    
    for (var i = 0; searchResults != null && i < searchResults.length; i++) {
		var entry = new Object();
		entry['internalid'] = escape(searchResults[i].getValue(searchColumns[0]));
		entry[searchColumns[1].getName()] = escape(searchResults[i].getText(searchColumns[1]));
		response.eventTypes[response.eventTypes.length] = entry;
	}
	
    var responseString = JSON.stringify(response);
    
    //responseString = 'parseEventTypeResponse(' + responseString + ')';
    
    return responseString;
}

function searchFormTypesXML(request){
	var searchColumns = new Array();
	searchColumns[0] = new nlobjSearchColumn('custrecordr7eventregformtype', null, 'group');
	searchColumns[1] = new nlobjSearchColumn('custrecordr7eventregformtype', null, 'group');

    var searchResults = getSearchResults(request, searchColumns);
	
    //Creating and returning the XML
    var responseXML = "\n<listFormType>";
    for (var i = 0; searchResults != null && i < searchResults.length; i++) {
        responseXML += '\n<formType>';
            responseXML += '\n<internalid>' + searchResults[i].getValue(searchColumns[0]) + '</internalid>';
            responseXML += '\n<' + searchColumns[1].getName() + '>' +
            searchResults[i].getText(searchColumns[1]) +
            '</' +
            searchColumns[1].getName() +
            '>';
        responseXML += "\n</formType>";
    }
    responseXML += "\n</listFormType>";
    return responseXML;
}

function searchFormTypesJSONP(request){
	var searchColumns = new Array();
	searchColumns[0] = new nlobjSearchColumn('custrecordr7eventregformtype', null, 'group');
	searchColumns[1] = new nlobjSearchColumn('custrecordr7eventregformtype', null, 'group');
	
    var searchResults = getSearchResults(request, searchColumns);
    
    var response = new Object();
    response.eventTypes = new Array();
    
    for (var i = 0; searchResults != null && i < searchResults.length; i++) {
		var entry = new Object();
		entry['internalid'] = escape(searchResults[i].getValue(searchColumns[0]));
		entry[searchColumns[1].getName()] = escape(searchResults[i].getText(searchColumns[1]));
		response.eventTypes[response.eventTypes.length] = entry;
	}
	
    var responseString = JSON.stringify(response);
    
    responseString = 'parseFormTypeResponse(' + responseString + ')';
    
    return responseString;
}
function getSearchResults(request, searchColumnsOther){
    //Standard Search Filters
    var searchFilters = new Array();
    
    //Hardcoded filters
	searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7eventregdisplayweb', null, 'is', 'T');
	searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7eventregpubdate', null, 'onorbefore', 'today');
	searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7eventregpubenddate', null, 'onorafter', 'today');
	searchFilters[searchFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	//searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7eventregdate', null, 'onorafter', 'today');
	
		
    // Additional filters
    
	if (searchColumnsOther != null && searchColumnsOther != ''){
		searchColumns = searchColumnsOther;
	}
	
	 // Event Type filter
    var eType = request.getParameter('custparameventtypefilter');
    if (eType != null && eType != '') {
        searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7eventregtype', null, 'is', eType);
    }
	
	// Category Filter
	var cType = request.getParameter('custparamcategoryfilter');
    if (cType != null && cType != '') {
        searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7eventregcategory', null, 'is', cType);
    }
	
	 //Form Type filter
    /*var fType = request.getParameter('custparamformtypefilter');
    if (fType != null && fType != '') {
        searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7eventregformtype', null, 'is', fType);
    }*/
	
    //Searching the record
    var searchResults = nlapiSearchRecord('customrecordr7eventregmaster', null, searchFilters, searchColumns);
    
	if (searchResults != null) {
		//searchResults.sort(myCustomSort);
	}
    return searchResults;   
}

function myCustomSort(a, b){
	var eventA = a.getText(searchColumns[2]) + a.getText(searchColumns[3]) + a.getValue(searchColumns[1]);
	var eventB = b.getText(searchColumns[2]) + b.getText(searchColumns[3]) + b.getValue(searchColumns[1]);
	
	if (eventA < eventB) //sort string ascending
		return -1
	if (eventA > eventB) 
		return 1
	return 0 //default return value (no sorting)
}

function processPublishDate(strPublishDate){
	var publishDate = nlapiStringToDate(strPublishDate);
	var dateToday = new Date();
	if (dateToday<publishDate){
		return 'F';
	}
	else{
		return 'T';
	}
}

function isRestrictedEvent(recEventMaster){
	
	// Checkbox for publish	
	var postOnWebsite = recEventMaster.getFieldValue('custrecordr7eventregdisplayweb');	
	// Publish date
	var strPublishDate = recEventMaster.getFieldValue('custrecordr7eventregpubdate');
	var boolPublish = processPublishDate(strPublishDate);
	if (postOnWebsite=='T' && boolPublish=='T'){
		return 'F';
	}
	else{
		return 'T';
	}
}
//added setSort() to searchColumn(custrecordeventregdate)- SF 11/17/15
var searchColumns = [new nlobjSearchColumn('internalid'), new nlobjSearchColumn('custrecordr7eventregtitle'), new nlobjSearchColumn('custrecordr7eventreglocation'), new nlobjSearchColumn('custrecordr7eventregdate').setSort(false)];


var eventDetailFields = ["custrecordr7eventregtitle",
  "custrecordr7eventregdescription",
  "custrecordr7eventregdate",
  "custrecordr7eventreglocation", 
  "custrecordr7eventregmastersid",
  "custrecordr7eventregtype",
  "custrecordr7eventregcategory",
  "custrecordr7eventregformtype",
  "custrecordr7eventregdeadline",
  "custrecordr7eventregagenda",
  "custrecordr7eventregmasterprice", // Change #799 - Deploy Netsuite Sandbox updates for Events feed to Production.  Add Price to feed.
  "custrecordr7eventregsku"];
 
// Get Url from File in cabinet
function getFileUrl(fileId){
	var file = nlapiLoadFile(fileId);
	var fileUrl = file.getURL();
	return fileUrl;	
}

function testIsValidParameters(request){
    var response = {};
    
    response.valid = false;
    for (var i = 0; i < validMessages.length; i++) {
        if (request.getParameter('custparammessage') == validMessages[i]) {
            response.valid = true;
            break;
        }
    }
    
    if (!response.valid) {
        response.responseText = getErrorText("The custparammessage is not a recognized message.");
        return response;
    } 
    
    //IF eventdetail is specified then specify eventid
    if (request.getParameter("custparammessage") == 'eventdetail' && (request.getParameter("custparamid") == null || request.getParameter("custparamid") == '')) {
        response.valid = false;
        response.responseText = getErrorText("Please specify a valid event internalid");
        return response;
    }
	
	if (request.getParameter("custparammessage") == 'eventdetail' && request.getParameter('custparamid') != null) {
		
		try {
			var recEventMaster = nlapiLoadRecord('customrecordr7eventregmaster', request.getParameter('custparamid'));
		} 
		catch (err) {
			response.responseText = getErrorText("Event not found.");
			return response;
		}
		
		if (isRestrictedEvent(recEventMaster) == 'T') {
			response.valid = false;
			response.responseText = getErrorText("Please specify a valid Event internalid");
			return response;
		}
	}
    
    response.valid = true;
    response.responseText = "";
    
    return response;
}

function getErrorText(text){
    if (this.format == 'jsonp') {
        var errorObject = new Object();
        errorObject.errorMessage = text;
        var errorText = JSON.stringify(errorObject);
        return errorText;
        //return 'parseEventResponse(' + errorText + ')';
    }
    else {
        return "<error>" + text + "</error>";
    }
}
