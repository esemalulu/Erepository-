/*
 * @author mburstein
 */
function searchRockstarRecords(){
	
	// Initialize object to house results in format we need to build galleria
	var objRockstars = new Object();
	//initialize smiley url for blank employee photos
	var smileyId = 254288;
	var smileyUrl = getImgUrl(smileyId);
	
	var arrFilters = [ 
						[ 'custrecordr7rockstarapproved', 'is', 'T' ], 'and',
						[ 'isinactive', 'is', 'F' ], 'and',
	                	[ 'custrecordr7rockstarto.isinactive', 'is', 'F' ]
		   			  ];
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('firstname','custrecordr7rockstarfrom');
	arrColumns[1] = new nlobjSearchColumn('lastname','custrecordr7rockstarfrom');
	arrColumns[2] = new nlobjSearchColumn('firstname','custrecordr7rockstarto');
	arrColumns[3] = new nlobjSearchColumn('lastname','custrecordr7rockstarto');
	arrColumns[4] = new nlobjSearchColumn('custrecordr7rockstarcomments');
	arrColumns[5] = new nlobjSearchColumn('custrecordr7rockstartoimage');
	arrColumns[6] = new nlobjSearchColumn('created').setSort(true);

	var newSearch = nlapiCreateSearch('customrecordr7rockstar');
	newSearch.setFilterExpression(arrFilters);
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();

	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 100);
		for ( var rs in resultSlice) {
			var result = resultSlice[rs];
			var recId = result.getId();
			// Get the employee photo, or use smiley photo if it doesn't exist
			var toImageUrl = result.getText(arrColumns[5]);
			var toImage = '';
			if (toImageUrl != null && toImageUrl != '') {
				toImage = 'https://system.netsuite.com'+escape(toImageUrl);
			}
			else {
				toImage = 'https://system.netsuite.com'+escape(smileyUrl);
			}	
			// Create a new object for each recId
			objRockstars[recId] = {
				fromFirst : result.getValue(arrColumns[0]),
				fromLast : result.getValue(arrColumns[1]),
				toFirst : result.getValue(arrColumns[2]),
				toLast : result.getValue(arrColumns[3]),
				comments : result.getValue(arrColumns[4]),
				toImage : toImage,
			};		
			rowNum++;
		}
	} while (resultSlice.length >= 1000);
		
	return objRockstars;
}

// Get Image Url from File in cabinet
function getImgUrl(imgId){
	var fileImg = nlapiLoadFile(imgId);
	var imageUrl = fileImg.getURL();
	return imageUrl;	
}

// Check to see if the submission is a duplicate, return true if it is duplicate
function isDuplicateSubmission(objRockstarSubmission){
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter( 'custrecordr7rockstarto', null, 'is', objRockstarSubmission.toId);
	filters[filters.length] = new nlobjSearchFilter( 'custrecordr7rockstarfrom', null, 'is', objRockstarSubmission.fromId);
	filters[filters.length] = new nlobjSearchFilter( 'custrecordr7rockstarfromdepartment', null, 'is', objRockstarSubmission.fromDepartment);
	filters[filters.length] = new nlobjSearchFilter( 'custrecordr7rockstarcomments', null, 'is', objRockstarSubmission.comments);
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid', null, null);
	
	var results = nlapiSearchRecord('customrecordr7rockstar', null, filters, columns);
	if (results != null) {
		return true;
	}
	else{
		return false;
	}
}
