/**
 * As of Version 2013.2, You can NOT access Scheduled Script Schedule.
 * This Scheduled script limited workaround to immulate Scheduler.
 * - Each Mapped record has it's own scheduled script deployment record in NOT SCHEDULED mode.
 * - User can choose Daily or Monthly sync option.
 * - This script will have two deployments:
 * 		- Deployed to run Daily at 11pm
 * 			Process map records with Daily sync option set
 * 		- Deployed to run Monthly First day of the month at 11pm
 * 			Process map records with Monthly sync option set
 * 
 * 
 * getUploaderScriptId('scriptid'); will always return script id of syncer script id
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Nov 2013     AnJoe
 *
 */

//Two deployments provide two different interval parameters.
var paramIntervalId = nlapiGetContext().getSetting('SCRIPT', 'custscript_mbi_sch_interval');
var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_mbi_sch_procid');
/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

function scheduleDatasetSync(type) {

	var dsflt = [new nlobjSearchFilter('custrecord_axmbi_ssds_interval', null, 'anyof', paramIntervalId),
	             new nlobjSearchFilter('isinactive', null, 'is','F')];
	
	if (paramLastProcId) {
		dsflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
	}
	
	var dscol = [new nlobjSearchColumn('internalid').setSort(true),
	             new nlobjSearchColumn('custrecord_axmbi_ssds_dplsctid'),
	             new nlobjSearchColumn('custrecord_axmbi_ssds_dstitle'),
	             new nlobjSearchColumn('custrecord_axmbi_ssds_interval')];
	
	var dsrs = nlapiSearchRecord('customrecord_axmbi_ss_ds_map', null, dsflt, dscol);
	
	//loop through each result and schedule associated sync script
	var sctId = getUploaderScriptId('scriptid');
	var updFld = ['custrecord_axmbi_ssds_lastsyncdt',
	              'custrecord_axmbi_ssds_synclog',
	              'custrecord_axmbi_ssds_syncstatus'];
	var updVals = null;
	
	log('debug','Count', dsrs.length);
	
	try {
		for (var d=0; dsrs && d < dsrs.length; d++) {
			
			var dplId = dsrs[d].getValue('custrecord_axmbi_ssds_dplsctid');
			var syncDateTime = nlapiDateToString(new Date(), 'datetimetz');
			var syncRecId = dsrs[d].getValue('internalid');
			var syncRecTitle = dsrs[d].getValue('custrecord_axmbi_ssds_dstitle');
			var syncInterval = dsrs[d].getText('custrecord_axmbi_ssds_interval');
			//error, log it as sync status 
			if (!dplId) {
				log('error','Failed to Schedule '+syncInterval+' sync', syncRecTitle+' '+syncInterval+' Failed to execute due to missing deployment id');
				updVals = [syncDateTime,
				           syncRecTitle+' '+syncInterval+' Failed to execute due to missing deployment id',
				           'Failed'];
				nlapiSubmitField('customrecord_axmbi_ss_ds_map', syncRecId, updFld, updVals, false);
			} else {
				//try to schedule it
				try {
					var param = new Object();
					param['custscript_syncmapid'] = syncRecId;
					//adhoc schedule to Sync Data for this mapping
					var status = nlapiScheduleScript(sctId, dplId, param);
					log('debug','Successuflly scheduled', syncTitle+' Scheduled successfully: '+status);
				} catch (schqueueerr) {
					
					updVals = [syncDateTime,
					           syncRecTitle+' '+syncInterval+' Failed to queue: '+getErrText(schqueueerr),
					           'Failed'];
					nlapiSubmitField('customrecord_axmbi_ss_ds_map', syncRecId, updFld, updVals, false);
				}
				
				if ((d+1)==1000 || ((d+1) < dsrs.length && nlapiGetContext().getRemainingUsage() < 500)) {
					//reschedule
					var rparam = new Object();
					rparam['custscript_mbi_sch_interval'] = paramIntervalId;
					rparam['custscript_mbi_sch_procid'] = paramLastProcId;
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				}
			}
		}
	} catch (scherr) {
		log('error','Error scheduling syncer','Error Scheduling Syncer: '+getErrText(scherr));
		throw nlapiCreateError('MBISCH_ERROR', 'Error Scheduling Syncer: '+getErrText(scherr), false);
	}	
}
