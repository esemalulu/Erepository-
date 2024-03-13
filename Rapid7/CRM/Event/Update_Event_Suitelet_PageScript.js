/*
 * @author efagone
 */

function pageInit(){


}

function fieldChanged(type, name, linenum){

	if (name == 'custpage_status') {
	
		if (nlapiGetFieldValue(name) == 'CANCELLED') {
			nlapiSetFieldMandatory('custpage_cancelreason', true);
			nlapiDisableField('custpage_cancelreason', false);
		}
		else {
			nlapiSetFieldValue('custpage_cancelreason', '');
			nlapiDisableField('custpage_cancelreason', true);
			nlapiSetFieldMandatory('custpage_cancelreason', false);
		}
			
	}
	
}

function validateField(type, name, linenum){

	if (name == 'custpage_status') {
		
		if (nlapiGetFieldValue(name) == 'CANCELLED') {
		
			return confirm('This will cancel this meeting and send cancellations to all internal R7 employees involved.');
		}
	}
	
	return true;
}