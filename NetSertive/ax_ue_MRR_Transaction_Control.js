
/**
 * User Event Script deployed to following Transaction Types:
 * - Sales Order
 * - Estimate
 * - Opportunity
 * - Fulfillment
 * 
 * Provide Server Side user event trigger related functions depending on the transaction types.
 * @param type
 * @param form
 * @param request
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

var errSbj = '', errMsg = '';

var mrrItemJson = {
	"hasitems":false,
	"items":{}
};


/**
 * TODO: MUST have Script fire for ONLY for OPEN Statuses of OPP and Estimates
 */

function trxMrrBeforeLoad(type, form, request) {
	
	//add in hidden MRR client trigger
	var hiddenProcMrr = form.addField('custpage_procmrr','checkbox','',null,null);
	hiddenProcMrr.setDisplayType('hidden');
	hiddenProcMrr.setDefaultValue('T');
	
	if (!checkTrx()) {
		
		hiddenProcMrr.setDefaultValue('F');
		
		return;
	}
	
	//add in hidden inlinehtml field to store mrrItemJson object
	var hiddenMrrItemJson = form.addField('custpage_mrritemjson', 'inlinehtml', '',null,null);
	hiddenMrrItemJson.setDefaultValue('<script language="JavaScript">'+
									  'var mrrItemJson = '+JSON.stringify(mrrItemJson)+';'+
									  '</script>');
	
	//add custom item drop down column
	if (form && (type == 'edit'  || type=='create' || type=='copy') && (nlapiGetRecordType() == 'estimate' || nlapiGetRecordType() == 'opportunity')) {
		var itemSublist = form.getSubList('item'); 
		//add dynamic Actual MRR Item List
		var itemActualMrrList = itemSublist.addField('custpage_col_amrr','select','Item Match', null);
		//add in defaults
		itemActualMrrList.addSelectOption('','',true);
		
	}
	
	/**
	 * For Estimates Before Load, add in manual check box to override Line Items on the line item
	 */
	if (nlapiGetRecordType() == 'estimate') {
		try {
			if ((type == 'edit'  || type=='create' || type=='copy') && nlapiGetFieldValue('opportunity')) {
				var syncCheckBox = form.addField('custpage_syncwithopp', 'checkbox','Sync Line items with Opportunity: ', null, null);
				syncCheckBox.setHelpText('Check this box if you want to override all items on linked Opportunity');
				//form.insertField(syncCheckBox, 'customform');
				form.insertField(syncCheckBox, 'entity');
			}
		} catch (estblerr) {
			log('error','Error adding Override Box', getErrText(estblerr));
		}
	}
	
	/**
	 * 12/9/2014 - Add Hidden Field to Track list of Items Being Removed
	 * THIS FIELD will be set by transaction control UI Client Script upon Save.
	 * on ax_cs_MRR_Transaction_UI_Control.js, var removeItems JSON object is introduced.
	 * New trxMrrValidateDelete is introduced to fire and track LINE Items being removed.
	 * ON SAVE client function will TURN the JSON Object into String of Array Values and set it to THIS FIeld
	 */
	var trackRemovalFld = form.addField('custpage_remitems','textarea','Track Item Remove JSON Field');
	trackRemovalFld.setDisplayType('hidden');
	
	
}

function trxMrrBeforeSubmit(type) {
	if (!checkTrx()) {
		return;
	}
	
}

