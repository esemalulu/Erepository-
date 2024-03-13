/**
 * @author suvarshi
 */

function authenticate_before_print(type){
	
	var role = nlapiGetContext().getRole();
	
	if (role != '1006' && role != '1019' && role != '3') {
	
		var record = nlapiGetNewRecord();
		var supervisorApproval = record.getFieldValue('supervisorapproval');
		var financeApproval = record.getFieldValue('custbodyr7financeapproval');
		
		if (supervisorApproval == 'F' || financeApproval == 'F') {
			//throw nlapiCreateError('Unapproved Transaction', "Rapid7 policy does not allow printing or e-mailing of unapproved Purchase Orders. Please seek approval before emailing/printing.", false);
		//alert(");
		//return false;
		}
		else {
		//return true;		
		}
	}
}


// 