function afterSubmitTest(type) {


	if (type == 'edit') { // GAMATEST - change deployment too to remove type = create restriction

		var userID = nlapiGetUser();
		if (userID == 105) {  // GAMATEST - remove restriction after.  Restrict to Pardot.  USER 105 = Robert Gama.

			
			var initOrigin = nlapiGetFieldValue('origin');
			if (initOrigin == 5) { 
				
			var caseID = nlapiGetRecordId();
			var incomingmessage = nlapiGetFieldValue('incomingmessage');			
			if (incomingmessage == 'Test message (robert gama)') {

				var caseContact = nlapiGetFieldValue('contact');
				var caseCompany = nlapiGetFieldValue('company');
				var caseMessageAuthor = nlapiGetFieldValue('messageauthor');
				var caseMessageNew = nlapiGetFieldValue('messagenew');
				log('afterSubmitTest','Case message author: ' + caseMessageAuthor + ', messageNew: ' + caseMessageNew);
				
				var msgFilters = [new nlobjSearchFilter('internalid',null,'anyof',caseID)];
				var msgColumns = [
					new nlobjSearchColumn('internalid','messages').setSort(), 
					new nlobjSearchColumn('author','messages'),
					new nlobjSearchColumn('subject','messages')
					];
					

				var caseMessages = nlapiSearchRecord('supportcase',null, msgFilters, msgColumns);
				for (var i = 0 ; caseMessages != null && i < caseMessages.length ; i ++) {
					log('afterSubmitTest','i = ' + (i + 1)  + ', of ' + caseMessages.length );
					var initialMsg = caseMessages[i];
					var initialMsgID = initialMsg.getValue('internalid','messages');
					var initialMsgAuthor = initialMsg.getValue( 'author','messages' );
	
					log('afterSubmitTest','initialMsgID = ' + initialMsgID + ', initialMsgAuthor = ' + initialMsgAuthor);
				}
					
				
					var newCaseRecord = nlapiLoadRecord('supportcase', caseID);
					newCaseRecord.setFieldValue('customform', '67');
					newCaseRecord.setFieldValue('messagenew', 'T');
					newCaseRecord.setFieldValue('incomingmessage', 'Case was just merged');
					newCaseRecord.setFieldValue('messageauthor', initialMsgAuthor);
					var id = nlapiSubmitRecord(newCaseRecord, true);
					
					log('New Message Creation Test','Merge successful');  //  GAMATEST - REMOVE TESTING ADAM'S IDEA TO CREATE A MESSAGE

				}
				
			}
		}
	}
}

function log(title, details) {
	nlapiLogExecution('DEBUG',title,details);
}