function trxMrrAfterSubmit(type) {
	if (!checkTrx()) {
		return;
	}
	
	if (!trxHasMrrItems(nlapiGetNewRecord()))  {
		return;
	}
	
	if (nlapiGetRecordType() == 'estimate') {
		
		try {
			if (nlapiGetFieldValue('custpage_syncwithopp')=='T' && (type == 'create' || type == 'edit' || type=='copy')) {
				
				//1 load linked opportunity and quote record
				//	- In Dynamic Mode
				var oppRec = nlapiLoadRecord('opportunity', nlapiGetFieldValue('opportunity'), {recordmode: 'dynamic'});
				var quoteRec = nlapiGetNewRecord();
				
				/* Re-engineer of Opp to Estimate Syncer
				 * New elements of process was identified where item search is applied at the opportunity form level to 
				 * limit the ability to add certain items.  
				 * Due to this issue, once those items are removed,it can NOT be added back in. ONLY way to add it back in is to add the item group.
				 * Because of this, we can NOT remove all items and populate it back in. 
				 * It needs to be UPDATED
				 */

				//build inventory of original item list on quote
				var quotejson = {};
				
				var unselectableItems = {};
				
				for (var i=1; i <= quoteRec.getLineItemCount('item'); i++) {
					var itemid = quoteRec.getLineItemValue('item', 'item', i);
					var itemtext = quoteRec.getLineItemText('item','item',i);

					var unit = quoteRec.getLineItemValue('item','units',i);
					var qty  = quoteRec.getLineItemValue('item', 'quantity', i);
					var desc = quoteRec.getLineItemValue('item','description', i);
					
					var canbeAdded = true;
					try {
						//try adding this item on the line 
						oppRec.selectNewLineItem('item');
						oppRec.setCurrentLineItemValue('item','item', itemid);
					} catch (adderr) {
						//log('error','Item Not Allowed', itemid+' not allowed to be added on Opportunity');
						canbeAdded = false;
					}
					
					quotejson[i]={
						'canadd':canbeAdded,
						'itemid':itemid,
						'name':itemtext,
						'qty':qty,
						'desc':desc,
						'unit':unit
					};
					
					if (!canbeAdded) {
						unselectableItems[itemid]=itemid;
					}
				}

				/***************************************************************************/
				
				
				//2. clear out Opp line items
				var oppLineCnt = oppRec.getLineItemCount('item');
				
				
				for (var i=oppLineCnt; i >= 1 ; i--) {
					var oppitemid = oppRec.getLineItemValue('item','item', i);
					//Remove if Opp Item Id being examined is NOT one of Unselectable item ON current Quote
					//If it is one of unselectable item, it should be updated.
					if (!unselectableItems[oppitemid]) {
						oppRec.removeLineItem('item', i);
					}
					
				}
				
				//4. Loop through each line on quote and add to opportunity
				var quoteLineCnt = quoteRec.getLineItemCount('item');
				//var oppLine = 1;
				for (var q=1; q <= quoteLineCnt; q++) {
					if (oppRec.findLineItemValue('item', 'item', quoteRec.getLineItemValue('item', 'item', q)) > 0){
						var uiLineOnOpp = oppRec.findLineItemValue('item', 'item', quoteRec.getLineItemValue('item', 'item', q));
						//log('debug','Found Existing Line',quoteRec.getLineItemText('item', 'item', q)+' Line '+q+' exists. Update Opp line '+uiLineOnOpp);
						oppRec.selectLineItem('item', uiLineOnOpp);
						
					} else {
						//log('debug','Select New Line','Line '+(q)+' on opp');
						//oppRec.selectNewLineItem('item');
						oppRec.insertLineItem('item', q);
						oppRec.setCurrentLineItemValue('item','item',quoteRec.getLineItemValue('item', 'item', q));
					}
					
					//Try adding specific fields only
					//item
					try {
						//quantity
						oppRec.setCurrentLineItemValue('item','quantity',quoteRec.getLineItemValue('item', 'quantity', q));
						//units
						oppRec.setCurrentLineItemText('item','units',quoteRec.getLineItemText('item', 'units', q));
						//description
						oppRec.setCurrentLineItemValue('item','description',quoteRec.getLineItemValue('item', 'description', q));
						//price
						//log('debug','quote line sync price level',quoteRec.getLineItemText('item', 'price', q));
						oppRec.setCurrentLineItemText('item','price',quoteRec.getLineItemText('item', 'price', q));
						//rate
						//log('debug','quote line sync rate',quoteRec.getLineItemText('item', 'rate', q));
						oppRec.setCurrentLineItemValue('item','rate',quoteRec.getLineItemValue('item', 'rate', q));
						//amount
						//log('debug','quote line sync amount',quoteRec.getLineItemText('item', 'amount', q));
						oppRec.setCurrentLineItemValue('item','amount',quoteRec.getLineItemValue('item', 'amount', q));
						//Actual MRR Mapping					
						oppRec.setCurrentLineItemValue('item','custcol_ax_abmrr_item',quoteRec.getLineItemValue('item', 'custcol_ax_abmrr_item', q));
						//DO Not Map Flag
						oppRec.setCurrentLineItemValue('item','custcol_ax_abmrr_item_nomap',quoteRec.getLineItemValue('item', 'custcol_ax_abmrr_item_nomap', q));
						
						oppRec.commitLineItem('item');
					} catch (syncerr) {
						log('error','Syncing Line Failed','Syncing Line # '+q+' Failed: '+getErrText(syncerr));
					}
				}
					
				try {
					nlapiSubmitRecord(oppRec, true, true);
					
					//sync opp line
					//log('debug','quote sync called','syncing Opp to Historical MRR');
					syncOppToHistoricalMRR(nlapiLoadRecord('opportunity',nlapiGetFieldValue('opportunity')), nlapiGetFieldValue('opportunity'), type);
					
				} catch (oppSyncError) {
					var quoteNum = quoteRec.getFieldValue('tranid');
					var oppTitle = oppRec.getFieldValue('title');
					var oppNum = oppRec.getFieldValue('tranid');
					errSbj = 'Error Syncing line items from Quote #'+quoteNum+' to Opportunity #'+oppNum+' ('+oppTitle+')';
					errMsg = 'Following error occured while attempting to sync line items from Quote #'+quoteNum+' to '+
								 'Opportunity #'+oppNum+' ('+oppTitle+'). Please correct issues on Quote record and try again or '+
								 'contact your administrator:<br/><br/>'+
								 getErrText(oppSyncError)+'<br/><br/>'+
								 'Possible reasons:<br/>'+
								 '- Drop down items may have been inactivated<br/>'+
								 '- Value(s) being set maybe invalid';
						
					nlapiSendEmail(-5, primeNotifer, errSbj, errMsg, ccNotifier, null, null, null);
					log('error','Error Syncing Quote lines to Opportunity', 'Quote #'+quoteNum+' // Opp #'+oppNum+' // '+getErrText(oppSyncError));
				}
			}
		} catch (estaferr) {
			log('error','Estimate AF Error',getErrText(estaferr));
			errSbj = 'MRR Estimate After Submit Error';
			errMsg = 'Quote Internal ID: '+nlapiGetNewRecord().getId()+'<br/>'+getErrText(estaferr);
			nlapiSendEmail(-5, primeNotifer, errSbj, errMsg, ccNotifier, null, null, null);
		}
		
	} else if (nlapiGetRecordType() == 'opportunity') {
		//log('debug','Fired by', nlapiGetContext().getExecutionContext());
		try {
			//only fire for create or edit action against opportunity transaction
			if (type == 'create' || type == 'edit' || type=='copy') {
				log('debug','opportunity submitted with Type: ',type);
				syncOppToHistoricalMRR(nlapiLoadRecord('opportunity',nlapiGetRecordId()), nlapiGetRecordId(), type);
			}
		} catch (oppaferr) {
			log('error','Opp AF Error',getErrText(oppaferr));
			
			errSbj = 'MRR Opportunity After Submit Error';
			errMsg = 'Opportunity Internal ID: '+nlapiGetNewRecord().getId()+'<br/>'+getErrText(oppaferr);
			nlapiSendEmail(-5, primeNotifer, errSbj, errMsg, ccNotifier, null, null, null);
			
		}		
	} 
	else if (nlapiGetRecordType() == 'itemfulfillment') 
	{
		//----------------------------- After Submit Item Fulfillment ----------------------------------------------
		//log('debug','item fulfillment', type+' // fulfillment');
		if (trxHasMrrItems(nlapiGetNewRecord())) 
		{
			//log('debug','has mrr items','has it');
			
			//assume item fulfillment was created from sales order
			try 
			{
				
				var soRec = nlapiLoadRecord('salesorder', nlapiGetFieldValue('createdfrom'));
				var itemFulfillDate = nlapiGetFieldValue('trandate');
				var actRptDate = (new Date(itemFulfillDate).getMonth()+1)+'/1/'+new Date(itemFulfillDate).getFullYear();
				var soOppId = soRec.getFieldValue('opportunity');
				var soOppActualCloseDt = '';
				var opflt = [new nlobjSearchFilter('internalid',null, 'anyof',soOppId)];
				var opcol = [new nlobjSearchColumn('closedate')];
				var oprs = nlapiSearchRecord('opportunity', null, opflt, opcol);
				if (oprs && oprs.length > 0) 
				{
					soOppActualCloseDt = oprs[0].getValue('closedate');
				}
				
				//log('debug','item fulfill so Opp', soOppId);
				
				//search for historical MRR record for THIS sales order.
				//This is to ensure previously backed up SO doesn't replace current
				var hmflt = [new nlobjSearchFilter('custrecord_hbmrr_so', null, 'anyof',soRec.getId()),
				             new nlobjSearchFilter('isinactive', null, 'is','F')];
				var hmcol = [new nlobjSearchColumn('internalid'),
				             new nlobjSearchColumn('custrecord_hbmrr_item')];
				var hmrs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, hmflt, hmcol);
				if (hmrs && hmrs.length > 0) {
					//log('debug','Item Fulfillment and SO already processed','Previous Item Fulfillment being edited. Do NOT Process');
					return;
				}
				
				
				//search for existing actual MRR record for THIS sales order.
				//If it is in the Actual, with matching sales order, it's already been updated or added
				var amrrExisting = {};
				var amflt = [new nlobjSearchFilter('custrecord_abmrr_salesorder', null, 'anyof',soRec.getId()),
				             new nlobjSearchFilter('isinactive', null, 'is','F')];
				var amcol = [new nlobjSearchColumn('internalid'),
				             new nlobjSearchColumn('custrecord_abmrr_item')];
				var amrs = nlapiSearchRecord('customrecord_ax_baseline_mrr', null, amflt, amcol);
				for (var a=0; amrs && a < amrs.length; a++) 
				{
					amrrExisting[amrs[a].getValue('custrecord_abmrr_item')] = amrs[a].getId();
				}
				
				var mrrItems = {
					//itemid:dollar value
					"totals":{},
					//Tech Value - added 2/22/2016
					"techtotals":{}
				};
				//Total Items on the Sales Order
				var itemCount = soRec.getLineItemCount('item');
				
				//Mod 6/18/2014 - get discount line and amount
				var discjson = getDiscountJson(soRec);
				
				for (var i=1; i <= itemCount; i++) {
					if (mrrItemJson['items'][soRec.getLineItemValue('item', 'item', i)] && soRec.getLineItemValue('item','custcol_ax_abmrr_item_nomap',i) != 'T') {
						if (!mrrItems['totals'][soRec.getLineItemValue('item', 'item', i)]) {
							mrrItems['totals'][soRec.getLineItemValue('item', 'item', i)] = 0.00;
						}
						
						//2/22/2016 - build out techtotals
						if (!mrrItems['techtotals'][soRec.getLineItemValue('item', 'item', i)]) {
							mrrItems['techtotals'][soRec.getLineItemValue('item', 'item', i)] = 0.00;
						}
						
						//get total of each MRR Items in the line
						var currentLineAmount = parseFloat(soRec.getLineItemValue('item','amount', i));
						//if discount line exists, subtract the value
						if (discjson[i]) {
							currentLineAmount = currentLineAmount + parseFloat(discjson[i]);
						}
						
						//2/22/2016 - Add in calculation by lines' Tech. Rev. Multiplier
						var techMultValue = soRec.getLineItemValue('item','custcol_ax_itemtechmultiplier',i),
							currentLineTechAmount = 0.0;
						if (techMultValue)
						{
							techMultValue = techMultValue.replace('%','');
							//Follow along as long as there is a value and it's a number
							if (!isNaN(techMultValue))
							{
								techMultValue = parseFloat(techMultValue) / 100;
								
								//Grab Tech value based on currentLineAmount
								currentLineTechAmount = currentLineAmount * techMultValue;
							}
						}
						
						mrrItems['totals'][soRec.getLineItemValue('item', 'item', i)] = parseFloat(mrrItems['totals'][soRec.getLineItemValue('item', 'item', i)]) + 
																						currentLineAmount;
						
						//2/22/2016 - Add in tech value
						mrrItems['techtotals'][soRec.getLineItemValue('item', 'item', i)] = parseFloat(mrrItems['techtotals'][soRec.getLineItemValue('item', 'item', i)]) + 
																							currentLineTechAmount;

						
					}
				}
				
				log('debug','so rec id // mrrItems JSON object', soRec.getId()+' // '+JSON.stringify(mrrItems));
				
				//Search for matching historical opp record.
				var hmoppJson = {};
				var hmflt = [new nlobjSearchFilter('custrecord_hbmrr_customer', null, 'anyof', soRec.getFieldValue('entity')),
				             new nlobjSearchFilter('custrecord_hbmrr_opportunity', null, 'anyof', soOppId),
				             new nlobjSearchFilter('custrecord_hbmrr_historytype', null, 'anyof',paramHistPossibleId)];
				var hmcol = [new nlobjSearchColumn('internalid'),
				             new nlobjSearchColumn('custrecord_hbmrr_item')];
				var hmrs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, hmflt, hmcol);
				for(var hmo=0; hmrs && hmo < hmrs.length; hmo++) 
				{
					hmoppJson[hmrs[hmo].getValue('custrecord_hbmrr_item')] = hmrs[hmo].getId();
				}
				
				var itemCount = soRec.getLineItemCount('item');
				
				var reCalcActual = false;
				var hasAmrrUpdError = false;
				for (var i=1; i <= itemCount; i++) {
					if (mrrItemJson['items'][soRec.getLineItemValue('item', 'item', i)]) {
						
						var itemFulfilled = soRec.getLineItemValue('item','quantityfulfilled',i);
						var itemQty = soRec.getLineItemValue('item','quantity',i);
						
						//log('debug','item fulfill test',itemFulfilled+' // '+itemQty);
						
						//it has been fulfilled 
						//AND Actual MRR hasn't been update or added
						//AND NO MAP is NOT True
						if (itemFulfilled == itemQty && 
							!amrrExisting[soRec.getLineItemValue('item', 'item', i)] && 
							soRec.getLineItemValue('item','custcol_ax_abmrr_item_nomap',i) != 'T') 
						{
						
							//atleast one item is updateable
							reCalcActual = true;
							//values to carry over to historical MRR
							var oppObj = new Object();
							//Create NEW or Update existing
							var mapAmrrId = soRec.getLineItemValue('item','custcol_ax_abmrr_item',i);
							if (mapAmrrId) {
								var amNewUpdFld = ['name',
								                   'custrecord_abmrr_soffdt',
								                   'custrecord_abmrr_salesorder',
								                   'custrecord_abmrr_item',
								                   'custrecord_abmrr_linevalue',
								                   'custrecord_abmrr_techlinevalue',
								                   'custrecord_abmrr_rptdate'];
								var amNewUpdVal = ['SO# '+soRec.getFieldValue('tranid')+'-'+soRec.getLineItemText('item', 'item', i)+'('+soRec.getFieldValue('entity')+')',
								                   nlapiDateToString(new Date(itemFulfillDate)),
								                   soRec.getId(),
								                   soRec.getLineItemValue('item', 'item', i),
								                   mrrItems['totals'][soRec.getLineItemValue('item', 'item', i)],
								                   mrrItems['techtotals'][soRec.getLineItemValue('item', 'item', i)],
								                   actRptDate];
								
								try {
									nlapiSubmitField('customrecord_ax_baseline_mrr', mapAmrrId, amNewUpdFld, amNewUpdVal, true);
								} catch (amrrupderr) {
										
									errSbj = 'Item Fulfillment After Submit - Actual MRR Update Error';
									errMsg = 'Item Fulfillment Internal ID: '+nlapiGetNewRecord().getId()+'<br/>'+
											 'Sales Order Internal ID: '+soRec.getId()+' (SO #'+soRec.getFieldValue('tranid')+')<br/>'+
											 'MRR Item Internal ID: '+soRec.getLineItemValue('item', 'item', i)+' ('+soRec.getLineItemText('item', 'item', i)+')<br/><br/>'+
											 'Error while attempting to Update Actual MRR values:<br/><br/>'+
											 '<b>You MUST Update Actual MRR Values Manually</b><br/>'+
											 'Actual MRR Internal ID: '+mapAmrrId+'<br/>'+
											 'Name: '+'SO# '+soRec.getFieldValue('tranid')+'-'+soRec.getLineItemText('item', 'item', i)+'('+soRec.getFieldValue('entity')+')<br/>'+
											 'SO Fulfilled Date: '+nlapiDateToString(new Date(itemFulfillDate))+'<br/>'+
											 'Report Date: '+actRptDate+'<br/>'+
											 'Sales Order: '+soRec.getFieldValue('tranid')+'<br/>'+
											 'MRR Item: '+soRec.getLineItemText('item', 'item', i)+'<br/>'+
											 'Line Value: '+mrrItems['totals'][soRec.getLineItemValue('item', 'item', i)]+'<br/><br/>'+
											 getErrText(amrrupderr);
									nlapiSendEmail(-5, primeNotifer, errSbj, errMsg, ccNotifier, null, null, null);
										
									hasAmrrUpdError = true;
										
								}
								
							} else {
								//Create NEW
								try {
									
									var newActMrr = nlapiCreateRecord('customrecord_ax_baseline_mrr');
									var amrrname = 'SO# '+soRec.getFieldValue('tranid')+'-'+soRec.getLineItemText('item', 'item', i)+'('+soRec.getFieldValue('entity')+')';
									newActMrr.setFieldValue('name',amrrname);
									newActMrr.setFieldValue('custrecord_abmrr_soffdt',nlapiDateToString(new Date(itemFulfillDate)));
									newActMrr.setFieldValue('custrecord_abmrr_entenddate',nlapiDateToString(new Date(itemFulfillDate)));
									//default to renewed
									newActMrr.setFieldValue('custrecord_abmrr_subs_status','1');
									newActMrr.setFieldValue('custrecord_abmrr_customer',soRec.getFieldValue('entity'));
									newActMrr.setFieldValue('custrecord_abmrr_salesorder',soRec.getId());
									newActMrr.setFieldValue('custrecord_abmrr_item',soRec.getLineItemValue('item', 'item', i));
									newActMrr.setFieldValue('custrecord_abmrr_linevalue',mrrItems['totals'][soRec.getLineItemValue('item', 'item', i)]);
									newActMrr.setFieldValue('custrecord_abmrr_techlinevalue',mrrItems['techtotals'][soRec.getLineItemValue('item', 'item', i)]);
									newActMrr.setFieldValue('custrecord_abmrr_rptdate', actRptDate);
									
									try {
										mapAmrrId = nlapiSubmitRecord(newActMrr, true, true);
										
									} catch (newamrrerr) {
										errSbj = 'Item Fulfillment After Submit - Create NEW Actual MRR Error';
										errMsg = 'Item Fulfillment Internal ID: '+nlapiGetNewRecord().getId()+'<br/>'+
												 'Sales Order Internal ID: '+soRec.getId()+' (SO #'+soRec.getFieldValue('tranid')+')<br/>'+
												 'MRR Item Internal ID: '+soRec.getLineItemValue('item', 'item', i)+' ('+soRec.getLineItemText('item', 'item', i)+')<br/><br/>'+
												 'Error while attempting to Create New Actual MRR. Due to failure, update to Historical MRR was NOT PROCESSED:<br/><br/>'+
												 getErrText(newamrrerr);
										nlapiSendEmail(-5, primeNotifer, errSbj, errMsg, ccNotifier, null, null, null);
										
										hasAmrrUpdError = true;
									}
								} catch (newamrrerr) {
									log('error','New Actual MRR error',getErrText(newamrrerr));
									
									hasAmrrUpdError = true;
								}
							}
							
							oppObj.soffdt = nlapiDateToString(new Date(itemFulfillDate));
							oppObj.soid = soRec.getId();
							oppObj.item = soRec.getLineItemValue('item', 'item', i);
							oppObj.total = mrrItems['totals'][soRec.getLineItemValue('item', 'item', i)];
							oppObj.baseline = mapAmrrId;
							oppObj.historytype = paramHistActualId;
							oppObj.entdate = nlapiDateToString(new Date(itemFulfillDate));
							oppObj.termdate = '';
							//Renewed
							oppObj.substatus = '1';
							oppObj.oppclosedt = soOppActualCloseDt;
							
							//update history
							if (hmoppJson[soRec.getLineItemValue('item', 'item', i)]) {
								var hfld = ['custrecord_hbmrr_abmrr_ref', 
								            'custrecord_hbmrr_historytype',
								            'custrecord_hbmrr_subs_status',
								            'custrecord_hbmrr_so',
								            'custrecord_hbmrr_soffdt',
								            'custrecord_hbmrr_entenddate',
								            'custrecord_hbmrr_termdt',
								            'custrecord_hbmrr_poactualclosedt',
								            'custrecord_hbmrr_acctualrptdate'];
								var hval = [oppObj.baseline,
								            oppObj.historytype,
								            oppObj.substatus,
								            oppObj.soid,
								            oppObj.soffdt,
								            oppObj.entdate,
								            oppObj.termdate,
								            oppObj.oppclosedt,
								            actRptDate];
								try {
									nlapiSubmitField('customrecord_ax_historybaseline_mrr', hmoppJson[soRec.getLineItemValue('item', 'item', i)], hfld, hval, true);
								} catch (hmrrupderr) {
									errSbj = 'Item Fulfillment After Submit - Historical MRR Update from Possible to Actual Error';
									errMsg = 'Item Fulfillment Internal ID: '+nlapiGetNewRecord().getId()+'<br/>'+
											 'Sales Order Internal ID: '+soRec.getId()+' (SO #'+soRec.getFieldValue('tranid')+')<br/>'+
											 'MRR Item Internal ID: '+soRec.getLineItemValue('item', 'item', i)+' ('+soRec.getLineItemText('item', 'item', i)+')<br/><br/>'+
											 'Error while attempting to Update Historical MRR values:<br/><br/>'+
											 '<b>You MUST Update Historical MRR Values Manually</b><br/>'+
											 'Historical MRR Internal ID: '+hmoppJson[soRec.getLineItemValue('item', 'item', i)]+'<br/>'+
											 'History Type: Actual<br/>'+
											 'Actual Baseline MRR Ref. Internal ID: '+mapAmrrId+'<br/>'+
											 getErrText(hmrrupderr);
									nlapiSendEmail(-5, primeNotifer, errSbj, errMsg, ccNotifier, null, null, null);
									
									hasAmrrUpdError = true;
								}
								
							}
						}
					}
				}
				
				//Recalculate Actual Baseline for Customer
				if (reCalcActual && !hasAmrrUpdError) {				
					reCalcActualMrr(soRec.getFieldValue('entity'));
					reCalcProjected(soRec.getFieldValue('entity'));
				}
			} catch (soloaderr) {
				log('error','error loading SO',getErrText(soloaderr));
				errSbj = 'Item Fulfillment After Submit Error';
				errMsg = 'Item Fulfillment Internal ID: '+nlapiGetNewRecord().getId()+'<br/>'+getErrText(soloaderr);
				nlapiSendEmail(-5, primeNotifer, errSbj, errMsg, ccNotifier, null, null, null);
			}
		}
	}
	
	//log('debug','gov',nlapiGetContext().getRemainingUsage());
}

