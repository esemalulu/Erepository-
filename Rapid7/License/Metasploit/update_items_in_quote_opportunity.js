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
            id: "customsearch_change_item_in_opportunity"
        };
    }

    var fields = ['price', 'rate','units', 'quantity','amount', 'custcolr7itemqtyunit', 'options','custcolr7itemmsproductkey', 'custcolr7startdate','custcolr7enddate',
    'custcolr7createdfromra','custcolr7translicenseid','class','location','custcol_r7uniquegroupingoverride','custcol_r7uniquerevenuegrouping','custcolr7acvamount','custcolr7createdfromra_lineid','custcolr7_monthlydatalimit_gb',
    'custcol_r7_605_rev_amount','custcol_r7_606_rev_amount','custcol_r7_besp_category','custcol_r7_shipping_country',
    'custcol_key','custcol_end_date_so_line','custcol_start_date_so_line',
    'custcol_arm_tax_rate_line_value', 'custcol_arm_amount_line_value', 'custcol_arm_qty_line_value', 'custcol_r7_605_rev_element', 'custcol_r7_606_rev_element',
    'custcol_r7_item_rev_category', 'custcol_r7_expected_arr', 'custcolr7dataretentionlengthdays','taxcode','custcolr7translinecontact','custcolr7translinecontact'
    ];

    var oldItems = [6340,6342,6741,6339,6740,6343,6737,6344,6739,6345,6346,6347,6348]
    var uniqueIdOpportunities = []
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
            var oppId = JSON.parse(contextVal)['id']

            if(uniqueIdOpportunities.indexOf(oppId) == -1){
                uniqueIdOpportunities.push(oppId)
                var oppRec = record.load({
                    type: record.Type.OPPORTUNITY,
                    id: oppId,
                    isDynamic:true
                });
                var linesCount = oppRec.getLineCount({
                    sublistId: 'item'
                });
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
                    if(oldItems.indexOf(Number(lineItem)) !== -1){
                        var proItem = 6319;
                        var itemGroupData = [];
                        getItemValues(i, oppRec, itemGroupData);
                        createItemgroupLine(i,oppRec, itemGroupData[0], proItem, lineItem);
                        oppRec.selectLine({
                            sublistId:'item',
                            line:i
                        });
                        var lineNums = 1;
                        do {
                            itemType = getLineItemType(oppRec, ++i);
                            if(itemType!='EndGroup') {
                                populateItemGroupLine(i, oppRec, itemGroupData[lineNums++],lineItem);
                            }
                        }while(itemType!='EndGroup')
                    }
                    oppRec.save();
                }
                context.write({
                    key: oppId,  
                    value: oppId 
                }); 
    
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
        var itemValues = ['price', 'rate','units', 'quantity','amount', 'custcolr7itemqtyunit', 'options','custcolr7itemmsproductkey', 'custcolr7startdate','custcolr7enddate',
                        'custcolr7createdfromra','custcolr7translicenseid','class','location','custcol_r7uniquegroupingoverride','custcol_r7uniquerevenuegrouping','custcolr7acvamount','custcolr7createdfromra_lineid','custcolr7_monthlydatalimit_gb',
                        'custcol_r7_605_rev_amount','custcol_r7_606_rev_amount','custcol_r7_besp_category','custcol_r7_shipping_country',
                        'custcol_key','custcol_end_date_so_line','custcol_start_date_so_line',
                        'custcol_arm_tax_rate_line_value', 'custcol_arm_amount_line_value', 'custcol_arm_qty_line_value', 'custcol_r7_605_rev_element', 'custcol_r7_606_rev_element',
                        'custcol_r7_item_rev_category', 'custcol_r7_expected_arr', 'custcolr7dataretentionlengthdays','taxcode','custcolr7translinecontact','custcolr7translinecontact'
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
        return itemType;
    }

    function validateExistLink(oppId) {

        var checkRecord = search.create({
            type: record.Type.ESTIMATE,
            filters: ['opportunity', 'is', oppId],
            columns: ['internalid']
          }).run().getRange({ start: 0, end: 100})
    
        if (checkRecord.length > 0) {
            return checkRecord
        }
        return false
    }

    function changeQuote(oppId) {
        try{
            var quotesArr = validateExistLink(oppId);
            if(quotesArr.length > 0){
                for(var q=0; q < quotesArr.length; q++){
                    var quoteId = quotesArr[q].getValue('internalid')
                    if (uniqueIdQuotes.indexOf(quoteId) == -1) {
                        uniqueIdQuotes.push(quoteId)
                        var quoteRec = record.load({
                            type: record.Type.ESTIMATE,
                            id: quoteId,
                            isDynamic:true
                        });                        
                        var linesCount = quoteRec.getLineCount({
                            sublistId: 'item'
                        });
                        for(var i = 0; i<linesCount;i++){

                            quoteRec.selectLine({
                                sublistId:'item',
                                line:i
                            });
                            var lineItem = quoteRec.getCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'item'
                            });
                            
                            if(oldItems.indexOf(Number(lineItem)) !== -1){
                                var proItem = 6319;
                                var itemGroupData = [];
                                getItemValues(i, quoteRec, itemGroupData);
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
                                quoteRec.save({    
                                    enableSourcing: true,
                                    ignoreMandatoryFields: true
                                });
                            }
                        }
                    }
                }
            }
        }catch(ex){
            log.error({
                title:  'error for '+ oppId,
                details: ex
            });
        } 
    }
    function reduce(context)
    {
        changeQuote(context.key)
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