/**
 * @NApiVersion 2.0
 * @NScriptType clientscript
 *
 */

define(['N/search'],
    function (search) {

        function postSourcing(context) {
            try {
                var rec = context.currentRecord;
                var sublistName = context.sublistId;
                var fieldName = context.fieldId;
                var line = context.line;
                if (sublistName == 'item' && fieldName == 'item') {
                    var item = rec.getCurrentSublistValue({sublistId: 'item', fieldId: 'item'});
                    var itemType = rec.getCurrentSublistValue({sublistId:'item', fieldId:'itemtype'});
                    if(itemType == 'Description' || itemType == 'Discount' || itemType == 'Subtotal' || itemType == 'Markup'){
                        return;
                    }
                    if(isEmpty(item)){
                        return;
                    }
                    var customer = rec.getValue({fieldId:'entity'});
                    var lastSale = getLastSale(customer, item);
                    if(!isEmpty(lastSale)){
                        window.alert('This item is a duplicate from your latest Order No. '+lastSale.orderNo+', dated '+lastSale.date+'.');
                    }
                }
            }
            catch (error) {
                console.log('Error: ' + error.toString());
            }
        }

        function validateLine(context) {
            try {
                var rec = context.currentRecord;
                var sublistName = context.sublistId;
                var fieldName = context.fieldId;
                if (sublistName == 'item') {
                    var item = rec.getCurrentSublistValue({sublistId: 'item', fieldId: 'item'});
                    var lineCount = rec.getLineCount({sublistId: 'item'});
                    var itemFound = false;
                    var line = rec.getCurrentSublistIndex({
                        sublistId: 'item'
                    });                    
                    for (var i = 0; i < lineCount; i++) {
                        if(i==line){
                            continue
                        }
                        var itemLine = rec.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
                        if (itemLine == item) {
                            itemFound = true;
                            break;
                        }
                    }
                    if (itemFound == true) {
                        window.alert('A duplicate item has been added.')
                    }
                }
                return true;
            }
            catch (error) {
                console.log('Error: ' + error.toString());
            }
        }

        function getLastSale(customer, item){
            try{
                var lastSaleSearch = search.create({
                    type: "salesorder",
                    filters:
                        [
                            ["name","anyof",customer],
                            "AND",
                            ["mainline","is","F"],
                            "AND",
                            ["type","anyof","SalesOrd"],
                            "AND",
                            ["status","anyof","SalesOrd:B","SalesOrd:E","SalesOrd:A","SalesOrd:D"],
                            "AND",
                            ["item","anyof",item],
                            "AND",
                            ["formulanumeric: case when {quantity} != {quantityshiprecv} then 1 else 0 end","equalto","1"]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "tranid",
                                sort: search.Sort.DESC,
                            }),
                            search.createColumn({name: "trandate"})
                        ]
                });
                var lastSaleSearchResult = lastSaleSearch.run().getRange({
                    start: 0,
                    end: 1
                });
                if (lastSaleSearchResult.length < 1) {
                    return null;
                }
                else {
                    return {orderNo: lastSaleSearchResult[0].getValue({name: 'tranid'}), date: lastSaleSearchResult[0].getValue({name: 'trandate'})};
                }
            }
            catch(error){
                log.error('Error in getLastSale',error.toString());
            }
        }

        function isEmpty(stValue) {
            if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
                return true;
            }
            else {
                if (stValue instanceof String) {
                    if ((stValue == '')) {
                        return true;
                    }
                }
                else if (stValue instanceof Array) {
                    if (stValue.length == 0) {
                        return true;
                    }
                }
                return false;
            }
        }

        return {
            postSourcing: postSourcing,
            validateLine: validateLine
        };
    })
;