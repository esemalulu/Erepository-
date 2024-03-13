/*
 * @author mburstein
 */
function confirmHardwareReplacement(){
	// Use custom confirm button to kickoff workflow
	var recordType = nlapiGetRecordType();
	var recordId = nlapiGetRecordId();
	var applianceNumber = nlapiGetFieldText('name');
	var yesReplace = confirm("Are you sure you want to replace appliance" + applianceNumber + "?  This will create a new HBR and update status to pending return.")
	if (yesReplace != false){
		
		// initate Appliance Replacement Workflow
		//nlapiInitiateWorkflow(recordType, recordId, 'customworkflow277');
	}
	else{
		// Do nothing
	}
}
