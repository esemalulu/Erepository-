/**
 * @author mburstein
 * 
 * MBX will post parameters to this endpoint script at each of the 4 stages of fulfillment
 * 
 * 4 Stages:
 * 	Order Acknowledgement - NOTIFICATION_TYPE: ACKNOWLEDGE
 * 	System Assembly Complete - NOTIFICATION_TYPE: READY
 * 	Final Configuration Complete - NOTIFICATION_TYPE: CONFIGURED
 *	Shipping Notification - NOTIFICATION_TYPE: SHIP
 * 
 */

/*TODO
 * How to handle Evals:
 * if new sale and customer already has eval appliance, do we want to mark eval as sold?
 * Incorporate into the approvals process.
 * if updating eval as sold, then delete HBR? or mark complete?
 * if not updating, then just use new HBR and follow process as normal
 * 
 */

function processRequest(request,response){	
	
	// Probably want to disable GET
	/* if (request.getMethod() == 'GET') {
	 	// DO NOTHING
	 }*/
	/*
	 * 
	 nlobjRequest Methods	
	getAllHeaders()
	getAllParameters()
	getBody()
	getHeader(name)
	getLineItemCount(group)
	getLineItemValue(group, name, line)
	getMethod()
	getParameter(name)
	getParameterValues(name)
	getURL()
	
	nlapiStringToXML();
	nlapiSelectNodes
	nlapiSelectValue
	*/
	
	nlapiLogExecution('DEBUG','Start','Yup Started');
		
	var txt = ' ';
	// We want to ignore the builtin Netsuite Suitelet params
	var arrIgnoreParams = new Array('compid','h','deploy','script');
	var params = request.getAllParameters();
	for(param in params){
		if (arrIgnoreParams.indexOf(param) == -1) {
			nlapiLogExecution('DEBUG', "Parameter: " + param, "Value:" + params[param]);
			txt += "\n" + param + ":" + params[param];
		}
	}
	
	txt = "Rapid7's endpoint received the following parameters from MBX request\n" + txt;
	//nlapiSendEmail(340932,340932,"Rapid7 MBX Endpoint","Request Received\n\n"+txt );
	//nlapiSendEmail(2,'justin.formella@mbx.com',"Rapid7 MBX Endpoint","Request Received\n\n"+txt,'derek_zanga@rapid7.com');
	
	var notificationType = request.getParameter('notification_type');
	
	/*switch(notificationType){
	
	case 'ACKNOWLEDGE':
		process_OrderAcknowledgement(params);
		break;
	case 'READY':	
		process_SystemAssemblyComplete(params);	
		break;
	case 'CONFIGURED':	
		process_FinalConfigurationComplete(params);	
		break;
	case 'SHIP':
		process_ShippingNotification(params);		
		break;
	}*/
	
	nlapiLogExecution('DEBUG','End','Yup Ended');
	
	var xmlResponse =  '<?xml version="1.0" encoding="utf-8" ?>';
	xmlResponse +=		'<Rapid7Response>';
	xmlResponse +=		'<message>';
	xmlResponse +=		'Request received.';
	xmlResponse +=		'</message>';
	xmlResponse +=		'</Rapid7Response>';
	response.write(xmlResponse);
}


