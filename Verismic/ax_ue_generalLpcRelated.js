/**
 * Generic User Event script applied to L/P/C (Lead, Prospect, Client) records.
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 May 2016     json
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function lpcBeforeLoad(type, form, request)
{
	if (nlapiGetContext().getExecutionContext()=='userinterface')
	{
		if (type=='delete' || type =='xedit')
		{
			return;
		}
		
		var newOppUrl = nlapiResolveURL('RECORD', 'opportunity');
		//Add in entity value
		if (type != 'create')
		{
			newOppUrl += '?entity='+nlapiGetRecordId();
		}
		
		form.addButton(
				'custpage_newoppbtn', 
				'New Opportunity', 
				'window.open(\''+newOppUrl+'\');return true;'
		);
		
	}
	
}
