/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/task','N/error', 'N/record', 'N/search','N/runtime', 'N/email', 'N/redirect'],

function(task, error, record, search, runtime, email, redirect) {

    function getInputData() {
        return {
            type: 'search',
            id: "customsearch37504"
        };
    }

    var oldItems = [6340,6342,6741,6339,6740,6343,6737,6344,6739,6345,6346,6347,6348]
    var uniqueIdQuotes = []
    var mappingObj = {
        6342: 1024,
        6741: 1024,
        6339: 128,
        6740: 128,
        6343: 256,
        6737: 256,
        6344: 512,
        6739: 512,
        6345: 256,
        6346: 256,
        6347: 64,
        6348: 128,
    }

    function map(context)
    {
        if (!context.isRestarted)
        {
        try {
            var contextVal = context.value;
            var quoteId = JSON.parse(contextVal)['id']

            if (uniqueIdQuotes.indexOf(quoteId) == -1) {
                uniqueIdQuotes.push(quoteId)
                log.debug('uniqueIdQuotes ', uniqueIdQuotes);
                var quoteRec = record.load({
                    type: record.Type.ESTIMATE,
                    id: quoteId,
                    isDynamic:true
                });

                var quoteStr = JSON.stringify(quoteRec);
                var quoteStrArr = quoteStr.match(/.{1,3000}/g);
                quoteStrArr.forEach(function(str, i) {
                    log.debug("quote str" + i, str);
                })

                var linesCount = quoteRec.getLineCount({
                    sublistId: 'item'
                });

                log.debug('linesCount->Quote',linesCount);

                for (var i = 0; i < linesCount; i++) {
                    quoteRec.selectLine({
                        sublistId:'item',
                        line:i
                    });
                    var lineItem = quoteRec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item'
                    });
                    
                    if (oldItems.indexOf(Number(lineItem)) !== -1) {
                        var proItem = 6319;
                        log.debug('creating item group data for line -> Quote'+i+' and item',proItem);
                        var itemGroupData = [];
                        getItemValues(i, quoteRec, itemGroupData);
                        log.debug('metasploit items are -> Quote',itemGroupData);
                        createItemgroupLine(i,quoteRec, itemGroupData[0], proItem, lineItem);
                        quoteRec.selectLine({
                            sublistId:'item',
                            line:i
                        });
                        var lineNums = 1;
                        do {
                            itemType = getLineItemType(quoteRec, ++i);
                            if(itemType!='EndGroup') {
                                populateItemGroupLine(i, quoteRec, itemGroupData[lineNums++], lineItem);
                            }
                        }while(itemType!='EndGroup')

                        quoteRec.save();
                    }
                }
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
        var itemValues = ['custcolr7_cash_excess_term_line','custcol_r7_cash_arr','custcolr7opamountrenewalbaseline','custcolr7opamountrenewalcotermline','custcolr7opamountrenewalmultiyearline','price', 'rate','units', 'quantity','amount', 'custcolr7itemqtyunit', 'options','custcolr7itemmsproductkey', 'custcolr7startdate','custcolr7enddate', 'custcolr7translinecontact',
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

    function createItemgroupLine(lineNum, oppRec, itemGroup, proItem, lineItem){
        oppRec.selectLine({
            sublistId:'item',
            line:lineNum
        });       
        oppRec.setCurrentSublistValue({
            sublistId:'item',
            fieldId:'item',
            value:proItem
        });
        if(mappingObj[lineItem]){
            oppRec.setCurrentSublistValue({
                sublistId:'item',
                fieldId: 'quantity',
                value: mappingObj[lineItem]
            });
        }
        oppRec.commitLine({
            sublistId: 'item'
        });       
    }

    function populateItemGroupLine(lineNum, oppRec, itemline, lineItem){
        oppRec.selectLine({
            sublistId:'item',
            line:lineNum
        });       
        for (var prop in itemline){
            var newValue = itemline[prop]
            if(mappingObj[lineItem]){
                if (prop == 'quantity'){
                    newValue = mappingObj[lineItem]
                }
                if (prop == 'custcolr7itemqtyunit'){
                    newValue = 7
                }
            }else if(lineItem == '6340'){
                if (prop == 'custcolr7itemqtyunit'){
                    newValue = 1
                }
            }
            oppRec.setCurrentSublistValue({
                sublistId:'item',
                fieldId: prop,
                value: newValue
            });
            //log.debug(prop, newValue);
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

    function reduce(context)
    {

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
        reduce: reduce,
        map: map,
        summarize: summarize
    };
});