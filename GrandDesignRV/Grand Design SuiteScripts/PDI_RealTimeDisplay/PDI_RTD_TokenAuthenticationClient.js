/**
 * Token Authentication Client Side
 * Javascript functions for creating, storing, and retrieving NetSuite based token authentication
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Nov 2015     rbritsch
 *
 */

// name of cookie that is saved with Auth Token
var TOKEN_COOKIE = GLOBAL_ACCOUNT_ID+'PDI_RTD_Token';
var LOCATION_COOKIE = GLOBAL_ACCOUNT_ID+'PDI_RTD_Location';
	
/**
 * Name: GetAuthToken
 * Description: Returns the Authorization Token from the existing cookie.  If there is none, null is returned.
 * 
 * @returns {Token} - Null if doesn't exist.  Token{public,secret}
 */
function GetAuthToken() {
	
	var cookie = readCookie(TOKEN_COOKIE);
	if(cookie != null)
	{
		if(JSON.parse(cookie).public == null)
		{
			eraseCookie(TOKEN_COOKIE);
			return null; 
		}
		return JSON.parse(cookie);
		console.log(cookie);
	}
		
	return null; 
}

function getLocationCookie() {
	var locationCookie = readCookie(LOCATION_COOKIE);
	if(locationCookie != null)
	{
		return JSON.parse(locationCookie);
	}
	return null; 
}

function createLocationCookie(locationId) {
	console.log('Creating location cookie with loc id: ' + locationId);
	createCookie(LOCATION_COOKIE, JSON.stringify(locationId), 30);
}

/**
 * Name: CreateAuthToken
 * Description: Creates a new authorization token given valid user credentials and saves it as a cookie using the global cookie name.  Callback function
 * passes in a status (true = success, false = fail) and the returned data (token data or error message accessessed as data.error.message)
 * 
 * @param {user} - NetSuite user name
 * @param {pass} - NetSuite user password
 * @param {callback} - callback function(status, data) with status = true/false
 * 
 */
function CreateAuthToken(user, pass, callback)
{
	 var proxy = 
	 {
		 userEmail: user,
		 userPass: pass,
		 restUrl: GLOBAL_REST_URL
	 };

	 ss$.ajax({
		 url: GLOBAL_PROXY_TOKEN, //requestData.url,
		 type: "GET",
	     data:  {proxyData : JSON.stringify(proxy)},
	     dataType: "json",
	     //processData: false,
	     contentType: "application/json; charset=utf-8",
	     success: function (data) {
	    	console.log("fetch complete + " + this);
	    	 
	      	var status = false;
	      	// if no error then save the new cookie and return status of passed (true)
	      	if(data.error == null)
	      	{
		         	var token = {
						    public: data.tokenId,
						    secret: data.tokenSecret
						};
					createCookie(TOKEN_COOKIE, JSON.stringify(token), 30);
					status = true;
	      	}
	    	
	      	 if (typeof callback === "function") {
	      	    callback(status, data);
	      	 }
	     },
	     error: function(){alert('Error attempting to retrieve token.');}
	 });	   	
	 
	 
}

/**
 * Methods to create and retrieve cookies for saving authentication tokens
 * @param name
 * @param value
 * @param days
 * @returns
 */
function createCookie(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name,"",-1);
}
