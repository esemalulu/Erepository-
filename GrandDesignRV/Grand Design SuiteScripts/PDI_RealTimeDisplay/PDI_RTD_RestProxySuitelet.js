/**
 * Suitelet for proxying requests between client side web apps and RESTlets since cross
 * domain requests are not allowed from the browser.
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
function callRESTlet(request, response){
	//nlapiLogExecution('debug', 'PDI RTD REST Proxy', 'Start of Proxy' );
	
	var proxyObject = null;
	if(request.getMethod() == 'GET')
	{
		proxyObject = JSON.parse(request.getParameter('proxyData'));
	}
	else
	{
		proxyObject = JSON.parse(request.getBody());
	}
		
	var context = nlapiGetContext();	
	
	var remoteAccountID = context.getCompany();
	var setting_consumer_key = nlapiGetContext().getSetting('SCRIPT','custscriptpdi_rtd_consumerkey');
	var setting_consumer_secret = nlapiGetContext().getSetting('SCRIPT','custscriptpdi_rtd_consumersecret');
	
	//user token
	var token = proxyObject.token; 
	/*{
		public: '3958b7648c6076cbf7174bfc37001443e97f0fd7ae67f8f277cd7525aac80365',
		secret: '0cdd8c1d008445f9bac188be9ac52f2f36df6b6a15eafbc3450e42d13f40722d'
	};*/
		
	//app credentials
	var oauth = OAuth({
		consumer: {
			public: setting_consumer_key,
			secret: setting_consumer_secret
		},
		signature_method: 'HMAC-SHA1'
	});
	
	var restletUrl = proxyObject.restUrl;
	if(proxyObject.method === 'GET' && proxyObject.data)
	{	
		restletUrl+= '&' + proxyObject.data; // '&data=' + encodeURIComponent(JSON.stringify(proxyObject.data));	
	}
	nlapiLogExecution('debug', 'PDI RTD Rest Proxy', 'proxyObject.data : ' + proxyObject.data );
	
	var request_data = {
		url: restletUrl, //proxyObject.restUrl,
		method: proxyObject.method,
		data: {} //JSON.stringify(proxyObject.data)
	};
/*		
	var oauth_data = {
		oauth_consumer_key: oauth.consumer.public,
		oauth_nonce: oauth.getNonce(),
		oauth_signature_method: oauth.signature_method,
		oauth_timestamp: oauth.getTimeStamp(),
		oauth_version: '1.0',
		oauth_token: token.public,
		realm: remoteAccountID
	};
*/
	var headerWithRealm = oauth.toHeader(oauth.authorize(request_data, token));
	headerWithRealm.Authorization += ',realm="' + remoteAccountID + '"';
	//Setting up Headers 
    var headers = {
        'User-Agent': 'SuiteScript-Call',
        'Authorization': headerWithRealm.Authorization,
        'Content-Type': 'application/json'
    };
		
	var restResponse = nlapiRequestURL(restletUrl , proxyObject.data, headers, proxyObject.method);
	nlapiLogExecution('debug', 'PDI RTD Rest Proxy', 'RestResponse : ' + restResponse.getBody() );
	response.write(JSON.parse(restResponse.getBody()));
	
}
