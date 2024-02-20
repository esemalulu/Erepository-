/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Jan 2022     MaxF
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function multiBOMRollupSuitelet(request, response){
    if (request.getMethod() == 'GET') {     
        var itemId = request.getParameter('custparam_itemid') || '';
        var bomRollupId = request.getParameter('custparam_bomrollupid');
        if (itemId != '')
            itemId = itemId.split('-') || [];
        else
            itemId = [];
        
        var date = request.getParameter('custparam_date');
        
        var purchasedLastXDays = request.getParameter('custparam_purchasedlastxdays') || 0;
        
        var locationId = request.getParameter('custparam_locationid');
        
        var printBOM = request.getParameter('printBOM');
        var excelBOM = request.getParameter('excelBOM');
        var flatBomArray = null;
        var totalCost = 0;
        var form = null;

        // if the item isn't set and the bom rollup isn't set, then the user needs to select an item
        if (itemId.length == 0 && bomRollupId == null) {        
            form = nlapiCreateForm('Multi Bill of Material Rollup', false);

            var modelField = form.addField('custpage_itemid', 'multiselect', 'Assembly Items', 'assemblyitem', null);
            modelField.setMandatory(true);
            
            var dateField = form.addField('custpage_date', 'date', 'Run as of this date', null, null);
            dateField.setDefaultValue(nlapiDateToString(new Date()));
            dateField.setMandatory(true);
            
            var purchasedLastXDaysField = form.addField('custpage_purchasedlastxdays', 'integer', 'Last Number of Days Purchased', null, null);
            purchasedLastXDaysField.setDefaultValue(0);
            
            var locationField = form.addField('custpage_location', 'multiselect', 'Plant & Line', 'location', null);
            locationField.setMandatory(true);
            
            form.addSubmitButton('Get BOM Rollup');     

        } else if (bomRollupId != null) {
            // load the bom rollup record
            var bomRollupRecord = nlapiLoadRecord('customrecordrvs_multibomrollupprocessing', bomRollupId);
            // get the itemid from the bom rollup record
            itemId = bomRollupRecord.getFieldValues('custrecordmultibomrollupproc_models');
            date = bomRollupRecord.getFieldValue('custrecordmultibomrollupproc_date');
            purchasedLastXDays = bomRollupRecord.getFieldValue('custrecordmultibomrollupproc_purchdays');
            locationId = bomRollupRecord.getFieldValues('custrecordgd_multibomrollupproc_location');
            
            var bomRollupStatus = bomRollupRecord.getFieldValue('custrecordmultibomrollupproc_status');
            
            var procLineCount = bomRollupRecord.getLineItemCount('recmachcustrecordmultibomrollupline_mbomruproc');
            
            var jsonString = '';
            for (i = 1; i <= procLineCount; i++) {
                // Get the data on each line item of the processing record and append to one string.
                jsonString += bomRollupRecord.getLineItemValue('recmachcustrecordmultibomrollupline_mbomruproc', 'custrecordmultibomrollupline_jsonstring', i);
            }
            
            // get the JSON string object from the bom processing record and parse it back to an object
            var JSONObject = new Object();
            if (jsonString != '')
                JSONObject = JSON.parse(jsonString);  // From the string we convert to JSON Array.
            
            var item = '';
            var itemName = 'Multiple';
            if (itemId.length > 1) {
                
            } else {
                item = nlapiLoadRecord('assemblyitem', itemId[0], null);
                
                // get the item name, either from the display name or the itemid field depending
                itemName = ConvertNSFieldToString(item.getFieldValue('itemid'));
                if (itemName == '')
                    itemName = ConvertNSFieldToString(item.getFieldValue('displayname'));
                else if (ConvertNSFieldToString(item.getFieldValue('displayname') != ''))
                    itemName += ' - ' + ConvertNSFieldToString(item.getFieldValue('displayname'));
            }
            
            form = nlapiCreateForm('Bill of Material Rollup - ' + itemName, false);
            
            // add two hidden fields for the model and bom rollup so that we don't lose the data on refresh
            var modelField = form.addField('custpage_itemid', 'multiselect', 'Assembly Items', 'assemblyitem', null);
            modelField.setDisplayType('hidden');
            modelField.setDefaultValue(itemId);
            
            var bomRollupField = form.addField('custparam_bomrollupid', 'select', 'BOM Rollup', 'customrecordrvs_multibomrollupprocessing', null);
            bomRollupField.setDisplayType('hidden');
            bomRollupField.setDefaultValue(bomRollupId);
            
            if (bomRollupStatus == BOMROLLUPPROCESSINGSTATUS_QUEUED) {
                var fieldGroup = form.addFieldGroup('custpage_fieldgroup', '&nbsp;');
                fieldGroup.setSingleColumn(true);
                
                var infoField = form.addField('custpage_info', 'text', '&nbsp;', null, 'custpage_fieldgroup');
                infoField.setDisplayType('inline');
                infoField.setDefaultValue('The BOM rollup is currently in the processing queue. Click the refresh button to refresh the page.');
                
                form.addSubmitButton('Refresh');
            } else if (bomRollupStatus == BOMROLLUPPROCESSINGSTATUS_PROCESSING) {
                var fieldGroup = form.addFieldGroup('custpage_fieldgroup', '&nbsp;');
                fieldGroup.setSingleColumn(true);
                
                var infoField = form.addField('custpage_info', 'text', '&nbsp;', null, 'custpage_fieldgroup');
                infoField.setDisplayType('inline');
                infoField.setDefaultValue('The BOM rollup is currently being processed. Click the refresh button to refresh the page.');
                
                form.addSubmitButton('Refresh');
            } else {
                // Open or Processing Complete

                // Get older processing units that are at least one year old and purge from the system.
                var completedProcessingRecordResults = nlapiSearchRecord(
                        'customrecordrvs_multibomrollupprocessing',
                        null,
                        [
                         ['lastmodified', 'before', 'lastYearToDate']
                        ],
                        [
                         new nlobjSearchColumn('lastmodified').setSort()
                        ]
                ) || [];
                
                // Only process up to 5 since we don't want to use up a lot of the usage points in this suitelet.
                var recordCount = 5; 
                if (completedProcessingRecordResults.length < recordCount)
                    recordCount = completedProcessingRecordResults.length;
                
                for(var i = 0; i < recordCount; i++) {
                    var completedProcRecord = nlapiLoadRecord('customrecordrvs_multibomrollupprocessing', completedProcessingRecordResults[i].id);
                    for (var j = completedProcRecord.getLineItemCount('recmachcustrecordmultibomrollupline_mbomruproc'); j > 0; j--) {
                        completedProcRecord.removeLineItem('recmachcustrecordmultibomrollupline_mbomruproc', j);
                    }
                    nlapiSubmitRecord(completedProcRecord);
                    nlapiDeleteRecord('customrecordrvs_multibomrollupprocessing', completedProcessingRecordResults[i].id);
                }
                
                var dateField = form.addField('custpage_date', 'date', 'Run as of this date', null, null);
                dateField.setDefaultValue(date);
                dateField.setMandatory(true);
                dateField.setDisplayType('inline');
                
                var purchasedLastXDaysField = form.addField('custpage_purchasedlastxdays', 'integer', 'Number of Days Purchased', null, null);
                purchasedLastXDaysField.setDisplayType('inline');
                purchasedLastXDaysField.setDefaultValue(purchasedLastXDays);
                
                var locationField = form.addField('custpage_location', 'multiselect', 'Plant & Line', 'location', null);
                locationField.setDisplayType('inline');
                locationField.setDefaultValue(locationId);

                var checkReset = form.addField('custpage_checkreset', 'checkbox', 'Check Reset', null, null);
                checkReset.setDefaultValue('T');
                checkReset.setDisplayType('hidden');

                var list = '';
                var subtab = '';
                for (var i = 0; i < JSONObject.bomData.length; i++) {
                    var bomArray = JSONObject.bomData[i].bomArray;
                    totalCost = JSONObject.bomData[i].totalCost;
                    
                    list = form.addSubList('custpage_components_' + i, 'list', JSONObject.bomData[i].modelId.text + ' Components', null);
                    
                    var totalCostField = list.addField('custpage_totalcost', 'currency', 'Total Cost', null, null);
                    totalCostField.setDisplayType('inline');

                    
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
                    
                    var purchasedXdaysColField = list.addField('custpage_purchxdayscol', 'text', purchasedLastXDays + ' Days Not Purchased', null);
                    purchasedXdaysColField.setDisplayType('inline');

                    flatBomArray = FlattenBOMArray(bomArray);
                    
                    AddBOMsToList(flatBomArray, list, totalCost, JSONObject.itemIdsPurchased);
                }
                
                form.addSubmitButton('Reset');
                
                //This will return url from /app/site/hosting/....
                var printUrl = nlapiResolveURL('SUITELET', 'customscriptgd_multibomrollup_suitelet', 'customdeploygd_multibomrollup_suitelet') + "&custparam_itemid=" + itemId.toString().replace(/,/g, '_') + '&custparam_bomrollupid=' + bomRollupId + '&printBOM=T';
                var printScript = "document.location ='" + printUrl + "'"; //now redirect to the suitelet url on client side.
                
                var excelUrl = nlapiResolveURL('SUITELET', 'customscriptgd_multibomrollup_suitelet', 'customdeploygd_multibomrollup_suitelet') + "&custparam_itemid=" + itemId.toString().replace(/,/g, '_') + '&custparam_bomrollupid=' + bomRollupId + '&excelBOM=T';
                var excelScript = "document.location ='" + excelUrl + "'"; //now redirect to the suitelet url on client side.
                
                form.addButton('custpage_print', 'Print BOM Rollup', printScript);
                form.addButton('custpage_export', 'Export to Excel', excelScript);
            }
        }
        
        //Printing
        if(flatBomArray != null && (printBOM != null || excelBOM != null) && (printBOM == 'T' || excelBOM == 'T')) {
            // load the bom rollup record
            var bomRollupRecord = nlapiLoadRecord('customrecordrvs_multibomrollupprocessing', bomRollupId);
            
            // get the itemid from the bom rollup record
            itemId = bomRollupRecord.getFieldValues('custrecordmultibomrollupproc_models');
            
            var htmlToPrint = '';
            var itemName = '';
            
            // Generate for each BOM
            for (var i = 0; i < JSONObject.bomData.length; i++) {
                // get the item name, either from the display name or the itemid
                itemName = JSONObject.bomData[i].modelId.text;
                if (itemName != '' && JSONObject.bomData[i].displayName != '')
                    itemName += ' - ' + JSONObject.bomData[i].displayName;
                
                // Generate the PDF XML
                htmlToPrint += PrintBOMRollupPDF(FlattenBOMArray(JSONObject.bomData[i].bomArray), itemName, JSONObject.bomData[i].totalCost.toFixed(2), date, purchasedLastXDays, JSONObject.itemIdsPurchased); 
            }
            if(htmlToPrint != '') {
                if(excelBOM == 'T') {
                    // Generate the Excel XML
                    var excelHTML = ExportBOMToExcel(JSONObject, purchasedLastXDays);
                    var title = 'Multiple BOM Rollup.xls';
                    ExportExcelInSuiteLet(request, response, excelHTML, title);
                } else {
                    //Do printing.
                    var xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdfset>" + htmlToPrint + "</pdfset>";
                    var file = nlapiXMLToPDF(xml);
                    response.setContentType('PDF', 'Print Multiple BOM Rollup.pdf');
                    response.write(file.getValue());
                }
            }   
            else
                response.writePage(form);
        }
        else        
            response.writePage(form);
    } else {
        var itemIds = request.getParameterValues('custpage_itemid') ||[];
        var modelId = new Array();
        for (var i = 0; i < itemIds.length; i++) {
            modelId.push(itemIds[i]);
        }

        var bomRollupId = request.getParameter('custparam_bomrollupid');
        var date = request.getParameter('custpage_date');
        var purchasedLastXDays = request.getParameter('custpage_purchasedlastxdays');
        var locationId = request.getParameter('custpage_location');

        var now = new Date();
        // This returns the number of milliseconds between midnight of January 1, 1970 and current date.
        // We need this to prevent I.E from caching the URL. If the url hasn't changed, IE returns cached value.
        // So we add this time in our url parameter to make sure that the url is never the same and forces IE to request it.
        var time = now.getTime();
        
        var params = new Array();
        params['custparam_itemid'] = modelId;
        params['custparam_bomrollupid'] = bomRollupId;
        params['custparam_date'] = date;
        params['custparam_purchasedlastxdays'] = purchasedLastXDays;
        params['custparam_location'] = locationId;
        params['custparam_uniqueidentifier'] = time;
        
        if (modelId != null && bomRollupId == null) {
            // user selects the model
            var processingRecordId = null;
            var processingRecord = null;
            
            // Always create a new processing record.
            processingRecord = nlapiCreateRecord('customrecordrvs_multibomrollupprocessing');
                    
            // Set the model and the status and save the record         
            processingRecord.setFieldValue('custrecordmultibomrollupproc_models', modelId);
            processingRecord.setFieldValue('custrecordmultibomrollupproc_date', date);
            processingRecord.setFieldValue('custrecordmultibomrollupproc_purchdays', purchasedLastXDays);
            processingRecord.setFieldValue('custrecordgd_multibomrollupproc_location', locationId);
            processingRecord.setFieldValue('custrecordmultibomrollupproc_status', BOMROLLUPPROCESSINGSTATUS_QUEUED);
            processingRecordId = nlapiSubmitRecord(processingRecord, true, false);
            
            params['custparam_bomrollupid'] = processingRecordId;
            
            var mapreduceParams = new Object();
            mapreduceParams['custscriptmultibomrollupprocessingrecord'] = processingRecordId;
            var url = nlapiResolveURL('SUITELET', 'customscriptrvs_runmapredwithsuitelet', 'customdeployrvs_runmapredwithsuitelet', true) //Get the external url. deployment must be available without login.
            nlapiRequestURL(url + '&custparam_scriptid=customscriptrvs_multibomrollupmapred&custparam_scriptdeploymentid=&custparam_parameters=' + JSON.stringify(mapreduceParams));

            nlapiSetRedirectURL('SUITELET', 'customscriptgd_multibomrollup_suitelet', 'customdeploygd_multibomrollup_suitelet', null, params);
        } else {
            // if the status of the bom processing script is open, then the we won't pass anything params through...
            var status = nlapiLookupField('customrecordrvs_multibomrollupprocessing', bomRollupId, 'custrecordmultibomrollupproc_status', false);
            var checkReset = request.getParameter('custpage_checkreset');
            if (checkReset == 'T')
                nlapiSetRedirectURL('SUITELET', 'customscriptgd_multibomrollup_suitelet', 'customdeploygd_multibomrollup_suitelet', null, null);
            else // refresh the suitelet with the params set
                nlapiSetRedirectURL('SUITELET', 'customscriptgd_multibomrollup_suitelet', 'customdeploygd_multibomrollup_suitelet', null, params);
        }
    }
}

