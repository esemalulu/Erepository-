/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */
define(["N/log", "N/search"], function (log, search) {

    function execute(context) {
        try {
            //80970
            //91138
            var arrayItems = ["101739", "121863", "102184", "101778", "87597", "101734", "89196", "101773", "82100", "89204", "125490", "101733", "126793", "90798", "81136", "80970", "124300", "91138", "89203", "106066", "101789", "101807", "80966", "89205", "103768", "101777", "126844", "101912", "101736", "109163", "90370"]
            var itemRates = getItemsRates(arrayItems)
            log.audit("ItemRates", itemRates)

        } catch (error) {
            log.error("Error", error)
        }
    }


    function getItemsRates(items) {
        var objectReturn = {};
        var newItems = [];
        newItems = newItems.concat(items);
        items.forEach(element => {
            log.debug("element", element)

            var invoiceSearchObj = search.create({
                type: "salesorder",
                filters:
                    [
                        ["mainline", "is", "F"],
                        "AND",
                        ["type", "anyof", "SalesOrd"],
                        "AND",
                        ["shipping", "is", "F"],
                        "AND",
                        ["taxline", "is", "F"],
                        "AND",
                        ["item", "anyof", element],
                        "AND",
                        ["formulanumeric: {quantityuom}", "greaterthan", "0"]
                    ],
                columns:
                    [
                        search.createColumn({ name: "rate", label: "Item Rate" }),
                        search.createColumn({ name: "item", label: "item" }),
                        search.createColumn({
                            name: "datecreated",
                            sort: search.Sort.DESC,
                            label: "Date Created"
                        }),
                        search.createColumn({
                            name: "formulanumeric",
                            formula: "({rate}*{quantity})/{quantityuom}",
                            label: "Formula (Numeric)"
                        }),
                        search.createColumn({ name: "entity", label: "Name" })
                    ]
            });
            invoiceSearchObj.run().each(function (result) {
                /* var index = newItems.indexOf(result.getValue("item"));
                // log.audit("index: ", index);
                // log.audit("item: ", result.getValue("item"));
                if (index != -1) {
                    var rate1 = result.getValue({ name: "formulanumeric", label: "Formula (Numeric)" })
                    objectReturn[result.getValue("item")] = { rate: rate1 }
                    newItems.splice(index, 1)
                }

                if (newItems.length == 0) return false; */
                // rate1 = rate1.toFixed(2).toString();
                return true;
            });
        });
        // log.audit("objectReturn: ", objectReturn);
        return true;
    }

    return {
        execute: execute
    }
});
