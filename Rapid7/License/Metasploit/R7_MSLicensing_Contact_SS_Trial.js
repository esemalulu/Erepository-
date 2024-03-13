/**
 *  User Event (ue)<br/>
 * 
 *  Applies to Contact.
 *  
 *  
 * existing:<br/>
 * filename: ./Metasploit Licensing/R7_MSLicensing_Contact_SS_Trial.js  ; 34641<br/>
 * script id: customscriptr7_mslicensing_contact_ss_tr ; 175 ; R7_MSLicensing_Contact_SS_Trial<br/>
 * deploy id: <br/>
 *  customdeployr7_mslicensing_contact_ss  ; 175 ; Applies to Contact; R7_MSLicensing_Contact_SS_Trial <br/>
 *
 * <br/>
 * proposed:<br/>
 * filename: ./Metasploit Licensing/r7_ue_mslicensingcontacttrial.js<br/>
 * script id: customscript_r7_ue_mslicensingcontacttrial<br/>
 * deploy id: customdeploy_r7_ue_mslicensingcontacttrial<br/>
 * 
 * 
 * @class r7_ue_MSLicensingContactTrial_DEAD
 * 
 */

/**
 * @method createLicense
 * @param {String} type
 */
function createLicense(type){

    var executionContext = nlapiGetContext().getExecutionContext();
    
    nlapiLogExecution("DEBUG", 'Type, RecordType,Id, ExecutionContext', type + ' ' + nlapiGetRecordType() + ' ' + nlapiGetRecordId() + ' ' + executionContext);
    
    /* Does not run for mass-updates or csvimports according to SB, DZ, 2/12 review */
    if ((type == 'create' || type == 'edit') && executionContext != 'csvimport') {
    
    
        //Loads the contact record and obtains values	
        var values = new Array();
        var rec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
        values['custentityr7contactmslicensetemplate'] = rec.getFieldValue('custentityr7contactmslicensetemplate');
        values['company'] = rec.getFieldValue('company');
        values['email'] = rec.getFieldValue('email');
        
        //The metasploit License Template
        nlapiLogExecution('DEBUG', 'License Template', values['custentityr7contactmslicensetemplate']);
        
        nlapiLogExecution('DEBUG', 'Company Name', values['company']);
        
        //If custentityr7contactmslicensetemplate is filled in
        //this field can only be populated by the website form
        //Only run the main part of the script if this field is populated.
        
        if (values['custentityr7contactmslicensetemplate'] != '' && values['custentityr7contactmslicensetemplate'] != null &&
        values['email'] != '' &&
        values['email'] != null &&
        values['company'] != '' &&
        values['company'] != null) {
        
            var templateInternalId = values['custentityr7contactmslicensetemplate'];
            var templateFieldInvalid = false;
            try {
                var templateRecord = nlapiLoadRecord('customrecordr7mslicensemarketingtemplate', templateInternalId);
            } 
            catch (err) {
                var templateFieldInvalid = true;
            }
            
            
            legitimateEmailDomain = checkLegitimateEmailDomain(values['email']);
            legitimateEmailExtension = checkLegitimateEmailExtension(values['email']);
            
            if (!legitimateEmailDomain || !legitimateEmailExtension) {
                //Resubmitting the contact record field 'custentityr7contactmslicensetemplate' to blank
                nlapiSubmitField('contact', rec.getId(), 'custentityr7contactmslicensetemplate', '');
                
				// Loading the email Template for declined emails
				var declinedTemplateId = templateRecord.getFieldValue('custrecordr7mslicensetempemaildeclined');				 
                
				// Resolving sendEmailFrom
				var sendEmailFrom = templateRecord.getFieldValue('custrecordr7mslicensetempsendemailfrom');
				var salesRepEmail = nlapiLookupField('customer', rec.getFieldValue('company'), 'salesrep');
				var owner = templateRecord.getFieldValue('custrecordr7mslicensetempsendemailfrom');
				
				var records = new Array();
                records['recordtype'] = 'contact';
                records['record'] = rec.getId();
				
				var subject, body;
				var templateVersion = nlapiLoadRecord('emailtemplate', declinedTemplateId).getFieldValue('templateversion');
		
				if(templateVersion != 'FREEMARKER') { // CRMSDK Note: this is being deprecated.
					var merge = nlapiMergeRecord(declinedTemplateId, 'contact', rec.getId());
					subject = merge.getName();
					body = merge.getValue();
				}
				else { // the new FREEMARKER
					var emailMerger = nlapiCreateEmailMerger(declinedTemplateId);
					emailMerger.setEntity('contact', rec.getId());
		
					var mergeResult = emailMerger.merge();
					subject = mergeResult.getSubject();
					body = mergeResult.getBody();
				}

                nlapiSendEmail(salesRepEmail, values['email'], subject, body, null, null, records);

            }
            else {
            
                var companyDetails = nlapiLookupField('customer', values['company'], new Array('companyname'));
                if (companyDetails['companyname'] == '' ||
                companyDetails['companyname'] == null ||
                companyDetails['companyname'] == 'null') {
                    nlapiSubmitField('customer', values['company'], 'companyname', 'Null Company');
                }
                
                nlapiLogExecution('DEBUG', 'License Template', values['custentityr7contactmslicensetemplate']);
                
                var contactId = nlapiGetRecordId();
                var companyId = values['company'];
                
    
                if (!templateFieldInvalid) {
                    var licenseRecordId = templateRecord.getFieldValue('custrecordr7mslicensetempmsrecord')
                    var days = templateRecord.getFieldValue('custrecordr7mslicensetempexpirationdays');
					             
                    var mspltLicenseRecord = nlapiCopyRecord('customrecordr7metasploitlicensing', licenseRecordId);
                    mspltLicenseRecord.setFieldValue('custrecordr7mslicensecustomer', companyId);
                    mspltLicenseRecord.setFieldValue('custrecordr7mslicensecontact', nlapiGetRecordId());
                    mspltLicenseRecord.setFieldValue('custrecordr7mslicenseexpirationdate', nlapiDateToString(nlapiAddDays(new Date(), days)));
                    mspltLicenseRecord.setFieldValue('custrecordr7mslicenseopportunity', null);
                    mspltLicenseRecord.setFieldValue('custrecordr7mslicensesalesorder', null);
                    mspltLicenseRecord.setFieldValue('custrecordr7mslicenseserialnumber', null);
                    mspltLicenseRecord.setFieldValue('custrecordr7msproductkey', null);
                    mspltLicenseRecord.setFieldValue('custrecordr7mslicensemarketingtemplate', templateInternalId);
                    nlapiSubmitRecord(mspltLicenseRecord, true, false);
                }
                
                //Setting custentityr7contactmslicensetemplate back to ''.
                nlapiSubmitField('contact', contactId, 'custentityr7contactmslicensetemplate', '');
                
                var name = nlapiGetContext().getName();
                name = name.toLowerCase();
                nlapiLogExecution('DEBUG', 'The person who triggersctipt', name);
                if (name != null && name != 'null') {
                    nlapiScheduleScript(176);
                }
            }
        }
    }
}