/**
 * Setup the page orientation, it uses a macro that adds the page number for each page in the footer section.
 * @param bomArray
 * @param {nlobjSubList} list
 * @param level
 * @param unitsTypeArray
 */
function PrintBOMRollupPDF(flatBomArray, itemName, totalCost, date, purchasedLastXDays, itemIdsPurchased) {
    var htmlPage = '';
    
    htmlPage =  
        '<pdf>' +
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
                    GetHTMLTableRows(flatBomArray, purchasedLastXDays, itemIdsPurchased) +
                    '<tr >' +
                        '<td colspan="8" align="right" style="font-size:12px;">' +
                            '<b>Total Cost = ' + nlapiEscapeXML('$') + addCommas(totalCost) + '</b>' +
                        '</td>' +
                    '</tr>' +
                '</table>' +
            '</body>' +
        '</pdf>';
    
    return htmlPage;
}

/**
 * It creates the rows for the assembly and each items with the parts number indented by depending on the level
 * @param bomArray
 * @param {nlobjSubList} list
 * @param level
 * @param unitsTypeArray
 */
function GetHTMLTableRows(flatBomArray, purchasedLastXDays, itemIdsPurchased) {
    var tableRows = '<tr style="background-color:#AFEEEE">' +
                        '<td width="10%" style="white-space:nowrap;"><b><i>Part #</i></b></td>' + 
                        '<td width="35%" style="white-space:nowrap;"><b><i>Description</i></b></td>' + 
                        '<td width="15%" style="white-space:nowrap;"><b><i>Preferred<br />Vendor</i></b></td>' +
                        '<td width="7%" style="white-space:nowrap;"><b><i>Vendor<br />Part #</i></b></td>' +
                        '<td width="10%" style="white-space:nowrap;"><b><i>Purchase<br />UOM</i></b></td>' +
                        '<td style="white-space:nowrap;"><b><i>Quantity<br />(Purch UOM)</i></b></td>' +
                        '<td style="white-space:nowrap;"><b><i>Cost<br />(Purch UOM)</i></b></td>' +
                        '<td style="white-space:nowrap;"><b><i>Extended<br />Cost</i></b></td>' +
                        '<td style="white-space:nowrap;"><b><i>' + purchasedLastXDays + ' Days Not<br />Purchased</i></b></td>' +
                   '</tr>';
    var row = '';
    for (var i=0; i<flatBomArray.length; i++) {
        // create each row
        var jsonBOM = flatBomArray[i].bomObject;
        var level = flatBomArray[i].level;
        
        var padding = '';
        for (var j=0; j<level; j++) {
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
        if (level == 0) {
            beginBold = '<b>';
            endBold = '</b>';
            partNumFontSize = '11';
            lineInfoFontSize = '11';
        }
        
        var daysNotPurchased = '';
        //Filter the rusult with the item ID, if something matches, this was purchased within the date range so mark it on the list.
        var itemPurchasedFilterResult = itemIdsPurchased.filter(function(data) {return data == jsonBOM.internalid}) || [];
        if (itemPurchasedFilterResult.length == 0)
            daysNotPurchased = '*';
        
        row = '<tr style="background-color:' + rowBgColor + '">' +
                    '<td style="white-space:nowrap;font-size:' + partNumFontSize + 'px;">' + padding + beginBold + partNumber + endBold + '</td>' + 
                    '<td style="font-size:' + lineInfoFontSize + 'px;">' + beginBold + desc + endBold + '</td>' + 
                    '<td style="font-size:9px;">' + prefVendor + '</td>' +
                    '<td style="font-size:' + lineInfoFontSize + 'px;">' + beginBold + vendorPartNum + endBold + '</td>' +
                    '<td style="font-size:' + lineInfoFontSize + 'px;">' + beginBold + purchUnitText + endBold + '</td>' +
                    '<td align="right" style="white-space:nowrap;font-size:' + lineInfoFontSize + 'px;">' + beginBold + qty.toFixed(2) + endBold + '</td>' +
                    '<td align="right" style="white-space:nowrap;font-size:' + lineInfoFontSize + 'px;">' + beginBold + nlapiEscapeXML('$') + addCommas(cost.toFixed(2)) + endBold + '</td>' +
                    '<td align="right" style="white-space:nowrap;font-size:' + lineInfoFontSize + 'px;">' + beginBold + nlapiEscapeXML('$') + addCommas(extCost.toFixed(2)) + endBold + '</td>' +   
                    '<td align="right" style="white-space:nowrap;font-size:' + lineInfoFontSize + 'px;">' + daysNotPurchased + '</td>' +
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
function FlattenBOMArray(bomArray) {
    var flatArray = new Array();
        
    FlattenBOMArrayHelper(flatArray, bomArray, 0);  
    
    return flatArray;
}

function FlattenBOMArrayHelper(flatArray, bomArray, level) {        
    for (var i=0; i<bomArray.length; i++) { 
        var index = flatArray.length;
        flatArray[index] = new Object();
        flatArray[index].level = level;
        flatArray[index].bomObject = bomArray[i];
        
        if (bomArray[i].children.length > 0)
            FlattenBOMArrayHelper(flatArray, bomArray[i].children, level+1);
    }   
}


/**
 * 
 * @param bomArray
 * @param {nlobjSubList} list
 * @param level
 * @param unitsTypeArray
 */
function AddBOMsToList(flatBomArray, list, totalCost, itemPurchased) {
    var index = 1;
    var itemPurchasedFilterResult = [];
    for (var i=0; i<flatBomArray.length; i++) {
        var bomObject = flatBomArray[i].bomObject;
        var level = flatBomArray[i].level;
        
        var padding = '';
        for (var j=0; j<level; j++)
            padding += '&nbsp; &nbsp; &nbsp;';
        
        // if the level is 0 and we aren't at the very beginning, insert a blank line so segment out the top levels, making it easier to read
        if (i != 0 && level == 0) {
            list.setLineItemValue('custpage_componentid', index, '');
            index++;
        }
        if (i == 0)
            list.setLineItemValue('custpage_totalcost', index, totalCost);
        else
            list.setLineItemValue('custpage_totalcost', index, null);
        
        list.setLineItemValue('custpage_componentid', index, padding + bomObject.itemid);
        list.setLineItemValue('custpage_componentdesc', index, padding + bomObject.description);
        list.setLineItemValue('custpage_vendor', index, padding + bomObject.vendorText);
        list.setLineItemValue('custpage_vendorpartnumber', index, padding + bomObject.vendorPartNumber);
        list.setLineItemValue('custpage_componentqty', index, bomObject.qty);
        list.setLineItemValue('custpage_componentuom', index, bomObject.purchaseUnitText);
        list.setLineItemValue('custpage_componentcost', index,bomObject.cost);
        list.setLineItemValue('custpage_componentextcost', index, bomObject.cost * bomObject.qty);

        //Filter the rusult with the item ID, if something matches, this was purchased within the date range so mark it on the list.
        itemPurchasedFilterResult = itemPurchased.filter(function(data) {return data == bomObject.internalid}) || [];
        if (itemPurchasedFilterResult.length == 0)
            list.setLineItemValue('custpage_purchxdayscol', index, '*');
            
        index++;
    }
}

/*
 * Generate the Excel XML
 */
function ExportBOMToExcel(JSONObject, purchasedLastXDays) {
    //construct xml equivalent of the file
    var xmlString = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>'; 
    xmlString += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
    xmlString += 'xmlns:o="urn:schemas-microsoft-com:office:office" ';
    xmlString += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
    xmlString += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
    xmlString += 'xmlns:html="http://www.w3.org/TR/REC-html40">'; 

    // Generate for each BOM
    var flatBomArray = new Array();
    for (var k = 0; k < JSONObject.bomData.length; k++) {
        flatBomArray = FlattenBOMArray(JSONObject.bomData[k].bomArray);
        xmlString += '<Worksheet ss:Name="' + JSONObject.bomData[k].modelId.text + '">';
        
        var max = 0;
        for(var i=0; i<flatBomArray.length; i++) {
            if(i==0) {
                xmlString += '<Table>' + 
                '<Row>' +
                    '<Cell><Data ss:Type="String"> PART# </Data></Cell>';
                
                for(var j=0; j<flatBomArray.length; j++) {
                    var level = flatBomArray[j].level;
                    if(level > max)
                        max = level;
                }
                for(var q=0; q<max; q++) {
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
                    '<Cell><Data ss:Type="String"> ' + purchasedLastXDays + ' DAYS NOT PURCHASED </Data></Cell>' +
               '</Row>';
            }
            var jsonBOM = flatBomArray[i].bomObject;    
            xmlString += '<Row>';
            
            if(flatBomArray[i].level > 0) {
                for(var r=0; r<=max; r++) {
                    if(r==flatBomArray[i].level)
                        xmlString += '<Cell><Data ss:Type="String">' + ConvertNSFieldToString(jsonBOM.itemid) + '</Data></Cell>';
                    else
                        xmlString += '<Cell><Data ss:Type="String"> </Data></Cell>';    
                }
            } else {
                xmlString += '<Cell><Data ss:Type="String">' + ConvertNSFieldToString(jsonBOM.itemid) + '</Data></Cell>';
                for(var r=0; r<max; r++) {
                        xmlString += '<Cell><Data ss:Type="String"> </Data></Cell>';    
                }
            }
            
            var daysNotPurchased = '';
            //Filter the rusult with the item ID, if something matches, this was purchased within the date range so mark it on the list.
            var itemPurchasedFilterResult = JSONObject.itemIdsPurchased.filter(function(data) {return data == jsonBOM.internalid}) || [];
            if (itemPurchasedFilterResult.length == 0)
                daysNotPurchased = '*';
            
            xmlString += 
                '<Cell><Data ss:Type="String">' + ConvertNSFieldToString(jsonBOM.description) + '</Data></Cell>' + 
                '<Cell><Data ss:Type="String">' + ConvertNSFieldToString(jsonBOM.vendorText) + '</Data></Cell>' + 
                '<Cell><Data ss:Type="String">' + ConvertNSFieldToString(jsonBOM.vendorPartNumber) + '</Data></Cell>' + 
                '<Cell><Data ss:Type="String">' + ConvertNSFieldToString(jsonBOM.purchaseUnitText) + '</Data></Cell>' + 
                '<Cell><Data ss:Type="String">' + (Math.round(ConvertNSFieldToFloat(jsonBOM.qty)*100))/100 + '</Data></Cell>' + 
                '<Cell><Data ss:Type="String">' + (Math.round(ConvertNSFieldToFloat(jsonBOM.cost)*100))/100 + '</Data></Cell>' + 
                '<Cell><Data ss:Type="String">' + (Math.round((ConvertNSFieldToFloat(jsonBOM.qty) * ConvertNSFieldToFloat(jsonBOM.cost))*100))/100 + '</Data></Cell>' + 
                '<Cell><Data ss:Type="String">' + daysNotPurchased + '</Data></Cell>' +
            '</Row>';
        }
        
        if (flatBomArray.length == 0) {
            if(i==0) {
                xmlString += '<Table>' + 
                '<Row>' +
                    '<Cell><Data ss:Type="String"> PART# </Data></Cell>';

                xmlString +=
                    '<Cell><Data ss:Type="String"> DESCRIPTION </Data></Cell>' +
                    '<Cell><Data ss:Type="String"> PREFERRED VENDOR </Data></Cell>' +
                    '<Cell><Data ss:Type="String"> VENDOR PART # </Data></Cell>' +
                    '<Cell><Data ss:Type="String"> PURCHASE UOM </Data></Cell>' +
                    '<Cell><Data ss:Type="String"> QUANTITY (PURCHASE UOM) </Data></Cell>' +
                    '<Cell><Data ss:Type="String"> COST (PURCHASE UOM) </Data></Cell>' +
                    '<Cell><Data ss:Type="String"> EXT. COST </Data></Cell>' +
                    '<Cell><Data ss:Type="String"> ' + purchasedLastXDays + ' DAYS NOT PURCHASED </Data></Cell>' +
               '</Row>';
            }
        }
        
        xmlString += '</Table></Worksheet>';
    }
    
    xmlString += '</Workbook>';
    return xmlString;
}