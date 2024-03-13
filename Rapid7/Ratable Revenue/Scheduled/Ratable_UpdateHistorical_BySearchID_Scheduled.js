/*
 * @author efagone
 */

var objItemProps = new Object();

function r7_ratable_revrec_sched(){

	var timeLimitInMinutes = 20;
	this.timeLimitInMilliseconds = timeLimitInMinutes * 60 * 1000;
	this.startingTime = new Date().getTime();
	this.context = nlapiGetContext();
	this.rescheduleScript = false;
	
	nlapiGetContext().setSessionObject('r7noavatax', 'T');
	
	var searchRecord = 'transaction';
	var objPrevFails = grabPrevFails();
	var specificTranId = context.getSetting('SCRIPT', 'custscriptr7ratscripttrantoproccess');
	var searchId = context.getSetting('SCRIPT', 'custscriptr7ratablehistoricsrchiduse');
	
	if (specificTranId != null && specificTranId != '') {
		var invoiceId = specificTranId;
		nlapiLogExecution('DEBUG', 'running script against single tran', specificTranId);
		var recType = getRecTypeId(nlapiLookupField('transaction', invoiceId, 'type'));
		
		try {
			processInvoice(recType, invoiceId);
			return;
		} 
		catch (e) {
			var msg = '';

			if (e instanceof nlobjError) {
				msg = 'Code: ' + e.getCode() + ' \nDetails: ' + e.getDetails() + '\nStackTrace: \n';
				var st = e.getStackTrace();
				// nlobjError.getStackTrace() is documented as returning an array, but actually (sometimes?) returns a single string...
				if ((typeof st !== 'undefined') && (st !== null)) {
					if (typeof st === 'string') {
						msg += '\n' + st;
					} else { // in case we ever do get an array...
						for (var n = 0; n < st.length; n++) {
							if (st[n] !== 'undefined') {
								msg += '\n' + st[n];
							}
						}
					}
				}
			} else {
				msg = e.toString();
			}
			
			nlapiLogExecution('ERROR', 'Could not update transaction id: ' + invoiceId, msg);
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, nlapiGetUser(), 'Could not update transaction id: ' + invoiceId, msg);
			var recError = null;
			if (objPrevFails.hasOwnProperty(invoiceId)) {
				recError = nlapiLoadRecord('customrecordr7ratabletransactionerrorlog', objPrevFails[invoiceId]);
			}
			else {
				recError = nlapiCreateRecord('customrecordr7ratabletransactionerrorlog');
			}
			recError.setFieldValue('custrecordr7ratabletranerrortran', invoiceId);
			recError.setFieldValue('custrecordr7ratabletranerrorerror', msg);
			nlapiSubmitRecord(recError);
			return;
		}
	}
	
	if (searchId == null || searchId == ''){
		return;
	}
	nlapiLogExecution('DEBUG', 'running full script against search', searchId);
	
	var arrSearchResults = nlapiSearchRecord(searchRecord, searchId);
	
	for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && unitsLeft() && timeLeft(); i++) {
	
		var columns = arrSearchResults[i].getAllColumns();
		var tranId = arrSearchResults[i].getValue(columns[0]);
		var recType = arrSearchResults[i].getValue(columns[1]);

		try {
			if (getRecTypeId(recType) == 'salesorder'){
				continue;
			}
			if (objPrevFails.hasOwnProperty(tranId)) {
				nlapiLogExecution('DEBUG', 'skipping, previous error found in customrecordr7ratabletransactionerrorlog', tranId);
				continue;
			}
			processInvoice(getRecTypeId(recType), tranId);
		} 
		catch (e) {
			var msg = '';

			if (e instanceof nlobjError) {
				msg = 'Code: ' + e.getCode() + ' \nDetails: ' + e.getDetails() + '\nStackTrace: \n';
				var st = e.getStackTrace();
				// nlobjError.getStackTrace() is documented as returning an array, but actually (sometimes?) returns a single string...
				if ((typeof st !== 'undefined') && (st !== null)) {
					if (typeof st === 'string') {
						msg += '\n' + st;
					} else { // in case we ever do get an array...
						for (var n = 0; n < st.length; n++) {
							if (st[n] !== 'undefined') {
								msg += '\n' + st[n];
							}
						}
					}
				}
			} else {
				msg = e.toString();
			}
			
			nlapiLogExecution('ERROR', 'Could not update transaction id: ' + tranId, msg);
			var recError = null;
			if (objPrevFails.hasOwnProperty(tranId)) {
				recError = nlapiLoadRecord('customrecordr7ratabletransactionerrorlog', objPrevFails[tranId]);
			}
			else {
				recError = nlapiCreateRecord('customrecordr7ratabletransactionerrorlog');
			}
			recError.setFieldValue('custrecordr7ratabletranerrortran', tranId);
			recError.setFieldValue('custrecordr7ratabletranerrorerror', msg);
			nlapiSubmitRecord(recError);
			continue;
		}
	}
	
	if (i >= 999) {
		rescheduleScript = true;
	}
	
	if (rescheduleScript) {
		nlapiLogExecution('DEBUG', 'Rescheduling script (script/deploy id)', context.getScriptId() + ' : ' + context.getDeploymentId());
		var status = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId());
		nlapiLogExecution('DEBUG', 'Schedule Status', status);
	}
	
}


