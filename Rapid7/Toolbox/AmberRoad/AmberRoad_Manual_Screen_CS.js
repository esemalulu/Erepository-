/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Sep 2016     mburstein
 *
 * This client script is to be added to a form.addButton via form.setScript.  It is used to allow a button to screen for Denied Party Status via Amber Road.  Supported record types:
 * 		Entity (Customer/Prospect/Lead)
 * 		Partner
 * 		License Request Processing
 * 
 * The button will send the company information to Amber Road via AmberRoad_Integration_Library and alert the Denied Party Result.  Once the user clicks OK on the alert, the page will refresh.  
 */
function manualScreenParty(withPageReload){
    // Flag for not reloading page if required
  	var pageReload = (withPageReload == 'undefined' || withPageReload == null) ? true : withPageReload;

  	var recTypeId = nlapiGetRecordType(); // prospect/lead will default to customer
	var recId = nlapiGetRecordId();
	var rec = nlapiLoadRecord(recTypeId,recId);
	var companyName = rec.getFieldValue('companyname');
	// Default DPS field IDs to entity record fields.  Setting field IDs here so that they can be reused for nlapiSubmitField later.
	var dpsFieldId = 'custentityr7rps_status';
	var dpsDateFieldId = 'custentityr7rps_status_lastchecked';
	if(recTypeId == 'customrecordr7licreqprocessing'){
		dpsFieldId = 'custrecordr7licreq_rps_status';
		dpsDateFieldId = 'custrecordr7licreq_rps_lastcheck';
	}
	
	/*
	 *  If LRP rectype then we're sending more information to Amber Road.  For Companies we're only sending companyname
	 *  	Leaving blank fields as placeholders incase we decide to use in the future.
	 */
	var companyName = recTypeId == 'customrecordr7licreqprocessing' ? rec.getFieldValue('custrecordr7licreq_companyname') : rec.getFieldValue('companyname'); 
	var contactName = recTypeId == 'customrecordr7licreqprocessing' ? rec.getFieldValue('custrecordr7licreq_firstname') +' '+ rec.getFieldValue('custrecordr7licreq_lastname') : '';
	var secondaryContactName = '';
	var address1 = recTypeId == 'customrecordr7licreqprocessing' ? rec.getFieldValue('custrecordr7licreq_streetaddress') : '';
	var address2 = recTypeId == '';
	var address3 = recTypeId == '';
	var city = recTypeId == 'customrecordr7licreqprocessing' ? rec.getFieldValue('custrecordr7licreq_city') : '';
	var stateCode = recTypeId == 'customrecordr7licreqprocessing' ? rec.getFieldValue('custrecordr7licreq_state') : '';
	var stateName = recTypeId == '';
	var postalCode = recTypeId == 'customrecordr7licreqprocessing' ? rec.getFieldValue('custrecordr7licreq_zip') : '';
	var countryCode = recTypeId == 'customrecordr7licreqprocessing' ? rec.getFieldValue('custrecordr7licreq_ipcountrycode') : '';
	var countryName = recTypeId == 'customrecordr7licreqprocessing' ? rec.getFieldValue('custrecordr7licreq_ipcountry') : '';
	var currentDeniedPartyStatus = recTypeId == 'customrecordr7licreqprocessing' ? rec.getFieldValue(dpsFieldId) : rec.getFieldValue(dpsFieldId);
	var currentDeniedPartyDate = recTypeId == 'customrecordr7licreqprocessing' ? rec.getFieldValue(dpsDateFieldId) : rec.getFieldValue(dpsDateFieldId);
	
	var fieldsToSet = [dpsDateFieldId];
	var valuesToSet = [nlapiDateToString(new Date())];
	var currentDeniedPartyStatus = nlapiGetFieldValue(dpsFieldId);
	try{
		var objAR = new amberRoadObject(recTypeId,recId,companyName,contactName,secondaryContactName,address1,address2,address3,city,stateCode,stateName,postalCode,countryCode,countryName);
		var deniedPartyResult = objAR.screenCompany();
		if(!deniedPartyResult){
			throw nlapiCreateError('PROBLEM SETTING DPS STATUS', 'Could not get Denied Party Status', true);					
		}
		// Set Denied Party Status fields based on results. Only set if the value has changed.
		if(currentDeniedPartyStatus != deniedPartyResult){
			fieldsToSet.push(dpsFieldId);	
			valuesToSet.push(deniedPartyResult);				
		}
		// Set Denied Party Status and Date on record
		nlapiSubmitField(recTypeId,recId,fieldsToSet,valuesToSet);	
      	if(pageReload){
			location.reload();
      	}
	} 
	catch (e) {
		nlapiLogExecution('ERROR','Error Setting Denied Party Status','Record Type:' + recTypeId + '\n Record ID: ' + recId +'\n'+e.name+'\n'+e.message);
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'Error Setting Denied Party Status','Record Type:' + recTypeId + '\n Record ID: ' + recId+'\n'+e.name+'\n'+e.message);
		fieldsToSet.push(dpsFieldId);	
		valuesToSet.push(3); // Set DPS to Error
		nlapiSubmitField(recTypeId,recId,fieldsToSet,valuesToSet);
		alert('There was a screening error: '+'\n'+e.name+'\n'+e.message);
		location.reload();
	}
	var cases ={
			1: 'Flagged',
			2: 'Cleared',
			3: 'Error'
	};
	if(cases[deniedPartyResult] && pageReload){
		alert(cases[deniedPartyResult] + '.  Refreshing page.');
		location.reload();
	}
}
/*
 * Function Checks Customers/Prospects/Leads for Restricted Party Status before License Issuing.
 * customerId - id of current customer
 * customerType - current customer record type
 * @returns {undefined}
 */
