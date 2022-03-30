function myBeforeLoadFunc(type, form)
{
	if (type == 'edit') {
		
		if(nlapiGetFieldValue('customform')) {
			// currentForm is a variable holding the form id
			var currentForm = nlapiGetFieldValue('customform');
			
			var MERGE_FORM = 51;
			
			if (currentForm == MERGE_FORM) {
				nlapiLogExecution('DEBUG','Running Before Load Function', 'Running before load script on MERGE case form = ' + currentForm); 
				form.setScript('customscript_mergecases');
				form.addButton('custpage_mymergebutton','Complete Merge','MergeClicked();');
			}
			else {
				nlapiLogExecution('DEBUG','Running Before Load Function', 'Running before load script on Regular case form = ' + currentForm); 
				form.setScript('customscript_mergecases');
				form.addButton('custpage_mymergebutton','Merge Case','MergeClicked();');
			}
		}
	}
}

