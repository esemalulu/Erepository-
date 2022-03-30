/**
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 */
define(['N/https', 'N/encode'],

function(https, encode) {
	var baseURL = 'https://javelinsandbox.administrateapp.com/api/v2/';


	function authorization(custParamUser, custParamPass)
	{
		var user = custParamUser + ':' + custParamPass;

		var base64 = encode.convert({
			string: user,
			inputEncoding: encode.Encoding.UTF_8,
			outputEncoding: encode.Encoding.BASE_64
		});

		var params = {}
		    params['Authorization'] = 'Basic ' + base64;
		    params['Content-Type']  = 'application/json';

		return params;

	}

	function processGetRequest(apiURL, authorization)
	{
		var apiURL = baseURL + apiURL;
		var response = https.get
						({
							url: apiURL,
							headers: authorization
						});
		return response;
	}

	function processPostRequest(apiURL, authorization, payload)
	{
		var apiURL = baseURL + apiURL;
		var response = https.post
						({
							url: apiURL,
							headers: authorization,
							body: payload
						});
		return response;
	}

	function processPutRequest(apiURL, authorization, payload, recId)
	{
		var apiURL = baseURL + apiURL + '/' + recId;
		var response = https.put({
									url : apiURL,
									headers: authorization,
									body : payload
								});

		return response;
	}

	function sectionPath(type)
	{
		switch(type)
		{
			case "crm":
				type = 'crm/';
				break;
			case "events":
				type = 'event/';
				break;
		}
		return type;
	}

	function month(date)
	{
		var month = date.getMonth() +1;
		if(month < 10) { month = "0" + month;}

		return month;
	}

	function day(date)
	{
		var day = date.getDate();
		if(day < 10) { day = "0" + day;}

		return day;
	}

	function minutes(date)
	{
		var minutes = date.getMinutes();
		if(minutes < 10) { minutes = "0" + minutes;}

		return minutes;
	}

	function seconds(date)
	{
		var seconds = date.getSeconds();
		if (seconds < 10) { seconds = "0" + seconds;}

		return seconds;
	}

	function recordPath(value)
	{
		switch(value)
		{
		case "accounts":
			value = 'accounts';
			break;
		case "contacts":
			value = 'contacts';
			break;
		}
		return value;
	}

	function customPath(value)
	{
		switch(value)
		{
		case "meta":
			value = 'meta/';
			break;
		}
		return value;
	}

    return {
        authorization: authorization,
        processGetRequest: processGetRequest,
        processPostRequest: processPostRequest,
		processPutRequest : processPutRequest,
        recordPath: recordPath,
        sectionPath: sectionPath,
        customPath: customPath,
        month : month,
        day : day,
        seconds : seconds,
        minutes: minutes

    };

});
