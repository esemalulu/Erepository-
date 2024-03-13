/**
 * Module Description
 * 
 * Version Date Author Remarks 1.0.0 May 27 2016 ekarmanov (BSD) Initial version
 * of scripts after architecture review and redesign
 * 
 * Supplementary library for Invoice-Scheduled.js scheduled script. It contains
 * utility and supplementary functions.
 * 
 * ------------------------------------------------------- Change history:
 * 
 * June 07 2016   akuznetsov(BSD) - Source code formatting, script functions
 * 				    reorganization
 * August 15 2016 akuznetsov(BSD) - Summary report expanded, errors information 
 * 			            is in attachment, new function to check for
 * 				    existing Vendor Credit added 
 * April 06 2017 akuznetsov(BSD) - remove redundant comments from code  
 * 
 * April 17 2017 akuznetsov(BSD) - revert sending error messages in email body instead of an attachment	
 * -------------------------------------------------------
 */

var gExecSummary = {
		amountOfInvoices: 0,
		successInvoices: 0,
		failedInvoices: 0,
		existingInvoices :0,
		messages:[]
	};


/**
 * Initializes library global variables with initial values
 */
function initializeLibrary() {
	gExecSummary.amountOfInvoices = 0;
	gExecSummary.successInvoices = 0;
	gExecSummary.failedInvoices = 0;
	gExecSummary.existingInvoices = 0;
	gExecSummary.messages = [];
	
}

/**
 * Returns totals depending on document type
 * 
 * @param documentType -
 *            document type
 * @param shippingamount
 * @param handlingamount
 * @param miscamount
 * @param taxamount
 * @param lineleveltaxation
 * @returns object containing headercharges flag indicating that total header
 *          charges is greater than 0 and value for accumulated header charges
 */
function getHeadersTotals(documentType, shippingamount, handlingamount,
		miscamount, taxamount, lineleveltaxation) {
	var headercharges = false;
	var totalheadercharges = 0;
	var totalheadercharges = 0;
	if (documentType === 'vendorbill') {
		totalheadercharges 		= shippingamount + handlingamount + miscamount;
		totalheaderchargesNoTax = shippingamount + handlingamount + miscamount;
		headercharges = totalheadercharges > 0;
		if (lineleveltaxation === 'false') {
			var sendTaxcode = context.getSetting('SCRIPT',
					'custscript_send_taxcode')
			if (sendTaxcode && sendTaxcode === 'F') {
				totalheadercharges = totalheadercharges + taxamount;
			} else {
				totalheadercharges = totalheadercharges + taxamount;
			}
		}
	} else if (documentType === 'vendorcredit') {
		if (lineleveltaxation === 'false') {
			totalheadercharges 		= shippingamount + handlingamount + miscamount + taxamount;
			totalheaderchargesNoTax = shippingamount + handlingamount + miscamount;
					
		} else {
			totalheadercharges 		= shippingamount + handlingamount + miscamount;
			totalheaderchargesNoTax = shippingamount + handlingamount + miscamount;
		}
	}
	return {
		headercharges 				: headercharges,
		totalheadercharges 			: totalheadercharges,
		totalheaderchargesNoTax		: totalheaderchargesNoTax
	};
}

/**
 * Returns total amounts for all items
 * 
 * @param totalheadercharges
 * @param invoiceLineNodes
 * @returns object containing total amount, total taxable amount and total
 *          header amount
 */
function getTotalAmounts(totalheadercharges, invoiceLineNodes) {
	var totalamount = 0;
	var taxabletotalamount = 0;
	for (var x = 0; x < invoiceLineNodes.length; x++) {
		if (nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') !== 'true') {
			taxabletotalamount = parseFloat(taxabletotalamount)
					+ parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
		}
		totalamount = parseFloat(totalamount)
				+ parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
	}

	var totalheaderamount = parseFloat(totalamount)
			+ parseFloat(totalheadercharges);
	totalheaderamount = totalheaderamount.toFixed(3);
	return {
		totalamount : totalamount,
		taxabletotalamount : taxabletotalamount,
		totalheaderamount : totalheaderamount
	};
}

/**
 * Returns line amount depending on "nontaxable" flag's value
 * @param lineamount
 * @param linecharge
 * @param invoiceLineNodes
 * @returns
 */
function getNontaxable(lineamount, linecharge, invoiceLineNodes) {
	var nonTaxable;
	if (nlapiSelectValue(invoiceLineNodes, 'nontaxable') === 'true') {
		nonTaxable = parseFloat(lineamount);
	} else {
		nonTaxable = parseFloat(lineamount) + parseFloat(linecharge);
	}
	return nonTaxable;
}
/**
 * Puts error message to log and execution's summary report
 * @param invoiceNumber
 * @param supplier
 * @param documentType
 * @param error
 */
