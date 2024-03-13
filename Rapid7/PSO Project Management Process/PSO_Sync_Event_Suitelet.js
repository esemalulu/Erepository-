/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Dec 2013     efagone
 *
 */

/*
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */

function psoEventLink_suitelet(request, response){

	try {
		if (request.getMethod() == 'POST') {
		
			var componentId = request.getParameter('custparam_componentid');
			
			if (componentId != null && componentId != '') {
			
				//getting original employee info
				var objComponent = getComponentDetails(componentId);
				if (objComponent == null) {
					response.writeLine('ERROR: There has been an error processing your request.');
					return;
				}
				
				var inviteBodyText = '';
				inviteBodyText += 'Rapid7 Professional Services\n\n';
				inviteBodyText += 'Customer: ' + objComponent.customerName + '\n';
				inviteBodyText += 'Contact: ' + objComponent.contactName;
				
				var recEvent;
				if (!isBlank(objComponent.eventLinkId)) {
					recEvent = nlapiLoadRecord('calendarevent', objComponent.eventLinkId, {
						recordmode: 'dynamic'
					});
				}
				else {
					recEvent = nlapiCreateRecord('calendarevent', {
						recordmode: 'dynamic'
					});
				}
				
				recEvent.setFieldValue('customform', 236); //PSO Event Integration
				recEvent.setFieldValue('templatestored', 'T');
				recEvent.setFieldValue('custeventr7eventsecsolrepispresenter', 'F');
				recEvent.setFieldValue('company', objComponent.customerId);
				recEvent.setFieldValue('title', objComponent.customerName + ' - ' + objComponent.name + ' - ' + objComponent.engagementName);
				recEvent.setFieldValue('status', 'CONFIRMED');
				recEvent.setFieldValue('alldayevent', 'T');
				recEvent.setFieldValue('startdate', objComponent.startDate);
				recEvent.setFieldValue('enddate', objComponent.endDate);
				if (objComponent.startDate != objComponent.endDate) {
					recEvent.setFieldValue('period', '1');
					recEvent.setFieldValue('frequency', 'DAY');
					recEvent.setFieldValue('noenddate', 'F');
					recEvent.setFieldValue('seriesstartdate', objComponent.startDate);
					recEvent.setFieldValue('endbydate', objComponent.endDate);
				}
				else {
					recEvent.setFieldValue('frequency', 'NONE');
				}
				
				recEvent.setFieldValue('starttime', '12:00 am');
				recEvent.setFieldValue('endtime', '11:59 pm');
				recEvent.setFieldValue('custeventr7eventconfcalltype', 5); //Invitation Only
				recEvent.setFieldValue('custeventr7eventinvitehideattendees', 'T');
				recEvent.setFieldValue('custeventr7taskpsoengagement', objComponent.engagementId);
				recEvent.setFieldValue('custeventr7eventtype', 24); //PSO Engagement
				recEvent.setFieldValue('custeventr7eventinternalnotes', 'Create via PSO Component Button script');
				recEvent.setFieldValue('custeventr7eventonsitelocation', 'Rapid7 Professional Services');
				recEvent.setFieldValue('custeventr7eventcustominvitationmessage', inviteBodyText);
				recEvent.setFieldValue('custeventr7eventshowasfreetime', 'T');
				//peoples
				var organizer = (!isBlank(objComponent.projectManagerId)) ? objComponent.projectManagerId : 17; // Default to Abby Mulligan
				recEvent.setFieldValue('organizer', organizer);
				recEvent.setFieldValue('custeventr7salesrepateventcreation', '');
				//recEvent.setFieldValue('custeventr7eventcustomercontactsinvld', objComponent.contactId);
				recEvent.setFieldValue('custeventr7eventemployeesinvolved', objComponent.projectManagerId);
				recEvent.setFieldValue('custeventr7eventpsoresourceinvolv', objComponent.resourceId);
				//recEvent = addValueToMultiSelect(recEvent, 'custeventr7eventemployeesinvolved', objComponent.projectManagerId);
				
				var eventId = nlapiSubmitRecord(recEvent);
				
				if (isBlank(objComponent.eventLinkId)) {
					nlapiSubmitField('customrecordr7psocomponent', componentId, 'custrecordr7psocompevent', eventId);
				}
				
				response.writeLine('Success. Event Id: ' + eventId);
				return;
			}
		}
		else {
			response.writeLine('ERROR: Missing required argument.');
			return;
		}
	} 
	catch (e) {
		response.writeLine('ERROR: ' + e);
		return;
	}
	
	response.writeLine('ERROR: There has been an error processing your request.');
	return;
	
}

