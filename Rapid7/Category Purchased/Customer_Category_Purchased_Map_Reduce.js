/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * script for APPS-5585 https://issues.corp.rapid7.com/browse/APPS-5585
 */

/**
 * helper type
 * @typedef {Object} customerObj
 * @property {String} ccprId
 * @property {String} customerId
 * @property {String} linkedCustomerId
 * @property {String} companyName
 * @property {Boolean} hasTransactions
 */

/**
 * helper type
 * @typedef {Object} updateObj
 * @property {String} customerId
 * @property {String} linkedCustomerId
 * @property {Array.<String>} nextLifetime
 * @property {Array.<String>} nextActive
 * @property {Array.<String>} nextInactive
 * @property {String} nextStatus
 * @property {Date} lastUpdate
 * @property {String} summary - used for evaluating if an update is needed on reduce stage and for summarizing the script run
 */

define(['N/record', 'N/search', 'N/log', 'N/format', 'N/runtime'], function(record, search, log, format, runtime) {

	// this is a map object for summary types, used within this script.
	var Summary = {
		updatedTwoCustomers: 'Updated two customers.',
		updatedTwoCustomersByLinkedCustomer: 'Updated two customers by linked customer.',
		updatedSingleCustomer: 'Updated single customer.',
		noUpdateRequired: 'No update required.'
	};

    // scriptObject to provide parameters of saved searches IDs for the script
	var scriptObj = runtime.getCurrentScript();

	// counter to track the process
	var recordCounter = 0;

	/**
	 * This recieves a search of customers to be processed. By the logic of this script,
	 * linked customers, aka COPIED TO R7 INTERNATIONAL should be excluded from the search.
	 * The search also includes some helper columns to optimize the script -
	 * 'customsearch_r7_5585_customer_search'
	 */
	function getInputData() {
		return {
			type: 'search',
			id: scriptObj.getParameter({ name: 'custscript_r7_customers_to_process_srch' })
		};
	}

	/**
	 * Map stage is where an update object is formed for the customer provided.
	 * It takes care of creating a CCPR record if necessary and writes an ccprId - updateObj
	 * pair for further processing in reduce stage
	 */
	function map(context) {
		if (!context.isRestarted) {
			try {


				var customerObj = getCustomerInputData(context);

				if (isEmpty(customerObj.ccprId)) {
					customerObj.ccprId = createCcprForCustomer(customerObj);
				}

				var updateObj = calculateUpdateObject(customerObj);

				if (updateObj.summary !== Summary.noUpdateRequired) {
					// log.debug({ title: 'updateObj', details: updateObj });
				}

				// log of processed records
				if (Number(context.key) % 500 === 0) {
					log.debug({
						title: 'records mapped: ',
						details: context.key
					})
				}
                // write CCRP ID: updateObj pair to context for further reduce stage
				context.write({
					key: customerObj.ccprId,
					value: updateObj
				});
			} catch (e) {
				log.debug({ title: 'error occured on map stage', details: e });
			}
		}
	}
	/**
	 * Reduce stage is where the records are actually updated if necessary which is evaluated
	 * by the summary property on the updateObj. It then writes a pair of customerId/summary
	 * in the context for both main customer and linked customer (if provided) to make a proper
	 * summary
	 */
	function reduce(context) {
		try {
			// log of processed records
			recordCounter++;
			if (Number(recordCounter) % 500 === 0) {
				log.debug({
					title: 'records reduced: ',
					details: recordCounter
				})
			}

			var updateObj = JSON.parse(context.values[0]);
			var ccprId = context.key;

			if (updateObj.summary !== Summary.noUpdateRequired) {
				updateCcprRecFields(ccprId, updateObj);
				updateCustomerRecFields(updateObj);
			}

			context.write({
				key: updateObj.customerId,
				value: updateObj.summary
			});

			if (!isEmpty(updateObj.linkedCustomerId)) {
				context.write({
					key: updateObj.linkedCustomerId,
					value: updateObj.summary
				});
			}
		} catch (e) {
			log.debug({ title: 'error occured on reduce stage', details: e });
		}
	}

	/**
	 * summarizes the script run and logs out total values and the Ids of updated during the
	 * script run customers for further lookup if wanted.
	 */
	function summarize(context) {
		try {
			var totalObj = {
				updatedTwoCustomers: 0,
				updatedTwoCustomersByLinkedCustomer: 0,
				updatedSingleCustomer: 0,
				noUpdateRequired: 0,
				totalCustomersProcessed: 0
			};

			var updatedSingleCustomer = '';
			var updatedTwoCustomers = '';
			var updatedTwoCustomersByLinkedCustomer = '';

			// summarize totals and individual customer IDs
			context.output.iterator().each(function(key, value) {
				if (value == Summary.noUpdateRequired) {
					totalObj.noUpdateRequired++;
				} else if (value == Summary.updatedSingleCustomer) {
					totalObj.updatedSingleCustomer++;
					updatedSingleCustomer += ' ' + key;
				} else if (value == Summary.updatedTwoCustomers) {
					totalObj.updatedTwoCustomers++;
					updatedTwoCustomers += ' ' + key;
				} else if (value == Summary.updatedTwoCustomersByLinkedCustomer) {
					totalObj.updatedTwoCustomersByLinkedCustomer++;
					updatedTwoCustomersByLinkedCustomer += ' ' + key;
				}
				totalObj.totalCustomersProcessed++;
				return true;
			});

			log.audit({ title: Summary.noUpdateRequired + ' total: ', details: totalObj.noUpdateRequired });
			log.audit({ title: Summary.updatedSingleCustomer + ' total: ', details: totalObj.updatedSingleCustomer });
			log.audit({ title: Summary.updatedTwoCustomers + ' total: ', details: totalObj.updatedTwoCustomers });
			log.audit({ title: Summary.updatedTwoCustomersByLinkedCustomer + ' total: ', details: totalObj.updatedTwoCustomersByLinkedCustomer });
			log.audit({ title: 'totalCustomersProcessed: ', details: totalObj.totalCustomersProcessed });

			log.audit({ title: 'updatedSingleCustomer: ', details: updatedSingleCustomer });
			log.audit({ title: 'updatedTwoCustomers: ', details: updatedTwoCustomers });
			log.audit({ title: 'updatedTwoCustomersByLinkedCustomer: ', details: updatedTwoCustomersByLinkedCustomer });

			log.audit({
				title: 'Usage units consumed',
				details: context.usage
			});
		} catch (e) {
			log.debug({ title: 'error occured on summarize stage', details: e });
		}
	}

	/**
	 * This function just forms a customerObj for further script processing
	 *
	 * @param {context} context - map context of the script
	 * @return {customerObj} customerObj for further script processing
	 */
	function getCustomerInputData(context) {
		var contextValue = JSON.parse(context.value);

		var customerObj = {
			ccprId: contextValue.values['MAX(internalid.CUSTENTITY_R7_CATEGORY_PURCHASED_RECORD)'],
			customerId: contextValue.values['MAX(internalid)'],
			linkedCustomerId: contextValue.values['MAX(internalid.CUSTENTITYR7LINKEDCUSTOMER)'],
			companyName: contextValue.values['MAX(companyname)'],
			// this search formula outputs "1" if any Invoices or Cash Sales exists on Customer or "0" otherwise
			hasTransactions: contextValue.values['MAX(formulanumeric)'] === '1' ? true : false
		};
		return customerObj;
	}

	/**
	 * govenrance points: 10 - 12
	 *
	 * This function is responsible for creating a new CCPR record, if customer or a pair of
	 * main customer / linked customer has no CCPR record attached yet.
	 *
	 * @param {customerObj} customerObj - customerObj object formed by getCustomerInputData(context)
	 * @return {String} ID of created CCPR record
	 */
	function createCcprForCustomer(customerObj) {
		var STATUS_LOST = '97';
		// initializing CCPR record with lost status, customer and name dependant on customer company
		var newCcprRec = record.create({ type: 'customrecord_r7_customer_cat_purchased' });
		newCcprRec.setValue({ fieldId: 'custrecord_r7_customer', value: customerObj.customerId });
		newCcprRec.setValue({ fieldId: 'name', value: customerObj.companyName + ' CCPR' });
		newCcprRec.setValue({ fieldId: 'custrecord_r7_customer_status', value: STATUS_LOST });
		// save the ID as a string for further processing
		var newCcprId = '' + newCcprRec.save();

		// submit field with last check date-time
		record.submitFields({
			type: 'customrecord_r7_customer_cat_purchased',
			id: newCcprId,
			values: {
				custrecord_r7_last_update: format.format({ value: new Date(), type: format.Type.DATETIME })
			}
		});

		var customerFields = {
			custentity_r7_category_purchased_record: newCcprId,
			entitystatus: STATUS_LOST
		};
		// attach new CCPR record to customer record and stamp LOST status as initial
		record.submitFields({
			type: record.Type.CUSTOMER,
			id: customerObj.customerId,
			values: customerFields
		});

		// attach new CCPR record to linked customer record and stamp LOST status as initial if it exists
		if (!isEmpty(customerObj.linkedCustomerId) && customerObj.linkedCustomerId !== customerObj.customerId) {
			record.submitFields({
				type: record.Type.CUSTOMER,
				id: customerObj.linkedCustomerId,
				values: customerFields
			});
		}

		return newCcprId;
	}

	/**
	 * This function is an aggregate of all helper functions to evaluate update object
	 * for specific Customer case. Within this function a summary is attached for updateObj
	 * for further reduce processes and Summary stage
	 *
	 * @param {customerObj} customerObj - customerObj object formed by getCustomerInputData(context)
	 * @return {updateObj} updateObj - returned for further processing by reduce stage
	 */
	function calculateUpdateObject(customerObj) {
        var updateObj = null;
        // if customer has any processable transactions
		if (customerObj.hasTransactions) {
            // simplest and most common case - when it is a single customer without linked customer
			if (isEmpty(customerObj.linkedCustomerId)) {
				updateObj = getSingleUpdateObj(customerObj.customerId);
				if (!isEmpty(updateObj)) {
					updateObj.summary = Summary.updatedSingleCustomer;
				}
			} else {
                // case when there is a pair of customers - main and linked
				updateObj = getMergedUpdateObj(customerObj.customerId, customerObj.linkedCustomerId);
                // in case of pairs of customers check if an update is real needed
				if (updateReallyNeeded(customerObj.ccprId, updateObj)) {
					updateObj.summary = Summary.updatedTwoCustomers;
				}
            }
            // if customer has no processable transactions and has a linked customer
		} else if (!customerObj.hasTransactions && !isEmpty(customerObj.linkedCustomerId)) {
			//check if linked customer has processable transactions
			if (hasCustomerTransactions(customerObj.linkedCustomerId)) {
                // if he does - get an update object for the linked customer
                updateObj = getSingleUpdateObj(customerObj.linkedCustomerId);
                // and switch places of main and linked customer back to usual
                // since the getSingleUpdateObj method assumes that the customer 
                // provided as a parameter is a main customer
				updateObj.customerId = customerObj.customerId;
                updateObj.linkedCustomerId = customerObj.linkedCustomerId;
                // in case of pairs of customers check if an update is real needed
				if (updateReallyNeeded(customerObj.ccprId, updateObj)) {
					updateObj.summary = Summary.updatedTwoCustomersByLinkedCustomer;
				}
			}
		}

		if (!isEmpty(updateObj) && !updateObj.hasOwnProperty('summary')) {
			updateObj.summary = Summary.noUpdateRequired;
		}
        // if every previos logic did not evaluated an update object ->
        // no update is required and an object is created here just for the summary stage
		if (isEmpty(updateObj)) {
			updateObj = {
				customerId: customerObj.customerId,
				linkedCustomerId: customerObj.linkedCustomerId,
				summary: Summary.noUpdateRequired
			};
		}
		return updateObj;
	}

	/**
	 * govenrance points: 1
	 *
	 * this fuction looks up for CCPR fields and compares the values of category Purchased fields
	 * to evaluate, whether an update is relly necessary or not.
	 * It is heve for cases with linked customers attached to the main customer and for mostly for
	 * edge cases when main customer has no transactions, but the linked customer does.
	 *
	 * @param {String} ccprId - customer category purchased record ID for the updateObj
	 * @param {updateObj} updateObj - fresh updateObj to be applied for ccpr and related customers
	 * @return {Boolean} TRUE, if update is indeed needed
	 */
	function updateReallyNeeded(ccprId, updateObj) {
		var ccprIdLookUp = search.lookupFields({
			type: 'customrecord_r7_customer_cat_purchased',
			id: ccprId,
			columns: ['custrecord_r7_category_lifetime', 'custrecord_r7_category_active', 'custrecord_r7_category_inactive']
		});

		var nextLifetime = ccprIdLookUp.custrecord_r7_category_lifetime.map(function(el) {
			return el.value;
		});
		var nextActive = ccprIdLookUp.custrecord_r7_category_active.map(function(el) {
			return el.value;
		});
		var nextInactive = ccprIdLookUp.custrecord_r7_category_inactive.map(function(el) {
			return el.value;
		});
		if (
			arrayValuesEqual(nextLifetime, updateObj.nextLifetime) &&
			arrayValuesEqual(nextActive, updateObj.nextActive) &&
			arrayValuesEqual(nextInactive, updateObj.nextInactive)
		) {
			return false;
		} else {
			return true;
		}
	}

	/**
	 * govenrance points: 15
	 *
	 * this fuction runs a search for customer ID, and if a specific
	 * formula field returns a '1' - it means that the customer indeed has Invoices or Cash Sales
	 * which sould be scanned for Category Purchased values on transaction lines.
	 * This is made for main customers without transactions and a linked customer attached.
	 *
	 * @param {String} customerId - customer Id to be searched for updates in category purchases
	 * @return {Boolean} TRUE, if the specified customer has transactions or FASLE otherwise
	 */
	function hasCustomerTransactions(customerId) {
		var hasCustomerTransactionSearch = search.load({ id: scriptObj.getParameter({ name: 'custscript_r7_has_customer_trans_srch' }) });
		hasCustomerTransactionSearch.filters.push(
			search.createFilter({
				name: 'internalid',
				operator: search.Operator.ANYOF,
				values: customerId
			})
		);
		var resultSet = hasCustomerTransactionSearch.run();
		var result = resultSet.getRange({
			start: 0,
			end: 1
		})[0];
		// log.debug({ title: 'checking linked customer for transactions', details: result });
		var hasCustomerTransaction = result.getValue(resultSet.columns[1]) === '1' ? true : false;
		return hasCustomerTransaction;
	}

	/**
	 * govenrance points: 15
	 *
	 * this fuction runs a search for specified customer, and if a result is returned,
	 * in most cases meaning that an update is required, the fucttion forms an updateObj
	 * for this customer and returns it.
	 *
	 * @param {String} customerId - customer Id to be searched for updates in category purchases
	 * @return {updateObj|null} updateObj - customer update object for further proccesing or null if no results returned
	 */
	function getSingleUpdateObj(customerId) {
		if (isEmpty(customerId)) {
			return null;
		}
		var categorySearch = search.load({ id: scriptObj.getParameter({ name: 'custscript_r7_calc_cat_purch_search' }) });
		categorySearch.filters.push(
			search.createFilter({
				name: 'internalid',
				join: 'customermain',
				operator: search.Operator.ANYOF,
				values: customerId
			})
		);
		var resultSet = categorySearch.run();
		var result = resultSet.getRange({
			start: 0,
			end: 1
		})[0];
		// the search will always give results if a customer has linked customer attached
		if (!isEmpty(result)) {
			var updObj = {
				customerId: result.getValue(resultSet.columns[0]),
				linkedCustomerId: result.getValue(resultSet.columns[1]),
				nextLifetime: result
					.getValue(resultSet.columns[3])
					.split(',')
					.filter(function(el) {
						return el !== '';
					}),
				nextActive: result
					.getValue(resultSet.columns[5])
					.split(',')
					.filter(function(el) {
						return el !== '';
					}),
				nextInactive: result
					.getValue(resultSet.columns[7])
					.split(',')
					.filter(function(el) {
						return el !== '';
					}),
				nextStatus: result.getValue(resultSet.columns[8]),
				lastUpdate: format.format({ value: new Date(), type: format.Type.DATETIME })
			};
			return updObj;
		} else {
			return null;
		}
	}
	/**
	 * govenrance points: 15 - 30
	 *
	 * this function is here for cases with two customers (main and linked customer).
	 * it runs two single searches for both customers if necessary and merges the updateObjects
	 * in one obj for both customers.
	 *
	 * @param {String} customerId - main Customer Id to be searched for updates in category purchases
	 * @param {String} linkedCustomerId - linked Customer Id to be searched for updates in category purchases
	 * @return {updateObj} customerUpdObj - merged customer update object of two customers for further proccesing
	 */
	function getMergedUpdateObj(customerId, linkedCustomerId) {
		var customerUpdObj = getSingleUpdateObj(customerId);
		if (isEmpty(customerUpdObj)) {
			return null;
		}

		// to avoid searches for cases when main customer has attached his same entity in linked customer field
		if (customerId !== linkedCustomerId) {
			var linkedCustomerUpdObj = getSingleUpdateObj(linkedCustomerId);
			if (isEmpty(linkedCustomerUpdObj)) {
				return customerUpdObj;
			}
			customerUpdObj.nextLifetime = mergeArraysUniqueValues(customerUpdObj.nextLifetime, linkedCustomerUpdObj.nextLifetime);
			customerUpdObj.nextActive = mergeArraysUniqueValues(customerUpdObj.nextActive, linkedCustomerUpdObj.nextActive);
			customerUpdObj.nextInactive = mergeArraysUniqueValues(customerUpdObj.nextInactive, linkedCustomerUpdObj.nextInactive);
		}

		return customerUpdObj;
	}

	/**
	 * govenrance points: 2
	 *
	 * this function updates the customer category purchased records
	 * from the updateObj with updated values for category purchased fields
	 *
	 * @param {String} ccprId - customer category purchased record ID
	 * @param {updateObj} updateObj - main Customer Id to be searched for updates in category purchases
	 * @returns {Void}
	 */
	function updateCcprRecFields(ccprId, updateObj) {
		record.submitFields({
			type: 'customrecord_r7_customer_cat_purchased',
			id: ccprId,
			values: {
				custrecord_r7_last_update: updateObj.lastUpdate,
				custrecord_r7_category_lifetime: updateObj.nextLifetime,
				custrecord_r7_category_active: updateObj.nextActive,
				custrecord_r7_category_inactive: updateObj.nextInactive,
				custrecord_r7_customer_status: updateObj.nextStatus
			}
		});
	}

	/**
	 * govenrance points: 5 - 10
	 *
	 * this function updates the customers (one or both main and linked if aplicable)
	 * from the updateObj with updated values for category purchased fields
	 *
	 * @param {updateObj} updateObj - main Customer Id to be searched for updates in category purchases
	 * @returns {Void}
	 */
	function updateCustomerRecFields(updateObj) {
		var newValues = {
			entitystatus: updateObj.nextStatus,
			custentity_r7_ccpr_category_lifetime_ids: formattedString(updateObj.nextLifetime),
			custentity_r7_ccpr_category_active_ids: formattedString(updateObj.nextActive),
			custentity_r7_ccpr_category_inactive_ids: formattedString(updateObj.nextInactive)
		};
		record.submitFields({
			type: record.Type.CUSTOMER,
			id: updateObj.customerId,
			values: newValues
		});
		if (!isEmpty(updateObj.linkedCustomerId)) {
			record.submitFields({
				type: record.Type.CUSTOMER,
				id: updateObj.linkedCustomerId,
				values: newValues
			});
		}
	}

	/**
	 * function to merge unique values from two arrays
	 * @param {Array.<any>} arr1 - array of any primitive values
	 * @param {Array.<any>} arr2 - array of any primitive values
	 * @return {Array.<any>} - array of any primitive values
	 *
	 * example: ['11','34','22','41'] + ['22','12','36','41'] = ['11','34','22','41','12','36']
	 */
	function mergeArraysUniqueValues(arr1, arr2) {
		return arr1.concat(
			arr2.filter(function(el) {
				return arr1.indexOf(el) === -1;
			})
		);
	}

	/**
	 * function to evaluate if two arrays have exact same values
	 * @param {Array.<any>} arr1 - array of any primitive values
	 * @param {Array.<any>} arr2 - array of any primitive values
	 * @return {Boolean} - are arrays equal or not
	 *
	 * example: ['11','34','22','41'] === ['11','34','22', 41] ? => FALSE
	 */
	function arrayValuesEqual(arr1, arr2) {
		return (
			arr1.length === arr2.length &&
			arr1.sort().every(function(value, index) {
				return value === arr2.sort()[index];
			})
		);
	}

	/**
	 * function to format an array of Category purchased records IDs into a string,
	 * agaings which the saved search will make comparsion to evaluate,
	 * if update is needed for a customer
	 *
	 * @param {Array.<String>} arr - array of strings with length of 1 - infinite
	 * @return {String} - formatted for this modification script
	 *
	 * example: ["1", "23", "34", "5", "7"] => "01,23,34,05,07"
	 */
	function formattedString(arr) {
		return arr
			.sort()
			.map(function(el) {
				return el.length === 1 ? '0'.concat(el) : el;
			})
			.join(',');
	}

	// function to evaluate if the parameter given is empty
	function isEmpty(value) {
		if (value === '' || value === ' ' || value === null || value === undefined) {
			return true;
		} else {
			return false;
		}
	}

	return {
		getInputData: getInputData,
		map: map,
		reduce: reduce,
		summarize: summarize
	};
});
