
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


function beforeLoadRetentionHandler(type, form, request){
log('debug','type',type);
	try {
		
		if (type == 'view') {
			//add retention button
			
			var showLogRetButton = true;
			if (nlapiGetFieldValue('custentity_ax_retentionstatus')==paramRetInProgressByRetRepStatus || nlapiGetFieldValue('custentity_ax_retentionstatus')== paramRetSentToRetStatus) {
				//Aux Mod: 7/16/2014 - Vlad suggestion.
				//	ONLY Execute search if we need to.
				var rrflt = [new nlobjSearchFilter('isinactive',null,'is','F'),
				             new nlobjSearchFilter('custrecord_arre_rep', null, 'anyof', nlapiGetContext().getUser())];
				var rrcol = [new nlobjSearchColumn('custrecord_arre_rep')];
				var rrrs = nlapiSearchRecord('customrecord_ax_retention_repemps', null, rrflt, rrcol);
				
				if (!rrrs) {
					showLogRetButton = false;
				}
			}
			
			//Aux Mod: 7/16/2014 - Vlad suggestion.
			//	ONLY Execute resolveURL if we need to activate the button
			if (!showLogRetButton) {
				//add a button and disable it without window.open code
				form.addButton('custpage_retbtn', 'Log Retention Activity', '').setDisabled(true);
			} else {
				var retSlUrl = nlapiResolveURL('SUITELET', 'customscript_ax_sl_retentiontrackerui', 'customdeploy_ax_sl_retentiontrackerui', 'VIEW')+
				   '&custparam_customerid='+nlapiGetRecordId()+
				   '&custparam_actid='+(nlapiGetFieldValue('custentity_ax_retactivityid')?nlapiGetFieldValue('custentity_ax_retactivityid'):'')+
				   '&custparam_retstatus='+(nlapiGetFieldValue('custentity_ax_retentionstatus')?nlapiGetFieldValue('custentity_ax_retentionstatus'):'')+
				   '&custparam_customername='+escape(nlapiGetFieldValue('companyname'))+
				   '&custparam_enterdate='+nlapiGetFieldValue('custentity_ax_retenterdate')+
				   '&custparam_entertime='+nlapiGetFieldValue('custentity_ax_retentertime')+
				   '&custparam_retdispoid='+(nlapiGetFieldValue('custentity_ax_retentcanceldispo')?nlapiGetFieldValue('custentity_ax_retentcanceldispo'):'')+
				   '&custparam_retcontactid='+(nlapiGetFieldValue('custentity_ax_retactivitycontact')?nlapiGetFieldValue('custentity_ax_retactivitycontact'):'');
	
				var scriptHtml = 'window.open(\''+retSlUrl+'\', \'RetentionTracker\', \'width=1350,height=750,resizable=yes,scrollbars=yes\');return true;';
				
				form.addButton('custpage_retbtn', 'Log Retention Activity', scriptHtml);
			}
		}
		
	} catch (custrterr) {
		log('error','Error Displaying Retention Handler',getErrText(custrterr));
	}
}
