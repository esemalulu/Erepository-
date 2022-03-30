/**
 * Custom Suitelet User Interface that allows users to kick off Gen_SubsRenewalQuotes Scheduled Script for custom TRX Date.
 * System will allow users to choose Entitlement End Date currently in the system to execute against.
 * Transaction Date will be 70 days from user selected Entitlement End Date.
 * System will generate Quotes for following SWX Customer Assets
 * - Ad-Hoc Queue up UNSCHEDULED Gen	_SubsRenewalQuotes Script.
 * 
 * NOTES:
 * - Transaction Date will default to 70 days from User selected Entitlement End Date.
 * 
 */
var ctx = nlapiGetContext();
//var paramJavQuoteFormId = ctx.getSetting('SCRIPT','custscript_gsrq_javqfid');
//var paramAdsQuoteFormId = ctx.getSetting('SCRIPT','custscript_gsrq_adsqfid');
//var paramProcessAds = ctx.getSetting('SCRIPT','custscript_gsrq_procads');
//var paramNotifyEmails = ctx.getSetting('SCRIPT','custscript_gsrq_notifyemails');

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

	var status = ['COMPLETE', 'FAILED'];
	nsform.setScript('customscript_ax_cs_gen_sub_ren_qt_cust');
	
	//add status
	var statusfld = nsform.addField('custpage_statusfld','inlinehtml','');
	statusfld.setLayoutType('outsideabove', 'startrow');
	
	try {
		//Search for availability of Script deployment
		var sctdplStatus = 'Available';
		var sdrflt = [new nlobjSearchFilter('scriptid', 'scriptdeployment', 'is','customdeploy_ax_ss_gen_sub_ren_qt_custdt'),
		              new nlobjSearchFilter('status', null, 'noneof',status)];
		
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
				//var pcads = (req.getParameter('custpage_pads')=='T')?'T':'F';
				//11/19/2014 - All Quotes shuld use Javelin Form
				var pcads = 'F';
				var ptest = (req.getParameter('custpage_test')=='T')?'T':'F';
				log('debug','Process ADS',pcads);
				//Queue it up and redirect user to THIS suitelet page
				var params = new Array();
				params['custscript_gsrq_procads'] = pcads;
				params['custscript_gsrq_custprocdate'] = trxdt;
				params['custscript_gsrq_trxdtoverride'] = trxdtor;
				params['custscript_gsrq_testreconly'] = ptest;
				nlapiScheduleScript('customscript_ax_ss_gen_sub_ren_qt', 'customdeploy_ax_ss_gen_sub_ren_qt_custdt', params);
				
				//redirect user to this page
				nlapiSetRedirectURL('SUITELET', ctx.getScriptId(), ctx.getDeploymentId(), false, null);
			}
			
			
		} else {
			//display the form
			//1. search for unique entitlement date that needs to be processed.
			//Asset Status 4 = Renewed
			//Mod Request: 11/5/2013
			//Add Status of YES and VPA - Javelin
			//Create Quotes if Yes or MultiVAR Account
			// ONLY UPDATE Asset status when VPA - Javelin
			//SWX Support 7 = MultiVAR Account - Javelin
			//			  2 = Yes
			//			  11 = VPA - Javelin
			/**
			var aflt = [new nlobjSearchFilter('custrecord_ax_cswxa_assetstatus', null, 'anyof','4'),
			            new nlobjSearchFilter('isinactive', null, 'is','F'),
			            new nlobjSearchFilter('custentity_supportlevel_swx','custrecord_ax_cswxa_customer', 'anyof',['7','2','11','13'])];
			*/
			/*

			Must export old values from swx support and map to the new field subscription type

			Support Level (customlist_supportlevel -> populates: custentity_supportlevel_swx) - [OLD]
			--------------------------------
			Yes	2
			SEE NOTES	8
			No Support	3
			Suspended	4
			Eval	6
			KEY Account	1
			MultiVAR Account - Javelin	7
			MultiVAR Account - Other VAR	9
			MultiVAR Account - Direct SWX	10
			MultiVAR Account	15
			VPA - Javelin	11
			VPA - Direct SWX	12
			Special Agreement	13
			ACR In Process	16

			Subscription Type List (customlist_sub_type_list -> populates: custentity_sub_type) - [NEW]
			-----------------------
			MRN - Direct SWX	4
			MRN - Javelin	2
			MRN - Other VAR	3
			Special Agreement	7
			Standard	1
			VPA - Direct SWX	6
			VPA - Javelin	5
			*/
			
			var aflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
			            new nlobjSearchFilter('custrecord_ax_cswxa_assetstatus', null, 'anyof','4'),
			            new nlobjSearchFilter('custentity_sub_type','custrecord_ax_cswxa_customer', 'anyof',['2','1','5','7'])];
			
			//grab list of unique Entitlement End Dates
			var acol = [new nlobjSearchColumn('custrecord_ax_cswxa_entitleenddt',null,'group').setSort()];
			var ars = nlapiSearchRecord('customrecord_ax_cswx_assets', null, aflt, acol);
			
			nsform.addFieldGroup('custpage_grpa','Custom Options', null);
			
			//col A: Date selection
			var eedt = nsform.addField('custpage_eedt','select','Ent. End Date: ', null, 'custpage_grpa');
			eedt.setMandatory(true);
			eedt.addSelectOption('', '', true);
			eedt.setBreakType('startcol');
			
			var trxdt = nsform.addField('custpage_trxdt','date','Trx Date (-70 Days): ', null,'custpage_grpa');
			trxdt.setMandatory(true);
			trxdt.setDisplayType('disabled');
			
			var trxdthelp = nsform.addField('custpage_trxdthelp','textarea','Trx Date Note: ', null, 'custpage_grpa');
			trxdthelp.setDisplayType('inline');
			trxdthelp.setDefaultValue('Trx Date is [selected Ent. End Date - 70 days].');
			
			//Mod Req 11/7/2013: Allow user to Override Transaction date.
			var trxdtor = nsform.addField('custpage_trxdtor','date','Trx Date Override: ', null,'custpage_grpa');
			trxdtor.setMandatory(true);
			
			var trxdtorhelp = nsform.addField('custpage_trxdtorhelp','textarea','Trx Date Override Note: ', null, 'custpage_grpa');
			trxdtorhelp.setDisplayType('inline');
			trxdtorhelp.setDefaultValue('Override date of Quote. By default, it is [selected Ent. End Date - 70 days]');
			
			
			//col B: process ADS
			var procads = nsform.addField('custpage_pads','checkbox','Process ADS: ', null, 'custpage_grpa');
			//11/19/2014 - HIDE it. all Quote should be generated using Javelin form
			procads.setDisplayType('hidden');
			
			var procadshelp = nsform.addField('custpage_padshelp','textarea','ADS Note: ', null, 'custpage_grpa');
			procadshelp.setDisplayType('inline');
			procadshelp.setBreakType('startcol');
			procadshelp.setDefaultValue('Starting 11/19/2014, ALL Quotes will be generated using Javelin Quote Form.<br/><br/>');
			//When checked, Entitlement End Date Prior to 2015 will use ADS Quote Form<br/><br/>');
			
			nsform.addField('custpage_test','checkbox','Process Test Records ONLY: ', null, 'custpage_grpa');
			
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
			schhelp.setDefaultValue('Status must be <b>Available</b> to be able to queue up custom date processing. If not, there is processing running and you must wait (refresh page) until it is completed');
			
			
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
