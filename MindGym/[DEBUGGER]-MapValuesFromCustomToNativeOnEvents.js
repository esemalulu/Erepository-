
var lastProcId = '';
var flt = null;
if (lastProcId) {
	flt = new Array();
	flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', lastProcId));
}

var eventrs = nlapiSearchRecord(null,'customsearch2466', null, flt);

//go through them
for (var i=0; eventrs && i < eventrs.length; i++) {
	
	var rectype = eventrs[i].getRecordType();
	var recid = eventrs[i].getId();
	
	alert(rectype+' // '+recid);
	
	var custClient = eventrs[i].getValue('custevent_event_client');
	var natiClient = eventrs[i].getValue('company');
	
	var custTrx = eventrs[i].getValue('custevent_event_opportunity');
	var natiTrx = eventrs[i].getValue('transaction');
	
	if ( (custClient && !natiClient) || (custTrx && !natiTrx) ) {
		
		var eventrec = nlapiLoadRecord(rectype, recid);
		
		if (custClient && !natiClient) {
			eventrec.setFieldValue('company', custClient);
		}
		
		if (custTrx && !natiTrx) {
			eventrec.setFieldValue('transaction', custTrx);
		}
		
		nlapiSubmitRecord(eventrec, true, true);
		
		alert('Processed: '+recid);
	} else {
		alert('SKIPPED: '+recid);
	}	 
}


