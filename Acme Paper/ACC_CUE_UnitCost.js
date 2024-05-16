/**
 * @NApiVersion 2.1
 * @NScriptType clientScript
 * @NModuleScope Public
 */

 define(["N/currentRecord", "N/search", 'N/ui/dialog'], function (currentRecord, search, dialog) {
    function fieldChanged(context) {
        try {
            //debugger
            var salesRecord = context.currentRecord;
            var sublistName = context.sublistId;
            var fieldName = context.fieldId;

            //----------------------------------- CODE FROM MARKUP -----------------------------------------------------------------------

            /* if (sublistName == 'item' && fieldName == 'units') {

                //SET COST TYPE ALWAYS TO CUSTOM
                salesRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimatetype', value: "CUSTOM", ignoreFieldChange: true });
            } */

            //Check if price level is custom when changing
            if (sublistName == 'item' && fieldName == 'price') {
                // checkPriceLevelCustom(salesRecord);
            }

            if (sublistName == 'item' && (fieldName == 'rate' || fieldName == 'custcol_acc_unitcost' || fieldName == 'costestimate')) {
                console.log('fieldName', fieldName)
                var item = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' }) || "";
                var rate = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'rate' }) || "";
                var costestimaterate = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost' }) || "";
                console.log('cost estimate rate unitcost', costestimaterate)

                //if (isEmpty(costestimaterate)) costestimaterate = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimaterate' });
                console.log('costestimaterate', costestimaterate)
                if (isEmpty(item)) return;

                //Check field cost estimate
                if (costestimaterate == 0) {
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acme_markup_percent',
                        value: 99999999,
                        ignoreFieldChange: false
                    });
                    return;
                }
                else {
                    console.log('setValue1', costestimaterate.toFixed(3))
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acc_unitcost',
                        value: costestimaterate.toFixed(3),
                        ignoreFieldChange: true
                    });
                }

                // Check custcol for manually_modified
                var priceLevel = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'price' });
                if (priceLevel == -1 && fieldName == 'rate') {
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_sdb_rate_manually_modified',
                        value: true,
                        ignoreFieldChange: true
                    });
                }

                var costestimatetype = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimatetype' });
                if (costestimatetype == 'CUSTOM' && fieldName == 'custcol_acc_unitcost') {
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_sdb_manually_modified_cost',
                        value: true,
                        ignoreFieldChange: true
                    });
                }

                if (rate == 0) {
                    var markup = 99999999
                }
                else {
                    var markup = ((rate - costestimaterate) / rate) * 100;
                }

                console.log('markup', markup)

                salesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_acme_markup_percent',
                    value: markup.toFixed(3),
                    ignoreFieldChange: true //changed to true 14/3
                });


            }

            //------------------------------------------------ MARGIN COST % ------------------------------------------------------------------
            //If the column margin cost % change
            if (sublistName == 'item' && fieldName == 'custcol_acme_markup_percent') {
                //debugger;
                // checkPriceLevelCustom(salesRecord);

                var costestimaterate = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost' }) || "";
                console.log('costestimaterate2', costestimaterate)
                //if (isEmpty(costestimaterate)) costestimaterate = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimaterate' });
                console.log('costestimaterate3', costestimaterate)
                var priceLevel = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'price' }) || "";

                var quantity = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' }) || "";
                var markup = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_markup_percent' }) || "";

                if (isEmpty(markup) || isEmpty(quantity)) return;

                // grossMargin = ((sellPrice - unitCost) / sellPrice) * 100;
                var temp = 1 - (Number(markup) / 100);
                console.log("temp", temp)
                var rate = costestimaterate ? (1 / Number(temp)) * Number(costestimaterate) : salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'rate' });
                console.log('rate2', rate);
                if (isEmpty(rate)) return;

                var amount = rate * quantity;
                if (isEmpty(amount)) return;

                //Set item rate
                console.log('priceLevel', priceLevel);
                console.log('fieldName ', fieldName);
                if (priceLevel == -1 && fieldName != 'custcol_acme_markup_percent') return;
                //if (priceLevel == -1) return;
                salesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: rate.toFixed(2),
                    ignoreFieldChange: true
                });

                //Set item amount
                salesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    value: amount.toFixed(2),
                    ignoreFieldChange: true
                });


            }
            //markup code ends here
            //------------------------------------------------------ END MARKUP CODE -------------------------------------------------------------------------

            if (sublistName == 'item' && (fieldName == 'custcol_acc_unitcost' || fieldName == 'quantity' || fieldName == 'costestimatetype' || fieldName == 'costestimate')) {
                var costEstimateType = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimatetype' }) || "";
                var itemid = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' }) || "";
                if (isEmpty(itemid)) return;

                if (fieldName == 'costestimate') {
                    var quantity = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' });
                    if (isEmpty(quantity)) return;

                    var extendedCost = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimate' });
                    if (isEmpty(extendedCost)) return;

                    var existingunitcost = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost' }) || "";
                    if (isEmpty(existingunitcost)) return;

                    var unitCost = extendedCost / quantity;
                    unitCost = unitCost?.toFixed(2);
                    if (isEmpty(unitCost)) return;

                    console.log('SetValue2', unitCost)
                    if (existingunitcost != unitCost) salesRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost', value: unitCost });
                }

                if (fieldName == 'quantity') {
                    var quantity = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' });
                    if (isEmpty(quantity)) return;

                    var existingunitcost = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost' }) || "";
                    if (isEmpty(existingunitcost)) return;

                    var newCostEstimate = existingunitcost * quantity;
                    newCostEstimate = newCostEstimate?.toFixed(2);
                    if (isEmpty(newCostEstimate)) return;

                    console.log("set costestimate after quantity", newCostEstimate)
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'costestimate',
                        value: newCostEstimate,
                        ignoreFieldChange: true
                    })
                }

                if (fieldName == 'custcol_acc_unitcost') {
                    var quantity = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' }) || "";
                    var unitCost = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost' }) || "";
                    var existingextendedcost = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimate' }) || "";

                    if (isEmpty(quantity) || isEmpty(unitCost)) return;

                    var extendedCost = Number(quantity) * Number(unitCost);
                    extendedCost = extendedCost.toFixed(2);
                    if (isEmpty(extendedCost)) return;

                    if (existingextendedcost != extendedCost) salesRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimate', value: extendedCost });
                }

                if (fieldName == 'costestimatetype') {
                    if (isEmpty(costEstimateType) /*|| costEstimateType == "CUSTOM"*/) return;

                    var unitCost;
                    var lookupfield;

                    var columnNames = { 'ITEMDEFINED': 'costestimate', 'AVGCOST': 'averagecost', 'LASTPURCHPRICE': 'lastpurchaseprice', 'PURCHPRICE': 'cost' };
                    var columns = [columnNames[costEstimateType]];
                    var _unitCost = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost' }) || "";
                    var quantity = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' }) || "";
                    if (costEstimateType == "CUSTOM" && quantity && _unitCost) {
                        extendedCost = Number(_unitCost) * Number(quantity);
                        salesRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimate', value: extendedCost })

                    }
                    if (isEmpty(columns)) return;

                    lookupfield = search.lookupFields({
                        type: search.Type.INVENTORY_ITEM,
                        id: itemid,
                        columns: columns
                    });

                    unitCost = lookupfield[columns[0].toLowerCase()];
                    if (isEmpty(unitCost)) return;

                    var existingextendedcost = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimate' }) || "";

                    if (isEmpty(existingextendedcost) || isEmpty(quantity)) return;

                    var extendedCost = Number(quantity) * Number(unitCost);
                    extendedCost = extendedCost.toFixed(2);
                    if (isEmpty(extendedCost)) return;

                    if (existingextendedcost != extendedCost) salesRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimate', value: extendedCost });
                }
            }
        }
        catch (error) {
            console.log('Error in fieldChanged', error.toString());
            log.error('Error in fieldChanged ' + salesRecord.id, error.toString())
        }

    }//End fieldChanged

    //Markup Post sourcing
    function postSourcing(context) {
        try {
            var salesRecord = context.currentRecord;
            var sublistName = context.sublistId;
            var fieldName = context.fieldId;
            var line = context.line;

            //Check if price level is custom when changing
            if (sublistName == 'item' && fieldName == 'price') {
                // checkPriceLevelCustom(salesRecord);
            }

            if (sublistName == 'item' && (fieldName == 'item')) {
                var rate = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'rate' }) || "";
                var dropShip = salesRecord.getValue({ fieldId: "custbody_dropship_order" }) || "";

                /* if (dropShip == true || dropShip == 'T') {
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'costestimatetype',
                        value: 'CUSTOM',
                        ignoreFieldChange: false
                    });
                } */

                var costestimaterate = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimaterate' }) || "";
                var itemId = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' })
                if (dropShip == true || dropShip == 'T') {
                    var vendorPrice = getVendorPrice(itemId);
                    if (vendorPrice != -1) {
                        if (vendorPrice < costestimaterate) {
                            costestimaterate = vendorPrice;
                            salesRecord.setCurrentSublistValue({
                                fieldId: "costestimatetype",
                                sublistId: "item",
                                value: "PREFVENDORRATE",
                                ignoreFieldChange: false
                            })
                        }
                    }
                }

                if (costestimaterate == 0) {
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acme_markup_percent',
                        value: 99999999,
                        ignoreFieldChange: false
                    });
                    return;
                }
                else {
                    console.log('setValue3', costestimaterate.toFixed(2))

                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acc_unitcost',
                        value: costestimaterate.toFixed(2),
                        ignoreFieldChange: false
                    });
                }

                var entityId = salesRecord.getValue({ fieldId: "entity" })
                if (entityId == 96580) { //RESTOCKIT 6% MARKUP
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acme_markup_percent',
                        value: 6,
                        ignoreFieldChange: false
                    });
                }
                else {
                    var markup = ((Number(rate) - Number(costestimaterate)) / Number(rate)) * 100;
                    if (isEmpty(markup)) return;

                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acme_markup_percent',
                        value: markup.toFixed(3),
                        ignoreFieldChange: false
                    });
                }
            }

            if (sublistName == 'item' && fieldName == 'custcol_acme_markup_percent') {
                //debugger;
                // checkPriceLevelCustom(salesRecord);

                var costestimaterate = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimaterate' }) || "";

                if (costestimaterate == 0) {
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acme_markup_percent',
                        value: 99999999,
                        ignoreFieldChange: false
                    });
                    return;
                }
                else {
                    console.log('setValue4')
                    salesRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_acc_unitcost',
                        value: costestimaterate.toFixed(2),
                        ignoreFieldChange: true
                    });
                }

                var markup = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acme_markup_percent' }) || "";
                if (isEmpty(markup)) return;

                var temp = 1 - (Number(markup) / 100);

                var rate = (1 / Number(temp)) * Number(costestimaterate);
                if (isEmpty(rate)) return;
                var priceLevel = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'price' }) || "";
                console.log('priceLevel', priceLevel)
                if (priceLevel == -1 && fieldName != 'custcol_acme_markup_percent') return;
                //if (priceLevel == -1) return;
                salesRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: rate.toFixed(2),
                    ignoreFieldChange: true
                });
            }
        }
        catch (error) {
            log.error('Error in postSourcing ' + salesRecord.id, error.toString());
        }
    }

    //is empty function
    function isEmpty(stValue) {
        if ((stValue == '') || (stValue == null) || (stValue == 'undefined')) {
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

    function checkPriceLevelCustom(salesRecord) {
        if (salesRecord.type != "estimate") return;

        var priceLevel = salesRecord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'price' });
        if (isEmpty(priceLevel)) return;
        if (Number(priceLevel) != -1) return;

        salesRecord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_acme_markup_percent',
            value: '',
            ignoreFieldChange: true
        });
    }

    function getVendorPrice(item) {
        try {
            debugger;
            var vendorCost = -1;
          if(!item) return vendorCost;
            var itemSearchObj = search.create({
                type: "item",
                filters:
                    [
                        ["internalid", "anyof", item]
                    ],
                columns:
                    [
                        search.createColumn({ name: "vendorcost", label: "Vendor Price" })
                    ]
            });
            itemSearchObj.run().each(function (result) {
                vendorCost = Number(result.getValue('vendorcost'))
                return false;
            });
            return vendorCost
        } catch (error) {
            console.log(error)
            log.error('Error in getVendorPrice', error.toString())
        }
    }

    return {
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
    };
});