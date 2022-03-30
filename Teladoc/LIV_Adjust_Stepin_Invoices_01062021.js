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
    	log.debug({ title: 'execute', details: '*****START*****'});
    	var invAdjRecSsearchId = runtime.getCurrentScript().getParameter("custscript_inv_adj_rec_search");
    	var invPeriodEndDate = runtime.getCurrentScript().getParameter("custscript_inv_period_end_date");
    	//var invoicePeriod = runtime.getCurrentScript().getParameter("custscript_inv_period");
    	var wmItem = runtime.getCurrentScript().getParameter("custscript_wm_item");
    	var adminFeeItem = runtime.getCurrentScript().getParameter("custscript_admin_fee_item");
    	var wmTermItem = runtime.getCurrentScript().getParameter("custscript_wm_term_item");
    	
    	log.debug({title: 'execute', details: 'invAdjRecSsearchId =' + invAdjRecSsearchId});
    	log.debug({title: 'execute', details: 'invPeriodEndDate =' + invPeriodEndDate});
    	log.debug({title: 'execute', details: 'wmItem =' + wmItem});
    	log.debug({title: 'execute', details: 'adminFeeItem =' + adminFeeItem});
    	log.debug({title: 'execute', details: 'wmTermItem =' + wmTermItem});
    	
    	var formattedInvPeriodEndDate = format.format({
            value: invPeriodEndDate,
            type: format.Type.DATE
        });
    	
    	
    	if(!invAdjRecSsearchId || !invPeriodEndDate || !wmItem || !adminFeeItem || !wmTermItem){
        	log.debug({title: 'execute', details: 'Missing required script parameters.'});
        	log.debug({title: 'execute', details: 'Returning...'});
        	return;
    	} 
    	
    	var invPeriodEndDateObj = new Date(invPeriodEndDate);
    	var invoicePeriod = getPeriod(invPeriodEndDateObj);
    	log.debug('execute','invoicePeriod = '+invoicePeriod);
    	
    	var mmddyy = getMMDDYY(invPeriodEndDateObj);
    	log.debug('execute','mmddyy = '+mmddyy);
    	
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
    	log.debug({title: 'execute', details: 'accPeriodRange.length =' + accPeriodRange.length});
    	if(accPeriodRange.length == 1){
    		log.debug({title: 'execute', details: 'accPeriodRange[0].id =' + accPeriodRange[0].id});
    		accPeriodId = accPeriodRange[0].id;
    	}else{
    		log.debug({title: 'execute', details: 'Accouting Period not found.'});
        	log.debug({title: 'execute', details: 'Returning...'});
        	return;
    	}
    	
    	var tgtClientCode = 'STEPIN';
    	//PCC List Search 
 	    var pccTgtListSearch = search.load({
            id: 'customsearch_liv_pccode_search'
        });
	    
	   var pccTgtListSearchfilters = pccTgtListSearch.filters;
	   pccTgtListSearchfilters.push(search.createFilter({ //create new filter
         name: 'name',
         operator: search.Operator.IS,
         values: tgtClientCode
     	})	
	  	);
	  	var pccTgtListSearchRsultRange = pccTgtListSearch.run().getRange({
        start: 0,
        end: 1000
	 	});
	  	var tgtClientCodeId = '';
	  	if(pccTgtListSearchRsultRange.length == 1){
	  		tgtClientCodeId = pccTgtListSearchRsultRange[0].id;
	  	}
	  	else if(pccTgtListSearchRsultRange.length == 0){
	  		log.debug({    
	            title: 'execute', 
	            details: 'Client code: ' + tgtClientCode + 'not present in the PCCode list.'
	        });
	  	}
	  	else{
	  		
	  		tgtClientCodeId = pccTgtListSearchRsultRange[0].id;
	  		log.debug({    
	            title: 'execute', 
	            details: 'pccListSearchRsultRange length: ' + pccTgtListSearchRsultRange.length
	        });
	  		log.debug({    
	            title: 'execute', 
	            details: 'More than 1 client code: ' + tgtClientCode + 'present in the PCCode list.'
	        });
	  	}
	  	log.debug({title: 'execute', details: 'tgtClientCodeId =' + tgtClientCodeId});
	  	
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
    	
    	//Step 1: Remove lines from Source Invoice
    	//Stepin Incoice Adjustment Custom Record Search
    	var filtersJSON = {
        		//'custrecord_inv_period': invoicePeriod,
        		'custrecord_inv_adj_processed': false,
        		'custrecord_data_extracted_frm_src_inv': false
        };    	
    	
    	// Stepin Adjustment Client Code Search
    	
    	var stepinClientCodeSearch = search.create({
            type: 'customrecord_stepin_adj_client_code',
            columns: ['custrecord_client_code'],
            filters: [
                      	['isinactive', 'is', false]
                     ]
        });
    	var results = stepinClientCodeSearch.run().getRange({
            start: 0,
            end: 1000
        });
    	//var results = getAllInvoiceAdjRecords(null,invAdjRecSsearchId,filtersJSON,null);
    	//var results = getAllInvoiceAdjRecords(null,invAdjRecSsearchId,null,null);
    	log.debug({title: 'execute', details: 'results.length =' + results.length});
    	
    	for(var i=0;i<results.length; i++){
    		var srcClientCode = results[i].getValue('custrecord_client_code');
    		
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
    	  		log.debug({    
    	            title: 'execute', 
    	            details: 'Client code: ' + srcClientCode + 'not present in the PCCode list.'
    	        });
    	  	}
    	  	else{
    	  		
    	  		srcClientCodeId = pccListSearchRsultRange[0].id;
    	  		log.debug({    
    	            title: 'execute', 
    	            details: 'pccListSearchRsultRange length: ' + pccListSearchRsultRange.length
    	        });
    	  		log.debug({    
    	            title: 'execute', 
    	            details: 'More than 1 client code: ' + srcClientCode + 'present in the PCCode list.'
    	        });
    	  	}
    	  	log.debug({title: 'execute', details: 'srcClientCodeId =' + srcClientCodeId});
    	  	
    		//Source Invoice Search
    	  	var srcInvoiceArr = [];
    		var srcInvoiceSearch = search.create({
                type: search.Type.INVOICE,
                filters: [
                          	['postingperiod', 'anyof', accPeriodId],
                          	'and', ['custcol_liv_invoice_client_code', 'anyof', srcClientCodeId],
                          	'and', [['item', 'anyof', wmItem],
                          	'or', ['item', 'anyof', wmTermItem],        
                          	'or', ['item', 'anyof', adminFeeItem]]
                         ]
            });
        	var srcInvoiceResultRange = srcInvoiceSearch.run().getRange({
                start: 0,
                end: 1000
            });
        	log.debug({title: 'execute', details: 'srcInvoiceResultRange.length =' + srcInvoiceResultRange.length});
        	for(var j=0;j<srcInvoiceResultRange.length;j++){
        		var srcInvoiceId = srcInvoiceResultRange[j].id;
        		log.debug({title: 'execute', details: 'srcInvoiceId =' + srcInvoiceId});
        		var srcInvoice = null;
        		if(srcInvoiceArr.contains(srcInvoiceId)){
        			log.debug({title: 'execute', details: 'This invoice is already processed.'});
        		}//if
        		else{
        			srcInvoice = record.load({
        			    type: record.Type.INVOICE,
        			       id: srcInvoiceId
        			       //isDynamic: true
        			   });
        			var invExternalId = srcInvoice.getValue({ fieldId: 'externalid' });
        			var numLines = srcInvoice.getLineCount({ sublistId: 'item' });
        			log.debug({ title: 'execute', details: 'numLines : ' + numLines });
        			var count = 0;
        			var lineitem = null;
        			var lineitemdesc = '';
        			var itemQty = 0;
        			var itemRate = 0.0;
        			var itemAmount = 0.0;

        			var adminlineitem = null;
        			var adminlineitemdesc = '';
        			var adminlineQty = 0;
        			var adminlineRate = 0.0;
        			var adminlineAmount = 0.0;

        			var wmtermlineitem = null;
        			var wmtermlineitemdesc = '';
        			var wmtermitemQty = 0;
        			var wmtermitemRate = 0.0;
        			var wmtermitemAmount = 0.0;
        			
        			var termRate = 0.0;
        			
        			for(var k=0; k<numLines; k++){	
        				log.debug({ title: 'execute', details: 'k : ' + k });
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
        				log.debug({ title: 'execute', details: 'linenum : ' + linenum });
        				
        				
        				
        				var stepinAdjInvDetailRec = null;
        				
        				if(linenum >= 0){
        					//lineitem = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'item', line: linenum });
        					lineitemdesc = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'description', line: linenum});
        					itemQty = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'quantity', line: linenum });
        					itemRate = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'rate', line: linenum });
        					itemAmount = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'amount', line: linenum });
        				
                			//log.debug({ title: 'execute', details: 'lineitem : ' + lineitem });
                			//log.debug({ title: 'execute', details: 'lineitemdesc : ' + lineitemdesc });
                			log.debug({ title: 'execute', details: 'itemQty : ' + itemQty });
                			log.debug({ title: 'execute', details: 'itemRate : ' + itemRate });
                			log.debug({ title: 'execute', details: 'itemAmount : ' + itemAmount });
                			
                			stepinAdjInvDetailRec = record.create({
                			       type: 'customrecord_stepin_adj_invoice_details',
                			       isDynamic: true
                			});
                			
                			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_inv_period_end_date', value: formattedInvPeriodEndDate});
                			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_src_client_code', value: srcClientCode});
                			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_src_invoice', value: invExternalId});
                			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_tgt_client_code', value: tgtClientCode});
                			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_tgt_client_code_id', value: tgtClientCodeId});
                			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_tgt_contract_number', value: tgtContractNumber});
                			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_tgt_invoice', value: 'ESIWM'+mmddyy});
                			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_tgt_invoice_id', value: tgtInvoiceId});
                			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_quantity', value: itemQty});
                			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_price', value: itemRate});
                			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_amount', value: itemAmount});
                			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_data_extracted_frm_src_inv', value: true});
                			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_invoice_item', value: wmItem});
                			
                			if(lineitemdesc.indexOf('Tier') >= 0){
        						log.debug({ title: 'execute', details: 'Tier-2'});
        						stepinAdjInvDetailRec.setValue({ fieldId: 'custrecordis_tier_2', value: true});
            				}else{
            					log.debug({ title: 'execute', details: 'Tier-1'});
            				}
                			
                			stepinAdjInvDetailRec.save();
                			
                			srcInvoice.removeLine({ sublistId: 'item', line: linenum}); // Uncomment after testing
        				}
        				
        				
        				        				
        				var wmtermlinenum = srcInvoice.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: wmTermItem });
        				log.debug({ title: 'execute', details: 'wmtermlinenum : ' + wmtermlinenum });
        				//else if(wmtermlinenum >= 0){
        				if(wmtermlinenum >= 0){
        					
        					//wmtermlineitem = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'item', line: wmtermlinenum });
        					//wmtermlineitemdesc = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'description', line: wmtermlinenum});
        					wmtermitemQty = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'quantity', line: wmtermlinenum });
        					wmtermitemRate = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'rate', line: wmtermlinenum });
        					wmtermitemAmount = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'amount', line: wmtermlinenum });
        					
        					if(termRate == 0.0)
        						termRate = wmtermitemRate;
        				
                			//log.debug({ title: 'execute', details: 'wmtermlineitem : ' + lineitem });
                			//log.debug({ title: 'execute', details: 'wmtermlineitemdesc : ' + wmtermlineitemdesc });
                			log.debug({ title: 'execute', details: 'wmtermitemQty : ' + wmtermitemQty });
                			log.debug({ title: 'execute', details: 'wmtermitemRate : ' + wmtermitemRate });
                			log.debug({ title: 'execute', details: 'wmtermitemAmount : ' + wmtermitemAmount });
                			
                			stepinAdjInvDetailRec = record.create({
             			       type: 'customrecord_stepin_adj_invoice_details',
             			       isDynamic: true
	             			});

                			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_inv_period_end_date', value: formattedInvPeriodEndDate});
	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_src_client_code', value: srcClientCode});
	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_src_invoice', value: invExternalId});
	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_tgt_client_code', value: tgtClientCode});
	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_tgt_client_code_id', value: tgtClientCodeId});
	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_tgt_contract_number', value: tgtContractNumber});
	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_tgt_invoice', value: 'ESIWM'+mmddyy});
	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_tgt_invoice_id', value: tgtInvoiceId});
	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_quantity', value: wmtermitemQty});
	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_price', value: wmtermitemRate});
	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_amount', value: wmtermitemAmount});
	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_data_extracted_frm_src_inv', value: true});
	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_invoice_item', value: wmTermItem});
	             			if(termRate != wmtermitemRate){
        						log.debug({ title: 'execute', details: 'Other Term Rate'});
        						stepinAdjInvDetailRec.setValue({ fieldId: 'custrecordis_tier_2', value: true});
            				}else{
            					log.debug({ title: 'execute', details: 'First Term Rate'});
            				}
	             			
	             			stepinAdjInvDetailRec.save();
	             			
	             			srcInvoice.removeLine({ sublistId: 'item', line: wmtermlinenum});// Uncomment after testing
        				}
        				
        				
        				var adminlinenum = srcInvoice.findSublistLineWithValue({ sublistId: 'item', fieldId: 'custcol_is_wm_admin_fee', value: true });
        				//var adminlinenum = srcInvoice.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: adminFeeItem });
        				log.debug({ title: 'execute', details: 'adminlinenum : ' + adminlinenum });
        				//else if(adminlinenum >= 0 ){
        				if(adminlinenum >= 0 ){
        					adminlineitem = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'item', line: adminlinenum });
        					//adminlineitemdesc = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'description', line: adminlinenum});
        					adminlineQty = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'quantity', line: adminlinenum });
        					adminlineRate = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'rate', line: adminlinenum });
        					adminlineAmount = srcInvoice.getSublistValue({ sublistId: 'item',  fieldId: 'amount', line: adminlinenum });
        					
        					log.debug({ title: 'execute', details: 'adminlineitem : ' + adminlineitem });
                			//log.debug({ title: 'execute', details: 'adminlineitemdesc : ' + adminlineitemdesc });
                			log.debug({ title: 'execute', details: 'adminlineQty : ' + adminlineQty });
                			log.debug({ title: 'execute', details: 'adminlineRate : ' + adminlineRate });
                			log.debug({ title: 'execute', details: 'adminlineAmount : ' + adminlineAmount });
                			
                			stepinAdjInvDetailRec = record.create({
              			       type: 'customrecord_stepin_adj_invoice_details',
              			       isDynamic: true
 	             			});

                			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_inv_period_end_date', value: formattedInvPeriodEndDate});
 	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_src_client_code', value: srcClientCode});
 	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_src_invoice', value: invExternalId});
 	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_tgt_client_code', value: tgtClientCode});
 	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_tgt_client_code_id', value: tgtClientCodeId});
 	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_tgt_contract_number', value: tgtContractNumber});
 	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_tgt_invoice', value: 'ESIWM'+mmddyy});
 	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_tgt_invoice_id', value: tgtInvoiceId});
 	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_quantity', value: adminlineQty});
 	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_price', value: adminlineRate});
 	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_amount', value: adminlineAmount});
 	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_data_extracted_frm_src_inv', value: true});
 	             			stepinAdjInvDetailRec.setValue({ fieldId: 'custrecord_invoice_item', value: adminlineitem});
 	             			stepinAdjInvDetailRec.save();
                			
 	             			srcInvoice.removeLine({ sublistId: 'item', line: adminlinenum});// Uncomment after testing
        				}
        				/*else{
        					log.debug({ title: 'execute', details: 'Skipping this line...' });
        					continue;
        				}*/            			        				
        			}//numLines end OR k loop
        		
        			
        			srcInvoiceArr.push(srcInvoiceId);
        			srcInvoice.save({
        			    enableSourcing: true,
        			    ignoreMandatoryFields: true
        			});
        		}//else
        		
        	}// j loop
    		
    	}//i loop	
    	
    	log.debug({ title: 'execute', details: 'Step 1: Remove lines from Source Invoice: Completed'});
    	
    	
    	//Step 2: Add lines to Target Invoice
    	//Stepin Adjustment Invoice Details Search
    	var mmddyyDate = getMMDDYYDate(invPeriodEndDateObj);
    	log.debug('execute','mmddyyDate = '+mmddyyDate);
    	
    	var stepinAdjinvDetailSearch = search.load({
		    id: 'customsearch_stepin_adj_inv_detail'
		});
    	
    	/*var filters = stepinAdjinvDetailSearch.filters;
    	filters.push(search.createFilter({ //create new filter
            name: 'custrecord_inv_period_end_date',
            operator: search.Operator.IS,
            values: mmddyyDate
        }));*/
    
    	var results2 = stepinAdjinvDetailSearch.run().getRange({
    	    start: 0,
    	    end: 1000
    	});
    	var tgtInvoiceId = '';
    	var tgtContractNumber = '';
    	var tgtClientCodeId = '';
    	
    	tgtInvoiceId = results2[0].getValue({name: 'custrecord_tgt_invoice_id', summary: 'group'});
    	log.debug({ title: 'execute', details: 'tgtInvoiceId : ' + tgtInvoiceId });
    	
    	tgtContractNumber = results2[0].getValue({name: 'custrecord_tgt_contract_number', summary: 'group'});
    	log.debug({ title: 'execute', details: 'tgtContractNumber : ' + tgtContractNumber });
	
    	tgtClientCodeId = results2[0].getValue({name: 'custrecord_tgt_client_code_id', summary: 'group'});
    	log.debug({ title: 'execute', details: 'tgtClientCodeId : ' + tgtClientCodeId });    
    	
    	var tgtInvoice = record.load({
		    type: record.Type.INVOICE,
		       id: tgtInvoiceId,
		       isDynamic: true
		   });
    	
    	for(var a=0; a<results2.length; a++){
    		
    		tgtInvoiceItem = results2[a].getValue({name: 'custrecord_invoice_item', summary: 'group'});
        	log.debug({ title: 'execute', details: 'tgtInvoiceItem : ' + tgtInvoiceItem });
    		
        	tgtInvoiceItemQty = results2[a].getValue({name: 'custrecord_quantity', summary: 'sum'});
        	log.debug({ title: 'execute', details: 'tgtInvoiceItemQty : ' + tgtInvoiceItemQty });
        	
        	tgtInvoiceItemRate = results2[a].getValue({name: 'custrecord_price', summary: 'group'});
        	log.debug({ title: 'execute', details: 'tgtInvoiceItemRate : ' + tgtInvoiceItemRate });    	
        	
        	isTier2 = results2[a].getValue({name: 'custrecordis_tier_2', summary: 'group'});
        	log.debug({ title: 'execute', details: 'isTier2 : ' + isTier2 });        	
        	
        	var itemDescription = '';
 	
	    	tgtInvoice.selectNewLine({ sublistId: 'item' });
    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: tgtInvoiceItem});
    		
    		if(tgtInvoiceItem == wmItem && isTier2 == false){
    			itemDescription = 'Livongo for Weight Management';
    		}
    		else if(tgtInvoiceItem == wmItem && isTier2 == true){
    			itemDescription = 'Livongo for Weight Management - Tier-2';
    		}
    		else if(tgtInvoiceItem == wmTermItem  && isTier2 == false){
    			itemDescription = 'Livongo for Weight Management Program Early Termination';
    		}
    		else if(tgtInvoiceItem == wmTermItem  && isTier2 == true){
    			itemDescription = 'Livongo for Weight Management Program Early Termination - Tier-2';
    		}
    		else if(tgtInvoiceItem == adminFeeItem){
    			itemDescription = 'Referral Fee - Weight Management';
    			log.debug({ title: 'execute', details: 'WM Admin Line. Skipping this line...'});    
    			continue;
    		}    			
    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: itemDescription});
    		
    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: tgtInvoiceItemQty});
    		tgtInvoice.setCurrentSublistText({ sublistId: 'item', fieldId: 'price', value: 'Custom'});
    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: tgtInvoiceItemRate});
    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_liv_invoice_client_code', value: tgtClientCodeId});
    		tgtInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_liv_sol_contract_number', value: tgtContractNumber});
    		tgtInvoice.commitLine({ sublistId: 'item' });
    	}
    	tgtInvoice.save({
		    enableSourcing: true,
		    ignoreMandatoryFields: true
		});
    	
    	//Mark the /Stepin Adjustment Invoice Details as Processed
    	var stepinAdjinvDetailSearch2 = search.create({
            type: 'customrecord_stepin_adj_invoice_details',
            filters: [
                      	['isinactive', 'is', false],
                      	'and', ['custrecord_data_extracted_frm_src_inv', 'is', true],
                      	'and', ['custrecord_inv_adj_processed', 'is', false],
                      	'and', ['custrecord_inv_period_end_date', 'is', mmddyyDate]
                     ]
        });
    	var stepinAdjinvDetailSearch2Results = stepinAdjinvDetailSearch2.run().getRange({
            start: 0,
            end: 1000
        });
    	for(var b=0;b<stepinAdjinvDetailSearch2Results.length;b++){
    		record.submitFields({
    		    type: 'customrecord_stepin_adj_invoice_details',
    		    id: stepinAdjinvDetailSearch2Results[b].id,
    		    values: { 
    		    	'custrecord_inv_adj_processed': true
    		    }
    		});
    	}
    	
    	log.debug({ title: 'execute', details: 'Step 2: Add lines to Target Invoice: Completed'});
  
    	log.debug({ title: 'execute', details: '*****END*****'});
    }//execute
    
    function getAllInvoiceAdjRecords(searchRecordtype, searchId, filtersJSON, searchColumns){
    	//log.debug({title: 'getAllResults', details: 'START'});
    	var startIndex = 0;
    	var endIndex = 1000;
    	var searchResults = [];    	
    	var savedSearch = null;
    	
    	if(searchId){
    		//log.debug({title: 'getAllResults', details: 'searchId = '+searchId});
	    	savedSearch = search.load({
	            id: searchId
	    	});
	    	var filters = savedSearch.filters;
	    	var columns = savedSearch.columns;
	    	
	    	//log.debug({title: 'getAllResults', details: 'BEFORE filters.length = '+filters.length});
	    	for (var key in filtersJSON) {
	    		log.debug({title: 'KEY = '+key, details:'VALUE = '+filtersJSON[key]});
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
	    	//log.debug({title: 'getAllResults', details: 'AFTER filters.length = '+filters.length});
	    	
	    	//log.debug({title: 'getAllResults', details: 'BEFORE columns.length = '+columns.length});
	    	for(j=0;j<searchColumns && searchColumns.length; j++){
	    		columns.push(searchColumns[j]);
	    	}
	    	//log.debug({title: 'getAllResults', details: 'AFTER columns.length = '+columns.length});
	    	
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
    		log.debug('Missing required argument: searchRecordtype');
    	}
    	
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
    	//log.debug({title: 'getAllResults', details: 'END'});
    	return searchResults;
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
    
    function getMMDDYYDate(date) {
		var year = date.getFullYear().toString();
		var month = (1 + date.getMonth()).toString();
		month = month.length > 1 ? month : '0' + month;
		var day = date.getDate().toString();
		day = day.length > 1 ? day : '0' + day;
		return month +'/'+ day +'/'+ year;
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