/**
function syncUpdatePossibleMrr(pobj) {
	
}
*/

// --------------------------------
function checkTrx() {
	//log('debug','Trx Type',nlapiGetRecordType());
	//if trx type is NOT salesorder, estimate or opportunity, return false
	if (nlapiGetRecordType()=='salesorder' || nlapiGetRecordType()=='estimate' || nlapiGetRecordType()=='opportunity' || nlapiGetRecordType()=='itemfulfillment') {
		buildMrrItems();
		
		//if opportunity and status is NONE of OPEN but has MRR Items, fire recalc
		//trxHasMrrItems
		if (nlapiGetRecordType()=='opportunity' && !openOppStatusIds.contains(nlapiGetFieldValue('entitystatus')) && trxHasMrrItems(nlapiGetNewRecord())) {
			reCalcProjected(nlapiGetFieldValue('entity'));
		}
		
		//FOR Testing Removal on Closed Test opportunity, Need to add in Quick Check for Test Opportunity Records:
		//THIS IS FOR TESTING ONLY.
		//Remove once task is completed
		/**
		if (nlapiGetRecordType()=='opportunity' && (nlapiGetRecordId()=='111012' || nlapiGetRecordId()=='135000' || nlapiGetRecordId()=='134996' || nlapiGetRecordId()=='112512')) {
			log('debug','TESTING Line Remove','PASS as TRUE');
			return true;
		}
		*/
		
		//for estimate and opportunity, make sure status is open (openOppStatusIds)
		if ((nlapiGetRecordType()=='estimate' || nlapiGetRecordType()=='opportunity') && 
			nlapiGetFieldValue('entitystatus') && !openOppStatusIds.contains(nlapiGetFieldValue('entitystatus'))) {
			
			return false;
			
		}
		
		return true;
	}
	
	return false;
}

