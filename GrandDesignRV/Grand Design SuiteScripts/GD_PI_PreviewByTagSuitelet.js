/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       26 Jun 2014     ibrahima
 *
 */

/******************************************************************************************************
 *                                  BEGIN CONSTANTS
 ******************************************************************************************************/

// Sublist field IDs
var SUBLIST_FIELD_ITEM = 'custpage_item';
var SUBLIST_FIELD_ITEMDESC = 'custpage_itemdesc';
var SUBLIST_FIELD_QTY = 'custpage_qty';
var SUBLIST_FIELD_TAGNUM = 'custpage_tagnum';
var SUBLIST_FIELD_TAGNUMCLEAN = 'custpage_tagnumclean';
var SUBLIST_FIELD_UOM = 'custpage_uom';
var SUBLIST_FIELD_COST = 'custpage_cost';
var SUBLIST_FIELD_ISDUPLICATE = 'custpage_isduplicate';
var SUBLIST_FIELD_COMMENTS = 'custpage_comments';
var SUBLIST_FIELD_VENDORPARTNUM = 'custpage_vendpartnum';
var SUBLIST_FIELD_EXTCOST = 'custpage_extcost';
var SUBLIST_FIELD_LASTINVANDPURCH = 'custpage_lastinvpurch';
var SUBLIST_FIELD_PURCHLASTTHREE = 'custpage_purchlast3';
var SUBLIST_FIELD_PLANT = 'custpage_plant';
var SUBLIST_FIELD_PLANTDEPARTMENT = 'custpage_plantdept';

// Processing Record status IDs
var TAGPREV_PROCESSINGSTATUS_OPEN = 1;
var TAGPREV_PROCESSINGSTATUS_QUEUED = 2;
var TAGPREV_PROCESSINGSTATUS_PROCESSING = 3;
var TAGPREV_PROCESSINGSTATUS_COMPLETE = 4;

var PROCLINE_SUBLIST = 'recmachcustrecordgd_pitagprevproclin_procrecord';

var LONG_TEXT_MAX_SIZE = 1000000;

/******************************************************************************************************
 *                                  END CONSTANTS
 ******************************************************************************************************/

/******************************************************************************************************
 *                                  BEGIN GLOBAL VARIABLES
 ******************************************************************************************************/

var lineIndex = 1;

/******************************************************************************************************
 *                                  END GLOBAL VARIABLES
 ******************************************************************************************************/

/**
* Workflow action to redirect to Preview by tag Suitelet.
*/
function GD_PI_NavToTagIssuesWorkflowAction() {
    var params = new Array();
    params["custparam_physicalInvId"] = nlapiGetRecordId();
    
    nlapiSetRedirectURL('SUITELET', 'customscriptgd_pipreviewbytagsuitelet', 'customdeploygd_pipreviewbytagsuitelet', false, params);
}

