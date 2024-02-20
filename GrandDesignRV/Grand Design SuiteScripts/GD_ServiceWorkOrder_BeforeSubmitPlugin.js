/**
 * GD implementation for the SRV SWO Before Submit plugin
 * 
 * @NApiVersion 2.x
 * @NScriptType PluginTypeImpl
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/error', '/.bundle/159149/SRV_Constants', 'SuiteScripts/SSLib/2.x/SSLib_Util'],
/**
 * @param {search} search
 * @param {record} record
 */
function(search, record, error, SRV_Constants, SSLib_Util) {
	
	/**
	 * Gets the data from the KO tab and creates/edits lines on the record.
	 */
	function SRV_SWO_BeforeSubmit(scriptContext) {
		if (scriptContext.type != 'delete') {
			
			//Set the Stage of the SWO to the stage of the status of the SWO
			var swoStatus = scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_gdstatus'}) || '';
			//This returns an empty string when running in the context of a POST Restlet (as with the Appt Calendar), but statuses can't change from there anyways
			if(swoStatus != '')
			{
				scriptContext.newRecord.setValue({
					fieldId: 'custrecordsrv_swo_stage',
					value: search.lookupFields({type: 'customrecordgd_srvswo_status', id: swoStatus, columns: 'custrecordgd_srvswostatus_stage'}).custrecordgd_srvswostatus_stage[0].value
				});
			}

			//Make sure the Customer Dealer is set if they have any Customer/Insurance lines.
	    	if (scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_stage'}) == SRV_Constants.SRV_SWOSTAGE_RELEASED) {
	    		
	    		//Only check if there are customer lines if the retail customer dealer is not set.
	    		if (SSLib_Util.convertNSFieldToString(scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_retailcustdealer'})).length < 1) {
	    			var koDataStr = scriptContext.newRecord.getValue({fieldId: 'custpage_srvkodata'});
		    		if (koDataStr != null && koDataStr.length > 0) {
		    			var koData = JSON.parse(koDataStr);
		    			//Check if there are any op lines that are customer/insurance
		    			for (var i = 0; i < koData.operationLines.length; i++) {
		    				if (koData.operationLines[i].selectedPaymentType.id == SRV_Constants.SRV_PAYMENTTYPE_CUSTOMER || koData.operationLines[i].selectedPaymentType.id == SRV_Constants.SRV_PAYMENTTYPE_INSURANCE) {
		    					throw error.create({name: 'MISSING_REQ_FIELD', message: 'Please enter a value for Retail Customer Dealer.',notifyOff: true});
		    				}
	    				}
		    		}
	    		}
	    	}
			
			//We have some checks to do if the SWO is marked as Complete. We do these checks client-side, but want to enforce them here.
			if (scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_stage'}) == SRV_Constants.SRV_SWOSTAGE_COMPLETE) {
				//Make sure they have the three mandatory Date fields filled in before they mark it as Complete.
				//These fields are mandatory on the Claim record.
				if(SSLib_Util.convertNSFieldToString(scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_arriveddate'})).length == 0) {
					throw error.create({name: 'MISSING_REQ_FIELD',message: 'Please enter a value for Arrived Date.', notifyOff: true});
				}
				else if(SSLib_Util.convertNSFieldToString(scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_startdate'})).length == 0) {
					throw error.create({name: 'MISSING_REQ_FIELD',message: 'Please enter a value for Date Work Started.', notifyOff: true});
				}
				else if(SSLib_Util.convertNSFieldToString(scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_completedate'})).length == 0) {
					throw error.create({name: 'MISSING_REQ_FIELD',message: 'Please enter a value for Date Work Completed.', notifyOff: true});
				}
				
				//Make sure the sales order attached to this SWO is completely fulfilled before it is marked as Complete.
				var partsOrderId = SSLib_Util.convertNSFieldToString(scriptContext.newRecord.getValue({fieldId: 'custrecordsrv_swo_subpartsorder'}));
				if (partsOrderId.length > 0) {
					var isComplete = false;
					search.create({
						type: 'salesorder',
						filters: [['internalid', 'is', partsOrderId], 'AND', ['mainline', 'is', 'T'], 'AND', ['shiprecvstatus', 'is', 'F']], //F = fuliflled/received
						columns: ['internalid']
					}).run().each(function(result){ isComplete = true; });
					if (!isComplete) {
						throw error.create({name: 'ATTACHED_ORDER_NOT_FULFILLED',message: 'The attached parts order must be completely fulfilled before marking this order as Complete',notifyOff: true});
					}
				}
			}
		}
		
		else if (scriptContext.type == 'delete') {
			//Delete the operation and part lines
			//Delete all of the criteria, pricing, and bom lines on this record.
    		search.create({
    			type: 'customrecordsrv_partline',
    			filters: ['custrecordsrv_partline_swo', 'is', scriptContext.oldRecord.id],
    		}).run().each(function (result) {
    			eval("record.delete({type: 'customrecordsrv_partline', id: result.id})");
    			return true;
    		});
    		search.create({
    			type: 'customrecordsrv_opline',
    			filters: ['custrecordsrv_opline_swo', 'is', scriptContext.oldRecord.id],
    		}).run().each(function (result) {
    			eval("record.delete({type: 'customrecordsrv_opline', id: result.id})");
    			return true;
    		});
		}
	}
	
    return {
    	SRV_SWO_BeforeSubmit: SRV_SWO_BeforeSubmit
    };
    
});