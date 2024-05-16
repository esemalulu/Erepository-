/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(["N/log", "N/record", "N/search"], function (log, record, search) {


    function onAction(context) {
        try {
            let currentRecord = context.newRecord;
            log.debug('Record ID: ', currentRecord.id)
            var actualShipMethod = currentRecord.getValue('shipmethod');
            if (actualShipMethod) return;
            log.debug('Record ID: ', currentRecord.id)
            var shippingMethod;
            var shippingMethodAddress = getShippingMethodFromAddress(currentRecord, 'shipaddresslist');
            if (shippingMethodAddress) shippingMethod = shippingMethodAddress.shippingMethod;
            if (shippingMethod) currentRecord.setValue({ fieldId: 'shipmethod', value: Number(shippingMethod) });
            log.debug('shipping method setted: ', shippingMethod)
        }
        catch (error) {
            log.debug('onAction ', error)
        }
    }

    function getShippingMethodFromAddress(currentRec, option) {
        try {
            if (option == 'shipaddresslist') {
                let customer = currentRec.getValue('entity');
                let subRecord = currentRec.getSubrecord('shippingaddress');
                var shippingMethod = subRecord.getValue('custrecord_sdb_shipping_method')
                // log.debug('GET shippingMethod address form', shippingMethod)
                if (!shippingMethod) {
                    var fieldLookUp = search.lookupFields({
                        type: 'customer',
                        id: customer,
                        columns: ["shippingitem"]
                    })
                    // log.debug('fieldLookup',fieldLookUp)
                    // log.debug('fieldLookup Lengh',fieldLookUp.shippingitem.length)
                    if (fieldLookUp.shippingitem.length > 0) {
                        shippingMethod = fieldLookUp.shippingitem[0].value;
                    }
                    // log.debug('GET shippingMethod field general customer', shippingMethod)
                }
            }
            var objectReturn = {
                shippingMethod: shippingMethod
            }
            return objectReturn;
        } catch (error) {
            log.error("getShippingMethodFromAddress  ERROR", error);
        }
    }

    return {
        onAction: onAction
    };
});