function addValueToMultiSelect(rec, fldId, valToAdd){

	var strFld = nlapiGetFieldValue(fldId);
	var arrFld = new Array();
	if (strFld != null && strFld != '') {
		arrFld = strFld.split(",");
	}
	if (valToAdd != null && valToAdd != '') {
		arrFld.push(valToAdd);
	}
	arrFld.push(55011);
	rec.setFieldValues('custeventr7eventemployeesinvolved', arrFld);
	
	return rec;
}

function getComponentDetails(componentId){


	if (componentId == null || componentId == '') {
		return null;
	}
	
	var objComponent = new Object();
	
	var arrFilters = new Array();
	arrFilters[0] = new nlobjSearchFilter('internalid', null, 'is', componentId);
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('name');
	arrColumns[2] = new nlobjSearchColumn('custrecordr7psocompcustomer');
	arrColumns[3] = new nlobjSearchColumn('custrecordr7psocompstartdate');
	arrColumns[4] = new nlobjSearchColumn('custrecordr7psocompdatedelivered');
	arrColumns[5] = new nlobjSearchColumn('custrecordr7psocompengagement');
	arrColumns[6] = new nlobjSearchColumn('custrecordr7psocompsalesorder');
	arrColumns[7] = new nlobjSearchColumn('custrecordr7psoengprojectmanager', 'custrecordr7psocompengagement');
	arrColumns[8] = new nlobjSearchColumn('custrecordr7psoengengagementcontact', 'custrecordr7psocompengagement');
	arrColumns[9] = new nlobjSearchColumn('custrecordr7psoengsalesrep', 'custrecordr7psocompengagement');
	arrColumns[10] = new nlobjSearchColumn('custrecordr7psocompevent');
	arrColumns[11] = new nlobjSearchColumn('custrecordr7psocompresource');
	
	var newSearch = nlapiCreateSearch('customrecordr7psocomponent');
	newSearch.setFilters(arrFilters);
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();
	
	var resultSlice = resultSet.getResults(0, 1);
	
	if (resultSlice != null && resultSlice.length > 0) {
		var result = resultSlice[0];
		objComponent.id = result.getValue(arrColumns[0]);
		objComponent.name = result.getValue(arrColumns[1]);
		objComponent.customerId = result.getValue(arrColumns[2]);
		objComponent.customerName = result.getText(arrColumns[2]);
		objComponent.startDate = result.getValue(arrColumns[3]);
		objComponent.endDate = result.getValue(arrColumns[4]);
		objComponent.engagementId = result.getValue(arrColumns[5]);
		objComponent.engagementName = result.getText(arrColumns[5]);
		objComponent.salesOrderId = result.getValue(arrColumns[6]);
		objComponent.projectManagerId = result.getValue(arrColumns[7]);
		objComponent.contactId = result.getValue(arrColumns[8]);
		objComponent.contactName = result.getText(arrColumns[8]);
		objComponent.salesRepId = result.getValue(arrColumns[9]);
		objComponent.eventLinkId = result.getValue(arrColumns[10]);
		objComponent.resourceId = result.getValue(arrColumns[11]);

	}
	
	return objComponent;
}

function isBlank(val){
	return (val == null || val == '') ? true : false;
}
