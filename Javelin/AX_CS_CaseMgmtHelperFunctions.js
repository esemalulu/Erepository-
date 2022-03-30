/**
* Author: joe.son@audaxium.com
* Description:
* This is a helper function script is created but NEVER deployed.
* Contains all client functions related to case management tool
**/

/**
 * onsave function
 */
function mergeCaseRecords() {
	//When EVERYTHING checks out. Validate ONCE more from user to Merge the case
	var answer = confirm('Are you SURE you want to merge these cases? Action can NOT be UNDONE!');
	if(answer) {
		return true;
	}
	return false;
}

function openCaseMgmt(sourceCaseId, action) {
	var slCaseMgmtUrl = nlapiResolveURL('SUITELET','customscript_sl_case_management','customdeploy_sl_case_management_dpl');
	slCaseMgmtUrl += '&custpage_sourcecase='+sourceCaseId+'&custpage_action='+action;
	//, "Case Management", "status=1,toolbar=0,location=0,menubar=0,width=860px,height=550px"
	var caseManager = window.open(slCaseMgmtUrl,'CaseManagement','status=1,toolbar=0,location=0,menubar=0,width=860,height=550');
	caseManager.focus();
	
}
/*  Joe's Old Function
function redirectToNewCase(targetid) {
	window.close();
	
	var targetUrl = nlapiResolveURL('RECORD','supportcase',targetid,'VIEW');
	
	window.opener.location=targetUrl;
}
*/
function redirectToNewCase(targetid) {
	var targetUrl = nlapiResolveURL('RECORD','supportcase',targetid,'VIEW');
	
	window.opener.location=targetUrl;
	
	window.close();
}
