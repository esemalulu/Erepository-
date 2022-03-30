/**
 * As oof NS Version 2015v1, Related Items Sublist under Webstore tab of item is NOT accessible via search.
 * However, it can be accessed vai script once the item record is loaded into memory under "presentationitem" sublist
 * 
 * THIS Scheduled script is designed to run through ALL Item record with "AX:Is Top Level Opp Wizard Item" (custitem_ax_oppwizard_istoplevel) check
 * and sets "AX:Related Item JSON" (custitem_ax_oppwizard_relateditemjson) string version of Comma separated list of Item Internal IDs 
 * 
 */

var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_oppwiz_lastprocid');

function syncWebStoreRelItems() {
	//1. Search for list of items that has custitem_ax_oppwizard_istoplevel checked ordered by DESC order
	var syncflt = [new nlobjSearchFilter('custitem_ax_oppwizard_istoplevel', null, 'is','T'),
	               new nlobjSearchFilter('isinactive', null, 'is','F')];
	
	if (paramLastProcId) {
		syncflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
	}
	
	var synccol = [new nlobjSearchColumn('internalid').setSort(true),
	               new nlobjSearchColumn('itemid')];
	
	var syncrs = nlapiSearchRecord('item', null, syncflt, synccol);
	
	for (var i=0; syncrs && i < syncrs.length; i++) {
		
		var relatedItemArray = [];
		
		//for each item, load it into Memory and build list of related item into JSON object
		var itemrec = nlapiLoadRecord(syncrs[i].getRecordType(), syncrs[i].getId());
		
		for (var j=1; j <= itemrec.getLineItemCount('presentationitem'); j++) {
			relatedItemArray.push(itemrec.getLineItemValue('presentationitem', 'item', j));
		}
		
		//Set it on the itemrec and save it
		itemrec.setFieldValue('custitem_ax_oppwizard_relateditemjson', relatedItemArray.toString());
		
		//save it
		try {
			nlapiSubmitRecord(itemrec, false, true);
			axlog('audit','Sync Success item rec ID '+syncrs[i].getId(), 'Related Values: '+relatedItemArray.toString());
		} catch (itemrecsaveerr) {
			axlog('error','Error saving item rec ID '+syncrs[i].getId(), getErrText(itemrecsaveerr));
		}
		
		//Check to see if we need to reschedule
		//Set % completed of script processing
		var pctCompleted = Math.round(((i+1) / syncrs.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
		
		//reschedule if gov is running low or legnth is 1000
		if (((i+1)==1000) || (nlapiGetContext().getRemainingUsage() <= 100)) {
			var reqParam = {};
			reqParam['custscript_oppwiz_lastprocid'] = syncrs[i].getId();
			var reschedulStatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), reqParam);
			axlog('audit','Sync Rescheduled',reschedulStatus);
			break;
		}
	}
}
