/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

//** CONSTANTS **/
var SUBLIST_FIELD_ITEM = 'custpage_item';
var SUBLIST_FIELD_ITEMDESC = 'custpage_itemdesc';
var SUBLIST_FIELD_QTY = 'custpage_qty';
var SUBLIST_FIELD_TAGNUM = 'custpage_tagnum';
var SUBLIST_FIELD_TAGNUMCLEAN = 'custpage_tagnumclean';  //this is used only for the excel export function.
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

//Processing Record status IDs
var TAGPREV_PROCESSINGSTATUS_OPEN = 1;
var TAGPREV_PROCESSINGSTATUS_QUEUED = 2;
var TAGPREV_PROCESSINGSTATUS_PROCESSING = 3;
var TAGPREV_PROCESSINGSTATUS_COMPLETE = 4;

var LONG_TEXT_MAX_SIZE = 1000000;
/** END CONSTANTS **/

/** GLOBAL VARIABLES **/
var processingRecordId = '';
var lineIndex = 1;
var jsonStringArrayLength = 0;
var tagLineData = new Object();
var physicalInvTagItemGroupedResults = new Object();
var physicalInvTagItemResultsAllData = new Array();
var rowType = 'Odd';
/** END GLOBAL VARIABLES **/

define(['N/record', 'N/search', 'N/runtime', 'N/xml', 'N/url', 'SuiteScripts/SSLib/2.x/SSLib_Util', 'SuiteScripts/SSLib/2.x/SSLib_Task'],
/**
 * @param {record} record
 * @param {search} search
 * @param {runtime} runtime
 */
function(record, search, runtime, xml, url, SSLib_Util, SSLib_Task) {
    processingRecordId = runtime.getCurrentScript().getParameter({name: 'custscriptgd_procrecordid'});
    
    /**
     * 
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
        // Try a few times to prevent collision or record has been changed errors.
        var maxTryCount = 5;
        var curTryCount = 0;
        while(curTryCount < maxTryCount) {
            try {
                // Set the processing record to processing.
                record.submitFields({
                    type: 'customrecordgd_physicalinvtagpreviewproc',
                    id: processingRecordId,
                    values: {
                        custrecordgd_pitagprev_status: TAGPREV_PROCESSINGSTATUS_PROCESSING,
                        custrecordgd_pitagprev_percentcomplete: 0
                    }
                });
                
                break;
            } catch(err) {
                if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
                    curTryCount++;
                    continue;
                }
                
                throw err;
            }
        }
        
        var physInventoryId = runtime.getCurrentScript().getParameter({name: 'custscriptgd_physicalinvid'});
        
        var physicalInvRec = record.load({type: 'customrecordgd_physicalinventorycount', id: physInventoryId});
        
        var startTagNum = 0;
        var endTagNum = 0;
        
        // Get each location data
        var locationTagSequenceLineCount = physicalInvRec.getLineCount({sublistId: 'recmachcustrecordgd_physinvtloctag_parent'});
        var lineLocationFieldId = '';
        var index = 0;
        
        var locationHash = new Object();
        var locationDataObj = new Object();
        var currentLineLocationId = '';
        var physicalInvDateStr = physicalInvRec.getText({fieldId: 'custrecordgd_physinvtcount_date'});
        log.debug('physicalInvTagItemGroupedResults line 105 start time', new Date());
        //------------------
        // Get the grouped search of the tag lines.  This will be used to find the bad count and error tags.
        var searchObject = new Object();
        var physicalInvTagItemGroupedResultsData = search.create({
            type: 'customrecordgd_physinvttagline',
            filters: [['custrecordgd_physinvttagline_parent.custrecordgd_physinvtwrksht_date', 'on', physicalInvDateStr], 'AND',
                      ['isinactive', 'is', 'F']], //'AND',
                      //['custrecordgd_physinvttagline_parent.custrecordgd_physinvtwrksht_plant', 'anyof', locationId]],
            columns: [search.createColumn({name: 'custrecordgd_physinvttagline_quantity', summary: 'sum'}),
                      search.createColumn({name: 'custrecordgd_physinvttagline_lastinvpurc', summary: 'group'}),
                      search.createColumn({name: 'custrecordgd_physinvttagline_purchlast3', summary: 'group'}),
                      search.createColumn({name: 'custrecordgd_physinvtwrksht_plant', join: 'custrecordgd_physinvttagline_parent', summary: 'group'}),
                      search.createColumn({name: 'type', join: 'custrecordgd_physinvttagline_item', summary: 'group'}),
                      search.createColumn({name: 'internalid', join: 'custrecordgd_physinvttagline_item', summary: 'group'}),
                      search.createColumn({name: 'internalid', summary: 'group', sort: search.Sort.ASC})]
        }).runPaged({pageSize: 1000});
        physicalInvTagItemGroupedResultsData.pageRanges.forEach(function(pageRange) {
            physicalInvTagItemGroupedResultsData.fetch({index: pageRange.index}).data.forEach(function(result) {
                searchObject.custrecordgd_physinvttagline_quantity = result.getValue({name: 'custrecordgd_physinvttagline_quantity', summary: 'sum'});
                searchObject.custrecordgd_physinvttagline_lastinvpurc = result.getValue({name: 'custrecordgd_physinvttagline_lastinvpurc', summary: 'group'});
                searchObject.custrecordgd_physinvttagline_purchlast3 = result.getValue({name: 'custrecordgd_physinvttagline_purchlast3', summary: 'group'});
                searchObject.custrecordgd_physinvtwrksht_plant = result.getValue({name: 'custrecordgd_physinvtwrksht_plant', join: 'custrecordgd_physinvttagline_parent', summary: 'group'});
                searchObject.custrecordgd_physinvttagline_itemtype = result.getValue({name: 'type', join: 'custrecordgd_physinvttagline_item', summary: 'group'});
                searchObject.custrecordgd_physinvttagline_itemid = result.getValue({name: 'internalid', join: 'custrecordgd_physinvttagline_item', summary: 'group'});
                searchObject.internalid = result.getValue({name: 'internalid', summary: 'group'});
//                physicalInvTagItemGroupedResults.push(searchObject);
                physicalInvTagItemGroupedResults['"' + searchObject.custrecordgd_physinvttagline_itemid + searchObject.custrecordgd_physinvtwrksht_plant + '"'] = searchObject;
                searchObject = {};
            });
        });
        log.debug('physicalInvTagItemGroupedResults line 136 end time', new Date());
        //------------------
        log.debug('physicalInvTagItemGroupedResults line 138 jsonstring', JSON.stringify(physicalInvTagItemGroupedResults));
        //------------------
        //Get the tag lines to iterate through it and construct the sublist with the tags.
        // Add limits to the tag numbers by start tag num and end tag nums, any numbers outside of these restrictions are not added to the preview.
        var searchObject = new Object();
        var physicalInvTagItemData = search.create({
            type: 'customrecordgd_physinvttagline',
            filters: [['custrecordgd_physinvttagline_parent.custrecordgd_physinvtwrksht_date', 'on', physicalInvDateStr], 'AND',
                      ['isinactive', 'is', 'F']],//, 'AND',
//                      ['custrecordgd_physinvttagline_parent.custrecordgd_physinvtwrksht_plant', 'anyof', locationId], 'AND',
//                      ['formulanumeric: TO_NUMBER({custrecordgd_physinvttagline_tagnum})', 'greaterthanorequalto', physicalInvStartTagNum], 'AND',
//                      ['formulanumeric: TO_NUMBER({custrecordgd_physinvttagline_tagnum})', 'lessthanorequalto', physicalInvEndTagNum]],
            columns: [search.createColumn({name: 'custrecordgd_physinvttagline_item'}),
                      search.createColumn({name: 'custrecordgd_physinvttagline_description'}),
                      search.createColumn({name: 'custrecordgd_physinvttagline_comments'}),
                      search.createColumn({name: 'custrecordgd_physinvttagline_purchuom'}),
                      search.createColumn({name: 'custrecordgd_physinvttagline_quantity'}),
                      search.createColumn({name: 'custrecordgd_physinvttagline_tagnum', sort: search.Sort.ASC}),
                      search.createColumn({name: 'custrecordgd_physinvttagline_vendpartnum'}),
                      search.createColumn({name: 'custrecordgd_physinvtwrksht_plant', join: 'custrecordgd_physinvttagline_parent'}),
                      search.createColumn({name: 'custrecordgd_physinvtwrksht_plantdept', join: 'custrecordgd_physinvttagline_parent'}),
                      search.createColumn({name: 'custrecordgd_physinvttagline_cost'}),
                      search.createColumn({name: 'custrecordgd_physinvttagline_extendcost'}),
                      search.createColumn({name: 'custrecordgd_physinvttagline_parent'}),
                      search.createColumn({name: 'custrecordgd_physinvttagline_lastinvpurc'}),
                      search.createColumn({name: 'custrecordgd_physinvttagline_purchlast3'}),
                      search.createColumn({name: 'internalid', join: 'custrecordgd_physinvttagline_parent'}),
                      search.createColumn({name: 'custrecordgd_physinvtwrksht_date', join: 'custrecordgd_physinvttagline_parent'})]
        }).runPaged({pageSize: 1000});
        physicalInvTagItemData.pageRanges.forEach(function(pageRange) {
            physicalInvTagItemData.fetch({index: pageRange.index}).data.forEach(function(result) {
                searchObject.custrecordgd_physinvttagline_item = result.getValue({name: 'custrecordgd_physinvttagline_item'});
                searchObject.custrecordgd_physinvttagline_itemtext = result.getText({name: 'custrecordgd_physinvttagline_item'});
                searchObject.custrecordgd_physinvttagline_description = result.getValue({name: 'custrecordgd_physinvttagline_description'});
                searchObject.custrecordgd_physinvttagline_comments = result.getValue({name: 'custrecordgd_physinvttagline_comments'});
                searchObject.custrecordgd_physinvttagline_purchuom = result.getValue({name: 'custrecordgd_physinvttagline_purchuom'});
                searchObject.custrecordgd_physinvttagline_purchuomtext = result.getText({name: 'custrecordgd_physinvttagline_purchuom'});
                searchObject.custrecordgd_physinvttagline_quantity = result.getValue({name: 'custrecordgd_physinvttagline_quantity'});
                searchObject.custrecordgd_physinvttagline_tagnum = result.getValue({name: 'custrecordgd_physinvttagline_tagnum'});
                searchObject.custrecordgd_physinvttagline_vendpartnum = result.getValue({name: 'custrecordgd_physinvttagline_vendpartnum'});
                searchObject.custrecordgd_physinvtwrksht_plant = result.getValue({name: 'custrecordgd_physinvtwrksht_plant', join: 'custrecordgd_physinvttagline_parent'});
                searchObject.custrecordgd_physinvtwrksht_plantdept = result.getValue({name: 'custrecordgd_physinvtwrksht_plantdept', join: 'custrecordgd_physinvttagline_parent'});
                searchObject.custrecordgd_physinvtwrksht_planttext = result.getText({name: 'custrecordgd_physinvtwrksht_plant', join: 'custrecordgd_physinvttagline_parent'});
                searchObject.custrecordgd_physinvtwrksht_plantdepttext = result.getText({name: 'custrecordgd_physinvtwrksht_plantdept', join: 'custrecordgd_physinvttagline_parent'});
                searchObject.custrecordgd_physinvttagline_cost = result.getValue({name: 'custrecordgd_physinvttagline_cost'});
                searchObject.custrecordgd_physinvttagline_extendcost = result.getValue({name: 'custrecordgd_physinvttagline_extendcost'});
                searchObject.custrecordgd_physinvttagline_parent = result.getValue({name: 'custrecordgd_physinvttagline_parent'});
                searchObject.custrecordgd_physinvttagline_lastinvpurc = result.getValue({name: 'custrecordgd_physinvttagline_lastinvpurc'});
                searchObject.custrecordgd_physinvttagline_purchlast3 = result.getValue({name: 'custrecordgd_physinvttagline_purchlast3'});
                searchObject.custrecordgd_physinvttagline_parentid = result.getValue({name: 'internalid', join: 'custrecordgd_physinvttagline_parent'});
                searchObject.custrecordgd_physinvtwrksht_date = result.getValue({name: 'custrecordgd_physinvtwrksht_date', join: 'custrecordgd_physinvttagline_parent'});
                physicalInvTagItemResultsAllData.push(searchObject);
                searchObject = {};
            });
        });
        //------------------
        
        //Use a search to get all the tag sequence location so we can sort them by start tag, this way, when the tags are set on the page, they are in ascending order
        // this order assumes there aren't any overlapping tag numbers between tag sequence locations.
        var locationTagSequencePageData = search.create({
            type: 'customrecordgd_physinventloctags',
            filters: [
                      ['custrecordgd_physinvtloctag_parent', 'anyof', physInventoryId]
                     ],
            columns: [
                      search.createColumn({name: 'custrecordgd_physinvtloctag_plant'}),
                      search.createColumn({name: 'custrecordgd_physinvtloctag_starttag', sort: search.Sort.ASC}),
                      search.createColumn({name: 'custrecordgd_physinvtloctag_endtag'})
                     ]
         })
        // Construct one large search results in case it is paged.
        var locationTagSequenceResults = new Array();
        var count = 1000;
        var startIndex = 0;
        var endIndex = 1000;
        var resultSet = locationTagSequencePageData.run();
        var results = new Array();
        var resultsString = '';
        var resultsStringToProcess = '';
        while (count == 1000) {
            results = resultSet.getRange(startIndex, endIndex);
            resultsStringToProcess = JSON.stringify(results);
            if (endIndex == 1000) {
                resultsString += resultsStringToProcess.substring(0, resultsStringToProcess.length - 1);
            } else {
                resultsString +=  ',' + resultsStringToProcess.substring(1, resultsStringToProcess.length - 1);
            }
            startIndex = endIndex;
            endIndex += 1000;
            count = results.length;
        }
        locationTagSequenceResults = JSON.parse(resultsString + ']');
        // Set the tags in a JSON Array with missing, bad count and error grouped tags for the preview.
        for (var i = 0; i < locationTagSequenceResults.length; i++) {
            // pass the location id for processing one location sequence at a time.
//            currentLineLocationId = locationTagSequenceResults[i].getValue({name: 'custrecordgd_physinvtloctag_plant'}) || 0;
            currentLineLocationId = locationTagSequenceResults[i].values.custrecordgd_physinvtloctag_plant[0].value || 0;
            //Set the data on the object
            locationDataObj = {};
//            locationDataObj['startTagNum'] = locationTagSequenceResults[i].getValue({name: 'custrecordgd_physinvtloctag_starttag'}) || 0;
            locationDataObj['startTagNum'] = locationTagSequenceResults[i].values.custrecordgd_physinvtloctag_starttag || 0;
//            locationDataObj['endTagNum'] = locationTagSequenceResults[i].getValue({name: 'custrecordgd_physinvtloctag_endtag'}) || 0;
            locationDataObj['endTagNum'] = locationTagSequenceResults[i].values.custrecordgd_physinvtloctag_endtag || 0;
            locationDataObj['physicalInvDateStr'] = physicalInvDateStr;
            locationDataObj['processingRecordId'] = processingRecordId;
            locationDataObj['locationSequence'] = i;
            locationDataObj['locationCount'] = locationTagSequenceLineCount;
            log.debug('Build line 245 start time', new Date());
            BuildPhysicalInventoryTagItemSublistAndReturnMissingTags_MR(locationDataObj, currentLineLocationId);
            log.debug('Build line 247 end time', new Date());
        }

        var textJSON = JSON.stringify(tagLineData);
        // Get the string and divide into separate sections of 1M characters each and set it into an array.
        var tagLineDataStrArray = new Array();
        log.debug('textJSON.length', textJSON.length);
        // This line creates an array of strings with each array element at most 1M characters in size as this is the long text max.
        var count = LONG_TEXT_MAX_SIZE;
        var startIndex = 0;
        var endIndex = LONG_TEXT_MAX_SIZE;
        var resultsStr = '';
        while (count == LONG_TEXT_MAX_SIZE) {
            resultsStr = textJSON.substring(startIndex, endIndex);
            tagLineDataStrArray.push(resultsStr);
            startIndex = endIndex;
            endIndex += LONG_TEXT_MAX_SIZE;
            count = resultsStr.length;
        }

        jsonStringArrayLength = tagLineDataStrArray.length; log.debug('jsonStringArrayLength', jsonStringArrayLength);
        var processingRecord = record.load({type: 'customrecordgd_physicalinvtagpreviewproc', id: processingRecordId});
        // Remove all the lines on the processing record so that it is clear from adding new lines.
        for (var i = processingRecord.getLineCount({sublistId: 'recmachcustrecordgd_pitagprevproclin_procrecord'}) - 1; i >= 0; i--) {
            processingRecord.removeLine({sublistId: 'recmachcustrecordgd_pitagprevproclin_procrecord', line: i});
        }
        
        return tagLineDataStrArray;
    }

    /**
     * Submit each of the key/value pairs in the dictionary.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
        var jsonStr = context.value;
        
    	var processingLineRecord = null;
    	var processingRecord = null;
    	var percentage = 0;
    	// Try a few times to prevent collision or record has been changed errors.
        var maxTryCount = 10;
        var curTryCount = 0;
        while(curTryCount < maxTryCount) {
            try {
                // Get the percentage
                percentage += (parseInt(context.key) / parseInt(jsonStringArrayLength) * 100);
                // Set the JSON string on a new line in the processing record.
                processingRecord = record.load({type: 'customrecordgd_physicalinvtagpreviewproc', id: processingRecordId, isDynamic: true});
                processingRecord.selectNewLine({sublistId: 'recmachcustrecordgd_pitagprevproclin_procrecord'});
                processingRecord.setCurrentSublistValue({sublistId: 'recmachcustrecordgd_pitagprevproclin_procrecord', fieldId: 'custrecordgd_pitagprevproclin_jsonstring', value: jsonStr});
                processingRecord.commitLine({sublistId: 'recmachcustrecordgd_pitagprevproclin_procrecord'});
                processingRecord.setValue({fieldId: 'custrecordgd_pitagprev_percentcomplete', value: percentage});
                processingRecord.save();
                log.debug('pecentage', percentage);
                break;
            } catch(err) {
                if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
                    curTryCount++;
                    continue;
                }
                
                throw err;
            }
        }
        log.debug('out of while loop', context.key);
    }

    
    /**
     * 
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
        //Update the processing record to status complete and 100% processing percentage.
        record.submitFields({
            type: 'customrecordgd_physicalinvtagpreviewproc',
            id: processingRecordId,
            values: {
                custrecordgd_pitagprev_status: TAGPREV_PROCESSINGSTATUS_COMPLETE,
                custrecordgd_pitagprev_percentcomplete: 100
            }
        });
        
        // Get processing records not modified today and set the status to open.
        // only process up to 20 to keep from slowing down this map-reduce.
        var completedProcessingRecordResults = search.create({
            type: 'customrecordgd_physicalinvtagpreviewproc',
            filters: [['custrecordgd_pitagprev_status', 'noneof', TAGPREV_PROCESSINGSTATUS_OPEN], 'AND',
                      ['lastmodified', 'before', 'today']],
            columns: [search.createColumn({name: 'lastmodified', sort: search.Sort.ASC})]
        }).run().getRange({
            start: 0,
            end: 20
        }) || [];
        
        for(var i = 0; i < completedProcessingRecordResults.length; i++) {
            record.submitFields({
                type: 'customrecordgd_physicalinvtagpreviewproc',
                id: completedProcessingRecordResults[i].id,
                values: {
                    custrecordgd_pitagprev_status: TAGPREV_PROCESSINGSTATUS_OPEN,
                    custrecordgd_pitagprev_percentcomplete: 0
                }
            });
        }
    }
    
    /**
     * Build Physical Inventory Tags Sublist and return missing tag numbers as an array.
     * @param form
     * @param physicalInvDateStr
     * @param startTagNum
     * @param endTagNum
     */
    function BuildPhysicalInventoryTagItemSublistAndReturnMissingTags_MR(locationData, locationId) {
        var physicalInvDateStr = locationData.physicalInvDateStr;
        var physicalInvStartTagNum = locationData.startTagNum;
        var physicalInvEndTagNum = locationData.endTagNum;
        processingRecordId = locationData.processingRecordId;
        var locationSequence = locationData.locationSequence;
        var locationCount = locationData.locationCount;
        var tagNumText = '';
        var lineObject = new Object();
        var isDuplicate = '';

        var processingRecord = record.load({type: 'customrecordgd_physicalinvtagpreviewproc', id: processingRecordId});
        // On first location processed, initiate
        if (locationSequence == 0) {
//            tagLineData['missingTagArray'] = new Array();
            tagLineData['missingTagString'] = '';
//            tagLineData['errorTagArray'] = new Array();
            tagLineData['errorTagString'] = '';
//            tagLineData['badCountArray'] = new Array();
            tagLineData['badCountString'] = '';
//            tagLineData['tagsLineDataArray'] = new Array();
            tagLineData['tagsLineDataString'] = '';
            tagLineData['tagsLineDataExcelString'] = '';
        }
        
        log.debug('physicalInvTagItemResults line 380 start time loc: ' + locationId, new Date());
        //Get the tag lines to iterate through it and construct the sublist with the tags.
        // Add limits to the tag numbers by start tag num and end tag nums, any numbers outside of these restrictions are not added to the preview.
        var physicalInvTagItemResults = new Array(); // TODO: Need to verify sorting of the results from the filter is still sorted by tag number.
        physicalInvTagItemResults = physicalInvTagItemResultsAllData.filter(function(data){return (data.custrecordgd_physinvtwrksht_plant == locationId && data.custrecordgd_physinvttagline_tagnum >= physicalInvStartTagNum && data.custrecordgd_physinvttagline_tagnum <=physicalInvEndTagNum);}) || [];
        log.debug('physicalInvTagItemResults line 385 end time loc: ' + locationId, new Date());
//        var searchObject = new Object();
//        var physicalInvTagItemData = search.create({
//            type: 'customrecordgd_physinvttagline',
//            filters: [['custrecordgd_physinvttagline_parent.custrecordgd_physinvtwrksht_date', 'on', physicalInvDateStr], 'AND',
//                      ['isinactive', 'is', 'F'], 'AND',
//                      ['custrecordgd_physinvttagline_parent.custrecordgd_physinvtwrksht_plant', 'anyof', locationId], 'AND',
//                      ['formulanumeric: TO_NUMBER({custrecordgd_physinvttagline_tagnum})', 'greaterthanorequalto', physicalInvStartTagNum], 'AND',
//                      ['formulanumeric: TO_NUMBER({custrecordgd_physinvttagline_tagnum})', 'lessthanorequalto', physicalInvEndTagNum]],
//            columns: [search.createColumn({name: 'custrecordgd_physinvttagline_item'}),
//                      search.createColumn({name: 'custrecordgd_physinvttagline_description'}),
//                      search.createColumn({name: 'custrecordgd_physinvttagline_comments'}),
//                      search.createColumn({name: 'custrecordgd_physinvttagline_purchuom'}),
//                      search.createColumn({name: 'custrecordgd_physinvttagline_quantity'}),
//                      search.createColumn({name: 'custrecordgd_physinvttagline_tagnum', sort: search.Sort.ASC}),
//                      search.createColumn({name: 'custrecordgd_physinvttagline_vendpartnum'}),
//                      search.createColumn({name: 'custrecordgd_physinvtwrksht_plant', join: 'custrecordgd_physinvttagline_parent'}),
//                      search.createColumn({name: 'custrecordgd_physinvtwrksht_plantdept', join: 'custrecordgd_physinvttagline_parent'}),
//                      search.createColumn({name: 'custrecordgd_physinvttagline_cost'}),
//                      search.createColumn({name: 'custrecordgd_physinvttagline_extendcost'}),
//                      search.createColumn({name: 'custrecordgd_physinvttagline_parent'}),
//                      search.createColumn({name: 'custrecordgd_physinvttagline_lastinvpurc'}),
//                      search.createColumn({name: 'custrecordgd_physinvttagline_purchlast3'}),
//                      search.createColumn({name: 'internalid', join: 'custrecordgd_physinvttagline_parent'}),
//                      search.createColumn({name: 'custrecordgd_physinvtwrksht_date', join: 'custrecordgd_physinvttagline_parent'})]
//        }).runPaged({pageSize: 1000});
//        physicalInvTagItemData.pageRanges.forEach(function(pageRange) {
//            physicalInvTagItemData.fetch({index: pageRange.index}).data.forEach(function(result) {
//                searchObject.custrecordgd_physinvttagline_item = result.getValue({name: 'custrecordgd_physinvttagline_item'});
//                searchObject.custrecordgd_physinvttagline_itemtext = result.getText({name: 'custrecordgd_physinvttagline_item'});
//                searchObject.custrecordgd_physinvttagline_description = result.getValue({name: 'custrecordgd_physinvttagline_description'});
//                searchObject.custrecordgd_physinvttagline_comments = result.getValue({name: 'custrecordgd_physinvttagline_comments'});
//                searchObject.custrecordgd_physinvttagline_purchuom = result.getValue({name: 'custrecordgd_physinvttagline_purchuom'});
//                searchObject.custrecordgd_physinvttagline_purchuomtext = result.getText({name: 'custrecordgd_physinvttagline_purchuom'});
//                searchObject.custrecordgd_physinvttagline_quantity = result.getValue({name: 'custrecordgd_physinvttagline_quantity'});
//                searchObject.custrecordgd_physinvttagline_tagnum = result.getValue({name: 'custrecordgd_physinvttagline_tagnum'});
//                searchObject.custrecordgd_physinvttagline_vendpartnum = result.getValue({name: 'custrecordgd_physinvttagline_vendpartnum'});
//                searchObject.custrecordgd_physinvtwrksht_plant = result.getValue({name: 'custrecordgd_physinvtwrksht_plant', join: 'custrecordgd_physinvttagline_parent'});
//                searchObject.custrecordgd_physinvtwrksht_plantdept = result.getValue({name: 'custrecordgd_physinvtwrksht_plantdept', join: 'custrecordgd_physinvttagline_parent'});
//                searchObject.custrecordgd_physinvtwrksht_planttext = result.getText({name: 'custrecordgd_physinvtwrksht_plant', join: 'custrecordgd_physinvttagline_parent'});
//                searchObject.custrecordgd_physinvtwrksht_plantdepttext = result.getText({name: 'custrecordgd_physinvtwrksht_plantdept', join: 'custrecordgd_physinvttagline_parent'});
//                searchObject.custrecordgd_physinvttagline_cost = result.getValue({name: 'custrecordgd_physinvttagline_cost'});
//                searchObject.custrecordgd_physinvttagline_extendcost = result.getValue({name: 'custrecordgd_physinvttagline_extendcost'});
//                searchObject.custrecordgd_physinvttagline_parent = result.getValue({name: 'custrecordgd_physinvttagline_parent'});
//                searchObject.custrecordgd_physinvttagline_lastinvpurc = result.getValue({name: 'custrecordgd_physinvttagline_lastinvpurc'});
//                searchObject.custrecordgd_physinvttagline_purchlast3 = result.getValue({name: 'custrecordgd_physinvttagline_purchlast3'});
//                searchObject.custrecordgd_physinvttagline_parentid = result.getValue({name: 'internalid', join: 'custrecordgd_physinvttagline_parent'});
//                searchObject.custrecordgd_physinvtwrksht_date = result.getValue({name: 'custrecordgd_physinvtwrksht_date', join: 'custrecordgd_physinvttagline_parent'});
//                physicalInvTagItemResults.push(searchObject);
//                searchObject = {};
//            });
//        });
        
        // Construct one large search results in case it is paged.
        
//        var count = 1000;
//        var startIndex = 0;
//        var endIndex = 1000;
//        var resultSet = physicalInvTagItemData.run();
//        var results = new Array();
//        var resultsString = '';
//        while (count == 1000) {
//            results = resultSet.getRange(startIndex, endIndex);
//            resultsStringToProcess = JSON.stringify(results);
//            if (endIndex == 1000) {
//                resultsString += resultsStringToProcess.substring(0, resultsStringToProcess.length - 1);
//            } else {
//                resultsString +=  ',' + resultsStringToProcess.substring(1, resultsStringToProcess.length - 1);
//            }
//            rsultsString += JSON.stringify(results);
//            Array.prototype.push.apply(physicalInvTagItemResults, results);
//            physicalInvTagItemResults = physicalInvTagItemResults.concat(results);
//            startIndex = endIndex;
//            endIndex += 1000;
//            count = results.length;
//        }
//        physicalInvTagItemResults = JSON.parse(resultsString + ']');
//        log.debug('physicalInvTagItemResults line 403 end time', new Date());
        // If tag results were found go through them and check if there are any missing, bad count, or error tags.
        log.debug('physicalInvTagItemResults.length line 464 loc: ' + locationId, physicalInvTagItemResults.length);
        if(physicalInvTagItemResults != null && physicalInvTagItemResults.length > 0) {
            var calculatedTagNum = 0;   
            var tagNum, item, itemDesc, comments, qty, uom, vendPartNum, cost, extCost, lastInvPurch, purchLast3, plant, plantDept, isDuplicate;
            var currentTagNum = physicalInvTagItemResults[0].custrecordgd_physinvttagline_tagnum; //This should be the lowest startTag Number since the results is sorted.

            var startTagNum = currentTagNum; //Start processing this tag number
            
            var worksheetId = '';
            
            //If we are missing some start tags based on the Physical Inventory startTag field, 
            //process them and add to the missing tag array.
            if(currentTagNum < physicalInvStartTagNum) {
                // This scenario should not happen, but if it does, add the missing tags between the current tag num and the start tag number so users can see tags that are outside of the start and end tags.
                for(var m = currentTagNum; m < physicalInvStartTagNum; m++) {
                    tagNumText = '<div style="font-weight:bold;">' + m + '</div>';

//                    tagLineData.missingTagArray[tagLineData.missingTagArray.length] = m;
                    tagLineData.missingTagString += 'Tag #: ' + m + '<br />';
                    
                    lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                    lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = parseInt(m);
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
                    
//                    tagLineData.tagsLineDataArray.push(lineObject);

                        tagNum = lineObject[SUBLIST_FIELD_TAGNUMCLEAN] || '';
                        item = lineObject[SUBLIST_FIELD_ITEM] || '';
                        itemDesc = lineObject[SUBLIST_FIELD_ITEMDESC] || '';
                        comments = lineObject[SUBLIST_FIELD_COMMENTS] || '';
                        qty = lineObject[SUBLIST_FIELD_QTY] || '';
                        uom = lineObject[SUBLIST_FIELD_UOM] || '';
                        vendPartNum = lineObject[SUBLIST_FIELD_VENDORPARTNUM] || '';
                        cost = lineObject[SUBLIST_FIELD_COST] || '';
                        extCost = isNaN(lineObject[SUBLIST_FIELD_EXTCOST]) ? 0 : lineObject[SUBLIST_FIELD_EXTCOST] || '';
                        lastInvPurch = lineObject[SUBLIST_FIELD_LASTINVANDPURCH] || '';
                        purchLast3 = lineObject[SUBLIST_FIELD_PURCHLASTTHREE] || '';
                        plant = lineObject[SUBLIST_FIELD_PLANT] || '';
                        plantDept = lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] || '';
                        isDuplicate = lineObject[SUBLIST_FIELD_ISDUPLICATE] || '';
                        
                        tagLineData.tagsLineDataExcelString += '<Row>';

                        // Create the tag line for the Excel printout.
                        // The cells only need to be added in the XML if there are actual values in there.
                        if (tagNum != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + tagNum + '</Data></Cell>';
                        if (item != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + item + '</Data></Cell>';
                        if (itemDesc != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + itemDesc + '</Data></Cell>';
                        if (comments != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + comments + '</Data></Cell>';
                        if (qty != '')
                            tagLineData.tagsLineDataExcelString += '<Cell ss:Index="5"><Data ss:Type="Number">' + qty + '</Data></Cell>';
                        if (uom != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + uom + '</Data></Cell>';
                        if (vendPartNum != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + vendPartNum + '</Data></Cell>';
                        if (cost != '')
                            tagLineData.tagsLineDataExcelString += '<Cell ss:Index="8"><Data ss:Type="Number">' + cost + '</Data></Cell>';
                        if (extCost != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + extCost + '</Data></Cell>';
                        if (lastInvPurch != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + lastInvPurch + '</Data></Cell>';
                        if (purchLast3 != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + purchLast3 + '</Data></Cell>';
                        if (plant != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plant + '</Data></Cell>';
                        if (plantDept != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plantDept + '</Data></Cell>';
                        if (isDuplicate != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + (isDuplicate == 'T' ? 'Yes' : 'No') + '</Data></Cell>';
                        
                        tagLineData.tagsLineDataExcelString += '</Row>';
                    
                    
//                    if (i % 2 == 0)
//                        rowType = 'odd';
//                    else
//                        rowType = 'even';
                    
                    if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'T')
                        isDuplicate = 'Yes';
                    else if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'F')
                        isDuplicate = 'No';
                    else
                        isDuplicate = '';
                    tagLineData.tagsLineDataString += 
                                      '<tr class="uir-list-row-tr uir-list-row-' + rowType + '">' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_TAGNUM] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEM] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEMDESC] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COMMENTS] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_QTY] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_UOM] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_VENDORPARTNUM] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COST] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_EXTCOST] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_LASTINVANDPURCH] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PURCHLASTTHREE] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANT] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlctr' + ' ' + lineObject['bgcolorclass'] + '">' + isDuplicate + '</td>' +
                                      '</tr>';
                    
                    rowType = rowType == 'odd' ? 'even' : 'odd';

                    lineObject = {};
                    
                    lineIndex++;
                }
                
                startTagNum = physicalInvStartTagNum; //now set startTagNum to be the same as the physical inv start tag #
            } else if(currentTagNum > physicalInvStartTagNum) {
                // Add all tags between the start tag and the current tag numbers into the missing tag array.
                for(var m = physicalInvStartTagNum; m < currentTagNum; m++) {
                    tagNumText = '<div style="font-weight:bold;">' + m + '</div>';
//                    tagLineData.missingTagArray[tagLineData.missingTagArray.length] = m;
                    tagLineData.missingTagString += 'Tag #: ' + m + '<br />';
                    
                    lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                    lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = parseInt(m);
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
                    
//                    tagLineData.tagsLineDataArray.push(lineObject);
                    
                    // Create the tag line for the Excel printout.
                    // The cells only need to be added in the XML if there are actual values in there.
                    if (tagNum != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + tagNum + '</Data></Cell>';
                    if (item != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + item + '</Data></Cell>';
                    if (itemDesc != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + itemDesc + '</Data></Cell>';
                    if (comments != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + comments + '</Data></Cell>';
                    if (qty != '')
                        tagLineData.tagsLineDataExcelString += '<Cell ss:Index="5"><Data ss:Type="Number">' + qty + '</Data></Cell>';
                    if (uom != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + uom + '</Data></Cell>';
                    if (vendPartNum != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + vendPartNum + '</Data></Cell>';
                    if (cost != '')
                        tagLineData.tagsLineDataExcelString += '<Cell ss:Index="8"><Data ss:Type="Number">' + cost + '</Data></Cell>';
                    if (extCost != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + extCost + '</Data></Cell>';
                    if (lastInvPurch != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + lastInvPurch + '</Data></Cell>';
                    if (purchLast3 != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + purchLast3 + '</Data></Cell>';
                    if (plant != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plant + '</Data></Cell>';
                    if (plantDept != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plantDept + '</Data></Cell>';
                    if (isDuplicate != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + (isDuplicate == 'T' ? 'Yes' : 'No') + '</Data></Cell>';
                    
                    tagLineData.tagsLineDataExcelString += '</Row>';
                    
                    // Create the line item tags for the table to be shown on the page.
                    if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'T')
                        isDuplicate = 'Yes';
                    else if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'F')
                        isDuplicate = 'No';
                    else
                        isDuplicate = '';
                    tagLineData.tagsLineDataString += 
                                      '<tr class="uir-list-row-tr uir-list-row-' + rowType + '">' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_TAGNUM] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEM] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEMDESC] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COMMENTS] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_QTY] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_UOM] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_VENDORPARTNUM] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COST] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_EXTCOST] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_LASTINVANDPURCH] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PURCHLASTTHREE] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANT] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlctr' + ' ' + lineObject['bgcolorclass'] + '">' + isDuplicate + '</td>' +
                                      '</tr>';
                    
                    rowType = rowType == 'odd' ? 'even' : 'odd';
                    
                    lineObject = {};
                    
                    lineIndex++;
                }
                
                startTagNum = currentTagNum; //now set startTagNum to be the same as the current tag #      
            }
            
            var previousTagNum = 0;
            var incrementCalculatedTagNumber = true; //store whether or not to increment calculatedTagNum variable.
            var iteration = 0;
            log.debug('for loop physicalInvTagItemResults line 542 start time len: ' + physicalInvTagItemResults.length + ' | locationId: ' + locationId, new Date());
            //Process Physical Inventory Tag Items.
            for (var i = 0; i < physicalInvTagItemResults.length; i++) {

                currentTagNum = ConvertValueToInt(physicalInvTagItemResults[i].custrecordgd_physinvttagline_tagnum);

                worksheetId = physicalInvTagItemResults[i].custrecordgd_physinvttagline_parentid;

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
                                    
                    var item = ConvertValueToString(physicalInvTagItemResults[i].custrecordgd_physinvttagline_itemtext);
                    var itemId = physicalInvTagItemResults[i].custrecordgd_physinvttagline_item;
                    var description = ConvertValueToString(physicalInvTagItemResults[i].custrecordgd_physinvttagline_description);
                    var qty = physicalInvTagItemResults[i].custrecordgd_physinvttagline_quantity;   
                    var uom = ConvertValueToString(physicalInvTagItemResults[i].custrecordgd_physinvttagline_purchuomtext);
                    var cost = physicalInvTagItemResults[i].custrecordgd_physinvttagline_cost;
                    
                    var comments = ConvertValueToString(physicalInvTagItemResults[i].custrecordgd_physinvttagline_comments);
                    var vendorPartNum = ConvertValueToString(physicalInvTagItemResults[i].custrecordgd_physinvttagline_vendpartnum);
                    var extendedCost = physicalInvTagItemResults[i].custrecordgd_physinvttagline_extendcost;
                    var lastInvAndPurch = physicalInvTagItemResults[i].custrecordgd_physinvttagline_lastinvpurc;
                    var purchLast3 = physicalInvTagItemResults[i].custrecordgd_physinvttagline_purchlast3;
                    var plant = ConvertValueToString(physicalInvTagItemResults[i].custrecordgd_physinvtwrksht_planttext);
                    var plantDepartment = ConvertValueToString(physicalInvTagItemResults[i].custrecordgd_physinvtwrksht_plantdepttext); 

                    //tag # does not match the calculated one, or tag number is greater than the Physical Inventory End Tag #.
                    //we need to process missing tags appropriately. we have different scnerios that need to be handled in this case.
                    if(currentTagNum != calculatedTagNum || currentTagNum > physicalInvEndTagNum) {
                        //currentTagNum is greater than the physical Inventory End Tag #, add a missing tag.
                        if(currentTagNum > physicalInvEndTagNum) {
                            tagNumText = '<div style="font-weight:bold;">' + calculatedTagNum + '</div>';

//                            tagLineData.missingTagArray[tagLineData.missingTagArray.length] = calculatedTagNum; 
                            tagLineData.missingTagString += 'Tag #: ' + calculatedTagNum + '<br />';
                            
                            lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                            lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = parseInt(calculatedTagNum);
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
                            
//                            tagLineData.tagsLineDataArray.push(lineObject);
                            
                            // Create the tag line for the Excel printout.
                            // The cells only need to be added in the XML if there are actual values in there.
                            if (tagNum != '')
                                tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + tagNum + '</Data></Cell>';
                            if (item != '')
                                tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + item + '</Data></Cell>';
                            if (itemDesc != '')
                                tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + itemDesc + '</Data></Cell>';
                            if (comments != '')
                                tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + comments + '</Data></Cell>';
                            if (qty != '')
                                tagLineData.tagsLineDataExcelString += '<Cell ss:Index="5"><Data ss:Type="Number">' + qty + '</Data></Cell>';
                            if (uom != '')
                                tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + uom + '</Data></Cell>';
                            if (vendPartNum != '')
                                tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + vendPartNum + '</Data></Cell>';
                            if (cost != '')
                                tagLineData.tagsLineDataExcelString += '<Cell ss:Index="8"><Data ss:Type="Number">' + cost + '</Data></Cell>';
                            if (extCost != '')
                                tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + extCost + '</Data></Cell>';
                            if (lastInvPurch != '')
                                tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + lastInvPurch + '</Data></Cell>';
                            if (purchLast3 != '')
                                tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + purchLast3 + '</Data></Cell>';
                            if (plant != '')
                                tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plant + '</Data></Cell>';
                            if (plantDept != '')
                                tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plantDept + '</Data></Cell>';
                            if (isDuplicate != '')
                                tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + (isDuplicate == 'T' ? 'Yes' : 'No') + '</Data></Cell>';
                            
                            tagLineData.tagsLineDataExcelString += '</Row>';
                            
                            // Create the line item tags for the table to be shown on the page.
                            if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'T')
                                isDuplicate = 'Yes';
                            else if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'F')
                                isDuplicate = 'No';
                            else
                                isDuplicate = '';
                            tagLineData.tagsLineDataString += 
                                              '<tr class="uir-list-row-tr uir-list-row-' + rowType + '">' +
                                                '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_TAGNUM] + '</td>' +
                                                '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEM] + '</td>' +
                                                '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEMDESC] + '</td>' +
                                                '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COMMENTS] + '</td>' +
                                                '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_QTY] + '</td>' +
                                                '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_UOM] + '</td>' +
                                                '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_VENDORPARTNUM] + '</td>' +
                                                '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COST] + '</td>' +
                                                '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_EXTCOST] + '</td>' +
                                                '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_LASTINVANDPURCH] + '</td>' +
                                                '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PURCHLASTTHREE] + '</td>' +
                                                '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANT] + '</td>' +
                                                '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] + '</td>' +
                                                '<td class="uir-list-row-cell listtexthlctr' + ' ' + lineObject['bgcolorclass'] + '">' + isDuplicate + '</td>' +
                                              '</tr>';
                            
                            rowType = rowType == 'odd' ? 'even' : 'odd';
                            
                            lineObject = {};
                            
                            lineIndex++;
                        }
                        //Calculated Tag # and currentTag # are not equal. We need to process missing tags accordingly.
                        else {
                            //1. currentTagNum is greater than calculatedTagNum, we have missing tags between calculatedTagNum & currentTagNum.
                            //   Add the missing tags and assign the calculatedTagNum to be the current so that we can process the current tag.
                            if(calculatedTagNum < currentTagNum) {
                                for(var tagNum = calculatedTagNum; tagNum < currentTagNum; tagNum++) {
                                    tagNumText = '<div style="font-weight:bold;">' + tagNum + '</div>';

//                                    tagLineData.missingTagArray[tagLineData.missingTagArray.length] = tagNum;
                                    tagLineData.missingTagString += 'Tag #: ' + tagNum + '<br />';
                                    
                                    lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                                    lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = parseInt(tagNum);
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
                                    
//                                    tagLineData.tagsLineDataArray.push(lineObject);
                                    
                                    // Create the tag line for the Excel printout.
                                    // The cells only need to be added in the XML if there are actual values in there.
                                    if (tagNum != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + tagNum + '</Data></Cell>';
                                    if (item != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + item + '</Data></Cell>';
                                    if (itemDesc != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + itemDesc + '</Data></Cell>';
                                    if (comments != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + comments + '</Data></Cell>';
                                    if (qty != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell ss:Index="5"><Data ss:Type="Number">' + qty + '</Data></Cell>';
                                    if (uom != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + uom + '</Data></Cell>';
                                    if (vendPartNum != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + vendPartNum + '</Data></Cell>';
                                    if (cost != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell ss:Index="8"><Data ss:Type="Number">' + cost + '</Data></Cell>';
                                    if (extCost != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + extCost + '</Data></Cell>';
                                    if (lastInvPurch != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + lastInvPurch + '</Data></Cell>';
                                    if (purchLast3 != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + purchLast3 + '</Data></Cell>';
                                    if (plant != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plant + '</Data></Cell>';
                                    if (plantDept != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plantDept + '</Data></Cell>';
                                    if (isDuplicate != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + (isDuplicate == 'T' ? 'Yes' : 'No') + '</Data></Cell>';
                                    
                                    tagLineData.tagsLineDataExcelString += '</Row>';
                                    
                                    // Create the line item tags for the table to be shown on the page.
                                    if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'T')
                                        isDuplicate = 'Yes';
                                    else if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'F')
                                        isDuplicate = 'No';
                                    else
                                        isDuplicate = '';
                                    tagLineData.tagsLineDataString += 
                                                      '<tr class="uir-list-row-tr uir-list-row-' + rowType + '">' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_TAGNUM] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEM] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEMDESC] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COMMENTS] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_QTY] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_UOM] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_VENDORPARTNUM] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COST] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_EXTCOST] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_LASTINVANDPURCH] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PURCHLASTTHREE] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANT] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthlctr' + ' ' + lineObject['bgcolorclass'] + '">' + isDuplicate + '</td>' +
                                                      '</tr>';
                                    
                                    rowType = rowType == 'odd' ? 'even' : 'odd';
                                    
                                    lineObject = {};
                                    
                                    lineIndex++;    
                                }   
                                
                                //Now that we have added missing tags, set calculatedTagNum to be equal to currentTagNum. 
                                //This will allow the current tag to be processed since it is existing tag.
                                calculatedTagNum = currentTagNum; 
                            }
                            //2. calculatedTagNum is greater than currentTagNum. We need to calculate missing tags based on the next available tag number.
                            else if(calculatedTagNum > currentTagNum) {
                                if(iteration < physicalInvTagItemResults.length - 1) {
                                    //We are not at the end of the list, so add all missing tags based on the next available tag number.
                                    var nextAvailableTagNum = ConvertValueToInt(physicalInvTagItemResults[i + 1].custrecordgd_physinvttagline_tagnum);
                                    
                                    for(var tagNum = calculatedTagNum; tagNum < nextAvailableTagNum; tagNum++) {
                                        tagNumText = '<div style="font-weight:bold;">' + tagNum + '</div>';

//                                        tagLineData.missingTagArray[tagLineData.missingTagArray.length] = tagNum;
                                        tagLineData.missingTagString += 'Tag #: ' + tagNum + '<br />';
                                        
                                        lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                                        lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = parseInt(tagNum);
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
                                        
//                                        tagLineData.tagsLineDataArray.push(lineObject);
                                        
                                        // Create the tag line for the Excel printout.
                                        // The cells only need to be added in the XML if there are actual values in there.
                                        if (tagNum != '')
                                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + tagNum + '</Data></Cell>';
                                        if (item != '')
                                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + item + '</Data></Cell>';
                                        if (itemDesc != '')
                                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + itemDesc + '</Data></Cell>';
                                        if (comments != '')
                                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + comments + '</Data></Cell>';
                                        if (qty != '')
                                            tagLineData.tagsLineDataExcelString += '<Cell ss:Index="5"><Data ss:Type="Number">' + qty + '</Data></Cell>';
                                        if (uom != '')
                                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + uom + '</Data></Cell>';
                                        if (vendPartNum != '')
                                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + vendPartNum + '</Data></Cell>';
                                        if (cost != '')
                                            tagLineData.tagsLineDataExcelString += '<Cell ss:Index="8"><Data ss:Type="Number">' + cost + '</Data></Cell>';
                                        if (extCost != '')
                                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + extCost + '</Data></Cell>';
                                        if (lastInvPurch != '')
                                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + lastInvPurch + '</Data></Cell>';
                                        if (purchLast3 != '')
                                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + purchLast3 + '</Data></Cell>';
                                        if (plant != '')
                                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plant + '</Data></Cell>';
                                        if (plantDept != '')
                                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plantDept + '</Data></Cell>';
                                        if (isDuplicate != '')
                                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + (isDuplicate == 'T' ? 'Yes' : 'No') + '</Data></Cell>';
                                        
                                        tagLineData.tagsLineDataExcelString += '</Row>';
                                        
                                        // Create the line item tags for the table to be shown on the page.
                                        if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'T')
                                            isDuplicate = 'Yes';
                                        else if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'F')
                                            isDuplicate = 'No';
                                        else
                                            isDuplicate = '';
                                        tagLineData.tagsLineDataString += 
                                                          '<tr class="uir-list-row-tr uir-list-row-' + rowType + '">' +
                                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_TAGNUM] + '</td>' +
                                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEM] + '</td>' +
                                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEMDESC] + '</td>' +
                                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COMMENTS] + '</td>' +
                                                            '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_QTY] + '</td>' +
                                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_UOM] + '</td>' +
                                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_VENDORPARTNUM] + '</td>' +
                                                            '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COST] + '</td>' +
                                                            '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_EXTCOST] + '</td>' +
                                                            '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_LASTINVANDPURCH] + '</td>' +
                                                            '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PURCHLASTTHREE] + '</td>' +
                                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANT] + '</td>' +
                                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] + '</td>' +
                                                            '<td class="uir-list-row-cell listtexthlctr' + ' ' + lineObject['bgcolorclass'] + '">' + isDuplicate + '</td>' +
                                                          '</tr>';
                                        
                                        rowType = rowType == 'odd' ? 'even' : 'odd';
                                        
                                        lineObject = {};
                                        
                                        lineIndex++;    
                                    }
                                    
                                    incrementCalculatedTagNumber = false;
                                    calculatedTagNum = nextAvailableTagNum;
                                } else {
                                    //This is the last tag, so add it as a missing tag.
                                    tagNumText = '<div style="font-weight:bold;">' + calculatedTagNum + '</div>';

//                                    tagLineData.missingTagArray[tagLineData.missingTagArray.length] = calculatedTagNum; 
                                    tagLineData.missingTagString += 'Tag #: ' + calculatedTagNum + '<br />';
                                    
                                    lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                                    lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = parseInt(calculatedTagNum);
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
                                    
//                                    tagLineData.tagsLineDataArray.push(lineObject);
                                 
                                    // Create the tag line for the Excel printout.
                                    // The cells only need to be added in the XML if there are actual values in there.
                                    if (tagNum != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + tagNum + '</Data></Cell>';
                                    if (item != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + item + '</Data></Cell>';
                                    if (itemDesc != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + itemDesc + '</Data></Cell>';
                                    if (comments != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + comments + '</Data></Cell>';
                                    if (qty != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell ss:Index="5"><Data ss:Type="Number">' + qty + '</Data></Cell>';
                                    if (uom != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + uom + '</Data></Cell>';
                                    if (vendPartNum != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + vendPartNum + '</Data></Cell>';
                                    if (cost != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell ss:Index="8"><Data ss:Type="Number">' + cost + '</Data></Cell>';
                                    if (extCost != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + extCost + '</Data></Cell>';
                                    if (lastInvPurch != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + lastInvPurch + '</Data></Cell>';
                                    if (purchLast3 != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + purchLast3 + '</Data></Cell>';
                                    if (plant != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plant + '</Data></Cell>';
                                    if (plantDept != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plantDept + '</Data></Cell>';
                                    if (isDuplicate != '')
                                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + (isDuplicate == 'T' ? 'Yes' : 'No') + '</Data></Cell>';
                                    
                                    tagLineData.tagsLineDataExcelString += '</Row>';
                                    
                                    // Create the line item tags for the table to be shown on the page.
                                    if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'T')
                                        isDuplicate = 'Yes';
                                    else if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'F')
                                        isDuplicate = 'No';
                                    else
                                        isDuplicate = '';
                                    tagLineData.tagsLineDataString += 
                                                      '<tr class="uir-list-row-tr uir-list-row-' + rowType + '">' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_TAGNUM] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEM] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEMDESC] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COMMENTS] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_QTY] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_UOM] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_VENDORPARTNUM] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COST] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_EXTCOST] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_LASTINVANDPURCH] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PURCHLASTTHREE] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANT] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] + '</td>' +
                                                        '<td class="uir-list-row-cell listtexthlctr' + ' ' + lineObject['bgcolorclass'] + '">' + isDuplicate + '</td>' +
                                                      '</tr>';
                                    
                                    rowType = rowType == 'odd' ? 'even' : 'odd';
                                    
                                    lineObject = {};
                                    
                                    lineIndex++;
                                }                       
                            }
                        }
                    }

                    //Now add existing tags.
                    if(currentTagNum == calculatedTagNum) {
                        // Get the item data from the grouped tag search.
//                        var searchResult = physicalInvTagItemGroupedResults.filter(function(data){return data.getValue({name: 'internalid', join: 'custrecordgd_physinvttagline_item', summary: 'group'}) == itemId;}) || [];
//                        var searchResult = physicalInvTagItemGroupedResults.filter(function(data){return (data.custrecordgd_physinvttagline_itemid == itemId && data.custrecordgd_physinvtwrksht_plant == locationId);}) || [];
                        var searchResult = physicalInvTagItemGroupedResults['"' + itemId + locationId + '"'] || ''; if (i < 5) log.debug('searchResult line 730', JSON.stringify(searchResult));
                        // Get Bad count Tags.  Assembly items are excluded from this list and if quantity is greater than the purchase last 3 months. this is a bad count tag.
                        if (searchResult != '' && 
                                searchResult.custrecordgd_physinvttagline_itemtype != 'Assembly' && 
                                parseFloat(searchResult.custrecordgd_physinvttagline_quantity) > parseFloat(searchResult.custrecordgd_physinvttagline_purchlast3)) {
                            var output = url.resolveRecord({
                                recordType: 'customrecordgd_physicalinventoryworkshee',
                                recordId: worksheetId,
                                isEditMode: false
                            });
                            tagNumText = '<div style="font-weight:bold;"><a href="' + output + '">' + Math.round(currentTagNum).toFixed(0) + '</a></div>';
//                            tagLineData.badCountArray.push(calculatedTagNum);
                            tagLineData.badCountString += 'Tag #: ' + calculatedTagNum + '<br />';

                            lineObject['bgcolorclass'] = 'bgcolorclassblue';
                        } 
                        // exclude assembly items, and if the quantity is greater than the last inventory purchase this is an error tag.
                        else if (searchResult != '' && searchResult.custrecordgd_physinvttagline_itemtype != 'Assembly' &&
                                parseFloat(searchResult.custrecordgd_physinvttagline_quantity) > parseFloat(searchResult.custrecordgd_physinvttagline_lastinvpurc)) {
                            var output = url.resolveRecord({
                                recordType: 'customrecordgd_physicalinventoryworkshee',
                                recordId: worksheetId,
                                isEditMode: false
                            });

                            tagNumText = '<div style="font-weight:bold;"><a href="' + output + '">' + Math.round(currentTagNum).toFixed(0) + '</a></div>';
//                            tagLineData.errorTagArray.push(calculatedTagNum);
                            tagLineData.errorTagString += 'Tag #: ' + calculatedTagNum + '<br />';
                            
                            lineObject['bgcolorclass'] = 'bgcolorclassyellow';
                        } 
                        // all other scenarios, create a normal tag line.
                        else {
                            var output = url.resolveRecord({
                                recordType: 'customrecordgd_physicalinventoryworkshee',
                                recordId: worksheetId,
                                isEditMode: false
                            });

                            tagNumText = '<div style="font-weight:bold;"><a href="' + output + '">' + Math.round(currentTagNum).toFixed(0) + '</a></div>';
                            
                            lineObject['bgcolorclass'] = '';
                        }

                        lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                        lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = parseInt(currentTagNum);
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

//                        tagLineData.tagsLineDataArray.push(lineObject);
                     
                        // Create the tag line for the Excel printout.
                        // The cells only need to be added in the XML if there are actual values in there.
                        if (tagNum != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + tagNum + '</Data></Cell>';
                        if (item != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + item + '</Data></Cell>';
                        if (itemDesc != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + itemDesc + '</Data></Cell>';
                        if (comments != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + comments + '</Data></Cell>';
                        if (qty != '')
                            tagLineData.tagsLineDataExcelString += '<Cell ss:Index="5"><Data ss:Type="Number">' + qty + '</Data></Cell>';
                        if (uom != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + uom + '</Data></Cell>';
                        if (vendPartNum != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + vendPartNum + '</Data></Cell>';
                        if (cost != '')
                            tagLineData.tagsLineDataExcelString += '<Cell ss:Index="8"><Data ss:Type="Number">' + cost + '</Data></Cell>';
                        if (extCost != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + extCost + '</Data></Cell>';
                        if (lastInvPurch != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + lastInvPurch + '</Data></Cell>';
                        if (purchLast3 != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + purchLast3 + '</Data></Cell>';
                        if (plant != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plant + '</Data></Cell>';
                        if (plantDept != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plantDept + '</Data></Cell>';
                        if (isDuplicate != '')
                            tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + (isDuplicate == 'T' ? 'Yes' : 'No') + '</Data></Cell>';
                        
                        tagLineData.tagsLineDataExcelString += '</Row>';
                        
                        // Create the line item tags for the table to be shown on the page.
                        if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'T')
                            isDuplicate = 'Yes';
                        else if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'F')
                            isDuplicate = 'No';
                        else
                            isDuplicate = '';
                        tagLineData.tagsLineDataString += 
                                          '<tr class="uir-list-row-tr uir-list-row-' + rowType + '">' +
                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_TAGNUM] + '</td>' +
                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEM] + '</td>' +
                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEMDESC] + '</td>' +
                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COMMENTS] + '</td>' +
                                            '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_QTY] + '</td>' +
                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_UOM] + '</td>' +
                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_VENDORPARTNUM] + '</td>' +
                                            '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COST] + '</td>' +
                                            '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_EXTCOST] + '</td>' +
                                            '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_LASTINVANDPURCH] + '</td>' +
                                            '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PURCHLASTTHREE] + '</td>' +
                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANT] + '</td>' +
                                            '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] + '</td>' +
                                            '<td class="uir-list-row-cell listtexthlctr' + ' ' + lineObject['bgcolorclass'] + '">' + isDuplicate + '</td>' +
                                          '</tr>';
                        
                        rowType = rowType == 'odd' ? 'even' : 'odd';

                        lineObject = {};
                        lineIndex++;

                    }
                }
            
                iteration++;
            }
            log.debug('for loop physicalInvTagItemResults line 798 end time loc: ' + locationId, new Date());
            //If we are missing tags at the end, process them and add them in the missing tag array.
            if(calculatedTagNum + 1 <= physicalInvEndTagNum) {
                for(var i = calculatedTagNum + 1; i <= physicalInvEndTagNum; i++) { 
                    var tagNumText = '<div style="font-weight:bold;">' + i + '</div>';  

//                    tagLineData.missingTagArray[tagLineData.missingTagArray.length] = i;
                    tagLineData.missingTagString += 'Tag #: ' + i + '<br />';
                    
                    lineObject[SUBLIST_FIELD_TAGNUM] = tagNumText;
                    lineObject[SUBLIST_FIELD_TAGNUMCLEAN] = parseInt(i);
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
                    
//                    tagLineData.tagsLineDataArray.push(lineObject);
                 
                    // Create the tag line for the Excel printout.
                    // The cells only need to be added in the XML if there are actual values in there.
                    if (tagNum != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + tagNum + '</Data></Cell>';
                    if (item != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + item + '</Data></Cell>';
                    if (itemDesc != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + itemDesc + '</Data></Cell>';
                    if (comments != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + comments + '</Data></Cell>';
                    if (qty != '')
                        tagLineData.tagsLineDataExcelString += '<Cell ss:Index="5"><Data ss:Type="Number">' + qty + '</Data></Cell>';
                    if (uom != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + uom + '</Data></Cell>';
                    if (vendPartNum != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + vendPartNum + '</Data></Cell>';
                    if (cost != '')
                        tagLineData.tagsLineDataExcelString += '<Cell ss:Index="8"><Data ss:Type="Number">' + cost + '</Data></Cell>';
                    if (extCost != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + extCost + '</Data></Cell>';
                    if (lastInvPurch != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + lastInvPurch + '</Data></Cell>';
                    if (purchLast3 != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="Number">' + purchLast3 + '</Data></Cell>';
                    if (plant != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plant + '</Data></Cell>';
                    if (plantDept != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + plantDept + '</Data></Cell>';
                    if (isDuplicate != '')
                        tagLineData.tagsLineDataExcelString += '<Cell><Data ss:Type="String">' + (isDuplicate == 'T' ? 'Yes' : 'No') + '</Data></Cell>';
                    
                    tagLineData.tagsLineDataExcelString += '</Row>';
                    
                    // Create the line item tags for the table to be shown on the page.
                    if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'T')
                        isDuplicate = 'Yes';
                    else if (lineObject[SUBLIST_FIELD_ISDUPLICATE] == 'F')
                        isDuplicate = 'No';
                    else
                        isDuplicate = '';
                    tagLineData.tagsLineDataString += 
                                      '<tr class="uir-list-row-tr uir-list-row-' + rowType + '">' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_TAGNUM] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEM] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_ITEMDESC] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COMMENTS] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_QTY] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_UOM] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_VENDORPARTNUM] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_COST] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_EXTCOST] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_LASTINVANDPURCH] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlrt' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PURCHLASTTHREE] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANT] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthl' + ' ' + lineObject['bgcolorclass'] + '">' + lineObject[SUBLIST_FIELD_PLANTDEPARTMENT] + '</td>' +
                                        '<td class="uir-list-row-cell listtexthlctr' + ' ' + lineObject['bgcolorclass'] + '">' + isDuplicate + '</td>' +
                                      '</tr>';
                    
                    rowType = rowType == 'odd' ? 'even' : 'odd';
                    
                    lineObject = {};
                    
                    lineIndex++;
                }
            }
        }
    }
    
    /**
     * If the second parameter is true and the value is empty, return an empty string otherwise return zero, if value exist then
     * return parseInt of the value.
     * @param value
     * @param blankIfNull
     * @returns
     */
    function ConvertValueToInt(value, blankIfNull) {
        return blankIfNull ? parseInt(value) || '' : parseInt(value) || 0;
    }
    
    /**
     * Escape only if there exist a value
     * @param value
     * @returns
     */
    function ConvertValueToString(value) {
        return (value || '' != '' ? xml.escape({xmlText : value}) : '');
    }
    
    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
    
});
