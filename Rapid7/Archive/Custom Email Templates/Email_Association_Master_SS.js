/*
 * @author efagone
 */

function beforeLoad(type, form){
	
	if (type == 'edit' || type == 'create'){
		
		var fldPreview = nlapiGetField('custrecordr7emailassocmasterpreview');
		fldPreview.setDisplayType('hidden');
		
		var fldInsertTags = form.addField('custpage_tags', 'select', 'Insert Tag').setLayoutType('normal', 'startcol');
		sourceTags(fldInsertTags);
		
		var fldTags = form.addField('custpage_tagid', 'text').setDisplayType('inline');
		
	}
	
}
function afterSubmit(type){

	if (type != 'delete') {
	
		if (type == 'xedit') {
			var record = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		}
		else {
			var record = nlapiGetNewRecord();
		}
		
		processMaster(record); //library function
	}
}

function sourceTags(fld){

	fld.addSelectOption('', '');
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('name');
	arrSearchColumns[1] = new nlobjSearchColumn('altname').setSort();
	
	var arrSearchResults = nlapiSearchRecord('customrecordr7emailassociationtags', null, arrSearchFilters, arrSearchColumns);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
	
		var searchResult = arrSearchResults[i];
		var eatId = searchResult.getValue(arrSearchColumns[0]);
		var eatName = searchResult.getValue(arrSearchColumns[1]);
		
		fld.addSelectOption(eatId, eatName);
	}
}



