/**
 * Nightly Map/Reduce replacing GD_DealerPortalAutoInactivation.js to remove contact 
 * access to the portal if they haven't logged in in a certain number of days. 
 * 
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search','N/record','N/runtime'],

function(search, record, runtime) {
   
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
     
    	try {
	    	var returnObj = {};
	
	    	//We'll remove access for anyone whose last login date is past the dealer inactivation period by less than 10 days
	    	//This prevents us from processing every single contact every time, including ones whose last contact date is far, far past.
	    	//The 10 day window gives a buffer if the script fails several nights in a row for some reason.
			var accessRemovalPeriod = parseFloat(runtime.getCurrentScript().getParameter({ name: 'custscriptdealerinactivationperiod'}) || '90');
	    	var today = new Date();
	    	cutoffMin = new Date();
	    	cutoffMin.setDate(today.getDate() - accessRemovalPeriod - 30);
	    	cutoffMinString = (cutoffMin.getMonth() + 1) + '.' + cutoffMin.getDate() +'.'+ cutoffMin.getFullYear();
	    	cutoffMax = new Date();
	    	cutoffMax.setDate(today.getDate() - accessRemovalPeriod);
	    	cutoffMaxString = (cutoffMax.getMonth() + 1) + '.' + cutoffMax.getDate() +'.'+ cutoffMax.getFullYear();
	    	
        	//Do a search to get portal logins with date of last login, grouped by dealer. 
        	//This search is similar to the search GD Dealers in Portal With Last Login Date
        	return search.create({
    		   type: "customer",
    		   filters: [["custentityrvscreditdealer","is","F"], 
    		             "AND", 
    		             ["loginaudittrail.status","is","T"]],
    		   columns: [search.createColumn({name: "internalid",summary: "GROUP"}),
    				     search.createColumn({name: "altname",summary: "GROUP"}),
    				     search.createColumn({
    				         name: "formulatext",
    				         summary: "GROUP",
    				         formula: "LOWER(case when {loginaudittrail.emailaddress} like 'SECURITY ALERT%' then SUBSTR({loginaudittrail.emailaddress}, INSTR({loginaudittrail.emailaddress}, 'LOGIN') + 9, LENGTH({loginaudittrail.emailaddress}) - INSTR({loginaudittrail.emailaddress}, 'LOGIN') + 9) else {loginaudittrail.emailaddress} end)",
    				     }),
    				     search.createColumn({ // note that the min and max are actually arbitrary for these columns. We just need to group somehow to pass these constants through
    				          name: "formuladate",
    				          summary: "MIN",
    				          formula: "TO_DATE('"+cutoffMinString+"', 'MM.DD.YYYY')",
    				          label: "Formula (Date)"
    				     }),
	   				     search.createColumn({// note that the min and max are actually arbitrary for these columns. We just need to group somehow to pass these constants through
					          name: "formuladate",
					          summary: "MAX",
					          formula: "TO_DATE('"+cutoffMaxString+"', 'MM.DD.YYYY')",
					          label: "Formula (Date)"
					     }),
    				     search.createColumn({
    				         name: "date",
    				         join: "loginAuditTrail",
    				         summary: "MAX",
    				         label: "Last Login",
    			        	 sort: search.Sort.DESC,
    				     })]
    		});
    	}
    	catch(error){
    		log.error('error in getInputData',error);
    	}
    }
    
    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
	    
    	try {
        	var values = JSON.parse(context.value).values;
        	
        	var date = new Date(values['MAX(date.loginAuditTrail)']);
        	var cutoffMin = new Date(values['MIN(formuladate)']);
        	var cutoffMax = new Date(values['MAX(formuladate)']);
        	
        	//Only pass to the reduce contacts whose last login date is within the cutoff dates.
    		if (cutoffMin < date && date < cutoffMax) {

    	    	var dealer = values['GROUP(internalid)'].value;
    	    	var email = values['GROUP(formulatext)'];
    		    
    	    	//write to the reduce, grouping by dealer.
        		context.write({
                    key: dealer, 
                    value: email
                }); 
    		}
    	}
    	catch(error) {
    		log.error('error in map','values: '+values);
    		log.error('error',error);
    	}
	}

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
    	try {
    		
        	var dealer = context.key;
        	var emails = context.values;
        	var dealerChanged = false;
    		
    		var dealerRec = record.load({
    		    type: record.Type.CUSTOMER, 
    		    id: dealer,
    		    isDynamic: true,
    		});
        	
    		//Loop through the contact access lines on the dealer record, and remove access from any contacts as needed.
    		for (var i = 0; i < dealerRec.getLineCount({sublistId: 'contactroles'}); i++) {
    			
    			var index = emails.indexOf(dealerRec.getSublistValue('contactroles','email', i));
    			
    			//If this contact is on our list, and they currently have access, remove their access.
    			if(index != -1 && dealerRec.getSublistValue('contactroles','giveaccess', i)) {
    				    				
    				dealerRec.selectLine('contactroles', i);
    				dealerRec.setCurrentSublistValue('contactroles','giveaccess', false);
    				dealerRec.commitLine('contactroles');
 
    				dealerChanged = true;
    			}
    		}
    		
    		if(dealerChanged)
    			dealerRec.save();
    	}
    	catch (error) {
    		log.error('error in reduce','dealer: '+dealer);
    		log.error('error',error);
    	}
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