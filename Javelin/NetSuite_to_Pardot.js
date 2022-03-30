function pushToPardot(type){
	var email='lauren.murdoch@javelin-tech.com';
	var password='Amanda28';
	var user_key='d95899dad35f4ec4998dd9f8054cd1f9';
	var types = new Array('contact', 'customer');
	var url = 'https://pi.pardot.com/api/index?email='+email+'&password='+password+'&user_key='+user_key;
	var api_key;
	var context = nlapiGetContext();
	var filter = new nlobjSearchFilter('CUSTENTITYPI_URL', null, 'is', 'http://queued');
	var column = new nlobjSearchColumn('email');
	var i;
	var j;
	
	for (i = 0; i < types.length; i++) {
		var searchResults = nlapiSearchRecord(types[i], null, filter, column);
		if (searchResults && searchResults.length > 0) {
			if (!api_key) {
				var response = nlapiRequestURL(url, null, null );
				var responseXML = nlapiStringToXML( response.getBody() );
				api_key = nlapiSelectValue( responseXML, '//api_key' );
				}
			if (api_key) {
				var email;
				for (j = 0; j < searchResults.length && context.getRemainingUsage() > 50; j++) {
					email = searchResults[j].getValue('email');
					if (email != '') {
						url ='https://pi.pardot.com/api/prospect?version=3&do=create&user_key='+user_key+'&api_key='+api_key+'&email='+ email;
						nlapiRequestURL(url, null, null );
						nlapiSubmitField(types[i],searchResults[j].getId(), 'custentitypi_url', 'http://processing');
						}
					}
				}
			}
		}
	}