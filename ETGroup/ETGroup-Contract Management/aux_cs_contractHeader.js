/**
 * Author: Audaxium
 * Date: 4/26/2013
 * Record: Contract Header (customrecord_acm_contractheader)
 * Desc:
 * Client Script deployed at Record level to handle all client related validation/automation for contract header record
 */

function contractHeaderSaveRecord() {
	//make sure contract start date and end date is in line. Don't let it save if start date is Greater than end date
	if (nlapiGetFieldValue('custrecord_acmch_enddate') && nlapiGetFieldValue('custrecord_acmch_startdate')) {
		var startDateObj = new Date(nlapiGetFieldValue('custrecord_acmch_startdate'));
		var endDateObj = new Date(nlapiGetFieldValue('custrecord_acmch_enddate'));
			
		if (startDateObj > endDateObj) {
			alert('Contract Start Date must be before Contract End Date. Please make correction for Days to Expire to calculate correctly');
			return false;
		}
	}
	
	return true;
}

/**
 * Fires whenever a field is changed by the user or system similar to onchange event in JavaScript
 * type: the sublist internal ID
 * name: Fields' internal ID
 * linenum: line number if chaning field is in sublist 
 */
function contractHeaderFieldChanged(type, name, linenum) {

	//calculate Days to Expiry: Calculated based on Contract Start Date - Contract End Date
	if (name == 'custrecord_acmch_startdate' || name == 'custrecord_acmch_enddate') {
		//make sure both start and end date are filled in
		if (nlapiGetFieldValue('custrecord_acmch_enddate') && nlapiGetFieldValue('custrecord_acmch_startdate')) {
			try {
				var startDateObj = new Date(nlapiGetFieldValue('custrecord_acmch_startdate'));
				var endDateObj = new Date(nlapiGetFieldValue('custrecord_acmch_enddate'));
				
				if (startDateObj > endDateObj) {
					alert('Contract Start Date must be before Contract End Date. Please make correction for Days to Expire to calculate correctly');
				} else {
					nlapiSetFieldValue('custrecord_acmch_daystoexpire', ((endDateObj.getTime() - startDateObj.getTime()) / (1000*60*60*24)).toFixed(0));
				}
				
			} catch (expcalcerr) {
				alert('Error while calculating Days to Expiry: '+expcalcerr);
			}
		}
	} 
	
}


