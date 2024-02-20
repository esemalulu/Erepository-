/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Mar 2015     jeffrb
 *
 */

/**
 * Plugin for sending change order approved, denied or newly created record in GD style.
 * @param type
 */
function EmailChangeOrderSatus(changeOrderProcessType)
{
	var currentRecord = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
	var salesOrderId = currentRecord.getFieldValue('custrecordchangeorder_order');
	var seriesId = nlapiLookupField('salesorder', salesOrderId, 'custbodyrvsseries');
	var locationid = nlapiLookupField('salesorder', salesOrderId, 'location');
	var vinNumber = nlapiGetFieldText('custrecordchangeorder_unit');
	var revisionNumber = nlapiGetFieldValue('custrecordchangeorder_revisionnumber');
	var titlePrefix = 'Change Order #' + nlapiGetRecordId();
	var subject = '';
	
	if (changeOrderProcessType == 'create')	// send out an email that the change order has been create
	{
		var emailGroup = IsDealerTheOnlyChange(currentRecord) && currentRecord.getFieldValue('custrecordgdpurchasingapprovalrequired') != 'T' ?
		 	nlapiLookupField('customrecordrvsseries', seriesId, 'custrecordgd_dealeronlymodchangeorder') : 
		 	nlapiLookupField('location', locationid, 'custrecordgd_coemailgrouplocation');


		subject = 'New ' + titlePrefix + ' (VIN ' + vinNumber + '; Revision #' + revisionNumber + ')';
		var headerMessage = 'New ' + titlePrefix + ' (VIN ' + vinNumber + '; Revision #' + revisionNumber + '). See details below.';
		//nlapiLogExecution('debug', 'create change order', headerMessage);
		
		GD_EmailChangeOrder(subject, headerMessage, emailGroup, null, true);
	}
	else if (changeOrderProcessType == 'approved')	// send out an email that the change order has been approved
	{
		var emailGroup = (IsDealerTheOnlyChange(currentRecord) ? 
			nlapiLookupField('customrecordrvsseries', seriesId, 'custrecordgd_dealeronlymodchangeorder') : 
			nlapiLookupField('location', locationid, 'custrecordgd_coemailgrouplocation'));
		
		subject = titlePrefix + ' Approved (VIN ' + vinNumber + '; Revision #' + revisionNumber + ')';
		var headerMessage = titlePrefix + ' Approved (VIN ' + vinNumber + '; Revision #' + revisionNumber + ').';
		//nlapiLogExecution('debug', 'approved change order', headerMessage);
		
		GD_EmailChangeOrder(subject, headerMessage, emailGroup, null, false);
		
	}
	else if (changeOrderProcessType == 'denied')	// send out an email that the change order has been denied
	{
		subject = titlePrefix + ' (VIN ' + vinNumber + '; Revision #' + revisionNumber + ') was denied.';
		var notes = nlapiLookupField(nlapiGetRecordType(), nlapiGetRecordId(), 'custrecordchangeorder_notes');
		notes = (notes == null ? '' : notes);
		var headerMessage = titlePrefix + ' (VIN ' + vinNumber + '; Revision #' + revisionNumber + ') was denied.<br><br>' + notes;
		//nlapiLogExecution('debug', 'denied change order', headerMessage);
		
		var emailGroup = nlapiLookupField('location', locationid, 'custrecordgd_coemailgrouplocation');
		if (emailGroup)
			EmailDeniedChangeOrder(subject, headerMessage, emailGroup, null);
	}				
}

