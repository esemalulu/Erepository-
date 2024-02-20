/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],
/**
 * @param {record} record
 */
function(record, search) {
    /**
     * Function called upon sending a GET request to the RESTlet.
     *
     * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.1
     */
    function GD_UnitLeadLinkREST_Get(requestParams) {

    }

    /**
     * Function called upon sending a PUT request to the RESTlet.
     *
     * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
     * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function GD_UnitLeadLinkREST_Put(requestBody) {
    	return null;
    }


    /**
     * Function called upon sending a POST request to the RESTlet.
     *
     * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
     * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function GD_UnitLeadLinkREST_Post(requestBody) {
    	//Create new lead from the json data passed through to this restlet.
    	if (requestBody != null) {
    		var errorMessage = '';
    		try {
	    		var unitLeadLinkJSONArray = requestBody.unitLeadLink || [];
	    		
	    		var isSuccess = true;
	    		// get all the lead records by using all the leadUid as filter
	    		// construct a formula filter that will do this.
	    		var filterString = "formulanumeric: CASE WHEN {custentitygd_leaduid} IN (";
	    		for (var i = 0; i < unitLeadLinkJSONArray.length; i++){
	    			if (i == 0)
	    				filterString += "'" + unitLeadLinkJSONArray[i].leadUid + "'";
	    			else
	    				filterString += ", " + "'" + unitLeadLinkJSONArray[i].leadUid + "'";
	    		}
	    		filterString += ") THEN 1 ELSE 0 END";
	    		
	    		// Find all leads with corresponding leadUid and set the internal id to the Unit by cross referencing with corresponding unitId.
	    		search.create({
		    		type: search.Type.LEAD,
		    		filters: [['custentitygd_leaduid', 'isnotempty', ""], 
		    		                   'AND',
		    		                   [filterString.toString(), 'equalto', 1]],
	    			columns: [search.createColumn({name: 'custentitygd_leaduid'})]
		    	}).run().each(function(result){
		    		var elementArray = unitLeadLinkJSONArray.filter(function (element){log.debug('element.leadUid', element.leadUid); return element.leadUid == result.getValue({name:"custentitygd_leaduid"});}) || [];
		    		if (elementArray.length > 0){
		    			try {
				    		record.submitFields({
				    			type: 'customrecordrvsunit',
				    			id: elementArray[0].unitId,
				    			values: {
				    				custrecordunit_gdleadrecord: result.id
				    			}
				    		});
				    		isSuccess = isSuccess ? isSuccess : false;
		    			} catch (ex){
		    				isSuccess = false
		    			}
		    		} else
		    			isSuccess = false
		    		return true;
		    	});
    		} catch (ex) {
    			errorMessage = ex;
    		}
    		return isSuccess ? {status: "Success: All Leads linked"} : {status: "Failure: At least one Lead was not linked", error: errorMessage};
    	}
    	return {status: "Failure: No Leads were linked"};
    }

    /**
     * Function called upon sending a DELETE request to the RESTlet.
     *
     * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function GD_UnitLeadLinkREST_Delete(requestParams) {
    	return null;
    }

    return {
        get: GD_UnitLeadLinkREST_Get,
        put: GD_UnitLeadLinkREST_Put,
        post: GD_UnitLeadLinkREST_Post,
        'delete': GD_UnitLeadLinkREST_Delete
    };
    
});
