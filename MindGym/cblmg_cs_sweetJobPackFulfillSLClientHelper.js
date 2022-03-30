
/**
 *
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */


function packSlUiOnSave() {

	//loop through each line and make sure those to be packed has Location and Shipping address set
	var hasSelection = false;
	var checkCounter = 0;
	for (var i=1; i <= nlapiGetLineItemCount('jobs'); i++) {


		var pack = nlapiGetLineItemValue('jobs', 'custentity_bo_isinproduction', i);
		var loc = nlapiGetLineItemValue('jobs', 'custentity_cbl_packffloc', i);
		var addr = nlapiGetLineItemValue('jobs', 'custentity_bo_otheraddress', i);
		var jobtext = nlapiGetLineItemValue('jobs','jobtext',i);

		if (pack == 'T') {
			checkCounter+=1;
			if (!loc) {
				alert('Selected Pack ('+jobtext+') on line '+i+' is missing location');
				return false;
			}

			if (!addr) {
				alert('Selected Pack ('+jobtext+') on line '+i+' is missing shipping address. Go to Booking record and make sure you set shipping address');
				return false;
			}
			hasSelection = true;
		}

	}

	if(checkCounter)
	{
		if(checkCounter > 49)
		{
			alert('Only 50 records can be processed at a time.');
			for(var i = 49; i < checkCounter; i+=1)
			{
				nlapiSetLineItemValue('jobs', 'custentity_bo_isinproduction', i, 'F');
				nlapiSetLineItemValue('jobs', 'custentity_cbl_packffloc', i, '');
			}
			return false;
		}
	}



	if (!hasSelection) {
		alert('You must select atleast one booking to pack');
		return false;
	}

	return true;
}

function autoSetFulfillLocation(PROVISIONAL_STATUS_ID)
{
	var packLineCount = nlapiGetLineItemCount('jobs');

	for (var i = 1; i <= packLineCount; i++)
	{
		var bookingStatus     = nlapiGetLineItemValue('jobs', 'entitystatusid', i);
		var courseFulfillment = nlapiGetLineItemValue('jobs', 'custrecord_course_packffloc', i);
		var coach             = nlapiGetLineItemValue('jobs','custentity_bo_coach_display',i)
		var shipAddress       = nlapiGetLineItemValue('jobs','custentity_bo_otheraddress',i);

		if(bookingStatus != PROVISIONAL_STATUS_ID || !courseFulfillment | !coach || !shipAddress)
		{
			continue;
		}
		else
		{
			nlapiSetLineItemValue('jobs', 'custentity_bo_isinproduction', i, 'T');
			nlapiSetLineItemValue('jobs', 'custentity_cbl_packffloc', i, courseFulfillment);
		}
	}
}

function autoSetPackAndAlpahLocation(paramAlphaPrintLocId, PROVISIONAL_STATUS_ID) {

	var packLineCount = nlapiGetLineItemCount('jobs');
	
	for (var i=1; i <= packLineCount; i++) {
		if (nlapiGetLineItemValue('jobs','entitystatusid',i) == PROVISIONAL_STATUS_ID || !nlapiGetLineItemValue('jobs','custentity_bo_coach_display',i) || !nlapiGetLineItemValue('jobs','custentity_bo_otheraddress',i)) {
			continue;
		}
		
		var isLithoChecked = nlapiGetLineItemValue('jobs', 'custrecord_course_islitho',i);
		if (isLithoChecked == 'Yes') {
			nlapiSetLineItemValue('jobs', 'custentity_bo_isinproduction', i, 'T');
			nlapiSetLineItemValue('jobs', 'custentity_cbl_packffloc', i, paramAlphaPrintLocId);
		}
	}
} 

function autoSetPackAndNewPerspectiveLocation(paramNewPerspectiveLocId, PROVISIONAL_STATUS_ID) {

	var packLineCount = nlapiGetLineItemCount('jobs');
	
	for (var i=1; i <= packLineCount; i++) {
		if (nlapiGetLineItemValue('jobs','entitystatusid',i) == PROVISIONAL_STATUS_ID || !nlapiGetLineItemValue('jobs','custentity_bo_coach_display',i) || !nlapiGetLineItemValue('jobs','custentity_bo_otheraddress',i)) {
			continue;
		}
		
		var isLithoChecked = nlapiGetLineItemValue('jobs', 'custrecord_course_islitho',i);
		if (isLithoChecked == 'No') {
			nlapiSetLineItemValue('jobs', 'custentity_bo_isinproduction', i, 'T');
			nlapiSetLineItemValue('jobs', 'custentity_cbl_packffloc', i, paramNewPerspectiveLocId);
		}
	}
}
