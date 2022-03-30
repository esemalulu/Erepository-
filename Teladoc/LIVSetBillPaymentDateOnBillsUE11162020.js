/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],
function(record, search) {
    function afterSubmit(context) {
    	var vendorBillInternalId = '';
    	try{
    		log.debug('afterSubmit','*****START*****');
        	/*if (context.type !== context.UserEventType.CREATE){
        		 log.debug('afterSubmit','Event Type is not CREATE. Returning...');
        		 return;
        	}*/
        	var vendorPayment = context.newRecord;
        	var vendorPaymentId = vendorPayment.id;
        	var vendorPaymentDate = vendorPayment.getValue({fieldId: 'trandate'});
        	var vendorBillsSearch = search.create({
     	        type: search.Type.VENDOR_BILL,
     	        //columns: ['trandate'],
     	        filters: [['mainline', 'is', 'T'],
     	                  'and',
     	                 ['applyingtransaction', 'anyof', vendorPaymentId]
     	        ]	
        	});
     	 
        	var resultSet = vendorBillsSearch.run();

     	    var resultRange = resultSet.getRange({
     	        start: 0,
     	        end: 1000
     	    });
     	    
     	    for(var i=0;i<resultRange.length;i++){
     	    	vendorBillInternalId = resultRange[i].id;
     	    	record.submitFields({
     	    	    type: record.Type.VENDOR_BILL,
     	    	    id: resultRange[i].id,
     	    	    values: {
     	    	    	custbody_bill_payment_date: vendorPaymentDate
     	    	    },
     	    	    options: {
     	    	        enableSourcing: false,
     	    	        ignoreMandatoryFields : true
     	    	    }
     	    	});
     	    	log.debug('afterSubmit','Vendor Bill ID: '+vendorBillInternalId);
     	    }
     	   log.debug('afterSubmit','*****END*****');
    	}
    	catch(e){
    		log.debug('afterSubmit','Could not update Vendor Bill with Internal ID: '+vendorBillInternalId);
    	}
    }
    return {
        afterSubmit: afterSubmit
    };
});
