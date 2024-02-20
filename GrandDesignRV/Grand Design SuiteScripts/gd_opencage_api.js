/**
 * This file contains logic for dealer geo-code.
 * 
 * Version    Date            Author           Remarks
 * 1.00       02 Jul 2015     ibrahima
 *
 */

// API Key for the OPEN CAGE Service, the one used now is a paid version that should have 20,000 request limit.  The old one ('07a805f23f58c572bba71595996a5ed2') has a 2,500 limit
var OPEN_CAGE_API_CODE = '6345b19760234b979f9b328fb035b8e5';
var OPEN_CAGE_API_URL = 'http://api.opencagedata.com/geocode/v1/json';


/**
 * Returns a json object with longitude and latitude of the specified address.
 * The object returned has two properties: lat and lng
 * Note: If no results were found, null is returned.
 * @param {Object} addressObj
 */
function getAddressGeometry(addressObj)
{
	//Make sure the zip code only has 5 digits if it's American (Open Cage doesn't recognize 9 digit zip codes e.g. 46526-2342)
	if (addressObj.zip != null && addressObj.country == 'United States' && addressObj.zip.length > 5)
	{
		addressObj.zip = addressObj.zip.slice(0,5);
	}
	
	//Only append the street address, city, and zip if they have something. Always do State and country.
	var addrString = (addressObj.address != null && addressObj.address.length > 0) ? addressObj.address + ', ' : '';
	addrString += (addressObj.city != null && addressObj.city.length > 0) ? addressObj.city + ', ' : '';
	addrString += addressObj.state;
	addrString += (addressObj.zip != null && addressObj.zip.length > 0) ? ' ' + addressObj.zip: '';
	addrString += ', ' + addressObj.country;

	//Search for the lat/long.
	var geometries = getAddressGeometries(addrString);
	
	if(geometries.length > 0)
	{
		//Make sure the result isn't the Open Cage default Canadian location.
		if (geometries[0].geometry.lat != '60.10867' || geometries[0].geometry.lng != '-113.64258')
		{
			return geometries[0].geometry;
		}
	}
	
	//If we're here, then either the lookup failed or returned the default Canadian coordinates.
	var addressIsEmpty = addressObj.address == null || addressObj.address.length == 0;
	var zipIsEmpty = addressObj.zip == null || addressObj.zip.length == 0;
	var cityIsEmpty = addressObj.city == null || addressObj.city.length == 0;
	if (!addressIsEmpty && !zipIsEmpty && !cityIsEmpty)
	{
		//Try it again without the address. Open Cage doesn't have a great database of street addresses.
		addressObj.address = null;
		return getAddressGeometry(addressObj);
	}
	else if (addressIsEmpty && !zipIsEmpty && !cityIsEmpty)
	{
		//Try it again without the zip. This seems to work better for Canadian addresses.
		addressObj.zip = null;
		return getAddressGeometry(addressObj);
	}
	else if (addressIsEmpty && zipIsEmpty && !cityIsEmpty)
	{
		//Try once more without the city. This should pretty much never happen, but will catch the stragglers (I hope).
		addressObj.city = null;
		return getAddressGeometry(addressObj);
	}
	else
	{
		//The lookup failed. Return null signifiying no dealer was found.
		return null;
	}
}

/**
 * Gets address geometries json array.
 * Each JSON object in this array has the following properties: 
 * 		name, confidence and 
 *      geometry which is a JSON object with lat and lng properties.
 * @param fullAddressInfo
 * @returns {___anonymous830_843}
 */
function getAddressGeometries(fullAddressInfo)
{
	var results = new Array();
	var addressGeoCodeJSON = getAddressGeoCodeJSON(fullAddressInfo);
	
	if(addressGeoCodeJSON.httpCode == '200' && addressGeoCodeJSON.openCageJSON != undefined && addressGeoCodeJSON.openCageJSON != null &&
	   addressGeoCodeJSON.openCageJSON.results != undefined && addressGeoCodeJSON.openCageJSON.results != null)
	{
		for(var i = 0; i < addressGeoCodeJSON.openCageJSON.results.length; i++)
		{
			var addressGeoCode = new Object();
			addressGeoCode.name = addressGeoCodeJSON.openCageJSON.results[i].formatted;
			addressGeoCode.confidence = addressGeoCodeJSON.openCageJSON.results[i].confidence;
			addressGeoCode.geometry = addressGeoCodeJSON.openCageJSON.results[i].geometry;
			
			results[results.length] = addressGeoCode;
		}
	}

	
	return results;
}


