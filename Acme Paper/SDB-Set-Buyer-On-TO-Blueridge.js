/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/currentRecord', 'N/log', 'N/record', 'N/search', 'N/runtime'],
    (currentRecord, log, record, search, runtime) => {

        /**
         * @Task Add buyer name to Transfer orders which are imported from Blueridge - Clickup Task  https://app.clickup.com/t/86azq6emn
         * @Date 07 / 05 / 2024
         */
        function afterSubmit(scriptContext){
            log.debug('Debug', 'Inside after submit');
            let newRecord = record.load({type: scriptContext.newRecord.type, id: scriptContext.newRecord.id,});

            log.debug("transfer order external id", newRecord.getValue("externalid"));
            try{
                if(newRecord.getValue("externalid").toUpperCase().includes("BR_TO")){//If the order comes from Blueridge
                    let buyer = newRecord.getValue({fieldId: 'custbody_acc_buyer'});

                    let itemCount = newRecord.getLineCount({sublistId: 'item'});

                    if (itemCount > 0 && buyer === '') {
                        let itemId = newRecord.getSublistValue({sublistId: "item", fieldId: "item", line: 0});
                        if (itemId) {
                            let buyerToSet = getBuyerByItem(itemId);
                            newRecord.setValue({
                                fieldId: 'custbody_acc_buyer',
                                value: buyerToSet,
                                ignoreFieldChange: true
                            });
                            log.debug('Debug', 'Buyer set to: ' + buyerToSet);
                            newRecord.save();
                        }
                    }
                }
            } catch (e) {
                log.error("error in aftersubmit", e);
            }
        }

        function getBuyerByItem(itemId){
            try{
                let itemLookUp = search.lookupFields({
                    type: "item",
                    id: itemId,
                    columns: ['custitem_buyer']
                });
                log.debug("itemLookUp.custitem_buyer", itemLookUp.custitem_buyer[0]?.value);
                return itemLookUp.custitem_buyer[0]?.value || "";
            } catch (e) {
                log.error("error in getShipPointValueByItem", e);
            }
        }
        return {afterSubmit}

    });