function process_OrderAcknowledgement(params){
	
	//TODO I have to handle RMA at this point, update master record to RMA (returned for eval?) Same with Appliance? and get rid of NXL link.
	//  Look up HBR to 

	/*
	 * This stage processes inventory purchase
	 * NOTIFICATION_TYPE: ACKNOWLEDGE
	 * CUSTOMER_COMMENT: This is a field which can contain customer specified data about this order
	 * CUSTOMER_COMMENT_2: This is a field which can contain customer specified data about this order
	 * ORD_NO: The order number in our system
	 * PLATFORM_ITEM_DESC: This is your platforms name and model number
	 * PLATFORM_ITEM_NO: This is the item number in our system of the platform
	 * PO_NO: Your PO number
	 * RMA_NO: The RMA number if this is a return
	 * SHIPPING_DT: The estimated date the unit will ship
	 */ 
	
	
}
function process_SystemAssemblyComplete(params){

// Debit Credit at this point
// Item reciept - received purchase order

// RMAs will enter this stage when they are ready to redeploy, 

// Need required params array

	/*
	 * This stage notifies of inventory ready for imaging
	 * NOTIFICATION_TYPE: READY
	 * CUSTOMER_COMMENT: This is a field which can contain customer specified data about this order
	 * 		This will be HBR#
	 * CUSTOMER_COMMENT_2: This is a field which can contain customer specified data about this order
	 * MAC_ADDR_ETH0: Corresponding MAC address for this adapter, if this adapter is in this system
	 * MAC_ADDR_ETH1: Corresponding MAC address for this adapter, if this adapter is in this system
	 * ORD_NO: The order number in MBX system
	 * 		custrecordr7appliancemastermfgordernumb
	 * PLATFORM_ITEM_DESC: This is your platforms name and model number
	 * 		custrecordr7appliancemastermfgsystemname
	 * PLATFORM_ITEM_NO: This is the item number in our system of the platform
	 * 		custrecordr7appliancemastermfgplatformno
	 * PO_NO: Your PO number
	 * 		custrecordr7appliancemasterponumber
	 * RMA_NO: The RMA number if this is a return
	 * SERIAL_NO: The serial number of this unit
	 * 		name
	 * SHIPPING_DT: The estimated date the unit will ship
	 * 		Not using ETA field for now
	 */
	
	// If the RMA No is not empty then there will be an RMA PO no so ignore but fill in rma_no
	
	// Create object to house all Appliance Master IDs created/updated
	var createdApplianceMasterRecords = new Object();
	var updatedApplianceMasterRecords = new Object();
	var applianceMasterFields = new Object();
	var platformNumber = request.getParameter('platform_item_no');
	var hardwareType = getHardwareTypeFromPlatformNumber(platformNumber);
	var poNumber = request.getParameter('po_no');
	// Strip the PO Number of all extra text
	poNumber = getPONumberFromString(poNumber);
	
	// Store applianceMasterFields that are same for entire batch
	applianceMasterFields['custrecordr7appliancemastermfgordernumb'] = request.getParameter('ord_no');	
	applianceMasterFields['custrecordr7appliancemastermfgsystemname'] = request.getParameter('platform_item_desc');
	applianceMasterFields['custrecordr7appliancemasterglobalstatus'] = 16; // New Inventory
	//applianceMasterFields['custrecordr7appliancemasterstocklocation'] = 1; // New Inventory for Sale
	applianceMasterFields['custrecordr7appliancemastermanufacturer'] = 38370; //MBX Systems
	applianceMasterFields['custrecordr7appliancemastermfgplatformno'] = platformNumber;
	applianceMasterFields['custrecordr7appliancemasterhardwaretype'] = hardwareType;
	
	//PO should be last
	applianceMasterFields['custrecordr7appliancemasterponumber'] = poNumber;
	//applianceMasterFields[''] = request.getParameter('customer_comment');
	//applianceMasterFields[''] = request.getParameter('customer_comment_2');
	
	/*
	 * Serial Number will come through as a comma delimited list if there are multiples, same for tracking
	 * 	Store all serial numbers in string first
	 * 	Then split by comma into an array
	 * 	Loop through array to create appliance records
	 */
	
	// TODO look at this and make sure it is working properly.  Do READY notifications have serial num?
	var stringSerialNumbers = request.getParameter('serial_no');
	if (stringSerialNumbers != null && stringSerialNumbers != '') {
		var arrSerialNumbers = stringSerialNumbers.split(",");
	}
	for (var i = 0; arrSerialNumbers != null && i < arrSerialNumbers.length; i++) {
		var serialNumber = arrSerialNumbers[i];
		applianceMasterFields['name'] = serialNumber;
		nlapiLogExecution('DEBUG','serial '+i,serialNumber);	

		/**
		 * TODO If this is an box that has been RMAed fill in the rmaNo? or is the RMA record already created?
		 * Maybe update RMA status?  Check what MBX RMA status exist?
		 */
		/*var rmaNo = request.getParameter('rma_no');
		if (rmaNo != null && rmaNo != '') {
			applianceMasterFields[''] = rmaNo;
		}*/
	/**
	 * TODO Check to see if serial exists, if not create new record.  Do we rely on this or is there a better way? always assume new if no RMA num?
	 */
		var objApplianceRecords = lookupApplianceSerial(serialNumber);
		if (objApplianceRecords == null) {
			
				applianceMasterFields['custrecordr7appliancemastersystemconfig'] = getSystemConfigFromHardwareType(hardwareType); // Set system configuration (tech specs)
				applianceMasterFields['custrecordr7appliancemastercomments'] = 'Created by MBX Endpoint - Assembly Complete notifcation'; // Set comments
				applianceMasterFields['custrecordr7appliancemasterdatepurchased'] = nlapiDateToString(new Date()); // Set date purchase to today
			
			// Create New Appliance Master record with fields from params
			var id = createNewApplianceMaster(applianceMasterFields);
			if (id != null && id != '') {			
				createdApplianceMasterRecords[id] = serialNumber;
				nlapiLogExecution('DEBUG', 'NEW APPLIANCE MASTER: ' + id, serialNumber);
			}
		}
		else {
			// Update Appliance Master and Appliance record
			updateApplianceMaster(applianceMasterFields, objApplianceRecords);
		}
	}
	// Send Report with new Rec Ids and Serials
	if (createNewApplianceMaster != {} && createNewApplianceMaster != null) {
		sendAppMasterReportEmail(createdApplianceMasterRecords);
	}
}