/**
 * Gets geo code JSON object for the specified address.
 * Note: Open Cage JSON object is included in openCageJSON property.
 * @param fullAddressInfo
 * @returns {___anonymous698_708}
 */
function getAddressGeoCodeJSON(fullAddressInfo)
{
	var addressJSON = new Object();
	addressJSON.httpCode = '';
	addressJSON.openCageJSON = null;
	
	var url = getOpenCageAPIURL(fullAddressInfo);
    var headers = new Array();
    headers['Content-Type'] = 'application/json';
    
    var response = nlapiRequestURL(url, null , headers, 'GET');   
    if(response != null)
	{
    	//nlapiLogExecution('debug', 'getAddressGeoCodeJSON', 'url: ' + url + '; address: ' + fullAddressInfo + '; OPEN CAGE RESPONSE = ' + response.getBody());
    	addressJSON.httpCode = response.getCode();
    	if(response.getError() != null) //error
    		throw response.getError();
		
    	addressJSON.openCageJSON = JSON.parse(response.getBody());		
	}    	
   
    return addressJSON;
}


/**
 * Returns the full url for open cage api given the address info.
 * @param fullAddressInfo - full address infomation
 * @returns {String} - url to execute open cage api.
 */
function getOpenCageAPIURL(fullAddressInfo)
{
	var url =  OPEN_CAGE_API_URL + '?query=' + fullAddressInfo + '&key=' + OPEN_CAGE_API_CODE;
	
	//replace special chars with their encoding chars. reference: http://www.w3schools.com/tags/ref_urlencode.asp
	return url.replaceAll(' ', '%20', true).replaceAll(',', '%2C', true).replaceAll('#', '%23', true).replaceAll('!', '%21', true).replaceAll('"', '%22', true).replaceAll('*', '%2A', true); //replaceALl is in RVS Common.js file.
}


/**
 * Returns error description given error object.
 * @param {Object} errorObj
 */
function getErrorDescription(errorObj, includeStackTrace)
{
	var errorMessage = '';
	try 
	{
		//If this is not a netsuite error, getDetails will throw an exception. Handle it in catch err2
		errorMessage = errorObj.getDetails(); 		
		try 
		{
			if(includeStackTrace)
				errorMessage = errorObj.getCode() + '\r\n' + errorObj.getDetails() + '\r\n' + errorObj.getStackTrace();
		} 
		catch (err3) //It failed to get the code or StackTrace of the error, just use error details.
		{
			errorMessage = errorObj.getDetails(); 
		}
	} 
	catch (err2) 
	{
		// if it is not a netsuite error, then getCode() will not work an exception is thrown
		// this means that the error was some other kind of error
		try 
		{
			if(includeStackTrace) //include stack trace, get as mush details as we can.
			{
				if(errorObj.description != undefined && errorObj.description != null)
					errorMessage += errorObj.description + '\r\n';	
				if(errorObj.message != undefined && errorObj.message != null)
					errorMessage += errorObj.message + '\r\n';
				if(errorObj.name != undefined && errorObj.name != null)
					errorMessage += errorObj.name + '\r\n';			
			}
			else //no stack trace, just find the message.
			{
				if(errorObj.description != undefined && errorObj.description != null)
					errorMessage = errorObj.description + '\r\n';	
				else if(errorObj.message != undefined && errorObj.message != null)
					errorMessage = errorObj.message + '\r\n';
				else if(errorObj.name != undefined && errorObj.name != null)
					errorMessage = errorObj.name + '\r\n';					
			}
		} 
		catch (err3) 
		{
			errorMessage = "Unknown error.";
		}
	}
	
	return errorMessage;
}


