/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define([
	'N/format',
	'N/log',
	'N/query',
	'N/record',
	'N/runtime',
	'N/search',
	'N/task',
	'N/ui/message',
	'N/ui/serverWidget',
	'N/url'
], function(format, log, query, record, runtime, search, task, message, ui, url) {
	function onRequest(context) {
		const form = buildForm();

		if (context.request.method === 'POST') {
			updateScriptStatus(form, context);
			executeSelectedScript(form, context);
		}

		updateScriptStatusCheckboxes(form);
		addScriptStatusSublist(form);

		context.response.writePage(form);
	}

	function buildForm() {
		const form = ui.createForm({ title: 'Manage Coupa Integration' });
		form.addSubmitButton({ label: 'Submit' });
		addRefreshButton(form);

		form.addField({
			id: 'custpage_disable_invoice_integration',
			type: ui.FieldType.CHECKBOX,
			label: 'Disable Invoice Integration (C => NS)'
		}).padding = 1;

		form.addField({
			id: 'custpage_disable_coupapay_integration',
			type: ui.FieldType.CHECKBOX,
			label: 'Disable CoupaPay Integration (C => NS)'
		});

		form.addField({
			id: 'custpage_disable_payment_integration',
			type: ui.FieldType.CHECKBOX,
			label: 'Disable Payment Integration (NS => C)'
		});

		addScriptExecutionDropdown(form);

		// Hidden field to force previous fields into a single column
		form.addField({
			id: 'custpage_new_column',
			type: ui.FieldType.INLINEHTML,
			label: 'New Column'
		}).updateBreakType({ breakType: ui.FieldBreakType.STARTCOL });

		return form;
	}

	function updateScriptStatusCheckboxes(form) {
		const scriptStatusMap = getScriptStatusMap();

		form.getField({ id: 'custpage_disable_invoice_integration' })
			.defaultValue = scriptStatusMap['customscript_invoicescheduled'];

		form.getField({ id: 'custpage_disable_coupapay_integration' })
			.defaultValue = scriptStatusMap['customscript_mr_coupa_completed_pymts'];

		form.getField({ id: 'custpage_disable_payment_integration' })
			.defaultValue = scriptStatusMap['customscript_invoice_payment'];

		const scriptIsDisabled = Object.values(scriptStatusMap).some(value => value === 'T');

		if (scriptIsDisabled) {
			form.addPageInitMessage({
				type: message.Type.INFORMATION,
				title: 'Scripts Disabled',
				message: 'Some Coupa integration scripts are currently disabled.'
			});
		}
	}

	function updateScriptStatus(form, context) {
		const disableInvoiceIntegration = context.request.parameters['custpage_disable_invoice_integration'] === 'T';
		const disableCoupaPayIntegration = context.request.parameters['custpage_disable_coupapay_integration'] === 'T';
		const disablePaymentIntegration = context.request.parameters['custpage_disable_payment_integration'] === 'T';

		const scriptIdMap = getScriptIdMap();

		try {
			record.submitFields({
				type: 'script',
				id: scriptIdMap['customscript_invoicescheduled'],
				values: {
					isinactive: disableInvoiceIntegration ? 'T' : 'F'
				}
			});

			record.submitFields({
				type: 'script',
				id: scriptIdMap['customscript_mr_coupa_completed_pymts'],
				values: {
					isinactive: disableCoupaPayIntegration ? 'T' : 'F'
				}
			});

			record.submitFields({
				type: 'script',
				id: scriptIdMap['customscript_invoice_payment'],
				values: {
					isinactive: disablePaymentIntegration ? 'T' : 'F'
				}
			});
		} catch (ex) {
			form.addPageInitMessage({
				type: message.Type.ERROR,
				title: 'Error Updating Script',
				message: 'There was an error updating the scripts: ' + ex.message
			});
		}
	}

	function executeSelectedScript(form, context) {
		const selectedScript = context.request.parameters['custpage_execute_script'];

		if (!selectedScript) {
			return;
		}

		const [scriptId, deploymentId] = selectedScript.split('-');

		const taskType = scriptId === 'customscript_mr_coupa_completed_pymts'
			? task.TaskType.MAP_REDUCE
			: task.TaskType.SCHEDULED_SCRIPT;

		try {
			task.create({ taskType, scriptId, deploymentId }).submit();

			form.addPageInitMessage({
				type: message.Type.CONFIRMATION,
				title: 'Script Start',
				message: 'The script has been started successfully.'
			});
		} catch (ex) {
			form.addPageInitMessage({
				type: message.Type.ERROR,
				title: 'Script Execution Error',
				message: ex.message
			});
		}
	}

	function addScriptStatusSublist(form) {
		var sublist = form.addSublist({
			id: 'custpage_script_sublist',
			label: 'Coupa Scripts Active in the Last 15 Minutes',
			type: ui.SublistType.LIST
		});

		sublist.addField({
			id: 'custpage_script_name',
			type: ui.FieldType.TEXT,
			label: 'Script'
		});

		sublist.addField({
			id: 'custpage_deployment_name',
			type: ui.FieldType.TEXT,
			label: 'Deployment'
		});

		sublist.addField({
			id: 'custpage_start_time',
			type: ui.FieldType.TEXT,
			label: 'Start'
		});

		sublist.addField({
			id: 'custpage_end_time',
			type: ui.FieldType.TEXT,
			label: 'End'
		});

		sublist.addField({
			id: 'custpage_map_reduce_stage',
			type: ui.FieldType.TEXT,
			label: 'M/R Stage'
		});

		sublist.addField({
			id: 'custpage_status',
			type: ui.FieldType.TEXT,
			label: 'Status'
		});

		const recentScripts = getRecentlyActiveScriptInfo();

		recentScripts.forEach((script, index) => {
			sublist.setSublistValue({
				id: 'custpage_script_name',
				value: script.scriptName,
				line: index
			});

			sublist.setSublistValue({
				id: 'custpage_deployment_name',
				value: script.deploymentName,
				line: index
			});

			sublist.setSublistValue({
				id: 'custpage_start_time',
				value: script.startTime,
				line: index
			});

			sublist.setSublistValue({
				id: 'custpage_end_time',
				value: script.endTime,
				line: index
			});

			sublist.setSublistValue({
				id: 'custpage_map_reduce_stage',
				value: script.mapReduceStage,
				line: index
			});

			sublist.setSublistValue({
				id: 'custpage_status',
				value: script.status,
				line: index
			});
		});
	}

	function addScriptExecutionDropdown(form) {
		const scriptDeployments = [
			{ value: '', text: '' },
			{ value: 'customscript_invoicescheduled-customdeploy_r7_coupa_invoice_dyn_adhoc', text: 'Coupa Invoice Script' },
			{ value: 'customscript_invoice_payment-customdeploy_r7_coupa_payment_adhoc', text: 'Coupa Payment Script' },
			{ value: 'customscript_mr_coupa_completed_pymts-customdeploy_r7_coupapay_adhoc', text: 'CoupaPay Integration' }
		];

		const field = form.addField({
			id: 'custpage_execute_script',
			type: ui.FieldType.SELECT,
			label: 'Execute Script'
		});

		field.padding = 1;

		scriptDeployments.forEach(deployment => field.addSelectOption(deployment));
	}

	function addRefreshButton(form) {
		const scriptUrl = url.resolveScript({
			scriptId: runtime.getCurrentScript().id,
			deploymentId: runtime.getCurrentScript().deploymentId
		});

		form.addButton({
			id: 'cuspage_refresh_button',
			label: 'Refresh',
			functionName: `window.open("${scriptUrl}", "_self")`
		});
	}

	function getScriptIdMap() {
		var results = getScriptInfo();

		return (results || []).reduce((scriptIdMap, result) => {
			const scriptId = result.getValue({ name: 'scriptid' }).toLowerCase();
			const id = result.id;

			scriptIdMap[scriptId] = id;

			return scriptIdMap;
		}, {});
	}

	function getScriptStatusMap() {
		var results = getScriptInfo();

		return (results || []).reduce((scriptStatusMap, result) => {
			const scriptId = result.getValue({ name: 'scriptid' }).toLowerCase();
			const isInactive = result.getValue({ name: 'isinactive' }) ? 'T' : 'F';

			scriptStatusMap[scriptId] = isInactive;

			return scriptStatusMap;
		}, {});
	}

	function getScriptInfo() {
		return search.create({
			type: 'script',
			filters: [
				['isinactive', 'any', null],
				'and', [
					['scriptid', 'is', 'customscript_invoicescheduled'],
					'or', ['scriptid', 'is', 'customscript_invoice_payment'],
					'or', ['scriptid', 'is', 'customscript_mr_coupa_completed_pymts']
				]
			],
			columns: [
				'scriptid',
				'isinactive'
			]
		}).run().getRange({ start: 0, end: 1000 });
	}

	function getRecentlyActiveScriptInfo() {
		var results = search.create({
			type: 'scheduledscriptinstance',
			filters: [
				[
					['script.scriptid', 'is', 'customscript_invoicescheduled'],
					'or', ['script.scriptid', 'is', 'customscript_invoice_payment'],
					'or', ['script.scriptid', 'is', 'customscript_mr_coupa_completed_pymts']
				],
				'and',
				[
					['enddate', 'isempty', ''],
					'or', ['enddate', 'onorafter', 'minutesago15']
				]
			],
			columns: [
				'script.name',
				'scriptdeployment.title',
				'startdate',
				{ name: 'enddate', sort: search.Sort.DESC },
				'mapreducestage',
				'status'
			]
		}).run().getRange({ start: 0, end: 1000 });

		return (results || []).map(result => {

			return {
				scriptName: result.getValue({ name: 'name', join: 'script' }),
				deploymentName: result.getValue({ name: 'title', join: 'scriptdeployment' }),
				mapReduceStage: result.getValue({ name: 'mapreducestage' }) || ' ',
				status: result.getValue({ name: 'status' }),
				startTime: formatDateTimeFromSearchResults(result.getValue({ name: 'startdate' })),
				endTime: formatDateTimeFromSearchResults(result.getValue({ name: 'enddate' }))
			};
		});
	}

	/**
	 * Start and End dates are returned as strings in the server's time zone (PST8PDT).
	 * Parse these strings and format them in the user's local time zone.
	 *
	 * @param dateTime
	 * @returns {string}
	 */
	function formatDateTimeFromSearchResults(dateTime) {
		return format.format({
			type: format.Type.DATETIME,
			value: format.parse({
				type: format.Type.DATETIME,
				value: dateTime,
				timezone: format.Timezone.AMERICA_LOS_ANGELES
			})
		});
	}

	return {
		onRequest
	};
});