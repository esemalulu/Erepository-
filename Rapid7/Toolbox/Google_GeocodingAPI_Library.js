/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Jul 2015     mburstein
 *
 * This library script can be added to any module to validate address information using the Google Geocoding API v3 (https://developers.google.com/maps/documentation/geocoding/)
 *  Sample address format i.e.:  100+Summer+St,+city,+state,+zip,+country
 *  
 * The status returned correlates to the NetSuite custom record "Address Valid Status (Google)"
 * 
 * As of 7/7/15, this is only used for graylisted requests submitted from outside the US/Canada.
 */
/**
 * Send Address info to Google Geocoding API to validate if location exists
 * @method googleGeocodeAPI_ValidateAddress
 * @param {Object} objAddress - object containing necessary company info for Amber Road screening
 * @throws {Error} if companyId is provided Amber Road will respond with an Error.
 * @return {ID} Returns internal ID of one of the following "Address Valid Status (Google)" records
 * 			Valid (1) - An exact match was found for the provided address.
 * 			Partial (2) - Partial matches were found but the address could not be fully verified.
 * 			Not Valid (3) - No match was found for the provided address.
 * 			Failed (4) - There was an error or licensing limit reached processing the address validation.
 */
function googleGeocodeAPI_ValidateAddress(streetAddress,city,state,postalCode,countryCode){

	try {
	
		// Street, city, country always required - return (3) Not Valid
		if (streetAddress == null || streetAddress == '') {
			return 3;
		}
		if (city == null || city ==''){
			return 3;
		}
		if (countryCode == null || countryCode == ''){
			return 3;
		}
		
		// if the arguments exist push to array and replace spaces with +
		var arrAddressParams = [];
		for (i = 0; i < arguments.length; i++) {
	        if (arguments[i] && arguments[i] != null && arguments[i] != '') {
	        	arrAddressParams.push(arguments[i].replace(/\s/g,"+"));
	        }
	    }
		// Create Address parameter string, concatenating with ,+
		// After this address params should exist in format i.e.:  100+Summer+St,+city,+state,+zip,+country
		var strAddressParams = arrAddressParams.join(',+');
		
		/* Add components filters
		 * 
		 * 	In a geocoding response, the Google Geocoding API can return address results restricted to a specific area. 
		 * 	The restriction is specified using the components filter. 
		 * 	A filter consists of a list of component:value pairs separated by a pipe (|). 
		 * 	Only the results that match all the filters will be returned. 
		 * 	Filter values support the same methods of spelling correction and partial matching as other geocoding requests. 
		 *	If a geocoding result is a partial match for a component filter it will contain a partial_match field in the response.
		 */ 
		
		// Filter by country
		var components = '&components:country='+countryCode;
		
		/* Region Biasing
		 * 	In a geocoding response, the Google Geocoding API returns address results influenced by the region (typically the country) from which the request is sent. 
		 * 	For example, searches for "San Francisco" may return different results if sent from a domain within the United States than one sent from Spain.
		 * 
		 * 	You can set the Geocoding API to return results biased to a particular region using the region parameter. 
		 * 	This parameter takes a ccTLD (country code top-level domain) argument specifying the region bias. 
		 * 	Most ccTLD codes are identical to ISO 3166-1 codes, with some notable exceptions. 
		 * 	For example, the United Kingdom's ccTLD is "uk" (.co.uk) while its ISO 3166-1 code is "gb" (technically for the entity of "The United Kingdom of Great Britain and Northern Ireland").
		 */	
		var region = '&region='+countryCode;
		
		// Google API Key
		var key = 'AIzaSyB_yxHlkefwdHsGwx93qp5umaqO0Gi59b0';
		
		var req_url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + strAddressParams + components + region +'&key='+key;

		var response = nlapiRequestURL(req_url);
		var body = response.getBody();
		
		// Return (4) Failed if error
		if (!response || !body) {
			nlapiLogExecution('ERROR', 'NULL Response ffrom get_GeoIP', 'req_url: ' + req_url);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'NULL response from get_GeoIP server', 'req_url: ' + req_url);
			return 4;
		}
		
		if (response.getCode() != 200) {
			nlapiLogExecution('ERROR', 'non 200 Response ffrom get_GeoIP', 'Code: ' + response.getCode() + '\nBody: ' + body  + '\nreq_url: ' + req_url);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'non 200 response from get_GeoIP server', 'Code: ' + response.getCode() + '\nBody: ' + body  + '\nreq_url: ' + req_url);
			return 4;
		}
		
		var objResults = JSON.parse(body);
		if(objResults.hasOwnProperty('status')){
			var status = objResults.status;	
			nlapiLogExecution('DEBUG', 'Geocoding returned status', status);
			/*
			 * The "status" field within the Geocoding response object contains the status of the request, and may contain debugging information to help you track down why geocoding is not working. The "status" field may contain the following values:
			 * 	"OK" indicates that no errors occurred; the address was successfully parsed and at least one geocode was returned
			 * 	"ZERO_RESULTS" indicates that the geocode was successful but returned no results. This may occur if the geocoder was passed a non-existent address
			 * 	"OVER_QUERY_LIMIT" indicates that you are over your quota.
			 * 	"REQUEST_DENIED" indicates that your request was denied.
			 * 	"INVALID_REQUEST" generally indicates that the query (address, components or latlng) is missing.
			 * 	"UNKNOWN_ERROR" indicates that the request could not be processed due to a server error. The request may succeed if you try again.
			 */
			
			// If status is ok then we need to verify if there is partial match.  Need input from business to decide what to do with partials
			
			if (status == 'OK'){
				nlapiLogExecution('AUDIT', 'Geocoding returned OK Results', strAddressParams);
				// Verify if partial match only
				for(result in objResults['results']){
					if(objResults.results[result]['partial_match'] == true){
						nlapiLogExecution('DEBUG', 'partial'+result, objResults.results[result]['partial_match']);
						// return (2) Partial Match
						return 2;
						break;
					}
				}
				// If not potential return (1) Valid
				return 1;
			}
			else if (status == 'ZERO_RESULTS'){ // Return (3) Not Valid
				nlapiLogExecution('AUDIT', 'Geocoding returned Zero Results', strAddressParams);
				return 3;
				
			}
			// Return (4) Failed if error
			else{
				nlapiLogExecution('ERROR','Could not geocode validate address','status='+status+'\nreq_url: ' + req_url);
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, adminUser, 'Could not geocode validate address', 'status: ' + status + '\nreq_url: ' + req_url +'\nBody: ' + body);
				return 4;
			}
		}
		// Return (4) Failed if error
		else{
			nlapiLogExecution('ERROR','Could not geocode validate address','No Status returned'+'\nreq_url: ' + req_url);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Could not geocode validate address', 'No Status returned'+'\nreq_url:' + req_url +'\nBody: ' + body);
			return 4;
		}
	} 
	// Return (4) Failed if error
	catch (err) {
		nlapiLogExecution("ERROR", 'Could not geocode validate address', err);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Could not geocode validate address', 'Error: ' + err);
		return 4;
	}
}