/**
 * Highlights the Tags declared on the main PIT record but is not used in the tag records.
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function GD_PI_PrevByTagSuitelet(request, response) {
    // Method that generate and show the Tag preview for inventory items by location within the suitelet script.
    var physicalInvId = ConvertValueToString(request.getParameter('custparam_physicalInvId')) || '';
    var locationId = ConvertValueToString(request.getParameter('custparam_locationId')) || '';
    
    var processingRecordId = ConvertValueToString(request.getParameter('custparam_procrecordid')) || '';
    var processingRecord = null;
    var physicalInvDateStr = '';
    
    var mapReduceMode = request.getParameter('custparam_massupdatemode') == 'T' ? true : false;
    
    if (processingRecordId != '') {
        if (nlapiLookupField('customrecordgd_physicalinvtagpreviewproc', processingRecordId, 'custrecordgd_pitagprev_status') == TAGPREV_PROCESSINGSTATUS_COMPLETE)
            mapReduceMode = false;
    }
    
    var exportToExcel = request.getParameter('custparam_exporttoexcel') == 'T' ? true : false;
    
    if (request.getMethod() == 'GET') {
        // Check if user is trying to generate the excel file from the data.
        if (exportToExcel) {
            var xmlExcelString = GenerateExcelData(processingRecordId);
            // Set the processing record back to open
            var title = 'Physical Inventory Preview - ' + request.getParameter('custparam_datestring') + '.xls';
            var xlsFile = nlapiCreateFile(title, 'EXCEL', nlapiEncrypt(xmlExcelString, 'base64'));
            
            response.setContentType('EXCEL', title);
            response.write(xlsFile.getValue());
        } else {
            // Create the form
            var form = nlapiCreateForm('Physical Inventory Preview By Tag', false);
            form.setScript('customscriptgd_pi_previewtagsuiteclient');
            var tagObjects = new Object();
            var physicalInvRec = '';
            
            // check if the main record it is present, if so, load the record and get the date string.
            if (physicalInvId != '') {
                physicalInvRec = nlapiLoadRecord('customrecordgd_physicalinventorycount', physicalInvId, {recordmode: 'dynamic'}) || '';
                physicalInvDateStr = ConvertValueToString(physicalInvRec.getFieldValue('custrecordgd_physinvtcount_date'));
            }
            // initialize the different group arrays of tags.
            var erroredTagsArray = new Array();
            var badCountTagsArray = new Array();
            var missingTagArray = new Array();
            var missingTagArrayConcat = new Array();
            var filterSelection = request.getParameter('custpage_filterselectionmode'); // send user to location filter mode or not depending on value
            var filterMode = form.addField('custpage_filterselectionmode', 'text', 'Filter Mode', null, null);
            filterMode.setDisplayType('hidden');
            
            // initialize the page when users have not starting processing the tags.
            if (physicalInvId == '') {
                form.addFieldGroup('custpage_suiteletfieldgroup', 'Enter Plant and Physical Inventory Count Date.').setSingleColumn(true);
            } else {
                // Either we use map reduce for all tag sequence location or the user only wants to process a single plant location in that case, we don't need to let users see the "processing..." message
                if (!mapReduceMode)
                    form.addFieldGroup('custpage_suiteletfieldgroup', 'Inventory Count').setSingleColumn(true);
                else
                    form.addFieldGroup('custpage_suiteletfieldgroup', 'Processing...').setSingleColumn(true);
                
                form.addFieldGroup('custpage_suitelettagsummaryfieldgroup', 'Summary');
            }
            // Adding fields to the form.
            var locFilter = form.addField('custpage_physicalinvlocationfilter', 'select', 'Plant', 'Location', 'custpage_suiteletfieldgroup');
            locFilter.setDisplayType('inline');
    
            var processingRecordIdField = form.addField('custpage_procrecordid', 'text', 'Processing Record ID');
            processingRecordIdField.setDisplayType('hidden');
            processingRecordIdField.setDefaultValue(processingRecordId);
            
            var pitIdField = form.addField('custpage_physicalinv', 'select', 'Physical Inventory Count Date', 'customrecordgd_physicalinventorycount', 'custpage_suiteletfieldgroup');
            pitIdField.setDisplayType('inline');
            var dateField = form.addField('custpage_physicalinvinveditfield', 'select', 'Physical Inventory Count Date', null, 'custpage_suiteletfieldgroup');
            dateField.setDisplayType('hidden');
            dateField.setMandatory(true);
            // Start the main tag table and add the different tag tables later.
            var mainTagsTable = '';
            nlapiLogExecution('debug', 'Main Tag Table', 'Start');
            //#region Main Tag Table
            mainTagsTable =
                '<div id="custpage_tabinvtag_wrapper" class="nltabcontent" style="z-index:2; display: block; width:100%;;position:relative;">' +
                '<div id="custpage_tabinvtag_div" style="width:100%;display:;">' +
                '<div class="nltabcontent" style="display: block;">' +
                    '<form method="post" name="custpage_tabinvtag_form" id="custpage_tabinvtag_form" onkeypress="if (getEventKeypress(event) == 13) { setEventCancelBubble(event);NLDoMainFormButtonAction("submitter",true); return false;} return true;" style="margin: 0; font-size: 0px; ">' +
                        '<table border="0" cellspacing="0" cellpadding="0" width="100%"></table>' +
                    '</form>' +
                    '<table class="uir-table-block" cellpadding="0" cellspacing="0" border="0" width="100%">' +
                        '<tbody style="overflow-x: auto; overflow-y:hidden; overflow: auto;">' +
                            '<tr>' +
                                '<td></td>' +
                            '</tr>' +
                            '<tr>' +
                                '<td>' +
                                    '<div class="subtabblock" style="position:relative; ">' +
                                        '<div class="totallingTopLeft" style="font-size:0px;z-index:1;"></div>' +
                                        '<div class="totallingTopRight" style="font-size:0px;z-index:1;"></div>' +
                                        '<div class="totallingBottomLeft" style="font-size:0px;z-index:1;"></div>' +
                                        '<div class="totallingBottomRight" style="font-size:0px;z-index:1;"></div>' +
                                        '<div class="subtabcornerul" style="position:absolute; left:4px; top:4px;z-index:10;"></div>' +
                                        '<div class="subtabcornerur" style="position:absolute; right:4px; top:4px;z-index:10;"></div>' +
                                        '<div class="subtabcornerll" style="position:absolute; left:4px; bottom:4px;z-index:10;"></div>' +
                                        '<div class="subtabcornerlr" style="position:absolute; right:4px; bottom:4px;z-index:10;"></div>' +
                                        '<div id="custpage_sublistinvtagitems_layer" style="">' +
                                            '<div class="subtabblock" style="padding: 4px;">' +
                                                '<div class="listcornerul" style="font-size:0px; position:absolute; left:4px;z-index:30;"></div>' +
                                                '<div class="listcornerur" style="font-size:0px; position:absolute; right:4px;z-index:30;"></div>' +
                                                '<div class="listcornerll" style="font-size:0px; position:absolute; left:4px; bottom:4px;z-index:30;"></div>' +
                                                '<div class="listcornerlr" style="font-size:0px; position:absolute; right:4px; bottom:4px;z-index:30;"></div>' +
                                                '<form action="javascript:void(0)" id="custpage_sublistinvtagitems_form" name="custpage_sublistinvtagitems_form" style="margin: 0">' +
                                                    '<div class="uir-machine-table-container" id="custpage_sublistinvtagitems_div">' +
                                                        '<table id="custpage_sublistinvtagitems_splits" width="100%" border="0" cellspacing="0" cellpadding="0" class="listtable listborder uir-list-table" style="position: relative;">' +
                                                        '<tbody>' +
                                                        '<tr class="uir-machine-headerrow" id="custpage_sublistinvtagitemsheader">' +
                                                            '<td height="100%" style="cursor:hand;" class="listheadertdleft listheadertextb uir-column-large" data-label="Tag #" onclick="l_sort(0,"TEXTAREA",false,null,"custpage_sublistinvtagitems","custpage_tagnum",null,0); setWindowChanged(window, true); return false;">' +
                                                                '<div class="listheader">Tag #&nbsp;' +
                                                                '</div>' +
                                                            '</td>' +
                                                            '<td height="100%" style="cursor:hand;" class="listheadertd listheadertextb uir-column-large" data-label="Item" onclick="l_sort(1,"TEXT",false,null,"custpage_sublistinvtagitems","custpage_item",null,1); setWindowChanged(window, true); return false;">' +
                                                                '<div class="listheader">Item&nbsp;' +
                                                                '</div>' +
                                                            '</td>' +
                                                            '<td height="100%" style="cursor:hand;" class="listheadertd listheadertextb uir-column-large" data-label="Description" onclick="l_sort(2,"TEXTAREA",false,null,"custpage_sublistinvtagitems","custpage_itemdesc",null,2); setWindowChanged(window, true); return false;">' +
                                                                '<div class="listheader">Description&nbsp;' +
                                                                '</div>' +
                                                            '</td>' +
                                                            '<td height="100%" style="cursor:hand;" class="listheadertd listheadertextb uir-column-large" data-label="Comments" onclick="l_sort(3,"TEXTAREA",false,null,"custpage_sublistinvtagitems","custpage_comments",null,3); setWindowChanged(window, true); return false;">' +
                                                                '<div class="listheader">Comments&nbsp;' +
                                                                '</div>' +
                                                            '</td>' +
                                                            '<td height="100%" style="cursor:hand;" class="listheadertd listheadertextbrt uir-column-medium" data-label="Qty" onclick="l_sort(4,"FLOAT",false,null,"custpage_sublistinvtagitems","custpage_qty",null,4); setWindowChanged(window, true); return false;">' +
                                                                '<div class="listheader">Qty&nbsp;' +
                                                                '</div>' +
                                                            '</td>' +
                                                            '<td height="100%" style="cursor:hand;" class="listheadertd listheadertextb uir-column-large" data-label="UOM" onclick="l_sort(5,"TEXT",false,null,"custpage_sublistinvtagitems","custpage_uom",null,5); setWindowChanged(window, true); return false;">' +
                                                                '<div class="listheader">UOM&nbsp;' +
                                                                '</div>' +
                                                            '</td>' +
                                                            '<td height="100%" style="cursor:hand;" class="listheadertd listheadertextb uir-column-large" data-label="Vendor Part #" onclick="l_sort(6,"TEXT",false,null,"custpage_sublistinvtagitems","custpage_vendpartnum",null,6); setWindowChanged(window, true); return false;">' +
                                                                '<div class="listheader">Vendor Part #&nbsp;' +
                                                                '</div>' +
                                                            '</td>' +
                                                            '<td height="100%" style="cursor:hand;" class="listheadertd listheadertextbrt uir-column-medium" data-label="Cost" onclick="l_sort(7,"FLOAT",false,null,"custpage_sublistinvtagitems","custpage_cost",null,7); setWindowChanged(window, true); return false;">' +
                                                                '<div class="listheader">Cost&nbsp;' +
                                                                '</div>' +
                                                            '</td>' +
                                                            '<td height="100%" style="cursor:hand;" class="listheadertd listheadertextbrt uir-column-medium" data-label="Extended Cost" onclick="l_sort(8,"FLOAT",false,null,"custpage_sublistinvtagitems","custpage_extcost",null,8); setWindowChanged(window, true); return false;">' +
                                                                '<div class="listheader">Ext. Cost&nbsp;' +
                                                                '</div>' +
                                                            '</td>' +
                                                            '<td height="100%" style="cursor:hand;" class="listheadertd listheadertextbrt uir-column-medium" data-label="Last Inv And Purch" onclick="l_sort(9,"FLOAT",false,null,"custpage_sublistinvtagitems","custpage_lastinvpurch",null,9); setWindowChanged(window, true); return false;">' +
                                                                '<div class="listheader">Last Inv & Purch&nbsp;' +
                                                                '</div>' +
                                                            '</td>' +
                                                            '<td height="100%" style="cursor:hand;" class="listheadertd listheadertextbrt uir-column-medium" data-label="Purch Last 3" onclick="l_sort(10,"FLOAT",false,null,"custpage_sublistinvtagitems","custpage_purchlast3",null,10); setWindowChanged(window, true); return false;">' +
                                                                '<div class="listheader">Purch Last 3&nbsp;' +
                                                                '</div>' +
                                                            '</td>' +
                                                            '<td height="100%" style="cursor:hand;" class="listheadertd listheadertextb uir-column-large" data-label="Plant" onclick="l_sort(11,"TEXT",false,null,"custpage_sublistinvtagitems","custpage_plant",null,11); setWindowChanged(window, true); return false;">' +
                                                                '<div class="listheader">Plant&nbsp;' +
                                                                '</div>' +
                                                            '</td>' +
                                                            '<td height="100%" style="cursor:hand;" class="listheadertd listheadertextb uir-column-large" data-label="Plant Department" onclick="l_sort(12,"TEXT",false,null,"custpage_sublistinvtagitems","custpage_plantdept",null,12); setWindowChanged(window, true); return false;">' +
                                                                '<div class="listheader">Plant Department&nbsp;' +
                                                                '</div>' +
                                                            '</td>' +
                                                            '<td height="100%" style="" class="listheadertd listheadertextbctr uir-column-small" width="5%" data-label="Is Duplicate">' +
                                                                '<div class="listheader">Is Duplicate</div>' +
                                                            '</td>' +
                                                        '</tr>';
            //#endregion Main Tag Table
            var tagsLineDataArray = new Array();
            // handle the different filters set by the user.
            if (filterSelection != 'F') {
                pitIdField.setDefaultValue(physicalInvId);
                locFilter.setDefaultValue(locationId);
                locFilter.setDisplayType('normal');
                filterMode.setDefaultValue('F');
                
                if (physicalInvId == '') {
                    pitIdField.setDisplayType('hidden');
                    dateField.setDisplayType('normal');
                    pitIdField.setMandatory(true);
                    
                    var picListDataField = form.addField('custpage_physicalinvenotryobjecttext', 'longtext', 'PIC Data Field', null, null);
                    picListDataField.setDisplayType('hidden');
                    
                    var physicalInventoryCountResults = nlapiSearchRecord(
                            'customrecordgd_physicalinventorycount',
                            null,
                            [
                             ['isinactive', 'is', 'F'],
                            ],
                            [
                             new nlobjSearchColumn('internalid').setSort(true),
                             new nlobjSearchColumn('name')
                            ]
                    ) || [];
                    
                    var physicalInventoryCountArray = new Array();
                    var listObject = new Object();
                    if (physicalInventoryCountResults.length > 0) {
                        for (var i = 0; i < physicalInventoryCountResults.length; i++) {
                            listObject.name = physicalInventoryCountResults[i].getValue('name');
                            listObject.internalid = physicalInventoryCountResults[i].getId();
                            listObject.select = physicalInvId != '' ? true : false;
                            
                            physicalInventoryCountArray.push(listObject);
                            listObject = new Object();
                        }
                        
                        picListDataField.setDefaultValue(JSON.stringify(physicalInventoryCountArray));
                    }
                }
                form.addSubmitButton('Get Preview'); // rerun the suitelet by going to post and redirecting to this suitelet.
            } else if(physicalInvRec != '') {
                var tagNumRangeArray = new Array();
                var startTagNum = 0;
                var endTagNum = 0;
                
                pitIdField.setDefaultValue(physicalInvId);
                filterMode.setDefaultValue(filterSelection);
                locFilter.setDefaultValue(locationId);
                
                // We check
                var locationTagSequenceLineCount = physicalInvRec.getLineItemCount('recmachcustrecordgd_physinvtloctag_parent');
                var lineLocationFieldId = '';
                var index = 0;
    
                // Process only one location, this does not need a map-reduce.
                if (locationId != '') {
                    var tagNumRangeObject = new Object();
                    for (var i = 1; i <= locationTagSequenceLineCount; i++) {
                        physicalInvRec.selectLineItem('recmachcustrecordgd_physinvtloctag_parent', i);
                        lineLocationFieldId = physicalInvRec.getCurrentLineItemValue('recmachcustrecordgd_physinvtloctag_parent', 'custrecordgd_physinvtloctag_plant');
                        if (lineLocationFieldId == locationId) {
                            tagNumRangeObject.startTagNum = physicalInvRec.getCurrentLineItemValue('recmachcustrecordgd_physinvtloctag_parent', 'custrecordgd_physinvtloctag_starttag');
                            tagNumRangeObject.endTagNum = physicalInvRec.getCurrentLineItemValue('recmachcustrecordgd_physinvtloctag_parent', 'custrecordgd_physinvtloctag_endtag');
                            tagNumRangeArray.push(tagNumRangeObject);
                            tagNumRangeObject = {};
                        }
                    }
                    
                    tagObjects = BuildPhysicalInventoryTagItemSublistAndReturnMissingTags(form, physicalInvDateStr, startTagNum, endTagNum, locationId, tagNumRangeArray);
                    nlapiLogExecution('debug', 'tagObjects', 'Here');
                    var processingRecordId = GetProcessingRecord();
                    
                    processingRecord = nlapiLoadRecord('customrecordgd_physicalinvtagpreviewproc', processingRecordId);
                    
                    var tagLineDataStr = JSON.stringify(tagObjects);
                    nlapiLogExecution('debug', 'tagLineDataStr', tagLineDataStr);
                    // Get the string and divide into separate sections of 1M characters each and set it into an array.
                    var tagLineDataStrArray = new Array();

                    // This line creates an array of strings with each array element at most 1M characters in size as this is the long text max.
                    var count = LONG_TEXT_MAX_SIZE;
                    var startIndex = 0;
                    var endIndex = LONG_TEXT_MAX_SIZE;
                    var resultsStr = '';
                    while (count == LONG_TEXT_MAX_SIZE) {
                        resultsStr = tagLineDataStr.substring(startIndex, endIndex);
                        tagLineDataStrArray.push(resultsStr);
                        startIndex = endIndex;
                        endIndex += LONG_TEXT_MAX_SIZE;
                        count = resultsStr.length;
                    }
                    
                    // Remove all the lines on the processing record.
                    for (var i = processingRecord.getLineItemCount(PROCLINE_SUBLIST); i > 0; i--) {
                        processingRecord.removeLineItem(PROCLINE_SUBLIST, i);
                    }
                    
                    // Set the strings in each processing line.
                    for (var i = 0; i < tagLineDataStrArray.length; i++) {
                        processingRecord.selectNewLineItem(PROCLINE_SUBLIST);
                        processingRecord.setCurrentLineItemValue(PROCLINE_SUBLIST, 'custrecordgd_pitagprevproclin_jsonstring', tagLineDataStrArray[i]);
                        processingRecord.commitLineItem(PROCLINE_SUBLIST);
                    }
                    
                    // set the percent complete and the status.
                    processingRecord.setFieldValue('custrecordgd_pitagprev_percentcomplete', 100);
                    processingRecord.setFieldValue('custrecordgd_pitagprev_status', TAGPREV_PROCESSINGSTATUS_COMPLETE);
                    processingRecordId = nlapiSubmitRecord(processingRecord, true, false);
                    
                    // Get 5 or less processing records that have the status set to complete and set them to open.
                    var completedProcessingRecordResults = nlapiSearchRecord(
                            'customrecordgd_physicalinvtagpreviewproc',
                            null,
                            [['custrecordgd_pitagprev_status', 'noneof', TAGPREV_PROCESSINGSTATUS_OPEN], 'AND',
                             ['lastmodified', 'before', 'today'], 'AND',
                             ['isinactive', 'is', 'F']
                            ],
                            [
                             new nlobjSearchColumn('lastmodified').setSort()
                            ]
                    ) || [];
                    
                    // Only process up to 5 since we don't want to use up all of the usage points in this suitelet.
                    var recordCount = 5; 
                    if (completedProcessingRecordResults.length < 5)
                        recordCount = completedProcessingRecordResults.length;
                    
                    for(var i = 0; i < recordCount; i++) {
                        nlapiSubmitField('customrecordgd_physicalinvtagpreviewproc', completedProcessingRecordResults[i].id, ['custrecordgd_pitagprev_status', 'custrecordgd_pitagprev_percentcomplete'], [TAGPREV_PROCESSINGSTATUS_OPEN, 0]);
                    }
                    
                    missingTagArray = tagObjects.missingTagArray;
                    badCountTagsArray = tagObjects.badCountArray;
                    erroredTagsArray = tagObjects.errorTagArray;
                    tagsLineDataArray = tagObjects.tagsLineDataArray
                    
                    if(missingTagArray != null && missingTagArray.length > 0) {
                        // Find missing tags
                        var missingTags = '';
                        for(var i = 0; i < missingTagArray.length; i++) {                       
                            missingTags += 'Tag #: ' + missingTagArray[i] + '<br />';
                        }
                        
                        var fldMissingTags = form.addField('custpage_missingtags', 'inlinehtml', 'Missing Tags', null, 'custpage_suitelettagsummaryfieldgroup');
                        fldMissingTags.setBreakType('startcol');
                        var missingTagContent = '<table style="width:300px; border: 1px solid #D3D3D3;">' +
                                                    '<tr>' +
                                                        '<td style="background-color:#ffcccb;padding:5px;font-weight:bold;">' +
                                                            'Missing Tags' +
                                                        '</td>' +
                                                    '</tr>' +
                                                    '<tr>' +
                                                        '<td>' +
                                                            '<div style="height:120px; overflow:auto;">' + missingTags + '</div>' +
                                                        '</td>' +
                                                    '</tr>' +
                                                '</table>';
    
                        fldMissingTags.setDefaultValue(missingTagContent);          
                    }
                    
                    if (badCountTagsArray != null && badCountTagsArray.length > 0) {
                        var badCountTagText = '';
                        for(var i = 0; i < badCountTagsArray.length; i++) {                     
                            badCountTagText += 'Tag #: ' + badCountTagsArray[i] + '<br />';
                        }
                        
                        var fldBadCountTags = form.addField('custpage_badcounttags', 'inlinehtml', 'Bad Count Tags', null, 'custpage_suitelettagsummaryfieldgroup');
                        fldBadCountTags.setBreakType('startcol');
                        var badCountTagContent = '<table style="width:300px; border: 1px solid #D3D3D3;">' +
                                                    '<tr>' +
                                                        '<td style="background-color:#ADD8E6;padding:5px;font-weight:bold;">' +
                                                            'Bad Count Tags' +
                                                        '</td>' +
                                                    '</tr>' +
                                                    '<tr>' +
                                                        '<td>' +
                                                            '<div style="height:120px; overflow:auto;">' + badCountTagText + '</div>' +
                                                        '</td>' +
                                                    '</tr>' +
                                                '</table>';
    
                        fldBadCountTags.setDefaultValue(badCountTagContent);
                    }
                    
                    if (erroredTagsArray != null && erroredTagsArray.length > 0) {
                        var errorTagText = '';
                        for(var i = 0; i < erroredTagsArray.length; i++) {                      
                            errorTagText += 'Tag #: ' + erroredTagsArray[i] + '<br />';
                        }
                        
                        var fldErrorTags = form.addField('custpage_errortags', 'inlinehtml', 'Error Tags', null, 'custpage_suitelettagsummaryfieldgroup');
                        fldErrorTags.setBreakType('startcol');
                        var errorTagContent = '<table style="width:300px; border: 1px solid #D3D3D3;">' +
                                                    '<tr>' +
                                                        '<td style="background-color:yellow;padding:5px;font-weight:bold;">' +
                                                            'Error Tags' +
                                                        '</td>' +
                                                    '</tr>' +
                                                    '<tr>' +
                                                        '<td>' +
                                                            '<div style="height:120px; overflow:auto;">' + errorTagText + '</div>' +
                                                        '</td>' +
                                                    '</tr>' +
                                                '</table>';
    
                        fldErrorTags.setDefaultValue(errorTagContent);
                        
                        
                    }
                } else {
                    if (processingRecordId == '') {
                        processingRecordId = GetProcessingRecord();
                        mapReduceMode = true;
                        //Start the map reduce script to update Sales Orders fuel and freight surcharge.
                        //This method will update only sales orders whose freight or fuel surcharge 
                        //or both are different from the specified dealer's freight or fuel surcharge.
                        var params = {}; 
                        params['custscriptgd_procrecordid'] = processingRecordId;
                        params['custscriptgd_physicalinvid'] = physicalInvId;
                        
                        processingRecord = nlapiLoadRecord('customrecordgd_physicalinvtagpreviewproc', processingRecordId);
                        
                        // Remove all the lines on the processing record.
                        for (var i = processingRecord.getLineItemCount(PROCLINE_SUBLIST); i > 0; i--) {
                            processingRecord.removeLineItem(PROCLINE_SUBLIST, i);
                        }
                        
                        processingRecordId = nlapiSubmitRecord(processingRecord, true, false);
                        
                        var url = nlapiResolveURL('SUITELET', 'customscriptgd_startmapreduce_suite', 'customdeploygd_startmapreduce_suite', true) //Get the external url. deployment must be available without login.
                        nlapiRequestURL(url + '&custparam_scriptid=customscriptgd_piprocesstagpreviewdata&custparam_scriptdeploymentid=&custparam_parameters=' + JSON.stringify(params));
                    }
                    
                    processingRecord = nlapiLoadRecord('customrecordgd_physicalinvtagpreviewproc', processingRecordId);

                    if (processingRecord.getFieldValue('custrecordgd_pitagprev_status') == TAGPREV_PROCESSINGSTATUS_COMPLETE) {
                        mapReduceMode = false;  // Map Reduce has finished.
                        
                        var dataString = '';
                        
                        for (var i = 1; i <= processingRecord.getLineItemCount(PROCLINE_SUBLIST); i++) {
                            dataString += processingRecord.getLineItemValue(PROCLINE_SUBLIST, 'custrecordgd_pitagprevproclin_jsonstring', i);
                        }
                        nlapiLogExecution('debug','484', JSON.stringify(dataString));
                        tagObjects = JSON.parse(dataString);
                        
                        missingTagArray = tagObjects.missingTagArray;
                        badCountTagsArray = tagObjects.badCountArray;
                        erroredTagsArray = tagObjects.errorTagArray;
                        tagsLineDataArray = tagObjects.tagsLineDataArray;
                        
                        if(missingTagArray != null && missingTagArray.length > 0) {
                            // Find missing tags
                            var missingTags = '';
                            for(var i = 0; i < missingTagArray.length; i++) {                       
                                missingTags += 'Tag #: ' + missingTagArray[i] + '<br />';
                            }
                            
                            var fldMissingTags = form.addField('custpage_missingtags', 'inlinehtml', 'Missing Tags', null, 'custpage_suitelettagsummaryfieldgroup');
                            fldMissingTags.setBreakType('startcol');
                            var missingTagContent = '<table style="width:300px; border: 1px solid #D3D3D3;">' +
                                                        '<tr>' +
                                                            '<td style="background-color:#ffcccb;padding:5px;font-weight:bold;">' +
                                                                'Missing Tags' +
                                                            '</td>' +
                                                        '</tr>' +
                                                        '<tr>' +
                                                            '<td>' +
                                                                '<div style="height:120px; overflow:auto;">' + missingTags + '</div>' +
                                                            '</td>' +
                                                        '</tr>' +
                                                    '</table>';
        
                            fldMissingTags.setDefaultValue(missingTagContent);          
                        }
                        
                        if (badCountTagsArray != null && badCountTagsArray.length > 0) {
                            var badCountTagText = '';
                            for(var i = 0; i < badCountTagsArray.length; i++) {                     
                                badCountTagText += 'Tag #: ' + badCountTagsArray[i] + '<br />';
                            }
                            
                            var fldBadCountTags = form.addField('custpage_badcounttags', 'inlinehtml', 'Bad Count Tags', null, 'custpage_suitelettagsummaryfieldgroup');
                            fldBadCountTags.setBreakType('startcol');
                            var badCountTagContent = '<table style="width:300px; border: 1px solid #D3D3D3;">' +
                                                        '<tr>' +
                                                            '<td style="background-color:#ADD8E6;padding:5px;font-weight:bold;">' +
                                                                'Bad Count Tags' +
                                                            '</td>' +
                                                        '</tr>' +
                                                        '<tr>' +
                                                            '<td>' +
                                                                '<div style="height:120px; overflow:auto;">' + badCountTagText + '</div>' +
                                                            '</td>' +
                                                        '</tr>' +
                                                    '</table>';
        
                            fldBadCountTags.setDefaultValue(badCountTagContent);
                        }
                        
                        if (erroredTagsArray != null && erroredTagsArray.length > 0) {
                            var errorTagText = '';
                            for(var i = 0; i < erroredTagsArray.length; i++) {                      
                                errorTagText += 'Tag #: ' + erroredTagsArray[i] + '<br />';
                            }
                            
                            var fldErrorTags = form.addField('custpage_errortags', 'inlinehtml', 'Error Tags', null, 'custpage_suitelettagsummaryfieldgroup');
                            fldErrorTags.setBreakType('startcol');
                            var errorTagContent = '<table style="width:300px; border: 1px solid #D3D3D3;">' +
                                                        '<tr>' +
                                                            '<td style="background-color:yellow;padding:5px;font-weight:bold;">' +
                                                                'Error Tags' +
                                                            '</td>' +
                                                        '</tr>' +
                                                        '<tr>' +
                                                            '<td>' +
                                                                '<div style="height:120px; overflow:auto;">' + errorTagText + '</div>' +
                                                            '</td>' +
                                                        '</tr>' +
                                                    '</table>';
        
                            fldErrorTags.setDefaultValue(errorTagContent);
                        }
                    }
                }
                
                if (mapReduceMode) {
                    // We are in map reduce mode so show a page to refresh status and percent complete.
                    //"window.ischanged = false; document.location = '" + url + "';";
                    var context = nlapiGetContext();
                    
                    var params = "&custparam_physicalInvId=" + physicalInvId + "&custparam_procrecordid=" + processingRecordId + "&custpage_filterselectionmode=" + filterSelection + "&custparam_massupdatemode=T";
                    var url = nlapiResolveURL('SUITELET', context.getScriptId(), context.getDeploymentId()) + params;
                    var reloadScript = "document.location ='" + url + "'"; //now redirect to the suitelet url on client side.
                    
                    var statusField = form.addField('custpage_status', 'text', 'Status', null, 'custpage_suiteletfieldgroup');
                    statusField.setDefaultValue(processingRecord.getFieldText('custrecordgd_pitagprev_status'));
                    statusField.setDisplayType('inline');
                    
                    var percentCompleteField = form.addField('custpage_percentcomplete', 'percent', 'Percent Complete', null, 'custpage_suiteletfieldgroup');
                    percentCompleteField.setDefaultValue(processingRecord.getFieldValue('custrecordgd_pitagprev_percentcomplete'));
                    percentCompleteField.setDisplayType('inline');
                    
                    form.addButton('custpage_btnrefresh', 'Refresh', reloadScript);
                } else {
                    var rowType = '';
                    var isDuplicate = '';
                    for (var i = 0; i < tagsLineDataArray.length; i++) {
                        if (i % 2 == 0)
                            rowType = 'odd';
                        else
                            rowType = 'even';
                        
                        if (tagsLineDataArray[i][SUBLIST_FIELD_ISDUPLICATE] == 'T')
                            isDuplicate = 'Yes';
                        else if (tagsLineDataArray[i][SUBLIST_FIELD_ISDUPLICATE] == 'F')
                            isDuplicate = 'No';
                        else
                            isDuplicate = '';
                        
                        mainTagsTable +=
                              '<tr class="uir-list-row-tr uir-list-row-' + rowType + '">' +
                                '<td class="uir-list-row-cell listtexthl' + ' ' + tagsLineDataArray[i]['bgcolorclass'] + '">' + tagsLineDataArray[i][SUBLIST_FIELD_TAGNUM] + '</td>' +
                                '<td class="uir-list-row-cell listtexthl' + ' ' + tagsLineDataArray[i]['bgcolorclass'] + '">' + tagsLineDataArray[i][SUBLIST_FIELD_ITEM] + '</td>' +
                                '<td class="uir-list-row-cell listtexthl' + ' ' + tagsLineDataArray[i]['bgcolorclass'] + '">' + tagsLineDataArray[i][SUBLIST_FIELD_ITEMDESC] + '</td>' +
                                '<td class="uir-list-row-cell listtexthl' + ' ' + tagsLineDataArray[i]['bgcolorclass'] + '">' + tagsLineDataArray[i][SUBLIST_FIELD_COMMENTS] + '</td>' +
                                '<td class="uir-list-row-cell listtexthlrt' + ' ' + tagsLineDataArray[i]['bgcolorclass'] + '">' + tagsLineDataArray[i][SUBLIST_FIELD_QTY] + '</td>' +
                                '<td class="uir-list-row-cell listtexthl' + ' ' + tagsLineDataArray[i]['bgcolorclass'] + '">' + tagsLineDataArray[i][SUBLIST_FIELD_UOM] + '</td>' +
                                '<td class="uir-list-row-cell listtexthl' + ' ' + tagsLineDataArray[i]['bgcolorclass'] + '">' + tagsLineDataArray[i][SUBLIST_FIELD_VENDORPARTNUM] + '</td>' +
                                '<td class="uir-list-row-cell listtexthlrt' + ' ' + tagsLineDataArray[i]['bgcolorclass'] + '">' + tagsLineDataArray[i][SUBLIST_FIELD_COST] + '</td>' +
                                '<td class="uir-list-row-cell listtexthlrt' + ' ' + tagsLineDataArray[i]['bgcolorclass'] + '">' + tagsLineDataArray[i][SUBLIST_FIELD_EXTCOST] + '</td>' +
                                '<td class="uir-list-row-cell listtexthlrt' + ' ' + tagsLineDataArray[i]['bgcolorclass'] + '">' + tagsLineDataArray[i][SUBLIST_FIELD_LASTINVANDPURCH] + '</td>' +
                                '<td class="uir-list-row-cell listtexthlrt' + ' ' + tagsLineDataArray[i]['bgcolorclass'] + '">' + tagsLineDataArray[i][SUBLIST_FIELD_PURCHLASTTHREE] + '</td>' +
                                '<td class="uir-list-row-cell listtexthl' + ' ' + tagsLineDataArray[i]['bgcolorclass'] + '">' + tagsLineDataArray[i][SUBLIST_FIELD_PLANT] + '</td>' +
                                '<td class="uir-list-row-cell listtexthl' + ' ' + tagsLineDataArray[i]['bgcolorclass'] + '">' + tagsLineDataArray[i][SUBLIST_FIELD_PLANTDEPARTMENT] + '</td>' +
                                '<td class="uir-list-row-cell listtexthlctr' + ' ' + tagsLineDataArray[i]['bgcolorclass'] + '">' + isDuplicate + '</td>' +
                              '</tr>';
                    }
                
                    mainTagsTable +=
                                                                '</tbody>' +
                                                                '<object type="text/html" tabindex="-1" style="display:block; position:absolute; left:0; top:0; width:100%; height:100%; overflow:hidden; pointer-events:none; z-index:-1; opacity:0;" data="about:blank"></object>' +
                                                            '</table>' +
                                                        '</div>' +
                                                        '<input type="hidden" name="nextcustpage_sublistinvtagitemsidx" value="101">' +
                                                            '<input type="hidden" name="lineindex" value="-1">' +
                                                            '</form>' +
                                                        '</div>' +
                                                    '</div>' +
                                                '</div>' +
                                            '</td>' +
                                        '</tr>' +
                                    '</tbody>' +
                                '</table>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                    
                    form.addSubTab('custpage_tagssubtab', 'Tags');
                    var fldSublistTags = form.addField('custpage_sublisttags', 'inlinehtml', 'Sublist Tags', null, 'custpage_tagssubtab');
                    fldSublistTags.setDefaultValue(mainTagsTable);
        
                    var params = new Array();
                    params["custparam_physicalInvId"] = nlapiGetRecordId();
                    params["custparam_locationId"] = nlapiGetFieldValue('custpage_physicalinvlocationfilter');
                    
                    var filterField = form.getField('custpage_physicalinvlocationfilter');
                    filterField.toString();
                    var url = nlapiResolveURL('RECORD', 'customrecordgd_physicalinventorycount', physicalInvId, 'VIEW');
                    
                    locFilter.setDisplayType('normal');
                    
                    var script = "window.ischanged = false; document.location = '" + url + "';";
                    form.addButton('custpage_btnrefresh', 'Back To Physical Inventory Record', script);
                    
                    var context = nlapiGetContext();
                    var params = "&custparam_exporttoexcel=T" + "&custparam_procrecordid=" + processingRecordId + "&custparam_datestring=" + physicalInvDateStr + "&custparam_locationId=" + locationId;
                    var exportToExcelURL = nlapiResolveURL('SUITELET', context.getScriptId(), context.getDeploymentId()) + params;
                    var script = "window.ischanged = false; document.location = '" + exportToExcelURL + "';"; //now redirect to the suitelet url to generate an excel file on client side.
                    form.addButton('custpage_btnrefresh', 'Export Data', script);
                    
                    form.addSubmitButton('Get Preview');
                }
            }
            
            response.writePage(form);
        }
    } else if (request.getMethod() == 'POST') {
        var context = nlapiGetContext();
        var filterSelection = request.getParameter('custpage_filterselectionmode');
        var physicalInventoryLocationFilter = request.getParameter('custpage_physicalinvlocationfilter') || '';
        
        var params = new Array();
        params["custparam_physicalInvId"] = request.getParameter('custpage_physicalinv') || '';
        params["custparam_locationId"] = physicalInventoryLocationFilter;
        params['custpage_filterselectionmode'] = filterSelection || '';
        params['custparam_procrecordid'] = request.getParameter('custpage_procrecordid') || '';

        if (physicalInventoryLocationFilter == '')
            params['custparam_massupdatemode'] = 'T';
        
        nlapiSetRedirectURL('SUITELET', context.getScriptId(), context.getDeploymentId(), false, params);
    }
}

/**
 * Build Physical Inventory Tags Sublist and return missing tag numbers as an array.
 * @param form
 * @param physicalInvDateStr
 * @param startTagNum
 * @param endTagNum
 * @param locationId
 * @param tagNumRangeArray
 * @returns {Array}
 */
