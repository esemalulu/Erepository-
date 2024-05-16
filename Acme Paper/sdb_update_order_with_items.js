/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
*/
define(['N/record', 'N/search', "N/log"],
    (record, search, log) => {
        const getInputData = () => {
            var x = [897962, 895951, 917529, 916233, 899478, 897011, 916811, 917590, 899638, 918214, 917399, 897908, 915900, 917407, 918342, 938777, 918581, 944159, 941035, 957211, 918586, 945121, 943986, 966533, 918601, 946273, 968777, 944070, 981460, 980558, 1002881, 919010, 981557, 1029389, 990059, 1034944, 1032590, 1002881, 1034288, 895951, 897962, 899478]
            x.forEach(function (id) {
                try {
                    var salesorder = record.load({
                        type: "salesorder",
                        id: id
                    });
                    var itemCount = salesorder.getLineCount({ "sublistId": "item" });
                    for (var i = 0; i < itemCount; i++) {
                        var item = salesorder.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                        if (item != 80962) continue;
                        var quantity = salesorder.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                        log.debug("Item Info: ", { item, quantity, salesOrder: id });
                        salesorder.setSublistValue({ sublistId: 'item', fieldId: 'commitinventory', line: i, value: "1" });
                    }
                    var idSaved = salesorder.save({
                        ignoreMandatoryFields: true
                    });
                    log.audit("Order Saved: ", { idSaved })
                } catch (e) {
                    log.error("ERROR: ", id);
                    log.error("ERROR: ", e);
                }
            })

            return [];
            return search.load({
                id: "customsearch4855"
            });

        }

        const map = (mapContext) => {
            try {
                var json = JSON.parse(mapContext.value);
                var itemQuantity = json.values.quantity;
                if (itemQuantity > 5) return

                var salesorder = record.load({
                    type: json.recordType,
                    id: mapContext.key
                });
                var itemCount = salesorder.getLineCount({ "sublistId": "item" });
                for (var i = 0; i < itemCount; i++) {
                    var item = salesorder.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    if (item != 80962) continue;
                    var quantity = salesorder.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                    log.debug("Item Info: ", { item, quantity, salesOrder: mapContext.key });
                    salesorder.setSublistValue({ sublistId: 'item', fieldId: 'commitinventory', line: i, value: "3" });
                }
                var idSaved = salesorder.save({
                    ignoreMandatoryFields: true
                });
                log.audit("Order Saved: ", { idSaved })
            } catch (e) {
                log.error({
                    title: "MAP ERROR",
                    details: e,
                })
            }
        }
        return { getInputData, map }
    });