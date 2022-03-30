define(['N/https', 'N/encode', 'N/search'],

function(https, encode, search) {
	var baseURL = 'https://pi.pardot.com/api/';


	function login(value, email, pass, user_key, apiversion)
	{
		var headers = {};
		headers['Content-Type'] = 'application/x-www-form-urlencoded';

		var URL  = moduleSelection(value, apiversion, baseURL);
		var body = 'email=' +encodeURIComponent(email) + '&password=' + encodeURIComponent(pass) + '&user_key=' + user_key + '&format=json';

		var response = https.post({
			url: URL,
			headers: headers,
			body: body
		});

		return response;
	}

	function marketingCampaign()
	{
		var sf = [["isinactive","is","F"]];

		var sc = [
					search.createColumn({name : 'title'}),
					search.createColumn({ name : 'internalid' }),
				];

		var camp = search.create({
			type: search.Type.CAMPAIGN,
			filters: sf,
			columns: sc
		});

		var campRS = camp.run().getRange({
			start : 0,
			end : 1000
		});

		var KVP = {};
		for(var i = 0; i < campRS.length; i+=1)
		{
			KVP[campRS[i].getValue({ name : 'internalid' })] = campRS[i].getValue({ name : 'title' });
		}

		return KVP;
	}

	function decodeAdminPassword(codedValue)
	{
		var decodedPassword = encode.convert({
			string: codedValue,
			inputEncoding: encode.Encoding.HEX,
			outputEncoding: encode.Encoding.UTF_8
		});

		return decodedPassword;
	}

	function retrieveDefaultFields(api_key, user_key, value, apiversion)
	{
		var headers = {};
			headers['Content-Type'] = 'application/x-www-form-urlencoded';

		var URL = moduleSelection(value, apiversion, baseURL);
		var body = 'user_key=' + user_key + '&api_key=' + api_key + '&format=json&limit=1&output=full';

		var response = https.post({
			url: URL,
			headers: headers,
			body: body
		});

		return response;
	}

	function retrieveCustomFields(api_key, user_key, value, apiversion)
	{
		var headers = {};
			headers['Content-Type'] = 'application/x-www-form-urlencoded';

		var URL = moduleSelection(value, apiversion, baseURL);
		var body = 'user_key=' + user_key + '&api_key=' + api_key + '&format=json&output=full';

		var response = https.post({
			url: URL,
			headers: headers,
			body: body
		});

		return response;
	}

	function retrieveProspects(value, api_key, user_key, payload, apiversion)
	{
		var headers = {};
			headers['Content-Type'] = 'application/x-www-form-urlencoded';

		var URL = moduleSelection(value, apiversion, baseURL);

		var response = https.post({
			url: URL,
			headers: headers,
			body: payload
		});

		return response;
	}

	function createProspect(value, api_key, user_key, payload, apiversion)
	{
		var headers = {};
			headers['Content-Type'] = 'application/x-www-form-urlencoded';

		var URL = moduleSelection(value, apiversion, baseURL);

		var response = https.post({
			url: URL,
			headers : headers,
			body: payload
		});

		return response;
	}

	function updateProspect(value, api_key, user_key, payload, apiversion)
	{
		var headers = {};
			headers['Content-Type'] = 'application/x-www-form-urlencoded';

		var URL = moduleSelection(value, apiversion, baseURL);

		var response = https.post({
			url: URL,
			headers : headers,
			body: payload
		});

		return response;
	}

	function assignAccount(value, api_key, user_key, payload, apiversion)
	{
		var headers = {};
			headers['Content-Type'] = 'application/x-www-form-urlencoded';

		var URL = moduleSelection(value, apiversion, baseURL);

		var response = https.post({
			url: URL,
			headers : headers,
			body: payload
		});

		return response;
	}

	function users(val, user_key, api_key, apiversion)
	{
		var payload = 'user_key=' + user_key + '&api_key=' + api_key + '&format=json';

		var value = "users";
		var headers = {};
			headers['Content-Type'] = 'application/x-www-form-urlencoded';

		var URL = moduleSelection(value, apiversion, baseURL);

		var response = https.post({
			url : URL,
			headers: headers,
			body: payload
		});

		var responseBody = JSON.parse(response.body);
		var objs = responseBody.result.user;

		var KVP = {};
		for(var i = 0; i < objs.length; i+=1)
		{
			KVP[objs[i].id] = objs[i].first_name + ' ' + objs[i].last_name
		}

		return KVP;


	}

	function moduleSelection(value, apiversion, baseURL)
	{
		if(apiversion == 3)
		{
			switch(value)
			{
				case "login":
					baseURL += 'login/version/3';
					break;
				case "prospects":
					baseURL += 'prospect/version/3/do/query?';
					break;
				case "batchcreateprospects":
					baseURL += 'prospect/version/3/do/batchCreate';
					break;
				case "createprospect":
					baseURL += 'prospect/version/3/do/create/email/';
					break;
				case "updateprospect":
					baseURL += 'prospect/version/3/do/update';
					break;
				case "custom":
					baseURL += 'customField/version/3/do/query?';
					break;
				case "readprospects":
					baseURL += 'prospect/version/3/do/read';
					break;
				case "prospectaccounts":
					baseURL += 'prospectAccount/version/3/do/query?';
					break;
				case "createprospectaccount":
					baseURL += 'prospectAccount/version/3/do/create?';
					break;
				case "assignprospectaccount":
					baseURL += 'prospectAccount/version/3/do/assign?';
					break;
				case "updateprospectaccount":
					baseURL += 'prospectAccount/version/3/do/update/id/';
					break;
				case "users":
					baseURL += 'user/version/3/do/query?';
					break;
			}
		}

		if(apiversion == 4)
		{
			switch(value)
			{
				case "login":
					baseURL += 'login/version/4';
					break;
				case "prospects":
					baseURL += 'prospect/version/4/do/query?';
					break;
				case "batchcreateprospects":
					baseURL += 'prospect/version/4/do/batchCreate';
					break;
				case "createprospect":
					baseURL += 'prospect/version/4/do/create/email/';
					break;
				case "updateprospect":
					baseURL += 'prospect/version/4/do/update/id/';
					break;
				case "custom":
					baseURL += 'customField/version/4/do/query?';
					break;
				case "readprospects":
					baseURL += 'prospect/version/4/do/read';
					break;
				case "prospectaccounts":
					baseURL += 'prospectAccount/version/4/do/query?';
					break;
				case "createprospectaccount":
					baseURL += 'prospectAccount/version/4/do/create?';
					break;
				case "assignprospectaccount":
					baseURL += 'prospectAccount/version/4/do/assign?';
					break;
				case "updateprospectaccount":
					baseURL += 'prospectAccount/version/3/do/update/id/';
					break;
				case "users":
					baseURL += 'user/version/4/do/query?';
					break;
			}

		}

		return baseURL;

	}

	function dateParser(value)
	{
		return new Date(value.replace(/-/g, '/'));
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

	function fieldTypeSelection(value)
	{
		switch(value)
		{
			case "Text":
				value = 1;
				break;
			case "Number":
				value = 2;
				break;
			case "Date":
				value = 3;
				break;
			case "Radio Button":
				value = 4;
				break;
			case "Checkbox":
				value = 5;
				break;
			case "Dropdown":
				value = 6;
				break;
			case "Textarea":
				value = 7;
				break;
			case "Multi-Select":
				value = 8;
				break;
			case "Hidden":
				value = 9;
				break;
			case "CRM User":
				value = 10;
				break;
		}
		return value;
	}

	function errorCodeSwitcher(val)
    {
        var errMsg = '';
        if(val)
        {
            switch(val)
            {
                case 1:
                    errMsg = 'Invalid API key or user key';
                    return errMsg;
                    break;
                case 2:
                    errMsg = 'Invalid action';
                    return errMsg;
                    break;
                case 3:
                    errMsg = 'Invalid prospect ID';
                    return errMsg;
                    break;
                case 4:
                    errMsg = 'Invalid prospect email address';
                    return errMsg;
                    break;
                case 5:
                    errMsg = 'Invalid query parameters';
                    return errMsg;
                    break;
                case 6:
                    errMsg = 'Invalid time frame';
                    return errMsg;
                    break;
                case 7:
                    errMsg = 'Invalid timestamp';
                    return errMsg;
                    break;
                case 8:
                    errMsg = 'Invalid time range';
                    return errMsg;
                    break;
                case 9:
                    errMsg = 'A prospect with the specified email address already exists';
                    return errMsg;
                    break;
                case 10:
                    errMsg = 'Invalid user ID';
                    return errMsg;
                    break;
                case 11:
                    errMsg = 'Invalid user email address';
                    return errMsg;
                    break;
                case 12:
                    errMsg = 'Invalid group ID';
                    return errMsg;
                    break;
                case 13:
                    errMsg = 'One or more required parameters are missing';
                    return errMsg;
                    break;
                case 14:
                    errMsg = 'Non-existent prospect ID; No email address provided<';
                    return errMsg;
                    break;
                case 15:
                    errMsg = 'Login failed';
                    return errMsg;
                    break;
                case 16:
                    errMsg = 'Invalid ID';
                    return errMsg;
                    break;
                case 17:
                    errMsg = 'Invalid ID range';
                    return errMsg;
                    break;
                case 18:
                    errMsg = 'Invalid value for profile criteria matching status';
                    return errMsg;
                    break;
                case 19:
                    errMsg = 'Invalid value specified for sort_by';
                    return errMsg;
                    break;
                case 20:
                    errMsg = 'Invalid value specified for sort_order';
                    return errMsg;
                    break;
                case 21:
                    errMsg = 'Invalid value specified for offset';
                    return errMsg;
                    break;
                case 22:
                    errMsg = 'Unsupported feature in this version of the API';
                    return errMsg;
                    break;
                case 23:
                    errMsg = 'Invalid value specified for limi';
                    return errMsg;
                    break;
                case 24:
                    errMsg = 'Invalid visitor ID';
                    return errMsg;
                    break;
                case 25:
                    errMsg = 'Parameter is_starred must be true or false';
                    return errMsg;
                    break;
                case 26:
                    errMsg = 'Parameter assigned must be true or false';
                    return errMsg;
                    break;
                case 27:
                    errMsg = 'Parameter deleted must be true or false';
                    return errMsg;
                    break;
                case 28:
                    errMsg = 'Parameter new must be true or false';
                    return errMsg;
                    break;
                case 29:
                    errMsg = 'Invalid value specified for score';
                    return errMsg;
                    break;
                case 30:
                    errMsg = 'Invalid score range specified';
                    return errMsg;
                    break;
                case 31:
                    errMsg = 'Invalid combination of parameters for score';
                    return errMsg;
                    break;
                case 32:
                    errMsg = 'Invalid value specified for grade';
                    return errMsg;
                    break;
                case 33:
                    errMsg = 'Invalid grade range specified';
                    return errMsg;
                    break;
                case 34:
                    errMsg = 'Invalid combination of parameters for grade';
                    return errMsg;
                    break;
                case 35:
                    errMsg = 'Invalid opportunity ID';
                    return errMsg;
                    break;
                case 36:
                    errMsg = 'One or more required parameter values are missing';
                    return errMsg;
                    break;
                case 37:
                    errMsg = 'A SalesForce connector was detected';
                    return errMsg;
                    break;
                case 38:
                    errMsg = 'Invalid campaign ID';
                    return errMsg;
                    break;
                case 39:
                    errMsg = 'Invalid profile ID';
                    return errMsg;
                    break;
                case 40:
                    errMsg = 'Invalid opportunity probability';
                    return errMsg;
                    break;
                case 41:
                    errMsg = 'Invalid probability range specified';
                    return errMsg;
                    break;
                case 42:
                    errMsg = 'Invalid opportunity value';
                    return errMsg;
                    break;
                case 43:
                    errMsg = 'Invalid opportunity value range specified';
                    return errMsg;
                    break;
                case 44:
                    errMsg = 'The provided prospect_id and prospect_email parameters do not match';
                    return errMsg;
                    break;
                case 45:
                    errMsg = 'The provided user_id and user_email parameters do not match';
                    return errMsg;
                    break;
                case 46:
                    errMsg = 'This API user lacks sufficient permissions for the requested operation';
                    return errMsg;
                    break;
                case 47:
                    errMsg = 'Multiple assignment targets were specified';
                    return errMsg;
                    break;
                case 48:
                    errMsg = 'Invalid visit ID';
                    return errMsg;
                    break;
                case 50:
                    errMsg = 'Invalid boolean';
                    return errMsg;
                    break;
                case 51:
                    errMsg = 'Invalid parameter';
                    return errMsg;
                    break;
                case 53:
                    errMsg = 'Client IP address/location must be activated before accessing API';
                    return errMsg;
                    break;
                case 54:
                    errMsg = 'Email address is already in use';
                    return errMsg;
                    break;
                case 55:
                    errMsg = 'Invalid list ID';
                    return errMsg;
                    break;
                case 56:
                    errMsg = 'Invalid number entered for field';
                    return errMsg;
                    break;
                case 57:
                    errMsg = 'Invalid date entered for field';
                    return errMsg;
                    break;
                case 58:
                    errMsg = 'That prospect is already a memeber of that list. Update the membership instead';
                    return errMsg;
                    break;
                case 59:
                    errMsg = 'A CRM connector was detected';
                    return errMsg;
                    break;
                case 60:
                    errMsg = 'Invalid HTTP request method';
                    return errMsg;
                    break;
                case 61:
                    errMsg = 'Invalid prospect account id';
                    return errMsg;
                    break;
                case 62:
                    errMsg = 'Conflicting Update';
                    return errMsg;
                    break;
                case 63:
                    errMsg = 'Too many IDs specified';
                    return errMsg;
                    break;
                case 64:
                    errMsg = 'Email content missing required variables';
                    return errMsg;
                    break;
                case 65:
                    errMsg = 'Invalide email format';
                    return errMsg;
                    break;
                case 66:
                    errMsg = 'You have exceeded your concurrent request limit.  Please wait, before trying again';
                    return errMsg;
                    break;
                case 67:
                    errMsg = 'You have reached or exceeded the limit of how many of this type of object you may have.';
                    return errMsg;
                    break;
                case 68:
                    errMsg = 'Template with this id does not exist.';
                    return errMsg;
                    break;
                case 70:
                    errMsg = 'Batch processing is limited to 50 prospects at once.';
                    return errMsg;
                    break;
                case 71:
                    errMsg = 'Input needs to be valid JSON or XML';
                    return errMsg;
                    break;
                case 72:
                    errMsg = 'JSON has been corrupted, hash does not match';
                    return errMsg;
                    break;
                case 73:
                    errMsg = 'Currently there is not an Email Plug-in Campaign associated to successfully track this email. Please contact your Pardot administrator to ensure there is a proper campaign associated with the Account Settings in Pardot.';
                    return errMsg;
                    break;
                case 74:
                    errMsg = 'The email client is not supported by the plugin API';
                    return errMsg;
                    break;
                case 75:
                    errMsg = 'There was an error processing the request for the account variable tags';
                    return errMsg;
                    break;
                case 76:
                    errMsg = 'API access was disabled';
                    return errMsg;
                    break;
                case 77:
                    errMsg = 'Invalid prospect fid';
                    return errMsg;
                    break;
                case 79:
                    errMsg = 'Invalid CRM_FID';
                    return errMsg;
                    break;
                case 80:
                    errMsg = 'Invalid CRM_TYPE';
                    return errMsg;
                    break;
                case 81:
                    errMsg = 'Prospect ID and FID do not match';
                    return errMsg;
                    break;
                case 83:
                    errMsg = 'No valid CRM connectors available';
                    return errMsg;
                    break;
                case 85:
                    errMsg = 'Unable to save the prospect';
                    return errMsg;
                    break;
                case 86:
                    errMsg = 'Invalid Template id';
                    return errMsg;
                    break;
                case 88:
                    errMsg = 'Your account must use version 4 of the API.';
                    return errMsg;
                    break;
                case 89:
                    errMsg = 'Your account is unable to use version 4 of the API.';
                    return errMsg;
                    break;
                case 90:
                    errMsg = 'Prospect array should be a flat array of attributes';
                    return errMsg;
                    break;
                case 91:
                    errMsg = 'Prospect array must be keyed by email address';
                    return errMsg;
                    break;
                default:
                    errMsg = 'PARDOT API ERROR';
                    return errMsg;
                    break;
            }
        }
    }

    return {
       login: login,
       decodeAdminPassword: decodeAdminPassword,
	   users: users,
       retrieveDefaultFields: retrieveDefaultFields,
       retrieveProspects: retrieveProspects,
       retrieveCustomFields: retrieveCustomFields,
	   assignAccount: assignAccount,
       createProspect: createProspect,
       updateProspect: updateProspect,
       moduleSelection: moduleSelection,
	   errorCodeSwitcher:errorCodeSwitcher,
	   marketingCampaign : marketingCampaign,
       month: month,
       day: day,
       minutes : minutes,
       seconds: seconds,
       fieldTypeSelection : fieldTypeSelection,
       dateParser : dateParser

    };

});
