/**
 * Grand Design printout from a PCN.
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Jun 2016     Jacob Shetler
 *
 */

/**
 * Navigates to the Suitelet (below) that prints the PCN
 */
function GDPCN_PrintPCN_WkflowAction()
{
	nlapiSetRedirectURL('suitelet', 'customscriptgd_pcnprint_suite', 'customdeploygd_pcnprint_suite', null, {'custparam_pcnid' : nlapiGetRecordId()});
}

/**
 * Creates and downloads a PDF version of the specified PCN.
 * 
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * 
 * @returns {Void} Any output is written via response object
 */
function GDPCN_PrintPCN_Suitelet(request, response)
{
	var pcnRec = nlapiLoadRecord('customrecordrvsproductchangenotice', request.getParameter('custparam_pcnid'));
	var columns = new Array();
	columns.push(new nlobjSearchColumn('documentsize', 'file', 'sum').setSort());
	var results = nlapiSearchRecord(pcnRec.getRecordType(), null, new nlobjSearchFilter('internalid', null,'is', pcnRec.getId()), columns) || [];
	// added search to confirm if there are files to print and also if the files total size exceed the 10MB or 10000KB size limit and send the user an error message but do not send an email to devbox
	// thsi is for case 11241
	if (results.length > 0){
		if (results[0].getValue('documentsize', 'file', 'sum') > 10000){
			throw nlapiCreateError("SSS_TOTAL_FILE_CONTENT_SIZE_EXCEEDED", "The file content you are attempting to access exceeds the total files maximum allowed size of 10000KB (or 10.0 MB). " +
					"Please go back and under the Files Tab, combine files and remove individual files or remove some files so that the total under the Size(KB) column is under 10000 limit.  " +
					"If you need additional help or instructions, please contact your administrator.", true);
		}
	}
	
	var pdfFile = GDPCN_PrintPCN_GetPCNHTML(pcnRec);
	response.setContentType('PDF', pdfFile.getName());
	response.write(pdfFile.getValue());
}

/**
 * Returns the HTML/PDF file object for printing a PCN.
 * This includes all pdf/image attachments on the PCN.
 * 
 * @param {nlobjRecord} pcnRec The PCN record object to print.
 * @returns {nlobjFile}
 */
function GDPCN_PrintPCN_GetPCNHTML(pcnRec)
{
	//Get the PDF for the current PCN.
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

	//Create the PDF that will have the rest of the attachments, if any.
	var fullHTML = '<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdfset>' + pcnHTML;
	
	//Attach all accceptable image types 
	var fileResults = nlapiSearchRecord(pcnRec.getRecordType(), null, new nlobjSearchFilter('internalid', null,'is',pcnRec.getId()), [new nlobjSearchColumn('name', 'file'), 
	                                                                                                                                  new nlobjSearchColumn('internalid', 'file'),
	                                                                                                                                  new nlobjSearchColumn('url', 'file')]);
	var pdfFilesToSetBack = [];
	if (fileResults != null)
	{
		//File type constants for acceptable file extensions.
		var imageFileTypes = ['PNG', 'JPEG', 'JPG', 'GIF', 'PBM', 'PGM', 'TIFF'];
		var otherFileTypes = ['PDF'];
		
		for (var i = 0; i < fileResults.length; i++)
		{
			//See if the file extension is one we can deal with.
			var fileName = fileResults[i].getValue('name', 'file');
			var fileExt = fileName.substr(fileName.lastIndexOf('.')+1).toUpperCase();
			var fileId = fileResults[i].getValue('internalid', 'file');
			if (imageFileTypes.indexOf(fileExt) > -1)
			{
				//Then add the file as an image using the base64 data
				fullHTML += '<pdf><body style="margin-top:.1cm"><img style="width:500px;height:300px;" src="data:image/' + fileExt.toLowerCase() + ';base64, ' + nlapiLoadFile(fileId).getValue() + '" /></body></pdf>';
			}
			else if (otherFileTypes.indexOf(fileExt) > -1)
			{
			    //Generate the base64 of the pdf file so it does not need to make the file available without login.
			    // If using the file URL, the file needs to be available without login for the URL to work. This causes the script to fail 
			    // when there are 30+ PDF files since it needs to load, save each PDF file and at the end, load save again to undo the setting of the
			    // available without login field.  
			    var base64EncodedPDF = nlapiLoadFile(fileId).getValue();
				fullHTML += '<pdf src="data:application/pdf;base64, ' + base64EncodedPDF + '" />';
			}
		}
	}
	
	//Convert the file to an nlobjFile
	var finalFile = nlapiXMLToPDF(fullHTML + '</pdfset>');
	finalFile.setName('PCN #' + pcnRec.getFieldValue('name') + '.pdf');
	
	//Return the file
	return finalFile;
}

