function saveRecord()
{
	//  Array of internalID's for the checkbox custom fields on opportunities
	var checkboxFields = ['custbody_oppproduct_swx', 'custbody_oppproduct_sim', 'custbody_oppproduct_pdm', 'custbody_oppproduct_swelectrical', 'custbody_oppproduct_e3ww', 'custbody_oppproduct_rp', 'custbody_oppproduct_services', 'custbody_opproduct_subscription', 'custbody_oppproduct_training', 'custbody_oppproduct_plm', 'custbody_oppproduct_da', 'custbody_oppproduct_other', 'custbody_oppproduct_composer', 'custbody_oppproduct_swplastics', 'custbody_oppproduct_partnerproduct', 'custbody_oppproduct_swinspection', 'custbody_oppproduct_mechconceptual', 'custbody_oppproduct_exalead'];

	var checkboxValues = []; //  Array for the current state of the checkboxes
	var numberOfCheckBoxesChecked = 0;  // Total count of checked boxes
	//  Loop through all of the checkboxes and ensure increment the counter of number of checkboxes checked
	for (var i = 0 ; i < checkboxFields.length ; i++) {
		checkboxValues[i] =  (nlapiGetFieldValue(checkboxFields[i]) == 'T') ? 1 : 0;
		numberOfCheckBoxesChecked = numberOfCheckBoxesChecked + checkboxValues[i];
	}

	if (numberOfCheckBoxesChecked == 0) {
		alert('You must check at least one opportunity product');
		return false;
	}
	else {
		return true;
	}
}