function BuildPhysicalInventoryTagItemSublistAndReturnMissingTags(form, physicalInvDateStr, physicalInvStartTagNum, physicalInvEndTagNum, locationId, tagNumRangeArray) {  
    
    var TAB_NAME_INVTAG = 'custpage_tabinvtag';
    var title = 'Physical Inventory Tag Items';
    var tagNumText = '';
    var lineObject = new Object();
    var tagsLineDataArray = new Array();
    
    form.addTab(TAB_NAME_INVTAG, title);
    

    
    var missingTagArray = new Array();
    var errorTagArray = new Array();
    var badCountArray = new Array();
    


    var worksheetId = '';
    for (var j = 0; j < tagNumRangeArray.length; j++) {
        physicalInvStartTagNum = tagNumRangeArray[j].startTagNum;
        physicalInvEndTagNum = tagNumRangeArray[j].endTagNum;
        
        // Get the grouped search of the tag lines.  This will be used to find the bad count and error tags.
        var filters = new Array();
        filters[filters.length] = new nlobjSearchFilter('custrecordgd_physinvtwrksht_date', 'custrecordgd_physinvttagline_parent', 'on', physicalInvDateStr);
        filters[filters.length] = new nlobjSearchFilter('isinactive',null,'is','F');
        
        filters[filters.length] = new nlobjSearchFilter('custrecordgd_physinvtwrksht_plant','custrecordgd_physinvttagline_parent','anyof',locationId);
        
        var cols = new Array();
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvttagline_quantity', null, 'sum');
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvttagline_lastinvpurc', null, 'group');
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvttagline_purchlast3', null, 'group');
        cols[cols.length] = new nlobjSearchColumn('internalid', 'custrecordgd_physinvttagline_item', 'group');
        cols[cols.length] = new nlobjSearchColumn('type', 'custrecordgd_physinvttagline_item', 'group');
        var sortCol = new nlobjSearchColumn('internalid', null, 'group');
        sortCol.setSort();
        cols[cols.length] = sortCol;
        
        //Use our custom GetSearchResults method to get more than 1000 records.
        var physicalInvTagItemGroupedResults = GetSearchResults('customrecordgd_physinvttagline', null, filters, cols, null);
        
        //Get the tag lines to iterate through it and construct the sublist with the tags.
        var filters = new Array();
        filters[filters.length] = new nlobjSearchFilter('custrecordgd_physinvtwrksht_date', 'custrecordgd_physinvttagline_parent', 'on', physicalInvDateStr);
        filters[filters.length] = new nlobjSearchFilter('isinactive',null,'is','F');
        
        filters[filters.length] = new nlobjSearchFilter('custrecordgd_physinvtwrksht_plant','custrecordgd_physinvttagline_parent','anyof',locationId);
        
//            filters[filters.length] = new nlobjSearchFilter('custrecordgd_physinvttagline_tagnum',null,'lessthanorequalto',physicalInvEndTagNum);
        filters[filters.length] = new nlobjSearchFilter('formulanumeric', null, 'greaterthanorequalto', physicalInvStartTagNum).setFormula('TO_NUMBER({custrecordgd_physinvttagline_tagnum})');
        filters[filters.length] = new nlobjSearchFilter('formulanumeric', null, 'lessthanorequalto', physicalInvEndTagNum).setFormula('TO_NUMBER({custrecordgd_physinvttagline_tagnum})');
        
        var cols = new Array();
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvttagline_item');
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvttagline_description');
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvttagline_comments');
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvttagline_purchuom');
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvttagline_quantity');
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvttagline_tagnum');
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvttagline_vendpartnum');
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvtwrksht_plant', 'custrecordgd_physinvttagline_parent');
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvtwrksht_plantdept', 'custrecordgd_physinvttagline_parent');
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvttagline_cost');
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvttagline_extendcost');
        cols[cols.length] = new nlobjSearchColumn('internalid','custrecordgd_physinvttagline_parent');
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvttagline_lastinvpurc');
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvttagline_purchlast3');
        cols[cols.length] = new nlobjSearchColumn('custrecordgd_physinvtwrksht_date','custrecordgd_physinvttagline_parent');
        var internalIdSort = new nlobjSearchColumn('internalid');
        internalIdSort.setSort();
        cols[cols.length] = internalIdSort;
        
        //Use our custom GetSearchResults method to get more than 1000 records.
        var physicalInvTagItemResults = GetSearchResults('customrecordgd_physinvttagline', null, filters, cols, null);
        
        if(physicalInvTagItemResults != null && physicalInvTagItemResults.length > 0) {

            physicalInvTagItemResults = physicalInvTagItemResults.sort(SortPhysicalInentoryItemByTagNumber);

            var calculatedTagNum = 0;   
            
            var currentTagNum = physicalInvTagItemResults[0].getValue('custrecordgd_physinvttagline_tagnum'); //This should be the lowest startTag Number since the results is sorted.
            var startTagNum = currentTagNum; //Start processing this tag number
        
            // Check if the currentTagNum is within the current start and end tags
            if (currentTagNum >= physicalInvStartTagNum && currentTagNum <= physicalInvEndTagNum) {
                //If we are missing some start tags based on the Physical Inventory startTag field, 
                //process them and add to the missing tag array.
                if(currentTagNum < physicalInvStartTagNum) {
                    // This scenario should not happen, but if it does, add the missing tags between the current tag num and the start tag number so users can see tags that are outside of the start and end tags.
                    for(var m = currentTagNum; m < physicalInvStartTagNum; m++) {
                        tagNumText = '<div style="font-weight:bold;">' + m + '</div>';
    
                        missingTagArray[missingTagArray.length] = m;
    
                        lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                        lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = m;
                        lineObject[SUBLIST_FIELD_ITEM] = '';
                        lineObject[SUBLIST_FIELD_ITEMDESC] = '';
                        lineObject[SUBLIST_FIELD_QTY] = '';             
                        lineObject[SUBLIST_FIELD_UOM] = '';
                        lineObject[SUBLIST_FIELD_COST] = '';                
                        lineObject[SUBLIST_FIELD_ISDUPLICATE] = '';
                        lineObject[SUBLIST_FIELD_COMMENTS] = '';
                        lineObject[SUBLIST_FIELD_VENDORPARTNUM] = '';
                        lineObject[SUBLIST_FIELD_EXTCOST] = '';
                        lineObject[SUBLIST_FIELD_LASTINVANDPURCH] = '';
                        lineObject[SUBLIST_FIELD_PURCHLASTTHREE] = '';
                        lineObject[SUBLIST_FIELD_PLANT] = '';
                        lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] = '';
                        lineObject['bgcolorclass'] = 'bgcolorclassred';
                        
                        tagsLineDataArray.push(lineObject);
                        lineObject = {};
                        
                        lineIndex++;
                    }
                    
                    startTagNum = physicalInvStartTagNum; //now set startTagNum to be the same as the physical inv start tag #
                }
                else if(currentTagNum > physicalInvStartTagNum) {
                    // Add all tags between the start tag and the current tag numbers into the missing tag array.
                    for(var m = physicalInvStartTagNum; m < currentTagNum; m++) {
                        tagNumText = '<div style="font-weight:bold;">' + m + '</div>';
    
                        missingTagArray[missingTagArray.length] = m;
    
                        lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                        lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = m;
                        lineObject[SUBLIST_FIELD_ITEM] = '';
                        lineObject[SUBLIST_FIELD_ITEMDESC] = '';
                        lineObject[SUBLIST_FIELD_QTY] = '';             
                        lineObject[SUBLIST_FIELD_UOM] = '';
                        lineObject[SUBLIST_FIELD_COST] = '';                
                        lineObject[SUBLIST_FIELD_ISDUPLICATE] = '';
                        lineObject[SUBLIST_FIELD_COMMENTS] = '';
                        lineObject[SUBLIST_FIELD_VENDORPARTNUM] = '';
                        lineObject[SUBLIST_FIELD_EXTCOST] = '';
                        lineObject[SUBLIST_FIELD_LASTINVANDPURCH] = '';
                        lineObject[SUBLIST_FIELD_PURCHLASTTHREE] = '';
                        lineObject[SUBLIST_FIELD_PLANT] = '';
                        lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] = '';
                        lineObject['bgcolorclass'] = 'bgcolorclassred';
                        
                        tagsLineDataArray.push(lineObject);
                        lineObject = {};
                        
                        lineIndex++;
                    }
                    
                    startTagNum = currentTagNum; //now set startTagNum to be the same as the current tag #      
                }
            } else {
                // Add all tags between the start tag and the end tag numbers into the missing tag array.
                for(var m = physicalInvStartTagNum; m < physicalInvEndTagNum; m++) {
                    tagNumText = '<div style="font-weight:bold;">' + m + '</div>';

                    missingTagArray[missingTagArray.length] = m;

                    lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                    lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = m;
                    lineObject[SUBLIST_FIELD_ITEM] = '';
                    lineObject[SUBLIST_FIELD_ITEMDESC] = '';
                    lineObject[SUBLIST_FIELD_QTY] = '';             
                    lineObject[SUBLIST_FIELD_UOM] = '';
                    lineObject[SUBLIST_FIELD_COST] = '';                
                    lineObject[SUBLIST_FIELD_ISDUPLICATE] = '';
                    lineObject[SUBLIST_FIELD_COMMENTS] = '';
                    lineObject[SUBLIST_FIELD_VENDORPARTNUM] = '';
                    lineObject[SUBLIST_FIELD_EXTCOST] = '';
                    lineObject[SUBLIST_FIELD_LASTINVANDPURCH] = '';
                    lineObject[SUBLIST_FIELD_PURCHLASTTHREE] = '';
                    lineObject[SUBLIST_FIELD_PLANT] = '';
                    lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] = '';
                    lineObject['bgcolorclass'] = 'bgcolorclassred';
                    
                    tagsLineDataArray.push(lineObject);
                    lineObject = {};
                    
                    lineIndex++;
                }
            }
