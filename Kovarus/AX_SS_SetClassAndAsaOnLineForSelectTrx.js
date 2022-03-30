/**
 * Author: joe.son@audaxium.com
 * Date: 3/17/2013
 * Description:
 * - Goes through list of Opportunities, Quotes, Sales Orders, Invoices
 * Mod Request: 3/27/2013
 * - Deploy for Purchase Order and Vendor Bills
 *  to do following tasks:
 *  1. Est. Gross Profit and copy to ASA
 *  2. set class on line from item
 * ONLY for 2013 transactions
 */

//each scheduled script MUST have script parameter called Last Processed Internal ID.
//ID of last proessed internal id is defined in CMWL_Constants.js
var SCRIPT_PARAM_PROC_INTERNALID='custscript_trxlast_processed_id';
var SCRIPT_PARAM_ADJ_SALESREPID='custscript_ss_adjsalesrepid';

//exit out at higher count so that ALL transactions can be processed.
var EXIT_COUNT=1000;
var ctx = nlapiGetContext();
var lastProcessdId='', adjSalesRepId = '';

//main function
function UpdateHistorical2013Trx() {

	lastProcessedId = ctx.getSetting('SCRIPT',SCRIPT_PARAM_PROC_INTERNALID);
	adjSalesRepId = ctx.getSetting('SCRIPT',SCRIPT_PARAM_ADJ_SALESREPID);

	try {
		
		//search for all opp, est, so, invoice for this year
		var trxflt = [new nlobjSearchFilter('type',null,'anyof',['Opprtnty','Estimate','SalesOrd','CustInvc','VendBill','PurchOrd']),
		              new nlobjSearchFilter('trandate',null,'within','thisyear'),
		              new nlobjSearchFilter('mainline',null,'is','T'),
		              new nlobjSearchFilter('memorized',null,'is','F')];
		//sort the results by highest internal ID
		var trxcol = [new nlobjSearchColumn('internalid').setSort(true),
		              new nlobjSearchColumn('type'),
		              new nlobjSearchColumn('tranid'),
		              new nlobjSearchColumn('trandate')];
		//incase of reschedule, process where it left off by adding filter of internal ID (number) less than last processed trx internal id
		if (lastProcessedId && !isNaN(parseInt(lastProcessedId))) {
			trxflt.push(new nlobjSearchFilter('internalidnumber',null,'lessthan',lastProcessedId));
		}
		var trxrslt = nlapiSearchRecord('transaction', null, trxflt, trxcol);
		
		//when in test mode, process only top 10
		for (var i=0; trxrslt && i < trxrslt.length; i++) {
			lastProcessedId = trxrslt[i].getId();
			var trx = null;
			try {
				trx = nlapiLoadRecord(trxrslt[i].getRecordType(), trxrslt[i].getId());
			} catch (trxloaderror) {
				log('ERROR','Error Loading Transaction:',trxrslt[i].getId()+'","'+trxrslt[i].getText('type')+'","'+trxrslt[i].getValue('tranid')+' // '+getErrText(trxloaderror));
			}
			
			//process line when trx has been successfully loaded
			if (trx) {
				
				var itemcnt = trx.getLineItemCount('item');
				if (itemcnt > 0) {
					//loop process line item
					var itemJson = {};
					var itemIds = new Array();
					
					//gather all unique items in the line to do one search to get location, dept, and class
					for (var u=1; u <= itemcnt; u++) {
						//loop through itemIds and check for duplicate
						if (!itemIds.contains(trx.getLineItemValue('item','item',u))) {
							itemIds.push(trx.getLineItemValue('item','item',u));
						}
					}
					
					var hasItemSearchError = false;
					try {
						//populate itemJson object
						var itemflt = [new nlobjSearchFilter('internalid', null, 'anyof', itemIds)];
						var itemcol = [new nlobjSearchColumn('class'),
						               new nlobjSearchColumn('type')];
						var itemrslt = nlapiSearchRecord('item', null, itemflt, itemcol);
						
						for (var rj=0; rj < itemrslt.length; rj++) {
							var ritemid = itemrslt[rj].getId();
							if (!itemJson[ritemid]) {
								itemJson[ritemid]={};
							}
							itemJson[ritemid]['class'] = (itemrslt[rj].getValue('class')?itemrslt[rj].getValue('class'):'');
							itemJson[ritemid]['type'] = itemrslt[rj].getValue('type');
						}
						
					} catch (itemssearcherror) {
						hasItemSearchError = true;
						log('error','trx '+trx.getRecordType()+' // trxid: '+trx.getRecordId() ,
							'Item Search for '+itemIds+' failed: '+getErrText(itemssearcherror));
					}
					
					//proceed only when there are no item search error
					var ignoreItemType = ['Description','Subtotal'];
					if (!hasItemSearchError) {
						for (var j=1; j <= itemcnt; j++) {
							//loop through itemIds and set dept, class location values
							var pitemid = trx.getLineItemValue('item','item',j);
							if (itemJson[pitemid]) {
								if (!ignoreItemType.contains(itemJson[pitemid]['type'])) {
									
									trx.selectLineItem('item', j);
									if (itemJson[pitemid]['class']) {
										trx.setCurrentLineItemValue('item', 'class', itemJson[pitemid]['class']);
									}
									//set ASA value for historical: ext price MINUST estimated Ext. Cost
									var estExtCost = trx.getCurrentLineItemValue('item','costestimate')?parseFloat(trx.getCurrentLineItemValue('item','costestimate')):0.0;
									var extPrice = trx.getCurrentLineItemValue('item','amount')?parseFloat(trx.getCurrentLineItemValue('item','amount')):0.0;
									
									altAsaAmt = extPrice-estExtCost;
									trx.setCurrentLineItemValue('item','altsalesamt', altAsaAmt);
									
									log('debug', trxrslt[i].getText('type')+' // Trx Number: '+trxrslt[i].getValue('tranid')+' // '+trxrslt[i].getValue('trandate'),
										'item InternalID // Class // ASA set to: '+pitemid+' // '+itemJson[pitemid]['class']+' // '+
										altAsaAmt+' (Calculated: Ext. price (amount) - Est. Extended Cost (costestimate) == '+extPrice+' - '+estExtCost);
									
									trx.commitLineItem('item');
								}
							}
						}
						
						try {
							//update by not doing any sourcing and ignoring 
							nlapiSubmitRecord(trx, false, true);
						} catch (updtrxerror) {
							if (getErrText(updtrxerror).indexOf('Total contribution for sales reps is 200.0%') > -1) {
								//add in adjustment sales rep
								var findAdjSalesRep = trx.findLineItemValue('salesteam', 'employee', adjSalesRepId);
								if (!findAdjSalesRep || (findAdjSalesRep && findAdjSalesRep < 1)) {
									//add adjusting sales rep to offset 200%
									trx.selectNewLineItem('salesteam');
									trx.setCurrentLineItemValue('salesteam', 'employee', adjSalesRepId);
									trx.commitLineItem('salesteam');
									
									//try again
									try{
										//update by not doing any sourcing and ignoring 
										nlapiSubmitRecord(trx, true, true);
									} catch (updRetryError) {
										log('error','Retry Failed to update trx '+trx.getRecordType()+' // trxid: '+trx.getId(),
											 getErrText(updRetryError));
									}
								}
							} else {
								log('error','Failed to update trx '+trx.getRecordType()+' // trxid: '+trx.getId(),
										 getErrText(updtrxerror));
							}
						}
					}
				}
			}
			
			if (ctx.getRemainingUsage() <= EXIT_COUNT && (i+1) < trxrslt.length) {
				log('debug','Rescheduling at Internal ID ',trxrslt[i].getId());
				
				var param = new Array();
				param[SCRIPT_PARAM_PROC_INTERNALID] = lastProcessedId;
				
				var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
				if (schStatus=='QUEUED') {
					break;
				}
			}
		}
		
		
		//create process csv file
		
	} catch (e) {
		
		log('ERROR','Runtime Error-Scheduled Script Terminated',getErrText(e));
		nlapiSendEmail('-5', 'Kovarus@audaxium.com,', 'Error occured while processing 2013 trx update', 'Scheduled Script Terminated!!!<br/>Failure Msg: '+getErrText(e));
	}
	
	
}