function IsDealerTheOnlyChange(currentRecord)
{
	var changeOrderOptionsCount = currentRecord.getLineItemCount('recmachcustrecordchangeorderoptions_changeorder');
	var salesOrder = nlapiLoadRecord('salesorder', currentRecord.getFieldValue('custrecordchangeorder_order'));			

	//Track whether or not dealer is the only change that was made on the change order.
	//If dealer is the only change, we do not want to update unit status. Case #3725
	var isDealerTheOnlyChange = true; //We begin by assuming that dealer is the only change, if anything else is changed set this to false
	
	// check and see if there is a new dealer
	var newDealerId = nlapiGetFieldValue('custrecordchangeorder_newdealer');
	var newShippingMethod = nlapiGetFieldValue('custrecordchangeorder_newshippingmethod');
	if (newDealerId != null && newDealerId != '') // Check if Ship method is changed
		isDealerTheOnlyChange = (newShippingMethod != null && newShippingMethod != '' && salesOrder.getFieldValue('shipmethod') != nlapiLookupField('customer', newDealerId, 'shippingitem') ? false : true);
	else
		isDealerTheOnlyChange = false;
	var newFloorplanType = nlapiGetFieldValue('custrecordchangeorder_newfloorplantype');
	isDealerTheOnlyChange = (isDealerTheOnlyChange && newFloorplanType != null && newFloorplanType != '' ? false : true);	//check if floorplan changed
	var newDecor = nlapiGetFieldValue('custrecordchangeorder_newdecor');
	isDealerTheOnlyChange = (isDealerTheOnlyChange && newDecor != null && newDecor != '' ? false : true);	//check if decor changed
	if (isDealerTheOnlyChange)	//Check if the change order is adding or removing options
	{
		for (var i=1; i<=changeOrderOptionsCount; i++)
		{
			isDealerTheOnlyChange = (currentRecord.getLineItemValue('recmachcustrecordchangeorderoptions_changeorder', 'custrecordchangeorderoptions_addoption', i) == 'T' ? false : true);
			if (isDealerTheOnlyChange)
				isDealerTheOnlyChange = (currentRecord.getLineItemValue('recmachcustrecordchangeorderoptions_changeorder', 'custrecordchangeorderoptions_removeopt', i) == 'T' ? false : true);
			
			if (!isDealerTheOnlyChange)
				break;
		}
	}
	return isDealerTheOnlyChange;
}