/**
 * Generates the title and the overall information for the printout.
 * @param {nlobjRecord} pcnRec
 */
function getPCNHeader(pcnRec)
{
	return '<table width="100%">' +
	'<tr><td colspan="8" align="center" border="1px solid black" style="font-size:20px">PRODUCT CHANGE NOTICE #' + ConvertNSFieldToString(pcnRec.getFieldValue('name')) + '</td></tr>' +
	'<tr style="margin-top: 10px">' + 
		'<td class="tophead">Date:</td><td align="left" width="10%">' + ConvertNSFieldToString(pcnRec.getFieldValue('custrecordproductchangenotice_reqdate')) + '</td>' +
		'<td class="tophead">Type:</td><td align="left" width="10%">' + (pcnRec.getFieldValue('custrecordgd_pcntype') == 1 ? 'PCN' : 'TD') + '</td>' +
		'<td class="tophead">Status:</td><td align="left" width="50%">' + ConvertNSFieldToString(pcnRec.getFieldText('custrecordproductchangenotice_status')) + '</td>' +
		'<td class="tophead">Initiated By:</td><td align="left" width="30%">' + ConvertNSFieldToString(pcnRec.getFieldText('custrecordproductchangenotice_requestby')) + '</td>' +
	'</tr></table>';
}

/**
 * Generates the Products Impacted section for the printout.
 * @param {nlobjRecord} pcnRec
 */
function getPCNProductsImpacted(pcnRec)
{
	//Get the series selected rows. We may have to convert the string returned by the getFieldValue to an array.
	var seriesImpactedTable = '<table width="100%">';
	var seriesSelected = pcnRec.getFieldText('custrecordproductchangenotice_series');
	if (seriesSelected != null)
	{
		seriesSelected = seriesSelected.split(String.fromCharCode(5));
		for (var i = 0; i < seriesSelected.length; i++)
		{
			seriesImpactedTable += '<tr><td>' + ConvertNSFieldToString(seriesSelected[i]) + '</td></tr>';
		}
	}
	seriesImpactedTable += '</table>';
	
	//Do the same for the models.
	var modelImpactedTable = '<table width="100%">';
	var modelsSelected = pcnRec.getFieldText('custrecordproductchangenotice_models');
	if (modelsSelected != null)
	{
		modelsSelected = modelsSelected.split(String.fromCharCode(5)) || [];
		
		// If the PCN has lamination field set to yes, add the "LAMINATION" wording on the printout in red font.
		if (pcnRec.getFieldValue('custrecordgd_pcnchangeimpactslamination') == '1')
		{
			var modelSelectedOriginalLength = modelsSelected.length
			if (modelSelectedOriginalLength < 3)
			{
				for (var i = 0; i < 2 - modelSelectedOriginalLength; i++)
				{
					modelsSelected.push('');
				}

				modelsSelected.push('<span style="color:red;"><b>LAMINATION</b></span>');
			}
			else if (modelsSelected.length >= 3)
			{
				modelsSelected.splice(2, 0, '<span style="color:red;"><b>LAMINATION</b></span>');
			}
		}
		
		for (var i = 0; i < modelsSelected.length; i++)
		{
			if (i % 3 == 0)
				modelImpactedTable += '<tr>';
			
			// If the lamination field is set to yes on the PCN, align to center and do not use the Convert NS Field to String method to allow the HTML that is part of the element
			if (i == 2 && pcnRec.getFieldValue('custrecordgd_pcnchangeimpactslamination') == '1')
				modelImpactedTable += '<td align="center">' + modelsSelected[i] + '</td>';
			else
				modelImpactedTable += '<td>' + ConvertNSFieldToString(modelsSelected[i]) + '</td>';
			
			if (i % 3 == 2 || i == modelsSelected.length - 1) 
				modelImpactedTable += '</tr>';
		}
	}
	modelImpactedTable += '</table>';
	
	return '<table style="margin-top: 10px" width="100%" border="1px solid black">' +
	'<tr><td class="sectionhead" colspan="2">PRODUCTS IMPACTED (Model Year: '+ pcnRec.getFieldText('custrecordgd_pcnmodelyear') +')</td><td></td></tr>' +
	'<tr>' +
		'<td width="25%">' + seriesImpactedTable + '</td>' +
		'<td width="75%">' + modelImpactedTable + '</td>' +
	'</tr></table>';
}

