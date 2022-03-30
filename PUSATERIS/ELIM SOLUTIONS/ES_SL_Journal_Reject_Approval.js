/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Mar 2016     Fan
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function suitelet(request, response){
	if (request.getMethod() == 'GET') {
		var type = request.getParameter('esA');
		var id = request.getParameter('esId');
		nlapiLogExecution('DEBUG', 'type', type);
		nlapiLogExecution('DEBUG', 'id', id);
		if (type == 'reject') {
			var form = nlapiCreateForm('Input Reject Reason');
			var reasonField = form.addField('custpage_reason', 'longtext', 'Reject Reason');
			reasonField.setMandatory(true);
			var keyField = form.addField('custpage_key', 'integer', id);
			keyField.setDisplayType('hidden');
			keyField.setDefaultValue(id);
			form.addSubmitButton('Submit');

			var url = nlapiResolveURL('RECORD', 'journalentry', id);
			form.addButton('custpage_submit', 'Cancel', "window.open('" + url + "','_self')");
			response.writePage(form);
		} else if (type == 'approve') {
			nlapiSubmitField('journalentry', id, ['custbody_es_approval_status', 'approved'], ['2', 'T']);
			nlapiLogExecution('DEBUG', 'nlapiSubmitField', 'Done');
			response.sendRedirect('RECORD', 'journalentry', id);
		} 
	} else if (request.getMethod() == 'POST') {
		var id = request.getParameter('custpage_key');
		var reason = request.getParameter('custpage_reason');
		nlapiSubmitField('journalentry', id, ['custbody_es_approval_status'], ['3']);
		
		//sending Email
		var author = nlapiGetContext().getUser();
		var entityId = nlapiLookupField('journalentry', id, 'createdby');
		var entityType = null;
		if (entityId) {
			entityType = nlapiLookupField('entity', entityId, 'type');
		}
		var templateId  = nlapiGetContext().getSetting('SCRIPT', 'custscript_es_jra_email_template');
		nlapiLogExecution('DEBUG', 'author', author);
		nlapiLogExecution('DEBUG', 'approver', entityId);
		nlapiLogExecution('DEBUG', 'templateId', templateId);
		if (author && entityId && templateId) {
			var emailMerger = nlapiCreateEmailMerger(templateId);
			emailMerger.setTransaction(id);
			emailMerger.setEntity(entityType, entityId);
			var mergeResult = emailMerger.merge();
			var body = mergeResult.getBody();
			body = body.replace(/{{REJECTREASON}}/, reason);
			nlapiSendEmail(author, entityId, mergeResult.getSubject(), body, null, null, {
				transaction : id,
				entity : entityId
			});
			nlapiLogExecution('DEBUG', 'nlapiSendEmail', mergeResult.getSubject());
		}
		response.sendRedirect('RECORD', 'journalentry', id);
	}
}
