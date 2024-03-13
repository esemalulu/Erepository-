/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       11 Sep 2012     mburstein
 *
 */

/*
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */

/**
 * @param {recType} value of custparam_rectype used to access record type
 * @param {recId} value of custparam_recid used to access specific record
 * @param {fieldId} value of custparam_field used to get value(status) of field we want to check
 */

/*
 * example URL with posted params
 * https://663271.app.netsuite.com/app/site/hosting/scriptlet.nl?script=567&deploy=1&custparam_rectype=customrecordr7twiliodb&custparam_recid=19&custparam_fieldids=custrecordr7twiliodbverified,custrecordr7twiliodbsid&custparamauthcode=4cLJ5RyDHb8hVhmVCxCm6raT9DXtEVd2bBsLvRoRjUMwEpyL2vpRj5v6VNV3yb
 */

function checkStatus(request, response){
	if (request.getParameter("custparamauthcode") != '4cLJ5RyDHb8hVhmVCxCm6raT9DXtEVd2bBsLvRoRjUMwEpyL2vpRj5v6VNV3yb') {
		response.write(createError("INSUFFICIENT PERMISSIONS."));
		return;
	}
	/*if (request.getParameter("custparam_timer") > 30) {
		response.write(createError("Please enter a smaller time interval"));
		return;
	}*/
	
	if (request.getMethod() == 'GET' || request.getMethod() == 'POST') {
		var responseText = '';
		var validateParameters = validateParams(request);
		if (!validateParameters.valid) {
			responseText = validateParameters.responseText;
			response.writeLine(responseText);
		}
		else{
			var recId = request.getParameter('custparam_recid');		
			var recType = request.getParameter('custparam_rectype');
			
			// fieldIds can be multiple values comma seperated
			var fieldIds = decodeURI(request.getParameter('custparam_fieldids'));
			// Use eval() to restructure the array from the input params
			arrFieldIds = eval("(" + fieldIds + ")");
			nlapiLogExecution('DEBUG', 'fieldids: ', fieldIds);
			
			/*
			// Get interval timer value
			var timer = request.getParameter('custparam_timer');
			// While loop to wait for verification
			while((timer*1000)>0){
				timer--;
			} */
						
			// Load the record with recType:recId pair
			var record = nlapiLoadRecord(recType, recId);
			// Create array from fieldIds parameter, split by comma
			nlapiLogExecution('DEBUG', 'arrfieldids: ', arrFieldIds);
			var arrFieldValues = new Object();
			// Get values of the fields we want to check
			for (var i = 0; i < arrFieldIds.length; i++) {
				var arrFieldId = arrFieldIds[i];
				arrFieldValues[arrFieldId] = record.getFieldValue(arrFieldId);
			}
			//arrFieldValues = serialize(arrFieldValues);
			nlapiLogExecution('DEBUG', 'ID: ', recId);
			nlapiLogExecution('DEBUG', 'type: ', recType);
			nlapiLogExecution('DEBUG', 'field0: ', arrFieldValues['custrecordr7twiliodbverified']);
			nlapiLogExecution('DEBUG', 'field1: ', arrFieldValues['custrecordr7twiliodbsid']);
			//response.writeLine('worked');
			//response.writePage(arrFieldValues);
			responseText = formatResponseXml(arrFieldValues);
			response.setContentType('XMLDOC');
			response.write(responseText);
		}
	}
}

function formatResponseXml(object){
	var responseXml = "<statusResponse>";
    //Add in various fields
   	for(fieldId in object) {
        responseXml += "\n\t<" + fieldId + ">" +
        object[fieldId] +
        "</" +fieldId + ">";
    }
    responseXml += "\n</statusResponse>";
    return responseXml;
}

function validateParams(request){
	var response = {};
	var requiredParams = new Array('custparam_recid','custparam_rectype','custparam_fieldids','custparamauthcode');
	response.responseText = '';
	for (var i = 0; i<requiredParams.length; i++){
		var param = requiredParams[i];
		var paramVal = request.getParameter(param);
		if(paramVal == null || paramVal == ''){
			response.responseText += getErrorText("Please specify valid "+param);
			response.valid = false;
		}
		else{
			response.valid = true;
		}
	}
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
        return "<error>" + text + "</error>\n";
    }
}

function createError(msg){

	var objResponse = new Object;
	
	objResponse.success = false;
	objResponse.message = msg;
	
	return JSON.stringify(objResponse);
}

function serialize(obj){
	var returnVal;
	if(obj != undefined){
		switch(obj.constructor){
   			case Array:
    			var vArr="[";
    				for(var i=0;i<obj.length;i++){
     					if(i>0) vArr += ","; {
							vArr += serialize(obj[i]);
						}
    				}
    			vArr += "]";
    			return vArr;
   			case String:
    			returnVal = escape("'" + obj + "'");
    			return returnVal;
  			case Number:
    			returnVal = isFinite(obj) ? obj.toString() : null;
    			return returnVal;    
   			case Date:
    			returnVal = "#" + obj + "#";
    			return returnVal;  
   			default:
   				if(typeof obj == "object"){
     				var vobj=[];
 					for(attr in obj) {
 						if(typeof obj[attr] != "function"){
   							vobj.push('"' + attr + '":' + serialize(obj[attr]));
						}
 					}
 					if (vobj.length > 0) {
						return "{" + vobj.join(",") + "}";
					}
					else {
						return "{}";
					}
    			}  
    			else{
     				return obj.toString();
   				}
  		}
	}
	return null;
}