function myBeforeLoadFunc(type, form)
{
	if (type == 'edit' || type == 'view') {
		
		var sourceCase = nlapiGetRecordId();
		
		form.setScript('customscript_mergecases');
		form.addButton('custpage_mymergebutton','Merge Case','openCaseMgmt(\''+sourceCase+\',\'MERGE\'');');
		
	}
}