/**
 * Generates the Change Description section for the printout.
 * @param {nlobjRecord} pcnRec
 */
function getPCNChangeDescription(pcnRec)
{
	var pcnUnitsType = 'recmachcustrecordpcnunits_pcn';
	var unitsTable = '<table width="100%">';
	for (var i = 1; i <= pcnRec.getLineItemCount(pcnUnitsType); i++)
	{
		unitsTable += '<tr><td class="tablehead">Plant:</td><td width="30%">' + ConvertNSFieldToString(pcnRec.getLineItemText(pcnUnitsType, 'custrecordpcnunits_plant', i)) + '</td>' +
		'<td class="tablehead">Start Unit:</td><td width="30%">' + ConvertNSFieldToString(pcnRec.getLineItemText(pcnUnitsType, 'custrecordpcnunits_unit', i)) + '</td>' +
		'<td class="tablehead">Online Date:</td><td width="30%">' + ConvertNSFieldToString(pcnRec.getLineItemValue(pcnUnitsType, 'custrecordpcnunits_onlinedate', i)) + '</td>' +
		'<td class="tablehead">End Unit:</td><td width="30%">' + ConvertNSFieldToString(pcnRec.getLineItemText(pcnUnitsType, 'custrecordpcnunits_endunit', i)) + '</td></tr>';
	}
	unitsTable += '</table>';
	
	return '<table style="margin-top: 10px" width="100%" border="1px solid black">' +
	'<tr><td class="sectionhead" colspan="2">CHANGE DESCRIPTION</td><td></td></tr>' +
	'<tr><td class="internalhead">Subject:</td><td align="left">' + ConvertNSFieldToString(pcnRec.getFieldValue('custrecordgd_pcnsubject')) + '</td></tr>' +
	'<tr><td class="internalhead">Change:</td><td align="left">' + ConvertNSFieldToString(pcnRec.getFieldValue('custrecordproductchangenotice_change')) + '</td></tr>' +
	'<tr><td class="internalhead">Units:</td><td>' + unitsTable + '</td></tr>' +
	'<tr><td width="5%"></td><td width="95%"></td></tr>' +
	'</table>';
}

/**
 * Generates the BOM Impact section for the printout.
 * @param {nlobjRecord} pcnRec
 */
function getPCNBOMImpact(pcnRec)
{
	return '<table style="margin-top: 10px" width="100%" border="1px solid black">' +
	'<tr><td class="sectionhead" colspan="6">TOTAL BOM IMPACT</td></tr>' +
	'<tr><td class="internalhead">Previous Cost:</td><td align="left">' + nlapiEscapeXML('$') + nlapiFormatCurrency(ConvertNSFieldToString(pcnRec.getFieldValue('custrecordproductchangenotice_ttlprevcos'))) + '</td>' +
	'<td class="internalhead">New Cost:</td><td align="left">' + nlapiEscapeXML('$') + nlapiFormatCurrency(ConvertNSFieldToString(pcnRec.getFieldValue('custrecordproductchangenotice_ttlnewcost'))) + '</td>' +
	'<td class="internalhead">Cost Difference:</td><td align="left">' + (pcnRec.getFieldValue('custrecordproductchangenotice_ttlcostdif') < 0 ? '-' : '') + nlapiEscapeXML('$') + nlapiFormatCurrency(Math.abs(ConvertNSFieldToString(pcnRec.getFieldValue('custrecordproductchangenotice_ttlcostdif')))) + '</td>' +
	'</tr></table>';
}

/**
 * Generates the Obsolescence section for the printout.
 * @param {nlobjRecord} pcnRec
 */
