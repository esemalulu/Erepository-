function clearReps() {
	/*
	var filters = new Array();
	var columns = new Array();
	filters[0] = new nlobjSearchFilter('entitystatus', null, 'anyof', 'CUSTOMER');
	columns[0] = new nlobjSearchColumn('entityid');
	columns[1] = new nlobjSearchColumn('entitystatus');
	*/
	
	var searchResults = nlapiSearchRecord('customer', 'customsearch2153', null, null);   //filters, columns);
	nlapiLogExecution('debug', 'clearReps()', 'There are ' + searchResults.length + ' matching records');
	for (var i = 0; i < 300; i++) {  //searchResults.length; i++) {
		if (searchResults && searchResults.length > 0) {

			var searchresult = searchResults[ i ];
			var recordID = searchresult.getId( );
			// nlapiLogExecution('debug', 'clearReps()', 'Customer ID = ' + recordID + ', Customer Name = ' + searchresult.getValue( 'companyname' ));
			var salesrep = searchresult.getValue( 'salesrep' );
			var salesrep_display = searchresult.getText( 'salesrep' );
			nlapiLogExecution('debug', 'clearReps()', 'Customer ID = ' + recordID + ', Customer Name = ' + searchresult.getValue( 'companyname' ) + ', Sales Rep = ' + salesrep + ' : ' + salesrep_display);
			
			var record = nlapiLoadRecord('customer', recordID);
			
			var salesTeamMemberCount = record.getLineItemCount('salesteam');
			if (salesTeamMemberCount > 0) {
				//nlapiLogExecution('debug', 'clearReps()', 'salesTeamMemberCount = ' + salesTeamMemberCount);
				for (var salesTeamMember = 1 ; salesTeamMember <= salesTeamMemberCount ; salesTeamMember++) {
					/*
					var salesTeamMemberEmployeeID = record.getLineItemValue('salesteam', 'employee', salesTeamMember);
					var salesTeamMemberContribution = record.getLineItemValue('salesteam', 'contribution', salesTeamMember);
					var salesTeamMemberRole = record.getLineItemValue('salesteam', 'salesrole', salesTeamMember);
					var salesTeamMemberRoleName = record.getLineItemText('salesteam', 'salesrole', salesTeamMember);
					var salesTeamMemberName = record.getLineItemText('salesteam', 'employee', salesTeamMember);
					*/
					record.removeLineItem('salesteam', salesTeamMember);
				}
				var newID = nlapiSubmitRecord(record, true);
			}
		}
	}
}
