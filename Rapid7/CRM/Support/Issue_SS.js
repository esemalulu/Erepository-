/*
 * @author efagone
 */

function beforeLoad(type, form){

}

function beforeSubmit(type){
	var userId = nlapiGetUser();
	try {
		//this beforeSubmit is necesary for Salesforce
		if ((type == 'create' || type == 'edit') && (userId == 241368 || userId == 55011)) { //salesforce workarounds for not being able to set reviewer upon create/edit
			var duplicateOfSalesforce = nlapiGetFieldValue('custeventr7issue_duplicateofsalesforce');
			var issueStatus = nlapiGetFieldValue('issuestatus');
			var salesforceReviewer = nlapiGetFieldValue('custeventr7salesforcereviewer');
			var salesforceStatus = nlapiGetFieldValue('custeventr7issuesalesforcestatus');
			var salesforceAssigned = nlapiGetFieldValue('custeventr7issuesalesforceassigned');
			
			if (salesforceStatus != '' && salesforceStatus != null) {
				nlapiSetFieldValue('issuestatus', salesforceStatus);
				nlapiSetFieldValue('custeventr7issuesalesforcestatus', '');
			}
			
			if (duplicateOfSalesforce != null && duplicateOfSalesforce != '') {
				nlapiSetFieldValue('issuestatus', 5);
				nlapiSetLineItemValue('relatedissues', 'relationship', 1, 'S2');
				nlapiSetLineItemValue('relatedissues', 'issuenumber', 1, duplicateOfSalesforce);
			}
			else {
				for (var i=1; i < nlapiGetLineItemCount('relatedissues'); i++){
					if (nlapiGetLineItemValue('relatedissues', 'relationship', i) == 'S2') {
						nlapiRemoveLineItem('relatedissues', i);
						i--;
					}
				}
			}
			nlapiSetFieldValue('reviewer', salesforceReviewer);
			
			if (issueStatus != 1) {
				nlapiSetFieldValue('assigned', salesforceAssigned);
			}
			
			nlapiSetFieldValue('custeventr7salesforcereviewer', '');
			nlapiSetFieldValue('custeventr7issue_duplicateofsalesforce', '');
			nlapiSetFieldValue('custeventr7issuesalesforceassigned', '');
			
		}
	}
	catch (e){
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'ERROR ON issue_ss', 'InternalID: ' + nlapiGetRecordId() + '\n\nError: ' + e);
	}
}

//363194