/*
 * @author mburstein
 */

function afterSubmit(type){
	
	// Check if approved
	var checkApproved = nlapiGetFieldValue('custrecordr7rockstarapproved');
	if (checkApproved !='F' && type != 'delete') {
		
		var toId = nlapiGetFieldValue('custrecordr7rockstarto');
		if (toId != null && toId != '') {
			var rockstarInfo = countPicks(toId);
			
			// Update collected pick colors multi-select and total pick count
			try {
				var submittedIds = updateRockstar(rockstarInfo);
			} 
			catch (e) {
				nlapiLogExecution('ERROR', " error: " + e);
			}
		}
	}
}

function countPicks(toId){
	// Set up arrays to pass over
	var recIds = new Array();
	var fromDepartment = new Array();
	var pickColor = new Array();
	var rockstarInfo = new Object();

	var filters = new Array();
	filters[0] = new nlobjSearchFilter( 'custrecordr7rockstarto', null, 'is', toId); // To = toId
	filters[1] = new nlobjSearchFilter( 'custrecordr7rockstarapproved', null, 'is', 'T'); // Approved is true
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid', null, null);
	columns[1] = new nlobjSearchColumn('custrecordr7rockstarfromdepartment', null, null);
	columns[2] = new nlobjSearchColumn('custrecordr7rockstarpickcolor', null, null);
	
	var results = nlapiSearchRecord('customrecordr7rockstar', null, filters, columns);
	if (results != null) {
		for (var p = 0; p < results.length; p++) {
			var result = results[p];
			recIds.push(result.getValue(columns[0]));
			// add Department Id to the array if it isn't already there	
			var departmentId = result.getValue(columns[1]);
			if (fromDepartment.indexOf(departmentId) == -1){
				fromDepartment.push(departmentId);
			}
			// add Color Id to the array if it isn't already there	
			var colorId = result.getValue(columns[2]);
			if (pickColor.indexOf(colorId) == -1) {
				pickColor.push(colorId);
			}
			//nlapiLogExecution('DEBUG', 'recId:', recId);
		}	
	
	// Add arrays to Object
	rockstarInfo.recIds = recIds;
	rockstarInfo.fromDepartment = fromDepartment;
	rockstarInfo.pickColor = pickColor;
	rockstarInfo.pickTotal = results.length;
	}
	return rockstarInfo;
}

function updateRockstar(rockstarInfo){
	if (rockstarInfo.recIds != null) {
		var submittedIds = new Array();
		nlapiLogExecution('DEBUG'," rec Ids: "+rockstarInfo.recIds);
		// Loop through record Ids and add values
		for (var r=0; r < rockstarInfo.recIds.length; r++){
			var recRockstar = nlapiLoadRecord('customrecordr7rockstar',rockstarInfo.recIds[r]);
			recRockstar.setFieldValues('custrecordcustrecordr7rockstarcollected', rockstarInfo.pickColor);
			recRockstar.setFieldValue('custrecordcustrecordr7rockstarpicktotal', rockstarInfo.pickTotal);
			//nlapiLogExecution('DEBUG'," r: "+r);	
			var submitId = nlapiSubmitRecord(recRockstar, false);
			submittedIds.push(submitId);
			nlapiLogExecution('DEBUG'," Rockstar "+submitId+" updated with pick color IDs: "+rockstarInfo.pickColor);	
		}
		return submittedIds;
	}
}