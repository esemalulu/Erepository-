/**
 * Popup created to attach files to Parts Inquiry Items. 
 * 
 * Version    Date            Author           Remarks
 * 1.00       24 Mar 2014     joeltm
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */

function PartsInPopupWizardSuitelet(request, response)
{
	var context = nlapiGetContext();

	if (request.getMethod() == 'GET')
	{
		var isOnDealerPortal = IsDealerLoggedIn();
		var form = nlapiCreateForm('Parts Inquiry File Wizard', true);	
		// set the client-side script file
		
		form.setScript('customscriptpartsinquiryfilespopup');
		// add the category fields
		
		var lineNumField = form.addField('custpage_partinquiryitemsnum', 'text', 'Parts Inquiry Items Num', null, null);
		var custparam_linenum = ConvertNSFieldToString(request.getParameter('custparam_linenum'));
		lineNumField.setDefaultValue(custparam_linenum);
		lineNumField.setDisplayType('hidden');
				
		var recordTypeField = form.addField('custpage_recordtype', 'text', 'Record Type', null, null);
		var custparam_recordtype = ConvertNSFieldToString(request.getParameter('custparam_recordtype'));
		recordTypeField.setDefaultValue(custparam_recordtype);
		recordTypeField.setDisplayType('hidden');	
		
		var partsInquiryIdField = form.addField('custpage_partsinid', 'text', 'Parts Inquiry ID', null, null);
		var custparam_partsinID = ConvertNSFieldToString(request.getParameter('custparam_partsinid'));
		partsInquiryIdField.setDefaultValue(custparam_partsinID);
		partsInquiryIdField.setDisplayType('hidden');
		
		var descriptionField = form.addField('custpage_description', 'textarea', 'Description', null, null);
		descriptionField.setDisplayType('hidden');
		
		var qtyField = form.addField('custpage_qty', 'text', 'Quantity', null, null);
		qtyField.setDisplayType('hidden');	
		
		var itemField = form.addField('custpage_item', 'text', 'Item', null, null);
		itemField.setDisplayType('hidden');
		
		var itemDescriptionField = form.addField('custpage_itemdescript', 'text', 'Item', null, null);
		itemDescriptionField.setDisplayType('hidden');
		
		var fileIdsField = form.addField('custpage_fileidsfield', 'text', 'File IDs');
		fileIdsField.setDisplayType('hidden');
		
		var isAttachingFileField = form.addField('custpage_isattachingfile', 'checkbox', 'Is Attaching File.');
		isAttachingFileField.setDefaultValue('F');
		isAttachingFileField.setDisplayType('hidden');
		
		var tempFolderNameField = form.addField('custpage_tempfoldername', 'text', 'Parts In Temp Folder Name', null, null);
		tempFolderNameField.setDisplayType('hidden');

		var custparam_isencodeduri = request.getParameter('custparam_isencodeduri');
		var custparam_linedata = new Object();
		
		var tempFolderName = '';
		var fileIds = '';
		var description = '';
		var qty = '';
		var item = '';
		var itemDescript ='';
		
		var attachedFileId = request.getParameter('custparam_attachedfileid') || '';
		var attachedFilesHTMLLinks = '';	
		
		if (custparam_isencodeduri == 'T') {
			custparam_linedata = JSON.parse(decodeURIComponent(request.getParameter('custparam_linedata')));
			
			tempFolderName = ConvertNSFieldToString(custparam_linedata.selectionpopup_tempfoldername);
			fileIds = ConvertNSFieldToString(custparam_linedata.selectionpopup_fileids || '') || '';
			description = custparam_linedata.selectionpopup_description || '';
			qty = ConvertNSFieldToString(custparam_linedata.selectionpopup_qty);
			item = ConvertNSFieldToString(custparam_linedata.selectionpopup_item);
			itemDescript = custparam_linedata.selectionpopup_itemdescript || '';
		} else {
			tempFolderName = ConvertNSFieldToString(request.getParameter('custparam_recordtype'));
			fileIds = ConvertNSFieldToString(request.getParameter('custparam_fileids')) || '';
			description = request.getParameter('custparam_description') || '';
			qty = ConvertNSFieldToString(request.getParameter('custparam_qty'));
			item = ConvertNSFieldToString(request.getParameter('custparam_item'));
			itemDescript = request.getParameter('custparam_itemdescript') || '';
		}
		
		//if we have files that are attached or we are attaching file now, do this.
		//Note: attachedFileId is the id of the file that user has just attached.
		if(fileIds != '' || attachedFileId != '') 
		{
			if(attachedFileId != '')
			{
				if(fileIds != '')
					fileIds += ',' + attachedFileId;
				else
					fileIds = attachedFileId;
			}	
			
			attachedFilesHTMLLinks = GetAttachedFilesHTMLLinks(fileIds);
		}
		
		fileIdsField.setDefaultValue(fileIds);
		tempFolderNameField.setDefaultValue(tempFolderName);
		descriptionField.setDefaultValue(description);
		qtyField.setDefaultValue(qty);
		itemField.setDefaultValue(item);
		itemDescriptionField.setDefaultValue(itemDescript);
		
		
		AddAttachFileControl(form, attachedFilesHTMLLinks);
		
		//Disable/Hide fields accordingly
		if(isOnDealerPortal)
		{
			//do nothing?
		}
		
		form.addSubmitButton('Submit');	
		
		response.writePage(form);
	}
	else if(request.getMethod() == 'POST')
	{
		var isAttachingFile = request.getParameter('custpage_isattachingfile');	
		nlapiLogExecution('debug', 'isAttachingFile', isAttachingFile); //custparam_attachedfileid
		if(isAttachingFile == 'T')
		{
			UploadFileToNS(request);
		}
		else //Not attaching file
		{
			var updateDataParams = request.getParameter('custpage_partinquiryitemsnum');

			context.setSessionObject('selectionpopup_fileids', request.getParameter('custpage_fileidsfield') || '');
			context.setSessionObject('selectionpopup_tempfoldername', ConvertNSFieldToString(request.getParameter('custpage_tempfoldername')));
			context.setSessionObject('selectionpopup_description', request.getParameter('custpage_description') || '');
			context.setSessionObject('selectionpopup_qty', ConvertNSFieldToString(request.getParameter('custpage_qty')));
			context.setSessionObject('selectionpopup_item', ConvertNSFieldToString(request.getParameter('custpage_item')));
			context.setSessionObject('selectionpopup_itemdescript', request.getParameter('custpage_itemdescript') || '');
			
			var temp = context.getSessionObject('selectionpopup_tempfoldername');
			nlapiLogExecution('debug', "request.getParameter('custpage_fileidsfield')", request.getParameter('custpage_fileidsfield'));
			nlapiLogExecution('debug', "request.getParameter('custpage_description')", request.getParameter('custpage_description'));
			// Set PFC values on line item.
			var html = [
			'<html><head>',
			'<script type="text/javascript">',
			'window.opener.SetPartsFileDataFromPopup(' + updateDataParams + ')' + ';',
			'window.close();',
			'</script>',
			'</head><body></body></html>'
			];
			
			response.write(html.join(''));
		}
	}
}


