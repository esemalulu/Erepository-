/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       17 July 2019   Jeffrey Bajit  This is a copy of the RVS BOM manual rollup function that lists all the components and their prices.  This is NOT used for the other last price Bom Rollup suitelet 
 * 											that file name is GD_BOMRollupSuitelet.js that has differences in which prices are being used.  This file is used for the main manual rollup that is compared with the
 * 											Nightly Scheduled Map/Reduce Rollup. 
 *
 */

function PrintBOMRollupSuitelet(request, response)
{
	var context = nlapiGetContext();
	claimId = context.getSessionObject('PrintClaim_ClaimId');
	context.setSessionObject('PrintClaim_ClaimId', null);
}

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function BOMRollupSuitelet(request, response)
{
	if (request.getMethod() == 'GET')
	{		
		var itemId = request.getParameter('custparam_itemid');
		var bomRollupId = request.getParameter('custparam_bomrollupid');
		var date = request.getParameter('custparam_date');
		var printBOM = request.getParameter('printBOM');
		var excelBOM = request.getParameter('excelBOM');
		var flatBomArray = null;
		var totalCost = 0;
		var form = null;
		
		// if the item isn't set and the bom rollup isn't set, then the user needs to select an item
		if (itemId == null && bomRollupId == null)
		{		
			form = nlapiCreateForm('Bill of Material Rollup', false);
			form.setScript('customscriptgd_bomrollupsuiteletclient');

			var modelField = form.addField('custpage_itemid', 'select', 'Model', 'item', null);
			modelField.setMandatory(true);
			
			var dateField = form.addField('custpage_date', 'date', 'Run as of this date', null, null);
			dateField.setDefaultValue(nlapiDateToString(new Date()));
			dateField.setMandatory(true);
			
			form.addSubmitButton('Get BOM Rollup');		

		}
		else if (bomRollupId != null)
		{
			// load the bom rollup record
			var bomRollupRecord = nlapiLoadRecord('customrecordrvsbomrollupprocessing', bomRollupId);
			
			// get the itemid from the bom rollup record
			itemId = bomRollupRecord.getFieldValue('custrecordbomrollupprocessing_model');
			date = bomRollupRecord.getFieldValue('custrecordbomrollupprocessing_date');
			
			var bomRollupStatus = bomRollupRecord.getFieldValue('custrecordbomrollupprocessing_status');
			var bomRollupJsonObjectString = bomRollupRecord.getFieldValue('custrecordbomrollupprocessing_jsonobject');

			var item = nlapiLoadRecord('assemblyitem', itemId, null);
			
			// get the item name, either from the display name or the itemid field depending
			var itemName = ConvertNSFieldToString(item.getFieldValue('itemid'));
			if (itemName == '')
				itemName = ConvertNSFieldToString(item.getFieldValue('displayname'));
			else if (ConvertNSFieldToString(item.getFieldValue('displayname') != ''))
				itemName += ' - ' + ConvertNSFieldToString(item.getFieldValue('displayname'));
			
			form = nlapiCreateForm('Bill of Material Rollup - ' + itemName, false);
			
			// add two hidden fields for the model and bom rollup so that we don't lose the data on refresh
			var modelField = form.addField('custpage_itemid', 'select', 'Model', 'assemblyitem', null);
			modelField.setDisplayType('hidden');
			modelField.setDefaultValue(itemId);
			
			var bomRollupField = form.addField('custparam_bomrollupid', 'select', 'BOM Rollup', 'customrecordrvsbomrollupprocessing', null);
			bomRollupField.setDisplayType('hidden');
			bomRollupField.setDefaultValue(bomRollupId);
			
			if (bomRollupStatus == BOMROLLUPPROCESSINGSTATUS_QUEUED)
			{
				var fieldGroup = form.addFieldGroup('custpage_fieldgroup', '&nbsp;');
				fieldGroup.setSingleColumn(true);
				
				var infoField = form.addField('custpage_info', 'text', '&nbsp;', null, 'custpage_fieldgroup');
				infoField.setDisplayType('inline');
				infoField.setDefaultValue('The BOM rollup is currently in the processing queue. Click the refresh button to refresh the page.');
				
				form.addSubmitButton('Refresh');
			}
			else if (bomRollupStatus == BOMROLLUPPROCESSINGSTATUS_PROCESSING)
			{
				var fieldGroup = form.addFieldGroup('custpage_fieldgroup', '&nbsp;');
				fieldGroup.setSingleColumn(true);
				
				var infoField = form.addField('custpage_info', 'text', '&nbsp;', null, 'custpage_fieldgroup');
				infoField.setDisplayType('inline');
				infoField.setDefaultValue('The BOM rollup is currently being processed. Click the refresh button to refresh the page.');
				
				form.addSubmitButton('Refresh');
			}
			else // Open or Processing Complete
			{
			    // Get 5 or less processing records that are at least one year old and delete the oldest records.
                var completedProcessingRecordResults = nlapiSearchRecord(
                        'customrecordrvsbomrollupprocessing',
                        null,
                        [
                         ['lastmodified', 'before', 'lastYearToDate']
                        ],
                        [
                         new nlobjSearchColumn('lastmodified').setSort()
                        ]
                ) || [];
                
                // Only process up to 5 since we don't want to use up all of the usage points in this suitelet.
                var recordCount = 5; 
                if (completedProcessingRecordResults.length < 5)
                    recordCount = completedProcessingRecordResults.length;
                
                // Delete old processing records that are older than one year.
                for(var i = 0; i < recordCount; i++) {
                    nlapiDeleteRecord('customrecordrvsbomrollupprocessing', completedProcessingRecordResults[i].id);
                }
				
				var dateField = form.addField('custpage_date', 'date', 'Run as of this date', null, null);
				dateField.setDefaultValue(date);
				dateField.setMandatory(true);
				dateField.setDisplayType('inline');
				
				var totalCostField = form.addField('custpage_totalcost', 'currency', 'Total Cost', null, null);
				totalCostField.setDisplayType('inline');

				var checkReset = form.addField('custpage_checkreset', 'checkbox', 'Check Reset', null, null);
				checkReset.setDefaultValue('T');
				checkReset.setDisplayType('hidden');
				
				var list = form.addSubList('custpage_components', 'list', 'Components', null);
				
				var itemIdField = list.addField('custpage_componentid', 'text', 'Part #', null);
				itemIdField.setDisplayType('inline');
				
				var descriptionField = list.addField('custpage_componentdesc', 'text', 'Description', null);
				descriptionField.setDisplayType('inline');
				
				var vendorField = list.addField('custpage_vendor', 'text', 'Preferred Vendor', null);
				vendorField.setDisplayType('inline');
				
				var vendorPartNumberField = list.addField('custpage_vendorpartnumber', 'text', 'Vendor Part #', null);
				vendorPartNumberField.setDisplayType('inline');
				
				var uomField = list.addField('custpage_componentuom', 'text', 'Purchase UOM', null);
				uomField.setDisplayType('inline');	
				
				var qtyField = list.addField('custpage_componentqty', 'currency', 'Quantity (Purchase UOM)', null);
				qtyField.setDisplayType('inline');
				
				var costField = list.addField('custpage_componentcost', 'currency', 'Cost (Purchase UOM)', null);
				costField.setDisplayType('inline');
				
				costField = list.addField('custpage_componentextcost', 'currency', 'Ext. Cost', null);
				costField.setDisplayType('inline');
				
				// get the JSON string object from the bom processing record and parse it back to an object
				var JSONObject = JSON.parse(bomRollupJsonObjectString);
				var bomArray = JSONObject.bomArray;
				totalCost = JSONObject.totalCost;
				
				totalCostField.setDefaultValue(totalCost);
				
				flatBomArray = FlattenBOMArray(bomArray);
				
				AddBOMsToList(flatBomArray, list);
				
				form.addSubmitButton('Reset');
			    
				//This will return url from /app/site/hosting/....
				var printUrl = nlapiResolveURL('SUITELET', 'customscriptgd_bomrollupsuitelet_manual', 'customdeploygd_bomrollupsuitelet_manual') + "&custparam_itemid=" + itemId + '&custparam_bomrollupid=' + bomRollupId + '&printBOM=T';
				var printScript = "document.location ='" + printUrl + "'"; //now redirect to the suitelet url on client side.
				
				var excelUrl = nlapiResolveURL('SUITELET', 'customscriptgd_bomrollupsuitelet_manual', 'customdeploygd_bomrollupsuitelet_manual') + "&custparam_itemid=" + itemId + '&custparam_bomrollupid=' + bomRollupId + '&excelBOM=T';
				var excelScript = "document.location ='" + excelUrl + "'"; //now redirect to the suitelet url on client side.
				
				form.addButton('custpage_print', 'Print BOM Rollup', printScript);
				form.addButton('custpage_export', 'Export to Excel', excelScript);
			}
		}
		
		//Printing
		if(flatBomArray != null && (printBOM != null || excelBOM != null) && (printBOM == 'T' || excelBOM == 'T'))
		{
			// load the bom rollup record
			var bomRollupRecord = nlapiLoadRecord('customrecordrvsbomrollupprocessing', bomRollupId);
			
			// get the itemid from the bom rollup record
			itemId = bomRollupRecord.getFieldValue('custrecordbomrollupprocessing_model');
			var item = nlapiLoadRecord('assemblyitem', itemId, null);
			
			// get the item name, either from the display name or the itemid field depending
			var itemName = ConvertNSFieldToString(item.getFieldValue('itemid'));
			if (itemName != '')
				itemName += ' - ' + ConvertNSFieldToString(item.getFieldValue('displayname'));
			
			var htmlToPrint = PrintBOMRollupPDF(flatBomArray, itemName, totalCost.toFixed(2), date);	
			if(htmlToPrint != '')
			{
				if(excelBOM == 'T')
				{
					var excelHTML = ExportBOMToExcel(flatBomArray, itemName, totalCost.toFixed(2), date);
					var title = 'BOMRollUp ' + itemName + ' ' + '.xls';
					ExportExcelInSuiteLet(request, response, excelHTML, title);
				}
				else
				{
					//Do printing.
					PrintPDFInSuiteLet(request, response, 'Print BOMRollup ' + itemName + '.pdf', htmlToPrint);
				}
			}	
			else
				response.writePage(form);
		}
		else		
			response.writePage(form);
	}
	else 
	{
		var modelId = request.getParameter('custpage_itemid');
		var itemType = nlapiLookupField('assemblyitem', modelId, 'type');
		if (itemType != NETSUITE_WORKORDER_ITEMTYPE_ASSEMBLY)
		{
			// if the item is not assembly item, do nothing.
		}
		else {
			var bomRollupId = request.getParameter('custparam_bomrollupid');
			var date = request.getParameter('custpage_date');
			
			var now = new Date();
	        // This returns the number of milliseconds between midnight of January 1, 1970 and current date.
	        // We need this to prevent I.E from caching the URL. If the url hasn't changed, IE returns cached value.
	        // So we add this time in our url parameter to make sure that the url is never the same and forces IE to request it.
	        var time = now.getTime();
			
			var params = new Array();
			params['custparam_itemid'] = modelId;
			params['custparam_bomrollupid'] = bomRollupId;
			params['custparam_date'] = date;
			params['custparam_uniqueidentifier'] = time;
			// nlapiLogExecution('debug', 'Params', 'Model ID: ' + modelId + 'BOM Rollup ID: ' + bomRollupId + JSON.stringify(params));
			if (modelId != null && bomRollupId == null) // user selects the model
			{			
				var processingRecordId = null;
				var processingRecord = null;
				
				// Always create a new processing record, processing records will be used only once.
	            processingRecord = nlapiCreateRecord('customrecordrvsbomrollupprocessing');
				
				// set the model and the status and save the record			
				processingRecord.setFieldValue('custrecordbomrollupprocessing_model', modelId);
				processingRecord.setFieldValue('custrecordbomrollupprocessing_date', date);
				processingRecord.setFieldValue('custrecordbomrollupprocessing_status', BOMROLLUPPROCESSINGSTATUS_QUEUED);
				processingRecordId = nlapiSubmitRecord(processingRecord, true, false);
				
				params['custparam_bomrollupid'] = processingRecordId;
				
				var scheduleParams = new Array();
				scheduleParams['custscriptgd_bomrollupprocessingrecord'] = processingRecordId;
				ScheduleScript('customscriptgd_bomrollupprocessingmansch', null, scheduleParams);
				
				nlapiSetRedirectURL('SUITELET', 'customscriptgd_bomrollupsuitelet_manual', 'customdeploygd_bomrollupsuitelet_manual', null, params);
			}
			else 
			{
				// if the status of the bom processing script is open, then the we won't pass anything params through...
				var status = nlapiLookupField('customrecordrvsbomrollupprocessing', bomRollupId, 'custrecordbomrollupprocessing_status', false);
				var checkReset = request.getParameter('custpage_checkreset');
				if (checkReset == 'T')
				{
					nlapiSetRedirectURL('SUITELET', 'customscriptgd_bomrollupsuitelet_manual', 'customdeploygd_bomrollupsuitelet_manual', null, null);
				}
				else // refresh the suitelet with the params set
				{
					nlapiSetRedirectURL('SUITELET', 'customscriptgd_bomrollupsuitelet_manual', 'customdeploygd_bomrollupsuitelet_manual', null, params);
				}
			}
		}
	}
}

