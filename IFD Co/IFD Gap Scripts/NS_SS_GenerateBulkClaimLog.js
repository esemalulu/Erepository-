nlapiLogExecution("audit", "FLOStart", new Date().getTime());
/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 * 
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Jun 2016     mbuenavides      The script will look at all the Rebate Agreements and get all the existing transactions in the Rebate Transaction details for each agreement
 * 											   A claim log will be generated for each of these rebate agreements
 * 2.00       17 Sep 2016     mbuenavides      Set the Trans Type Searched for Claim field
 * 3.00       21 Sep 2016     mbuenavides      Set default values for the date params
 * 4.00       12 Jan 2017     mbuenavides      Set default location on the generated claim log
 * 5.00       24 Jan 2017     mbuenavides      Get Agreements where Next Date for Claim Generation = today/blank
 * 6.00       06 Sep 2017     mbuenavides      Update Previous/Next Dates if the existing dates are past/before the current date
 * 7.00       08 Sep 2017     mbuenavides      If there is no claim log created for a rebate agreement, update the previous & next dates
 * 7.01       20 Sep 2017     mbuenavides      Do not update Previous & Next Dates if the agreement is already expired 
 * 7.02       21 Sep 2017     mbuenavides      Prev claim date is null and next generation date is null
 */


var START_TIME = new Date().getTime();
var PERCENT_ALLOWED_TIME = 90;
var USAGE_LIMIT_THRESHOLD = 700;
var TIME_LIMIT_THRESHOLD = 3600000;
function scheduled_generateBulkClaimLog(type) {
	try {
		var stLoggerTitle = 'scheduled_generateBulkClaimLog';
		nlapiLogExecution('DEBUG', stLoggerTitle, '*Entry log*');

		// get parameters: start date, end date, default department
		var objContext = nlapiGetContext();
		var stStartDateParam = objContext.getSetting('SCRIPT', 'custscript_bulk_claimlog_startdate');
		var stEndDateParam = objContext.getSetting('SCRIPT', 'custscript_bulk_claimlog_enddate');
		var stDepartmentParam = objContext.getSetting('SCRIPT', 'custscript_ifd_def_dept');
		var stApprovedParam = objContext.getSetting('SCRIPT', 'custscript_rm_status_apprvd');
		var stLocationParam = objContext.getSetting('SCRIPT', 'custscript_ifd_def_location'); // 1/12/2017 mbuenavides - get the Location param

		//--start 9/8/2017 mbuenavides -- added script parameters
		var stBiweeklyParam = objContext.getSetting('SCRIPT', 'custscript_ifd_freq_biweekly');
		var stWeeklyParam = objContext.getSetting('SCRIPT', 'custscript_ifd_freq_weekly');
		var stMonthlyParam = objContext.getSetting('SCRIPT', 'custscript_ifd_freq_monthly');
		var stQuarterlyParam = objContext.getSetting('SCRIPT', 'custscript_ifd_freq_quarterly');
		//--end 9/8/2017 mbuenavides -- added script parameters

		nlapiLogExecution('DEBUG', stLoggerTitle, 'parameters | start date: ' + stStartDateParam
			+ ', end date: ' + stEndDateParam
			+ ', department: ' + stDepartmentParam
			+ ', agreement approved status: ' + stApprovedParam
			+ ', location: ' + stLocationParam
			+ ', bi-weekly: ' + stBiweeklyParam
			+ ', weekly: ' + stWeeklyParam
			+ ', monthly: ' + stMonthlyParam
			+ ', quarterly: ' + stQuarterlyParam);


		// check parameters if empty
		if (Eval.isEmpty(stDepartmentParam) || Eval.isEmpty(stApprovedParam) || Eval.isEmpty(stLocationParam)
			|| Eval.isEmpty(stBiweeklyParam) || Eval.isEmpty(stWeeklyParam) || Eval.isEmpty(stMonthlyParam) || Eval.isEmpty(stQuarterlyParam)) {
			throw nlapiCreateError('ERROR', 'Please set all script parameters. Exit script.', true);
		}


		// get all rebate agreements where Inactive = F, Approved, parameter start and end dates are within the agreement start and end dates
		var arrRebateAgreement = getRebateAgreements(stApprovedParam, stStartDateParam, stEndDateParam);

		// check if there are agreements to process
		if (Eval.isEmpty(arrRebateAgreement)) {
			nlapiLogExecution('DEBUG', stLoggerTitle, 'No approved/active rebate agreements to process. Exit script.');
			return;
		}

		var intAgreementCount = arrRebateAgreement.length;
		nlapiLogExecution('DEBUG', stLoggerTitle, '# of Rebate Agreements to process: ' + intAgreementCount);

		var arrRebateAgreements = [];  // keep here the IDs of rebate agreements to be updated (Previous & Next dates)

		// for each rebate agreements
		for (var x = 0; x < intAgreementCount; x++) {
			try {
				var result = arrRebateAgreement[x];
				var stRebateId = result.getValue('internalid');
				var stName = result.getValue('name');
				var recRA = nlapiLoadRecord('customrecord_nsts_rm_rebate_agreement', stRebateId); // 9/17/2016 mbuenavides - load the agreement
				var stTran = recRA.getFieldTexts('custrecord_nsts_rm_claim_transaction'); // 9/17/2016 mbuenavides - need to load the agreement to get these fields
				var arrClaimTxns = recRA.getFieldValues('custrecord_nsts_rm_claim_transaction'); // 9/17/2016 mbuenavides - need to load the agreement to get these fields
				var arrClaimTxnId = [];
				var stNextClaimDate = recRA.getFieldValue('custrecord_ifd_next_claim_date'); // 1/24/2017 mbuenavides - get Next Date for Claim Generation
				var stPrevClaimDate = recRA.getFieldValue('custrecord_ifd_prev_claim_date'); // 1/24/2017 mbuenavides - get Previous Generation Date			    	
				var stCurrentDate = new Date(); // 9/6/2017 mbuenavides

				// create gen log
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Generate Claim Log for Agreement: ' + stName
					+ ', tran text: ' + arrClaimTxnId.toString()
					+ ', stPrevClaimDate: ' + stPrevClaimDate
					+ ', stNextClaimDate: ' + stNextClaimDate);

				if (!Eval.isEmpty(stPrevClaimDate)) {
					stPrevClaimDate = nlapiAddDays(nlapiStringToDate(stPrevClaimDate), '1'); // add 1 day to the previous claim date
					stPrevClaimDate = nlapiDateToString(stPrevClaimDate, 'date');
				}

				if (arrClaimTxns instanceof Array) {
					for (var intCtr in arrClaimTxns) {
						arrClaimTxnId.push(arrClaimTxns[intCtr]);
					}
				} else {
					arrClaimTxnId.push(arrClaimTxns);
				}

				//--start-- 1/14/2017 mbuenavides
				stStartDateParam = Eval.isEmpty(stPrevClaimDate) ? stStartDateParam : stPrevClaimDate;
				stEndDateParam = Eval.isEmpty(stNextClaimDate) ? stEndDateParam : stNextClaimDate;

				if (Eval.isEmpty(stStartDateParam) || Eval.isEmpty(stEndDateParam)) {
					arrRebateAgreements.push(stRebateId); // 9/21/17 - store the ID so this will be updated later
					nlapiLogExecution('DEBUG', stLoggerTitle, 'No Start Date/End Date. No Claim Log Generated for Rebate Agreement (id) ' + stRebateId + '. Proceed to the next agreement (if any).');
					continue;
				}
				//--end-- 1/14/2017 mbuenavides

				// 9/21/2016 mbuenavides --- start
				// if start date is null and end date is there, make the start date = end date
				if (Eval.isEmpty(stStartDateParam) && !Eval.isEmpty(stEndDateParam)) {
					stStartDateParam = stEndDateParam;
					nlapiLogExecution('DEBUG', stLoggerTitle, 'Make Start Date = End Date | start=' + stStartDateParam + ', end=' + stEndDateParam);
				}
				// if the start date is given and end date is null, make the end date as current date
				else if (!Eval.isEmpty(stStartDateParam) && Eval.isEmpty(stEndDateParam)) {
					stEndDateParam = nlapiDateToString(new Date(), 'date');
					nlapiLogExecution('DEBUG', stLoggerTitle, 'Set the End Date as current date | start=' + stStartDateParam + ', end=' + stEndDateParam);
				}
				// if both are null, make start and end dates as current date
				else if (Eval.isEmpty(stStartDateParam) && Eval.isEmpty(stEndDateParam)) {
					stStartDateParam = nlapiDateToString(new Date(), 'date');
					stEndDateParam = stStartDateParam;
					nlapiLogExecution('DEBUG', stLoggerTitle, 'Set the Start and End Dates as current date. | start=' + stStartDateParam + ', end=' + stEndDateParam);
				}
				//--start-- 9/6/2017 mbuenavides -- check if  next date is earlier than the current date
				else if (nlapiStringToDate(stEndDateParam) < stCurrentDate) {
					nlapiLogExecution('DEBUG', stLoggerTitle, 'Next Date(' + stEndDateParam + ') is earlier than the current date(' + nlapiDateToString(stCurrentDate) + ')');
					stEndDateParam = nlapiDateToString(stCurrentDate);
				}
				//--end-- 9/6/2017 mbuenavides -- check if  next date is earlier than the current date
				// 9/21/2016 mbuenavides --- end

				// check if start date < end date
				if (nlapiStringToDate(stEndDateParam) < nlapiStringToDate(stStartDateParam)) {
					throw nlapiCreateError('ERROR', 'End date cannot be earlier than the start date. Exit script.', true);
				}

				var stRebateType = result.getValue('custrecord_nsts_rm_rebate_type');
				var stDefaultSearch = getDefaultSearch(stRebateType); // get Default Search from NSTS | RM - Claim Config List

				// check if there's a default search assigned to the agreement's rebate type
				if (Eval.isEmpty(stDefaultSearch)) {
					nlapiLogExecution('DEBUG', stLoggerTitle, 'No default search assigned. Proceed to the next agreement.');
					continue;
				}

				// cmartinez 5/16/2017 - Run search for RM Tran Details
				var arrFilters = [];
				nlapiLogExecution('DEBUG', stLoggerTitle, 'stStartDateParam' + stStartDateParam + ' | stEndDateParam' + stEndDateParam);
				arrFilters = [new nlobjSearchFilter(FLD_REBATE_TRAN_DETAIL_REBATE_AGREEMENT, null, 'is', stRebateId),
				new nlobjSearchFilter(FLD_REBATE_TRAN_DETAIL_CLAIM, null, 'is', '@NONE@'),
				new nlobjSearchFilter(FLD_REBATE_TRAN_DETAIL_SELECTED, null, 'is', 'T'),
				//RM Transaction's Date is on or after Previous Generation Date
				new nlobjSearchFilter(FLD_REBATE_TRAN_DATE, FLD_REBATE_TRAN_DETAIL_REBATE_TRANSACTION, 'onorafter', stStartDateParam),
				//RM Transaction's Date is on or before Next Date for Claim Generation 
				new nlobjSearchFilter(FLD_REBATE_TRAN_DATE, FLD_REBATE_TRAN_DETAIL_REBATE_TRANSACTION, 'onorbefore', stEndDateParam)];

				if (!Eval.isEmpty(arrClaimTxnId)) {
					arrFilters.push(new nlobjSearchFilter(FLD_REBATE_TRAN_DETAIL_TRAN_TYPE, null, 'anyof', arrClaimTxnId));
				}

				var objSearch = nlapiLoadSearch(null, stDefaultSearch);
				var arrSSFilters = objSearch.getFilters();
				var arrSSColumns = objSearch.getColumns();

				//Combine saved search filters with dynamic filters
				arrFilters = arrFilters.concat(arrSSFilters);

				//Run search
				var arrRMTranDetailsRes = NSUtils.search(objSearch.getSearchType(), null, arrFilters, arrSSColumns);

				//***If no RM Tran Details found, skip***
				if (Eval.isEmpty(arrRMTranDetailsRes)) {
					nlapiLogExecution('DEBUG', stLoggerTitle, 'No related RM Tran Details found. Skipping Rebate Agreement.');
					arrRebateAgreements.push(stRebateId); // 9/8/2017 mbuenavides - store the agreement id; will be updated later
					continue;
				}

				var flSummaryClaimAmount = 0;
				if (!Eval.isEmpty(arrRMTranDetailsRes)) {
					var results = arrRMTranDetailsRes;
					nlapiLogExecution('DEBUG', stLoggerTitle, 'Number of results = ' + results.length);
					for (var i = 0; i < results.length; i++) {
						var flAmountResult = Parse.forceFloat(results[i].getValue(FLD_REBATE_TRAN_DETAIL_TOTAL_REBATE_AMT));
						flSummaryClaimAmount += (!isNaN(flAmountResult)) ? flAmountResult : 0;
					}
				}

				// cmartinez end

				var recClaimGenLog = nlapiCreateRecord('customrecord_nsts_rm_claim_generate_log', { recordmode: 'dynamic' });
				recClaimGenLog.setFieldValue('custrecord_nsts_rm_cg_rebate_agreement', result.getValue('internalid'));
				recClaimGenLog.setFieldValue('custrecord_nsts_cgl_tran_start_date', stStartDateParam);
				recClaimGenLog.setFieldValue('custrecord_nsts_cgl_tran_end_date', stEndDateParam);
				recClaimGenLog.setFieldValue('custrecord_nsts_rm_cgl_default_dept', stDepartmentParam);
				recClaimGenLog.setFieldValue('custrecord_nsts_rm_cgl_default_loc', stLocationParam);	 // 1/12/17 mbuenavides - set the Default Location field on the claim log
				// 9/17/2016 mbuenavides - set the Trans Type Searched for Claim field
				recClaimGenLog.setFieldValue('custrecord_nsts_cgl_claim_transactions', stTran);
				recClaimGenLog.setFieldValue('custrecord_nsts_cgl_clm_txns_text', arrClaimTxnId.join(','));

				recClaimGenLog.setFieldValue('custrecord_nsts_rm_cgl_default_search', stDefaultSearch);

				//cmartinez 5/16/2017 - Set total Claim Amount
				recClaimGenLog.setFieldValue('custrecord_nsts_rm_cgl_total_claim_amnt', flSummaryClaimAmount);
				//cmartinez end

				nlapiLogExecution('DEBUG', 'test', 'agreement id: ' + stRebateId + ', start date: ' + stStartDateParam + ', end date: ' + stEndDateParam);
				var stId = nlapiSubmitRecord(recClaimGenLog, false, true); // 1/24/2017 mbuenavides
				nlapiLogExecution('AUDIT', stLoggerTitle, 'Successfully created claim gen log (id) ' + stId);

				//cmartinez 5/18/2017 - create Claim Details Search
				//Create saved search for Claim log
				var objNewSearch = nlapiCreateSearch(objSearch.getSearchType(), arrFilters, arrSSColumns);
				objNewSearch.setIsPublic(true);

				// from createRedirectToSearchResults(objNewSearch, null, stId, arFilters, true)
				var idNewSearch = objNewSearch.saveSearch('Claim Generation Log #' + stId, 'customsearch_cgl_'
					+ stId + '_claim_detail');
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Claim Detail Search: ' + idNewSearch);

				//cmartinez 5/18/2017 - set Claim Detail Search
				nlapiSubmitField('customrecord_nsts_rm_claim_generate_log', stId, 'custrecord_nsts_rm_cgl_detail_search', idNewSearch);
				nlapiLogExecution('AUDIT', stLoggerTitle, 'Updated Claim Log with Claim Details Search');
			}
			catch (e) {
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Error details: ' + e.toString() + '. Proceed to the next agreement.');
			}
			// check governance
			START_TIME = NSUtils.rescheduleScript(USAGE_LIMIT_THRESHOLD, START_TIME, TIME_LIMIT_THRESHOLD, PERCENT_ALLOWED_TIME);
		}

		//--start 9/8/2017 mbuenavides -- check to see if there are rebate agreements to be updated (Previous & Next dates)
		if (!Eval.isEmpty(arrRebateAgreements)) {
			updateRebateAgreements(arrRebateAgreements, stBiweeklyParam, stWeeklyParam, stMonthlyParam, stQuarterlyParam);
		}
		//--end 9/8/2017 mbuenavides -- check to see if there are rebate agreements to be updated (Previous & Next dates)

		nlapiLogExecution('DEBUG', stLoggerTitle, '*Exit script*');
	}
	catch (error) {
		if (error.getDetails != undefined) {
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
			throw error;
		}
		else {
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
			throw nlapiCreateError('99999', error.toString());
		}
	}
}

