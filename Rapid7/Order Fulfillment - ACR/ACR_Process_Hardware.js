/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Nov 2012     mburstein
 *
 * MB: 12/16/14 - If sales rep is inactive then use account manager
 * 
 */
/* 
 * This library contains all functions for automatic processing of purchased hardware
 * 
 */

this.hbrTypeLabels = new Object();
	hbrTypeLabels['1'] = 'MBX Appliance Console';
	hbrTypeLabels['2'] = 'MBX Appliance Engine';
	hbrTypeLabels['3'] = 'Mid-Tier Appliance Console';
	hbrTypeLabels['4'] = 'Mid-Tier Appliance Engine';
	hbrTypeLabels['5'] = 'Enterprise Appliance Console';
	hbrTypeLabels['6'] = 'Enterprise Appliance Engine';
	//hbrTypeLabels['7'] = 'Laptop';  INACTIVE
	//hbrTypeLabels['8'] = 'Metasploit'; Appliance INACTIVE
this.adminId = nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');

function processHWD(recOrder, arrHWDItems, orderUpdates){
	var arrHbrs = new Array();
	for (var i = 0; arrHWDItems != null && i < arrHWDItems.length && unitsLeft(1000) && timeLeft() && !exitScript; i++) {

		var lineItem = arrHWDItems[i];
		var itemProperties = lineItem['itemProperties'];
		var itemId = lineItem['itemId'];
		var lineId = lineItem['lineId'];
		var acrId = arrItemACRIds[lineId];
		var lineNum = lineItem['lineNum'];
		//var licenseId = lineItem['licenseId'];
		var licenseId = recOrder.getLineItemValue('item', 'custcolr7translicenseid', lineNum);
		var hbrType = lineItem['requireshbr'];
		var activationKey = recOrder.getLineItemValue('item', arrProductTypes[acrId]['optionid'], lineNum);
		//nlapiLogExecution('DEBUG','ItemId: HBRtype',itemId +': '+ hbrType);
		
		// Create object to hold fields for HBR	
		var hbrFields = new Object();
		hbrFields['licenseid'] = licenseId;
		hbrFields['hbrtype'] = hbrType;
		// Get line Shipping Address
		hbrFields['lineship'] = recOrder.getLineItemValue('item', 'custcolr7lineshipaddress', lineNum);
		hbrFields['linecontact'] = recOrder.getLineItemValue('item', 'custcolr7translinecontact', lineNum);
		hbrFields['linenum'] = lineNum;
		// Use licenseId, hbrType, Shipping (custcolr7lineshipaddress)
		try{
			if (hbrFields['licenseid'] != 'XXX' && hbrFields['licenseid'] != null && activationKey != null && hbrFields['licenseid'].substr(0, 3) != 'HBR'){
				var objHbr = createHardwareBuildRequest(recOrder,hbrFields);
				if (objHbr != null && objHbr != '') {
					// Stamp License ID Text with HBR# if successful
					for (prop in objHbr) {
						var hbrId = prop;
					}
					recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'HBR'+ hbrId);
					orderUpdates.lines[lineNum]['custcolr7translicenseid'] = 'HBR' + hbrId;
					// Build array of all submitted HBRs
					arrHbrs[arrHbrs.length] = objHbr;
				}
			}
			else{
				nlapiLogExecution('DEBUG','xxx','xxx');
				recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
				orderUpdates.lines[lineNum]['custcolr7translicenseid'] = 'XXX';
			}
		 }
		 catch(e){
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		 	nlapiSendEmail(adminUser,adminUser,'ERROR PROCESSING HBR','Order: ' + recOrder.getId() +'\n lineNum: ' + lineNum + '\n' + e + '\n' +e.stack);
		 	recOrder.setLineItemValue('item', 'custcolr7translicenseid', lineNum, 'XXX');
			 orderUpdates.lines[lineNum]['custcolr7translicenseid'] = 'XXX';
		 }
	}
	return arrHbrs;
}		
/*
 * Hardware Build Request
 */
