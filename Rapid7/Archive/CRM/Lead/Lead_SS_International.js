function filterInternational(type){
	
	if(type='create'){
		
		var rec = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
		var country = rec.getFieldValue('country');
		if(){}	
			rec.setFieldValue('custentityr7internationalleadfirstnotice','T');
			nlapiSubmitRecord(rec);
			
			var emailTemplateId = 282;
			records['recordtype'] = nlapiGetRecordType();
			records['record'] = nlapiGetRecordId();
			var body = nlapiMergeRecord(emailTemplateId, nlapiGetRecordType(), nlapiGetRecordId());
			nlapiSendEmail(sendEmailFrom, contactEmailAddress, body.getName(), body.getValue(), null, null, records);
		}
	}
}
