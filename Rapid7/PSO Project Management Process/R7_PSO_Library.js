/*
 * @author efagone
 */

function createComponents(engagementId, customerId, salesOrderId, parentJobId, itemId){
	
	
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7psoitemcompitem', null, 'is', itemId);
		
		var arrSearchColumns = new Array();
		arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7psoitemcomptitle');
		arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7psoitemcomppercent');
		arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7psoitemcompduration');
		arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7psoitemcomptype');
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7psoitemcomp', null, arrSearchFilters, arrSearchColumns);
		
		if (arrSearchResults != null){
			arrSearchResults.sort(myCustomSort);
		}
		
		for (var i in arrSearchResults) {
		
			var searchResult = arrSearchResults[i];
			var compName = searchResult.getValue(arrSearchColumns[0]);
			var compPercent = searchResult.getValue(arrSearchColumns[1]);
			var compDuration = searchResult.getValue(arrSearchColumns[2]);
			var compType = searchResult.getValue(arrSearchColumns[3]);
			
			var recComponent = nlapiCreateRecord('customrecordr7psocomponent');
			recComponent.setFieldValue('altname', compName);
			recComponent.setFieldValue('custrecordr7psocompcustomer', customerId);
			//recComponent.setFieldValue('custrecordr7psocompsalesorder', salesOrderId);
			recComponent.setFieldValue('custrecordr7psocompparentjob', parentJobId);
			recComponent.setFieldValue('custrecordr7psocompengagement', engagementId);
			recComponent.setFieldValue('custrecordr7psocompduration', compDuration);
			recComponent.setFieldValue('custrecordr7psocomptype', compType);
			recComponent.setFieldValue('custrecordr7psocomppercentvsoeallocation', compPercent);
			recComponent.setFieldValue('custrecordr7psocompitemnumber', itemId);
			
		
			try {
				nlapiSubmitRecord(recComponent, null, true);
			} 
			catch (e) {
				nlapiLogExecution('ERROR', e.name, e.message);
			}
			
		}

}

function hasTravel(salesOrderId){
	
	try {
		if (salesOrderId != null && salesOrderId != '') {
			var arrSearchFilters = new Array();
			arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('internalid', null, 'anyof', salesOrderId);
			
			var arrSearchResults = nlapiSearchRecord('transaction', 13474, arrSearchFilters);
			
			if (arrSearchResults != null && arrSearchResults.length >= 1) {
				return true;
			}
		}
		
	} 
	catch (e) {
	
	}
	
	return false;
}

function myCustomSort(a, b){
	var compA = a.getId();
	var compB = b.getId();
	
	if (compA < compB) //sort string ascending
		return -1
	if (compA > compB) 
		return 1
	return 0 //default return value (no sorting)
}

function activateItem(itemId){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'is', itemId);
	
	var arrSearchResults = nlapiSearchRecord('item', null, arrSearchFilters, null);
	
	var itemType = arrSearchResults[0].getRecordType();
	
	try {
		nlapiSubmitField(itemType, itemId, 'isinactive', 'F');
	}
	catch (e){
		nlapiLogExecution('ERROR', 'Could not reactivate item : ' + e.name, itemId + ' : ' + e.message)
	}
	
}

function deactivateItem(itemId){

	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('internalid', null, 'is', itemId);
	
	var arrSearchResults = nlapiSearchRecord('item', null, arrSearchFilters, null);
	
	var itemType = arrSearchResults[0].getRecordType();
	
	try {
		nlapiSubmitField(itemType, itemId, 'isinactive', 'T');
	}
	catch (e){
		nlapiLogExecution('ERROR', 'Could not deactivate item : ' + e.name, itemId + ' : ' + e.message)	
	}
	
}

function getNewFieldValue(fieldId){
	// if the record is direct list edited or mass updated, run the script
	if (type == 'xedit') {
		// loop through the returned fields
		for (var i = 0; i < updatedFields.length; i++) {
			//nlapiLogExecution('DEBUG', 'field', updatedFields[i]);
			if (updatedFields[i] == fieldId) {
				return nlapiGetFieldValue(fieldId);
			}
		}
		return oldRecord.getFieldValue(fieldId);
	}
	else {
		return nlapiGetFieldValue(fieldId);
	}
}

