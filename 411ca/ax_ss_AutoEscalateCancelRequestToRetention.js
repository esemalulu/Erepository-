/**
 * Scheduled Script to run on a nightly basis EVERY WEEK Day.
 * If Enter date matches 5 business days ago from today Escalate to Retention
 */

//Company Level Parameters
var paramFinanceNotifyEmail = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_finemail');
var paramRetEntryStatus = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_entrystatus');
var paramRetExitStatusAccept = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_exitstatusaccept');
var paramRetExitStatusLost = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_exitstatuslost');
var paramRetExitStatusLost10 = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_exitstatuslost10');
var paramRetInProgressByRetRepStatus = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_inprogbyretstatus');
var paramRetSentToRetStatus = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_senttoretstatus');
var paramRetResRetWithChanges = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_resretwchg');
var paramRetResCancelled = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_rescancelled');
var paramRetResStatusInProgAcct = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_status_ipacct');
var paramRet10DaysRemCancelDisposition = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_candispo10day');
var paramRetStatusInProgByAr = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_status_ipbyar');

//Company level setting to identify how many BUSINESS days from Enter date to wait.
//Default to 5 business days
var paramRetNumDaysAutoEscalate = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_numdaysautoret');
var paramRetNoOfferTypeId = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_nooffertypeid');

var EXIT_COUNT= 1000;

//Constant value to identify Retention Status of "In Progress"
//2/4/2015 - ONLY Status to auto escalate is In Progress
var CONST_RET_STATUS_IN_PROGRESS = '2';

