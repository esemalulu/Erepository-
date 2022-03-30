var openOppStatusIds = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_openstatusids').split(',');
//Loop through each status ID and trim any empty spaces
for (var os=0; openOppStatusIds && os < openOppStatusIds.length; os++) {
	openOppStatusIds[os] = strTrim(openOppStatusIds[os]);
}
var primeNotifer = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_primenotif');
var ccNotifier = null;
if (nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_ccnotif')) {
	ccNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_ccnotif').split(',');
}

var paramPrjNewId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_prjnew');
var paramPrjNeutralId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_prjnet');
var paramPrjUpId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_prjup');
var paramPrjDownId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_prjdown');
var paramPrjTerminationId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_prjterm');

var paramHistPossibleId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_histpossible');
var paramHistActualId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_histactual');

var paramSubStatusRenewedId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_substrenew');
var paramSubStatusTerminateId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_substtermin');

//Script level parameter
var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_nsax_initmrrid');
var paramInitializeDate = nlapiGetContext().getSetting('SCRIPT', 'custscript_nsax_initmrrdate');

function importInitialMrrData() {
	try {
		
		//1 Search for UNProcessed Initial Load Baseline Data imported into AUX:Initial Baseline Load
		var iflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		            new nlobjSearchFilter('custrecord_aibl_processed', null, 'is', 'F')];
		
		//1a. Bring in additional columns added to accomodate catch net new MRR
		var icol = [new nlobjSearchColumn('internalid').setSort(true),
		            new nlobjSearchColumn('custrecord_aibl_isinitial'), //flag to indicate if it's initial import. IF not checked, it's catch up Net new
		            new nlobjSearchColumn('custrecord_aibl_customerid'),
		            new nlobjSearchColumn('custrecord_aibl_itemid'),
		            new nlobjSearchColumn('custrecord_aibl_itemname'),
		            new nlobjSearchColumn('custrecord_aibl_totalamt'),
		            new nlobjSearchColumn('custrecord_aibl_soid'), //Internal ID of Sales Order
		            new nlobjSearchColumn('custrecord_aibl_oppid'), //Internal ID of Opportunity
		            new nlobjSearchColumn('custrecord_aibl_sodate'), //Sales Order Date
		            new nlobjSearchColumn('custrecord_aibl_oppdate'), //Opportunity Date
		            new nlobjSearchColumn('custrecord_aibl_sofulfilldate'), //SO Fulfillment Date
		            new nlobjSearchColumn('custrecord_aibl_sonumber') //SO Trx Number
		            ];
		var irs = nlapiSearchRecord('customrecord_ax_initbaselineload', null, iflt, icol);
		
		//2. Loop through each result and create actual then historical
		//
		for (var i=0; irs && i < irs.length; i++) {
			
			//2a. Create Actual MRR record for this Customer
			var actualName = 'Initial-'+irs[i].getValue('custrecord_aibl_itemname')+'('+irs[i].getValue('custrecord_aibl_customerid')+')';
			var soffdateobj = new Date(paramInitializeDate);
			
			var customerId = irs[i].getValue('custrecord_aibl_customerid');
			var itemId = irs[i].getValue('custrecord_aibl_itemid');
			var totalAmount = irs[i].getValue('custrecord_aibl_totalamt');
			log('debug','actualName', actualName);
			
			var newActMrr = nlapiCreateRecord('customrecord_ax_baseline_mrr');
			newActMrr.setFieldValue('name',actualName);
			newActMrr.setFieldValue('custrecord_abmrr_soffdt',paramInitializeDate);
			newActMrr.setFieldValue('custrecord_abmrr_entenddate',paramInitializeDate);
			//default to renewed
			newActMrr.setFieldValue('custrecord_abmrr_subs_status',paramSubStatusRenewedId);
			newActMrr.setFieldValue('custrecord_abmrr_customer',customerId);
			newActMrr.setFieldValue('custrecord_abmrr_item',itemId);
			newActMrr.setFieldValue('custrecord_abmrr_linevalue',totalAmount);
			newActMrr.setFieldValue('custrecord_abmrr_rptdate', paramInitializeDate);
			
			//2a. Check to see if it's catch up net new client
			if (irs[i].getValue('custrecord_aibl_isinitial') != 'T') {
				
				soffdateobj = new Date(irs[i].getValue('custrecord_aibl_sofulfilldate'));
				
				//Change the actualName to include Sales Order Number
				actualName = 'SO# '+irs[i].getValue('custrecord_aibl_sonumber')+'-'+irs[i].getValue('custrecord_aibl_itemname')+'('+irs[i].getValue('custrecord_aibl_customerid')+')';
				
				//set additional fields or replace value of field.
				//Replace Sales Order Fulfilled Date
				newActMrr.setFieldValue('custrecord_abmrr_soffdt',irs[i].getValue('custrecord_aibl_sofulfilldate'));
				//Replace Entitlement Satrt Date to SO Fulfilled Date
				newActMrr.setFieldValue('custrecord_abmrr_entenddate',irs[i].getValue('custrecord_aibl_sofulfilldate'));
				//Replace out Report Date based on SO Fulfilled Date
				newActMrr.setFieldValue('custrecord_abmrr_rptdate', (soffdateobj.getMonth()+1)+'/1/'+soffdateobj.getFullYear());
				
				//Add Sales order Link
				newActMrr.setFieldValue('custrecord_abmrr_salesorder', irs[i].getValue('custrecord_aibl_soid'));
			}
			
			try {
				var amrrId = mapAmrrId = nlapiSubmitRecord(newActMrr, true, true);
								
				//2b. Create Matching Historical MRR Record.
				var hmrrRec = nlapiCreateRecord('customrecord_ax_historybaseline_mrr');
				hmrrRec.setFieldValue('custrecord_hbmrr_customer', customerId);
				hmrrRec.setFieldValue('custrecord_hbmrr_item', itemId);
				hmrrRec.setFieldValue('custrecord_hbmrr_abmrr_ref', amrrId);
				hmrrRec.setFieldValue('custrecord_hbmrr_rptdate',paramInitializeDate);
				hmrrRec.setFieldValue('custrecord_hbmrr_linevalue', totalAmount);
				//Default History Type to Possible
				hmrrRec.setFieldValue('custrecord_hbmrr_historytype', paramHistActualId);
				hmrrRec.setFieldValue('custrecord_hbmrr_projection', paramPrjNewId);
				hmrrRec.setFieldValue('custrecord_hbmrr_soffdt', paramInitializeDate);
				hmrrRec.setFieldValue('custrecord_hbmrr_entenddate', paramInitializeDate);
				hmrrRec.setFieldValue('custrecord_hbmrr_acctualrptdate', paramInitializeDate);
				
				//2b. Check to see if it's catch up net new client
				if (irs[i].getValue('custrecord_aibl_isinitial') != 'T') {
					//Look up additional information from Opportunity to set the date
					var oppLookupFlds = ['expectedclosedate','closedate'];
					var oppLookupVals = nlapiLookupField('opportunity', irs[i].getValue('custrecord_aibl_oppid'), oppLookupFlds, false);
					
					var oppExpectedCloseDate = oppLookupVals['expectedclosedate'];
					var oppActualCloseDate = oppLookupVals['closedate'];
					
					var oppExpCloDateObj = new Date(oppExpectedCloseDate);
					
					//Replace Reporting Date of Historical MRR record
					hmrrRec.setFieldValue('custrecord_hbmrr_rptdate',(oppExpCloDateObj.getMonth()+1)+'/1/'+oppExpCloDateObj.getFullYear());
					
					//Replace Opp Actual Close Date 
					hmrrRec.setFieldValue('custrecord_hbmrr_poactualclosedt', oppActualCloseDate);
					
					hmrrRec.setFieldValue('custrecord_hbmrr_soffdt', nlapiDateToString(soffdateobj));
					hmrrRec.setFieldValue('custrecord_hbmrr_entenddate', nlapiDateToString(soffdateobj));
					
					//Add Actual Report Date
					hmrrRec.setFieldValue('custrecord_hbmrr_acctualrptdate', (soffdateobj.getMonth()+1)+'/1/'+soffdateobj.getFullYear());
					
					//Add Opp Expected Close Date
					hmrrRec.setFieldValue('custrecord_hbmrr_poexpclosedt', oppExpectedCloseDate);
					
					//Add Opp Created Date
					hmrrRec.setFieldValue('custrecord_hbmrr_pocreatedt', irs[i].getValue('custrecord_aibl_oppdate'));
					
					//Add Opportunity Link
					hmrrRec.setFieldValue('custrecord_hbmrr_opportunity', irs[i].getValue('custrecord_aibl_oppid'));
					
					//Add Sales Order Link
					hmrrRec.setFieldValue('custrecord_hbmrr_so', irs[i].getValue('custrecord_aibl_soid'));
				}
				
				
				try {
					nlapiSubmitRecord(hmrrRec, true, true);
					
					//mark import rec as processed
					nlapiSubmitField('customrecord_ax_initbaselineload', irs[i].getId(), 'custrecord_aibl_processed', 'T', false);
					
				} catch (histmrrerr) {
					log('error','Error creating History','Import Rec ID: '+irs[i].getId()+' // Customer ID: '+customerId+' // Item ID: '+itemId);
					//if error occured while attempting to create matching historical, delete new actual created.
					nlapiDeleteRecord('customrecord_ax_baseline_mrr', amrrId);
				}
				
			} catch (actmrrerr) {
				log('error','Error creating Actual MRR','Import Rec ID: '+irs[i].getId()+' // Customer ID: '+customerId+' // Item ID: '+itemId);
			}
				
			//get ALL Active (Regardless of Subscription Status) Actual MRR for Customer
			try {
				var rcaflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
				              new nlobjSearchFilter('custrecord_abmrr_customer', null, 'anyof',customerId),
				              new nlobjSearchFilter('custrecord_abmrr_subs_status', null, 'noneof','2')];
				var rcacol = [new nlobjSearchColumn('custrecord_abmrr_linevalue', null, 'sum')];

				var rcars = nlapiSearchRecord('customrecord_ax_baseline_mrr', null, rcaflt, rcacol);
				if (rcars && rcars.length > 0) {
					var actualMrrVal = rcars[0].getValue('custrecord_abmrr_linevalue', null, 'sum');
					nlapiSubmitField('customer', customerId, 'custentity_ax_calc_amrr', actualMrrVal, false);
				}
			} catch (recalcerr) {
				log('error','Err Actual MRR Recalc','Error Recalculation Actual for Customer Internal ID '+customerId+': '+getErrText(recalcerr));

			}
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / irs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			if ((i+1)==1000 || (i < (i+1) && nlapiGetContext().getRemainingUsage() < 200)) {
				//reschedule
				var param = new Object();				
				param['custscript_nsax_initmrrid'] = irs[i].getId();
				param['custscript_nsax_initmrrdate'] = paramInitializeDate;
				
				var qstatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
				if (qstatus == 'QUEUED') {
					break;
				}
			}
		}
		
	} catch (initmrrerr) {
		
		throw nlapiCreateError('AXMrrInitError', getErrText(initmrrerr), false);
		
	}
}