function process_FinalConfigurationComplete(params){

// How do we store NXL number, lookup based off HBR? if that's the case how do we store HBR?

	/*
	 * This stage notfies system imaging is complete and ready for shipping
	 * NOTIFICATION_TYPE: CONFIGURED
	 * CUSTOMER_COMMENT: This is a field which can contain customer specified data about this order
	 * CUSTOMER_COMMENT_2: This is a field which can contain customer specified data about this order
	 * MAC_ADDR_ETH0: Corresponding MAC address for this adapter, if this adapter is in this system
	 * MAC_ADDR_ETH1: Corresponding MAC address for this adapter, if this adapter is in this system
	 * ORD_NO: The order number in our system
	 * PLATFORM_ITEM_DESC: This is your platforms name and model number
	 * PLATFORM_ITEM_NO: This is the item number in our system of the platform
	 * PO_NO: Your PO number
	 * RMA_NO: The RMA number if this is a return
	 * SERIAL_NO: The serial number of this unit
	 * SHIPPING_DT: The estimated date the unit will ship
	 */
	
	// Create Appliance Record first before updating HBR status and Appliance Master Status
	var createdApplianceRecords = new Object();
	var updatedApplianceMasterRecords = new Object();
	var applianceFields = new Object();
	var applianceMasterFields = new Object();
	var hbrId = request.getParameter('customer_comment');
	hbrId = getHbrIdFromString(hbrId);
	var platformNumber = request.getParameter('platform_item_no');
	var hardwareType = getHardwareTypeFromPlatformNumber(platformNumber);
	/*
	 * Get field values from the HBR record
	 * 	customer
	 * 	contact
	 * 	opportunity
	 * 	order
	 * 	license
	 */
	var recHBR = nlapiLoadRecord('customrecordr7appliancebuildrequest',hrbId);
	var customerId = recHBR.getFieldValue('custrecordr7appbuildcustomer');
	var contactId = recHBR.getFieldValue('custrecordr7appbuildcontact');
	var opportunityId = recHBR.getFieldValue('custrecordr7appbuildopportunity');
	var orderId = recHBR.getFieldValue('custrecordr7appbuildsalesorder');
	var licenseId = recHBR.getFieldValue('custrecordr7appbuildnexposelicense');
	var orderType = recHBR.getFieldValue('custrecordr7appbuildordertype');
	var status = lookupConfigStatusFromOrderType(orderType);
	
	// Initialize Appliance Field Values
	applianceFields['custrecordr7appliancecustomer'] = customerId;
	applianceFields['custrecordr7appliancenexposelicense'] = licenseId;
	applianceFields['custrecordr7applianceopportunity'] = opportunityId;
	applianceFields['custrecordr7appliancesalesorder'] = orderId;
	applianceFields['custrecordr7appliancecontact'] = contactId;
	applianceFields['custrecordr7appliancestatus'] = status.applianceStatus;
	applianceFields['custrecordr7appliancenehardwaretype'] = hardwareType;
	
	var stringSerialNumbers = request.getParameter('serial_no');
	var arrSerialNumbers = stringSerialNumbers.split(",");
	for (var i = 0; arrSerialNumbers != null && i < arrSerialNumbers.length; i++) {
		var serialNumber = arrSerialNumbers[i];
		nlapiLogExecution('DEBUG', 'serial ' + i, serialNumber);
		
		var objApplianceRecords = lookupApplianceSerial(serialNumber);
		if (objApplianceRecords == null) {
			// If the lookup returns null then the inventory record doesn't exist and their is an issue
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'CONFIGURED ERROR - APPLIANCE MASTER DOES NOT EXIST', 'No appliance master record found for Serial Number: ' + serialNumber);
		}
		else {
			applianceFields['custrecordr7appliancemfgserialnumber'] = objApplianceRecords.recId;
			applianceFields['custrecordr7appliancecomments'] = 'Created by MBX Endpoint - Configuration Complete notifcation'; // Set comments;
			// Create New Appliance record with fields from params
			var id = createNewAppliance(applianceMasterFields);
			if (id != null && id != '') {
				createdApplianceRecords[id] = 'APP'+id;
				nlapiLogExecution('DEBUG', 'NEW APPLIANCE MASTER: ' + id, serialNumber);
				
				// if new Appliance record created then update the Master
				applianceMasterFields['custrecordr7appliancemasterglobalstatus'] = status.applianceStatus;
				//applianceMasterFields['custrecordr7appliancemasterstocklocation'] = status.stockLocation;
				var appMasterId = updateApplianceMaster(applianceMasterFields, objApplianceRecords);
				if (appMasterId != null && appMasterId != '') {
					updatedApplianceMasterRecords[appMasterId] = serialNumber;
				}
			}
		}
	}
	// Send Report with new Rec Ids and Serials
	if (createdApplianceRecords != null) {
		sendAppReportEmail(createdApplianceRecords);
	}
	if (updatedApplianceMasterRecords != null) {
		sendAppMasterReportEmail(createdApplianceRecords);
	}
}
function process_ShippingNotification(params){

 	// Item Fulfillment - shipment
	/*
	 * This stage notifies system has shipped
	 * NOTIFICATION_TYPE: SHIP
	 * CUSTOMER_COMMENT: This is a field which can contain customer specified data about this order
	 * CUSTOMER_COMMENT_2: This is a field which can contain customer specified data about this order
	 * ORD_NO: The order number in our system
	 * PLATFORM_ITEM_DESC: This is your platforms name and model number
	 * PLATFORM_ITEM_NO: This is the item number in our system of the platform
	 * PO_NO: Your PO number
	 * RMA_NO: The RMA number if this is a return
	 * SERIAL_NO: The serial number of this unit
	 * SHIPPING_DT: The date the unit will ship
	 * SHIP_TO_ADDR_1: The first line of the ship to address
	 * SHIP_TO_ADDR_2: The second line of the ship to address
	 * SHIP_TO_ADDR_3: The third line of the ship to address (usually city, state zip)
	 * SHIP_TO_COUNTRY: The country of the ship to address
	 * SHIP_TO_NAME: The name of the company the unit is shipping to
	 * SHIP_VIA_CD: The three letter code of the shipping method
	 * SHIP_VIA_DESC: The description of the shipping method (Example: UPS Intl 2-5 day)
	 * TRACKING_NO: The tracking number for this unit
	 */
}




