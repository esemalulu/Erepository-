
/**
 * Parameter values are set at the company preference level
 */
var paramErrorNotifierEmployee = nlapiGetContext().getSetting('SCRIPT', 'custscript_tzbk_employee');
var paramErrorCcEmails = nlapiGetContext().getSetting('SCRIPT','custscript_tzbk_cclist');
if (paramErrorCcEmails) {
	paramErrorCcEmails = paramErrorCcEmails.split(',');
}

/**
 * Mod 6/16/2014 -
 * Deployed for Sales Order as well.
 * Originally this script is deployed to item fulfillment but it's extended out to Sales order to add View Booking Record Link.
 */

function beforeLoadItemFulfillment(type, form, request) {
	
	if (type != 'edit' && type !='view' && nlapiGetContext().getExecutionContext() != 'userinterface') {
		return;
	}
	
	log('debug','rec type', nlapiGetRecordType());
	
	var itemSubList = form.getSubList('item');
	var subfld = itemSubList.addField('custpage_joblink','textarea','View Booking', null);
	subfld.setDisplayType('inline');
	
	log('debug','line count',subfld.getName());
	
	log('debug','added sub col', 'added custom column');
	
	for (var i=1; i <= nlapiGetLineItemCount('item'); i++) {
		var jobId = nlapiGetLineItemValue('item', 'lineentity', i);
		var recUrl = '';
		if (jobId) {
			recUrl = '<a href="'+nlapiResolveURL('RECORD', 'job', jobId, 'VIEW')+'" target="_blank">View Booking Record</a>';
			
			itemSubList.setLineItemValue('custpage_joblink', i, recUrl);
			
		}
	}	
}


//ADD in Xedit feature to recalc the time/zone field.
