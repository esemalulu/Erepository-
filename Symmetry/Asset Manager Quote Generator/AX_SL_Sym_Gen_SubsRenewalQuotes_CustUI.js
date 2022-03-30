/**
 * Custom Suitelet User Interface that allows users to kick off AUX:SS: SWX Generate Sub. Renewal Quotes.
 * System will allow users to choose Entitlement End Date currently in the system to execute against.
 * 
 */
var ctx = nlapiGetContext();

//Company Level parameter for calculating entitlement end date from current date
var paramDaysToEntDate = ctx.getSetting('SCRIPT','custscript_gsrq_numdaystoentdate');
//Company Level parameter for Renewed asset status
var paramRenewedStatus = ctx.getSetting('SCRIPT','custscript_gsrq_renewedstatusid');

var nsform = nlapiCreateForm('Customize Generate Subs. Renewal Quote Process', false);

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function cuztomGenSubsRenewalQt(req, res){

	//script:
	//customscript_ax_ss_gen_sub_ren_qt 
	//deploy: 
	//customdeploy_ax_ss_gen_sub_ren_qt_custdt  
	
	nsform.setScript('customscript_ax_cs_gen_sub_ren_qt_cust');
	
	//add status
	var statusfld = nsform.addField('custpage_statusfld','inlinehtml','');
	statusfld.setLayoutType('outsideabove', 'startrow');
	
	try {
		//Search for availability of Script deployment
		var sctdplStatus = 'Available';
		var sdrflt = [new nlobjSearchFilter('scriptid', 'scriptdeployment', 'is','customdeploy_ax_ss_gen_sub_ren_qt_custdt'),
		              new nlobjSearchFilter('status', null, 'noneof',['COMPLETE','FAILED'])];
		
		var sdcol = [new nlobjSearchColumn('status')];
	
		var sdrrs = nlapiSearchRecord('scheduledscriptinstance', null, sdrflt, sdcol);
		if (sdrrs && sdrrs.length > 0) {
			sctdplStatus = sdrrs[0].getValue('status');
		}
		
		if (req.getMethod()=='POST') {
			//Process the submission
			//Make sure entitlement end date and trx date is provided.
			if (req.getParameter('custpage_eedt') && req.getParameter('custpage_trxdt') && req.getParameter('custpage_trxdtor') && sctdplStatus=='Available') {
				var eetdt = req.getParameter('custpage_eedt');
				var trxdt = req.getParameter('custpage_trxdt');
				var trxdtor = req.getParameter('custpage_trxdtor');
				//9/15/2015
				var paydtor = req.getParameter('custpage_paydtor');
				var ptest = (req.getParameter('custpage_test')=='T')?'T':'F';
				//Queue it up and redirect user to THIS suitelet page
				var params = new Array();
				params['custscript_gsrq_custprocdate'] = trxdt;
				params['custscript_gsrq_trxdtoverride'] = trxdtor;
				params['custscript_gsrq_paydtoverride'] = paydtor;
				params['custscript_gsrq_testreconly'] = ptest;
				params['custscript_gsrq_execuser'] = ctx.getUser();
				nlapiScheduleScript('customscript_ax_ss_gen_sub_ren_qt', 'customdeploy_ax_ss_gen_sub_ren_qt_custdt', params);
				
				//redirect user to this page
				nlapiSetRedirectURL('SUITELET', ctx.getScriptId(), ctx.getDeploymentId(), false, null);
			}
			
			
		} else {
			//display the form
			//1. search for unique entitlement date that needs to be processed.
			//Asset Status 4 = Renewed
			var aflt = [new nlobjSearchFilter('custrecord_ax_cswxa_assetstatus', null, 'anyof',paramRenewedStatus),
			            new nlobjSearchFilter('custrecord_ax_cswxa_entitleenddt', null, 'isnotempty',''),
						new nlobjSearchFilter('isinactive', null, 'is','F')];
			
			//grab list of unique Entitlement End Dates
			var acol = [new nlobjSearchColumn('custrecord_ax_cswxa_entitleenddt',null,'group').setSort()];
			var ars = nlapiSearchRecord('customrecord_ax_cswx_assets', null, aflt, acol);
			
			nsform.addFieldGroup('custpage_grpa','Custom Options', null);
			
			//col A: Date selection
			var eedt = nsform.addField('custpage_eedt','select','Ent. End Date: ', null, 'custpage_grpa');
			eedt.setMandatory(true);
			eedt.addSelectOption('', '', true);
			eedt.setBreakType('startcol');
			
			var trxdt = nsform.addField('custpage_trxdt','date','Trx Date (-'+paramDaysToEntDate+' Days): ', null,'custpage_grpa');
			trxdt.setMandatory(true);
			trxdt.setDisplayType('disabled');
			
			var trxdthelp = nsform.addField('custpage_trxdthelp','textarea','Trx Date Note: ', null, 'custpage_grpa');
			trxdthelp.setDisplayType('inline');
			trxdthelp.setDefaultValue('Trx Date is [selected Ent. End Date - '+paramDaysToEntDate+' days].');
			
			//Mod Req 11/7/2013: Allow user to Override Transaction date.
			var trxdtor = nsform.addField('custpage_trxdtor','date','Trx Date Override: ', null,'custpage_grpa');
			trxdtor.setMandatory(true);
			
			var trxdtorhelp = nsform.addField('custpage_trxdtorhelp','textarea','Trx Date Override Note: ', null, 'custpage_grpa');
			trxdtorhelp.setDisplayType('inline');
			trxdtorhelp.setDefaultValue('Override date of Quote. By default, it is [selected Ent. End Date - '+paramDaysToEntDate+' days]');
			
			//9/14/2015 --- Payment Due Date (duedate) override
			var paydtor = nsform.addField('custpage_paydtor','date','Payment Date Override: ', null, 'custpage_grpa');
			paydtor.setMandatory(true);
				
			var paydtorhelp = nsform.addField('custpage_paydtorhelp','textarea','Payment Date Override Note: ', null, 'custpage_grpa');
			paydtorhelp.setDisplayType('inline');
			paydtorhelp.setDefaultValue('Override payment date of Quote. By default, it is '+
										'[Ent. End Date - '+ctx.getSetting('SCRIPT','custscript_gsrq_numdaysduedate')+' calendar days]');
			
			
			//col B: 
			var proctestfld = nsform.addField('custpage_test','checkbox','Process Test Records ONLY: ', null, 'custpage_grpa');
			proctestfld.setBreakType('startcol');
			
			var proctesthelp = nsform.addField('custpage_testhelp','textarea','Test Records Note: ', null, 'custpage_grpa');
			proctesthelp.setDisplayType('inline');
			proctesthelp.setDefaultValue('When checked, it will ONLY process Customer Asset records with <b>Is Test Record</b> Checked');
			
			//col C: Script Deployment Availability
			//sctdplStatus
			var sch = nsform.addField('custpage_sch','text','Script Status: ', null, 'custpage_grpa');
			sch.setDisplayType('inline');
			sch.setDefaultValue(sctdplStatus);
			sch.setBreakType('startcol');
			
			var schhelp = nsform.addField('custpage_schhelp','textarea','Script Availability: ', null, 'custpage_grpa');
			schhelp.setDisplayType('inline');
			schhelp.setDefaultValue('Status must be <b>Available</b> to be able to queue up custom date processing. If not, there is processing running and you must wait (refresh page) until it is completed. <br/><br/>When process is completed, you will be notified via Email');
			
			
			//ONLY display submit button if there are elements that can be processed
			if (ars && ars.length > 0) {
				
				if (sctdplStatus=='Available') {
					nsform.addSubmitButton('Queue Custom Date for Subs. Renewal Quote Process');
				}
				
				//add list of data elements to eedt drop down list
				for (var e=0; e < ars.length; e++) {
					eedt.addSelectOption(ars[e].getValue('custrecord_ax_cswxa_entitleenddt',null,'group'), 
										 ars[e].getValue('custrecord_ax_cswxa_entitleenddt',null,'group'), 
										 false);
				}
			}
		}
		
	} catch (gsrerr) {
		log('error','Error Processing', getErrText(gsrerr));
		statusfld.setDefaultValue('<span="red"><b>'+getErrText(gsrerr)+'</b></span>');
	}
	
	res.writePage(nsform);	
}
