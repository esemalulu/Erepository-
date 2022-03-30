function deleteVendors()
{
	//var companyInternalID = nlapiGetRecordId();
	var companyZip = nlapiGetFieldValue('billzip');
	var companyFSA = companyZip.substring(0,3);
	if (companyFSA != null && companyFSA.length == 3) {
		alert(companyZip);
		alert(companyFSA);
	} else{
		alert('No address');
	}
	//var companyRecord = nlapiLoadRecord('customer',companyInternalID); 
	//alert(companyInternalID);
	//var companyPostalCode = nlapiGetFieldValue('billzip');
	//alert(companyPostalCode);
	
	//
	
	/*
	var filters = new Array();
	var columns = new Array();
	filters[0] = new nlobjSearchFilter('zipcode', null, 'on', 'today');
	columns[0] = new nlobjSearchColumn('internalid');
	var searchresults = nlapiSearchRecord('vendor', null, filters, columns);
				
	nlapiLogExecution('DEBUG', 'Number of vendors to be deleted: ' + searchresults.length);
				
	for ( var i = 0; searchresults != null && i < searchresults.length; i++ ) {
		var vendorid = searchresults[i].getValue('zipcode');
		if (vendorid.substring(0, 3) != "-" ) {
		
			nlapiLogExecution('DEBUG', 'Attempting to delete vendor : ' + vendorid);
		
			nlapiDeleteRecord('vendor', vendorid);
		}
	
	} //end for		
	*/		
}