function syncOppToHistoricalMRR(paramOppRec, paramOppId, paramType) 
{
	log('debug','Sync Opp To Hist called','Type Passed in: '+paramType);
	try 
	{
		//get newly committed opp record
		var oppNewRec = paramOppRec;
		//newly committed opp ID
		var oppId = paramOppId;
		//opp created date
		var dateCreated = oppNewRec.getFieldValue('createddate');
		//opp expected close date
		var expCloseDate = oppNewRec.getFieldValue('expectedclosedate');
		//opp rpt date
		var histRptDate = (new Date(expCloseDate).getMonth()+1)+'/1/'+new Date(expCloseDate).getFullYear();
		//opp customer
		var customer = oppNewRec.getFieldValue('entity');
		
		//JSON object to keep track of MRR Items and its' total
		var mrrItems = {
			"items":[],
			//itemid:dollar value
			"totals":{},
			//2/22/2016 - Add in calculation based on multiplier
			"techtotals":{},
			"amrrmap":{}
		};
		
		//Total Items on the Opportunity
		var itemCount = oppNewRec.getLineItemCount('item');
		log('debug','opp item count', itemCount);
		
		//Mod 6/18/2014 - get discount line and amount
		var discjson = getDiscountJson(oppNewRec);
		
		log('debug','discjson in syncOpp',JSON.stringify(discjson));
		
		var amrrValues = {},
			//2/22/2016 - Add in to capture technical value
			amrrTechValues = {},
			amrrIds = [];
		for (var i=1; i <= itemCount; i++) 
		{
			if (mrrItemJson['items'][oppNewRec.getLineItemValue('item', 'item', i)] && 
				oppNewRec.getLineItemValue('item','custcol_ax_abmrr_item_nomap',i) != 'T' && 
				oppNewRec.getLineItemValue('item', 'custcol_ax_abmrr_item', i)) 
			{
				amrrIds.push(oppNewRec.getLineItemValue('item', 'custcol_ax_abmrr_item', i));
			}
		}
		
		//search and get the values of each AMRRs
		if (amrrIds.length > 0) {
			//log('debug','amrrIds', amrrIds);
			var avflt = [new nlobjSearchFilter('internalid', null, 'anyof', amrrIds)],
				avcol = [new nlobjSearchColumn('custrecord_abmrr_linevalue'),
				         //2/22/2016 - Grab technical line value
				         new nlobjSearchColumn('custrecord_abmrr_techlinevalue')],
				avrs = nlapiSearchRecord('customrecord_ax_baseline_mrr', null, avflt, avcol);
			
			for (var av=0; avrs && av < avrs.length; av++) {
				var baseLineVal = avrs[av].getValue('custrecord_abmrr_linevalue'),
					baseLineTechVal = avrs[av].getValue('custrecord_abmrr_techlinevalue');
				
				amrrValues[avrs[av].getId()] = (baseLineVal)?baseLineVal:'';
				amrrTechValues[avrs[av].getId()] = (baseLineTechVal)?baseLineTechVal:'';
			}
		}
		
		for (var i=1; i <= itemCount; i++) 
		{
			var newOppItemId = oppNewRec.getLineItemValue('item', 'item', i);
			
			if (mrrItemJson['items'][newOppItemId] && 
				oppNewRec.getLineItemValue('item','custcol_ax_abmrr_item_nomap',i) != 'T') 
			{
				mrrItems['items'].push(newOppItemId);
				
				if (!mrrItems['totals'][newOppItemId]) 
				{
					mrrItems['totals'][newOppItemId] = 0.00;
				}
				
				//2/22/2016 - Need to add in techtotals
				if (!mrrItems['techtotals'][newOppItemId]) 
				{
					mrrItems['techtotals'][newOppItemId] = 0.00;
				}
				
				//get total of each MRR Items in the line
				var currentLineAmount = parseFloat(oppNewRec.getLineItemValue('item','amount', i));
				//if discount line exists, subtract the value
				if (discjson[i]) {
					currentLineAmount = currentLineAmount + parseFloat(discjson[i]);
					//log('debug','disc line found', currentLineAmount);
				}
				
				//2/22/2016 - Add in calculation by lines' Tech. Rev. Multiplier
				var techMultValue = oppNewRec.getLineItemValue('item','custcol_ax_itemtechmultiplier',i),
					currentLineTechAmount = 0.0;
				if (techMultValue)
				{
					techMultValue = techMultValue.replace('%','');
					//Follow along as long as there is a value and it's a number
					if (!isNaN(techMultValue))
					{
						techMultValue = parseFloat(techMultValue) / 100;
						
						//Grab Tech value based on currentLineAmount
						currentLineTechAmount = currentLineAmount * techMultValue;
					}
				}
				
				mrrItems['totals'][newOppItemId] = parseFloat(mrrItems['totals'][newOppItemId]) 
												   + 
												   currentLineAmount;
				
				mrrItems['techtotals'][newOppItemId] = parseFloat(mrrItems['techtotals'][newOppItemId]) 
												   + 
												   currentLineTechAmount;
				
				//add in actual MRR mapping
				//2/22/2016 - Add in amrrtechvalue mapping
				mrrItems['amrrmap'][newOppItemId] = {
					"amrrid":oppNewRec.getLineItemValue('item', 'custcol_ax_abmrr_item', i),
					"amrrvalue":amrrValues[oppNewRec.getLineItemValue('item', 'custcol_ax_abmrr_item', i)],
					"amrrtechvalue":amrrTechValues[oppNewRec.getLineItemValue('item', 'custcol_ax_abmrr_item', i)]
				};
			}
		}
		
		//log('debug','mrrItems count',mrrItems['items'].length);
		
		//If There are MRR Eligible Items in the Opp Line, search to see if we already have this Opportunity in the Historical MRR Record
		
		/**
		 * ONLY Search for those that are already ON the Opp Line.  
		 * This means those that were removed will NOT get process by this script.
		 *	12/9/2014 - Turn value in custpage_remitems into An Array. This field contains MRR Items that were REMOVED by User 
		 */
		var removedMrrItems = [];
		if (nlapiGetFieldValue('custpage_remitems')) {
			removedMrrItems = nlapiGetFieldValue('custpage_remitems').split(',');
		}
		
		//Flag to track if recalc should be ran
		var runRecalcProjected = false;
		
		if (mrrItems['items'].length > 0) 
		{
			//Turn it ON to run recalc
			runRecalcProjected = true;
			
			var hmflt = [new nlobjSearchFilter('custrecord_hbmrr_customer', null, 'anyof', customer),
			             new nlobjSearchFilter('custrecord_hbmrr_opportunity', null, 'anyof', oppId)],
				hmcol = [new nlobjSearchColumn('custrecord_hbmrr_item')],
				hmrs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, hmflt, hmcol);
			
			//Loop through and build what's already created
			/**
			 * hmrecJson {
			 * 	[itemid]:[internalid],
			 * }
			 */
			var hmrecJson = {};
			for (var hr=0; hmrs && hr < hmrs.length; hr++) 
			{
				hmrecJson[hmrs[hr].getValue('custrecord_hbmrr_item')] = hmrs[hr].getId();
			}
			
			//loop through MRR Items on This Opportunity and create or update historical record.
			for (var h=0; h < mrrItems['items'].length; h++) {
				
				var mitem = mrrItems['items'][h];
				
				//12/9/2014 - IF THIS Item Exists in removedMrrItems array, REMOVE It from removeMrrItems Array.
				//	This can happen if MRR Item is REMOVED and SAME one is added back in to replace it with some values.
				if (removedMrrItems.contains(mitem)) {
					var mitemIndex = removedMrrItems.indexOf(mitem);
					removedMrrItems.splice(mitemIndex,1);
				}
				
				//if mitem is in hmrecJson, update value
				//else update
				var mitemValue = mrrItems['totals'][mitem],
					mitemTechValue = mrrItems['techtotals'][mitem],
					mitemAmrrMapId = mrrItems['amrrmap'][mitem]['amrrid'],
					mitemAmrrMapValue = mrrItems['amrrmap'][mitem]['amrrvalue'];
					//mitemTechAmrrMapValue = mrrItems['amrrmap'][mitem]['amrrtechvalue'];
				
				var prjValue = paramPrjNewId;
				if (mitemAmrrMapId && mitemAmrrMapValue) 
				{
					if (parseFloat(mitemValue) > parseFloat(mitemAmrrMapValue)) 
					{
						prjValue = paramPrjUpId;
					} 
					else if (parseFloat(mitemValue) < parseFloat(mitemAmrrMapValue)) 
					{
						prjValue = paramPrjDownId;
					} 
					else if (parseFloat(mitemValue) == parseFloat(mitemAmrrMapValue)) 
					{
						prjValue = paramPrjNeutralId;
					}
				}
				
				/**
				DO THE REAL TIME Calc HEre
				FIRST TIME
				1. Historical Is created.
				2. Puts Historical Line Value
				3. IF Actual Ref Exists
					- Set the Actual Current ON Historical
				   IF Actual Ref Is NULL
				    - Set the Actual Current To 0
				4. Calculate Delta and set Delta Value
				
				EDITS OPP.
				1. Historical IS Searched and FOUND
				2. Update Historical Line Value
				3. 
				*/
				
				if (!hmrecJson[mitem]) {
					//create it as possibility
					//log('debug',mitem+' not in historical. Create new with value of '+mitemValue+' // PO Created: '+dateCreated);
					var hmrrRec = nlapiCreateRecord('customrecord_ax_historybaseline_mrr');
					hmrrRec.setFieldValue('custrecord_hbmrr_customer', customer);
					hmrrRec.setFieldValue('custrecord_hbmrr_item', mitem);
					hmrrRec.setFieldValue('custrecord_hbmrr_abmrr_ref', mitemAmrrMapId);
					hmrrRec.setFieldValue('custrecord_hbmrr_poexpclosedt', nlapiDateToString(new Date(expCloseDate)));
					hmrrRec.setFieldValue('custrecord_hbmrr_pocreatedt', nlapiDateToString(new Date(dateCreated)));
					hmrrRec.setFieldValue('custrecord_hbmrr_rptdate',histRptDate);
					hmrrRec.setFieldValue('custrecord_hbmrr_linevalue', mitemValue);
					//2/22/2016 - Add in Techncial value
					hmrrRec.setFieldValue('custrecord_hbmrr_techlinevalue', mitemTechValue);
					
					hmrrRec.setFieldValue('custrecord_hbmrr_opportunity', oppId);
					//Default History Type to Possible
					hmrrRec.setFieldValue('custrecord_hbmrr_historytype', paramHistPossibleId);
					hmrrRec.setFieldValue('custrecord_hbmrr_projection', prjValue);
					nlapiSubmitRecord(hmrrRec, true, true);
				} else {
					
					//log('debug',mitem+' IN historical. Update Historical Record ID '+hmrecJson[mitem]+' to '+mitemValue);
					var histUpdFld = ['custrecord_hbmrr_linevalue',
					                  'custrecord_hbmrr_techlinevalue',
					                  'custrecord_hbmrr_poexpclosedt',
					                  'custrecord_hbmrr_rptdate',
					                  'custrecord_hbmrr_projection'];
					var histUpdVal = [mitemValue, 
					                  mitemTechValue,
					                  nlapiDateToString(new Date(expCloseDate)), 
					                  histRptDate, 
					                  prjValue];
					
					nlapiSubmitField('customrecord_ax_historybaseline_mrr', hmrecJson[mitem], histUpdFld, histUpdVal, true);
				}
			}
			
			//Need to Recalc Projected Value
			//customer
			//Taken OUT side to conserve Governance and perforamance to RUN IT ONCE
			//reCalcProjected(customer);
		}
		
		//12/9/2014 - Check to see if removedMrrItems has any values, IF SO, go through and Inactivate them
		//ONLY Run this for EDIT mode and for Opportunity Record
		if (removedMrrItems.length > 0 && paramType == 'edit' && nlapiGetRecordType() == 'opportunity') 
		{
			//Turn it ON to run recalc
			runRecalcProjected = true;
			
			//Grab list of ALL Historical Records associated with THIS customer and THIS oppId WITH removedMrrItems IDs
			var ihmflt = [new nlobjSearchFilter('custrecord_hbmrr_customer', null, 'anyof', customer),
			              new nlobjSearchFilter('custrecord_hbmrr_opportunity', null, 'anyof', oppId),
			              new nlobjSearchFilter('custrecord_hbmrr_item', null, 'anyof', removedMrrItems)];
			var ihmcol = [new nlobjSearchColumn('internalid')];
			var ihmrs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, ihmflt, ihmcol);
			for (var n=0; ihmrs && n < ihmrs.length; n++) {
				//inactivate the historical record
				nlapiSubmitField('customrecord_ax_historybaseline_mrr',ihmrs[n].getValue('internalid'),'isinactive','T',true);
			}
		}
		
		//12/9/2014 - Moved it out to make sure recalc is executed after REMOVE process is done
		if (runRecalcProjected) {
			//Need to Recalc Projected Value
			//customer
			reCalcProjected(customer);
		}
		
		//log('debug','opp after susbmit action',type+' // '+oppId+' // '+customer+' // '+itemCount);
	} catch (syncopperr) {
		//throw sync line error
		throw nlapiCreateError('OPP_LINESYNC_ERR', getErrText(syncopperr), false);
	}
}

