/*
 * @author efagone
 */
function beforeSubmit(type){

	if (type == 'create' || type == 'edit') {
	
		var record = nlapiGetNewRecord();
		
		var fieldId = record.getFieldValue('custrecordr7acladdon_fieldid');
		var recordId = record.getFieldText('custrecordr7aclrecord_internalid');
		var valueId = record.getFieldValue('custrecordr7acladdon_value');
		var specificValue = record.getFieldValue('custrecordr7acladdon_specificvalue');
		
		try {
			var recLicense = nlapiCreateRecord(recordId);
		} 
		catch (e) {
			throw nlapiCreateError('INVALID REC TYPE', 'The Record Internal Id you have entered is not a valid record type\n' + e, true);
		}
		
		try {
			var fldObject = recLicense.getField(fieldId);
		} 
		catch (e) {
			throw nlapiCreateError('INVALID FIELD ID', 'The Field Internal Id you have entered is not a valid field on the specified record type: ' + recordId + '\n' + e, true);
		}
		
		var fieldType = fldObject.getType();
		
		record.setFieldValue('custrecordr7acladdon_fieldtype', fieldType);
		
		if (fieldType == 'checkbox' && ((specificValue != 'T' && specificValue != 'F' && specificValue != 'r7disable') || valueId != 5)) {
			throw nlapiCreateError('INVALID FIELD VALUE', 'Checkbox fields must have a specific value of either T or F', true);
		}
		
		if (fieldType == 'date' && valueId == 5) {
			try {
				var isDate = nlapiStringToDate(specificValue);
				nlapiAddDays(isDate, 1);
			} 
			catch (e) {
				throw nlapiCreateError('INVALID FIELD VALUE', 'Date field is not in valid date format (XX/XX/XXXX)', true);
			}
		}
	}
}
