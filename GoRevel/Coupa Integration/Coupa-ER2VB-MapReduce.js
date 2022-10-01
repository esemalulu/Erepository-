/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 ***** Code has been modified for Send Tax Code functionality for ER-->VB to integration
 * Added new Script Param Send Tax Code? of type Checkbox
 * To Enable Tax Code synchronization from Coupa To Netsuite
 * Modified by: Abhishek Sharma
 ******
 */
define(
	['N/config', 'N/email', 'N/error', 'N/https', 'N/record', 'N/runtime','N/search', 'N/xml','./Coupa - OpenIDConnect 2.0','N/format'],
	/**
	 * @param {email}
	 *            email
	 * @param {error}
	 *            error
	 * @param {https}
	 *            https
	 * @param {record}
	 *            record
	 * @param {xml}
	 *            xml
	 */
	function (config, email, error, https, record, runtime, search, xml, oidc, format) {

		/**
		 * Marks the beginning of the Map/Reduce process and generates input
		 * data.
		 *
		 * @typedef {Object} ObjectRef
		 * @property {number} id - Internal ID of the record instance
		 * @property {string} type - Record type id
		 *
		 * @return {Array|Object|Search|RecordRef} inputSummary
		 * @since 2015.1
		 */
		function getInputData() {
			var scriptRef = runtime.getCurrentScript();
			var errorTo = scriptRef
				.getParameter('custscript_coupa_er2vb_errorto');
			var errorFrom = scriptRef
				.getParameter('custscript_coupa_er2vb_errorfrm');

			var baseURL = scriptRef
				.getParameter('custscript_coupa_er2vb_url');
			var api_key = scriptRef
				.getParameter('custscript_coupa_er2vb_apikey');
			var requestHeader = oidc.getAPIHeader('text/xml');
			var postHeaders = {};
			if (requestHeader) {
				postHeaders = requestHeader;
			} else {
				postHeaders = {
					'Accept': 'text/xml',
					'X-COUPA-API-KEY': api_key
				};
			}

			var exportField = 'exported';
			var status = 'approved_for_payment';

			var custom_field_export = scriptRef
				.getParameter('custscript_coupa_er2vb_export');
			if (custom_field_export) {
				exportField = custom_field_export;
			}

			var customStatus = scriptRef
				.getParameter('custscript_coupa_er2vb_status');
			if (customStatus) {
				status = customStatus;
			}

			var getUrl = baseURL + '/api/expense_reports?status=' + status +
				'&' + exportField + '=false';
			if (scriptRef.getParameter('custscript_coupa_er2vb_limit'))
				getUrl = getUrl +
					'&limit=' +
					scriptRef
						.getParameter('custscript_coupa_er2vb_limit');
			if (scriptRef.getParameter('custscript_coupa_er2vb_updatedate') == 'T') {
				if (scriptRef
					.getParameter('custscript_coupa_er2vb_fm_updated')) {
					getUrl = getUrl +
						'&updated-at[gt_or_eq]=' +
						netsuitedatetoCoupadate(scriptRef
							.getParameter('custscript_coupa_er2vb_fm_updated'));
				}

				if (scriptRef
					.getParameter('custscript_coupa_er2vb_to_updated')) {
					getUrl = getUrl +
						'&updated-at[lt_or_eq]=' +
						netsuitedatetoCoupadate(scriptRef
							.getParameter('custscript_coupa_er2vb_to_updated'));
				}
			}

			try {
				var response = https.get({
					url: getUrl,
					headers: postHeaders
				});
			} catch (e) {
				var errorMsg = 'Error making API call to Coupa, with Query: ' +
					getUrl;
				log.error('getInputData', errorMsg);

				var notification = {
					author: errorFrom,
					recipients: errorTo.split(","),
					subject: 'Coupa/NetSuite ER2VB Integration Error',
					body: errorMsg
				};
				email.send(notification);

				var err = error.create({
					name: 'Coupa API Failure',
					message: errorMsg,
					notifyOff: false
				});
				err.toString = function () {
					return err.message;
				};
				throw err;
			}

			if (response.code == 200) {
				// good response
				log.audit('Succesfully retrieved ExpenseReports', response.body);
				var xmlResponse = xml.Parser.fromString({
					text: response.body
				});
				var expenseReportNodes = xml.XPath.select({
					node: xmlResponse,
					xpath: 'expense-reports/expense-report'
				});
				var documents = [];
				for (var i = 0; i < expenseReportNodes.length; i++) {
					/*
					 * var newDoc = xmlResponse.createDocumentFragment();
					 * newDoc.appendChild({newChild: n});
					 * documents.push(newDoc);
					 */
					var object = {};
					object.id = xml.XPath.select({
						node: expenseReportNodes[i],
						xpath: 'id'
					})[0].textContent;
					object.requestHeader = postHeaders;
					documents.push(object);
				}
				//log.debug({title:'Expense Reports to be Processed: ',details:JSON.stringify(documents)});
				return documents;
			} else if (response.code == 404) {
				log.audit('No expense reports pending export', 'URL: ' +
					getUrl);
			} else {
				// bad response
				var errorMsg = 'Error making API call to Coupa, with Query: ' +
					getUrl +
					' Response Code is: ' +
					response.code +
					' Response Body is: ' + response.body;
				log.error('getInputData', errorMsg);

				var notification = {
					author: errorFrom,
					recipients: errorTo.split(","),
					subject: 'Coupa/NetSuite ER2VB Integration Error',
					body: errorMsg
				};
				email.send(notification);

				var err = error.create({
					name: 'COUPA_T_ERROR',
					message: 'Failed to Call to Coupa. Received code' +
						response.code + ' with response: ' +
						response.body
				});
				err.toString = function () {
					return err.message;
				};
				throw err;
			}
		}


		 /**
         *Code moved from Map stage to Reduce stage to avoid usage limit exceed issue
         *NIB# - 303 
         *Executes when the reduce entry point is triggered and applies to each group.
         *
         * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
         * @since 2015.1
         */
         function reduce(context) {

         	//log.debug('In Reduce Stage:', JSON.stringify(context.values));
            // NetSuite Variables, and record init
            var scriptRef = runtime.getCurrentScript();
            var errorTo = scriptRef
            .getParameter('custscript_coupa_er2vb_errorto');
            var errorFrom = scriptRef
            .getParameter('custscript_coupa_er2vb_errorfrm');
            /*
             * var vendorBill = record.create({ type :
             * record.Type.VENDOR_BILL, isDynamic : true });
             */

            // ExpenseReport Setup
            var object = JSON.parse(context.values[0]);
            var expenseId = object.id;
            var baseURL = scriptRef
            .getParameter('custscript_coupa_er2vb_url') +
            '/api/expense_reports/' + expenseId;
            var api_key = scriptRef
            .getParameter('custscript_coupa_er2vb_apikey');

            try {
            	var response = https.get({
            		url: baseURL,
            		headers: object.requestHeader
            	});
            } catch (e) {
            	var errorMsg = 'Error making API call to Coupa, with Query: ' +
            	baseURL;
            	log.error('getInputData', errorMsg);

            	var notification = {
            		author: errorFrom,
            		recipients: errorTo.split(","),
            		subject: 'Coupa/NetSuite ER2VB Integration Error',
            		body: errorMsg
            	};
            	email.send(notification);

            	var err = error.create({
            		name: 'Coupa API Failure',
            		message: errorMsg,
            		notifyOff: false
            	});
            	err.toString = function () {
            		return err.message;
            	};
            	return false;
            }

            var reportDocument = xml.Parser.fromString({
            	text: response.body
            });

            log.audit('Beginning import', 'Expense Report ID: ' +
            	expenseId);

            var expenseLines = getFromXpath(reportDocument,
            	'//expense-line');

            var externalSrcFilter = scriptRef
            .getParameter('custscript_coupa_er2vb_extsrcfilter');

            var expReportExternalSrcName = getFromXpath(reportDocument,
            	'/expense-report/external-src-name')[0].textContent;

            log.debug('expeReportExternalSrcName',
            	getFromXpath(reportDocument, '/expense-report/external-src-name'))

            var expLineExternalSrcName = getElementFromXML(expenseLines[0], 'external-src-name');

            if (externalSrcFilter != null && externalSrcFilter != '' && expLineExternalSrcName != null && expLineExternalSrcName != '') {
            	if (externalSrcFilter.toUpperCase().indexOf(expLineExternalSrcName.toUpperCase()) !== -1) {
            		setExportedToTrue(expenseId, object.requestHeader);
            		log.audit(
            			'Skipping Expense Report',
            			'Marking Expense Report ID: ' +
            			expenseId +
            			' as exported, as it is matches the External Source Filter. Did not create in NetSuite.');
            		return false;
            	}
            }
            if (externalSrcFilter != null && externalSrcFilter != '' && expReportExternalSrcName != null && expReportExternalSrcName != '') {
            	if (externalSrcFilter.toUpperCase().indexOf(expReportExternalSrcName.toUpperCase()) !== -1) {
            		setExportedToTrue(expenseId, object.requestHeader);
            		log.audit(
            			'Skipping Expense Report',
            			'Marking Expense Report ID: ' +
            			expenseId +
            			' as exported, as it is matches the External Source Filter. Did not create in NetSuite.');
            		return false;
            	}
            }

            var customEmployeeNumber = scriptRef
            .getParameter('custscript_coupa_er2vb_employee_field');
            var entityId = '';

            log.debug('Map', 'customEmployeeNumber ' + customEmployeeNumber);

            var customEmployeeNumberPath = '/expense-report/expensed-by/' + customEmployeeNumber;

            log.debug('Map', 'customEmployeeNumberPath ' + customEmployeeNumberPath);

            if (customEmployeeNumber != '' && customEmployeeNumber != null) {
            	entityId = getFromXpath(reportDocument, customEmployeeNumberPath)[0].textContent;

            	log.debug('Map', 'customEmployeeNumber Check');

            } else {
            	entityId = getFromXpath(reportDocument,
            		'/expense-report/expensed-by/employee-number')[0].textContent;

            	log.debug('Map', 'customEmployeeNumber Check');

            }

            log.audit('Map', 'Returned entityID ' + entityId);
            var coupaEntityId = entityId;
            
            var isCorpCardTransaction = isCorporateCardTransaction(reportDocument);
            var corpCardVendor = scriptRef.getParameter('custscript_coupa_er2vb_corp_card_vendor');
            log.audit('isCorpCardTransaction: ' + isCorpCardTransaction, 'corpCardVendor: ' + corpCardVendor);
			 var integrationCode = "";
			 if (isCorpCardTransaction) {
				 integrationCode = getIntegrationCode(reportDocument);
			 }
			 var corpCardMap = getCorpCardParameterMap();
			 if (corpCardMap && corpCardMap[integrationCode] != undefined) {		//NIB-372 Get Vendor for Corp Card from Mapping
				 log.audit('integrationCode: ' + integrationCode, 'corpCardMap[integrationCode]: ' + corpCardMap[integrationCode]);
				 entityId = corpCardMap[integrationCode];
			 } else if (isCorpCardTransaction && corpCardVendor) {
				 entityId = corpCardVendor;
			 } else {
				 entityId = getVendor(entityId);
			 }
            if (entityId != '' && entityId != null) {
            	log.debug('Entity', entityId);
            	var reportExists = vendorBillExists(expenseId, entityId);
            	if (reportExists == false) {
                    // Make Bill or Credit
                    log.audit(
                    	'Vendor Bill does not exist',
                    	'Expense report ' +
                    	expenseId +
                    	' is not yet in NetSuite, starting to create');

                    log.audit('Creating Vendor Bill', 'Expense report ' +
                    	expenseId + ' is being created.');
                    var success = createVendorBill(reportDocument,
                    	entityId, expenseId);
                    if (success) {
                    	log.audit('Vendor Bill Created', 'Expense report ' +
                    		expenseId + ' has been created.');
                    	setExportedToTrue(expenseId, object.requestHeader);
                    } else {
                    	log.audit('MapError',
                    		'Error creating Expense Report ' +
                    		expenseId + ' for ' + entityId);
                    }

                } else {
                	log.debug('Expense Report exists in netsuite ', 'Check if payment-channel was updated')
                    // Already exists in netsuite, export in Coupa
                    //var paychannel =  getElementFromXML(expenseLines[0], 'payment-channel');
                    var paychannel = getFromXpath(reportDocument,
                    	'/expense-report/payment-channel')[0].textContent;

                    log.debug('Expense Report paychannel ', paychannel);
                    if (paychannel = 'ERP ') {
                    	var existingERbill = record.load({
                    		type: record.Type.VENDOR_BILL,
                    		id: reportExists
                    	});
                    	if (existingERbill.getValue('paymenthold')) {
                    		log.debug('existingERbill.getFieldValue', reportExists);
                            //set payment hold ot false
                            existingERbill.setValue({
                            	fieldId: 'paymenthold',
                            	value: false
                            }).save({
                            	enableSourcing: true,
                            	ignoreMandatoryFields: false
                            });
                        }
                    }
                    setExportedToTrue(expenseId, object.requestHeader);
                }
            } else {
                // entity not found!
                // Mark exported, email
                var errorMsg = 'Vendor not found in NetSuitefor entityID ' +
                coupaEntityId + ' report ID ' + expenseId;
                log.error('MapError', errorMsg);
                var notification = {
                	author: errorFrom,
                	recipients: errorTo.split(","),
                	subject: 'Coupa/NetSuite ER2VB Integration Error',
                	body: errorMsg
                };
                email.send(notification);
                log.audit({
                  title: 'Vendor not found in NetSuitefor entityID ' + coupaEntityId + ' report ID ' + expenseId,
                  details: "Not marking the ER as exported"
                });
                //setExportedToTrue(expenseId); NIB# 387
            }
        }


		/**
		 * Executes when the summarize entry point is triggered and applies
		 * to the result set.
		 *
		 * @param {Summary}
		 *            summary - Holds statistics regarding the execution of
		 *            a map/reduce script
		 * @since 2015.1
		 */
		function summarize(summary) {

			log.error('Input Error: ', summary.inputSummary.error);
			var scriptRef = runtime.getCurrentScript();
			var errorTo = scriptRef.getParameter('custscript_coupa_er2vb_errorto');
			var errorFrom = scriptRef.getParameter('custscript_coupa_er2vb_errorfrm');
			summary.reduceSummary.errors.iterator().each(
				function (code, message) {
					log.error('Reduce Error: ' + code, message);
					var notification = {
						author: errorFrom,
						recipients: errorTo.split(","),
						subject: 'Coupa/NetSuite ER2VB Integration Error',
						body: message
					};
					email.send(notification);
				});
			log.debug('Summary Time', 'Total Seconds: ' + summary.seconds);
			log.debug('Summary Usage', 'Total Usage: ' + summary.usage);
			log.debug('Summary Yields', 'Total Yields: ' + summary.yields);
			log.audit('Number of queues: ', summary.concurrency);
			log.debug('Input Summary: ', JSON.stringify(summary.inputSummary));
			log.debug('Reduce Summary: ', JSON.stringify(summary.reduceSummary));
			log.debug('——-SCRIPT——-', '——-END——-');
		}

		return {
			getInputData: getInputData,
			reduce : reduce,
			summarize: summarize
		};

		function createVendorBill(expenseReport, vendorId, reportId) {
			var scriptRef = runtime.getCurrentScript();
			var errorTo = scriptRef
				.getParameter('custscript_coupa_er2vb_errorto');
			var errorFrom = scriptRef
				.getParameter('custscript_coupa_er2vb_errorfrm');
			//NS Enhancement: getting script param value to decide the send the tacx code or not
			var sendTaxCode = scriptRef
				.getParameter('custscript_coupa_er2vb_sendtaxcode');

			// Create record
			var newBill = record.create({
				type: record.Type.VENDOR_BILL,
				isDynamic: true,
				defaultValues: {
					entity: vendorId
				}
			});
			
			var expenseLines = getFromXpath(expenseReport, '//expense-line');
			for (var lineIndex = 0; lineIndex < expenseLines.length; lineIndex++) {
				log.debug('Expense Report ' + reportId, 'Line number' +
					(lineIndex + 1));
				var line = expenseLines[lineIndex];
				var lineAmount = getElementFromXML(line, 'amount');
				//new codee UT

				var foreingExchangeAmount = getElementFromXML(line, 'foreign-currency-amount');
				log.debug("Foreign current ammount is ", foreingExchangeAmount);
				var exchangeRate = getElementFromXML(line, 'exchange-rate');
				log.debug("Foreign cexhange rate is ", exchangeRate);



				var splitBilling = true;
				var accountAllocations = getFromXpath(line,
					'account-allocations/account-allocation');
				
				if (accountAllocations == null || accountAllocations == '' ||
					accountAllocations == []) {
					splitBilling = false;

				}


				if (splitBilling == true) {
					// We have account allocations
					for (var allocationIndex = 0; allocationIndex < accountAllocations.length; allocationIndex++) {
						var allocationNode = accountAllocations[allocationIndex];

						// lineAmount = getElementFromXML(allocationNode,
						// 		'amount');
						acclineAmount = getElementFromXML(allocationNode,
							'amount');
						//code to change currency into USD
						lineAmount = acclineAmount * exchangeRate;
						log.debug("lineammount is", lineAmount);

						log.debug('Expense Report ' + reportId +
							' Line number' + (lineIndex + 1),
							'Allocation Number: ' +
							(allocationIndex + 1));
						log.debug("allocationNode", allocationNode)
						var accountType = getFromXpath(allocationNode, 'account/account-type/name')[0].textContent;
						log.debug("accountType", accountType);
						var coupaDept = getCoupaDept(allocationNode);
						var coupaClass = getCoupaClass(allocationNode);
						var coupaLocation = getCoupaLocation(allocationNode);
						var coupaSubsidiary = getCoupaSubsidiary(allocationNode,accountType);

						if (lineIndex == 0) {
							// We only want to set subsidiary once. ERs can
							// only have one CoA, and so only one subsidiary
							log.debug('Line number' + (lineIndex + 1),
								'Setting subsidiary to ID: ' +
								coupaSubsidiary);
							var isOneWorld = runtime.isFeatureInEffect({    //returns true if oneworld feature i.e subsidiary enabled or returns false
								feature: 'SUBSIDIARIES'
							});
							log.audit({
								title: 'isOneWorld account?',
								details: isOneWorld
							});
							if (isOneWorld) {
								newBill.setValue({
									fieldId: 'subsidiary',
									value: coupaSubsidiary
								});
							}
						}

						// Add a new expense line
						newBill.selectNewLine({
							sublistId: 'expense'
						});

						// Account
						var accountSegment = scriptRef
							.getParameter('custscript_coupa_er2vb_glaccseg');
						if (accountSegment) {
							var accountNumber = getElementFromXML(
								allocationNode, accountSegment);
							var accountId = getNetsuiteAccountId(accountNumber);
							if (accountId != 'INVALID_ACCOUNT') {
								newBill.setCurrentSublistValue({
									sublistId: 'expense',
									fieldId: 'account',
									value: accountId
								});
							} else {
								log.error('Expense Report ' + reportId +
									' Line number' + (lineIndex + 1),
									'GL Account doesnt exist for numebr: ' +
									accountNumber +
									' Skipping report');
								var errorMsg = 'GL Account ' +
									accountNumber +
									' not found for entityID ' +
									vendorId + ' report ID ' +
									reportId;
								log.error('MapError', errorMsg);
								var notification = {
									author: errorFrom,
									recipients: errorTo.split(","),
									subject: 'Coupa/NetSuite ER2VB Integration Error',
									body: errorMsg
								};
								email.send(notification);
								return false;
							}
						}
						// Department
						if (coupaDept) {
							newBill.setCurrentSublistValue({
								sublistId: 'expense',
								fieldId: 'department',
								value: coupaDept
							});
						}

						// Class
						if (coupaClass) {
							newBill.setCurrentSublistValue({
								sublistId: 'expense',
								fieldId: 'class',
								value: coupaClass
							});
						}

						// Location
						if (coupaLocation) {
							newBill.setCurrentSublistValue({
								sublistId: 'expense',
								fieldId: 'location',
								value: coupaLocation
							});
						}

						// Set Line Fields

						// Line description
						newBill.setCurrentSublistValue({
							sublistId: 'expense',
							fieldId: 'memo',
							value: getElementFromXML(line, 'description')
						});
						// Merchant
						newBill.setCurrentSublistValue({
							sublistId: 'expense',
							fieldId: 'custcol_coupa_er2vb_merchant',
							value: getElementFromXML(line, 'merchant')
						});
						// Reason
						newBill.setCurrentSublistValue({
							sublistId: 'expense',
							fieldId: 'custcol_coupa_er2vb_memo',
							value: getElementFromXML(line, 'reason')
						});
						// Expense Date
						newBill.setCurrentSublistValue({
							sublistId: 'expense',
							fieldId: 'custcol_coupa_er2vb_date',
							value: getElementFromXML(line, 'expense-date')
						});

						// TODO: Add support for tax Codes
						// NS: Enhancement: Coupa tax-code line level
						log.debug('split billing: Is Send tax code?= ', sendTaxCode);
						if (sendTaxCode != null && sendTaxCode == true) {

							var expenseLineTaxes = getFromXpath(line, 'expense-line-taxes/expense-line-tax');
							if (expenseLineTaxes != null) {
								log.debug('split billing: Expense line not null ');
								for (var tx = 0; tx < expenseLineTaxes.length; tx++) {
									var taxcodeelement = getFromXpath(expenseLineTaxes[tx], 'tax-code/code');
									var taxcode = taxcodeelement[0].textContent;
									log.debug('split billing: Tax code element = ', taxcode);
									if (taxcode != null) {
										var coupaTaxcode = taxcode.split(':');

										if (coupaTaxcode.length > 0 && coupaTaxcode[1] != null) {

											newBill.setCurrentSublistValue({
												sublistId: 'expense',
												fieldId: 'taxcode',
												value: coupaTaxcode[1]
											});
										}
									} else {
										errmsg = 'No value for taxcode for ER#: ' + tranid;
										coupaTaxcode = null;
										log.debug(errmsg);
									}

								} //expense line tax loop end here
							} // Expense lines taxes end here
						} // sendtax code block ends

						// Set amount
						log.debug('Expense Report ' + reportId +
							' Line number' + (lineIndex + 1),
							'Setting line amount to ' + lineAmount);
						newBill.setCurrentSublistValue({
							sublistId: 'expense',
							fieldId: 'amount',
							value: lineAmount
						});

						// Line level Custom Fields
						var lineCustomFields = scriptRef
							.getParameter('custscript_coupa_er2vb_lnfields');
						if (lineCustomFields != '' &&
							lineCustomFields != null) {

							log.debug('Expense Report ' + reportId +
								' Line number' + (lineIndex + 1),
								'Starting Line custom fields: ' +
								lineCustomFields);

							var lineMappings = getCustomFields(lineCustomFields, line, allocationNode);
							for (var key in lineMappings) {
								if (lineMappings.hasOwnProperty(key)) {
									/* NIB-406: Ignore field change when expense category is set via custom field mapping to prevent
									overriding of tax-code by default tax-code of the expense category */
									if (key == "category") {
										newBill.setCurrentSublistValue({
											sublistId: 'expense',
											fieldId: key,
											value: lineMappings[key],
											ignoreFieldChange: true
										});
									} else {
										newBill.setCurrentSublistValue({
											sublistId: 'expense',
											fieldId: key,
											value: lineMappings[key]
										});
									}
								}
							}
						}
						newBill.commitLine({
							sublistId: 'expense'
						});
					} // End of split billing loop
				} else {
					// We do not have split billing on this line
					// so retrieve only the one account
					var accountNodes = getFromXpath(line, 'account');
					var accountNode = accountNodes[0];
					log.debug('AccountNode', accountNode);
					var accountType = getFromXpath(accountNode, 'account-type/name')[0].textContent;
					log.debug("accountType", accountType);
					var coupaDept = getCoupaDept(accountNode);
					var coupaClass = getCoupaClass(accountNode);
					var coupaLocation = getCoupaLocation(accountNode);
					var coupaSubsidiary = getCoupaSubsidiary(accountNode,accountType);

					if (lineIndex == 0) {
						// We only want to set subsidiary once. ERs can only
						// have one CoA, and so only one subsidiary
						log.debug('Line number' + (lineIndex + 1),
							'Setting subsidiary to ID: ' +
							coupaSubsidiary);
						var isOneWorld = runtime.isFeatureInEffect({    //returns true if oneworld feature i.e subsidiary enabled or returns false
							feature: 'SUBSIDIARIES'
						});
						log.audit({
							title: 'isOneWorld account?',
							details: isOneWorld
						});
						if (isOneWorld) {
							newBill.setValue({
								fieldId: 'subsidiary',
								value: coupaSubsidiary
							});
						}
					}

					// Add a new expense line
					newBill.selectNewLine({
						sublistId: 'expense'
					});

					// Account
					var accountSegment = scriptRef
						.getParameter('custscript_coupa_er2vb_glaccseg');
					if (accountSegment) {
						var accountNumber = getFromXpath(accountNode,
							accountSegment);
						var accountId = getNetsuiteAccountId(accountNumber[0].textContent);
						if (accountId != 'INVALID_ACCOUNT') {
							newBill.setCurrentSublistValue({
								sublistId: 'expense',
								fieldId: 'account',
								value: accountId
							});
							log.debug('Setting Account', 'AccountNumber: ' +
								accountNumber + ' Account ID: ' +
								accountId);
						} else {
							log.error('Expense Report ' + reportId +
								' Line number' + (lineIndex + 1),
								'GL Account doesnt exist for numebr: ' +
								accountNumber +
								' Skipping report');
							var errorMsg = 'GL Account ' + accountNumber +
								' not found for entityID ' +
								vendorId + ' report ID ' +
								reportId;
							log.error('MapError', errorMsg);
							var notification = {
								author: errorFrom,
								recipients: errorTo.split(","),
								subject: 'Coupa/NetSuite ER2VB Integration Error',
								body: errorMsg
							};
							email.send(notification);
							return;

						}
					}

					// Department
					if (coupaDept) {
						newBill.setCurrentSublistValue({
							sublistId: 'expense',
							fieldId: 'department',
							value: coupaDept
						});
					}

					// Class
					if (coupaClass) {
						newBill.setCurrentSublistValue({
							sublistId: 'expense',
							fieldId: 'class',
							value: coupaClass
						});
					}

					// Location
					if (coupaLocation) {
						newBill.setCurrentSublistValue({
							sublistId: 'expense',
							fieldId: 'location',
							value: coupaLocation
						});
					}
					// Set Line Fields

					// Line description
					newBill.setCurrentSublistValue({
						sublistId: 'expense',
						fieldId: 'memo',
						value: getElementFromXML(line, 'description')
					});
					// Merchant
					newBill.setCurrentSublistValue({
						sublistId: 'expense',
						fieldId: 'custcol_coupa_er2vb_merchant',
						value: getElementFromXML(line, 'merchant')
					});
					// Reason
					newBill.setCurrentSublistValue({
						sublistId: 'expense',
						fieldId: 'custcol_coupa_er2vb_memo',
						value: getElementFromXML(line, 'reason')
					});
					// Expense Date
					newBill.setCurrentSublistValue({
						sublistId: 'expense',
						fieldId: 'custcol_coupa_er2vb_date',
						value: getElementFromXML(line, 'expense-date')
					});

					// TODO: Add support for tax Codes

					log.debug('Is Send tax code?= ', sendTaxCode);
					//NS Enhancement: Coupa tax-code line level
					if (sendTaxCode != null && sendTaxCode == true) {
						//var expenseLineTaxes = new Array();
						log.debug('Send tax Code= ' + sendTaxCode);
						var expenseLineTaxes = getFromXpath(line, 'expense-line-taxes/expense-line-tax');
						log.debug('expenseLineTaxes array = ', expenseLineTaxes.length);
						//var expenseLineTaxesNodes = new Array();
						if (expenseLineTaxes.length != 0)  {
							for (var tx = 0; tx < expenseLineTaxes.length; tx++) {
								log.debug('Expense Line tax is not null ');
								var taxcodeelement = getFromXpath(expenseLineTaxes[tx], 'tax-code/code');
								var taxcode = taxcodeelement[0].textContent;
								log.debug('taxcode element== ', taxcode);
								if (taxcode != null) {
									var coupaTaxcode = taxcode.split(':');
									log.debug('Tax Code Line== ', coupaTaxcode);
									if (coupaTaxcode.length > 0 && coupaTaxcode[1] != null) {

										newBill.setCurrentSublistValue({
											sublistId: 'expense',
											fieldId: 'taxcode',
											value: coupaTaxcode[1]
										});
									}
								} else {
									errmsg = 'No value for taxcode for ER#: ' + tranid;
									coupaTaxcode = null;
									log.debug(errmsg);
								}
								// For Non Split Bill lines - In Coupa, the total of the expense line INCLUDES the tax amount.
								// In NetSuite, the total of the expense-line DOES NOT INCLUDE the tax amount.
								// This means that we must subtract the Coupa Tax Amount from the Coupa Expense line before sending the amount to NetSuite
								if (lineAmount) {
									//record.setCurrentLineItemValue('expense', 'foreignamount', lineAmount);
									log.debug('into line amount block');
									newBill.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: 'foreignamount',
										value: lineAmount
									});
									var lineTaxAmount = getElementFromXML(expenseLineTaxes[tx], 'amount');
									if (lineTaxAmount != null) {

										var expenseLineNontaxAmt = parseFloat(lineAmount) - parseFloat(lineTaxAmount);

										// record.setCurrentLineItemValue('expense', 'amount', expenseLineNontaxAmt);
										newBill.setCurrentSublistValue({
											sublistId: 'expense',
											fieldId: 'amount',
											value: expenseLineNontaxAmt
										});
										log.debug('expenseLineNontaxAmt== ' + expenseLineNontaxAmt);
									}
								} else {
									log.debug('No Amount in Coupa.');
								}
							}

							// } //expense line tax loop end here
							// Expense lines taxes end here
						} else {
							//if (lineAmount !=null) {
							//record.setCurrentLineItemValue('expense', 'foreignamount', lineAmount);
							log.debug('into line amount block if no tax code');
							newBill.setCurrentSublistValue({
								sublistId: 'expense',
								fieldId: 'foreignamount',
								value: lineAmount
							});
							log.debug('setting line amount if no tax code', lineAmount);
							// record.setCurrentLineItemValue('expense', 'amount', expenseLineNontaxAmt);
							newBill.setCurrentSublistValue({
								sublistId: 'expense',
								fieldId: 'amount',
								value: lineAmount
							});

							//} else {
							log.debug('No Amount in Coupa.');
							//}
						}
					} // sendtax code block ends
					else {
						// Set amount
						log.debug('Expense Report ' + reportId + ' Line number' +
							(lineIndex + 1), 'Setting line amount to ' +
							lineAmount);
						newBill.setCurrentSublistValue({
							sublistId: 'expense',
							fieldId: 'amount',
							value: lineAmount
						});
					}


					// Line level Custom Fields
					var lineCustomFields = scriptRef
						.getParameter('custscript_coupa_er2vb_lnfields');
					if (lineCustomFields != '' && lineCustomFields != null) {

						log.debug('Expense Report ' + reportId +
							' Line number' + (lineIndex + 1),
							'Starting Line custom fields: ' +
							lineCustomFields);

						var lineMappings = getCustomFields(
							lineCustomFields, line);
						for (var key in lineMappings) {
							if (lineMappings.hasOwnProperty(key)) {
								/* NIB-406: Ignore field change when expense category is set via custom field mapping to prevent
								overriding of tax-code by default tax-code of the expense category */
								if (key == "category") {
									newBill.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: key,
										value: lineMappings[key],
										ignoreFieldChange: true
									});
								} else {
									newBill.setCurrentSublistValue({
										sublistId: 'expense',
										fieldId: key,
										value: lineMappings[key]
									});
								}
							}
						}
					}

					newBill.commitLine({
						sublistId: 'expense'
					});
				} // end of new line
			} // end of line loop

			// Currency
			var currencyCode = getFromXpath(expenseReport,
				'expense-report/currency/code')[0].textContent;
			log.debug('currencyCode', currencyCode);
			var currencyId = getCurrencyId(currencyCode);
			if(currencyId) {
				newBill.setValue({
					fieldId: 'currency',
					value: currencyId
				});
			}

			// AP Account
			var accountPayableNum = scriptRef
				.getParameter('custscript_coupa_er2vb_payacc');
			if (accountPayableNum) {
				var apAccountId = getNetsuiteAccountId(accountPayableNum);
				if (apAccountId != 'INVALID_ACCOUNT') {
					log.debug('Expense Report ' + reportId + ' Header',
						'setting AP account' + apAccountId);
					newBill.setValue({
						fieldId: 'account',
						value: apAccountId
					});
				}
			}

			// Transaction ID
			newBill.setValue({
				fieldId: 'tranid',
				value: reportId
			});

			// External ID
			newBill.setValue({
				fieldId: 'externalid',
				value: 'CoupaExpenseReport-VendorBill' + reportId
			});

			// Transaction Date
			var coupaDate = getElementFromXML(expenseReport, 'submitted-at');
			var netsuiteDate = ConvertCoupaDateToNetSuiteDate(coupaDate);
			log.debug('Expense Report ' + reportId + ' Header',
				'CoupaDate is: ' + coupaDate + ' NS date is: ' +
				netsuiteDate);

			newBill.setText({
				fieldId: 'trandate',
				text: netsuiteDate
			});

			// Link to ER
			newBill.setValue({
				fieldId: 'custbody_coupa_er2vb_link',
				value: scriptRef
						.getParameter('custscript_coupa_er2vb_url') +
					'/expense_reports/' + reportId
			});

			// Report Title
			newBill.setValue({
				fieldId: 'memo',
				value: getElementFromXML(expenseReport, 'title')
			});

			// Approve
			newBill.setValue({
				fieldId: 'approvalstatus',
				value: 2
				// 2 is approved
			});
			
			// PaymentHold to true for CoupaPay payment channel						
			var paymentChannel =  getElementFromXML(expenseReport, 'payment-channel');
			
			if (paymentChannel == 'CoupaPay')
			{
				newBill.setValue({
					fieldId: 'paymenthold',
					value: true
					// paymenthold set to true
				});
			}
			
						
			// Posting Period
			var today = new Date();
			var postingPeriod = getMonthShortName(today.getMonth()) + ' ' +
				today.getFullYear();
			var cutoffDay = 5;
			var customCutoff = scriptRef
				.getParameter('custscript_coupa_er2vb_cutoff');
			if (customCutoff != null && customCutoff != '') {
				cutoffDay = customCutoff;
			}

			if (today.getDate() < cutoffDay) {
				var nDate = getElementFromXML(expenseReport, 'submitted-at')
					.split('T');
				var datesplit = nDate[0].split('-');
				var Nyear = datesplit[0];
				var Nday = datesplit[2];
				var Nmonth = datesplit[1] - 1;

				if (today.getFullYear() > Nyear) {
					if (today.getMonth() == 0)
						postingPeriod = getMonthShortName('11') + ' ' +
							(today.getFullYear() - 1);
					else
						postingPeriod = getMonthShortName(today.getMonth() - 1) +
							' ' + today.getFullYear();
				}

				if (Nmonth < today.getMonth() &&
					Nyear == today.getFullYear())
					postingPeriod = getMonthShortName(today.getMonth() - 1) +
						' ' + today.getFullYear();
			}
			log.debug('Expense Report ' + reportId + ' Header',
				'Posting Period is: ' + postingPeriod);

			var postingPeriodId = getAccountingPeriodId(postingPeriod);
			newBill.setValue({
				fieldId: 'postingperiod',
				value: postingPeriodId
			});

			// Header Custom Fields
			var headerCustomFields = scriptRef
				.getParameter('custscript_coupa_er2vb_hdrfields');
			if (headerCustomFields != '' && headerCustomFields != null) {

				log.debug('Expense Report ' + reportId + ' Header',
					'Starting Header custom fields: ' +
					headerCustomFields);

				var headerMappings = getCustomFields(headerCustomFields,
					expenseReport);
				for (var key in headerMappings) {
					if (headerMappings.hasOwnProperty(key)) {
						newBill.setValue({
							fieldId: key,
							value: headerMappings[key]
						});
					}
				}
			}

			try {
				var forceSave = scriptRef
					.getParameter('custscript_coupa_er2vb_forcesave');
				var newRecordId = null;
				if (forceSave == true) {
					newRecordId = newBill.save({
						enableSourcing: true,
						ignoreMandatoryFields: true
					});
				} else {
					newRecordId = newBill.save({
						enableSourcing: true,
						ignoreMandatoryFields: false
					});
				}
				log.audit({title: 'Vendor Bill submitted with Id:', details: 'vendorbill:' + newRecordId});
				return true;
			} catch (e) {
				var errorMsg = 'Error raised when saving report for entityID ' +
					vendorId +
					' report ID ' +
					reportId +
					'. Error: ' + e;
				log.error('MapError', errorMsg);
				var notification = {
					author: errorFrom,
					recipients: errorTo.split(","),
					subject: 'Coupa/NetSuite ER2VB Integration Error',
					body: errorMsg
				};
				email.send(notification);
				return false;
			}

		}

		function getElementFromXML(xml_element, tag_name) {
			log.debug('getElementFromXML', 'Getting ' + tag_name +
				' from xml ' + xml_element);
			var element = xml_element.getElementsByTagName({
				tagName: tag_name
			})[0];
			if (element != null) {
				return element.textContent;
			} else {
				return element;
			}
		}

		function getElementsFromXML(xml_element, tag_name) {
			return xml_element.getElementsByTagName({
				tagName: tag_name
			});
		}

		function getFromXpath(xnode, path) {
			return xml.XPath.select({
				node: xnode,
				xpath: path
			});
		}

		function getElementFromXMLXPath(xml_element, tag_name) {
			var element = xml.XPath.select({
				node: xml_element,
				xpath: tag_name
			})[0];
			if (element != null) {
				return element.textContent;
			} else {
				return element;
			}
		}

		function getCustomFields(custom_field_mappings, xml_node, allocationNode) {
			var customFieldData = {};
			if (custom_field_mappings == null) {
				return customFieldData;
			}
			var mapping_pairs = custom_field_mappings.split(";");
			for (var y = 0; y < mapping_pairs.length; y++) {
				mappings = mapping_pairs[y].split("==");
				var xml_element = "";
				if (mappings && mappings.length == 2) {
					if (allocationNode && mappings[0].indexOf('account/') > -1) {	//NIB# 391 Added to handle custom segment mapping
						xml_element = getElementFromXMLXPath(allocationNode, mappings[0]);
					} else {
						xml_element = getElementFromXMLXPath(xml_node, mappings[0]);
					}
					customFieldData[mappings[1]] = xml_element;
					log.debug('Custom Mapping', 'Going to map ' + xml_element + " to " + mappings[1]);
				} else if (mappings && mappings.length == 3) {	//If DataType is provided in Mapping
					var coupaField = mappings[0];
					var nsField = mappings[1];
					var fieldType = mappings[2];
					if (allocationNode && mappings[0].indexOf('account/') > -1) {	//NIB# 418 Added to handle custom field mapping datatype
						xml_element = getElementFromXMLXPath(allocationNode, mappings[0]);
					} else {
						xml_element = getElementFromXMLXPath(xml_node, mappings[0]);
					}

					switch (fieldType) {
						case "DATE":
							if (xml_element && xml_element != undefined && xml_element != null) {
								var dateObj = ConvertCoupaDateToNetSuiteDate(xml_element);
								xml_element = format.format({
									value: dateObj,
									type: format.Type.DATE
								});
								xml_element = format.parse({
									value: xml_element,
									type: format.Type.DATE
								});
							} else {
								log.debug({title: 'Date not found', details: ''});
							}
							break;
						case "CHECKBOX":
							xml_element = (xml_element == "true" ? true : false);
							break;
						case "MULTI-SELECT":
							xml_element = getMultiSelectList(xml_node, mappings[0]);
							break;
						default:
							log.debug("default case xml_element:", xml_element);
							break;
					}
					customFieldData[mappings[1]] = xml_element;
					log.debug('Custom Mapping', 'Going to map ' + xml_element + " to " + mappings[1]);
				}
			}
			return customFieldData;
		}

		function getNetsuiteAccountId(accountNumber) {
			var netsuite_account_id;
			var allSearch = search.create({
				type: search.Type.ACCOUNT,
				filters: [
					['number', search.Operator.IS,
						accountNumber
					]
				],
				columns: ['internalid']
			}).run().each(function (result) {
				netsuite_account_id = result.id;
			});
			return netsuite_account_id;
		}

		function getAccountingPeriodId(periodName) {
			var netsuite_period_id;
			var allSearch = search.create({
				type: search.Type.ACCOUNTING_PERIOD,
				filters: [
					['periodname', search.Operator.IS,
						periodName
					]
				],
				columns: ['internalid']
			}).run().each(function (result) {
				netsuite_period_id = result.id;
			});
			return netsuite_period_id;
		}

		function getCurrencyId(currencyCode) {
			var netsuite_currency_id;
			log.debug("currencyCode: ", currencyCode);
			log.audit("is Multicurrency Feature In Effect? ", runtime.isFeatureInEffect('multicurrency'));
			if (runtime.isFeatureInEffect('multicurrency')) {   //NIB#409
				var allSearch = search.create({
					type: search.Type.CURRENCY,
					filters: [
						['symbol', search.Operator.IS,
							currencyCode
						]
					],
					columns: ['internalid']
				}).run().each(function (result) {
					netsuite_currency_id = result.id;
				});
			} else {
				var scriptRef = runtime.getCurrentScript();
				netsuite_currency_id = scriptRef.getParameter('custscript_coupa_er2vb_default_currency');
			}
			log.audit("Currency returned from getCurrencyId: ", netsuite_currency_id);
			return netsuite_currency_id;
		}

		function getCoupaDept(accountNode) {
			var scriptRef = runtime.getCurrentScript();
			var deptsegment = scriptRef
				.getParameter('custscript_coupa_er2vb_deptseg');
			if (deptsegment != null && deptsegment != '') {
				return getElementFromXML(accountNode, deptsegment);
			}

		}

		function getCoupaClass(accountNode) {
			var scriptRef = runtime.getCurrentScript();
			var classsegment = scriptRef
				.getParameter('custscript_coupa_er2vb_classseg');
			if (classsegment != null && classsegment != '') {
				return getElementFromXML(accountNode, classsegment);
			}
		}

		function getCoupaLocation(accountNode) {
			var scriptRef = runtime.getCurrentScript();
			var locsegment = scriptRef
				.getParameter('custscript_coupa_er2vb_locseg');
			if (locsegment != null && locsegment != '') {
				return getElementFromXML(accountNode, locsegment);
			}
		}

		function getCoupaSubsidiary(accountNode,accountType) {

			try {
				var scriptRef = runtime.getCurrentScript();
				// if subsidiary needed test account has no subsidiary
				var subsegment = scriptRef
					.getParameter('custscript_coupa_er2vb_subsseg');
				log.debug('subsidiary segment', 'segment is: ' + subsegment);
				if (subsegment && subsegment.indexOf('segment') > -1) {
					return getElementFromXML(accountNode, subsegment);
				}else {
					// if subsidiary Segment is missing from the script Parameter, the Subsidiary is searched based on the Account Name
					//var accountName = getFromXpath(accountNode, '//account-type/name')[1].textContent;
					var accountName = accountType;
					log.debug('COA Name', 'segment is: ' + accountName);
					return getSubsidiaryId(accountName);
				}
			}catch (e) {
				log.error({title:'Error in getCoupaSubsidiary()',details:e.message});
			}
		}


		function getSubsidiaryId(accountName) {
			log.debug('COA Name in the function', 'segment is: ' + accountName);
			var netsuite_subs_id = "";
			var isOneWorld = runtime.isFeatureInEffect({    //returns true if oneworld feature i.e subsidiary enabled or returns false
				feature: 'SUBSIDIARIES'
			});
			log.audit({
				title: 'isOneWorld account?',
				details: isOneWorld
			});
			if (isOneWorld) {
				var allSearch = search.create({
					type: search.Type.SUBSIDIARY,
					filters: [
						['namenohierarchy', search.Operator.IS, accountName]
					],
					columns: ['internalid']
				}).run().each(function (result) {
					netsuite_subs_id = result.id;
				});
				log.debug('Subs ID in NS', 'segment is: ' + netsuite_subs_id);
			} else {
				log.audit("No Subsidiary found", "One World Feature not enabled");
			}
			return netsuite_subs_id;
		}

		function getVendor(entityId) {
			var netsuite_supplier_id;
			log.debug('Get Vendor Function', 'entityId: ' + entityId );
				var allSearch = search.create({
				type: search.Type.VENDOR,
				filters: [
					["formulatext: {entityid}", "is", entityId]
				],
				columns: ['internalid']
			}).run().each(function (result) {
				netsuite_supplier_id = result.id;
			});

			return netsuite_supplier_id;
		}

		
		function getMonthShortName(monthdate) {
			var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
				"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
			];
			return monthNames[monthdate];
		}

		function vendorBillExists(tranId, entityId) {
			var vendorBillId = false;
			log.debug('VendorBillExists', 'tranId: ' + tranId +
				' entityId: ' + entityId);
			var allSearch = search
				.create({
					type: record.Type.VENDOR_BILL,
					filters: [
						['tranid', search.Operator.IS,
							tranId
						],
						'and',
						['entity', search.Operator.IS,
							entityId
						]
					]
				}).run().each(function (result) {
					vendorBillId = result.id;
				});

			return vendorBillId;
		}

		function ConvertCoupaDateToNetSuiteDate(CoupaDate) {
			var companyPrefs = config.load({
				type: config.Type.COMPANY_PREFERENCES
			});
			var dateformat = companyPrefs.getValue({
				fieldId: 'DATEFORMAT'
			});

			var nDate = CoupaDate.split('T');

			var datesplit = nDate[0].split('-');

			var Nyear = datesplit[0];

			var Nday = datesplit[2];

			var Nmonth = datesplit[1];

			var dateObject = new Date(Nyear, Nmonth - 1, Nday);
			return dateObject;
			/*
			 * All of the below is nice for matching NS date format, but
			 * looks like we need date obejct with 2.0
			 * 
			 * var delimiter = '/'; if(dateformat[0] == 'Y'){ var
			 * splitFormat = dateformat.split(dateformat[0]); delimiter =
			 * splitFormat[4][0]; } else { var splitFormat =
			 * dateformat.split(dateformat[0]); delimiter =
			 * splitFormat[2][0]; } var netDate = Nmonth + delimiter + Nday +
			 * delimiter + Nyear;
			 * 
			 * if (dateformat == 'DD MONTH, YYYY') { netDate = Nday + ' ' +
			 * getMonthShortName(Nmonth) + ', ' + Nyear; } return netDate;
			 */

		}

		function setExportedToTrue(expenseId, requestHeader) {
			var scriptRef = runtime.getCurrentScript();
			var errorTo = scriptRef
				.getParameter('custscript_coupa_er2vb_errorto');
			var errorFrom = scriptRef
				.getParameter('custscript_coupa_er2vb_errorfrm');

			var baseURL = scriptRef
				.getParameter('custscript_coupa_er2vb_url');
			var api_key = scriptRef
				.getParameter('custscript_coupa_er2vb_apikey');
			var custom_field_export = scriptRef
				.getParameter('custscript_coupa_er2vb_export');

			var getUrl = baseURL + '/api/expense_reports/' + expenseId +
				'?exported=true';
			var postBody = '';
			if (custom_field_export != null && custom_field_export != '') {
				getUrl = baseUrl + '/api/expense_reports/' + expenseId;
				postBody = "<expense-report><" + custom_field_export +
					">true</" + custom_field_export +
					"></expense-report>";
			}

			try {
				var response = https.put({
					url: getUrl,
					headers: requestHeader,
					body: postBody
				});
				log.debug('Marking Exported: ' + expenseId,
					'Reponse Code: ' + response.code);
			} catch (e) {
				var errorMsg = 'Error making API call to Coupa, with Query: ' +
					getUrl;
				log.error('getInputData', errorMsg);

				var notification = {
					author: errorFrom,
					recipients: errorTo.split(","),
					subject: 'Coupa/NetSuite ER2VB Integration Error',
					body: errorMsg
				};
				email.send(notification);

				var err = error.create({
					name: 'Coupa API Failure',
					message: errorMsg,
					notifyOff: false
				});
				err.toString = function () {
					return err.message;
				};
				throw err;
			}
		}

		/**
		 * Description: Returns true when the expense line contains Corp Card expense line
		 * Update: The Corp Card condition changed to check IF LINE LEVEL externalSrcName does not contain "corporate_credit_card_"
		 * Apply the vendor as employee ELSE Apply the vendor as corporate card vendor
		 * NIB# NIB-255, NIB-426
		 * @param expenseReport payload
		 * @return flag boolean
		 */
		function isCorporateCardTransaction(expenseReport) {
			var flag = false;
			var expenseLines = getFromXpath(expenseReport, '//expense-line');
			for (var lineIndex = 0; lineIndex < expenseLines.length; lineIndex++) {
				var line = expenseLines[lineIndex];
				var externalSrcName = getElementFromXML(line, 'external-src-name');
				log.debug({
					title: 'externalSrcName',
					details: externalSrcName
				});
				if (externalSrcName && externalSrcName.indexOf('corporate_credit_card_') > -1) {
					flag = true;
				}
			}
			return flag;
		}

		/**
		 * Returns Integration Code from Expense Report Payload
		 * NIB# NIB-372
		 * @param expenseReport
		 * @return {string}
		 */
		function getIntegrationCode(expenseReport) {
			var integrationCode = "", code = "";
			var expenseLines = getFromXpath(expenseReport, '//expense-line');
			for (var lineIndex = 0; lineIndex < expenseLines.length; lineIndex++) {
				var line = expenseLines[lineIndex];
				var element = xml.XPath.select({
					node: line,
					xpath: "integration/code"
				})[0];
				if (element != null) {
					code = element.textContent;
				}
				if (code) {
					integrationCode = code.toLowerCase();
				}
			}
			log.audit({
				title: "integrationCode: ",
				details: integrationCode
			});
			return integrationCode;
		}

		/**
		 * Create Map based on the CorpCard Vendor mapping provided in script parameter
		 * NIB# NIB-372
		 * @param corpCardParam
		 * @return {{}}
		 */
		function getCorpCardParameterMap() {
			var corpCardMap = {};
			var scriptRef = runtime.getCurrentScript();
			var corpCardParam = scriptRef.getParameter('custscript_coupa_er2vb_corpcard_mapping');
			if (corpCardParam && corpCardParam.length > 0) {
				var outerSplits = corpCardParam.split(";");
				for (var i = 0; i < outerSplits.length; i++) {
					var innerSplits = outerSplits[i].split("==");
					if (innerSplits && innerSplits.length > 1) {
						corpCardMap[innerSplits[0].toLowerCase()] = innerSplits[1].toLowerCase();
					}
				}
			}
			log.audit({
				title: "corpCardMap Parameter Map: ",
				details: JSON.stringify(corpCardMap)
			});
			return corpCardMap;
		}

		/**
		 * get array of the values from the multi-select field node
		 * NIB# - NIB-418
		 * @param customFieldNode
		 * @param customFieldId
		 * @return {*[]}
		 */
		function getMultiSelectList(customFieldNode, customFieldId) {
			var multiSelectArray = [];
			if (customFieldId) {
				var customFieldArray = xml.XPath.select({
					node: customFieldNode,
					xpath: customFieldId
				});
				for (var s = 0; customFieldArray && s < customFieldArray.length; s++) {
					var fieldValue = xml.XPath.select({
						node: customFieldArray[s],
						xpath: 'external-ref-code'
					})[0].textContent
					if (fieldValue) {
						log.debug("Adding fieldValue to the Aray: ", fieldValue);
						multiSelectArray.push(fieldValue);
					}
				}
			} else {
				log.audit("Multi-select field skipped", "Multi-select custom field not found in script parameter");
			}
			log.audit("multiSelectArray returned from getMultiSelectList(): ", JSON.stringify(multiSelectArray));
			return multiSelectArray;
		}

	});

