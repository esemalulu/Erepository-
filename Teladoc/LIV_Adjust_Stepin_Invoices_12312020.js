/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/email', 'N/record', 'N/runtime', 'N/search', 'N/format', 'N/task'],
/**
 * @param {email} email
 */
function(email, record, runtime, search, format, task) {
   
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function execute(scriptContext) {
    	log.emergency({ title: 'execute', details: '*****START*****'});
    	var invAdjRecSsearchId = runtime.getCurrentScript().getParameter("custscript_inv_adj_rec_search");
    	var invoicePeriod = runtime.getCurrentScript().getParameter("custscript_inv_period");
    	var wmItem = runtime.getCurrentScript().getParameter("custscript_wm_item");
    	var adminFeeItem = runtime.getCurrentScript().getParameter("custscript_admin_fee_item");
    	
    	if(!invAdjRecSsearchId || !invoicePeriod || !wmItem){
        	log.emergency({title: 'execute', details: 'Missing required script parameters: Invoice Adjustment Record Search or Invoice Period or WM Item.'});
        	log.emergency({title: 'execute', details: 'Returning...'});
        	return;
    	} 
    	
    	//Accoiunting Period Search to find the period id
    	var accPeriodSearch = search.create({
            type: search.Type.ACCOUNTING_PERIOD,
            filters: ['periodname', 'is', invoicePeriod]
        });
    	var accPeriodRange = accPeriodSearch.run().getRange({
            start: 0,
            end: 50
        });
    	var accPeriodId = '';
    	log.emergency({title: 'execute', details: 'accPeriodRange.length =' + accPeriodRange.length});
    	if(accPeriodRange.length == 1){
    		log.emergency({title: 'execute', details: 'accPeriodRange[0].id =' + accPeriodRange[0].id});
    		accPeriodId = accPeriodRange[0].id;
    	}else{
    		log.emergency({title: 'execute', details: 'Accouting Period not found.'});
        	log.emergency({title: 'execute', details: 'Returning...'});
        	return;
    	}
    	
    	//Step 1: Remove lines from Source Invoice
    	//Stepin Incoice Adjustment Custom Record Search
    	var filtersJSON = {
        		'custrecord_inv_period': invoicePeriod,
        		'custrecord_inv_adj_processed': false,
        		'custrecord_data_extracted_frm_src_inv': false
        };    	
    	var results = getAllInvoiceAdjRecords(null,invAdjRecSsearchId,filtersJSON,null);
    	//var results = getAllInvoiceAdjRecords(null,invAdjRecSsearchId,null,null);
    	log.emergency({title: 'execute', details: 'results.length =' + results.length});
    	
    	for(var i=0;i<results.length; i++){
    		var srcClientCode = results[i].getValue('custrecord_src_client_code');
    		
        	//PCC List Search 
     	    var pccListSearch = search.load({
                id: 'customsearch_liv_pccode_search'
            });
    	    
    	   var pccListSearchfilters = pccListSearch.filters;
    	   pccListSearchfilters.push(search.createFilter({ //create new filter
             name: 'name',
             operator: search.Operator.IS,
             values: srcClientCode
         	})	
    	  	);
    	  	var pccListSearchRsultRange = pccListSearch.run().getRange({
            start: 0,
            end: 1000
    	 	});
    	  	var srcClientCodeId = '';
    	  	if(pccListSearchRsultRange.length == 1){
    	  		srcClientCodeId = pccListSearchRsultRange[0].id;
    	  	}
    	  	else if(pccListSearchRsultRange.length == 0){
    	  		log.emergency({    
    	            title: 'execute', 
    	            details: 'Client code: ' + srcClientCode + 'not present in the PCCode list.'
    	        });
    	  	}
    	  	else{
    	  		
    	  		srcClientCodeId = pccListSearchRsultRange[0].id;
    	  		log.emergency({    
    	            title: 'execute', 
    	            details: 'pccListSearchRsultRange length: ' + pccListSearchRsultRange.length
    	        });
    	  		log.emergency({    
    	            title: 'execute', 
    	            details: 'More than 1 client code: ' + srcClientCode + 'present in the PCCode list.'
    	        });
    	  	}
    	  	log.emergency({title: 'execute', details: 'srcClientCodeId =' + srcClientCodeId});
    	  	
    		//Source Invoice Search
    	  	var srcInvoiceArr = [];
    		var srcInvoiceSearch = search.create({
                type: search.Type.INVOICE,
                filters: [
                          	['postingperiod', 'anyof', accPeriodId],
                          	'and', ['custcol_liv_invoice_client_code', 'anyof', srcClientCodeId],
                          	'and', [['item', 'anyof', wmItem],
                          	'or', ['item', 'anyof', adminFeeItem]]
                         ]
            });
        	var srcInvoiceResultRange = srcInvoiceSearch.run().getRange({
                start: 0,
                end: 1000
            });
        	log.emergency({title: 'execute', details: 'srcInvoiceResultRange.length =' + srcInvoiceResultRange.length});
        	for(var j=0;j<srcInvoiceResultRange.length;j++){
        		var srcInvoiceId = srcInvoiceResultRange[j].id;
        		log.emergency({title: 'execute', details: 'srcInvoiceId =' + srcInvoiceId});
        		var srcInvoice = null;
        		if(srcInvoiceArr.contains(srcInvoiceId)){
        			log.emergency({title: 'execute', details: 'This invoice is already processed.'});
        		}//if
        		else{
        			srcInvoice = record.load({
        			    type: record.Type.INVOICE,
        			       id: srcInvoiceId
        			       //isDynamic: true
        			   });
        			var invExternalId = srcInvoice.getValue({ fieldId: 'externalid' });
        			var numLines = srcInvoice.getLineCount({ sublistId: 'item' });
        			log.emergency({ title: 'execute', details: 'numLines : ' + numLines });
        			var count = 0;
        			var lineitem = null;
        			var lineitemdesc = '';
        			var itemQty = 0;
        			var itemRate = 0.0;
        			var itemAmount = 0.0;

        			var adminlineitem = null;
        			var adminlineitemdesc = '';
        			
        			//for(var k=0; numLines != count-1 || k<1000; k++){
        			for(var k=0; k<numLines; k++){	
        				log.emergency({ title: 'execute', details: 'k : ' + k });
        				/*try{
        					srcInvoice.selectLine({ sublistId: 'item', line: k });
        					lineitem = srcInvoice.getCurrentSublistValue({ sublistId: 'item',  fieldId: 'item' });
        				}
        				finally{
	        				//lineitem = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'item', line: k });
	        				if(lineitem == ''){
	        					srcInvoice.cancelLine({ sublistId: 'item' });
	        					continue;
	        		        }
        				}*/
        				
        				
        				var linenum = srcInvoice.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: wmItem });
        				log.emergency({ title: 'execute', details: 'linenum : ' + linenum });
        				
        				var adminlinenum = srcInvoice.findSublistLineWithValue({ sublistId: 'item', fieldId: 'custcol_is_wm_admin_fee', value: true });
        				log.emergency({ title: 'execute', details: 'adminlinenum : ' + adminlinenum });
        				        				
        				if(linenum >= 0){
        					lineitem = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'item', line: linenum });
        					lineitemdesc = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'description', line: linenum});
        					itemQty = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'quantity', line: linenum });
        					itemRate = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'rate', line: linenum });
        					itemAmount = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'amount', line: linenum });
        				
                			log.emergency({ title: 'execute', details: 'lineitem : ' + lineitem });
                			log.emergency({ title: 'execute', details: 'lineitemdesc : ' + lineitemdesc });
                			log.emergency({ title: 'execute', details: 'itemQty : ' + itemQty });
                			log.emergency({ title: 'execute', details: 'itemRate : ' + itemRate });
                			log.emergency({ title: 'execute', details: 'itemAmount : ' + itemAmount });
        				}
        				else if(adminlinenum >= 0 ){
        					adminlineitem = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'item', line: adminlinenum });
        					adminlineitemdesc = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'description', line: adminlinenum});
        				
        					log.emergency({ title: 'execute', details: 'adminlineitem : ' + adminlineitem });
                			log.emergency({ title: 'execute', details: 'adminlineitemdesc : ' + adminlineitemdesc });
        				}
        				else{
        					log.emergency({ title: 'execute', details: 'Skipping this line...' });
        					continue;
        				}
            			            			
            			//Weight Management Item
        				if(lineitem == wmItem){
        					if(lineitemdesc.indexOf('Tier') >= 0){
        						log.emergency({ title: 'execute', details: 'Tier-2'});
        						record.submitFields({
        		        		    type: 'customrecord_liv_stepin_inv_adjustments',
        		        		    id: results[i].id,
        		        		    values: { 
        		        		    	'custrecord_src_invoice': invExternalId,
        		        		    	'custrecord_qty_t2': itemQty,
        		        		    	'custrecord_price_t2': itemRate,
        		        		    	'custrecord_amt_t2': itemAmount,
        		        		    	'custrecord_data_extracted_frm_src_inv': true
        		        		    }
        		        		});
            				}else{
            					log.emergency({ title: 'execute', details: 'Tier-1'});
            					record.submitFields({
            	        		    type: 'customrecord_liv_stepin_inv_adjustments',
            	        		    id: results[i].id,
            	        		    values: { 
        		        		    	'custrecord_src_invoice': invExternalId,
        		        		    	'custrecord_qty_t1': itemQty,
        		        		    	'custrecord_price_t1': itemRate,
        		        		    	'custrecord_amt_t1': itemAmount,
        		        		    	'custrecord_data_extracted_frm_src_inv': true
            	        		    }
            	        		});
            				}
        					srcInvoice.removeLine({ sublistId: 'item', line: linenum});
        					
        				}
        				
        				//Admin Fee for Weight Management Item
        				if(adminlineitem == adminFeeItem){
        					if(adminlineitemdesc.indexOf('Weight') >= 0){
        						log.emergency({ title: 'execute', details: 'Admin Fee for Weight Management Item'});
        						/*record.submitFields({
        		        		    type: 'customrecord_liv_stepin_inv_adjustments',
        		        		    id: results[i].id,
        		        		    values: { 
        		        		    	'custrecord_src_invoice': invExternalId,
        		        		    	'custrecord_qty_t2': itemQty,
        		        		    	'custrecord_price_t2': itemRate,
        		        		    	'custrecord_amt_t2': itemAmount,
        		        		    	'custrecord_data_extracted_frm_src_inv': true
        		        		    }
        		        		});*/
        						srcInvoice.removeLine({ sublistId: 'item', line: adminlinenum});
            				}else{
            					log.emergency({ title: 'execute', details: 'Admin Fee for Other Program Item'});
            				}
        				}
        				
        			}//numLines end

        			srcInvoiceArr.push(srcInvoiceId);
        			srcInvoice.save({
        			    enableSourcing: true,
        			    ignoreMandatoryFields: true
        			});
        		}//else
        		
        	}// j loop
    		
    	}//i loop	
    	
    	log.emergency({ title: 'execute', details: 'Step 1: Remove lines from Source Invoice: Completed'});
    	
    	//Step 2: Add lines to Target Invoice
    	//Stepin Incoice Adjustment Custom Record Search
    	var filtersJSON2 = {
        		'custrecord_inv_period': invoicePeriod,
        		'custrecord_inv_adj_processed': false,
        		'custrecord_data_extracted_frm_src_inv': true
        };    	
    	var results2 = getAllInvoiceAdjRecords(null,invAdjRecSsearchId,filtersJSON2,null);
    	log.emergency({title: 'execute', details: 'results2.length =' + results2.length});
    	
    	var tgtQty1_t1 = 0;
    	var tgtRate1_t1 = 0.0;
    	var tgtAmt1_t1 = 0.0;
    	
    	var tgtQty2_t1 = 0;
    	var tgtRate2_t1 = 0.0;
    	var tgtAmt2_t1 = 0.0;
    	
    	var tgtQty1_t2 = 0;
    	var tgtRate1_t2 = 0.0;
    	var tgtAmt1_t2 = 0.0;
    	
    	var tgtQty2_t2 = 0;
    	var tgtRate2_t2 = 0.0;
    	var tgtAmt2_t2 = 0.0;
    	
    	var currTgtRate_t1 = 0.0;
    	var prevTgtRate_t1 = 0.0;
    	var currTgtRate_t2 = 0.0;
    	var prevTgtRate_t2 = 0.0;
    	
    	for(var a=0; a<results2.length; a++){
    		
    		currTgtRate_t1 = results2[a].getValue('custrecord_price_t1') ? parseFloat(results2[a].getValue('custrecord_price_t1')) : 0.0;
    		currTgtRate_t2 = results2[a].getValue('custrecord_price_t2') ? parseFloat(results2[a].getValue('custrecord_price_t2')) : 0.0;
    		
    		log.emergency({title: 'execute', details: 'currTgtRate_t1 =' + currTgtRate_t1});
    		log.emergency({title: 'execute', details: 'prevTgtRate_t1 =' + prevTgtRate_t1});
    		
    		log.emergency({title: 'execute', details: 'currTgtRate_t2 =' + currTgtRate_t2});
    		log.emergency({title: 'execute', details: 'prevTgtRate_t2 =' + prevTgtRate_t2});
    		
    		if(prevTgtRate_t1 == 0.0 && prevTgtRate_t2 == 0.0)
    		{//First row
    			log.emergency({title: 'execute', details: 'First row'});
    			tgtQty1_t1 = results2[a].getValue('custrecord_qty_t1') ? parseInt(results2[a].getValue('custrecord_qty_t1')) : 0;
    			tgtRate1_t1 = results2[a].getValue('custrecord_price_t1') ? parseFloat(results2[a].getValue('custrecord_price_t1')) : 0.0;
    			prevTgtRate_t1 = currTgtRate_t1;
    			
    			tgtQty1_t2 = results2[a].getValue('custrecord_qty_t2') ? parseInt(results2[a].getValue('custrecord_qty_t2')) : 0;
    			tgtRate1_t2 = results2[a].getValue('custrecord_price_t2') ? parseFloat(results2[a].getValue('custrecord_price_t2')) : 0.0;
    			prevTgtRate_t2 = currTgtRate_t2;
    		}
    		else{
    			if(currTgtRate_t1 == prevTgtRate_t1 && currTgtRate_t1 == tgtRate1_t1){
    				log.emergency({title: 'execute', details: '1'});
    				tgtQty1_t1 += results2[a].getValue('custrecord_qty_t1') ? parseInt(results2[a].getValue('custrecord_qty_t1')) : 0;
    				prevTgtRate_t1 = currTgtRate_t1;
    			}
    			else{
    				log.emergency({title: 'execute', details: '2'});
    				tgtQty2_t1 += results2[a].getValue('custrecord_qty_t1') ? parseInt(results2[a].getValue('custrecord_qty_t1')) : 0;
    				tgtRate2_t1 = currTgtRate_t1;
    				prevTgtRate_t1 = currTgtRate_t1;
    			}
    			if(currTgtRate_t2 == prevTgtRate_t2 && currTgtRate_t2 == tgtRate1_t2){
    				log.emergency({title: 'execute', details: '3'});
    				tgtQty1_t2 += results2[a].getValue('custrecord_qty_t2') ? parseInt(results2[a].getValue('custrecord_qty_t2')) : 0;
    				prevTgtRate_t2 = currTgtRate_t2;
    			}
    			else{
    				log.emergency({title: 'execute', details: '4'});
    				tgtQty2_t2 += results2[a].getValue('custrecord_qty_t2') ? parseInt(results2[a].getValue('custrecord_qty_t2')) : 0;
    				tgtRate2_t2 = currTgtRate_t2;
    				prevTgtRate_t2 = currTgtRate_t2;
    			}
    		}//else 		
    		
    		record.submitFields({
    		    type: 'customrecord_liv_stepin_inv_adjustments',
    		    id: results2[a].id,
    		    values: { 
    		    	'custrecord_inv_adj_processed': true
    		    	}
    		});
    		
    	}//for
    	log.emergency({ title: 'execute', details: 'tgtQty1_t1 : ' + tgtQty1_t1 });
    	log.emergency({ title: 'execute', details: 'tgtRate1_t1 : ' + tgtRate1_t1 });
    	log.emergency({ title: 'execute', details: 'tgtQty2_t1 : ' + tgtQty2_t1 });
    	log.emergency({ title: 'execute', details: 'tgtRate2_t1 : ' + tgtRate2_t1 });
    	
    	log.emergency({ title: 'execute', details: 'tgtQty1_t2 : ' + tgtQty1_t2 });
    	log.emergency({ title: 'execute', details: 'tgtRate1_t2 : ' + tgtRate1_t2 });
    	log.emergency({ title: 'execute', details: 'tgtQty2_t2 : ' + tgtQty2_t2 });
    	log.emergency({ title: 'execute', details: 'tgtRate2_t2 : ' + tgtRate2_t2 });
    	
    	var tgtInvoiceId = '';
    	var tgtContractNumber = '';
    	var tgtClientCodeId = '';
    	
    	if(results2 && results2.length > 0){
    		log.emergency({ title: 'execute', details: 'results2[0].id : ' + results2[0].id });
    		
    		tgtInvoiceId = results2[0].getValue('custrecord_tgt_invoice_id');
        	log.emergency({ title: 'execute', details: 'tgtInvoiceId : ' + tgtInvoiceId });
        	
        	tgtContractNumber = results2[0].getValue('custrecord_tgt_contract_number');
        	log.emergency({ title: 'execute', details: 'tgtContractNumber : ' + tgtContractNumber });
    	
        	tgtClientCodeId = results2[0].getValue('custrecord_tgt_client_code_id');
        	log.emergency({ title: 'execute', details: 'tgtClientCodeId : ' + tgtClientCodeId });        	
        	
	    	var tgtInvoice = record.load({
			    type: record.Type.INVOICE,
			       id: tgtInvoiceId,
			       isDynamic: true
			   });
	    	
	    	var wmItemDesc_t1 = 'Livongo for Weight Management';
	    	var wmItemDesc_t2 = 'Livongo for Weight Management - Tier-2';
	    	
	    	if(tgtQty1_t1 > 0){
	    		tgtInvoice.selectNewLine({ sublistId: 'item' });
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: wmItem});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: wmItemDesc_t1});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: tgtQty1_t1});
	    		tgtInvoice.setCurrentSublistText({ sublistId: 'item', fieldId: 'price', value: 'Custom'});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: tgtRate1_t1});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_liv_invoice_client_code', value: tgtClientCodeId});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_liv_sol_contract_number', value: tgtContractNumber});
	    		tgtInvoice.commitLine({ sublistId: 'item' });
	    	}
	    	if(tgtQty2_t1 > 0){
	    		tgtInvoice.selectNewLine({ sublistId: 'item' });
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: wmItem});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: wmItemDesc_t1});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: tgtQty2_t1});
	    		tgtInvoice.setCurrentSublistText({ sublistId: 'item', fieldId: 'price', value: 'Custom'});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: tgtRate2_t1});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_liv_invoice_client_code', value: tgtClientCodeId});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_liv_sol_contract_number', value: tgtContractNumber});
	    		tgtInvoice.commitLine({ sublistId: 'item' });
	    	}
	    	if(tgtQty1_t2 > 0){
	    		tgtInvoice.selectNewLine({ sublistId: 'item' });
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: wmItem});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: wmItemDesc_t2});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: tgtQty1_t2});
	    		tgtInvoice.setCurrentSublistText({ sublistId: 'item', fieldId: 'price', value: 'Custom'});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: tgtRate1_t2});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_liv_invoice_client_code', value: tgtClientCodeId});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_liv_sol_contract_number', value: tgtContractNumber});
	    		tgtInvoice.commitLine({ sublistId: 'item' });
	    	}
	    	if(tgtQty2_t2 > 0){
	    		tgtInvoice.selectNewLine({ sublistId: 'item' });
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: wmItem});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: wmItemDesc_t2});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: tgtQty2_t2});
	    		tgtInvoice.setCurrentSublistText({ sublistId: 'item', fieldId: 'price', value: 'Custom'});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: tgtRate2_t2});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_liv_invoice_client_code', value: tgtClientCodeId});
	    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_liv_sol_contract_number', value: tgtContractNumber});
	    		tgtInvoice.commitLine({ sublistId: 'item' });
	    	}
	    	
	    	
	    	tgtInvoice.save({
			    enableSourcing: true,
			    ignoreMandatoryFields: true
			});
    	}  
    	log.emergency({ title: 'execute', details: 'Step 2: Add lines to Target Invoice: Completed'});
    	
    	log.emergency({ title: 'execute', details: '*****END*****'});
    }//execute
    
    function getAllInvoiceAdjRecords(searchRecordtype, searchId, filtersJSON, searchColumns){
    	//log.emergency({title: 'getAllResults', details: 'START'});
    	var startIndex = 0;
    	var endIndex = 1000;
    	var searchResults = [];    	
    	var savedSearch = null;
    	
    	if(searchId){
    		//log.emergency({title: 'getAllResults', details: 'searchId = '+searchId});
	    	savedSearch = search.load({
	            id: searchId
	    	});
	    	var filters = savedSearch.filters;
	    	var columns = savedSearch.columns;
	    	
	    	//log.emergency({title: 'getAllResults', details: 'BEFORE filters.length = '+filters.length});
	    	for (var key in filtersJSON) {
	    		log.emergency({title: 'KEY = '+key, details:'VALUE = '+filtersJSON[key]});
				if(key == 'custrecord_inv_period'){
					filters.push(search.createFilter({ //create new filter
			            name: 'custrecord_inv_period',
			            operator: search.Operator.IS,
			            values: filtersJSON[key]
			        }));
				}
				else if(key == 'custrecord_inv_adj_processed'){
					filters.push(search.createFilter({ //create new filter
			            name: 'custrecord_inv_adj_processed',
			            operator: search.Operator.IS,
			            values: filtersJSON[key]
			        }));
				}
				else if(key == 'custrecord_data_extracted_frm_src_inv'){
					filters.push(search.createFilter({ //create new filter
			            name: 'custrecord_data_extracted_frm_src_inv',
			            operator: search.Operator.IS,
			            values: filtersJSON[key]
			        }));
				}
	    	}
	    	//log.emergency({title: 'getAllResults', details: 'AFTER filters.length = '+filters.length});
	    	
	    	//log.emergency({title: 'getAllResults', details: 'BEFORE columns.length = '+columns.length});
	    	for(j=0;j<searchColumns && searchColumns.length; j++){
	    		columns.push(searchColumns[j]);
	    	}
	    	//log.emergency({title: 'getAllResults', details: 'AFTER columns.length = '+columns.length});
	    	
    	}else if(searchRecordtype){
    		if(searchFilters && searchColumns){
	    		savedSearch = search.create({
	    	        type: search.Type.searchRecordtype,
	    	        filters: searchFilters,
	    	        columns: searchColumns
	    		});
    		}else if(searchFilters && !searchColumns){
    			savedSearch = search.create({
	    	        type: search.Type.searchRecordtype,
	    	        filters: searchFilters
	    		});
    		}else if(!searchFilters && searchColumns){
	    		savedSearch = search.create({
	    	        type: search.Type.searchRecordtype,
	    	        columns: searchColumns
	    		});
    		}
    	}else{
    		log.emergency('Missing required argument: searchRecordtype');
    	}
    	
    	var resultRange = savedSearch.run().getRange({
            start: startIndex,
            end: endIndex
        });
    	for(var i=0;i<resultRange.length;i++){
    		//log.emergency(i);
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
    	log.emergency({title: 'getAllResults', details: 'searchResults.length = '+searchResults.length});
    	//log.emergency({title: 'getAllResults', details: 'END'});
    	return searchResults;
    }
    
    Array.prototype.contains = function(v) {
    	  for (var i = 0; i < this.length; i++) {
    	    if (this[i] === v) return true;
    	  }
    	  return false;
    	};
    
    Array.prototype.unique = function() {
    	  var arr = [];
    	  for (var i = 0; i < this.length; i++) {
    	    if (!arr.contains(this[i])) {
    	      arr.push(this[i]);
    	    }
    	  }
    	  return arr;
    	}

    return {
        execute: execute
    };
});
