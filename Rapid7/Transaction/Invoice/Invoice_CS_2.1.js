/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/dialog', 'N/runtime', 'N/log', 'N/search', 'N/record', 'N/format', 'N/email', 'N/url'], function (
	dialog,
	runtime,
	log,
	search,
	record,
	format,
	email,
	url
) {
	function pageInit(context) {
		if (context.currentRecord.isNew && context.mode === 'copy') {
			var discrepancyObj = identifyDiscrepancy(context);
			if (discrepancyObj !== null) {
				dialog.alert({
					title: 'Invoice billing total amount mismatch notification!',
					message:
						'Validation Script alert: \n expected total: ' +
						discrepancyObj.expectedInvoiceTotal.toFixed(2) +
						'\n actual total: ' +
						discrepancyObj.actualInvoiceTotal.toFixed(2) +
						'\n Please review the invoice lines and make adjustments to amounts to comply with the billing schedule. Most probably the discrepancy lies in the discount lines.',
				});
			}
		}
	}

	function saveRecord(context) {
		// only trigger for new invoices
		if (context.currentRecord.isNew && context.mode === 'copy') {
			var discrepancyObj = identifyDiscrepancy(context);
			if (discrepancyObj !== null) {
				dialog.alert({
					title: 'Invoice billing total amount mismatch notification!',
					message:
						'Validation Script alert: \n expected total: ' +
						discrepancyObj.expectedInvoiceTotal.toFixed(2) +
						'\n actual total: ' +
						discrepancyObj.actualInvoiceTotal.toFixed(2) +
						'\n Please review the invoice lines and make adjustments to amounts to comply with the billing schedule. Most probably the discrepancy lies in the discount lines.',
				});

				sendTotalsDiscrepancyEmail(discrepancyObj);
			}
		}
		return true
	}

	function identifyDiscrepancy(context) {
		var invoiceRec = context.currentRecord;
		var salesOrderId = invoiceRec.getValue('createdfrom');
		var salesOrderName = invoiceRec.getText('createdfrom');
		var customerId = invoiceRec.getValue('entity');
		var customerName = invoiceRec.getText('entity');
		var salesOrderLookup = search.lookupFields({
			type: search.Type.SALES_ORDER,
			id: salesOrderId,
			columns: ['billingschedule', 'total', 'taxtotal','fxamount','exchangerate'],
		});

		// execute if a billing schedule exists
		if (salesOrderLookup.billingschedule.length !== 0) {
			var billingScheduleId = salesOrderLookup.billingschedule[0].value;
			var salesOrderTotal = salesOrderLookup.fxamount;
			var salesOrderTaxtotal = salesOrderLookup.taxtotal/salesOrderLookup.exchangerate;
			var billingScheduleRec = record.load({
				type: record.Type.BILLING_SCHEDULE,
				id: billingScheduleId,
			});
			var invoiceTranDate = format.format({
				value: invoiceRec.getValue('trandate'),
				type: format.Type.DATE,
			});
			var targetLine = billingScheduleRec.findSublistLineWithValue({
				sublistId: 'recurrence',
				fieldId: 'recurrencedate',
				value: invoiceTranDate,
			});
			if(targetLine > -1) {
				var billingPercent = billingScheduleRec.getSublistValue({
					sublistId: 'recurrence',
					fieldId: 'amount',
					line: targetLine,
				});
  
				var expectedInvoiceTotal = ((salesOrderTotal - salesOrderTaxtotal) * billingPercent) / 100;
				var actualInvoiceTotal = invoiceRec.getValue('total');
  
				if (expectedInvoiceTotal.toFixed(2) !== actualInvoiceTotal.toFixed(2)) {
					var discrepancyObj = {
						salesOrderId: salesOrderId,
						salesOrderName: salesOrderName,
						customerId: customerId,
						customerName: customerName,
						expectedInvoiceTotal: expectedInvoiceTotal,
						actualInvoiceTotal: actualInvoiceTotal,
					};
					return discrepancyObj;
				} 
			  } else {
				  dialog.alert({
					  title: 'Unable to perform discrepency check',
					  message:
						  'A discrepency check was unable to be performed, due to: </br></br>' +    
						  '• Proposed Invoice Transaction Date Does Not Match Billing Schedule. </br></br>'+
						  'Please review the invoice transaction date to comply with the billing schedule, '+
						  'or update the billing schedule accordingly.',
				  });
			  }
		}
		return null;
	}

	function sendTotalsDiscrepancyEmail(discrepancyObj) {
		var scriptObj = runtime.getCurrentScript();
		var sendFrom = '106223954'; // info email sender - Admin Netsuite
		var sendTo = scriptObj.getParameter({ name: 'custscript_totals_discrep_recipient' }).split(',');

		var customerRecordUrl = url.resolveRecord({
			recordType: record.Type.CUSTOMER,
			recordId: discrepancyObj.customerId,
			isEditMode: false,
		});
		var salesOrderRecordUrl = url.resolveRecord({
			recordType: record.Type.SALES_ORDER,
			recordId: discrepancyObj.salesOrderId,
			isEditMode: false,
		});

		var customerLink = '<a href=' + customerRecordUrl + '>' + discrepancyObj.customerName + '</a>';
		var salesOrderLink = '<a href=' + salesOrderRecordUrl + '>' + discrepancyObj.salesOrderName + '</a>';

		var emailBody = [
			'<h3>An Invoice of ' + customerLink + ' has a discrepancy.</h3>',
			'<p>Invoice created form ' +
				salesOrderLink +
				' expected to have a total amount of ' +
				discrepancyObj.expectedInvoiceTotal.toFixed(2) +
				', but instead got ' +
				discrepancyObj.actualInvoiceTotal.toFixed(2) +
				'.</p>',
			'<p>Please review the invoice lines and make adjustments to amounts to comply with the billing schedule. Most probably the discrepancy lies in the discount lines.</p>',
		].join('\n');

		email.send({
			author: sendFrom,
			recipients: sendTo,
			subject: 'ALERT - Customer Invoice with Total Amount discrepancy!',
			body: emailBody,
			relatedRecords: {
				entityId: discrepancyObj.customerName,
				transactionId: discrepancyObj.salesOrderId,
			},
		});
	}

	return {
		pageInit: pageInit,
		saveRecord: saveRecord,
	};
});