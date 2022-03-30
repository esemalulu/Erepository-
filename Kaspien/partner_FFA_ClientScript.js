function fieldChanged(type, name, linenum) {
	if(name == 'custentity_ffa_yes_no') {
		if(nlapiGetFieldValue('custentity_ffa_yes_no') == '2') {
			nlapiSetFieldValue('custentity_type_of_threshold', '');
			nlapiSetFieldValue('custentity_threshold_notes', '');
			nlapiDisableField('custentity_type_of_threshold', true);
			nlapiDisableField('custentity_threshold_notes', true);
		} else {
			nlapiDisableField('custentity_type_of_threshold', false);
			nlapiDisableField('custentity_threshold_notes', false);
		}
	}
	
	if(name == 'custentity_initial_moq_threshold_notes') {
		if(nlapiGetFieldText('custentity_initial_moq_type_of_threshold') === 'Currency' || nlapiGetFieldText('custentity_initial_moq_type_of_threshold') === 'Units') {
			if(isNaN(nlapiGetFieldValue('custentity_initial_moq_threshold_notes'))) {				
				alert('INITIAL MOQ THRESHOLD NOTES accepts only NUMERIC characters.');
				return false;
			}
		}
	}
	
	if(name == 'custentity_reorder_moq_threshold_notes') {
		if(nlapiGetFieldText('custentity_reorder_moq_type_of_threshold') === 'Currency' || nlapiGetFieldText('custentity_reorder_moq_type_of_threshold') === 'Units') {
			if(isNaN(nlapiGetFieldValue('custentity_reorder_moq_threshold_notes'))) {
				alert('RE-ORDER MOQ THRESHOLD NOTES accepts only NUMERIC characters.');
				return false;
			}
		}
	}
	
	if(name == 'custentity_type_of_threshold') {
		var type_of_threshold = nlapiGetFieldValue('custentity_type_of_threshold');
		switch(type_of_threshold){
			// Always
			case '7':
				nlapiSetFieldValue('custentity_threshold_notes', '');
				nlapiDisableField('custentity_threshold_notes', true);
				break;
			// Other
			case '4':
				nlapiDisableField('custentity_threshold_notes', false);
			break;
			default:
				nlapiDisableField('custentity_threshold_notes', false);
			break;
		}
	}
	if(name == 'custentity_threshold_notes') {
		var type_of_threshold = nlapiGetFieldValue('custentity_type_of_threshold');
		if(nlapiGetFieldValue('custentity_threshold_notes') != '' && type_of_threshold != '7' && type_of_threshold != '4') {
			if(isNaN(nlapiGetFieldValue('custentity_threshold_notes'))) {
				nlapiSetFieldValue('custentity_threshold_notes', '');
				alert('THRESHOLD NOTES accepts only NUMERIC characters.');
				return false;
			}
		}
	}
}

function saveRecord() {
	var type_of_threshold = nlapiGetFieldValue('custentity_type_of_threshold');
	if(type_of_threshold != '7' && type_of_threshold != '4') {
		if(isNaN(nlapiGetFieldValue('custentity_threshold_notes'))) {
			nlapiSetFieldValue('custentity_threshold_notes', '');
			alert('THRESHOLD NOTES accepts only NUMERIC characters.');
			return false;
		}
	}
	if(nlapiGetFieldText('custentity_initial_moq_type_of_threshold') === 'Currency' || nlapiGetFieldText('custentity_initial_moq_type_of_threshold') === 'Units') {
		if(isNaN(nlapiGetFieldValue('custentity_initial_moq_threshold_notes'))) {
			alert('INITIAL MOQ THRESHOLD NOTES accepts only NUMERIC characters.');
			return false;
		}
	}
	if(nlapiGetFieldText('custentity_reorder_moq_type_of_threshold') === 'Currency' || nlapiGetFieldText('custentity_reorder_moq_type_of_threshold') === 'Units') {
		if(isNaN(nlapiGetFieldValue('custentity_reorder_moq_threshold_notes'))) {
			alert('RE-ORDER MOQ THRESHOLD NOTES accepts only NUMERIC characters.');
			return false;
		}
	}
	return true;
}