function updateRebateAgreements(arrRebateAgreements, stBiweeklyParam, stWeeklyParam, stMonthlyParam, stQuarterlyParam) {
	var stLoggerTitle = 'updateRebateAgreements';
	nlapiLogExecution('DEBUG', stLoggerTitle, ' Update the dates of the following agreements: ' + arrRebateAgreements.toString());

	try {
		for (var x = 0; x < arrRebateAgreements.length; x++) {
			try {
				var stId = arrRebateAgreements[x];

				var stClaimFreq = nlapiLookupField('customrecord_nsts_rm_rebate_agreement', stId, 'custrecord_ifd_claim_freq');
				var stToday = new Date();
				var stNextGenDate;

				// days to be added will depend on the claim frequency
				if (stClaimFreq == stQuarterlyParam) {
					stNextGenDate = nlapiAddDays(stToday, '90');
				}
				else if (stClaimFreq == stMonthlyParam) {
					stNextGenDate = nlapiAddDays(stToday, '30');
				}
				else if (stClaimFreq == stWeeklyParam) {
					stNextGenDate = nlapiAddDays(stToday, '7');
				}
				else if (stClaimFreq == stBiweeklyParam) {
					stNextGenDate = nlapiAddDays(stToday, '14');
				}

				if (!Eval.isEmpty(stNextGenDate)) {
					stNextGenDate = nlapiDateToString(stNextGenDate, 'mm/dd/yyyy');
				}

				// update the rebate agreement
				var stAgreementId = nlapiSubmitField('customrecord_nsts_rm_rebate_agreement', stId, ['custrecord_ifd_prev_claim_date', 'custrecord_ifd_next_claim_date'],
					[nlapiDateToString(stToday, 'mm/dd/yyyy'), stNextGenDate]);
				nlapiLogExecution('AUDIT', 'updateRebateAgreements', '>> Successfully updated the previous & next dates of agreement (id) ' + stAgreementId);
			}
			catch (e) {
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Error=' + e.toString());
				nlapiSubmitField('customrecord_nsts_rm_claim_generate_log', stId, ['custrecord_nsts_cgl_claim_generate_stat', 'custrecord_nsts_rm_claim_gen_error'], [HC_CLAIM_GEN_LOG_STATUS.Error, e.toString()])
				nlapiLogExecution('DEBUG', 'updateRebateAgreements', 'Error in updating agreement. Details: ' + e.toString());
			}
			// check governance
			START_TIME = NSUtils.rescheduleScript(USAGE_LIMIT_THRESHOLD, START_TIME, TIME_LIMIT_THRESHOLD, PERCENT_ALLOWED_TIME);
		}
	}
	catch (err) {
		nlapiLogExecution('DEBUG', stLoggerTitle, 'Error=' + err.toString());
	}
}