/**
 * Validates the model field on the BOM Rollup Suitelet to ensure that only assembly items will be processed.
 * @param type
 * @param name
 * @param linenum
 * @returns {Boolean}
 */
function BomRollup_ValidateField(type, name, linenum)
{
	if (name == 'custpage_itemid')
	{
		// Find the type of the item selected
		var itemType = LookupSuitelet_LookupField('assemblyitem', nlapiGetFieldValue('custpage_itemid'), 'type');
		if (itemType != NETSUITE_WORKORDER_ITEMTYPE_ASSEMBLY)
		{
			if (nlapiGetFieldValue(name) || '' != '') {
				// if the item is not assembly item we send the user this message.
				alert(nlapiGetFieldText('custpage_itemid') + ' is not a Model or Assembly Item, please try entering a Model or Assembly Item to Rollup.');
			}
			return false;
		}
	}
	return true;
}

/**
 * Check if the item is an assembly item before processing the BOM Rollup.
 * @returns {Boolean}
 */
function BomRollup_SaveRecord() {
	if (nlapiGetFieldValue('custpage_itemid') || '' != '') {
		// Find the type of the item selected
		var itemType = LookupSuitelet_LookupField('assemblyitem', nlapiGetFieldValue('custpage_itemid'), 'type');
		if (itemType != NETSUITE_WORKORDER_ITEMTYPE_ASSEMBLY)
		{
			// if the item is not assembly item we send the user this message.
			alert(nlapiGetFieldText('custpage_itemid') + ' is not a Model or Assembly Item, please try entering a Model or Assembly Item to Rollup.');
			nlapiSetFieldValue('custpage_itemid', null, false, false);
			return false;
		}
	}
	return true;
}

