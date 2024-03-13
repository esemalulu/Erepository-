/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Mar 2015     efagone
 *
 */

function r7_cusp_validateField(type, name, linenum){


	if (name == 'custrecordr7cusspfeatureid') {
		var featureId = nlapiGetFieldValue('custrecordr7cusspfeatureid');
		var invalidCharsRegex = /[^0-9a-zA-Z_]/g;
		
		if (invalidCharsRegex.test(featureId)) {
			alert('Feature ID can only contain digits, alphabetic characters, or "_" with no spaces. Invalid characters will be removed.');
			nlapiSetFieldValue('custrecordr7cusspfeatureid', featureId.replace(invalidCharsRegex, ''));
		}
	}
	
	if (name == 'name' && nlapiGetFieldValue('name') && !nlapiGetFieldValue('custrecordr7cusspfeatureid')) {
		var name = nlapiGetFieldValue('name').toLowerCase();
		var invalidCharsRegex = /[^0-9a-zA-Z_]/g;
		
		var featureTxt = name.replace(/\s/g, '_').replace(invalidCharsRegex, ''); // replace space with underscore, then replace all invalids
		nlapiSetFieldValue('custrecordr7cusspfeatureid', featureTxt);
	}
	
	return true;
}
