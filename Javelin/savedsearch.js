function beforeLoadFunc(type, form) {
	
	// We only want this script to run when being triggered in the user interface
	var currentContext = nlapiGetContext(); 
	var executionContext = currentContext.getExecutionContext();
	if (executionContext == 'userinterface') { 
		// We want a unique ID for each user to only have one saved search per user
		var userID = nlapiGetUser();
		var userName = nlapiLookupField('employee', userID, 'entityid'); 

		// Get the company billing address postal code
		var companyZip = nlapiGetFieldValue('billzip');
		
		var companyName = nlapiGetFieldValue('companyname');
		
		// Parse the FSA from the postal code
		var companyFSA = companyZip.substring(0,3);
		
		// Only run if a valid FSA is returned, otherwise exit
		if (companyFSA != null && companyFSA.length == 3) {
			
			// Define search filters
			var filters = new Array();
			filters[0] = new nlobjSearchFilter( 'formulatext', null, 'startswith', companyFSA );
			filters[0].setFormula('{billzipcode}');
			filters[1] = new nlobjSearchFilter( 'isjob', null, 'is', 'F' );
			filters[2] = new nlobjSearchFilter( 'stage', null, 'noneof', 'LEAD' );

			// Define search columns
			var columns = new Array();
			columns[0] = new nlobjSearchColumn( 'internalid' );
			columns[1] = new nlobjSearchColumn( 'companyname' );
			columns[2] = new nlobjSearchColumn( 'phone' );
			columns[3] = new nlobjSearchColumn( 'billcity' );
			columns[4] = new nlobjSearchColumn( 'billaddress1' );
			columns[5] = new nlobjSearchColumn( 'billzipcode' );
			columns[6] = new nlobjSearchColumn( 'entitystatus' ).setSort( false );
			columns[7] = new nlobjSearchColumn( 'url' );
			columns[8] = new nlobjSearchColumn( 'custentity14' );  // SWX support level
			columns[9] = new nlobjSearchColumn( 'salesrep' );
			
			var searchTitle = 'Customer and Prospect Headquarters Near ' + companyName + ' for ' + userName;
			var scriptID = 'customsearch_nearby' + userID;
			try {
				var search = nlapiLoadSearch('customer', scriptID);
				search.deleteSearch();
				var search = nlapiCreateSearch( 'customer', filters, columns );
			}
			catch(err) {
				var search = nlapiCreateSearch( 'customer', filters, columns );
			}
			
			var searchId = search.saveSearch(searchTitle, scriptID);
			var savedSearchURL ='https://system.netsuite.com/app/common/search/searchresults.nl?searchid=' + searchId;
			nlapiSetFieldValue('custentity_nearbycompanies', savedSearchURL, null, true);
		} 
		else {
			// Exit since this company does not have a billing address set
		}
	}
}