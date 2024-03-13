/*
 * @author efagone
 */
function beforeLoad(type, form){
        var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();

	if (type == 'create') {
		if (nlapiGetFieldValue('custrecordr7psocompsalesorder') != null && nlapiGetFieldValue('custrecordr7psocompsalesorder') != '') {
			var fldSalesOrder = form.getField('custrecordr7psocompsalesorder');
			fldSalesOrder.setDisplayType('inline');
		}
	}
	
	if (type == 'view' || type == 'edit') {
		//check for travel
		var salesOrderId = nlapiGetFieldValue('custrecordr7psocompsalesorder');
		if (hasTravel(salesOrderId)) {
			var travelValue = '<image src="'+toURL+'/core/media/media.nl?id=677752&c=663271&h=bf8666467210dd20fad3" ALT="Involves Travel" WIDTH="125">';
			var fldTravel = form.getField('custrecordr7psocomptravelicon');
			fldTravel.setDefaultValue(travelValue);
		}
	}
	
	if (type == 'view' && (nlapiGetUser() == 55011 || nlapiGetRole() == 1056)) {
		form.setScript('customscriptr7psocomponent_cs');
		var alertMsg = '';
		if (isBlank(nlapiGetFieldValue('custrecordr7psocompstartdate')) || isBlank(nlapiGetFieldValue('custrecordr7psocompdatedelivered'))) {
			alertMsg = 'You must first specify a start and end date.';
		}
		else 
			if (isBlank(nlapiGetFieldValue('custrecordr7psocompengagement'))) {
				alertMsg = 'Component must be linked to an Engagement.';
			}
		form.addButton('custpage_synctoevent', 'Sync To Calendar', "createCalendar('" + alertMsg + "');");
	}
	
}

function beforeSubmit(){

	if (type == 'create') {
		nlapiSetFieldValue('custrecordr7psocompsid', getRandomString(30));
	}
	
}

function afterSubmit(type){

	if (type != 'delete') {
	
		var recComponent = nlapiLoadRecord('customrecordr7psocomponent', nlapiGetRecordId());
		
		setComponentValues(recComponent);
		
		var engagementId = recComponent.getFieldValue('custrecordr7psocompengagement');
		
		if (engagementId != null && engagementId != '') {
			refreshEngagement(engagementId);
		}
		
	}
}

function isBlank(val){
	return (val == null || val == '') ? true : false;
}