function createNewAppliance(fields){
	var emailBody = '';
	try {	
		var record = nlapiCreateRecord('customrecordr7appliance');
		for (field in fields) {
			record.setFieldText(field, fields[field]);
			emailBody += '\n\n' + field + ': ' + fields[field];
		}
		var id = nlapiSubmitRecord(record);
		return id;
	}
	catch(e){
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser,adminUser,'MBX INTEGRATION ERROR: CREATING NEW APPLIANCE',e+emailBody);
	}
}

function updateAppliance(fields){
	var record = nlapiCreateRecord('customrecordr7appliance');
	for (field in fields) {
		record.setFieldValue(field, fields[field]);
	}
}

function lookupApplianceSerial(serialNumber){
	/**
	 * Build objApplianceRecords object to hold:
	 * 	recId = Appliance Master Id
	 * 	appId = Most recent Appliance Id
	 */
	var objApplianceRecords = new Object();
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('name',null,'is',serialNumber);
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('internalid','custrecordr7appliancemfgserialnumber');
	//columns[2] = new nlobjSearchColumn('custrecordr7appliancedateoftransaction','custrecordr7appliancemfgserialnumber');
	columns[1].setSort(true);
	
	var results = nlapiSearchRecord('customrecordr7appliancemaster', null, filters, columns);
	if (results != null && results != '') {
		for (var i = 0; i < 1; i++) {
			var result = results[j];
			objApplianceRecords.recId = result.getValue(columns[0]);
			objApplianceRecords.appId = result.getValue(columns[1]);
			nlapiLogExecution('DEBUG', 'recId:', objApplianceRecords.recId);
			nlapiLogExecution('DEBUG', 'appId:', objApplianceRecords.appId);
		}
	}
	else{
		objApplianceRecords = null;
	}
	for(prop in objApplianceRecords){
		nlapiLogExecution('DEBUG',prop,objApplianceRecords[prop]);
	}
	return objApplianceRecords;
}

