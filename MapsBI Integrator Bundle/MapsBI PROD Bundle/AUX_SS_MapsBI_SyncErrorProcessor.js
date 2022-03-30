/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Nov 2013     AnJoe
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

var ctx = nlapiGetContext();

//get MapsBi Credential ID
var paramMapsBiCred = ctx.getSetting('SCRIPT','custscript_mapsbi_cred');
//get mapping record
var paramLastProcRetryId = ctx.getSetting('SCRIPT','custscript_syncmapretryid');

function retrySyncFailedMappedDataSet(type) {

	if (!paramMapsBiCred) {
		log('error','Missing required info','Missing required info for deployment: '+ctx.getDeploymentId()+' : paramMapsBiCred='+paramMapsBiCred);
		
		throw nlapiCreateError('MBISYNC_0010', 'Error Attempting to Re-Sync data for DplID: '+ctx.getDeploymentId()+': Missing required parameters', false);		
		return;
	}
	
	try {
		//Get API key
		var mbiApiKey = nlapiLookupField('customrecord_aux_ext_serv_cred_mgr', paramMapsBiCred, 'custrecord_aux_escm_access_api_key', false);
		
		if (!mbiApiKey) {
			throw nlapiCreateError('MBIAPIMISS_0030', 'Error Missing MapsBI API Key: '+ctx.getDeploymentId()+': Please make sure MapsBI API Key is set.', false);
		}

		//search for those ERROR mapping ones.
		var syncflt = [new nlobjSearchFilter('custrecord_axmbi_ssds_syncstatus', null,'is','ERROR'),
		               new nlobjSearchFilter('isinactive', null, 'is','F')];
		var synccol = [new nlobjSearchColumn('internalid').setSort(),
		               new nlobjSearchColumn('custrecord_axmbi_ssds_erroreddt'),
		               new nlobjSearchColumn('custrecord_axmbi_ssds_dplsctid')];
		var syncrs = nlapiSearchRecord('customrecord_axmbi_ss_ds_map', null, syncflt, synccol);
		
		for (var i=0; syncrs && i < syncrs.length; i++) {
			log('debug','Processing Retry',syncrs[i].getValue('internalid'));
			
			//Queue it up.
			var param = new Object();
			param['custscript_syncmapid'] = syncrs[i].getValue('internalid');
			//adhoc schedule to Sync Data for this mapping
			var status = nlapiScheduleScript(getUploaderScriptId('scriptid'), syncrs[i].getValue('custrecord_axmbi_ssds_dplsctid'), param);
			
			log('debug','Mapping ID Retry Status', status+' // '+syncrs[i].getValue('internalid'));
			
			//Logic To Reschedule
			if ((i+1)==1000 || ((i+1) < syncrs.length && ctx.getRemainingUsage() < 500)) {
				//reschedule
				var rparam = new Object();
				rparam['custscript_syncmapretryid'] = syncrs[i].getValue('internalid');
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			}
		}
		
	} catch (resyncdataerr) {
		
		log('error','Failed. Retry Queue','Retry Queue due to error: '+getErrText(resyncdataerr));
		
		throw nlapiCreateError('MBISYNC_0003', 'Error Initiating Failed Sync Retry: '+getErrText(resyncdataerr), false);
	}
	
}
	