/*
 * @author mburstein
 */

function pageInit(){
	
	nlapiSetFieldMandatory('custpage_ponumber', false);
	
	// Disables PO field on pageInit
	nlapiDisableField('custpage_ponumber', true);
}

function fieldChanged(type, name, linenum){

	if (name == 'custpage_status') {
	
		if (nlapiGetFieldValue('custpage_status') == '16') {
			nlapiDisableField('custpage_ponumber', false);
			nlapiSetFieldMandatory('custpage_ponumber', true);
		}
		else {
			nlapiDisableField('custpage_ponumber', true);
			nlapiSetFieldValue('custpage_ponumber', '', false);
			nlapiSetFieldMandatory('custpage_ponumber', false);
		}
	}
	
	/*if (name == 'custpage_hardwaretype'){
		var hardwareType = nlapiGetFieldValue('custpage_hardwaretype');	
		if(hardwareType != '' && hardwareType != null){
			var fldPONumber = nlapiGetField('custpage_ponumber');
			// set PO options
			var poOptions = searchValidPOs(hardwareType);
			fldPONumber.addSelectOption('','');
			for (p in poOptions) {
				fldPONumber.addSelectOption(p, poOptions[p]);
			}		
		}	
	}	*/
}

function validateField(type, name, linenum){
	return true;
}