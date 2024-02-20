/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Mar 2020     Jeffrey Bajit
 *
 */

/******************************************************************************************************
 * 									BEGIN CONSTANT VARIABLES
 ******************************************************************************************************/

// Special Non-Inventory Items
var GD_PI_TAG_VOID = '66115';
var GD_PI_TAG_UNUSED = '66116';
var GD_PI_TAG_WIP = '66117';
var GD_PI_TAG_NPN = '66118';

/******************************************************************************************************
 * 									END CONSTANT VARIABLES
 ******************************************************************************************************/

/******************************************************************************************************
 * 									BEGIN USER EVENT SCRIPTS
 ******************************************************************************************************/

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord customrecordpit_physicalinventoryrecord
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */	
function GD_PI_CountBeforeLoad(type, form) {
	if (type != 'delete') {
		// disable the attach and new buttons for the sublist.
		var componentListTags = form.getSubList('recmachcustrecordgd_physinvtwrksht_physinvtcnt') || '';
		if (componentListTags != '') {	
			var attachButton = componentListTags.getButton('attach');
			if (attachButton != null)
				attachButton.setDisabled(true);
			
			var newButton = componentListTags.getButton('newrecrecmachcustrecordgd_physinvtwrksht_physinvtcnt');
			if (newButton != null)
				newButton.setDisabled(true);
		}
		
		// disable the attach and new buttons for the sublist.
		var componentListLocSeq = form.getSubList('recmachcustrecordgd_physinvtloctag_parent') || '';
		if (componentListLocSeq != '') {
			var attachButton = componentListLocSeq.getButton('attach');
			if (attachButton != null)
				attachButton.setDisabled(true);
			
			var newButton = componentListLocSeq.getButton('newrecrecmachcustrecordgd_physinvtloctag_parent');
			if (newButton != null)
				newButton.setDisabled(true);
			
			DisableButton(form, componentListLocSeq, 'newrec' + nlapiCreateRecord('customrecordgd_physinventloctags').getFieldValue('rectype'));
		}
		
		if (type == 'create') {
			var filters = new Array();
			filters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
			
			var cols = new Array();
			cols.push(new nlobjSearchColumn('internalid', null, 'max'));
			cols.push(new nlobjSearchColumn('custrecordgd_physinvtcount_date', null, 'group'));
			
			var searchResults = nlapiSearchRecord('customrecordgd_physicalinventorycount', null, filters, cols) || [];
			
			if (searchResults.length > 0) {
				// try to set the last inventory field if it exist.
				nlapiSetFieldValue('custrecordgd_physinvtcount_lastinventory', searchResults[0].getValue('internalid', null, 'max'));
				var field = nlapiGetField('custrecordgd_physinvtcount_lastinventory');
				field.setMandatory(true);
			}
		}
	}
}

