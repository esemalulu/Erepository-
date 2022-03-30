/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Jun 2014     AnJoe
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_axsyncaltnamepid');
var paramUpdateFieldId = nlapiGetContext().getSetting('SCRIPT', 'custscript_axsyncupdid');

function syncAltCustomerNameFromSwxAsset(type) {

	try {
		
		
		var sflt = [new nlobjSearchFilter('custrecord_ax_swxacm_customer', null, 'noneof','@NONE@'),
		            new nlobjSearchFilter('custrecord_ax_swxacm_vstatus', null, 'anyof',['1']),
		            new nlobjSearchFilter('custrecord_ax_swxacm_load_acctname', null, 'isnotempty',''),
		            new nlobjSearchFilter('isinactive', null, 'is','F')];
		if (paramLastProcId) {
			sflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan',paramLastProcId));
		}
		
		var scol = [new nlobjSearchColumn('internalid').setSort(true),
		            new nlobjSearchColumn('custrecord_ax_swxacm_customer'),
		            new nlobjSearchColumn('custrecord_ax_swxacm_load_acctname'),
		            new nlobjSearchColumn(paramUpdateFieldId,'CUSTRECORD_AX_SWXACM_CUSTOMER')];
		
		var srs = nlapiSearchRecord('customrecord_ax_swxac_map', null, sflt, scol);
		for (var i=0; srs && i < srs.length; i++) {
			
			var custId = srs[i].getValue('custrecord_ax_swxacm_customer');
			//var altOnCust = srs[i].getValue(paramUpdateFieldId,'CUSTRECORD_AX_SWXACM_CUSTOMER');
			var altOnAsset = srs[i].getValue('custrecord_ax_swxacm_load_acctname');
			
			try {
				
				nlapiSubmitField('customer', custId, paramUpdateFieldId, altOnAsset, false);
				
			} catch (upderr) {
				log('error','Error Updating Customer ID: '+custId,getErrText(upderr));
			}
			
			
			if ( (srs.length == 1000 && (i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 100 && (i+1) < srs.length) ) {
				var params = new Object();
				params['custscript_axsyncaltnamepid'] = srs[i].getId();
				params['custscript_axsyncupdid'] = paramUpdateFieldId;
				var schStatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), params);
				if (schStatus=='QUEUED') {
					break;
				}
			}
		}
		
		
	} catch (syncerr) {
		throw nlapiCreateError('SYNCALTERR', getErrText(syncerr), false);
	}
	
}