function processAutoEscalateToRetention(type) {
	
	var today = new Date();
	//var today = new Date('10/1/2014');
	
	//subtract 5 BUSINESS days from Current Date
	//	To compare with Request to Cancel Date to auto push to Retention
	var xBizDaysAgoDateFromToday = today;
	var numDays = 0;
	
	log('debug','Current Date',xBizDaysAgoDateFromToday);
	
	while (numDays != parseInt(paramRetNumDaysAutoEscalate)) {
		xBizDaysAgoDateFromToday = nlapiAddDays(xBizDaysAgoDateFromToday, -1);
		log('debug','numDays // -1 day', numDays+' // '+xBizDaysAgoDateFromToday+' // Day is '+xBizDaysAgoDateFromToday.getDay());
		//0 = Sunday
		//6 = Sat
		if (xBizDaysAgoDateFromToday.getDay() != 0 && xBizDaysAgoDateFromToday.getDay()!=6) {
			numDays++;
		}
	}
	
	//go back 15 days from the date of X Biz Days ago from Today.
	var searchRangeStart = nlapiAddDays(xBizDaysAgoDateFromToday, -15);
	
	try {
		
		log('debug',paramRetNumDaysAutoEscalate+' days ago from Today ('+nlapiDateToString(today)+')', nlapiDateToString(xBizDaysAgoDateFromToday));
		
		//Auto escalate client criteria:
		//		- Retention Entered Date is NOT empty AND is ON X business days ago from today
		//				X is defined as company parameter preference
		//		- Retention Exit Date is EMPTY
		//		- Retention Status NONEOF @NONE@, All Exist Statuses, Sent to Retention and In progress by retention
		//			- 10/17/2014: Ignore In Progress by AR status
		//		- Retention rep Assigned is NOT Set (Has not been sent to retention)
		//		
		//		- 2/4/2015 - Modified Search Filter to ONLY look for retention Status any of In Progress
		var escflt = [new nlobjSearchFilter('custentity_ax_retenterdate', null, 'isnotempty'),
		              new nlobjSearchFilter('custentity_ax_retenterdate', null, 'within', nlapiDateToString(searchRangeStart), nlapiDateToString(xBizDaysAgoDateFromToday)),
		              new nlobjSearchFilter('custentity_ax_retexitdate', null, 'isempty'),
		              new nlobjSearchFilter('custentity_ax_retentionstatus', null, 'anyof', [CONST_RET_STATUS_IN_PROGRESS]), 
		              new nlobjSearchFilter('custentity_ax_retentionrep_assigned', null, 'anyof', '@NONE@')];
		
		var esccol = [new nlobjSearchColumn('internalid').setSort(true),
		              new nlobjSearchColumn('entityid'),
		              new nlobjSearchColumn('custentity_ax_retentcanceldispo'),
		              new nlobjSearchColumn('custentity_ax_retenterdate'),
		              new nlobjSearchColumn('custentity_ax_retentionstatus'),
		              new nlobjSearchColumn('custentity_ax_retactivityid'),
		              new nlobjSearchColumn('custentity_ax_retactivitycontact')];
		
		var escrs = nlapiSearchRecord('customer', null, escflt, esccol);
		
		for (var i=0; escrs && i < escrs.length; i++) {
			
			log('debug','To be escalated customer', escrs[i].getValue('internalid')+' // '+escrs[i].getValue('entityid'));
			
			//Search and grab latest retention activity for additional info
			var actflt = [new nlobjSearchFilter('custrecord_acra_actid', null, 'is',escrs[i].getValue('custentity_ax_retactivityid')),
			              new nlobjSearchFilter('custrecord_acra_customer', null, 'anyof', escrs[i].getValue('internalid'))];
			var actcol = [
			              new nlobjSearchColumn('internalid').setSort(true), //grab highest internal ID for THIS activity which means Latest
			              new nlobjSearchColumn('custrecord_acra_workingrep'), //grab most recent original CSR 
			              new nlobjSearchColumn('custrecord_acra_customercontact') // grab contact JUST incase it's not set on the customer record
						 ];
			var actrs = nlapiSearchRecord('customrecord_ax_retentionactivity', null, actflt, actcol);
			
			//search for list of all retention reps with last assignment date in asc order.
			//this approach will return rep who hasn't been assigned a case in a bit.
			//1/21/2015 -
			//	Request to add ability for Reps to be assigned as Level 2 but NOT get round robined into assignment.
			//	To do this, User can Clear out the Last Assigned Date field on the record of "AX:Retention Rep. Employees"
			//	Below search will ONLY look for those who has a last date assigned to give the task to.
			var rrflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
			             new nlobjSearchFilter('custrecord_arre_assigneddate', null, 'isnotempty','')];
			var rrcol = [new nlobjSearchColumn('custrecord_arre_assigneddate').setSort(),
			             new nlobjSearchColumn('custrecord_arre_rep')];
			var rrrs = nlapiSearchRecord('customrecord_ax_retention_repemps', null, rrflt, rrcol);
			
			//replicate pobj object
			var pobj = new Object();
			pobj.lostdispotext = escrs[i].getText('custentity_ax_retentcanceldispo');
			pobj.activityid = escrs[i].getValue('custentity_ax_retactivityid');
			pobj.customerid = escrs[i].getValue('internalid');
			//Regardless of TESTING Current date/time, for setting and creation of activity log, use current date.
			pobj.date = nlapiDateToString(new Date());
			pobj.time = nlapiDateToString(new Date(),'timeofday');
			pobj.contactid = escrs[i].getValue('custentity_ax_retactivitycontact');
			//Assume we have result from most recent activity search
			if (!pobj.contactid) {
				//incase contact isn't set from customer, set it from most recent activity
				pobj.contactid = actrs[0].getValue('custrecord_acra_customercontact');
			}
			//set CSR from most recent
			pobj.repid = actrs[0].getValue('custrecord_acra_workingrep');
			pobj.repname = actrs[0].getText('custrecord_acra_workingrep');
			//Assume we have result for NEXT Retention rep 
			pobj.retrepid = rrrs[0].getValue('custrecord_arre_rep');
			pobj.retrepname = rrrs[0].getText('custrecord_arre_rep');
			//update this rep with the current date
			nlapiSubmitField('customrecord_ax_retention_repemps', rrrs[0].getId(), 'custrecord_arre_assigneddate', nlapiDateToString(new Date(), 'datetimetz'), false);
			
			//set status to Send to Retention
			pobj.status = paramRetSentToRetStatus;
			//set offer type to NO OFFER
			pobj.offertype = paramRetNoOfferTypeId; 
			pobj.offerdetail = 'Auto escalated to Retention Queue and assigned to '+pobj.retrepname;
			pobj.internalnote = 'Auto escalated to Retention Queue and assigned to '+pobj.retrepname;
			
			try {
				//1. create retention activity log for auto escalation
				var retrec = nlapiCreateRecord('customrecord_ax_retentionactivity');
				retrec.setFieldValue('custrecord_acra_actid', pobj.activityid);
				retrec.setFieldValue('custrecord_acra_customer', pobj.customerid);
				retrec.setFieldValue('custrecord_acra_act_date', pobj.date);
				retrec.setFieldValue('custrecord_acra_act_time', pobj.time);
				retrec.setFieldValue('custrecord_acra_customercontact', pobj.contactid);
				retrec.setFieldValue('custrecord_acra_workingrep', pobj.repid);
				retrec.setFieldValue('custrecord_acra_assigned',pobj.retrepid);
				retrec.setFieldValue('custrecord_acra_act_status', pobj.status);
				retrec.setFieldValue('custrecord_acra_offertype', pobj.offertype);
				retrec.setFieldValue('custrecord_acra_act_notes', pobj.offerdetail);
				retrec.setFieldValue('custrecord_acra_internalnote', pobj.internalnote);
				var retid = nlapiSubmitRecord(retrec, true, true);
				log('debug','auto log created',retid);
				
				try {
					//2. create user note for auto escalation
					var retNoteValue = 'Activity Date: '+pobj.date+' '+pobj.time+'\n'+
									   'Working Agent: '+pobj.repname+'\n'+
									   'Retention Agent: '+pobj.retrepname+'\n'+
									   'Disposition: '+pobj.lostdispotext+'\n'+
									   'Financial Details:\n'+
									   pobj.offerdetail;
					
					var retnote = nlapiCreateRecord('note');
					retnote.setFieldValue('title', 'Retention [Send to Retention] ('+pobj.activityid+')');
					retnote.setFieldValue('note', retNoteValue);
					retnote.setFieldValue('entity',pobj.customerid);
					nlapiSubmitRecord(retnote, true, true);
					
					//3. Update customer with latest retention activity
					var cfld = ['custentity_ax_retentionstatus','custentity_ax_retentionrep_assigned'];
					var cval = [pobj.status, pobj.retrepid];
					try {
						nlapiSubmitField('customer', pobj.customerid, cfld, cval, true);
					} catch (custupderr) {
						log('error','Error Updating Customer', 'Customer ID: '+pobj.customerid+' // '+getErrText(custupderr));
					}
					
				} catch (retnoteerr) {
					log('error','Error Sync with Note','Customer ID: '+pobj.customerid+' // '+getErrText(retnoteerr));
				}
				
			} catch (retlogerr) {
				log('error','Error Creating Auto Escalate Log','Customer ID: '+pobj.customerid+' // '+getErrText(retlogerr));
			}
			
			log('debug','Customer ID '+pobj.customerid+' Escalation Success',JSON.stringify(pobj));
			
	    	/**
				//Reschedule logic
				if ( (ars.length == 1000 && (a+1)==1000) || (ctx.getRemainingUsage() <= EXIT_COUNT && (a+1) < ars.length) ) {
					var params = new Array();
					params['custscript_gsrq_assetcid'] = ars[a].getId();
					params['custscript_gsrq_custprocdate'] = ((paramCustProcDate)?paramCustProcDate:'');
					params['custscript_gsrq_trxdtoverride'] = paramTrxDateOverride;
					params['custscript_gsrq_testreconly'] = ((paramProcTestRecOnly=='T')?'T':F);
					var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), params);
					if (schStatus=='QUEUED') {
						break;
					}
				}
			*/
	    	
	    }
	    
		
	} catch (autoescerr) {
		
		log('error','Auto Escalate Error',getErrText(autoescerr));
		throw nlapiCreateError('NMIBL-1000', getErrText(autoescerr), false);
		
	}
	
	
}
