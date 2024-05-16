/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/search', 'N/record'], function (search, record) {

    function onRequest(context) {
        try {
            if (context.request.method == 'GET') {
                log.debug('param', context.request.parameters);

                if (context.request.parameters.hasOwnProperty('itemId')) {
                    var result = pricesOfItem(context.request.parameters?.itemId);
                } else {
                    var result = allPriceCategories();
                }
                context.response.write(JSON.stringify(result));
            }
        } catch (error) {
            log.error('error: ', error);
        }
    }

    function pricesOfItem(itemId) {
        try {
            if (!itemId) return;

            var priceCategories = [];
            var itemName = search.lookupFields({
                type: record.Type.INVENTORY_ITEM,
                id: itemId,
                columns: 'displayname'
            });
            var productCategory = search.lookupFields({
                type: record.Type.INVENTORY_ITEM,
                id: itemId,
                columns: 'class'
            });

            if (!productCategory.class[0]) {
                var basePrice = search.lookupFields({
                    type: record.Type.INVENTORY_ITEM,
                    id: itemId,
                    columns: 'costestimate'
                });

                return {
                    item: itemName.displayname, productCategory: null, priceLevels: [{
                        name: 'Base price',
                        price: basePrice.costestimate,
                    }]
                };
            }

            var inventoryitemSearchObj = search.create({
                type: "inventoryitem",
                filters:
                    [
                        ["internalid", "anyof", itemId],
                        "AND",
                        ["isinactive", "is", "F"],
                        "AND",
                        ["formulatext: CASE WHEN upper({pricing.pricelevel})=upper({class}) THEN 1 ELSE 0 END", "startswith", "1"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "formulatext",
                            formula: "{pricing.pricelevel}",
                            label: "pricelevel"
                        }),
                        search.createColumn({
                            name: "formulatext",
                            formula: "{pricing.unitprice}",
                            label: "unitprice"
                        }),
                    ]
            });

            inventoryitemSearchObj.run().each(function (result) {
                var itemPrice = {
                    name: result.getValue(result.columns[0]),
                    price: result.getValue({ name: "formulatext", label: "unitprice" }),
                }
                priceCategories.push(itemPrice);
                return true;
            });

            return { item: itemName.displayname, productCategory: productCategory.class[0].text, priceLevels: priceCategories };
        } catch (error) {
            log.error('error in pricesOfItem: ', error);
        }
    }

    function allPriceCategories() {
        try {
            var priceCategories = [];

            var pricelevelSearchObj = search.create({
                type: "pricelevel",
                filters:
                    [
                        ["isinactive", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC,
                            label: "Name"
                        }),
                        search.createColumn({ name: "discountpct", label: "Markup/Discount %" }),
                        search.createColumn({ name: "isonline", label: "Online Price Level" })
                    ]
            });

            pricelevelSearchObj.run().each(function (result) {
                var prCa = {
                    name: result.getValue({ name: "name" }),
                    markupDiscount: result.getValue({ name: "discountpct" }),
                    onlinePriceLevel: result.getValue({ name: "isonline" })
                }

                priceCategories.push(prCa);
                return true;
            });

            log.debug("result", priceCategories);
            return priceCategories;
        } catch (error) {
            log.error('error in allPriceCategories: ', error);
        }
    }
    return {
        onRequest: onRequest
    };
});

