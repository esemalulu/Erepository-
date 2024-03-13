/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       17 Dec 2013     mburstein
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function inactivateRockstarMoose(type) {
	var arrRockstarRecIds = searchInactiveRockstars();
	for (rockstar in arrRockstarRecIds) {
		updateRockstar(arrRockstarRecIds[rockstar]);
	}
	var arrMooseRecIds = searchInactiveMoose();
	for (moose in arrMooseRecIds) {
		updateMoose(arrMooseRecIds[moose]);
	}
}

function searchInactiveRockstars(){
	var arrRockstarRecIds = new Array();
	
	var arrFilters = [ 
						[ 'isinactive', 'is', 'F' ], 'and',
	                	[ 'custrecordr7rockstarto.isinactive', 'is', 'T' ]
		   			  ];

	var newSearch = nlapiCreateSearch('customrecordr7rockstar');
	newSearch.setFilterExpression(arrFilters);
	var resultSet = newSearch.runSearch();

	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 100);
		for ( var rs in resultSlice) {
			var result = resultSlice[rs];
			var recId = result.getId();
			arrRockstarRecIds[arrRockstarRecIds.length] = recId;	
			rowNum++;
		}
	} while (resultSlice.length >= 1000);
		
	return arrRockstarRecIds;
}

function searchInactiveMoose(){
	var arrMooseRecIds = new Array();
	
	var arrFilters = [ 
						[ 'isinactive', 'is', 'F' ], 'and',
	                	[ 'custrecordr7mooseawardsto.isinactive', 'is', 'T' ]
		   			  ];

	var newSearch = nlapiCreateSearch('customrecordr7mooseawards');
	newSearch.setFilterExpression(arrFilters);
	var resultSet = newSearch.runSearch();

	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 100);
		for ( var rs in resultSlice) {
			var result = resultSlice[rs];
			var recId = result.getId();
			arrMooseRecIds[arrMooseRecIds.length] = recId;	
			rowNum++;
		}
	} while (resultSlice.length >= 1000);
		
	return arrMooseRecIds;
}

function updateRockstar(recId){
	try{
		var rec = nlapiLoadRecord('customrecordr7rockstar',recId);
		rec.setFieldValue('isinactive','T');
		//nlapiSubmitRecord(rec);		
	}
	catch(e){
		nlapiLogExecution('ERROR','ERROR inactivating rockstar recId '+recId,e);
	}
}

function updateMoose(recId){
	try{
		var rec = nlapiLoadRecord('customrecordr7mooseawards',recId);
		rec.setFieldValue('isinactive','T');
		//nlapiSubmitRecord(rec);		
	}
	catch(e){
		nlapiLogExecution('ERROR','ERROR inactivating moose recId '+recId,e);
	}
}

