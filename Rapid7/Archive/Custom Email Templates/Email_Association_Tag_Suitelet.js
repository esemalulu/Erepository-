/*
 * @author efagone
 */

function getHTMLContent(request, response){
	
	if (request.getMethod() == 'GET') {
		
		var eatId = request.getParameter('custparam_eatid');
		
		if (eatId == null || eatId == ''){
			throw nlapiCreateError('MISSINGPARAM', 'Missing required parameter');
		}
		
		var eatContent = nlapiLookupField('customrecordr7emailassociationtags', eatId, 'custrecordr7eathtmlcontent');
		
		response.writeLine(eatContent);	
	}
}
