
function get_GeoIP(ip_address){

	try {
	
		if (ip_address == null || ip_address == '') {
			return false;
		}
		
		var req_url = 'https://geoip.maxmind.com/geoip/v2.1/insights/' + ip_address;
		
		var authHeaders = [];
		authHeaders['Authorization'] = 'Basic MTAwNTE2OkRWRWs4WTJqSTNCNQ==';
		authHeaders['Accept'] = 'application/json';
		authHeaders['Content-Type'] = 'application/json';
				
		var response = nlapiRequestURL(req_url, null, authHeaders);
		var body = response.getBody();
		
		if (!response || !body) {
			nlapiLogExecution('ERROR', 'NULL Response ffrom get_GeoIP', 'req_url: ' + req_url);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'NULL response from get_GeoIP server', 'req_url: ' + req_url);
			return false;
		}
		
		if (response.getCode() != 200) {
			nlapiLogExecution('ERROR', 'non 200 Response ffrom get_GeoIP', 'Code: ' + response.getCode() + '\nBody: ' + body  + '\nreq_url: ' + req_url);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'non 200 response from get_GeoIP server', 'Code: ' + response.getCode() + '\nBody: ' + body  + '\nreq_url: ' + req_url);
			return false;
		}
		
		return JSON.parse(body);
		
	} 
	catch (err) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiLogExecution("ERROR", 'Error from get_GeoIP', err);
		nlapiSendEmail(adminUser, adminUser, 'error get_GeoIP attempt', 'IP: ' + ip_address + '\nError: ' + err);
		return false;
	}
}

