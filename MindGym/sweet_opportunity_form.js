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

function triggerValueRecalc() {
	//recalculate and update the value on custbody_op_forecastremainingtotal (FORECAST REMAINING TOTAL)
	var projectedTotalVal = nlapiGetFieldValue('projectedtotal') || 0.0;
	var fcmVal = nlapiGetFieldValue('custbody_op_forecastmonth') || 0.0;
	var fcmVal1 = nlapiGetFieldValue('custbody_op_forecastmonth1') || 0.0;
	var fcmVal2 = nlapiGetFieldValue('custbody_op_forecastmonth2') || 0.0;
	var fcmVal3 = nlapiGetFieldValue('custbody_op_forecastmonth3') || 0.0;
	
	//11/3/2015 - Ticket 1287 Changes
	
	//31/12/2014  - replaced with custbody_op_quoteamount
	var quotedAmount = nlapiGetFieldValue('custbody_op_quoteamount') || 0.0;
	
	//31/12/2014  - replaced with custbody_op_soamount
	var salesOrderAmount = nlapiGetFieldValue('custbody_op_soamount') || 0.0;
	
	//custbody_op_forecastamount (UNBOOKED AMOUNT)
	//	= custbody_op_forecastmonth + custbody_op_forecastmonth1 + custbody_op_forecastmonth2 + custbody_op_forecastmonth3 
	var unBookedAmount = parseFloat(fcmVal)+
					 	 parseFloat(fcmVal1)+
					 	 parseFloat(fcmVal2)+
					 	 parseFloat(fcmVal3);
	nlapiSetFieldValue('custbody_op_forecastamount', unBookedAmount,true,true);
	
	
	//custbody_op_bookedamount (Opportunity/Booked Amount) Hidden field
	//	= [Quote Amount] + [Sales Order Amount] 
	var bookedAmount = parseFloat(quotedAmount) + parseFloat(salesOrderAmount);
	nlapiSetFieldValue('custbody_op_bookedamount', bookedAmount,true,true);
	
	var oppForecastRemainTotal = parseFloat(projectedTotalVal)- bookedAmount - unBookedAmount;
	var oppRemainTotal = parseFloat(projectedTotalVal)- bookedAmount;
	
	nlapiSetFieldValue('custbody_op_forecastremainingtotal', oppForecastRemainTotal, true, true);
	nlapiSetFieldValue('custbody_op_remainingamount', oppRemainTotal, true, true);
}