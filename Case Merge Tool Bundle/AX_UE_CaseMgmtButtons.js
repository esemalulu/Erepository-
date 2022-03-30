function myBeforeLoadFunc(type, form)
{
	if (type == 'edit' || type == 'view') {
		
		var sourceCase = nlapiGetRecordId();
		
		form.setScript('customscript_aux_ue_casemerge_helper');
		form.addButton('custpage_mymergebutton','Merge Case','openCaseMgmt(\''+sourceCase+'\',\'MERGE\');');
		
	}
}
