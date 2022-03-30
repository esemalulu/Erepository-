/**
 * This is responsible to get the maximum date stripped value from saved search 'source most recent date stripped' and stores
 * that value into the field 'Date Last Stripped' 
 */
function dateLastStrippedPartnerRecPageInit() {
	var filters = [];
	var columns = [];
	filters[0] = new nlobjSearchFilter('custrecordvendor_stripping2_c', null, 'is', nlapiGetRecordId());
	columns[0] = new nlobjSearchColumn ('custrecorddate_stripped_c', null, 'MAX');
	var max_of_date_stripped_rec = nlapiSearchRecord('customrecordetailz_stripping_2', null, filters, columns);
	if(max_of_date_stripped_rec.length) {
		nlapiLogExecution('DEBUG', 'Data check', max_of_date_stripped_rec[0].getValue('custrecorddate_stripped_c', null,'max'));
		nlapiSetFieldValue("custentityetailzdate_last_stripped", nlapiDateToString(new Date(nlapiStringToDate(max_of_date_stripped_rec[0].getValue('custrecorddate_stripped_c', null,'max'))), 'date'), null, true);
	}
}