function checkLegitimateEmailDomain(email){
	//If the metasploit license is being created by a userinterface user
	//everything goes. No email validation on domain.
	if(nlapiGetContext().getExecutionContext()=='userinterface'){
		return true;
	}
		
    var domain = email.substr(email.indexOf('@', 0) + 1);
    nlapiLogExecution('DEBUG', 'Domain Parsed', domain);
    var searchFilters = new Array(new nlobjSearchFilter('name', null, 'is', domain), new nlobjSearchFilter('name', null, 'is', domain));
    var searchResults = nlapiSearchRecord('customrecordr7domainnames', null, searchFilters);
    if (searchResults != null && searchResults.length >= 1) {
        return false;
    }
    else {
        return true;
    }
    return true;
}

function checkLegitimateEmailExtension(email){
    //If the metasploit trial license is being created by a userinterface user
	//everything goes. No email validation on extension.
	if(nlapiGetContext().getExecutionContext()=='userinterface'){
		return true;
	}
	
	var domainExtension = email.substr(email.lastIndexOf('.'));
    nlapiLogExecution('DEBUG', 'Domain Extension Found', domainExtension);
    
    var searchFilters = new Array(new nlobjSearchFilter('name', null, 'is', domainExtension), new nlobjSearchFilter('custrecordr7domainextensioncategory', null, 'is', 2));
    
    var searchResults = nlapiSearchRecord('customrecordr7domainextensions', null, searchFilters);
    if (searchResults != null && searchResults.length >= 1) {
        return false;
    }
    else {
        return true;
    }
    return true;
}



