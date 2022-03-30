/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Dec 2013     AnJoe
 *
 */

var ctx = nlapiGetContext();
var paramInvIds = ctx.getSetting('SCRIPT','custscript_autobproc_invid');
var paramNotification = ctx.getSetting('SCRIPT','custscript_autobproc_notif');

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function autoBillProcessor(type) {

	//1/17/2014 MOD: Sales Order > Invoice > Payment
	var csvHeader = '"SO Internal ID","SO Number","SO Created Date","SO Status","Customer Internal ID","Customer Name/ID","CC Used","Process Status",'+
					'"Inv Internal ID","Inv Number","Payment Internal ID","Payment #","Process Message"\n';
	var csvBody = '';
	try {
		
		if ((ctx.getDeploymentId()=='customdeploy_ax_ss_autobill_proc' &&!paramInvIds) || !paramNotification) {
			log('error','Missing Required Params','For User Triggered Auto Billing, both SalesOrder Internal IDs and Notification Email must be set');
			throw nlapiCreateError('ABERR-PROC-PARAMS', 'For User Triggered Auto Billing, both SalesOrder IDs and Notification Email must be set', true);
		}
		
		var soIds = paramInvIds.split(',');

		//if soIds are more than 20, throw an error
		if (soIds.length > 20) {
			log('error','Too many SalesOrders','For User Triggered Auto Billing, You can only process 20 sales orders at a time');
			throw nlapiCreateError('ABERR-PROC-OVERLIMIT', 'For User Triggered Auto Billing, You can only process 20 sales orders at a time', true);
		}
		
		//grab all available invoices
		var iflt = [new nlobjSearchFilter('mainline', null, 'is','T'),
		            new nlobjSearchFilter('internalid', null, 'anyof',soIds)];
		
		var icol = [new nlobjSearchColumn('internalid').setSort(true),
		            new nlobjSearchColumn('tranid'),
		            new nlobjSearchColumn('status'),
		            new nlobjSearchColumn('internalid','customer'),
		            new nlobjSearchColumn('entityid','customer'),
		            new nlobjSearchColumn('amount'),
		            new nlobjSearchColumn('datecreated'),
		            new nlobjSearchColumn('ccnumber','customer'),
		            new nlobjSearchColumn('cctype','customer'),
		            new nlobjSearchColumn('ccholdername','customer'),
		            new nlobjSearchColumn('ccexpdate','customer')];
		
		var irs = nlapiSearchRecord('transaction', null, iflt, icol);
		
		//paidInFull
		for (var i=0; i < irs.length; i++) {
			var procMsg = '';
			
			var invoiceId = '';
			var invoiceNumber = '';
			
			var paymentId = '';
			var paymentNumber = '';
			
			var procStatus = 'Success';
			var ccInfo = irs[i].getValue('ccnumber','customer')+' ('+irs[i].getText('cctype','customer')+')-'+irs[i].getValue('ccexpdate','customer');
			//MOD - Transform to Invoice than transform invoice to payment
			
			try {
				var invrec = nlapiTransformRecord(irs[i].getRecordType(),irs[i].getId(),'invoice');
				invoiceId = nlapiSubmitRecord(invrec, true, true);
				invoiceNumber = nlapiLookupField('invoice', invoiceId, 'tranid', false);
				
				procMsg = 'Invoice Success // ';
				
				try {
					var rec = nlapiTransformRecord('invoice',invoiceId,'customerpayment');
					paymentId = nlapiSubmitRecord(rec, true, true);
					paymentNumber = nlapiLookupField('customerpayment', paymentId, 'tranid', false);
					
					procMsg += 'Payment Gen Success';
					
				} catch (payerr) {
					procMsg += getErrText(payerr);
					procStatus = 'Failed';
				}
				
			} catch (invtrxerr) {
				procMsg = getErrText(invtrxerr);
				procStatus = 'Failed';
			}
			
			csvBody += '"'+irs[i].getId()+'",'+
					   '"'+irs[i].getValue('tranid')+'",'+
					   '"'+irs[i].getValue('datecreated')+'",'+
					   '"'+irs[i].getText('status')+'",'+
					   '"'+irs[i].getValue('internalid','customer')+'",'+
					   '"'+irs[i].getValue('entityid','customer')+'",'+
					   '"'+ccInfo+'",'+
					   '"'+procStatus+'",'+
					   '"'+invoiceId+'",'+
					   '"'+invoiceNumber+'",'+
					   '"'+paymentId+'",'+
					   '"'+paymentNumber+'",'+
					   '"'+procMsg+'"\n';
			
		}
		
		var attchment = nlapiCreateFile('AutoBillProcResult.csv', 'PLAINTEXT', csvHeader+csvBody);
		var sbj = '[Manual Trigger]-Auto Bill Result '+nlapiDateToString(new Date());
		var msg = 'Following sales order Internal IDs were marked to be processed via Auto Bill User Interface: <br/><br/>'+
				  paramInvIds+'<br/><br/>'+
				  'Process Results are attached';
		//nlapiSendEmail(-5, 'joe.son@audaxium.com', sbj, msg, null, null, null, attchment);
		nlapiSendEmail(-5, paramNotification, sbj, msg, 'apalmer@360imaging.com', null, null, attchment);
		
	} catch (abperr) {
		log('error','Error with Auto Bill Processor', getErrText(abperr));
		nlapiCreateError('ABERR-PROC', getErrText(abperr), false);
		
		var esbj = '[Manual Trigger]-FAILED Auto Bill Process '+nlapiDateToString(new Date());
		var emsg = 'Unexpected Error occured during proccessing of following sales order Internal IDs marked to be processed via Auto Bill User Interface: <br/><br/>'+
				  paramInvIds+'<br/><br/>'+
				  'ERROR DETAIL:<br/><br/>'+getErrText(abperr);
		//nlapiSendEmail(-5, 'joe.son@audaxium.com', esbj, emsg, null, null, null, null);
		nlapiSendEmail(-5, paramNotification, esbj, emsg, 'apalmer@360imaging.com', null, null, null);
		
	}
	
}