//        }
            var previousTagNum = 0;
            var incrementCalculatedTagNumber = true; //store whether or not to increment calculatedTagNum variable.
            //Process Physical Inventory Tag Items.
            for(var i = 0; i < physicalInvTagItemResults.length; i++) {
                currentTagNum = ConvertValueToInt(physicalInvTagItemResults[i].getValue('custrecordgd_physinvttagline_tagnum'));
                worksheetId = physicalInvTagItemResults[i].getValue('internalid','custrecordgd_physinvttagline_parent');
                
                var tagNumText = Math.round(currentTagNum).toFixed(0);
                var isDuplicateTag = 'F';
                
                //If currentTagNum is less than the Physical Inventory physicalInvStartTagNum, we are already handling it. See above code.
                if(currentTagNum >= startTagNum) {
                    //If current tag # is equal to the physicalInvStartTagNum or we have not calculated tag num,
                    //then set calculated to be the same as the startTag
                    if(calculatedTagNum == 0)
                        previousTagNum = calculatedTagNum = currentTagNum;  
                    else {
                        if(previousTagNum != currentTagNum) {
                            if(incrementCalculatedTagNumber)
                                calculatedTagNum++;
                        } else {
                            isDuplicateTag = 'T';
                        }
                    }
                    
                    previousTagNum = currentTagNum;
                    
                    if(!incrementCalculatedTagNumber)
                        incrementCalculatedTagNumber = true;
                                    
                    var item = ConvertValueToString(physicalInvTagItemResults[i].getText('custrecordgd_physinvttagline_item'));
                    var itemId = physicalInvTagItemResults[i].getValue('custrecordgd_physinvttagline_item');
                    var description = ConvertValueToString(physicalInvTagItemResults[i].getValue('custrecordgd_physinvttagline_description'));
                    var qty = physicalInvTagItemResults[i].getValue('custrecordgd_physinvttagline_quantity');   
                    var uom = physicalInvTagItemResults[i].getText('custrecordgd_physinvttagline_purchuom');
                    var cost = physicalInvTagItemResults[i].getValue('custrecordgd_physinvttagline_cost');
                    
                    var comments = ConvertValueToString(physicalInvTagItemResults[i].getValue('custrecordgd_physinvttagline_comments'));
                    var vendorPartNum = ConvertValueToString(physicalInvTagItemResults[i].getValue('custrecordgd_physinvttagline_vendpartnum'));
                    var extendedCost = physicalInvTagItemResults[i].getValue('custrecordgd_physinvttagline_extendcost');
                    var lastInvAndPurch = physicalInvTagItemResults[i].getValue('custrecordgd_physinvttagline_lastinvpurc');
                    var purchLast3 = physicalInvTagItemResults[i].getValue('custrecordgd_physinvttagline_purchlast3');
                    var plant = physicalInvTagItemResults[i].getText('custrecordgd_physinvtwrksht_plant', 'custrecordgd_physinvttagline_parent');
                    var plantDepartment = physicalInvTagItemResults[i].getText('custrecordgd_physinvtwrksht_plantdept', 'custrecordgd_physinvttagline_parent'); 

                    //tag # does not match the calculated one, or tag number is greater than the Physical Inventory End Tag #.
                    //we need to process missing tags appropriately. we have different scenarios that need to be handled in this case.
                    if(currentTagNum != calculatedTagNum || currentTagNum > physicalInvEndTagNum) {
                        //currentTagNum is greater than the physical Inventory End Tag #, add a missing tag.
                        if(currentTagNum > physicalInvEndTagNum) {
//                            tagNumText = '<div style="font-weight:bold;">' + calculatedTagNum + '</div>';
//
//                            missingTagArray[missingTagArray.length] = calculatedTagNum; 
//                            
//                            lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
//                            lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = calculatedTagNum;
//                            lineObject[SUBLIST_FIELD_ITEM] = '';
//                            lineObject[SUBLIST_FIELD_ITEMDESC] = '';
//                            lineObject[SUBLIST_FIELD_QTY] = '';             
//                            lineObject[SUBLIST_FIELD_UOM] = '';
//                            lineObject[SUBLIST_FIELD_COST] = '';                
//                            lineObject[SUBLIST_FIELD_ISDUPLICATE] = '';
//                            lineObject[SUBLIST_FIELD_COMMENTS] = '';
//                            lineObject[SUBLIST_FIELD_VENDORPARTNUM] = '';
//                            lineObject[SUBLIST_FIELD_EXTCOST] = '';
//                            lineObject[SUBLIST_FIELD_LASTINVANDPURCH] = '';
//                            lineObject[SUBLIST_FIELD_PURCHLASTTHREE] = '';
//                            lineObject[SUBLIST_FIELD_PLANT] = '';
//                            lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] = '';
//                            lineObject['bgcolorclass'] = 'bgcolorclassred';
//                            
//                            tagsLineDataArray.push(lineObject);
//                            lineObject = {};
//                            
//                            lineIndex++;
                        }
                        //Calculated Tag # and currentTag # are not equal. We need to process missing tags accordingly.
                        else {
                            //1. currentTagNum is greater than calculatedTagNum, we have missing tags between calculatedTagNum & currentTagNum.
                            //   Add the missing tags and assign the calculatedTagNum to be the current so that we can process the current tag.
                            if(calculatedTagNum < currentTagNum) {
                                for(var tagNum = calculatedTagNum; tagNum < currentTagNum; tagNum++) {
                                    tagNumText = '<div style="font-weight:bold;">' + tagNum + '</div>';

                                    missingTagArray[missingTagArray.length] = tagNum;
                                    
                                    lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                                    lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = tagNum;
                                    lineObject[SUBLIST_FIELD_ITEM] = '';
                                    lineObject[SUBLIST_FIELD_ITEMDESC] = '';
                                    lineObject[SUBLIST_FIELD_QTY] = '';             
                                    lineObject[SUBLIST_FIELD_UOM] = '';
                                    lineObject[SUBLIST_FIELD_COST] = '';                
                                    lineObject[SUBLIST_FIELD_ISDUPLICATE] = '';
                                    lineObject[SUBLIST_FIELD_COMMENTS] = '';
                                    lineObject[SUBLIST_FIELD_VENDORPARTNUM] = '';
                                    lineObject[SUBLIST_FIELD_EXTCOST] = '';
                                    lineObject[SUBLIST_FIELD_LASTINVANDPURCH] = '';
                                    lineObject[SUBLIST_FIELD_PURCHLASTTHREE] = '';
                                    lineObject[SUBLIST_FIELD_PLANT] = '';
                                    lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] = '';
                                    lineObject['bgcolorclass'] = 'bgcolorclassred';
                                    
                                    tagsLineDataArray.push(lineObject);
                                    lineObject = {};
                                    
                                    lineIndex++;    
                                }   
                                
                                //Now that we have added missing tags, set calculatedTagNum to be equal to currentTagNum. 
                                //This will allow the current tag to be processed since it is existing tag.
                                calculatedTagNum = currentTagNum; 
                            }
                            //2. calculatedTagNum is greater than currentTagNum. We need to calculate missing tags based on the next available tag number.
                            else if(calculatedTagNum > currentTagNum) {
                                if(i < physicalInvTagItemResults.length - 1) {
                                    //We are not at the end of the list, so add all missing tags based on the next available tag number.
                                    var nextAvailableTagNum = ConvertValueToInt(physicalInvTagItemResults[i + 1].getValue('custrecordgd_physinvttagline_tagnum'));
                                    
                                    for(var tagNum = calculatedTagNum; tagNum < nextAvailableTagNum; tagNum++) {
                                        tagNumText = '<div style="font-weight:bold;">' + tagNum + '</div>';

                                        missingTagArray[missingTagArray.length] = tagNum;
                                        
                                        lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                                        lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = tagNum;
                                        lineObject[SUBLIST_FIELD_ITEM] = '';
                                        lineObject[SUBLIST_FIELD_ITEMDESC] = '';
                                        lineObject[SUBLIST_FIELD_QTY] = '';             
                                        lineObject[SUBLIST_FIELD_UOM] = '';
                                        lineObject[SUBLIST_FIELD_COST] = '';                
                                        lineObject[SUBLIST_FIELD_ISDUPLICATE] = '';
                                        lineObject[SUBLIST_FIELD_COMMENTS] = '';
                                        lineObject[SUBLIST_FIELD_VENDORPARTNUM] = '';
                                        lineObject[SUBLIST_FIELD_EXTCOST] = '';
                                        lineObject[SUBLIST_FIELD_LASTINVANDPURCH] = '';
                                        lineObject[SUBLIST_FIELD_PURCHLASTTHREE] = '';
                                        lineObject[SUBLIST_FIELD_PLANT] = '';
                                        lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] = '';
                                        lineObject['bgcolorclass'] = 'bgcolorclassred';
                                        
                                        tagsLineDataArray.push(lineObject);
                                        lineObject = {};
                                        
                                        lineIndex++;    
                                    }
                                    
                                    incrementCalculatedTagNumber = false;
                                    calculatedTagNum = nextAvailableTagNum;
                                } else {
                                    //This is the last tag, so add it as a missing tag.
                                    tagNumText = '<div style="font-weight:bold;">' + calculatedTagNum + '</div>';

                                    missingTagArray[missingTagArray.length] = calculatedTagNum; 
                                    
                                    lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                                    lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = calculatedTagNum;
                                    lineObject[SUBLIST_FIELD_ITEM] = '';
                                    lineObject[SUBLIST_FIELD_ITEMDESC] = '';
                                    lineObject[SUBLIST_FIELD_QTY] = '';             
                                    lineObject[SUBLIST_FIELD_UOM] = '';
                                    lineObject[SUBLIST_FIELD_COST] = '';                
                                    lineObject[SUBLIST_FIELD_ISDUPLICATE] = '';
                                    lineObject[SUBLIST_FIELD_COMMENTS] = '';
                                    lineObject[SUBLIST_FIELD_VENDORPARTNUM] = '';
                                    lineObject[SUBLIST_FIELD_EXTCOST] = '';
                                    lineObject[SUBLIST_FIELD_LASTINVANDPURCH] = '';
                                    lineObject[SUBLIST_FIELD_PURCHLASTTHREE] = '';
                                    lineObject[SUBLIST_FIELD_PLANT] = '';
                                    lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] = '';
                                    lineObject['bgcolorclass'] = 'bgcolorclassred';
                                    
                                    tagsLineDataArray.push(lineObject);
                                    lineObject = {};
                                    
                                    lineIndex++;
                                }                       
                            }
                        }
                    }
                    
                    //Now add existing tags.
                    if(currentTagNum == calculatedTagNum) {
                        // Get the item data from the grouped tag search.
                        var searchResult = physicalInvTagItemGroupedResults.filter(function(data){return data.getValue('internalid', 'custrecordgd_physinvttagline_item', 'group') == itemId;}) || [];
                        
                        // Get Bad count Tags.  Assembly items are excluded from this list and if quantity is greater than the purchase last 3 months. this is a bad count tag.
                        if (searchResult.length > 0 && 
                                searchResult[0].getValue('type', 'custrecordgd_physinvttagline_item', 'group') != 'Assembly' && 
                                parseFloat(searchResult[0].getValue('custrecordgd_physinvttagline_quantity', null, 'sum')) > parseFloat(searchResult[0].getValue('custrecordgd_physinvttagline_purchlast3', null, 'group'))) {
                            tagNumText = '<div style="font-weight:bold;"><a href="' + nlapiResolveURL('RECORD', 'customrecordgd_physicalinventoryworkshee', worksheetId, 'VIEW') + '">' + Math.round(currentTagNum).toFixed(0) + '</a></div>';
                            badCountArray.push(calculatedTagNum);

                            lineObject['bgcolorclass'] = 'bgcolorclassblue';
                        }
                        // exclude assembly items, and if the quantity is greater than the last inventory purchase this is an error tag.
                        else if (searchResult.length > 0 && 
                                searchResult[0].getValue('type', 'custrecordgd_physinvttagline_item', 'group') != 'Assembly' &&
                                parseFloat(searchResult[0].getValue('custrecordgd_physinvttagline_quantity', null, 'sum')) > parseFloat(searchResult[0].getValue('custrecordgd_physinvttagline_lastinvpurc', null, 'group'))) {
                            tagNumText = '<div style="font-weight:bold;"><a href="' + nlapiResolveURL('RECORD', 'customrecordgd_physicalinventoryworkshee', worksheetId, 'VIEW') + '">' + Math.round(currentTagNum).toFixed(0) + '</a></div>';
                            errorTagArray.push(calculatedTagNum);
                            
                            lineObject['bgcolorclass'] = 'bgcolorclassyellow';
                        } else {
                            tagNumText = '<div style="font-weight:bold;"><a href="' + nlapiResolveURL('RECORD', 'customrecordgd_physicalinventoryworkshee', worksheetId, 'VIEW') + '">' + Math.round(currentTagNum).toFixed(0) + '</a></div>';
                            
                            lineObject['bgcolorclass'] = '';
                        }
                        
                        lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                        lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = currentTagNum;
                        lineObject[SUBLIST_FIELD_ITEM] = item;
                        lineObject[SUBLIST_FIELD_ITEMDESC] = description;
                        lineObject[SUBLIST_FIELD_QTY] = qty;                
                        lineObject[SUBLIST_FIELD_UOM] = uom;
                        lineObject[SUBLIST_FIELD_COST] = parseFloat(cost).toFixed(3);              
                        lineObject[SUBLIST_FIELD_ISDUPLICATE] = isDuplicateTag;
                        lineObject[SUBLIST_FIELD_COMMENTS] = comments;
                        lineObject[SUBLIST_FIELD_VENDORPARTNUM] = vendorPartNum;
                        lineObject[SUBLIST_FIELD_EXTCOST] = parseFloat(extendedCost).toFixed(3);
                        lineObject[SUBLIST_FIELD_LASTINVANDPURCH] = lastInvAndPurch;
                        lineObject[SUBLIST_FIELD_PURCHLASTTHREE] = purchLast3;
                        lineObject[SUBLIST_FIELD_PLANT] = plant;
                        lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] = plantDepartment;
                        
                        tagsLineDataArray.push(lineObject);
                        
                        lineObject = {};
                        lineIndex++;
                    }
                }
            }
            
            //If we are missing tags at the end, process them and add them in the missing tag array.
            if(calculatedTagNum + 1 <= physicalInvEndTagNum) {
                for(var i = calculatedTagNum + 1; i <= physicalInvEndTagNum; i++) { 
                    var tagNumText = '<div style="font-weight:bold;">' + i + '</div>';  

                    missingTagArray[missingTagArray.length] = i;
                    
                    lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                    lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = i;
                    lineObject[SUBLIST_FIELD_ITEM] = '';
                    lineObject[SUBLIST_FIELD_ITEMDESC] = '';
                    lineObject[SUBLIST_FIELD_QTY] = '';             
                    lineObject[SUBLIST_FIELD_UOM] = '';
                    lineObject[SUBLIST_FIELD_COST] = '';                
                    lineObject[SUBLIST_FIELD_ISDUPLICATE] = '';
                    lineObject[SUBLIST_FIELD_COMMENTS] = '';
                    lineObject[SUBLIST_FIELD_VENDORPARTNUM] = '';
                    lineObject[SUBLIST_FIELD_EXTCOST] = '';
                    lineObject[SUBLIST_FIELD_LASTINVANDPURCH] = '';
                    lineObject[SUBLIST_FIELD_PURCHLASTTHREE] = '';
                    lineObject[SUBLIST_FIELD_PLANT] = '';
                    lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] = '';
                    lineObject['bgcolorclass'] = 'bgcolorclassred';
                    
                    tagsLineDataArray.push(lineObject);
                    lineObject = {};
                    
                    lineIndex++;
                }
            }
        }
        
    }

    var tagObjects = new Object();
    tagObjects.missingTagArray = missingTagArray;
    tagObjects.badCountArray = badCountArray;
    tagObjects.errorTagArray = errorTagArray;
    tagObjects.tagsLineDataArray = tagsLineDataArray;
    
    return tagObjects;
}

