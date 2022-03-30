/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Mar 2016     Fan
 *
 */

/**
 * The recordType (quote) corresponds to the "Quote" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function userEventBeforeLoad(type, form, request){
	if (type == 'view' || type == 'edit') {
		if (nlapiGetFieldValue('approved') == 'T' && nlapiGetFieldValue('custbody_es_approval_status') != '2') {
			var field = form.addField('custpage_hideappro', 'inlinehtml');
			try {
				var html = '<script type="text/javascript">';
				nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custbody_es_approval_status', '2');
				html += 'location.reload(true);';
				field.setDefaultValue(html);
			} catch (e) {
			}
		}

	}
	if (type == 'view') {
		var url = nlapiResolveURL('SUITELET', 'customscript_es_sl_rej_appro_journal', 'customdeploy1');
		if (nlapiGetFieldValue('custbody_es_approval_status') == '1' ||
				(!nlapiGetFieldValue('custbody_es_approval_status') && 
						nlapiGetFieldValue('approved') == 'F')) { //Pending Approval
			form.addButton('custpage_approval',
				'Approve', ('(' + 
				function(){
					window.open('URL', '_self');
				}
				+ ')()').replace(/"/g,'\'').replace(/URL/g, url + '&esA=approve&esId=' + nlapiGetRecordId()));
			form.addButton('custpage_reject',
					'Reject', ('(' + 
				function(){
					window.open('URL', '_self');
				}
				+ ')()').replace(/"/g,'\'').replace(/URL/g, url + '&esA=reject&esId=' + nlapiGetRecordId()));
		}
	} else if(type == 'edit' || type == 'create') {
		
		if (type == 'create') {
			nlapiSetFieldValue('approved', 'F');
		}
		//Do not let approved mess up
		form.getField('approved').setDisplayType('inline');
	} 
	//Add void button
	if (type == 'view' && nlapiGetFieldValue('approved') == 'T' &&
			!nlapiGetFieldValue('custbody_es_void_transaction')) {
		var results = nlapiSearchRecord('journalentry', null, 
				['custbody_es_void_transaction', 'is', nlapiGetRecordId()]);
		if (!results || !results[0]) {
			var url = nlapiResolveURL('SUITELET', 'customscript_es_sl_void_journal', 'customdeploy1');
			form.addButton('custpage_void',
					'Reverse', ('(' + 
				function(){
					window.open('URL', '_self');
				}
				+ ')()').replace(/"/g,'\'').replace(/URL/g, url + '&esId=' + nlapiGetRecordId()));
		} else {
			var field = form.addField('custpage_void_by', 'select', 'Void By', 'journalentry');
			field.setDisplayType('inline');
			field.setDefaultValue(results[0].getId());
		}
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function userEventBeforeSubmit(type){
	if (type == 'edit' || type == 'create'|| type == 'xedit') {
		if (nlapiGetFieldValue('approved') == 'T') {
			nlapiSetFieldValue('custbody_es_approval_status', '2'); //Approved
		}
		if (type == 'edit' || type == 'create') {
			var oldRecord = nlapiGetOldRecord();
			if (nlapiGetFieldValue('custbody_es_approval_status') == '3'  && 
					oldRecord && 
					oldRecord.getFieldValue('custbody_es_approval_status') == '3') {
				nlapiSetFieldValue('custbody_es_approval_status', '1');
				nlapiSetFieldValue('approved', 'F');
			}
			
			if (nlapiGetFieldValue('custbody_es_approval_status') == '2' && 
					oldRecord && 
					oldRecord.getFieldValue('custbody_es_approval_status') == '2') {
				nlapiSetFieldValue('custbody_es_approval_status', '1');
				nlapiSetFieldValue('approved', 'F');
			}
		}
	}
}
