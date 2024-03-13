/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       14 Mar 2013     mburstein
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function beforeLoad(type, form, request){
 
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function beforeSubmit(type){	
	if(type == 'create'){
		try {
			var context = nlapiGetContext();
			// Current period is grabbed from the company preference custscriptr7mooseawards_ss_currentperiod
			var currentPeriod = context.getSetting('SCRIPT','custscriptr7mooseawards_ss_currentperiod');
			// Set nominated period, current period, status
			nlapiSetFieldValue('custrecordr7mooseawardsnominatedperiod',currentPeriod);
			nlapiSetFieldValue('custrecordr7mooseawardscurrentperiod',currentPeriod);
			nlapiSetFieldValue('custrecordr7mooseawardspublishstatus',1); // New Nomination
		}
		catch(e){
			nlapiSendEmail(340932,340932,'ERROR MOOSE BEFORE SUBMIT',e);
		}	
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function afterSubmit(type){
  
  	// Update Total # of Nominations 
	/*
	 * Exclude xedit since Moose Awards Update Workflow Action will submitfield changes as direct list edits for all records
	 */
	if (type != 'delete' && type != 'xedit') {
		
		var toId = nlapiGetFieldValue('custrecordr7mooseawardsto');
		if (toId != null && toId != '') {
			nlapiLogExecution('DEBUG', "---Begin Nominations Update!  toId: " + toId);
			var arrMooseNominations = countNominations(toId);
			nlapiLogExecution('DEBUG', " All Nomination Records for ID "+toId+": " + arrMooseNominations.arrRecIds.toString());
			nlapiLogExecution('DEBUG', " Total nominations: " + arrMooseNominations.nominationsTotalCount);
			nlapiLogExecution('DEBUG', " Nominations this quarter: " + arrMooseNominations.quarterNominationsCount);
			nlapiLogExecution('DEBUG', " Moose Nominated for: " + arrMooseNominations.arrMooseIds.toString());
			
			// Update Moose Award Nomination records
			try {
				var arrSubmittedIds = updateNominations(arrMooseNominations);
				if (arrSubmittedIds != null) {
					nlapiLogExecution('DEBUG', "---All Done!-- Submitted IDs: " + arrSubmittedIds.toString());
				}
			} 
			catch (e) {
				nlapiLogExecution('DEBUG', " error: " + e);
			}
		}
	}
}

function countNominations(toId){
	
	// arrRecIds array will hold all nomination IDs
	var arrRecIds = new Array();
	/*
	 * arrMooseIds will hold all awards that employee has been nominated for
	 * Use this later to populate Moose nominated for
	 */ 
	var arrMooseIds = new Array();
	/*
	 * arrQuarterNominations will hold only arrRecIds which created date is this quarter
	 * Use this later to populate # nominations this quarter
	 */ 
	var arrQuarterNominations = new Array();
	 // arrMooseNominations object will store pertinent result data
	var arrMooseNominations = new Object();

	var filters = new Array();
	filters[0] = new nlobjSearchFilter( 'custrecordr7mooseawardsto', null, 'is', toId); // To = toId
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid', null, null);
	columns[1] = new nlobjSearchColumn('custrecordr7mooseawardsmoose', null, null); // Moose ID, use to be department
	columns[2] = new nlobjSearchColumn('custrecordr7mooseawardspublishstatus', null, null); // Status
	columns[3] = new nlobjSearchColumn('custrecordr7mooseawardsnominatedperiod', null, null); // Nominated Period
	columns[4] = new nlobjSearchColumn('custrecordr7mooseawardscurrentperiod', null, null); // Current Period
	columns[5] = new nlobjSearchColumn('formulatext');
	columns[5].setFormula('decode(to_char({created},\'YYYY\') ||\'-\'||{custrecordr7mooseawardsnominatedperiod}, to_char({today},\'YYYY\') ||\'-\'||{custrecordr7mooseawardscurrentperiod}, \'T\', \'F\')'); // Nominated Period is current period
	
	var results = nlapiSearchRecord('customrecordr7mooseawards', null, filters, columns);
	if (results != null) {
		for (var i = 0; i < results.length; i++) {
			var result = results[i];
			
			var recId = result.getValue(columns[0]);
			var mooseId = result.getValue(columns[1]);
			//var status = result.getValue(columns[2]);
			// quarterNominated and currentPeriod are format YYYY-Q where Q is the quarter number (i.e. 1 = 1st quarter)
			//var quarterNominated = result.getValue(columns[3]);
			//var currentPeriod = result.getValue(columns[4]);
			var isThisPeriod = result.getValue(columns[5]);
			
			arrRecIds.push(recId);
			// add Moose Id to the array if it isn't already there	
			if (arrMooseIds.indexOf(mooseId) == -1){
				arrMooseIds.push(mooseId);
			}
			
			// if nomination was created this quarter then push to arrQuarterNominations
			if(isThisPeriod == 'T'){
				arrQuarterNominations.push(recId);
			}
		}	
	
	// Add arrays to Object
	arrMooseNominations.arrRecIds = arrRecIds;
	arrMooseNominations.arrMooseIds = arrMooseIds;
	arrMooseNominations.quarterNominationsCount = arrQuarterNominations.length;
	arrMooseNominations.nominationsTotalCount = results.length;
	}
	return arrMooseNominations;
}

function updateNominations(arrMooseNominations){
	nlapiLogExecution('DEBUG',arrMooseNominations.arrRecIds.toString());
	if (arrMooseNominations.arrRecIds != null) {
		var arrSubmittedIds = new Array();
		// Loop through record Ids and add values
		for (var i = 0; i < arrMooseNominations.arrRecIds.length; i++) {
			var recId = arrMooseNominations.arrRecIds[i];
			//nlapiLogExecution('DEBUG',recId);
			var recNomination = nlapiLoadRecord('customrecordr7mooseawards',recId);
			recNomination.setFieldValues('custrecordr7mooseawardsnominatedfor', arrMooseNominations.arrMooseIds);
			recNomination.setFieldValue('custrecordr7mooseawardstotalnominations', arrMooseNominations.nominationsTotalCount);
			recNomination.setFieldValue('custrecordr7mooseawardsqrtlynominations', arrMooseNominations.quarterNominationsCount);
			recNomination.setFieldValue('custrecordr7mooseawardsnominatedquarter',recNomination.getFieldValue('custrecordr7mooseawardscurrentperiod'));
			var submitId = nlapiSubmitRecord(recNomination, false);
			arrSubmittedIds.push(submitId);
			nlapiLogExecution('DEBUG', " Moose Nomination " + submitId + " updated with NominationCount / QuarterNominationCount / MooseNominatedFor: ",arrMooseNominations.nominationsTotalCount +' / '+ arrMooseNominations.quarterNominationsCount +' / '+ arrMooseNominations.arrMooseIds);
		}
		return arrSubmittedIds;
	}
}



/*
 * This function is no longer used to get current period
 * 
function getCurrentPeriod(){
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid'); // ID
	columns[0].setSort(true);
	columns[1] = new nlobjSearchColumn('custrecordr7mooseawardscurrentperiod'); // Current Period
	var results = nlapiSearchRecord('customrecordr7mooseawards', null, null, columns);
	for (var i = 0; results != null && i < results.length; i++) {
		var result = results[i];
		var currentPeriod = result.getValue(columns[1]);
		if(currentPeriod != null && currentPeriod != ''){
			return currentPeriod;
			break;
		}	
	}
}*/
