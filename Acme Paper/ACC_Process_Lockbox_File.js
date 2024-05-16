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
			log.debug({ title: 'execute', details: '*****START*****' });
			var currentCheckNumber = '';
			var nextCheckNumber = '';
			var sameCheckRows = [];
			var isLastGroup = false;

			try {
				var unProcessedcaLockboxSearchId = 'customsearch_unpro_ca_lockbox_search';

				var unProcessedcaLockboxSearchResults = getAllResults(null, unProcessedcaLockboxSearchId, null, null);
				log.debug({ title: 'execute() unProcessedcaLockboxSearchResults', details: 'unProcessedcaLockboxSearchResults Length = ' + unProcessedcaLockboxSearchResults.length });

				for (var i = 0; i < unProcessedcaLockboxSearchResults.length; i++) {
					currentCheckNumber = unProcessedcaLockboxSearchResults[i].getValue('custrecord_chk_num');
					if (unProcessedcaLockboxSearchResults[i + 1]) {
						nextCheckNumber = unProcessedcaLockboxSearchResults[i + 1].getValue('custrecord_chk_num');
					}
					log.debug({
						title: 'execute() compare check numbers', details: JSON.stringify({
							currentCheckNumber: currentCheckNumber,
							nextCheckNumber: nextCheckNumber,
						})
					});

					if (currentCheckNumber == nextCheckNumber) {
						sameCheckRows.push(unProcessedcaLockboxSearchResults[i].id);
						if (unProcessedcaLockboxSearchResults[i + 1]) {
							sameCheckRows.push(unProcessedcaLockboxSearchResults[i + 1].id);
						}
						else {
							isLastGroup = true;
						}
					}
					else {
						if (sameCheckRows.length == 0) {
							sameCheckRows.push(unProcessedcaLockboxSearchResults[i].id);
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

				// var subject = 'Error occured while processing Cash Application - LOCKBOX Data';
				// var authorId = 3;
				// var recipientEmail = 'jay@accrete.com';
				/*email.send({
					author: authorId,
					recipients: recipientEmail,
					subject: subject,
					body: 'Error occured while processing Cash Application - LOCKBOX Data: \n' + runtime.getCurrentScript().id + '\n\n' + JSON.stringify(e)
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
				var caLockboxRec = null;
				var caLockboxRecId = null;

				var caLockboxRecObj = record.load({
					type: 'customrecord_cash_appl_lockbox',
					id: recIds[0],
					isDynamic: true
				});

				var invoiceNumber = caLockboxRecObj.getValue({ fieldId: 'custrecord_inv_num' });
				var chkNumber = caLockboxRecObj.getValue({ fieldId: 'custrecord_chk_num' });
				var chkAmount = caLockboxRecObj.getValue({ fieldId: 'custrecord_chk_amt' });

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
							type: 'customrecord_cash_appl_lockbox',
							id: recIds[l],
							values: {
								'custrecord_lockbox_failed': true,
								'custrecord_lockbox_processed': true,
								'custrecord_lockbox_message': errorMessage
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
							type: 'customrecord_cash_appl_lockbox',
							id: recIds[l],
							values: {
								'custrecord_lockbox_failed': true,
								'custrecord_lockbox_processed': true,
								'custrecord_lockbox_message': errorMessage
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
							type: 'customrecord_cash_appl_lockbox',
							id: recIds[l],
							values: {
								'custrecord_lockbox_failed': true,
								'custrecord_lockbox_processed': true,
								'custrecord_lockbox_message': errorMessage
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
				nsCustomerPayment.setValue({ fieldId: 'memo', value: 'Created from Wells Fargo LOCKBOX File' });
				nsCustomerPayment.setValue({ fieldId: 'paymentmethod', value: 2 });//2 = Check
				nsCustomerPayment.setValue({ fieldId: 'checknum', value: chkNumber });
				nsCustomerPayment.setValue({ fieldId: 'payment', value: chkAmount / 100 });

				for (var j = 0; j < recIds.length; j++) {
					//isRowProcessed = false;

					caLockboxRecId = recIds[j];
					log.debug({ title: 'createCustomerPaymentRecord() caLockboxRecId is ', details: 'Processig caLockboxRecId = ' + caLockboxRecId });
					caLockboxRec = record.load({
						type: 'customrecord_cash_appl_lockbox',
						id: caLockboxRecId,
						isDynamic: true
					});

					var bankId = caLockboxRec.getValue({ fieldId: 'custrecord_bank_id' });
					var accountNumber = caLockboxRec.getValue({ fieldId: 'custrecord_account_number' });
					var checkNumber = caLockboxRec.getValue({ fieldId: 'custrecord_chk_num' });
					var checkAmount = caLockboxRec.getValue({ fieldId: 'custrecord_chk_amt' });
					var invNumber = caLockboxRec.getValue({ fieldId: 'custrecord_inv_num' });
					var invAmount = caLockboxRec.getValue({ fieldId: 'custrecord_inv_amt' });
					var discAmount = caLockboxRec.getValue({ fieldId: 'custrecord_disc_amt' });
					var invNetAmount = caLockboxRec.getValue({ fieldId: 'custrecord_inv_net_amt' });

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

					caLockboxRec.setValue('custrecord_lockbox_processed', true);
					caLockboxRec.save({
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

			} catch (createCustomerPaymentRecordERROR) {
				log.error("createCustomerPaymentRecord() error", createCustomerPaymentRecordERROR);
				for (var l = 0; l < recIds.length; l++) {
					log.debug('createCustomerPaymentRecord() CATCH', recIds[l]);
					record.submitFields({
						type: 'customrecord_cash_appl_lockbox',
						id: recIds[l],
						values: 
						{
							'custrecord_lockbox_failed': true,
							'custrecord_lockbox_processed': true,
							'custrecord_lockbox_message': createCustomerPaymentRecordERROR.message,
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

					if (key == 'custrecord_lockbox_processed') {
						filters.push(search.createFilter({ //create new filter
							name: 'custrecord_lockbox_processed',
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