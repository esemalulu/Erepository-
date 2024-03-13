/*
 * @author mburstein
 */

//Takes in 4 parameters
//custparammessage    listevents
//custparameventtypefilter  according to given list
//custparamformat  xml or json p

var validMessages = new Array("listevents");

//Let Jess specify her own return function
//Validate jsonp along with a return function

function postEvents(request, response){

	if (request.getMethod() == 'GET' || request.getMethod() == 'POST') {
	
		var responseText = "";
		
		var validateParameters = testIsValidParameters(request);
		
		this.format = request.getParameter('custparamformat');
		if (this.format == null || this.format == '') 
			this.format = 'xml';
		
		if (!validateParameters.valid) {
			response.write(validateParameters.responseText);
		}
		else if (request.getParameter('custparammessage') == 'listevents') {
			
			//TODO - ask DZ what to filter on additionally
			if (format == 'jsonp') {
				responseText = searchEventsJSONP(request);
			}
			else {
				responseText = searchEventsXML(request);
			}
		}
		
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

function searchEventsXML(request){
    var searchResults = getSearchResults(request);
	
    //Creating and returning the XML
    var responseXML = "<listevents>";
    for (var i = 0; searchResults != null && i < searchResults.length; i++) {
        responseXML += '<event>';
        for (var j = 0; j < searchColumns.length; j++) {
            responseXML += '<' + searchColumns[j].getName() + '>';
			switch (searchColumns[j].getName()){
				case 'internalid':
					var eventId = searchResults[i].getValue(searchColumns[j]);
					responseXML += encodeHtmlEntities(searchResults[i].getValue(searchColumns[j]));
					break;
				case 'custrecordr7mkteventstatecountryprovince':
					var state = searchResults[i].getText(searchColumns[j]);
					responseXML += state;
					break;
				case 'custrecordr7mkteventcountry':	
					var country = searchResults[i].getText(searchColumns[j]);
					responseXML += country;
					break;
				case 'custrecordr7mkteventeventtype':
					var eventType = searchResults[i].getText(searchColumns[j]);	
					responseXML += eventType;
					break;
				case 'custrecordr7marketingeventssiteurl':
					var siteUrl = encodeHtmlEntities(searchResults[i].getValue(searchColumns[j]));
					responseXML += siteUrl;
					break;
				default:
					responseXML += encodeHtmlEntities(searchResults[i].getValue(searchColumns[j]));
					break;
					
					///TODO HOW TO HANDLE SPEAKERS
			}
            responseXML += '</' + searchColumns[j].getName() + '>';
        }
        responseXML += "</event>";
    }
    responseXML += "</listevents>";
	//responseXML = responseXML;
    return responseXML;
}

function searchEventsJSONP(request){
    var searchResults = getSearchResults(request);
    
    var response = new Object();
    response.events = new Array();
    
    for (var i = 0; searchResults != null && i < searchResults.length; i++){
        var entry = new Object();
        for (var j = 0; j < searchColumns.length; j++) {
			switch (searchColumns[j].getName()){
				case 'custrecordr7mkteventstatecountryprovince':	
					entry[searchColumns[j].getName()] = escape(searchResults[i].getText(searchColumns[j]));
					break;
				case 'custrecordr7mkteventcountry':	
					entry[searchColumns[j].getName()] = escape(searchResults[i].getText(searchColumns[j]));
					break;
				case 'custrecordr7mkteventeventtype':	
					entry[searchColumns[j].getName()] = escape(searchResults[i].getText(searchColumns[j]));
					break;
					
				case 'custrecordr7marketingeventssiteurl':	
					entry[searchColumns[j].getName()] = searchResults[i].getValue(searchColumns[j]);
					break;					
					
				default:
					entry[searchColumns[j].getName()] = escape(searchResults[i].getValue(searchColumns[j]));
					break;
			}	
        }
        response.events[response.events.length] = entry;
    }
	
    var responseString = JSON.stringify(response);
    
    responseString = 'parseEventResponse(' + responseString + ')';
    
    return responseString;
}

/*
 * Build Search columns for Event Details Search
 * 
 * This is the list of fields you are returning values for
 */ 
var searchColumns = new Array();
searchColumns[0] = new nlobjSearchColumn('internalid');
searchColumns[1] = new nlobjSearchColumn('name');
searchColumns[2] = new nlobjSearchColumn('custrecordr7mkteventeventtype');
searchColumns[3] = new nlobjSearchColumn('custrecordr7marketingeventscity');
searchColumns[4] = new nlobjSearchColumn('custrecordr7mkteventstatecountryprovince');
searchColumns[5] = new nlobjSearchColumn('custrecordr7mkteventcountry');
searchColumns[6] = new nlobjSearchColumn('custrecordr7mkteventdate');
searchColumns[7] = new nlobjSearchColumn('custrecordr7mkteventenddate');
searchColumns[8] = new nlobjSearchColumn('custrecordr7mkteventstarttime');
searchColumns[9] = new nlobjSearchColumn('custrecordr7marketingeventssiteurl');
searchColumns[10] = new nlobjSearchColumn('custrecordr7mkteventboothnumber'); 
searchColumns[11] = new nlobjSearchColumn('custrecordr7mkteventwebpresenter');
searchColumns[12] = new nlobjSearchColumn('custrecordr7mkteventwebdescription');
searchColumns[13] = new nlobjSearchColumn('custrecordr7mkteventleadsource');

// Sort ascening by enddate
searchColumns[7].setSort(false);
// then sort by descending startdate 
//searchColumns[4].setSort(true);

function getSearchResults(request, searchColumnsOther){
    //Standard Search Filters
    var searchFilters = new Array();
    
    //Hardcoded filters
	searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7marketingeventspublish', null, 'is', 'T');
	searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7mkteventenddate', null, 'onorafter', 'today');
	searchFilters[searchFilters.length - 1].setLeftParens(1);
	searchFilters[searchFilters.length - 1].setOr(true);
	searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7mkteventeventtype', null, 'is', 14);
	searchFilters[searchFilters.length - 1].setRightParens(1);
		
    /*
     * Additional filters Options
     */
	// Event Type filter
    var eType = request.getParameter('custparameventtypefilter');
    if (eType != null && eType != '') {
		nlapiLogExecution('DEBUG','TEST',eType);
        searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7mkteventeventtype', null, 'is', eType);
    }
	
	// If filtering by event type 'Webcast - On Demand' then sort in reverse order (desc)
	if(eType == 14){
		searchColumns[7].setSort(true);
	}
    
	if (searchColumnsOther != null && searchColumnsOther != ''){
		searchColumns = searchColumnsOther;
	}
	//Additional filter to sort by webcast region
	var region = request.getParameter('custparameventregion');
	searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecord_r7_webcast_region', null, 'is', region);
	
    //Searching the record
    var searchResults = nlapiSearchRecord('customrecordr7marketingevents', null, searchFilters, searchColumns);
    
	if (searchResults != null) {
		//searchResults.sort(myCustomSort);
	}
    return searchResults;   
}

function myCustomSort(a, b){
	var eventA = a.getText(searchColumns[4]) + a.getText(searchColumns[10]) + a.getValue(searchColumns[1]);
	//nlapiLogExecution('DEBUG','EVENT A',eventA);
	var eventB = b.getText(searchColumns[4]) + b.getText(searchColumns[10]) + b.getValue(searchColumns[1]);
	//nlapiLogExecution('DEBUG','EVENT B',eventB);
	
	if (eventA < eventB) //sort string ascending
		return -1;
	if (eventA > eventB) 
		return 1;
	return 0; //default return value (no sorting)
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
	
    response.valid = true;
    response.responseText = "";
    
    return response;
}

function getErrorText(text){
    if (this.format == 'jsonp') {
        var errorObject = new Object();
        errorObject.errorMessage = text;
        var errorText = JSON.stringify(errorObject);
        return 'parseEventResponse(' + errorText + ')';
    }
    else {
        return "<error>" + text + "</error>";
    }
}

