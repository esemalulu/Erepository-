/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/task','N/error', 'N/record', 'N/search','N/runtime', 'N/email'],

function(task, error, record, search, runtime, email) {

    function getInputData() {
       var searchId = runtime.getCurrentScript().getParameter({name: 'custscriptr7_ren_opp_search_id'});
        return {
            type: 'search',
            id: searchId
        };

    }

    function map(context)
    {
        if (!context.isRestarted)
        {
        try {
            var contextVal = context.value;
            var oppId = JSON.parse(contextVal)['values']['GROUP(internalid)'].value;
            log.debug('oppId',oppId);
            //var oppId = searchResult.id;
            var oppRec = record.load({
                type: record.Type.OPPORTUNITY,
                id: oppId,
                isDynamic:true
            });
            var linesCount = oppRec.getLineCount({
                sublistId: 'item'
            });
            log.debug('linesCount',linesCount);
            for(var i = 0; i<linesCount;i++){
                oppRec = record.load({
                    type: record.Type.OPPORTUNITY,
                    id: oppId,
                    isDynamic:true
                });
                oppRec.selectLine({
                    sublistId:'item',
                    line:i
                });
                var lineItem = oppRec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item'
                });
                if(lineItem==6289||lineItem==6285){
                    var proItem;
                    switch(lineItem){
                        case '6289':
                            proItem=6291;
                        break;
                        case '6285':
                            proItem=6303;
                        break;
                    }
                    log.debug('creating item group data for line '+i+' and item',proItem);
                    var itemGroupData = [];
                    getItemValues(i, oppRec, itemGroupData);
                    log.debug('metasploit items are',itemGroupData);
                    createItemgroupLine(i,oppRec, itemGroupData[0], proItem);
                    oppRec.selectLine({
                        sublistId:'item',
                        line:i
                    });
                    var lineNums = 1;
                    do {
                        itemType = getLineItemType(oppRec, ++i);
                        if(itemType!='EndGroup') {
                            populateItemGroupLine(i, oppRec, itemGroupData[lineNums++]);
                        }
                    }while(itemType!='EndGroup')
                    //update license product
                    if(Number(itemGroupData[1].custcolr7translicenseid.substring(3))) {
                        record.submitFields({
                            type: 'customrecordr7metasploitlicensing',
                            id: Number(itemGroupData[1].custcolr7translicenseid.substring(3)),
                            values: {
                                'custrecordr7mslicenseitemfamily': proItem === 6291 ? 6 : 39 //? is this the correct id?
                            }
                        })
                    };
                }
                oppRec.save();
            }
        }catch(ex){
            log.error({
                title:  'error for '+ context.key,
                details: ex
            });
        }           
        
        } else {
            context.errors.iterator().each(function (key, error, executionNo){
                log.error({
                    title:  'Map error for key: ' + key + ', execution no  ' + executionNo,
                    details: error
                });
                return true;
            });
        }
        
    }

    function getItemValues(lineNum, oppRec, itemGroupObj){
        var itemValues = ['price', 'rate','units', 'quantity','amount', 'custcolr7itemqtyunit', 'options','custcolr7itemmsproductkey', 'custcolr7startdate','custcolr7enddate', 'custcolr7translinecontact',
                        'custcolr7createdfromra','custcolr7translicenseid','class','location','custcol_r7uniquegroupingoverride','custcol_r7uniquerevenuegrouping','custcolr7acvamount','custcolr7createdfromra_lineid','custcolr7_monthlydatalimit_gb',
                        'custcol_r7_605_rev_amount','custcol_r7_606_rev_amount','custcol_r7_besp_category','custcol_r7_shipping_country',
                        'custcol_key','custcol_end_date_so_line','custcol_start_date_so_line',
                        'custcol_arm_tax_rate_line_value', 'custcol_arm_amount_line_value', 'custcol_arm_qty_line_value', 'custcol_r7_605_rev_element', 'custcol_r7_606_rev_element',
                        'custcol_r7_item_rev_category', 'custcol_r7_expected_arr', 'custcolr7dataretentionlengthdays'
                        ];
        var groupLinesCount = 0;
        do {
            itemType = getLineItemType(oppRec, lineNum);
            if(itemType!='EndGroup') {
                itemGroupObj[groupLinesCount] = {}
                for (var prop in itemValues){
                    oppRec.selectLine({
                        sublistId:'item',
                        line:lineNum
                    });
                    var itemVal = oppRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: itemValues[prop]
                    });
                    if(itemValues[prop]=='custcol_r7uniquerevenuegrouping'){
                        itemVal= itemVal?true:false;
                    }
                    itemGroupObj[groupLinesCount][itemValues[prop]] = itemVal;
                }
                lineNum++;
                groupLinesCount++;
            }
        }while(itemType!='EndGroup')
    }

    function createItemgroupLine(lineNum, oppRec, itemGroup, proItem){
        log.debug('createItemgroupLine');
        oppRec.selectLine({
            sublistId:'item',
            line:lineNum
        });       
        oppRec.setCurrentSublistValue({
            sublistId:'item',
            fieldId:'item',
            value:proItem
        });
/*
        for (var prop in itemGroup){
            if(prop!='custcol_r7uniquerevenuegrouping'){
                oppRec.setCurrentSublistValue({
                    sublistId:'item',
                    fieldId: prop,
                    value: itemGroup.prop
                });
            }
        }*/
        oppRec.commitLine({
            sublistId: 'item'
        });       
    }

    function populateItemGroupLine(lineNum, oppRec, itemline){
        log.debug('populateItemGroupLine', itemline)
        oppRec.selectLine({
            sublistId:'item',
            line:lineNum
        });       
        for (var prop in itemline){
            oppRec.setCurrentSublistValue({
                sublistId:'item',
                fieldId: prop,
                value: itemline[prop]
            });
        }
        oppRec.commitLine({
            sublistId: 'item'
        });
    }

    function getLineItemType(oppRec, lineNum){
        oppRec.selectLine({
            sublistId:'item',
            line:lineNum
        });
        var itemType =  oppRec.getCurrentSublistValue({
            sublistId:'item',
            fieldId: 'itemtype'
        });
        log.debug('item Type for line '+lineNum, itemType);
        return itemType;
    }



    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
        function summarize(summary) {
            log.audit({
                title: 'summary:',
                details: JSON.stringify(summary)
            });
        }




    return {
        config:{
            retryCount: 2,
            exitOnError: true
        },
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };

});
