function afterSubmit(type) {

	if (type == 'create' || type == 'edit') {
		var noteRecord = nlapiGetNewRecord();
		var noteType = noteRecord.getFieldText('notetype');
		var noteDirection = noteRecord.getFieldText('direction');
		if (noteType == 'E-mail' && noteDirection == 'Incoming') {
			var noteDate = noteRecord.getFieldValue('notedate');

			var noteEntityID  = parseInt(noteRecord.getFieldValue('entity'));
			var noteEntityType = nlapiLookupField('entity', noteEntityID, 'type', true);
			var recordType = noteEntityType.toLowerCase();
			// Load the entity record
			var entityRecord = nlapiLoadRecord(recordType, noteEntityID);

			// Look up the pardot 'do not email' and 'opted out' fields on the record
			var entityOptedOut = entityRecord.getFieldValue('custentitypi_do_not_email');
			var entityDoNotEmail = entityRecord.getFieldValue('custentitypi_opt_out');

			var isPerson = 'F';

			log('Before conditionals', 'noteType = ' + noteType + ', noteDirection = ' + noteDirection + ', noteDate = ' + noteDate + ', noteEntityID = ' + noteEntityID + ', noteEntityType = ' + noteEntityType + ', isPerson = ' + isPerson);
			log('Before conditionals', 'recordType = ' + recordType);

			if (recordType == 'customer') {
				// Double check to make sure the company is an individual
				isPerson = entityRecord.getFieldValue('isperson');
				log('Customer', 'isPerson = ' + isPerson);
			}

			if (recordType == 'contact' || ( recordType == 'customer' && isPerson == 'T')) {
				log('Summary', 'noteType = ' + noteType + ', noteDirection = ' + noteDirection + ', noteDate = ' + noteDate + ', noteEntityID = ' + noteEntityID + ', noteEntityType = ' + noteEntityType + ', isPerson = ' + isPerson);
				// Update the last inquiry date on the contact or individual
				entityRecord.setFieldValue('custentity_lastinquirydate', nlapiDateToString(new Date(), 'date'));
				// If the contact or individual is not opted-out then check the 'Can Email' checkbox
				if (entityOptedOut == 'F' && entityDoNotEmail == 'F') {
					log('Can Email Field', 'Checking the can email field');
					entityRecord.setFieldValue('custentity_canemail', 'T');
				}
				var newEntityID = nlapiSubmitRecord(entityRecord, false);
			}
		}
		else {
			log('Result', 'Not an inbound inquiry');
		}
	}
}

function log(title, details) {
	nlapiLogExecution('DEBUG',title,details);
}