/**
 * Return all Rebate Agreements that are Approved, Active, start and end date param are within Agreement Start Date and Agreement End Date
 * 
 * @param stApprovedParam - the NSTS |RM Agreement Status: Approved
 * @returns {Array}
 */
function getRebateAgreements(stApprovedParam, stStartDateParam, stEndDateParam) {
	var stToday = nlapiDateToString(new Date(), 'date');
	var d = new Date();
	d = d.setDate(d.getDate() - 30);
	var stTodayLesDays = nlapiDateToString(new Date(d), 'date');
	nlapiLogExecution('debug', 'getRebateAgreements', 'stToday :' + stToday + ' | stTodayLesDays: ' + stTodayLesDays);
	// 1/24/2017 mbuenavides - update search filters. get agreements with Next Date for Claim Generation = today/blank
	var arrSearchFilter =
		[
			[
				'isinactive', 'is', 'F'
			], 'AND',
			[
				'custrecord_nsts_rm_agreement_status', 'anyof', stApprovedParam
			], 'AND',
			[
				[
					[
						'custrecord_ifd_next_claim_date', 'onorbefore', stToday
					]
				], 'OR',
				[
					[
						'custrecord_ifd_next_claim_date', 'isempty', ''
					]
				]
			], 'AND',
			[
				'custrecord_ifd_claim_freq', 'noneof', '@NONE@'
			], 'AND', //--start-- 9/20/17-- mbuenavides - pickup agreements that are not yet expired
			[
				'custrecord_nsts_rm_agreement_start_date', 'onorbefore', stToday
			], 'AND',
			[
				[
					[
						'custrecord_nsts_rm_agreement_end_date', 'within', stTodayLesDays, stToday
					]
				], 'OR',

				[
					[
						'custrecord_nsts_rm_agreement_end_date', 'onorafter', stToday
					]
				]
			]
			/*, 'AND',
			[
				'custrecord_nsts_rm_agreement_end_date', 'onorafter', stToday
			]*/
			//--end-- 9/20/17-- mbuenavides - pickup agreements that are not yet expired
		];

	// var arrSearchFilter = [ new nlobjSearchFilter('custrecord_nsts_rm_agreement_status', null, 'anyof', stApprovedParam),  // Agreement Status == Approved
	//                         new nlobjSearchFilter('isinactive', null, 'is', 'F'),
	// new nlobjSearchFilter('custrecord_nsts_rm_agreement_end_date', null, 'onorafter', stEndDateParam),
	// new nlobjSearchFilter('custrecord_nsts_rm_agreement_start_date', null, 'onorbefore', stStartDateParam)
	// new nlobjSearchFilter('custrecord_ifd_next_claim_date', null, 'onorbefore', stStartDateParam)
	// ];

	var arrSearchColumn = [new nlobjSearchColumn('name'),
	new nlobjSearchColumn('internalid'),
	new nlobjSearchColumn('custrecord_nsts_rm_rebate_type'),
	new nlobjSearchColumn('custrecord_nsts_rm_claim_transaction')];  //9/17/2016 mbuenavides - add this column
	return arrResult = NSUtils.search('customrecord_nsts_rm_rebate_agreement', null, arrSearchFilter, arrSearchColumn);
}

