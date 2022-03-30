/**
 * Copy the Agreement records from Prospects to Partner's Agreement record
 */
 
 function copyAgreementRecord(id, type, form) {
	if (type == 'edit') {
      	var custRec = nlapiGetNewRecord();
      	nlapiLogExecution('DEBUG', 'Customer Id', custRec.getId());
		nlapiLogExecution('DEBUG', 'Parent Id', custRec.getFieldValue('custentity1'));
		newAgreementRecord(custRec.getId(), custRec.getFieldValue('custentity1'));
	}
 }
 
 function newAgreementRecord(customer_internalid, partner_internalid) {
	try {
		if (customer_internalid) {
			var filters = [];
			var columns = [];
			filters[0] = new nlobjSearchFilter('custrecordagreements_customer_c', null, 'is', customer_internalid, null);
			filters[1] = new nlobjSearchFilter('custrecordagreement_partner', null, 'isempty');
			columns[0] = new nlobjSearchColumn('custrecordagreement_partner');
			var response = nlapiSearchRecord('customrecordcustomrecordetailz_agreement', null, filters, columns);
			if(response !== null && response.length > 0) {
			  for (var i = 0; i < response.length; i++) {
				if (partner_internalid) {
					nlapiSubmitField('customrecordcustomrecordetailz_agreement', response[i].getId(), 'custrecordagreement_partner', partner_internalid);
				}
			  }
			}
			nlapiLogExecution('DEBUG', 'Create Agreement record', 'End');
		}
	} catch (e) {
		nlapiLogExecution('DEBUG', 'newAgreementRecord-Exception:', JSON.stringify(e));
	}
 }