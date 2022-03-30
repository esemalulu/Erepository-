function myBeforeLoadFunc(type, form) {
	if (type == 'edit') {	
		if(nlapiGetFieldValue('customform')) {
			// currentForm is a variable holding the form id
			var currentForm = nlapiGetFieldValue('customform');
			var MERGE_FORM = 51;
			
			if (currentForm == MERGE_FORM) {
				nlapiLogExecution('DEBUG','Removing merge case button', 'Running before load script on MERGE case form = ' + currentForm); 
				form.removeButton('custpage_mymergebutton');
			}
			else {
				nlapiLogExecution('DEBUG','Adding merge case button', 'Running before load script on Regular case form = ' + currentForm); 
				form.setScript('customscript_mergecases');
				form.addButton('custpage_mymergebutton','Merge Case','useMergeCaseForm();');
			}
		}
	}
}


function myAfterSubmitFunc(type, form) {
	if (type == 'edit') {	
		if (nlapiGetFieldValue('customform')) {
			// currentForm is a variable holding the form id
			var currentForm = nlapiGetFieldValue('customform');
			var MERGE_FORM = 51;
			
			if (currentForm == MERGE_FORM) {
				var currentCase = nlapiGetFieldValue('custevent_mergewithcase');
				if (currentCase != null && currentCase!='') {
					nlapiLogExecution('DEBUG','Attempting to merge case', 'Running after submit on MERGE case form = ' + currentForm); 
					//Add code to merge case here
				}
			}	
		}
	}
}