/**
 *  Return the Default Search depending on the Rebate Type
 * 
 * @param stRebateType - the rebate type of Rebate Agreement
 * @returns {Array}
 */
function getDefaultSearch(stRebateType) {
	var arrSearchFilter = [new nlobjSearchFilter('custrecord_nsts_rm_cgc_rebate_type', null, 'anyof', stRebateType)];
	var arrSearchColumn = [new nlobjSearchColumn('custrecord_nsts_rm_cgc_default_search')];
	var arrResult = nlapiSearchRecord('customrecord_nsts_rm_claim_generte_confg', null, arrSearchFilter, arrSearchColumn);

	if (Eval.isEmpty(arrResult)) {
		return '';
	}
	else {
		return arrResult[0].getValue('custrecord_nsts_rm_cgc_default_search');
	}
}

/*******************************************************************************
 *                          Utility Functions
 ******************************************************************************/
var Parse =
{
	/**
	 * Converts string to float. If value is infinity or can't be converted to a number, 0.00 will be returned.
	 * @param {String} stValue - any string
	 * @returns {Number} - a floating point number
	 * @author jsalcedo
	 */
	forceFloat: function (stValue) {
		var flValue = parseFloat(stValue);

		if (isNaN(flValue) || (stValue == Infinity)) {
			return 0.00;
		}

		return flValue;
	}
}

