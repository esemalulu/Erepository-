function cleanAddressList(){

	var ids = new Array();
	ids[ids.length] = 162031; //BOGUS
	ids[ids.length] = 1604308; //JUNK
	ids[ids.length] = 327788; //STUDENT
	ids[ids.length] = 1320843; //MS Community
	ids[ids.length] = 1313985; //MS Community 2
	
	for (var i = 0; ids != null && i < ids.length; i++) {
		try {
			var custRecord = nlapiLoadRecord('customer', ids[i]);
			custRecord = cleanList(custRecord);
			nlapiSubmitRecord(custRecord);
		} 
		catch (e) {
		
		}
	}
	
}

function cleanList(custRecord){
	//clear any existing addresses
	while (custRecord.getLineItemCount('addressbook') > 1) {
		custRecord.removeLineItem('addressbook', 1);
	}
	return custRecord;
}