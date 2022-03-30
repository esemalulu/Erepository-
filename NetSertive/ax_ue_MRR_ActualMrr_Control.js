/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Mar 2014     AnJoe
 *
 */

/**
 * Comma separated list of entity status IDs that identifies OPEN Opportunities
 * Paramter is set at Company preference level (Setup > Company > General Preferences > Custom Preferences > Open Opportunity Status IDs
 */
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

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function amrrAfterSubmit(type){

	if (type != 'delete') {
		
		try {
			var oldRec = nlapiGetOldRecord();
			var amrrRec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
			//check to see if termination date is set and changed
			var oldTermDate = (oldRec)?oldRec.getFieldValue('custrecord_abmrr_terminationdt'):'';
			var newTermDate = amrrRec.getFieldValue('custrecord_abmrr_terminationdt');
			
			var oldSubStatus = (oldRec)?oldRec.getFieldValue('custrecord_abmrr_subs_status'):'';
			var newSubStatus = amrrRec.getFieldValue('custrecord_abmrr_subs_status');
			
			log('debug','old // new',oldTermDate+' // '+newTermDate+' ///// '+oldSubStatus+' // '+newSubStatus);
			
			//if ((oldTermDate != newTermDate) || (oldSubStatus != newSubStatus)) {
			if (oldTermDate != newTermDate) {
				log('debug','Term date is different, update history','');
				var customerId = amrrRec.getFieldValue('custrecord_abmrr_customer');
				var salesOrderId = amrrRec.getFieldValue('custrecord_abmrr_salesorder');
				var mrrItem = amrrRec.getFieldValue('custrecord_abmrr_item');
				
				if (!customerId || !mrrItem) {
					log('error','missing required info','AMRR ID: '+nlapiGetRecordId());
					return;
				}
				
				//search for matching history
				var hflt = [new nlobjSearchFilter('custrecord_hbmrr_customer', null, 'anyof', customerId),
				            //new nlobjSearchFilter('custrecord_hbmrr_so', null, 'anyof', salesOrderId),
				            new nlobjSearchFilter('custrecord_hbmrr_item', null, 'anyof', mrrItem),
				            new nlobjSearchFilter('custrecord_hbmrr_abmrr_ref', null, 'anyof', amrrRec.getId())];
				
				//if Sales order is passed in, use it as filter
				if (salesOrderId) {
					hflt.push(new nlobjSearchFilter('custrecord_hbmrr_so', null, 'anyof', salesOrderId));
				}
				
				var hcol = [new nlobjSearchColumn('custrecord_hbmrr_termdt'),
				            new nlobjSearchColumn('custrecord_hbmrr_historytype'),
				            new nlobjSearchColumn('custrecord_hbmrr_projection'),
				            new nlobjSearchColumn('custrecord_hbmrr_pocreatedt'),
				            //also grab Name of actual to check for Initial load
				            new nlobjSearchColumn('name','custrecord_hbmrr_abmrr_ref'),
				            //also grab History type to check for Initial Load
				            new nlobjSearchColumn('custrecord_hbmrr_historytype'),
				            //also grab projection type to check for Initial Load
				            new nlobjSearchColumn('custrecord_hbmrr_projection')];
				
				var hrs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, hflt, hcol);
				
				//History record to indicate termination will always be MISSING Opp Created Date
				var terminationHistoryRecId = '';
				var actualHistoryRecId = '';
				
				//There should ALWAYS be one
				for (var h=0; hrs && h < hrs.length; h++) {
					
					if (!salesOrderId) {
						//if sales order is missing assume it's Initial load to run different validation to grab actual and termination ID
						var actualName = hrs[h].getValue('name','custrecord_hbmrr_abmrr_ref');
						if (actualName.indexOf('Initial-') >=0) {
							//if Initial Load, use Param History type and Projection type to determin actual and terminated value
							if (hrs[h].getValue('custrecord_hbmrr_historytype') == paramHistActualId) {
								actualHistoryRecId = hrs[h].getId();
							} else if (hrs[h].getValue('custrecord_hbmrr_projection') == paramPrjTerminationId){
								terminationHistoryRecId = hrs[h].getId();
							}
						}
						
					} else {
						//loop through and update based on regular process
						if (hrs[h].getValue('custrecord_hbmrr_pocreatedt')) {
							actualHistoryRecId = hrs[h].getId();
						} else {
							terminationHistoryRecId = hrs[h].getId();
						}
					}
				}
				
				
				
				//when newTermDate is set
				//update actual
				nlapiSubmitField('customrecord_ax_historybaseline_mrr', actualHistoryRecId, 'custrecord_hbmrr_termdt', newTermDate, false);
				if (newTermDate) {
					//There is NO termination history rec, Create it
					//Set Opp Expected Close Date to be Termination Date
					//Set Reporting Period Date to be Termination Date 1st of
					var termDateObj = new Date(newTermDate);
					var termRptDate = (termDateObj.getMonth()+1)+'/1/'+termDateObj.getFullYear();
					
					//if new term date is NOT blank
					if (terminationHistoryRecId) {
						//There is termination history rec, update it
						var updfld = ['custrecord_hbmrr_termdt','custrecord_hbmrr_poexpclosedt','custrecord_hbmrr_rptdate','custrecord_hbmrr_soffdt','custrecord_hbmrr_acctualrptdate'];
						var updval = [newTermDate, newTermDate, termRptDate, newTermDate, termRptDate];
						nlapiSubmitField('customrecord_ax_historybaseline_mrr', terminationHistoryRecId, updfld, updval, false);
					} else {
						
						var histTermRec = nlapiCreateRecord('customrecord_ax_historybaseline_mrr');
						histTermRec.setFieldValue('custrecord_hbmrr_customer', customerId);
						histTermRec.setFieldValue('custrecord_hbmrr_so', salesOrderId);
						histTermRec.setFieldValue('custrecord_hbmrr_item', mrrItem);
						histTermRec.setFieldValue('custrecord_hbmrr_abmrr_ref', amrrRec.getId());
						histTermRec.setFieldValue('custrecord_hbmrr_linevalue', '0.0');
						//2/24/2016 - Add in tech. value tracking
						histTermRec.setFieldValue('custrecord_hbmrr_techlinevalue','0.0');
						histTermRec.setFieldValue('custrecord_hbmrr_termdt', newTermDate);
						histTermRec.setFieldValue('custrecord_hbmrr_poexpclosedt', newTermDate);
						histTermRec.setFieldValue('custrecord_hbmrr_soffdt', newTermDate);
						histTermRec.setFieldValue('custrecord_hbmrr_rptdate', termRptDate);
						histTermRec.setFieldValue('custrecord_hbmrr_projection', paramPrjTerminationId);
						histTermRec.setFieldValue('custrecord_hbmrr_historytype', paramHistPossibleId);
						histTermRec.setFieldValue('custrecord_hbmrr_acctualrptdate', termRptDate);
						nlapiSubmitRecord(histTermRec, false, true);
					}
					
				}
				
				//IF New Termination Date is Blank AND there is termination history rec, delete it
				if (!newTermDate && terminationHistoryRecId) {
					nlapiDeleteRecord('customrecord_ax_historybaseline_mrr', terminationHistoryRecId);
				}
			}
			
		} catch (amrraferr) {
			
			log('error','Actual To Mrr Sync',getErrText(amrraferr));
			nlapiSendEmail(-5, primeNotifer, 'Error ax_ue_MRR_ActualMrr_Control.js', 
						  'Record Type // ID // Action: '+nlapiGetRecordType()+' // '+nlapiGetRecordId()+' // '+type+'<br/>'+getErrText(amrraferr), ccNotifier, null, null, null);
		}
		
	}
	
}
