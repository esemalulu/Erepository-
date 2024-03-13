//This script through before Submit also prevents orphaning contacts

function beforeSubmit(type){
	
	nlapiLogExecution('DEBUG','In here','yup');
	
	var rec = nlapiGetNewRecord()
	
	var ctx = nlapiGetContext().getExecutionContext();
	
	nlapiLogExecution('DEBUG','Execution Context',ctx);
	//only when triggered from the userinterface
	
	nlapiLogExecution('DEBUG','Company',rec.getFieldValue('company'));
		
}


// This script also updates customer email, and phone if not present
function afterSubmit(type){
	
	var userId = nlapiGetUser();
	var ctx = nlapiGetContext();
	//nlapiLogExecution('DEBUG','Execution Context',ctx.getExecutionContext());
	
	if(type=='xedit'||type=='edit'||type=='create'){
		
		
		if (nlapiGetContext().getRole() == '1046') {
			updateCustomerEmailAndPhone();
		}
		
		nlapiLogExecution('DEBUG','type,Record Type,id,executionContext',type+ ' '+nlapiGetRecordType()+" "+ nlapiGetRecordId()+ ' '+ctx.getExecutionContext());
		
		var phoneNo = nlapiLookupField(nlapiGetRecordType(),nlapiGetRecordId(),'phone');
		if (phoneNo != null && phoneNo != '') {
			var newPhoneNo = phoneNo.replace(/[\(\)-]/g, "");
			newPhoneNo = newPhoneNo.replace(/\s/, "");
			newPhoneNo = newPhoneNo.replace(/^[0|1]+/,"");
			nlapiLogExecution('DEBUG',"PhoneNumber & length",newPhoneNo + " " + newPhoneNo.length);
			if (newPhoneNo != null && newPhoneNo.length >=10) {
				var areaCode = newPhoneNo.substring(0, 3);
				nlapiLogExecution("DEBUG", 'Old/new/areaCode Phone No', phoneNo + " " + newPhoneNo + " " + areaCode);
				var searchFilters = new Array(new nlobjSearchFilter("name", null, "startswith", areaCode));
				
				var searchColumns = new Array(new nlobjSearchColumn("custrecordr7areacodestimezone"));
				
				var results = nlapiSearchRecord('customrecordr7areacodes', null, searchFilters, searchColumns);
				if (results != null && results[0] != null) {
					var timezone = results[0].getValue(searchColumns[0]);
					nlapiLogExecution('DEBUG', 'Timezone for areaCode ' + areaCode, timezone);
					nlapiSubmitField('contact', nlapiGetRecordId(), 'custentityr7addresstimezone', timezone);
					nlapiLogExecution("DEBUG","Submitted field",'successfully to'+ nlapiGetRecordType());
				}
				else {
					nlapiLogExecution('DEBUG', 'No timezone found for Area Code', areaCode);
				}
			}
		}	
	}
		
}

function updateCustomerEmailAndPhone(){

	var fieldsToBeUpdated = new Array();
	var fieldValuesToBeSubmitted = new Array();
	
	var contactFields = nlapiLookupField('contact', nlapiGetRecordId(), new Array('company', 'email', 'phone'));
	
	nlapiLogExecution('DEBUG', 'Contact CompanyId', contactFields['company']);
	nlapiLogExecution('DEBUG', 'Contact Phone', contactFields['phone']);
	nlapiLogExecution('DEBUG', 'Contact Email', contactFields['email']);
	
	var customerFields = nlapiLookupField('customer', contactFields['company'], new Array('email', 'phone', 'custentityr7customerautoscrubfreemaildup'));
	
	//There are some values in the customer field
	if (customerFields != null) {
		
		var customerEmail = customerFields['email'];
		var customerAutoScrubDup = customerFields['custentityr7customerautoscrubfreemaildup'];
		
		//The email field on the customer is empty or null
		if ((customerEmail == null || customerEmail == '') && (customerAutoScrubDup == '' && customerAutoScrubDup == null)) {
			fieldsToBeUpdated[fieldsToBeUpdated.length] = 'email';
			var companyEmail = formatContactEmailAsCompanyEmail(contactFields['email']);
			fieldValuesToBeSubmitted[fieldValuesToBeSubmitted.length] = companyEmail;
		}
		
		//The phone field on the customer is empty or null
		if (customerFields['phone'] == null || customerFields['phone'] == '') {
			fieldsToBeUpdated[fieldsToBeUpdated.length] = 'phone';
			fieldValuesToBeSubmitted[fieldValuesToBeSubmitted.length] = contactFields['phone'];
		}
		
		if (fieldValuesToBeSubmitted == null || fieldValuesToBeSubmitted.length < 1) 
			return;
		
		//Submitting fields
		nlapiSubmitField('customer', contactFields['company'], fieldsToBeUpdated, fieldValuesToBeSubmitted);
		
	}
	
}

function formatContactEmailAsCompanyEmail(email){
	
    if (email == null) 
        return null;
    if (email.indexOf('@') == -1) 
        return null;
    
	var domain = email.substr(email.indexOf('@', 0));
	return 'info' + domain;	
}
