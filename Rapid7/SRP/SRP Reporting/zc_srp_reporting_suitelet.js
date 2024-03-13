/*
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       17 Jun 2016     efagone
 *
 * MB: 9/27/16 - Removed columns per ticket #34308 - Field Removal SRP Reporting Suitelet:
 * 	Currency
 * 	Exchange Rate
 * 	Converted Amount (VSOE Completed)
 * 	Converted Amount (VSOE Period Allocation)
 * Version    Date            Author           Remarks
 * 1.01       05 Feb 2019     N grigoriev	  Add 606 VSOE fields
 *
 */

var context = nlapiGetContext();
function suitelet(request, response){

	if (request.getMethod() == 'GET') {

		if (!userHasPermission('srp_reporting_suitelet')) {
			throw nlapiCreateError('INSUFFICIENT_PERMISSION', 'You do not have permission to view this page. Please contact your Administrator.', true);
		}

		var dtNow = new Date();
		var reportingTypeFilter = request.getParameter('custparam_reportingtype');
		var fromFilter = request.getParameter('custparam_dfrom') || nlapiDateToString(new Date(dtNow.getFullYear(), dtNow.getMonth(), 1));
		var toFilter = request.getParameter('custparam_dto') || nlapiDateToString(new Date());
		var jobFilter = request.getParameter('custparam_jobcontains');
		var customerFilter = request.getParameter('custparam_customercontains');
		var tableHTMLFileId = context.getSetting('SCRIPT', 'custscriptzc_srp_reporting_tbl_html_file');

		var form = nlapiCreateForm('SRP Reporting', false);
		form.setScript('customscriptzc_srp_reporting_suitelet_cs');

		form.addFieldGroup('filtersgroup', 'Filters').setShowBorder(true);
		form.addFieldGroup('resultsgroup', 'Search Results').setShowBorder(true);
		form.addField('custpage_flter_revreporttype', 'select', 'Revenue Reporting Type', 'customlistr7projectrevreport', 'filtersgroup').setDisplayType('hidden');
		form.addField('custpage_flter_date_from', 'date', 'Date From', null, 'filtersgroup');
		form.addField('custpage_flter_date_to', 'date', 'To', null, 'filtersgroup');
		form.addField('custpage_flter_jobcontains', 'text', 'Project Name (contains)', null, 'filtersgroup').setDisplayType('hidden');
		form.addField('custpage_flter_customercontains', 'text', 'Customer Name (contains)', null, 'filtersgroup').setDisplayType('hidden');
		form.addField('custpage_remainingusage', 'text', 'Remaining Usage', null, 'filtersgroup').setDisplayType('hidden');
		form.addField('custpage_json', 'longtext', 'JSON', null, 'filtersgroup').setDisplayType('hidden');
		form.addField('custpage_searchresults', 'inlinehtml', 'Results', null, 'resultsgroup').setDisplayType('inline');

		//SET LAYOUT
		//form.getField('custpage_flter_revreporttype').setLayoutType('normal', 'startcol');
		form.getField('custpage_flter_date_from').setLayoutType('normal', 'startcol');
		form.getField('custpage_flter_date_from').setLayoutType('startrow');
		form.getField('custpage_flter_date_to').setLayoutType('midrow');

		form.getField('custpage_flter_revreporttype').setDefaultValue(reportingTypeFilter || '');
		form.getField('custpage_flter_date_from').setDefaultValue(fromFilter || '');
		form.getField('custpage_flter_date_to').setDefaultValue(toFilter || '');
		form.getField('custpage_flter_jobcontains').setDefaultValue(jobFilter || '');
		form.getField('custpage_flter_customercontains').setDefaultValue(customerFilter || '');

		var arrJobIds = getResultPopulation({
			reportingTypeFilter: reportingTypeFilter,
			fromFilter: fromFilter,
			toFilter: toFilter,
			jobFilter: jobFilter,
			customerFilter: customerFilter
		});

		var objTimeEntries = getTimeEntries({
			job_ids: arrJobIds,
			fromFilter: fromFilter,
			toFilter: toFilter,
		});

		var objJobResults = getJobData({
			job_ids: arrJobIds,
			fromFilter: fromFilter,
			toFilter: toFilter,
		});

		var salesorderURL = nlapiResolveURL('TASKLINK', 'EDIT_TRAN_SALESORD');
		var customerURL = nlapiResolveURL('TASKLINK', 'EDIT_CUSTJOB');
		var jobURL = nlapiResolveURL('TASKLINK', 'EDIT_JOB');
		var itemURL = nlapiResolveURL('TASKLINK', 'EDIT_ITEM');
		var engURL = '/app/common/custom/custrecordentry.nl?rectype=384';

		var objTableData = {rows: []};

		for (var jobId in objJobResults) {
			objTableData.rows.push({
				'Period Start': {
					value: fromFilter,
					hidden: true
				},
				'Period End': {
					value: toFilter,
					hidden: true
				},
				'Sales Order': {
					value: getLink(salesorderURL, objJobResults[jobId].salesorder, objJobResults[jobId].salesorder_txt)
				},
				'Customer': {
					value: getLink(customerURL, objJobResults[jobId].customer, objJobResults[jobId].customer_txt)
				},
				'Project ID': {
					value: getLink(jobURL, jobId, jobId)
				},
				'Project': {
					value: getLink(jobURL, jobId, objJobResults[jobId].jobname)
				},
				'Item': {
					value: getLink(itemURL, objJobResults[jobId].item, objJobResults[jobId].item_txt)
				},
				'Project Status': {
					value: objJobResults[jobId].status_txt
				},
				'Reporting Division': {
					value: objJobResults[jobId].custentityr7reportingdivision
				},
				'Revenue Reporting Type': {
					value: objJobResults[jobId].jobrevreporttype_txt
				},
				'Contracted Work (Hrs)': {
					value: addCommas(objJobResults[jobId].prj_contracted_work),
					isNumber: true
				},
				'Contracted Work Completed (Hrs)': {
					value: addCommas(jobCalcs.getContractedWorkCompeted({
						type: objJobResults[jobId].jobrevreporttype,
						job: objJobResults[jobId],
						time: objTimeEntries[jobId]
					})),
					isNumber: true
				},
				'Total Hours': {
					value: addCommas(jobCalcs.getTotalHours({
						type: objJobResults[jobId].jobrevreporttype,
						job: objJobResults[jobId],
						time: objTimeEntries[jobId]
					})),
					isNumber: true
				},
				'Total Hours This Period': {
					value: addCommas(jobCalcs.getTotalPeriodHours({
						type: objJobResults[jobId].jobrevreporttype,
						job: objJobResults[jobId],
						time: objTimeEntries[jobId]
					})),
					isNumber: true
				},
				'Hours This Period': {
					value: addCommas(jobCalcs.getPeriodHours({
						type: objJobResults[jobId].jobrevreporttype,
						job: objJobResults[jobId],
						time: objTimeEntries[jobId]
					})),
					isNumber: true
				},
				'Job 605 VSOE': {
					value: addCommas(objJobResults[jobId].jobvsoeallocation, true),
					isCurrency: true
				},
				'Job 606 VSOE': {
					value: addCommas(objJobResults[jobId].job606vsoeallocation, true),
					isCurrency: true
				},
				'Total 605 VSOE': {
					value: addCommas(jobCalcs.getVSOECompletedTotal({
						type: objJobResults[jobId].jobrevreporttype,
						job: objJobResults[jobId],
						time: objTimeEntries[jobId]
					}), true),
					isCurrency: true
				},
				'Total 606 VSOE': {
					value: addCommas(jobCalcs.get606VSOECompletedTotal({
						type: objJobResults[jobId].jobrevreporttype,
						job: objJobResults[jobId],
						time: objTimeEntries[jobId]
					}), true),
					isCurrency: true
				},
				'605 VSOE Allocation': {
					value: addCommas(jobCalcs.getVSOECompleted({
						type: objJobResults[jobId].jobrevreporttype,
						job: objJobResults[jobId],
						time: objTimeEntries[jobId]
					}), true),
					isCurrency: true
				},
				'606 VSOE Allocation': {
					value: addCommas(jobCalcs.get606VSOECompleted({
						type: objJobResults[jobId].jobrevreporttype,
						job: objJobResults[jobId],
						time: objTimeEntries[jobId]
					}), true),
					isCurrency: true
				},
				'605 VSOE Allocation (This Period)': {
					value: addCommas(jobCalcs.getVSOECompletedPeriod({
						type: objJobResults[jobId].jobrevreporttype,
						job: objJobResults[jobId],
						time: objTimeEntries[jobId]
					}), true),
					isCurrency: true
				},
				'606 VSOE Allocation (This Period)': {
					value: addCommas(jobCalcs.get606VSOECompletedPeriod({
						type: objJobResults[jobId].jobrevreporttype,
						job: objJobResults[jobId],
						time: objTimeEntries[jobId]
					}), true),
					isCurrency: true
				},
				'Currency': {
					value: objJobResults[jobId].currency_txt
				},
				'Sales Order Exchange Rate': {
					value: objJobResults[jobId].exchangerate
				},/*
				'Exchange Rate': {
					value: addCommas(jobCalcs.getExchangeRate(objJobResults[jobId].currency))
				},
				'Converted Amount (VSOE Completed)': {
					value: addCommas(jobCalcs.getVSOECompleted({
						type: objJobResults[jobId].jobrevreporttype,
						job: objJobResults[jobId],
						time: objTimeEntries[jobId]
					}) *
					jobCalcs.getExchangeRate(objJobResults[jobId].currency), true),
					isCurrency: true
				},
				'Converted Amount (VSOE Period Allocation)': {
					value: addCommas(jobCalcs.getVSOECompletedPeriod({
						type: objJobResults[jobId].jobrevreporttype,
						job: objJobResults[jobId],
						time: objTimeEntries[jobId]
					}) *
					jobCalcs.getExchangeRate(objJobResults[jobId].currency), true),
					isCurrency: true
				},*/
				'Category Bookings Sales Dept': {
					value: objJobResults[jobId].categorybookingssalesdept
				},
				'Offering Type': {
					value: objJobResults[jobId].offeringtype
				},
				'Offering Use Case': {
					value: objJobResults[jobId].offeringusecase
				},
				'Created From Engagement': {
					value: getLink(engURL, objJobResults[jobId].custentityr7projectcreatedfromeng, objJobResults[jobId].custentityr7projectcreatedfromeng_txt, true)
				}
			});
		}

		if (objTableData.rows.length <= 0) {
			objTableData.rows.push({
				'Project': {
					value: 'No projects found for selected period.'
				}
			});
		}

		var htmlFile = nlapiLoadFile(tableHTMLFileId);
		var template = Handlebars.compile(htmlFile.getValue());
		Handlebars.registerHelper('classList', function(column){
			var classes = [];
			if (column.isCurrency) {
				classes.push('zcurrency');
			}
			if (column.isNumber) {
				classes.push('znumber');
			}
			if (column.hidden) {
				classes.push('zhidden');
			}
			return classes.join(' ');
		});
		form.getField('custpage_searchresults').setDefaultValue(template(objTableData) || '');

		form.addButton('custpage_refresh', 'Refresh', 'zc_refresh()');
		//form.addButton('custpage_reset', 'Reset', 'zc_reset()');

		form.getField('custpage_remainingusage').setDefaultValue(context.getRemainingUsage());
		response.writePage(form);
	}

	if (request.getMethod() == 'POST') {

	}
}

