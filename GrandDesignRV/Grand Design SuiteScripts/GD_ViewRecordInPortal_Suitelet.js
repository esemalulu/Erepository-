/**
 * Suitelet to view a record for a different dealer than that of the logged in contact.
 * 
 * Version    Date            Author           Remarks
 * 1.00       5 Feb 2019      Lydia Miller
 *
 */

var GD_CUSTOMFORM_EXTERNALWEBORDER = '173';

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_ViewRecordInPortal_Suitelet(request, response)
{
	var recType = request.getParameter('rectype'); // always required
	var recId = request.getParameter('recid');     // if blank, we'll show a new record in edit mode.

    if(recId == null) // if no record id, show a new record in view mode. This only happens for part web orders. 
    {
    	var params = [];
    	params.cf = GD_CUSTOMFORM_EXTERNALWEBORDER;
    	nlapiSetRedirectURL('RECORD', recType, null, true, params);
    }
    else
    {
    	if(recType == 'estimate')
		{
    		var props = new Array();
        	props.formnumber = GD_CUSTOMFORM_EXTERNALWEBORDER;
        	var fileObj = nlapiPrintRecord('TRANSACTION',recId,'PDF',props);
		}
    	else
        	var fileObj = nlapiPrintRecord('TRANSACTION',recId,'PDF');
    	
    	fileObj.setName('Record #' + recId + '.pdf');

    	response.setContentType('PDF', 'Record#' + recId + '.pdf', 'inline');
    	response.write(fileObj.getValue());
    }
}