/**
 * Setup the page orientation, it uses a macro that adds the page number for each page in the footer section.
 * @param bomArray
 * @param {nlobjSubList} list
 * @param level
 * @param unitsTypeArray
 */
function PrintBOMRollupPDF(flatBomArray, itemName, totalCost, date)
{
	var htmlPage = '';
	if(flatBomArray != null && flatBomArray.length > 0)
	{		
		htmlPage =  
			'<head>' +
				'<style>' +
					'body { size:Letter-landscape }' +
				'</style>' +
				'<macrolist>' +
					'<macro id="myfooter">' +
						'<p align="center"> Page <pagenumber/> of <totalpages/></p>' +
					'</macro>' +
				'</macrolist>' +
			'</head>' +
			'<body footer="myfooter" footer-height="0.1in" style="font-family:Verdana, Arial, Sans-serif;font-size:10px;margin-left:.1cm;margin-right:.1cm;">' +
				'<table width="100%">' + 
					'<tr >' +
						'<td colspan="7" align="center" style="font-size:14px;">' +
							'<b>Bill of Material Rollup  -  ' + itemName + '</b>' +
						'</td>' +
						'<td align="right" style="font-size:12px;">' +
							date + 
						'</td>' + 
					'</tr>' +
					'<tr ><td></td></tr>' +
					'<tr >' +
						'<td colspan="8" align="left" style="font-size:12px;">' +
							'<b>Total Cost = ' + nlapiEscapeXML('$') + addCommas(totalCost) + '</b>' +
						'</td>' +
					'</tr>' +
					GetHTMLTableRows(flatBomArray) +
					'<tr >' +
						'<td colspan="8" align="right" style="font-size:12px;">' +
							'<b>Total Cost = ' + nlapiEscapeXML('$') + addCommas(totalCost) + '</b>' +
						'</td>' +
					'</tr>' +
				'</table>' +
			'</body>';
	}
	
	return htmlPage;
}


