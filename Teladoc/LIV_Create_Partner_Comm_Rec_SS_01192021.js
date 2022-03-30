/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/email', 'N/record', 'N/runtime', 'N/search', 'N/format', 'N/task'],
/**
 * @param {email} email
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
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
    	log.debug({title: 'execute', details: '*****START*****'});
    	var nsPartnerCommRecId = '';
    	 try 
         {   	
         	var nbSearchId = runtime.getCurrentScript().getParameter("custscript_nb_search_id");
 	    	var periodDate = runtime.getCurrentScript().getParameter("custscript_nb_period_dt");
 	    	
 	    	var formattedPeriodDate = format.format({
                 value: periodDate,
                 type: format.Type.DATE
             });
 	    	
             var filtersJSON = {     
            		 'custrecord_nb_processed': false,
            		 'custrecord_nb_create_partner_comm_bill': true,
            		 'custrecord_nb_partner_comm_internal_id': null,
            		 'custrecord_nb_period_date': periodDate,
            		 'custrecord_nb_sku': 'referral_fee',
            		 'custrecord_nb_billable': 1
             };
             
         	var nbSearchResults = getAllResults(null,nbSearchId,filtersJSON,null);
         	log.debug({title: 'execute', details: 'nbSearchResults Length = '+nbSearchResults.length});    	
          		
       		for(var i=0;i<nbSearchResults.length;i++){
       			nsPartnerCommRecId = '';
       			var nsPartnerCommRec = record.create({
       	    		type: 'customrecord_liv_partners_comm',
       	    	    isDynamic: true
       	    	});
       			
       			var contractInternalId = nbSearchResults[i].getValue('custrecord_nb_contract_id');
       			var contractRec = record.load({
    	    	    type: 'customrecord_liv_contracts',
    	 	       id: contractInternalId,
    	 	       isDynamic: true                       
    	    	});
       			var invoicePrefix = contractRec.getValue({ fieldId: 'custrecord_liv_cm_invoice_prefix'});
            	var invoiceNumber = invoicePrefix + getMMDDYY(new Date(nbSearchResults[i].getValue('custrecord_nb_period_date')));
       			var contractNumber = contractRec.getValue({ fieldId: 'custrecord_liv_cm_contract_number'});
            	
            	var nsPartnerId = nbSearchResults[i].getValue('custrecord_nb_partner');
            	log.debug({title: 'execute', details: 'nsPartnerId = '+nsPartnerId});
            	
            	var partnerRec = record.load({
    	    	    type: record.Type.VENDOR,
     	 	       id: nsPartnerId,
     	 	       isDynamic: true                       
     	    	});
            	var billNo = partnerRec.getValue({ fieldId: 'custentity_liv_bill_no_prefix'}) + getMonthYear(new Date(nbSearchResults[i].getValue('custrecord_nb_period_date')));
       			var billTerms = partnerRec.getValue({ fieldId: 'terms'});
       			var expAccount = partnerRec.getValue({ fieldId: 'custentity_liv_partner_bill_expense_acct'});
            	
       			/*var formattedPeriodDate = format.format({
                    value: nbSearchResults[i].getValue('custrecord_nb_period_date'),
                    type: format.Type.DATE
                });*/
       			
       			var formattedPeriodDate= format.parse({value:nbSearchResults[i].getValue('custrecord_nb_period_date') , type: format.Type.DATE});
       			log.debug({title: 'execute', details: 'formattedPeriodDate = '+formattedPeriodDate});
       			
       			/*var formattedDate = getMMDDYYYYDate(new Date(nbSearchResults[i].getValue('custrecord_nb_period_date')));
       			log.debug({title: 'execute', details: 'formattedDate = '+formattedDate});
       			
       			var date = formatDate(nbSearchResults[i].getValue('custrecord_nb_period_date'));
       			log.debug({title: 'execute', details: 'date = '+date});*/
       			
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_ns_create_bill', value: nbSearchResults[i].getValue('custrecord_nb_create_partner_comm_bill')});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_ns_partner', value: nbSearchResults[i].getValue('custrecord_nb_partner')});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_ns_customer', value: nbSearchResults[i].getValue('custrecord_nb_sold_to_customer')});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_ns_client_code', value: nbSearchResults[i].getValue('custrecord_nb_client_code')});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_ns_invoice_date', value: formattedPeriodDate});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_ns_invoice_number', value: invoiceNumber});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_ns_billed_qty', value: nbSearchResults[i].getValue('custrecord_nb_qty')});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_ns_partner_fee', value: nbSearchResults[i].getValue('custrecord_nb_price')});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_ns_bill_no', value: billNo});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_ns_bill_date', value: formattedPeriodDate});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_bill_terms', value: billTerms});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_bill_exp_acct', value: expAccount});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_ns_bill_qty', value: nbSearchResults[i].getValue('custrecord_nb_qty')});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_bill_rate', value: (nbSearchResults[i].getValue('custrecord_nb_price')*-1)});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_bill_amt', value: (nbSearchResults[i].getValue('custrecord_nb_amt')*-1)});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_period_no', value: getYYYYMM(new Date(nbSearchResults[i].getValue('custrecord_nb_period_date')))});
       			nsPartnerCommRec.setValue({ fieldId: 'custrecord_liv_pcomm_ns_contract_number', value: contractNumber});
          	
       			nsPartnerCommRecId = nsPartnerCommRec.save({
        		    enableSourcing: true,
        		    ignoreMandatoryFields: true
        		});

       			if(nsPartnerCommRecId){
       				record.submitFields({
    				    type: 'customrecord_netsuite_bill',
    				    id: nbSearchResults[i].id,
    				    values: {
    				    	'custrecord_nb_processed': true,
    				        'custrecord_nb_partner_comm_internal_id': nsPartnerCommRecId
    				    }
    				});
       				
       			}
       			log.debug({title: 'execute', details: 'nsPartnerCommRecId = '+nsPartnerCommRecId});
       		}
         }
    	 catch(e){
    		 log.debug({title: 'execute', details: 'Error Details = ' + JSON.stringify(e)});
 			log.debug({title: 'execute', details: 'Rescheduling...'});
 			
 			var scriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
 			scriptTask.scriptId = runtime.getCurrentScript().id;
 			var scriptTaskId = scriptTask.submit();
 			var taskStatus = task.checkStatus(scriptTaskId);
 			log.debug({title: 'execute', details: 'Reschedule task submitted. Task Id = '+scriptTaskId});
 			
 			var subject = 'Error occured while creating partner comm. custom record';
             var authorId = 3;
             var recipientEmail = 'anil.sharma@teladochealth.com';
             email.send({
                 author: authorId,
                 recipients: recipientEmail,
                 subject: subject,
                 body: 'Error occured while creating partner comm. custom record: \n' + runtime.getCurrentScript().id + '\n\n' + JSON.stringify(e)
             });
    	 }
    	 log.debug({title: 'execute', details: '*****END*****'});
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
	    		else if(key == 'custrecord_nb_create_partner_comm_bill'){
					filters.push(search.createFilter({ //create new filter
			            name: 'custrecord_nb_create_partner_comm_bill',
			            operator: search.Operator.IS,
			            values: filtersJSON[key]
			        }));
				}
	    		else if(key == 'custrecord_nb_partner_comm_internal_id'){
					filters.push(search.createFilter({ //create new filter
			            name: 'custrecord_nb_partner_comm_internal_id',
			            operator: search.Operator.ISEMPTY
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
			            operator: search.Operator.CONTAINS,
			            values: filtersJSON[key]
			        }));
				}
				else if(key == 'custrecord_nb_billable'){
					filters.push(search.createFilter({ //create new filter
			            name: 'custrecord_nb_billable',
			            operator: search.Operator.EQUALTO,
			            values: filtersJSON[key]
			        }));
				}
	    	}
	    	log.debug({title: 'getAllResults', details: 'AFTER filters.length = '+filters.length});
	    	
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
    
    function getMMDDYYYYDate(date) {
		var year = date.getFullYear();
		var month = (1 + date.getMonth()).toString();
		month = month.length > 1 ? month : '0' + month;
		var day = date.getDate().toString();
		day = day.length > 1 ? day : '0' + day;
		return month +'/'+ day +'/'+ year;
	}
    
    function getMMDDYY(date) {
		var year = date.getFullYear().toString().substr(2);
		var month = (1 + date.getMonth()).toString();
		month = month.length > 1 ? month : '0' + month;
		var day = date.getDate().toString();
		day = day.length > 1 ? day : '0' + day;
		return month + day + year;
	}
    
    function getYYYYMM(date) {
		var year = date.getFullYear();
		var month = (1 + date.getMonth()).toString();
		month = month.length > 1 ? month : '0' + month;
		/*var day = date.getDate().toString();
		day = day.length > 1 ? day : '0' + day;*/
		return year + '-' + month;
	}
    
    function formatDate(strDate)
    {
    	if(strDate.indexOf('/') != -1)
    	{
    		return strDate;
    	}
    	return strDate.substring(0,2)+'/'+strDate.substring(2,4)+'/'+strDate.substring(4);
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



