/**
 * @NApiVersion 2.1
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
	function checkCPCcustomerChanges(oldCPCLineRecord, newCPLRecord) {
		try {
			//This funcion check if the CPC parent record was Added, Deleted or Updated and 'Price updated' checkbox will be changed to true on customer record
			var newParentCPCRec = newCPLRecord.getValue({fieldId:'custrecord_acme_cpc_item_header'});
			var oldParentCPCRec = oldCPCLineRecord.getValue({fieldId:'custrecord_acme_cpc_item_header'});
			log.debug('parent record differences', 'newParentCPCRec ' + newParentCPCRec + ' ' +  ' oldParentCPCRec ' + oldParentCPCRec);
			var recordsCPCToUpdateCustomers = [];
			if(newParentCPCRec && !oldParentCPCRec){
				//CPL Was added to CPC, use new CPC to update customers checkboxes
				log.debug('CPL was added to CPC', ' newParentCPCRec ' + newParentCPCRec + ' oldParentCPCRec ' + oldParentCPCRec);
				recordsCPCToUpdateCustomers.push(newParentCPCRec);
			}
			if(!newParentCPCRec && oldParentCPCRec){
				//CPL was removed from CPC, use old CPC to update customers checkboxes
				log.debug('CPL was removed from CPC', ' newParentCPCRec ' + newParentCPCRec + ' oldParentCPCRec ' + oldParentCPCRec);
				recordsCPCToUpdateCustomers.push(oldParentCPCRec);
			}
			if((newParentCPCRec && oldParentCPCRec) && (newParentCPCRec != oldParentCPCRec)){
				//CPC Header was changed for another one therefore old CPC and new CPC customers must be updated
				log.debug('CPC Header was changed', ' newParentCPCRec ' + newParentCPCRec + ' oldParentCPCRec ' + oldParentCPCRec);
				recordsCPCToUpdateCustomers.push(newParentCPCRec);
				recordsCPCToUpdateCustomers.push(oldParentCPCRec);
			}
			recordsCPCToUpdateCustomers.forEach(CPCHeader => {
				log.debug('CPCHeader',CPCHeader)
				var CPCHeaderRecord = record.load({type: 'customrecord_acme_cust_price_contracts', id: CPCHeader });
				log.debug('CPCHeaderRecord',CPCHeaderRecord);
				var customersCount = CPCHeaderRecord.getLineCount({ sublistId: 'recmachcustrecord_acme_cpc_cust_header' });
				log.debug('customersCount',customersCount);
				for (var i = 0; i < customersCount; i++) {
					var customer = CPCHeaderRecord.getSublistValue({ sublistId: 'recmachcustrecord_acme_cpc_cust_header', fieldId: 'custrecord_acme_cpc_line_customer', line: i });	
					// record.submitFields({ type: 'customer', id: customer, values: { "custentity_customer_price_updated": true, "custentity_sdb_item_pricing_updated":true } });
					record.submitFields({ type: 'customer', id: customer, values: { "custentity_customer_price_updated": true} });
				}
			});
		} catch (error) {
			log.error('checkCPCLineCustomerChanges',error)
		}
	}

	function afterSubmit(scriptContext) {
		try{
			var oldCPCLineRecord = scriptContext.oldRecord;
			var newCPLRecord = scriptContext.newRecord;
			var scriptType  = scriptContext.type;
			log.debug('scriptType',scriptType);
			if( scriptType == 'create' || scriptType == 'edit'){
				checkCPCcustomerChanges(oldCPCLineRecord, newCPLRecord)
				//-- chequear cambio de header 
				//-- chequear cantidad de lineas del cpc parent ya que desde el cpc se pueden eliminar lineas
				var newCPCLineObj = record.load({type: scriptContext.newRecord.type, id: scriptContext.newRecord.id});
				var newCPCLinePrice = newCPCLineObj.getValue({fieldId:'custrecord_acme_cpc_line_price'});
				var oldCPCLinePrice = oldCPCLineRecord.getValue({fieldId:'custrecord_acme_cpc_line_price'});
				if(newCPCLinePrice != oldCPCLinePrice){
					var newParentCPCRec = newCPCLineObj.getValue({fieldId:'custrecord_acme_cpc_item_header'});
					if (newParentCPCRec) {
						var newParentCPCRecObj = record.load({type: 'customrecord_acme_cust_price_contracts', id: newParentCPCRec });
						var newCPCCustomerLineCount = newParentCPCRecObj.getLineCount({ sublistId: 'recmachcustrecord_acme_cpc_cust_header' });
						if(newCPCCustomerLineCount == -1)return;
						//Set on true the 'Price updated' checkbox for all the customers in the CPC parent record
						for (var i = 0; i < newCPCCustomerLineCount; i++) {
							try {
								var newCPCCustomerId = newParentCPCRecObj.getSublistValue({ sublistId: 'recmachcustrecord_acme_cpc_cust_header', fieldId: 'custrecord_acme_cpc_line_customer', line: i });						
								log.debug('newCPCCustomerId',newCPCCustomerId)
								if(newCPCCustomerId){
									// var savedCustomerId = record.submitFields({ type: 'customer', id: newCPCCustomerId, values: { "custentity_customer_price_updated": true, "custentity_sdb_item_pricing_updated":true } });
									var savedCustomerId = record.submitFields({ type: 'customer', id: newCPCCustomerId, values: { "custentity_customer_price_updated": true} });
								}
							} catch (error) {
								log.error('error trying to update customer FOR )', error);
							}
						}
						// var newCPCCustomerId= newParentCPCRecObj.getSublistValue({ sublistId: 'recmachcustrecord_acme_cpc_cust_header', fieldId: 'custrecord_acme_cpc_line_customer', line: 0 });
						// log.debug('newCPCCustomerId is ', newCPCCustomerId);
						// if(newCPCCustomerId){
						// 	var savedCustomerId = record.submitFields({ type: 'customer', id: newCPCCustomerId, values: {"custentity_customer_price_updated":true,"custentity_sdb_item_pricing_updated":true } });
						// 	log.debug('savedCustomerId is ', savedCustomerId);
						// }
					}
				}

			}
		}catch(afterSubmitErr){
			log.error('afterSubmit function error is ', afterSubmitErr);
		}
	}
	return {
		afterSubmit : afterSubmit,
	};

});
