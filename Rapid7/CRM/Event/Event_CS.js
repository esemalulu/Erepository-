function saveRecord(){
	var user = nlapiGetUser();

		var confBridgeCode = nlapiGetFieldValue('custeventr7confbridgecode');
		var confBridgeCodeText = nlapiGetFieldText('custeventr7confbridgecode');
		
		var startDateText = nlapiGetFieldValue('startdate');
		var startDate = nlapiStringToDate(startDateText);
		
		if (startDate >= nlapiAddDays(new Date(), -1)
		&& (confBridgeCode!=null && confBridgeCode!='')
		) {
		
			//Find availability, internalid
			var available = nlapiLookupField('customrecordr7conferencebridge', confBridgeCode, new Array('custrecordr7confbridgecodeavailable', 'custrecordr7confbridgeeventinternalid'));
			
			if (available['custrecordr7confbridgecodeavailable'] == 'F' &&
			nlapiGetRecordId() != available['custrecordr7confbridgeeventinternalid']) {
				alert("Please select another Conference Bridge Code other than " + confBridgeCodeText + ". Another user just selected that code.");
				return false;
			}
			else {
				return true;
			}
		}
		return true;
}


function pageInit(type){
	nlapiSetFieldValue('custeventr7eventcreateedittype',type);
	var confCode = nlapiGetFieldValue('custeventr7confbridgecode');
	if(type=='edit' && (confCode==null || confCode=='')){
		nlapiDisableField('custeventr7confbridgecode');
	}
}
