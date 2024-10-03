/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/email', 'N/record', 'N/runtime', 'N/search', 'N/task', 'N/error'],
	/**
	 * @param {email} email
	 * @param {record} record
	 * @param {runtime} runtime
	 * @param {search} search
	 */
	function (email, record, runtime, search, task, error) {
		/**
		 * Definition of the Scheduled script trigger point.
		 *
		 * @param {Object} scriptContext
		 * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
		 * @Since 2015.2
		 */
		//Initialize Variables


		function execute(scriptContext) {
			log.debug({ title: 'execute()', details: '*****START*****' });
			var currentCheckNumber = '';
			var nextCheckNumber = '';
			var sameCheckRows = [];
			var isLastGroup = false;

			try {
				var unProcessedcaACHSearchId = 'customsearch_unpro_ca_ach_search';

				var unProcessedcaACHSearchResults = getAllResults(null, unProcessedcaACHSearchId, null, null);
				log.debug({ title: 'execute() unProcessedcaACHSearchResults', details: 'unProcessedcaACHSearchResults Length = ' + unProcessedcaACHSearchResults.length });

				for (var i = 0; i < unProcessedcaACHSearchResults.length; i++) {
					currentCheckNumber = unProcessedcaACHSearchResults[i].getValue('custrecord_check_number_2');
					if (unProcessedcaACHSearchResults[i + 1]) {
						nextCheckNumber = unProcessedcaACHSearchResults[i + 1].getValue('custrecord_check_number_2');
					}

					log.debug({
						title: 'execute() compare check numbers', details: JSON.stringify({
							currentCheckNumber: currentCheckNumber,
							nextCheckNumber: nextCheckNumber,
						})
					});

					if (currentCheckNumber == nextCheckNumber) {
						sameCheckRows.push(unProcessedcaACHSearchResults[i].id);
						if (unProcessedcaACHSearchResults[i + 1]) {
							sameCheckRows.push(unProcessedcaACHSearchResults[i + 1].id);
						}
						else {
							isLastGroup = true;
						}
					}
					else {
						if (sameCheckRows.length == 0) {
							sameCheckRows.push(unProcessedcaACHSearchResults[i].id);
						}
						sameCheckRows = sameCheckRows.getUnique();

						var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
						if (remainingUsage < 2000) {
							throwError();
						}

						createCustomerPaymentRecord(sameCheckRows);
						sameCheckRows = [];
						currentCheckNumber = '';
						nextCheckNumber = '';
					}
					if (isLastGroup) {
						sameCheckRows = sameCheckRows.getUnique();
						var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
						if (remainingUsage < 2000) {
							throwError();
						}

						createCustomerPaymentRecord(sameCheckRows);
						sameCheckRows = [];
						currentCheckNumber = '';
						nextCheckNumber = '';
					}
				}// i loop
			}
			catch (e) {
				log.error({ title: 'execute', details: 'Error Details = ' + JSON.stringify(e) });
				log.error({ title: 'execute', details: 'Rescheduling...' });

				// var scriptTask = task.create({taskType: task.TaskType.SCHEDULED_SCRIPT});
				// scriptTask.scriptId = runtime.getCurrentScript().id;
				// var scriptTaskId = scriptTask.submit();
				// var taskStatus = task.checkStatus(scriptTaskId);
				// log.debug({title: 'execute', details: 'Reschedule task submitted. Task Id = '+scriptTaskId});

				// var subject = 'Error occured while processing Cash Application - ACH Data';
				// var authorId = 3;
				// var recipientEmail = 'jay@accrete.com';
				/*email.send({
					author: authorId,
					recipients: recipientEmail,
					subject: subject,
					body: 'Error occured while processing Cash Application - ACH Data: \n' + runtime.getCurrentScript().id + '\n\n' + JSON.stringify(e)
				});*/
			}
			log.debug({ title: 'execute()', details: '*****END*****' });
		}

		function createCustomerPaymentRecord(recIds) {
			try {
				//var isRowProcessed = false;
				var errorMessage = '';
				var customerId = '';
				log.debug({ title: 'createCustomerPaymentRecord() recIds is: ', details: 'recIds = ' + recIds });

				var oneOrMoreLinesAdded = false;
				var caACHRecId = null;

				var achSearchObj = search.create({
					type: "customrecord_cash_appl_ach",
					filters:
					[
					   ["custrecord_invoice_number_2","isnotempty",""], 
					   "AND", 
					   ["custrecord_check_number_2","isnotempty",""], 
					   "AND", 
					   ["custrecord_check_amount_2","isnotempty",""], 
					   "AND", 
					   ["internalid","anyof",recIds],
					   "AND", 
					   ["custrecord_invoice_amount_2","doesnotstartwith","-"]
					],
					columns:
					[
					   search.createColumn({name: "custrecord_check_number_2", label: "Check Number"}),
					   search.createColumn({name: "custrecord_check_amount_2", label: "Check Amount"}),
					   search.createColumn({name: "custrecord_invoice_number_2", label: "Invoice Number"}),
					]
				 });
				var invoiceNumber = '';
				var chkNumber = '';
				var chkAmount = '';
				achSearchObj.run().each(function(result){
					invoiceNumber = result.getValue('custrecord_invoice_number_2');
					chkNumber = result.getValue('custrecord_check_number_2');
					chkAmount = result.getValue('custrecord_check_amount_2');
				});

				//Get Customer Id from Invoice
				var invoiceSearch = search.create({
					type: search.Type.INVOICE,
					columns: ['entity'],
					filters: [
						['tranid', 'is', invoiceNumber],
						'and', ['mainline', 'is', true],
					]
				});
				var invoiceSearchResultRange = invoiceSearch.run().getRange({
					start: 0,
					end: 1000
				});

				if (invoiceSearchResultRange.length == 1) {
					customerId = invoiceSearchResultRange[0].getValue('entity');
				}
				else if (invoiceSearchResultRange.length == 0) {
					log.error({ title: 'createCustomerPaymentRecord() Marking custom record as failed.', details: 'Please check if the Invoice is present in NetSuite and in Open Status. invoiceNumber = ' + invoiceNumber + '.\n' });
					errorMessage += 'Please check if the Invoice is present in NetSuite and in Open Status. invoiceNumber = ' + invoiceNumber + '.\n';
					for (var l = 0; l < recIds.length; l++) {
						record.submitFields({
							type: 'customrecord_cash_appl_ach',
							id: recIds[l],
							values: {
								'custrecord_ach_failed': true,
								'custrecord_ach_processed': true,
								'custrecord_ach_message': errorMessage
							}
						});
					}
					return;
				}
				else if (invoiceSearchResultRange.length > 1) {
					log.error({ title: 'createCustomerPaymentRecord() Marking custom record as failed.', details: 'More than 1 Invoice in NetSuite. invoiceNumber = ' + invoiceNumber + '.\n' });
					errorMessage += 'More than 1 Invoice in NetSuite. invoiceNumber = ' + invoiceNumber + '. Returning this line...\n';
					for (var l = 0; l < recIds.length; l++) {
						record.submitFields({
							type: 'customrecord_cash_appl_ach',
							id: recIds[l],
							values: {
								'custrecord_ach_failed': true,
								'custrecord_ach_processed': true,
								'custrecord_ach_message': errorMessage
							}
						});
					}
					return;
				}

				log.debug({ title: 'createCustomerPaymentRecord() Customer ID', details: 'customerId = ' + customerId });

				if (!customerId) {
					log.error({ title: 'createCustomerPaymentRecord() Marking custom record as failed.', details: 'Missing Customer in NetSuite. Customer Id = ' + customerId + '.\n' });
					errorMessage += 'Missing Customer in NetSuite. Customer Id = ' + customerId + '. Returning this line...\n';
					for (var l = 0; l < recIds.length; l++) {
						record.submitFields({
							type: 'customrecord_cash_appl_ach',
							id: recIds[l],
							values: {
								'custrecord_ach_failed': true,
								'custrecord_ach_processed': true,
								'custrecord_ach_message': errorMessage
							}
						});
					}
					return;
				}

				var nsCustomerPayment = record.create({
					type: record.Type.CUSTOMER_PAYMENT,
					isDynamic: true
				});
				// Avoid Customer errors by setting the parent customer when there is any
				var customerLookupFields = search.lookupFields({
					type: search.Type.CUSTOMER,
					id: customerId,
					columns: ['parent']
				});
				log.debug("createCustomerPaymentRecord() customerLookupFields is: ", customerLookupFields);
				if (customerLookupFields.parent && customerLookupFields.parent[0] && customerLookupFields.parent[0].value) {
					customerId = customerLookupFields.parent[0].value;
				}
				nsCustomerPayment.setValue({ fieldId: 'customer', value: customerId });
				nsCustomerPayment.setValue({ fieldId: 'account', value: 247 });//247 = 100000 CASH - WELLS FARGO (ACME)
				nsCustomerPayment.setValue({ fieldId: 'trandate', value: new Date() });
				nsCustomerPayment.setValue({ fieldId: 'aracct', value: 120 });//120 = 110000 ACCOUNTS RECEIVABLE
				nsCustomerPayment.setValue({ fieldId: 'memo', value: 'Created from Wells Fargo ACH File' });
				nsCustomerPayment.setValue({ fieldId: 'paymentmethod', value: 2 });//2 = Check
				nsCustomerPayment.setValue({ fieldId: 'checknum', value: chkNumber });
				nsCustomerPayment.setValue({ fieldId: 'payment', value: chkAmount / 100 });

				var achSearchObj = search.create({
					type: "customrecord_cash_appl_ach",
					filters:
					[
					   ["custrecord_check_number_2","is",chkNumber],
					   "AND", 
      				   ["created","within","today"]
					],
					columns:
					[
					   search.createColumn({name: "custrecord_mem_customer_id", label: "Member Customer ID"}),
					   search.createColumn({name: "custrecord_payer_name", label: "Payer Name"}),
					   search.createColumn({name: "custrecord_check_number_2", label: "Check Number"}),
					   search.createColumn({name: "custrecord_check_amount_2", label: "Check Amount"}),
					   search.createColumn({name: "custrecord_invoice_number_2", label: "Invoice Number"}),
					   search.createColumn({name: "custrecord_invoice_amount_2", label: "Invoice Amount", sort: search.Sort.ASC}),
					   search.createColumn({name: "custrecord_discount_amount_2", label: "Discount Amount"}),
					   search.createColumn({name: "custrecord_invoice_net_amount_2", label: "Invoice Net Amount"}),
					   search.createColumn({name: "custrecord_ach_processed", label: "Processed"}),
					   search.createColumn({name: "custrecord_ach_failed", label: "Failed"}),
					   search.createColumn({name: "custrecord_ach_message", label: "Message"}),
					   search.createColumn({name: "custrecord_sdb_fix_by_accounting", label: "Fixed by Accounting"})
					]
				 });
				 var searchResultCount = achSearchObj.runPaged().count;
				 log.debug("createCustomerPaymentRecord() customrecord_cash_appl_achSearchObj result count",searchResultCount);
				 var creaditMemosObj = {};
				 var invoicesObj = {};
				 achSearchObj.run().each(function(result){
					var documentNumber = result.getValue('custrecord_invoice_number_2');
					var documentAmount = Number(result.getValue('custrecord_invoice_amount_2'));
					log.debug("createCustomerPaymentRecord() documentNumber & documetnAmount are: ",{
						documentNumber: documentNumber,
						documentAmount: documentAmount,
					});
					if(documentAmount < 0){
						creaditMemosObj[documentNumber] = documentAmount/100;
					}else{
						invoicesObj[documentNumber] = documentAmount/100;
					}
					return true;
				 });
				 for(key in creaditMemosObj){
					invoicesObj = applyInvoicesCreditMemo(key, creaditMemosObj[key], invoicesObj);
				 }
				 
				 achSearchObj.run().each(function(result){
					caACHRecId = result.id;
					log.debug({ title: 'createCustomerPaymentRecord() caACHRecId is ', details: 'Processig caACHRecId = ' + caACHRecId });

					var custId = result.getValue({ name: 'custrecord_mem_customer_id' });
					var custName = result.getValue({ name: 'custrecord_payer_name' });
					var checkNumber = result.getValue({ name: 'custrecord_check_number_2' });
					var checkAmount = result.getValue({ name: 'custrecord_check_amount_2' });
					var invNumber = result.getValue({ name: 'custrecord_invoice_number_2' });
					var invAmount = Number(invoicesObj[invNumber]);
					var discAmount = result.getValue({ name: 'custrecord_discount_amount_2' });
					var invNetAmount = Number(invoicesObj[invNumber]);

					if(invAmount <= 0){
						return true;
					}

					var lineNumber = nsCustomerPayment.findSublistLineWithValue({//Find line item with invoice number
						sublistId: 'apply',
						fieldId: 'refnum',
						value: invNumber
					});

					if (lineNumber == -1) {
						lineNumber = nsCustomerPayment.findSublistLineWithValue({//Find line item with invoice number
							sublistId: 'apply',
							fieldId: 'refnum',
							value: 'INV' + invNumber
						});
						if (lineNumber == -1) {
							log.error('createCustomerPaymentRecord() Marking custom record as failed.', 'Invoice # ' + invNumber + ' not found to be applied. Skipping this line...');
							errorMessage += 'Invoice # ' + invNumber + ' not found to be applied. Skipping this line...';
							record.submitFields({
								type: "customrecord_cash_appl_ach",
								id: caACHRecId,
								values: {
									'custrecord_ach_failed': true,
									'custrecord_ach_message': errorMessage,
									'custrecord_ach_processed': true,
								}
							})
							return true;
						}

					}

					nsCustomerPayment.selectLine({//Select the invoice line
						sublistId: 'apply',
						line: lineNumber
					});
					nsCustomerPayment.setCurrentSublistValue({//Tick the Apply checkbox
						sublistId: 'apply',
						fieldId: 'apply',
						value: true
					});
					log.debug("createcustomerpaymentrecord() discamount & invNetAmount are: ", discAmount + '|' + invNetAmount);
					nsCustomerPayment.setCurrentSublistValue({
						sublistId: 'apply',
						fieldId: 'disc',
						value: discAmount/100
					});
					nsCustomerPayment.setCurrentSublistValue({
						sublistId: 'apply',
						fieldId: 'amount',
						value: invAmount
					});
					oneOrMoreLinesAdded = true;

					record.submitFields({
						type: "customrecord_cash_appl_ach",
						id: caACHRecId,
						values: {
							'custrecord_ach_processed': true,
						}
					});
					errorMessage = '';
					return true;
				 });
				 
				 /*
				 customrecord_cash_appl_achSearchObj.id="customsearch1726757387747";
				 customrecord_cash_appl_achSearchObj.title="SDB | Get All lines for a check number (copy)";
				 var newSearchId = customrecord_cash_appl_achSearchObj.save();
				 */

				
				log.debug({ title: 'createCustomerPaymentRecord() oneOrMoreLinesAdded', details: 'oneOrMoreLinesAdded = ' + oneOrMoreLinesAdded });
				if (oneOrMoreLinesAdded) {
					nsCustomerPaymentId = nsCustomerPayment.save({
						enableSourcing: true,
						ignoreMandatoryFields: true
					});
					log.debug({ title: 'createCustomerPaymentRecord() nsCustomerPaymentId', details: 'nsCustomerPaymentId = ' + nsCustomerPaymentId });

				}
				/*else{
					caACHRec.setValue('custrecord_ach_failed',true);
				}
				caACHRec.save({
					enableSourcing: true,
					ignoreMandatoryFields: true
				});*/
			} catch (createCustomerPaymentRecordERROR) {
				log.error("createCustomerPaymentRecord() error", createCustomerPaymentRecordERROR);
				for (var l = 0; l < recIds.length; l++) {
					record.submitFields({
						type: 'customrecord_cash_appl_ach',
						id: recIds[l],
						values: {
							'custrecord_ach_failed': true,
							'custrecord_ach_processed': true,
							'custrecord_ach_message': createCustomerPaymentRecordERROR.message,
						}
					});
				}
			}


		}

		function applyInvoicesCreditMemo(CMNumber, amount, invoices){
			try{
				amount = Number(amount) * -1;
				var creditmemoSearchObj = search.create({
					type: "creditmemo",
					filters:
					[
					   ["type","anyof","CustCred"], 
					   "AND", 
					   ["numbertext","is",CMNumber]
					],
					columns:
					[]
				 });
				 var searchResultCount = creditmemoSearchObj.runPaged().count;
				 var creditMemoId = '';
				 log.debug("applyInvoicesCreditMemo() creditmemoSearchObj result count", searchResultCount);
				 if(searchResultCount > 0){
					 creditmemoSearchObj.run().each(function(result){
						creditMemoId = result.id;				
						return false;
					 });
				 }else{
					log.error("applyInvoicesCreditMemo() ERROR", "CREDIT MEMO " + CMNumber + " DOES NOT EXIST IN THE SYSTEM");
					return;
				 }
				 var creditMemoRecord = record.load({
					type: 'creditmemo',
					id: creditMemoId,
					isDynamic: true,
				 });
				 var oneOrMoreLinesAdded = false;
				 var unapplied = creditMemoRecord.getValue("unapplied");

				 for(key in invoices){
					var invoiceLine = creditMemoRecord.findSublistLineWithValue({
						sublistId: 'apply',
						fieldId: 'refnum',
						value: key
					});

					if (invoiceLine == -1) {
						invoiceLine = creditMemoRecord.findSublistLineWithValue({//Find line item with invoice number
							sublistId: 'apply',
							fieldId: 'refnum',
							value: 'INV' + key
						});
						if (invoiceLine == -1) {
							continue;
						}
					}
					creditMemoRecord.selectLine({//Select the invoice line
						sublistId: 'apply',
						line: invoiceLine
					});
					var dueAmount = creditMemoRecord.getCurrentSublistValue({
						sublistId: 'apply',
						fieldId: 'due'
					});
					var appliedAmount = Number(creditMemoRecord.getCurrentSublistValue({
						sublistId: 'apply',
						fieldId: 'amount',
					}));
					creditMemoRecord.setCurrentSublistValue({//Tick the Apply checkbox
						sublistId: 'apply',
						fieldId: 'apply',
						value: true
					});
					var amountToApply = Math.min((amount + appliedAmount),dueAmount,(unapplied + appliedAmount));
					creditMemoRecord.setCurrentSublistValue({
						sublistId: 'apply',
						fieldId: 'amount',
						value: amountToApply,
					}); 
					invoices[key] = invoices[key] - (amountToApply - appliedAmount);
					amount = amount - (amountToApply - appliedAmount);
					log.debug("applyInvoicesCreditMemo() unapplied before: ", unapplied);
					unapplied = unapplied - (amountToApply - appliedAmount);
					log.debug("applyInvoicesCreditMemo() unapplied after: ", unapplied);
					oneOrMoreLinesAdded = true;
				 }
				 log.debug("applyInvoicesCreditMemo() before returning: ",{
					oneOrMoreLinesAdded: oneOrMoreLinesAdded,
					amount: amount,
				 })
				 if (oneOrMoreLinesAdded && amount == 0){
					creditMemoRecord.save({
						enableSourcing: true,
						ignoreMandatoryFields: true
					});
					return invoices;
				 }
			}catch(applyInvoicesCreditMemoERROR){
				log.error("applyInvoicesCreditMemo() ERROR", applyInvoicesCreditMemoERROR);
			}
		 }

		function throwError() {
			var err = error.create({
				name: 'REMAINING_PTS_<_2000',
				message: 'Remaining Usage Points are less than 2000',
				notifyOff: true
			});
			throw err;
		}

		function getAllResults(searchRecordtype, searchId, filtersJSON, searchColumns) {
			//log.debug({title: 'getAllResults', details: 'START'});
			var startIndex = 0;
			var endIndex = 1000;
			var searchResults = [];
			var savedSearch = null;

			if (searchId) {
				//log.debug({title: 'getAllResults', details: 'searchId = '+searchId});
				savedSearch = search.load({
					id: searchId
				});
				var filters = savedSearch.filters;
				var columns = savedSearch.columns;

				//log.debug({title: 'getAllResults', details: 'BEFORE filters.length = '+filters.length});
				for (var key in filtersJSON) {
					//log.debug({title: 'KEY = '+key, details:'VALUE = '+filtersJSON[key]});

					if (key == 'custrecord_ach_processed') {
						filters.push(search.createFilter({ //create new filter
							name: 'custrecord_ach_processed',
							operator: search.Operator.IS,
							values: filtersJSON[key]
						}));
					}

				}
				//log.debug({title: 'getAllResults', details: 'AFTER filters.length = '+filters.length});

				//log.debug({title: 'getAllResults', details: 'BEFORE columns.length = '+columns.length});
				for (j = 0; j < searchColumns && searchColumns.length; j++) {
					columns.push(searchColumns[j]);
				}
				//log.debug({title: 'getAllResults', details: 'AFTER columns.length = '+columns.length});

			} else if (searchRecordtype) {
				if (searchFilters && searchColumns) {
					savedSearch = search.create({
						type: search.Type.searchRecordtype,
						filters: searchFilters,
						columns: searchColumns
					});
				} else if (searchFilters && !searchColumns) {
					savedSearch = search.create({
						type: search.Type.searchRecordtype,
						filters: searchFilters
					});
				} else if (!searchFilters && searchColumns) {
					savedSearch = search.create({
						type: search.Type.searchRecordtype,
						columns: searchColumns
					});
				}
			} else {
				log.debug('Missing required argument: searchRecordtype');
			}

			var resultRange = savedSearch.run().getRange({
				start: startIndex,
				end: endIndex
			});
			for (var i = 0; i < resultRange.length; i++) {
				//log.debug(i);
				searchResults.push(resultRange[i]);
				if (i == resultRange.length - 1) {
					startIndex += 1000;
					endIndex += 1000;
					i = -1;
					resultRange = savedSearch.run().getRange({
						start: startIndex,
						end: endIndex
					});
				}
			}
			//log.debug({title: 'getAllResults', details: 'searchResults.length = '+searchResults.length});
			//log.debug({title: 'getAllResults', details: 'END'});
			return searchResults;
		}

		return {
			execute: execute
		};
	});

Array.prototype.contains = function (obj) {
	var i = this.length;
	while (i--) {
		if (this[i] == obj) {
			return true;
		}
	}
	return false;
}

Array.prototype.getUnique = function () {
	var o = {}, a = [], i, e;
	for (i = 0; e = this[i]; i++) { o[e] = 1 };
	for (e in o) { a.push(e) };
	return a;
}