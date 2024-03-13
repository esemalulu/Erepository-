/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       29 Apr 2013     mburstein
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function beforeSubmit(type){
	if (type == 'create') {
		// Set the RSS ID to a 6 char random string
		var randomString = getRandomString(6);
		nlapiSetFieldValue('custrecordr7rssvalidsearchesrssid', randomString);
		
		// Set the Channel Link to the External Suitelet URL + RSS ID
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7createrssfromsearchsuitlet', 'customdeployr7createrssfromsearchsuitlet',true);
		nlapiSetFieldValue('custrecordr7rssvalidsearcheschannellink',suiteletURL+'&rssid='+randomString);
	}
}

