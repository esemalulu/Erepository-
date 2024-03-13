/*
 * @author efagone
 */
function mergePeerApprovals(){

	try {

		var context = nlapiGetContext();
		nlapiLogExecution('DEBUG', 'context', context.getExecutionContext());

		if (context.getExecutionContext() == 'workflow') {

			var approvalRulesToTriggerNewApproval = context.getSetting('SCRIPT', 'custscript_r7_approval_rules_trigger_new').split(','); // array

			var userId = nlapiGetUser();
			var recQuote = nlapiGetNewRecord();
			var thisQuoteId = recQuote.getId();
			nlapiLogExecution('DEBUG', 'thisQuoteId', thisQuoteId);
			var oppId = recQuote.getFieldValue('opportunity');
			nlapiLogExecution('DEBUG', 'oppId', oppId);

			if (oppId != null && oppId != '') {
				var arrSearchFilters = new Array();
				arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7approveopportunity', null, 'is', oppId);
				arrSearchFilters[arrSearchFilters.length] = new nlobjSearchFilter('custrecordr7approvalstatus', null, 'anyof', new Array(1, 2, 3, 7));

				var arrSearchColumns = new Array();
				arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7approvalrule');
				arrSearchColumns[1] = new nlobjSearchColumn('custrecordr7approvaldescription');
				arrSearchColumns[2] = new nlobjSearchColumn('custrecordr7approvalapprover');
				arrSearchColumns[3] = new nlobjSearchColumn('custrecordr7approveopportunity');
				arrSearchColumns[4] = new nlobjSearchColumn('custrecordr7approvalquote').setSort(true);
				arrSearchColumns[5] = new nlobjSearchColumn('custrecordr7approvalstatus');
				arrSearchColumns[6] = new nlobjSearchColumn('custrecordr7approvaldaterequested');
				arrSearchColumns[7] = new nlobjSearchColumn('custrecordr7approvaldateresponded');
				arrSearchColumns[8] = new nlobjSearchColumn('custrecordr7approvalcomments');

				var arrSearchResults = nlapiSearchRecord('customrecordr7approvalrecord', null, arrSearchFilters, arrSearchColumns);
				//nlapiLogExecution('DEBUG', 'arrSearchResults', arrSearchResults.length);

				for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {

					searchResultA = arrSearchResults[i];
					var recIdA = searchResultA.getId();
					var ruleA = searchResultA.getValue(arrSearchColumns[0]);
					var descA = searchResultA.getValue(arrSearchColumns[1]);
					var approverA = searchResultA.getValue(arrSearchColumns[2]);
					var quoteA = searchResultA.getValue(arrSearchColumns[4]);
					var statusA = searchResultA.getValue(arrSearchColumns[5]);

					var matchTermA = ruleA + descA + approverA;

					var now = nlapiDateToString(new Date(), 'datetimetz');
					var fields = new Array();
					fields[0] = 'custrecordr7approvalstatus';
					fields[1] = 'custrecordr7approvaldaterequested';
					fields[2] = 'custrecordr7approvaldateresponded';
					fields[3] = 'custrecordr7approvalcomments';

					if (quoteA == thisQuoteId && (statusA == '1' || statusA == '2') && approverA == userId) {

						var values = new Array();
						values[0] = '3';
						values[1] = now;
						values[2] = now;
						values[3] = 'Automatic approval';

						nlapiSubmitField('customrecordr7approvalrecord', recIdA, fields, values);
						continue;
					}

					if (quoteA == thisQuoteId && (((statusA == '1' || statusA == '2') && approverA != userId) || statusA == '7')) {

						for (var j = 0; j < arrSearchResults.length; j++) {

							searchResultB = arrSearchResults[j];
							var ruleB = searchResultB.getValue(arrSearchColumns[0]);
							var descB = searchResultB.getValue(arrSearchColumns[1]);
							var approverB = searchResultB.getValue(arrSearchColumns[2]);
							var quoteB = searchResultB.getValue(arrSearchColumns[4]);
							var quoteTextB = searchResultB.getText(arrSearchColumns[4]);
							var statusB = searchResultB.getValue(arrSearchColumns[5]);
							var dateRequestedB = searchResultB.getValue(arrSearchColumns[6]);
							var dateRespondedB = searchResultB.getValue(arrSearchColumns[7]);

							var matchTermB = ruleB + descB + approverB;

							if (quoteB != thisQuoteId &&
								(statusB == '3' || statusB == '7') &&
								matchTermA == matchTermB
								// https://issues.corp.rapid7.com/browse/APPS-14464
								// not carrying over Billing Schedule approvals and any further approval rules, listed is script param
								&& approvalRulesToTriggerNewApproval.indexOf(ruleA) === -1) {

								var values = new Array();
								values[0] = statusB;
								values[1] = dateRequestedB;
								values[2] = dateRespondedB;
								values[3] = 'Carried over from ' + quoteTextB;

								nlapiSubmitField('customrecordr7approvalrecord', recIdA, fields, values);
								break;
							}

						}
					}

				}

			}

		}

	}
	catch (e) {
		nlapiLogExecution('ERROR', 'Something Went Wrong - Merge Approvals', e);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Something Went Wrong - Merge Approvals', 'Error: ' + e);
	}

}

function unique(a){
	a.sort();
	for (var i = 1; i < a.length;) {
		if (a[i - 1] == a[i]) {
			a.splice(i, 1);
		}
		else {
			i++;
		}
	}
	return a;
}