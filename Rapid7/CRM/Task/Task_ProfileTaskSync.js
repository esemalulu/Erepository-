var fields = new Array(
new Array("custeventr7taskbuyer","custentityr7custbuyers"),
new Array("custeventr7taskrecommender","custentityr7custrecommenders"),
new Array("custeventr7tasktester","custentityr7custtesters"),
new Array("custeventr7tasknumberipsinternal","custentityr7internalips"),
new Array("custeventr7tasknumberipsexternal","custentityr7externalips"),
new Array("custeventr7taskexistingwebscanner","custentityr7currentwebscanner"),
new Array("custeventr7taskexistingwebscanrenewdate","custentityr7currentwebscannerrenewal"),
new Array("custeventr7taskexistingdbscanner","custentityr7currentdbscanner"),
new Array("custeventr7taskexistingdbscnrenewdate","custentityr7currentdbscannerrenewal"),
new Array("custeventr7taskapprovedproject","custentityr7approvedproject"),
new Array("custeventr7taskvulnerabilitymanagement","custentityr7custvulnerabilitymgmntprog"),
new Array("custeventr7taskexistingvulnerability","custentityr7currententerprisescanner"),
new Array("custeventr7taskprofileexistingvulnrenew","custentityr7currententerprisescannerdate"),
new Array("custeventr7tasksubjecttopcicompliance","custentityr7custsubjecttopcicompliance"),
new Array("custeventr7tasksubjecttofisma","custentityr7custsubjecttofisma"),
new Array("custeventr7tasksubjecttonerc","custentityr7custsubjecttonerc"),
new Array("custeventr7taskallocatedbudget","custentityr7custallocatedbudget"),
new Array("custeventr7taskexistingpentestsolution","custentityr7currentpenetrationtest"),
new Array("custeventr7taskexistingpentestrenewal","custentityr7currentpenetrationtestdate"),
new Array("custeventr7taskexistingexternalscanner","custentityr7currentexternalscanner"),
new Array("custeventr7taskexistingexternalrenewal","custentityr7currentexternalscannerdate")
);


function afterSubmit(type){
	
	var execContext = nlapiGetContext().getExecutionContext();
	
	nlapiLogExecution('DEBUG','Type & ExecContext',type +" "+execContext);
	
	//if (type != 'delete' && (type == 'create' || type == 'edit' || type=='xedit') && execContext!='csvimport') {
	if (type != 'delete' && (type == 'create' || type == 'edit') && execContext == 'userinterface') {
	
		var taskRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
		
		var formId = taskRecord.getFieldValue('customform');
		nlapiLogExecution('DEBUG', 'Form Id', formId);
		formId = parseInt(formId);
		
		if (formId == 85) {
		
			var customerId = taskRecord.getFieldValue('company');
			
			var allStandardFields = new Array();
			var allStandardValues = new Array();
			for (var i = 0; fields != null && i < fields.length; i++) {
				var fieldType = taskRecord.getField(fields[i][0]).getType();
				nlapiLogExecution('DEBUG', fields[i][0], fieldType);
				try {
					if (fieldType == 'multiselect') {
						var values = taskRecord.getFieldValues(fields[i][0]);
						nlapiLogExecution('DEBUG', 'Values', values);
					//nlapiSubmitField('customer', customerId, fields[i][1], values);
					}
					else 
						if (fieldType = 'select1') {
							nlapiLogExecution('DEBUG', 'Value', taskRecord.getFieldValue(fields[i][0]));
							nlapiSubmitField('customer', customerId, fields[i][1], taskRecord.getFieldValue(fields[i][0]));
						}
						else {
							nlapiLogExecution('DEBUG', 'Value', taskRecord.getFieldValue(fields[i][0]));
							allStandardFields[allStandardFields.length] = fields[i][1];
							allStandardValues[allStandardValues.length] = taskRecord.getFieldValue(fields[i][0]);
						}
				} 
				catch (e) {
					nlapiLogExecution('ERROR', e.name, e.message);
				}
			}
			nlapiLogExecution('DEBUG', 'All Standard Fields', allStandardFields);
			nlapiLogExecution('DEBUG', 'All Standard Values', allStandardValues);
			nlapiSubmitField('customer', customerId, allStandardFields, allStandardValues);
			updateAssociatedContacts(taskRecord);
		}
	}
}

function updateAssociatedContacts(taskRecord){

	var newRecord = taskRecord;
	var testers = newRecord.getFieldValues('custeventr7tasktester');
	var recommenders = newRecord.getFieldValues('custeventr7taskrecommender');
	var buyers = newRecord.getFieldValues('custeventr7taskbuyer');
		
	if((testers!=null && testers.length >=1)|| 
		(buyers!=null && buyers.length>=1) ||
		(recommenders!=null && recommenders.length>=1))
		{	
	
	var contactRoles = new Array();
	
	for(var i=0;testers!=null && i<testers.length;i++){
		contactRoles[testers[i]]=2; //Tester = 2
	}
	for(var i=0;recommenders!=null && i<recommenders.length;i++){
		contactRoles[recommenders[i]]=4; // Recommender =4
		 
	}
	for(var i=0;buyers!=null && i<buyers.length;i++){
		contactRoles[buyers[i]]=1; //Buyer = 1
	}
	
	nlapiLogExecution("DEBUG",'Contact Roles',contactRoles);
	
	for(contact in contactRoles){
		nlapiLogExecution('DEBUG',"Contact:"+contact,'Role:'+contactRoles[contact]);
		//var existingRole = nlapiLookupField('contact',contact,'role');
		var contactRecord = nlapiLoadRecord('contact',contact);
		var existingRole = contactRecord.getFieldValue('contactrole');
		nlapiLogExecution('DEBUG','Existing Role of Contact ',existingRole);
		if(existingRole ==null || existingRole.length <1){
			contactRecord.setFieldValue('contactrole',contactRoles[contact]);
			//nlapiSubmitField('contact',contact,contactRoles[contact]);
			nlapiLogExecution('DEBUG','Submitted Role field for contact ' + contact,contactRoles[contact]);
			var id =nlapiSubmitRecord(contactRecord);
			if(id){
			nlapiLogExecution('DEBUG','Submitted Role field for contact'+ contact,contactRoles[contact]);
			}
			
		}
		else{
			nlapiLogExecution('DEBUG','Did not overwrite existing Role of Contact '+ contact, existingRole);
		}		
	}
	}
}

