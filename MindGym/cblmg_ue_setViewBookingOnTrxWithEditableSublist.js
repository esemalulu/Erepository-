/**
 * Before submit function that can be applied to transaction records with EDITABLE item sublist with reference to project (booking) record.
 * Script will set Hyperlink field with URL to lines' booking record before save.
 * @param type
 */

function setViewBookingLinkOnTrx(type) {
		
	if (type != 'edit') {
		return;
	}
	
	for (var i=1; i <= nlapiGetLineItemCount('item'); i++) {
		var jobId = nlapiGetLineItemValue('item', 'job', i);
		if (jobId) {
			
			nlapiSetLineItemValue('item', 'custcol_cbl_viewbooking_llink', i, nlapiResolveURL('RECORD', 'job', jobId, 'VIEW'));
			//nlapiCommitLineItem('item');
		}
	}
}