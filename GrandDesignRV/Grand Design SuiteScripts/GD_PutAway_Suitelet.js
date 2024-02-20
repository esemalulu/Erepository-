/**
 * Suitelet that allows users to select Item Receipts to include in the Put-Away printout.
 * 
 * Version    Date            Author           Remarks
 * 1.00       05 Dec 2016     Jacob Shetler
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_PutAway_Suitelet(request, response)
{
	if (request.getMethod() == 'GET') {
		//Build a form for the user to select item receipts
		var paForm = nlapiCreateForm('Put-Away Worksheet');
		paForm.addFieldGroup('custpage_pafg', 'Select Item Receipts to include in the Put-Away Worksheet');
		var irField = paForm.addField('custpage_itemreceipts', 'multiselect', 'Item Receipts', null, 'custpage_pafg');
		irField.setMandatory(true);
		paForm.addSubmitButton('Generate Worksheet');
		response.writePage(paForm);
		
		//Fill in the item receipt list.
		var irFilters = [new nlobjSearchFilter('trandate', null, 'within', 'previousonemonth'), 
		                 new nlobjSearchFilter('mainline', null, 'is', 'T'),
		                 new nlobjSearchFilter('location', null, 'is', nlapiGetContext().getSetting('SCRIPT', 'custscriptpartsandwarrantylocation'))];
		var irResults = GetSteppedSearchResults('itemreceipt', irFilters, [new nlobjSearchColumn('tranid'), new nlobjSearchColumn('createdfrom')]);
		if (irResults != null) {
			for (var i = 0; i < irResults.length; i++) {
				irField.addSelectOption(irResults[i].getId(), 'Item Receipt #' + irResults[i].getValue('tranid') + ', ' + irResults[i].getText('createdfrom'));
			}
		}
	}
	else { //POST
		//Get the item receipts selected.
		var itemReceipts = request.getParameterValues('custpage_itemreceipts');
		var pdfTitle = 'Put-Away Worksheet.pdf';
		var html = GD_GeneratePutAwayWorksheet(itemReceipts);
		PrintPDFInSuiteLet(request, response, pdfTitle, html);
	}
}
