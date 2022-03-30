/**
 * Scheduled Script that will run through list of contact of customer who had their Sales Rep changed. 
 * Script is to be scheduled to run every 30 minutes.
 * 	Search will return list of all customer company records that had their Sales Rep value changed CURRENT DAY
 * 
 * !Script will SIMPLY exit out if Track Sales Rep Update is NOT Checked on the Company Preference section
 * 
 */

var exitCount = 1000;
var ctx = nlapiGetContext();
var LAST_PROC_PARAM = 'custscript_last_proc_syncctsrep_id';
var lastProcessedCustomerId = '';

//Company level preference to track sales rep changes
var trackSalesRepChanges = nlapiGetContext().getSetting('SCRIPT','custscript_tracksalsrepupd');

function syncCustomerSalesRepModOnContact() {
	
	if (trackSalesRepChanges != 'T') {
		return;
	}
	
	//get any script parameter
	lastProcessedCustomerId = ctx.getSetting('SCRIPT',LAST_PROC_PARAM);
	
	//define search
	var flt = [new nlobjSearchFilter('isinactive',null,'is','F'),
	           new nlobjSearchFilter('field', 'systemnotes','anyof','CUSTJOB.KEMPLOYEE'),
	           new nlobjSearchFilter('date','systemnotes','within','today')];
	
	//besure to return the results ordered by Internalid in descending order
	var col = [new nlobjSearchColumn('internalid',null,'group').setSort(true),
	           new nlobjSearchColumn('date','systemNotes','max')]; 
	
	//check to see if last processed id is present.
	if (lastProcessedCustomerId) {
		//this insures that if and when script is rescheduled, it ONLY returns unprocessed Customer IDs
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan',lastProcessedCustomerId));
	}
	
	var crs = nlapiSearchRecord('customer',null,flt,col);
	//process each customer
	for (var i=0; crs && i < crs.length; i++) {
		log('debug','processing customer id '+crs[i].getValue('internalid',null,'group')+' // change date of '+crs[i].getValue('date','systemNotes','max'));
		
		try {
			
			//look for all contacts with THIS customer as primary company that doesn't match sales rep update date
			var ctflt = [new nlobjSearchFilter('company',null,'anyof',crs[i].getValue('internalid',null,'group')),
			             new nlobjSearchFilter('isinactive',null,'is','F')];
			var ctcol = [new nlobjSearchColumn('custentitypi_salesrep_upddate')];
			var ctrs = nlapiSearchRecord('contact', null, ctflt, ctcol);
			
			for (var c=0; ctrs && c < ctrs.length; c++) {
				var customerDateTimeTz = nlapiDateToString(nlapiStringToDate(crs[i].getValue('date','systemNotes','max'),'datetimetz'),'datetimetz');
				var contactDateTimeTz =  (ctrs[c].getValue('custentitypi_salesrep_upddate')?nlapiDateToString(nlapiStringToDate(ctrs[c].getValue('custentitypi_salesrep_upddate')),'datetimetz'):'');
				
				log('debug','----- Check Date contact '+ctrs[c].getId(),'contact val: '+contactDateTimeTz+' // customer val: '+customerDateTimeTz);
				
				if (customerDateTimeTz != contactDateTimeTz) {
					log('debug','------ Fire Update','Fire update');
					nlapiSubmitField('contact', ctrs[c].getId(), 'custentitypi_salesrep_upddate', customerDateTimeTz, false);
				}				
			}
			
		} catch (parentstatupderr) {
			log('error','Sales Rep Sync Failed','Sales Rep Sync on Contact ('+crs[i].getValue('internalid',null,'group')+') Failed '+
													  getErrText(parentstatupderr));
		}
		
		
		//reschedule logic
		//lookup more OR running out of usage meter
		if (crs.length == 1000 && (i+1)==1000 || (ctx.getRemainingUsage() <= exitCount && (i+1) < crs.length)) {
			var param = new Array();
			param[LAST_PROC_PARAM] = crs[i].getValue('internalid',null,'group');
			
			var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
			if (schStatus=='QUEUED') {
				log('debug','Script Rescheduled','Last Processed Contact ID: '+crs[i].getValue('internalid',null,'group'));
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
