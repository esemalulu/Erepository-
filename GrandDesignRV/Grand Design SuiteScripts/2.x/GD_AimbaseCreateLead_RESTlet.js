/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/https', 'N/url'],
/**
 * @param {record} record
 * @param {https} https
 * @param {url} url
 */
function(record, https, url) {
   
	/** Global Variables **/
	var DEALERTYPE_RETAILCUSTOMER = 8;
	
    /**
     * Function called upon sending a GET request to the RESTlet.
     *
     * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.1
     */
//    function GD_LeadCreationREST_Get(requestParams) {
//
//    }

    /**
     * Function called upon sending a PUT request to the RESTlet.
     *
     * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
     * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
//    function GD_LeadCreationREST_Put(requestBody) {
//    	return null;
//    }


    /**
     * Function called upon sending a POST request to the RESTlet.
     *
     * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
     * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function GD_LeadCreationREST_Post(requestBody) {
    	//Create new lead from the json data passed through to this restlet.
    	if (requestBody != null) {
    		var leadRecordId = null;
    		var errorMessage = '';
    		try {
	    		var leadRecord = record.create({
	    			type: record.Type.LEAD,
	    			isDynamic: true
	    		});
	    		
	    		leadRecord.setValue({
	    			fieldId: 'custentitygd_leaduid',
	    			value: requestBody.leadUid
	    		});
	    		
	    		leadRecord.setValue({
	    			fieldId: 'firstname',
	    			value: requestBody.firstName
	    		});
	    		
	    		leadRecord.setValue({
	    			fieldId: 'lastname',
	    			value: requestBody.lastName
	    		});
	    		
	    		leadRecord.setValue({
	    			fieldId: 'email',
	    			value: requestBody.email
	    		});
	    		
	    		leadRecord.setValue({
	    			fieldId: 'phone',
	    			value: requestBody.workPhone
	    		});
	    		
	    		leadRecord.setValue({
	    			fieldId: 'mobilephone',
	    			value: requestBody.mobilePhone
	    		});
	    		
	    		leadRecord.setValue({
	    			fieldId: 'homephone',
	    			value: requestBody.homePhone
	    		});
	    		
	    		leadRecord.selectNewLine({
	    			sublistId: 'addressbook'
	    		})
	    		
	    		leadRecord.setCurrentSublistValue({
	    			sublistId: 'addressbook',
	    			fieldId: 'defaultbilling',
	    			value: true
	    		});
	    		
	    		leadRecord.setCurrentSublistValue({
	    			sublistId: 'addressbook',
	    			fieldId: 'defaultshipping',
	    			value: true
	    		});
	    		
	    		var addressBookAddressSubrecord = leadRecord.getCurrentSublistSubrecord({
	    			sublistId: 'addressbook',
	    			fieldId: 'addressbookaddress'
	    		});
	    		
	    		addressBookAddressSubrecord.setValue({
				    fieldId: 	'country',
				    value: 		requestBody.country
				});
	    		
	    		addressBookAddressSubrecord.setValue({
				    fieldId: 	'addrphone',
				    value: 		requestBody.addrPhone
				});
	    		
	    		addressBookAddressSubrecord.setValue({
				    fieldId: 	'addressee',
				    value: 		requestBody.addressee
				});
	    		
	    		addressBookAddressSubrecord.setValue({
				    fieldId: 	'attention',
				    value: 		requestBody.attention
				});
	    		
	    		addressBookAddressSubrecord.setValue({
				    fieldId: 	'addr1',
				    value: 		requestBody.addr1
				});
	    		
	    		addressBookAddressSubrecord.setValue({
				    fieldId: 	'addr2',
				    value: 		requestBody.addr2
				});
	    		
	    		addressBookAddressSubrecord.setValue({
				    fieldId: 	'city',
				    value: 		requestBody.city
				});
	    		
	    		addressBookAddressSubrecord.setValue({
				    fieldId: 	'state',
				    value: 		requestBody.state
				});
	    		
	    		addressBookAddressSubrecord.setValue({
				    fieldId: 	'zip',
				    value: 		requestBody.zip
				});
	    		
	    		leadRecord.commitLine({
	    			sublistId: 'addressbook'
	    		})
	    		
	    		leadRecord.setValue({
	    			fieldId: 'custentitygd_localdealer',
	    			value: requestBody.localDealerId
	    		});
	    		
	    		var dealerRecord = record.load({
	    			type: record.Type.CUSTOMER,
	    			id: requestBody.localDealerId
	    		});
	    		
	    		var dealerAddress1 = dealerRecord.getValue({
	    			fieldId: 'custentitygd_dlrlocaddress1'
	    		}) || '';
	    		  			
	    		
	    		var dealerAddress2 = dealerRecord.getValue({
	    			fieldId: 'custentitygd_dlrlocaddress2'
	    		});
	    		
	    		var dealerCity = dealerRecord.getValue({
	    			fieldId: 'custentitygd_dlrloccity'
	    		}) || '';
	    		
	    		var dealerState = dealerRecord.getValue({
	    			fieldId: 'custentitygd_dlrlocstate'
	    		}) || '';
	    		
	    		var dealerCountry = dealerRecord.getValue({
	    			fieldId: 'custentitygd_dlrloccountry'
	    		}) || '';
	    		
	    		var dealerZip = dealerRecord.getValue({
	    			fieldId: 'custentitygd_dlrloczipcode'
	    		}) || '';
	    		
	    		// if dealer locator fields are empty, use the dealer billing address.
	    		if (dealerAddress1 == '' ||
	    				dealerCity == '' ||
	    				dealerState == '' ||
	    				dealerCountry == '' ||
	    				dealerZip == ''){
	    			dealerAddress1 = dealerRecord.getValue({
	        			fieldId: 'billaddr1'
	        		}) || '';
	    			
	    			dealerAddress2 = dealerRecord.getValue({
	        			fieldId: 'billaddr2'
	        		}) || '';
	    			
	    			dealerCity = dealerRecord.getValue({
	        			fieldId: 'billcity'
	        		}) || '';
	    			
	    			dealerState = dealerRecord.getValue({
	        			fieldId: 'billstate'
	        		}) || '';
	    			
	    			dealerCountry = dealerRecord.getValue({
	        			fieldId: 'billcountry'
	        		}) || '';
	    			
	    			dealerZip = dealerRecord.getValue({
	        			fieldId: 'billzip'
	        		}) || '';
	    			
	    		}  
	    		
	    		var dealerAddressText = dealerAddress1 + '\n' + dealerCity + ', ' + dealerState + ' ' + dealerZip + '\n' + dealerCountry; 
	    			
	    		leadRecord.setValue({
	    			fieldId: 'custentitygd_localdealer_address',
	    			value: dealerAddressText
	    		});
	    		
	    		leadRecord.setValue({
	    			fieldId: 'custentitygd_contact_marketingseries',
	    			value: requestBody.seriesName
	    		});
	    		
	    		leadRecord.setValue({
	    			fieldId: 'custentitygd_contact_marketingmodel',
	    			value: requestBody.model
	    		});
	    		
	    		leadRecord.setValue({
	    			fieldId: 'custentitygd_contact_modelyear',
	    			value: requestBody.modelYear
	    		});
	    		
	    		leadRecord.setValue({
	    			fieldId: 'custentitygd_contactsmessage',
	    			value: requestBody.comments
	    		});
	    		
	    		// always assign retail customer for dealer type.
	    		leadRecord.setValue({
	    			fieldId: 'custentityrvsdealertype',
	    			value: DEALERTYPE_RETAILCUSTOMER
	    		});
	    		
	    		// always make this lead individual
	    		leadRecord.setValue({
	    			fieldId: 'isperson',
	    			value: 'T'
	    		});
	    		
	    		var leadRecordId = leadRecord.save({
	    			enableSourcing: true,
	    			ignoreMandatoryfields: true
	    		}) || null;
    		} catch (ex) {
    			errorMessage = ex;
    		}

    		return leadRecordId != null ? {status: "Success: Lead created"} : {status: "Failed to create the Lead", errorMessage: errorMessage};
    	}
    	
    	return {status: "Failed to create the Lead"};
    }

    /**
     * Function called upon sending a DELETE request to the RESTlet.
     *
     * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function GD_LeadCreationREST_Delete(requestParams) {
    	return null;
    }

    return {
//        get: GD_LeadCreationREST_Get,
//        put: GD_LeadCreationREST_Put,
        post: GD_LeadCreationREST_Post,
        'delete': GD_LeadCreationREST_Delete
    };
    
});