/**
 * It creates the rows for the assembly and each items with the parts number indented by depending on the level
 * @param bomArray
 * @param {nlobjSubList} list
 * @param level
 * @param unitsTypeArray
 */
function GetHTMLTableRows(flatBomArray)
{
	var tableRows = '<tr style="background-color:#AFEEEE">' +
						'<td width="10%" style="white-space:nowrap;"><b><i>Part #</i></b></td>' + 
						'<td width="35%" style="white-space:nowrap;"><b><i>Description</i></b></td>' + 
						'<td width="15%" style="white-space:nowrap;"><b><i>Preferred<br />Vendor</i></b></td>' +
						'<td width="7%" style="white-space:nowrap;"><b><i>Vendor<br />Part #</i></b></td>' +
						'<td width="10%" style="white-space:nowrap;"><b><i>Purchase<br />UOM</i></b></td>' +
						'<td style="white-space:nowrap;"><b><i>Quantity<br />(Purch UOM)</i></b></td>' +
						'<td style="white-space:nowrap;"><b><i>Cost<br />(Purch UOM)</i></b></td>' +
						'<td style="white-space:nowrap;"><b><i>Extended<br />Cost</i></b></td>' +							
				   '</tr>';
	var row = '';
	for (var i=0; i<flatBomArray.length; i++)  // create each row
	{
		var jsonBOM = flatBomArray[i].bomObject;
		var level = flatBomArray[i].level;
		
		var padding = '';
		for (var j=0; j<level; j++)
		{
			padding += '&nbsp; &nbsp; &nbsp;';
		}
		
		var partNumber = ConvertNSFieldToString(jsonBOM.itemid);
		var desc = ConvertNSFieldToString(jsonBOM.description);
		var prefVendor = ConvertNSFieldToString(jsonBOM.vendorText);
		var vendorPartNum = ConvertNSFieldToString(jsonBOM.vendorPartNumber);
		var purchUnitText = ConvertNSFieldToString(jsonBOM.purchaseUnitText);
		var qty = ConvertNSFieldToFloat(jsonBOM.qty);
		var cost = ConvertNSFieldToFloat(jsonBOM.cost);
		var extCost = qty * cost;
		
		var rowBgColor = '';
		if (i % 2 == 1)
			rowBgColor = '#DCDCDC';
		else
			rowBgColor = '';
		
		var beginBold = '';
		var endBold = '';
		var partNumFontSize = '10';
		var lineInfoFontSize = '9';
		if (level == 0)
		{
			beginBold = '<b>';
			endBold = '</b>';
			partNumFontSize = '11';
			lineInfoFontSize = '11';
		}
		
		row = '<tr style="background-color:' + rowBgColor + '">' +
					'<td style="white-space:nowrap;font-size:' + partNumFontSize + 'px;">' + padding + beginBold + partNumber + endBold + '</td>' + 
					'<td style="font-size:' + lineInfoFontSize + 'px;">' + beginBold + desc + endBold + '</td>' + 
					'<td style="font-size:9px;">' + prefVendor + '</td>' +
					'<td style="font-size:' + lineInfoFontSize + 'px;">' + beginBold + vendorPartNum + endBold + '</td>' +
					'<td style="font-size:' + lineInfoFontSize + 'px;">' + beginBold + purchUnitText + endBold + '</td>' +
					'<td align="right" style="white-space:nowrap;font-size:' + lineInfoFontSize + 'px;">' + beginBold + qty.toFixed(2) + endBold + '</td>' +
					'<td align="right" style="white-space:nowrap;font-size:' + lineInfoFontSize + 'px;">' + beginBold + nlapiEscapeXML('$') + addCommas(cost.toFixed(2)) + endBold + '</td>' +
					'<td align="right" style="white-space:nowrap;font-size:' + lineInfoFontSize + 'px;">' + beginBold + nlapiEscapeXML('$') + addCommas(extCost.toFixed(2)) + endBold + '</td>' +							
				   '</tr>';
		tableRows += row;
	}	
	return tableRows;
}

/**
 * Flatten the BOM array into a single array with an element and a level.
 * 
 * @param bomArray
 */
function FlattenBOMArray(bomArray)
{
	var flatArray = new Array();
		
	FlattenBOMArrayHelper(flatArray, bomArray, 0);	
	
	return flatArray;
}

function FlattenBOMArrayHelper(flatArray, bomArray, level)
{		
	for (var i=0; i<bomArray.length; i++)
	{	
		var index = flatArray.length;
		flatArray[index] = new Object();
		flatArray[index].level = level;
		flatArray[index].bomObject = bomArray[i];
		
		if (bomArray[i].children.length > 0)
		{
			FlattenBOMArrayHelper(flatArray, bomArray[i].children, level+1);
		}
	}	
}