function GD_EmailChangeOrder(subject, message, groupId, additionalReceipients, includeApprovalLinks)
{
	nlapiLogExecution('debug', 'GD_EmailChangeOrder', 'GD_EmailChangeOrder');
	var currentUserId = nlapiGetUser();
	
	// check that the current user isn't a "system" user
	// this will happen if the email is being sent out from the approval Suitelet
	// try and look up the employee record
	if (nlapiLookupField('employee', currentUserId, 'email') == null)
	{
		// use the sales approval user id since the system user isn't valid
		// we know there has to be a sales approval because this can only happen if the change order was approved
		// from the approval suitelet
		currentUserId = nlapiLookupField(nlapiGetRecordType(), nlapiGetRecordId(), 'custrecordchangeorder_salesapproval');
	}
	
	// 8/7/2013 NAH
	// If there is a "From" employee in the company preferences, use that as the "From" for the emails.
	// Otherwise, use the current user if no from is set.
	var fromEmployeeId = currentUserId;
	var changeOrderFromEmployeeId = GetChangeOrderFromEmployeeId();
	if (changeOrderFromEmployeeId != null)
	{
		fromEmployeeId = changeOrderFromEmployeeId;
	}
	
	var emails = new Array();
	if(groupId != null && groupId != '')
	{
		var group = nlapiLoadRecord('entitygroup', groupId);
		
		var mainEmail = '';		
		var groupCount = group.getLineItemCount('groupmembers');
		
		for (var i=1; i<=groupCount; i++)
		{
			emails[i-1] = group.getLineItemValue('groupmembers', 'memberemail', i);
		}
	}
	
	if (additionalReceipients != null)
	{
		for (var i=0; i<additionalReceipients.length; i++)
		{
			emails[emails.length] = additionalReceipients[i];
		}
	}
	
	var lookupFields = ['custrecordchangeorder_containsoptionchg', 'custrecordgdpurchasingapprovalrequired'];
	var lookupFieldValues = nlapiLookupField(nlapiGetRecordType(), nlapiGetRecordId(), lookupFields);
	var hasOptionChanges = lookupFieldValues.custrecordchangeorder_containsoptionchg;
	
	var changeOrderURL = '';
	if (GetURLPrefix() != null) // if the context of this call is from an online form then we cannot get the script parameters so this is null; so just don't show the link
		changeOrderURL = GetURLPrefix() + nlapiResolveURL('RECORD', nlapiGetRecordType(), nlapiGetRecordId(), 'VIEW');
	
	if(emails.length > 0)
		mainEmailAddress = emails[0];
	
	var records = new Object();
	records['record'] = nlapiGetRecordId();
	records['recordtype'] = nlapiGetRecordType();
	
	var additionalMessage = '';
	if (changeOrderURL != '')
		additionalMessage = 'Click <a href="' + changeOrderURL + '">here</a> to view the change order record in NetSuite.';
	
	nlapiLogExecution('DEBUG', 'Current User Id', currentUserId);
	nlapiLogExecution('DEBUG', 'Include Approval Links', includeApprovalLinks);
	
	// if we aren't going to include the approval links then we can send the same email to everyone
	if (!includeApprovalLinks)
	{
		var emailMessage = message + '<br><br>' + additionalMessage + '<br><br><br>' + GD_GetChangeOrderPrintHTML();
		
		for (var i=0; i<emails.length; i++)
		{
			nlapiSendEmail(fromEmployeeId, emails[i], subject, emailMessage, null, null, records, null, true);
		}
	}
	else
	{
		// we do need to include approval links
		// so we need to send a different email to each recipient, with the correct links based on their roles
		// so loop through all the emails
		for (var i=0; i<emails.length; i++)
		{	
			var includeSalesApproval = false;
			var includePurchasingApproval = false;
			var includePlantManagerApproval = false;
			
			additionalMessage = '';
			if (changeOrderURL != '')
				additionalMessage = 'Click <a href="' + changeOrderURL + '">here</a> to view the change order record in NetSuite.';
			
			nlapiLogExecution('DEBUG', 'Email ' + i, emails[i]);
			
			// first find the employee id based on the email
			var results = nlapiSearchRecord('employee', null, new nlobjSearchFilter('email', null, 'is', emails[i])) || '';
			if (results != null && results.length > 0)
			{
				var employeeId = results[0].getId();
				
				nlapiLogExecution('DEBUG', emails[i], 'Employee ID: ' + employeeId);
				
				var approveSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptapprovechangeordersuitelet', 'customdeployapprovechangeordersuitedeply', true);
				
				// set the links with the user id being the employee we are sending to.
				var salesApprovalLink = '<a href="' + approveSuiteletURL + '&changeOrderId=' + 
					nlapiGetRecordId() + '&userId=' + employeeId + '&sales=Y">Sales Approval</a>';
				var purchasingApprovalLink = '<a href="' + approveSuiteletURL + '&changeOrderId=' + 
					nlapiGetRecordId() + '&userId=' + employeeId + '&purch=Y">Purchasing Approval</a>';
				var plantManagerLink = '<a href="' + approveSuiteletURL + '&changeOrderId=' + 
					nlapiGetRecordId() + '&userId=' + employeeId + '&plnt=Y">Plant Manager Approval</a>';
					
				// if the change order doesn't have any option changes, then purchasing or the plant manager do not need to approve them so don't include them in the link
				//if the requires purchasing approval checkbox is checked, then we want the purchasing approval
				if (hasOptionChanges == 'F' && lookupFieldValues.custrecordgdpurchasingapprovalrequired == 'F')
				{
					purchasingApprovalLink = '';
					plantManagerLink = '';
				}
//				else if(hasOptionChanges == 'F' && lookupFieldValues.custrecordgdpurchasingapprovalrequired == 'T')
//				{
//					plantManagerLink = '';
//				}
				
				// need to determine what RVS functions, this employee has access to
				var employeeFunctionFields = GetRVSFunctionsForEmployee(employeeId);
				
				if (HasRVSSalesManagerFunction(null, employeeFunctionFields))
					includeSalesApproval = true;
				
				if (HasRVSPlantManagerFunction(null, employeeFunctionFields) && (hasOptionChanges == 'T' || lookupFieldValues.custrecordgdpurchasingapprovalrequired == 'T'))
					includePlantManagerApproval = true;
//				nlapiLogExecution('debug', 'email', 'hasOptionChanges: ' + hasOptionChanges + ', lookupFields.custrecordgdpurchasingapprovalrequired: ' + lookupFieldValues.custrecordgdpurchasingapprovalrequired);
				if (HasRVSPurchasingManagerFunction(null, employeeFunctionFields) && (hasOptionChanges == 'T' || lookupFieldValues.custrecordgdpurchasingapprovalrequired == 'T'))
					includePurchasingApproval = true;
				
				nlapiLogExecution('DEBUG', emails[i], 'Sales: ' + includeSalesApproval + '; Purch: ' + includePurchasingApproval + '; Plt: ' + includePlantManagerApproval);
				
				additionalMessage += '<br>';
				
				// add the appropriate links to the message 
				if (includeSalesApproval)
				{
					additionalMessage += '<br>' + salesApprovalLink;
				}
				
				if (includePurchasingApproval)
				{
					additionalMessage += '<br>' + purchasingApprovalLink;
				}
				
				if (includePlantManagerApproval)
				{
					additionalMessage += '<br>' + plantManagerLink;
				}
				
				// the email wasn't linked to a user in NetSuite so just send out a normal email
				var emailMessage = message + '<br><br>' + additionalMessage + '<br><br><br>' + GD_GetChangeOrderPrintHTML();
		
				nlapiSendEmail(fromEmployeeId, emails[i], subject, emailMessage, null, null, records, null, true);
			}
			else
			{
				nlapiLogExecution('DEBUG', emails[i], 'No Employee Found');
				
				// the email wasn't linked to a user in NetSuite so just send out a normal email
				var emailMessage = message + '<br><br>' + additionalMessage + '<br><br><br>' + GD_GetChangeOrderPrintHTML();
		
				nlapiSendEmail(fromEmployeeId, emails[i], subject, emailMessage, null, null, records, null, true);
			}
		}
	}
}

