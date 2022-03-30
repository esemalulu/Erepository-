/**
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 Oct 2013     AnJoe
 *
 */

var ctx = nlapiGetContext();
var paramLastProcId = ctx.getSetting('SCRIPT','custscript_prjstatus_lastid');
var paramRcoFormId = ctx.getSetting('SCRIPT','custscript_rcopia_formid');
var EXIT_COUNT = 1000;

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function updateRcopiaPrjStatusOnCustomer(type) {

	try {
		
		if (!paramRcoFormId) {
			log('error','No Form ID Passed in ', 'Rcopia Form ID is not passed in with script');
			throw nlapiCreateError('RCOPIAERR-001', 'Rcopia Form ID is not passed in with script', false);
		}
		
		var prjflt = null;
		var prjcol = [new nlobjSearchColumn('internalid').setSort(true)];
		if (paramLastProcId) {
			prjflt = [new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId)];
		}
		
		var prs = nlapiSearchRecord('job', null, prjflt, prjcol);
		
		//log('debug','prj',( (prs)?prs.length:'no result' ));
		
		for (var r=0; prs && r < prs.length; r++) {
			//load project record
			var prec = nlapiLoadRecord(prs[r].getRecordType(), prs[r].getId());
			//log('debug','form // entitstatus', prec.getFieldValue('customform')+ ' // '+prec.getFieldValue('entitystatus')+' // '+prec.getFieldText('entitystatus'));
			
			//custentity_ax_rcopia_prjstatus
			
			//check to make sure Parent value is set as well as form matches Rcopia form from parameter
			if (prec.getFieldValue('parent') && prec.getFieldValue('customform') == paramRcoFormId) {
				//update customer records' NEW Project status
				log('debug','Updating Parent Customer', 'Customer: '+prec.getFieldValue('parent')+' // Project: '+prec.getId());
				nlapiSubmitField('customer', prec.getFieldValue('parent'), 'custentity_ax_rcopia_prjstatus', prec.getFieldText('entitystatus'), false);
			}
			
			//Either Governance is low OR there are 1000 results returned.
			if ( (prs.length == 1000 && (r+1)==1000) || (ctx.getRemainingUsage() <= EXIT_COUNT && (r+1) < prs.length) ) {
				var params = new Array();
				params['custscript_prjstatus_lastid'] = prs[r].getId();
				params['custscript_rcopia_formid'] = paramRcoFormId; 
				var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), params);
				if (schStatus=='QUEUED') {
					break;
				}
			}
			
		}
		
	} catch (prjerr) {
		//log error
		log('error','Script Termination Error',getErrText(prjerr));
		throw nlapiCreateError('RCOPIAERR-001', getErrText(prjerr), false);
	}
	
}