/**
 * 
 * @param bomArray
 * @param {nlobjSubList} list
 * @param level
 * @param unitsTypeArray
 */
function AddBOMsToList(flatBomArray, list)
{
	var index = 1;
	
	for (var i=0; i<flatBomArray.length; i++)
	{
		var bomObject = flatBomArray[i].bomObject;
		var level = flatBomArray[i].level;
		
		var padding = '';
		for (var j=0; j<level; j++)
		{
			padding += '&nbsp; &nbsp; &nbsp;';
		}
		
		// if the level is 0 and we aren't at the very beginning, insert a blank line so segment out the top levels, making it easier to read
		if (i != 0 && level == 0)
		{
			list.setLineItemValue('custpage_componentid', index, '');
			index++;
		}
		
		list.setLineItemValue('custpage_componentid', index, padding + bomObject.itemid);
		list.setLineItemValue('custpage_componentdesc', index, padding + bomObject.description);
		list.setLineItemValue('custpage_vendor', index, padding + bomObject.vendorText);
		list.setLineItemValue('custpage_vendorpartnumber', index, padding + bomObject.vendorPartNumber);
		list.setLineItemValue('custpage_componentqty', index, bomObject.qty);
		list.setLineItemValue('custpage_componentuom', index, bomObject.purchaseUnitText); //GetBaseUOM(bomObject.unitsType, unitsTypeArray));
		list.setLineItemValue('custpage_componentcost', index,bomObject.cost);
		list.setLineItemValue('custpage_componentextcost', index, bomObject.cost * bomObject.qty);
		index++;
	}
}

/**
 * Scheduled script that processes the BOM record.
 */
function ProcessBOMScheduled()
{
	var context = nlapiGetContext();
	context.setPercentComplete(0.00);
	
	// pull the bom rollup id out of the params
	var bomRollupId = context.getSetting('SCRIPT', 'custscriptgd_bomrollupprocessingrecord');
	
	if (bomRollupId != null)
	{
		// first thing to do is set the status of the bom rollup record to processing
		nlapiSubmitField('customrecordrvsbomrollupprocessing', bomRollupId, 'custrecordbomrollupprocessing_status', BOMROLLUPPROCESSINGSTATUS_PROCESSING);
		
		// get the model
		var bomRollupFields = nlapiLookupField('customrecordrvsbomrollupprocessing', bomRollupId, ['custrecordbomrollupprocessing_model', 'custrecordbomrollupprocessing_date'], false);
		var modelId = bomRollupFields.custrecordbomrollupprocessing_model;
		var date = bomRollupFields.custrecordbomrollupprocessing_date;
		
		var isSortedByItemName = GetBOMSuiteletPrintSortOrder();  // Toggle between original code set to true or the new code set to false.
		var searchJoinId = '';
		var memberResults = '';
		var qtyField = '';

		qtyField = 'memberquantity';
		var memberSearchFilters = new Array();
		memberSearchFilters[memberSearchFilters.length] = new nlobjSearchFilter('internalid', null, 'is', modelId, null);
		
		// need to factor in the effective and obsolete dates on the members based on the date on the record {effectivedate}{obsoletedate}
		var memberDateFormulaFilter = new nlobjSearchFilter('formulanumeric', null, 'equalTo', 1, null);
		memberDateFormulaFilter.setFormula("case when ({effectivedate} IS NULL or TO_DATE({effectivedate}) <= TO_DATE('" + date + "','mm/dd/yyyy')) AND  ({obsoletedate} IS NULL or TO_DATE({obsoletedate}) > TO_DATE('" + date + "','mm/dd/yyyy')) then 1 else 0 end");
		memberSearchFilters[memberSearchFilters.length] = memberDateFormulaFilter;
		
		// return only the preferred vendor or return the item if there are no vendors, we will need to work on the case where there are more than one vendor and there is no preferred vendor.
		var memberVendorFormulaFilter = new nlobjSearchFilter('formulanumeric', null, 'equalTo', 1, null);
		memberVendorFormulaFilter.setFormula('case when {memberitem.othervendor} = {memberitem.vendor} or {memberitem.vendor} is null then 1 else 0 end'); 
		memberSearchFilters[memberSearchFilters.length] = memberVendorFormulaFilter;
		
		var memberSearchCols = new Array();
		var sortField = isSortedByItemName == 'T' ? 'memberitem' : 'memberline';  // sort either by component name or line number(order of the component on the component sublist)
		var memberItemField = memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn(sortField);
		memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('displayname', 'memberitem');
		memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('unitstype', 'memberitem');
		memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('purchaseunit', 'memberitem');
		memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('cost', 'memberitem');
		memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn(qtyField);
		memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('type', 'memberitem'); // Assembly, NonInvtPart, InvtPart
		memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('vendor', 'memberitem'); // preferred vendor (if any)
		memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('vendorcode', 'memberitem'); // preferred vendor code (if any)
		memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('vendorcost', 'memberitem');
		memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('memberitem');
		memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('vendorcostentered', 'memberitem');
		
		// we are getting the vendor cost from a formula field because NetSuite is auto-rounding the other vendor cost to 3 decimals when it shouldn't
		var vendorCostFormulaCol = new nlobjSearchColumn('formulanumeric', null, null);
		vendorCostFormulaCol.setFormula('{memberitem.vendorcostentered}');
		memberSearchCols[memberSearchCols.length] = vendorCostFormulaCol;
		
		memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('vendorname', 'memberitem'); // vendor name from the header
		memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('internalid', 'memberitem');
		
		// sort by the member item's name
		memberItemField.setSort(false);
		
		memberResults = nlapiSearchRecord('item', null, memberSearchFilters, memberSearchCols);
		searchJoinId = 'memberitem';
				
		var bomArray = new Array();
		var unitTypeArray = new Array();
		
		BuildBOMTree(bomArray, unitTypeArray, memberResults, date, searchJoinId, qtyField, 1);
		
		var totalCost = GetBOMCosts(bomArray);
		
		// create the final JSON object with the BOM array and the total cost
		var finalJSONObject = new Object();
		finalJSONObject.bomArray = bomArray;
		finalJSONObject.totalCost = totalCost;
		
		nlapiSubmitField('customrecordrvsbomrollupprocessing', bomRollupId, ['custrecordbomrollupprocessing_status', 'custrecordbomrollupprocessing_jsonobject'], [BOMROLLUPPROCESSINGSTATUS_PROCESSINGCOMPLETE, JSON.stringify(finalJSONObject)]);
	}
	else
	{
		throw nlapiCreateError('NO_BOM_ROLLUP_ID', 'There is no BOM Rollup ID set.', false);
	}
}

