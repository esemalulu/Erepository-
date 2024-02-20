/**
 * Functions that send emails when the status of a PCN changed.
 * Suitelet that accepts the links from the emails.
 * 
 * Version    Date            Author           Remarks
 * 1.00       08 Jun 2016     Jacob Shetler
 *
 */

//The different approvals that can happen to a PCN.
var GD_PCNAPPR_PURCH = '1';
var GD_PCNAPPR_MANU = '2';
var GD_PCNAPPR_ENGN = '3';
var GD_PCNAPPR_SALES = '4';
var GD_PCNAPPR_BOM = '5';
var GD_PCNAPPR_SERV = '6';
var GD_PCNAPPR_QC = '7';
var GD_PCNAPPR_PRES = '8';
var GD_PCNAPPR_PM = '9';

/**
 * Suitelet that is available without login. Updates the PCN with the information in the link.
 * 
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GDPCN_EmailResponseSuitelet(request, response)
{
	//Get the info from the URL.
	var isApproval = request.getParameter('appr') == 'T';
	var pcnId = ConvertNSFieldToString(request.getParameter('pcnid'));
	var empId = ConvertNSFieldToString(request.getParameter('empid'));
	var approvalType = ConvertNSFieldToString(request.getParameter('apprid'));
	
	//Throw an error if any of the types are not set.
	if (pcnId.length == 0) throw 'Error: No PCN specified.';
	if (empId.length == 0) throw 'Error: No Employee specified.';
	if (approvalType.length == 0) throw 'Error: No Approval Type specified.';
	
	var maxTryCount = 1000;
	var curTryCount = 0;
	while(curTryCount < maxTryCount) {
		//Set the info in the PCN if everything is set.
		var pcnRec = nlapiLoadRecord('customrecordrvsproductchangenotice', pcnId);
		var responseText = '';
		if (!isApproval)
		{
			//Then we're rejecting the PCN.
			pcnRec.setFieldValue('custrecordproductchangenotice_status', GD_PCNSTATUS_REJECTED);
			pcnRec.setFieldValue('custrecordgd_pcnrejectedreason', 'Per ' + nlapiLookupField('employee', empId, 'firstname'));
			try {
				nlapiSubmitRecord(pcnRec, false, true);
				responseText = 'PCN #' + pcnRec.getFieldValue('name') + ' successfully rejected.';
				break;
			}
			catch (err){
				nlapiLogExecution('debug', 'err message', JSON.stringify(err) + ' - err.name: ' + err.name);
	    		if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
	    			curTryCount++;
	    			continue;
	    		}
	    		throw err;
			}
		}
		else
		{
			//Switch based on the type of approval we're giving. Then set the field values and submit.
			var todaysDate = getTodaysDate();
			if (approvalType == GD_PCNAPPR_PURCH)
			{
				pcnRec.setFieldValue('custrecordproductchangenotice_purchappvl', empId);
				pcnRec.setFieldValue('custrecordproductchangenotice_purchappdt', todaysDate);
			}
			if (approvalType == GD_PCNAPPR_MANU)
			{
				pcnRec.setFieldValue('custrecordproductchangenotice_pltmgrapvl', empId);
				pcnRec.setFieldValue('custrecordproductchangenotice_pltmgrapdt', todaysDate);
			}
			if (approvalType == GD_PCNAPPR_ENGN)
			{
				pcnRec.setFieldValue('custrecordproductchangenotice_engapprvl', empId);
				pcnRec.setFieldValue('custrecordproductchangenotice_engapprdt', todaysDate);
			}
			if (approvalType == GD_PCNAPPR_SALES)
			{
				pcnRec.setFieldValue('custrecordproductchangenotice_salesappvl', empId); 		//GM Approval
				pcnRec.setFieldValue('custrecordproductchangenotice_salesappdt', todaysDate);
			}
			if (approvalType == GD_PCNAPPR_PM)
			{
				pcnRec.setFieldValue('custrecordgd_pcn_prodmanagerappvl', empId);				// PM approval
				pcnRec.setFieldValue('custrecordgd_pcn_prodmanappvldate', todaysDate);
			}
			if (approvalType == GD_PCNAPPR_BOM)
			{
				pcnRec.setFieldValue('custrecordgd_pcn_bomapproval', empId);
				pcnRec.setFieldValue('custrecordgd_pcn_bomappvldate', todaysDate);
			}
			if (approvalType == GD_PCNAPPR_SERV)
			{
				pcnRec.setFieldValue('custrecordgd_pcn_serviceappvl', empId);
				pcnRec.setFieldValue('custrecordgd_pcn_serviceappvldate', todaysDate);
			}
			if (approvalType == GD_PCNAPPR_QC)
			{
				pcnRec.setFieldValue('custrecordgd_pcnqcapp', empId);
				pcnRec.setFieldValue('custrecordgd_pcnqcappdt', todaysDate);
			}
			if (approvalType == GD_PCNAPPR_PRES)
			{
				pcnRec.setFieldValue('custrecordgd_pcnpresapp', empId);
				pcnRec.setFieldValue('custrecordgd_pcnpresappdt', todaysDate);
			}
			try {
				nlapiSubmitRecord(pcnRec, false, true);
				responseText = 'PCN #' + pcnRec.getFieldValue('name') + ' successfully approved.';
				break;
			}
			catch (err){
				nlapiLogExecution('debug', 'err message', JSON.stringify(err) + ' - err.name: ' + err.name);
	    		if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
	    			curTryCount++;
	    			continue;
	    		}
	    		throw err;
			}
		}
	}
	response.write(responseText);
}

/**
 * Sends emails to the correct group based on the status of the PCN
 * 
 * @param {nlobjRecord} pcnRec The PCN record object
 */
