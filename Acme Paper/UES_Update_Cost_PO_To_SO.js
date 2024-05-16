/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record'],

    function (record) {

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {
            /*  log.debug('starts')
             var rec = scriptContext.newRecord;
             try {
                 var soId = rec.getValue({ fieldId: 'createdfrom' });
                 if (soId) {
                     var salesOrder = record.load({ type: record.Type.SALES_ORDER, id: soId, isDynamic: true });
                     var dropship = salesOrder.getValue({ fieldId: 'custbody_dropship_order' });
                     log.debug('dropship=', dropship);
                     if (dropship == true) {
 
                         var soLineCount = salesOrder.getLineCount({ sublistId: 'item' });
                         log.debug('soLineCount', soLineCount);
                         var poLineCount = rec.getLineCount({ sublistId: 'item' });
                         log.debug('poLineCount', poLineCount);
                         var soItems = [];
                         for (var plc = 0; plc < soLineCount; plc++) {
                             var item = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'item', line: plc });
                             var rate = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost', line: plc });
                             var res = {};
                             res['itemid'] = item;
                             res['cost'] = rate;
                             soItems.push(res);
                         }
 
                         for (var ilc = 0; ilc < poLineCount; ilc++) {
                             var item = rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ilc });
                             var poquantity = rec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: ilc });
                             log.debug('SO ITEM', item);
                             for (var i = 0; i < poLineCount; i++) {
                                 if (item === soItems[i].itemid) {
                                     log.debug('cost being set', soItems[i].cost)
                                     rec.setSublistValue({
                                         sublistId: 'item',
                                         fieldId: 'rate',
                                         line: ilc,
                                         value: soItems[i].cost
                                     });
                                     var extendedCost = poquantity * soItems[i].cost;
                                     extendedCost = extendedCost.toFixed(2);
                                     log.debug('PO Quantity', poquantity);
                                     log.debug('extendedCost', extendedCost);
 
                                     rec.setSublistValue({
                                         sublistId: 'item',
                                         fieldId: 'amount',
                                         line: ilc,
                                         value: extendedCost
                                     });
 
                                     log.debug('SO ITEM cost', soItems[i].cost);
                                     log.debug('PO Line updated');
                                 }
                             }
                         }
                     }
                 }
             } catch (e) {
                 log.debug('Error!', e);
             } */
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeLoad(scriptContext) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {
            if (scriptContext.type != 'delete') {
                var rec = record.load({
                    type: scriptContext.newRecord.type,
                    id: scriptContext.newRecord.id,
                    isDynamic: false,
                })
                log.debug('scriptContext.type', scriptContext.type)
                if (scriptContext.type == 'dropship') {
                    try {
                        var soId = rec.getValue({ fieldId: 'createdfrom' });
                        if (soId) {
                            var salesOrder = record.load({ type: record.Type.SALES_ORDER, id: soId, isDynamic: true });
                            var dropship = salesOrder.getValue({ fieldId: 'custbody_dropship_order' });
                            log.debug('dropship=', dropship);
                            if (dropship == true) {

                                var soLineCount = salesOrder.getLineCount({ sublistId: 'item' });
                                log.debug('soLineCount', soLineCount);
                                var poLineCount = rec.getLineCount({ sublistId: 'item' });
                                log.debug('poLineCount', poLineCount);
                                var soItems = [];
                                for (var plc = 0; plc < soLineCount; plc++) {
                                    var item = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'item', line: plc });
                                    var rate = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost', line: plc });
                                    var res = {};
                                    res['itemid'] = item;
                                    res['cost'] = rate;
                                    soItems.push(res);
                                }

                                for (var ilc = 0; ilc < poLineCount; ilc++) {
                                    var item = rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ilc });
                                    var poquantity = rec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: ilc });
                                    log.debug('SO ITEM', item);
                                    for (var i = 0; i < poLineCount; i++) {
                                        if (item === soItems[i].itemid) {
                                            log.debug('cost being set', soItems[i].cost)
                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'rate',
                                                line: ilc,
                                                value: soItems[i].cost
                                            });
                                            var extendedCost = poquantity * soItems[i].cost;
                                            extendedCost = extendedCost.toFixed(2);
                                            log.debug('PO Quantity', poquantity);
                                            log.debug('extendedCost', extendedCost);

                                            rec.setSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'amount',
                                                line: ilc,
                                                value: extendedCost
                                            });

                                            log.debug('SO ITEM cost', soItems[i].cost);
                                            log.debug('PO Line updated');
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        log.debug('Error!', e);
                    }
                }
                if (scriptContext.type == 'edit') {
                    try {
                        var soId = rec.getValue({ fieldId: 'createdfrom' });
                        if (soId) {
                            var salesOrder = record.load({ type: record.Type.SALES_ORDER, id: soId, isDynamic: true });
                            var dropship = salesOrder.getValue({ fieldId: 'custbody_dropship_order' });
                            log.debug('dropship=', dropship);
                            if (dropship == true) {

                                var soLineCount = salesOrder.getLineCount({ sublistId: 'item' });
                                log.debug('soLineCount', soLineCount);
                                var poLineCount = rec.getLineCount({ sublistId: 'item' });
                                log.debug('poLineCount', poLineCount);
                                var poItems = [];
                                var soupdated = 'no';
                                for (var plc = 0; plc < poLineCount; plc++) {
                                    var item = rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: plc });
                                    var rate = rec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: plc });
                                    var res = {};
                                    res['itemid'] = item;
                                    res['cost'] = rate;
                                    poItems.push(res);
                                }

                                for (var ilc = 0; ilc < soLineCount; ilc++) {
                                    var item = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ilc });
                                    var rate = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: ilc });
                                    var sorate = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost', line: ilc });
                                    var soquantity = salesOrder.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: ilc });

                                    log.debug('SO ITEM', item);
                                    for (var i = 0; i < poItems.length; i++) {
                                        if (item === poItems[i].itemid && poItems[i].cost != sorate) {

                                            soupdated = 'yes';
                                            salesOrder.selectLine({ sublistId: 'item', line: ilc });
                                            salesOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_acc_unitcost', value: poItems[i].cost, ignoreFieldChange: false, forceSyncSourcing: true });
                                            salesOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimaterate', value: poItems[i].cost, ignoreFieldChange: false, forceSyncSourcing: true });
                                            var extendedCost = soquantity * poItems[i].cost;
                                            extendedCost = extendedCost.toFixed(2);

                                            salesOrder.setCurrentSublistValue({ sublistId: 'item', fieldId: 'costestimate', value: extendedCost, ignoreFieldChange: false, forceSyncSourcing: true });
                                            var markup = ((rate - poItems[i].cost) / rate) * 100;

                                            salesOrder.setCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_acme_markup_percent',
                                                value: markup.toFixed(2),
                                                ignoreFieldChange: true
                                            });

                                            salesOrder.commitLine({ sublistId: 'item' });
                                        }
                                    }
                                }// so lines
                                if (soupdated == 'yes')
                                    salesOrder.save(true, true);

                            } //if dropship
                        }
                    } catch (e) {
                        log.debug('Error!', e);
                    }
                }
                rec.save()
            }
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });
