/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Feb 2016     json
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function tbaConnect(type) {

	var remoteAccountID = '3465108';
	var restletUrl = 'https://rest.sandbox.netsuite.com/app/site/hosting/restlet.nl?script=84&deploy=1';
	//user token
	var token = {
		public: '3131e63dc2dca9356d9305ca07df34b44e357a64428cc7c65bfb3d27b6225a07',
		secret: 'bac0f84607f1a8b6b556a0e026cf06506e2a8e550d0648bbb53ba3bec2d5ad46'
	};
	//app credentials
	var oauth = OAuth({
		consumer: {
			public: '8e9ed5b390b1f8bbfb6d01873e1012fbe010d9f830a1e4727748614a4cd1a5e8',
			secret: 'dcef0988190fce7980f1e381643907d91085cde9460c4bad562ef93bdc2f4c40'
		},
		signature_method: 'HMAC-SHA1'
	});

	var request_data = {
		url: restletUrl,
		method: 'POST',
		data: {}
	};

	var oauth_data = {
		oauth_consumer_key: oauth.consumer.public,
		oauth_nonce: oauth.getNonce(),
		oauth_signature_method: oauth.signature_method,
		oauth_timestamp: oauth.getTimeStamp(),
		oauth_version: '1.0',
		oauth_token: token.public,
		realm: remoteAccountID
	};
		
	var authJson = oauth.authorize(request_data, token);
	
	log('debug','signature',authJson.oauth_signature);
	//authJson.oauth_signature = CryptoJS.enc.Base64.stringify(authJson.oauth_signature);
	
	log('debug','authJson',JSON.stringify(authJson));
	
	var headerWithRealm = oauth.toHeader(authJson);
	
	log('debug','To Header', JSON.stringify(headerWithRealm));
	
	headerWithRealm.Authorization += ',realm="' + remoteAccountID + '"';

    var headers = {
            "Authorization":headerWithRealm.Authorization,
            "Content-Type":"application/json"
    };
	
	log('debug','header',JSON.stringify(headers));
	
	var payload = {
		'command':'push'
	};
	
	var restResponse = nlapiRequestURL(restletUrl, JSON.stringify(payload), headers);

	log('debug','response',restResponse.getBody());
	
}

/** JAVA Sample Code
 * protected String computeShaHash(String baseString, String key, String algorithm) throws Exception
{
	if (!algorithm.equals("HmacSHA256") && !algorithm.equals("HmacSHA1")) algorithm = "HmacSHA1";

	{
		byte[] bytes = key.getBytes();
		SecretKeySpec mySigningKey = new SecretKeySpec(bytes, algorithm);

		Mac messageAuthenticationCode = Mac.getInstance(algorithm);

		messageAuthenticationCode.init(mySigningKey);

		byte[] hash = messageAuthenticationCode.doFinal(baseString.getBytes());

		String result = new String(Base64.encodeBase64(hash, false));

		return result;
	} 
}

	public String computeSignature(
			String account,
			String consumerKey,
			String consumerSecret,
			String token,
			String tokenSecret,
			String nonce,
			Long timeStamp,
			String signatureAlgorithm
	) throws Exception
	{
		String baseString = account + "&" + consumerKey + "&" + token + "&" + nonce + "&" + timeStamp;

		String key = consumerSecret + '&' + tokenSecret;

		String signature;
		
		if (signatureAlgorithm.equals(SignatureAlgorithm._HMAC_SHA256))
		{
			signature = computeShaHash(baseString, key, "HmacSHA256");
		} else {
			signature = computeShaHash(baseString, key, "HmacSHA1");
		}

		return signature;
	}
 */
 
*/