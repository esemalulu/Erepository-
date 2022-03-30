
//Company Level Parameters
var paramFinanceNotifyEmail = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_finemail');
var paramRetEntryStatus = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_entrystatus');
var paramRetExitStatusAccept = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_exitstatusaccept');
var paramRetExitStatusLost = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_exitstatuslost');
var paramRetExitStatusLost10 = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_exitstatuslost10');
var paramRetSentToRetStatus = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_senttoretstatus');
var paramRetInProgressByRetRepStatus = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_inprogbyretstatus');

var paramRetResRetWithChanges = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_resretwchg');
var paramRetResCancelled = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_rescancelled');
var paramRetResStatusInProgAcct = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_status_ipacct');
var paramRet10DaysRemCancelDisposition = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_candispo10day');

//Offer Types That Triggers Instructions to be set on LOST


//9/19/2014 
var paramRetWebsiteOptionGetDiscount = nlapiGetContext().getSetting('SCRIPT','custscript_axrt_websiteodisc');

var customerid = '';
var customername = '';
var activityid = '';
var retstatusid = '';
//9/23/2014 - Track Cancellation disposition through out retention process so that they do NOT have to set it everytime new activity is logged
var retdispoid = '';
//9/24/2014 - Track Contact set during retentioin activity
var retcontactid = '';
var isNewActivity = false;

//9/30/2014 - List of 

