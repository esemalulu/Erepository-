/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/email', 'N/record', 'N/runtime', 'N/search', 'N/format'],
/**
 * @param {email} email
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */
function(email, record, runtime, search, format) {
    function execute(scriptContext) {
    	log.debug({title: 'execute', details: 'Start execute function'});
    	/*if (scriptContext.type !== scriptContext.InvocationType.ON_DEMAND)
            return;*/
        var searchId = runtime.getCurrentScript().getParameter("custscript_delete_rs_searchid");
    	var startDate = runtime.getCurrentScript().getParameter("custscript_delete_rs_start_date");
    	var endDate = runtime.getCurrentScript().getParameter("custscript_delete_rs_end_date");
        //var searchId = 'customsearch_rs_billing_table';
        //try {

        if(!searchId || !startDate || !endDate){
        	log.debug({title: 'execute', details: 'Missing required script parameters: SEARCH ID or START DATE or END DATE'});
        }
        
        var formattedStartDate = format.format({
            value: startDate,
            type: format.Type.DATE
        });
        var formattedEndDate = format.format({
            value: endDate,
            type: format.Type.DATE
        });
        
        var searchFilters = [];
        //var searchColumns = [];
            
        searchFilters.push(search.createFilter({ //create new filter
            name: 'custrecord_bs2_date',
            operator: search.Operator.WITHIN,
            values: [formattedStartDate,formattedEndDate]
        }));
        
        var results = getAllResults(null,searchId,searchFilters,null);
        log.debug({title: 'execute', details: 'results length = '+results.length});
        
        var customRecordType = 'customrecord_rs_billing_table';
        for(var i=0;results && i<results.length;i++){
        	log.debug({title: 'execute', details: 'Deleting Record ID = '+results[i].id});
        	deleteNSRecord(customRecordType, results[i].id);
        }
        
        /*} catch (e) {
            var subject = 'Error occured while processing Billing Summary Data.';
            var authorId = 3;
            var recipientEmail = 'anil.sharma@livongo.com';
            email.send({
                author: authorId,
                recipients: recipientEmail,
                subject: subject,
                body: 'Error occured while processing Billing Summary Data: \n' + runtime.getCurrentScript().id + '\n\n' + JSON.stringify(e)
            });
        }*/
        log.debug({    
            title: 'execute', 
            details: 'End execute function'
        });
    }
    
    function deleteNSRecord(recType, recId){
    	var deletedRecordID = record.delete({
    	       type: recType,
    	       id: recId
    	}); 
    	log.debug({title: 'execute', details: 'deletedRecordID = '+deletedRecordID});
    }
    
    function getAllResults(searchRecordtype, searchId, searchFilters, searchColumns){
    	var startIndex = 0;
    	var endIndex = 1000;
    	var searchResults = [];    	
    	var savedSearch = null;
    	
    	if(searchId){
	    	savedSearch = search.load({
	            id: searchId
	    	});
	    	var filters = savedSearch.filters;
	    	var columns = savedSearch.columns;
	    	
	    	for(i=0;i<searchFilters && searchFilters.length; i++){
	    		filters.push(searchFilters[i]);
	    	}
	    	for(j=0;j<searchColumns && searchColumns.length; j++){
	    		columns.push(searchColumns[j]);
	    	}
	    	
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
    	return searchResults;
    }
    
    return {
        execute: execute
    };
});