function getPCNObsolescence(pcnRec)
{
	var pcnPartsType = 'recmachcustrecordpcnparts_pcn';
	var partsTable = '<tr>' +
					 	'<td class="internalhead">Obsolete Part</td>' +
					 	'<td class="internalhead">Obsolete Qty</td>' +
					 	'<td class="internalhead">Obsolete Cost</td>' +
					'</tr>';
	for (var i = 1; i <= pcnRec.getLineItemCount(pcnPartsType); i++)
	{
		partsTable += '<tr>' +
			'<td class="smalltabledata">' + ConvertNSFieldToString(pcnRec.getLineItemText(pcnPartsType, 'custrecordpcnparts_prevpart', i)) + '</td>' +
		 	'<td class="smalltabledata" align="center">' + ConvertNSFieldToString(pcnRec.getLineItemValue(pcnPartsType, 'custrecordpcnparts_obsoleteqty', i)) + '</td>' +
		 	'<td class="smalltabledata" align="center">' + ConvertNSFieldToString(pcnRec.getLineItemValue(pcnPartsType, 'custrecordpcnparts_obsoleteamount', i)) + '</td>' +
		'</tr>';
	}
	
	return '<table style="margin-top: 10px" width="100%" border="1px solid black">' +
	'<tr><td class="sectionhead" colspan="3">OBSOLESCENCE</td></tr>' +
	'<tr><td class="internalhead">Total Obsolete Cost:</td><td colspan="2" align="left">' + (pcnRec.getFieldValue('custrecordproductchangenotice_ttlobscost') < 0 ? '-' : '') + nlapiEscapeXML('$') + nlapiFormatCurrency(Math.abs(ConvertNSFieldToString(pcnRec.getFieldValue('custrecordproductchangenotice_ttlobscost')))) + '</td></tr>' + 
	partsTable +
	'</table>';
}

/**
 * Generates the Signatures section for the printout.
 * @param {nlobjRecord} pcnRec
 */
function getPCNSignatures(pcnRec)
{
	return '<table style="margin-top: 10px" width="100%" border="1px solid black">' +
	'<tr><td class="sectionhead" colspan="4">SIGN-OFF</td></tr>' +
	'<tr>' +
		'<td class="internalhead">Engineering:</td><td width="30%" align="left">' + ConvertNSFieldToString(pcnRec.getFieldText('custrecordproductchangenotice_engapprvl')) + '</td>' +
		'<td class="internalhead">Date:</td><td width="50%" align="left">' + ConvertNSFieldToString(pcnRec.getFieldValue('custrecordproductchangenotice_engapprdt')) + '</td>' +
	'</tr>' +
	'<tr>' +
		'<td class="internalhead">Service:</td><td align="left">' + ConvertNSFieldToString(pcnRec.getFieldText('custrecordgd_pcn_serviceappvl')) + '</td>' +
		'<td class="internalhead">Date:</td><td align="left">' + ConvertNSFieldToString(pcnRec.getFieldValue('custrecordgd_pcn_serviceappvldate')) + '</td>' +
	'</tr>' +
	'<tr>' +
		'<td class="internalhead">Product Manager:</td><td align="left">' + ConvertNSFieldToString(pcnRec.getFieldText('custrecordgd_pcn_prodmanagerappvl')) + '</td>' +
		'<td class="internalhead">Date:</td><td align="left">' + ConvertNSFieldToString(pcnRec.getFieldValue('custrecordgd_pcn_prodmanappvldate')) + '</td>' +
	'</tr>' +
	'<tr>' +
		'<td class="internalhead">GM:</td><td align="left">' + ConvertNSFieldToString(pcnRec.getFieldText('custrecordproductchangenotice_salesappvl')) + '</td>' +
		'<td class="internalhead">Date:</td><td align="left">' + ConvertNSFieldToString(pcnRec.getFieldValue('custrecordproductchangenotice_salesappdt')) + '</td>' +
	'</tr>' +
	'<tr>' +
		'<td class="internalhead">Manufacturing:</td><td align="left">' + ConvertNSFieldToString(pcnRec.getFieldText('custrecordproductchangenotice_pltmgrapvl')) + '</td>' +
		'<td class="internalhead">Date:</td><td align="left">' + ConvertNSFieldToString(pcnRec.getFieldValue('custrecordproductchangenotice_pltmgrapdt')) + '</td>' +
	'</tr>' +
	'<tr>' +
		'<td class="internalhead">Purchasing:</td><td align="left">' + ConvertNSFieldToString(pcnRec.getFieldText('custrecordproductchangenotice_purchappvl')) + '</td>' +
		'<td class="internalhead">Date:</td><td align="left">' + ConvertNSFieldToString(pcnRec.getFieldValue('custrecordproductchangenotice_purchappdt')) + '</td>' +
	'</tr>' +
	'<tr>' +
		'<td class="internalhead">Final Approval:</td><td align="left">' + ConvertNSFieldToString(pcnRec.getFieldText('custrecordgd_pcnpresapp')) + '</td>' +
		'<td class="internalhead">Date:</td><td align="left">' + ConvertNSFieldToString(pcnRec.getFieldValue('custrecordgd_pcnpresappdt')) + '</td>' +
	'</tr>' +
	'</table>';
}

