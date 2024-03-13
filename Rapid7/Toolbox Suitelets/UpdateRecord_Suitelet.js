/*
 * @author efagone
 */

function r7update_record_suitelet(request, response){

	logRequest(request);
	
	//RETURN JSON
	response.setContentType('JSON');
	
	var objResponse = {};
	var objRequest = (!isBlank(request.getBody())) ? JSON.parse(request.getBody()) : {};
	
	try {
		if (isBlank(objRequest.record_type) || isBlank(objRequest.record_id)) {
			objResponse = {
				success: false,
				error: 'Missing required parameter.',
				record_type: objRequest.record_type,
				record_id: objRequest.record_id
			};
			nlapiLogExecution('AUDIT', 'Response', JSON.stringify(objResponse));
			response.write(JSON.stringify(objResponse));
			return;
		}
		
		var rec = nlapiLoadRecord(objRequest.record_type, objRequest.record_id);
		nlapiSubmitRecord(rec);
		
		objResponse = {
			success: true,
			error: '',
			record_type: objRequest.record_type,
			record_id: objRequest.record_id
		};
		nlapiLogExecution('AUDIT', 'Response', JSON.stringify(objResponse));
		response.write(JSON.stringify(objResponse));
		return;
	} 
	catch (e) {
		objResponse = {
			success: false,
			error: e,
			record_type: objRequest.record_type,
			record_id: objRequest.record_id
		};
		nlapiLogExecution('ERROR', 'Error processing', e);
		response.write(JSON.stringify(objResponse));
		return;
	}
}

function isBlank(value){
	return (value == null || value == '' || value == 'null') ? true : false;
}

function logRequest(request){

	nlapiLogExecution('DEBUG', 'HIT', 'OUCH');
	var parameters = request.getAllParameters();
	var headers = request.getAllHeaders();
	//Values for headers, parameters
	var logHeaderParams = '\n--------------------\nHEADERS:\n--------------------\n';
	for (head in headers) {
		logHeaderParams += head + ': ' + headers[head] + '\n';
	}
	
	logHeaderParams += '\n--------------------\nPARAMS:\n--------------------\n';
	for (param in parameters) {
		logHeaderParams += param + ': ' + parameters[param] + '\n';
	}
	nlapiLogExecution('AUDIT', 'Parameters/Headers', logHeaderParams + '\n\n\n\nBODY:\n' + request.getBody());
	
	return;
}