function GDPCN_SendEmails(pcnRec)
{
	//Get the email information that will be used regardless of the email type
	var records = {
		'record': pcnRec.getId(),
		'recordtype': pcnRec.getRecordType()
	};
	var emailSubject = 'PCN #' + pcnRec.getFieldValue('name');
	var fromEmployeeID = pcnRec.getFieldValue('custrecordproductchangenotice_requestby');
	
	//Get the URL of the PCN and the base URL of the suitelet to approve the PCN.
    var nsBaseURL = GetDataCenterUrls().systemDomain;
	var suiteletURLBase = nlapiResolveURL('suitelet', 'customscriptgd_pcnemail_suite', 'customdeploygd_pcnemail_suite', true);
    var pcnAbsoluteURL = nsBaseURL + '/' + nlapiResolveURL('record', pcnRec.getRecordType(), pcnRec.getId(), 'VIEW');
	var pcnLinkHTML = '<br />The base PCN printout is attached to this email. <a href="' + pcnAbsoluteURL + '">Click here to view the PCN and other attachments in NetSuite.</a>';
	
	//Get the base PCN printout
	var pcnHTML = '<pdf><head>' +
						'<style>' +
							'.sectionhead {font-weight:bold; font-size:12px; background-color:#8F8F8F;} ' +
							'.tophead {font-weight:bold; width:1%; white-space:nowrap;} ' +
							'.internalhead {font-weight:bold; margin:1px; background-color:#BABABA; width:1%; white-space:nowrap;} ' +
							'.tablehead {font-weight:bold; background-color:#EBEBEB; width:1%; white-space:nowrap;} ' +
							'.smalltabledata {font-size:10px;} ' +
						'</style>' +
					'</head>' +
					'<body style="font-family:Verdana, Arial, Sans-serif;font-size:12px;margin-left:.1cm;margin-right:.1cm;">'
						 + getPCNHeader(pcnRec)
						 + getPCNProductsImpacted(pcnRec)
						 + getPCNChangeDescription(pcnRec)
						 + getPCNPartChanges(pcnRec)
						 + getPCNBOMImpact(pcnRec)
						 + getPCNObsolescence(pcnRec)
						 + getPCNSignatures(pcnRec)
					+ '</body></pdf>';
	var pcnPDFFile = nlapiXMLToPDF('<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n' + pcnHTML);
	pcnPDFFile.setName('PCN #' + pcnRec.getFieldValue('name') + '.pdf');
	
	//Send the emails based on the status.
	var pcnStatus = pcnRec.getFieldValue('custrecordproductchangenotice_status');
	var seriesRecord = nlapiLoadRecord('customrecordrvsseries', pcnRec.getFieldValue('custrecordproductchangenotice_series'));
	
	// Get all locations set on the PCN
	var locationIdArray = pcnRec.getFieldValues('custrecordgd_pcn_locations') || [];
	
	// if multiselect fields only has one value, it returns a string so convert it to an array.
	if (typeof locationIdArray == 'string') {locationIdArray = locationIdArray.split();}
	
	if (pcnStatus == GD_PCNSTATUS_REJECTED){
		//Build the email to say that the PCN was rejected.
		var emailBody = 'PCN #' + pcnRec.getFieldValue('name') + ' has been rejected.<br />' + pcnLinkHTML;
		emailSubject += ' Rejected';
		// Send an email to every member with an email set of the PCN groups set on the PCN locations
		SendToLocationEmailGroup(fromEmployeeID, locationIdArray, emailSubject, emailBody, records, pcnPDFFile, 'custrecordgd_location_pcnrejectgrp', pcnRec, suiteletURLBase, pcnLinkHTML);
	} else if (pcnStatus == GD_PCNSTATUS_COMPLETE){
		//Build the email to say the PCN was completed.
		emailSubject += ' Complete';
		var emailBody = 'PCN #' + pcnRec.getFieldValue('name') + ' has been completed.<br />' + pcnLinkHTML;
		// Send an email to every member with an email set of the PCN groups set on the PCN locations
		SendToLocationEmailGroup(fromEmployeeID, locationIdArray, emailSubject, emailBody, records, pcnPDFFile, 'custrecordgd_location_pcncompgrp', pcnRec, suiteletURLBase, pcnLinkHTML);
	} else if (pcnStatus == GD_PCNSTATUS_PENDINGAPPROVAL){
		//Build the body to say it's pending approval.
		emailSubject += ' Pending Approval';
		var emailBody = 'This is <u>notification only</u> of a Pending PCN that has been submitted for approval. Please review.<br />PCN #' + pcnRec.getFieldValue('name') + ' has been marked as Pending Approval.<br />' + pcnLinkHTML;
		
		//send the email without links
		// Send an email to every member with an email set of the PCN groups set on the PCN locations.
		SendToLocationEmailGroup(fromEmployeeID, locationIdArray, emailSubject, emailBody, records, pcnPDFFile, 'custrecordgd_location_pcnpendappnoteonly', pcnRec, suiteletURLBase, pcnLinkHTML);
		
		// Send an email to every member with an email set of the PCN groups set on the PCN locations with links.
		SendToLocationEmailGroup(fromEmployeeID, locationIdArray, emailSubject, emailBody, records, pcnPDFFile, 'custrecordgd_location_pcnpendappgrp', pcnRec, suiteletURLBase, pcnLinkHTML);

	} else if (pcnStatus == GD_PCNSTATUS_PENDINGFINAL){
		emailSubject += ' Pending Final Approval';
		// Send an email to every member with an email set of the PCN groups set on the PCN locations.
		SendToLocationEmailGroup(fromEmployeeID, locationIdArray, emailSubject, emailBody, records, pcnPDFFile, 'custrecordgd_location_pcnfinalappgrp', pcnRec, suiteletURLBase, pcnLinkHTML);

	}
}