function createHardwareBuildRequest(recOrder,hbrFields){
	
	// Get Necessary field values from recOrder
	var customerId = recOrder.getFieldValue('entity');
	var oppId = recOrder.getFieldValue('opportunity');
	var salesRepId = recOrder.getFieldValue('salesrep');
	var contactId = hbrFields['linecontact'];
	var orderId = recOrder.getId();
	var hbrType = hbrFields['hbrtype'];
	var accountManagerId = nlapiLookupField('customer', customerId, 'custentityr7accountmanager');

	//nlapiLogExecution('DEBUG', 'Processing Hardware For Order', recOrder.getRecordType() + ': ' + recOrder.getId());
	
	// Create an HBR record
	var newHBR = nlapiCreateRecord('customrecordr7appliancebuildrequest');
	newHBR.setFieldValue('custrecordr7appbuildcustomer',customerId);
	newHBR.setFieldValue('custrecordr7appbuildsalesorder',orderId);
	newHBR.setFieldValue('custrecordr7appbuildopportunity',oppId);
	newHBR.setFieldValue('custrecordr7appbuildcontact',contactId);
	// MB: 12/16/14 - If sales rep is inactive then use account manager
	if( nlapiLookupField('employee',salesRepId,'isinactive') != 'T'){
		newHBR.setFieldValue('custrecordr7appbuildsalesrep',salesRepId);
	}
	else{
		newHBR.setFieldValue('custrecordr7appbuildsalesrep',accountManagerId);
	}
	//newHBR.setFieldValue('custrecordr7appbuildcontactphone',phone);
	//newHBR.setFieldValue('custrecordr7appbuildcontactemail',email);
	newHBR.setFieldValue('owner',accountManagerId);
	newHBR.setFieldValue('custrecordr7appbuildstatus',1); // Not Started
	newHBR.setFieldValue('custrecordr7appbuildordertype',1); // New Sale
	newHBR.setFieldValue('custrecordr7appbuildhbrtype',hbrType);
	newHBR.setFieldValue('custrecordr7appbuildshippingaddress',hbrFields['lineship']);
	newHBR.setFieldValue('custrecordr7appbuildorderlineid',hbrFields['linenum']);
	
	// Set Product Key if not an engine build
	// Make an array of HBR Types that create Consoles (these need licenses)
	var consoleHBRTypes = new Array("1","3","5");
	if(consoleHBRTypes.indexOf(hbrFields['hbrtype']) != -1){
		newHBR.setFieldText('custrecordr7appbuildnexposelicense',hbrFields['licenseid']);
	}
	
	var hbrId = nlapiSubmitRecord(newHBR,false,true);
	// Return object, key:value = hbrId:hbrType
	var objHbr = new Object();
	objHbr[hbrId] = hbrType;
	return objHbr;
}

function sendHBRNotifications(arrHbrs,recOrder){
	var customerId = recOrder.getFieldValue('entity');
	var customerName = recOrder.getFieldText('entity');
	var orderId = recOrder.getId();
	var tranId = recOrder.getFieldValue('tranid');
	var subject = 'HBRs submitted for '+customerName+' per order ' + tranId;
	var accountManagerId = nlapiLookupField('customer', customerId, 'custentityr7accountmanager');
	var body = '';
    body += '<p>Customer: <a href="https://663271.app.netsuite.com/app/common/entity/custjob.nl?id='+customerId+'">' + customerName + '</a></p>';
    body += '<p>Order: <a href="https://663271.app.netsuite.com/app/accounting/transactions/salesord.nl?id='+orderId+'&whence=">' + tranId + '</a></p>';
	body += 'HBRs:\n';
	body += '<table><tr>';
	body += '<th>ID</th>';
	body += '<th>Type</th>';
	// arrHbrs is multidimensional, each index holds an HBR object with key:value = hbrId:hbrType;
	for(var i=0; arrHbrs != null && i< arrHbrs.length; i++){
		var hbr = arrHbrs[i];
		for (prop in hbr) {
			var hbrId = prop;
			var hbrType = hbr[prop];
		}
		body += '<tr>';
        body += '<td><a href="https://663271.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=379&id='+hbrId+'">HBR'+hbrId+'</a></td>';
			body += '<td>'+hbrTypeLabels[hbrType]+'</td>';
		body += '</tr>';
	}
	body += '</tr><table>';
	// Send email to AM with list of submitted HBRs
	try {
		nlapiSendEmail(adminId, accountManagerId,subject,body,'netsuite_admin@rapid7.com');
	}
	catch(e){
		nlapiSendEmail(adminId,'netsuite_admin@rapid7.com','ERROR NOTIFYING AM OF HBR','Order: ' + recOrder.getId() +'\n'+ e);
	}
}

 /*
  * 	Dedicated Hosted Build
  */