/**
 * Uploads file to NS.
 * @param request
 * @param sessionName_LoadValuesFromSession
 */
function UploadFileToNS(request)
{
	var context = nlapiGetContext();
	var fileId = -1;

	var file = request.getFile('custpage_fileholder');
	var params = {};

	if (file != null)
	{
		var partsInquiryId = ConvertNSFieldToInt(request.getParameter('custpage_partsinid'));	
		var folderId = GetPartsInFolderId(partsInquiryId);
		if(folderId > 0)
		{
			file.setFolder(folderId);  //the folder Id for the Parts Files in the File Cabinet				
			fileId = nlapiSubmitFile(file);			
			if(fileId > 0)
			{
				params.custparam_attachedfileid = fileId;
			}
		}
	}	

	//Create params from session. When user clicked the attach button, 
	//we added all field values in session so that we can get them here.
	//Note: Because we are submitting the form manually, request.getParameter was 
	//      returning nothing for any other controls except the file uploader which is why we added things in session.	
		
	params.custparam_recordtype = ConvertNSFieldToString(request.getParameter('custpage_recordtype'));
	params.custparam_tempfoldername = ConvertNSFieldToString(request.getParameter('custpage_tempfoldername'));
	params.custparam_linenum = ConvertNSFieldToString(request.getParameter('custpage_partinquiryitemsnum'));
	params.custparam_partsinid = ConvertNSFieldToString(request.getParameter('custpage_partsinid'));
	params.custparam_description = request.getParameter('custpage_description') || '';
	params.custparam_qty = ConvertNSFieldToString(request.getParameter('custpage_qty'));
	params.custparam_item = ConvertNSFieldToString(request.getParameter('custpage_item'));
	params.custparam_itemdescript = request.getParameter('custpage_itemdescript') || '';
	params.custparam_fileids = request.getParameter('custpage_fileidsfield') || '';
	
	
//	var lineDataObject = new Object();
//	lineDataObject.selectionpopup_fileids = request.getParameter('custpage_fileidsfield') || '';
//	nlapiLogExecution('debug', 'lineDataObject.selectionpopup_fileids', lineDataObject.selectionpopup_fileids);
//	lineDataObject.selectionpopup_description = request.getParameter('custpage_description') || '';
//	lineDataObject.selectionpopup_qty = ConvertNSFieldToString(request.getParameter('custpage_qty'));
//	lineDataObject.selectionpopup_item = ConvertNSFieldToString(request.getParameter('custpage_item'));
//	lineDataObject.selectionpopup_itemdescript = request.getParameter('custpage_itemdescript') || '';
//	lineDataObject.selectionpopup_tempfoldername = ConvertNSFieldToString(request.getParameter('custpage_tempfoldername'));
//	lineDataObject.selectionpopup_partsinid = ConvertNSFieldToString(request.getParameter('custpage_partsinid'));
	
//	params.custparam_linedata = lineDataObject;

	// reload the form after the file is uploaded.
	nlapiSetRedirectURL('SUITELET', 'customscriptgd_pipopupwizard', 'customdeploygd_pipopupwizard', false, params);
}


