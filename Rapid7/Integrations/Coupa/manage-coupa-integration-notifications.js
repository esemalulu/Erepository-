/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 */
define([
	'N/email',
	'N/log',
	'N/runtime',
	'N/search',
	'N/url'
], function(email, log, runtime, search, url) {
	function execute() {
		const scriptsAreDisabled = getDisabledCoupaScripts();

		if (scriptsAreDisabled) {
			sendReminderEmail();
		}
	}

	function getDisabledCoupaScripts() {
		var results = search.create({
			type: 'script',
			filters: [
				['isinactive', 'is', 'T'],
				'and', [
					['scriptid', 'is', 'customscript_invoicescheduled'],
					'or', ['scriptid', 'is', 'customscript_invoice_payment'],
					'or', ['scriptid', 'is', 'customscript_mr_coupa_completed_pymts']
				]
			]
		}).run().getRange({ start: 0, end: 1000 });

		return results && results.length > 0;
	}

	function sendReminderEmail() {
		const NETSUITE_ADMIN = 106223954;
		const recipients = runtime.getCurrentScript().getParameter({ name: 'custscript_coupa_int_email_recipients' });

		if (!recipients) {
			return;
		}

		const suiteletUrl = url.resolveScript({
			scriptId: 'customscript_r7_manage_coupa_integration',
			deploymentId: 'customdeploy_r7_manage_coupa_integration'
		});

		const body = '<div><p>One or more Coupa integration scripts are currently disabled.<br /></p>'
				   + `<p>Please visit the <a href="${suiteletUrl}">Coupa Integration Management</a> page to enable them when you are ready.</p>`
				   + '</div>'

		email.send({
			author: NETSUITE_ADMIN,
			subject: 'Coupa Integration Scripts are Disabled',
			recipients,
			body
		});
	}

	return {
		execute
	};
});
