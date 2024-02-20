/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Jan 2014     ibrahima
 *
 */

var GD_WEBINQUIRY_DEALER_FILTERED = 'custpagegd_partsinq_dealer';
var GD_WEBINQUIRY_DEALER = 'custrecordpartsinquiry_dealer';

var GD_WEBINQUIRY_REQUESTOR = 'custrecordpartsinquiry_requestor';
var GD_WEBINQUIRY_STATUS = 'custrecordpartsinquiry_status';


function PartsInquiryItems_BeforeLoad(type)
{
	if(type == 'create' || type == 'edit' || type == 'view')
	{
		throw new nlobjError('INVALID_OPERATION','Parts Inquiry Item Lines can only be added or modified from the Part Inquiry itself.', true);
	}	
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function BeforeLoad(type, form, request)
{		
	if(type == 'create')
	{
		//set default status to be open
		nlapiSetFieldValue(GD_WEBINQUIRY_STATUS, PARTS_INQUIRY_STATUS_OPEN, false, false);
	}
	
	if(type == 'create' || type == 'edit')
	{		
		if(IsDealerLoggedIn())
		{	
			
			var context = nlapiGetContext();
			var dealerId = nlapiGetUser();
			
			var currentContactId = nlapiGetFieldValue(GD_WEBINQUIRY_REQUESTOR);
			if(currentContactId == null && context != null)
			{
				var userEmail = context.getEmail();
				var contactId = GetContactFromDealerAndEmail(dealerId, userEmail) || ''; //Need to do a search to find the logged-in Contact, since the GetUser() only gives us the dealer id
				if(contactId != '' )
					currentContactId = contactId;
			}
			
			var requesterField = form.getField(GD_WEBINQUIRY_REQUESTOR);
			requesterField.setDefaultValue(currentContactId);
			requesterField.setDisplayType('inline');
			requesterField.setLabel('Requester');
			
			//create filtered dealer drop down field, just for this form, that allows the user to pick any dealer within the dealer group of the user. 
			PartsInq_AddDealerDropDownList(dealerId, form, type);
			
			// This one is the functional dealer field. Will be set in beforesubmit with the value chosen in the filtered dealer drop down. 
			var dealerField = form.getField(GD_WEBINQUIRY_DEALER);
			dealerField.setDisplayType('hidden');
			
			//disable status field	
			var statusField = form.getField(GD_WEBINQUIRY_STATUS);
			if(statusField != null)
				statusField.setDisplayType('inline');

			// Hide Drag & Drop sublist Column
			HideSublistColumn('recmachcustrecordpartsinquiryitems_partsinquiry','custrecordpartsinquiryitems_gd_dragdrop');
		}
		else
		{
			HideSublistColumn('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_attachfiles');
		}
		
		//This is used for file attachment
		var field = form.addField('custpage_tempfoldername', 'text', 'Parts Inquiry Temp Folder Name', null, null);
		field.setDisplayType('hidden');
	}
		
	//Disable buttons accordingly
	if(IsDealerLoggedIn())
	{	
		DisableNetsuiteButtons(form, false, false, true);
	}
	
	if(form != null)
	{	
		var partList = form.getSubList('recmachcustrecordpartsinquiryitems_partsinquiry');
		if (partList != null)
		{
			var attachButton = partList.getButton('attach');
			if (attachButton != null)
				attachButton.setDisabled(true);
			
			var newButton = partList.getButton('newrecrecmachcustrecordpartsinquiryitems_partsinquiry');
			if (newButton != null)
				newButton.setDisabled(true);
		}
		var attachedFiles = form.getSubList('mediaitem');
		if (attachedFiles != null)
		{
			var attachButton = attachedFiles.getButton('addmediaitem');
			if (attachButton != null)
				attachButton.setVisible(false);

			var newButton = attachedFiles.getButton('newmediaitem');
			if (newButton != null)
				newButton.setVisible(false);

			var attachField = nlapiGetField('mediaitem');
			if (attachField != null)
				attachField.setDisplayType('hidden');
		}
		
		var btnMakeCopy = form.getButton('submitas');
		if(btnMakeCopy != null)
			btnMakeCopy.setDisabled(true);	
		
	}
}

/**
 * Performs BeforeSubmit logic for Parts Inquiry record.
 * @param type
 */
function BeforeSubmit(type)
{
	if(type == 'delete')
	{
		var partsInquiryId = nlapiGetRecordId();
		
		DeletePartsInquiryLines(partsInquiryId);	
		
		var filters = new Array();
		filters[filters.length] = nlobjSearchFilter('custbodypartsinquirynumber', null, 'anyof', partsInquiryId);
		var orders = nlapiSearchRecord('estimate', null, filters, null);
		
		if(orders != null && orders.length > 0)
		{
			for(var i = 0; i < orders.length; i++)
			{
				nlapiSubmitField('estimate', orders[i].getId(), 'custbodypartsinquirynumber', null, false);
			}
		}

	}
	else if(type == 'edit')
	{
		//Dealer is editing Parts Inquiry. 
		//If this Inquiry has been answered and dealer made modifications, we want to set the status back to Open.
		if(IsDealerLoggedIn())
		{
			var status = nlapiGetFieldValue(GD_WEBINQUIRY_STATUS);
			if(status != PARTS_INQUIRY_STATUS_OPEN)
			{
				nlapiSetFieldValue(GD_WEBINQUIRY_STATUS, PARTS_INQUIRY_STATUS_OPEN, false, false);
			}
		}
	}
	if(type == 'create' || type == 'edit' || type == 'copy')
	{
		if(IsDealerLoggedIn())
		{
			var dealerDefault = nlapiGetFieldValue(GD_WEBINQUIRY_DEALER); // by default set to the logged in user's dealer
			var dealerChoice = nlapiGetFieldValue(GD_WEBINQUIRY_DEALER_FILTERED); // dealer chosen by the user in the filtered dealer dropdown
			if(dealerDefault != dealerChoice)
			{
				nlapiSetFieldValue(GD_WEBINQUIRY_DEALER, dealerChoice);
			}
		}
	}
}

/**
 * Name: AfterSubmit
 * Description: 
 * @appliedtorecord customrecordgranddesignpartsinquiry  
 * 
 * @param {String} type Operation types: create, edit
 *                      
 * @returns {Void}
 */
function AfterSubmit(type)
{
	if (type == 'create' || type == 'edit')
	{	
		RenamePartsInquiryTempFilesFolder(nlapiGetRecordId());
		LinkAttachFilesOnPartsInquiryItems(nlapiGetRecordId());
	}
}

/**
 * Performs ValidateField event for Parts Inquiry record.
 * @param type
 * @param fname
 * @param line
 */
function ValidateField(type, name, linenum)
{
	if (name == GD_WEBINQUIRY_STATUS)
	{
		var statusId = nlapiGetFieldValue(name);
		if (statusId == PARTS_INQUIRY_STATUS_CLOSED)
		{
			alert('Status of a Parts Inquiry cannot manually be changed to "Closed."');
			return false;
		}
	}
	
	return true;
}



/**
 * Deletes Parts Inquiry Items lines.
 * @param {Object} partinquiryId
 */
function DeletePartsInquiryLines(partinquiryId)
{
	if(partinquiryId != null && trim(partinquiryId) != '')
	{
		var itemSublist = 'recmachcustrecordpartsinquiryitems_partsinquiry';
		
		//Process Item Lines
		var itemLineCount = nlapiGetLineItemCount(itemSublist);
		if(itemLineCount > 0)
		{
			RemoveAllLinesInSublist(itemSublist); //remove lines from sublist
			
			var itemLineResults = GetItemLinesForPartsInquiry(partinquiryId);
			
			if(itemLineResults != null && itemLineResults.length > 0)
			{
				//loop through and delete item lines associated with this part inquiry
				for(var i = 0; i < itemLineResults.length; i++)
				{		
					nlapiDeleteRecord('customrecordgranddesignpartsinquiryitems', itemLineResults[i].getId());
				}
			}
		}
	}
}


/**
 * Returns Parts Inquiry Item lines that are associated with the specified Part Inquiry
 * @param {Object} partinquiryId
 * @return {nlapiSearchRecord} customrecordgranddesignpartsinquiryitems record
 */
function GetItemLinesForPartsInquiry(partinquiryId)
{
	if(partinquiryId != null && trim(partinquiryId) != '')
	{
		var cols = new Array();
		cols[cols.length] = new nlobjSearchColumn('internalid');
		
		var results = nlapiSearchRecord('customrecordgranddesignpartsinquiryitems', null, 
			new nlobjSearchFilter('custrecordpartsinquiryitems_partsinquiry', null, 'is', partinquiryId),cols);
			
		return results;		
	}
	else
		return null;
}

/**
 * Workflow action that navigates to New Parts Order, if internal, or to the parts order proxy, if in the portal.
 */
function NavigateToPartWebOrderWorkflowAction()
{
	var params = new Array();
	
	params["record.custbodypartsinquirynumber"] = nlapiGetRecordId();
	params["entity"] = ConvertNSFieldToString(nlapiGetFieldValue(GD_WEBINQUIRY_DEALER));
	params["record.custbodyrvsunit"] = ConvertNSFieldToString(nlapiGetFieldValue('custrecordpartsinquiry_unit'));
	params["record.custbody1"] = ConvertNSFieldToString(nlapiGetFieldValue('custrecord1'))//case
	params["record.custbodypartsinquirynumber"] = ConvertNSFieldToString(nlapiGetFieldValue('recordid'))//part Inq
	params["record.location"] = ConvertNSFieldToString(nlapiGetContext().getSetting('SCRIPT','custscriptgd_wo_deflocation'));
	params["custrecordpartsinquiry_requestor"] =ConvertNSFieldToString(nlapiGetFieldValue('custrecordpartsinquiry_requestor'));
	//If internal, use the internal form
	if(!IsDealerLoggedIn()) 
	{
		//We need to get custom form from Company Preferences. However, Workflow Actions don't recognize
		//nlapiGetContext().getSetting('SCRIPT', 'custscriptpartsorderform'); 
		//So we have to load the configuration object and look for the field ourselves.
		var config = nlapiLoadConfiguration('companypreferences');
		params["cf"] = ConvertNSFieldToString(config.getFieldValue('custscriptinternalpartweborderform'));
		
		var newWebOrderRec = nlapiCreateRecord('estimate', {
			recordmode: 'dynamic',
			customform: params['cf'],
			entity: params['entity']
		});
		newWebOrderRec.setFieldValue('custbodypartsinquirynumber', params['record.custbodypartsinquirynumber']);
		newWebOrderRec.setFieldValue('custbodyrvsunit', params['record.custbodyrvsunit']);
		newWebOrderRec.setFieldValue('custbody1', params['record.custbody1']);
		newWebOrderRec.setFieldValue('location', params['record.location']);
		newWebOrderRec.setFieldValue('custbodygd_dealerportalrequester', params['custrecordpartsinquiry_requestor']);

		var itemSublist = 'recmachcustrecordpartsinquiryitems_partsinquiry';
		//var partsInquiryRecord = nlapiLoadRecord('customrecordgranddesignpartsinquiry', nlapiGetRecordId());
		var itemCount = nlapiGetLineItemCount(itemSublist);
		for(var i = 1; i <= itemCount; i++) //For sublist, i start at 1 not zero
		{
			var itemId = ConvertNSFieldToString(nlapiGetLineItemValue(itemSublist, 'custrecordpartsinquiryitems_item', i));				
			if(itemId != '') //If Parts Inquiry Item is set, add order line item.
			{
				//var description = ConvertNSFieldToString(partsInquiryRecord.getLineItemValue(itemSublist, 'custrecordpartsinquiryitems_description', i));
				var quantity = ConvertNSFieldToFloat(nlapiGetLineItemValue(itemSublist, 'custrecordpartsinquiryitems_quantity', i));

				CreateSalesOrderLineItems(newWebOrderRec, itemId, quantity);			
			}
		}

		newWebOrderRec.setFieldValue('tobeemailed', 'F');

		var webOrderId = nlapiSubmitRecord(newWebOrderRec, true, true);

		nlapiSetRedirectURL('RECORD', 'estimate', webOrderId, true, null);
	}
	else //If in the portal, redirect to the part order entry
	{		
		nlapiSetRedirectURL('RECORD', 'customrecordrvs_partsorderproxy', null, null, params);
	}
}

/**
 * Creates line items given the line information.
 * @param itemId
 * @param desc
 * @param qty
 */
function CreateSalesOrderLineItems(webOrderRec, itemId, qty)
{
	var itemSublist = 'item';
	var fields = ['saleunit', 'salesdescription','baseprice', 'custitemgd_partsbin'];
	var columns = nlapiLookupField('item', itemId, fields, false);	
	var rate = ConvertNSFieldToFloat(columns.baseprice);
	var amount = rate * qty;

	webOrderRec.selectNewLineItem(itemSublist);
	webOrderRec.setCurrentLineItemValue(itemSublist, 'item', itemId);
	webOrderRec.setCurrentLineItemValue(itemSublist, 'quantity', qty);
	webOrderRec.commitLineItem(itemSublist, false);
}

/**
 * Links item lines with the files that are attached for the specified parts inquiry.
 * @param partsInId
 */
function LinkAttachFilesOnPartsInquiryItems(partsInId)
{
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid', null, null);
	cols[cols.length] = new nlobjSearchColumn('custrecordpartsinquiryitems_fileids', null, null);
	
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('custrecordpartsinquiryitems_partsinquiry', null, 'anyof', [partsInId]);
	filters[filters.length] = new nlobjSearchFilter('custrecordpartsinquiryitems_fileids', null, 'isnotempty');
	
	var results = nlapiSearchRecord('customrecordgranddesignpartsinquiryitems', null, filters, cols);
	
	if(results != null && results.length > 0)
	{
		for(var i = 0; i < results.length; i++)
		{
			var partsInItemId = results[i].getId();			
			var partsInItemFileIds = ConvertNSFieldToString(results[i].getValue('custrecordpartsinquiryitems_fileids'));			
			var fileIdsArray = partsInItemFileIds.split(',');
			
			for(var j = 0; j < fileIdsArray.length; j++)
			{
				var fileId = fileIdsArray[j];
				var file = null;
				//Make sure that file exist in NS. If file was manually deleted, this will throw an error
				try
				{
					file = nlapiLoadFile(fileId);
				}
				catch(e){} 
				
				if(file != null) //File exist, attach to the operation line.
				{
					nlapiAttachRecord('file', fileId, "customrecordgranddesignpartsinquiryitems", partsInItemId);
				}
			}
			
		}
	}
}

/**
 * Renames parts inquiry temp files folder to be the parts inquiry id.
 * @param partsInId
 */
function RenamePartsInquiryTempFilesFolder(partsInId)
{
	var tempFolderName = ConvertNSFieldToString(nlapiGetFieldValue('custpage_tempfoldername'));
	nlapiLogExecution('debug', 'tempFolderName', 'tempFolderName: ' + tempFolderName);
	if(tempFolderName != '')
	{
		var cols = new Array();
		cols[cols.length] = new nlobjSearchColumn('internalid');

		//let us make sure that parts inquiry folder doesn't exist.
		var existingFolders = nlapiSearchRecord('folder', null, new nlobjSearchFilter('name', null, 'is', partsInId.toString()), cols);
		if(existingFolders == null || existingFolders.length == 0)
		{
			var folders = nlapiSearchRecord('folder', null, new nlobjSearchFilter('name', null, 'is', tempFolderName), cols);			
			if(folders != null && folders.length == 1)
			{
				nlapiSubmitField('folder', folders[0].getId(), 'name', partsInId.toString(), false);
			}
		}
	}	
}

/**
 * Sets the Parts Inquiry file attachment data from the attach popup.
 * 
 * @param linenum
 * @param 
 */
function SetPartsFileDataFromPopup(linenum)
{
	nlapiLogExecution('debug', 'linenum', 'linenum got here: ' + linenum);

	// if the linenum is greater than the current line count then the user must have deleted a line
	// since the popup popped up so select a new line
	// or ... if the line number that we are updating matches the currently-selected line, then just set the data
	// otherwise, we need to cancel out of the current line we are on and then select the correct line
	if (linenum > nlapiGetLineItemCount('recmachcustrecordpartsinquiryitems_partsinquiry') ||
		linenum != nlapiGetCurrentLineItemIndex('recmachcustrecordpartsinquiryitems_partsinquiry'))
	{
		nlapiCancelLineItem('recmachcustrecordpartsinquiryitems_partsinquiry');
		nlapiSelectLineItem('recmachcustrecordpartsinquiryitems_partsinquiry', linenum);
	}
	// file id from the session	
	
	var fileIds = nlapiGetContext().getSessionObject('selectionpopup_fileids', true);
	var tempFolderName = nlapiGetContext().getSessionObject('selectionpopup_tempfoldername', true);
	var description = nlapiGetContext().getSessionObject('selectionpopup_description', true) || null;
	var qty = nlapiGetContext().getSessionObject('selectionpopup_qty', true);
	var item = nlapiGetContext().getSessionObject('selectionpopup_item', true);
	var itemdescript = nlapiGetContext().getSessionObject('selectionpopup_itemdescript', true) || null;
	
	nlapiSetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_fileids', fileIds, false, false);
	nlapiSetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_description', description, false, false);
	nlapiSetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_quantity', qty, false, false);
	nlapiSetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_item', item, false, false);
	nlapiSetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_itemdescript', itemdescript, false, false);
	nlapiSetFieldValue('custpage_tempfoldername', tempFolderName, false, false);
	
	var temfol = nlapiGetFieldValue('custpage_tempfoldername');
}

/**
 * Adds dealer dropdownlist.
 * @param dealerId
 * @param form
 * @param type
 */
function PartsInq_AddDealerDropDownList(dealerId, form, type)
{
	var dgms = GetDealerGroupMembers(dealerId); //returns an array of internal ids of dealers
	
	if(dgms != null && dgms.length > 0)
	{
		if(type == 'edit') // if edit mode, default the dealer dropdown to what was chosen before.
			var defaultSelect = nlapiGetFieldValue(GD_WEBINQUIRY_DEALER);
		else // Otherwise, default the dealer dropdown to the dealer of the logged in user.   
			var defaultSelect = dealerId;
		
		var fieldId = GD_WEBINQUIRY_DEALER_FILTERED;
		var dropDown = form.addField(fieldId, 'select', 'Dealer');
		dropDown.setMandatory(true);
		
		form.insertField(form.getField(fieldId), GD_WEBINQUIRY_DEALER); //move field
		for(var i = 0; i < dgms.length; i++)
		{
			var dealerName = nlapiLookupField('customer', dgms[i], 'companyname');
			if(dgms[i] == defaultSelect )
				dropDown.addSelectOption(dgms[i], dealerName, true); // set as default select value.
			else
				dropDown.addSelectOption(dgms[i], dealerName, false);
		}
		
		if(dgms.length == 1)
			dropDown.setDisplayType('disabled');
	}
}

/**
 * Hides the given column on the given sublist
 * @param {string} sublistId
 * @param {string} fieldId
 */
function HideSublistColumn(sublistId, fieldId)
{
	var lineItemCount = nlapiGetLineItemCount(sublistId);
	if (lineItemCount == 0)
	{
		nlapiSelectNewLineItem(sublistId);
		nlapiCommitLineItem(sublistId);
		
	}
	nlapiGetLineItemField(sublistId,fieldId,1).setDisplayType('hidden');
	return;
}