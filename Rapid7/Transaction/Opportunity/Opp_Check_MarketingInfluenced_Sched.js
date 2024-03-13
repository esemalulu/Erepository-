/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Jun 2015     mburstein
 *
 *	This script will set the opportunity field "Marketing Influenced" to true for all opportunities returned by the Customer search: "Marketing influenced opps".
 *	The search criteria returns all Opportunities where a Marketing tasks has been created within 30 days before the opportunity was created.
 *	The script runs once per day at 1:00 am EST.
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function checkMarketingInfluencedOnOpps(type) {
	var arrSearchResults = nlapiSearchRecord('customer', 'customsearchr7opp_checkmrktinfluenced'); // search - SCRIPT - Opportunity Check Marketing Influenced (20261)
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var searchResult = arrSearchResults[i];
		var columns = searchResult.getAllColumns();
		var oppId = searchResult.getValue(columns[0]);
		
		try {
			nlapiSubmitField('opportunity', oppId, 'custbodyr7marketinginfluenced', 'T'); // Set Marketing Influenced field on opportunity returned from search
		} 
		catch (e) {
			nlapiLogExecution('DEBUG','Could not check Marketing Influenced on Opp:'+oppId,e);
		}
	}
}
