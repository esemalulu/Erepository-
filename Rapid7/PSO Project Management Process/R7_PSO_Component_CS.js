/*
 * @author efagone
 */
function saveRecord(){


}

function pageInit(type){

	if (type == 'create') {
		var engagementId = nlapiGetFieldValue('custrecordr7psocompengagement');
		
		if (engagementId != '') {
			var parentJobId = nlapiLookupField('customrecordr7psoengagement', engagementId, 'custrecordr7psoengparentjob');
			
			if (parentJobId != '') {
				nlapiSetFieldValue('custrecordr7psocompparentjob', parentJobId);
			}
		}
		
		var userId = nlapiGetUser();
		nlapiSetFieldValue('custrecordr7psocompresource', userId);
		
	}

}

function postSourcing(type, name){


	
}

function fieldChanged(type, name, linnum){

	if (name == 'custrecordr7psocompengagement') {
		var engagementId = nlapiGetFieldValue('custrecordr7psocompengagement');
		
		if (engagementId != '') {
		
			var fields = nlapiLookupField('customrecordr7psoengagement', engagementId, new Array('custrecordr7psoengcustomer', 'custrecordr7psoengsalesorder', 'custrecordr7psoengitemnumber'));
			
			var customerId = fields['custrecordr7psoengcustomer'];
			var itemId = fields['custrecordr7psoengitemnumber'];
			//var salesOrderId = fields['custrecordr7psoengsalesorder'];
			
			nlapiSetFieldValue('custrecordr7psocompcustomer', customerId, false);
			nlapiSetFieldValue('custrecordr7psocompitemnumber', itemId, false);
			//nlapiSetFieldValue('custrecordr7psocompsalesorder', salesOrderId, false);
		
		}
		
	}
}
	
function createCalendar(alertMsg){

	if (!isBlank(alertMsg)) {
		alert(alertMsg);
		return;
	}

	if (confirm('Are you sure you would like to create and send invitations?')) {
		var formParams = new Array();
		formParams['custparam_componentid'] = nlapiGetRecordId();
		
		var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7psosyncevent_suitelet', 'customdeployr7psosyncevent_suitelet', false);
		var response = nlapiRequestURL(suiteletURL, formParams);
		var body = response.getBody();
		
		if (body != null && body != '') {
		
			if (body.substr(0, 6) == 'ERROR:') {
				alert(body.substr(6));
				document.location.reload(true);
				return;
			}

			alert('Successfully synced to calendar.');
			document.location.reload(true);
			return;
			
		}
		else {
			alert('Something went wrong. Please contact your Administrator.');
			document.location.reload(true);
			return;
		}
	}

	return;
}

function isBlank(val){
	return (val == null || val == '') ? true : false;
}