function refreshComponents(engagementId){
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7psocompengagement', null, 'is', engagementId);

	var searchResult = nlapiSearchRecord('customrecordr7psocomponent', null, arrSearchFilters);
	
	for (var i=0; searchResult!= null && i < searchResult.length; i++){
		var compId = searchResult[i].getId();
		var recComponent = nlapiLoadRecord('customrecordr7psocomponent', compId);
		setComponentValues(recComponent);
	}
	
	refreshEngagement(engagementId);
}

function setComponentValues(record){

	var componentId = record.getId();
	var engagementId = record.getFieldValue('custrecordr7psocompengagement');
	var percentVSOE = record.getFieldValue('custrecordr7psocomppercentvsoeallocation');
	
	var vsoe = record.getFieldValue('custrecordr7psocompvsoeallocation');
	
	if (engagementId != '' && engagementId != null && percentVSOE != '' && percentVSOE != null) {
		var engagementVSOE = nlapiLookupField('customrecordr7psoengagement', engagementId, 'custrecordr7psoengtotalvalue');
		vsoe = (engagementVSOE == null || engagementVSOE == '' || engagementVSOE == 0) ? 0 : parseFloat(engagementVSOE) * (parseFloat(percentVSOE) / 100);
	}
	
	var dateDelivered = nlapiStringToDate(record.getFieldValue('custrecordr7psocompdatedelivered'));
	var dateRecognized = nlapiStringToDate(record.getFieldValue('custrecordr7psocompdaterecognized'));
	
	nlapiLogExecution('DEBUG', 'vsoe', vsoe);
	nlapiLogExecution('DEBUG', 'dateDelivered', dateDelivered);
	nlapiLogExecution('DEBUG', 'dateRecognized', dateRecognized);
	
	var scheduledValue = 0;
	var deliveredValue = 0;
	var recognizedValue = 0;
	var today = new Date();
	
	if (dateRecognized != null) {
		recognizedValue = vsoe;
	}
	else 
		if (dateDelivered != null) {
			if (dateDelivered >= today) {
				scheduledValue = vsoe;
			}
			if (dateDelivered < today) {
				deliveredValue = vsoe;
			}
		}
	
	var fields = new Array();
	fields[0] = 'custrecordr7psocompscheduledvalue';
	fields[1] = 'custrecordr7psocompdeliveredvalue';
	fields[2] = 'custrecordr7psocomprecognizedvalue';
	
	var values = new Array();
	values[0] = scheduledValue;
	values[1] = deliveredValue;
	values[2] = recognizedValue;

	nlapiSubmitField('customrecordr7psocomponent', componentId, fields, values);
}

function refreshEngagement(engagementId){

	var fields = new Array();
	fields[0] = 'custrecordr7psoengscheduledvalue';
	fields[1] = 'custrecordr7psoengdeliveredvalue';
	fields[2] = 'custrecordr7psoengrecognizedvalue';
	
	var scheduledValue = 0;
	var deliveredValue = 0;
	var recognizedValue = 0;
	
	var arrSearchFilters = new Array();
	arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7psocompengagement', null, 'is', engagementId);
	
	var arrSearchColumns = new Array();
	arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7psocompscheduledvalue', null, 'sum');
	arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7psocompdeliveredvalue', null, 'sum');
	arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7psocomprecognizedvalue', null, 'sum');
	arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7psocompengagement', null, 'group');
	
	var searchResult = nlapiSearchRecord('customrecordr7psocomponent', null, arrSearchFilters, arrSearchColumns);
	
	if (searchResult != null) {
		scheduledValue = searchResult[0].getValue(arrSearchColumns[0]);
		deliveredValue = searchResult[0].getValue(arrSearchColumns[1]);
		recognizedValue = searchResult[0].getValue(arrSearchColumns[2]);
		
	}
	
	var values = new Array();
	values[0] = scheduledValue;
	values[1] = deliveredValue;
	values[2] = recognizedValue;
	
	nlapiSubmitField('customrecordr7psoengagement', engagementId, fields, values);
}

function getRandomString(string_length){
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}