function checkRPSStatusAndContinue(customerId, customerType) {
    var rpsFields = getRPSFields(customerId, customerType);
    if ((rpsFields.status == null ) || (rpsFields.status != null && !inOneYear(nlapiStringToDate(rpsFields.lastCheck)))) {
        manualScreenParty(false);
        rpsFields = getRPSFields(customerId, customerType);
    }
     /*
     * 1 - Flagged
     * 2 - Cleared
     * 3 - Error
     */
    if (rpsFields.status == 1 || rpsFields.status == 3) {
        alert('According to our Global Trade Management system, this record requires further legal review prior to issuing any software licenses.\n\
        	You must contact Legal at export@rapid7.com in order to proceed with this request.');
        return;
    }
    if (rpsFields.status == 2) {
        var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7createlicensefromtemplate', 'customdeployr7createlicensefromtemplate', false);
        var url = suiteletURL + '&custparam_customer=' + nlapiGetRecordId();
        window.open(url, "", "width=500,height=500");
    }
}
/*
 * Function returns true if Denied Party Last Check Date is not later then 1 year from current date.
 */
function inOneYear(deniedLastCheck){
    var result = true;
    var currentDate = new Date();
    var oneYearAgo = new Date((currentDate.getFullYear() - 1), currentDate.getMonth(), currentDate.getDate());
    if(!(deniedLastCheck.getTime() > oneYearAgo.getTime() &&
       deniedLastCheck.getTime() < currentDate.getTime())){
       result = false;
    } 
    return result;
}
/*
 * Function returns array of Restricted Party Status fields values
 */
function getRPSFields(customerId, customerType){
    var rpsFields = {status: null, lastCheck: null};
    try{
        var select = nlapiLookupField(customerType, customerId, ['custentityr7rps_status', 'custentityr7rps_status_lastchecked']);
        rpsFields = {
            status: select.custentityr7rps_status==''?null:select.custentityr7rps_status,
            lastCheck: select.custentityr7rps_status_lastchecked
        };
    }
    catch (e){
        nlapiLogExecution('ERROR', 'Error getting RPS fields', e);
    }
    return rpsFields;
}
