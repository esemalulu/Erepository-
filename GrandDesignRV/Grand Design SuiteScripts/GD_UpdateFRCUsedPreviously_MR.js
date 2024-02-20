/**
 * One-time update for case #13625
 * 
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search','N/record'],

function(search, record) {
   
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {

    	//Claim Operation Lines for 13625

    	return search.create({
		   type: "customrecordrvsclaimoperationline",
		   filters:
		   [
	          ["created","within","10/30/2019 5:00 pm","1/29/2020 6:00 pm"], 
		      "AND", 
		      ["custrecordclaimoperationline_status","anyof","1","4"], 
		      "AND", 
		      ["custrecordclaimoperationline_claim.custrecordclaim_status","noneof","2","3","4","5"],
		   ],
		   columns:
		   [
		      search.createColumn({name: "custrecordclaimopline_unit"}),
		      search.createColumn({name: "custrecordclaimoperationline_flatratecod"}),
		      search.createColumn({name: "created"}),
		      search.createColumn({name: "custrecordclaim_preauthorization", join: "CUSTRECORDCLAIMOPERATIONLINE_CLAIM"}),
		      search.createColumn({name: "custrecordclaimoperationline_claim", label: "Claim"}),
		   ]
		});
    	
    	
    	//Pre Auth Operation Lines for 13625
    	
//    	return search.create({
//		   type: "customrecordrvspreauthoperationline",
//		   filters:
//		   [
//		      ["created","within","10/30/2019 5:00 pm","1/29/2020 6:00 pm"], 
//		      "AND", 
//		      ["custrecordpreauthopline_status","anyof","1","4"], 
//		      "AND",
//		      ["custrecordpreauthopline_preauth.custrecordpreauth_status","noneof","2","3","4","7"],
//		   ],
//		   columns:
//		   [
//	      	  search.createColumn({name: "custrecordpreauthopline_unit"}),
//	      	  search.createColumn({name: "custrecordpreauthopline_flatratecode"}),
//		      search.createColumn({name: "created"}),
//		      search.createColumn({name: "custrecordpreauthopline_preauth"}),
//		   ]
//		});
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
    	
    	try {
    		
	    	var result = JSON.parse(context.value);
	
	    	if(result.recordType == 'customrecordrvsclaimoperationline') {
	        	var unit = result.values.custrecordclaimopline_unit.value;
	        	var frc = result.values.custrecordclaimoperationline_flatratecod.value;
	        	var created = result.values.created;
	        	var pa = result.values['custrecordclaim_preauthorization.CUSTRECORDCLAIMOPERATIONLINE_CLAIM'].value;
	        	var id = result.id;
	        	var claim = result.values.custrecordclaimoperationline_claim.value;
	
	        	var paFilters = [["custrecordpreauthopline_unit","anyof",unit], 
					 	 		      "AND", 
					 	 		      ["custrecordpreauthopline_flatratecode","anyof",frc], 
					 	 		      "AND", 
					 	 		      ["created","before",created]];
	        	if(pa) {
	        		paFilters.push("AND");
	        		paFilters.push(["custrecordpreauthopline_preauth","noneof",pa]); 
	        	}
	        	
		    	//Has this flat rate been used previously on Claims? 13625
		    	var claimSearch = search.create({
		 		   type: "customrecordrvsclaimoperationline",
		 		   filters: [
		 		      ["custrecordclaimopline_unit","anyof",unit], 
		 		      "AND", 
		 		      ["custrecordclaimoperationline_flatratecod","anyof",frc], 
		 		      "AND", 
		 		      ["created","before",created],
		 		      "AND",
		 		      ["custrecordclaimoperationline_claim","noneof",claim]
		 		   ],
		 		   columns: [search.createColumn({name: "internalid"})]
		 		});
		 		var claimCount = claimSearch.runPaged().count;
		 		
		 		if(claimCount == 0) {
		 	 		//Has this flat rate been used previously on Pre Auths? 13625
		 	 		var preauthSearch = search.create({
		 	 		   type: "customrecordrvspreauthoperationline",
		 	 		   filters: paFilters,
		 	 		   columns:[search.createColumn({name: "internalid"})]
		 	 		});
		 	 		var paCount = preauthSearch.runPaged().count;
		 	 		if(paCount == 0) return;
		 		}
		
		 		record.submitFields({
		 		    type: 'customrecordrvsclaimoperationline',
		 		    id: id,
		 		    values: {
		 		    	custrecordclaimopline_flatrateusedprev: 'T'
		 		    },
		 		    options: {
		 		        enableSourcing: false,
		 		        ignoreMandatoryFields : true
		 		    }
		 		});
	    	}
	    	else {
	    		
	        	var unit = result.values.custrecordpreauthopline_unit.value;
	        	var frc = result.values.custrecordpreauthopline_flatratecode.value;
	        	var created = result.values.created;
	        	var pa = result.values.custrecordpreauthopline_preauth.value;
	        	var id = result.id;
	        	
		    	//Has this flat rate been used previously on Claims? 13625
		    	var claimSearch = search.create({
		 		   type: "customrecordrvsclaimoperationline",
		 		   filters: [
		 		      ["custrecordclaimopline_unit","anyof",unit], 
		 		      "AND", 
		 		      ["custrecordclaimoperationline_flatratecod","anyof",frc], 
		 		      "AND", 
		 		      ["created","before",created]
		 		   ],
		 		   columns: [search.createColumn({name: "internalid"})]
		 		});
		 		var claimCount = claimSearch.runPaged().count;
		 		
		 		if(claimCount == 0) {
		 	 		//Has this flat rate been used previously on Pre Auths? 13625
		 	 		var preauthSearch = search.create({
		 	 		   type: "customrecordrvspreauthoperationline",
		 	 		   filters:
		 	 		   [
		 	 		      ["custrecordpreauthopline_unit","anyof",unit], 
		 	 		      "AND", 
		 	 		      ["custrecordpreauthopline_flatratecode","anyof",frc], 
		 	 		      "AND", 
		 	 		      ["created","before",created],
		 	 		      "AND", 
		 	 		      ["custrecordpreauthopline_preauth","noneof",pa]
		 	 		   ],
		 	 		   columns:[search.createColumn({name: "internalid"})]
		 	 		});
		 	 		var paCount = preauthSearch.runPaged().count;
		 	 		if(paCount == 0) return;
		 		}
		
		 		record.submitFields({
		 		    type: 'customrecordrvspreauthoperationline',
		 		    id: id,
		 		    values: {
		 		    	custrecordpreauthopline_flatrateusedprev: 'T'
		 		    },
		 		    options: {
		 		        enableSourcing: false,
		 		        ignoreMandatoryFields : true
		 		    }
		 		});
	    	}
    	}
    	catch(err) {
    		log.debug('error for id: '+id,err);
    	}
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
