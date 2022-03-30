function validateCoachChange(){
	var newRecord = nlapiGetNewRecord();
	var fields = newRecord.getAllFields();
	var type = nlapiGetRecordType();
	var id = newRecord.getId();
	var record = nlapiLoadRecord(type , id);
	// Loop through the returned fields
 
	var status = record.getFieldValue('entitystatus');
	// Check the booking status for pending delivery
	if(status == 35) {
		var isPackShipped = record.getFieldValue('custentity_bo_ispackshipped')== 'T';
		var isPrePackShipped = record.getFieldValue('custentity_bo_isprepackshipped') == 'T';
		// Set pack/pre-pack if the the pack is already shipped.
		if (isPrePackShipped || isPackShipped) {
			record.setFieldValue('custentity_bo_ispackshipped', 'F');
			record.setFieldValue('custentity_bo_packshippingdate', '');
			record.setFieldValue('custentity_bo_isprepackshipped', 'F');
			record.setFieldValue('custentity_bo_prepackshippingdate', '');
		}
		// Set new coach
		record.setFieldValue('custentity_bo_coach',nlapiGetFieldValue('custentity_bo_coach'));
		var submitRecordId = nlapiSubmitRecord(record, true);
		throw nlapiCreateError('ERROR', 'The coach is changed when this booking is in Pending Delivery Status. A new Pack/Pre-pack is to be sent to the new coach.', true);
	}
}