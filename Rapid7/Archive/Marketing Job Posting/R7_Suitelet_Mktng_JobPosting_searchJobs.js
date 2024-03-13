//Takes in 4 parameters
//custparammessage    listjobs | jobdetail
//custparamid         must be a valid internalid 
//custparamlocfilter  according to given list
//custparamdeptfilter according to given list
//custparamformat  xml or json p

var validMessages = new Array("listjobs", "jobdetail", "listdepartments", "listlocations");

//Let Jess specify her own return function
//Validate jsonp along with a return function

function doIt(request, response){

	if (request.getMethod() == 'GET' || request.getMethod() == 'POST') {
	
		var responseText = "";
		
		var validateParameters = testIsValidParameters(request);
		
		this.format = request.getParameter('custparamformat');
		if (this.format == null || this.format == '') 
			this.format = 'xml';
		
		if (!validateParameters.valid) {
			response.write(validateParameters.responseText);
		}
		else 
			if (request.getParameter('custparammessage') == 'jobdetail') {
				//TODO  - ask DZ what to return
				if (format == 'jsonp') {
					responseText = listJobJSONP(request);
				}
				else {
					responseText = listJobXML(request);
				}
			}
			else 
				if (request.getParameter('custparammessage') == 'listjobs') {
				
					//TODO - ask DZ what to filter on additionally
					if (format == 'jsonp') {
						responseText = searchJobsJSONP(request);
					}
					else {
						responseText = searchJobsXML(request);
					}
				}
				else 
					if (request.getParameter('custparammessage') == 'listdepartments') {
					
						//TODO - ask DZ what to filter on additionally
						if (format == 'jsonp') {
							responseText = searchDepartmentsJSONP(request);
						}
						else {
							responseText = searchDepartmentsXML(request);
						}
					}
					else 
						if (request.getParameter('custparammessage') == 'listlocations') {
						
							//TODO - ask DZ what to filter on additionally
							if (format == 'jsonp') {
								responseText = searchLocationsJSONP(request);
							}
							else {
								responseText = searchLocationsXML(request);
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

function listJobJSONP(request){
    var jobId = request.getParameter('custparamid');
    
    try {
        var jobRecord = nlapiLoadRecord('customrecordr7jobopenings', jobId);
    } 
    catch (err) {
        return getErrorText("Job not found");
    }
    
    var response = new Object();
    //response.jobDetail = new Array();
    for (var i = 0; i < jobDetailFields.length; i++) {
		if (jobDetailFields[i] == 'custrecordr7joblocation' || 
		jobDetailFields[i] == 'custrecordr7jobdepartment' ) {
			response[jobDetailFields[i]] = escape(jobRecord.getFieldText(jobDetailFields[i]));
		}else{
			response[jobDetailFields[i]] = escape(jobRecord.getFieldValue(jobDetailFields[i]));
		}
    }
    
    var responseString = JSON.stringify(response);
    responseString = 'parseJobResponse(' + responseString + ')';
    return responseString;
}

function listJobXML(request){
    var jobId = request.getParameter('custparamid');
    
    try {
        var jobRecord = nlapiLoadRecord('customrecordr7jobopenings', jobId);
    } 
    catch (err) {
        return getErrorText("Job not found");
    }
    
    var responseXml = "\n<jobDetail>";
    //Add in various fields
    for (var i = 0; i < jobDetailFields.length; i++) {
        responseXml += "\n<" + escapeString(jobDetailFields[i]) + ">" +
        escapeString(jobRecord.getFieldValue(jobDetailFields[i])) +
        "</" +
        escapeString(jobDetailFields[i]) +
        ">";
    }
    responseXml += "\n</jobDetail>";
    return responseXml;
}

function searchJobsXML(request){
    var searchResults = getSearchResults(request);
	
    //Creating and returning the XML
    var responseXML = "\n<listJobs>";
    for (var i = 0; searchResults != null && i < searchResults.length; i++) {
        responseXML += '\n<job>';
        for (var j = 0; j < searchColumns.length; j++) {
            responseXML += '\n<' + escapeString(searchColumns[j].getName()) + '>' +
           escapeString( searchResults[i].getValue(searchColumns[j])) +
            '</' +
            escapeString(searchColumns[j].getName()) +
            '>';
        }
        responseXML += "\n</job>";
    }
    responseXML += "\n</listJobs>";
    return responseXML;
}

function searchJobsJSONP(request){
    var searchResults = getSearchResults(request);
    
    var response = new Object();
    response.jobs = new Array();
    
    for (var i = 0; searchResults != null && i < searchResults.length; i++){
        var entry = new Object();
        for (var j = 0; j < searchColumns.length; j++) {
			if (searchColumns[j].getName() == 'custrecordr7jobtitle'){
				entry[searchColumns[j].getName()] = escape(searchResults[i].getValue(searchColumns[j]));
			}else{
				entry[searchColumns[j].getName()] = escape(searchResults[i].getText(searchColumns[j]));	
			}
        }
        response.jobs[response.jobs.length] = entry;
    }
	
    var responseString = JSON.stringify(response);
    
    responseString = 'parseJobResponse(' + responseString + ')';
    
    return responseString;
}

function searchDepartmentsXML(request){
	var searchColumns = new Array();
	searchColumns[0] = new nlobjSearchColumn('custrecordr7jobdepartment', null, 'group');
	searchColumns[1] = new nlobjSearchColumn('custrecordr7jobdepartment', null, 'group');

    var searchResults = getSearchResults(request, searchColumns);
	
    //Creating and returning the XML
    var responseXML = "\n<listDepartments>";
    for (var i = 0; searchResults != null && i < searchResults.length; i++) {
        responseXML += '\n<department>';
            responseXML += '\n<internalid>' + searchResults[i].getValue(searchColumns[0]) + '</internalid>';
            responseXML += '\n<' + searchColumns[1].getName() + '>' +
            searchResults[i].getText(searchColumns[1]) +
            '</' +
            searchColumns[1].getName() +
            '>';
        responseXML += "\n</department>";
    }
    responseXML += "\n</listDepartments>";
    return responseXML;
}

function searchDepartmentsJSONP(request){
	var searchColumns = new Array();
	searchColumns[0] = new nlobjSearchColumn('custrecordr7jobdepartment', null, 'group');
	searchColumns[1] = new nlobjSearchColumn('custrecordr7jobdepartment', null, 'group');
	
    var searchResults = getSearchResults(request, searchColumns);
    
    var response = new Object();
    response.departments = new Array();
    
    for (var i = 0; searchResults != null && i < searchResults.length; i++) {
		var entry = new Object();
		entry['internalid'] = escape(searchResults[i].getValue(searchColumns[0]));
		entry[searchColumns[1].getName()] = escape(searchResults[i].getText(searchColumns[1]));
		response.departments[response.departments.length] = entry;
	}
	
    var responseString = JSON.stringify(response);
    
    responseString = 'parseDepartmentResponse(' + responseString + ')';
    
    return responseString;
}

function searchLocationsXML(request){
	var searchColumns = new Array();
	searchColumns[0] = new nlobjSearchColumn('custrecordr7joblocation', null, 'group');
	searchColumns[1] = new nlobjSearchColumn('custrecordr7joblocation', null, 'group');

    var searchResults = getSearchResults(request, searchColumns);
	
    //Creating and returning the XML
    var responseXML = "\n<listLocations>";
    for (var i = 0; searchResults != null && i < searchResults.length; i++) {
        responseXML += '\n<location>';
            responseXML += '\n<internalid>' + searchResults[i].getValue(searchColumns[0]) + '</internalid>';
            responseXML += '\n<' + searchColumns[1].getName() + '>' +
            searchResults[i].getText(searchColumns[1]) +
            '</' +
            searchColumns[1].getName() +
            '>';
        responseXML += "\n</location>";
    }
    responseXML += "\n</listLocations>";
    return responseXML;
}

function searchLocationsJSONP(request){
	var searchColumns = new Array();
	searchColumns[0] = new nlobjSearchColumn('custrecordr7joblocation', null, 'group');
	searchColumns[1] = new nlobjSearchColumn('custrecordr7joblocation', null, 'group');
	
    var searchResults = getSearchResults(request, searchColumns);
    
    var response = new Object();
    response.locations = new Array();
    
    for (var i = 0; searchResults != null && i < searchResults.length; i++) {
		var entry = new Object();
		entry['internalid'] = escape(searchResults[i].getValue(searchColumns[0]));
		entry[searchColumns[1].getName()] = escape(searchResults[i].getText(searchColumns[1]));
		response.locations[response.locations.length] = entry;
	}
	
    var responseString = JSON.stringify(response);
    
    responseString = 'parseLocationResponse(' + responseString + ')';
    
    return responseString;
}




function getSearchResults(request, searchColumnsOther){
    //Standard Search Filters
    var searchFilters = new Array();
    
    //Hardcorded filters
    
	searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7jobpostonwebsite', null, 'is', 'T');
    
	searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7jobfinanceapproval', null, 'is', 'T');
    
    searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7jobhrapproved', null, 'is', 'T');
    
	searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7jobhrapproved', null, 'is', 'T');
	
	searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7jobrecruitingstatus', null, 'noneof', new Array(5,6));
		
    //Additional filters
    // TODO - custrecordr7jobrecruiter - ask DZ what values are permissible
    // TODO - custrecordr7jobexempt - ask DZ what values are permissible
    
    //Department filter
    var dept = request.getParameter('custparamdeptfilter');
    if (dept != null && dept != '') {
        searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7jobdepartment', null, 'is', dept);
    }
    
    //Location filter
    var loc = request.getParameter('custparamlocfilter');
    if (loc != null && loc != '') {
        searchFilters[searchFilters.length] = new nlobjSearchFilter('custrecordr7joblocation', null, 'is', loc);
    }
    
	if (searchColumnsOther != null && searchColumnsOther != ''){
		searchColumns = searchColumnsOther;
	}
	
    //Searching the record
    var searchResults = nlapiSearchRecord('customrecordr7jobopenings', null, searchFilters, searchColumns);
    
	if (searchResults != null) {
		searchResults.sort(myCustomSort);
	}
    return searchResults;
    
    
}

function escapeString(str){

	if (str != null && str != '') {
		str = str.replace(/ & /g, ' &amp; ');
	}
	return str;
}

function myCustomSort(a, b){
	var jobA = a.getText(searchColumns[2]) + a.getText(searchColumns[3]) + a.getValue(searchColumns[1]);
	var jobB = b.getText(searchColumns[2]) + b.getText(searchColumns[3]) + b.getValue(searchColumns[1]);
	
	if (jobA < jobB) //sort string ascending
		return -1
	if (jobA > jobB) 
		return 1
	return 0 //default return value (no sorting)
}


function isRestrictedJob(recJob){
	
		
	var postOnWebsite = recJob.getFieldValue('custrecordr7jobpostonwebsite');
	var financeApproved = recJob.getFieldValue('custrecordr7jobfinanceapproval');
	var hrApproved = recJob.getFieldValue('custrecordr7jobhrapproved');
	var recruitingStatus = recJob.getFieldValue('custrecordr7jobrecruitingstatus');
	
	if ((postOnWebsite=='T') && (financeApproved=='T') && (hrApproved=='T') && (recruitingStatus!=5) && (recruitingStatus!=6)){
		return 'F';
	}
	else{
		return 'T';
	}
	
}


var searchColumns = [new nlobjSearchColumn('internalid'), new nlobjSearchColumn('custrecordr7jobtitle'), new nlobjSearchColumn('custrecordr7jobdepartment'), new nlobjSearchColumn('custrecordr7joblocation')];

var jobDetailFields = ["custrecordr7joboverview",
 "custrecordr7jobdescription",
  "custrecordr7jobexperience", 
  "custrecordr7jobotherinfo", 
  "custrecordr7jobexempt", 
  "custrecordr7jobrecruiter", 
  "custrecordr7jobtitle",
  "custrecordr7jobdepartment", 
  "custrecordr7joblocation", 
  "custrecordr7jobexperienceplus"];


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
    
    
    //IF jobdetail is specified then specify jobid
    if (request.getParameter("custparammessage") == 'jobdetail' && (request.getParameter("custparamid") == null || request.getParameter("custparamid") == '')) {
        response.valid = false;
        response.responseText = getErrorText("Please specify a valid job internalid");
        return response;
    }
	
	if (request.getParameter("custparammessage") == 'jobdetail' && request.getParameter('custparamid') != null) {
		
		try {
			var recJob = nlapiLoadRecord('customrecordr7jobopenings', request.getParameter('custparamid'));
		} 
		catch (err) {
			response.responseText = getErrorText("Job not found.");
			return response;
		}
		
		if (isRestrictedJob(recJob) == 'T') {
			response.valid = false;
			response.responseText = getErrorText("Please specify a valid job internalid");
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
        return 'parseJobResponse(' + errorText + ')';
    }
    else {
        return "<error>" + text + "</error>";
    }
}



//ALL below is the JSON object

var JSON;
if (!JSON) {
    JSON = {};
}

(function () {
    "use strict";

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return isFinite(this.valueOf()) ?
                this.getUTCFullYear()     + '-' +
                f(this.getUTCMonth() + 1) + '-' +
                f(this.getUTCDate())      + 'T' +
                f(this.getUTCHours())     + ':' +
                f(this.getUTCMinutes())   + ':' +
                f(this.getUTCSeconds())   + 'Z' : null;
        };

        String.prototype.toJSON      =
            Number.prototype.toJSON  =
            Boolean.prototype.toJSON = function (key) {
                return this.valueOf();
            };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string' ? c :
                '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' : gap ?
                '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/
                    .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                        .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
}());
