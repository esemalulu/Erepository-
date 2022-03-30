/**
 * Sales order user event is triggered when SO has SO VP Approved checked for the first time and
 * line item contains item with class of Class = Software.
 * List of CLASS IDs are passed in as comma separated list of Internal IDs passed in as Company Level Setting
 * 
 * @param type
 */

var paramSoftwareClassIds = nlapiGetContext().getSetting('SCRIPT','custscript_xx_axibclassids');

function ibSoAfterSubmit(type) {

	//Return out if type is delete of xedit or copy
	if (type!='create' && type=='edit')
	{
		log('debug',type+' is not supported','Unsupported action to trigger AXInstall Base');
		return;
	}
	
	if (paramSoftwareClassIds) {
		paramSoftwareClassIds = paramSoftwareClassIds.split(',');
	} else {
		//Turn it into empty array
		paramSoftwareClassIds = [];
	}
	
	//Need to check to see if this is the first time VP is approving SO
	//SO VP Approved: custbody_ax_sovp_approved (Sandbox) // custbody21 (Production)
	var oldRec = nlapiGetOldRecord();
	var newRec = nlapiGetNewRecord();
	if (newRec.getFieldValue('custbody_ax_sovp_approved')=='T' && (!oldRec || (oldRec && oldRec.getFieldValue('custbody_ax_sovp_approved') != 'T'))) 
	{
		//Let's check to make sure line items contain software class items
		if (paramSoftwareClassIds.length <= 0) {
			log('error','No Software Class Defined', 'SO Number '+newRec.getFieldValue('tranid')+' May NOT be processed. Company Level preference may not have been set');
			return;
		}
		
		var continueProcessing = false;
		var lineCount = newRec.getLineItemCount('item');
		for (var i=0; i <= lineCount; i++) {
			//loop through and check to see if line contains class of Software class
			if (newRec.getLineItemValue('item', 'class', i) && paramSoftwareClassIds.contains(newRec.getLineItemValue('item', 'class', i))) 
			{
				continueProcessing = true;
				break;
			}
		}
		
		//Continue processing to create new Install Base
		if (continueProcessing) 
		{
			var endUserId = newRec.getFieldValue('custbody_end_user');
			//If End User field is NOT set, return it as error
			if (!endUserId) {
				log('error','SO Missing End User Value','SO Number '+newRec.getFieldValue('tranid')+' Missing End User Value');
				return;
			}
			
			try 
			{
				} else {
					
				}
			} 
			catch (iberr) 
			{
				log('error','Error looking up / creating Install Base','SO Number '+newRec.getFieldValue('tranid')+' Error Occured: '+getErrText(iberr));
			}
		}
		
	}
	
	
	
	
	
}