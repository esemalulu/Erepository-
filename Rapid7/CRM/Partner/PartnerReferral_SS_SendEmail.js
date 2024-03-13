
var EMAIL_TEMPLATE_ID = 274;

function sendEmail(type){
	
	var record = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
	var checkBox = record.getFieldValue('custrecordr7partnerservrefsendemail');
	
	nlapiLogExecution('DEBUG','In here','yup');
	
	if(type!='delete'){
	
	if (checkBox == 'T') {
	
		var partnerId = record.getFieldValue('custrecordr7partnerservrefpartner');
		
		if (partnerId != null) {
		
			var contactId = nlapiLookupField('partner', partnerId, 'custentityr7partnerservicereferralcont');
			
			if (contactId != null) {
				var email = nlapiLookupField('contact', contactId, 'email');
				
				nlapiLogExecution('DEBUG', 'Email', email);
				
				var records = new Array();
				records['recordtype'] = nlapiGetRecordType();
				records['record'] = nlapiGetRecordId();
				nlapiLogExecution('DEBUG', 'Email', email);
				//email = 'derek_zanga@rapid7.com';

				var subject, body;
				var templateVersion = nlapiLoadRecord('emailtemplate', EMAIL_TEMPLATE_ID).getFieldValue('templateversion');
				nlapiLogExecution('AUDIT', 'templateVersion', templateVersion);
		
				if(templateVersion != 'FREEMARKER') { // CRMSDK Note: this is being deprecated.
					var merge = nlapiMergeRecord(EMAIL_TEMPLATE_ID, 'customrecordr7partnerleadreferral', nlapiGetRecordId());
					subject = merge.getName();
					body = merge.getValue();
				}
				else { // the new FREEMARKER
					var emailMerger = nlapiCreateEmailMerger(EMAIL_TEMPLATE_ID);
					emailMerger.setCustomRecord('customrecordr7partnerleadreferral', nlapiGetRecordId());

					var mergeResult = emailMerger.merge();
					subject = mergeResult.getSubject();
					body = mergeResult.getBody();
				}
				var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
				nlapiSendEmail(adminUser, email, subject, body, null, 'caitlin_swofford@rapid7.com', records);
				
				nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'custrecordr7partnerservrefsendemail', 'F');
				
			}
			
		}
	}
	}
}
