/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/task', 'N/error', 'N/record', 'N/search', 'N/format', 'N/runtime', 'N/url', 'N/http', 'N/render', 'N/file'],

    function(task, error, record, search, format, runtime, url, http, render, file) {

        /**
         * Definition of the Scheduled script trigger point.
         *
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
         * @Since 2015.2
         */
        function execute(scriptContext) {
            var oppSearchResults = search.load({
                id: runtime.getCurrentScript().getParameter({
                    name: 'custscriptr7_opp_search'
                })
            }).run();
            var numberOfRecordsToProcess = runtime.getCurrentScript().getParameter({
                name: 'custscriptr7_num_records'
            }) ? runtime.getCurrentScript().getParameter({
                name: 'custscriptr7_num_records'
            }) : 1;
            var searchId = 0;
            var resultSlice;
            do {
                resultSlice = oppSearchResults.getRange({
                    start: searchId,
                    end: searchId + numberOfRecordsToProcess
                });
                log.debug('starting new loop, number of results ',resultSlice.length)
                searchId = searchId+numberOfRecordsToProcess;
                if (resultSlice && resultSlice.length > 0) {
                    for (var i = 0; i < resultSlice.length; i++) {
                        try {
                            processOppRecord(resultSlice[i]);
                        } catch (ex) {
                            log.error('ERROR_IN_EXECUTE', ex);
                        }
                    }
                }
            } while (!unitsLeft(runtime) && resultSlice.length > 0);
            log.audit('ended loop check for units');
            if(unitsLeft(runtime)){
                restartScript(
                    runtime.getCurrentScript().id,
                    runtime.getCurrentScript().deploymentId
                    );
            }
        }

        function processOppRecord(result) {
            var oppId = result.getValue({
                name: 'internalid',
                summary: 'GROUP'
            });
            log.audit('processing opp id', oppId);
            var soRefNum;
            var soRec;
            var lineIds;
            var lastUpdatedLIne_id;
            var totalExpectedARR = 0;
            var oppRec = record.load({
                type: record.Type.OPPORTUNITY,
                id: oppId
            });
            var lineCount = oppRec.getLineCount({
                sublistId: 'item'
            });
            log.debug('we will process ' + lineCount + ' lines');
            for (var i = 0; i < lineCount; i++) {
                var itemId = oppRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                var itemInfo = search.lookupFields({
                    type: search.Type.ITEM,
                    id: itemId,
                    columns: ['type', 'custitem_arm_upgrade_pricing_line']
                });
                var itemType = itemInfo.type;
                var itemIsPrice = itemInfo.custitem_arm_upgrade_pricing_line;

                log.debug('line ' + i + ' item type is ', itemType);
                log.debug('line ' + i + ' item itemIsPrice is ', itemIsPrice);
                if (itemType && itemType.length > 0 && (itemType[0].value != 'Description'&&itemType[0].value != 'Discount')) {
                    if (itemType && itemType.length > 0 && itemType[0].value == 'Group') {
                        log.debug('item type IS group, skip this one');
                        continue;
                    }
                    soRefNum = oppRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcolr7createdfromra',
                        line: i
                    });
                    var soLineRef = oppRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcolr7createdfromra_lineid',
                        line: i
                    });

                    if (soRefNum && soLineRef) {
                        var itemIngroup = oppRec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'ingroup',
                            line: i
                        });
                        log.debug('checked if item IS IN group', itemIngroup);
                        if (itemIngroup == 'T' && !itemIsPrice) {
                            log.debug('item type IS IN GROUP but this is not pricing item group, skip this one');
                            continue;
                        }
                        if ((soRec && soRec.id != soRefNum) || (!soRec)) {
                            //Loading new order change last id to -1 to avoid issue when only one line was processed
                            lastUpdatedLIne_id = -1;
                            soRec = record.load({
                                type: record.Type.SALES_ORDER,
                                id: soRefNum
                            });
                            log.debug('we laoded new so, let us take a look');
                            lineIds = getLineIds(soRec);
                        }
                        //getting lineId from reference sctring
                        var lineRef = soLineRef.substring(soLineRef.indexOf("_") + 1);
                        var lineId = lineIds.indexOf(Number(lineRef));
                        log.debug('we created arr with line ids',JSON.stringify(lineIds));
                        log.debug('for our line SO line ref is', Number(lineRef));
                        log.debug('so we need to check ', lineId);


                        if (lineId != lastUpdatedLIne_id && lineId !=-1) {
                            log.debug('processing line ' + i, 'soRefNum ' + soRefNum + ' line id ref ' + lineId);
                            //we need to get correct line id from SO
                            lineId = getPriceLine(soRec, lineId);
                            var soLineCashArr = soRec.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_r7_cash_arr',
                                line: lineId
                            });

                            log.debug('Updating line for Opp ' + oppRec.id + ' line id is ' + i, ' SO line reference is ' + soRec.id + ' so line id is ' + lineId + ' setting amount to ' + soLineCashArr);
                            oppRec.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_r7_expected_arr',
                                line: i,
                                value: soLineCashArr
                            });
                            lastUpdatedLIne_id = lineId;
                            //update total Arr only if we updating the line
                            totalExpectedARR = totalExpectedARR + soLineCashArr;
                        }
                    }
                }
            }
            oppRec.setValue({
                fieldId: 'custbody_r7_total_exp_cash_arr',
                value: totalExpectedARR
            });
            oppRec.setValue({
                fieldId: 'custbody_r7_total_arr',
                value: totalExpectedARR
            });
            oppRec.setValue({
                fieldId: 'custbodyr7_opp_updated_with_so_arr',
                value: true
            });
            oppRec.save();
            log.audit('processed Opp id', oppId);
        }

        function getLineIds(soRec){
            var lineIds = [];
            var lineCount = soRec.getLineCount({sublistId:'item'});
            log.debug('got number of lines ', lineCount)
            for (var i=0; i<lineCount;i++){
                lineId = soRec.getSublistValue({
                    sublistId:'item',
                    fieldId:'line',
                    line: i
                });
                log.debug('line is '+i, lineId);
                lineIds.push(Number(lineId));
            }
            return lineIds;
        }

        function getPriceLine(soRec, lineId) {
            do {
                var lookForNextLine = false;
                var itemId = soRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: lineId
                });
                var itemInfo = search.lookupFields({
                    type: search.Type.ITEM,
                    id: itemId,
                    columns: ['type', 'custitem_arm_upgrade_pricing_line']
                });
                var itemType = itemInfo.type;
                var itemIsPrice = itemInfo.custitem_arm_upgrade_pricing_line;

                //if item is group - skip and look for the next one
                if (itemType && itemType.length > 0 && itemType[0].value == 'Group') {
                    log.debug('getGroupPriceLine item is group - skip and look for the next one', lineId);
                    lineId++;
                    lookForNextLine = true;
                    continue;
                }
                var itemIngroup = soRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'ingroup',
                    line: lineId
                });
                if (itemIngroup == 'T' && itemIsPrice) {
                    log.debug('getGroupPriceLine item is in group and it is a price line, return this line id', lineId);
                } else if (itemIngroup == 'T' && !itemIsPrice) {
                    log.debug('getGroupPriceLine item is in group but it is not a price line, check next one', lineId);
                    lineId++;
                    lookForNextLine = true;
                    continue;
                } else if(itemIngroup != 'T'){
                    log.debug('getGroupPriceLine item is not a group or part of the group - just return that line', lineId);
                    continue;
                }
            } while (lookForNextLine);

            return lineId;
        }

        function unitsLeft(runtimeObj) {
            var unitsLeft = runtimeObj.getCurrentScript().getRemainingUsage();
            log.audit('units left ', unitsLeft);
            if (unitsLeft <= 3500) {
                log.audit('Ran out of units');
                return true;
            }

            return false;
        }

        function restartScript(scriptId, deploymentId) {
            log.debug('Rescheduling script');
            var scheduleScriptTaskObj = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: scriptId,
                deploymentId: deploymentId
            });
            log.debug('Schedule Object', scheduleScriptTaskObj);
            var taskSubmitId = scheduleScriptTaskObj.submit();
            log.debug('New task is submitted.', 'Thank you! Come again!');
        }


        return {
            execute: execute
        };

    });
