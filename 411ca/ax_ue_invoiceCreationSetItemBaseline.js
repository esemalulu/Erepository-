
function beforeSubmitInvoiceSetBaseline(type){
log('debug','type',type);
	try {
		//Aux Update 7/16/2014 - Vlads suggestion.
		//check for Create or Copy first
		if(type=='create' || type=='copy'){
			var invoice = nlapiGetNewRecord();
			var query_string = invoice.getFieldValue('entryformquerystring');
			//log('debug','query_string',query_string);
			if (query_string && (query_string.indexOf('memdoc') >= 0 || query_string.indexOf('autofill') >= 0)) {
					invoice.setFieldValue('custbody_ax_createdviamemtrx','T');
			} else {
				invoice.setFieldValue('custbody_ax_createdviamemtrx','F');
			}
		}
	} catch (invmemerr) {
		log('error','checking memorized trx before submit',getErrText(invmemerr));
	}
}

/**
 * Moved to 411ca.Invoice.UserEvents.lib.v4.js
function afterSubmitInvoiceSetBaseline(type) {
	//var inv = nlapiGetNewRecord();
	var inv = nlapiLoadRecord('invoice', nlapiGetRecordId());
	var isMemTrx = inv.getFieldValue('custbody_ax_createdviamemtrx');
	
	var query_string = inv.getFieldValue('entryformquerystring');
	
	//(type=='create' || type=='copy')
	if (isMemTrx == 'T' && (type!='delete' || type!='xedit')) {
		log('debug','Invoice ID', inv.getId());
		log('debug','After Submit Generated via memtrx on '+type,inv.getFieldValue('entryformquerystring')+' // '+inv.getFieldValue('custbody_ax_createdviamemtrx'));
		
		//find matching baseline and update with value and invoice referennce
		try {
			log('debug','customer',inv.getFieldValue('entity'));
			//1. get list of all base line for this customer.
			var bflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
			            new nlobjSearchFilter('custrecord_abmrr_customer', null, 'anyof',inv.getFieldValue('entity'))];
			var bcol = [new nlobjSearchColumn('internalid').setSort(),
			            new nlobjSearchColumn('custrecord_abmrr_item'), 
			            new nlobjSearchColumn('custrecord_abmrr_itemcategory'),
			            new nlobjSearchColumn('custrecord_abmrr_linevalue')];
			var brs = nlapiSearchRecord('customrecord_ax_baselinecustassets', null, bflt, bcol);
			
			var blinejson = {};
			
			for (var j=0; brs && j < brs.length; j++) {
				var blineItemId = brs[j].getValue('custrecord_abmrr_item');
				var blineItemCategory = brs[j].getValue('custrecord_abmrr_itemcategory');
				var blineId = brs[j].getId();
				
				blinejson[blineItemId]={
					'id':blineId,
					'category':blineItemCategory
				};
			}
			
			//log('debug','blinejson',JSON.stringify(blinejson));
			
			//2. get list of all items and calculate total line value with discount
			//TEST
			//3088253
			//var inv  = nlapiLoadRecord('invoice','3088253');
			var itemjson = {};
			
			log('debug','Inv '+inv.getId(),'Line Count: '+inv.getLineItemCount('item'));
			
			//Get Final Item Json for updating baseline with per line discount calculation
			for (var i=1; i <= inv.getLineItemCount('item'); i++) {
				
				var itemType = inv.getLineItemValue('item','itemtype',i);
				var itemId = inv.getLineItemValue('item','item',i);
				var itemAmt = inv.getLineItemValue('item','amount',i);
				var itemCat = inv.getLineItemValue('item','custcol_ax_itemcat_col',i);
				var itemDiscLine = inv.getLineItemValue('item', 'discline', i);
				
				log('debug','line // item // item cat',i+' // '+itemId+' // '+itemCat);
				
				//Make sure to ignore EndGroup line
				if (itemType != 'EndGroup') {
					
					if (itemCat) {
						itemjson[i]={
							'id':itemId,
							'amount':(itemAmt)?itemAmt:0.0,
							'category':itemCat
						};
						
					} else if (itemDiscLine && itemjson[itemDiscLine]) {
						//if item Discount line value is set, subtract the amount from disc line referenced
						var discountAmount = parseFloat(itemAmt);
						itemjson[itemDiscLine].amount = parseFloat(itemjson[itemDiscLine].amount) + discountAmount;
					}					
				}
			}
			
			//log('debug','itemjson',JSON.stringify(itemjson));
			
			//go through each item Json and update or create.
			for (var l in itemjson) {
				var updItemId = itemjson[l].id;
				
				//update or create. Create will almost least likely to be the case but add just in case
				if (blinejson[updItemId]) {
					//Update Item line with current values
					var updflds = ['custrecord_abmrr_itemcategory','custrecord_abmrr_linevalue','custrecord_abmrr_invref'];
					var updvals = [itemjson[l].category, itemjson[l].amount, inv.getId()];
					nlapiSubmitField('customrecord_ax_baselinecustassets', blinejson[updItemId].id, updflds, updvals, true);
				} else {
					//Create NEW Recorod
					var blinerec = nlapiCreateRecord('customrecord_ax_baselinecustassets');
					blinerec.setFieldValue('custrecord_abmrr_customer',inv.getFieldValue('entity'));
					blinerec.setFieldValue('custrecord_abmrr_item',updItemId);
					blinerec.setFieldValue('custrecord_abmrr_itemcategory',itemjson[l].category);
					blinerec.setFieldValue('custrecord_abmrr_linevalue',itemjson[l].amount);
					blinerec.setFieldValue('custrecord_abmrr_startdate',nlapiDateToString(new Date()));
					blinerec.setFieldValue('custrecord_abmrr_invref',inv.getId());
					nlapiSubmitRecord(blinerec, true, true);
				}
			};
			
		} catch (syncblerr) {
			log('error','Error syncing with baseline',getErrText(syncblerr));
		}
		
	}
}
*/