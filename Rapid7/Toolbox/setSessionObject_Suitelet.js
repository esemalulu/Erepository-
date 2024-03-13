/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 Sep 2012     efagone
 *
 */

/*
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function setSessionObject_suitelet(request, response){

	try {
	
		if (request.getMethod() == 'POST') {
		
			var sessionObjectName = request.getParameter('custparam_sessionobject_name');
			var sessionObjectValue = request.getParameter('custparam_sessionobject_value');
			nlapiGetContext().setSessionObject(sessionObjectName, sessionObjectValue);
			
			response.write('success');
		}
	} 
	catch (e) {
		response.write('error');
	}
	
	
}