function createNewApplianceMaster(fields){
	var emailBody = '';
	try {	
		var record = nlapiCreateRecord('customrecordr7appliancemaster');
		for (field in fields) {
			if (field != 'custrecordr7appliancemasterponumber') {
				record.setFieldValue(field, fields[field]);
				emailBody += '\n\n' + field + ': ' + fields[field];
			}
			else{
				record.setFieldText(field, fields[field]);
				emailBody += '\n\n' + field + ': ' + fields[field];
			}
		}
		var id = nlapiSubmitRecord(record);
		return id;
	}
	catch(e){
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser,adminUser,'MBX INTEGRATION ERROR: CREATING NEW APPLIANCE MASTER',e+emailBody);
	}
}

function updateApplianceMaster(fields,objApplianceRecords){
	var emailBody = '';
	try {
		if (objApplianceRecords.recId != null && objApplianceRecords.recId != '') {
			var record = nlapiLoadRecord('customrecordr7appliancemaster', objApplianceRecords.recId);
			// Don't override 'name' field or PO, shouldn't be an issue but just in case
			for (field in fields) {
				if (field != 'name' && field != 'custrecordr7appliancemasterponumber') {
					record.setFieldValue(field, fields[field]);
				}
				emailBody += '\n\n' + field + ': ' + fields[field];
			}
			var id = nlapiSubmitRecord(record);
			return id;
		}
	}
	catch(e){
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser,adminUser,'MBX INTEGRATION ERROR: UPDATING APPLIANCE MASTER',e+emailBody);
	}
}

function updateHBR(fields){
	
}

/**
 * This function uses the Platform Item Number from MBX to associate Hardware Type (List value)
 * Currently only 2 active platforms with MBX
 * 	Rapid7 Entry Level V1 (inactive internally but RMAs will still use)
 * 	Rapid7 Entry V2
 * 
 * Enterprise and Midtier should follow eventually
 * 
 * 
 * @param {Object} platformNum
 */
