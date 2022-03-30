/**
 * This is responsible to set the latest date on 'Date Last Stripped' of the vendor Record
 */
function dateLastStrippedPERecUE_AS(type) {
	try {
		if(type != 'edit' && type != 'xedit' && type != 'create') return false;
		nlapiLogExecution('DEBUG', 'Start', '============= Start:: PE After Submit Event Triggered ==============');
		nlapiLogExecution('DEBUG', 'Vendor Id', nlapiGetFieldValue('custrecordvendor_stripping2_c'));
		var filters = [];
		var columns = [];
		filters[0] = new nlobjSearchFilter('custrecordvendor_stripping2_c', null, 'is', nlapiGetFieldValue('custrecordvendor_stripping2_c'));
		columns[0] = new nlobjSearchColumn ('custrecorddate_stripped_c', null, 'MAX');
		var max_of_date_stripped_rec = nlapiSearchRecord('customrecordetailz_stripping_2', null, filters, columns);
		var vendorRecord = nlapiLoadRecord('vendor', nlapiGetFieldValue('custrecordvendor_stripping2_c'));
		if(max_of_date_stripped_rec.length) {
			var date_stripped = max_of_date_stripped_rec[0].getValue('custrecorddate_stripped_c', null,'max');
			nlapiLogExecution('DEBUG', 'date_stripped', date_stripped);
			if(date_stripped)			
				vendorRecord.setFieldValue('custentityetailzdate_last_stripped', nlapiDateToString(new Date(nlapiStringToDate(max_of_date_stripped_rec[0].getValue('custrecorddate_stripped_c', null,'max'))), 'date'));
			else
				vendorRecord.setFieldValue('custentityetailzdate_last_stripped', null);
		} else {
			vendorRecord.setFieldValue('custentityetailzdate_last_stripped', null);
		}
		nlapiSubmitRecord(vendorRecord, false, true);
		nlapiLogExecution('DEBUG', 'End', '============= END:: PE After Submit Event Triggered ==============');
	} catch(ex) {
		nlapiLogExecution('DEBUG', "ERROR::", ex.message);
	}	
}