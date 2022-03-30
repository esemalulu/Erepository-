/** 
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define ( ['N/record', 'N/search', 'N/runtime', 'N/format'] ,
    function(record, search, runtime, format) {
        function setActiveQtySum(context) {    
        	log.debug({title: 'setActiveQtySum', details: '*****START*****'});
        	log.debug({title: 'context.type', details: context.type});
            if (context.type !== context.UserEventType.CREATE){
            	log.debug({    
	                title: 'setActiveQtySum', 
	                details: 'Context Type is not Create. Returning...' 
				});
                return;    
            }
            /*if(runtime.executionContext !== runtime.ContextType.USERINTERFACE){
        		log.debug({    
	                title: 'setActiveQtySum', 
	                details: 'Context Type is not User Interface. Returning...' 
				});
        		return;
        	}*/
            try
            {
            	var sum = 0;
	            var billlingSummary2Record = context.newRecord;	           
	            
	            var recType = billlingSummary2Record.getValue('custrecord_bs2_record_type');
	            if(recType !== 'Billing'){
	            	log.debug({    
		                title: 'setActiveQtySum', 
		                details: 'Record Type is not Billing. Returning...' 
					});
	                return;  
	            }
	            	            
	            var clientCode = billlingSummary2Record.getValue('custrecord_bs2_client_code');
	            var bs2Date = billlingSummary2Record.getValue('custrecord_bs2_date');
	            
	            
	            var billingSearch = runtime.getCurrentScript().getParameter("custscript_billing_summary_table_srch_2");
	        	if(!billingSearch){
	            	log.debug({title: 'setActiveQtySum', details: 'Missing required script parameters: BILLING SUMMARY TABLE SEARCH'});
	            	log.debug({title: 'setActiveQtySum', details: 'Returning...'});
	            	return;
	        	}            
	        	
	        	var billingSummarySearch = search.load({
	                id: billingSearch
	        	});
	        	var filters = billingSummarySearch.filters;
	        	
	        	log.debug('FILTER: clientCode = '+clientCode);
	        	filters.push(search.createFilter({ //create new filter
	                name: 'custrecord_bs2_client_code',
	                operator: search.Operator.IS,
	                values: clientCode
	            	})	
	            );
	        	log.debug('FILTER: bs2Date = '+bs2Date);
	        	var formattedEndDate = format.format({
	                value: bs2Date,
	                type: format.Type.DATE
	            });
	        	filters.push(search.createFilter({ //create new filter
	                name: 'custrecord_bs2_date',
	                operator: search.Operator.ON,
	                values: formattedEndDate
	            	})	
	            );
	        	log.debug('FILTER: formattedEndDate = '+formattedEndDate);
	        	
	        	var resultRange = billingSummarySearch.run().getRange({
	                start: 0,
	                end: 1000
	            });
	           
        		for(var k=0;resultRange && k<resultRange.length;k++){
        			log.debug({title: 'setActiveQtySum', details: 'BS2 Record ID = '+resultRange[k].id});
        			currentActiveMemberQuantity = resultRange[k].getValue('custrecord_bs2_active_members_qty') ? parseInt(resultRange[k].getValue('custrecord_bs2_active_members_qty')) : 0;
        			log.debug({title: 'setActiveQtySum', details: 'currentActiveMemberQuantity = '+currentActiveMemberQuantity});
        			sum = sum + currentActiveMemberQuantity;
        			log.debug({title: 'setActiveQtySum', details: 'currentActiveMemberQuantitySum = '+sum});
                }	        	
        		log.debug({title: 'setActiveQtySum', details: 'currentActiveMemberQuantitySum = '+sum});
        		
        		for(var k=0;resultRange && k<resultRange.length;k++){
        			record.submitFields({
        	    	    type: 'customrecord_liv_billing_summary_v2',
        	    	    id: resultRange[k].id,
        	    	    values: {
        	    	        'custrecord_bs2_active_members_qty_sum': sum
        	    	    }
        	    	});
                }
	            
        		log.debug({title: 'setActiveQtySum', details: 'ActiveMemberQuantitySum updated for Client Code = '+clientCode});
            }catch (e) {
            	log.error({    
	                title: 'setActiveQtySum', 
	                details: 'Error updating ActiveMemberQuantitySum.'+ 
	                			'\nError Name: ' + e.name + '\nError Message: ' + e.message
				});               
            } 
            log.debug({title: 'setActiveQtySum', details: '*****END*****'});
        }

        return {
            afterSubmit: setActiveQtySum
        };   
    });