/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/**
 * Script Type        : User Event Script (After Submit)
 * Script Name      : ACME UE Track CPC Line Pricing Changes
 * Version               : 2.0
 * Description        : This script will track the  Customer Price Contract Line  price changes and mark the Price Updated checkbox as checked on the related Customer record.
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

	function checkCustomerCPCChanges(oldCustomerDetails, newCustomerDetails) {
		var newCustomerPriceLineCount = newCustomerDetails.getLineCount({ sublistId: 'itempricing' });
		var oldCustomerPriceLineCount = oldCustomerDetails.getLineCount({ sublistId: 'itempricing' });
		log.debug('oldCustomerPriceLineCount is ' + oldCustomerPriceLineCount, 'newCustomerPriceLineCount is ' + newCustomerPriceLineCount);

		if (newCustomerPriceLineCount != oldCustomerPriceLineCount) {
			return 'T';
		}
		else{
			for (var curLine = 0; curLine < newCustomerPriceLineCount; curLine++) {
				var newCustPriceItem= newCustomerDetails.getSublistValue({ sublistId: 'itempricing', fieldId: 'item', line: curLine });
				var oldCustPriceLine = oldCustomerDetails.findSublistLineWithValue({
					sublistId: 'itempricing',
					fieldId: 'item',
					value: newCustPriceItem
				});

				if (oldCustPriceLine != -1) {
					var newItemPriceVal = newCustomerDetails.getSublistValue({ sublistId: 'itempricing', fieldId: 'price', line: curLine });
					var oldItemPriceVal = oldCustomerDetails.getSublistValue({ sublistId: 'itempricing', fieldId: 'price', line: oldCustPriceLine });

					log.debug('oldItemPriceVal is ' + oldItemPriceVal, 'newItemPriceVal is ' + newItemPriceVal);

					if (oldItemPriceVal != newItemPriceVal) {
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
			var oldCPCLineRecord = scriptContext.oldRecord;
			log.debug('recordType is '+scriptContext.newRecord.type, 'recId is '+scriptContext.newRecord.id);
			if( scriptType == 'create' || scriptType == 'edit' ){
				var newCPCLineObj = record.load({type: scriptContext.newRecord.type, id: scriptContext.newRecord.id});
				var newCPCLinePrice = newCPCLineObj.getValue({fieldId:'custrecord_acme_cpc_line_price'});
				var oldCPCLinePrice = oldCPCLineRecord.getValue({fieldId:'custrecord_acme_cpc_line_price'});
				log.debug('newCPCLinePrice is ' + newCPCLinePrice, 'oldCPCLinePrice is ' + oldCPCLinePrice);
				if(newCPCLinePrice != oldCPCLinePrice){
					var newParentCPCRec = newCPCLineObj.getValue({fieldId:'custrecord_acme_cpc_item_header'});
					log.debug('newParentCPCRec is ', newParentCPCRec);
					if (newParentCPCRec) {
						var newParentCPCRecObj = record.load({type: 'customrecord_acme_cust_price_contracts', id: newParentCPCRec });

						var newCPCCustomerLineCount = newParentCPCRecObj.getLineCount({ sublistId: 'recmachcustrecord_acme_cpc_cust_header' });
						log.debug('newCPCCustomerLineCount is ', newCPCCustomerLineCount);
						if(newCPCCustomerLineCount == -1)
							return;

						var newCPCCustomerId= newParentCPCRecObj.getSublistValue({ sublistId: 'recmachcustrecord_acme_cpc_cust_header', fieldId: 'custrecord_acme_cpc_line_customer', line: 0 });
						log.debug('newCPCCustomerId is ', newCPCCustomerId);
						if(newCPCCustomerId){
							var savedCustomerId = record.submitFields({ type: 'customer', id: newCPCCustomerId, values: { "custentity_customer_price_updated": true } });
							log.debug('savedCustomerId is ', savedCustomerId);
						}
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