var jobCalcs = {
	getExchangeRate: function(currencyId){
		var currencyMap = {
			'1': 1,
			'2': 1.234611,
			'4': 1.05252,
			'5': 0.12896,
			'6': 0.062917,
			'7': 0.74423,
			'8': 0.720679,
			'9': 0.69162,
			'10': 0.00083,
			'11': 0.00855,
			'12': 0.144015,
			'13': 0.110257,
			'14': 0.014748,
			'17': 0.115963,
			'default': 0
		};

		return currencyMap[currencyId] || currencyMap['default'];
	},
	getContractedWorkCompeted: function(params){

		if (params.job) {
			if (params.type == '3') {
				return (params.job.joboverridedate) ? (params.job.prj_contracted_work || 0) : 0;
			}

			if (['1', '2', '4'].indexOf(params.type) != -1) {
				return Math.min(params.job.prj_contracted_work, ((params.time) ? params.time.total_hours : 0));
			}
		}
		return '';
	},
	getTotalHours: function(params){

		if (params.job) {
			if (params.type == '3') {
				return (params.job.joboverridedate) ? (params.job.prj_contracted_work || 0) : 0;
			}

			if (['1', '2', '4'].indexOf(params.type) != -1) {
				return ((params.time) ? params.time.total_hours : 0);
			}
		}
		return '';
	},
	getPeriodHours: function(params){

		if (params.job) {
			if (params.type == '3') {
				return (params.job.joboverridedate) ? (params.job.prj_contracted_work || 0) : 0;
			}

			if (['1', '2', '4'].indexOf(params.type) != -1) {
				return ((params.time) ? (Math.round(Math.min(Math.max((params.job.prj_contracted_work - params.time.prior_period_hours),0), params.time.period_hours) * 100) / 100) : 0);
			}
		}
		return '';
	},
	getTotalPeriodHours: function(params){

		if (params.job) {
			if (params.type == '3') {
				return (params.job.joboverridedate) ? (params.job.prj_contracted_work || 0) : 0;
			}

			if (['1', '2', '4'].indexOf(params.type) != -1) {
				return ((params.time) ? params.time.period_hours : 0);
			}
		}
		return '';
	},
	getVSOECompleted: function(params){

		if (params.job) {
			if (params.type == '3') {
				return (params.job.joboverridedate) ? (params.job.jobvsoeallocation || 0) : 0;
			}

			if (['1', '2', '4'].indexOf(params.type) != -1) {
				//jobvsoeallocation
				var vsoe = ((params.time) ? params.time.total_hours : 0) * (params.job.jobvsoeallocation / params.job.prj_contracted_work);
				if (isNaN(vsoe)){
					vsoe = 0;
				}
				return Math.round(Math.min(params.job.jobvsoeallocation, vsoe) * 100) / 100;
			}
		}
		return '';
	},
	get606VSOECompleted: function(params){

		if (params.job) {
			if (params.type == '3') {
				return (params.job.joboverridedate) ? (params.job.job606vsoeallocation || 0) : 0;
			}

			if (['1', '2', '4'].indexOf(params.type) != -1) {
				//job606vsoeallocation
				var vsoe = ((params.time) ? params.time.total_hours : 0) * (params.job.job606vsoeallocation / params.job.prj_contracted_work);
				if (isNaN(vsoe)){
					vsoe = 0;
				}
				return Math.round(Math.min(params.job.job606vsoeallocation, vsoe) * 100) / 100;
			}
		}
		return '';
	},
	getVSOECompletedTotal: function(params){

		if (params.job) {

			if (params.type == '3') {
				return (params.job.joboverridedate) ? (params.job.jobvsoeallocation || 0) : 0;
			}

			if (['1', '2', '4'].indexOf(params.type) != -1) {
				//jobvsoeallocation
				var vsoe = ((params.time) ? params.time.total_hours : 0) * (params.job.jobvsoeallocation / params.job.prj_contracted_work);
				if (isNaN(vsoe)) {
					vsoe = 0;
				}
				return Math.round(vsoe * 100) / 100;
			}
		}
		return '';
	},
	get606VSOECompletedTotal: function(params){

		if (params.job) {

			if (params.type == '3') {
				return (params.job.joboverridedate) ? (params.job.job606vsoeallocation || 0) : 0;
			}

			if (['1', '2', '4'].indexOf(params.type) != -1) {
				//job606vsoeallocation
				var vsoe = ((params.time) ? params.time.total_hours : 0) * (params.job.job606vsoeallocation / params.job.prj_contracted_work);
				if (isNaN(vsoe)) {
					vsoe = 0;
				}
				return Math.round(vsoe * 100) / 100;
			}
		}
		return '';
	},
	getVSOECompletedPeriod: function(params){

		if (params.job) {
			if (params.type == '3') {
				return (params.job.joboverridedate) ? (params.job.jobvsoeallocation || 0) : 0;
			}

			if (['1', '2', '4'].indexOf(params.type) != -1) {
				//jobvsoeallocation
				var vsoe = (this.getPeriodHours(params)) * (params.job.jobvsoeallocation / params.job.prj_contracted_work);
				if (isNaN(vsoe)) {
					vsoe = 0;
				}
				return Math.round(Math.min(params.job.jobvsoeallocation, vsoe) * 100) / 100;
			}
		}
		return '';
	},
	get606VSOECompletedPeriod: function(params){

		if (params.job) {
			if (params.type == '3') {
				return (params.job.joboverridedate) ? (params.job.job606vsoeallocation || 0) : 0;
			}

			if (['1', '2', '4'].indexOf(params.type) != -1) {
				//job606vsoeallocation
				var vsoe = (this.getPeriodHours(params)) * (params.job.job606vsoeallocation / params.job.prj_contracted_work);
				if (isNaN(vsoe)) {
					vsoe = 0;
				}
				return Math.round(Math.min(params.job.job606vsoeallocation, vsoe) * 100) / 100;
			}
		}
		return '';
	}
};
function getJobData(params){

	params = params || {};

	if (!params.job_ids || params.job_ids.length <= 0) {
		return null;
	}

	var arrFilters = [];
	arrFilters.push([['internalid', 'anyof', params.job_ids], 'or', ['custentityr7joboverridedate', 'onorafter', params.fromFilter], 'and', ['custentityr7joboverridedate', 'onorbefore', params.toFilter]]);
	arrFilters.push('and');
	arrFilters.push(['custentityr7salesorder.mainline', 'is', 'T']);

	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid').setSort(false));
	arrColumns.push(new nlobjSearchColumn('custentityr7salesorder'));
	arrColumns.push(new nlobjSearchColumn('customer'));
	arrColumns.push(new nlobjSearchColumn('jobname'));
	arrColumns.push(new nlobjSearchColumn('custentityr7itemnum'));
	arrColumns.push(new nlobjSearchColumn('type'));
	arrColumns.push(new nlobjSearchColumn('custentityr7reportingdivision', 'customer'));
	arrColumns.push(new nlobjSearchColumn('territory', 'customer'));
	arrColumns.push(new nlobjSearchColumn('custentityr7joboverridedate'));
	arrColumns.push(new nlobjSearchColumn('custentityr7jobrevreporttype'));
	arrColumns.push(new nlobjSearchColumn('custentityr7_prj_contracted_work'));
	arrColumns.push(new nlobjSearchColumn('custentityr7jobvsoeallocation'));
//606 VSOE
	arrColumns.push(new nlobjSearchColumn('custentityr7_606_jobvsoeallocation'));
	arrColumns.push(new nlobjSearchColumn('custentityr7projectcreatedfromeng'));
	arrColumns.push(new nlobjSearchColumn('status'));
	arrColumns.push(new nlobjSearchColumn('currency', 'custentityr7salesorder'));
	arrColumns.push(new nlobjSearchColumn('exchangerate', 'custentityr7salesorder'));
	arrColumns.push(new nlobjSearchColumn('custitemr7categorybookingssalesdept', 'custentityr7itemnum'));
	arrColumns.push(new nlobjSearchColumn('custitemr7offeringtype', 'custentityr7itemnum'));
	arrColumns.push(new nlobjSearchColumn('custitemr7offeringusecase', 'custentityr7itemnum'));

	var savedsearch = nlapiCreateSearch('job', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();

	var objJobResults = {};

	var rowNum = 0;
	do {
		var arrResults = resultSet.getResults(rowNum, rowNum + 1000);
		for (var i = 0; arrResults && i < arrResults.length; i++) {
			rowNum++;

			var objJob = {
				internalid: arrResults[i].getValue('internalid'),
				salesorder: arrResults[i].getValue('custentityr7salesorder'),
				salesorder_txt: arrResults[i].getText('custentityr7salesorder'),
				customer: arrResults[i].getValue('customer'),
				customer_txt: arrResults[i].getText('customer'),
				jobname: arrResults[i].getValue('jobname'),
				item: arrResults[i].getValue('custentityr7itemnum'),
				item_txt: arrResults[i].getText('custentityr7itemnum'),
				type: arrResults[i].getValue('type'),
				type_txt: arrResults[i].getText('type'),
				custentityr7reportingdivision: arrResults[i].getText('custentityr7reportingdivision', 'customer'),
				territory: arrResults[i].getText('territory', 'customer'),
				joboverridedate: arrResults[i].getValue('custentityr7joboverridedate'),
				jobrevreporttype: arrResults[i].getValue('custentityr7jobrevreporttype'),
				jobrevreporttype_txt: arrResults[i].getText('custentityr7jobrevreporttype'),
				prj_contracted_work: parseFloat(arrResults[i].getValue('custentityr7_prj_contracted_work') || 0),
				jobvsoeallocation: parseFloat(arrResults[i].getValue('custentityr7jobvsoeallocation') || 0),
				//606 VSOE
				job606vsoeallocation: parseFloat(arrResults[i].getValue('custentityr7_606_jobvsoeallocation') || 0),
				status: arrResults[i].getValue('status'),
				status_txt: arrResults[i].getText('status'),
				currency: arrResults[i].getValue('currency', 'custentityr7salesorder'),
				currency_txt: arrResults[i].getText('currency', 'custentityr7salesorder'),
				exchangerate: arrResults[i].getValue('exchangerate', 'custentityr7salesorder'),
				categorybookingssalesdept: arrResults[i].getText('custitemr7categorybookingssalesdept', 'custentityr7itemnum'),
				offeringtype: arrResults[i].getText('custitemr7offeringtype', 'custentityr7itemnum'),
				offeringusecase: arrResults[i].getText('custitemr7offeringusecase', 'custentityr7itemnum'),
				custentityr7projectcreatedfromeng: arrResults[i].getValue('custentityr7projectcreatedfromeng'),
				custentityr7projectcreatedfromeng_txt: arrResults[i].getText('custentityr7projectcreatedfromeng')
			};

			if (objJob.internalid) {
				objJobResults[objJob.internalid] = objJob;
			}
		}
	}
	while (arrResults.length >= 1000);

	return objJobResults;
}

function getTimeEntries(params){

	params = params || {};

	if (!params.job_ids || params.job_ids.length <= 0) {
		return null;
	}

	var arrFilters = [];

	if (params.toFilter) {
		arrFilters.push(['date', 'onorbefore', params.toFilter]);
		arrFilters.push('and');
	}

	arrFilters.push(['customer.internalid', 'anyof', params.job_ids]);
	arrFilters.push('and');
	arrFilters.push(['approvalstatus', 'anyof', [3]]);
	arrFilters.push('and');
	arrFilters.push(['type', 'is', 'A']);

	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid').setSort(false));
	arrColumns.push(new nlobjSearchColumn('date'));
	arrColumns.push(new nlobjSearchColumn('customer'));
	arrColumns.push(new nlobjSearchColumn('durationdecimal'));
	arrColumns.push(new nlobjSearchColumn('type'));
	arrColumns.push(new nlobjSearchColumn('casetaskevent'));
	arrColumns.push(new nlobjSearchColumn('nonbillabletask', 'projecttask'));
	arrColumns.push(new nlobjSearchColumn('employee'));
	arrColumns.push(new nlobjSearchColumn('isbillable'));

	var savedsearch = nlapiCreateSearch('timebill', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();

	var objJobTime = {};

	var rowNum = 0;
	do {
		var arrResults = resultSet.getResults(rowNum, rowNum + 1000);
		for (var i = 0; arrResults && i < arrResults.length; i++) {
			rowNum++;

			var objTime = {
				internalid: arrResults[i].getValue('internalid'),
				date: arrResults[i].getValue('date'),
				job: arrResults[i].getValue('customer'),
				durationdecimal: parseFloat(arrResults[i].getValue('durationdecimal') || 0),
				type: arrResults[i].getValue('type'),
				casetaskevent: arrResults[i].getValue('casetaskevent'),
				employee: arrResults[i].getValue('employee'),
				isbillable: arrResults[i].getValue('isbillable'),
				nonBillableTask: arrResults[i].getValue('nonbillabletask', 'projecttask')
			};

			if (!objTime.job || objTime.nonBillableTask == 'T') {
				continue;
			}

			objJobTime[objTime.job] = objJobTime[objTime.job] ||
			{
				job: objTime.job,
				total_hours: 0,
				period_hours: 0,
				prior_period_hours: 0,
				time_entries: []
			};

			if (params.fromFilter && params.toFilter && objTime.date) {
				var dtTimeDate = nlapiStringToDate(objTime.date);
				if (nlapiStringToDate(params.fromFilter) <= dtTimeDate && nlapiStringToDate(params.toFilter) >= dtTimeDate) {
					objJobTime[objTime.job].period_hours = Math.round((objJobTime[objTime.job].period_hours + objTime.durationdecimal) * 100) / 100;
				}
				else
					if (nlapiStringToDate(params.fromFilter) > dtTimeDate) {
						objJobTime[objTime.job].prior_period_hours = Math.round((objJobTime[objTime.job].prior_period_hours + objTime.durationdecimal) * 100) / 100;
					}
			}

			objJobTime[objTime.job].total_hours = Math.round((objJobTime[objTime.job].total_hours + objTime.durationdecimal) * 100) / 100;
			objJobTime[objTime.job].time_entries.push(objTime);
		}
	}
	while (arrResults.length >= 1000);

	return objJobTime;
}

function getResultPopulation(params){

	params = params || {};

	var arrFilters = [];
	if (params.fromFilter) {
		arrFilters.push(['date', 'onorafter', params.fromFilter]);
		arrFilters.push('and');
	}
	if (params.toFilter) {
		arrFilters.push(['date', 'onorbefore', params.toFilter]);
		arrFilters.push('and');
	}
	if (params.jobFilter) {
		arrFilters.push(['formulatext: {customer}', 'contains', params.jobFilter]);
		arrFilters.push('and');
	}
	if (params.customerFilter) {
		arrFilters.push(['customer.entityid', 'contains', params.customerFilter]);
		arrFilters.push('and');
	}
	if (params.reportingTypeFilter) {
		arrFilters.push(['customer.custentityr7jobrevreporttype', 'is', params.reportingTypeFilter]);
		arrFilters.push('and');
	}

	arrFilters.push(['customer.internalid', 'noneof', '@NONE@']);
	arrFilters.push('and');
	arrFilters.push(['customer.custentityr7salesorder', 'noneof', '@NONE@']);
	arrFilters.push('and');
	arrFilters.push(['approvalstatus', 'anyof', [3]]);
	arrFilters.push('and');
	arrFilters.push(['type', 'is', 'A']);

	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid').setSort(false));
	arrColumns.push(new nlobjSearchColumn('customer'));
	arrColumns.push(new nlobjSearchColumn('nonbillabletask', 'projecttask'));

	var savedsearch = nlapiCreateSearch('timebill', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();

	var arrJobIds = [];

	var rowNum = 0;
	do {
		var arrResults = resultSet.getResults(rowNum, rowNum + 1000);
		for (var i = 0; arrResults && i < arrResults.length; i++) {
			rowNum++;

			var customerId = arrResults[i].getValue('customer'); //projectId
			var nonBillableTask = arrResults[i].getValue('nonbillabletask', 'projecttask');
			if (nonBillableTask != 'T' && customerId && arrJobIds.indexOf(customerId) == -1) {
				arrJobIds.push(customerId);
			}

		}
	}
	while (arrResults.length >= 1000);

	return arrJobIds;
}

function getLink(url, id, text, useAmp){
	return '<a class="zc_link" href="' + url + ((useAmp) ? '&' : '?') + 'id=' + id + '" target="_blank">' + text + '</a>';
}

function addCommas(nStr, isCurrency){
	if (!nStr){
		return nStr;
	}
	if (isCurrency && !isNaN(parseFloat(nStr))) {
		nStr = parseFloat((nStr + '').replace(/[^0-9\.]/g,'')).toFixed(2);
	}
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}
