/**
 * Restlet that returns locations for use with the PDI Real-Time Display Suitelet
 * 
 * Version    Date            Author           Remarks
 * 1.00       7 Feb 2017     brians
 *
 */

/**
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function getLocationsRESTlet(dataIn) {
	
	// Define search filters
	var filters = [];
	filters.push(new nlobjSearchFilter ('custrecordrvs_location_isproduction', null, 'is', 'T'));
	
	// Define search columns
	var columns = [];
	columns.push(new nlobjSearchColumn('name'));
	
	var searchResults = nlapiSearchRecord('location', null, filters, columns);
	var location;
	
	var returnObj = {};
	returnObj.locationsArray = [];
	
	if(searchResults != null)
	{
		for(var i = 0; i < searchResults.length; i++)
		{
			location = new Object();
			location.locationId = searchResults[i].getId();
			location.name = searchResults[i].getValue('name');
			returnObj.locationsArray[i] = location;
		}
	}
	
	//Return the logged-in user, so we can display it on the login popup
	returnObj.user = nlapiGetUser();
	if(returnObj.user)
		returnObj.user = {'id': returnObj.user, 'name': nlapiLookupField('employee', returnObj.user, 'entityid')};
	
	return JSON.stringify(returnObj);
}