/**
 * Adds missing tag in sublist.
 * @param sublist
 * @param lineIndex
 * @param missingTag
 */
function AddMissingTagInSublist(sublist, lineIndex, missingTag, isDuplicateTag) {
    sublist.setLineItemValue(SUBLIST_FIELD_TAGNUM, lineIndex, missingTag);
    sublist.setLineItemValue(SUBLIST_FIELD_ITEM, lineIndex, null);
    sublist.setLineItemValue(SUBLIST_FIELD_ITEMDESC, lineIndex, '');
    sublist.setLineItemValue(SUBLIST_FIELD_QTY, lineIndex, null);               
    sublist.setLineItemValue(SUBLIST_FIELD_UOM, lineIndex, null);
    sublist.setLineItemValue(SUBLIST_FIELD_COST, lineIndex, null);
    sublist.setLineItemValue(SUBLIST_FIELD_ISDUPLICATE, lineIndex, isDuplicateTag);
    sublist.setLineItemValue(SUBLIST_FIELD_COMMENTS, lineIndex, null);
    sublist.setLineItemValue(SUBLIST_FIELD_VENDORPARTNUM, lineIndex, null);
    sublist.setLineItemValue(SUBLIST_FIELD_EXTCOST, lineIndex, null);
    sublist.setLineItemValue(SUBLIST_FIELD_LASTINVANDPURCH, lineIndex, null);
    sublist.setLineItemValue(SUBLIST_FIELD_PURCHLASTTHREE, lineIndex, null);
    sublist.setLineItemValue(SUBLIST_FIELD_PLANT, lineIndex, null);
    sublist.setLineItemValue(SUBLIST_FIELD_PLANTDEPARTMENT, lineIndex, null);
}

