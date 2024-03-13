/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Mar 2013     mburstein
 *
 */
function searchNominationsRecords(){

	// Get the current Period from the Global Preference 'custscriptr7mooseawards_ss_currentperiod'
	var currentPeriod = context.getSetting('SCRIPT', 'custscriptr7mooseawards_ss_currentperiod');
	// Initialize object to house results in format we need to build galleria
	var objMooseNominations = new Object();
	
	var arrFilters = [ 
						[ 'isinactive', 'is', 'F' ], 'and',
	                	[ 'custrecordr7mooseawardsto.isinactive', 'is', 'F' ]
		   			  ];
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid'); // Nomination ID
	columns[1] = new nlobjSearchColumn('custrecordr7mooseawardsmoose'); // Moose ID
	// Add columns to grab the year and quarter created
	columns[2] = new nlobjSearchColumn('formulatext');
	columns[2].setFormula('to_char({created},\'YYYY-Q\')');
	columns[3] = new nlobjSearchColumn('formulatext');
	columns[3].setFormula('to_char({today},\'YYYY-Q\')');
	columns[4] = new nlobjSearchColumn('custrecordr7mooseawardspublishstatus'); // Status?
	columns[5] = new nlobjSearchColumn('firstname', 'custrecordr7mooseawardsto'); // To First
	columns[6] = new nlobjSearchColumn('lastname', 'custrecordr7mooseawardsto'); // To last
	columns[7] = new nlobjSearchColumn('firstname', 'custrecordr7mooseawardsfrom'); // From first
	columns[8] = new nlobjSearchColumn('lastname', 'custrecordr7mooseawardsfrom'); // From last
	columns[9] = new nlobjSearchColumn('custrecordr7mooseawardsreason'); // reason
	columns[10] = new nlobjSearchColumn('custrecordr7mooseawardstotalnominations'); // total nominations
	columns[11] = new nlobjSearchColumn('custrecordr7mooseawardsqrtlynominations'); // # nominations this quarter
	columns[12] = new nlobjSearchColumn('custrecordr7mooseawardstoimg'); // to Image
	columns[13] = new nlobjSearchColumn('custrecordr7mooseawardsmooseimg'); // Moose Image
	columns[14] = new nlobjSearchColumn('created');
	// Sort by date created
	columns[14].setSort(true);
	columns[15] = new nlobjSearchColumn('formulatext');
	// if created year and nominated quarter is equal to created year-quarter then true
	columns[15].setFormula('decode(to_char({created},\'YYYY\') ||\'-\'||{custrecordr7mooseawardsnominatedperiod}, to_char({today},\'YYYY\') ||\'-\'||' + currentPeriod + ', \'T\', \'F\')'); // Nominated Period is current period
	//initialize smiley url for blank employee photos
	var smileyId = 254288;
	var smileyUrl = getImgUrl(smileyId);
	
	var results = nlapiSearchRecord('customrecordr7mooseawards', null, arrFilters, columns);
	if (results != null) {
		for (var i = 0; i < results.length; i++) {
			var result = results[i];
			// Create a new object for each recId
			var recId = result.getValue(columns[0]);
			objMooseNominations[recId] = new Object();
			
			objMooseNominations[recId].mooseId = result.getValue(columns[1]);
			objMooseNominations[recId].mooseName = result.getText(columns[1]);
			// quarterCreated and currentQuarter are format YYYY-Q where Q is the quarter number (i.e. 1 = 1st quarter)
			objMooseNominations[recId].quarterCreated = result.getValue(columns[2]);
			objMooseNominations[recId].currentQuarter = result.getValue(columns[3]);
			objMooseNominations[recId].status = result.getValue(columns[4]);
			objMooseNominations[recId].toFirst = result.getValue(columns[5]);
			objMooseNominations[recId].toLast = result.getValue(columns[6]);
			objMooseNominations[recId].fromFirst = result.getValue(columns[7]);
			objMooseNominations[recId].fromLast = result.getValue(columns[8]);
			objMooseNominations[recId].reason = result.getValue(columns[9]);
			objMooseNominations[recId].totalNominations = result.getValue(columns[10]);
			objMooseNominations[recId].nominationsThisQuarter = result.getValue(columns[11]);
			var toImageUrl = result.getText(columns[12]);
			if (toImageUrl != null && toImageUrl != '') {
				objMooseNominations[recId].toImageUrl = 'https://system.netsuite.com' + escape(result.getText(columns[12]));
			}
			else {
				objMooseNominations[recId].toImageUrl = 'https://system.netsuite.com' + escape(smileyUrl);
			}
			objMooseNominations[recId].mooseImageUrl = result.getText(columns[13]);
			objMooseNominations[recId].isLastQuarter = result.getValue(columns[15]);
			//nlapiLogExecution('DEBUG','last Q?',objMooseNominations[recId].isLastQuarter);
		
			//nlapiLogExecution('DEBUG', 'recId:', recId);
		}
	}
	return objMooseNominations;
}

// Get Image Url from File in cabinet
function getImgUrl(imgId){
	var fileImg = nlapiLoadFile(imgId);
	var imageUrl = fileImg.getURL();
	return imageUrl;	
}

// Check to see if the submission is a duplicate, return true if it is duplicate
function isDuplicateSubmission(objMooseSubmission){
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter( 'custrecordr7mooseawardsto', null, 'is', objMooseSubmission.toId); // To = toId
	filters[filters.length] = new nlobjSearchFilter( 'custrecordr7mooseawardsfrom', null, 'is', objMooseSubmission.fromId); // To = fromId
	filters[filters.length] = new nlobjSearchFilter( 'custrecordr7mooseawardsmoose', null, 'is', objMooseSubmission.mooseId); // To = mooseId
	filters[filters.length] = new nlobjSearchFilter( 'custrecordr7mooseawardsreason', null, 'is', objMooseSubmission.reason); // To = reason
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid', null, null);
	
	var results = nlapiSearchRecord('customrecordr7mooseawards', null, filters, columns);
	if (results != null) {
		return true;
	}
	else{
		return false;
	}
}
