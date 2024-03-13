/*
 * @author efagone
 */

function pageInit(){

	if (nlapiGetFieldValue('custpagesurvtype') == 2 || nlapiGetFieldValue('custpagesurvtype') == 3) {
		nlapiSetFieldMandatory('custpage2comments2', false);
		nlapiSetFieldMandatory('custpage2question2a', false);
		nlapiDisableField('custpage2comments2', true);
		nlapiDisableField('custpage2question2a', true);
	}
}

function fieldChanged(type, name, linenum){

	if (name == 'custpage2question2'){
		
		if (nlapiGetFieldValue(name) == 6){
			nlapiDisableField('custpage2comments2', false);
			nlapiSetFieldMandatory('custpage2comments2', true);
			nlapiDisableField('custpage2question2a', false);
			nlapiSetFieldMandatory('custpage2question2a', true);
		}
		else {
			nlapiDisableField('custpage2comments2', true);
			nlapiSetFieldMandatory('custpage2comments2', false);
			nlapiSetFieldValue('custpage2comments2', '');
			nlapiDisableField('custpage2question2a', true);
			nlapiSetFieldMandatory('custpage2question2a', false);
			nlapiSetFieldValue('custpage2question2a', '');
		}
	}
}