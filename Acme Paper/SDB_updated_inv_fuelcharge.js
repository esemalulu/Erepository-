/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
*/
define(['N/record', 'N/search', "N/log", "N/config", "N/format", "N/runtime"],
    /**
   * @param{record} record
   * @param{search} search
   */
    (record, search, log, config, format, runtime) => {

        const getInputData = (inputContext) => {
            try {
              log.debug("Run", new Date())
                var mySearch = search.load({
                    id: "customsearch5845"
                });

                return mySearch;
            } catch (error) {
                log.error('getInputData', error)
            }

        }

        const map = (mapContext) => {
            try {

                var json = JSON.parse(mapContext.value);
                //log.debug("json", json)

                mapContext.write({
                    key: mapContext.key,
                    value: json
                });
            } catch (e) {
                log.error({
                    title: "error map",
                    details: e,
                })
            }
        }

        const reduce = (reduceContext) => {
            try {

                var rduceVals = JSON.parse(reduceContext.values[0]);
                //log.debug("rduceVals", rduceVals);
                var splitIds = rduceVals.values["MAX(formulatext)"].split(',')
                log.debug("splitIds", splitIds);
                var scriptObj = runtime.getCurrentScript();
                var itemForCherge = scriptObj.getParameter({ name: 'custscript_sdb_item_surcharge_mr' })
                // return;
                var transArr = []
                for (var i = 0; i < splitIds.length; i++) {

                    var invRec = record.load({
                        type: record.Type.INVOICE,
                        id: splitIds[i],
                        isDynamic: true,
                    })

                    var createdFrom = invRec.getValue('createdfrom');
                    var hasFuelChargeSO = getSoInfo(createdFrom);
                    log.audit('SO W/Fuel charge', hasFuelChargeSO)
                    log.audit('Arr[]', transArr)
                    if (createdFrom && hasFuelChargeSO && transArr.length == 0) {
                        transArr.push(splitIds[i])
                        log.audit('case 1 continue', createdFrom)
                        continue;
                    } else if (createdFrom && hasFuelChargeSO && transArr.length) {
                        log.audit(' case 2 Inv && SO ', createdFrom)
                        var line = invRec.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: itemForCherge
                        })
                        if (line != -1) invRec.removeLine({ sublistId: 'item', line: line });

                        invRec.setValue({
                            fieldId: 'custbody_sdb_fuel_charge_amount',
                            value: '',
                        })

                        var id = invRec.save({
                            ignoreMandatoryFields: true
                        })
                        log.audit('Invoice updated case 2', id)
                        removeChargeSO(createdFrom);
                        continue;
                    } else if (transArr.length) {
                        log.audit('case 3 rest inv', splitIds[i]);
                        var line = invRec.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: itemForCherge
                        })
                        if (line != -1) invRec.removeLine({ sublistId: 'item', line: line });
                        invRec.setValue({
                            fieldId: 'custbody_sdb_fuel_charge_amount',
                            value: '',
                        })
                    } else if (!transArr.length && i < splitIds.length - 1) {
                        log.audit('case 4 leave only one', splitIds[i]);
                        var line = invRec.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: itemForCherge
                        })
                        if (line != -1) invRec.removeLine({ sublistId: 'item', line: line });
                        invRec.setValue({
                            fieldId: 'custbody_sdb_fuel_charge_amount',
                            value: '',
                        })
                    }
                    var id = invRec.save({
                        ignoreMandatoryFields: true
                    })
                    log.audit('Invoice updated', id)
                }

            } catch (error) {
                log.error({
                    title: 'Reduce',
                    details: error
                })
            }
        }

        const summarize = (summaryContext) => {
        }

        function getSoInfo(id) {
            try {
                var scriptObj = runtime.getCurrentScript();
                var itemForCherge = scriptObj.getParameter({ name: 'custscript_sdb_item_surcharge_mr' })
                var soRec = record.load({
                    type: record.Type.SALES_ORDER,
                    id: id,
                    isDynamic: true,
                })

                var line = soRec.findSublistLineWithValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: itemForCherge
                })
                if (line > -1) return true
            } catch (error) {
                log.error('getSoInfo', error)
            }
            return false;
        }

        function removeChargeSO(id) {
            try {
                var scriptObj = runtime.getCurrentScript();
                var itemForCherge = scriptObj.getParameter({ name: 'custscript_sdb_item_surcharge_mr' })
                var so = record.load({
                    type: record.Type.SALES_ORDER,
                    id: id,
                    isDynamic: true,
                })

                var line = so.findSublistLineWithValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: itemForCherge
                })
                if (line == -1) return;
                log.audit('line: ', line);
                so.removeLine({ sublistId: 'item', line: line });
                so.save({
                    ignoreMandatoryFields: true
                })
                log.audit('removeChargeSO Fuel charge: ', id);
            } catch (error) {
                log.error('ERROR removeChargeSO', error)
            }
        }
        return { getInputData, map, reduce }
    });
