/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search) {
    function execute(scriptContext) {
    	log.debug('execute','*****START*****');
    	
    	//var billPaymentSearchId = 1200;//SB1
     	var billPaymentSearchId = 1140;//Prod
    	var billPaymentSearchResults = getAllResults(billPaymentSearchId);
    	
    	for(var j=0;j<billPaymentSearchResults.length;j++){
        	var vendorPaymentDate = billPaymentSearchResults[j].getValue('trandate');
        	var vendorBillId = billPaymentSearchResults[j].getValue('appliedtotransaction');
    	
        	log.debug('execute','Vendor Bill ID: '+ vendorBillId);
 	    	record.submitFields({
 	    	    type: record.Type.VENDOR_BILL,
 	    	    id: vendorBillId,
 	    	    values: {
 	    	    	custbody_bill_payment_date: vendorPaymentDate
 	    	    },
 	    	    options: {
 	    	        enableSourcing: false,
 	    	        ignoreMandatoryFields : true
 	    	    }
 	    	});
    	}
    	
    	log.debug('execute','*****END*****');
    }
    
    function getAllResults(searchId){
    	log.debug({title: 'getAllResults', details: 'START'});
    	var startIndex = 0;
    	var endIndex = 1000;
    	var searchResults = [];    	
    	var savedSearch = null;
    	
		log.debug({title: 'getAllResults', details: 'searchId = '+searchId});
    	savedSearch = search.load({
            id: searchId//Bill Payment Search
    	});
    	var filters = savedSearch.filters;
    	var columns = savedSearch.columns;
    	
    	var resultRange = savedSearch.run().getRange({
            start: startIndex,
            end: endIndex
        });
    	
    	for(var i=0;i<resultRange.length;i++){
    		//log.debug(i);
    		searchResults.push(resultRange[i]);
    		if(i==resultRange.length-1){
    			startIndex += 1000;
    			endIndex += 1000;
    			i=-1;
    			resultRange = savedSearch.run().getRange({
    	            start: startIndex,
    	            end: endIndex
    	        });
    		}
    	}
    	log.debug({title: 'getAllResults', details: 'searchResults.length = '+searchResults.length});
    	log.debug({title: 'getAllResults', details: 'END'});
    	return searchResults;
    }

    return {
        execute: execute
    };
    
});