/**
 * Sorts physical inventory items by tag number.
 * @param invTagItemResult1
 * @param invTagItemResult2
 * @returns {Number}
 */
function SortPhysicalInentoryItemByTagNumber(invTagItemResult1, invTagItemResult2) {
    if (parseInt(invTagItemResult1.getValue('custrecordgd_physinvttagline_tagnum')) < parseInt(invTagItemResult2.getValue('custrecordgd_physinvttagline_tagnum')))
        return -1;
    else if (parseInt(invTagItemResult1.getValue('custrecordgd_physinvttagline_tagnum')) > parseInt(invTagItemResult2.getValue('custrecordgd_physinvttagline_tagnum')))
        return 1;
    else 
        return 0;   
}

/**
 * Set the on the fly select field.
 * 
 * Run search on units type record and create JSON array of the unit conversion table for easy access later on.
 * Set the next lines tag number
 */
function GD_PI_PreviewTagPageInit() {
    // If physical inventory count records exist, set it on the on the fly select field. 
    var picListFieldValue = nlapiGetFieldValue('custpage_physicalinvenotryobjecttext') || '';
    if (picListFieldValue != '') {
        var picListObjectOrdered = JSON.parse(picListFieldValue);
        var picIsSelected = false;
        for (var i = 0; i < picListObjectOrdered.length; i++) {
            nlapiInsertSelectOption(
                    'custpage_physicalinvinveditfield', 
                    picListObjectOrdered[i].internalid, 
                    picListObjectOrdered[i].name, 
                    picListObjectOrdered[i].select
            );
            if (picListObjectOrdered[i].select)
                picIsSelected = true;
        }
    }
    var picId = nlapiGetFieldValue('custpage_physicalinv');
    var locId = nlapiGetFieldValue('custpage_physicalinvlocationfilter');
    
    if (picId != '') {
        // Add style in DOM
        //get id 'custpage_tagssubtab_layer' 
        //then add style="overflow-x: auto;"
        if (document.getElementById('custpage_tagssubtab_layer') != null) {
            document.getElementById('custpage_tagssubtab_layer').style.overflowX = "auto";
            
            var style = document.createElement('style');
            style.innerHTML = 
                'td.bgcolorclassred {' +
                'background-color: #ffcccb !important;' +
                '}' +
                'td.bgcolorclassred:hover {' +
                'background-color: #ff0000 !important;' +
                '}' +
                'td.bgcolorclassblue {' +
                'background-color: #ADD8E6 !important;' +
                '}' +
                'td.bgcolorclassblue:hover {' +
                'background-color: #ADD8E6 !important;' +
                '}' +
                'td.bgcolorclassyellow {' +
                'background-color: yellow !important;' +
                '}' +
                'td.bgcolorclassyellow:hover {' +
                'background-color: yellow !important;' +
                '}';
            document.head.appendChild(style);
        }
    }
}

