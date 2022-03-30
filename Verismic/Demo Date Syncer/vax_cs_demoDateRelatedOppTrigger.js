/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Oct 2015     json
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function oppDemoDateSaveRecord(){

	if (nlapiGetContext().getExecutionContext()=='userinterface')
	{
		//ONLY trigger if it's USER taking action.
		if (nlapiGetLineItemCount('item') < 1)
		{
			alert('You MUST have atleast 1 item on this opportunity');
			return false;
		}
		
	}
	
    return true;
}
