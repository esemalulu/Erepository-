/**
 * Scheduled script used for As NEEDED Bases to apply Campaign Response to entity record.
 * Requirement:
 * - Script runs based on existing Saved Search ORDERED by Internal ID in Descending Order
 * - Creates New Campaign Response using Campaign passed in.
 * 
 * Assumption:
 * - Script assumes that campaign response can be added to entity records returned by Saved Search.
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 Oct 2013     AnJoe
 *
 */

var ctx = nlapiGetContext();
var paramSavedSearchId = ctx.getSetting('SCRIPT','custscript_addcmpres_searchid');
var paramCampId = ctx.getSetting('SCRIPT','custscript_addcmpres_campid');
var paramLastProcId = ctx.getSetting('SCRIPT','custscript_addcmpres_lastid');
var EXIT_COUNT = 1000;

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function addCampaignResponse(type) {

	log('debug','Camp ID',paramCampId);
	log('debug','search ID',paramSavedSearchId);
	log('debug','Type',type);
	
	try {
		
		//0. Make sure Saved Search ID and Camp ID is passed in
		if (!paramSavedSearchId || !paramCampId) {
			//throw error and notifies all admins
			throw nlapiCreateError('AX_SS_0010', 'Scheduled Script Terminated:: Saved Search and/or Campaign is NOT provided for Script Deployment', false);
		}
		
		//1. check to make sure saved search is sorted by Internal ID DESC
		var ssrec = nlapiLoadSearch(null, paramSavedSearchId);
		//loop through columns and check for internal ID desc 
		var allCols = ssrec.getColumns();
		
		//paramter to make sure saved search IS oredred by Internal ID in Desc order
		var isOrderedDesc = false;
		for (var ssc=0; ssc < allCols.length; ssc++) {
			var acol = allCols[ssc];
			if (acol.getName() == 'internalid' && acol.getSort() == 'DESC') {
				log('debug','column',acol.getName()+' /// '+acol.getSort());
				isOrderedDesc = true;
				break;
			}
		}
		
		//ONLY Process if saved search has proper ordering defined
		if (isOrderedDesc) {
			
			//incase script was rescheduled, pickup from where it left off
			var custflt = null;
			if (paramLastProcId) {
				custflt = [new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId)];
			}
			
			var crs = nlapiSearchRecord(null, paramSavedSearchId, custflt, null);
			//loop through each result set and add campaign
			var errText = '';
			//
			for (var r=0; crs && r < crs.length; r++) {
				
				var rectype = crs[r].getRecordType();
				var recid = crs[r].getId();
				
				try {
					var cmpres = nlapiCreateRecord('campaignresponse',{recordmode: 'dynamic'});
					cmpres.setFieldValue('entity',recid);
					cmpres.setFieldValue('leadsource', paramCampId);
					cmpres.setFieldText('campaignevent','[Default Event]');
					cmpres.setFieldText('response', 'Responded');
					cmpres.setFieldValue('note', '[Response Added by Sch.Sct: '+ctx.getDeploymentId()+']');
					nlapiSubmitRecord(cmpres, false, true);
					
					//CUSTOM CODE TO UPDATE FLAG
					//update flag
					nlapiSubmitField(rectype, recid, 'custentity_tmp_updatecampaign', 'F', false);
				} catch (creserr) {
					log('error','Create Camp. Res. Error',rectype+'('+recid+'):'+getErrText(creserr));
					errText += rectype+'('+recid+'):'+getErrText(creserr)+' // ';
				}
				
				//reschedule logic
				//Either Governance is low OR there are 1000 results returned.
				if ( (crs.length == 1000 && (r+1)==1000) || (ctx.getRemainingUsage() <= EXIT_COUNT && (r+1) < crs.length) ) {
					log('debug','Rescheduling at',rectype+' // '+recid);
					
					var params = new Array();
					params['custscript_addcmpres_searchid'] = paramSavedSearchId;
					params['custscript_addcmpres_campid'] = paramCampId;
					params['custscript_addcmpres_lastid'] = paramLastProcId;
					
					var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), params);
					if (schStatus=='QUEUED') {
						break;
					}
				}
				
			}
			
			//throw error to notify Admins
			if (errText) {
				//throw error and notifies all admins
				throw nlapiCreateError('AX_SS_0020', 'Scheduled Script Proc Err:: Camp. Resp. Create Errors: '+errText, false);
			}
			
			
		} else {
			//throw error and notifies all admins
			throw nlapiCreateError('AX_SS_0030', 'Scheduled Script Terminated:: Saved Search ID: '+paramSavedSearchId+' is NOT ordered by Internal ID in DESC order', false);
		}
		
	} catch (addcmperr) {
		//log error
		log('error','Script Termination Error',getErrText(addcmperr));
	}
	
}