function reCalcActualMrr(_cid) 
{
	//get ALL Active (Regardless of Subscriptin Status) Actual MRR for Customer
	try 
	{
		var rcaflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		              new nlobjSearchFilter('custrecord_abmrr_customer', null, 'anyof',_cid),
		              new nlobjSearchFilter('custrecord_abmrr_subs_status', null, 'noneof','2')];
		
		//2/24/2016 - Add in summary column for technical value
		var rcacol = [new nlobjSearchColumn('custrecord_abmrr_linevalue', null, 'sum'),
		              new nlobjSearchColumn('custrecord_abmrr_techlinevalue', null,'sum')];

		var rcars = nlapiSearchRecord('customrecord_ax_baseline_mrr', null, rcaflt, rcacol);
		
		if (rcars && rcars.length > 0) 
		{
			var amrrfld = ['custentity_ax_calc_amrr',
				           'custentity_ax_calc_atechmrr'],
				amrrval = [rcars[0].getValue('custrecord_abmrr_linevalue', null, 'sum'),
				           rcars[0].getValue('custrecord_abmrr_techlinevalue', null, 'sum')];
			
			//2/24/2016 - Update both mrr and technical mrr fields
			nlapiSubmitField('customer', _cid, amrrfld, amrrval, false);
										
		}
	} 
	catch (recalcerr) 
	{
		log('error','Err Projection Recalc','Error Recalculation Actual for Customer Internal ID '+_cid+': '+getErrText(recalcerr));
		throw nlapiCreateError('MRR_ACTUAL_RECACLERR', 'Error Recalculation Actual for Customer Internal ID '+_cid+': '+getErrText(recalcerr), true);
	}
}

