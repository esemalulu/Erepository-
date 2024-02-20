/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07/26/2017	Meghan Gerke
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord customrecordrvsclaim
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
//Client-side code that makes sure the line # is set on the claim when not created from a pre-auth. This is for the dealer portal and UI//
function OpLineRequired_SaveRecord()
{	
	var preAuth = nlapiGetFieldValue('custrecordclaim_preauthorization');
	if (preAuth == '' || preAuth == null) {
		//Get field value of the operation line #'s on the operation sublist/parts sublist on save of the Claim record.*Not created from Pre-Auth*
		var opLine = nlapiGetLineItemCount('recmachcustrecordclaimoperationline_claim');
		for (var i = 1; i <= opLine; i++)
		{
			nlapiSelectLineItem('recmachcustrecordclaimoperationline_claim', i);
			var opLinenumValue = nlapiGetCurrentLineItemValue('recmachcustrecordclaimoperationline_claim', 'custrecordclaimoperationline_linenumber');
			if (opLinenumValue == '')
			{
				alert("The operation line number contains an empty value.");
				return false; 
			}
		}
		
		var partLineCount = nlapiGetLineItemCount('recmachcustrecordclaimpartline_claim');
		for (var i = 1; i <= partLineCount; i++)
		{
			nlapiSelectLineItem('recmachcustrecordclaimpartline_claim', i);
			var partLinenumValue = nlapiGetCurrentLineItemValue('recmachcustrecordclaimpartline_claim', 'custrecordclaimpartline_operationlinenum');
			if (partLinenumValue == 0)
			{
				alert("The operation line number is not valid on the Part Line sublist.  It must match an operation line # listed on the Operation Line sublist.");
				return false; 
			}
		}
	}
	return true;
}
		
	
	
