
var ctx = nlapiGetContext();
var customerId = ctx.getSetting('SCRIPT', 'custscript_customerid');
var lastProcId = ctx.getSetting('SCRIPT','custscript_ctr_lastproc_ctid');
var statusTxt = ctx.getSetting('SCRIPT','custscript_new_status');
var stageTxt = ctx.getSetting('SCRIPT','custscript_new_stage');

var salesRepUpdDatetime = ctx.getSetting('SCRIPT','custscript_newsrupd_datetime');
//Company level preference to track sales rep changes
var trackSalesRepChanges = ctx.getSetting('SCRIPT','custscript_tracksalsrepupd');

var exitCount = 2000;

function updateCustomerStatusOnContact() {
	
	log('debug','custid // status // stage', customerId+' // '+statusTxt+' // '+stageTxt);
	
	if (customerId && statusTxt) {
		//search for all contacts who's parent is THIS customer
		var flt = [new nlobjSearchFilter('company',null,'anyof',customerId),
		           new nlobjSearchFilter('isinactive',null,'is','F')];
		if (lastProcId && !isNaN(lastProcId)) {
			flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', lastProcId));
		}
		
		var col = [new nlobjSearchColumn('internalid').setSort(true)];
		
		var ctrslt = nlapiSearchRecord('contact', null, flt, col);
		for (var i=0; ctrslt && i < ctrslt.length; i++) {
			log('debug','contact id',ctrslt[i].getValue('internalid'));
			
			var fldupds = ['custentitypi_status'];
			var valupds = [statusTxt];
			
			//if sales rep date/time is available and client turned on sales rep tracking, update it.
			if (trackSalesRepChanges=='T' && salesRepUpdDatetime) {
				fldupds.push('custentitypi_salesrep_upddate');
				valupds.push(salesRepUpdDatetime);
			}
			
			nlapiSubmitField('contact',ctrslt[i].getValue('internalid'), fldupds, valupds, false);
			
			//reschedule logic
			if (ctx.getRemainingUsage() <= exitCount && (i+1) < ctrslt.length) {
				var param = new Array();
				param['custscript_ctr_lastproc_ctid'] = ctrslt[i].getId();
				param['custscript_customerid'] = customerId;
				param['custscript_new_stage'] = stageTxt;
				param['custscript_new_status'] = statusTxt;
				
				var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
				if (schStatus=='QUEUED') {
					log('debug','Script Rescheduled','Last Processed Group ID: '+ctrslt[i].getId());
					break;
				}
			}
		}
	}
}

function log(_type, _title, _msg) {
	nlapiLogExecution(_type, _title, _msg);
}