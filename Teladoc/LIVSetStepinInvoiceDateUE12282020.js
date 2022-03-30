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
    	if (runtime.executionContext == 'CSVIMPORT' || runtime.executionContext == 'USERINTERFACE'){
    		
    		var tgtClientCode = 'STEPIN';
        	
        	var invAdjRec = context.newRecord;
        	var invPeriodEndDate = invAdjRec.getValue('custrecord_invoice_period_end_date');
        	var invPeriodEndDateObj = new Date(invPeriodEndDate);
        	var invPeriod = getPeriod(invPeriodEndDateObj);
        	log.debug('beforeSubmit','invPeriod = '+invPeriod);
        	
        	var mmddyy = getMMDDYY(invPeriodEndDateObj);
        	log.debug('beforeSubmit','mmddyy = '+mmddyy);
        	
        	//Invoice Search
        	var tgtInvoiceSearch = search.create({
                type: search.Type.INVOICE,
                filters: [
                          	['mainline', 'is', 'T'],
                          	'and', ['externalid', 'is', 'ESIWM'+mmddyy]
                         ]
            });
        	var tgtInvoiceResultRange = tgtInvoiceSearch.run().getRange({
                start: 0,
                end: 1000
            });
        	var tgtInvoiceId = '';
        	if(tgtInvoiceResultRange.length > 0){
        		tgtInvoiceId = tgtInvoiceResultRange[0].id;
        	}
        	
        	//PCC List Search 
     	    var pccListSearch = search.load({
                id: 'customsearch_liv_pccode_search'
            });
    	    
    	   var pccListSearchfilters = pccListSearch.filters;
    	   pccListSearchfilters.push(search.createFilter({ //create new filter
             name: 'name',
             operator: search.Operator.IS,
             values: tgtClientCode
         	})	
    	  	);
    	  	var pccListSearchRsultRange = pccListSearch.run().getRange({
            start: 0,
            end: 1000
    	 	});
    	  	var tgtClientCodeId = '';
    	  	if(pccListSearchRsultRange.length == 1){
    	  		tgtClientCodeId = pccListSearchRsultRange[0].id;
    	  	}
    	  	else if(pccListSearchRsultRange.length == 0){
    	  		log.debug({    
    	            title: 'createBillingSummary2Record', 
    	            details: 'Client code: ' + tgtClientCode + 'not present in the PCCode list.'
    	        });
    	  	}
    	  	else{
    	  		
    	  		tgtClientCodeId = pccListSearchRsultRange[0].id;
    	  		log.debug({    
    	            title: 'createBillingSummary2Record', 
    	            details: 'pccListSearchRsultRange length: ' + pccListSearchRsultRange.length
    	        });
    	  		log.debug({    
    	            title: 'createBillingSummary2Record', 
    	            details: 'More than 1 client code: ' + tgtClientCode + 'present in the PCCode list.'
    	        });
    	  	}
        	
        	//Contract Search
        	var tgtContractSearch = search.create({
                type: 'customrecord_liv_contracts',
                columns: ['custrecord_liv_cm_contract_number'],
                filters: [
                          	['custrecord_liv_cm_contract_status', 'is', 'Active'],
                          	'and', ['custrecord_liv_cm_client_code', 'anyof', tgtClientCodeId]
                         ]
            });
        	var tgtContractResultRange = tgtContractSearch.run().getRange({
                start: 0,
                end: 1000
            });
        	var tgtContractNumber = '';
        	if(tgtContractResultRange.length > 0){
        		tgtContractNumber = tgtContractResultRange[0].getValue('custrecord_liv_cm_contract_number');
        	}
        		
        	invAdjRec.setValue('custrecord_inv_period',invPeriod);
        	invAdjRec.setValue('custrecord_tgt_client_code',tgtClientCode);
        	invAdjRec.setValue('custrecord_tgt_client_code_id',tgtClientCodeId)
        	invAdjRec.setValue('custrecord_tgt_invoice','ESIWM'+mmddyy);
        	invAdjRec.setValue('custrecord_tgt_invoice_id',tgtInvoiceId);
        	invAdjRec.setValue('custrecord_tgt_contract_number',tgtContractNumber);
    		
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
