/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

function isEmpty(stValue) {
    return ((stValue === '' || stValue == null || stValue == undefined) ||
        (stValue.constructor === Array && stValue.length == 0) ||
        (stValue.constructor === Object && (function (v) {
            for (var k in v) return false;
            return true;
        })(stValue)));
}

define(['N/record', 'N/search', 'N/format'],

    function (record, search, format) {
        /**
        * Function definition to be triggered before record is loaded.
        *
        * @param {Object} scriptContext
        * @param {Record} scriptContext.newRecord - New record
        * @param {Record} scriptContext.oldRecord - Old record
        * @param {string} scriptContext.type - Trigger type
        * @Since 2015.2
        */
        function beforeLoad(context) {
            try {

                log.debug('Before load Context :' + context.type);
                var rec = context.newRecord;

                var shipping_method = rec.getValue({ fieldId: 'custbody_acc_shipping_method' });
                var invoice = rec.getValue({ fieldId: 'createdfrom' });
                log.debug("invoice", invoice);
                var sales_order = search.lookupFields({
                    type: search.Type.INVOICE,
                    id: invoice,
                    columns: ['createdfrom']
                }).createdfrom[0].value;
                log.debug("sales_order", sales_order);
                var SO_shipping_method = search.lookupFields({
                    type: search.Type.SALES_ORDER,
                    id: sales_order,
                    columns: ['shipmethod']
                }).shipmethod[0].value;
                log.debug("SO_shipping_method", SO_shipping_method);
                rec.setValue({
                    fieldId: 'custbody_acc_shipping_method',
                    value: SO_shipping_method,
                    ignoreFieldChange: true
                });
            }
            catch (e) {
                log.error('Exception', e);
            }
        }


        function beforeSubmit(scriptContext) {
            if (scriptContext.type == scriptContext.UserEventType.CREATE) //EDIT  
            {
                try {
                    var dropShipSpcOrderFlag = false;
                    var recordObj = scriptContext.newRecord;
                    var recType = recordObj.type;
                    var recId = recordObj.id;
                    var differenceInDays;
                    var tranDate = recordObj.getValue({ fieldId: 'trandate' });
                    var createdFrom = recordObj.getValue({ fieldId: 'createdfrom' });
                    var status = recordObj.getValue({ fieldId: 'orderstatus' });
                    var damagedFlag = recordObj.getValue({ fieldId: 'custbody_damaged' });

                    var lineCount = recordObj.getLineCount({ sublistId: 'item' });
                    log.debug("recId : createdFrom : lineCount : status : damagedFlag", recId + ':' + createdFrom + ' : ' + lineCount + ' : ' + status + ' : ' + damagedFlag);

                    if (createdFrom != '' && createdFrom != null && createdFrom != undefined && createdFrom != 'undefined') {
                        var soLookup = search.lookupFields({
                            type: 'salesorder',
                            id: createdFrom,
                            columns: ['shipdate']
                        });
                        var soShipDate = soLookup.shipdate;
                        log.debug('soShipDate', soShipDate);
                        if (soShipDate != null && soShipDate != '') {
                            var tranDateObj = format.parse({
                                value: tranDate,
                                type: format.Type.DATE
                            });
                            var soShipDateObj = format.parse({
                                value: soShipDate,
                                type: format.Type.DATE
                            });
                            differenceInDays = (tranDateObj.getTime() - soShipDateObj.getTime()) / (1000 * 60 * 60 * 24);
                            log.debug('differenceInDays', differenceInDays);
                        }

                        //Check if dropship on sales order
                        var soRecObj = record.load({ type: record.Type.SALES_ORDER, id: createdFrom, isDynamic: true });
                        var soLineCOunt = soRecObj.getLineCount({ sublistId: 'item' });
                        for (var j = 0; j < soLineCOunt; j++) {
                            var dropshiponSO = soRecObj.getSublistValue({ sublistId: 'item', fieldId: 'createpo', line: j });
                            var poVendor = soRecObj.getSublistValue({ sublistId: 'item', fieldId: 'povendor', line: j });
                            log.debug("SOcreatedFrom : dropshiponSO ", createdFrom + ' : ' + dropshiponSO);

                            if (dropshiponSO != '' && dropshiponSO != null && dropshiponSO != undefined && dropshiponSO != 'undefined')
                                dropShipSpcOrderFlag = true;
                        }
                        log.debug("SOcreatedFrom : SOlineCount : dropShipSpcOrderFlag", createdFrom + ' : ' + soLineCOunt + ' : ' + dropShipSpcOrderFlag);
                    }

                    for (var i = 0; i < lineCount; i++) {
                        var itemId = recordObj.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                        if (itemId) {
                            var itemLookup = search.lookupFields({
                                type: 'item',
                                id: itemId,
                                columns: ['isdropshipitem', 'isspecialorderitem']
                            });
                            log.debug('itemLookup', itemLookup);
                            var isDropShip = itemLookup.isdropshipitem;
                            var specialOrder = itemLookup.isspecialorderitem;
                            log.debug('isDropShip : specialOrder', isDropShip + ' : ' + specialOrder);
                            if (isDropShip || specialOrder)
                                dropShipSpcOrderFlag = true;
                        }
                    }

                    if (dropShipSpcOrderFlag === true || damagedFlag === true || differenceInDays > 60) {
                        if (dropShipSpcOrderFlag === true)
                            recordObj.setValue({ fieldId: 'custbody_dropship_spcl_order', value: true });
                        recordObj.setValue({ fieldId: 'orderstatus', value: 'A' });
                    }
                    else if (dropShipSpcOrderFlag === false && damagedFlag === false || differenceInDays <= 60) {
                        recordObj.setValue({ fieldId: 'orderstatus', value: 'B' });
                    }
                }
                catch (e) {
                    log.debug("Error", e);
                }
            }
        }

        return {
            beforeLoad: beforeLoad,
            //	beforeSubmit: beforeSubmit
        };

    });
