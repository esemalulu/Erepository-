/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime'],
function(record, search, runtime) {
    function beforeSubmit(context) {
    	log.debug('beforeSubmit','*****START*****');
    	/*if (context.type !== context.UserEventType.CREATE){
    		 log.debug('afterSubmit','Event Type is not CREATE. Returning...');
    		 return;
    	}*/
    	log.debug('beforeSubmit','Execution Context = ' + runtime.executionContext);
    	if (runtime.executionContext == 'CSVIMPORT' || runtime.executionContext == 'USERINTERFACE')
    	{
        	var nbRec = context.newRecord;
        	var contractId = nbRec.getValue('custrecord_nb_contract_id');
        	var perioDate = nbRec.getValue('custrecord_nb_period_date');
        	log.debug('beforeSubmit','perioDate = '+perioDate);
        	
        	var contractRec = record.load({
	    	    type: 'customrecord_liv_contracts',
	 	       id: contractId,
	 	       isDynamic: true                       
	    	});
        	
        	//var contractNumber = contractRec.getValue({ fieldId: 'custrecord_liv_cm_contract_number'});
        	var billToCustomer = contractRec.getValue({ fieldId: 'custrecord_liv_cm_bill_to_customer'});
        	var soldToCustomer = contractRec.getValue({ fieldId: 'custrecord_liv_cm_sold_to_customer'});
        	//var invoicePrefix = contractRec.getValue({ fieldId: 'custrecord_liv_cm_invoice_prefix'});
        	//var autoCreateInvoice = contractRec.getValue({ fieldId: 'custrecord_liv_cm_auto_create_invoice'});
        	//var administrator = contractRec.getValue({ fieldId: 'custrecord_liv_cm_administrator'});
        	var partner = contractRec.getValue({ fieldId: 'custrecord_liv_cm_partner'});
        	var invoicePrefix = contractRec.getValue({ fieldId: 'custrecord_liv_cm_invoice_prefix'});
        	var invoiceNumber = invoicePrefix + getMMDDYY(new Date(perioDate));
        	
        	nbRec.setValue('custrecord_nb_bill_to_customer',billToCustomer);
        	nbRec.setValue('custrecord_nb_sold_to_customer',soldToCustomer);
        	nbRec.setValue('custrecord_nb_invoice_number',invoiceNumber);
        	nbRec.setValue('custrecord_nb_partner',partner);
        	
    	}
    	
 	   log.debug('beforeSubmit','*****END*****');
    }
    
    function getPeriod(date) {
		var year = date.getFullYear();
		var month = (1 + date.getMonth()).toString();
		month = month.length > 1 ? month : '0' + month;
		/*var day = date.getDate().toString();
		day = day.length > 1 ? day : '0' + day;*/
		return year + '-' + month;
	}
    
    function getMMDDYY(date) {
		var year = date.getFullYear().toString().substr(2);
		var month = (1 + date.getMonth()).toString();
		month = month.length > 1 ? month : '0' + month;
		var day = date.getDate().toString();
		day = day.length > 1 ? day : '0' + day;
		return month + day + year;
	}
    
    return {
    	 beforeSubmit: beforeSubmit
    };
});
