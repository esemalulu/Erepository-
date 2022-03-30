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

	var remoteAccountID = '3957078';
	var restletUrl = 'https://rest.na1.netsuite.com/app/site/hosting/restlet.nl?script=35&deploy=1';
	//user token
	var token = {
		public: '8d1058b0d0eaf27c5d4f7bedaeb796ea988b229f31ae2a90391f850d18819095', //Token ID
		secret: '4c16b5bccdcae3a206fdd0a62b27919d72809ccc1f6251ad96e750b1a2e3c942' //Token Secret
	};
	//app credentials
	var oauth = OAuth({
		consumer: {
			public: 'c29ca98673760bc5ba9e1c86b3fb0c4efc3e0c3ea0152da3e49efe349db1f963', //Consumer Key
			secret: '26c45431f9e564a472f052ec4b20fb5f210c7cf6412baca9769de20afebbf5ee' //Consumer Secret
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