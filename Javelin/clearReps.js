function clearReps() {

	var filters = new Array();
	var columns = new Array();
	filters[0] = new nlobjSearchFilter('entitystatus', null, 'anyof', 'CUSTOMER');
	columns[0] = new nlobjSearchColumn('entityid');
	columns[1] = new nlobjSearchColumn('entitystatus');
	
	var searchResults = nlapiSearchRecord('customer', 'customsearch2153', null, null);   //filters, columns);
	nlapiLogExecution('debug', 'clearReps()', 'There are ' + searchResults.length + ' matching records');
	for (var i = 0; i < 200; i++) {  //searchResults.length; i++) {
		if (searchResults && searchResults.length > 0) {
			var recordChanged = false;
			var searchresult = searchResults[ i ];
			var recordID = searchresult.getId( );
			// nlapiLogExecution('debug', 'clearReps()', 'Customer ID = ' + recordID + ', Customer Name = ' + searchresult.getValue( 'companyname' ));
			var rectype = searchresult.getRecordType( );
			var salesrep = searchresult.getValue( 'salesrep' );
			var salesrep_display = searchresult.getText( 'salesrep' );
			nlapiLogExecution('debug', 'clearReps()', 'Customer ID = ' + recordID + ', Customer Name = ' + searchresult.getValue( 'companyname' ) + ', Sales Rep = ' + salesrep + ' : ' + salesrep_display);
			
			var record = nlapiLoadRecord('customer', recordID);
			
			var salesTeamMemberCount = record.getLineItemCount('salesteam');
			if (salesTeamMemberCount > 1 ) {
				nlapiLogExecution('debug', 'clearReps()', 'There are too many reps on this account');
			}
			//nlapiLogExecution('debug', 'clearReps()', 'salesTeamMemberCount = ' + salesTeamMemberCount);
			for (var salesTeamMember = 1 ; salesTeamMember <= salesTeamMemberCount ; salesTeamMember++) {
				var salesTeamMemberEmployeeID = record.getLineItemValue('salesteam', 'employee', salesTeamMember);
				var salesTeamMemberContribution = record.getLineItemValue('salesteam', 'contribution', salesTeamMember);
				var salesTeamMemberRole = record.getLineItemValue('salesteam', 'salesrole', salesTeamMember);
				var salesTeamMemberRoleName = record.getLineItemText('salesteam', 'salesrole', salesTeamMember);
				var salesTeamMemberName = record.getLineItemText('salesteam', 'employee', salesTeamMember);

				nlapiLogExecution('debug', 'clearReps()','salesTeamMember ' + salesTeamMember + ' of ' + salesTeamMemberCount + ', Sales Team Member = ' + salesTeamMemberEmployeeID + ': ' + salesTeamMemberName + ', Role: ' + salesTeamMemberRoleName + ', Contribution: ' + salesTeamMemberContribution);
				if  (salesTeamMemberEmployeeID == 1770 && salesTeamMemberContribution != '0.0%') { // 1770 = "Javelin Adjustment Rep"
					//record.setLineItemValue('salesteam', 'contribution', salesTeamMember, '0.0%');
					nlapiLogExecution('debug', 'clearReps()', 'Attempting to delete the adjustment rep');
					record.removeLineItem('salesteam', salesTeamMember);
					//record.commitLineItem('salesteam');
					nlapiLogExecution('debug', 'clearReps()', 'Attempting to change contribution');
					record.setLineItemValue('salesteam', 'contribution', salesTeamMember, '100.0%');
					record.commitLineItem('salesteam');
					recordChanged = true;
				} 
				else if (salesTeamMemberEmployeeID != 1770 && salesTeamMemberContribution == '0.0%') {
					
					if (salesTeamMember = 1 && salesTeamMemberCount == 2) {
						
						nlapiLogExecution('debug', 'clearReps()', 'Attempting to delete the adjustment rep when other rep was first');
						record.removeLineItem('salesteam', 2);
						//record.commitLineItem('salesteam');
						
						nlapiLogExecution('debug', 'clearReps()', 'Attempting to change contribution');
						record.setLineItemValue('salesteam', 'contribution', salesTeamMember, '100.0%');
						record.commitLineItem('salesteam');
						
						salesTeamMember = salesTeamMember + 1;
						recordChanged = true;
					}
					
					
					
				}
				
			}
			if (recordChanged) {
				var newID = nlapiSubmitRecord(record, true);
			}
		}
	}
	
}
