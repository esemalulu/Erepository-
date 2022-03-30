/**
 *
 */
 
 function createDropShipRecord(id, type, form) {
	if (type == 'edit') {
      	var custRec = nlapiGetNewRecord();
      	nlapiLogExecution('DEBUG', 'Customer Id', custRec.getId());
		nlapiLogExecution('DEBUG', 'Parent Id', custRec.getFieldValue('custentity1'));
		newDropShipRecord(custRec.getId(), custRec.getFieldValue('custentity1'));
	}
 }
 
 function newDropShipRecord(customer_internalid, partner_internalid) {
	try {
		if (customer_internalid) {
			var filters = [];
			var columns = [];
			filters[0] = new nlobjSearchFilter('custrecord_lead_record_reference', null, 'is', customer_internalid, null);
			filters[1] = new nlobjSearchFilter('custrecord_partner_record_reference', null, 'isempty');
			columns[0] = new nlobjSearchColumn('custrecord_partner_record_reference');
			var response = nlapiSearchRecord('customrecord_drop_ship', null, filters, columns);
			if(response !== null && response.length > 0) {
			  for (var i = 0; i < response.length; i++) {
				if (partner_internalid) {
					nlapiSubmitField('customrecord_drop_ship', response[i].getId(), 'custrecord_partner_record_reference', partner_internalid);
				}
			  }
			} else {
				/*nlapiLogExecution('DEBUG', 'Create Dropship record', 'Start' + nlapiDateToString(new Date(), 'date'));			
				var newRecord = nlapiCreateRecord('customrecord_drop_ship', {recordmode: 'dynamic'});
				newRecord.setFieldValue('custrecord_lead_record_reference', customer_internalid);
				newRecord.setFieldValue('custrecord_first_meeting_schedule', nlapiDateToString(new Date(), 'date'));
				newRecord.setFieldValue('custrecord_first_meeting_completed', nlapiDateToString(new Date(), 'date'));
				newRecord.setFieldValue('custrecord_second_meeting_schedule', nlapiDateToString(new Date(), 'date'));
				newRecord.setFieldValue('custrecord_drop_ship_overview_sent', nlapiDateToString(new Date(), 'date'));
				newRecord.setFieldValue('custrecord_second_meeting_completed', nlapiDateToString(new Date(), 'date'));
				newRecord.setFieldValue('custrecord_have_upcs_catalog', nlapiDateToString(new Date(), 'date'));
				newRecord.setFieldValue('custrecord_dsco_invitation_sent', nlapiDateToString(new Date(), 'date'));
				newRecord.setFieldValue('custrecord_have_pricing', nlapiDateToString(new Date(), 'date'));
				newRecord.setFieldValue('custrecord_assortment_pricing_agreement', nlapiDateToString(new Date(), 'date'));
				newRecord.setFieldValue('custrecord_contract_sent', nlapiDateToString(new Date(), 'date'));
				newRecord.setFieldValue('custrecord_contract_received_signed', nlapiDateToString(new Date(), 'date'));
				newRecord.setFieldValue('custrecord_dsco_intregration_or_complete', nlapiDateToString(new Date(), 'date'));
				if(partner_internalid) newRecord.setFieldValue('custrecord_partner_record_reference', partner_internalid);
				var id = nlapiSubmitRecord(newRecord, true);*/
			}
			nlapiLogExecution('DEBUG', 'Create Dropship record', 'End');
		}
	} catch (e) {
		nlapiLogExecution('DEBUG', 'newDropShipRecord-Exception:', JSON.stringify(e));
	}
 }