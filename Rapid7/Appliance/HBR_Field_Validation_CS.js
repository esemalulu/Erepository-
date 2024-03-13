/*
 * @author mburstein
 */

this.userId = nlapiGetUser();
// Array of console build types
this.arrConsoleBuilds = new Array("1","3","5");

function pageInit(){
	
	
	var orderType = nlapiGetFieldValue('custrecordr7appbuildordertype');
	var status = nlapiGetFieldValue('custrecordr7appbuildstatus');
	var hbrType = nlapiGetFieldValue('custrecordr7appbuildhbrtype');
	
	// Get rid of mandatory fields
	// Sales Order
	if(orderType != 1 && orderType != 2){
		nlapiSetFieldMandatory('custrecordr7appbuildsalesorder',false);
	}
	// Case
	if(orderType != 3 || userId == 340932){
		nlapiSetFieldMandatory('custrecordr7appbuildcase',false);
	}
	// Opportunity
	if(orderType != 4){
		nlapiSetFieldMandatory('custrecordr7appbuildopportunity',false);
	}
	// Tracking
	if (status != 3) {
		nlapiSetFieldMandatory('custrecordr7appbuildtrackingnumber', false);
	}
	if(arrConsoleBuilds.indexOf(hbrType) != -1){
		nlapiSetFieldMandatory('custrecordr7appbuildnexposelicense',true);
	}
	else{
		nlapiSetFieldMandatory('custrecordr7appbuildnexposelicense',false);
		nlapiSetFieldValue('custrecordr7appbuildnexposelicense','');
	}
}

function fieldChanged(type, name, linenum){
/*
 *  If Order Type = New Sale, Sales Order is required
 *  If Order Type = Evaluation, Opportunity is required
 *  If Order Type = Replacement, Case is required
 */

/*
 * Order Type
 * 1 = New Sale
 * 2 = Additional Purchase
 * 3 = Replacement
 * 4 = Eval
 */
	if (name == 'custrecordr7appbuildordertype') {
		// If Order Type is New Sale (1) or Additional Purchase (2), then Sales Order is mandatory
		if (nlapiGetFieldValue('custrecordr7appbuildordertype') == '1' || nlapiGetFieldValue('custrecordr7appbuildordertype') == '2') {
			nlapiSetFieldMandatory('custrecordr7appbuildsalesorder', true);
		}
		else{
			nlapiSetFieldMandatory('custrecordr7appbuildsalesorder', false);
		}
	}
	// If Order Type is Replacement (3), then Case is mandatory
	if (name == 'custrecordr7appbuildordertype') {
		if (userId != 340932) { // Add override for Michael Burstein in case Salesforce Netsuite integration is down
			if (nlapiGetFieldValue('custrecordr7appbuildordertype') == '3') {
				nlapiSetFieldMandatory('custrecordr7appbuildcase', true);
			}
			else {
				nlapiSetFieldMandatory('custrecordr7appbuildcase', false);
			}
		}
	}
	// If Order Type is Eval (4), then Opp is mandatory
	if (name == 'custrecordr7appbuildordertype') {
		if (nlapiGetFieldValue('custrecordr7appbuildordertype') == '4') {
			nlapiSetFieldMandatory('custrecordr7appbuildopportunity', true);
		}
		else {
			nlapiSetFieldMandatory('custrecordr7appbuildopportunity', false);
		}
	}
	// If status is complete, tracking is mandatory
	// regex 1ZEA5912 0494379252   regexSerial = /^1ZEA5912\d{10}\b/

	if (name == 'custrecordr7appbuildstatus') {
		if (nlapiGetFieldValue('custrecordr7appbuildstatus') == '3') {
			nlapiSetFieldMandatory('custrecordr7appbuildtrackingnumber', true);
		}
		else {
			nlapiSetFieldMandatory('custrecordr7appbuildtrackingnumber', false);
		}
	}
	
	// Make NX license manadatory for consoles
	if (name == 'custrecordr7appbuildhbrtype') {
		var hbrType = nlapiGetFieldValue('custrecordr7appbuildhbrtype');
		nlapiLogExecution('DEBUG','FieldChange error test: indexOf / hbrType',arrConsoleBuilds.indexOf(hbrType)+' / '+hbrType);
		if (arrConsoleBuilds.indexOf(hbrType) != -1) {
			nlapiSetFieldMandatory('custrecordr7appbuildnexposelicense', true);
			nlapiDisableField('custrecordr7appbuildnexposelicense',false);
			
		}
		else {
			nlapiSetFieldMandatory('custrecordr7appbuildnexposelicense', false);
			nlapiSetFieldValue('custrecordr7appbuildnexposelicense','');
			nlapiDisableField('custrecordr7appbuildnexposelicense',true);
		}
	}
}

function saveRecord(){
	// if tracking doesn't follow regex /^1ZEA5912\d{10}\b/, fail validation
	var UPSRegex = /^1ZEA5912\d{10}\b/;
	var DHLRegex = /^\d{10}\b/;
	var handDelivered = /^Hand\sDeliverd\b/;
	var trackingNumber = nlapiGetFieldValue('custrecordr7appbuildtrackingnumber');
	var status = nlapiGetFieldValue('custrecordr7appbuildstatus');
	var isValid = new Boolean();

	if (UPSRegex.test(trackingNumber) == false && DHLRegex.test(trackingNumber) == false && handDelivered.test(trackingNumber) ){
		isValid = false;
	}
	else{
		isValid = true;
	}
	// status is complete, tracking is not null or invalid format
	if (status == '3' && (!isValid && trackingNumber != null)){	
		alert("Tracking number is invalid format.");
		return false;
	}		
	else{
		return true;
	}
}
