/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
*/
define(['N/record', 'N/search', 'N/runtime'], function (record, search, runtime) {
    function beforeLoad(context) {
      try{
            var rec = context.newRecord;
            var isDropShip = rec.getValue('custbody_dropship_order');
            if (isDropShip) {
                var script = '<script>var elements = document.getElementsByTagName("a");'
                script += 'var filtered = Array.from(elements).filter((el) => el.innerText === "Spec. Ord.");'
                script += 'filtered.forEach(function(a){a.remove()});<\/script>'
                rec.setValue({ fieldId: 'custbody_sdb_remove_link', value: script })
            }
      }catch(e){
         log.error("error: ", e);
      }
    }
    function beforeSubmit(context) {
        log.debug("On beforeSubmit");
        try {
            if (context.type != context.UserEventType.EDIT && context.type != context.UserEventType.CREATE) return;
            var rec = context.newRecord;
            var recCount = rec.getLineCount("item");
           
            for (var x = 0; x < recCount; x++) {
                var Available = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantityavailable',
                    line: x
                });
                log.debug("Available", Available);
                var Quantity = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: x
                });
                log.debug("Quantity", Quantity);
                log.debug("Available - Quantity", Available - Quantity);
                rec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantitybackordered',
                    value: Available - Quantity >= 0 ? 0 : Math.abs(Available - Quantity),
                    line: x
                });
            }

            var shipToSelect = rec.getValue('shipaddresslist');
            log.debug("Ship To Select", shipToSelect);
            //is custom
            if (!shipToSelect || shipToSelect == -2) rec.setValue({ fieldId: 'custbody_sdb_is_ship_to_select_custom', value: true })
            //is NOT custom 
            if (shipToSelect && shipToSelect != -2) rec.setValue({ fieldId: 'custbody_sdb_is_ship_to_select_custom', value: false })
            log.debug("Is Ship To Select Custom", rec.getValue({ fieldId: 'custbody_sdb_is_ship_to_select_custom' }))
            log.debug("Finish - SO Id: ", rec.id);

            /*SUPERSEDE FUNCTIONALITY*/
            var validateContext = (runtime.executionContext == runtime.ContextType.SUITELET || runtime.executionContext == runtime.ContextType.SCHEDULED);
            log.debug('Context: ' + runtime.executionContext, runtime.ContextType.SUITELET + ' - ' + runtime.ContextType.SCHEDULED)
            log.debug('validateFromContext', validateContext)
            var rec = context.newRecord;
            if (rec.getValue({ fieldId: 'custbody_sdb_from_uofmd_file' }) || validateContext) setDnrItems(rec);
            if (runtime.executionContext == runtime.ContextType.REST_WEBSERVICES || rec.getValue({ fieldId: 'custbody_aps_entered_by' }) == 66155) setDnrItems(rec);//DCKAP User 
            /*SUPERSEDE FUNCTIONALITY*/
        } catch (error) {
            log.error('error beforeSubmit', error);
        }
    }

    function setDnrItems(salesRecord) {
        try {
            var itemIds = getItemIds(salesRecord);
            if (!itemIds.length) return;
            var dnrItems = getItemsToSupersede(itemIds);
            if (!dnrItems.length) return;
            // Update DNR Items
            var itemCount = salesRecord.getLineCount("item");
            for (var i = 0; i < itemCount; i++) {

                var itemId = salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                var dnrInfo = dnrItems.find(function (item) {
                    return item.item == itemId;
                });
                if (!dnrInfo) continue;
                if (!dnrInfo.supercedItem) continue;
                var qty = salesRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                if (dnrInfo.item != dnrInfo.supercedItem) {
                    log.debug("UPDATE ITEM: ", { salesOrder: salesRecord.id, dnrInfo });
                    salesRecord.setSublistValue({ sublistId: 'item', fieldId: 'item', value: dnrInfo.supercedItem, line: i });// Add 4/4/24
                    salesRecord.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty, line: i });// Add 4/4/24
                    //salesRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: rate });
                }
            }
        } catch (error) {
            log.error('setDnrItems', error)
        }
    }

    function getItemsToSupersede(itemIds) {
        var arrToReturn = [];
        var itemSearchObj = search.create({
            type: "item",
            filters:
                [
                    ["internalid", "anyof", itemIds],
                    // "AND",
                    // ["custitem_acc_supercede_item", "noneof", "@NONE@"],
                    "AND",
                    ["custitem_acc_supercede_item.isinactive", "is", "F"]
                ],
            columns:
                [
                    "internalid",
                    "custitem_acc_supercede_item"
                ]
        });
        itemSearchObj.run().each(function (result) {
            var item = findFinalItem(result.getValue("internalid")); //Add 31/7
            arrToReturn.push({
                item: result.getValue("internalid"),
                supercedItem: item
            });
            return true;
        });
        return arrToReturn;
    }

    function getItemIds(newRecord) {
        var arrToReturn = [];
        var itemCount = newRecord.getLineCount("item");
        for (var i = 0; i < itemCount; i++) {
            var itemId = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
            if (!arrToReturn.includes(itemId)) arrToReturn.push(itemId);
        }
        return arrToReturn;
    }

    //Search until the last item supersede is brought - Add 31/7
    function findFinalItem(itemId) {
        try {
            var item = search.lookupFields({
                type: record.Type.INVENTORY_ITEM,
                id: itemId,
                columns: ['custitem_acc_supercede_item']
            })
            log.audit('item', item)
            if (item.custitem_acc_supercede_item && item.custitem_acc_supercede_item.length) {
                return findFinalItem(item.custitem_acc_supercede_item[0].value);
            } else {
                return itemId;
            }

        } catch (error) {
            log.error({
                title: 'Error findFinalItem',
                details: error
            });
            return itemId;
        }
    }


    return {
        beforeSubmit: beforeSubmit
    }
});