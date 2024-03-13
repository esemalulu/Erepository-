/*
 * @author efagone
 */

function afterSubmit(type){

	if (type != 'delete') {
		var itemId = nlapiGetFieldValue('custrecordr7psoitemcompitem');
		var itemResult = nlapiSearchRecord('item', null, nlobjSearchFilter('internalid', null, 'is', itemId), null);
		var itemType = itemResult[0].getRecordType();
		
		nlapiLogExecution('DEBUG', 'itemType', itemType);
		
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7psoitemcompitem', null, 'is', itemId);
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('internalid', 'custrecordr7psoitemcompitem', 'group');
		arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7psoitemcomppercent', null, 'sum');
		arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7psoitemcompduration', null, 'sum');
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7psoitemcomp', null, arrSearchFilters, arrSearchColumns);
		
		var totalPercentage = arrSearchResults[0].getValue(arrSearchColumns[1]);
		var totalDuration = arrSearchResults[0].getValue(arrSearchColumns[2]);
				
		var fields = new Array();
		fields[0] = 'custitemr7psototalpercentage';
		fields[1] = 'custitemr7psototalduration';
		
		var values = new Array();
		values[0] = totalPercentage;
		values[1] = totalDuration;
		
		nlapiSubmitField(itemType, itemId, fields, values);
	}
}
