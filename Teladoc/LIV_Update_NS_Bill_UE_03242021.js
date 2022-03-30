/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime'],
function(record, search, runtime) {
    function beforeSubmit(context) {

    }
    
    function afterSubmit(context) {
    	log.debug('afterSubmit','*****START*****');
    	/*if (context.type !== context.UserEventType.CREATE){
    		 log.debug('afterSubmit','Event Type is not CREATE. Returning...');
    		 return;
    	}*/
    	log.debug('afterSubmit','Execution Context = ' + runtime.executionContext);
    	if (runtime.executionContext == 'CSVIMPORT' || runtime.executionContext == 'USERINTERFACE' || runtime.executionContext == 'USEREVENT')
    	{
        	var nbRec = context.newRecord;
        	var nbRecId = nbRec.id;
        	//var contractId = nbRec.getValue('custrecord_nb_contract_id');
        	//var perioDate = nbRec.getValue('custrecord_nb_period_date');
        	//log.debug('afterSubmit','perioDate = '+periodDate);
        	
        	var loadedNBRec = record.load({
	    	    type: 'customrecord_netsuite_bill',
		 	       id: nbRecId,
		 	       isDynamic: true                       
		    	});
        	
        	var contractId = loadedNBRec.getValue('custrecord_nb_contract_id');
        	var periodDate = loadedNBRec.getValue('custrecord_nb_period_date');
        	var milestoneSKU = loadedNBRec.getValue('custrecord_nb_milestone_sku');
        	log.debug('afterSubmit','nbRecId = '+nbRecId);
        	log.debug('afterSubmit','contractId = '+contractId);
        	log.debug('afterSubmit','periodDate = '+periodDate);
        	
        	if(!periodDate)
        		return;
        	
        	var contractRec = record.load({
	    	    type: 'customrecord_liv_contracts',
	 	       id: contractId,
	 	       isDynamic: true                       
	    	});
        	
        	var actualContractStatus = contractRec.getValue({ fieldId: 'custrecord_liv_cm_contract_status'});
        	var inactiveForBilling = contractRec.getValue({ fieldId: 'custrecord_liv_cm_billing_inactive'});
        	var autoCreateInvoice = contractRec.getValue({ fieldId: 'custrecord_liv_cm_auto_create_invoice'});
        	var medicalClaimsBilling = contractRec.getValue({ fieldId: 'custrecord_liv_cm_medical_claims_billing'});
        	var contractNumber = contractRec.getValue({ fieldId: 'custrecord_liv_cm_contract_number'});
        	var billToCustomer = contractRec.getValue({ fieldId: 'custrecord_liv_cm_bill_to_customer'});
        	var soldToCustomer = contractRec.getValue({ fieldId: 'custrecord_liv_cm_sold_to_customer'});
        	//var administrator = contractRec.getValue({ fieldId: 'custrecord_liv_cm_administrator'});
        	var partner = contractRec.getValue({ fieldId: 'custrecord_liv_cm_partner'});
        	var invoicePrefix = contractRec.getValue({ fieldId: 'custrecord_liv_cm_invoice_prefix'});
        	var invoiceNumber = invoicePrefix + getMMDDYY(new Date(periodDate));
        	
        	if(milestoneSKU == true){
        		invoiceNumber += "MS";
        	}
        	
        	loadedNBRec.setValue('custrecord_nb_actual_contract_status',actualContractStatus);
        	loadedNBRec.setValue('custrecord_nb_inactive_for_billing',inactiveForBilling);
        	loadedNBRec.setValue('custrecord_nb_auto_create_invoice',autoCreateInvoice);
        	loadedNBRec.setValue('custrecord_nb_medical_claim',medicalClaimsBilling);
        	loadedNBRec.setValue('custrecord_nb_contract_number',contractNumber);
        	loadedNBRec.setValue('custrecord_nb_bill_to_customer',billToCustomer);
        	loadedNBRec.setValue('custrecord_nb_sold_to_customer',soldToCustomer);
        	loadedNBRec.setValue('custrecord_nb_invoice_number',invoiceNumber);
        	loadedNBRec.setValue('custrecord_nb_partner',partner);
        	loadedNBRec.save({
        	    enableSourcing: true,
        	    ignoreMandatoryFields: true
        	});
        	
    	}
    	
 	   log.debug('afterSubmit','*****END*****');
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
    	 //beforeSubmit: beforeSubmit
    	 afterSubmit: afterSubmit
    };
});
