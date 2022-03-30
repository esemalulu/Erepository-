function myBeforeLoadFunc(type, form)
{
	if (type == 'edit' || type == 'view') {
		
		var sourceCase = nlapiGetRecordId();
		
		form.setScript('customscript_cs_case_mgmt_helper');
		form.addButton('custpage_mymergebutton','Merge Case','openCaseMgmt(\''+sourceCase+'\',\'MERGE\');');
		
	}
}