/**
 * Adds attach file control to the specified form.
 * @param form
 */
function AddAttachFileControl(form, attachedFilesHTMLLinks)
{
	var attachFileFieldGroup = form.addFieldGroup('custpage_attachfilefrg', ' ', '');
	attachFileFieldGroup.setSingleColumn(true);
	attachFileFieldGroup.setShowBorder(false);
	
	var fileAttachTitle = '<div class="fgroup_title" style="color:#5A6F8F; border-bottom:1px solid #CCC; font-weight:600; white-space:nowrap; margin:0 0 2px 0">File Attachment</div>';
	var inLineHTMLTitleField = form.addField('custpage_fileuploadtitlehtml', 'inlinehtml', '', null, null);
	inLineHTMLTitleField.setDefaultValue(fileAttachTitle);
	
	var fileField = form.addField('custpage_fileholder', 'file', '');
	fileField.setMandatory(false);	

	var script = 
		'<script>' +
			'function submitFile()' + 
			'{' +
				'if (nlapiGetFieldValue("custpage_fileholder") == "")' + 
				'{' +
					'nlapiSetFieldValue("custpage_isattachingfile", "F");' +
				'}' +
				'else' +
				'{' +
					'nlapiSetFieldValue("custpage_isattachingfile", "T");' +
					'window.ischanged = false;' + // mark that window hasn't changed so we don't get any dialog popups asking us if we want to continue
					'document.forms[0].submit();' +
				'}' +
			'}'+
		'</script>';
							
	script += '<div style="font-size:12px;">&nbsp;&nbsp;&nbsp;<a href="javascript:{}" onclick="submitFile();"><b>Attach File</b></a><br /><br /></div>';		
	script += '<div style="font-size:12px;">&nbsp;&nbsp;&nbsp;<span style="color:red;"><b>IMPORTANT!</b></span><span><b> The file size must not exceed 5MB.</b></span><br /><br /></div>';
	script += attachedFilesHTMLLinks;		
	
	var inLineHTMLField = form.addField('custpage_fileuploadhtml', 'inlinehtml', '',null, null);
	inLineHTMLField.setDefaultValue(script);
	
	var colField = form.addField('custpage_labelspaceplacer1', 'inlinehtml', '', null, null);
	colField.setDefaultValue('&nbsp;&nbsp;&nbsp;');
	form.addField('custpage_labelspaceplacer2', 'label', '', null, null);

}