function BuildBOMTree(bomArray, unitsTypeArray, memberResults, date, searchJoinId, qtyField, rollingQty)
{
	var context = nlapiGetContext();
	if (context.getRemainingUsage() < 100)
	{
		nlapiYieldScript();
	}
	
	// loop through the results and add the results to the BOM array
	// if any of the member items are themselves assemblies then call the results and continue on	
	if (memberResults != null)
	{
		for (var i=0; i<memberResults.length; i++)
		{
			var vendorPartNumber = '';
			var memberResult = memberResults[i];
			var unitTypeId = memberResult.getValue('unitstype', searchJoinId);
			var purchaseUnit = memberResult.getValue('purchaseunit', searchJoinId);
			var purchaseUnitText = memberResult.getText('purchaseunit', searchJoinId);
			var cost = ConvertNSFieldToFloat(memberResult.getValue('cost', searchJoinId));
			var vendorText = ConvertNSFieldToString(memberResult.getText('vendor', searchJoinId));
			var vendorCost = ConvertNSFieldToFloat(memberResult.getValue('formulanumeric')) || 0; //ConvertNSFieldToFloat(memberResult.getValue('vendorcost', 'memberitem'));

			
			// see if there is a preferred vendor
			if (vendorText != '')
			{
				vendorPartNumber = ConvertNSFieldToString(memberResult.getValue('vendorname', searchJoinId));
				
				// if there is a preferred vendor on the member item, then the cost and the name will pull from the vendor sublist on the item
				// but only if there is data at that level
				var vendorCode = ConvertNSFieldToString(memberResult.getValue('vendorcode', searchJoinId));
				
				if (vendorCost != 0)
				{
					cost = vendorCost;
				}
				
				if (vendorCode != '')
				{
					vendorPartNumber = vendorCode;
				}
			}
			else if (vendorText == '' && cost == 0 && vendorCost != 0) // If no preferred vendor and purchase price is zero, 
			{														   // price is zero.
				cost = 0;
				vendorPartNumber = '';
			}
			
			var bomObject = new Object();
			bomObject.internalid = memberResult.getValue(searchJoinId);
			bomObject.itemid = memberResult.getText(searchJoinId);
			bomObject.description = memberResult.getValue('displayname', searchJoinId);
						
			// the quantity needs to be converted to the purchase UOM
			bomObject.qty = ConvertUOMFromBase(unitTypeId, purchaseUnit, ConvertNSFieldToFloat(memberResult.getValue(qtyField)), unitsTypeArray) * rollingQty;
			
			bomObject.cost = cost;
			bomObject.costConvertedToBase = ConvertUOMtoBase(unitTypeId, purchaseUnit, cost, unitsTypeArray);
			
			bomObject.unitsType = unitTypeId;
			bomObject.purchaseUnit = purchaseUnit;
			bomObject.purchaseUnitText = purchaseUnitText;
			bomObject.baseUOM = GetBaseUOM(unitTypeId, unitsTypeArray);
			bomObject.type = memberResult.getValue('type', searchJoinId);
			bomObject.vendorText = vendorText;
			bomObject.vendorPartNumber = vendorPartNumber;
			bomObject.children = new Array();
			
			bomArray[bomArray.length] = bomObject;
			
			// if this is an assembly item, then get any members for it
			// add these members to the children array object
			if (bomObject.type == 'Assembly')
			{	
				var itemInternalId = '';
				var dateFormulaFilter = '';
				var vendorFormulaFilter = '';
				var sortedField = '';
				var vendorFormulaCol = '';
				var searchRecordType = '';
				if (searchJoinId == 'memberitem')
				{
					itemInternalId = 'internalid';
					dateFormulaFilter = "case when ({effectivedate} IS NULL or TO_DATE({effectivedate}) <= TO_DATE('" + date + "','mm/dd/yyyy')) AND  ({obsoletedate} IS NULL or TO_DATE({obsoletedate}) > TO_DATE('" + date + "','mm/dd/yyyy')) then 1 else 0 end";
					vendorFormulaFilter = 'case when {memberitem.othervendor} = {memberitem.vendor} or {memberitem.vendor} is null then 1 else 0 end';
					sortedField = 'memberline';
					qtyField = 'memberquantity';
					vendorFormulaCol = '{memberitem.vendorcostentered}';
					searchRecordType = 'item';
				}
				
				var memberSearchFilters = new Array();
				memberSearchFilters[memberSearchFilters.length] = new nlobjSearchFilter(itemInternalId, null, 'is', bomObject.internalid, null);
				
				// need to factor in the effective and obsolete dates on the members based on the date on the record {effectivedate}{obsoletedate}
				var memberDateFormulaFilter = new nlobjSearchFilter('formulanumeric', null, 'equalTo', 1, null);
				memberDateFormulaFilter.setFormula(dateFormulaFilter);
				memberSearchFilters[memberSearchFilters.length] = memberDateFormulaFilter;
				
				// return only the preferred vendor or return the item if there are no vendors, Nathan and Jef will need to work on the case where there are more than one vendor and there is no preferred vendor.
				var memberFormulaFilter = memberSearchFilters[memberSearchFilters.length] = new nlobjSearchFilter('formulanumeric', null, 'equalTo', 1, null);
				memberFormulaFilter.setFormula(vendorFormulaFilter);
				
				var memberSearchCols = new Array();
				var memberItemField = memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn(sortedField);
				memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn(searchJoinId);
				memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('displayname', searchJoinId);
				memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('unitstype', searchJoinId);
				memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('purchaseunit', searchJoinId);
				memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('cost', searchJoinId);
				memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn(qtyField);
				memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('type', searchJoinId); // Assembly, NonInvtPart, InvtPart
				memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('vendor', searchJoinId); // preferred vendor (if any)
				memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('vendorcode', searchJoinId); // preferred vendor code (if any)
				memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('vendorcost', searchJoinId);
				// we are getting the vendor cost from a formula field because NetSuite is auto-rounding the other vendor cost to 3 decimals when it shouldn't
				var vendorCostFormulaCol = new nlobjSearchColumn('formulanumeric', null, null);
				vendorCostFormulaCol.setFormula(vendorFormulaCol);
				memberSearchCols[memberSearchCols.length] = vendorCostFormulaCol;
				
				memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('vendorname', searchJoinId); // vendor name from the header
				memberSearchCols[memberSearchCols.length] = new nlobjSearchColumn('internalid', searchJoinId);
				
				// sort by the member item's name
				memberItemField.setSort(false);
				
				var memberResultsRecursive = nlapiSearchRecord(searchRecordType, null, memberSearchFilters, memberSearchCols);				
				var memberResultsFinal = new Array();
				if (memberResultsRecursive != null)
				{
					for (var j=0; j<memberResultsRecursive.length; j++)
					{
						memberResultsFinal[memberResultsFinal.length] = memberResultsRecursive[j];
					}
					BuildBOMTree(bomObject.children, unitsTypeArray, memberResultsFinal, date, searchJoinId, qtyField, rollingQty*ConvertNSFieldToFloat(memberResult.getValue(qtyField)));
				}
			}
		}
	}
}