/**
 * Sets the actual physical inventory count date field.
 * @param type
 * @param name
 * @param linenum
 */
function GD_PI_PreviewTagFieldChanged(type, name, linenum) {
    if (name == 'custpage_physicalinvinveditfield')
        nlapiSetFieldValue('custpage_physicalinv', nlapiGetFieldValue(name));
}

/**
 * Search for an available processing record or create one and mark it as Queued.
 * 
 * @return processingRecordId
 */
function GetProcessingRecord() {
    // we need to find the next available processing record
    // if none is available, then create a new one
    // first, do a search for any "OPEN" processing records that have not been modified today yet.
    var filters = new Array();
    filters[filters.length] = new nlobjSearchFilter('custrecordgd_pitagprev_status', null, 'is', TAGPREV_PROCESSINGSTATUS_OPEN);
    filters[filters.length] = new nlobjSearchFilter('lastmodified', null, 'before', 'today');

    var columns = new Array(); columns[columns.length] = new nlobjSearchColumn('lastmodified').setSort();
    
    var processingResults = nlapiSearchRecord('customrecordgd_physicalinvtagpreviewproc', null, filters, null);
    
    var processingRecord = '';
    var processingRecordId = '';
    
    // Try a few times if the record has collision or record has been changed error before throwing the error.
    var maxTryCount = 10;
    var tryCount = 1;
    while(tryCount < maxTryCount) {
        try {
            if (processingResults != null && processingResults.length > 0) {
                // found a processing record that is open so load it
                processingRecordId = processingResults[0].getId();
                processingRecord = nlapiLoadRecord('customrecordgd_physicalinvtagpreviewproc', processingRecordId);
            } else {
                processingRecord = nlapiCreateRecord('customrecordgd_physicalinvtagpreviewproc'); // no processing record was found, so create a new one
            }
            
            // set the percent complete and the status.
            processingRecord.setFieldValue('custrecordgd_pitagprev_percentcomplete', 0);
            processingRecord.setFieldValue('custrecordgd_pitagprev_status', TAGPREV_PROCESSINGSTATUS_QUEUED);
            processingRecordId = nlapiSubmitRecord(processingRecord, true, false);
            
            break;
        }
        catch(err) {
            nlapiLogExecution('audit', 'err message', JSON.stringify(err));
            if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
                tryCount++;
                continue;
            }
            throw err;
        }
    }
    
    return processingRecordId;
}

