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
				var caACHRec = null;
				var caACHRecId = null;

				var caACHRecObj = record.load({
					type: 'customrecord_cash_appl_ach',
					id: recIds[0],
					isDynamic: true
				});

				var invoiceNumber = caACHRecObj.getValue({ fieldId: 'custrecord_invoice_number_2' });
				var chkNumber = caACHRecObj.getValue({ fieldId: 'custrecord_check_number_2' });
				var chkAmount = caACHRecObj.getValue({ fieldId: 'custrecord_check_amount_2' });

				//Get Customer Id from Invoice
				var invoiceSearch = search.create({
					type: search.Type.INVOICE,
					columns: ['entity'],
					filters: [
						['tranid', 'is', invoiceNumber],
						'and', ['mainline', 'is', true],
						'and', ['status', 'is', 'CustInvc:A']
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

				for (var j = 0; j < recIds.length; j++) {
					//isRowProcessed = false;

					caACHRecId = recIds[j];
					log.debug({ title: 'createCustomerPaymentRecord() caACHRecId is ', details: 'Processig caACHRecId = ' + caACHRecId });
					caACHRec = record.load({
						type: 'customrecord_cash_appl_ach',
						id: caACHRecId,
						isDynamic: true
					});

					var custId = caACHRec.getValue({ fieldId: 'custrecord_mem_customer_id' });
					var custName = caACHRec.getValue({ fieldId: 'custrecord_payer_name' });
					var checkNumber = caACHRec.getValue({ fieldId: 'custrecord_check_number_2' });
					var checkAmount = caACHRec.getValue({ fieldId: 'custrecord_check_amount_2' });
					var invNumber = caACHRec.getValue({ fieldId: 'custrecord_invoice_number_2' });
					var invAmount = caACHRec.getValue({ fieldId: 'custrecord_invoice_amount' });
					var discAmount = caACHRec.getValue({ fieldId: 'custrecord_discount_amount_2' });
					var invNetAmount = caACHRec.getValue({ fieldId: 'custrecord_invoice_net_amount_2' });

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
							caLockboxRec.setValue('custrecord_lockbox_failed', true);
							caLockboxRec.setValue('custrecord_lockbox_message', errorMessage);
							caLockboxRec.setValue('custrecord_lockbox_processed', true);
							caLockboxRec.save({
								enableSourcing: true,
								ignoreMandatoryFields: true
							});
							continue;
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
					nsCustomerPayment.setCurrentSublistValue({//Tick the Apply checkbox
						sublistId: 'apply',
						fieldId: 'disc',
						value: discAmount
					});
					nsCustomerPayment.setCurrentSublistValue({//Tick the Apply checkbox
						sublistId: 'apply',
						fieldId: 'amount',
						value: invNetAmount
					});
					oneOrMoreLinesAdded = true;

					caACHRec.setValue('custrecord_ach_processed', true);
					caACHRec.save({
						enableSourcing: true,
						ignoreMandatoryFields: true
					});
					errorMessage = '';
				}// j loop
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