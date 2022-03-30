/**
 * Scheduled Script that will run through list of contact in the system the meets filters and update 
 * custentitypi_status field based on linked Parent status.
 * - value of custentitypi_status does not match entity status of Parent customer record
 * - is NOT inactive
 */

var exitCount = 1000;
var ctx = nlapiGetContext();
var LAST_PROC_PARAM = 'custscript_last_proc_syncct_id';
var lastProcessedContactId = '';

//Company level preference to track sales rep changes
var trackSalesRepChanges = nlapiGetContext().getSetting('SCRIPT','custscript_tracksalsrepupd');

function syncCustomerStatusOnContact() {
	
	//get any script parameter
	lastProcessedContactId = ctx.getSetting('SCRIPT',LAST_PROC_PARAM);
	
	//define search
	var flt = [new nlobjSearchFilter('isinactive',null,'is','F'),
	           new nlobjSearchFilter('company', null,'noneof','@NONE@'),
	           new nlobjSearchFilter('type','parent','anyof','CustJob'),
	           //Adding Last Modified within THIS month filter to speed up processing
	           new nlobjSearchFilter('lastmodifieddate', null, 'within', 'thismonth')];
	//only process those contact records with mismatching value
	//formula builds parent entity status text value and compares it against pi_status. ONly process those with value of 1
	var compformulatext = "case when UPPER({parentcustomer.stage})||'-'||{parentcustomer.entitystatus} = {custentitypi_status} then 0 else 1 end";
	var formFltObj = new nlobjSearchFilter('formulanumeric', null, 'equalto',1).setFormula(compformulatext);;
	flt.push(formFltObj);
	
	//besure to return the results ordered by Internalid in descending order
	var col = [new nlobjSearchColumn('internalid').setSort(true),
	           new nlobjSearchColumn('company'),
	           new nlobjSearchColumn('type','parent'),
	           new nlobjSearchColumn('custentitypi_salesrep_upddate')]; 
	
	//check to see if last processed id is present.
	if (lastProcessedContactId) {
		//this insures that if and when script is rescheduled, it ONLY returns unprocessed contact IDs
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan',lastProcessedContactId));
	}
	
	//newStatusText = nlapiLookupField(nlapiGetRecordType(), nlapiGetRecordId(), monitorField, true);
	var crs = nlapiSearchRecord('contact',null,flt,col);
	//process update on contact record
	for (var i=0; crs && i < crs.length; i++) {
		
		log('debug','running index '+i, crs[i].getValue('internalid'));
		
		var newStatusText = '';
		try {
			newStatusText = nlapiLookupField('customer', crs[i].getValue('company'), 'entitystatus', true);
			
			if (newStatusText) {
				nlapiSubmitField('contact',crs[i].getValue('internalid'), 'custentitypi_status', newStatusText);
			} else {
				log('error','Customer Status is Blank','Parent Status Update on Contact ('+crs[i].getValue('internalid')+') Failed '+
													   'due to blank parent customer ('+crs[i].getValue('company')+') entity status.');
			}
			
			//track change date
			if (trackSalesRepChanges=='T') {
			
				//CUSTJOB.KEMPLOYEE
				//Search for system log on client to see if we need to set Sales Rep change date.
				var sflt = [new nlobjSearchFilter('internalid', null, 'anyof', crs[i].getValue('company')), 
				            new nlobjSearchFilter('field','systemnotes','anyof','CUSTJOB.KEMPLOYEE'),
				            new nlobjSearchFilter('type','systemnotes','is','F')];
				var scol = [new nlobjSearchColumn('date','systemNotes').setSort(true)];
				var srs = nlapiSearchRecord('customer', null, sflt, scol);
				if (srs && srs.length > 0) {
					//Since result is ordered in change DESC. set the date of change to field.
					nlapiSubmitField('contact',crs[i].getValue('internalid'), 'custentitypi_salesrep_upddate', nlapiDateToString(nlapiStringToDate(srs[0].getValue('date','systemnotes'),'datetimetz'),'datetimetz'));
				}
				
			}
			
		} catch (parentstatupderr) {
			log('error','Parent Status Update Failed','Parent Status Update on Contact ('+crs[i].getValue('internalid')+') Failed '+
													  getErrText(parentstatupderr));
		}
		
		//check to see if we need to lookup for more results ONLY if result set is 1000 and it's at Last result row
		//Search Record returns maximum of 1000 records
		var lookupMore = false;
		if (crs.length == 1000 && (i+1)==1000) {
			log('debug','lookup more','running');
			try {
				//define search
				var mflt = [new nlobjSearchFilter('isinactive',null,'is','F'),
				            new nlobjSearchFilter('company', null,'noneof','@NONE@'),
				            new nlobjSearchFilter('type','parent','anyof','CustJob')];
				
				var mformFltObj = new nlobjSearchFilter('formulanumeric', null, 'equalto',1).setFormula(compformulatext);
				mflt.push(mformFltObj);
				mflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan',crs[i].getValue('internalid')));
				
				var mcol = [new nlobjSearchColumn('internalid')]; 
				
				var mcrs = nlapiSearchRecord('contact',null,mflt,mcol);
				
				if (mcrs && mcrs.length > 0) {
					lookupMore = true;
				}
				
			} catch (moreerr) {
				//if lookup more caused error, set it to true so that it reschedule itself to check again
				lookupMore = true;
			}
		}
		
		//reschedule logic
		//lookup more OR running out of usage meter
		if (lookupMore || (ctx.getRemainingUsage() <= exitCount && (i+1) < crs.length)) {
			var param = new Array();
			param[LAST_PROC_PARAM] = crs[i].getValue('internalid');
			
			var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
			if (schStatus=='QUEUED') {
				log('debug','Script Rescheduled','Last Processed Contact ID: '+crs[i].getValue('internalid'));
				break;
			}
		}	
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

function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
	var jsrs = new RegExp(_searchChar, "g");
	
	return _fullString.replace(jsrs,_replaceChar);
}

function log(_type, _title, _msg) {
	nlapiLogExecution(_type, _title, _msg);
}