/**
 * Return attached files html links for users to view it.
 */
function GetAttachedFilesHTMLLinks(fileIds)
{
	var attachedFilesHTML = '';
	var attachedFileArray = fileIds.split(','); //convert comma separated string to array
	
	//We want to search for files where Id is in the array. Currently, NS does not support file search.
	//We will have to try to load file and if file loads, then file exist and get its name.
	if(attachedFileArray.length > 0)
	{
		for(var i = 0; i < attachedFileArray.length; i++)
		{	
			var file = null;			
			//This try catch is important because if someone deleted file manually from file cabinet, 
			//an error will be thrown.
			try
			{
				file = nlapiLoadFile(attachedFileArray[i]);
			}
			catch(e)
			{
//				
				//If error is thrown. Just catch it and do nothing for now.
//				//We could also use e.getCode() to check specific scenario.
//				//Example, if file doesn't exist, use the code below.
//				 if (e.getCode()=="RCRD_DSNT_EXIST")
//				 {
//					   file_exists = false;
//				 }
			} 
			
			if(file != null) //File exist and no error was thrown.
			{
				if(attachedFilesHTML == '')
				{
					attachedFilesHTML = '<div style="font-size:12px;">&nbsp;&nbsp;&nbsp;<b>Files Attached:</b><br></div>';	
					attachedFilesHTML +='<div style="font-size:12px;">&nbsp;&nbsp;&nbsp;<a href="' + file.getURL()  + '" target="_blank">' + file.getName() + '</a><br></div>';
				}
				else
				{
					attachedFilesHTML +='<div style="font-size:12px;">&nbsp;&nbsp;&nbsp;<a href="' + file.getURL()  + '" target="_blank">' + file.getName() + '</a><br></div>';
				}
			}
		}
	}
	return attachedFilesHTML;
}


