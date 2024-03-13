/*
 * @author efagone
 * 
 * MB: 5/18/2015 - Change 284 - #4261 - Add new field to task
 * 		Added Task Infer Score stamping to stampOriginalMktoLeadRating function
 */

function beforeSubmit(type){

	try {
	
		if (type == 'create' || type == 'edit' || type == 'xedit' || type == 'copy') {
			this.oldRecord = nlapiGetOldRecord();
			this.updatedFields = nlapiGetNewRecord().getAllFields();
			
			stampOriginalMktoLeadRating();
			stampDateAssigned(type);
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Problem task before submit', e);
	}
}


function stampOriginalMktoLeadRating(){

	try {
		var taskOriginalContactLeadRating = getNewFieldValue('custeventr7taskmarketoleadratingcontact');
		var taskOriginalInferScore = getNewFieldValue('custeventr7inferscoretask');
		// Only stamp on first time setting fields, which is when original Marketo Lead Rating Contact is blank.
		if (taskOriginalContactLeadRating == null || taskOriginalContactLeadRating == '' || taskOriginalInferScore == null || taskOriginalInferScore == '') {
			var contactId = getNewFieldValue('contact');			
			if (contactId != null && contactId != '') {
				// Look up fields from the contact record associated with the task
				var fieldsFromContact = nlapiLookupField('contact', contactId, new Array('custentityr7marketoleadrating','custentityr7inferscore'));
				var contactLeadRating = fieldsFromContact.custentityr7marketoleadrating;
				var contactInferScore = fieldsFromContact.custentityr7inferscore;

				if (taskOriginalContactLeadRating == null || taskOriginalContactLeadRating == ''){
					nlapiLogExecution('DEBUG', 'Stamping leadRating/inferScore', contactLeadRating);
					nlapiSetFieldValue('custeventr7taskmarketoleadratingcontact', contactLeadRating);
				}
				/*
				 * MB: 5/18/2015 - Change 284 - #4261 - Add new field to task
				 * 		Stamp Task Infer Score   
				 */
				if (taskOriginalInferScore == null || taskOriginalInferScore == '') {
					nlapiLogExecution('DEBUG', 'contactInferScoree', contactInferScore);
					nlapiSetFieldValue('custeventr7inferscoretask', contactInferScore);
				}		
			}
		}	
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Problem task before submit - stampOriginalMktoLeadRating', e);
	}
}

function stampDateAssigned(type){

	try {
		var status = getNewFieldValue('status');
		if (status == 'COMPLETE'){
			nlapiLogExecution('DEBUG', 'Already Completed', 'returning');
			return;
		}
		
		var newAssignedTo = getNewFieldValue('assigned');
		
		if (newAssignedTo != null && newAssignedTo != '') {
			if (type == 'create' || type == 'copy') {
				nlapiLogExecution('DEBUG', 'Setting new date assigned', 'new task');
				nlapiSetFieldValue('custeventr7taskdateassigned', nlapiDateToString(new Date()));
			}
			
			if (oldRecord != null && newAssignedTo != oldRecord.getFieldValue('assigned')) {
				nlapiLogExecution('DEBUG', 'Setting new date assigned', 'new assigned');
				nlapiSetFieldValue('custeventr7taskdateassigned', nlapiDateToString(new Date()));
			}
			
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Problem task before submit - stampDateAssigned', e);
	}
}

function getNewFieldValue(fieldId){
	// if the record is direct list edited or mass updated, run the script
	if (type == 'xedit') {
		// loop through the returned fields
		for (var i = 0; i < updatedFields.length; i++) {
			//nlapiLogExecution('DEBUG', 'field', updatedFields[i]);
			if (updatedFields[i] == fieldId) {
				return nlapiGetFieldValue(fieldId);
			}
		}
		return oldRecord.getFieldValue(fieldId);
	}
	else {
		return nlapiGetFieldValue(fieldId);
	}
}