function suitelet(request, response)
{
	if(request.getMethod() == 'GET')
	{
		var record_id = request.getParameter('record_id');
			log('Record Id: '+record_id);
      var record_type = request.getParameter('record_type');
			log('Record Type: '+record_type);
		var form = nlapiCreateForm('Please Provide Reason for Rejection',true);
		var reject_comments_field = form.addField('custpage_reject_comments', 'text', 'Reject Reason');
		var record_id_field = form.addField('custpage_record_id', 'text', 'Record ID');
			record_id_field.setDisplayType('hidden');
			record_id_field.setDefaultValue(record_id);
      var record_type_field = form.addField('custpage_record_type', 'text', 'Record Type');
			record_type_field.setDisplayType('hidden');
			record_type_field.setDefaultValue(record_type);
      
		form.setScript('customscript_req_reject_btn'); //Client script id
		form.addSubmitButton('Submit');
		response.writePage( form );
	}
	else
	{
        log('POST');
		var record_id = request.getParameter('custpage_record_id');
			log('Record Id: '+record_id);
        var record_type = request.getParameter('custpage_record_type');
			log('Record Type: '+record_type);
		var reject_reason = request.getParameter('custpage_reject_comments');
			log('Reject Reason: '+reject_reason);
			//reject_reason = reject_reason.replace(/(^\s+|\s+$)/g, '');
			log('Reject Reason: '+reject_reason);
		var record_status = 'Rejected';
			log('Record Status: '+record_status);
		var fields = [];
			fields.push('custbody_so_rejereas');
			fields.push('custbody_so_approval_status');
		var values = [];
			values.push(reject_reason);
			values.push(record_status);

		try
		{
          	log('Fields: '+fields);
			log('Values: '+values);
			log('RecordID: '+record_id);
			nlapiSubmitField(record_type,record_id, fields, values); 
		}
		catch(e)
		{
			log('Error Occured: '+e);
		}
		response.write('<html><body><script type="text/javascript">window.onunload = function(e){window.opener.location.reload();}; window.close();</script></body></html>');
	}
}

function log(details)
{
	nlapiLogExecution('DEBUG', 'Reject Reason - Suitelet', details);
}