function sendDedicatedBuildRequestEmail(recOrder,dedicatedId){
	
	try {
		 //Set email fields
		var toHelpdesk = 'hosted-helpdesk@rapid7.com';
		var customerId = recOrder.getFieldValue('entity');
		var sendEmailFromAM = nlapiLookupField('customer', customerId, 'custentityr7accountmanager'); // same as var sendEmailFrom in sendActivationEmails
                if(sendEmailFromAM == null || sendEmailFromAM == ''){
                    sendEmailFromAM = adminId;
                }
		var ccSupport = 'Derek_Kolakowski@rapid7.com';
		var ccArray = new Array();
		ccArray.push(ccSupport);
		ccArray.push('michael_burstein@rapid7.com');
		ccArray.push('pamela_card@rapid7.com');
		ccArray.push('brian_waller@rapid7.com');
		ccArray.push('Ahmed_Mohamed@rapid7.com');
		
		var customerName = recOrder.getFieldText('entity');
		var orderName = recOrder.getFieldValue('tranid');
		var contact = '';
		var onboardingId = recOrder.getLineItemValue('recmachcustrecordr7onboardingsalesorder', 'id', 1);
		if (onboardingId != null && onboardingId != '') {
			var onboardingContactId = nlapiLookupField('customrecordr7onboarding', onboardingId, 'custrecordr7onboardingcontact');
			if (onboardingContactId != null & onboardingContactId != '') {
				var recOnboardingContact = nlapiLoadRecord('contact', onboardingContactId);
				var onboardingContactFirst = recOnboardingContact.getFieldValue('firstname');
				var onboardingContactLast = recOnboardingContact.getFieldValue('lastname');
				contact += onboardingContactFirst + ' ' + onboardingContactLast;
			}
		}
		var buildSubject = customerName + ' Purchased 1 Dedicated Hosted Engine.';
		var dedicatedRecTypeId = 553; // id for customrecordr7dedicatedhe
	
		// Attach to record type/id pair
		var attachToRecords = new Object();
		attachToRecords['recordtype'] = dedicatedRecTypeId;
		attachToRecords['record'] = dedicatedId;
		// Link to Dedicated Record
        var dedicatedRecLink = '<a href="https://663271.app.netsuite.com/app/common/custom/custrecordentry.nl?id='+dedicatedId+'&rectype='+dedicatedRecTypeId+'">DED'+dedicatedId+'</a>';
		var buildBody = '\nDedicated Hosted Record: '+dedicatedRecLink;
		buildBody += '\nCompany: ' + customerName;
		buildBody += '\nSales Order: ' + orderName;
		try{
			buildBody += '\n Contact: ' + contact;
		}
		catch(e){
			nlapiSendEmail(adminId, 'netsuite_admin@rapid7.com', 'Could Not add contact to Dedicated Build Request', e.name + ' : ' + e.message + '\n Order: '+ orderName);
		}
		
		nlapiSendEmail(sendEmailFromAM, toHelpdesk, buildSubject, buildBody, ccArray, null, attachToRecords);
	} 
	catch (e) {
		nlapiSendEmail(adminId, 'netsuite_admin@rapid7.com', 'Could Not Create Dedicated Build Request', e.name + ' : ' + e.message);
	}
}