///**
// * Adds current field values to session and return the string.
// * @returns {String}
// */
//function AddCurrentFieldValuesToSession()
//{
//	
//	return  'var partsInquiryId = nlapiGetFieldValue("custpage_partsinid");' +
//			'var lineNum = nlapiGetFieldValue("custpage_partinquiryitemsnum");' +
//			'var recordType = nlapiGetFieldValue("custpage_recordtype");' +  			
//			'var tempFolderName = nlapiGetFieldValue("custpage_tempfoldername");' +
//			'var existingFileIds = nlapiGetFieldValue("custpage_fileidsfield");' +
//			'var description = nlapiGetFieldValue("custpage_description");' +
//			'var qty = nlapiGetFieldValue("custpage_qty");' +  			
//			'var item = nlapiGetFieldValue("custpage_item");' +
//			'var itemdescript = nlapiGetFieldValue("custpage_itemdescript");' +
//			
//				
//			'var sessionArray = new Array();' +		
//			'var index = sessionArray.length;' +
//			'sessionArray[index] = new Object();' +
//			'sessionArray[index].name = "selectionpopup_partsinid";' +
//			'sessionArray[index].value = partsInquiryId;' +
//			
//			'index = sessionArray.length;' +
//			'sessionArray[index] = new Object();' +
//			'sessionArray[index].name = "selectionpopup_partsinitemnumber";' +
//			'sessionArray[index].value = lineNum;' +
//
//			
//			'index = sessionArray.length;' +
//			'sessionArray[index] = new Object();' +
//			'sessionArray[index].name = "selectionpopup_recordtype";' +
//			'sessionArray[index].value = recordType;' +
//		
//
//			'index = sessionArray.length;' +
//			'sessionArray[index] = new Object();' +
//			'sessionArray[index].name = "selectionpopup_fileids";' +
//			'sessionArray[index].value = existingFileIds;' +
//
//			
//			'index = sessionArray.length;' +
//			'sessionArray[index] = new Object();' +
//			'sessionArray[index].name = "selectionpopup_tempfoldername";' +
//			'sessionArray[index].value = tempFolderName;' +
//			
//			
//			'index = sessionArray.length;' +
//			'sessionArray[index] = new Object();' +
//			'sessionArray[index].name = "selectionpopup_description";' +
//			'sessionArray[index].value = description;' +
//			
//			
//			'index = sessionArray.length;' +
//			'sessionArray[index] = new Object();' +
//			'sessionArray[index].name = "selectionpopup_qty";' +
//			'sessionArray[index].value = qty;' +
//			
//			
//			'index = sessionArray.length;' +
//			'sessionArray[index] = new Object();' +
//			'sessionArray[index].name = "selectionpopup_item";' +
//			'sessionArray[index].value = item;' +
//			
//			
//			'index = sessionArray.length;' +
//			'sessionArray[index] = new Object();' +
//			'sessionArray[index].name = "selectionpopup_itemdescript";' +
//			'sessionArray[index].value = itemdescript;';// +
//			
////			'SetDataInSession(sessionArray);'
////			'SessionManagementRESTlet_SetSession(sessionArray);';
//}

/**
 * Returns folder id for the specified claim.
 * @param partsInquiryId
 * @returns
 */
function GetPartsInFolderId(partsInquiryId)
{
	var cols = new Array();
	cols[cols.length] = new nlobjSearchColumn('internalid');
	
	var folders = nlapiSearchRecord('folder', null, new nlobjSearchFilter('name', null, 'is', partsInquiryId.toString()), cols);	
	if(folders != null && folders.length == 1) //folder exist, return folder id.
		return folders[0].getId();
	else //folder does not exist
	{
		//We need to create a temp folder if it does not exist.
		var context = nlapiGetContext();
		var tempFolderName = ConvertNSFieldToString(context.getSessionObject('selectionpopup_tempfoldername')); 	
		if(tempFolderName == '') //if we don't have temp folder in session, then add it.
		{
			tempFolderName = 'temp - ' + context.getUser() + ' - ' + (new Date()).getTime(); //current time in milliseconds
			context.setSessionObject('selectionpopup_tempfoldername', tempFolderName);	
		}
		
		folders = nlapiSearchRecord('folder', null, new nlobjSearchFilter('name', null, 'is', tempFolderName), cols);
		if(folders == null || folders.length == 0) //temp folder doesn't exist, create it
		{
			var folder = nlapiCreateRecord('folder', null);
			folder.setFieldValue('name', tempFolderName);
			
			var partsFileAttachmentFolderId = GetPartsInquiryAttachmentsFolderId();
			folder.setFieldValue('parent', partsFileAttachmentFolderId);
			return nlapiSubmitRecord(folder, false, true);
		}
		else //return temp folder id
			return folders[0].getId(); 
	}
}

