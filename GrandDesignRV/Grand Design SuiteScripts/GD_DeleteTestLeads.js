/**
 * Deletes all leads that have a Sales Menu Option set.
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 Mar 2016     Jacob Shetler
 *
 */

/**
 * Scheduled script to delete all test leads.
 * Call it in the live account with: nlapiScheduleScript('customscriptgd_deletetestleads', 'customdeploygd_deletetestleads')
 * 
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function DeleteLeads(type)
{
	var leads = nlapiSearchRecord('customer', null, [new nlobjSearchFilter('stage', null, 'anyof', 'LEAD'), new nlobjSearchFilter('custentitygd_salesautomenuoption', null, 'noneof', '@NONE@')]);
	if (leads != null)
	{
		for (var i = 0; i < leads.length; i++)
		{
			nlapiDeleteRecord('customer', leads[i].getId());
		}
	}
}
