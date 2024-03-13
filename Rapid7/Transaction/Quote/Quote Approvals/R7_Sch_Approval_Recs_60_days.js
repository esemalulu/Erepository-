/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       12 Jan 2016     sfiorentino	   This script is to replace workflow: Approvals Expired after 60 days. This will reject the records instead of expire them.
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	var searchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_savedsearchid');
	var searchResults = nlapiSearchRecord('customrecordr7approvalrecord', searchId);
	if(!searchResults)
		{nlapiLogExecution('DEBUG', 'Search Results', 'No search results found. Ending Script');
		return
		}
	for (var z in searchResults)
	{
	var appRec = searchResults[z].getValue('internalid');
    var quote = nlapiLookupField('customrecordr7approvalrecord',appRec,'custrecordr7approvalquote');
    nlapiSubmitField('customrecordr7approvalrecord', appRec, 'custrecordr7approvalstatus', '4');
	nlapiSubmitField('estimate', quote, 'custbodyr7quoteorderapprovalstatus', '4');
	}

}
