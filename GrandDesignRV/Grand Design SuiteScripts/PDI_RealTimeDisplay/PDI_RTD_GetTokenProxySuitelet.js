/**
 * This suitelet is used as a proxy to get an oAuth token for mobile apps within NetSuite.
 * 
 * Version    Date            Author           Remarks
 * 1.00       9 Jan 2017     rbritsch
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function getToken(request, response){
	nlapiLogExecution('debug', 'PDI RTD App Get Token Proxy', 'Got Here ' );
	var proxyObject = JSON.parse(request.getParameter('proxyData'));
	nlapiLogExecution('debug', 'PDI RTD App Get Token Proxy', proxyObject.userEmail + ' : ' + proxyObject.userPass + ' : ' + proxyObject.restUrl );
	
	var context = nlapiGetContext();	
	
	var nsAccountNo = context.getCompany();
	var setting_consumer_key = nlapiGetContext().getSetting('SCRIPT','custscriptpdi_rtd_consumerkey');
	var setting_role_id = nlapiGetContext().getSetting('SCRIPT','custscriptpdi_rtd_roleid');
	
		
	var issueTokenUrl = proxyObject.restUrl +'/' + "rest/issuetoken?consumerKey=" + setting_consumer_key;
	   
	var headers = new Array();
	headers['Authorization'] = "NLAuth nlauth_account=" + nsAccountNo + ", nlauth_email=" + proxyObject.userEmail + ", nlauth_signature=" + proxyObject.userPass + ", nlauth_role=" + setting_role_id;
     
	var restResponse = nlapiRequestURL(issueTokenUrl, null, headers, null, 'GET');
	nlapiLogExecution('debug', 'PDI RTD App Get Token Proxy', restResponse + ' : ' + restResponse.getBody() );
	var restResponseJSON = JSON.parse(restResponse.getBody());
	var token = {
		    public: restResponseJSON.tokenId,
		    secret: restResponseJSON.tokenSecret
		};
	nlapiLogExecution('debug', 'PDI RTD App Get Token Proxy', token.public + ' : ' + token.secret );
	
	response.write(restResponse.getBody());//JSON.stringify(token));
	
	
//	 ss$.ajax({
//         url: issueTokenUrl,
//         dataType: 'jsonp',
//         crossDomain: true,
//         contentType: "application/json; charset=utf-8",
//         headers: { 'Authorization': "NLAuth nlauth_account=" + nsAccountNo + ", nlauth_email=" + nsUserEmail + ", nlauth_signature=" + nsUrlSafeUserPasword + ", nlauth_role=" + userRoleId },
//         success: function (result) {
//        	 alert("token success");
//         	var restResponseJSON = JSON.parse(result);
//         	var token = {
//				    public: restResponseJSON.TokenId,
//				    secret: restResponseJSON.TokenSecret
//				};
//			createCookie(TOKEN_COOKIE, JSON.stringify(token), 30);
//         } 
//     });	   
	 
	 
}
