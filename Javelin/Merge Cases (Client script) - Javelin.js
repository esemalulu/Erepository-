function MergeClicked() {
	// Read this: https://usergroup.netsuite.com/users/showthread.php?t=19144&highlight=case+messages
	// for attaching to messages for the new case.
	
	var newType = nlapiGetRecordType();
	var caseInternalID = nlapiGetRecordId();
	var MERGE_FORM = 51;
	var mergeSuccessful = false;
	
	if (nlapiGetFieldValue('customform')) {

		alert('The button was pressed on form = ' + currentForm);
		var currentForm = nlapiGetFieldValue('customform');
		
		// If the Merge button is pressed from a regular case form
		if (currentForm != MERGE_FORM) {
			var caseToMerge = nlapiLoadRecord('supportcase',caseInternalID); //	{recordmode: 'dynamic'}
			var caseToMergeNumber = nlapiGetFieldValue('casenumber');

			caseToMerge.setFieldValue('customform', MERGE_FORM);
			nlapiSubmitRecord(caseToMerge,false,true);
			
			
			//alert('The form number is: ' + caseToMerge.getFieldValue('customform'));
			//alert('Switching to merge form');
			
			// Create a new URL in order to go to the new record
			var newURL = 'https://system.netsuite.com/app/crm/support/supportcase.nl?id=' + caseInternalID + '&e=T&cf=' + MERGE_FORM;
			window.location = newURL;
			
		}
		
		// If the Merge button is pressed from the merge form
		else {
			var caseToMerge = nlapiLoadRecord('supportcase',caseInternalID); //	{recordmode: 'dynamic'}
			nlapiSubmitRecord(caseToMerge,false,true);
			
			var currentForm = nlapiGetFieldValue('customform');
			var caseToMergeNumber = nlapiGetFieldValue('casenumber');
			var mergeWithCase = nlapiGetFieldValue('custevent_mergewithcase');  // caseToMerge.getFieldValue('custevent_mergewithcase');
			if (mergeWithCase == null || mergeWithCase == '') {
				alert('Please select a merge with case first before pressing the Merge button');
				return false;
			}
			var currentCase = nlapiLoadRecord('supportcase', mergeWithCase);
			var currentCaseInternalID = currentCase.getId();
			var currentCaseNumber = currentCase.getFieldValue('casenumber');
			var caseToMergeNumber = caseToMerge.getFieldValue('casenumber');
			var currentCaseTitle = currentCase.getFieldValue('title');
			var caseToMergeTitle = caseToMerge.getFieldValue('title');
			
			nlapiSubmitRecord(currentCase,false,true);
			
			alert('Merging case ' + caseToMergeNumber  + ' with case : ' + currentCaseNumber);
			
			
			
			var confirmMerge = confirm('Are you sure you want to merge case: \n#' + caseToMergeNumber + ' - ' + caseToMergeTitle + ', \ninto case:\n#' + currentCaseNumber + ' - ' + currentCaseTitle + '?');
			if (confirmMerge == true) {

				var caseToMergeInternalId = nlapiGetRecordId();
				var filters = new Array();
				var columns = new Array();
				filters[0] = new nlobjSearchFilter('internalid', null, 'is', caseToMergeInternalId );
				columns[0] = new nlobjSearchColumn('internalid','messages');
				
				// Copy messages then delete from old case
				
				var messageSearchResults = nlapiSearchRecord('supportcase', null, filters, columns);
				//alert('Number of messages attached to case: ' + messageSearchResults.length);
				for ( var i = 0; messageSearchResults != null && i < messageSearchResults.length; i++ ) {
					var messageid = messageSearchResults[i].getValue('internalid','messages');
					alert('Number of messages: ' + messageSearchResults.length);
					if (messageid != null && messageid != '') {
					
						alert('Message ID: ' + messageid);
						
						var newMessage = nlapiCopyRecord('message', messageid);
						alert('Message [' + i + '] Internal Id: ' + messageid);
						alert('Internal ID of the case that the message is going to be merged into:  ' + currentCaseInternalID);
						//alert('Date / Time: ' + newMessage.getFieldValue('lastmodifieddate'));

						newMessage.setFieldValue('activity', currentCaseInternalID);
						var attachTo = newMessage.getFieldValue('recipient');
						if (attachTo == null || attachTo == '') {
							alert('There was no recipient on the email');
							attachTo = caseToMerge.getFieldValue('assigned');
							newMessage.setFieldValue('recipient',attachTo);
						}
						var subject =newMessage.getFieldValue('subject');
						if (subject == null || subject == '') {
							alert('There was no subject on the email');
							subject = 'No subject';
							newMessage.setFieldValue('subject',subject);
						}  
						var NewCaseID = nlapiSubmitRecord(newMessage);
						alert('New case ID: ' + NewCaseID);
						if (NewCaseID != null || NewCaseID != '') {
							mergeSuccessful = true;
							alert('Merge successful: ' + mergeSuccessful);
							var messageDeleted = nlapiDeleteRecord('message', messageid); //  'supportcase'
							alert('Message deleted: ' + messageDeleted);
						} 
					}  //if (messageid != null && messageid != '')
					else {
						alert('There are no messages to copy');
					}
				} //end for	loop
				
				// Search for phone calls attached to the case
				filters[0] = new nlobjSearchFilter('internalid', null, 'is', caseToMergeInternalId );
				columns[0] = new nlobjSearchColumn('internalid','activity');
				var activitySearchResults = nlapiSearchRecord('supportcase', null, filters, columns);
				alert('Going to check phone calls');
				for ( var i = 0; activitySearchResults != null && i < activitySearchResults.length; i++ ) {
					var phoneCallID = activitySearchResults[i].getValue(columns[0]);
					alert('Phone call ID: ' + phoneCallID);
					if (phoneCallID != null && phoneCallID != '') {
						/*
						var newPhoneCall = nlapiCopyRecord('phonecall', phoneCallID);
						//alert(newPhoneCall.getFieldValue('startdate'));  //delete this test
						newPhoneCall.setFieldValue('supportcase', currentCaseInternalID);
						nlapiSubmitRecord(newPhoneCall);
						*/
						mergeSuccessful = true;
						alert('Merge successful : ' + mergeSuccessful);
						var activityDeleted = nlapiDeleteRecord('phonecall', phoneCallID); 
					}
					else {
						alert('There are no activities to delete');
					}
				}

				// If the case merged succesfully
				if (mergeSuccessful == true) {
					window.ischanged = false; // Way to avoid prompt that record has not been submitted.
					var newCaseURL = 'https://system.netsuite.com/app/crm/support/supportcase.nl?id=' + currentCaseInternalID;
					window.location = newCaseURL;
					alert('attempting to delete case with internal ID: ' + caseToMergeInternalId);
					var caseDeleted = nlapiDeleteRecord('supportcase', caseToMergeInternalId);
				}
				
				else {
					var confirmMerge2 = confirm('There are no emails or phone calls to merge, would you like to delete this case?');
					if (confirmMerge2 == true) {
						window.ischanged = false; // Way to avoid prompt that record has not been submitted.
						var newCaseURL = 'https://system.netsuite.com/app/crm/support/supportcase.nl?id=' + currentCaseInternalID;
						window.location = newCaseURL;
						var caseDeleted = nlapiDeleteRecord('supportcase', caseToMergeInternalId);
					}
				}		
			}
			else {
				alert('Cancelling merge');
			}
		}
	}
}

