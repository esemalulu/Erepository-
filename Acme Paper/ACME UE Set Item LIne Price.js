/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

/**
 * Script Type        : User Event Script (After Submit)
 * Script Name      : ACME UE Set Item LIne Price
 * Version               : 2.0
 * Description        : This script will set the EDI  Unit Price as the Item Line unit Price.
 */

define(['N/record', 'N/log' ,'N/runtime', 'N/format', 'N/email', 'N/https', 'N/file', 'N/task', 'N/sftp', 'N/error'],

		function(record, log, runtime, format) {

	var Restockit_Orders_Employee = '72783';
	var Network_Orders_Employee = '72782';

	function beforeLoad(scriptContext) {
		
	}

	function beforeSubmit(scriptContext) {
		
	}

	function afterSubmit(scriptContext) {
		var scriptType = scriptContext.type;
		var newSORec   = scriptContext.newRecord;
		var exContext  = runtime.executionContext; 
		var recordType = newSORec.type;
		var recordId = newSORec.id;
		log.debug('AS exContext is '+exContext+' AS recordType is '+recordType, 'AS recordId is '+recordId+' scriptType is '+scriptType );
		try {
			if(scriptType == 'create' && exContext == 'MAPREDUCE'){
				var soObj = record.load({type: recordType, id: recordId});

				var enteredBy = soObj.getValue('custbody_aps_entered_by');
				log.debug('AS enteredBy is ', enteredBy);
				if( enteredBy == Restockit_Orders_Employee || enteredBy == Network_Orders_Employee ){
					var itemLineTotal = soObj.getLineCount({ sublistId: 'item' });

					for (var curLine = 0; curLine < itemLineTotal; curLine++){
						var ediLineUnitPrice = soObj.getSublistValue({ sublistId: 'item', fieldId: 'custcol_edi_unit_price', line: curLine });
						log.debug('AS ediLineUnitPrice is ', ediLineUnitPrice);
						if(ediLineUnitPrice){
							soObj.setSublistValue({ sublistId: 'item', fieldId: 'rate', line: curLine, value: ediLineUnitPrice });
						}
					}
					
					var updatedSalesOrderId = soObj.save({enableSourcing: false, ignoreMandatoryFields: true});
					log.audit('updatedSalesOrderId is ', updatedSalesOrderId);
				}
			}
		}catch(afterSubmitError) {
			log.error('afterSubmit error is ', afterSubmitError.message);
		}
	}

	return {
		/*beforeLoad: beforeLoad,
		beforeSubmit: beforeSubmit,*/
		afterSubmit: afterSubmit
	};

});