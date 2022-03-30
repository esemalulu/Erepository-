/**
 * Save record hook
 *
 * @return bool
 */
function form_saveRecord()
{

	selected_coach_id = nlapiGetFieldValue('custrecord_bo_coach');
	
	if (selected_coach_id != null) {
	
		/* Get the name of the chosen coach, use in error message */
		selected_coach_name = nlapiGetFieldText('custrecord_bo_coach');

		/* Get the booking's client ID */
		client = nlapiGetFieldValue('custrecord_bo_customer');

		/* Find the client's record */
		client_record = nlapiLoadRecord('customer', client);

		/* Extract an array of disliked coaches from the record */
		disliked_coaches = client_record.getFieldValues('custentity_cli_cpdislike')

		/* Make sure the coach we have chosen isnt in the disliked list */
		if (sweet_Array_inArray(selected_coach_id, disliked_coaches)) {
		
			error_message = "'" + selected_coach_name + "' is disliked by this client.\n\nPlease choose a different coach for this booking.\n\n\You can view the full list of liked/disliked coaches on the 'Coach preference' tab";
		
			alert(error_message);
		   	return false;
		}
		
	}
	
	return true;
}