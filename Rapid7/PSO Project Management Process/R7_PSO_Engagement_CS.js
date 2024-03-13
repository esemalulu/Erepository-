/*
 * @author efagone
 */

function saveRecord(){
	var atRisk = nlapiGetFieldValue('custrecordr7psoengatrisk');
	var comments = nlapiGetFieldValue('custrecordr7psoengcomments');
	
	if (atRisk != '' && atRisk != null && comments == '') {
		alert('You must provide comments if this is at risk!');
		return false;
	}
	
	return true;
	
}

function pageInit(type){

	if (type == 'create') {
		var parentJobId = nlapiGetFieldValue('custrecordr7psoengparentjob');
		
		if (parentJobId != '') {
			var customerId = nlapiLookupField('customrecordr7psoparentjob', parentJobId, 'custrecordr7psojobcustomer');
			var salesOrderId = nlapiLookupField('customrecordr7psoparentjob', parentJobId, 'custrecordr7psojobsalesorder');
			
			nlapiSetFieldValue('custrecordr7psoengcustomer', customerId);
			//nlapiSetFieldValue('custrecordr7psoengsalesorder', salesOrderId);
			
		}
		
	}
	
}

function postSourcing(type, name){

	
}

function fieldChanged(type, name, linenum){
	
	if (name == 'custrecordr7psoengparentjob') {
		var parentJobId = nlapiGetFieldValue('custrecordr7psoengparentjob');

		if (parentJobId != '') {
			var salesOrderId = nlapiLookupField('customrecordr7psoparentjob', parentJobId, 'custrecordr7psojobsalesorder');

				nlapiSetFieldValue('custrecordr7psoengsalesorder', salesOrderId);
		}
		
	}	
	
}
