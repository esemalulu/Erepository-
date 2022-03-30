function saveRecord() {
	// FTM STATUS 18 => "11. Ready for Purchasing"
	if(nlapiGetFieldValue("custrecord_compliance_issues_addressed2") == 'F' && nlapiGetFieldValue("custrecord_ftm_status") == '18') {
		alert("Please check 'COMPLIANCE ISSUES ADDRESSED?' check box once you want to move the FTM Status to '11. Ready for Purchasing'");
		return false;
	}
	return true;
}