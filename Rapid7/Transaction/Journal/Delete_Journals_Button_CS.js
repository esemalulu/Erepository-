/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Sep 2012     efagone
 *
 */

function deleteJournals_cs(){

	if (confirm('Are you sure you want to delete ALL Journal Entries created from this transaction?')) {
		document.getElementById('custpage_deletejournals').value = 'Deleting Journals...';
		
		var deleteJournalURL = nlapiResolveURL('SUITELET', 'customscriptr7deletejournalbutton_suitel', 'customdeployr7deletejournalbutton_suitel', false);
		
		var postData = new Array();
		postData['custparam_tranid'] = nlapiGetRecordId();
		
		var delResponse = nlapiRequestURL(deleteJournalURL, postData);
		
		document.getElementById('tbl_custpage_deletejournals').style.display = 'none';
		alert(delResponse.getBody());
		
	}
}
