/**
* Author: joe.son@audaxium.com
* Description:
* This is a helper function script is created but NEVER deployed.
* It contains all client side helper functions for User Event and Suitelets 
* This allows other User Event related form manipulation and Suitelet Form modifications to
* simply attach this script record and extend its capabilities. 
**/

/************************** Save And Edit User Event *******************************/
function SaveAndEdit(_recType, _recId) {
	
	//dynamically builds whence URL in edit mode
	var whenceURL = nlapiResolveURL('RECORD', _recType, _recId,'EDIT');
	
	document.getElementById('whence').value=whenceURL;
	
	getNLMultiButtonByName("multibutton_submitter").onMainButtonClick(this);
	
	return false;
	
}

/************************** Case Management Suitelet Related ***********************/
