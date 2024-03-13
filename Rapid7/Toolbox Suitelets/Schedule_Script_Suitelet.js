/*
 * @author efagone
 */

function scheduleThisScript(request, response){

	//grab all parameters supplied
	var scriptId = request.getParameter('custparam_scriptid');
	var deployementId = request.getParameter('custparam_deploymentid');
	
	var paramsToSend = new Array();
	var allParameters = request.getAllParameters();
	for (param in allParameters) {
		if (param.substr(0, 10) == 'custscript') {
			paramsToSend[param] = allParameters[param];
			nlapiLogExecution('DEBUG', param, allParameters[param]);
		}
	}

	if (scriptId != '' && scriptId != null) {
	
		var status = '';
		if (deployementId != '' && deployementId != null) {
			status = nlapiScheduleScript(scriptId, deployementId, paramsToSend);
		}
		else {
			status = nlapiScheduleScript(scriptId, null, paramsToSend);
		}
		response.writeLine(status);
	}
	else {
		response.writeLine('You are missing some required paramsToSend');
	}
}
