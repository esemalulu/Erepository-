/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/**
 * Script Type        : User Event Script (After Submit)
 * Script Name      : ACME UE Track CPC Pricing Changes
 * Version               : 2.0
 * Description        : This script will track the Customer Price Contract Line price changes and mark the Price Updated checkbox as checked on the related Customer record.
 * Description for task 86b07qent: This script Runs for Customer Price Contracts Record and check if a item line was updated (Item added, Item removed, Item price updated) and 
 * 								   if a customer line was updated (Customer added, Customer deleted) and if something of this happend the 'Price updated' checkbox on customer record will be changed to true
*/

define(['N/runtime', 'N/https', 'N/record', 'N/search' ],

	function(runtime, https, record, search) {

	// function beforeLoad(scriptContext) {
	// }
	// function beforeSubmit(scriptContext) {
	// 	try{
	// 	}catch(e){
	// 		log.debug('Error!', e);
	// 	}
	// }

	//test
	function checkCPCLinePriceChanges(oldCPCDetails, newCPCDetails) {
		try {
		//This function check if the item sublist of CPC record was updated (Item added, Item removed, Item price was updated). If this happen the function returns true in order to update 'Price updated' checkbox 
		var newPriceLineCount = newCPCDetails.getLineCount({ sublistId: 'recmachcustrecord_acme_cpc_item_header' });
		var oldPriceLineCount = oldCPCDetails.getLineCount({ sublistId: 'recmachcustrecord_acme_cpc_item_header' });
		if (newPriceLineCount != oldPriceLineCount) {
			return 'T';
		}
		else{
			//custrecord_acme_cpc_line_item replaced for custrecord_acme_cpc_line_item 5/24/2024
			for (var curLine = 0; curLine < newPriceLineCount; curLine++) {
				var newCustPriceItem = newCPCDetails.getSublistValue({ sublistId: 'recmachcustrecord_acme_cpc_item_header', fieldId: 'custrecord_acme_cpc_line_item', line: curLine });
				var newCustPriceItemText = newCPCDetails.getSublistText({ sublistId: 'recmachcustrecord_acme_cpc_item_header', fieldId: 'custrecord_acme_cpc_line_item', line: curLine });
				var oldCustPriceLine = oldCPCDetails.findSublistLineWithValue({
					sublistId: 'recmachcustrecord_acme_cpc_item_header',
					fieldId: 'custrecord_acme_cpc_line_item',
					value: newCustPriceItem
				});
				if (oldCustPriceLine != -1) {
					//Alredy exits item
					var newCPCLinePriceVal = newCPCDetails.getSublistValue({ sublistId: 'recmachcustrecord_acme_cpc_item_header', fieldId: 'custrecord_acme_cpc_line_price', line: curLine });
					var oldCPCLinePriceVal = oldCPCDetails.getSublistValue({ sublistId: 'recmachcustrecord_acme_cpc_item_header', fieldId: 'custrecord_acme_cpc_line_price', line: oldCustPriceLine });

					//Line that already exists change the price
					if (oldCPCLinePriceVal != newCPCLinePriceVal) {
						log.debug('item updated ' + newCustPriceItem +' item text ' + newCustPriceItemText,' oldCPCLinePriceVal is ' + oldCPCLinePriceVal +  ' newCPCLinePriceVal is ' + newCPCLinePriceVal );
						return 'T';
					}
				}
				//New CPL Line, record changed
				else {
					return 'T';
				}
			}
		}
		} catch (error) {
			log.error('checkCPCLinePriceChanges' , error)
		}
	}

	function checkCPCLineCustomerChanges(oldCPCDetails, newCPCDetails) {
		try {
			//This funcion check if a new customer was added to customers sublist, if this is true, 'Price updated' checkbox will be changed to true on customer record
			var newPriceLineCount = newCPCDetails.getLineCount({ sublistId: 'recmachcustrecord_acme_cpc_cust_header' });
			var oldPriceLineCount = oldCPCDetails.getLineCount({ sublistId: 'recmachcustrecord_acme_cpc_cust_header' });
			log.debug('checkCPCLineCustomerChanges newPriceLineCount ' + newPriceLineCount);
			log.debug('checkCPCLineCustomerChanges oldPriceLineCount ' + oldPriceLineCount);			
			//This For check if a new line was created, in that case set to true the price updated checkbox on customer record that was added to the sublist
			for (var i = 0; i < newPriceLineCount; i++) {
				var newCPCCustomerLine = newCPCDetails.getSublistValue({ sublistId: 'recmachcustrecord_acme_cpc_cust_header', fieldId: 'custrecord_acme_cpc_line_customer', line: i });
				var oldCPCCustomerLine = oldCPCDetails.findSublistLineWithValue({sublistId: 'recmachcustrecord_acme_cpc_cust_header',fieldId: 'custrecord_acme_cpc_line_customer',value: newCPCCustomerLine});
				if(oldCPCCustomerLine == -1){
					log.debug('checkCPCLineCustomerChanges customer added on sublist : ' ,'newCPCCustomerLine' + newCPCCustomerLine + ' oldCPCCustomerLine' + oldCPCCustomerLine)
					record.submitFields({ type: 'customer', id: newCPCCustomerLine, values: { "custentity_customer_price_updated": true } });
				} 
			}	
			//This For check if a line was deleted, in that case set to true the price updated checkbox on customer record that was deleted in the sublist
			for (var i = 0; i < oldPriceLineCount; i++) {
				var oldCPCCustomerLine = oldCPCDetails.getSublistValue({ sublistId: 'recmachcustrecord_acme_cpc_cust_header', fieldId: 'custrecord_acme_cpc_line_customer', line: i });
				var newCPCCustomerLine = newCPCDetails.findSublistLineWithValue({sublistId: 'recmachcustrecord_acme_cpc_cust_header',fieldId: 'custrecord_acme_cpc_line_customer',value: oldCPCCustomerLine});

				if(newCPCCustomerLine == -1){
					log.debug('checkCPCLineCustomerChanges customer deleted on sublist : ' ,'oldCPCCustomerLine ' + oldCPCCustomerLine + ' newCPCCustomerLine ' + newCPCCustomerLine)
					record.submitFields({ type: 'customer', id: oldCPCCustomerLine, values: { "custentity_customer_price_updated": true } });
				} 
			}	
		} catch (error) {
			log.error('checkCPCLineCustomerChanges',error)
		}
	}

	function afterSubmit(scriptContext) {
		try{
			log.debug('executed','executed');
			var scriptType = scriptContext.type;
			var oldCPCRecord = scriptContext.oldRecord;
			var newCPCRecord = scriptContext.newRecord;
			if( scriptType == 'create' || scriptType == 'edit' ){
				var newCPCObj = record.load({type: scriptContext.newRecord.type, id: scriptContext.newRecord.id});

				var cpcPriceChangedFlag = 'F';
				if(scriptType == 'create'){ //news CPC records always must set on true 'Price updated' checkbox on customer record.
					cpcPriceChangedFlag = 'T';
				}
				else if(scriptType == 'edit'){//Check if item pricing lines or customer lines were updated
					cpcPriceChangedFlag = checkCPCLinePriceChanges(oldCPCRecord, newCPCObj);
					log.debug('item lines were updated ?',cpcPriceChangedFlag);
					checkCPCLineCustomerChanges(oldCPCRecord, newCPCObj)
				}

				if(cpcPriceChangedFlag == 'T'){
					var newCPCCustomerLineCount = newCPCObj.getLineCount({ sublistId: 'recmachcustrecord_acme_cpc_cust_header' });
					if(newCPCCustomerLineCount == -1)return;

					//Set on true the 'Price updated' checkbox for all the customers in the CPC
					for (var i = 0; i < newCPCCustomerLineCount; i++) {
						try {
							var newCPCCustomerId= newCPCObj.getSublistValue({ sublistId: 'recmachcustrecord_acme_cpc_cust_header', fieldId: 'custrecord_acme_cpc_line_customer', line: i });						
							// record.submitFields({ type: 'customer', id: newCPCCustomerId, values: { "custentity_customer_price_updated": true, "custentity_sdb_item_pricing_updated":true } });
							record.submitFields({ type: 'customer', id: newCPCCustomerId, values: { "custentity_customer_price_updated": true}});
							log.debug('item price was updated', 'newCPCCustomerId' + newCPCCustomerId)
						} catch (error) {
							log.error('error trying to update customer FOR )', newCPCCustomerId);
						}
					}
				}
			}
			if(scriptContext =='delete'){
				var oldCPCRecord = record.load({type: scriptContext.oldRecord.type, id: scriptContext.oldRecord.id});
				var oldCPCRecordCustomerLineCount = oldCPCRecord.getLineCount({ sublistId: 'recmachcustrecord_acme_cpc_cust_header' });
				if(oldCPCRecordCustomerLineCount == -1)return;
				for (var i = 0; i < oldCPCRecordCustomerLineCount; i++) {
					try {
						var oldCPCCustomerId= oldCPCRecord.getSublistValue({ sublistId: 'recmachcustrecord_acme_cpc_cust_header', fieldId: 'custrecord_acme_cpc_line_customer', line: i });						
						record.submitFields({ type: 'customer', id: oldCPCCustomerId, values: { "custentity_customer_price_updated": true} });
						log.debug('CPC Record was deleted', 'oldCPCCustomerId ' + oldCPCCustomerId)
					} catch (error) {
						log.error('error trying to update customer on delete FOR )', oldCPCCustomerId);
					}
				}
			}
		}catch(afterSubmitErr){
			log.error('afterSubmit function error is ', JSON.stringify(afterSubmitErr));
		}
	}

	return {
		//beforeLoad: beforeLoad,
		//beforeSubmit : beforeSubmit,
		afterSubmit : afterSubmit
	};

});