function reCalcProjected(_cid) 
{
	try 
	{
		//Recalculate Projected Baseline for Customer
		//get ALL Active OPEN Possible Opportunities Historical MRR for Customer that are in the FUTURE date
		var strToday = nlapiDateToString(new Date());
		var rcaflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		              new nlobjSearchFilter('custrecord_hbmrr_customer', null, 'anyof',_cid),
		              new nlobjSearchFilter('custrecord_hbmrr_historytype', null, 'anyof',paramHistPossibleId),
		              new nlobjSearchFilter('custrecord_hbmrr_poexpclosedt', null, 'onorafter', strToday)];
		
		//2/24/2016 - Add in summary column for technical value
		var rcacol = [new nlobjSearchColumn('custrecord_hbmrr_linevalue', null, 'sum'),
		              new nlobjSearchColumn('custrecord_hbmrr_techlinevalue', null, 'sum')];
		
		var rcars = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, rcaflt, rcacol);
			
		if (rcars && rcars.length > 0) 
		{
			var pmrrfld = ['custentity_ax_calc_pmrr',
			               'custentity_ax_calc_ptechmrr'],
				pmrrval = [rcars[0].getValue('custrecord_hbmrr_linevalue', null, 'sum'),
				           rcars[0].getValue('custrecord_hbmrr_techlinevalue', null, 'sum')];
			
			nlapiSubmitField('customer', _cid, pmrrfld, pmrrval, false);
		}
	} 
	catch (recalcerr) 
	{
		log('error','Err Projection Recalc','Error Recalculation Projection for Customer Internal ID '+_cid+': '+getErrText(recalcerr));
		throw nlapiCreateError('MRR_PROJECTION_RECACLERR', 'Error Recalculation Projection for Customer Internal ID '+_cid+': '+getErrText(recalcerr), true);
	}
	
}