function getHardwareTypeFromPlatformNumber(platformNumber){
	if (platformNumber != null && platformNumber != '') {
		var hardwareType = new Number();
		switch (platformNumber) {
		
			// Rapid7 Entry V2
			case '140294':
				hardwareType = 6; // MBX Appliance (v2)
				break;
				
			// Rapid7 Entry Level V1
			case '127682':
				hardwareType = 4; // MBX Appliance (64 bit)
				break;	
		}
		return hardwareType;
	}
}

// Report email for Appliance Master records
function sendAppMasterReportEmail(object){
        var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
	var emailBody ='';
	for(prop in object){
		emailBody += '\n\n'+prop+': <a href="'+toURL+'/app/common/custom/custrecordentry.nl?id='+prop+'&rectype=179">'+object[prop]+'</a>';
	}
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	nlapiSendEmail(adminUser,adminUser,'APPLIANCE MASTER UPDATES',emailBody);
}

// Report email for Appliance Records
function sendAppReportEmail(object){
	var emailBody ='';
	for(prop in object){
		emailBody += '\n\n'+prop+': <a href="'+toURL+'/app/common/custom/custrecordentry.nl?id='+prop+'&rectype=61">'+object[prop]+'</a>';
	}
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	nlapiSendEmail(adminUser,adminUser,'APPLIANCE UPDATES',emailBody);
}

function getPONumberFromString(poNumber){
	if (poNumber != null && poNumber != '') {
		var regex = /^P\d{4,5}\b/;
		poNumber = poNumber.match(regex);
		poNumber = 'Purchase Order #'+poNumber;
		//nlapiLogExecution('DEBUG','PO Num Replace',poNumber);
		return poNumber;
	}
}

function getHbrIdFromString(hbrId){
	if (hbrId != null && hbrId != '') {
		hbrId = hbrId.replace("HBR",'');
		return hbrId;
	}
}

function getSystemConfigFromHardwareType(hardwareType){
	
	var entryV2Config = '';
	entryV2Config += '\nUbuntu 12.04';
	entryV2Config += '\n16GB DDR3\-1333 ECC unbuffered';
	entryV2Config += '\nIntel CoreTM i3\-2120T Processor \(3M Cache, 2.60 GHz\)';
	entryV2Config += '\n2 cores, 4 threads';
	entryV2Config += '\nClock speed: 2.6 GHz';
	entryV2Config += '\nIntel Smart Cache: 3 MB';
	entryV2Config += '\nBus\/Core Ratio 26';
	entryV2Config += '\nDMI: 5 GT\/s';
	entryV2Config += '\nInstruction Set 64\-bit';

//nlapiLogExecution('DEBUG','Htype: '+hardwareType,entryV2Config);
	var systemConfig = '';
	switch(hardwareType){
		case 6:
		systemConfig += entryV2Config;
		nlapiLogExecution('DEBUG','systemconf: ',systemConfig);
		break;
	}
	return systemConfig;
}

function lookupConfigStatusFromOrderType(orderType){
	if (orderType != null && orderType != '') {
		var status = new Object();
		status.applianceStatus;
		status.stockLocation;
		switch (orderType) {
			case 1: // New Sale
				status.applianceStatus = 7; // Sold
				status.stockLocation = 5; // At Customer Site
				break;
				
			case 3: // Replacement
				// We never forward replace an Eval, rather we'd just send a new Eval
				status.applianceStatus = 7; //Sold
				status.stockLocation = 5; // At Customer Site
				break;
				
			case 4: // Eval
				status.applianceStatus = 6; // Evaluation
				status.stockLocation = 5; // At Customer Site
				break;
				
			case 5: // Internal Use
				status.applianceStatus = 9; // Internal Use
				status.stockLocation = 8; // Internal Use
				break;
		}
		return status;
	}
}