/**
 * Creates the links shown on the email body and sends the emails out.
 * 
 * @param {nlobjRecord} pcnRec The PCN record object
 */
function SendToLocationEmailGroup(fromEmployeeID, locationIdArray, emailSubject, emailBody, records, pcnPDFFile, locationGroupType, pcnRec, suiteletURLBase, pcnLinkHTML){
	var locationEntityGroupIdsSearchResults = nlapiSearchRecord('location', null, new nlobjSearchFilter('internalid', null, 'anyof', locationIdArray), new nlobjSearchColumn(locationGroupType)) || [];
	var entityGroupIdsArray = new Array();
	var uniqueEntityGroupObject = new Object();
	var entityGroupId = null;
	for (var i = 0; i < locationEntityGroupIdsSearchResults.length; i++){
		entityGroupId = locationEntityGroupIdsSearchResults[i].getValue(locationGroupType) || null;
		if (!uniqueEntityGroupObject.hasOwnProperty(entityGroupId) && entityGroupId != null)
			entityGroupIdsArray.push(entityGroupId);
		uniqueEntityGroupObject[entityGroupId] = true;
	}
  	entityGroupIdsArray == entityGroupIdsArray || [];
  	if (entityGroupIdsArray.length > 0){
  	  var entityGroupMemberEmailsSearchResults = nlapiSearchRecord('entitygroup', null, [new nlobjSearchFilter('internalid', null, 'anyof', entityGroupIdsArray), new nlobjSearchFilter('email', 'groupmember', 'isnotempty', null)], [new nlobjSearchColumn('email', 'groupmember'), new nlobjSearchColumn('internalid', 'groupmember')]) || [];
      var memberEmail = null;
      var uniqueEmailGroupObject = new Object();
      var employeeLookup = {};
      var empId = 0;
      var emailBodyWithLinks = '';
      for (var i = 0; i < entityGroupMemberEmailsSearchResults.length; i++){
          memberEmail = entityGroupMemberEmailsSearchResults[i].getValue('email', 'groupmember') || null;
          if (!uniqueEmailGroupObject.hasOwnProperty(memberEmail) && memberEmail != null){
        	  empId = entityGroupMemberEmailsSearchResults[i].getValue('internalid', 'groupmember');
        	  // This lookup only needs to be called one time in this for loop.
        	  employeeLookup = nlapiLookupField('employee', empId, ['custentityrvsservicefunction', 'custentityrvspurchasingmanagerfunction', 
        	                                                        'custentityrvsplantmanagerfunction', 'custentityrvsengineeringfunction', 'custentityrvssalesmanagerfunction']);
              if (locationGroupType == 'custrecordgd_location_pcnpendappgrp'){
                  emailBodyWithLinks = 'PCN #' + pcnRec.getFieldValue('name') + ' has been marked as Pending Approval.<br />Use the links below to approve this PCN<br /><br /><table>';

                  //Loop over the approval functions this employee has available.
                  if (employeeLookup.custentityrvspurchasingmanagerfunction == 'T')
                      emailBodyWithLinks += '<tr><td>Purchasing Approval</td><td><a href="' + suiteletURLBase + '&pcnid=' + pcnRec.getId() + '&appr=T&empid='+empId+'&apprid=' + GD_PCNAPPR_PURCH + '">Approve</a></td></tr>';
                  if (employeeLookup.custentityrvsplantmanagerfunction == 'T')
                      emailBodyWithLinks += '<tr><td>Manufacturing Approval</td><td><a href="' + suiteletURLBase + '&pcnid=' + pcnRec.getId() + '&appr=T&empid='+empId+'&apprid=' + GD_PCNAPPR_MANU + '">Approve</a></td></tr>';
                  if (employeeLookup.custentityrvsengineeringfunction == 'T')
                      emailBodyWithLinks += '<tr><td>Engineering Approval</td><td><a href="' + suiteletURLBase + '&pcnid=' + pcnRec.getId() + '&appr=T&empid='+empId+'&apprid=' + GD_PCNAPPR_ENGN + '">Approve</a></td></tr>';
                  if (employeeLookup.custentityrvssalesmanagerfunction == 'T'){
                      emailBodyWithLinks += '<tr><td>Product Manager Approval</td><td><a href="' + suiteletURLBase + '&pcnid=' + pcnRec.getId() + '&appr=T&empid='+empId+'&apprid=' + GD_PCNAPPR_PM + '">Approve</a></td></tr>';
                      emailBodyWithLinks += '<tr><td>GM Approval</td><td><a href="' + suiteletURLBase + '&pcnid=' + pcnRec.getId() + '&appr=T&empid='+empId+'&apprid=' + GD_PCNAPPR_SALES + '">Approve</a></td></tr>';
                  }
                  if (employeeLookup.custentityrvsservicefunction == 'T')
                      emailBodyWithLinks += '<tr><td>Service Approval</td><td><a href="' + suiteletURLBase + '&pcnid=' + pcnRec.getId() + '&appr=T&empid='+empId+'&apprid=' + GD_PCNAPPR_SERV + '">Approve</a></td></tr>';
                  emailBodyWithLinks += '</table><br />' + pcnLinkHTML;
                  emailBody = emailBodyWithLinks;
              } else if (locationGroupType == 'custrecordgd_location_pcnfinalappgrp'){
                  empId = entityGroupMemberEmailsSearchResults[i].getValue('internalid', 'groupmember');
                  emailBodyWithLinks = 'PCN #' + pcnRec.getFieldValue('name') + ' has been marked as Pending Approval.<br />Use the links below to approve this PCN<br /><br /><table>';

                  if (employeeLookup.custentityrvssalesmanagerfunction == 'T'){
                      emailBodyWithLinks += '<tr><td>GM Approval</td><td><a href="' + suiteletURLBase + '&pcnid=' + pcnRec.getId() + '&appr=T&empid='+empId+'&apprid=' + GD_PCNAPPR_PRES + '">Approve</a></td></tr>';
                  }
                  emailBodyWithLinks += '</table><br />' + pcnLinkHTML;
                  emailBody = emailBodyWithLinks;
              }

              nlapiSendEmail(fromEmployeeID, memberEmail, emailSubject, emailBody, null, null, records, pcnPDFFile, true);
          }
          uniqueEmailGroupObject[memberEmail] = true;
      }
    }
}

/**
 * Send out emails for final approval for all PCNs.
 * 
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function GD_SendPCNEmails_MU(recType, recId) {
	GDPCN_SendEmails(nlapiLoadRecord(recType, recId));
}