function trxHasMrrItems(oppNewRec) {
	var itemCount = oppNewRec.getLineItemCount('item');
	for (var i=1; i <= itemCount; i++) {
		if (mrrItemJson['items'][oppNewRec.getLineItemValue('item', 'item', i)]) {
			return true;
		}
	}
	return false;
}

//Build mrrItemJson with MRR eligible items
function buildMrrItems() {
	try {
		
		var miflt = [new nlobjSearchFilter('custitem_ax_mrr_eligible', null, 'is','T'),
		             new nlobjSearchFilter('isinactive', null, 'is','F')];
		var micol = [new nlobjSearchColumn('internalid'),
		             new nlobjSearchColumn('itemid'),
		             new nlobjSearchColumn('displayname'),
		             new nlobjSearchColumn('type'),
		             new nlobjSearchColumn('price')];
		var mirs = nlapiSearchRecord('item', null, miflt, micol);
		if (mirs && mirs.length > 0) {
			mrrItemJson.hasitems = true;
			for (var i=0; i < mirs.length; i++) {
				mrrItemJson.items[mirs[i].getValue('internalid')] = {
					'type':mirs[i].getText('type'),
					'typeid':mirs[i].getValue('type'),
					'itemid':mirs[i].getValue('itemid'),
					'displayname':mirs[i].getValue('displayname')?mirs[i].getValue('displayname'):'',
					'price':mirs[i].getValue('price')
				};
			}
		}
		
	} catch (mrritemerr) {
		mrrItemJson.hasitems = false;
		log('error','Errorr Building MRR Items JSON', getErrText(mrritemerr));
	}
	//log('debug','mrr item', JSON.stringify(mrrItemJson));
}