/**
 * Gets the costs of the components.
 * 
 * @param bomArray
 */
function GetBOMCosts(bomArray)
{
	var cost = 0;
	
	for (var i=0; i<bomArray.length; i++)
	{
		if (bomArray[i].type != 'Assembly')
		{
			cost += bomArray[i].cost * bomArray[i].qty;
		}
		else
		{
			bomArray[i].cost = GetBOMCosts(bomArray[i].children) / bomArray[i].qty;
			cost += bomArray[i].cost * bomArray[i].qty;
		}
	}
	
	return cost;
}

/**
 * Converts the existing cost from the UOM to the other UOM.
 * 
 * @param startingUOM
 * @param newUOM
 * @param cost
 */
function ConvertUOMtoBase(unitsTypeId, fromUOMId, cost, unitsTypeArray)
{
	if (unitsTypeId != null && unitsTypeId != '')
	{
		var unitsType = null;	
		if (unitsTypeArray[unitsTypeId] == null)
		{		
			unitsTypeArray[unitsTypeId] = nlapiLoadRecord('unitstype', unitsTypeId, null);
		}
			
		unitsType = unitsTypeArray[unitsTypeId];
		
		// find the from conversion rate
		// and the to conversion rate
		var fromRate = 0;
		var toRate = 0;
		
		var count = unitsType.getLineItemCount('uom');
		
		for (var i=1; i<=count; i++)
		{
			var uomInternalId = unitsType.getLineItemValue('uom', 'internalid', i);
			
			if (uomInternalId == fromUOMId)
				fromRate = ConvertNSFieldToFloat(unitsType.getLineItemValue('uom', 'conversionrate', i));
			
			if (unitsType.getLineItemValue('uom', 'baseunit', i) == 'T')
				toRate = ConvertNSFieldToFloat(unitsType.getLineItemValue('uom', 'conversionrate', i));
		}
		
		var baseCost = cost/fromRate;
		var toCost = baseCost*toRate;
			
		return toCost;
	}
	
	return cost;
}

/**
 * Converts from the base UOM to another UOM.
 * @param unitsTypeId
 * @param toUOMId
 * @param cost
 * @param unitsTypeArray
 * @returns {Number}
 */