/**
 * Constructs the excel string xml.
 * @param processingRecordId
 */
function GenerateExcelData(processingRecordId) {
    // Load the record and loop through the lines to construct the JSON from the line string.
    var processingRecord = nlapiLoadRecord('customrecordgd_physicalinvtagpreviewproc', processingRecordId);

    var dataString = '';
    var xmlString = '';
    
    for (var i = 1; i <= processingRecord.getLineItemCount(PROCLINE_SUBLIST); i++) {
        dataString += processingRecord.getLineItemValue(PROCLINE_SUBLIST, 'custrecordgd_pitagprevproclin_jsonstring', i);
    }

    var tagObjects = JSON.parse(dataString);
    
    xmlString += '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>' +
              '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
              'xmlns:o="urn:schemas-microsoft-com:office:office" '+
              'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
              'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ' +
              'xmlns:html="http://www.w3.org/TR/REC-html40">' +
               '<Styles>' +
                '<Style ss:ID="Default" ss:Name="Normal">' +
                 '<Alignment ss:Vertical="Bottom"/>' +
                 '<Borders/>' +
                 '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>' +
                 '<Interior/>' +
                 '<NumberFormat/>' +
                 '<Protection/>' +
                '</Style>' +
               '</Styles>' +
               '<Worksheet ss:Name="Sheet1">' +
                 '<Table>' +
                     '<Column ss:AutoFitWidth="0" ss:Width="68.25"/>' +
                     '<Column ss:AutoFitWidth="0" ss:Width="71.25"/>' +
                     '<Column ss:AutoFitWidth="0" ss:Width="238.5"/>' +
                     '<Column ss:AutoFitWidth="0" ss:Width="68.25"/>' +
                     '<Column ss:AutoFitWidth="0" ss:Width="32.25"/>' +
                     '<Column ss:AutoFitWidth="0" ss:Width="40.5"/>' +
                     '<Column ss:AutoFitWidth="0" ss:Width="87.75"/>' +
                     '<Column ss:AutoFitWidth="0" ss:Width="39"/>' +
                     '<Column ss:AutoFitWidth="0" ss:Width="67.5"/>' +
                     '<Column ss:AutoFitWidth="0" ss:Width="102"/>' +
                     '<Column ss:AutoFitWidth="0" ss:Width="90.75"/>' +
                     '<Column ss:AutoFitWidth="0" ss:Width="80.25"/>' +
                     '<Column ss:AutoFitWidth="0" ss:Width="113.25"/>' +
                     '<Column ss:AutoFitWidth="0" ss:Width="74.25"/>' +
                     '<Row>' +
                      '<Cell><Data ss:Type="String">Physical Inventory Preview By Tag</Data></Cell>' +
                     '</Row>' +
                     '<Row>' +
                      '<Cell><Data ss:Type="String">TAG #</Data></Cell>' +
                      '<Cell><Data ss:Type="String">ITEM</Data></Cell>' +
                      '<Cell><Data ss:Type="String">DESCRIPTION</Data></Cell>' +
                      '<Cell><Data ss:Type="String">COMMENTS</Data></Cell>' +
                      '<Cell><Data ss:Type="String">QTY</Data></Cell>' +
                      '<Cell><Data ss:Type="String">UOM</Data></Cell>' +
                      '<Cell><Data ss:Type="String">VENDOR PART #</Data></Cell>' +
                      '<Cell><Data ss:Type="String">COST</Data></Cell>' +
                      '<Cell><Data ss:Type="String">EXT. COST</Data></Cell>' +
                      '<Cell><Data ss:Type="String">LAST INV &amp; PURCH</Data></Cell>' +
                      '<Cell><Data ss:Type="String">PURCH LAST 3</Data></Cell>' +
                      '<Cell><Data ss:Type="String">PLANT</Data></Cell>' +
                      '<Cell><Data ss:Type="String">PLANT DEPARTMENT</Data></Cell>' +
                      '<Cell><Data ss:Type="String">IS DUPLICATE</Data></Cell>' +
                     '</Row>';
    
    // Loop through the tags line data array and set the values in the XML
    var tagNum, item, itemDesc, comments, qty, uom, vendPartNum, cost, extCost, lastInvPurch, purchLast3, plant, plantDept, isDuplicate;
    for (var i = 0; i <tagObjects.tagsLineDataArray.length; i++) { 
        tagNum = tagObjects.tagsLineDataArray[i].custpage_tagnumclean || 0;
        item = tagObjects.tagsLineDataArray[i].custpage_item || ' ';
        itemDesc = tagObjects.tagsLineDataArray[i].custpage_itemdesc || ' ';
        comments = tagObjects.tagsLineDataArray[i].custpage_comments || ' ';
        qty = tagObjects.tagsLineDataArray[i].custpage_qty || 0;
        uom = tagObjects.tagsLineDataArray[i].custpage_uom || ' ';
        vendPartNum = tagObjects.tagsLineDataArray[i].custpage_vendpartnum || ' ';
        cost = isNaN(tagObjects.tagsLineDataArray[i].custpage_cost) ? 0 : tagObjects.tagsLineDataArray[i].custpage_cost || 0
        extCost = isNaN(tagObjects.tagsLineDataArray[i].custpage_extcost) ? 0 : tagObjects.tagsLineDataArray[i].custpage_extcost || 0;
        lastInvPurch = isNaN(tagObjects.tagsLineDataArray[i].custpage_lastinvpurch)?0:tagObjects.tagsLineDataArray[i].custpage_lastinvpurch || 0;
        purchLast3 = isNaN(tagObjects.tagsLineDataArray[i].custpage_purchlast3)?0:tagObjects.tagsLineDataArray[i].custpage_purchlast3 || 0;
        plant = tagObjects.tagsLineDataArray[i].custpage_plant || ' ';
        plantDept = tagObjects.tagsLineDataArray[i].custpage_plantdept || ' ';
        isDuplicate = tagObjects.tagsLineDataArray[i].custpage_isduplicate || ' ';
        
        xmlString += '<Row>';

        xmlString += '<Cell><Data ss:Type="Number">' + tagNum + '</Data></Cell>';
        xmlString += '<Cell><Data ss:Type="String">' + item + '</Data></Cell>';
        xmlString += '<Cell><Data ss:Type="String">' + itemDesc + '</Data></Cell>';
        xmlString += '<Cell><Data ss:Type="String">' + comments + '</Data></Cell>';
        xmlString += '<Cell ss:Index="5"><Data ss:Type="Number">' + qty + '</Data></Cell>';
        xmlString += '<Cell><Data ss:Type="String">' + uom + '</Data></Cell>';
        xmlString += '<Cell><Data ss:Type="String">' + vendPartNum + '</Data></Cell>';
        xmlString += '<Cell ss:Index="8"><Data ss:Type="Number">' + cost + '</Data></Cell>';
        xmlString += '<Cell><Data ss:Type="Number">' + extCost + '</Data></Cell>';
        xmlString += '<Cell><Data ss:Type="Number">' + lastInvPurch + '</Data></Cell>';
        xmlString += '<Cell><Data ss:Type="Number">' + purchLast3 + '</Data></Cell>';
        xmlString += '<Cell><Data ss:Type="String">' + plant + '</Data></Cell>';
        xmlString += '<Cell><Data ss:Type="String">' + plantDept + '</Data></Cell>';
        xmlString += '<Cell><Data ss:Type="String">' + (isDuplicate == 'T' ? 'Yes' : 'No') + '</Data></Cell>';
        
        xmlString += '</Row>';
    }
    
    // Close the XML.
    xmlString +=
                 '</Table>' +
                 '</Worksheet>' +
                '</Workbook>';
    
    return xmlString;
}