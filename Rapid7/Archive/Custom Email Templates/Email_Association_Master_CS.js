/*
 * @author efagone
 */

function fieldChanged(list, field, linenum){

	if (field == 'custpage_tags') {
		var eatId = nlapiGetFieldValue('custpage_tags');
		
		if (eatId != '' && eatId != null) {
			var tagId = '{' + eatId + '}';
			nlapiSetFieldValue('custpage_tagid', tagId);
			
			var currentHTML = nlapiGetFieldValue('custrecordr7emailassocmaster_content');
			nlapiSetFieldValue('custrecordr7emailassocmaster_content', currentHTML + ' ' + tagId, false);
			//nlapiSetFieldValue('custpage_tags', '', false);
		}
	}
}

function postSourcing(type, name){


}