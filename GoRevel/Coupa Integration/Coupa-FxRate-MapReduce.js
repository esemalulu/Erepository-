/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/currency', 'N/email', 'N/https', 'N/search', 'N/runtime',
				'N/record', 'N/error', 'N/xml', './Coupa - OpenIDConnect 2.0' ],
		/**
		 * @param {currency}
		 *            currency
		 * @param {email}
		 *            email
		 * @param {https}
		 *            https
		 * @param {search}
		 *            search
		 * @param {runtime}
		 *            runtime
		 */
		function(currency, email, https, search, runtime, record, error, xml, oidc) {

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
				var currencyArray = [];
				log.audit("is Multicurrency Feature In Effect? ", runtime.isFeatureInEffect('multicurrency'));
				if (runtime.isFeatureInEffect('multicurrency')) {   //NIB#409
					var currencySearch = search.create({
						type: search.Type.CURRENCY,
						filters: [['isinactive', search.Operator.IS, false]],
						columns: ['symbol']
					});
					var searchResultCount = currencySearch.runPaged().count;
					log.debug("currency Search result count", searchResultCount);
					currencySearch.run().each(function (result) {
						currencyArray.push(result.id);
						return true;
					});
				} else {
					log.audit("Aborting Script Execution", "FEATURE_DISABLED: The feature 'Multiple Currencies' required to execute the script is not enabled in this account.");
					return [];
				}
				log.audit("Returning currencyArray from getInputData: ", JSON.stringify(currencyArray));
				return currencyArray;
			}


			/**
			 * Executes when the reduce entry point is triggered and applies to
			 * each group.
			 * 
			 * @param {ReduceSummary}
			 *            context - Data collection containing the groups to
			 *            process through the reduce stage
			 * @since 2015.1
			 */
			 function reduce(context) {
        var requestHeader = oidc.getAPIHeader('text/xml');
			 	var errorArray = [];
			 	var scriptRef = runtime.getCurrentScript();
			 	var postUrl = scriptRef
			 	.getParameter('custscript_coupa_fxrate_url2')
			 	+ "/api/exchange_rates";
			 	var api_key = scriptRef
			 	.getParameter('custscript_coupa_fxrate_apikey2');
        var postHeaders = {};
			 	if (requestHeader) {
					postHeaders = requestHeader
				} else {
					postHeaders = {
						'Accept': 'text/xml',
						'X-COUPA-API-KEY': api_key
					};
				}

			 	var now = new Date;
			 	var todayutc = Date.UTC(now.getUTCFullYear(),
			 		now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(),
			 		now.getUTCMinutes(), now.getUTCSeconds(), now
			 		.getUTCMilliseconds());
			 	var today = new Date(todayutc);

				// get today's date in the format yyyy-mm-dd
				var yyyy = today.getFullYear().toString();
				var mm = (today.getMonth() + 1).toString(); // getMonth() is
				// zero-based
				var dd = today.getDate().toString();
				var hr = today.getHours().toString();
				var mn = today.getMinutes().toString();
				var ss = today.getSeconds().toString();
				var offset = 7;

				if (scriptRef.getParameter('custscript_coupa_fxrate_utcoffset2'))
					offset = scriptRef
				.getParameter('custscript_coupa_fxrate_utcoffset2');
				offset = offset.toString();

				// set date in format yyy-mm-ddThh:mm:ss-zz:00
				var rateDate = yyyy + '-' + (mm[1] ? mm : "0" + mm[0]) + '-'
				+ (dd[1] ? dd : "0" + dd[0]) + "T"
				+ (hr[1] ? hr : "0" + hr[0]) + ":"
				+ (mn[1] ? mn : "0" + mn[0]) + ":"
				+ (ss[1] ? ss : "0" + ss[0]) + "-"
				+ (offset[1] ? offset : "0" + offset[0]) + ":00";

				var currencyID = JSON.parse(context.values[0]);
				log.debug("In Reduce Stage currencyID: ", currencyID);
				var baseCurrency = record.load({
					type : record.Type.CURRENCY,
					id : currencyID
				});
				if (baseCurrency.getValue('isbasecurrency') == false) {
					return;
				}
				var baseCurr = baseCurrency.getValue('symbol');
				var allSearch = search.create({
					type : search.Type.CURRENCY,
					filters : [ [ 'isinactive', search.Operator.IS, false ] ],
					columns : [ 'symbol' ]
				});
				// As of development, there are 249 ISO recognized currencies
				var allCurrencies = allSearch.run().getRange(0, 250);
				for (var i = 0; i < allCurrencies.length; i++) {
					var fromCurr = allCurrencies[i].getValue('symbol');
					log.debug("converting from: " + fromCurr, "to: " + baseCurr);
					if (fromCurr != baseCurr) {
						var rate = currency.exchangeRate({
							source : fromCurr,
							target : baseCurr
						});

						var postData = "<?xml version='1.0' encoding='UTF-8'?><exchange-rate>"
						+ "<from-currency><code>"
						+ fromCurr
						+ "</code></from-currency>"
						+ "<to-currency><code>"
						+ baseCurr
						+ "</code></to-currency>"
						+ "<rate type='decimal'>"
						+ rate
						+ "</rate>"
						+ "<rate-date type='datetime'>"
						+ rateDate + "</rate-date>" + "</exchange-rate>";
						log.debug('Payload: ', postData);

						var response = https.post({
							url : postUrl,
							body : postData,
							headers : postHeaders
						});

						if (response.code == 201 || response.code == 200) {
						// good response
						log.audit('Succesfully created exchange rate', fromCurr + ' loaded to Coupa with rate ' + rate + ' and rateDate ' + rateDate);

					} else {
						// bad response
						log.error('Error while creating exchange rate', 'Failed to load ' + fromCurr + ' to Coupa with rate ' + rate + ' and rateDate ' + rateDate);
						var err = error.create({
							name : 'COUPA_POST_ERROR',
							message : 'Failed to Post to Coupa. Received code'
							+ response.code + ' with response: '
							+ response.body
						});
						err.toString = function() {
							return err.message;
						};
						errorArray.push(err);
						
					}

				}
			}
			if(errorArray && errorArray.length > 0){
				throw errorArray;
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
				log.audit('Useage/Governance consumed: ', summary.usage);
				log.audit('Number of queues: ', summary.concurrency);
				log.audit('Number of Yields: ', summary.yields);

				log.error('Input Error: ', summary.inputSummary.error);
				var noOfExcounteredErrors = 0;
				summary.mapSummary.errors.iterator().each(
						function(code, message) {
							log.error('Map Stage Error: ' + code, message);
							noOfExcounteredErrors++;
						});

				summary.reduceSummary.errors.iterator().each(
						function(code, message) {
							log.error('Reduce Stage Error: ' + code, message);
							noOfExcounteredErrors++;
						});
				var scriptName = "Coupa Exchange Rate Integration M/R";
	            if (noOfExcounteredErrors && noOfExcounteredErrors > 0) {           //If any Errors are reported in Map/Reduce Summary send out an email to the Recipient/s in the script parameter
	            	sendFailureSummary(summary, scriptName);
	            }

			}

    	    /**
	         * This method sends the failure summary email to the recipients.
	         * @method
	         * @param {Object} summary
	         * @param {string} scriptName
	         * @return -NA-
	         * @author Yogesh Jagdale
	         * @since 5.1.0
	         */
	         function sendFailureSummary(summary, scriptName) {
	         	var errorMap = {};
	         	var subject = "Summary Email: " + scriptName + " Completed with Errors";
	         	var message = "Hello, <br><br> " + scriptName + " Script Completed with Error/s. Please find the details of the errors below: <br><br><hr>";
	         	
	         	var contents = '';

	         	summary.mapSummary.errors.iterator().each(function (key, error, executionNo) {
	         		contents += "Map error for key: " + key + ", execution no.:  " + executionNo + " Error: " + JSON.stringify(error, undefined, 4) + " <br><br>";
	         		return true;
	         	});
	         	summary.reduceSummary.errors.iterator().each(function (key, error, executionNo) {
	         		contents += "Reduce error for key: " + key + ", execution no.:  " + executionNo + " Error: " + JSON.stringify(error, undefined, 4) + " <br><br>";
	         		return true;
	         	});

	         	contents += "Thank you <br><br> ";
	         	var scriptRef = runtime.getCurrentScript();
	         	var errorTo = scriptRef.getParameter('custscript_coupa_fxrate_mr_error_to');
	         	var userid = scriptRef.getParameter('custscript_coupa_fxrate_mr_error_from');
	         	userid = userid ? userid : '-5';
	         	message += contents;
	         	log.audit({
	         		title: 'Sending Erorr summary to : ' + errorTo.toString(),
	         		details: message
	         	});
	         	email.send({
	         		author: userid,
	         		recipients: errorTo.toString(),
	         		subject: subject,
	         		body: message
	         	});
	         }

			return {
				getInputData : getInputData,
				reduce : reduce,
				summarize : summarize
			};

		});
