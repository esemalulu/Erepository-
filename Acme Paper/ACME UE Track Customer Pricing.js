/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/**
 * Script Type        : User Event Script (After Submit)
 * Script Name      : ACME UE Track Customer Pricing
 * Version               : 2.0
 * Description        : This script will track the customer price changes and mark the Price Updated checkbox as checked.
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
	} // before load

	function checkCustomerPriceChanges(oldCustomerDetails, newCustomerDetails) {
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
			var exContext  = runtime.executionContext;
			var scriptType = scriptContext.type;
			var customerOldRecord = scriptContext.oldRecord;
			var recordType = scriptContext.newRecord.type;
			var recId = scriptContext.newRecord.id;
			log.debug('recordType is '+recordType, 'recId is '+recId);
			if( scriptType == 'create' || scriptType == 'edit' ){
				var curCustObj = record.load({type: recordType, id: recId, isDynamic: true});
				var syncPriceFlag = curCustObj.getValue({fieldId:'custentity_customer_price_updated'});
				var priceChangedFlag = '', uploadToEvoXChangedFlag = '';
				if(syncPriceFlag == false){
					var oldUploadToEvoXFlag = customerOldRecord.getValue({fieldId:'custentity_acc_upld_evox'});
					var newUploadToEvoXFlag = curCustObj.getValue({fieldId:'custentity_acc_upld_evox'});
					log.debug('oldUploadToEvoXFlag is '+oldUploadToEvoXFlag, 'newUploadToEvoXFlag is '+newUploadToEvoXFlag);

					if(oldUploadToEvoXFlag == false && newUploadToEvoXFlag == true){
						uploadToEvoXChangedFlag ='T';
					}
					else{
						priceChangedFlag = checkCustomerPriceChanges(customerOldRecord, curCustObj);
						log.debug('priceChangedFlag is ', priceChangedFlag);
					}
					if(priceChangedFlag == 'T' || uploadToEvoXChangedFlag == 'T'){
						curCustObj.setValue({fieldId:'custentity_customer_price_updated', value: true});

						var savedCustomerId = curCustObj.save({ enableSourcing: false, ignoreMandatoryFields: true });
						log.debug('savedCustomerId is ', savedCustomerId);
					}
				}
			}
		}catch(afterSubmitErr){
			log.error('afterSubmit function error is ', JSON.stringify(afterSubmitErr));
		}
	}

	return {
		//     beforeLoad: beforeLoad,
		//beforeSubmit : beforeSubmit,
		afterSubmit : afterSubmit
	};

});
