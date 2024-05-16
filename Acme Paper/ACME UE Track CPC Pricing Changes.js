/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/**
 * Script Type        : User Event Script (After Submit)
 * Script Name      : ACME UE Track CPC Pricing Changes
 * Version               : 2.0
 * Description        : This script will track the Customer Price Contract Line price changes and mark the Price Updated checkbox as checked on the related Customer record.
 */

define(['N/runtime', 'N/https', 'N/record', 'N/search' ],

		function(runtime, https, record, search) {

	function beforeLoad(scriptContext) {

	}

	function beforeSubmit(scriptContext) {
		try{
		}catch(e){
			log.debug('Error!', e);

		}
	}

	function checkCPCLinePriceChanges(oldCPCDetails, newCPCDetails) {
		var newPriceLineCount = newCPCDetails.getLineCount({ sublistId: 'recmachcustrecord_acme_cpc_item_header' });
		var oldPriceLineCount = oldCPCDetails.getLineCount({ sublistId: 'recmachcustrecord_acme_cpc_item_header' });
		log.debug('oldPriceLineCount is ' + oldPriceLineCount, 'newPriceLineCount is ' + newPriceLineCount);

		if (newPriceLineCount != oldPriceLineCount) {
			return 'T';
		}
		else{
			for (var curLine = 0; curLine < newPriceLineCount; curLine++) {
				var newCustPriceItem= newCPCDetails.getSublistValue({ sublistId: 'recmachcustrecord_acme_cpc_item_header', fieldId: 'custrecord_acme_cpc_item_header', line: curLine });
				var oldCustPriceLine = oldCPCDetails.findSublistLineWithValue({
					sublistId: 'recmachcustrecord_acme_cpc_item_header',
					fieldId: 'custrecord_acme_cpc_item_header',
					value: newCustPriceItem
				});

				if (oldCustPriceLine != -1) {
					var newCPCLinePriceVal = newCPCDetails.getSublistValue({ sublistId: 'recmachcustrecord_acme_cpc_item_header', fieldId: 'custrecord_acme_cpc_line_price', line: curLine });
					var oldCPCLinePriceVal = oldCPCDetails.getSublistValue({ sublistId: 'recmachcustrecord_acme_cpc_item_header', fieldId: 'custrecord_acme_cpc_line_price', line: oldCustPriceLine });

					log.debug('oldCPCLinePriceVal is ' + oldCPCLinePriceVal, 'newCPCLinePriceVal is ' + newCPCLinePriceVal);

					if (oldCPCLinePriceVal != newCPCLinePriceVal) {
						return 'T';
					}
				}
				else {
					return 'T';
				}
			}
		}
	}

	function afterSubmit(scriptContext) {
		try{
			var scriptType = scriptContext.type;
			var oldCPCRecord = scriptContext.oldRecord;
			log.debug('recordType is '+scriptContext.newRecord.type, 'recId is '+scriptContext.newRecord.id);
			if( scriptType == 'create' || scriptType == 'edit' ){
				var newCPCObj = record.load({type: scriptContext.newRecord.type, id: scriptContext.newRecord.id});

				var cpcPriceChangedFlag = 'F';
				if(scriptType == 'create'){
					cpcPriceChangedFlag = 'T';
				}
				else if(scriptType == 'edit'){
					cpcPriceChangedFlag = checkCPCLinePriceChanges(oldCPCRecord, newCPCObj);
				}

				log.debug('cpcPriceChangedFlag is ', cpcPriceChangedFlag);
				if(cpcPriceChangedFlag == 'T'){
					var newCPCCustomerLineCount = newCPCObj.getLineCount({ sublistId: 'recmachcustrecord_acme_cpc_cust_header' });
					log.debug('newCPCCustomerLineCount is ', newCPCCustomerLineCount);
					if(newCPCCustomerLineCount == -1)
						return;

					var newCPCCustomerId= newCPCObj.getSublistValue({ sublistId: 'recmachcustrecord_acme_cpc_cust_header', fieldId: 'custrecord_acme_cpc_line_customer', line: 0 });
					log.debug('newCPCCustomerId is ', newCPCCustomerId);
					if(newCPCCustomerId){
						var savedCustomerId = record.submitFields({ type: 'customer', id: newCPCCustomerId, values: { "custentity_customer_price_updated": true } });
						log.debug('savedCustomerId is ', savedCustomerId);
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
