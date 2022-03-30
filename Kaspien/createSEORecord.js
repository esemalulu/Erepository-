/**
 * Copy the SEO records on Partner's SEO record
 */
 
 function copySEORecord(id, type, form) {
	if (type == 'edit') {
      	var custRec = nlapiGetNewRecord();
      	nlapiLogExecution('DEBUG', 'Customer Id', custRec.getId());
		nlapiLogExecution('DEBUG', 'Parent Id', custRec.getFieldValue('custentity1'));
		newSEORecord(custRec.getId(), custRec.getFieldValue('custentity1'));
	}
 }
 
 function newSEORecord(customer_internalid, partner_internalid) {
	try {
		if (customer_internalid) {
			var filters = [];
			var columns = [];
			filters[0] = new nlobjSearchFilter('custrecordetailz_seo_customer_c', null, 'is', customer_internalid, null);
			filters[1] = new nlobjSearchFilter('custrecordvendor_content', null, 'isempty');
			columns[0] = new nlobjSearchColumn('custrecordvendor_content');
			var response = nlapiSearchRecord('customrecordetailz_content_record', null, filters, columns);
			if(response !== null && response.length > 0) {
			  for (var i = 0; i < response.length; i++) {
				if (partner_internalid) {
					nlapiSubmitField('customrecordetailz_content_record', response[i].getId(), 'custrecordvendor_content', partner_internalid);
				}
			  }
			}
			nlapiLogExecution('DEBUG', 'Create SEO record', 'End');
		}
	} catch (e) {
		nlapiLogExecution('DEBUG', 'newSEORecord-Exception:', JSON.stringify(e));
	}
 }