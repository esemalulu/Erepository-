
function useMergeCaseForm() {

	var newType = nlapiGetRecordType();
	var caseInternalID = nlapiGetRecordId();
	var MERGE_FORM = 51;
	var mergeSuccessful = false;
	
	if (nlapiGetFieldValue('customform')) {

		var currentForm = nlapiGetFieldValue('customform');
		
		// If the Merge button is pressed from a regular case form
		if (currentForm != MERGE_FORM) {
			var caseToMerge = nlapiLoadRecord('supportcase',caseInternalID); //	{recordmode: 'dynamic'}
			var caseToMergeNumber = nlapiGetFieldValue('casenumber');

			caseToMerge.setFieldValue('customform', MERGE_FORM);
			nlapiSubmitRecord(caseToMerge,false,true);

			// Create a new URL in order to go to the new record
			var newURL = 'https://system.netsuite.com/app/crm/support/supportcase.nl?id=' + caseInternalID + '&e=T&cf=' + MERGE_FORM;
			window.location = newURL;	
		}
	}
}