function logErrorMessage(invoiceNumber, supplier, documentType, error) {
	var type = '';
	if (documentType === 'vendorbill') {
		type = 'Vendor Bill';
	} else if (documentType === 'vendorcredit') {
		type = 'Vendor Credit';
	}
	gExecSummary.failedInvoices++;
	var report = 'Processing Error - Unable to create ' + type
			+ '; Invoice number = ' + invoiceNumber + '; Supplier name = '
			+ supplier + '; Error = ' + error;
	nlapiLogExecution('ERROR', 'Error', report);
	var msg = {dt:type,
			   invNum:invoiceNumber,
			   suppl:supplier,
			   err:error};
	gExecSummary.messages.push(msg);
}

/**
 * Increases successfully processed invoices number
 * Used in summary report
 * @param number
 */
function countSuccesInvoices(number) {
	gExecSummary.successInvoices = gExecSummary.successInvoices + number;
}

/**
 * Adds summary header information into execution report 
 * @param message
 * @returns {String}
 */
function createEmailHeader() {
    return '<div style="font-family:Tahoma;font-size:11pt;">Coupa Invoice Integration execution summary report:<br />'
	    + '<table border="0"><caption>Invoices:</caption><tbody>'
	    + '<tr><th style="font-weight:bold;text-align:left;">Total</th><td>'+ gExecSummary.amountOfInvoices + '</td></tr>' 
	    + '<tr><th style="font-weight:bold;text-align:left;">Succeeded</th><td>'+ gExecSummary.successInvoices + '</td></tr>'
	    + '<tr><th style="font-weight:bold;text-align:left;">Failed</th><td>' + gExecSummary.failedInvoices + '</td></tr>'
	    + '<tr><th style="font-weight:bold;text-align:left;">Existing</th><td>' + gExecSummary.existingInvoices + '</td></tr>'
	    + '</tbody></table>';
}

/**
 * Sets total invoices count.
 * Used in summary report
 * @param count
 */
function setInvoicesCount(count) {
	gExecSummary.amountOfInvoices = count;
}

/**
 * Sends execution summary report by email to email addresses stored in script's parameters
 */
function sendExecutionReport() {
	var msgBody = createEmailHeader()+getExecutionReportBody()+'</div>';
	nlapiLogExecution('DEBUG', 'message', msgBody);
	nlapiSendEmail(106223954,  context.getSetting('SCRIPT','custscript_emailaddr_notifications'),
	               'Invoice integration report', msgBody, null, null, null, null);
	
}

function getExecutionReportBody(){
        var reportBody = '';
        if(gExecSummary.messages.length>0){
        	var msg;
        	var reportBody = '<table style="border:1px solid black; width:100%;font-family:Tahoma;font-size:14px;'+
        	'border-collapse: collapse;"><caption>Execution Error details</caption>'+
        	'<thead><tr><th style="background-color:#efefef;font-weight:bold;border:1px solid black;">Document Type</th>'+
                '<th style="background-color:#efefef;font-weight:bold;border:1px solid black;">Supplier</th>'+
                '<th style="background-color:#efefef;font-weight:bold;border:1px solid black;">Invoice Number</th><th>Error</th></tr></thead><tbody>';
        	for(var i = 0; i< gExecSummary.messages.length;i++){
        		msg = gExecSummary.messages[i];
        		reportBody+='<tr><td style="border:1px solid black;">'+msg.dt+'</td>'+
        	        '<td style="border:1px solid black;">'+msg.suppl+'</td>'+
        	        '<td style="border:1px solid black;">'+msg.invNum+'</td>'+
        	        '<td style="border:1px solid black;">'+msg.err+'</td></tr>';
        	}
        	reportBody+='</tbody></table>';
        }
	return reportBody;
}

/**
 * Converts date from Coupa's format into NetSuite's format
 * @param coupaDate
 * @returns {String}
 */
function convertCoupaDateToNetSuiteDate(coupaDate) {
	var dateformat = nlapiLoadConfiguration('companypreferences')
			.getFieldValue('dateformat');
	var nDate = coupaDate.split('T');
	var datesplit = nDate[0].split('-');
	var Nyear = datesplit[0];
	var Nday = datesplit[2];
	var Nmonth = datesplit[1];
	var netDate = Nmonth + '/' + Nday + '/' + Nyear;
	if (dateformat == 'DD/MM/YYYY') {
		netDate = Nday + '/' + Nmonth + '/' + Nyear;
	}
	return netDate;
}

/**
 * Converts date from NetSuiteCoupa's format into Coupa's format
 * @param netsuitedate
 * @returns {String}
 */
