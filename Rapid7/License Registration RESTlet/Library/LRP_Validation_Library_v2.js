/**
 * @NApiVersion 2.0
 * @NScriptType plugintypeimpl
 */
define(['N/search'],
function(search) {
	/**
	 * Lookup the template license associated with the given access code
	 * @method getTemplateIdForAccessCode
	 * @param {String} accessCode
	 * @return {Integer} templateId
	 */
	function getTemplateIdForAccessCode(accessCode) {
		if (isEmpty(accessCode)) {
			return null;
		}
    	var filter = search.createFilter({
    		name: 'custrecordr7lictemp_accesscode',
    		operator: search.Operator.IS,
    		values: accessCode
    	});
    	
    	var columns = [];
    	columns.push(search.createColumn({name:'internalid'}));
    	columns.push(search.createColumn({name:'name'}));
    	columns.push(search.createColumn({name:'custrecordr7lictemp_language'}));
    	
    	var searchResult = search.create({
    		type: 'customrecordr7lictemplatesupgrades',
    		filters: filter,
    		columns: columns
    	}).run().getRange({start:0,end:1});
    	if (searchResult == null) {
    		return null;
    	}
    	if (searchResult.length == 0) {
    		return null;
    	}
    	return searchResult[0].id;
    }
    
    /**
     * Search Netsuite for the given campaignId to determine validity.  
     * @param {Object} campaignId The leadSource paramater
     * @return {Boolean} true if the campaignId is valid
     */
    function isValidCampaignId(campaignId) {
		if (isEmpty(campaignId)) {
			return false;
		}
    	var filter = search.createFilter({
    		name: 'internalid',
    		operator: search.Operator.IS,
    		values: campaignId
    	});
    	
    	var searchResult = search.create({
    		type: search.Type.CAMPAIGN,
    		filters: filter
    	}).run().getRange({start:0,end:1});
    	if (searchResult == null) {
    		return false;
    	}
    	return searchResult.length > 0;
    }
    
    /**
     * Search Netsuite for the given typeOfUse to determine validity.  
     * If this returns false, the script will default to null for invalid typeOfUse.
     * 
     * @method validTypeOfUseId
     * @param {Object} typeOfUse The typeOfUse paramater
     * @return {Boolean} true if the typeOfUse is valid
     */
    function isValidTypeOfUseId(typeOfUse) {
		if (isEmpty(typeOfUse)) {
			return false;
		}
    	var filter = search.createFilter({
    		name: 'internalid',
    		operator: search.Operator.IS,
    		values: typeOfUse
    	});
    	
    	var searchResult = search.create({
    		type: 'customlistr7licreq_typeofuse',
    		filters: filter
    	}).run().getRange({start:0,end:1});
    	if (searchResult == null) {
    		return false;
    	}
    	return searchResult.length > 0;
    }

    /**
     * The function returns true if requested product is Metasploit and returns false if other product 
     * @param <accessCode> <Code of license request>.
     * @returns boolean value
     */
    function isMetasploit(accessCode) {
    	if (isEmpty(accessCode)) {
    		return false;
    	}
    	
    	var filters = [];
    	filters.push(search.createFilter({
    		name: 'custrecordr7lictemp_accesscode',
    		operator: search.Operator.IS,
    		values: accessCode
    	}));
    	// Metasploit Id in ACR Product Type List = 2
    	filters.push(search.createFilter({
    		name: 'custrecordr7lictemp_acrprodtype',
    		operator: search.Operator.IS,
    		values: 2
    	}));
    	
    	var searchResult = search.create({
    		type: 'customrecordr7lictemplatesupgrades',
    		filters: filters
    	}).run().getRange({start:0,end:1});
    	if (searchResult == null) {
    		return false;
    	}
    	return searchResult.length > 0;
    }

    function isMetasploitPro(accessCode){
    	/// HARDCODE 
    	// TODO - Get rid of hardcoded value - move to script parameters
    	return accessCode == 'W8PL6ZgWHf'; 
    }

    /**
     * Lookup the appropriate URL for the given redirectCode from the customrecordr7marketingurlredirect record.
     * 
     * @method grabRedirectUrl
     * @param {String} redirectCode
     * @return URL if a valid code is used
     */
    function grabRedirectUrl(redirectCode){
    	var filter = search.createFilter({
    		name: 'custrecordr7marketingurlcode',
    		operator: search.Operator.IS,
    		values: redirectCode
    	});
    	
    	var columns = [];
    	columns.push(search.createColumn({name:'custrecordr7marketingurlendpoint'}));
    	
    	var searchResult = search.create({
    		type: 'customrecordr7marketingurlredirect',
    		filters: filter,
    		columns: columns
    	}).run().getRange({start:0,end:1});
    	if (searchResult == null) {
    		return null;
    	}
    	if (searchResult.length == 0) {
    		return null;
    	}
    	return searchResult[0].getValue({name:'custrecordr7marketingurlendpoint'});
    }
    
    /**
     * Lookup the default URL for the given template.
     * 
     * @method getDefaultRedirectUrl
     * @param {int} templateId
     * @return Default redirect URL
     */
    function getDefaultRedirectUrl(templateId) {
    	var filter = search.createFilter({
    		name: 'internalid',
    		operator: search.Operator.IS,
    		values: templateId
    	});
    	
    	var columns = [];
    	columns.push(search.createColumn({name:'custrecordr7lictemp_redirecturl'}));
    	
    	var searchResult = search.create({
    		type: 'customrecordr7lictemplatesupgrades',
    		filters: filter,
    		columns: columns
    	}).run().getRange({start:0,end:1});
    	if (searchResult == null) {
    		return null;
    	}
    	if (searchResult.length == 0) {
    		return null;
    	}
    	return searchResult[0].getValue({name:'custrecordr7lictemp_redirecturl'});
    }
    
    /**
	 * Check if the given string is empty.
	 * @method isEmpty
	 * @for createCustomerContactLicense
	 * @param {String} str response object from the suitelet
	 * @return {Boolean} true if empty
	 */
    function isEmpty(str){
    		if (str != null && str != '' && typeof str === 'string') {
    			str = str.replace(/\s/g, '');
    		}
    		if (str == null || str == '' || str.length < 1){
    			return true;
    		}
    		return false;
    }
    
    return {
    	getTemplateIdForAccessCode: getTemplateIdForAccessCode,
    	isValidCampaignId: isValidCampaignId,
    	isValidTypeOfUseId: isValidTypeOfUseId,
    	isMetasploit: isMetasploit,
    	isMetasploitPro: isMetasploitPro,
    	getDefaultRedirectUrl: getDefaultRedirectUrl,
    	grabRedirectUrl: grabRedirectUrl,
    	isEmpty: isEmpty
    };
});