/**
 * Generates the pages that contain the Parts changes, if any, for the printout.
 * @param {nlobjRecord} pcnRec
 */
function getPCNPartChanges(pcnRec)
{
	var pcnPartsType = 'recmachcustrecordpcnparts_pcn';
	var partsTable = '<tr>' +
					 	'<td class="internalhead">Prev Part</td>' +
					 	'<td class="internalhead">Prev Qty</td>' +
					 	'<td class="internalhead">Prev Unit Cost</td>' +
					 	'<td class="internalhead">Prev Cost</td>' +
					 	'<td class="internalhead">New Part</td>' +
					 	'<td class="internalhead">New Qty</td>' +
					 	'<td class="internalhead">New Unit Cost</td>' +
					 	'<td class="internalhead">New Cost</td>' +
					 	'<td class="internalhead">Cost Change</td>' +
					 	'<td class="internalhead">UOM</td>' +
					'</tr>';
	for (var i = 1; i <= pcnRec.getLineItemCount(pcnPartsType); i++)
	{
		partsTable += '<tr>' +
		 	'<td class="smalltabledata">' + ConvertNSFieldToString(pcnRec.getLineItemText(pcnPartsType, 'custrecordpcnparts_prevpart', i)) + '</td>' +
		 	'<td class="smalltabledata" align="center">' + ConvertNSFieldToString(pcnRec.getLineItemValue(pcnPartsType, 'custrecordpcnparts_previousqty', i)) + '</td>' +
		 	'<td class="smalltabledata" align="center">' + nlapiFormatCurrency(ConvertNSFieldToString(pcnRec.getLineItemValue(pcnPartsType, 'custrecordpcnparts_prevunitcost', i))) + '</td>' +
		 	'<td class="smalltabledata" align="center">' + nlapiFormatCurrency(ConvertNSFieldToString(pcnRec.getLineItemValue(pcnPartsType, 'custrecordpcnparts_prevcost', i))) + '</td>' +
		 	'<td class="smalltabledata">' + ConvertNSFieldToString(pcnRec.getLineItemText(pcnPartsType, 'custrecordpcnparts_newpart', i)) + '</td>' +
		 	'<td class="smalltabledata" align="center">' + ConvertNSFieldToString(pcnRec.getLineItemValue(pcnPartsType, 'custrecordpcnparts_newqty', i)) + '</td>' +
		 	'<td class="smalltabledata" align="center">' + nlapiFormatCurrency(ConvertNSFieldToString(pcnRec.getLineItemValue(pcnPartsType, 'custrecordpcnparts_newunitcost', i))) + '</td>' +
		 	'<td class="smalltabledata" align="center">' + nlapiFormatCurrency(ConvertNSFieldToString(pcnRec.getLineItemValue(pcnPartsType, 'custrecordpcnparts_newcost', i))) + '</td>' +
		 	'<td class="smalltabledata" align="center">' + nlapiFormatCurrency(ConvertNSFieldToString(pcnRec.getLineItemValue(pcnPartsType, 'custrecordpcnparts_costchange', i))) + '</td>' +
		 	'<td class="smalltabledata">' + ConvertNSFieldToString(pcnRec.getLineItemText(pcnPartsType, 'custrecordpcnparts_uom', i)) + '</td>' +
		'</tr>';
	}
	
	return '<table style="margin-top: 10px" width="100%" border="1px solid black">' +
	'<tr><td colspan="8" class="sectionhead">PARTS</td></tr>' +
	partsTable +
	'</table>';
}