function convertNetsuiteDateToCoupaDate(netsuitedate) {
	var dateformat = nlapiLoadConfiguration('companypreferences')
			.getFieldValue('dateformat');
	var datesplit = netsuitedate.split("/");
	var Nyear = datesplit[2];
	var Nday = datesplit[1];
	var Nmonth = datesplit[0];

	if (dateformat == 'DD/MM/YYYY') {
		Nyear = datesplit[2];
		Nday = datesplit[0];
		Nmonth = datesplit[1];
	}

	return Nyear + "-" + Nmonth + "-" + Nday + "T00:00:00-08:00";
}

/**
 * Returns today's date
 * @returns
 */
function getTodaysDate() {
	var today = new Date();
	return today.getDate();
}

/**
 * Returns array of short Months names
 * @param monthdate
 * @returns
 */
function getMonthShortName(monthdate) {
	var monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
			"Sep", "Oct", "Nov", "Dec" ];
	return monthNames[monthdate];
}

/**
 * Returns currency ID 
 * 
 * @param objectinternalid
 * @param objectname
 * @returns
 */
function getNetsuiteCurrency(objectinternalid, objectname) {
	var searchresults = nlapiSearchRecord(objectinternalid, null,
			nlobjSearchFilter('symbol', null, 'is', objectname));

	if (!searchresults) {
		nlapiLogExecution('Error', 'Error getting ID for',
				'internalobjectid = ' + objectinternalid + ' objectname =  '
						+ objectname);
		return 'INVALID_NAME';
	}
	return searchresults[0].getId();
}

/**
 * Returns accounting period ID
 * 
 * @param objectinternalid
 * @param objectname
 * @returns
 */
function getAccoutingPeriodNetsuiteId(objectinternalid, objectname) {

	var searchresults = nlapiSearchRecord(objectinternalid, null,
			nlobjSearchFilter('periodname', null, 'is', objectname));

	if (!searchresults) {
		return 'INVALID_PERIOD_NAME';
	}
	return searchresults[0].getId();
}

/**
 * Returns internal ID of object
 * @param objectinternalid
 * @param objectname
 * @returns
 */
function getNetsuiteId(objectinternalid, objectname) {
	var searchresults = nlapiSearchRecord(objectinternalid, null,
			nlobjSearchFilter('namenohierarchy', null, 'is', objectname));

	if (!searchresults) {
		nlapiLogExecution('Error', 'Error getting ID for',
				'internalobjectid = ' + objectinternalid + ' objectname =  '
						+ objectname);
		return 'INVALID_NAME';
	}
	return searchresults[0].getId();
}

/**
 * Returns internal Account id
 * 
 * @param accountnumber
 * @returns
 */
function getNetsuiteAccountId(accountnumber) {
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('number', null, 'is', accountnumber);
	var searchresults = nlapiSearchRecord('account', null, filters);
	if (!searchresults) {
		nlapiLogExecution('Error', 'Error getting Account ID',
				'Accountnumber = ' + accountnumber);
		return 'INVALID_ACCOUNT';
	}
	return searchresults[0].getId();
}

/**
 * Returns Payment term internal ID
 * @param coupaTerm
 * @returns
 */
function getNetsuiteTermId(coupaTerm) {
	var searchresults = nlapiSearchRecord('term', null, nlobjSearchFilter(
			'name', null, 'is', coupaTerm));

	if (!searchresults) {
		nlapiLogExecution('Error', 'Error getting payment terms id', coupaTerm);
		return 'INVALID_PAYMENT_TERM';
	}
	return searchresults[0].getId();
}

/**
 * Checks if Vendor bill already exists in NetSuite
 * @param tranid
 * @param externalid
 * @param entity
 * @returns
 */
function isVendorBillExists(tranid, externalid, entity) {
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('tranid', null, 'is', tranid);
	filters[1] = new nlobjSearchFilter('entity', null, 'is', entity);
	var searchresults = nlapiSearchRecord('vendorbill', null, filters);
	if (searchresults && searchresults.length > 0) {
		gExecSummary.existingInvoices++;
		return searchresults[0].getId();
	} else {
		return 'false';
	}
}

/**
 * Checks if Vendor Credit already exists in NetSuite
 * @param tranid
 * @param externalid
 * @param entity
 * @returns
 */
function isVendorCreditExists(tranid, externalid, entity) {
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('tranid', null, 'is', tranid);
	filters[1] = new nlobjSearchFilter('entity', null, 'is', entity);
	var searchresults = nlapiSearchRecord('vendorcredit', null, filters);
	if (searchresults && searchresults.length > 0) {
		gExecSummary.existingInvoices++;
		return searchresults[0].getId();
	} else {
		return 'false';
	}
}
