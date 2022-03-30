/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', '/SuiteScripts/UTILITY_LIB'],

function(record, utility) {

    /**
     * This function gets the current record object. Allows the other functions to have access to the data in the sublist rows.
     */
	var currRecord = {};
	
	function pageInit(context)
	{
		currRecord = context.currentRecord;
	}
	
	/**
	 * This function will do the following:
	 * - Get all the values from the sublist in the suitelet
	 * - If any fields have been changed on the suitelet it will update those fields on the existing custom record so the value will be reflected on load of the suitelet.
	 * 
	 * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     * 
     * FIELDS:
     * -------
     * processrecord  - CHECKBOX
     * custpage_recid - TEXT
     * source - TEXT
     * firstname - TEXT
     * lastname - TEXT
     * email - TEXT
     * companyname - TEXT
     * city - TEXT
     * state - TEXT
     * product - TEXT
     * prodabbr - SELECT
     * status - SELECT
     * location - SELECT
     * leadsource - SELECT 
     * employee - SELECT
     * company - SELECT
     * contact - SELECT
	 */
    function validateLine(scriptContext) 
    {
    	var subid = scriptContext.sublistId;
    	var rec = scriptContext.currentRecord;

    	var line = rec.getCurrentSublistIndex
    	({
    		sublistId: subid 
    	});
    	
    	var processRecord = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'processrecord'
    	});
    	
    	var recordid = rec.getCurrentSublistText
    	({
    		sublistId: subid,
    		fieldId: 'recid'
    	});
    	
    	var source = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'source'
    	});
    	
    	var firstname = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'firstname'
    	});
    	
    	var lastname = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'lastname'
    	});
    	
    	var email = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'email'
    	});
    	
    	var companyname = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'companyname'
    	});
    	
    	var city = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'city'
    	});
    	
    	var state = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'state'
    	});
    	
    	var postal = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'postal'
    	});
    	
    	var product = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'product'
    	});
    	
    	var prodabbr = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'prodabbr'
    	});
    	
    	var status = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'status'
    	});
    	
    	var location = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'location'
    	});
    	
    	var leadsource = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'leadsource'
    	});
    	
    	var employee = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'employee'
    	});
    	
    	var company = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'company'
    	});
    	
    	var contact = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'contact'
    	});
    	
    	var opp = rec.getCurrentSublistValue
    	({
    		sublistId: subid,
    		fieldId: 'opp'
    	});

    	var records = record.submitFields
    	({
    		type: 'customrecord_lsc_leads',
    		id: recordid,
    		values: {
    			custrecord3: source,
    			custrecord5: firstname,
    			custrecord6: lastname,
    			custrecord17: email,
    			custrecord9: companyname,
    			custrecord12: city,
    			custrecord13: state,
    			custrecord14: postal,
    			custrecord2: product,
    			custrecord_aux_prod_abbrv: prodabbr,
    			custrecord38: status,
    			custrecord78: location,
    			custrecord_leads_source_type: leadsource,
    			custrecord62: employee,
    			custrecord_leads_opp: opp
    		},
    		options: {
    			enableSourcing: false,
    			ignoreMandatoryFields: true
    		}
    	});
    	
    	return true;
    }
    
    


    /**
     * The following function will take the values that are set in the filters and passes them to the suitelet when the "Retrieve Suspect Records" button is clicked. 
     * It will also redirect to the suitelet and throw a warning if the filters are not set.
     */
	function refreshPage()
	{
		var dateS = currRecord.getText
					({
						fieldId: 'custpage_startdate'
					});
		
		var dateE = currRecord.getText
					({
						fieldId: 'custpage_enddate'
					});
		
		var source = currRecord.getValue
					({
						fieldId: 'custpage_sourcetype'
					});
		
		if(dateS == '' || dateE == '')
		{
			alert('Please enter value(s) for Start Date and End Date.')
		}
		else
		{
			window.isChanged = false;
			window.location = window.location + '&custpage_startdate=' + dateS + '&custpage_enddate=' + dateE;
		}
		
		
		
		if(source != '')
		{
			window.isChanged = false;
			window.location = window.location + '&custpage_startdate=' + dateS + '&custpage_enddate=' + dateE + '&custpage_sourcetype=' + source;
		}

	}

    return {
    	pageInit: pageInit,
        validateLine: validateLine,
        refreshPage: refreshPage
    };
    
});