function retentionTrackerUi(req, res) {
	
	var nsform = nlapiCreateForm('Log Retention Activity', true);
	nsform.setScript('customscript_ax_cs_retentionuihelper');

	//-----------------------------------------------------------
	//If process is done, write the page so that client script can close THIS window and refresh the opener
	if (req.getParameter('custparam_done')=='yes') {
		//create text field client page init can close 
		nsform.addField('custpage_done','text','',null,null).setDefaultValue('yes');
		
		//write out the page and return
		res.writePage(nsform);
		return;
	}
	
	//-----------------------------------------------------------
	
	var msgfld = nsform.addField('custpage_msg', 'inlinehtml', '', null, null);
	msgfld.setLayoutType('outsideabove');
	
	//add cancel close button
	nsform.addButton('custpage_cancel', 'Exit Without Save', 'closeWindow()');
	
	try {
		
		customerid = req.getParameter('custparam_customerid');
		customername = req.getParameter('custparam_customername');
		activityid = req.getParameter('custparam_actid')?req.getParameter('custparam_actid'):'';
		retstatusid = req.getParameter('custparam_retstatus')?req.getParameter('custparam_retstatus'):'';
		retdispoid = req.getParameter('custparam_retdispoid')?req.getParameter('custparam_retdispoid'):'';
		retcontactid = req.getParameter('custparam_retcontactid')?req.getParameter('custparam_retcontactid'):'';
		
		//Set original Retention Status ID passed in From Customer record
		var originalRetStatusId = nsform.addField('custpage_origretstatusid', 'text', 'Original Retention ID', null, null);
		originalRetStatusId.setDefaultValue(retstatusid);
		originalRetStatusId.setDisplayType('hidden');
		
		var retentionEnterDateTimeFld = nsform.addField('custpage_enterdatetime', 'text','Retention Enter Date/Time',null,null);
		retentionEnterDateTimeFld.setDefaultValue(req.getParameter('custparam_enterdate')+' '+req.getParameter('custparam_entertime'));
		retentionEnterDateTimeFld.setDisplayType('hidden');
		
		if (req.getMethod()=='POST') {
			customerid = req.getParameter('custpage_customerid');
			activityid = req.getParameter('custpage_actid');
			retstatusid = req.getParameter('custpage_status');
			
			log('debug','setting vals via req object',customerid+' // '+activityid+' // '+retstatusid);
		}
		
		log('debug','activityid',activityid);
		//if activityid is null OR status is one of EXIT status, create new
		if (!activityid || retstatusid==paramRetExitStatusAccept || retstatusid==paramRetExitStatusLost || retstatusid==paramRetExitStatusLost10) {
			activityid = 'RA'+new Date().getTime();
			isNewActivity = true;
			//since it's NEW activity, reset enter time to null so that it's not reusing previously entered time for another activity
			retentionEnterDateTimeFld.setDefaultValue('');
		}
		log('debug','activityid after',activityid);
		
		if (!customerid) {
			throw nlapiCreateError('AXRETERR', 'Customer ID Must be provided', true);
		}
		
		//---------------------------- POST ACTION---------------------------------
		if (req.getMethod() == 'POST') {
			log('debug','Begin POST processing','Processing');
			
			
			//return out as well as redirecting to Suitelet
			var pobj = new Object();
			pobj.customerid = req.getParameter('custpage_customerid');
			pobj.customername = req.getParameter('custpage_customerdisplay');
			pobj.activityid = req.getParameter('custpage_actid');
			pobj.contactid = req.getParameter('custpage_contact');
			pobj.contactname = req.getParameter('custpage_contactname');
			pobj.status = req.getParameter('custpage_status');
			pobj.statusname = req.getParameter('custpage_statusname');
			pobj.date = req.getParameter('custpage_actdate');
			pobj.time = req.getParameter('custpage_acttime');
			pobj.repid = req.getParameter('custpage_assign');
			pobj.repname = req.getParameter('custpage_assignname');
			pobj.retrepid = '';
			pobj.retrepname = '';
			pobj.offertype = req.getParameterValues('custpage_offertype');
			pobj.offertypename = req.getParameter('custpage_offertypename');
			pobj.offerdetail = req.getParameter('custpage_offerdetail');
			//2/2/2015 - Added to be used to set as account instruction
			pobj.offerdetailnobal = req.getParameter('custpage_offerdetailnobal');
			//Related fields
			//# free months
			pobj.numfree = req.getParameter('custpage_numfreemonths');
			pobj.compstart = req.getParameter('custpage_compstartdt');
			pobj.compend = req.getParameter('custpage_compenddt');
			//Perm discount
			pobj.discamt = req.getParameter('custpage_discamt');
			//6/4/2014 - all offer types now have related fields
			//short term discount
			pobj.shortdiscamt = req.getParameter('custpage_shortdiscamt');
			pobj.shortdiscstart = req.getParameter('custpage_discstartdt');
			pobj.shortdiscend = req.getParameter('custpage_discenddt');
			//refund
			pobj.refund = req.getParameter('custpage_refundamt');
			//upsell
			pobj.upsell = req.getParameter('custpage_upsellamt');
			//waive final
			pobj.waivefinal = req.getParameter('custpage_finalpaywaive');
			//waive amount
			pobj.waiveamt = req.getParameter('custpage_finalpaywaiveamt');
			//lost disposition
			pobj.lostdispo = req.getParameter('custpage_lostdispo');
			pobj.lostdispotext = req.getParameter('custpage_lostdisptext');
			//internal notes
			pobj.internalnote = req.getParameter('custpage_internalnotes');
			//9/19/2014 - PIF fields
			pobj.pifstartdate = req.getParameter('custpage_pifstartdt');
			pobj.pifnumfree = req.getParameter('custpage_numfreepifmonths');
			pobj.pifnumpaid = req.getParameter('custpage_numpaidpifmonths');
			pobj.piftotalamt = req.getParameter('custpage_piftotalamt');
			pobj.pifmonthlyamt = req.getParameter('custpage_pifmonthlyamt');
			//9/19/2014 - Website Fields
			pobj.wsoption = req.getParameter('custpage_websiteoption');
			pobj.wsdisc = req.getParameter('custpage_websitediscount');
			//9/19/2014 - Settlement Fields
			pobj.settlementamt = req.getParameter('custpage_settlementamt');
			//1/5/2015 - Google Retention Detail
			pobj.googleretdet = req.getParameter('custpage_googleretfld');
			
			var postdatastring = '<b>Activity Details:</b><br/>'+
								 'Customer: '+pobj.customername+'<br/>'+
								 'Activity ID: '+pobj.activityid+'<br/>'+
								 'Contact: '+pobj.contactname+'<br/>'+
								 'Status: '+pobj.statusname+'<br/>'+
								 'Assigned Rep: '+pobj.repname+'<br/>'+
								 'Date: '+pobj.date+'<br/>'+
								 'Time: '+pobj.time+'<br/>'+
								 'Offer Detail:<br/>'+pobj.offerdetail;
			
			//if status is Sent to Retention, get retention rep who hasn't been assigned a case yet
			if (retstatusid==paramRetSentToRetStatus) {
				try {
					
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
					if (rrrs && rrrs.length > 0) {
						//set system found retention rep 
						pobj.retrepid = rrrs[0].getValue('custrecord_arre_rep');
						pobj.retrepname = rrrs[0].getText('custrecord_arre_rep');
						//update this rep with the current date
						nlapiSubmitField('customrecord_ax_retention_repemps', rrrs[0].getId(), 'custrecord_arre_assigneddate', nlapiDateToString(new Date(), 'datetimetz'), false);
					}
					
				} catch (errorretassn) {
					log('error','Issue Updating Retention Rep',getErrText(errorretassn));
				}
			}
			
			var records = new Object();
			records['entity'] = pobj.customerid;
			
			//if original Retention status is NULL, or any of Exist Status, create Actitiy log of Request to Cancel
			var origStatusId = req.getParameter('custpage_origretstatusid');
			if (!origStatusId || origStatusId==paramRetExitStatusAccept || origStatusId==paramRetExitStatusLost || origStatusId==paramRetExitStatusLost10) {
				try {
					var entretrec = nlapiCreateRecord('customrecord_ax_retentionactivity');
					entretrec.setFieldValue('custrecord_acra_actid', pobj.activityid);
					entretrec.setFieldValue('custrecord_acra_customer', pobj.customerid);
					entretrec.setFieldValue('custrecord_acra_act_date', pobj.date);
					entretrec.setFieldValue('custrecord_acra_act_time', pobj.time);
					entretrec.setFieldValue('custrecord_acra_customercontact', pobj.contactid);
					entretrec.setFieldValue('custrecord_acra_workingrep', pobj.repid);
					entretrec.setFieldValue('custrecord_acra_assigned',pobj.retrepid);
					entretrec.setFieldValue('custrecord_acra_act_status', paramRetEntryStatus);
					entretrec.setFieldValue('custrecord_acra_offertype', pobj.offertype);
					entretrec.setFieldValue('custrecord_acra_act_notes', pobj.offerdetail);
					entretrec.setFieldValue('custrecord_acra_freemonths', pobj.numfree);
					entretrec.setFieldValue('custrecord_acra_comp_startdate', pobj.compstart);
					entretrec.setFieldValue('custrecord_acra_comp_enddate', pobj.compend);
					entretrec.setFieldValue('custrecord_acra_discount', pobj.discamt);
					
					entretrec.setFieldValue('custrecord_acra_upsellamt', pobj.upsell);
					entretrec.setFieldValue('custrecord_acra_refuntamt', pobj.refund);
					entretrec.setFieldValue('custrecord_acra_shortdiscount', pobj.shortdiscamt);
					entretrec.setFieldValue('custrecord_acra_shortdiscount_start', pobj.shortdiscstart);
					entretrec.setFieldValue('custrecord_acra_shortdiscount_end', pobj.shortdiscend);
					entretrec.setFieldValue('custrecord_acra_waivefinalpay', pobj.waivefinal);
					entretrec.setFieldValue('custrecord_acra_waivedamt',pobj.waiveamt);
					
					entretrec.setFieldValue('custrecord_acra_internalnote', pobj.internalnote);
					
					//9/19/2014 - Set all additional related fields on custom record
					entretrec.setFieldValue('custrecord_acra_pif_startdate', pobj.pifstartdate);
					entretrec.setFieldValue('custrecord_acra_pif_numfreemonth', pobj.pifnumfree);
					entretrec.setFieldValue('custrecord_acra_pif_numpaidmonth', pobj.pifnumpaid);
					entretrec.setFieldValue('custrecord_acra_pif_totalamount', pobj.piftotalamt);
					entretrec.setFieldValue('custrecord_acra_pif_monthlyamount', pobj.pifmonthlyamt);
					entretrec.setFieldValue('custrecord_acra_website_option', pobj.wsoption);
					entretrec.setFieldValue('custrecord_acra_website_discountamt', pobj.wsdisc);
					entretrec.setFieldValue('custrecord_acra_settlementamt', pobj.settlementamt);
					
					//9/30/2014 - add in dispotion value
					entretrec.setFieldValue('custrecord_acra_activitycanceldispo',pobj.lostdispo);
					
					//1/5/2015 - add in google retention detail
					entretrec.setFieldValue('custrecord_acra_googleretdetails',pobj.googleretdet);
					
					var entretid = nlapiSubmitRecord(entretrec, true, true);
					
					log('debug','Entry entretid',entretid);
				} catch (cancelreqerr) {
					log('error','Error creating Entry Log', getErrText(cancelreqerr));
				}
			}
			
			//1. create activity record
			try {
				
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
				retrec.setFieldValue('custrecord_acra_freemonths', pobj.numfree);
				retrec.setFieldValue('custrecord_acra_comp_startdate', pobj.compstart);
				retrec.setFieldValue('custrecord_acra_comp_enddate', pobj.compend);
				retrec.setFieldValue('custrecord_acra_discount', pobj.discamt);
				
				retrec.setFieldValue('custrecord_acra_upsellamt', pobj.upsell);
				retrec.setFieldValue('custrecord_acra_refuntamt', pobj.refund);
				retrec.setFieldValue('custrecord_acra_shortdiscount', pobj.shortdiscamt);
				retrec.setFieldValue('custrecord_acra_shortdiscount_start', pobj.shortdiscstart);
				retrec.setFieldValue('custrecord_acra_shortdiscount_end', pobj.shortdiscend);
				retrec.setFieldValue('custrecord_acra_waivefinalpay', pobj.waivefinal);
				retrec.setFieldValue('custrecord_acra_waivedamt',pobj.waiveamt);
				retrec.setFieldValue('custrecord_acra_internalnote', pobj.internalnote);
				
				//9/19/2014 - Set all additional related fields on custom record
				retrec.setFieldValue('custrecord_acra_pif_startdate', pobj.pifstartdate);
				retrec.setFieldValue('custrecord_acra_pif_numfreemonth', pobj.pifnumfree);
				retrec.setFieldValue('custrecord_acra_pif_numpaidmonth', pobj.pifnumpaid);
				retrec.setFieldValue('custrecord_acra_pif_totalamount', pobj.piftotalamt);
				retrec.setFieldValue('custrecord_acra_pif_monthlyamount', pobj.pifmonthlyamt);
				retrec.setFieldValue('custrecord_acra_website_option', pobj.wsoption);
				retrec.setFieldValue('custrecord_acra_website_discountamt', pobj.wsdisc);
				retrec.setFieldValue('custrecord_acra_settlementamt', pobj.settlementamt);
				
				//9/30/2014 - add in dispotion value
				retrec.setFieldValue('custrecord_acra_activitycanceldispo',pobj.lostdispo);
				//ONLY set following fields IF Exist Status is Retained
				if (pobj.status == paramRetExitStatusAccept || pobj.status == paramRetExitStatusLost || pobj.status == paramRetExitStatusLost10) {					retrec.setFieldValue('custrecord_acra_profileamtatretain', req.getParameter('custpage_profiletotal'));
					retrec.setFieldValue('custrecord_acra_retaineddeltaamt', req.getParameter('custpage_profiledelta'));
				}
				
				//1/5/2015 - add in google retention detail
				retrec.setFieldValue('custrecord_acra_googleretdetails',pobj.googleretdet);
				
				var retid = nlapiSubmitRecord(retrec, true, true);
				
				log('debug','retid',retid);
				
				//Create Note for this Retention Activity
				try {
					
					var retNoteValue = 'Activity Date: '+pobj.date+' '+pobj.time+'\n'+
									   'Working Agent: '+pobj.repname+'\n'+
									   'Retention Agent: '+pobj.retrepname+'\n'+
									   'Disposition: '+pobj.lostdispotext+'\n'+
									   'Financial Details:\n'+
									   pobj.offerdetail;
					
					var retnote = nlapiCreateRecord('note');
					retnote.setFieldValue('title', 'Retention -['+pobj.statusname+'] ('+pobj.activityid+')');
					retnote.setFieldValue('note', retNoteValue);
					retnote.setFieldValue('entity',pobj.customerid);
					nlapiSubmitRecord(retnote, true, true);
				} catch (retnoteerr) {
					log('error','Error Sync with Note',getErrText(retnoteerr));
				}
				
				
				//2. update customer with latest retention activities
				try {
					var updflds = new Array();
					var updvals = new Array();
					//based on retention activity being logged, update customer accordingly.
					if (!origStatusId || origStatusId==paramRetExitStatusAccept || origStatusId==paramRetExitStatusLost || origStatusId==paramRetExitStatusLost10) {
						//Customer is requesting to cancel
						//set status, entry time, duration, actid and null out the rest
						
						updflds = ['custentity_ax_retentcanceldispo', //Retention cancellation id
						           'custentity_ax_retactivitycontact', //Retention contact id
						           'custentity_ax_retentionstatus', //status
						           'custentity_ax_retactivityid',	//activity id
						           'custentity_ax_retenterdate',	//enter date
						           'custentity_ax_retentertime',	//enter time
						           'custentity_ax_retexitdate',		//exit date
						           'custentity_ax_retexittime',		//exit time
						           'custentity_ax_retduration',		//duration
						           'custentity_ax_retdurationnumerichh',	//duration in number
						           'custentity_ax_retentionrep_assigned' //Retention rep assigned
						          ];
						
						updvals = [pobj.lostdispo,
						           pobj.contactid,
						           pobj.status,
						           pobj.activityid,
						           pobj.date,
						           pobj.time,
						           '',
						           '',
						           '',
						           '',
						           ''];
						
						//Update Customer record with related fields FIRST for First time ENTRY into Cancellation Request
						nlapiSubmitField('customer', pobj.customerid, updflds, updvals, true);
						log('debug','1st Update of Customer on Cancel Request','Customer updated');
						//Reset updvals and updflds array for second update
						updflds = new Array();
						updvals = new Array();
					}
					
					//Do SECONDARY update based on new status 
					
					if (pobj.status == paramRetExitStatusAccept || pobj.status == paramRetExitStatusLost || pobj.status==paramRetExitStatusLost10) {
						//Customer is EXISTING retention
						
						//10/17/2014 - Cancellation Instruction logic
						var cancelInstruction = pobj.offerdetail;
						//if retained OR (LOST AND has (Has Offer type of Final Pay, Refund or Settlement), set instruction.
						if (pobj.status == paramRetExitStatusLost || pobj.status==paramRetExitStatusLost10) {
							cancelInstruction = '';
							log('debug','Offer Type', pobj.offertype.length);
							if (pobj.offertype) {
								var arOfferType = pobj.offertype;
								//loop thorugh each Offer Type and see if Final Pay, Refund or Settlement was offered
								for (var i=0; i < arOfferType.length; i++) {
									log('debug','Offer Type loop check', arOfferType[i]);
									//"1 or 2 (Yes or No)"="Final Payment Adjustment", "3"="Refund", "13",="Settlement"
									if (pobj.waivefinal=='1' || pobj.waivefinal=='2' || arOfferType[i]=='3' || arOfferType[i]=='13') {
										//cancelInstruction = pobj.offerdetail;
										//2/2/2015 - cancel instruction value should NOT include Auto balance value.
										cancelInstruction = pobj.offerdetailnobal;
										log('debug','Setting Instruction','Lost with Offer Type of: ', arOfferType[i]);
										break;
									}
								}
							}
						}
						
						//set status and exit date, time ONLY
						updflds = ['custentity_ax_retentcanceldispo',
						           'custentity_ax_retactivitycontact', //Retention contact id
						           'custentity_accountingcancelque', //In Queue for Accounting Changes
						           'custentity_ax_retentionstatus', //status
						           'custentity_ax_retexitdate',		//exit date
						           'custentity_ax_retexittime',		//exit time
						           'custentity_cancelinstructions'
						          ];
						
						updvals = ['',
						           '',
						           'T',
						           pobj.status,
						           pobj.date,
						           pobj.time,
						           cancelInstruction
						          ];
						
						var enterDateTime = req.getParameter('custpage_enterdatetime');
						var exitDateTime = pobj.date+' '+pobj.time;
						if (!enterDateTime) {
							//if enterDateTime is null, this is Entry and Close at the same time.
							//set enter time same as exit time
							enterDateTime = exitDateTime;
							log('debug','enterDateTime',enterDateTime);
						}
						
						
						try {
							var entertime = nlapiStringToDate(enterDateTime, 'datetimetz');
							var exittime = nlapiStringToDate(exitDateTime, 'datetimetz');
							
							log('debug','enter and exit time', entertime+' // '+exittime);
							
							var totalTimeDifference = exittime.getTime() - entertime.getTime();
							
							var retTotalMin = totalTimeDifference / 1000 / 60; 
							var retHourMinStr = Math.floor((retTotalMin/60))+':'+(retTotalMin % 60);
							
							//10/4/2014 - Set Hours in Decimal to be used in Search
							var retHourInDecimal = (retTotalMin/60);
							
							updflds.push('custentity_ax_retdurationnumerichh');
							updvals.push(retHourInDecimal);
							
							updflds.push('custentity_ax_retduration');
							updvals.push(retHourMinStr);
							
							
						} catch (datecalcerr) {
							log('error','Error calculating date',getErrText(datecalcerr));
						}
						
						//Below status values are coming from Company level script parameters
						//custentity_retcancelrequestresolution Resolution references Cancellation Final Status(s) LIST
						//	Retained with Changes = 2 paramRetResRetWithChanges
						//	Cancelled = 3 paramRetResCancelled
						
						//custentity_retentionstatus	Status	references Cancellation Status LIST
						//	In Queue for Account Processing = 9 paramRetResStatusInProgAcct
						
						//Set Status under Cancel to In Queue for Accounting
						updflds.push('custentity_retentionstatus');
						updvals.push(paramRetResStatusInProgAcct);
						
						//Set Cancellation Disposition
						updflds.push('custentity_retentiondisp');
						updvals.push(pobj.lostdispo);
						
						if (pobj.status == paramRetExitStatusAccept) {
							//Accepted offer.
							//Set Resolution to Retained with Changes
							updflds.push('custentity_retcancelrequestresolution');
							updvals.push(paramRetResRetWithChanges);
							
						} else {
							//Cancel.
							
							//Set Resolution to Cancelled
							updflds.push('custentity_retcancelrequestresolution');
							updvals.push(paramRetResCancelled);
							
							//Set Disposition Date
							updflds.push('custentity_retentiondispdate');
							updvals.push(pobj.date);
						}
						
						//6/19/2014 - When Existing Cancel to Request with ANY EXIT Status, grab Actual Baseline and Back it up to History.
						//		- Once backup is completed, Delete All Actual Baseline
						try {
							
							//1. get list of all base line for this customer.
							var bflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
							            new nlobjSearchFilter('custrecord_abmrr_customer', null, 'anyof',pobj.customerid)];
							var bcol = [new nlobjSearchColumn('internalid').setSort(),
							            new nlobjSearchColumn('custrecord_abmrr_item'), 
							            new nlobjSearchColumn('custrecord_abmrr_itemcategory'),
							            new nlobjSearchColumn('custrecord_abmrr_linevalue'),
							            new nlobjSearchColumn('custrecord_abmrr_startdate')];
							var brs = nlapiSearchRecord('customrecord_ax_baselinecustassets', null, bflt, bcol);
							
							//2. Loop through each result and back it up to history and delete the record
							//	- Max 3 to 4 baseline records will exist per customer. 
							for (var b=0; brs && b < brs.length; b++) {
								
								var histrec = nlapiCreateRecord('customrecord_ax_historicalbaseline');
								histrec.setFieldValue('custrecord_habmrr_customer', pobj.customerid);
								histrec.setFieldValue('custrecord_habmrr_item',brs[b].getValue('custrecord_abmrr_item'));
								histrec.setFieldValue('custrecord_habmrr_itemcategory',brs[b].getValue('custrecord_abmrr_itemcategory'));
								histrec.setFieldValue('custrecord_habmrr_linevalue',brs[b].getValue('custrecord_abmrr_linevalue'));
								histrec.setFieldValue('custrecord_habmrr_startdate',brs[b].getValue('custrecord_abmrr_startdate'));
								nlapiSubmitRecord(histrec, true, true);
								
								//Delete the actual
								nlapiDeleteRecord('customrecord_ax_baselinecustassets', brs[b].getId());
								
							}
							
						} catch (bkbaseerr) {
							log('error','Error Backingup and Deleting Baseline', getErrText(bkbaseerr));
						}
						
					} else {
						//All other status, it's in progress, ONLY update status
						updflds = ['custentity_ax_retentionstatus',
						           'custentity_ax_retactivitycontact',
						           'custentity_ax_retentcanceldispo',];
						
						updvals = [pobj.status,
						           pobj.contactid,
						           pobj.lostdispo];
					}
					
					//if Status is Sent to Retention, set retention rep id
					if (pobj.status == paramRetSentToRetStatus) {
						updflds.push('custentity_ax_retentionrep_assigned');
						updvals.push(pobj.retrepid);
					}
					
					//set the status custentity_top_message_val
					updflds.push('custentity_top_message');
					updvals.push(pobj.statusname);
					
					
					
					//Update Customer record with related fields
					nlapiSubmitField('customer', pobj.customerid, updflds, updvals, true);
					
					var c_indx = updflds.indexOf('custentity_retcancelrequestresolution');
					if(c_indx > -1){
						var c_val = updvals[c_indx];
						if(c_val == paramRetResCancelled){
							var customerRec = nlapiLoadRecord('customer', customerid);
							var ca411_customer_id = customerRec.getFieldValue('custentity411custid')?customerRec.getFieldValue('custentity411custid'):'';

							if(ca411_customer_id){
								initialize();
								a9rApiRequest.sendCancelStatus(ca411_customer_id, c_val);
							}
						}
					}
					
				} catch (updcusterr) {
					//Activity created but customer update failed
					throw nlapiCreateError('NOTIFYERR', 'Error Updating Customer. Activity has been logged but Customer update failed: '+getErrText(updcusterr), true);
				}
				
			} catch (retacterr) {
				//notify error to user and finance
				log('error','Proc Error',getErrText(retacterr));
				nlapiSendEmail(-5, nlapiGetContext().getUser(), 'Error Processing Retention Activity', getErrText(retacterr)+'<br/><br/>'+postdatastring, null, null, records, null);
			}

			//redirect to Suitelet with parameters
			var redirparam = new Object();
			redirparam['custparam_customerid'] = pobj.customerid;
			redirparam['custparam_done'] = 'yes';
			nlapiSetRedirectURL('SUITELET', nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), 'VIEW', redirparam);
			return;
		}
		
		//---------------------------- GET ACTION---------------------------------
		
		//custom build retention status list for display manipulation
		var retStatsJson = {};
		var rsflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
		var rscol = [new nlobjSearchColumn('custrecord_ars_displayorder').setSort(),
		             new nlobjSearchColumn('name'),
		             new nlobjSearchColumn('custrecord_ars_desc')];
		var rsrs = nlapiSearchRecord('customrecord_ax_retention_status', null, rsflt, rscol);
		for (var r=0; rsrs && r < rsrs.length; r++) {
			retStatsJson[rsrs[r].getId()] = {
				"name":rsrs[r].getValue('name'),
				"desc":rsrs[r].getValue('custrecord_ars_desc')
			};
		}
		
		//build contact list for customer
		var contactJson = {};
		//search for ALL contacts for client
		var cflt = [new nlobjSearchFilter('internalid', null, 'anyof', customerid),
		            new nlobjSearchFilter('isinactive','contact','is','F')];
		var ccol = [new nlobjSearchColumn('internalid', 'contact',null),
		            new nlobjSearchColumn('company', 'contact',null),
		            new nlobjSearchColumn('firstname', 'contact',null),
		            new nlobjSearchColumn('lastname', 'contact',null).setSort()];
		var crs = nlapiSearchRecord('customer', null, cflt, ccol);
		
		//Latest Changes request - Add Billing Day, Balance
		var customerRec = nlapiLoadRecord('customer', customerid);
		var billingDay = customerRec.getFieldValue('custentity_monthlybillingday')?customerRec.getFieldValue('custentity_monthlybillingday'):'';
		var customerBalance=customerRec.getFieldValue('balance')?customerRec.getFieldValue('balance'):0.0;
		
		for (var c=0; crs && c < crs.length; c++) {
			contactJson[crs[c].getValue('internalid', 'contact', null)]=crs[c].getValue('firstname', 'contact', null)+' '+crs[c].getValue('lastname', 'contact', null);
		}
		
		//get latest profile for this customer
		//9/30/2014 - Adding value of Website for expected value calculation
		var profileJson = {
			'total':0.0,
			'website':0.0,
			'category':new Array()
		};
		var pflt = [new nlobjSearchFilter('custrecord_abmrr_customer', null, 'anyof', customerid),
		            new nlobjSearchFilter('isinactive', null, 'is', 'F')];
		var pcol = [new nlobjSearchColumn('custrecord_abmrr_itemcategory',null,'group'),
		            new nlobjSearchColumn('custrecord_abmrr_linevalue', null, 'sum')];
		var prs = nlapiSearchRecord('customrecord_ax_baselinecustassets', null, pflt, pcol);
		for (var p=0; prs && p < prs.length; p++) {
			var catLineValue = (prs[p].getValue('custrecord_abmrr_linevalue', null, 'sum'))?parseFloat(prs[p].getValue('custrecord_abmrr_linevalue', null, 'sum')):0.0;
			var catId = prs[p].getValue('custrecord_abmrr_itemcategory',null,'group');
			var catText = prs[p].getText('custrecord_abmrr_itemcategory',null,'group');
			profileJson.total = parseFloat(profileJson.total) + catLineValue;
			
			//9/30/2014 - If catText is Website, add to Website total
			if (catText == 'Website') {
				profileJson.website = parseFloat(profileJson.website) + catLineValue;
			}
			
			var cobj = new Object();
			cobj.id = catId;
			cobj.text = catText;
			cobj.value = catLineValue;
			profileJson.category.push(cobj);
		}
		
		//------------------------- Draw out form ---------------------
		
		//primary info
		//Col A
		nsform.addFieldGroup('custpage_grpa', 'Primary Information', null);
		
		var custnamefld = nsform.addField('custpage_customerdisplay','text','Customer',null,'custpage_grpa');
		custnamefld.setDisplayType('inline');
		custnamefld.setDefaultValue(customername+' ('+customerid+')');
		custnamefld.setBreakType('startcol');
		
		var custidfld = nsform.addField('custpage_customerid','text','Customer ID',null,'custpage_grpa');
		custidfld.setDisplayType('hidden');
		custidfld.setDefaultValue(customerid);
		
		var actidfld = nsform.addField('custpage_actid','text','Activity ID',null,'custpage_grpa');
		actidfld.setDisplayType('disabled');
		actidfld.setMandatory(true);
		actidfld.setDefaultValue(activityid);
		
		//Disposition for LOST
		//Use Cancellation Disposition (customlist_retentiondispositions)
		var lostDispofld = nsform.addField('custpage_lostdispo','select','Cancellation Disposition','customlist_retentiondispositions', 'custpage_grpa');
		lostDispofld.setMandatory(true);
		lostDispofld.setDefaultValue(retdispoid);
		
		var lostDispotextfld = nsform.addField('custpage_lostdisptext','text','',null,'custpage_grpa');
		lostDispotextfld.setDisplayType('hidden');
		
		var contactfld = nsform.addField('custpage_contact', 'select', 'Contact', null, 'custpage_grpa');
		contactfld.addSelectOption('', '', true);
		contactfld.setMandatory(true);
		for (var cj in contactJson) {
			contactfld.addSelectOption(cj, contactJson[cj], false);
		}
		contactfld.setDefaultValue(retcontactid);
		
		var contacttextfld = nsform.addField('custpage_contactname', 'text', '', null, 'custpage_grpa');
		contacttextfld.setDisplayType('hidden');
		
		//Col B
		var curDate = new Date();
		var actdatefld = nsform.addField('custpage_actdate', 'date', 'Date of Activity', null, 'custpage_grpa');
		actdatefld.setMandatory(true);
		actdatefld.setDefaultValue(nlapiDateToString(curDate));
		actdatefld.setDisplayType('disabled');
		actdatefld.setBreakType('startcol');
		
		var acttimefld = nsform.addField('custpage_acttime', 'timeofday', 'Time of Activity', null, 'custpage_grpa');
		acttimefld.setMandatory(true);
		acttimefld.setDefaultValue(nlapiDateToString(curDate,'timeofday'));
		acttimefld.setDisplayType('disabled');
		
		var retassignfld = nsform.addField('custpage_assign','select','Activity Rep', 'employee', 'custpage_grpa');
		//retassignfld.setMandatory(true);
		retassignfld.setDefaultValue(nlapiGetContext().getUser());
		retassignfld.setDisplayType('disabled');
		
		var retassigntextfld = nsform.addField('custpage_assignname', 'text', '', null, 'custpage_grpa');
		retassigntextfld.setDisplayType('hidden');
		retassigntextfld.setDefaultValue(nlapiGetContext().getName());
		
		
		//Col C
		var billingDayFld = nsform.addField('custpage_billday','text','Billing Day',null,'custpage_grpa');
		billingDayFld.setDefaultValue(billingDay);
		billingDayFld.setBreakType('startcol');
		billingDayFld.setDisplayType('inline');
		
		var balanceFld = nsform.addField('custpage_balance','currency','Balance',null,'custpage_grpa');
		balanceFld.setDefaultValue(customerBalance);
		balanceFld.setDisplayType('inline');
		
		//Col D
		var profilefld = nsform.addField('custpage_profile','inlinehtml','',null,'custpage_grpa');
		profilefld.setBreakType('startcol');
		
		//9/30/2014 - Add in hidden value fields for profile total and website total
		//Profile Total
		var profileTotalFld = nsform.addField('custpage_profiletotal','currency','Profile Total Amount',null,'custpage_grpa');
		profileTotalFld.setDisplayType('hidden');
		profileTotalFld.setDefaultValue(profileJson.total);
		//Profile Website Total
		var profileWebsiteFld = nsform.addField('custpage_profilewebtotal', 'currency', 'Profile Website Total Amount',null,'custpage_grpa');
		profileWebsiteFld.setDisplayType('hidden');
		profileWebsiteFld.setDefaultValue(profileJson.website);
		//Total Profile Delta Value
		var profileDeltaFld = nsform.addField('custpage_profiledelta','currency','Profile Delta Amount',null,'custpage_grpa');
		profileDeltaFld.setDisplayType('hidden');
		
		var profileHtml = '<b>Current Profile Value: $'+profileJson.total+'</b>';
		if (profileJson.category.length > 0) {
			profileHtml +='<br/>';
				
			for (var p=0; p < profileJson.category.length; p++) {
				profileHtml += profileJson.category[p].text+': $'+profileJson.category[p].value+'<br/>';
			}
		}
		profilefld.setDefaultValue(profileHtml);

		//Retention Activity Details
		//Col A
		nsform.addFieldGroup('custpage_grpb', 'Retention Activity Details', null);
		
		
		var offertypefld = nsform.addField('custpage_offertype', 'multiselect', 'Offer Type', null, 'custpage_grpb');
		offertypefld.setMandatory(true);
		offertypefld.setDisplaySize(235, 16);
		offertypefld.setBreakType('startcol');
		offertypefld.addSelectOption('', '', true);
		//get list of offer type via search and don't allow people to add in ad-hoc
		//	This is becuase additional field may require related data value entry
		var otflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
		var otcol = [new nlobjSearchColumn('name'),
		             new nlobjSearchColumn('custrecord_axrot_order').setSort()];
		var otrs = nlapiSearchRecord('customrecord_ax_retention_offertype', null, otflt, otcol);
		for (var ot=0; otrs && ot < otrs.length; ot++) {
			offertypefld.addSelectOption(otrs[ot].getId(), otrs[ot].getValue('name'), false);
		}
		var offertypetextfld = nsform.addField('custpage_offertypename', 'text', '', null, 'custpage_grpb');
		offertypetextfld.setDisplayType('hidden');

		//Mod req: 5/16/2014 - add in related field values based on offer type selection
		
		//9/18/2014 - Hide all related fields until linked offer type is selected.
		var relOffTypeIntroFld = nsform.addField('custpage_relotintro', 'inlinehtml', '', null, 'custpage_grpb');
		relOffTypeIntroFld.setDefaultValue('<br/><b>Options for Selected Offer Type(s)</b><br/>');
		relOffTypeIntroFld.setBreakType('startcol');

		//PIF related fields
		
		//PIF Starting Date custrecord_acra_pif_startdate
		var pifstartdt = nsform.addField('custpage_pifstartdt','date','PIF Starting Date', null, 'custpage_grpb');
		pifstartdt.setDisplayType('disabled');
		
		//PIF # Free Month custrecord_acra_pif_numfreemonth
		var numfreepifmonths = nsform.addField('custpage_numfreepifmonths', 'integer', '# of PIF\'s Free Months', null, 'custpage_grpb');
		numfreepifmonths.setDisplayType('disabled');
		
		//PIF # Paid Month custrecord_acra_pif_numpaidmonth
		var numpaidpifmonths = nsform.addField('custpage_numpaidpifmonths', 'integer', '# of PIF\'s Paid Months (Terms)', null, 'custpage_grpb');
		numpaidpifmonths.setDisplayType('disabled');
		
		//PIF Total Amount custrecord_acra_pif_totalamount
		var piftotalamt = nsform.addField('custpage_piftotalamt','currency','PIF Total Amount ($)', null, 'custpage_grpb');
		piftotalamt.setDisplayType('disabled');
		
		//PIF Monthly Amount custrecord_acra_pif_monthlyamount
		var pifmonthlyamt = nsform.addField('custpage_pifmonthlyamt','currency','PIF Monthly Amount ($)', null, 'custpage_grpb');
		pifmonthlyamt.setDisplayType('disabled');
		
		//Website realted fields.
		
		//Website offer type options custrecord_acra_website_option
		var websiteoption = nsform.addField('custpage_websiteoption','select','Website Offer Option', 'customlist_ax_websiteofferoption', 'custpage_grpb');
		websiteoption.setDisplayType('disabled');
		
		//custrecord_acra_website_discountamt referencing customlist_ax_websiteofferoption custom list
		var websitediscount = nsform.addField('custpage_websitediscount','currency','Website Price ($)',null,'custpage_grpb');
		websitediscount.setDisplayType('disabled');
		
		//Settlement related fields
		//Settlement amount custrecord_acra_settlementamt
		var settlementamt = nsform.addField('custpage_settlementamt','currency','Settlement Amount/Balance Owing (after tax)', null, 'custpage_grpb');
		settlementamt.setDisplayType('disabled');
		
		//Discount Amount $ custrecord_acra_discount
		var discamt = nsform.addField('custpage_discamt', 'currency', 'New Downgrade Price (before tax)', null, 'custpage_grpb');
		discamt.setDisplayType('disabled');
		
		//Final Payment Waived
		//Mod Request - 10/24/2014 - Moved under Retention Status as requested by Client
		
		//Refund
		var refundamt = nsform.addField('custpage_refundamt','currency','Refund Amount (after tax)', null, 'custpage_grpb');
		refundamt.setDisplayType('disabled');
		
		//Upsell
		var upsellamt = nsform.addField('custpage_upsellamt','currency','Upsell Amount ($)', null, 'custpage_grpb');
		upsellamt.setDisplayType('disabled');
		
		//# free months custrecord_acra_freemonths
		//Complimentary End Date	custrecord_acra_comp_enddate
		//Complimentary Month Start		custrecord_acra_comp_startdate
		var shortdiscamt = nsform.addField('custpage_shortdiscamt', 'currency', 'New Short term Amount (before tax)', null, 'custpage_grpb');
		shortdiscamt.setDisplayType('disabled');
		
		var discstartdt = nsform.addField('custpage_discstartdt','date','Short term Discount Start Date', null, 'custpage_grpb');
		discstartdt.setDisplayType('disabled');
		
		var discenddt = nsform.addField('custpage_discenddt','date','Short term Discount End Date', null, 'custpage_grpb');
		discenddt.setDisplayType('disabled');
		
		//# free months custrecord_acra_freemonths
		//Complimentary End Date	custrecord_acra_comp_enddate
		//Complimentary Month Start		custrecord_acra_comp_startdate
		var numfreemonths = nsform.addField('custpage_numfreemonths', 'integer', '# of Free Months', null, 'custpage_grpb');
		numfreemonths.setDisplayType('disabled');
		
		var compstartdt = nsform.addField('custpage_compstartdt','date','Complimentary Start Date', null, 'custpage_grpb');
		compstartdt.setDisplayType('disabled');
		
		var compenddt = nsform.addField('custpage_compenddt','date','Complimentary End Date', null, 'custpage_grpb');
		compenddt.setDisplayType('disabled');
		
		//1/5/2015 - Add in Google Retention Detail text field
		var googleRetDetfld = nsform.addField('custpage_googleretfld','text','Google Retention Detail', null, 'custpage_grpb');
		googleRetDetfld.setDisplayType('disabled');

		//hidden original
		var statusfld = nsform.addField('custpage_status', 'select', 'Retention Status', null, 'custpage_grpb');
		statusfld.addSelectOption('', '', true);
		statusfld.setMandatory(true);
		
		//10/20/2014 - If Logged in user is retention rep, ONLY show Level II list.
		var rrflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		             new nlobjSearchFilter('custrecord_arre_rep', null, 'anyof', nlapiGetContext().getUser())];
		var rrcol = [new nlobjSearchColumn('internalid').setSort()];
		var rrrs = nlapiSearchRecord('customrecord_ax_retention_repemps', null, rrflt, rrcol);
		var isRetentionRep = false;
		if (rrrs && rrrs.length > 0) {
			isRetentionRep = true;
		}
				
		for (var rsj in retStatsJson) {
			
			if (isRetentionRep || retstatusid==paramRetInProgressByRetRepStatus || retstatusid == paramRetSentToRetStatus) {
				
				if (rsj == paramRetExitStatusAccept || rsj == paramRetExitStatusLost || rsj==paramRetExitStatusLost10 || rsj == paramRetInProgressByRetRepStatus) {
					
					statusfld.addSelectOption(rsj, retStatsJson[rsj].name, false);
				}
				
			} else {
				if (rsj != paramRetEntryStatus && rsj != paramRetInProgressByRetRepStatus) {
					
					statusfld.addSelectOption(rsj, retStatsJson[rsj].name, false);
				}
			}			
		}
		statusfld.setBreakType('startcol');
		
		//Final Payment Waived
		//Mod Request - 10/24/2014 - Moved under Retention Status as requested by Client
		var finalpaywaive = nsform.addField('custpage_finalpaywaive','select','Final Payment Waived', 'customlist_yesno', 'custpage_grpb');
		finalpaywaive.setDisplayType('normal');
		
		//Final Payment Waived Amount
		var finalpaywaiveamt = nsform.addField('custpage_finalpaywaiveamt','currency', 'Final Payment Amount', null, 'custpage_grpb');
		finalpaywaiveamt.setDisplayType('normal');
		
		
		
		var statusfromcust = nsform.addField('custpage_origstatus','text','Status from customer', null, 'custpage_grpb');
		statusfromcust.setDefaultValue(retstatusid);
		statusfromcust.setDisplayType('hidden');
		
		//When status from customer record is entry OR it's one of the exit, reset status to Entry.
		//if (!retstatusid || (retstatusid == paramRetExitStatusAccept || retstatusid == paramRetExitStatusLost)) {
			statusfld.setDefaultValue(paramRetEntryStatus);
			//statusfld.setDisplayType('disabled');
		//}
		
		var statustextfld = nsform.addField('custpage_statusname', 'text', '', null, 'custpage_grpb');
		statustextfld.setDisplayType('hidden');
		
		//Cancellation Disposition field moved based on request to primary area.
		
		var offerdetailfld = nsform.addField('custpage_offerdetail','textarea','Offer Details', null, 'custpage_grpb');
		offerdetailfld.setDisplaySize(70, 10);
		//5/22/2014
		//- Initially Disabled, when offer types other than # free months and Discount is selected, it becomes required and enabled.
		offerdetailfld.setDisplayType('disabled');
		
		//2/2/2015 - Hidden offer detail field with NO balance value. 
		//			 Value set on this field is to be used on Account Cancellation Instruction
		var offerdetailnobalfld = nsform.addField('custpage_offerdetailnobal','textarea','Offer Details No Balance', null, 'custpage_grpb');
		offerdetailnobalfld.setDisplayType('hidden');
		
		//6/5/2014 - Allow users to enter internal notes during retention process
		var internalnotefld = nsform.addField('custpage_internalnotes','textarea','Internal Notes', null, 'custpage_grpb');
		internalnotefld.setDisplaySize(70, 10);
		//internalnotefld.setBreakType('startcol');
		
		//add submit button
		nsform.addSubmitButton('Log Activity');
		
	} catch (slerr) {
		msgfld.setDefaultValue(getErrText(slerr));
	}
	
	
	res.writePage(nsform);
	
}