function GD_PI_CountBeforeSubmit(type) {
	if (type == 'delete') {
		var subListType = 'recmachcustrecordgd_physinvtloctag_parent';
		var loopCount = nlapiGetLineItemCount(subListType);
		// If the main record is getting deleted, delete all sublist records first.
		for (var i = 1; i <= loopCount; i++) {
			nlapiDeleteRecord('customrecordgd_physinventloctags', nlapiGetLineItemValue(subListType, 'id', i));
		}
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord customrecordpit_physicalinventoryrecord
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function GD_PI_CountAfterSubmit(type) {

}

/******************************************************************************************************
 * 									END USER EVENT METHODS
 ******************************************************************************************************/

/******************************************************************************************************
 * 									BEGIN HELPER METHODS
 ******************************************************************************************************/



/**
 * Check if a value is a number.
 */
function isNumeric(n) {
	  return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Escape only if there exist a value
 * @param value
 * @returns
 */
function ConvertValueToString(value) {
	return (value || '' != '' ? nlapiEscapeXML(value) : '');
}

/**
 * If the second parameter is true and the value is empty, return an empty string otherwise return zero, if value exist then
 * return parseint of the value.
 * @param value
 * @param blankIfNull
 * @returns
 */
function ConvertValueToInt(value, blankIfNull) {
	return blankIfNull ? parseInt(value) || '' : parseInt(value) || 0;
}

function GetSearchResults(type, id, filter, cols, uniqueCol) {
	// initial values for internalid and uniqueColValue are -1
	// results is initially null
	return GetResults(type, id, filter, cols, -1, uniqueCol, null, -1, null);
}

// gets the results
// parameters:
// 	type: see above
// 	id: see above
// 	filter: see above
// 	cols: see above
// 	internalid: the last internal id of the results 
// 	uniqueCol: see above
// 	uniqueColValue: the last unique column value in the search. this prevents rows from being pulled in more than once
//  uniqueColJoin: this is the unique column join if the unique column is part of a join
// 	results: the results variable that gets passed on through
function GetResults(type, id, filter, cols, internalid, uniqueCol, uniqueColJoin, uniqueColValue, results) {
	var MAX_SEARCH_RESULTS_ROWS = 1000; // the max search results that can be returned via nlapiSearchRecord
	
	// add any existing filters
	var filters = new Array();
	if (filter != null) {
		// the filter may not be an array so there may not be a length
		if (filter.length != null) {
			for (var i=0; i<filter.length; i++) {
				filters[filters.length] = filter[i];
			}
		} else {
			filters[filters.length] = filter;
		}
	}
	
	filters[filters.length] = new nlobjSearchFilter('internalidnumber', null, 'greaterthanorequalto', internalid);
		
	
	var tempResults = nlapiSearchRecord(type, id, filters, cols);
	if (tempResults != null) {
		// if results is null, then just set results, otherwise it already has values so concat the unique results in
		if (results == null)
			results = GetUniqueResults(tempResults, internalid, uniqueCol, uniqueColJoin, uniqueColValue);
		else
			results = results.concat(GetUniqueResults(tempResults, internalid, uniqueCol, uniqueColJoin, uniqueColValue));
		
		// if the results returned is equal to the max search results that can be returned, then it is possible
		// that there are still results that need to be returned so recursively call the same method again
		if (tempResults.length == MAX_SEARCH_RESULTS_ROWS) {
			// get last internalid and unique column value (if unique column isn't null)
			var	lastInternalid = results[results.length-1].getId();
			if (lastInternalid == null) // The search must be grouped so we need to use the group internal id.
				var	lastInternalid = results[results.length-1].getValue('internalid', null, 'group');
			
			var lastUniqueColValue = null;
			if (uniqueCol != null)
				lastUniqueColValue = results[results.length-1].getValue(uniqueCol, uniqueColJoin);

			results = GetResults(type, id, filter, cols, lastInternalid, uniqueCol, uniqueColJoin, lastUniqueColValue, results);
		}
	}
	
	return results;	
}

// returns an array of unique results
// for example: if a transaction has two line items then its internalid is listed twice so we need another 
//				column to be unique and then we know the last values and can return only results that 
//				that are greater than them
// parameters:
// 	results: these are results passed in that need to be make unique
// 	internalid: this is the last internalid
// 	uniqueCol: this is the unique column to filter out by as well
//  uniqueColJoin: this is the unique column join if the unique column is part of a join
// 	uniqueColValue: this is the last unique column value
function GetUniqueResults(results, internalid, uniqueCol, uniqueColJoin, uniqueColValue) {
	var tempResults = new Array();
	for (var i=0; i<results.length; i++) {
		// if the unique col isn't null, then filter by the internalid and the unique column
		if (uniqueCol != null) {
			var resultsUniqueColConverted;
			var uniqueColConverted;
			// try and parse out the int
			// if that fails for one of the values, then compare strings
			if (IsNumeric(results[i].getValue(uniqueCol, uniqueColJoin)) == true && IsNumeric(uniqueColValue) == true) {
				// then parse them
				resultsUniqueColConverted = parseInt(results[i].getValue(uniqueCol, uniqueColJoin));
				uniqueColConverted = parseInt(uniqueColValue);
			} else {
				resultsUniqueColConverted = results[i].getValue(uniqueCol, uniqueColJoin).toString();
				uniqueColConverted = uniqueColValue.toString();
			}
			
			if (!(results[i].getId() == internalid && resultsUniqueColConverted <= uniqueColConverted)) {
				tempResults[tempResults.length] = results[i];
			}
		} else {
			// the unique column is null so the internalid is the only thing to filter by
			if (results[i].getId() != internalid) {
				tempResults[tempResults.length] = results[i];
			}
		}
	}
	return tempResults;
}

// special method that returns whether or not the given string is numeric
// it is not as simple as calling isNaN because if the string starts with a number (but then contains characters)
// isNaN will still return false. ie: 123EFG would be a number but EFG123 wouldn't... which is wrong
function IsNumeric(sText) {
	if (sText != null) {
		var ValidChars = "0123456789.";
		var IsNumber = true;
		var Char;		
		
		for (var i = 0; i < sText.length && IsNumber == true; i++) {
			Char = sText.charAt(i);
			// could be negative
			if (i==0 && Char == '-') {
				// do nothing
			} else if (ValidChars.indexOf(Char) == -1) {
				IsNumber = false;
			}
		}
		return IsNumber;
	}
	return false;
}


/**
 * Schedules a script. If there is no deployment set (null), then it will use the next available deployment.
 * If no deployment exists, then it will create a new deployment given the script internalId.
 * @param scriptId
 * @param deployId
 * @param params
 */
function ScheduleScript(scriptId, deployId, params) {
	// if the deployments are set, then use them
	if (deployId != null && deployId != '') {
		return nlapiScheduleScript(scriptId, deployId, params);
	} else {
		// try to deploy the script
		var status = nlapiScheduleScript(scriptId, null, params);
		
		// if the status of the script is not QUEUED, then automatically create a new deployment and deploy it
		if(status != 'QUEUED') {
			// do a search that looks up the internal id of the script where the script id is the one being passed in.
			var searchResults = nlapiSearchRecord('script', null, new nlobjSearchFilter('scriptid', null, 'is', scriptId), null);
			
			if (searchResults != null && searchResults.length > 0) {
				var initArray = new Array();
	            initArray['script'] = searchResults[0].getId();

	            var deployment = nlapiCreateRecord('scriptdeployment', initArray);
	            deployment.setFieldValue('isdeployed', 'T');
	            deployment.setFieldValue('title', 'Auto Deployment');	            
	            var newDeployId = nlapiSubmitRecord(deployment);
	            
	            // we need the deployment's script id (not the internalid), so look it up.
	            var newDeployment= nlapiLoadRecord('scriptdeployment', newDeployId);
                var newDeployScriptId = newDeployment.getFieldValue('scriptid');
                
	            return nlapiScheduleScript(scriptId, newDeployScriptId, params);
			} else {
				throw nlapiCreateError('CANNOTAUTOSCHEDULESCRIPT', 'Script ' + scriptId + ' cannot automatically be rescheduled because script cannot be found in a search.', false);
			}
		}
		return status;
	}
}

/******************************************************************************************************
 * 									END HELPER METHODS
 ******************************************************************************************************/