var Eval =
{
	/**
	 * Evaluate if the given string or object value is empty, null or undefined.
	 * @param {String} stValue - string or object to evaluate
	 * @returns {Boolean} - true if empty/null/undefined, false if not
	 * @author mmeremilla
	 */
	isEmpty: function (stValue) {
		if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
			return true;
		}
		else {
			if (typeof stValue == 'string') {
				if ((stValue == '')) {
					return true;
				}
			}
			else if (typeof stValue == 'object') {
				if (stValue.length == 0 || stValue.length == 'undefined') {
					return true;
				}
			}

			return false;
		}
	}
}


var NSUtils = {
	/**
	 * Get all of the results from the search even if the results are more than 1000. 
	 * @param {String} stRecordType - the record type where the search will be executed.
	 * @param {String} stSearchId - the search id of the saved search that will be used.
	 * @param {Array} arrSearchFilter - array of nlobjSearchFilter objects. The search filters to be used or will be added to the saved search if search id was passed.
	 * @param {Array} arrSearchColumn - array of nlobjSearchColumn objects. The columns to be returned or will be added to the saved search if search id was passed.
	 * @returns {Array} - an array of nlobjSearchResult objects
	 * @author memeremilla - initial version
	 * @author gmanarang - used concat when combining the search result
	 */
	search: function (stRecordType, stSearchId, arrSearchFilter, arrSearchColumn) {
		var arrReturnSearchResults = new Array();
		var nlobjSavedSearch;

		if (stSearchId != null) {
			nlobjSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

			// add search filter if one is passed
			if (arrSearchFilter != null) {
				nlobjSavedSearch.addFilters(arrSearchFilter);
			}

			// add search column if one is passed
			if (arrSearchColumn != null) {
				nlobjSavedSearch.addColumns(arrSearchColumn);
			}
		}
		else {
			nlobjSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
		}

		var nlobjResultset = nlobjSavedSearch.runSearch();
		var intSearchIndex = 0;
		var nlobjResultSlice = null;
		do {
			if ((nlapiGetContext().getExecutionContext() === 'scheduled')) {
				try {
					this.rescheduleScript(1000);
				}
				catch (e) { }
			}

			nlobjResultSlice = nlobjResultset.getResults(intSearchIndex, intSearchIndex + 1000);
			if (!(nlobjResultSlice)) {
				break;
			}

			arrReturnSearchResults = arrReturnSearchResults.concat(nlobjResultSlice);
			intSearchIndex = arrReturnSearchResults.length;
		}

		while (nlobjResultSlice.length >= 1000);

		return arrReturnSearchResults;
	},

	/**
	 * Pauses the scheduled script either if the remaining usage is less than the specified governance threshold usage amount or the allowed time is
	 * @param {Number} intGovernanceThreshold - The value of the governance threshold  usage units before the script will be rescheduled.
	 * @param {Number} intStartTime - The time when the scheduled script started
	 * @param {Number} intMaxTime - The maximum time (milliseconds) for the script to reschedule. Default is 1 hour.
	 * @param {Number} flPercentOfAllowedTime - the percent of allowed time based from the maximum running time. The maximum running time is 3600000 ms.
	 * @returns intStartTime - the current time
	 * @author memeremilla
	 */
	rescheduleScript: function (intGovernanceThreshold, intStartTime, intMaxTime, flPercentOfAllowedTime) {
		var stLoggerTitle = 'SuiteUtil.rescheduleScript';
		// nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
		// {
		// 	'Remaining usage' : nlapiGetContext().getRemainingUsage()
		// }));

		if (intMaxTime == null) {
			intMaxTime = 3600000;
		}

		var intRemainingUsage = nlapiGetContext().getRemainingUsage();
		var intRequiredTime = 900000; // 25% of max time
		if ((flPercentOfAllowedTime)) {
			var flPercentRequiredTime = 100 - flPercentOfAllowedTime;
			intRequiredTime = intMaxTime * (flPercentRequiredTime / 100);
		}

		// check if there is still enough usage units
		if ((intGovernanceThreshold)) {
			// nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Checking if there is still enough usage units.');

			if (intRemainingUsage < (parseInt(intGovernanceThreshold, 10) + parseInt(20, 10))) {
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					{
						'Remaining usage': nlapiGetContext().getRemainingUsage()
					}));
				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

				var objYield = null;
				try {
					objYield = nlapiYieldScript();
				}
				catch (e) {
					if (e.getDetails != undefined) {
						throw e;
					}
					else {
						if (e.toString().indexOf('NLServerSideScriptException') <= -1) {
							throw e;
						}
						else {
							objYield =
							{
								'Status': 'FAILURE',
								'Reason': e.toString(),
							};
						}
					}
				}

				if (objYield.status == 'FAILURE') {
					//						nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
					// nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					// {
					// 	'Status' : objYield.status,
					// 	'Information' : objYield.information,
					// 	'Reason' : objYield.reason
					// }));
				}
				else {
					//						nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
					// nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					// {
					// 	'After resume with' : intRemainingUsage,
					// 	'Remaining vs governance threshold' : intGovernanceThreshold
					// }));
				}
			}
		}

		if ((intStartTime)) {
			// get current time
			var intCurrentTime = new Date().getTime();

			// check if elapsed time is near the arbitrary value
			//				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Check if elapsed time is near the arbitrary value.');

			var intElapsedTime = intMaxTime - (intCurrentTime - intStartTime);
			//				nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Remaining time is ' + intElapsedTime + ' ms.');

			if (intElapsedTime < intRequiredTime) {
				// nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

				// check if we are not reaching the max processing time which is 3600000 secondsvar objYield = null;
				try {
					objYield = nlapiYieldScript();
				}
				catch (e) {
					if (e.getDetails != undefined) {
						throw e;
					}
					else {
						if (e.toString().indexOf('NLServerSideScriptException') <= -1) {
							throw e;
						}
						else {
							objYield =
							{
								'Status': 'FAILURE',
								'Reason': e.toString(),
							};
						}
					}
				}

				if (objYield.status == 'FAILURE') {
					//						nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
					// nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					// {
					// 	'Status' : objYield.status,
					// 	'Information' : objYield.information,
					// 	'Reason' : objYield.reason
					// }));
				}
				else {
					//						nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
					// nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					// {
					// 	'After resume with' : intRemainingUsage,
					// 	'Remaining vs governance threshold' : intGovernanceThreshold
					// }));

					// return new start time        
					intStartTime = new Date().getTime();
				}
			}
		}

		return intStartTime;
	},

	/**  
	 * Checks governance then calls yield
	 * @param 	{Integer} myGovernanceThreshold 	 * 
	 * @returns {Void} 
	 * @author memeremilla
	 */
	checkGovernance: function (myGovernanceThreshold) {
		var context = nlapiGetContext();

		if (context.getRemainingUsage() < myGovernanceThreshold) {
			var state = nlapiYieldScript();
			if (state.status == 'FAILURE') {
				// nlapiLogExecution("ERROR","Failed to yield script, exiting: Reason = "+state.reason + " / Size = "+ state.size);
				throw "Failed to yield script";
			}
			else if (state.status == 'RESUME') {
				// nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason+".  Size = "+ state.size);
			}
		}
	}
};