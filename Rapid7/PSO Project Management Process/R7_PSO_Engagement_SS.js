/*
 * @author efagone
 */

function beforeLoad(type, form){
	
	var userId = nlapiGetUser();
	
	if (type == 'view' || type == 'edit') {
		
		// check math
		var arrSearchFilters = new Array();
		arrSearchFilters[0] = new nlobjSearchFilter('custrecordr7psocompengagement', null, 'is', nlapiGetRecordId());
		
		var arrSearchColumns = new Array();
		var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
		arrSearchColumns[0] = new nlobjSearchColumn('custrecordr7psocomppercentvsoeallocation', null, 'sum');
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7psocomponent', null, arrSearchFilters, arrSearchColumns);
		//nlapiSendEmail(55011, 55011, 'length', arrSearchResults.length);
		if (arrSearchResults != null && arrSearchResults.length > 0) {
			var totalPercent = arrSearchResults[0].getValue(arrSearchColumns[0]);
			
			if (parseFloat(totalPercent) != 100) {
			
				var arrCompSearchResults = nlapiSearchRecord('customrecordr7psocomponent', null, new nlobjSearchFilter('custrecordr7psocompengagement', null, 'is', nlapiGetRecordId()));
				
				if (arrCompSearchResults != null && arrCompSearchResults.length > 0) {// check that it has at least one component
					var wtfValue = '<image src="'+toURL+'/core/media/media.nl?id=171353&c=663271&h=8de916d34e5e4bd54164" ALT="Wrong Total Formula" WIDTH="125">';
					var fldWTF = form.getField('custrecordr7psoengwtficon');
					fldWTF.setDefaultValue(wtfValue);
				}
			}
		}

		//check for travel
		var salesOrderId = nlapiGetFieldValue('custrecordr7psoengsalesorder');
		if (hasTravel(salesOrderId)) {
			var travelValue = '<image src="'+toURL+'/core/media/menl?id=677752&c=663271&h=bf8666467210dd20fad3" ALT="Involves Travel" WIDTH="125">';
			var fldTravel = form.getField('custrecordr7psoengtravelicon');
			fldTravel.setDefaultValue(travelValue);
		}
	}
	
	if (type == 'view' || type == 'edit') {
	
		var newCompURL = '/app/common/custom/custrecordentry.nl?rectype=378&&record.custrecordr7psocompengagement=' + nlapiGetRecordId() + '&record.custrecordr7psocompcustomer=' + nlapiGetFieldValue('custrecordr7psoengcustomer') + '&record.custrecordr7psocompsalesorder=' + nlapiGetFieldValue('custrecordr7psoengsalesorder') + '&record.custrecordr7psocompparentjob=' + nlapiGetFieldValue('custrecordr7psoengparentjob');
		
		var compTab = form.getSubList('customsublist6');
		if (compTab != null) {
			compTab.addButton('custpage_newcompbutton', 'New PSO Component', 'window.open(\'' + newCompURL + '\');');
		}
		
	}
	
	if (type == 'edit' || type == 'create') {
	
		//if (nlapiGetFieldValue('custrecordr7psoengitemnumber') != null && nlapiGetFieldValue('custrecordr7psoengitemnumber') != '') {
			//var fldItem = form.getField('custrecordr7psoengitemnumber');
			//fldItem.setDisplayType('inline');
		//}
		if (nlapiGetFieldValue('custrecordr7psoengsalesorderlineid') == null || nlapiGetFieldValue('custrecordr7psoengsalesorderlineid') == '' || nlapiGetUser() == 55011) {
			var fldSalesOrderLine = form.getField('custrecordr7psoengsalesorderlineid');
			fldSalesOrderLine.setDisplayType('normal');
		}
				
	}
		
	
}

function beforeSubmit(type){

	if (type == 'create') {
		nlapiSetFieldValue('custrecordr7psoengsid', getRandomString(30));
	}
	
	if (type != 'delete') {
	
		var atRisk = nlapiGetFieldValue('custrecordr7psoengatrisk');
		var comments = nlapiGetFieldValue('custrecordr7psoengcomments');
		
		if (atRisk != '' && atRisk != null && (comments == '' || comments == null)) {
			throw nlapiCreateError('MISSING REQ FIELD', 'You must provide comments if this is marked at risk', true);
		}
		
		nlapiSetFieldValue('custrecordr7psoengupdatecomponents', 'F');
	}
}

function afterSubmit(type){

	var context = nlapiGetContext();
	
	if (type != 'delete') {
		var engagementId = nlapiGetRecordId();
		try {
			nlapiLogExecution('DEBUG', 'Refreshing Engagement', engagementId);
			refreshComponents(engagementId);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'ERROR REFRESHING COMP/ENG', engagementId);
		}
		
	}
	
	if (type == 'create' && context.getExecutionContext() == 'userinterface') {
	
		var recEngagement = nlapiGetNewRecord();
		var engagementId = recEngagement.getId();
		var parentJobId = recEngagement.getFieldValue('custrecordr7psoengparentjob');
		var salesOrderId = recEngagement.getFieldValue('custrecordr7psoengsalesorder');
		var customerId = recEngagement.getFieldValue('custrecordr7psoengcustomer');
		var itemId = recEngagement.getFieldValue('custrecordr7psoengitemnumber');
		nlapiLogExecution('DEBUG', 'itemid', itemId);
		
		if (itemId != null && itemId != '') {
			createComponents(engagementId, customerId, salesOrderId, parentJobId, itemId);
		}
	}
	
}
