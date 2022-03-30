/**
 * Scheduled Script that will run through list of ALL active contact in the system and update 
 * custentitypi_status field based on linked Parent status.
 * Script will skip if the values are identical
 */

var SCT_EXIT_LEVEL = 1000;
var ctx = nlapiGetContext();
var LAST_PROC_PARAM = 'custscript_last_proc_contact_id';
var lastProcessedContactId = '';

//Company level preference to track sales rep changes
var trackSalesRepChanges = nlapiGetContext().getSetting('SCRIPT','custscript_tracksalsrepupd');

var counter = 1;
var rsltSet = null;

function massUpdateCustomerStatusOnContact() {
	
	//get any script parameter
	lastProcessedContactId = ctx.getSetting('SCRIPT',LAST_PROC_PARAM);
	
	//define search
	var flt = [new nlobjSearchFilter('isinactive',null,'is','F'),
	           new nlobjSearchFilter('company', null,'noneof','@NONE@'),
	           new nlobjSearchFilter('type','parent','anyof','CustJob')];
	//besure to return the results ordered by Internalid in descending order
	var col = [new nlobjSearchColumn('internalid').setSort(true),
	           new nlobjSearchColumn('company'),
	           new nlobjSearchColumn('custentitypi_status'),
	           new nlobjSearchColumn('type','parent'),
	           new nlobjSearchColumn('custentitypi_salesrep_upddate')]; 
	
	//check to see if last processed id is present.
	if (lastProcessedContactId) {
		//this insures that if and when script is rescheduled, it ONLY returns unprocessed contact IDs
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan',lastProcessedContactId));
	}
	
	//using create search to get more than 1000 results
	rsltSet = nlapiCreateSearch('contact',flt,col).runSearch();
	
	rsltSet.forEachResult(processResultRow);
	
}

function processResultRow(row) {
	
	try {
		var contactStatus = row.getValue('custentitypi_status');
		
		//this somewhat gurantees that Script will run through all the list spending atleast 10 governance points. 
		//For script like this, it needs to go through ALL Contact list
		var parentRec = nlapiLoadRecord('customer', row.getValue('company'));
		var parentStatus = parentRec.getFieldText('entitystatus');
		
		nlapiLogExecution('debug','contact status // parent status', contactStatus + ' // ' + parentStatus);
		
		//track change date
		if (trackSalesRepChanges=='T') {
		
			//CUSTJOB.KEMPLOYEE
			//Search for system log on client to see if we need to set Sales Rep change date.
			var sflt = [new nlobjSearchFilter('internalid', null, 'anyof', row.getValue('company')), 
			            new nlobjSearchFilter('field','systemnotes','anyof','CUSTJOB.KEMPLOYEE'),
			            new nlobjSearchFilter('type','systemnotes','is','F')];
			var scol = [new nlobjSearchColumn('date','systemNotes').setSort(true)];
			var srs = nlapiSearchRecord('customer', null, sflt, scol);
			if (srs && srs.length > 0) {
				//Since result is ordered in change DESC. set the date of change to field.
				nlapiLogExecution('debug','setting rep date: contact // date',row.getValue('internalid')+' // '+srs[0].getValue('date','systemnotes'));
				nlapiSubmitField('contact',row.getValue('internalid'), 'custentitypi_salesrep_upddate', nlapiDateToString(nlapiStringToDate(srs[0].getValue('date','systemnotes'),'datetimetz'),'datetimetz'));
			}
			
		}
		
		if (contactStatus != parentStatus) {
			nlapiSubmitField('contact',row.getValue('internalid'), 'custentitypi_status', parentStatus);
		}

		//check to see if we are running out of governance
		if (ctx.getRemainingUsage() <= SCT_EXIT_LEVEL &&  rsltSet.getResults(counter, (counter+2)).length > 0) {
			nlapiLogExecution('debug','Running low on goverance','Need to Reschedule');
			
			var param = new Array();
			param[LAST_PROC_PARAM] = row.getValue('internalid');
			var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
			if (schStatus == 'QUEUED') {
				return false;
			}
		}
		
		counter++;
		
		return true; //continue iterating through ResultSet
	} catch (e) {
		//throw custom exception and stop processing
		throw nlapiCreateError('CNT00001-Error Processing Contact','Error occured while processing Contact Internal ID: '+row.getValue('internalid')+' [Parent Type: '+row.getValue('type','parent')+'] // '+getErrText(e));
		
		return false;
	}
	
}

/**
 * Translates Error into standarized text.
 * @param {Object} _e
 */
function getErrText(_e) {
	var txt='';
	if (_e instanceof nlobjError) {
		//this is netsuite specific error
		txt = 'NLAPI Error: '+_e.getCode()+' :: '+_e.getDetails();
	} else {
		//this is generic javascript error
		txt = 'JavaScript/Other Error: '+_e.toString();
	}
	
	txt = strGlobalReplace(txt, "\r", " || ");
	txt = strGlobalReplace(txt,"\n", " || ");
	
	return txt;
}

/**
 * Helper function to GLOBALLY search and replace char or word with provided char or word
 * @param _fullString - Original String Value
 * @param _searchChar - Char or Word to search for
 * @param _replaceChar - Char or Word to replace with.
 * @returns
 */
function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
	var jsrs = new RegExp(_searchChar, "g");
	
	return _fullString.replace(jsrs,_replaceChar);
}