function GD_GetChangeOrderPrintHTML()
{
	var changeOrder = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
    //Variables
	var title = 'CHANGE ORDER #' + nlapiGetRecordId();
	var model = nlapiGetFieldText('custrecordchangeorder_model');
	var revision = nlapiGetFieldValue('custrecordchangeorder_revisionnumber');
	var serial = nlapiGetFieldText('custrecordchangeorder_unit');
	var online = nlapiGetFieldValue('custrecordchangeorder_onlinedate');
	if (online == null)
		online = '';
	var offline = nlapiGetFieldValue('custrecordchangeorder_offlinedate');
	if (offline == null)
		offline = '';
	var plant = nlapiGetFieldText('custrecordchangeorder_location');
	
	var oldDealer = trim(nlapiGetFieldText('custrecordchangeorder_olddealer'));
	var newDealer = trim(nlapiGetFieldText('custrecordchangeorder_newdealer'));
	var oldShippingMethod = trim(nlapiGetFieldText('custrecordchangeorder_oldshippingmethod'));
	var newShippingMethod = trim(nlapiGetFieldText('custrecordchangeorder_newshippingmethod'));
	var oldFloorplanType = trim(nlapiGetFieldText('custrecordchangeorder_oldfloorplantype'));
	var newFloorplanType = trim(nlapiGetFieldText('custrecordchangeorder_newfloorplantype'));	
	
	var oldDecor = trim(nlapiGetFieldText('custrecordchangeorder_olddecor'));
	var newDecor = trim(nlapiGetFieldText('custrecordchangeorder_newdecor'));
	
	var oldDecorId = changeOrder.getFieldValue('custrecordchangeorder_olddecor') || '';
	var newDecorId = changeOrder.getFieldValue('custrecordchangeorder_newdecor') || '';
	
	var decorIdToPrint = newDecorId != '' ? nlapiLookupField('item', newDecorId, 'itemid', false) : oldDecorId != '' ? nlapiLookupField('item', oldDecorId, 'itemid', false) : '';
	
	//Unit Information
	var unitId = nlapiEscapeXML(trim(changeOrder.getFieldValue('custrecordchangeorder_unit')));	
	var salesRep = '';
	var dealer = '';
	if(trim(unitId) != '')
	{
		var cols = nlapiLookupField('customrecordrvsunit', unitId, ['custrecordunit_salesrep', 'custrecordunit_dealer'], true);

		salesRep = nlapiEscapeXML(trim(cols.custrecordunit_salesrep));
		dealer = nlapiEscapeXML(trim(cols.custrecordunit_dealer));
	}
	
	var sales = trim(nlapiGetFieldText('custrecordchangeorder_salesapproval'));
	var plantMgr = trim(nlapiGetFieldText('custrecordchangeorder_plantmgrapproval'));
	var purchasing = trim(nlapiGetFieldText('custrecordchangeorder_purchasingapproval'));	
	var changeOrderDate = nlapiGetFieldValue('custrecordchangeorder_date');
	var printNotes = nlapiGetFieldValue('custrecordchangeorder_printnotes');
	var notes = nlapiGetFieldValue('custrecordchangeorder_notes');
	
	var today = getTodaysDate();
	
	var htmlPage = '<html><body style="font-family:Verdana, Arial, Sans-serif;font-size:12px;">';
	var mainTable = '<table style="border-color:#000000; border:solid 1px; width:100%;" align="center"><tr><td>';
	
	//Add Title
	var titleTable = '<table border="0" style="width:100%;">';
		titleTable += '<tr><td align="left">Revision #: ' + revision + '</td><td align="right">DATE: ' + changeOrderDate + '</td></tr>';
		titleTable += '<tr><td colspan="2"><h3 align="center">' + title + '</h3></td></tr>';
		titleTable += '</table>';
		
	var headerInfoTable = '<table border="0" style="width:100%;" cellpadding="5">';
		headerInfoTable += '<tr><td>Model #: ' + model + '</td><td>Decor: ' + decorIdToPrint + '</td><td>VIN #: ' + serial + '</td></tr>';
		headerInfoTable += '<tr><td>Online: ' + online + '</td><td>Offline: ' + offline + '</td><td>Plant: ' + plant + '</td></tr>';
		headerInfoTable += '<tr><td>Sales Rep: ' + salesRep + '</td><td>Dealer: ' + dealer + '</td><td></td></tr>';
		
	if (printNotes == 'T')
	{
		headerInfoTable += '<tr><td colspan="3">Notes: ' + notes + '</td></tr>';
	}	
		
	headerInfoTable += '<tr><td colspan="3"><hr /></td></tr>';
	headerInfoTable += '</table>';
	
	var optionSublist = 'recmachcustrecordchangeorderoptions_changeorder';
	var optionTable = '';
	var addedOptions = '';
	var deletedOptions = '';
	var hasNewDealerBeenAdded = false;
	var hasOldDealerBeenAdded = false;
	
	addedOptions = '<table border="0" style="width:100%; padding-bottom:10px;border-color:#000000;border: solid 1px;">';
	addedOptions += '<tr><td style="padding-bottom:10px;"><b><u>ADD:</u></b></td></tr>';
	
	deletedOptions = '<table border="0" style="width:100%; padding-bottom:10px;padding-top:5px;border-color:#000000;border: solid 1px;">';
	deletedOptions += '<tr><td style="padding-bottom:10px;"><b><u>DELETE:</u></b></td></tr>';
	
	if (newDealer != '')
	{
		addedOptions += '<tr><td style="padding-bottom:5px">' + newDealer + '</td></tr>';
		deletedOptions += '<tr><td style="padding-bottom:5px">' + oldDealer + '</td></tr>';
	}
	
	if (newShippingMethod != '')
	{
		addedOptions += '<tr><td style="padding-bottom:5px">' + newShippingMethod + '</td></tr>';
		deletedOptions += '<tr><td style="padding-bottom:5px">' + oldShippingMethod + '</td></tr>';
	}
	
	if (newFloorplanType != '')
	{
		addedOptions += '<tr><td style="padding-bottom:5px">' + newFloorplanType + '</td></tr>';
		deletedOptions += '<tr><td style="padding-bottom:5px">' + oldFloorplanType + '</td></tr>';
	}
	
	if (newDecor != '')
	{
		addedOptions += '<tr><td style="padding-bottom:5px">' + newDecor + '</td></tr>';
		deletedOptions += '<tr><td style="padding-bottom:5px">' + oldDecor + '</td></tr>';
	}
	
	for (var i = 1; i <= nlapiGetLineItemCount(optionSublist); i++) 
	{
		var isAdded = nlapiGetLineItemValue(optionSublist, 'custrecordchangeorderoptions_addoption', i);
		var isDeleted =  nlapiGetLineItemValue(optionSublist, 'custrecordchangeorderoptions_removeopt', i);
		var option =  nlapiEscapeXML(nlapiGetLineItemText(optionSublist, 'custrecordchangeorderoptions_option', i));
		var description = ConvertNSFieldToString(nlapiGetLineItemValue(optionSublist, 'custrecordchangeorderoptions_description', i));
		
		if(isAdded == 'T')
		{
			addedOptions += '<tr><td>' + option + ' - ' + description + '</td></tr>';
		}	
			
		if(isDeleted == 'T')
		{
			deletedOptions += '<tr><td>' + option + ' - ' + description + '</td></tr>';
		}	
	}
	
	addedOptions += '</table>';
	deletedOptions += '</table>';
	
	optionTable = '<table border="0" style="width:100%;"><tr><td>' + addedOptions + '</td></tr><tr><td style="padding-top:20px;">' + deletedOptions + '</td></tr></table>'; 	
		
	//Now create footer table to add sales and other approving fields
	//Add Title
	var footerTable = '<table border="0" style="width:100%;padding-top:15px;">';
		footerTable += '<tr><td>Sales: ' + sales + '</td></tr>';
		footerTable += '<tr><td>Plant MGR: ' + plantMgr + '</td></tr>';
		footerTable += '<tr><td>Purchasing: ' + purchasing + '</td></tr>';
		footerTable += '</table>';
		
	mainTable += titleTable;
	mainTable += headerInfoTable;
	
	mainTable += optionTable;
	
	mainTable += footerTable;
	
	mainTable+='</td></tr></table>';
	htmlPage += mainTable;
	htmlPage +='</body></html>';
	
	return htmlPage;
}