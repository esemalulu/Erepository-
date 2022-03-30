/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/email', 'N/record', 'N/runtime', 'N/search', 'N/format', 'N/task','N/error'],
/**
 * @param {email} email
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */
function(email, record, runtime, search, format, task, error) {
    /**
     * Definition of the Scheduled script trigger point.
     *
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
	//Initialize Variables
	var isRowProcessed = false;
	
    function execute(scriptContext) {
    	log.debug({title: 'execute', details: '*****START*****'});
    	/*var currentBillToCustomer = '';
    	var nextBillToCustomer = '';*/
    	var currentInvoiceNumber = '';
    	var nextInvoiceNumber = '';
    	var sameinvoiceRows = [];
    	var isLastGroup = false;

        try 
        {   	
        	var unProcessedNBSearchId = runtime.getCurrentScript().getParameter("custscript_unprocessed_nb_searchid");
	    	var periodDate = runtime.getCurrentScript().getParameter("custscript_unprocessed_nb_period_date");
	    	
	    	log.debug({title: 'execute', details: 'periodDate = '+periodDate}); 
	    	var formattedPeriodDate = format.format({
                value: periodDate,
                type: format.Type.DATE
            });
	    	log.debug({title: 'execute', details: 'formattedPeriodDate = '+formattedPeriodDate}); 
	    	
            var filtersJSON = { 
            		'custrecord_nb_processed': false,
            		'custrecord_nb_period_date': formattedPeriodDate
            		//'custrecord_nb_sku': 'dbt_referral_fee'
            };
            
        	var unProcessedNBSearchResults = getAllResults(null,unProcessedNBSearchId,filtersJSON,null);
        	log.debug({title: 'execute', details: 'unProcessedNBSearchResults Length = '+unProcessedNBSearchResults.length});    	
        	
        	for(var i=0;i<unProcessedNBSearchResults.length;i++){
        		currentInvoiceNumber = unProcessedNBSearchResults[i].getValue('custrecord_nb_invoice_number');
        		if(unProcessedNBSearchResults[i+1]){
        			nextInvoiceNumber = unProcessedNBSearchResults[i+1].getValue('custrecord_nb_invoice_number');
        		}
        		/*currentBillToCustomer = unProcessedNBSearchResults[i].getValue('custrecord_nb_bill_to_customer');
        		if(unProcessedNBSearchResults[i+1]){
        			nextBillToCustomer = unProcessedNBSearchResults[i+1].getValue('custrecord_nb_bill_to_customer');
        		}*/
        		
        		log.debug({title: 'execute', details: 'currentInvoiceNumber = '+currentInvoiceNumber}); 
        		log.debug({title: 'execute', details: 'nextInvoiceNumber = '+nextInvoiceNumber}); 
        		
        		
            	//Check for existing invoice
            	log.debug({title: 'execute', details: 'Checking for existing invoice. Invoice # '+currentInvoiceNumber});
            	
            	var invoiceSearch = search.create({
            		  type: search.Type.INVOICE,
            		  filters: [
                              	['tranid', 'is', currentInvoiceNumber],
                              	'and', ['mainline', 'is', true]
                             ]
            		});
            	var invoiceSearchResultRange = invoiceSearch.run().getRange({
                    start: 0,
                    end: 1000
                });
            	log.debug({title: 'createInvoiceRecord', details: 'invoiceSearchResultRange.length = '+invoiceSearchResultRange.length});
            	if(invoiceSearchResultRange.length > 0){
            		record.submitFields({
	            	    type: 'customrecord_netsuite_bill',
	            	    id: unProcessedNBSearchResults[i].id,
	            	    values: {
	            	        'custrecord_nb_processed': true,
	            	        'custrecord_nb_message': currentInvoiceNumber+' already exist. Invoice not created for this record.'
	            	    }
	            	});
            		sameinvoiceRows = [];
                	currentInvoiceNumber = '';
                	nextInvoiceNumber = '';
            		continue;
            	}
        		
        		if(currentInvoiceNumber == nextInvoiceNumber){
        			sameinvoiceRows.push(unProcessedNBSearchResults[i].id);
        			if(unProcessedNBSearchResults[i+1]){
        				sameinvoiceRows.push(unProcessedNBSearchResults[i+1].id);
        			}
        			else{
        				isLastGroup = true;
        			}		         
        		}
        		else
        		{
        			if(sameinvoiceRows.length == 0){
        				sameinvoiceRows.push(unProcessedNBSearchResults[i].id);
            		}
        			sameinvoiceRows = sameinvoiceRows.getUnique();
        			
        			var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
                	log.debug({title: 'execute', details: 'remainingUsage = '+remainingUsage});    	
                	if(remainingUsage < 2000){
                		throwError();
                		/*rescheduleScrpit();
                		continue;*/
                	}
        			
                	createInvoiceRecord(sameinvoiceRows);
                	sameinvoiceRows = [];
                	currentInvoiceNumber = '';
                	nextInvoiceNumber = '';
        		}
        		if(isLastGroup){
        			sameinvoiceRows = sameinvoiceRows.getUnique();
        			var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
                	log.debug({title: 'execute', details: 'remainingUsage = '+remainingUsage});    	
                	if(remainingUsage < 2000){
                		throwError();
                		/*rescheduleScrpit();
                		continue;*/
                	}
        			
                	createInvoiceRecord(sameinvoiceRows);
                	sameinvoiceRows = [];
                	currentInvoiceNumber = '';
                	nextInvoiceNumber = '';
        		}
        	}// i loop
        } 
        catch(e)
        {
        	//markNBRecordsFailed(e);
        	log.debug({title: 'execute', details: 'Error Details = ' + JSON.stringify(e)});
			log.debug({title: 'execute', details: 'Rescheduling...'});
			
			var scriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
			scriptTask.scriptId = runtime.getCurrentScript().id;
			var scriptTaskId = scriptTask.submit();
			var taskStatus = task.checkStatus(scriptTaskId);
			log.debug({title: 'execute', details: 'Reschedule task submitted. Task Id = '+scriptTaskId});
			
			var subject = 'Error occured while processing NetSuite Bill Data';
            var authorId = 3;
            var recipientEmail = 'anil.sharma@teladochealth.com';
            email.send({
                author: authorId,
                recipients: recipientEmail,
                subject: subject,
                body: 'Error occured while processing NetSuite Bill Data: \n' + runtime.getCurrentScript().id + '\n\n' + JSON.stringify(e)
            });
        }
        log.debug({title: 'execute', details: '*****END*****'});
    }
    
    function createInvoiceRecord(recIds){
    	var ignoreLogicalStatus = runtime.getCurrentScript().getParameter("custscript_ignore_logical_con_status");
    	log.debug({title: 'createInvoiceRecord', details: 'ignoreLogicalStatus = '+ignoreLogicalStatus});
    	log.debug({title: 'createInvoiceRecord', details: 'recIds = '+recIds});
    	
    	var oneOrMoreLinesAdded = false;
    	var nsInvoice = null;
    	var nsInvoiceId = '';
    	var nbRec = null;
    	var nbRecId = null;
    	
    	log.debug({title: 'createInvoiceRecord', details: 'recIds[0] = '+recIds[0]});
    	
    	var nbObj = record.load({
    	    type: 'customrecord_netsuite_bill',
	 	       id: recIds[0],
	 	       isDynamic: true                       
	    	});
    	    	    	
    	var invoiceCustomer = nbObj.getValue({ fieldId: 'custrecord_nb_bill_to_customer'});
    	log.debug({title: 'execute', details: 'invoiceCustomer = '+invoiceCustomer});
    	
    	if(!invoiceCustomer)
    		return;
    	
    	var perioDate = nbObj.getValue({ fieldId: 'custrecord_nb_period_date'});
    	var postingPeriodName = getPostingPeriodName(new Date(perioDate));
		log.debug({title: 'createInvoiceRecord', details: 'postingPeriodName ='+postingPeriodName});
		var postingPeriodId = getPostingPeriodId(postingPeriodName);
		log.debug({title: 'createInvoiceRecord', details: 'postingPeriodId ='+postingPeriodId});
		
		//Get Contract Details
		var contractId = nbObj.getValue({ fieldId: 'custrecord_nb_contract_id'});
		var contractRec = record.load({
    	    type: 'customrecord_liv_contracts',
 	       id: contractId,
 	       isDynamic: true                       
    	});
		
    	var sfdcOppId = contractRec.getValue({ fieldId: 'custrecord_liv_cm_salesforce_line_id'});
    	var poNumber = contractRec.getValue({ fieldId: 'custrecord_liv_cm_current_po'});
    	var paymentTerms = contractRec.getValue({ fieldId: 'custrecord_liv_cm_payment_terms'});
    	
    	nsInvoice = record.create({
    		type: record.Type.INVOICE,
    	    isDynamic: true,
    	    defaultValues: {
    	        entity: invoiceCustomer
    	    }
    	});
    	
    	var errorMessage = '';
    	for(var j=0;j<recIds.length;j++){
    		isRowProcessed = false;
    		
    		nbRecId = recIds[j];
    		log.debug({title: 'createInvoiceRecord', details: 'Processig nbRecId = '+nbRecId});
    		nbRec = record.load({
	    	    type: 'customrecord_netsuite_bill',
	 	       id: nbRecId,
	 	       isDynamic: true                       
	    	});
    		
    		//var perioDate = 		nbRec.getValue({ fieldId: 'custrecord_nb_period_date'});
    		var clientCodeId =  	nbRec.getValue({ fieldId: 'custrecord_nb_client_code_id'});
    		var clientCode =  		nbRec.getValue({ fieldId: 'custrecord_nb_client_code'});
    		var subgroup =     		nbRec.getValue({ fieldId: 'custrecord_nb_subgroup'});
    		//var contractId =  		nbRec.getValue({ fieldId: 'custrecord_nb_contract_id'});
    		var contractType = 		nbRec.getValue({ fieldId: 'custrecord_nb_contract_type'});
    		var sku = 				nbRec.getValue({ fieldId: 'custrecord_nb_sku'});
    		var itemDesc = 			nbRec.getValue({ fieldId: 'custrecord_nb_item_desc'});
    		var itemId = 			nbRec.getValue({ fieldId: 'custrecord_nb_item_id'});
    		var itemName = 			nbRec.getValue({ fieldId: 'custrecord_nb_item_name'});
    		var qty = 				nbRec.getValue({ fieldId: 'custrecord_nb_qty'});
    		var price = 			nbRec.getValue({ fieldId: 'custrecord_nb_price'});
    		var amt = 				nbRec.getValue({ fieldId: 'custrecord_nb_amt'});
    		var comments = 			nbRec.getValue({ fieldId: 'custrecord_nb_comments'});
    		var billable = 			nbRec.getValue({ fieldId: 'custrecord_nb_billable'});
    		var dbtTotal = 			nbRec.getValue({ fieldId: 'custrecord_nb_dbt_total'});
    		var htnOnly = 			nbRec.getValue({ fieldId: 'custrecord_nb_htn_only'});
    		var billToCustomer = 	nbRec.getValue({ fieldId: 'custrecord_nb_bill_to_customer'});
    		var soldToCustomer = 	nbRec.getValue({ fieldId: 'custrecord_nb_sold_to_customer'});
    		var invoiceNumber = 	nbRec.getValue({ fieldId: 'custrecord_nb_invoice_number'});
    		var logicalConStatus =  nbRec.getValue({ fieldId: 'custrecord_nb_logical_contract_status'});
    		var autoCreateInvoice = nbRec.getValue({ fieldId: 'custrecord_nb_auto_create_invoice'});
    		var inactiveForBilling= nbRec.getValue({ fieldId: 'custrecord_nb_inactive_for_billing'});
    		var contractNumber =   	nbRec.getValue({ fieldId: 'custrecord_nb_contract_number'});
        	var billToCustomer =	nbRec.getValue({ fieldId: 'custrecord_nb_bill_to_customer'});
        	var soldToCustomer = 	nbRec.getValue({ fieldId: 'custrecord_nb_sold_to_customer'});
        	var referralSKU = 	  	nbRec.getValue({ fieldId: 'custrecord_nb_referral_sku'});
        	var milestoneSKU = 		nbRec.getValue({ fieldId: 'custrecord_nb_milestone_sku'});
        	
    		var completeItemDesc = itemDesc +' - '+getMonthYear(new Date(perioDate)) + ' ('+subgroup+')';
    		
    		//Get Contract Details
    		/*var contractRec = record.load({
	    	    type: 'customrecord_liv_contracts',
	 	       id: contractId,
	 	       isDynamic: true                       
	    	});
    		
        	var sfdcOppId = contractRec.getValue({ fieldId: 'custrecord_liv_cm_salesforce_line_id'});
        	var poNumber = contractRec.getValue({ fieldId: 'custrecord_liv_cm_current_po'});
        	var paymentTerms = contractRec.getValue({ fieldId: 'custrecord_liv_cm_payment_terms'});*/
        	
    		/*var postingPeriodName = getPostingPeriodName(new Date(perioDate));
    		log.debug({title: 'createInvoiceRecord', details: 'postingPeriodName ='+postingPeriodName});
    		var postingPeriodId = getPostingPeriodId(postingPeriodName);
    		log.debug({title: 'createInvoiceRecord', details: 'postingPeriodId ='+postingPeriodId});*/

        	if(ignoreLogicalStatus == true){
        		if(logicalConStatus == 'Termed'){
        			errorMessage += 'logicalConStatus = Termed. Setting logicalConStatus = Active.\n';
        			log.debug({title: 'createInvoiceRecord', details: 'logicalConStatus = Termed. Ignoring Logical Contract Status. Creating invoice.\n'});
        			logicalConStatus = 'Active';
        		}
        		if(logicalConStatus == 'Future'){
        			errorMessage += 'logicalConStatus = Future. Setting logicalConStatus = Active.\n';
        			log.debug({title: 'createInvoiceRecord', details: 'logicalConStatus = Future. Ignoring Logical Contract Status. Creating invoice.\n'});
        			logicalConStatus = 'Active';
        		}
        	}
        	
        	if(logicalConStatus == 'Active'){
	        	//Add new lines to Invoice
	    		if(billable == 1 && (qty * price) != 0.0 && itemId &&
	    				inactiveForBilling == false && autoCreateInvoice == true  && referralSKU == false){     
	    			nsInvoice.setValue({ fieldId: 'tranid', value: invoiceNumber});
	    			nsInvoice.setValue({ fieldId: 'externalid', value: invoiceNumber});
	    			nsInvoice.setValue({ fieldId: 'trandate', value: perioDate});
	    			nsInvoice.setValue({ fieldId: 'postingperiod', value: postingPeriodId});
	    			nsInvoice.setValue({ fieldId: 'custbody_liv_sold_to_customer', value: soldToCustomer});
	    			nsInvoice.setValue({ fieldId: 'otherrefnum', value: poNumber});
	    			nsInvoice.setValue({ fieldId: 'terms', value: paymentTerms});
	    			
	    			//Adding Line Items
	    			nsInvoice.selectNewLine({ sublistId: 'item' });
	    			nsInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: parseInt(itemId)});
	    			nsInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: completeItemDesc});
	    			nsInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty});
	    			nsInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'price', value: -1});
	        		nsInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: price});
	        		nsInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_liv_invoice_client_code', value: clientCodeId});
	        		nsInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_liv_sol_contract_number', value: contractNumber});
	        		nsInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_liv_sf_opportunity_id', value: sfdcOppId});
	        		nsInvoice.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_netsuite_bill_id', value: nbRecId});
	        		
	        		nsInvoice.commitLine({ sublistId: 'item' });
	        		oneOrMoreLinesAdded = true;
	    		}//if
	    		else
	    		{
	    			log.debug({title: 'createInvoiceRecord', details: 'billable = '+billable});
	    			log.debug({title: 'createInvoiceRecord', details: 'autoCreateInvoice = '+autoCreateInvoice});
	    			if(billable == 0){
	    				errorMessage += 'billable = 0.\n';
	    			}
	    			if(autoCreateInvoice == false){
	    				errorMessage += 'autoCreateInvoice = false.\n';
	    			}
	    			if(qty == 0){
	    				errorMessage += 'qty = 0.\n';
	    			}
	    			if(price == 0.0){
	    				errorMessage += 'price = 0.0.\n';
	    			}
	    			if(inactiveForBilling == true){
	    				errorMessage += 'inactiveForBilling = true.\n';
	    			}
	    			if(itemId == ''|| itemId == null){
	    				errorMessage += 'itemId is blank.\n';
	    			}
	    			if(referralSKU == true){
	    				errorMessage += 'referralSKU = true.\n';
	    			}
	    			if(milestoneSKU == true){
	    				errorMessage += 'milestoneSKU = true.\n';
	    			}
	    		}
        	}
    		else
    		{
    			errorMessage += 'logicalConStatus = ' + logicalConStatus + ', ignoreLogicalStatus = '+ignoreLogicalStatus+'\n';
    		}
        	log.debug({title: 'createInvoiceRecord', details: 'errorMessage = '+errorMessage});
        	nbRec.setValue('custrecord_nb_message',errorMessage);
    		nbRec.setValue('custrecord_nb_processed',true);
    		nbRec.save({
        	    enableSourcing: true,
        	    ignoreMandatoryFields: true
        	});
    		errorMessage = '';
    	}// j loop
    	log.debug({title: 'createInvoiceRecord', details: 'oneOrMoreLinesAdded = '+oneOrMoreLinesAdded});
    	if(oneOrMoreLinesAdded){
    		nsInvoiceId = nsInvoice.save({
    		    enableSourcing: true,
    		    ignoreMandatoryFields: true
    		});
    		log.debug({title: 'createInvoiceRecord', details: 'nsInvoiceId = '+nsInvoiceId});
    		//Setting Invoice Internal ID on NB Record
    		if(nsInvoiceId)
    		{   
    			for(var l=0;l<recIds.length;l++){
    				record.submitFields({
    				    type: 'customrecord_netsuite_bill',
    				    id: recIds[l],
    				    values: {
    				        'custrecord_nb_invoice_created': true,
    				        'custrecord_nb_inv_internal_id': nsInvoiceId
    				    }
    				});
    			}
    			log.debug({title: 'createInvoiceRecord', details: 'NB updated with Invoice Internal ID'});
    		}
    	}
    	/*else{
    		nbRec.setValue('custrecord_nb_invoice_not_created',true);
    	}*/
    	/*nbRec.save({
    	    enableSourcing: true,
    	    ignoreMandatoryFields: true
    	});*/
    	
    }
    
    function rescheduleScrpit(){
    	var scriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
		scriptTask.scriptId = runtime.getCurrentScript().id;
		var scriptTaskId = scriptTask.submit();
		var taskStatus = task.checkStatus(scriptTaskId);
		log.debug({title: 'rescheduleScrpit', details: 'Reschedule task submitted. Task Id = '+scriptTaskId});
    }
    
    function throwError(){
    	var err = error.create({
            name: 'REMAINING_PTS_<_2000',
            message: 'Remaining Usage Points are less than 2000',
            notifyOff: true
        });
    	throw err;
    }
    
    function getAllResults(searchRecordtype, searchId, filtersJSON, searchColumns){
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
	    		//log.debug({title: 'KEY = '+key, details:'VALUE = '+filtersJSON[key]});
	    		
	    		if(key == 'custrecord_nb_processed'){
					filters.push(search.createFilter({ //create new filter
			            name: 'custrecord_nb_processed',
			            operator: search.Operator.IS,
			            values: filtersJSON[key]
			        }));
				}
	    		else if(key == 'custrecord_rs_client_code'){
					filters.push(search.createFilter({ //create new filter
			            name: 'custrecord_rs_client_code',
			            operator: search.Operator.IS,
			            values: filtersJSON[key]
			        }));
				}
				else if(key == 'custrecord_nb_period_date'){
					filters.push(search.createFilter({ //create new filter
			            name: 'custrecord_nb_period_date',
			            operator: search.Operator.ON,
			            values: filtersJSON[key]
			        }));
				}		
				else if(key == 'custrecord_nb_sku'){
					filters.push(search.createFilter({ //create new filter
			            name: 'custrecord_nb_sku',
			            operator: search.Operator.ISNOT,
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
    	//log.debug({title: 'getAllResults', details: 'searchResults.length = '+searchResults.length});
    	//log.debug({title: 'getAllResults', details: 'END'});
    	return searchResults;
    }
    
    function getMonthYear(date) {
    	const monthNames = ["January", "February", "March", "April", "May", "June",
    	                    "July", "August", "September", "October", "November", "December"
    	                  ];
		var year = date.getFullYear();
		return monthNames[date.getMonth()]+ ' ' +year;
	}
    
    function getMMDDYY(date) {
		var year = date.getFullYear().toString().substr(2);
		var month = (1 + date.getMonth()).toString();
		month = month.length > 1 ? month : '0' + month;
		var day = date.getDate().toString();
		day = day.length > 1 ? day : '0' + day;
		return month + day + year;
	}
    
    function getPostingPeriodName(date){
    	var year = date.getFullYear();
    	var month = (1 + date.getMonth()).toString();
		month = month.length > 1 ? month : '0' + month;
    	return year+'-'+month;
    }
    
    function getPostingPeriodId(postingPeriodName){
    	var periodId = '';
    	var accountingPeriodSearch = search.create({
	        type: 'accountingperiod',
	       // columns: ['custrecord_lock_inventory_transactions','custrecord_accounting_period'],
	        filters: ['periodname', 'IS', postingPeriodName]
		 });
		 
		 var resultSet = accountingPeriodSearch.run();

		 var resultRange = resultSet.getRange({
	    	start: 0,
	        end: 50
	    });
	    log.debug('resultRange.length =' + resultRange.length);
	    if(resultRange && resultRange.length){
	    	periodId = resultRange[0].id;
	    }
	    return periodId;
    }
    
    return {
        execute: execute
    };
});

Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] == obj) {
            return true;
        }
    }
    return false;
}

Array.prototype.getUnique = function() {
	 var o = {}, a = [], i, e;
	 for (i = 0; e = this[i]; i++) {o[e] = 1};
	 for (e in o) {a.push (e)};
	 return a;
}