/**
 * Field changed event on the Operations Line that pops up a configurator.
 * 
 * @param type
 * @param name
 * @param linenum
 */
function PartsInPopupWizard_FieldChanged(type, name, linenum)
{
	if (name == 'custrecordpartsinquiryitems_attachfiles')
	{
//		var sessionArray = new Array();
//		
//		index = sessionArray.length;
//		sessionArray[index] = new Object();
//		sessionArray[index].name = 'selectionpopup_fileids';
//		sessionArray[index].value = nlapiGetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_fileids');
//		
//				
//		index = sessionArray.length;
//		sessionArray[index] = new Object();
//		sessionArray[index].name = 'selectionpopup_description';
//		sessionArray[index].value = nlapiGetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_description');
//		
//		index = sessionArray.length;
//		sessionArray[index] = new Object();
//		sessionArray[index].name = 'selectionpopup_qty';
//		sessionArray[index].value = nlapiGetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_quantity');
//		
//		index = sessionArray.length;
//		sessionArray[index] = new Object();
//		sessionArray[index].name = 'selectionpopup_item';
//		sessionArray[index].value = nlapiGetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_item');
//		
//		index = sessionArray.length;
//		sessionArray[index] = new Object();
//		sessionArray[index].name = 'selectionpopup_itemdescript';
//		sessionArray[index].value = nlapiGetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_itemdescript');
//		
//		index = sessionArray.length;
//		sessionArray[index] = new Object();
//		sessionArray[index].name = 'selectionpopup_tempfoldername';
//		sessionArray[index].value = ConvertNSFieldToString(nlapiGetFieldValue('custpage_tempfoldername'));
//		
//		
		var partsInquiryId = ConvertNSFieldToInt(nlapiGetRecordId());		
//		index = sessionArray.length;
//		sessionArray[index] = new Object();
//		sessionArray[index].name = 'selectionpopup_partsinid';
//		sessionArray[index].value = partsInquiryId;
		
		var lineDataObject = new Object();
		lineDataObject.selectionpopup_fileids = nlapiGetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_fileids');
		lineDataObject.selectionpopup_description = nlapiGetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_description');
		lineDataObject.selectionpopup_qty = nlapiGetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_quantity');
		lineDataObject.selectionpopup_item = nlapiGetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_item');
		lineDataObject.selectionpopup_itemdescript = nlapiGetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_itemdescript');
		lineDataObject.selectionpopup_tempfoldername = ConvertNSFieldToString(nlapiGetFieldValue('custpage_tempfoldername'));
		lineDataObject.selectionpopup_partsinid = partsInquiryId;
		
		var urlParams = '&custparam_linenum=' + linenum + '&custparam_recordtype=' + nlapiGetRecordType() +
						'&custparam_partsinid=' + partsInquiryId + '&custparam_isencodeduri=T&custparam_linedata=' + encodeURIComponent(JSON.stringify(lineDataObject));
		
		var sUrl = nlapiResolveURL('SUITELET', 'customscriptgd_pipopupwizard', 'customdeploygd_pipopupwizard') + urlParams;
		var sWindowName = "partsinpopup_window";
		  
		var nWidth = 1050;
		var nHeight = 700;
		 
		nlapiSetCurrentLineItemValue('recmachcustrecordpartsinquiryitems_partsinquiry', 'custrecordpartsinquiryitems_attachfiles', 'No', false, false);
		
		window.open(sUrl,
		            sWindowName,
		            "location=no,status=no,menubar=no,resizable=no,toolbar=no,scrollbars=yes,titlebar=no,width="+ nWidth + ",height=" + nHeight);
	}
}

function SetDataInSession(sessionArray) {
	var context = nlapiGetContext();
	
	if (sessionArray != null) {
		for (var i = 0; i < sessionArray.length; i++) {
			context.setSessionObject(sessionArray[i].name, sessionArray[i].value);
		}
	}
}