function ConvertUOMFromBase(unitsTypeId, toUOMId, cost, unitsTypeArray)
{
	if (unitsTypeId != null && unitsTypeId != '')
	{
		var unitsType = null;
		if (unitsTypeArray[unitsTypeId] == null)
		{		
			unitsTypeArray[unitsTypeId] = nlapiLoadRecord('unitstype', unitsTypeId, null);
		}
			
		unitsType = unitsTypeArray[unitsTypeId];
		
		var toRate = 0;
		
		var count = unitsType.getLineItemCount('uom');
		
		for (var i=1; i<=count; i++)
		{
			var uomInternalId = unitsType.getLineItemValue('uom', 'internalid', i);
			var isBase = unitsType.getLineItemValue('uom', 'baseunit', i);
			
			// we found the UOM but make sure it isn't the base ... if it is, then we shouldn't do the converting because we are already at the base
			if (uomInternalId == toUOMId && isBase != 'T')
			{				
				toRate = ConvertNSFieldToFloat(unitsType.getLineItemValue('uom', 'conversionrate', i));
				return cost/toRate;
			}
		}
			
		return cost;
	}
	
	return cost;
}

function GetBaseUOM(unitsTypeId, unitsTypeArray)
{
	if (unitsTypeId != null && unitsTypeId != '')
	{
		var unitsType = null;	
		if (unitsTypeArray[unitsTypeId] == null)
		{		
			unitsTypeArray[unitsTypeId] = nlapiLoadRecord('unitstype', unitsTypeId, null);
		}
			
		unitsType = unitsTypeArray[unitsTypeId];
		
		var count = unitsType.getLineItemCount('uom');
		
		for (var i=1; i<=count; i++)
		{
			if (unitsType.getLineItemValue('uom', 'baseunit', i) == 'T')
				return unitsType.getLineItemValue('uom', 'abbreviation', i);
		}
	}
	
	return null;
}

function ExportBOMToExcel(flatBomArray, itemName, totalCost, date)
{
	//construct xml equivalent of the file

	var xmlString = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>'; 
	xmlString += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
	xmlString += 'xmlns:o="urn:schemas-microsoft-com:office:office" ';
	xmlString += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
	xmlString += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
	xmlString += 'xmlns:html="http://www.w3.org/TR/REC-html40">'; 

	xmlString += '<Worksheet ss:Name="Sheet1">';	
	var max = 0;		
	for(var i=0; i<flatBomArray.length; i++)
	{
		
		if(i==0)//do this once for the column titles
		{
			xmlString += '<Table>' + 
	        '<Row>' +
				'<Cell><Data ss:Type="String"> PART# </Data></Cell>';
			
			for(var j=0; j<flatBomArray.length; j++)
			{
				var level = flatBomArray[j].level;
				if(level > max)
					max = level;
			}
			for(var q=0; q<max; q++)
			{
				xmlString += '<Cell><Data ss:Type="String"> </Data></Cell>';
			}
			xmlString +=
	            '<Cell><Data ss:Type="String"> DESCRIPTION </Data></Cell>' +
	            '<Cell><Data ss:Type="String"> PREFERRED VENDOR </Data></Cell>' +
	            '<Cell><Data ss:Type="String"> VENDOR PART # </Data></Cell>' +
	            '<Cell><Data ss:Type="String"> PURCHASE UOM </Data></Cell>' +
	            '<Cell><Data ss:Type="String"> QUANTITY (PURCHASE UOM) </Data></Cell>' +
	            '<Cell><Data ss:Type="String"> COST (PURCHASE UOM) </Data></Cell>' +
	            '<Cell><Data ss:Type="String"> EXT. COST </Data></Cell>' +
	       '</Row>';
		}
		var jsonBOM = flatBomArray[i].bomObject;	
		xmlString += 
		'<Row>';
		if(flatBomArray[i].level > 0)
		{
			for(var r=0; r<=max; r++)
			{
				if(r==flatBomArray[i].level)
					xmlString += '<Cell><Data ss:Type="String">' + ConvertNSFieldToString(jsonBOM.itemid) + '</Data></Cell>';
				else
					xmlString += '<Cell><Data ss:Type="String"> </Data></Cell>';	
			}
		}
		else
		{
			xmlString += '<Cell><Data ss:Type="String">' + ConvertNSFieldToString(jsonBOM.itemid) + '</Data></Cell>';
			for(var r=0; r<max; r++)
			{
					xmlString += '<Cell><Data ss:Type="String"> </Data></Cell>';	
			}
		}
		
		xmlString += 
	        '<Cell><Data ss:Type="String">' + ConvertNSFieldToString(jsonBOM.description) + '</Data></Cell>' + 
	        '<Cell><Data ss:Type="String">' + ConvertNSFieldToString(jsonBOM.vendorText) + '</Data></Cell>' + 
	        '<Cell><Data ss:Type="String">' + ConvertNSFieldToString(jsonBOM.vendorPartNumber) + '</Data></Cell>' + 
	        '<Cell><Data ss:Type="String">' + ConvertNSFieldToString(jsonBOM.purchaseUnitText) + '</Data></Cell>' + 
	        '<Cell><Data ss:Type="String">' + (Math.round(ConvertNSFieldToFloat(jsonBOM.qty)*100))/100 + '</Data></Cell>' + 
	        '<Cell><Data ss:Type="String">' + (Math.round(ConvertNSFieldToFloat(jsonBOM.cost)*100))/100 + '</Data></Cell>' + 
	        '<Cell><Data ss:Type="String">' + (Math.round((ConvertNSFieldToFloat(jsonBOM.qty) * ConvertNSFieldToFloat(jsonBOM.cost))*100))/100 + '</Data></Cell>' + 
		'</Row>';
	}

	xmlString += '</Table></Worksheet></Workbook>';
	return xmlString;
}
