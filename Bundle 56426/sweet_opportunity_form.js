/**
 * Opportunity Client Script
 *
 * @require  sweet_opportunity_lib.js
 */

/**
 * FieldChanged hook
 *
 * @return {Void}
 */
function localform_fieldChanged(type, name, linenum) {
  
	if (name == 'probability' || name == 'projectedtotal' || name == 'custbody_op_forecastmonth' || name == 'custbody_op_forecastmonth1' || name == 'custbody_op_forecastmonth2' || name == 'custbody_op_forecastmonth3') {
		//triggerValueRecalc();
	}
  
}

/**
 * SaveRecord hook
 *
 * @return {Boolean}
 */
function localform_saveRecord() {
  
	triggerValueRecalc();
	
	// Make Win/Loss reason mandatory
	var status = nlapiGetFieldValue('entitystatus');
	switch (status) {
    	case '13': // Closed Won
    	case '14': // Closed Lost
    	case '16': // Lost Client (Inactive)
    	case '56': // Won In Progress
    	var reason = nlapiGetFieldValue('winlossreason');
    	if (!reason) {
    		alert('Please select Win/Loss Reason.');
    		return false;
    	}
    	break;
	}
  
	/**
	 * 3/6/2015 - JS@Audaxium
	 * custbody_opp_woninprogress will NO LONGER be used. 
	 * all reference to SWEET.Opportunity.updateStatus which uses this field will be removed from scripts
	 */
	//nlapiSetFieldValue('custbody_opp_woninprogress', (status == '56' ? 'T' : 'F'));
	return true;
}
