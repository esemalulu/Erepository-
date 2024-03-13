/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Aug 2013     sfagone
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function g2m_oauth_suitelet(request, response){

	//AUTH URL
	//https://api.getgo.com/oauth/authorize?client_id=659c993aa543ce376e392f57b6ae838d&redirect_uri=https://663271.app.netsuite.com/app/site/hosting/scriptlet.nl?script=779%26deploy=1
	
	var userId = nlapiGetUser();
	var context = nlapiGetContext();
	var userEmail = context.getEmail();
	
	var code = request.getParameter('code');
	
	if (code != null && code != '') {
		
		var paramH = request.getParameter('h');
		var compId = request.getParameter('compid');
		
		if ((paramH != null && paramH != '') || (compId != null && compId != '')){
			throw nlapiCreateError('UNAUTHORIZED', 'Unauthorized request');
			return;
		}
		
		var form = nlapiCreateForm('GoToMeeting Authentication', false);
		var fldMsg = form.addField('custpage_msg', 'inlinehtml');
		var message = '';
		
		var objAccess = g2m_retrieveAccessToken(code);
		
		if (objAccess != null) {
			var accessToken = objAccess.access_token;
			var organizerKey = objAccess.organizer_key;
			
			try {
				nlapiSubmitField('employee', userId, new Array('custentityr7empgtmaccesstoken', 'custentityr7empgtmorganizerkey'), new Array(accessToken, organizerKey));
				message = 'Successfully authenticated to GoToMeeting.';
				nlapiLogExecution('AUDIT', 'USER AUTHENTICATED', userEmail);
			} 
			catch (e) {
				message = 'There was a problem authenticating to GoToMeeting. Please contact your Administrator.';
				nlapiLogExecution('ERROR', 'Could not authenticate', 'userId: ' + userId + '\nError: ' + e);
			}
		}
		else {
			message = 'There was a problem authenticating to GoToMeeting - NULL. Please contact your Administrator.';
			nlapiLogExecution('ERROR', 'Could not authenticate', 'userId: ' + userId + '\nError: ' + e);
		}
		
		message = '<br>' + message;
		fldMsg.setDefaultValue(message);
		response.writePage(form);
		return;
	}
	else {
	        var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
		response.sendRedirect('EXTERNAL', 'https://api.getgo.com/oauth/authorize?client_id=Vcebqkhz4R2P2fN3ljWPUsSF3jQdCyGx&redirect_uri='+toURL+'/app/site/hosting/scriptlet.nl?script=779%26deploy=1');
		return;
	}
	
}
